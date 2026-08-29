import {
  buildReferenceDatasets,
  REFERENCE_KEYS,
  REFERENCE_LOCATION,
  REFERENCE_RANGE,
  REFERENCE_STATISTICS,
} from './reference-datasets';
import {
  REFERENCE_PROVIDER_FOLDER,
  WATER_POLYMER_FIELDS,
} from './dataspace.constants';
import { parseKey, resolveLocation } from './s3-keys';
import { validateContainer } from './validate-container';
import { normalizeDataset } from './normalize';
import { SEED_KEYS } from './s3-reader';

const files = buildReferenceDatasets();

function fileFor(category: string) {
  const file = files.find((f) => parseKey(f.key)?.category === category);
  if (!file) throw new Error(`no reference dataset for category ${category}`);
  return file;
}

/** Runs a reference file through the same pipeline an ingest would. */
function ingest(category: string) {
  const file = fileFor(category);
  const parsed = parseKey(file.key)!;
  const container = validateContainer(file.body, parsed.datasetType);
  expect(container.ok).toBe(true);
  const normalized = normalizeDataset(
    container.datasetType!,
    container.envelope!.dataset,
  );
  return { file, parsed, container, normalized };
}

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Mean of the per-day means, which is what ScenarioLoader reads. */
function meanOfDailyMeans(
  observations: Array<{ date: string; values: Record<string, unknown> }>,
  field: string,
): number {
  const byDate = new Map<string, number[]>();
  for (const o of observations) {
    const v = o.values[field];
    if (typeof v !== 'number') continue;
    const bucket = byDate.get(o.date) ?? [];
    bucket.push(v);
    byDate.set(o.date, bucket);
  }
  return mean(Array.from(byDate.values()).map(mean));
}

describe('buildReferenceDatasets', () => {
  it('is deterministic: regenerating produces identical bytes', () => {
    expect(JSON.stringify(buildReferenceDatasets())).toEqual(
      JSON.stringify(buildReferenceDatasets()),
    );
  });

  it('produces one dataset per input the analytics engine loads', () => {
    const categories = files.map((f) => parseKey(f.key)?.category).sort();
    expect(categories).toEqual([
      'biomass',
      'cleanup',
      'environmental',
      'microplastics',
      'water_samples',
    ]);
  });

  it('places every file in the reference provider folder', () => {
    for (const file of files) {
      const parsed = parseKey(file.key);
      expect(parsed).not.toBeNull();
      expect(parsed!.providerFolder).toBe(REFERENCE_PROVIDER_FOLDER);
      expect(parsed!.datasetType).not.toBeNull();
    }
  });

  it('exports its keys for the bundled inventory, so a scan without ListBucket finds them', () => {
    expect(REFERENCE_KEYS).toEqual(files.map((f) => f.key));
    for (const key of REFERENCE_KEYS) expect(SEED_KEYS).toContain(key);
  });

  it('declares a location the ingest can read, instead of falling back to 0,0', () => {
    for (const file of files) {
      const parsed = parseKey(file.key)!;
      // No station suffix in the filename, so metadata.location is the only source.
      expect(parsed.station).toBeNull();
      const resolved = resolveLocation(
        parsed.fragment,
        file.body.metadata.location as { lat?: unknown; lon?: unknown },
        parsed.station,
      );
      expect(resolved).toEqual({ ...REFERENCE_LOCATION, warnings: [] });
    }
  });

  it('passes container validation with no errors and no type warnings', () => {
    for (const file of files) {
      const parsed = parseKey(file.key)!;
      const container = validateContainer(file.body, parsed.datasetType);
      expect(container.errors).toEqual([]);
      expect(container.ok).toBe(true);
      expect(container.datasetType).toBe(parsed.datasetType);
      expect(container.warnings).toEqual([]);
    }
  });

  it('keeps every observation inside the declared range', () => {
    for (const file of files) {
      const parsed = parseKey(file.key)!;
      const container = validateContainer(file.body, parsed.datasetType);
      const { observations } = normalizeDataset(
        container.datasetType!,
        container.envelope!.dataset,
      );
      expect(observations.length).toBeGreaterThan(0);
      for (const o of observations) {
        expect(o.date >= REFERENCE_RANGE.start).toBe(true);
        expect(o.date <= REFERENCE_RANGE.end).toBe(true);
      }
    }
  });

  it('normalizes biomass to biomass_t_total around the scenario mean', () => {
    const { normalized } = ingest('biomass');
    for (const o of normalized.observations) {
      expect(typeof o.values.biomass_t_total).toBe('number');
      expect(o.values.biomass_t_total as number).toBeGreaterThan(0);
    }
    const observed = meanOfDailyMeans(
      normalized.observations,
      'biomass_t_total',
    );
    expect(observed).toBeCloseTo(REFERENCE_STATISTICS.biomassTonnes.mean, 0);
    expect(normalized.warnings).toEqual([]);
  });

  it('normalizes cleanups to kg and distance_km', () => {
    const { normalized } = ingest('cleanup');
    for (const o of normalized.observations) {
      expect(o.values.distance_km).toBe(REFERENCE_STATISTICS.coastLengthKm);
      expect(typeof o.values.kg).toBe('number');
    }
    const kg = normalized.observations.map((o) => o.values.kg as number);
    // A year holds ~52 events, so the sample mean sits within about 1 kg of the
    // target. Tightening this further would mean forcing the mean in the
    // generator, which buys nothing: the engine reads the mean and the standard
    // deviation, and both are inside tolerance here.
    expect(
      Math.abs(mean(kg) - REFERENCE_STATISTICS.cleanupKg.mean),
    ).toBeLessThan(1.5);
  });

  it('normalizes the met-ocean file to the wind_speed field ScenarioLoader reads', () => {
    const { normalized } = ingest('environmental');
    expect(normalized.shape).toBe('columnar');
    for (const o of normalized.observations) {
      expect(typeof o.values.wind_speed).toBe('number');
      expect(typeof o.values.sea_surface_temperature).toBe('number');
    }
    const observed = meanOfDailyMeans(normalized.observations, 'wind_speed');
    expect(observed).toBeCloseTo(REFERENCE_STATISTICS.windSpeedMs.mean, 0);
    expect(normalized.warnings).toEqual([]);
  });

  it('normalizes water samples to one field per polymer, summing to the target', () => {
    const { normalized } = ingest('water_samples');
    const totals: number[] = [];
    for (const o of normalized.observations) {
      let total = 0;
      for (const { field } of WATER_POLYMER_FIELDS) {
        // The generic row normalizer keeps the column name as the field name.
        expect(typeof o.values[field]).toBe('number');
        expect(o.values[field] as number).toBeGreaterThan(0);
        total += o.values[field] as number;
      }
      totals.push(total);
    }
    expect(mean(totals)).toBeCloseTo(REFERENCE_STATISTICS.waterMpPerL.mean, 1);
    expect(normalized.warnings).toEqual([]);
  });

  it('normalizes microplastic particles to short polymer codes', () => {
    const { normalized } = ingest('microplastics');
    const polymers = new Set(
      normalized.observations.map((o) => o.values.polymer),
    );
    expect(Array.from(polymers).sort()).toEqual(
      REFERENCE_STATISTICS.polymers.slice().sort(),
    );
    expect(normalized.warnings).toEqual([]);
  });
});
