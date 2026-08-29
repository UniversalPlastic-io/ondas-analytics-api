import { canonicalDatasetType, DatasetType } from './dataspace.constants';

/**
 * Phase 1 validation — the blocking one (docs/dataspace-assets copy.md § Validación).
 *
 * Only structural facts that make an asset unreadable reject it. Content-level
 * deviations (unknown columns, wrong units, inverted date ranges) are handled by
 * validate-dcat and surface as warnings, because several live files carry them
 * and must keep being served.
 */

export interface AssetEnvelope {
  metadata: Record<string, unknown>;
  dataset: Record<string, unknown>;
}

export interface ContainerResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  datasetType: DatasetType | null;
  envelope: AssetEnvelope | null;
}

const VALID_FORMATS = new Set(['rows', 'columnar', 'ndjson']);

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * @param json         parsed S3 object body
 * @param fallbackType dataset type inferred from the key, used when the file's
 *                     own `metadata.datasetType` is missing or unrecognised
 */
export function validateContainer(json: unknown, fallbackType: DatasetType | null): ContainerResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isRecord(json)) {
    return { ok: false, errors: ['body is not a JSON object'], warnings, datasetType: null, envelope: null };
  }
  const metadata = json['metadata'];
  const dataset = json['dataset'];
  if (!isRecord(metadata)) errors.push('missing "metadata" object');
  if (!isRecord(dataset)) errors.push('missing "dataset" object');
  if (errors.length) {
    return { ok: false, errors, warnings, datasetType: null, envelope: null };
  }

  const meta = metadata as Record<string, unknown>;
  const data = dataset as Record<string, unknown>;

  const declaredType = canonicalDatasetType(meta['datasetType']);
  const datasetType = declaredType ?? fallbackType;
  if (!datasetType) {
    errors.push(
      `unsupported datasetType ${JSON.stringify(meta['datasetType'] ?? null)} and none inferable from the key`,
    );
  } else if (!declaredType) {
    warnings.push(
      `metadata.datasetType ${JSON.stringify(meta['datasetType'] ?? null)} unrecognised → inferred "${datasetType}" from the key`,
    );
  } else if (fallbackType && declaredType !== fallbackType) {
    warnings.push(`metadata.datasetType "${declaredType}" disagrees with the key, which suggests "${fallbackType}"`);
  }

  const format = typeof data['format'] === 'string' ? (data['format'] as string).trim() : '';
  if (format && !VALID_FORMATS.has(format)) {
    errors.push(`dataset.format "${format}" is not one of rows | columnar | ndjson`);
  }
  if (format === 'ndjson') {
    errors.push('dataset.format "ndjson" is not supported yet (no live files use it)');
  }

  const hasRecords = Array.isArray(data['records']);
  const hasColumns = isRecord(data['columns']);
  if (!hasRecords && !hasColumns) {
    errors.push('dataset has neither a "records" array nor a "columns" object');
  }
  if (hasRecords && (data['records'] as unknown[]).length === 0) {
    warnings.push('dataset.records is empty');
  }

  const schemaVersion = typeof meta['schemaVersion'] === 'string' ? meta['schemaVersion'] : null;
  if (!schemaVersion) warnings.push('metadata.schemaVersion missing');
  else if (schemaVersion !== 'v1') warnings.push(`metadata.schemaVersion "${schemaVersion}" is not "v1"`);

  if (errors.length) {
    return { ok: false, errors, warnings, datasetType, envelope: null };
  }
  return {
    ok: true,
    errors,
    warnings,
    datasetType,
    envelope: { metadata: meta, dataset: data },
  };
}
