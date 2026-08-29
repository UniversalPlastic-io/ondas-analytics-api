import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PortalConnectorFile } from './portal-connectors.types';
import { PORTAL_JWT_TYP } from './portal-connectors.types';
import { IdentityService } from '../identity/identity.service';
import { ONDAS_JWT_TYP, OndasJwtPayload } from '../identity/jwt-payload';
import { UserRole } from '../identity/schemas/user.schema';

export interface LoginResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  /** Kept for backwards compatibility: the email, or the legacy connector username. */
  username: string;
  user: {
    email: string | null;
    name: string | null;
    role: UserRole;
    organization: { id: string; slug: string; name: string } | null;
  } | null;
}

function connectorsFilePath(): string {
  const rel = (process.env.PORTAL_CONNECTORS_FILE ?? 'config/portal-connectors.local.json').trim();
  return join(process.cwd(), rel);
}

function legacyLoginEnabled(): boolean {
  return (process.env.DISABLE_LEGACY_CONNECTOR_LOGIN ?? '').trim().toLowerCase() !== 'true';
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly identity: IdentityService,
  ) {}

  private ttlOf(token: string): number {
    const decoded = this.jwt.decode(token) as { exp?: number; iat?: number } | null;
    return decoded?.exp != null && decoded?.iat != null ? Math.max(0, decoded.exp - decoded.iat) : 0;
  }

  /**
   * Authenticates against the `users` collection.
   *
   * Falls back to the plaintext connector file when the login is unknown to Mongo,
   * so an instance that has not run the seed yet keeps serving the existing
   * frontend. Set DISABLE_LEGACY_CONNECTOR_LOGIN=true to turn that path off once
   * every connector has been migrated.
   */
  async login(login: string, password: string): Promise<LoginResponse> {
    const identifier = login?.trim();
    const secret = password ?? '';
    if (!identifier || !secret) {
      throw new UnauthorizedException('username/email and password required');
    }

    const user = await this.identity.findByLogin(identifier);
    if (user) {
      if (!user.active) throw new UnauthorizedException('This account is disabled');
      if (!(await this.identity.verifyPassword(user, secret))) {
        throw new UnauthorizedException('Invalid credentials');
      }
      const org = user.organizationId ? await this.identity.findOrganizationById(String(user.organizationId)) : null;
      const payload: OndasJwtPayload = {
        sub: String(user._id),
        email: user.email,
        name: user.name,
        role: user.role,
        org: org ? String(org._id) : null,
        orgSlug: org?.slug ?? null,
        typ: ONDAS_JWT_TYP,
      };
      const access_token = this.jwt.sign(payload);
      await this.identity.markLogin(user._id);
      return {
        access_token,
        token_type: 'Bearer',
        expires_in: this.ttlOf(access_token),
        username: user.email,
        user: {
          email: user.email,
          name: user.name,
          role: user.role,
          organization: org ? { id: String(org._id), slug: org.slug, name: org.name } : null,
        },
      };
    }

    return this.legacyLogin(identifier, secret);
  }

  private legacyLogin(username: string, password: string): LoginResponse {
    if (!legacyLoginEnabled()) throw new UnauthorizedException('Invalid credentials');

    const path = connectorsFilePath();
    if (!existsSync(path)) throw new UnauthorizedException('Invalid credentials');

    let file: PortalConnectorFile;
    try {
      file = JSON.parse(readFileSync(path, 'utf8')) as PortalConnectorFile;
    } catch {
      this.logger.error(`Invalid portal credentials JSON: ${path}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    const row = file.users?.find((x) => x.username === username);
    if (!row || row.password !== password) throw new UnauthorizedException('Invalid credentials');

    this.logger.warn(
      `Legacy connector login for "${username}" — this account is not in Mongo yet. Run "npm run seed" to migrate it.`,
    );
    const access_token = this.jwt.sign({ sub: username, typ: PORTAL_JWT_TYP });
    return {
      access_token,
      token_type: 'Bearer',
      expires_in: this.ttlOf(access_token),
      username,
      user: null,
    };
  }
}
