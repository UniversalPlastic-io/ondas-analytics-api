import { RequestUser } from './jwt-payload';

/**
 * Resolves the organization a read should be limited to.
 *
 * The data space is shared, so anonymous reads see everything. A caller with a
 * token sees their own organization by default — that is what a participant's
 * dashboard wants — and can opt into the whole space with `?scope=all`.
 * Admins are never narrowed.
 */
export function organizationScope(user: RequestUser | null, scope?: string): string | null {
  if (!user?.organizationId) return null;
  if (user.role === 'admin') return null;
  return scope === 'all' ? null : user.organizationId;
}
