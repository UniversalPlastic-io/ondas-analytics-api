/** Shared value coercion + normalization used by every dataset normalizer. */

export function num(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

const pad = (n: number): string => String(n).padStart(2, '0');

/** True only for a date that exists on the calendar. */
function isRealDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const dt = new Date(Date.UTC(year, month - 1, day));
  return dt.getUTCFullYear() === year && dt.getUTCMonth() === month - 1 && dt.getUTCDate() === day;
}

/**
 * Normalizes every date spelling seen in the bucket to `YYYY-MM-DD`.
 *
 * Handles `boya_microplasticos_seabot`'s `DD-MM-YYYY` and the non-padded
 * components some cleanup files carry (`2026-04-7`). Returns null for a date
 * that does not exist — `recogidas_playas_gijon.json` holds `2025-17-08`, and a
 * value like that must be dropped with a warning rather than stored as an
 * Invalid Date.
 */
export function normalizeDate(raw: unknown): string | null {
  const s = str(raw);
  if (!s) return null;

  let year: number;
  let month: number;
  let day: number;

  const ymd = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T ].*)?$/.exec(s);
  const dmy = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/.exec(s);
  if (ymd) {
    year = Number(ymd[1]);
    month = Number(ymd[2]);
    day = Number(ymd[3]);
  } else if (dmy) {
    day = Number(dmy[1]);
    month = Number(dmy[2]);
    year = Number(dmy[3]);
  } else {
    return null;
  }

  if (!isRealDate(year, month, day)) return null;
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function normalizeTime(raw: unknown): string | null {
  const s = str(raw);
  if (!s) return null;
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(s);
  if (!m) return null;
  return `${pad(Number(m[1]))}:${m[2]}:${m[3] ?? '00'}`;
}

/** UTC instant for a normalized date (+ optional time). */
export function toTs(date: string, time: string | null): Date {
  return new Date(`${date}T${time ?? '00:00:00'}.000Z`);
}

/** `"0:28:38"` → 1718 seconds. Returns null when unparseable. */
export function durationSeconds(raw: unknown): number | null {
  const s = str(raw);
  if (!s) return null;
  const parts = s.split(':').map((p) => Number(p));
  if (parts.some((p) => !Number.isFinite(p))) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return null;
}

/** `"41.437,2.244"` or `[41.437, 2.244]` → `{lat, lon}`. */
export function latLon(raw: unknown): { lat: number; lon: number } | null {
  if (Array.isArray(raw) && raw.length >= 2) {
    const lat = num(raw[0]);
    const lon = num(raw[1]);
    return lat !== null && lon !== null ? { lat, lon } : null;
  }
  const s = str(raw);
  if (!s.includes(',')) return null;
  const [a, b] = s.split(',');
  const lat = num(a);
  const lon = num(b);
  return lat !== null && lon !== null ? { lat, lon } : null;
}

/** Pipe-separated evidence URLs → array. */
export function splitImages(raw: unknown): string[] {
  const s = str(raw);
  if (!s) return [];
  return s.split('|').map((x) => x.trim()).filter(Boolean);
}

const POLYMER_SHORT: Record<string, string> = {
  Polyethylene: 'PE',
  Polypropylene: 'PP',
  Polystyrene: 'PS',
  'Polyethylene terephthalate': 'PET',
  'Ethylene Propylene Diene Monomer': 'EPDM',
  'Poly(dimer-acid-co-alkyl polyamine)': 'PDAAP',
  'Polyester (polyester fibre)': 'Polyester',
  Polyamide: 'PA',
};

/** Collapses the inconsistent polymer labels into one short code. */
export function shortPolymer(raw: string): string {
  const s = raw.trim().replace(/\s+/g, ' ');
  const paren = /\(([^)]+)\)\s*$/.exec(s);
  if (paren) return paren[1].trim();
  return POLYMER_SHORT[s] ?? s;
}
