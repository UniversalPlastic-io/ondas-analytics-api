import * as fs from 'node:fs';
import { buildReportPdf } from '../src/api-v1/reports/reports-pdf';
import { resolveCampaignScope } from '../src/api-v1/reports/reports-campaign-map';
import { DEFAULT_INCLUDE, ReportData } from '../src/api-v1/reports/reports.types';

const data: ReportData = {
  period: { start: '2025-05-01', end: '2025-05-31', label: 'May 2025' },
  scopeLabel: 'Océano Foods',
  kpis: {
    kg: 1240, co2eqTonnes: 12.4, cleanups: 14, volunteers: 162, km: 48,
    durationHours: 36, locations: 9, avgKg: 88.6, evidenceCount: 98,
    impactIndex: 81, impactRating: 'Excellent',
  },
  plasticTypes: [
    { type: 'PET', pct: 32, color: '#00003F' },
    { type: 'HDPE', pct: 18, color: '#39B3D8' },
    { type: 'LDPE', pct: 16, color: '#BDEAF7' },
    { type: 'PP', pct: 14, color: '#4055F6' },
    { type: 'Others', pct: 8, color: '#B8BBC9' },
    { type: 'PS', pct: 7, color: '#2F8AA9' },
    { type: 'PVC', pct: 5, color: '#62C8E8' },
  ],
  series: [
    { label: 'Jan', kg: 420 }, { label: 'Feb', kg: 560 }, { label: 'Mar', kg: 780 },
    { label: 'Apr', kg: 690 }, { label: 'May', kg: 1240 },
  ],
  cleanups: [
    { date: '2025-05-29', location: 'Cala Sant Francesc', city: 'Blanes, Costa Brava', kg: 42.6, volunteers: 12, km: 1.2, duration: '1:10:00', evidence: 4, status: 'verified' },
    { date: '2025-05-26', location: 'Playa de la Barceloneta', city: 'Barcelona', kg: 78.2, volunteers: 24, km: 2.4, duration: '1:40:00', evidence: 9, status: 'verified' },
    { date: '2025-05-23', location: 'Cala Montjoi', city: 'Roses, Alt Empordà', kg: 31.4, volunteers: 8, km: 0.9, duration: '0:50:00', evidence: 3, status: 'verified' },
    { date: '2025-05-20', location: 'Puerto de Badalona', city: 'Badalona', kg: 56.1, volunteers: 18, km: 1.6, duration: '1:20:00', evidence: 6, status: 'verified' },
    { date: '2025-05-17', location: 'Platja del Prat', city: 'El Prat de Llobregat', kg: 88.4, volunteers: 30, km: 2.8, duration: '2:00:00', evidence: 11, status: 'verified' },
    { date: '2025-05-14', location: 'Cala Giverola', city: 'Tossa de Mar', kg: 19.8, volunteers: 6, km: 0.7, duration: '0:40:00', evidence: 2, status: 'pending' },
    { date: '2025-05-10', location: 'Playa de Ocata', city: 'El Masnou', kg: 64.3, volunteers: 20, km: 1.9, duration: '1:30:00', evidence: 7, status: 'verified' },
    { date: '2025-05-07', location: 'Cala Pola', city: 'Tossa de Mar', kg: 28.7, volunteers: 9, km: 0.8, duration: '0:45:00', evidence: 3, status: 'verified' },
    { date: '2025-05-03', location: 'Platja de Castelldefels', city: 'Castelldefels', kg: 95.6, volunteers: 35, km: 3.1, duration: '2:10:00', evidence: 12, status: 'verified' },
  ],
  sites: [],
};

async function main() {
  const bytes = await buildReportPdf({
    data,
    type: 'monthly',
    detail: 'standard',
    include: DEFAULT_INCLUDE,
    campaign: resolveCampaignScope('all'),
    meta: { reportId: 'rep_may2025_001', generatedAt: '2026-06-18', detail: 'standard', country: 'Spain' },
  });
  fs.writeFileSync('docs/sample-report-output.pdf', Buffer.from(bytes));
  console.log(`wrote docs/sample-report-output.pdf (${bytes.length} bytes)`);
}
main().catch((e) => { console.error(e); process.exit(1); });
