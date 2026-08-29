/**
 * Raw column name → canonical field name, per dataset type.
 *
 * Canonical names are snake_case and carry their unit when it is not obvious.
 * Everything downstream (repositories, pipelines, endpoints) speaks these names;
 * the raw spellings never leave the normalizer.
 */

/**
 * Three spellings of these columns are live in the bucket:
 *
 *   `Polypropylene (%)`   barcelona, tenerife
 *   `Polypropylene`       badalona, blanes — the spelling the DCAT schema declares
 *   `Polypropylene `      gijón, with a trailing space, and `Other` for `Others`
 *
 * Matching them literally silently dropped the composition of the files that did
 * not use the first spelling, so lookups go through `recogidasKey`, which
 * collapses all three. The map keeps the suffixed spelling as its key because
 * that is the one the units block of most files declares.
 */
export const RECOGIDAS_NUMERIC: Record<string, string> = {
  'Plastic waste collected': 'kg',
  'Number of participants': 'participants',
  'Walking distance': 'distance_km',
  'Polyethylene terephthalate (%)': 'pct_pet',
  'High-density polyethylene (%)': 'pct_hdpe',
  'Polyvinyl chloride (%)': 'pct_pvc',
  'Low-density polyethylene (%)': 'pct_ldpe',
  'Polypropylene (%)': 'pct_pp',
  'Polystyrene (%)': 'pct_ps',
  'Others (%)': 'pct_others',
};

/** Column names that differ only in wording, not in meaning. */
const RECOGIDAS_COLUMN_ALIASES: Record<string, string> = {
  other: 'others',
};

/**
 * Comparable form of a recogidas column name: trimmed, without the `(%)` suffix
 * and case-insensitive. Applied to both the map keys and the file's own columns,
 * so any of the live spellings resolves to the same canonical field.
 */
export function recogidasKey(rawColumn: string): string {
  const key = rawColumn
    .trim()
    .replace(/\s*\(%\)$/, '')
    .trim()
    .toLowerCase();
  return RECOGIDAS_COLUMN_ALIASES[key] ?? key;
}

/** Canonical polymer percentage fields, in the report/overview display order. */
export const POLYMER_PCT_FIELDS: Array<{
  field: string;
  label: string;
  color: string;
}> = [
  { field: 'pct_pet', label: 'PET', color: '#00003F' },
  { field: 'pct_hdpe', label: 'HDPE', color: '#39B3D8' },
  { field: 'pct_ldpe', label: 'LDPE', color: '#BDEAF7' },
  { field: 'pct_pp', label: 'PP', color: '#4055F6' },
  { field: 'pct_ps', label: 'PS', color: '#2F8AA9' },
  { field: 'pct_pvc', label: 'PVC', color: '#62C8E8' },
  { field: 'pct_others', label: 'Others', color: '#B8BBC9' },
];

export const MICROPLASTICOS_FIELDS: Record<string, string> = {
  Particle_ID: 'particle_id',
  Size: 'size',
  Form: 'form',
  Type_of_Polymer: 'polymer',
  Colour: 'colour',
};

/**
 * `"Biomass depth -3_-5 m"` → `biomass_t_3_5`.
 * Absorbs the inconsistent spelling between files (`-3_-5` vs `-5.00_-8`).
 */
const BIOMASS_DEPTH_RE = /^Biomass depth\s+(-?[\d.]+)_(-?[\d.]+)\s*m$/i;

export function biomassDepthField(rawColumn: string): string | null {
  const m = BIOMASS_DEPTH_RE.exec(rawColumn.trim());
  if (!m) return null;
  const top = Math.round(Math.abs(Number(m[1])));
  const bottom = Math.round(Math.abs(Number(m[2])));
  if (!Number.isFinite(top) || !Number.isFinite(bottom)) return null;
  return `biomass_t_${top}_${bottom}`;
}

/** Columns that identify a row rather than measure something. */
export const INDEX_COLUMNS = new Set(['Date', 'Time', 'date', 'time']);
