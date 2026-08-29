import { DatasetType } from '../dataspace.constants';
import {
  biomassDepthField,
  INDEX_COLUMNS,
  MICROPLASTICOS_FIELDS,
  RECOGIDAS_NUMERIC,
  recogidasKey,
} from './field-maps';
import {
  durationSeconds,
  latLon,
  normalizeDate,
  normalizeTime,
  num,
  shortPolymer,
  splitImages,
  str,
  toTs,
} from './helpers';

export type ObservationValue = number | string | null;

export interface CanonicalObservation {
  date: string;
  time: string | null;
  ts: Date;
  eventDate: string | null;
  lat: number | null;
  lon: number | null;
  values: Record<string, ObservationValue>;
  raw?: Record<string, unknown>;
}

export type DatasetShape = 'rows' | 'columnar' | 'nested';

export interface NormalizeResult {
  shape: DatasetShape;
  observations: CanonicalObservation[];
  /** Rows that carried no usable date and were dropped. */
  skipped: number;
  /** The offending raw date values, so a warning can name them. */
  skippedSamples: string[];
  warnings: string[];
}

type RawRecord = Record<string, unknown>;

function rowsOf(dataset: unknown): RawRecord[] {
  const records = (dataset as { records?: unknown })?.records;
  return Array.isArray(records) ? (records as RawRecord[]) : [];
}

function columnsOf(dataset: unknown): Record<string, unknown[]> {
  const columns = (dataset as { columns?: unknown })?.columns;
  return columns && typeof columns === 'object'
    ? (columns as Record<string, unknown[]>)
    : {};
}

function observation(
  date: string,
  time: string | null,
  values: Record<string, ObservationValue>,
  extra: Partial<
    Pick<CanonicalObservation, 'eventDate' | 'lat' | 'lon' | 'raw'>
  > = {},
): CanonicalObservation {
  return {
    date,
    time,
    ts: toTs(date, time),
    eventDate: extra.eventDate ?? null,
    lat: extra.lat ?? null,
    lon: extra.lon ?? null,
    values,
    ...(extra.raw ? { raw: extra.raw } : {}),
  };
}

// ---------------------------------------------------------------------------
// recogidas_playa — one record per cleanup event
// ---------------------------------------------------------------------------

function normalizeRecogidas(dataset: unknown): NormalizeResult {
  const observations: CanonicalObservation[] = [];
  const skippedSamples: string[] = [];
  let skipped = 0;

  for (const r of rowsOf(dataset)) {
    const date = normalizeDate(r['Date']);
    if (!date) {
      skipped += 1;
      skippedSamples.push(str(r['Date']) || '(empty)');
      continue;
    }
    // Index the row by comparable column name, so a trailing space or a `(%)`
    // suffix in the source file does not lose the value.
    const byKey = new Map<string, unknown>();
    for (const [rawCol, raw] of Object.entries(r)) {
      const key = recogidasKey(rawCol);
      if (!byKey.has(key) || byKey.get(key) === undefined) byKey.set(key, raw);
    }

    const values: Record<string, ObservationValue> = {};
    for (const [mapKey, field] of Object.entries(RECOGIDAS_NUMERIC)) {
      values[field] = num(byKey.get(recogidasKey(mapKey)));
    }

    const start = latLon(r['Start point']);
    const end = latLon(r['End point']);
    values.start_lat = start?.lat ?? null;
    values.start_lon = start?.lon ?? null;
    values.end_lat = end?.lat ?? null;
    values.end_lon = end?.lon ?? null;
    values.duration_s = durationSeconds(r['Cleanup duration']);

    const images = splitImages(r['Collected waste image']);
    values.evidence_count = images.length;

    observations.push(
      observation(date, null, values, {
        lat: start?.lat ?? null,
        lon: start?.lon ?? null,
        raw: {
          duration: str(r['Cleanup duration']) || null,
          images,
        },
      }),
    );
  }

  return { shape: 'rows', observations, skipped, skippedSamples, warnings: [] };
}

// ---------------------------------------------------------------------------
// boya_biomasa_slx+ — several readings per day, one column per depth layer
// ---------------------------------------------------------------------------

function normalizeBiomasa(dataset: unknown): NormalizeResult {
  const observations: CanonicalObservation[] = [];
  const warnings: string[] = [];
  const unmapped = new Set<string>();
  const skippedSamples: string[] = [];
  let skipped = 0;

  for (const r of rowsOf(dataset)) {
    const date = normalizeDate(r['Date']);
    if (!date) {
      skipped += 1;
      skippedSamples.push(str(r['Date']) || '(empty)');
      continue;
    }
    const time = normalizeTime(r['Time']);
    const values: Record<string, ObservationValue> = {};
    let total = 0;
    let sawLayer = false;

    for (const [rawCol, raw] of Object.entries(r)) {
      if (INDEX_COLUMNS.has(rawCol)) continue;
      const field = biomassDepthField(rawCol);
      const n = num(raw);
      if (!field) {
        if (n !== null) unmapped.add(rawCol);
        continue;
      }
      values[field] = n;
      if (n !== null) {
        total += n;
        sawLayer = true;
      }
    }

    values.biomass_t_total = sawLayer ? total : null;
    observations.push(observation(date, time, values));
  }

  if (unmapped.size) {
    warnings.push(
      `unmapped numeric columns kept out of values: ${Array.from(unmapped).join(', ')}`,
    );
  }
  return { shape: 'rows', observations, skipped, skippedSamples, warnings };
}

// ---------------------------------------------------------------------------
// boya_microplasticos_seabot — one record per detected particle (DD-MM-YYYY)
// ---------------------------------------------------------------------------

function normalizeMicroplasticos(dataset: unknown): NormalizeResult {
  const observations: CanonicalObservation[] = [];
  const warnings: string[] = [];
  const skippedSamples: string[] = [];
  let skipped = 0;
  let reformattedDates = 0;

  for (const r of rowsOf(dataset)) {
    const rawDate = str(r['Date']);
    const date = normalizeDate(rawDate);
    if (!date) {
      skipped += 1;
      skippedSamples.push(rawDate || '(empty)');
      continue;
    }
    if (rawDate !== date) reformattedDates += 1;

    const values: Record<string, ObservationValue> = {};
    for (const [rawCol, field] of Object.entries(MICROPLASTICOS_FIELDS)) {
      const raw = r[rawCol];
      if (field === 'particle_id') values[field] = num(raw);
      else if (field === 'polymer')
        values[field] = typeof raw === 'string' ? shortPolymer(raw) : null;
      else values[field] = typeof raw === 'string' ? raw.trim() : null;
    }
    values.particles = 1;
    observations.push(observation(date, null, values));
  }

  if (reformattedDates) {
    warnings.push(
      `${reformattedDates} dates converted from DD-MM-YYYY to YYYY-MM-DD`,
    );
  }
  return { shape: 'rows', observations, skipped, skippedSamples, warnings };
}

// ---------------------------------------------------------------------------
// environmental_boya — columnar, hourly, despivoted to one row per reading
// ---------------------------------------------------------------------------

function normalizeEnvironmental(dataset: unknown): NormalizeResult {
  const columns = columnsOf(dataset);
  const warnings: string[] = [];
  const dates = columns['Date'];
  if (!Array.isArray(dates) || !dates.length) {
    return {
      shape: 'columnar',
      observations: [],
      skipped: 0,
      skippedSamples: [],
      warnings: ['columnar dataset has no Date column'],
    };
  }
  const times = Array.isArray(columns['Time']) ? columns['Time'] : [];
  const measureKeys = Object.keys(columns).filter((k) => !INDEX_COLUMNS.has(k));

  // Include the index column: a Date array longer than its measures is exactly
  // the misalignment worth reporting.
  const lengths = new Set(
    [
      dates.length,
      ...measureKeys.map((k) =>
        Array.isArray(columns[k]) ? columns[k].length : -1,
      ),
    ].filter((n) => n >= 0),
  );
  if (lengths.size > 1) {
    warnings.push(
      `columnar arrays have differing lengths (${Array.from(lengths).join(', ')}); truncated to the shortest`,
    );
  }

  const usable = Math.min(
    dates.length,
    ...measureKeys.map((k) =>
      Array.isArray(columns[k]) ? columns[k].length : 0,
    ),
  );
  const observations: CanonicalObservation[] = [];
  const skippedSamples: string[] = [];
  let skipped = 0;

  for (let i = 0; i < usable; i += 1) {
    const date = normalizeDate(dates[i]);
    if (!date) {
      skipped += 1;
      if (skippedSamples.length < 5)
        skippedSamples.push(str(dates[i]) || '(empty)');
      continue;
    }
    const time = normalizeTime(times[i]);
    const values: Record<string, ObservationValue> = {};
    for (const k of measureKeys) {
      values[k] = num((columns[k] as unknown[])[i]);
    }
    observations.push(observation(date, time, values));
  }

  return { shape: 'columnar', observations, skipped, skippedSamples, warnings };
}

// ---------------------------------------------------------------------------
// atmosfera_/oceanografia_previa_evento — nested 7-day window per cleanup event
// ---------------------------------------------------------------------------

function nestedWindow(record: RawRecord): { records: RawRecord[] } | null {
  for (const [key, value] of Object.entries(record)) {
    if (!key.endsWith('_previa')) continue;
    const inner = (value as { records?: unknown })?.records;
    if (Array.isArray(inner)) return { records: inner as RawRecord[] };
  }
  return null;
}

function normalizeEventWindow(dataset: unknown): NormalizeResult {
  const observations: CanonicalObservation[] = [];
  const warnings: string[] = [];
  const skippedSamples: string[] = [];
  let skipped = 0;
  let events = 0;

  for (const r of rowsOf(dataset)) {
    const eventDate = normalizeDate(r['event_date']);
    const window = nestedWindow(r);
    if (!window) {
      skipped += 1;
      continue;
    }
    events += 1;
    const loc = r['location'] as { lat?: unknown; lon?: unknown } | undefined;
    const lat = num(loc?.lat);
    const lon = num(loc?.lon);

    for (const day of window.records) {
      const date = normalizeDate(day['date']);
      if (!date) {
        skipped += 1;
        if (skippedSamples.length < 5)
          skippedSamples.push(str(day['date']) || '(empty)');
        continue;
      }
      const values: Record<string, ObservationValue> = {};
      for (const [key, raw] of Object.entries(day)) {
        if (key === 'date') continue;
        values[key] = num(raw);
      }
      observations.push(
        observation(date, null, values, { eventDate, lat, lon }),
      );
    }
  }

  if (events)
    warnings.push(
      `${events} event windows expanded into ${observations.length} daily observations`,
    );
  return { shape: 'nested', observations, skipped, skippedSamples, warnings };
}

// ---------------------------------------------------------------------------
// Generic rows fallback — future types (water / fish samples) with no bespoke map
// ---------------------------------------------------------------------------

function normalizeGenericRows(dataset: unknown): NormalizeResult {
  const observations: CanonicalObservation[] = [];
  const skippedSamples: string[] = [];
  let skipped = 0;

  for (const r of rowsOf(dataset)) {
    const date = normalizeDate(r['Date'] ?? r['date']);
    if (!date) {
      skipped += 1;
      if (skippedSamples.length < 5)
        skippedSamples.push(str(r['Date'] ?? r['date']) || '(empty)');
      continue;
    }
    const time = normalizeTime(r['Time'] ?? r['time']);
    const values: Record<string, ObservationValue> = {};
    for (const [key, raw] of Object.entries(r)) {
      if (INDEX_COLUMNS.has(key)) continue;
      const n = num(raw);
      values[key] =
        n !== null ? n : typeof raw === 'string' ? raw.trim() : null;
    }
    observations.push(observation(date, time, values));
  }

  return { shape: 'rows', observations, skipped, skippedSamples, warnings: [] };
}

// ---------------------------------------------------------------------------

const NORMALIZERS: Record<DatasetType, (dataset: unknown) => NormalizeResult> =
  {
    recogidas_playa: normalizeRecogidas,
    'boya_biomasa_slx+': normalizeBiomasa,
    boya_microplasticos_seabot: normalizeMicroplasticos,
    environmental_boya: normalizeEnvironmental,
    atmosfera_previa_evento: normalizeEventWindow,
    oceanografia_previa_evento: normalizeEventWindow,
    muestras_de_agua_py_gcms: normalizeGenericRows,
    muestras_de_peces_py_gcms: normalizeGenericRows,
  };

/** Turns a validated asset envelope's `dataset` block into canonical observations. */
export function normalizeDataset(
  datasetType: DatasetType,
  dataset: unknown,
): NormalizeResult {
  const normalizer = NORMALIZERS[datasetType] ?? normalizeGenericRows;
  const declaredFormat = str((dataset as { format?: unknown })?.format);
  const result = normalizer(dataset);
  if (declaredFormat === 'columnar' && result.shape !== 'columnar') {
    result.warnings.push(
      `dataset.format declares "columnar" but was read as ${result.shape}`,
    );
  }

  // Last line of defence: normalizeDate already rejects impossible dates, so an
  // unusable timestamp here would be a normalizer bug rather than bad data.
  const usable = result.observations.filter(
    (o) => !Number.isNaN(o.ts.getTime()),
  );
  if (usable.length !== result.observations.length) {
    result.warnings.push(
      `${result.observations.length - usable.length} observations dropped for producing an invalid timestamp`,
    );
    result.observations = usable;
  }
  return result;
}
