import {
  CleanupRow, CO2E_TONNES_PER_KG, impactRatingFor, PlasticType,
  ReportData, ReportKpis, ReportType, ResolvedPeriod, SeriesPoint, SiteRow,
} from './reports.types';
import { CleanupObservationRow } from '../dataspace/observations.repository';
import { POLYMER_PCT_FIELDS } from '../dataspace/normalize/field-maps';

function clamp(n: number, lo: number, hi: number): number { return Math.max(lo, Math.min(hi, n)); }
function round(n: number, d = 2): number { const m = 10 ** d; return Math.round(n * m) / m; }

/** `1718` seconds → `"0:28:38"`, the shape the report tables expect. */
export function formatDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return '';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Aggregates cleanup observations into the report/overview model.
 *
 * Rows arrive already scoped and date-filtered by the database
 * (ObservationsRepository.cleanupRows), so this is pure arithmetic.
 */
export function aggregateReportData(
  rows: CleanupObservationRow[],
  period: ResolvedPeriod,
  scopeLabel: string,
  type: ReportType,
): ReportData {
  let kg = 0, volunteers = 0, km = 0, durationHours = 0, evidenceCount = 0;
  const count = rows.length;
  const polymerSums = new Map<string, number>();
  const cleanups: CleanupRow[] = [];
  const siteMap = new Map<string, SiteRow>();
  const dailyKg = new Map<string, number>();
  const monthlyKg = new Map<string, number>();

  if (count === 0) throw new Error('insufficient_data');

  for (const r of rows) {
    kg += r.kg;
    volunteers += r.volunteers;
    km += r.km;
    durationHours += r.durationSeconds / 3600;
    evidenceCount += r.evidence;

    for (const { field, label } of POLYMER_PCT_FIELDS) {
      polymerSums.set(label, (polymerSums.get(label) ?? 0) + (r.polymers[field] ?? 0));
    }

    cleanups.push({
      date: r.date,
      location: r.location,
      city: r.city,
      kg: r.kg,
      volunteers: r.volunteers,
      km: r.km,
      duration: formatDuration(r.durationSeconds),
      evidence: r.evidence,
      status: 'verified',
    });

    const existing = siteMap.get(r.location);
    if (existing) {
      existing.kg += r.kg;
      existing.cleanups += 1;
    } else {
      siteMap.set(r.location, { name: r.location, lat: r.lat, lon: r.lon, kg: r.kg, cleanups: 1 });
    }

    dailyKg.set(r.date, (dailyKg.get(r.date) ?? 0) + r.kg);
    const month = r.date.slice(0, 7);
    monthlyKg.set(month, (monthlyKg.get(month) ?? 0) + r.kg);
  }

  const avgKg = kg / count;

  const plasticTypes: PlasticType[] = POLYMER_PCT_FIELDS.map(({ label, color }) => ({
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
