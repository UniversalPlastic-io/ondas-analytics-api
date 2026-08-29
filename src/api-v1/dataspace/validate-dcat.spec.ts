import { __clearDcatCache, validateAgainstDcat } from './validate-dcat';

/**
 * Runs against the schemas committed in metadata/DCAT, so a schema edited out of
 * step with the live column names fails here rather than in an ingest warning.
 */
beforeEach(() => __clearDcatCache());

const validate = (
  datasetType: Parameters<typeof validateAgainstDcat>[0]['datasetType'],
  record: Record<string, unknown>,
) =>
  validateAgainstDcat({
    datasetType,
    dataset: { format: 'rows', records: [record] },
    metadata: {},
  });

describe('validateAgainstDcat — recogidas_playa spellings', () => {
  const columns = {
    bare: 'Polypropylene',
    suffixed: 'Polypropylene (%)',
    trailingSpace: 'Polypropylene ',
  };

  it.each(Object.entries(columns))(
    'accepts the %s spelling',
    async (_label, column) => {
      const res = await validate('recogidas_playa', {
        Date: '2025-01-01',
        [column]: 1,
      });
      expect(res.checked).toBe(true);
      expect(res.unknownColumns).toEqual([]);
    },
  );

  it('accepts the singular "Other" gijón uses', async () => {
    const res = await validate('recogidas_playa', {
      Date: '2025-01-01',
      Other: 0,
    });
    expect(res.unknownColumns).toEqual([]);
  });

  it('still reports a column the schema really does not declare', async () => {
    const res = await validate('recogidas_playa', {
      Date: '2025-01-01',
      Unobtainium: 1,
    });
    expect(res.unknownColumns).toEqual(['Unobtainium']);
  });
});

describe('validateAgainstDcat — boya_biomasa_slx+ depth spellings', () => {
  it.each(['Biomass depth -5_-8 m', 'Biomass depth -5.00_-8 m'])(
    'accepts %s',
    async (column) => {
      const res = await validate('boya_biomasa_slx+', {
        Date: '2025-01-01',
        [column]: 1,
      });
      expect(res.checked).toBe(true);
      expect(res.unknownColumns).toEqual([]);
    },
  );

  it('declares the deep layers that only the gijón buoy reports', async () => {
    const res = await validate('boya_biomasa_slx+', {
      Date: '2025-01-01',
      'Biomass depth -11.00_-16 m': 1,
      'Biomass depth -16.00_-21 m': 1,
      'Biomass depth -21.00_-29 m': 1,
    });
    expect(res.unknownColumns).toEqual([]);
  });
});

describe('validateAgainstDcat — schemas describe the published assets', () => {
  it('declares the met-ocean columns as the published files name them', async () => {
    const res = await validate('environmental_boya', {
      Date: '2025-01-01',
      Time: '00:00:00',
      wind_speed: 3.1,
      sea_surface_temperature: 15,
      ocean_current_speed: 0.3,
    });
    expect(res.unknownColumns).toEqual([]);
  });

  it('declares the per-particle columns of the microplastics buoy', async () => {
    const res = await validate('boya_microplasticos_seabot', {
      Date: '18-02-2026',
      Particle_ID: 1,
      Size: 'Mesoplastics',
      Form: 'Line',
      Type_of_Polymer: 'Polyethylene',
      Colour: 'Red',
    });
    expect(res.unknownColumns).toEqual([]);
    expect(res.missingColumns).toEqual([]);
  });

  it('declares the water sample polymer columns', async () => {
    const res = await validate('muestras_de_agua_py_gcms', {
      Date: '2025-01-06',
      Polyethylene: 0.62,
      'Poly(methyl methacrylate)': 0.05,
    });
    expect(res.unknownColumns).toEqual([]);
  });
});
