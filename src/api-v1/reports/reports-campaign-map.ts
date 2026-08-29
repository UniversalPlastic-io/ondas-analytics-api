export interface CampaignScope {
  campaignId: string;
  campaignName: string;
  siteLabel: string;
  city: string;
  lat: number;
  lon: number;
  /**
   * S3 key fragments of the cleanup assets in scope. Resolved to assets (and
   * therefore to observations) at query time — the API no longer holds a static
   * file list, the `assets` collection is the inventory.
   */
  fragments: string[];
}

// Per-file site/city labels (recogidas_playa carries no place name of its own).
const FILE_LABELS: Array<{ fragment: string; site: string; city: string; lat: number; lon: number }> = [
  { fragment: 'recogidas_playas_barcelona', site: 'Barcelona', city: 'Barcelona', lat: 41.6701792, lon: 2.7895005 },
  { fragment: 'recogidas_playas_badalona', site: 'Badalona', city: 'Badalona', lat: 41.4377479, lon: 2.2442404 },
  { fragment: 'recogidas_playas_blanes', site: 'Blanes', city: 'Costa Brava', lat: 41.676, lon: 2.795 },
  { fragment: 'recogidas_playa_tenerife', site: 'Tenerife', city: 'Canary Islands', lat: 28.1876084, lon: -16.6595858 },
  { fragment: 'recogidas_playas_gijon', site: 'Gijón', city: 'Asturias', lat: 43.5721291, lon: -5.7212135 },
];

const CAMPAIGN_MAP: Record<string, { name: string; fragment: string }> = {
  c1: { name: 'Costa Brava Spring Clean 2025', fragment: 'recogidas_playas_blanes' },
  c2: { name: 'Mediterranean Blue 2024', fragment: 'recogidas_playas_badalona' },
  c3: { name: 'Barceloneta Urban Impact', fragment: 'recogidas_playas_barcelona' },
  c4: { name: 'Corporate Wave Q1 2025', fragment: 'recogidas_playa_tenerife' },
};

function allScope(campaignId: string): CampaignScope {
  return {
    campaignId,
    campaignName: 'All campaigns',
    siteLabel: 'All sites',
    city: 'Spain',
    lat: 41.4377,
    lon: 2.2442, // Mediterráneo representative (Badalona)
    fragments: FILE_LABELS.map((l) => l.fragment),
  };
}

export function resolveCampaignScope(campaignId: string | undefined): CampaignScope {
  if (!campaignId || campaignId === 'all') return allScope('all');
  const mapped = CAMPAIGN_MAP[campaignId];
  if (!mapped) return allScope(campaignId);
  const label = FILE_LABELS.find((l) => l.fragment === mapped.fragment);
  return {
    campaignId,
    campaignName: mapped.name,
    siteLabel: label?.site ?? mapped.fragment,
    city: label?.city ?? 'Spain',
    lat: label?.lat ?? 41.4377,
    lon: label?.lon ?? 2.2442,
    fragments: [mapped.fragment],
  };
}
