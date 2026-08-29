import type { PortalSession } from '../portalUsers';
import { apiBaseUrl } from './analyses';

export async function portalLogin(username: string, password: string): Promise<PortalSession> {
  const res = await fetch(`${apiBaseUrl()}/v1/auth/login`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-csrf-token': 'dashboard-v1',
    },
    body: JSON.stringify({ username: username.trim(), password }),
  });
  const text = await res.text().catch(() => '');
  if (!res.ok) {
    let msg = text?.trim() || `Login failed: ${res.status} ${res.statusText}`;
    try {
      const err = JSON.parse(text) as { message?: string | string[] };
      if (Array.isArray(err.message)) msg = err.message.join(', ');
      else if (typeof err.message === 'string') msg = err.message;
    } catch {
      if (msg.length > 280) msg = `${msg.slice(0, 280)}…`;
    }
    throw new Error(msg);
  }
  let j: { access_token?: string; username?: string };
  try {
    j = JSON.parse(text) as { access_token?: string; username?: string };
  } catch {
    throw new Error('Invalid login response');
  }
  if (!j.access_token || !j.username) {
    throw new Error('Invalid login response');
  }
  return { accessToken: j.access_token, username: j.username };
}
