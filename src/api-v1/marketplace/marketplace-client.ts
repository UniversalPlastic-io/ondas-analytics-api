const MARKETPLACE_HOME_URL = 'https://api.universalplastic.io/public/marketplace/home';
// Cache under the 1h presigned-URL expiry on imageUrl so served links stay valid.
const CACHE_TTL_MS = 30 * 60 * 1000;

export interface MarketplaceHome {
  organizations: unknown[];
  campaigns: unknown[];
  wasteCollections: unknown[];
}

let cache: { data: MarketplaceHome; fetchedAtMs: number } | null = null;

/** Test helper: reset the in-memory cache. */
export function __clearMarketplaceCache(): void { cache = null; }

/** Fetch the public marketplace home feed (cached 30 min). Throws on upstream failure. */
export async function fetchHome(): Promise<MarketplaceHome> {
  if (cache && Date.now() - cache.fetchedAtMs < CACHE_TTL_MS) return cache.data;
  let res: Response;
  try {
    res = await fetch(MARKETPLACE_HOME_URL);
  } catch {
    throw new Error('upstream_unavailable');
  }
  if (!res.ok) throw new Error('upstream_unavailable');
  const raw = (await res.json()) as Partial<MarketplaceHome>;
  const data: MarketplaceHome = {
    organizations: Array.isArray(raw.organizations) ? raw.organizations : [],
    campaigns: Array.isArray(raw.campaigns) ? raw.campaigns : [],
    wasteCollections: Array.isArray(raw.wasteCollections) ? raw.wasteCollections : [],
  };
  cache = { data, fetchedAtMs: Date.now() };
  return data;
}
