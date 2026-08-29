import { MarketplaceService } from './marketplace.service';
import { __clearMarketplaceCache } from './marketplace-client';

const HOME = {
  organizations: [{ id: 'o1', name: 'EcoAngola' }],
  campaigns: [
    { id: 'c1', name: 'Kalunga', collected: 2519, user: { username: 'Satec_' } },
    { id: 'c2', name: 'ONDAs', user: { username: 'universalplastic' } },
  ],
  wasteCollections: [
    { id: 'w1', city: 'Mahón', statusId: 6, user: { username: '0plastic' } },
    { id: 'w2', city: 'Gijón', statusId: 1, user: { username: 'universalplastic' } },
  ],
};

function mockFetch(ok = true, body: unknown = HOME) {
  return jest.spyOn(global, 'fetch').mockImplementation((() =>
    ok ? Promise.resolve({ ok: true, json: () => Promise.resolve(body) } as unknown as Response)
       : Promise.resolve({ ok: false, status: 503 } as Response)) as typeof fetch);
}

describe('MarketplaceService', () => {
  let svc: MarketplaceService;
  beforeEach(() => { svc = new MarketplaceService(); __clearMarketplaceCache(); });
  afterEach(() => jest.restoreAllMocks());

  it('returns each upstream slice verbatim', async () => {
    mockFetch();
    expect(await svc.getCampaigns()).toEqual(HOME.campaigns);
    expect(await svc.getCleanups()).toEqual(HOME.wasteCollections);
    expect(await svc.getOrganizations()).toEqual(HOME.organizations);
  });

  it('filters by user.username (case-insensitive) on campaigns + cleanups', async () => {
    mockFetch();
    const camps = await svc.getCampaigns('UNIVERSALPLASTIC');
    expect(camps.map((c: any) => c.id)).toEqual(['c2']);
    const wcs = await svc.getCleanups('universalplastic');
    expect(wcs.map((w: any) => w.id)).toEqual(['w2']);
  });

  it('unknown username → empty', async () => {
    mockFetch();
    expect(await svc.getCampaigns('nobody')).toEqual([]);
  });

  it('caches: one fetch across multiple getters', async () => {
    const f = mockFetch();
    await svc.getCampaigns();
    await svc.getCleanups();
    await svc.getOrganizations();
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('missing key → empty array', async () => {
    mockFetch(true, { campaigns: [{ id: 'c1' }] });
    expect(await svc.getOrganizations()).toEqual([]);
    expect(await svc.getCleanups()).toEqual([]);
  });

  it('upstream non-ok → throws upstream_unavailable', async () => {
    mockFetch(false);
    await expect(svc.getCampaigns()).rejects.toThrow('upstream_unavailable');
  });
});
