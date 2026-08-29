import { aggregateReportData, formatDuration } from './reports-data';
import { CleanupObservationRow } from '../dataspace/observations.repository';

const ROW = (
  date: string,
  kg: number,
  volunteers: number,
  km: number,
  durationSeconds: number,
  pet: number,
  evidence: number,
): CleanupObservationRow => ({
  date,
  assetId: 'a1',
  location: 'Badalona',
  city: 'Badalona',
  lat: 41.437,
  lon: 2.244,
  kg,
  volunteers,
  km,
  durationSeconds,
  evidence,
  polymers: {
    pct_pet: pet,
    pct_hdpe: 20,
    pct_ldpe: 10,
    pct_pp: 10,
    pct_ps: 0,
    pct_pvc: 0,
    pct_others: 0,
  },
});

// The repository has already scoped and date-filtered these rows.
const ROWS: CleanupObservationRow[] = [
  ROW('2025-11-07', 0.5, 2, 1.54, 1800, 40, 3),
  ROW('2025-11-09', 1.5, 4, 2.0, 5400, 60, 1),
];
const PERIOD = { start: '2025-11-01', end: '2025-11-30', label: 'November 2025' };

describe('aggregateReportData', () => {
  it('sums KPIs incl. CO2eq and rating', () => {
    const d = aggregateReportData(ROWS, PERIOD, 'All campaigns', 'monthly');
    expect(d.kpis.kg).toBeCloseTo(2.0, 5);
    expect(d.kpis.co2eqTonnes).toBeCloseTo(0.02, 5);
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

  it('carries location/city/status onto each row', () => {
    const d = aggregateReportData(ROWS, PERIOD, 'All campaigns', 'monthly');
    expect(d.cleanups[0].location).toBe('Badalona');
    expect(d.cleanups[0].city).toBe('Badalona');
    expect(d.cleanups[0].status).toBe('verified');
  });

  it('renders the duration back into HH:MM:SS for the report tables', () => {
    const d = aggregateReportData(ROWS, PERIOD, 'All campaigns', 'monthly');
    expect(d.cleanups[0].duration).toBe('0:30:00');
    expect(d.cleanups[1].duration).toBe('1:30:00');
  });

  it('averages polymer composition with palette colors', () => {
    const d = aggregateReportData(ROWS, PERIOD, 'All campaigns', 'monthly');
    const pet = d.plasticTypes.find((p) => p.type === 'PET');
    expect(pet?.pct).toBeCloseTo(50, 5);
    expect(pet?.color).toBe('#00003F');
  });

  it('aggregates one site into a single top-location entry', () => {
    const d = aggregateReportData(ROWS, PERIOD, 'All campaigns', 'monthly');
    expect(d.sites).toHaveLength(1);
    expect(d.sites[0]).toMatchObject({ name: 'Badalona', cleanups: 2 });
    expect(d.sites[0].kg).toBeCloseTo(2.0, 5);
  });

  it('buckets series monthly for annual', () => {
    const d = aggregateReportData(ROWS, PERIOD, 'All campaigns', 'annual');
    expect(d.series[0]).toEqual({ label: '2025-11', kg: 2 });
  });

  it('buckets series daily for monthly', () => {
    const d = aggregateReportData(ROWS, PERIOD, 'All campaigns', 'monthly');
    expect(d.series.map((s) => s.label)).toEqual(['2025-11-07', '2025-11-09']);
  });

  it('throws insufficient_data on an empty scope', () => {
    expect(() => aggregateReportData([], PERIOD, 's', 'monthly')).toThrow('insufficient_data');
  });
});

describe('formatDuration', () => {
  it('renders seconds as HH:MM:SS and blanks non-durations', () => {
    expect(formatDuration(1718)).toBe('0:28:38');
    expect(formatDuration(3600)).toBe('1:00:00');
    expect(formatDuration(0)).toBe('');
    expect(formatDuration(NaN)).toBe('');
  });
});
