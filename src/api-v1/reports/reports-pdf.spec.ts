import { buildReportPdf } from './reports-pdf';
import { DEFAULT_INCLUDE, ReportData, ReportType } from './reports.types';
import { resolveCampaignScope } from './reports-campaign-map';

const DATA: ReportData = {
  period: { start: '2025-11-01', end: '2025-11-30', label: 'November 2025' },
  scopeLabel: 'Océano Foods',
  kpis: { kg: 1240, co2eqTonnes: 12.4, cleanups: 14, volunteers: 162, km: 48, durationHours: 36, locations: 5, avgKg: 88.6, evidenceCount: 98, impactIndex: 81, impactRating: 'Excellent' },
  plasticTypes: [{ type: 'PET', pct: 32, color: '#00003F' }, { type: 'HDPE', pct: 18, color: '#39B3D8' }],
  series: [{ label: '2025-04', kg: 690 }, { label: '2025-05', kg: 1240 }],
  cleanups: [{ date: '2025-05-29', location: 'Blanes', city: 'Costa Brava', kg: 42.6, volunteers: 12, km: 1.2, duration: '0:30:00', evidence: 3, status: 'verified' }],
  sites: [{ name: 'Blanes', lat: 41.6, lon: 2.7, kg: 42.6, cleanups: 1 }],
};
const TYPES: ReportType[] = ['monthly', 'annual', 'campaign', 'location', 'evidence', 'custom'];
const meta = { reportId: 'rep1', generatedAt: '2025-06-01', detail: 'standard' as const, country: 'Spain' };

describe('buildReportPdf', () => {
  it.each(TYPES)('produces a valid PDF for type %s', async (type) => {
    const bytes = await buildReportPdf({
      data: DATA, type, detail: 'standard', include: DEFAULT_INCLUDE,
      campaign: resolveCampaignScope(type === 'campaign' ? 'c1' : 'all'), meta,
    });
    expect(bytes.length).toBeGreaterThan(1000);
    expect(Buffer.from(bytes.slice(0, 5)).toString('latin1')).toBe('%PDF-');
  });

  it('summary detail still produces a PDF', async () => {
    const bytes = await buildReportPdf({
      data: DATA, type: 'monthly', detail: 'summary', include: DEFAULT_INCLUDE,
      campaign: resolveCampaignScope('all'), meta,
    });
    expect(Buffer.from(bytes.slice(0, 5)).toString('latin1')).toBe('%PDF-');
  });
});
