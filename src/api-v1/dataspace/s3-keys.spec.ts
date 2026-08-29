import { STATIONS } from './dataspace.constants';
import { isExcludedKey, parseKey, resolveLocation } from './s3-keys';

describe('parseKey', () => {
  it('reads ocean, provider, place and dataset type out of a key', () => {
    const p = parseKey('public/mediterraneo/port_badalona/boya_biomasa_badalona.json');
    expect(p).toMatchObject({
      ocean: 'mediterraneo',
      providerFolder: 'port_badalona',
      fragment: 'boya_biomasa_badalona',
      place: 'badalona',
      datasetType: 'boya_biomasa_slx+',
      category: 'biomass',
    });
  });

  it('accepts both the singular and plural cleanup filenames', () => {
    expect(parseKey('public/atlantico/innoceana/recogidas_playa_tenerife.json')?.datasetType).toBe('recogidas_playa');
    expect(parseKey('public/mediterraneo/innoceana/recogidas_playas_barcelona.json')?.datasetType).toBe('recogidas_playa');
  });

  it('maps every live dataset filename to a type', () => {
    const cases: Array<[string, string]> = [
      ['public/mediterraneo/universal_plastic/environmental_badalona.json', 'environmental_boya'],
      ['public/mediterraneo/universal_plastic/atmosfera_badalona.json', 'atmosfera_previa_evento'],
      ['public/mediterraneo/universal_plastic/oceanografia_badalona.json', 'oceanografia_previa_evento'],
      ['public/mediterraneo/port_badalona/boya_microplasticos_badalona.json', 'boya_microplasticos_seabot'],
    ];
    for (const [key, type] of cases) expect(parseKey(key)?.datasetType).toBe(type);
  });

  it('rejects schema and API-output folders', () => {
    expect(parseKey('public/metadatos/atmosfera_cds_v1.jsonld')).toBeNull();
    expect(parseKey('public/mediterraneo/universal_plastic/analise-2026-01-01/result.json')).toBeNull();
    expect(isExcludedKey('public/metadatos/x.json')).toBe(true);
  });

  it('rejects keys outside the layout', () => {
    expect(parseKey('private/mediterraneo/innoceana/file.json')).toBeNull();
    expect(parseKey('public/pacifico/innoceana/file.json')).toBeNull();
    expect(parseKey('public/mediterraneo/file.json')).toBeNull();
  });
});

describe('resolveLocation', () => {
  const badalona = STATIONS.badalona;

  it('keeps plausible coordinates from the file', () => {
    const r = resolveLocation('boya_biomasa_badalona', { lat: 41.43425, lon: 2.24334 }, badalona);
    expect(r.lat).toBeCloseTo(41.43425, 5);
    expect(r.lon).toBeCloseTo(2.24334, 5);
    expect(r.warnings).toEqual([]);
  });

  it('applies the explicit Tenerife correction', () => {
    const r = resolveLocation('recogidas_playa_tenerife', { lat: 31.483, lon: -11.926 }, STATIONS.tenerife);
    expect(r.lat).toBeCloseTo(28.1876, 3);
    expect(r.lon).toBeCloseTo(-16.6596, 3);
    expect(r.warnings[0]).toMatch(/coords corrected/);
  });

  it('flips the sign of the Gijón biomass longitude', () => {
    const r = resolveLocation('boya_biomasa_gijon', { lat: 43.5683, lon: 5.6789 }, STATIONS.gijon);
    expect(r.lon).toBeCloseTo(-5.6789, 4);
    expect(r.warnings[0]).toMatch(/corrected/);
  });

  it('falls back to the station when the file says 0,0', () => {
    const r = resolveLocation('atmosfera_badalona', { lat: 0, lon: 0 }, badalona);
    expect(r.lat).toBeCloseTo(badalona.lat, 4);
    expect(r.warnings[0]).toMatch(/station reference/);
  });

  it('falls back to the station when the coordinates are implausibly far', () => {
    const r = resolveLocation('environmental_badalona', { lat: 10, lon: -50 }, badalona);
    expect(r.lat).toBeCloseTo(badalona.lat, 4);
    expect(r.warnings[0]).toMatch(/km from Badalona/);
  });

  it('reports when there is nothing usable at all', () => {
    const r = resolveLocation('unknown_file', null, null);
    expect(r).toMatchObject({ lat: 0, lon: 0 });
    expect(r.warnings[0]).toMatch(/no usable location/);
  });
});
