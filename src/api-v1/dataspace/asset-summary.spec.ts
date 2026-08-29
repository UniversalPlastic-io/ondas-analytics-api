import { buildSummary, dateRangeOf } from './asset-summary';
import { CanonicalObservation } from './normalize';

const OBS = (date: string, values: Record<string, number | string | null>): CanonicalObservation => ({
  date,
  time: null,
  ts: new Date(`${date}T00:00:00.000Z`),
  eventDate: null,
  lat: null,
  lon: null,
  values,
});

describe('dateRangeOf', () => {
  it('takes the min and max observed date', () => {
    expect(dateRangeOf([OBS('2025-05-02', {}), OBS('2025-01-09', {}), OBS('2025-03-01', {})])).toEqual({
      start: '2025-01-09',
      end: '2025-05-02',
    });
  });

  it('is null with no observations', () => {
    expect(dateRangeOf([])).toBeNull();
  });
});

describe('buildSummary', () => {
  it('totals a cleanup asset', () => {
    const summary = buildSummary('cleanup', [
      OBS('2025-11-07', { kg: 0.5, participants: 2, distance_km: 1.5, duration_s: 1800, evidence_count: 3 }),
      OBS('2025-11-09', { kg: 1.5, participants: 4, distance_km: 2.0, duration_s: 5400, evidence_count: 1 }),
    ]);
    expect(summary).toEqual({ kg: 2, volunteers: 6, cleanups: 2, km: 3.5, durationHours: 2, evidence: 4 });
  });

  it('summarises biomass with its depth-layer count', () => {
    const summary = buildSummary('biomass', [
      OBS('2025-12-06', { biomass_t_3_5: 23, biomass_t_5_8: 5, biomass_t_total: 28 }),
      OBS('2025-12-07', { biomass_t_3_5: 10, biomass_t_5_8: 2, biomass_t_total: 12 }),
    ]);
    expect(summary).toEqual({ meanTonnes: 20, maxTonnes: 28, depthLayers: 2, readings: 2 });
  });

  it('counts microplastic particles by polymer, size and form', () => {
    const summary = buildSummary('microplastics', [
      OBS('2026-02-18', { polymer: 'PE', size: 'Mesoplastics', form: 'Line' }),
      OBS('2026-02-18', { polymer: 'PE', size: 'Microplastics', form: 'Fragment' }),
      OBS('2026-02-18', { polymer: 'PP', size: 'Mesoplastics', form: 'Line' }),
    ]) as { particles: number; byPolymer: Array<{ type: string; count: number }> };
    expect(summary.particles).toBe(3);
    expect(summary.byPolymer[0]).toEqual({ type: 'PE', count: 2 });
  });

  it('means the met-ocean fields', () => {
    expect(
      buildSummary('environmental', [
        OBS('2025-11-28', { sea_surface_temperature: 18, wind_speed: 3 }),
        OBS('2025-11-28', { sea_surface_temperature: 20, wind_speed: 5 }),
      ]),
    ).toEqual({ readings: 2, meanSeaSurfaceTemperatureC: 19, meanWindSpeedMs: 4 });
  });

  it('counts distinct events for a nested window asset', () => {
    const summary = buildSummary('atmospheric', [
      { ...OBS('2025-10-31', { air_temperature: 16 }), eventDate: '2025-11-07' },
      { ...OBS('2025-11-01', { air_temperature: 18 }), eventDate: '2025-11-07' },
      { ...OBS('2026-01-08', { air_temperature: 10 }), eventDate: '2026-01-15' },
    ]);
    expect(summary).toMatchObject({ events: 2, days: 3, meanAirTemperatureC: 14.67 });
  });

  it('degrades to a plain record count for a type with no bespoke summary', () => {
    expect(buildSummary('water_samples', [OBS('2026-02-18', { Polyethylene: 1.8 })])).toEqual({ records: 1 });
  });

  it('handles an empty asset without dividing by zero', () => {
    expect(buildSummary('biomass', [])).toEqual({ meanTonnes: null, maxTonnes: null, depthLayers: 0, readings: 0 });
  });
});
