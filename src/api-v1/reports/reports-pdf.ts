import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';
import { ReportData, ReportDetail, ReportInclude, ReportType } from './reports.types';
import { buildReportPages, ReportMeta } from './reports-svg';
import { CampaignScope } from './reports-campaign-map';

const A4_W = 595.28;
const A4_H = 841.89;
const RENDER_SCALE = 2; // 2× density for crisp text/lines

export async function buildReportPdf(opts: {
  data: ReportData;
  type: ReportType;
  detail: ReportDetail;
  include: Required<ReportInclude>;
  campaign: CampaignScope;
  meta: ReportMeta;
}): Promise<Uint8Array> {
  const pages = buildReportPages(opts);
  const pdf = await PDFDocument.create();

  for (const svg of pages) {
    const png = await sharp(Buffer.from(svg), { density: 96 * RENDER_SCALE }).png().toBuffer();
    const img = await pdf.embedPng(png);
    const page = pdf.addPage([A4_W, A4_H]);
    page.drawImage(img, { x: 0, y: 0, width: A4_W, height: A4_H });
  }

  return await pdf.save();
}
