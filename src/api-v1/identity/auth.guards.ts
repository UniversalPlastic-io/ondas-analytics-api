import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { PORTAL_JWT_TYP } from '../auth/portal-connectors.types';
import { IdentityService } from './identity.service';
import { AuthenticatedRequest, ONDAS_JWT_TYP, OndasJwtPayload, RequestUser } from './jwt-payload';
import { UserRole } from './schemas/user.schema';

function bearer(req: AuthenticatedRequest): string | null {
  const header = req.headers?.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice(7).trim() || null;
}

/**
 * Resolves a token into a RequestUser.
 *
 * Two token shapes are accepted: the current `ondas_user` token, and the legacy
 * `portal_connector` token issued before users lived in Mongo. A legacy token is
 * upgraded by looking its username up in `users.legacyUsername`; if no such user
 * exists it still authenticates, as a viewer with no organization, so the
 * pre-existing frontend keeps working through the rollout.
 */
async function resolveUser(
  token: string,
  jwt: JwtService,
  identity: IdentityService,
): Promise<RequestUser> {
  let payload: Partial<OndasJwtPayload> & { typ?: string };
  try {
    payload = jwt.verify(token);
  } catch {
    throw new UnauthorizedException('Invalid or expired token');
  }

  if (payload.typ === ONDAS_JWT_TYP) {
    if (!payload.sub) throw new UnauthorizedException('Invalid token');
    return {
      userId: payload.sub,
      email: payload.email ?? null,
      name: payload.name ?? null,
      role: (payload.role ?? 'viewer') as UserRole,
      organizationId: payload.org ?? null,
      organizationSlug: payload.orgSlug ?? null,
      legacy: false,
    };
  }

  if (payload.typ === PORTAL_JWT_TYP && typeof payload.sub === 'string') {
    const user = await identity.findByLegacyUsername(payload.sub);
    if (!user) {
      return {
        userId: null,
        email: null,
        name: payload.sub,
        role: 'viewer',
        organizationId: null,
        organizationSlug: null,
        legacy: true,
      };
    }
    const org = user.organizationId ? await identity.findOrganizationById(String(user.organizationId)) : null;
    return {
      userId: String(user._id),
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId ? String(user.organizationId) : null,
      organizationSlug: org?.slug ?? null,
      legacy: true,
    };
  }

  throw new UnauthorizedException('Invalid token');
}

/** Requires a valid token and attaches `req.user`. */
@Injectable()
export class UserJwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly identity: IdentityService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = bearer(req);
    if (!token) throw new UnauthorizedException('Missing or invalid Authorization header');
    req.user = await resolveUser(token, this.jwt, this.identity);
    return true;
  }
}

/**
 * Attaches `req.user` when a valid token is present and never rejects.
 * Used by the public read endpoints so they can scope to the caller's
 * organization when there is one.
 */
@Injectable()
export class OptionalUserGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly identity: IdentityService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = bearer(req);
    if (!token) return true;
    try {
      req.user = await resolveUser(token, this.jwt, this.identity);
    } catch {
      // An unreadable token on a public endpoint is simply an anonymous caller.
    }
    return true;
  }
}

export const ROLES_KEY = 'ondas:roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const role = req.user?.role;
    if (!role || !required.includes(role)) {
      throw new ForbiddenException(`this endpoint requires role: ${required.join(' or ')}`);
    }
    return true;
  }
}

export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): RequestUser | null => {
  return context.switchToHttp().getRequest<AuthenticatedRequest>().user ?? null;
});
