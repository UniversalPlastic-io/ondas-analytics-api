import { durationSeconds, latLon, normalizeDate, normalizeTime, splitImages, toTs } from './helpers';

describe('normalizeDate', () => {
  it('passes through a well-formed ISO day', () => {
    expect(normalizeDate('2025-09-17')).toBe('2025-09-17');
  });

  it('converts the DD-MM-YYYY spelling used by the microplastics buoy', () => {
    expect(normalizeDate('18-02-2026')).toBe('2026-02-18');
  });

  // Live data: atlantico/innoceana/recogidas_playa_tenerife.json carries "2026-04-7".
  it('zero-pads a single-digit day', () => {
    expect(normalizeDate('2026-04-7')).toBe('2026-04-07');
  });

  it('zero-pads a single-digit month and day', () => {
    expect(normalizeDate('2025-2-3')).toBe('2025-02-03');
  });

  // Live data: catambrico/gijon_surf_hostel/recogidas_playas_gijon.json carries "2025-17-08".
  it('rejects a month that does not exist', () => {
    expect(normalizeDate('2025-17-08')).toBeNull();
  });

  it('rejects a day that does not exist in that month', () => {
    expect(normalizeDate('2025-02-30')).toBeNull();
  });

  it('accepts a real leap day and rejects a fake one', () => {
    expect(normalizeDate('2024-02-29')).toBe('2024-02-29');
    expect(normalizeDate('2025-02-29')).toBeNull();
  });

  it('returns null for junk', () => {
    expect(normalizeDate('')).toBeNull();
    expect(normalizeDate(null)).toBeNull();
    expect(normalizeDate('not a date')).toBeNull();
  });

  it('never produces a value that yields an Invalid Date', () => {
    for (const raw of ['2025-17-08', '2025-02-30', '2026-04-7', '2025-09-17', '18-02-2026']) {
      const normalized = normalizeDate(raw);
      if (normalized === null) continue;
      expect(Number.isNaN(toTs(normalized, null).getTime())).toBe(false);
    }
  });
});

describe('normalizeTime', () => {
  it('pads the hour and defaults the seconds', () => {
    expect(normalizeTime('9:05')).toBe('09:05:00');
    expect(normalizeTime('10:10:00')).toBe('10:10:00');
    expect(normalizeTime('nope')).toBeNull();
  });
});

describe('durationSeconds', () => {
  it('reads HH:MM:SS', () => {
    expect(durationSeconds('0:28:38')).toBe(1718);
    expect(durationSeconds('1:00:00')).toBe(3600);
    expect(durationSeconds('')).toBeNull();
  });
});

describe('latLon', () => {
  it('reads the "lat,lon" string and the [lat, lon] array', () => {
    expect(latLon('41.437,2.244')).toEqual({ lat: 41.437, lon: 2.244 });
    expect(latLon([41.437, 2.244])).toEqual({ lat: 41.437, lon: 2.244 });
    expect(latLon('nope')).toBeNull();
  });
});

describe('splitImages', () => {
  it('splits the pipe-separated evidence URLs', () => {
    expect(splitImages('a | b |c')).toEqual(['a', 'b', 'c']);
    expect(splitImages('')).toEqual([]);
  });
});
