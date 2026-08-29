import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { S3_CATALOGUE } from '../analyses/s3-catalogue';

const DATA_BUCKET = 'universalplastic-sedia';
const DATA_BUCKET_REGION = 'eu-central-1';
const DATA_BUCKET_PUBLIC_BASE = `https://${DATA_BUCKET}.s3.${DATA_BUCKET_REGION}.amazonaws.com`;

export function resolveReportOcean(loc: { lat: number; lon: number }): string {
  const rad = Math.PI / 180;
  let best = S3_CATALOGUE[0];
  let bestDist = Infinity;
  for (const entry of S3_CATALOGUE) {
    const x = (entry.lon - loc.lon) * rad * Math.cos(((entry.lat + loc.lat) / 2) * rad);
    const y = (entry.lat - loc.lat) * rad;
    const dist = Math.sqrt(x * x + y * y);
    if (dist < bestDist) { bestDist = dist; best = entry; }
  }
  const match = best.url.match(/\/public\/([^/]+)\//);
  return match?.[1] ?? 'mediterraneo';
}

export function reportS3Key(ocean: string, reportId: string): string {
  return `public/${ocean}/universal_plastic/reports/${reportId}.pdf`;
}

export function reportPublicUrl(key: string): string {
  return `${DATA_BUCKET_PUBLIC_BASE}/${key}`;
}

export async function uploadReportToS3(opts: {
  reportId: string; ocean: string; pdfBytes: Uint8Array;
}): Promise<{ downloadUrl: string; s3Key: string }> {
  const key = reportS3Key(opts.ocean, opts.reportId);
  const client = new S3Client({ region: DATA_BUCKET_REGION });
  await client.send(new PutObjectCommand({
    Bucket: DATA_BUCKET, Key: key, Body: Buffer.from(opts.pdfBytes), ContentType: 'application/pdf',
  }));
  return { downloadUrl: reportPublicUrl(key), s3Key: key };
}
