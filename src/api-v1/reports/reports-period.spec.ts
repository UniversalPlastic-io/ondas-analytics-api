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
