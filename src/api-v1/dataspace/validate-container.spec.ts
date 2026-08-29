import { validateContainer } from './validate-container';

const VALID = {
  metadata: { schemaVersion: 'v1', datasetType: 'recogidas_playa', dataProviderId: 'innoceana' },
  dataset: { format: 'rows', records: [{ Date: '2025-11-07' }] },
};

describe('validateContainer', () => {
  it('accepts a well-formed envelope', () => {
    const r = validateContainer(VALID, 'recogidas_playa');
    expect(r.ok).toBe(true);
    expect(r.datasetType).toBe('recogidas_playa');
    expect(r.envelope).not.toBeNull();
  });

  it('rejects a body that is not an object', () => {
    expect(validateContainer('nope', null).ok).toBe(false);
    expect(validateContainer(null, null).errors[0]).toMatch(/not a JSON object/);
  });

  it('rejects a missing metadata or dataset block', () => {
    expect(validateContainer({ dataset: VALID.dataset }, null).errors).toContain('missing "metadata" object');
    expect(validateContainer({ metadata: VALID.metadata }, null).errors).toContain('missing "dataset" object');
  });

  it('rejects a dataset with neither records nor columns', () => {
    const r = validateContainer({ metadata: VALID.metadata, dataset: { format: 'rows' } }, 'recogidas_playa');
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatch(/neither a "records" array nor a "columns" object/);
  });

  it('rejects an unknown dataset format', () => {
    const r = validateContainer(
      { metadata: VALID.metadata, dataset: { format: 'parquet', records: [] } },
      'recogidas_playa',
    );
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatch(/not one of rows \| columnar \| ndjson/);
  });

  it('rejects when the type is unknown and the key cannot supply one', () => {
    const r = validateContainer({ metadata: { datasetType: 'mystery' }, dataset: { records: [] } }, null);
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatch(/unsupported datasetType/);
  });

  it('infers the type from the key when the file declares a bad one, and warns', () => {
    const r = validateContainer({ metadata: { datasetType: 'mystery' }, dataset: { records: [{}] } }, 'recogidas_playa');
    expect(r.ok).toBe(true);
    expect(r.datasetType).toBe('recogidas_playa');
    expect(r.warnings.some((w) => /inferred/.test(w))).toBe(true);
  });

  it('accepts the participant-spec dataset type aliases', () => {
    const r = validateContainer(
      { metadata: { datasetType: 'recogidas_plastico_app_up_v700' }, dataset: { records: [{}] } },
      null,
    );
    expect(r.ok).toBe(true);
    expect(r.datasetType).toBe('recogidas_playa');
  });

  it('warns rather than rejects on a non-v1 schemaVersion', () => {
    const r = validateContainer(
      { metadata: { ...VALID.metadata, schemaVersion: 'v2' }, dataset: VALID.dataset },
      'recogidas_playa',
    );
    expect(r.ok).toBe(true);
    expect(r.warnings.some((w) => /schemaVersion "v2"/.test(w))).toBe(true);
  });

  it('rejects ndjson until it is supported', () => {
    const r = validateContainer(
      { metadata: VALID.metadata, dataset: { format: 'ndjson', records: [] } },
      'recogidas_playa',
    );
    expect(r.ok).toBe(false);
  });
});
