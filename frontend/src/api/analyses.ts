import type { AnalysesRunRequest, AnalysesRunResponse } from '../types/analyses';
// AUTH DISABLED: bearer token getter
// import { getPortalAccessToken } from '../portalUsers';

export function apiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL as string | undefined;
  return (raw?.trim() || 'http://localhost:3000').replace(/\/+$/g, '');
}

/** Documentación HTML de índices (`GET /v1/analyses/indices`). */
export function indicesDocumentationUrl(): string {
  return `${apiBaseUrl()}/v1/analyses/indices`;
}

export async function runAnalyses(body: AnalysesRunRequest): Promise<AnalysesRunResponse> {
  // AUTH DISABLED: bearer token injection
  // const token = getPortalAccessToken();
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'x-csrf-token': 'dashboard-v1',
  };
  // if (token) {
  //   headers.Authorization = `Bearer ${token}`;
  // }
  const res = await fetch(`${apiBaseUrl()}/v1/analyses/run`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Analyses request failed: ${res.status} ${res.statusText}${text ? `\n${text}` : ''}`);
  }
  return (await res.json()) as AnalysesRunResponse;
}
