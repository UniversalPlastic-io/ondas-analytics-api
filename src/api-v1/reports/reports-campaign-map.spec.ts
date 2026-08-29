import { resolveCampaignScope } from './reports-campaign-map';

describe('resolveCampaignScope', () => {
  it('maps c3 → Barcelona, one asset fragment with site/city', () => {
    const s = resolveCampaignScope('c3');
    expect(s.campaignId).toBe('c3');
    expect(s.campaignName).toMatch(/Barceloneta/i);
    expect(s.fragments).toEqual(['recogidas_playas_barcelona']);
    expect(s.siteLabel).toBe('Barcelona');
    expect(s.city).toBe('Barcelona');
  });

  it('maps c1 → Blanes / Costa Brava', () => {
    const s = resolveCampaignScope('c1');
    expect(s.fragments).toEqual(['recogidas_playas_blanes']);
    expect(s.city).toBe('Costa Brava');
  });

  it('all → every cleanup fragment', () => {
    const s = resolveCampaignScope('all');
    expect(s.campaignId).toBe('all');
    expect(s.fragments).toHaveLength(5);
    expect(s.fragments).toContain('recogidas_playa_tenerife');
  });

  it('undefined behaves like all', () => {
    expect(resolveCampaignScope(undefined).fragments).toHaveLength(5);
  });

  it('an unknown campaign id falls back to all', () => {
    expect(resolveCampaignScope('nope').fragments).toHaveLength(5);
  });

  it('carries coordinates for the report ocean lookup', () => {
    const s = resolveCampaignScope('c4');
    expect(s.lat).toBeCloseTo(28.1876, 3);
    expect(s.lon).toBeCloseTo(-16.6596, 3);
  });
});
