import { buildReportPages } from './reports-svg';
import { DEFAULT_INCLUDE, ReportData, ReportType } from './reports.types';
import { resolveCampaignScope } from './reports-campaign-map';

const DATA: ReportData = {
  period: { start: '2025-11-01', end: '2025-11-30', label: 'November 2025' },
  scopeLabel: 'Océano Foods',
  kpis: { kg: 1240, co2eqTonnes: 12.4, cleanups: 14, volunteers: 162, km: 48, durationHours: 36, locations: 5, avgKg: 88.6, evidenceCount: 98, impactIndex: 81, impactRating: 'Excellent' },
  plasticTypes: [
    { type: 'PET', pct: 32, color: '#00003F' }, { type: 'HDPE', pct: 18, color: '#39B3D8' },
    { type: 'LDPE', pct: 16, color: '#BDEAF7' }, { type: 'PP', pct: 14, color: '#4055F6' },
    { type: 'Others', pct: 8, color: '#B8BBC9' }, { type: 'PS', pct: 7, color: '#2F8AA9' },
    { type: 'PVC', pct: 5, color: '#62C8E8' },
  ],
  series: [ { label: '2025-01', kg: 420 }, { label: '2025-02', kg: 560 }, { label: '2025-03', kg: 780 }, { label: '2025-04', kg: 690 }, { label: '2025-05', kg: 1240 } ],
  cleanups: [
    { date: '2025-05-29', location: 'Blanes', city: 'Costa Brava', kg: 42.6, volunteers: 12, km: 1.2, duration: '0:30:00', evidence: 3, status: 'verified' },
    { date: '2025-05-26', location: 'Barcelona', city: 'Barcelona', kg: 78.2, volunteers: 24, km: 2.0, duration: '1:00:00', evidence: 5, status: 'verified' },
  ],
  sites: [ { name: 'Barcelona', lat: 41.6, lon: 2.7, kg: 78.2, cleanups: 1 }, { name: 'Blanes', lat: 41.6, lon: 2.7, kg: 42.6, cleanups: 1 } ],
};

const TYPES: ReportType[] = ['monthly', 'annual', 'campaign', 'location', 'evidence', 'custom'];
const meta = { reportId: 'rep1', generatedAt: '2025-06-01', detail: 'standard' as const, country: 'Spain' };

describe('buildReportPages', () => {
  it.each(TYPES)('returns valid SVG pages for type %s', (type) => {
    const pages = buildReportPages({
      data: DATA, type, detail: 'standard', include: DEFAULT_INCLUDE,
      campaign: resolveCampaignScope(type === 'campaign' ? 'c1' : 'all'), meta,
    });
    expect(pages.length).toBeGreaterThanOrEqual(2);
    for (const svg of pages) {
      expect(svg.trimStart()).toMatch(/^<svg/);
      expect(svg.trimEnd()).toMatch(/<\/svg>$/);
      expect(svg).toContain('viewBox="0 0 794 1123"');
    }
  });

  it('cover page shows the report title, period and scope', () => {
    const [cover] = buildReportPages({
      data: DATA, type: 'monthly', detail: 'standard', include: DEFAULT_INCLUDE,
      campaign: resolveCampaignScope('all'), meta,
    });
    expect(cover).toContain('Monthly Cleanup Report');
    expect(cover).toContain('November 2025');
    expect(cover).toContain('Océano Foods');
  });

  it('content page renders KPI values and plastic types', () => {
    const pages = buildReportPages({
      data: DATA, type: 'monthly', detail: 'standard', include: DEFAULT_INCLUDE,
      campaign: resolveCampaignScope('all'), meta,
    });
    const all = pages.join('\n');
    expect(all).toContain('1,240');
    expect(all).toContain('12.4');
    expect(all).toContain('PET');
    expect(all).toContain('81');
  });

  it('drops the location section when include.map is false', () => {
    const pages = buildReportPages({
      data: DATA, type: 'monthly', detail: 'standard',
      include: { ...DEFAULT_INCLUDE, map: false }, campaign: resolveCampaignScope('all'), meta,
    });
    expect(pages.join('\n')).not.toContain('LOCATION OVERVIEW');
  });
});
