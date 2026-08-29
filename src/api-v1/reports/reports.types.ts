export type ReportType = 'monthly' | 'annual' | 'campaign' | 'location' | 'evidence' | 'custom';
export type ReportDetail = 'summary' | 'standard' | 'detailed';
export type ReportLanguage = 'en' | 'es' | 'fr';
export type ReportFormat = 'pdf' | 'xlsx';
export type CleanupStatus = 'verified' | 'pending';

export interface ReportInclude {
  kpis?: boolean; map?: boolean; charts?: boolean; cleanupsList?: boolean;
  evidence?: boolean; plasticTypes?: boolean; ondas?: boolean; impactIndex?: boolean;
}

export interface ReportRequest {
  type: ReportType;
  period?: { preset?: 'month' | 'year' | '2024' | 'all'; start?: string; end?: string };
  scope?: { campaign?: string; entity?: string };
  detail?: ReportDetail;
  language?: ReportLanguage;
  format?: ReportFormat;
  include?: ReportInclude;
}

export interface ResolvedPeriod { start: string; end: string; label: string }

export interface PlasticType { type: string; pct: number; color: string }
export interface SeriesPoint { label: string; kg: number }
export interface CleanupRow {
  date: string; location: string; city: string; kg: number; volunteers: number;
  km: number; duration: string; evidence: number; status: CleanupStatus;
}
export interface SiteRow { name: string; lat: number; lon: number; kg: number; cleanups: number }

export interface ReportKpis {
  kg: number; co2eqTonnes: number; cleanups: number; volunteers: number; km: number;
  durationHours: number; locations: number; avgKg: number; evidenceCount: number;
  impactIndex: number; impactRating: string;
}

export interface ReportData {
  period: ResolvedPeriod;
  scopeLabel: string;
  kpis: ReportKpis;
  plasticTypes: PlasticType[];
  series: SeriesPoint[];
  cleanups: CleanupRow[];
  sites: SiteRow[];
}

export interface ReportResponse {
  requestId: string;
  status: 'ready';
  name: string;
  type: ReportType;
  period: string;
  generatedAt: string;
  format: 'pdf';
  size: string;
  downloadUrl: string;
}

export const POLYMER_COLUMNS: Array<{ col: string; label: string; color: string }> = [
  { col: 'Polyethylene terephthalate (%)', label: 'PET',    color: '#00003F' },
  { col: 'High-density polyethylene (%)',  label: 'HDPE',   color: '#39B3D8' },
  { col: 'Low-density polyethylene (%)',   label: 'LDPE',   color: '#BDEAF7' },
  { col: 'Polypropylene (%)',              label: 'PP',     color: '#4055F6' },
  { col: 'Polystyrene (%)',                label: 'PS',     color: '#2F8AA9' },
  { col: 'Polyvinyl chloride (%)',         label: 'PVC',    color: '#62C8E8' },
  { col: 'Others (%)',                     label: 'Others', color: '#B8BBC9' },
];

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  monthly: 'Monthly cleanup report',
  annual: 'Annual cleanup report',
  campaign: 'Campaign report',
  location: 'Location report',
  evidence: 'Evidence report',
  custom: 'Custom period report',
};

// Cover-page title (matches report-template.html cover-title).
export const REPORT_TYPE_TITLES: Record<ReportType, string> = {
  monthly: 'Monthly Cleanup Report',
  annual: 'Annual Cleanup Report',
  campaign: 'Campaign Report',
  location: 'Location Report',
  evidence: 'Evidence Report',
  custom: 'Custom Period Report',
};

export const DEFAULT_INCLUDE: Required<ReportInclude> = {
  kpis: true, map: true, charts: true, cleanupsList: true,
  evidence: true, plasticTypes: true, ondas: false, impactIndex: true,
};

// Light theme palette — exact tokens from docs/report-template.html.
export const THEME = {
  bg: '#ffffff',
  ink: '#00003F',
  accent: '#42C3EE',
  muted: '#777D80',
  muted2: '#9BB5C0',
  body: '#3D4649',
  cardBorder: '#DEE0E0',
  panel: '#F0F7FB',
  verifiedFg: '#166534', verifiedBg: '#DCFCE7',
  pendingFg: '#92400E', pendingBg: '#FEF3C7',
  gaugeStops: ['#F3EE5F', '#7DD9A8', '#42C3EE'] as const,
} as const;

export const CO2E_TONNES_PER_KG = 0.01;

export function impactRatingFor(idx: number): string {
  if (idx >= 76) return 'Excellent';
  if (idx >= 51) return 'Good';
  if (idx >= 26) return 'Fair';
  return 'Low';
}
