import { bucketAverage, OverviewSources } from './overview-sources';
import { AssetsRepository } from '../dataspace/assets.repository';
import { ObservationsRepository } from '../dataspace/observations.repository';

const LOC = { lat: 41.43, lon: 2.24 };

function sources(asset: unknown, daily = new Map<string, number>()) {
  const assets = { nearest: jest.fn().mockResolvedValue(asset) } as unknown as AssetsRepository;
  const observations = {
    dailyMean: jest.fn().mockResolvedValue(daily),
  } as unknown as ObservationsRepository;
  return { svc: new OverviewSources(assets, observations), assets, observations };
}

describe('bucketAverage', () => {
  const daily = new Map([
    ['2025-01-05', 10],
    ['2025-01-06', 20],
    ['2025-02-01', 60],
  ]);

  it('keeps one point per day for a month period', () => {
    expect(bucketAverage(daily, 'month')).toHaveLength(3);
  });

  it('averages within a month for a year period', () => {
    const out = bucketAverage(daily, 'year');
    expect(out).toEqual([
      { label: 'Jan', kg: 15 },
      { label: 'Feb', kg: 60 },
    ]);
  });

  it('averages within a year for the all period', () => {
    expect(bucketAverage(daily, 'all')).toEqual([{ label: '2025', kg: 30 }]);
  });
});

describe('OverviewSources.loadBiomass', () => {
  it('projects the asset summary plus a bucketed series', async () => {
    const { svc } = sources(
      { _id: 'a1', summary: { meanTonnes: 18.24, readings: 3611 }, observationCount: 3611 },
      new Map([['2025-12-06', 20], ['2025-12-07', 10]]),
    );
    const out = await svc.loadBiomass(LOC, 'month');
    expect(out).toMatchObject({ meanTonnes: 18.24, units: 'Tonnes', readings: 3611 });
    expect(out?.series).toHaveLength(2);
  });

  it('returns null when no biomass asset is near', async () => {
    const { svc } = sources(null);
    expect(await svc.loadBiomass(LOC, 'month')).toBeNull();
  });

  it('returns null when the asset holds no usable series', async () => {
    const { svc } = sources({ _id: 'a1', summary: { meanTonnes: 1 }, observationCount: 0 }, new Map());
    expect(await svc.loadBiomass(LOC, 'month')).toBeNull();
  });
});

describe('OverviewSources.loadMicroplastics', () => {
  it('passes the ingest-time breakdown straight through', async () => {
    const { svc } = sources({
      _id: 'a2',
      summary: { particles: 217, byPolymer: [{ type: 'PE', count: 100 }], bySize: [{ size: 'Mesoplastics', count: 217 }] },
    });
    expect(await svc.loadMicroplastics(LOC)).toEqual({
      particles: 217,
      byPolymer: [{ type: 'PE', count: 100 }],
      bySize: [{ size: 'Mesoplastics', count: 217 }],
    });
  });

  it('returns null when the asset counted no particles', async () => {
    const { svc } = sources({ _id: 'a2', summary: { particles: 0 } });
    expect(await svc.loadMicroplastics(LOC)).toBeNull();
  });
});

describe('OverviewSources.loadEnvironment', () => {
  it('projects the met-ocean means', async () => {
    const { svc } = sources({
      _id: 'a3',
      summary: { readings: 3865, meanSeaSurfaceTemperatureC: 18.4, meanWindSpeedMs: 4.2 },
    });
    expect(await svc.loadEnvironment(LOC)).toEqual({
      readings: 3865,
      meanSeaSurfaceTemperatureC: 18.4,
      meanWindSpeedMs: 4.2,
    });
  });

  it('returns null when there is no environmental asset', async () => {
    const { svc } = sources(null);
    expect(await svc.loadEnvironment(LOC)).toBeNull();
  });
});
