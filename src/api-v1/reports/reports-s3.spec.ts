import { resolveReportOcean, reportS3Key, reportPublicUrl } from './reports-s3';

describe('resolveReportOcean', () => {
  it('Badalona → mediterraneo', () => expect(resolveReportOcean({ lat: 41.43, lon: 2.24 })).toBe('mediterraneo'));
  it('Cádiz → atlantico', () => expect(resolveReportOcean({ lat: 36.53, lon: -6.29 })).toBe('atlantico'));
  it('Gijón → catambrico', () => expect(resolveReportOcean({ lat: 43.57, lon: -5.72 })).toBe('catambrico'));
});

describe('reportS3Key / reportPublicUrl', () => {
  it('builds the reports key', () => {
    expect(reportS3Key('mediterraneo', 'rep_abc')).toBe('public/mediterraneo/universal_plastic/reports/rep_abc.pdf');
  });
  it('builds the public url', () => {
    expect(reportPublicUrl('public/mediterraneo/universal_plastic/reports/rep_abc.pdf'))
      .toBe('https://universalplastic-sedia.s3.eu-central-1.amazonaws.com/public/mediterraneo/universal_plastic/reports/rep_abc.pdf');
  });
});
