/**
 * Writes the reference datasets to disk and, with --upload, publishes them to
 * the data space bucket.
 *
 *   npx ts-node -r tsconfig-paths/register scripts/generate-reference-datasets.ts
 *   npx ts-node ... scripts/generate-reference-datasets.ts --upload
 *   npx ts-node ... scripts/generate-reference-datasets.ts --start 2024-01-01 --end 2026-12-31
 *
 * Generation is deterministic, so running it twice produces identical files.
 * Once uploaded, ingest them the way any other asset is ingested:
 *
 *   POST /v1/sync/scan       (an admin/provider token; picks up the new keys)
 *   POST /v1/sync/assets     ({ "key": "public/.../boya_biomasa_referencia.json" })
 *
 * --upload needs credentials with s3:PutObject on the bucket. It publishes into
 * the shared data space, so it is deliberately not the default.
 */

import 'dotenv/config';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import {
  buildReferenceDatasets,
  REFERENCE_RANGE,
  ReferenceRange,
} from '../src/api-v1/dataspace/reference-datasets';
import { DATA_BUCKET, DATA_BUCKET_REGION } from '../src/api-v1/dataspace/dataspace.constants';

function flag(name: string): string | null {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return null;
  const value = process.argv[i + 1];
  return value && !value.startsWith('--') ? value : '';
}

function parseRange(): ReferenceRange {
  const start = flag('start') || REFERENCE_RANGE.start;
  const end = flag('end') || REFERENCE_RANGE.end;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
    throw new Error(`--start/--end must be YYYY-MM-DD (got ${start} / ${end})`);
  }
  if (start > end) throw new Error(`--start ${start} is after --end ${end}`);
  return { start, end };
}

async function main(): Promise<void> {
  const range = parseRange();
  const outDir = flag('out') || join(process.cwd(), 'output', 'reference');
  const upload = process.argv.includes('--upload');

  const files = buildReferenceDatasets(range);
  console.log(`Reference datasets for ${range.start} → ${range.end}\n`);

  for (const file of files) {
    const body = `${JSON.stringify(file.body, null, 2)}\n`;
    const path = join(outDir, file.key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, body, 'utf8');
    const records = (file.body.metadata as { recordCount: number }).recordCount;
    console.log(`  ${file.key}  ${records} records, ${(body.length / 1024).toFixed(0)} KB`);
    console.log(`    → ${path}`);
  }

  if (!upload) {
    console.log('\nNot uploaded. Re-run with --upload to publish to the bucket.');
    return;
  }

  const client = new S3Client({ region: DATA_BUCKET_REGION });
  console.log(`\nUploading to s3://${DATA_BUCKET}/ …`);
  for (const file of files) {
    await client.send(
      new PutObjectCommand({
        Bucket: DATA_BUCKET,
        Key: file.key,
        Body: `${JSON.stringify(file.body, null, 2)}\n`,
        ContentType: 'application/json',
      }),
    );
    console.log(`  uploaded ${file.key}`);
  }
  console.log('\nNow ingest them: POST /v1/sync/scan, or POST /v1/sync/assets per key.');
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
