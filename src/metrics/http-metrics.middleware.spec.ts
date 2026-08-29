import { EventEmitter } from 'node:events';
import type { NextFunction, Request, Response } from 'express';
import { HttpMetricsMiddleware } from './http-metrics.middleware';
import { MetricsService } from './metrics.service';

describe('HttpMetricsMiddleware', () => {
  let metrics: MetricsService;
  let middleware: HttpMetricsMiddleware;

  beforeEach(() => {
    metrics = new MetricsService();
    middleware = new HttpMetricsMiddleware(metrics);
  });

  /** Drives one request through the middleware and fires the response `finish`. */
  const request = (
    req: { method: string; route?: { path: string } },
    statusCode: number,
  ): void => {
    const res = Object.assign(new EventEmitter(), { statusCode });
    const next = jest.fn() as unknown as NextFunction;

    middleware.use(req as unknown as Request, res as unknown as Response, next);
    expect(next).toHaveBeenCalled();
    res.emit('finish');
  };

  const counters = async () =>
    (await metrics.metrics())
      .split('\n')
      .filter((l) => l.startsWith('http_request_duration_seconds_count'))
      .map((l) => l.replace(/ [\d.]+$/, ''));

  it('labels by the matched route template, not the requested path', async () => {
    request({ method: 'GET', route: { path: '/v1/sync/runs/:id' } }, 200);

    // The requested path carried a real id; one time series per id would be a
    // cardinality bomb, so the template is what gets recorded.
    expect(await counters()).toEqual([
      'http_request_duration_seconds_count{method="GET",route="/v1/sync/runs/:id",status="200"}',
    ]);
  });

  it('records requests rejected by a guard', async () => {
    // Guards run before interceptors, so these are invisible to an interceptor.
    // Measuring on `finish` is what makes 401/403 rates observable at all.
    request({ method: 'GET', route: { path: '/v1/sync/runs' } }, 401);

    expect(await counters()).toEqual([
      'http_request_duration_seconds_count{method="GET",route="/v1/sync/runs",status="401"}',
    ]);
  });

  it('collapses unmatched requests into a single series', async () => {
    request({ method: 'GET' }, 404);
    request({ method: 'POST' }, 404);

    expect(await counters()).toEqual([
      'http_request_duration_seconds_count{method="GET",route="unmatched",status="404"}',
      'http_request_duration_seconds_count{method="POST",route="unmatched",status="404"}',
    ]);
  });

  it('does not record anything until the response finishes', async () => {
    const res = Object.assign(new EventEmitter(), { statusCode: 200 });
    middleware.use(
      { method: 'GET', route: { path: '/v1/overview' } } as unknown as Request,
      res as unknown as Response,
      (() => undefined) as NextFunction,
    );

    expect(await counters()).toEqual([]);
    res.emit('finish');
    expect(await counters()).toHaveLength(1);
  });
});
