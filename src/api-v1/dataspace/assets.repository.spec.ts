import { assetQuery } from './assets.repository';
import { REFERENCE_PROVIDER_FOLDER } from './dataspace.constants';

describe('assetQuery', () => {
  it('defaults to active assets', () => {
    expect(assetQuery()).toEqual({ status: 'active' });
    expect(assetQuery({ status: 'any' })).toEqual({});
  });

  it('matches a provider by declared id or by folder in the key', () => {
    expect(assetQuery({ provider: 'innoceana' }).$or).toEqual([
      { dataProviderIdRaw: 'innoceana' },
      { key: { $regex: '/innoceana/' } },
    ]);
  });

  it('excludes a provider with $nor, so it composes with an include', () => {
    const q = assetQuery({
      provider: 'innoceana',
      excludeProvider: REFERENCE_PROVIDER_FOLDER,
    });
    expect(q.$or).toEqual([
      { dataProviderIdRaw: 'innoceana' },
      { key: { $regex: '/innoceana/' } },
    ]);
    expect(q.$nor).toEqual([
      { dataProviderIdRaw: REFERENCE_PROVIDER_FOLDER },
      { key: { $regex: `/${REFERENCE_PROVIDER_FOLDER}/` } },
    ]);
  });

  it('matches the reference tier by its folder in the key, not only by provider id', () => {
    // The reference datasets are published under the universal_plastic
    // organization so the ingest can attach them to one, so the folder in the
    // key is the only thing that still identifies the tier. Both the include and
    // the exclude have to keep a clause for it.
    const keyClause = { key: { $regex: `/${REFERENCE_PROVIDER_FOLDER}/` } };
    expect(
      assetQuery({ provider: REFERENCE_PROVIDER_FOLDER }).$or,
    ).toContainEqual(keyClause);
    expect(
      assetQuery({ excludeProvider: REFERENCE_PROVIDER_FOLDER }).$nor,
    ).toContainEqual(keyClause);
  });

  it('keeps the other filters untouched', () => {
    expect(
      assetQuery({
        category: 'biomass',
        ocean: 'mediterraneo',
        excludeProvider: 'x',
      }),
    ).toEqual({
      status: 'active',
      category: 'biomass',
      ocean: 'mediterraneo',
      $nor: [{ dataProviderIdRaw: 'x' }, { key: { $regex: '/x/' } }],
    });
  });
});
