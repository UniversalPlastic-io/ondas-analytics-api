# Blue Resilience Report Endpoint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `POST /v1/reports/request` to generate a Blue Resilience–branded cleanup report PDF (matching the design team reference) from real `recogidas_playa` S3 data, upload it to the data bucket, and return the public HTTPS download URL.

**Architecture:** New NestJS module `src/api-v1/reports/`, mirroring `analyses/`. Pure functions (period, campaign map, aggregation, validation, SVG page builders, S3 key building) are unit-tested in isolation. Pages are composed as **SVG strings** (light theme, reference layout), rasterized with **sharp**, and embedded full-page in a pdf-lib A4 document. The service orchestrates; an e2e test exercises the HTTP endpoint with `fetch` and S3 mocked.

**Tech Stack:** NestJS 10, TypeScript 5 (strict), `sharp` (SVG→PNG, already a dep), `pdf-lib` (PDF assembly), `@aws-sdk/client-s3` (upload), Jest + ts-jest (unit `*.spec.ts` in `src/`), supertest (e2e `*.e2e-spec.ts` in `test/`).

## Global Constraints

- TypeScript strict mode (`strictNullChecks`, `noImplicitAny`) — no implicit `any`, handle `undefined`.
- Unit tests are `*.spec.ts` colocated in `src/`, run with `npm test` (Jest `rootDir` is `src`).
- e2e tests are `*.e2e-spec.ts` in `test/`, run with `npm run test:e2e`.
- Endpoint has **no auth guard** (public). Route prefix `/v1`, tag `Reports`.
- Data bucket `universalplastic-sedia`, region `eu-central-1`, public base `https://universalplastic-sedia.s3.eu-central-1.amazonaws.com`.
- `format: "xlsx"` is silently coerced to `pdf`.
- Error responses use NestJS exceptions producing `{ error, message }` bodies.
- **Visual target:** `docs/report-template.html` (preview `docs/Monthly Cleanup Report — Blue Resilience.pdf`) — light theme, navy `#00003F`, cyan `#42C3EE`; Universal Plastic logo (inlined from template); cover page + content pages; numbered section badges; KPI cards (kg, CO₂eq, cleanup events, impact index); horizontal plastic-type bars; monthly-trend line chart; cleanup-events table with status pills; gradient impact-index gauge; location-overview placeholder.
- **Rendering:** SVG (viewBox `0 0 794 1123`, A4 @ ~96dpi) → `sharp` rasterize at 2× density → `pdf.embedPng` → full-bleed A4 page. No headless browser.
- CO₂eq factor: `co2eqTonnes = kg × 0.01`. Impact rating bands: ≥76 Excellent, 51–75 Good, 26–50 Fair, ≤25 Low.
- Per-row Location/City come from a per-file site/city map; STATUS is always `verified`.
- Field names stay in English (project convention).

---

## File Structure

```
src/api-v1/reports/
├── reports.types.ts            types + constants (polymer map, palette/THEME)
├── reports-period.ts           resolvePeriod() + parseDurationHours()
├── reports-campaign-map.ts     campaign id → scoped S3 files (+ site/city) + metadata
├── reports-data.ts             aggregateReportData() (pure) + fetchRecogidasFiles()
├── reports-validate.ts         validateReportRequest() (pure)
├── reports-svg.ts              buildReportPages() → SVG strings (per-type, light theme)
├── reports-pdf.ts              buildReportPdf() → rasterize SVGs (sharp) + assemble (pdf-lib)
├── reports-s3.ts               resolveReportOcean() + uploadReportToS3()
├── reports.service.ts          ReportsService.generate() orchestration
├── reports.controller.ts       POST /v1/reports/request + swagger
└── reports.swagger.dto.ts      Swagger DTOs + example bodies
src/api-v1/api-v1.module.ts     (modify: register controller + service)
test/reports.e2e-spec.ts        e2e happy-path + validation
```

The Universal Plastic logo SVG and the three chart SVGs are inlined as code in
`reports-svg.ts` (copied from `docs/report-template.html`) — no external asset.

---

## Shared Type Reference

Defined in Task 1 (`reports.types.ts`), consumed by every later task:

```ts
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
```

Constants in `reports.types.ts`:

```ts
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
```

---

### Task 1: Types, constants & theme

**Files:**
- Create: `src/api-v1/reports/reports.types.ts`
- Test: `src/api-v1/reports/reports.types.spec.ts`

**Interfaces:**
- Produces: all types/constants in "Shared Type Reference" + `impactRatingFor`, `CO2E_TONNES_PER_KG`, `THEME`.

- [ ] **Step 1: Write the failing test**

Create `src/api-v1/reports/reports.types.spec.ts`:

```ts
import { impactRatingFor, CO2E_TONNES_PER_KG, POLYMER_COLUMNS } from './reports.types';

describe('reports.types', () => {
  it('rates impact index into bands', () => {
    expect(impactRatingFor(81)).toBe('Excellent');
    expect(impactRatingFor(60)).toBe('Good');
    expect(impactRatingFor(40)).toBe('Fair');
    expect(impactRatingFor(10)).toBe('Low');
  });
  it('CO2 factor reproduces the reference (1240 kg → 12.4 t)', () => {
    expect(1240 * CO2E_TONNES_PER_KG).toBeCloseTo(12.4, 5);
  });
  it('has 7 polymer columns with palette colors', () => {
    expect(POLYMER_COLUMNS).toHaveLength(7);
    expect(POLYMER_COLUMNS[0]).toMatchObject({ label: 'PET', color: '#00003F' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- reports.types`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write the implementation**

Create `src/api-v1/reports/reports.types.ts` with the EXACT contents of the
"Shared Type Reference" type/interface block, followed by the constants block
above (`POLYMER_COLUMNS`, `REPORT_TYPE_LABELS`, `REPORT_TYPE_TITLES`,
`DEFAULT_INCLUDE`, `THEME`, `CO2E_TONNES_PER_KG`, `impactRatingFor`).

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- reports.types`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/api-v1/reports/reports.types.ts src/api-v1/reports/reports.types.spec.ts
git commit -m "feat(reports): types, constants and light theme palette"
```

---

### Task 2: Period resolution & duration parsing

**Files:**
- Create: `src/api-v1/reports/reports-period.ts`
- Test: `src/api-v1/reports/reports-period.spec.ts`

**Interfaces:**
- Consumes: `ReportRequest`, `ReportType`, `ResolvedPeriod` from `reports.types.ts`.
- Produces:
  - `resolvePeriod(period: ReportRequest['period'], type: ReportType, now: Date): ResolvedPeriod`
  - `parseDurationHours(hms: string): number`

`now` is injected for deterministic tests.

- [ ] **Step 1: Write the failing test**

Create `src/api-v1/reports/reports-period.spec.ts`:

```ts
import { resolvePeriod, parseDurationHours } from './reports-period';

const NOW = new Date('2026-06-18T10:00:00.000Z');

describe('parseDurationHours', () => {
  it('parses HH:MM:SS to decimal hours', () => {
    expect(parseDurationHours('0:28:38')).toBeCloseTo(0.4772, 3);
    expect(parseDurationHours('2:30:00')).toBeCloseTo(2.5, 5);
  });
  it('returns 0 for malformed input', () => {
    expect(parseDurationHours('')).toBe(0);
    expect(parseDurationHours('abc')).toBe(0);
  });
});

describe('resolvePeriod', () => {
  it('month preset → current month bounds + label', () => {
    const r = resolvePeriod({ preset: 'month' }, 'monthly', NOW);
    expect(r).toEqual({ start: '2026-06-01', end: '2026-06-30', label: 'June 2026' });
  });
  it('year preset → current year', () => {
    expect(resolvePeriod({ preset: 'year' }, 'annual', NOW)).toEqual({ start: '2026-01-01', end: '2026-12-31', label: '2026' });
  });
  it('2024 preset', () => {
    expect(resolvePeriod({ preset: '2024' }, 'annual', NOW)).toEqual({ start: '2024-01-01', end: '2024-12-31', label: '2024' });
  });
  it('all preset → wide open', () => {
    expect(resolvePeriod({ preset: 'all' }, 'monthly', NOW)).toEqual({ start: '1970-01-01', end: '2999-12-31', label: 'All time' });
  });
  it('custom uses explicit start/end', () => {
    expect(resolvePeriod({ start: '2025-03-01', end: '2025-05-31' }, 'custom', NOW))
      .toEqual({ start: '2025-03-01', end: '2025-05-31', label: '2025-03-01 → 2025-05-31' });
  });
  it('explicit start/end override preset for non-custom', () => {
    const r = resolvePeriod({ preset: 'month', start: '2025-01-01', end: '2025-01-31' }, 'monthly', NOW);
    expect(r.start).toBe('2025-01-01');
    expect(r.end).toBe('2025-01-31');
  });
  it('defaults to current month when nothing supplied', () => {
    expect(resolvePeriod(undefined, 'monthly', NOW).start).toBe('2026-06-01');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- reports-period`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write minimal implementation**

Create `src/api-v1/reports/reports-period.ts`:

```ts
import { ReportRequest, ReportType, ResolvedPeriod } from './reports.types';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function parseDurationHours(hms: string): number {
  if (typeof hms !== 'string') return 0;
  const parts = hms.split(':');
  if (parts.length !== 3) return 0;
  const [h, m, s] = parts.map((p) => Number(p));
  if (![h, m, s].every((n) => Number.isFinite(n))) return 0;
  return h + m / 60 + s / 3600;
}

function pad(n: number): string { return String(n).padStart(2, '0'); }
function ymd(y: number, m: number, d: number): string { return `${y}-${pad(m)}-${pad(d)}`; }

export function resolvePeriod(
  period: ReportRequest['period'],
  type: ReportType,
  now: Date,
): ResolvedPeriod {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth() + 1;

  if (type === 'custom' && period?.start && period?.end) {
    return { start: period.start, end: period.end, label: `${period.start} → ${period.end}` };
  }
  if (period?.start && period?.end) {
    return { start: period.start, end: period.end, label: `${period.start} → ${period.end}` };
  }

  const preset = period?.preset ?? 'month';
  switch (preset) {
    case 'year':  return { start: ymd(y, 1, 1), end: ymd(y, 12, 31), label: `${y}` };
    case '2024':  return { start: '2024-01-01', end: '2024-12-31', label: '2024' };
    case 'all':   return { start: '1970-01-01', end: '2999-12-31', label: 'All time' };
    case 'month':
    default: {
      const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
      return { start: ymd(y, m, 1), end: ymd(y, m, lastDay), label: `${MONTH_NAMES[m - 1]} ${y}` };
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- reports-period`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/api-v1/reports/reports-period.ts src/api-v1/reports/reports-period.spec.ts
git commit -m "feat(reports): period resolution and duration parsing"
```

---

### Task 3: Campaign → scoped files map

**Files:**
- Create: `src/api-v1/reports/reports-campaign-map.ts`
- Test: `src/api-v1/reports/reports-campaign-map.spec.ts`

**Interfaces:**
- Consumes: `S3_CATALOGUE` from `../analyses/s3-catalogue`.
- Produces:
  - `interface ScopedFile { url: string; siteLabel: string; city: string; lat: number; lon: number }`
  - `interface CampaignScope { campaignId: string; campaignName: string; siteLabel: string; city: string; lat: number; lon: number; urls: ScopedFile[] }`
  - `resolveCampaignScope(campaignId: string | undefined): CampaignScope`

`c1..c4` → one scoped file; `'all'`/undefined → all 5 recogidas files, each
tagged with its own site/city. Unknown id falls back to `'all'`.

- [ ] **Step 1: Write the failing test**

Create `src/api-v1/reports/reports-campaign-map.spec.ts`:

```ts
import { resolveCampaignScope } from './reports-campaign-map';

describe('resolveCampaignScope', () => {
  it('maps c3 → Barcelona, single file with site/city', () => {
    const s = resolveCampaignScope('c3');
    expect(s.campaignId).toBe('c3');
    expect(s.campaignName).toMatch(/Barceloneta/i);
    expect(s.urls).toHaveLength(1);
    expect(s.urls[0].url).toContain('recogidas_playas_barcelona');
    expect(s.urls[0].siteLabel).toBe('Barcelona');
    expect(s.urls[0].city).toBe('Barcelona');
  });
  it('maps c1 → Blanes / Costa Brava', () => {
    const s = resolveCampaignScope('c1');
    expect(s.urls[0].url).toContain('recogidas_playas_blanes');
    expect(s.urls[0].city).toBe('Costa Brava');
  });
  it('all → 5 scoped files each tagged', () => {
    const s = resolveCampaignScope('all');
    expect(s.campaignId).toBe('all');
    expect(s.urls).toHaveLength(5);
    expect(s.urls.every((u) => u.siteLabel && u.city)).toBe(true);
  });
  it('undefined behaves like all', () => {
    expect(resolveCampaignScope(undefined).urls).toHaveLength(5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- reports-campaign-map`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write minimal implementation**

Create `src/api-v1/reports/reports-campaign-map.ts`:

```ts
import { S3_CATALOGUE } from '../analyses/s3-catalogue';

export interface ScopedFile {
  url: string; siteLabel: string; city: string; lat: number; lon: number;
}

export interface CampaignScope {
  campaignId: string;
  campaignName: string;
  siteLabel: string;
  city: string;
  lat: number;
  lon: number;
  urls: ScopedFile[];
}

// Per-file site/city labels (recogidas_playa has no place name).
const FILE_LABELS: Array<{ fragment: string; site: string; city: string }> = [
  { fragment: 'recogidas_playas_barcelona', site: 'Barcelona', city: 'Barcelona' },
  { fragment: 'recogidas_playas_badalona',  site: 'Badalona',  city: 'Badalona' },
  { fragment: 'recogidas_playas_blanes',    site: 'Blanes',    city: 'Costa Brava' },
  { fragment: 'recogidas_playa_tenerife',   site: 'Tenerife',  city: 'Canary Islands' },
  { fragment: 'recogidas_playas_gijon',     site: 'Gijón',     city: 'Asturias' },
];

function scopedFileFor(fragment: string): ScopedFile {
  const entry = S3_CATALOGUE.find((e) => e.type === 'recogidas_playa' && e.url.includes(fragment));
  if (!entry) throw new Error(`recogidas entry not found for: ${fragment}`);
  const label = FILE_LABELS.find((l) => l.fragment === fragment);
  return {
    url: entry.url, lat: entry.lat, lon: entry.lon,
    siteLabel: label?.site ?? fragment, city: label?.city ?? 'Spain',
  };
}

function allScopedFiles(): ScopedFile[] {
  return FILE_LABELS
    .map((l) => {
      const entry = S3_CATALOGUE.find((e) => e.type === 'recogidas_playa' && e.url.includes(l.fragment));
      if (!entry) return null;
      return { url: entry.url, lat: entry.lat, lon: entry.lon, siteLabel: l.site, city: l.city };
    })
    .filter((x): x is ScopedFile => x !== null);
}

const CAMPAIGN_MAP: Record<string, { name: string; fragment: string }> = {
  c1: { name: 'Costa Brava Spring Clean 2025', fragment: 'recogidas_playas_blanes' },
  c2: { name: 'Mediterranean Blue 2024',       fragment: 'recogidas_playas_badalona' },
  c3: { name: 'Barceloneta Urban Impact',      fragment: 'recogidas_playas_barcelona' },
  c4: { name: 'Corporate Wave Q1 2025',        fragment: 'recogidas_playa_tenerife' },
};

function allScope(campaignId: string): CampaignScope {
  return {
    campaignId, campaignName: 'All campaigns', siteLabel: 'All sites', city: 'Spain',
    lat: 41.4377, lon: 2.2442, // Mediterráneo representative (Badalona)
    urls: allScopedFiles(),
  };
}

export function resolveCampaignScope(campaignId: string | undefined): CampaignScope {
  if (!campaignId || campaignId === 'all') return allScope('all');
  const mapped = CAMPAIGN_MAP[campaignId];
  if (!mapped) return allScope(campaignId);
  const file = scopedFileFor(mapped.fragment);
  return {
    campaignId, campaignName: mapped.name,
    siteLabel: file.siteLabel, city: file.city, lat: file.lat, lon: file.lon,
    urls: [file],
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- reports-campaign-map`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/api-v1/reports/reports-campaign-map.ts src/api-v1/reports/reports-campaign-map.spec.ts
git commit -m "feat(reports): campaign id to scoped S3 files with site/city"
```

---

### Task 4: Data aggregation

**Files:**
- Create: `src/api-v1/reports/reports-data.ts`
- Test: `src/api-v1/reports/reports-data.spec.ts`

**Interfaces:**
- Consumes: types + `POLYMER_COLUMNS`, `CO2E_TONNES_PER_KG`, `impactRatingFor` from `reports.types.ts`; `parseDurationHours` from `reports-period.ts`; `ScopedFile` from `reports-campaign-map.ts`.
- Produces:
  - `interface RecogidasFile { dataset: { records: Array<Record<string, unknown>> } }`
  - `interface TaggedFile { file: RecogidasFile; siteLabel: string; city: string }`
  - `aggregateReportData(files: TaggedFile[], period: ResolvedPeriod, scopeLabel: string, type: ReportType): ReportData`
  - `fetchRecogidasFiles(scoped: ScopedFile[]): Promise<TaggedFile[]>`

`aggregateReportData` is pure. Filters records to `period.start <= Date <=
period.end`, throws `Error('insufficient_data')` if none. Each row gets
`location`/`city` from its source file's labels and `status: 'verified'`.
`series` is daily (label=date) except `annual` → monthly buckets (label=`YYYY-MM`).
`sites` group by source site label.

- [ ] **Step 1: Write the failing test**

Create `src/api-v1/reports/reports-data.spec.ts`:

```ts
import { aggregateReportData, RecogidasFile, TaggedFile } from './reports-data';

const REC = (date: string, kg: number, vol: number, dist: number, dur: string, pet: number, imgs: string) => ({
  'Date': date, 'Start point': '41.437,2.244', 'End point': '41.437,2.242',
  'Plastic waste collected': kg, 'Number of participants': vol, 'Walking distance': dist,
  'Cleanup duration': dur,
  'Polyethylene terephthalate (%)': pet, 'High-density polyethylene (%)': 20,
  'Low-density polyethylene (%)': 10, 'Polypropylene (%)': 10,
  'Polystyrene (%)': 0, 'Polyvinyl chloride (%)': 0, 'Others (%)': 0,
  'Collected waste image': imgs,
});

const FILE: RecogidasFile = { dataset: { records: [
  REC('2025-11-07', 0.5, 2, 1.54, '0:30:00', 40, 'a.jpg | b.jpg | c.jpg'),
  REC('2025-11-09', 1.5, 4, 2.0, '1:30:00', 60, 'd.jpg'),
] } };
const TAGGED: TaggedFile[] = [{ file: FILE, siteLabel: 'Badalona', city: 'Badalona' }];
const PERIOD = { start: '2025-11-01', end: '2025-11-30', label: 'November 2025' };

describe('aggregateReportData', () => {
  it('sums KPIs incl. CO2eq and rating', () => {
    const d = aggregateReportData(TAGGED, PERIOD, 'All campaigns', 'monthly');
    expect(d.kpis.kg).toBeCloseTo(2.0, 5);
    expect(d.kpis.co2eqTonnes).toBeCloseTo(0.02, 5); // 2 kg × 0.01
    expect(d.kpis.cleanups).toBe(2);
    expect(d.kpis.volunteers).toBe(6);
    expect(d.kpis.km).toBeCloseTo(3.54, 5);
    expect(d.kpis.durationHours).toBeCloseTo(2.0, 5);
    expect(d.kpis.avgKg).toBeCloseTo(1.0, 5);
    expect(d.kpis.evidenceCount).toBe(4);
    expect(typeof d.kpis.impactRating).toBe('string');
    expect(d.kpis.impactIndex).toBeGreaterThanOrEqual(0);
    expect(d.kpis.impactIndex).toBeLessThanOrEqual(100);
  });

  it('tags rows with location/city/status', () => {
    const d = aggregateReportData(TAGGED, PERIOD, 'All campaigns', 'monthly');
    expect(d.cleanups[0].location).toBe('Badalona');
    expect(d.cleanups[0].city).toBe('Badalona');
    expect(d.cleanups[0].status).toBe('verified');
  });

  it('averages polymer composition with palette colors', () => {
    const d = aggregateReportData(TAGGED, PERIOD, 'All campaigns', 'monthly');
    const pet = d.plasticTypes.find((p) => p.type === 'PET');
    expect(pet?.pct).toBeCloseTo(50, 5);
    expect(pet?.color).toBe('#00003F');
  });

  it('filters out-of-period records', () => {
    const d = aggregateReportData(TAGGED, { start: '2025-11-08', end: '2025-11-30', label: 'x' }, 's', 'monthly');
    expect(d.kpis.cleanups).toBe(1);
  });

  it('buckets series monthly for annual', () => {
    const d = aggregateReportData(TAGGED, PERIOD, 'All campaigns', 'annual');
    expect(d.series[0]).toEqual({ label: '2025-11', kg: 2 });
  });

  it('throws insufficient_data when nothing matches', () => {
    expect(() => aggregateReportData(TAGGED, { start: '2020-01-01', end: '2020-12-31', label: 'x' }, 's', 'monthly'))
      .toThrow('insufficient_data');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- reports-data`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write minimal implementation**

Create `src/api-v1/reports/reports-data.ts`:

```ts
import {
  CleanupRow, CO2E_TONNES_PER_KG, impactRatingFor, PlasticType, POLYMER_COLUMNS,
  ReportData, ReportKpis, ReportType, ResolvedPeriod, SeriesPoint, SiteRow,
} from './reports.types';
import { parseDurationHours } from './reports-period';
import { ScopedFile } from './reports-campaign-map';

export interface RecogidasFile {
  dataset: { records: Array<Record<string, unknown>> };
}
export interface TaggedFile {
  file: RecogidasFile; siteLabel: string; city: string;
}

const HTTP_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const httpCache = new Map<string, { raw: RecogidasFile; fetchedAtMs: number }>();

export async function fetchRecogidasFiles(scoped: ScopedFile[]): Promise<TaggedFile[]> {
  const out: TaggedFile[] = [];
  for (const s of scoped) {
    const cached = httpCache.get(s.url);
    if (cached && Date.now() - cached.fetchedAtMs < HTTP_CACHE_TTL_MS) {
      out.push({ file: cached.raw, siteLabel: s.siteLabel, city: s.city });
      continue;
    }
    const res = await fetch(s.url);
    if (!res.ok) continue;
    const raw = (await res.json()) as RecogidasFile;
    httpCache.set(s.url, { raw, fetchedAtMs: Date.now() });
    out.push({ file: raw, siteLabel: s.siteLabel, city: s.city });
  }
  return out;
}

function num(v: unknown): number { return typeof v === 'number' && Number.isFinite(v) ? v : 0; }
function str(v: unknown): string { return typeof v === 'string' ? v : ''; }
function clamp(n: number, lo: number, hi: number): number { return Math.max(lo, Math.min(hi, n)); }
function round(n: number, d = 2): number { const m = 10 ** d; return Math.round(n * m) / m; }

function countImages(v: unknown): number {
  const s = str(v).trim();
  if (!s) return 0;
  return s.split('|').map((x) => x.trim()).filter(Boolean).length;
}

export function aggregateReportData(
  files: TaggedFile[],
  period: ResolvedPeriod,
  scopeLabel: string,
  type: ReportType,
): ReportData {
  let kg = 0, volunteers = 0, km = 0, durationHours = 0, evidenceCount = 0, count = 0;
  const polymerSums = new Map<string, number>();
  const cleanups: CleanupRow[] = [];
  const siteMap = new Map<string, SiteRow>();
  const dailyKg = new Map<string, number>();
  const monthlyKg = new Map<string, number>();

  for (const { file, siteLabel, city } of files) {
    for (const r of file?.dataset?.records ?? []) {
      const date = str(r['Date']);
      if (!date || date < period.start || date > period.end) continue;
      count += 1;

      const recKg = num(r['Plastic waste collected']);
      const recVol = num(r['Number of participants']);
      const recKm = num(r['Walking distance']);
      const recDur = str(r['Cleanup duration']);
      const evidence = countImages(r['Collected waste image']);

      kg += recKg; volunteers += recVol; km += recKm;
      durationHours += parseDurationHours(recDur); evidenceCount += evidence;

      for (const { col, label } of POLYMER_COLUMNS) {
        polymerSums.set(label, (polymerSums.get(label) ?? 0) + num(r[col]));
      }

      cleanups.push({
        date, location: siteLabel, city, kg: recKg, volunteers: recVol,
        km: recKm, duration: recDur, evidence, status: 'verified',
      });

      const existing = siteMap.get(siteLabel);
      if (existing) { existing.kg += recKg; existing.cleanups += 1; }
      else {
        const [lat, lon] = str(r['Start point']).split(',').map((x) => Number(x));
        siteMap.set(siteLabel, { name: siteLabel, lat: lat || 0, lon: lon || 0, kg: recKg, cleanups: 1 });
      }

      dailyKg.set(date, (dailyKg.get(date) ?? 0) + recKg);
      const month = date.slice(0, 7);
      monthlyKg.set(month, (monthlyKg.get(month) ?? 0) + recKg);
    }
  }

  if (count === 0) throw new Error('insufficient_data');

  const avgKg = count > 0 ? kg / count : 0;

  const plasticTypes: PlasticType[] = POLYMER_COLUMNS.map(({ label, color }) => ({
    type: label, pct: round((polymerSums.get(label) ?? 0) / count, 2), color,
  }));

  const densityScore = clamp(kg / Math.max(km, 0.1) / 50, 0, 1);
  const participationScore = clamp(volunteers / Math.max(count, 1) / 10, 0, 1);
  const impactIndex = Math.round((0.6 * densityScore + 0.4 * participationScore) * 100);

  const kpis: ReportKpis = {
    kg: round(kg, 2), co2eqTonnes: round(kg * CO2E_TONNES_PER_KG, 2), cleanups: count,
    volunteers, km: round(km, 2), durationHours: round(durationHours, 2),
    locations: siteMap.size, avgKg: round(avgKg, 2), evidenceCount,
    impactIndex, impactRating: impactRatingFor(impactIndex),
  };

  const seriesSource = type === 'annual' ? monthlyKg : dailyKg;
  const series: SeriesPoint[] = Array.from(seriesSource.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([label, v]) => ({ label, kg: round(v, 2) }));

  const sites: SiteRow[] = Array.from(siteMap.values())
    .map((s) => ({ ...s, kg: round(s.kg, 2) }))
    .sort((a, b) => b.kg - a.kg);

  cleanups.sort((a, b) => (a.date < b.date ? -1 : 1));

  return { period, scopeLabel, kpis, plasticTypes, series, cleanups, sites };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- reports-data`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/api-v1/reports/reports-data.ts src/api-v1/reports/reports-data.spec.ts
git commit -m "feat(reports): aggregate recogidas_playa into ReportData (CO2eq, site/city, status)"
```

---

### Task 5: Request validation

**Files:**
- Create: `src/api-v1/reports/reports-validate.ts`
- Test: `src/api-v1/reports/reports-validate.spec.ts`

**Interfaces:**
- Consumes: `ReportRequest`, `ResolvedPeriod` from `reports.types.ts`.
- Produces:
  - `type ValidationError = 'campaign_required' | 'date_range_required' | 'invalid_date_range'`
  - `validateReportRequest(req: ReportRequest, period: ResolvedPeriod): ValidationError | null`

Returns the first failing rule, or `null`. `insufficient_data` is not checked here.

- [ ] **Step 1: Write the failing test**

Create `src/api-v1/reports/reports-validate.spec.ts`:

```ts
import { validateReportRequest } from './reports-validate';

const P = { start: '2025-01-01', end: '2025-01-31', label: 'x' };

describe('validateReportRequest', () => {
  it('campaign type without id → campaign_required', () => {
    expect(validateReportRequest({ type: 'campaign', scope: { campaign: 'all' } }, P)).toBe('campaign_required');
    expect(validateReportRequest({ type: 'campaign' }, P)).toBe('campaign_required');
  });
  it('campaign type with id → ok', () => {
    expect(validateReportRequest({ type: 'campaign', scope: { campaign: 'c2' } }, P)).toBeNull();
  });
  it('custom without start/end → date_range_required', () => {
    expect(validateReportRequest({ type: 'custom', period: { start: '2025-01-01' } }, P)).toBe('date_range_required');
    expect(validateReportRequest({ type: 'custom' }, P)).toBe('date_range_required');
  });
  it('start after end → invalid_date_range', () => {
    expect(validateReportRequest({ type: 'monthly' }, { start: '2025-02-01', end: '2025-01-01', label: 'x' })).toBe('invalid_date_range');
  });
  it('valid monthly → null', () => {
    expect(validateReportRequest({ type: 'monthly' }, P)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- reports-validate`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write minimal implementation**

Create `src/api-v1/reports/reports-validate.ts`:

```ts
import { ReportRequest, ResolvedPeriod } from './reports.types';

export type ValidationError = 'campaign_required' | 'date_range_required' | 'invalid_date_range';

export function validateReportRequest(req: ReportRequest, period: ResolvedPeriod): ValidationError | null {
  if (req.type === 'campaign') {
    const c = req.scope?.campaign;
    if (!c || c === 'all') return 'campaign_required';
  }
  if (req.type === 'custom') {
    if (!req.period?.start || !req.period?.end) return 'date_range_required';
  }
  if (period.start > period.end) return 'invalid_date_range';
  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- reports-validate`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/api-v1/reports/reports-validate.ts src/api-v1/reports/reports-validate.spec.ts
git commit -m "feat(reports): request validation rules"
```

---

### Task 6: SVG page builders

**Files:**
- Create: `src/api-v1/reports/reports-svg.ts`
- Test: `src/api-v1/reports/reports-svg.spec.ts`

**Interfaces:**
- Consumes: `ReportData`, `ReportType`, `ReportDetail`, `ReportInclude`, `THEME`, `REPORT_TYPE_TITLES` from `reports.types.ts`; `CampaignScope` from `reports-campaign-map.ts`.
- Produces:
  - `interface ReportMeta { reportId: string; generatedAt: string; detail: ReportDetail; country: string }`
  - `buildReportPages(opts: { data: ReportData; type: ReportType; detail: ReportDetail; include: Required<ReportInclude>; campaign: CampaignScope; meta: ReportMeta }): string[]`

Returns one SVG string (`<svg…</svg>`, viewBox `0 0 794 1123`) per A4 page,
porting `docs/report-template.html` (exact CSS tokens via `THEME`, inlined
Universal Plastic logo + chart SVGs). Light theme. Section gating by `include`.
Pure string functions — no I/O.

- [ ] **Step 1: Write the failing test**

Create `src/api-v1/reports/reports-svg.spec.ts`:

```ts
import { buildReportPages } from './reports-svg';
import { DEFAULT_INCLUDE, ReportData, ReportType } from './reports.types';
import { resolveCampaignScope } from './reports-campaign-map';

const DATA: ReportData = {
  period: { start: '2025-11-01', end: '2025-11-30', label: 'November 2025' },
  scopeLabel: 'Océano Foods',
  kpis: { kg: 1240, co2eqTonnes: 12.4, cleanups: 14, volunteers: 162, km: 48, durationHours: 36, locations: 5, avgKg: 88.6, evidenceCount: 98, impactIndex: 81, impactRating: 'Excellent' },
  plasticTypes: [
    { type: 'PET', pct: 32, color: '#00003F' }, { type: 'HDPE', pct: 18, color: '#39B3D8' },
    { type: 'LDPE', pct: 16, color: '#BDEAF7' }, { type: 'PP', pct: 14, color: '#4055F6' },
    { type: 'Others', pct: 8, color: '#B8BBC9' }, { type: 'PS', pct: 7, color: '#2F8AA9' },
    { type: 'PVC', pct: 5, color: '#62C8E8' },
  ],
  series: [ { label: '2025-01', kg: 420 }, { label: '2025-02', kg: 560 }, { label: '2025-03', kg: 780 }, { label: '2025-04', kg: 690 }, { label: '2025-05', kg: 1240 } ],
  cleanups: [
    { date: '2025-05-29', location: 'Blanes', city: 'Costa Brava', kg: 42.6, volunteers: 12, km: 1.2, duration: '0:30:00', evidence: 3, status: 'verified' },
    { date: '2025-05-26', location: 'Barcelona', city: 'Barcelona', kg: 78.2, volunteers: 24, km: 2.0, duration: '1:00:00', evidence: 5, status: 'verified' },
  ],
  sites: [ { name: 'Barcelona', lat: 41.6, lon: 2.7, kg: 78.2, cleanups: 1 }, { name: 'Blanes', lat: 41.6, lon: 2.7, kg: 42.6, cleanups: 1 } ],
};

const TYPES: ReportType[] = ['monthly', 'annual', 'campaign', 'location', 'evidence', 'custom'];

describe('buildReportPages', () => {
  const meta = { reportId: 'rep1', generatedAt: '2025-06-01', detail: 'standard' as const, country: 'Spain' };

  it.each(TYPES)('returns valid SVG pages for type %s', (type) => {
    const pages = buildReportPages({
      data: DATA, type, detail: 'standard', include: DEFAULT_INCLUDE,
      campaign: resolveCampaignScope(type === 'campaign' ? 'c1' : 'all'), meta,
    });
    expect(pages.length).toBeGreaterThanOrEqual(2);
    for (const svg of pages) {
      expect(svg.trimStart()).toMatch(/^<svg/);
      expect(svg.trimEnd()).toMatch(/<\/svg>$/);
      expect(svg).toContain('viewBox="0 0 794 1123"');
    }
  });

  it('cover page shows the report title, period and scope', () => {
    const [cover] = buildReportPages({
      data: DATA, type: 'monthly', detail: 'standard', include: DEFAULT_INCLUDE,
      campaign: resolveCampaignScope('all'), meta,
    });
    expect(cover).toContain('Monthly Cleanup Report');
    expect(cover).toContain('November 2025');
    expect(cover).toContain('Océano Foods');
  });

  it('content page renders KPI values and plastic types', () => {
    const pages = buildReportPages({
      data: DATA, type: 'monthly', detail: 'standard', include: DEFAULT_INCLUDE,
      campaign: resolveCampaignScope('all'), meta,
    });
    const all = pages.join('\n');
    expect(all).toContain('1,240');     // kg formatted
    expect(all).toContain('12.4');      // CO2eq
    expect(all).toContain('PET');
    expect(all).toContain('81');        // impact index
  });

  it('drops the location section when include.map is false', () => {
    const pages = buildReportPages({
      data: DATA, type: 'monthly', detail: 'standard',
      include: { ...DEFAULT_INCLUDE, map: false }, campaign: resolveCampaignScope('all'), meta,
    });
    expect(pages.join('\n')).not.toContain('LOCATION OVERVIEW');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- reports-svg`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write the implementation**

Create `src/api-v1/reports/reports-svg.ts`:

```ts
import {
  ReportData, ReportDetail, ReportInclude, ReportType, REPORT_TYPE_TITLES, THEME,
} from './reports.types';
import { CampaignScope } from './reports-campaign-map';

export interface ReportMeta {
  reportId: string; generatedAt: string; detail: ReportDetail; country: string;
}

const W = 794;
const H = 1123;
const M = 68;          // content side margin (~18mm @ 96dpi)
const FONT = "'Inter', Arial, Helvetica, sans-serif";

// Universal Plastic white horizontal logo. PASTE VERBATIM the full
// `<svg xmlns=... viewBox="0 0 264.4 82.68" width="180" height="56"> … </svg>`
// block from docs/report-template.html (lines 243–259) as a template string.
// It is white-filled and renders on the navy cover.
const UNIVERSAL_PLASTIC_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 264.4 82.68" width="180" height="56"><!-- paste the exact defs + paths from report-template.html lines 244-258 here --></svg>`;

function esc(s: unknown): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function fmtInt(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}
function cap(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmtDate(iso: string): string {
  // 'YYYY-MM-DD' → '18 Jun 2026'
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  return `${Number(m[3])} ${MONTHS_SHORT[Number(m[2]) - 1]} ${m[1]}`;
}

// Universal Plastic logo placed on the navy cover at (x,y).
function universalPlasticLogo(x: number, y: number): string {
  return `<g transform="translate(${x},${y})">${UNIVERSAL_PLASTIC_LOGO_SVG}</g>`;
}

function page(inner: string, bg: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<rect x="0" y="0" width="${W}" height="${H}" fill="${bg}"/>
${inner}
</svg>`;
}

function sectionBadge(n: string, label: string, y: number): string {
  return `<g>
    <rect x="${M}" y="${y - 12}" width="20" height="16" rx="4" fill="${THEME.accent}"/>
    <text x="${M + 10}" y="${y}" font-family="${FONT}" font-size="9" font-weight="700" fill="#ffffff" text-anchor="middle">${esc(n)}</text>
    <text x="${M + 28}" y="${y}" font-family="${FONT}" font-size="11" font-weight="700" letter-spacing="0.5" fill="${THEME.accent}">${esc(label.toUpperCase())}</text>
  </g>`;
}

// ---- Cover (page 1) ---- (ports report-template.html .cover)
function coverPage(data: ReportData, type: ReportType, campaign: CampaignScope, meta: ReportMeta): string {
  const title = REPORT_TYPE_TITLES[type];
  const scope = data.scopeLabel;
  const metaRows: Array<[string, string]> = [
    ['PERIOD', data.period.label],
    ['GENERATED', fmtDate(meta.generatedAt)],
    ['DETAIL LEVEL', meta.detail.charAt(0).toUpperCase() + meta.detail.slice(1)],
    ['REPORT ID', meta.reportId],
  ];
  let metaSvg = '';
  let my = 858;
  for (const [k, v] of metaRows) {
    metaSvg += `<text x="${M}" y="${my}" font-family="${FONT}" font-size="11" font-weight="500" letter-spacing="0.6" fill="${THEME.muted2}">${esc(k)}</text>
      <text x="${M + 130}" y="${my}" font-family="${FONT}" font-size="13" font-weight="500" fill="#ffffff">${esc(v)}</text>`;
    my += 26;
  }
  const inner = `
    ${universalPlasticLogo(M - 4, 60)}
    <text x="${M}" y="760" font-family="${FONT}" font-size="34" font-weight="700" fill="#ffffff">${esc(title)}</text>
    <rect x="${M}" y="780" width="64" height="2" fill="${THEME.accent}"/>
    <text x="${M}" y="820" font-family="${FONT}" font-size="16" font-weight="600" fill="${THEME.accent}">${esc(scope)} · ${esc(meta.country)}</text>
    ${metaSvg}
    <text x="${M}" y="1010" font-family="${FONT}" font-size="11" letter-spacing="0.4" fill="${THEME.muted2}">Universal Plastic · Blue Resilience</text>`;
  return page(inner, THEME.ink);
}

// ---- KPI cards ----
function kpiCards(data: ReportData, include: Required<ReportInclude>, y: number): string {
  const cards: Array<{ value: string; unit: string; label: string }> = [
    { value: fmtInt(data.kpis.kg), unit: 'kg', label: 'Total collected' },
    { value: String(data.kpis.co2eqTonnes), unit: 't CO₂eq', label: 'Carbon equivalent' },
    { value: String(data.kpis.cleanups), unit: 'events', label: 'Cleanup events' },
  ];
  if (include.impactIndex) cards.push({ value: String(data.kpis.impactIndex), unit: '/ 100', label: 'Impact Index' });
  else cards.push({ value: String(data.kpis.volunteers), unit: 'people', label: 'Volunteers' });

  const gap = 12;
  const cw = (W - 2 * M - gap * (cards.length - 1)) / cards.length;
  const ch = 88;
  let svg = '';
  for (let i = 0; i < cards.length; i++) {
    const x = M + i * (cw + gap);
    // card body + 3px cyan top border (template: border-top:3px solid #42C3EE)
    svg += `<rect x="${x}" y="${y}" width="${cw}" height="${ch}" rx="8" fill="#ffffff" stroke="${THEME.cardBorder}"/>
      <rect x="${x}" y="${y}" width="${cw}" height="3" rx="1.5" fill="${THEME.accent}"/>
      <text x="${x + 16}" y="${y + 44}" font-family="${FONT}" font-size="26" font-weight="700" fill="${THEME.ink}">${esc(cards[i].value)}</text>
      <text x="${x + 16}" y="${y + 62}" font-family="${FONT}" font-size="11" font-weight="500" fill="${THEME.accent}">${esc(cards[i].unit)}</text>
      <text x="${x + 16}" y="${y + 80}" font-family="${FONT}" font-size="11" fill="${THEME.muted}">${esc(cards[i].label)}</text>`;
  }
  return svg;
}

// ---- Plastic-type horizontal bars ---- (ports template SVG viewBox 0 0 348 196)
function plasticTypeBars(data: ReportData, y: number): string {
  const rows = data.plasticTypes.filter((p) => p.pct > 0);
  const rowH = 30;
  const panelH = 24 + rows.length * rowH;
  const labelX = M + 60;      // right-anchored polymer label
  const barX = labelX + 8;
  const pxPerPct = 2.6;       // template: 32% → ~83px
  let svg = `<rect x="${M}" y="${y}" width="${W - 2 * M}" height="${panelH}" rx="8" fill="${THEME.panel}"/>`;
  let ry = y + 28;
  for (const r of rows) {
    const bw = Math.max(2, r.pct * pxPerPct);
    svg += `<text x="${labelX}" y="${ry + 4}" font-family="${FONT}" font-size="10" fill="${THEME.ink}" text-anchor="end">${esc(r.type)}</text>
      <rect x="${barX}" y="${ry - 8}" width="${bw.toFixed(1)}" height="14" rx="3" fill="${esc(r.color)}" opacity="0.85"/>
      <text x="${(barX + bw + 6).toFixed(1)}" y="${ry + 4}" font-family="${FONT}" font-size="10" fill="${THEME.muted}">${esc(r.pct)}%</text>`;
    ry += rowH;
  }
  return svg;
}

// ---- Trend line chart ---- (ports template SVG viewBox 0 0 480 160)
function trendLineChart(data: ReportData, y: number): string {
  const pts = data.series;
  const panelW = W - 2 * M;
  const panelH = 200;
  const plotX = M + 44;
  const plotY = y + 20;
  const plotW = panelW - 70;
  const plotH = panelH - 64;
  const baseY = plotY + plotH;
  const maxKg = Math.max(1, ...pts.map((p) => p.kg));
  const n = Math.max(pts.length, 1);
  let svg = `<rect x="${M}" y="${y}" width="${panelW}" height="${panelH}" rx="8" fill="${THEME.panel}"/>
    <line x1="${plotX}" y1="${plotY}" x2="${plotX}" y2="${baseY}" stroke="${THEME.cardBorder}" stroke-width="1"/>
    <line x1="${plotX}" y1="${baseY}" x2="${plotX + plotW}" y2="${baseY}" stroke="${THEME.cardBorder}" stroke-width="1"/>
    <text x="${plotX - 6}" y="${plotY + 6}" font-family="${FONT}" font-size="9" fill="${THEME.muted}" text-anchor="end">${esc(fmtInt(maxKg))}</text>
    <text x="${plotX - 6}" y="${baseY + 4}" font-family="${FONT}" font-size="9" fill="${THEME.muted}" text-anchor="end">0</text>`;
  const coords = pts.map((p, i) => {
    const px = n === 1 ? plotX + plotW / 2 : plotX + (i / (n - 1)) * plotW;
    const py = baseY - (p.kg / maxKg) * plotH;
    return { px, py, label: p.label };
  });
  if (coords.length > 1) {
    const poly = coords.map((c) => `${c.px.toFixed(1)},${c.py.toFixed(1)}`).join(' ');
    svg += `<polyline points="${poly}" fill="none" stroke="${THEME.accent}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
  }
  for (const c of coords) {
    svg += `<circle cx="${c.px.toFixed(1)}" cy="${c.py.toFixed(1)}" r="3" fill="${THEME.accent}" stroke="#ffffff" stroke-width="1.5"/>
      <text x="${c.px.toFixed(1)}" y="${baseY + 18}" font-family="${FONT}" font-size="9" fill="${THEME.muted}" text-anchor="middle">${esc(cap(c.label, 7))}</text>`;
  }
  return svg;
}

// ---- Cleanup events table ----
function eventsTable(rows: ReportData['cleanups'], y: number, maxRows: number): { svg: string; rendered: number } {
  const cols = [
    { label: 'DATE', x: M, w: 90 },
    { label: 'LOCATION', x: M + 90, w: 150 },
    { label: 'CITY', x: M + 240, w: 150 },
    { label: 'COLLECTED', x: M + 390, w: 90 },
    { label: 'VOLUNTEERS', x: M + 480, w: 90 },
    { label: 'STATUS', x: M + 570, w: 100 },
  ];
  let svg = '';
  for (const c of cols) {
    svg += `<text x="${c.x}" y="${y}" font-family="${FONT}" font-size="9" letter-spacing="0.5" fill="${THEME.muted}">${esc(c.label)}</text>`;
  }
  let ry = y + 12;
  const slice = rows.slice(0, maxRows);
  for (let i = 0; i < slice.length; i++) {
    const r = slice[i];
    ry += 28;
    if (i % 2 === 1) svg += `<rect x="${M}" y="${ry - 18}" width="${W - 2 * M}" height="26" fill="${THEME.panel}" opacity="0.6"/>`;
    svg += `<text x="${cols[0].x}" y="${ry}" font-family="${FONT}" font-size="10" fill="${THEME.ink}">${esc(r.date)}</text>
      <text x="${cols[1].x}" y="${ry}" font-family="${FONT}" font-size="10" fill="${THEME.ink}">${esc(cap(r.location, 22))}</text>
      <text x="${cols[2].x}" y="${ry}" font-family="${FONT}" font-size="10" fill="${THEME.ink}">${esc(cap(r.city, 22))}</text>
      <text x="${cols[3].x}" y="${ry}" font-family="${FONT}" font-size="10" fill="${THEME.ink}">${esc(r.kg)} kg</text>
      <text x="${cols[4].x}" y="${ry}" font-family="${FONT}" font-size="10" fill="${THEME.ink}">${esc(r.volunteers)}</text>`;
    const isV = r.status === 'verified';
    const fg = isV ? THEME.verifiedFg : THEME.pendingFg;
    const bg = isV ? THEME.verifiedBg : THEME.pendingBg;
    svg += `<rect x="${cols[5].x}" y="${ry - 11}" width="58" height="16" rx="8" fill="${bg}"/>
      <text x="${cols[5].x + 29}" y="${ry}" font-family="${FONT}" font-size="9" fill="${fg}" text-anchor="middle">${esc(r.status)}</text>`;
  }
  return { svg, rendered: slice.length };
}

// ---- Impact gauge ---- (ports template SVG viewBox 0 0 240 185)
function gauge(data: ReportData, y: number): string {
  const score = Math.max(0, Math.min(100, data.kpis.impactIndex));
  const rating = data.kpis.impactRating;
  const nRot = (score / 100) * 180 - 180; // needle rotation (template formula)
  const [s0, s1, s2] = THEME.gaugeStops;
  const gw = 260;
  const textX = M + gw + 24;
  // Nested gauge svg placed at (M, y); side description to its right.
  return `<svg x="${M}" y="${y}" width="${gw}" height="${gw * 185 / 240}" viewBox="0 0 240 185">
      <defs>
        <linearGradient id="gauge-grad" gradientUnits="userSpaceOnUse" x1="32" y1="0" x2="208" y2="0">
          <stop offset="0" stop-color="${s0}"/><stop offset="0.5" stop-color="${s1}"/><stop offset="1" stop-color="${s2}"/>
        </linearGradient>
      </defs>
      <path d="M 32,108 A 88,88 0 0,1 120,20 A 88,88 0 0,1 208,108" fill="none" stroke="url(#gauge-grad)" stroke-width="26" stroke-linecap="round"/>
      <g transform="rotate(${nRot.toFixed(1)} 120 108)">
        <line x1="126" y1="108" x2="189" y2="108" stroke="${THEME.ink}" stroke-width="1.5" stroke-linecap="round"/>
      </g>
      <circle cx="120" cy="108" r="5" fill="${THEME.ink}"/>
      <circle cx="120" cy="108" r="2.5" fill="#ffffff"/>
      <text x="19" y="114" text-anchor="end" font-family="${FONT}" font-size="8" fill="${THEME.muted2}">0</text>
      <text x="221" y="114" text-anchor="start" font-family="${FONT}" font-size="8" fill="${THEME.muted2}">100</text>
      <text x="120" y="152" text-anchor="middle" font-family="${FONT}" font-size="44" font-weight="700" fill="${THEME.ink}">${esc(score)}</text>
      <text x="120" y="171" text-anchor="middle" font-family="${FONT}" font-size="10" font-weight="600" fill="${THEME.accent}">${esc(rating)} impact</text>
    </svg>
    <text x="${textX}" y="${y + 70}" font-family="${FONT}" font-size="12" font-weight="600" fill="${THEME.ink}">Score: ${esc(score)} / 100</text>
    <text x="${textX}" y="${y + 92}" font-family="${FONT}" font-size="11" fill="${THEME.body}">The Impact Index combines kg recovered, volunteer</text>
    <text x="${textX}" y="${y + 108}" font-family="${FONT}" font-size="11" fill="${THEME.body}">hours, verified evidence, and campaign consistency</text>
    <text x="${textX}" y="${y + 124}" font-family="${FONT}" font-size="11" fill="${THEME.body}">into a single score. Scores above 76 are rated ${esc(rating)}.</text>`;
}

function mapPlaceholder(y: number): string {
  const w = W - 2 * M;
  return `<rect x="${M}" y="${y}" width="${w}" height="120" rx="12" fill="${THEME.panel}" stroke="${THEME.cardBorder}" stroke-dasharray="4 4"/>
    <text x="${M + w / 2}" y="${y + 70}" font-family="${FONT}" font-size="11" fill="${THEME.muted}" text-anchor="middle">Interactive map available in Blue Resilience OS dashboard</text>`;
}

function contentHeader(data: ReportData, type: ReportType): string {
  const t = `${REPORT_TYPE_TITLES[type]} — ${data.period.label}`;
  return `<text x="${M}" y="${M}" font-family="${FONT}" font-size="11" font-weight="600" fill="${THEME.ink}">Universal Plastic · Blue Resilience</text>
    <text x="${M + 230}" y="${M}" font-family="${FONT}" font-size="11" fill="${THEME.muted}">· ${esc(t)}</text>
    <text x="${W - M}" y="${M}" font-family="${FONT}" font-size="10" fill="${THEME.muted}" text-anchor="end">${esc(data.scopeLabel)}</text>
    <line x1="${M}" y1="${M + 12}" x2="${W - M}" y2="${M + 12}" stroke="${THEME.cardBorder}"/>`;
}

function contentFooter(meta: ReportMeta): string {
  return `<line x1="${M}" y1="${H - 70}" x2="${W - M}" y2="${H - 70}" stroke="${THEME.cardBorder}"/>
    <text x="${M}" y="${H - 52}" font-family="${FONT}" font-size="10" fill="${THEME.muted}">Universal Plastic · Blue Resilience · ${esc(meta.reportId)}</text>
    <text x="${W - M}" y="${H - 52}" font-family="${FONT}" font-size="10" fill="${THEME.muted}" text-anchor="end">Generated ${esc(fmtDate(meta.generatedAt))}</text>`;
}

export function buildReportPages(opts: {
  data: ReportData;
  type: ReportType;
  detail: ReportDetail;
  include: Required<ReportInclude>;
  campaign: CampaignScope;
  meta: ReportMeta;
}): string[] {
  const { data, type, detail, include, campaign, meta } = opts;
  const pages: string[] = [];

  // Page 1 — cover.
  pages.push(coverPage(data, type, campaign, meta));

  // Page 2 — KPIs + plastic types + trend.
  {
    let body = contentHeader(data, type);
    let y = 110;
    if (include.kpis) {
      body += sectionBadge('01', 'KPIs & metrics', y);
      body += kpiCards(data, include, y + 16);
      y += 140;
    }
    if (include.plasticTypes) {
      body += sectionBadge('02', 'Plastic types', y);
      body += plasticTypeBars(data, y + 16);
      y += 16 + (24 + data.plasticTypes.filter((p) => p.pct > 0).length * 30) + 30;
    }
    if (include.charts && detail !== 'summary') {
      body += sectionBadge('03', type === 'annual' ? 'Monthly trend' : 'Trend', y);
      body += trendLineChart(data, y + 16);
    }
    pages.push(page(body + contentFooter(meta), THEME.bg));
  }

  // Page 3 — events table + gauge + map (skipped entirely in summary detail).
  if (detail !== 'summary') {
    const rowsThisPage = detail === 'detailed' ? 12 : 10;
    let body = contentHeader(data, type);
    let y = 110;
    if (include.cleanupsList) {
      body += sectionBadge('04', 'Cleanup events', y);
      const { svg } = eventsTable(data.cleanups, y + 4, rowsThisPage);
      body += svg;
      y += 4 + 24 + Math.min(data.cleanups.length, rowsThisPage) * 28 + 40;
    }
    if (include.impactIndex && type !== 'evidence') {
      body += sectionBadge('05', 'Impact index', y);
      body += gauge(data, y + 16);
      y += 320;
    }
    if (include.map) {
      body += sectionBadge('06', 'Location overview', y);
      body += mapPlaceholder(y + 16);
    }
    pages.push(page(body + contentFooter(meta), THEME.bg));

    // Detailed: overflow remaining events onto extra pages.
    if (detail === 'detailed' && data.cleanups.length > rowsThisPage) {
      let offset = rowsThisPage;
      while (offset < data.cleanups.length) {
        let ob = contentHeader(data, type);
        ob += sectionBadge('04', 'Cleanup events (cont.)', 110);
        const { svg, rendered } = eventsTable(data.cleanups.slice(offset), 114, 24);
        ob += svg;
        pages.push(page(ob + contentFooter(meta), THEME.bg));
        offset += rendered;
        if (rendered === 0) break;
      }
    }
  }

  return pages;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- reports-svg`
Expected: PASS (all types + content assertions + include gating).

- [ ] **Step 5: Commit**

```bash
git add src/api-v1/reports/reports-svg.ts src/api-v1/reports/reports-svg.spec.ts
git commit -m "feat(reports): SVG page builders matching the design reference"
```

---

### Task 7: PDF assembly (rasterize SVGs)

**Files:**
- Create: `src/api-v1/reports/reports-pdf.ts`
- Test: `src/api-v1/reports/reports-pdf.spec.ts`

**Interfaces:**
- Consumes: `buildReportPages`, `ReportMeta` from `reports-svg.ts`; `ReportData`, `ReportType`, `ReportDetail`, `ReportInclude` from `reports.types.ts`; `CampaignScope` from `reports-campaign-map.ts`; `sharp`, `pdf-lib`.
- Produces:
  - `buildReportPdf(opts: { data: ReportData; type: ReportType; detail: ReportDetail; include: Required<ReportInclude>; campaign: CampaignScope; meta: ReportMeta }): Promise<Uint8Array>`

Rasterizes each page SVG to PNG with sharp (2× density) and embeds full-bleed on
an A4 pdf-lib page. Returns bytes beginning with `%PDF-`.

- [ ] **Step 1: Write the failing test**

Create `src/api-v1/reports/reports-pdf.spec.ts`:

```ts
import { buildReportPdf } from './reports-pdf';
import { DEFAULT_INCLUDE, ReportData, ReportType } from './reports.types';
import { resolveCampaignScope } from './reports-campaign-map';

const DATA: ReportData = {
  period: { start: '2025-11-01', end: '2025-11-30', label: 'November 2025' },
  scopeLabel: 'Océano Foods',
  kpis: { kg: 1240, co2eqTonnes: 12.4, cleanups: 14, volunteers: 162, km: 48, durationHours: 36, locations: 5, avgKg: 88.6, evidenceCount: 98, impactIndex: 81, impactRating: 'Excellent' },
  plasticTypes: [{ type: 'PET', pct: 32, color: '#00003F' }, { type: 'HDPE', pct: 18, color: '#39B3D8' }],
  series: [{ label: '2025-04', kg: 690 }, { label: '2025-05', kg: 1240 }],
  cleanups: [{ date: '2025-05-29', location: 'Blanes', city: 'Costa Brava', kg: 42.6, volunteers: 12, km: 1.2, duration: '0:30:00', evidence: 3, status: 'verified' }],
  sites: [{ name: 'Blanes', lat: 41.6, lon: 2.7, kg: 42.6, cleanups: 1 }],
};
const TYPES: ReportType[] = ['monthly', 'annual', 'campaign', 'location', 'evidence', 'custom'];
const meta = { reportId: 'rep1', generatedAt: '2025-06-01', detail: 'standard' as const, country: 'Spain' };

describe('buildReportPdf', () => {
  it.each(TYPES)('produces a valid PDF for type %s', async (type) => {
    const bytes = await buildReportPdf({
      data: DATA, type, detail: 'standard', include: DEFAULT_INCLUDE,
      campaign: resolveCampaignScope(type === 'campaign' ? 'c1' : 'all'), meta,
    });
    expect(bytes.length).toBeGreaterThan(1000);
    expect(Buffer.from(bytes.slice(0, 5)).toString('latin1')).toBe('%PDF-');
  });

  it('summary detail still produces a PDF', async () => {
    const bytes = await buildReportPdf({
      data: DATA, type: 'monthly', detail: 'summary', include: DEFAULT_INCLUDE,
      campaign: resolveCampaignScope('all'), meta,
    });
    expect(Buffer.from(bytes.slice(0, 5)).toString('latin1')).toBe('%PDF-');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- reports-pdf`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write the implementation**

Create `src/api-v1/reports/reports-pdf.ts`:

```ts
import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';
import { ReportData, ReportDetail, ReportInclude, ReportType } from './reports.types';
import { buildReportPages, ReportMeta } from './reports-svg';
import { CampaignScope } from './reports-campaign-map';

const A4_W = 595.28;
const A4_H = 841.89;
const RENDER_SCALE = 2; // 2× density for crisp text/lines

export async function buildReportPdf(opts: {
  data: ReportData;
  type: ReportType;
  detail: ReportDetail;
  include: Required<ReportInclude>;
  campaign: CampaignScope;
  meta: ReportMeta;
}): Promise<Uint8Array> {
  const pages = buildReportPages(opts);
  const pdf = await PDFDocument.create();

  for (const svg of pages) {
    const png = await sharp(Buffer.from(svg), { density: 96 * RENDER_SCALE }).png().toBuffer();
    const img = await pdf.embedPng(png);
    const page = pdf.addPage([A4_W, A4_H]);
    page.drawImage(img, { x: 0, y: 0, width: A4_W, height: A4_H });
  }

  return await pdf.save();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- reports-pdf`
Expected: PASS. (sharp rasterizes the SVG; the SVG viewBox `794×1123` matches A4 aspect, drawn full-bleed.)

- [ ] **Step 5: Commit**

```bash
git add src/api-v1/reports/reports-pdf.ts src/api-v1/reports/reports-pdf.spec.ts
git commit -m "feat(reports): assemble PDF from rasterized SVG pages"
```

---

### Task 8: S3 upload & ocean resolution

**Files:**
- Create: `src/api-v1/reports/reports-s3.ts`
- Test: `src/api-v1/reports/reports-s3.spec.ts`

**Interfaces:**
- Consumes: `S3_CATALOGUE` from `../analyses/s3-catalogue`; `@aws-sdk/client-s3`.
- Produces:
  - `resolveReportOcean(loc: { lat: number; lon: number }): string`
  - `reportS3Key(ocean: string, reportId: string): string`
  - `reportPublicUrl(key: string): string`
  - `uploadReportToS3(opts: { reportId: string; ocean: string; pdfBytes: Uint8Array }): Promise<{ downloadUrl: string; s3Key: string }>`

- [ ] **Step 1: Write the failing test**

Create `src/api-v1/reports/reports-s3.spec.ts`:

```ts
import { resolveReportOcean, reportS3Key, reportPublicUrl } from './reports-s3';

describe('resolveReportOcean', () => {
  it('Badalona → mediterraneo', () => expect(resolveReportOcean({ lat: 41.43, lon: 2.24 })).toBe('mediterraneo'));
  it('Cádiz → atlantico', () => expect(resolveReportOcean({ lat: 36.53, lon: -6.29 })).toBe('atlantico'));
  it('Gijón → catambrico', () => expect(resolveReportOcean({ lat: 43.57, lon: -5.72 })).toBe('catambrico'));
});

describe('reportS3Key / reportPublicUrl', () => {
  it('builds the reports key', () => {
    expect(reportS3Key('mediterraneo', 'rep_abc')).toBe('public/mediterraneo/universal_plastic/reports/rep_abc.pdf');
  });
  it('builds the public url', () => {
    expect(reportPublicUrl('public/mediterraneo/universal_plastic/reports/rep_abc.pdf'))
      .toBe('https://universalplastic-sedia.s3.eu-central-1.amazonaws.com/public/mediterraneo/universal_plastic/reports/rep_abc.pdf');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- reports-s3`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write minimal implementation**

Create `src/api-v1/reports/reports-s3.ts`:

```ts
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { S3_CATALOGUE } from '../analyses/s3-catalogue';

const DATA_BUCKET = 'universalplastic-sedia';
const DATA_BUCKET_REGION = 'eu-central-1';
const DATA_BUCKET_PUBLIC_BASE = `https://${DATA_BUCKET}.s3.${DATA_BUCKET_REGION}.amazonaws.com`;

export function resolveReportOcean(loc: { lat: number; lon: number }): string {
  const rad = Math.PI / 180;
  let best = S3_CATALOGUE[0];
  let bestDist = Infinity;
  for (const entry of S3_CATALOGUE) {
    const x = (entry.lon - loc.lon) * rad * Math.cos(((entry.lat + loc.lat) / 2) * rad);
    const y = (entry.lat - loc.lat) * rad;
    const dist = Math.sqrt(x * x + y * y);
    if (dist < bestDist) { bestDist = dist; best = entry; }
  }
  const match = best.url.match(/\/public\/([^/]+)\//);
  return match?.[1] ?? 'mediterraneo';
}

export function reportS3Key(ocean: string, reportId: string): string {
  return `public/${ocean}/universal_plastic/reports/${reportId}.pdf`;
}

export function reportPublicUrl(key: string): string {
  return `${DATA_BUCKET_PUBLIC_BASE}/${key}`;
}

export async function uploadReportToS3(opts: {
  reportId: string; ocean: string; pdfBytes: Uint8Array;
}): Promise<{ downloadUrl: string; s3Key: string }> {
  const key = reportS3Key(opts.ocean, opts.reportId);
  const client = new S3Client({ region: DATA_BUCKET_REGION });
  await client.send(new PutObjectCommand({
    Bucket: DATA_BUCKET, Key: key, Body: Buffer.from(opts.pdfBytes), ContentType: 'application/pdf',
  }));
  return { downloadUrl: reportPublicUrl(key), s3Key: key };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- reports-s3`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/api-v1/reports/reports-s3.ts src/api-v1/reports/reports-s3.spec.ts
git commit -m "feat(reports): S3 ocean resolution, key builder, PDF upload"
```

---

### Task 9: Report service orchestration

**Files:**
- Create: `src/api-v1/reports/reports.service.ts`
- Test: `src/api-v1/reports/reports.service.spec.ts`

**Interfaces:**
- Consumes: everything from Tasks 1–8.
- Produces:
  - `class ReportsService` with `async generate(req: ReportRequest, now?: Date): Promise<ReportResponse>`

The service imports `reports-data` and `reports-s3` as **namespaces**
(`import * as reportsData` / `import * as reportsS3`) so the unit test can
intercept `fetchRecogidasFiles` / `uploadReportToS3` via `jest.spyOn`.

- [ ] **Step 1: Write the failing test**

Create `src/api-v1/reports/reports.service.spec.ts`:

```ts
import { ReportsService } from './reports.service';
import * as reportsData from './reports-data';
import * as reportsS3 from './reports-s3';
import { BadRequestException } from '@nestjs/common';

const NOW = new Date('2026-06-18T10:00:00.000Z');

const FAKE: reportsData.TaggedFile = {
  siteLabel: 'Badalona', city: 'Badalona',
  file: { dataset: { records: [
    {
      'Date': '2026-06-07', 'Start point': '41.437,2.244', 'End point': '41.437,2.242',
      'Plastic waste collected': 1.0, 'Number of participants': 3, 'Walking distance': 1.2,
      'Cleanup duration': '0:45:00',
      'Polyethylene terephthalate (%)': 50, 'High-density polyethylene (%)': 20,
      'Low-density polyethylene (%)': 10, 'Polypropylene (%)': 10,
      'Polystyrene (%)': 0, 'Polyvinyl chloride (%)': 0, 'Others (%)': 0,
      'Collected waste image': 'a.jpg | b.jpg',
    },
  ] } },
};

describe('ReportsService.generate', () => {
  let svc: ReportsService;
  beforeEach(() => {
    svc = new ReportsService();
    jest.spyOn(reportsData, 'fetchRecogidasFiles').mockResolvedValue([FAKE]);
    jest.spyOn(reportsS3, 'uploadReportToS3').mockResolvedValue({
      downloadUrl: 'https://universalplastic-sedia.s3.eu-central-1.amazonaws.com/public/mediterraneo/universal_plastic/reports/rep_x.pdf',
      s3Key: 'public/mediterraneo/universal_plastic/reports/rep_x.pdf',
    });
  });
  afterEach(() => jest.restoreAllMocks());

  it('returns a ready response with https downloadUrl', async () => {
    const res = await svc.generate({ type: 'monthly', period: { preset: 'month' } }, NOW);
    expect(res.status).toBe('ready');
    expect(res.type).toBe('monthly');
    expect(res.period).toBe('June 2026');
    expect(res.format).toBe('pdf');
    expect(res.downloadUrl).toMatch(/^https:\/\/universalplastic-sedia\.s3\./);
    expect(res.requestId).toMatch(/^rep_/);
    expect(res.name).toContain('Monthly cleanup report');
  });

  it('coerces xlsx to pdf', async () => {
    const res = await svc.generate({ type: 'monthly', period: { preset: 'month' }, format: 'xlsx' }, NOW);
    expect(res.format).toBe('pdf');
  });

  it('rejects campaign without id', async () => {
    await expect(svc.generate({ type: 'campaign', period: { preset: 'month' } }, NOW)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects custom without date range', async () => {
    await expect(svc.generate({ type: 'custom' }, NOW)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('maps insufficient data to 422', async () => {
    jest.spyOn(reportsData, 'fetchRecogidasFiles').mockResolvedValue([{ siteLabel: 'X', city: 'X', file: { dataset: { records: [] } } }]);
    await expect(svc.generate({ type: 'monthly', period: { preset: 'month' } }, NOW)).rejects.toMatchObject({ status: 422 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- reports.service`
Expected: FAIL — cannot find module `./reports.service`.

- [ ] **Step 3: Write the implementation**

Create `src/api-v1/reports/reports.service.ts`:

```ts
import {
  BadRequestException, Injectable, InternalServerErrorException, UnprocessableEntityException,
} from '@nestjs/common';
import {
  DEFAULT_INCLUDE, ReportInclude, ReportRequest, ReportResponse, REPORT_TYPE_LABELS,
} from './reports.types';
import { resolvePeriod } from './reports-period';
import { validateReportRequest } from './reports-validate';
import { resolveCampaignScope } from './reports-campaign-map';
import * as reportsData from './reports-data';
import { buildReportPdf } from './reports-pdf';
import * as reportsS3 from './reports-s3';

function randomId(): string {
  return `rep_${Math.random().toString(16).slice(2, 10)}`;
}
function bytesToMb(n: number): string {
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

@Injectable()
export class ReportsService {
  async generate(req: ReportRequest, now: Date = new Date()): Promise<ReportResponse> {
    const type = req.type;
    const detail = req.detail ?? 'standard';
    const include: Required<ReportInclude> = { ...DEFAULT_INCLUDE, ...(req.include ?? {}) };

    const period = resolvePeriod(req.period, type, now);

    const err = validateReportRequest(req, period);
    if (err) {
      const messages: Record<string, string> = {
        campaign_required: 'A campaign id is required for campaign reports.',
        date_range_required: 'period.start and period.end are required for custom reports.',
        invalid_date_range: 'period.start must not be after period.end.',
      };
      throw new BadRequestException({ error: err, message: messages[err] });
    }

    const campaign = resolveCampaignScope(req.scope?.campaign);

    let data;
    try {
      const files = await reportsData.fetchRecogidasFiles(campaign.urls);
      data = reportsData.aggregateReportData(files, period, campaign.campaignName, type);
    } catch (e) {
      if (e instanceof Error && e.message === 'insufficient_data') {
        throw new UnprocessableEntityException({
          error: 'insufficient_data',
          message: 'Not enough data to generate report for the selected period.',
        });
      }
      throw new InternalServerErrorException({ error: 'report_generation_failed', message: 'Failed to aggregate report data.' });
    }

    const reportId = randomId();

    let pdfBytes: Uint8Array;
    try {
      pdfBytes = await buildReportPdf({
        data, type, detail, include, campaign,
        meta: { reportId, generatedAt: now.toISOString().slice(0, 10), detail, country: 'Spain' },
      });
    } catch {
      throw new InternalServerErrorException({ error: 'report_generation_failed', message: 'Failed to render report PDF.' });
    }

    let downloadUrl: string;
    try {
      const ocean = reportsS3.resolveReportOcean({ lat: campaign.lat, lon: campaign.lon });
      ({ downloadUrl } = await reportsS3.uploadReportToS3({ reportId, ocean, pdfBytes }));
    } catch {
      throw new InternalServerErrorException({ error: 'report_generation_failed', message: 'Failed to upload report to storage.' });
    }

    return {
      requestId: reportId,
      status: 'ready',
      name: `${REPORT_TYPE_LABELS[type]} — ${period.label}`,
      type,
      period: period.label,
      generatedAt: now.toISOString(),
      format: 'pdf',
      size: bytesToMb(pdfBytes.length),
      downloadUrl,
    };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- reports.service`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/api-v1/reports/reports.service.ts src/api-v1/reports/reports.service.spec.ts
git commit -m "feat(reports): report service orchestration"
```

---

### Task 10: Controller, DTOs, module wiring & e2e

**Files:**
- Create: `src/api-v1/reports/reports.swagger.dto.ts`
- Create: `src/api-v1/reports/reports.controller.ts`
- Modify: `src/api-v1/api-v1.module.ts`
- Test: `test/reports.e2e-spec.ts`

**Interfaces:**
- Consumes: `ReportsService` (Task 9), `ReportRequest`/`ReportResponse` (Task 1).
- Produces: HTTP route `POST /v1/reports/request`. No auth guard.

- [ ] **Step 1: Write the failing e2e test**

Create `test/reports.e2e-spec.ts`:

```ts
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { ApiV1Module } from '../src/api-v1/api-v1.module';
import * as reportsData from '../src/api-v1/reports/reports-data';
import * as reportsS3 from '../src/api-v1/reports/reports-s3';

const FAKE = {
  siteLabel: 'Badalona', city: 'Badalona',
  file: { dataset: { records: [
    {
      'Date': '2026-06-07', 'Start point': '41.437,2.244', 'End point': '41.437,2.242',
      'Plastic waste collected': 1.0, 'Number of participants': 3, 'Walking distance': 1.2,
      'Cleanup duration': '0:45:00',
      'Polyethylene terephthalate (%)': 50, 'High-density polyethylene (%)': 20,
      'Low-density polyethylene (%)': 10, 'Polypropylene (%)': 10,
      'Polystyrene (%)': 0, 'Polyvinyl chloride (%)': 0, 'Others (%)': 0,
      'Collected waste image': 'a.jpg | b.jpg',
    },
  ] } },
};

describe('POST /v1/reports/request (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    jest.spyOn(reportsData, 'fetchRecogidasFiles').mockResolvedValue([FAKE] as any);
    jest.spyOn(reportsS3, 'uploadReportToS3').mockResolvedValue({
      downloadUrl: 'https://universalplastic-sedia.s3.eu-central-1.amazonaws.com/public/mediterraneo/universal_plastic/reports/rep_x.pdf',
      s3Key: 'public/mediterraneo/universal_plastic/reports/rep_x.pdf',
    });
    const moduleRef = await Test.createTestingModule({ imports: [ApiV1Module] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => { await app.close(); jest.restoreAllMocks(); });

  it('generates a monthly report (ready + https url)', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/reports/request')
      .send({ type: 'monthly', period: { preset: 'all' } })
      .expect(200);
    expect(res.body.status).toBe('ready');
    expect(res.body.downloadUrl).toMatch(/^https:\/\//);
    expect(res.body.format).toBe('pdf');
  });

  it('rejects campaign report without campaign id (400)', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/reports/request')
      .send({ type: 'campaign', period: { preset: 'all' } })
      .expect(400);
    expect(res.body.error).toBe('campaign_required');
  });
});
```

- [ ] **Step 2: Run e2e to verify it fails**

Run: `npm run test:e2e -- reports`
Expected: FAIL — route 404 (no reports controller registered).

- [ ] **Step 3: Create the Swagger DTOs**

Create `src/api-v1/reports/reports.swagger.dto.ts`:

```ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class ReportPeriodDto {
  @ApiPropertyOptional({ enum: ['month', 'year', '2024', 'all'] }) preset?: string;
  @ApiPropertyOptional({ example: '2025-03-01' }) start?: string;
  @ApiPropertyOptional({ example: '2025-05-31' }) end?: string;
}
class ReportScopeDto {
  @ApiPropertyOptional({ example: 'all', description: "'all' | campaign id (c1..c4)" }) campaign?: string;
  @ApiPropertyOptional({ example: 'auto' }) entity?: string;
}
class ReportIncludeDto {
  @ApiPropertyOptional({ default: true }) kpis?: boolean;
  @ApiPropertyOptional({ default: true }) map?: boolean;
  @ApiPropertyOptional({ default: true }) charts?: boolean;
  @ApiPropertyOptional({ default: true }) cleanupsList?: boolean;
  @ApiPropertyOptional({ default: true }) evidence?: boolean;
  @ApiPropertyOptional({ default: true }) plasticTypes?: boolean;
  @ApiPropertyOptional({ default: false }) ondas?: boolean;
  @ApiPropertyOptional({ default: true }) impactIndex?: boolean;
}

export class ReportRequestDto {
  @ApiProperty({ enum: ['monthly', 'annual', 'campaign', 'location', 'evidence', 'custom'], example: 'monthly' })
  type!: string;
  @ApiPropertyOptional({ type: ReportPeriodDto }) period?: ReportPeriodDto;
  @ApiPropertyOptional({ type: ReportScopeDto }) scope?: ReportScopeDto;
  @ApiPropertyOptional({ enum: ['summary', 'standard', 'detailed'], default: 'standard' }) detail?: string;
  @ApiPropertyOptional({ enum: ['en', 'es', 'fr'], default: 'en' }) language?: string;
  @ApiPropertyOptional({ enum: ['pdf', 'xlsx'], default: 'pdf', description: 'xlsx is coerced to pdf' }) format?: string;
  @ApiPropertyOptional({ type: ReportIncludeDto }) include?: ReportIncludeDto;
}

export class ReportResponseDto {
  @ApiProperty({ example: 'rep_ab12cd34' }) requestId!: string;
  @ApiProperty({ example: 'ready' }) status!: string;
  @ApiProperty({ example: 'Monthly cleanup report — June 2026' }) name!: string;
  @ApiProperty({ example: 'monthly' }) type!: string;
  @ApiProperty({ example: 'June 2026' }) period!: string;
  @ApiProperty({ example: '2026-06-18T10:32:00Z' }) generatedAt!: string;
  @ApiProperty({ example: 'pdf' }) format!: string;
  @ApiProperty({ example: '0.4 MB' }) size!: string;
  @ApiProperty({ example: 'https://universalplastic-sedia.s3.eu-central-1.amazonaws.com/public/mediterraneo/universal_plastic/reports/rep_ab12cd34.pdf' })
  downloadUrl!: string;
}
```

- [ ] **Step 4: Create the controller**

Create `src/api-v1/reports/reports.controller.ts`:

```ts
import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { ReportRequest, ReportResponse } from './reports.types';
import { ReportRequestDto, ReportResponseDto } from './reports.swagger.dto';

@ApiTags('Reports')
@Controller('/v1')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Post('reports/request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generar un informe de recogidas (PDF Blue Resilience) y subirlo a S3' })
  @ApiBody({
    type: ReportRequestDto,
    examples: {
      monthlyAll: {
        summary: 'Informe mensual (todas las campañas)',
        value: { type: 'monthly', period: { preset: 'month' }, scope: { campaign: 'all' }, detail: 'standard', language: 'en', format: 'pdf' },
      },
      annualAll: { summary: 'Informe anual', value: { type: 'annual', period: { preset: 'year' }, scope: { campaign: 'all' } } },
      campaignC2: { summary: 'Informe de campaña (c2 → Badalona)', value: { type: 'campaign', period: { preset: 'all' }, scope: { campaign: 'c2' } } },
      customRange: { summary: 'Periodo personalizado', value: { type: 'custom', period: { start: '2025-01-01', end: '2025-12-31' }, scope: { campaign: 'all' } } },
      evidenceReport: { summary: 'Informe de evidencias', value: { type: 'evidence', period: { preset: 'all' }, scope: { campaign: 'all' } } },
    },
  })
  @ApiOkResponse({ type: ReportResponseDto })
  generate(@Body() body: ReportRequest): Promise<ReportResponse> {
    return this.reports.generate(body);
  }
}
```

- [ ] **Step 5: Wire into the module**

Replace `src/api-v1/api-v1.module.ts` with:

```ts
import { Module } from '@nestjs/common';

import { AnalysesController } from './analyses/analyses.controller';
import { AnalysesService } from './analyses/analyses.service';
import { ReportsController } from './reports/reports.controller';
import { ReportsService } from './reports/reports.service';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AnalysesController, ReportsController],
  providers: [AnalysesService, ReportsService],
})
export class ApiV1Module {}
```

- [ ] **Step 6: Run e2e to verify it passes**

Run: `npm run test:e2e -- reports`
Expected: PASS (both cases).

- [ ] **Step 7: Run the full unit suite + typecheck**

Run: `npm test && npx tsc --noEmit -p tsconfig.json`
Expected: all reports unit specs PASS, no type errors.

- [ ] **Step 8: Commit**

```bash
git add src/api-v1/reports/reports.controller.ts src/api-v1/reports/reports.swagger.dto.ts src/api-v1/api-v1.module.ts test/reports.e2e-spec.ts
git commit -m "feat(reports): controller, swagger DTOs, module wiring, e2e"
```

---

## Manual Verification (after all tasks)

- [ ] Confirm `UNIVERSAL_PLASTIC_LOGO_SVG` in `reports-svg.ts` contains the exact `<svg>` block pasted from `docs/report-template.html` (lines 243–259).
- [ ] (Optional, for best fidelity) install the Inter font on the host; otherwise SVG text falls back to system sans.
- [ ] Start the API: `npm run start:dev`.
- [ ] Open Swagger `http://localhost:3000/docs` → **Reports** tag → `POST /v1/reports/request`.
- [ ] Run `monthlyAll` with `period.preset: "all"` (real S3 fetch). Confirm `200`, `status:"ready"`, a `downloadUrl` on the data bucket. (Upload needs AWS write creds; without them expect `500 report_generation_failed` at the upload step — confirming aggregation + PDF + rasterization succeeded.)
- [ ] Open the returned `downloadUrl` and compare against `docs/Monthly Cleanup Report — Blue Resilience.pdf` — cover (UP logo, title, meta), KPI cards (cyan top-border), plastic bars, trend line, events table with status pills, gradient gauge, map placeholder.

---

## Self-Review Notes

- **Spec coverage:** types/period/scope/detail/language/format/include (Tasks 1,2,5,9) · campaign map w/ site+city (Task 3) · aggregation incl. CO₂eq, impact index+rating, site/city/status, insufficient_data (Task 4) · validation §17 (Task 5) · SVG reference layout — cover, numbered sections, KPI cards, plastic bars, trend line, events table + status pills, gauge, map placeholder, include gating, detail scaling (Task 6) · SVG→sharp→pdf-lib rasterization (Task 7) · S3 upload to data bucket reports/ prefix + https url (Task 8) · sync response + xlsx→pdf coercion (Task 9) · endpoint + no guard + swagger (Task 10). All covered.
- **Logo / charts:** the Universal Plastic logo and the plastic-bar / trend-line / gauge SVGs are ported verbatim from `docs/report-template.html` into `reports-svg.ts` — no external asset. Exact theme tokens (`#00003F`, `#42C3EE`, `#777D80`, `#DEE0E0`, `#F0F7FB`, pill + gauge-gradient colors) come straight from the template CSS.
- **Type consistency:** `RecogidasFile`/`TaggedFile`, `ScopedFile`/`CampaignScope`, `ResolvedPeriod`, `ReportData` (incl. `co2eqTonnes`, `impactRating`, row `location`/`city`/`status`), `ReportMeta`, `buildReportPages`→`buildReportPdf`, `Required<ReportInclude>` are consistent across Tasks 3/4/6/7/9/10.
- **Known simplifications (per spec §1):** `include.map` renders a placeholder only (no real map); `language` accepted but copy is English-only; per-row location/city come from the per-file label map (not real place names); STATUS is always `verified`; `evidence` type omits the gauge.
- **Rendering note:** SVG viewBox `794×1123` (A4 @ 96dpi) is drawn full-bleed to the `595.28×841.89pt` pdf-lib page — same aspect ratio, no distortion. `sharp` rasterizes SVG at 2× density for crisp output. `t CO₂eq` uses the `₂` subscript; sharp/SVG render it natively (unlike pdf-lib StandardFonts), so no character substitution is needed.
```
