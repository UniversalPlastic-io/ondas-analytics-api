/**
 * Sesión del portal tras POST /v1/auth/login (JWT en el API).
 * Las credenciales viven solo en `config/portal-connectors.local.json` (no en git).
 */

export type PortalSession = {
  accessToken: string;
  username: string;
};

export const PORTAL_SESSION_KEY = 'ondas_portal_session';

export function readPortalSession(): PortalSession | null {
  try {
    const raw = sessionStorage.getItem(PORTAL_SESSION_KEY);
    if (!raw) return null;
    const j = JSON.parse(raw) as { accessToken?: string; username?: string };
    if (typeof j.accessToken !== 'string' || !j.accessToken || typeof j.username !== 'string' || !j.username) {
      return null;
    }
    return { accessToken: j.accessToken, username: j.username };
  } catch {
    return null;
  }
}

export function writePortalSession(session: PortalSession): void {
  sessionStorage.setItem(PORTAL_SESSION_KEY, JSON.stringify(session));
}

export function clearPortalSession(): void {
  sessionStorage.removeItem(PORTAL_SESSION_KEY);
}

export function getPortalAccessToken(): string | null {
  return readPortalSession()?.accessToken ?? null;
}
