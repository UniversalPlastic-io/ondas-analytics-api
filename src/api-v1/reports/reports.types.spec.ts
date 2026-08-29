import { impactRatingFor, CO2E_TONNES_PER_KG, POLYMER_COLUMNS } from './reports.types';

describe('reports.types', () => {
  it('rates impact index into bands', () => {
    expect(impactRatingFor(81)).toBe('Excellent');
    expect(impactRatingFor(60)).toBe('Good');
    expect(impactRatingFor(40)).toBe('Fair');
    expect(impactRatingFor(10)).toBe('Low');
  });
  it('CO2 factor reproduces the reference (1240 kg → 12.4 t)', () => {
    expect(1240 * CO2E_TONNES_PER_KG).toBeCloseTo(12.4, 5);
  });
  it('has 7 polymer columns with palette colors', () => {
    expect(POLYMER_COLUMNS).toHaveLength(7);
    expect(POLYMER_COLUMNS[0]).toMatchObject({ label: 'PET', color: '#00003F' });
  });
});
