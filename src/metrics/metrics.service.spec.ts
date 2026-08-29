import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  let metrics: MetricsService;

  beforeEach(() => {
    metrics = new MetricsService();
  });

  it('exposes the scrape payload in Prometheus text format', async () => {
    const body = await metrics.metrics();
    expect(body).toContain('# HELP http_request_duration_seconds');
    expect(body).toContain('# TYPE ondas_sync_runs_total counter');
  });

  it('counts a sync run with its observations and warnings', async () => {
    metrics.recordSyncRun({
      kind: 'scan',
      status: 'partial',
      totals: { observations: 1460, warnings: 3 },
      warnings: ['listado no disponible'],
    });

    const body = await metrics.metrics();
    expect(body).toContain(
      'ondas_sync_runs_total{kind="scan",status="partial"} 1',
    );
    expect(body).toContain('ondas_sync_observations_total 1460');
    expect(body).toContain('ondas_sync_warnings_total 1');
  });

  it('leaves the volume counters at zero for a run that wrote nothing', async () => {
    metrics.recordSyncRun({
      kind: 'asset',
      status: 'ok',
      totals: { observations: 0 },
      warnings: [],
    });

    const body = await metrics.metrics();
    // Counters are published from zero on purpose, so `rate()` has a baseline
    // from the first scrape instead of appearing only once traffic arrives.
    expect(body).toContain('ondas_sync_observations_total 0');
    expect(body).toContain('ondas_sync_runs_total{kind="asset",status="ok"} 1');
  });

  it('counts one increment per analysis, not per request', async () => {
    metrics.recordAnalyses(['basic_contamination', 'eco_risk']);
    metrics.recordAnalyses(['eco_risk']);

    const body = await metrics.metrics();
    expect(body).toContain(
      'ondas_analyses_runs_total{analysis="basic_contamination"} 1',
    );
    expect(body).toContain('ondas_analyses_runs_total{analysis="eco_risk"} 2');
  });

  it('reads the active-asset gauge on scrape', async () => {
    let count = 22;
    metrics.bindActiveAssets(async () => count);

    expect(await metrics.metrics()).toContain('ondas_assets_active 22');
    count = 27;
    expect(await metrics.metrics()).toContain('ondas_assets_active 27');
  });

  it('still serves a scrape when the read model is unreachable', async () => {
    metrics.bindActiveAssets(async () => {
      throw new Error('Mongo down');
    });

    // The whole point: monitoring must not go dark exactly when the database does.
    await expect(metrics.metrics()).resolves.toContain('ondas_sync_runs_total');
  });

  it('keeps every label set bounded', async () => {
    // A label fed from a request path, a bucket key or an asset id would mint one
    // time series per distinct value and eventually take Prometheus down. Every
    // label this service declares must come from a closed set.
    const bounded = new Set(['method', 'route', 'status', 'kind', 'analysis']);

    const declared = [
      metrics.httpDuration,
      metrics.syncRuns,
      metrics.syncObservations,
      metrics.syncWarnings,
      metrics.analysesRuns,
      metrics.activeAssets,
    ].flatMap((m) => (m as unknown as { labelNames: string[] }).labelNames);

    expect(declared).toEqual([
      'method',
      'route',
      'status',
      'kind',
      'status',
      'analysis',
    ]);
    expect(declared.filter((l) => !bounded.has(l))).toEqual([]);
  });
});
