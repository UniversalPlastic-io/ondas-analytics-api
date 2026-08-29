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
