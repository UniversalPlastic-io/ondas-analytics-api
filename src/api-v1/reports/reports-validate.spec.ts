import { validateReportRequest } from './reports-validate';

const P = { start: '2025-01-01', end: '2025-01-31', label: 'x' };

describe('validateReportRequest', () => {
  it('campaign type without id → campaign_required', () => {
    expect(validateReportRequest({ type: 'campaign', scope: { campaign: 'all' } }, P)).toBe('campaign_required');
    expect(validateReportRequest({ type: 'campaign' }, P)).toBe('campaign_required');
  });
  it('campaign type with id → ok', () => {
    expect(validateReportRequest({ type: 'campaign', scope: { campaign: 'c2' } }, P)).toBeNull();
  });
  it('custom without start/end → date_range_required', () => {
    expect(validateReportRequest({ type: 'custom', period: { start: '2025-01-01' } }, P)).toBe('date_range_required');
    expect(validateReportRequest({ type: 'custom' }, P)).toBe('date_range_required');
  });
  it('start after end → invalid_date_range', () => {
    expect(validateReportRequest({ type: 'monthly' }, { start: '2025-02-01', end: '2025-01-01', label: 'x' })).toBe('invalid_date_range');
  });
  it('valid monthly → null', () => {
    expect(validateReportRequest({ type: 'monthly' }, P)).toBeNull();
  });
});
