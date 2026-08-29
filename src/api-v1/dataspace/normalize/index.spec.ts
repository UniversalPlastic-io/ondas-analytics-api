import { normalizeDataset } from './index';

describe('normalizeDataset — recogidas_playa', () => {
  const dataset = {
    format: 'rows',
    records: [
      {
        Date: '2025-11-07',
        'Start point': '41.437,2.244',
        'End point': '41.437,2.242',
        'Plastic waste collected': 0.5,
        'Number of participants': 2,
        'Walking distance': 1.54,
        'Cleanup duration': '0:28:38',
        'Polyethylene terephthalate (%)': 42.7,
        'High-density polyethylene (%)': 21.62,
        'Polyvinyl chloride (%)': 8.11,
        'Low-density polyethylene (%)': 22.16,
        'Polypropylene (%)': 5.41,
        'Polystyrene (%)': 0,
        'Others (%)': 0,
        'Collected waste image': 'a.jpg | b.jpg',
      },
    ],
  };

  it('maps the raw columns onto canonical field names', () => {
    const { observations, shape } = normalizeDataset(
      'recogidas_playa',
      dataset,
    );
    expect(shape).toBe('rows');
    expect(observations[0].values).toMatchObject({
      kg: 0.5,
      participants: 2,
      distance_km: 1.54,
      duration_s: 1718,
      pct_pet: 42.7,
      pct_hdpe: 21.62,
      evidence_count: 2,
      start_lat: 41.437,
      start_lon: 2.244,
    });
  });

  it('keeps the evidence URLs and the original duration string in raw', () => {
    const { observations } = normalizeDataset('recogidas_playa', dataset);
    expect(observations[0].raw).toEqual({
      duration: '0:28:38',
      images: ['a.jpg', 'b.jpg'],
    });
  });

  it('positions the observation at the cleanup start point', () => {
    const { observations } = normalizeDataset('recogidas_playa', dataset);
    expect(observations[0]).toMatchObject({ lat: 41.437, lon: 2.244 });
  });

  it('maps the polymer columns whether or not they carry the (%) suffix', () => {
    // badalona and blanes spell them the way the DCAT schema does.
    const bare = {
      format: 'rows',
      records: [
        {
          Date: '2025-11-07',
          'Plastic waste collected': 7.6,
          'Walking distance': 1.72,
          'Polyethylene terephthalate': 5.56,
          'High-density polyethylene': 15.34,
          'Polyvinyl chloride': 38.19,
          'Low-density polyethylene': 35.63,
          Polypropylene: 0,
          Polystyrene: 4.22,
          Others: 1.05,
        },
      ],
    };
    const { observations } = normalizeDataset('recogidas_playa', bare);
    expect(observations[0].values).toMatchObject({
      kg: 7.6,
      distance_km: 1.72,
      pct_pet: 5.56,
      pct_hdpe: 15.34,
      pct_pvc: 38.19,
      pct_ldpe: 35.63,
      pct_pp: 0,
      pct_ps: 4.22,
      pct_others: 1.05,
    });
  });

  it('tolerates the trailing spaces and singular "Other" that gijón uses', () => {
    const { observations } = normalizeDataset('recogidas_playa', {
      format: 'rows',
      records: [
        {
          Date: '2025-09-17',
          'Plastic waste collected': 0.1,
          'Walking distance': 1.63,
          'Polyethylene terephthalate ': 0,
          'High-density polyethylene ': 25.29,
          'Polyvinyl chloride ': 6.9,
          'Low-density polyethylene ': 39.08,
          'Polypropylene ': 28.74,
          'Polystyrene ': 0,
          Other: 0,
        },
      ],
    });
    expect(observations[0].values).toMatchObject({
      kg: 0.1,
      distance_km: 1.63,
      pct_pet: 0,
      pct_hdpe: 25.29,
      pct_pvc: 6.9,
      pct_ldpe: 39.08,
      pct_pp: 28.74,
      pct_ps: 0,
      pct_others: 0,
    });
  });

  it('leaves a polymer field null when no spelling of the column is present', () => {
    const { observations } = normalizeDataset('recogidas_playa', {
      format: 'rows',
      records: [{ Date: '2025-11-07', 'Plastic waste collected': 1 }],
    });
    expect(observations[0].values.pct_pet).toBeNull();
  });

  it('skips a record with an impossible date and reports the value', () => {
    const { observations, skipped, skippedSamples } = normalizeDataset(
      'recogidas_playa',
      {
        format: 'rows',
        records: [
          ...dataset.records,
          { Date: '2025-17-08', 'Plastic waste collected': 1.2 },
        ],
      },
    );
    expect(observations).toHaveLength(1);
    expect(skipped).toBe(1);
    expect(skippedSamples).toEqual(['2025-17-08']);
  });
});

describe('normalizeDataset — boya_biomasa_slx+', () => {
  const dataset = {
    format: 'rows',
    records: [
      {
        Date: '2025-12-06',
        Time: '10:10:00',
        'Biomass depth -3_-5 m': 23,
        'Biomass depth -5.00_-8 m': 5,
        'Biomass depth -8.00_-11 m': 1,
      },
      {
        Date: '2025-12-06',
        Time: '11:10:00',
        'Biomass depth -3_-5 m': 10,
        'Biomass depth -5.00_-8 m': 2,
        'Biomass depth -8.00_-11 m': 0,
      },
    ],
  };

  it('normalizes the inconsistent depth column spellings to one scheme', () => {
    const { observations } = normalizeDataset('boya_biomasa_slx+', dataset);
    expect(observations[0].values).toMatchObject({
      biomass_t_3_5: 23,
      biomass_t_5_8: 5,
      biomass_t_8_11: 1,
      biomass_t_total: 29,
    });
  });

  it('keeps the reading time', () => {
    const { observations } = normalizeDataset('boya_biomasa_slx+', dataset);
    expect(observations[0].time).toBe('10:10:00');
    expect(observations[0].ts.toISOString()).toBe('2025-12-06T10:10:00.000Z');
  });
});

describe('normalizeDataset — boya_microplasticos_seabot', () => {
  const dataset = {
    format: 'rows',
    records: [
      {
        Date: '18-02-2026',
        Particle_ID: 1,
        Size: 'Mesoplastics',
        Form: 'Line',
        Type_of_Polymer: 'Polyethylene',
        Colour: 'Red',
      },
    ],
  };

  it('converts the DD-MM-YYYY dates and shortens the polymer label', () => {
    const { observations, warnings } = normalizeDataset(
      'boya_microplasticos_seabot',
      dataset,
    );
    expect(observations[0].date).toBe('2026-02-18');
    expect(observations[0].values).toMatchObject({
      polymer: 'PE',
      size: 'Mesoplastics',
      form: 'Line',
      particles: 1,
    });
    expect(warnings.some((w) => /converted from DD-MM-YYYY/.test(w))).toBe(
      true,
    );
  });
});

describe('normalizeDataset — environmental_boya', () => {
  const dataset = {
    format: 'columnar',
    index: ['Date', 'Time'],
    columns: {
      Date: ['2025-11-28', '2025-11-28'],
      Time: ['00:00:00', '01:00:00'],
      air_temperature: [15.2, 15.0],
      wind_speed: [3.1, 3.4],
    },
  };

  it('despivots parallel arrays into one observation per reading', () => {
    const { observations, shape } = normalizeDataset(
      'environmental_boya',
      dataset,
    );
    expect(shape).toBe('columnar');
    expect(observations).toHaveLength(2);
    expect(observations[1]).toMatchObject({
      date: '2025-11-28',
      time: '01:00:00',
    });
    expect(observations[1].values).toEqual({
      air_temperature: 15.0,
      wind_speed: 3.4,
    });
  });

  it('truncates to the shortest column and says so', () => {
    const { observations, warnings } = normalizeDataset('environmental_boya', {
      format: 'columnar',
      columns: { Date: ['2025-11-28', '2025-11-29'], wind_speed: [3.1] },
    });
    expect(observations).toHaveLength(1);
    expect(warnings.some((w) => /differing lengths/.test(w))).toBe(true);
  });
});

describe('normalizeDataset — nested pre-event windows', () => {
  const dataset = {
    format: 'rows',
    records: [
      {
        event_date: '2025-11-07',
        location: { lat: 41.4377, lon: 2.2442 },
        atmosfera_previa: {
          dateRange: { start: '2025-10-31', end: '2025-11-07' },
          records: [
            { date: '2025-10-31', air_temperature: 16.04, wind_speed: 2.15 },
            { date: '2025-11-01', air_temperature: 15.1, wind_speed: 1.9 },
          ],
        },
      },
    ],
  };

  it('expands each nested day into its own observation tagged with the event', () => {
    const { observations, shape } = normalizeDataset(
      'atmosfera_previa_evento',
      dataset,
    );
    expect(shape).toBe('nested');
    expect(observations).toHaveLength(2);
    expect(observations[0]).toMatchObject({
      date: '2025-10-31',
      eventDate: '2025-11-07',
      lat: 41.4377,
      lon: 2.2442,
    });
    expect(observations[0].values).toEqual({
      air_temperature: 16.04,
      wind_speed: 2.15,
    });
  });
});

describe('normalizeDataset — resilience', () => {
  it('returns nothing rather than throwing on a shape it cannot read', () => {
    expect(normalizeDataset('recogidas_playa', {}).observations).toEqual([]);
    expect(
      normalizeDataset('environmental_boya', { format: 'columnar' })
        .observations,
    ).toEqual([]);
  });

  it('warns when the declared format disagrees with what was read', () => {
    const { warnings } = normalizeDataset('recogidas_playa', {
      format: 'columnar',
      records: [{ Date: '2025-01-01' }],
    });
    expect(warnings.some((w) => /declares "columnar"/.test(w))).toBe(true);
  });
});
