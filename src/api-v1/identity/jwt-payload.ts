import { UserRole } from './schemas/user.schema';

/** `typ` of tokens issued for a Mongo-backed user. */
export const ONDAS_JWT_TYP = 'ondas_user' as const;

export interface OndasJwtPayload {
  sub: string;
  email: string;
  name: string;
  role: UserRole;
  /** Organization id, or null for an admin not attached to a participant. */
  org: string | null;
  orgSlug: string | null;
  typ: typeof ONDAS_JWT_TYP;
}

/** Request-attached identity, the shape every guard produces. */
export interface RequestUser {
  userId: string | null;
  email: string | null;
  name: string | null;
  role: UserRole;
  organizationId: string | null;
  organizationSlug: string | null;
  /** True when the caller presented a legacy portal-connector token. */
  legacy: boolean;
}

export interface AuthenticatedRequest {
  headers: { authorization?: string };
  user?: RequestUser;
}
