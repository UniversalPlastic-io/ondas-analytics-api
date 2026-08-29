import { ReportRequest, ResolvedPeriod } from './reports.types';

export type ValidationError = 'campaign_required' | 'date_range_required' | 'invalid_date_range';

export function validateReportRequest(req: ReportRequest, period: ResolvedPeriod): ValidationError | null {
  if (req.type === 'campaign') {
    const c = req.scope?.campaign;
    if (!c || c === 'all') return 'campaign_required';
  }
  if (req.type === 'custom') {
    if (!req.period?.start || !req.period?.end) return 'date_range_required';
  }
  if (period.start > period.end) return 'invalid_date_range';
  return null;
}
