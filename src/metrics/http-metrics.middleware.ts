import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { MetricsService } from './metrics.service';

/**
 * Times every request, measured on `finish` so nothing is missed.
 *
 * This is middleware rather than a Nest interceptor on purpose. Guards run
 * *before* interceptors, so an interceptor never sees a request rejected by
 * authentication or authorization — and 401/403 rates are precisely what a
 * monitoring surface needs to show. Measuring on the response `finish` event
 * captures guard rejections, 404s and handler errors alike.
 *
 * The route label is the **matched route template** (`/v1/sync/runs/:id`), which
 * Express fills in by the time the response finishes. Labelling by `req.url`
 * would mint a new time series for every id and bucket key ever requested and
 * would eventually take Prometheus down; anything unmatched collapses into a
 * single `unmatched` series.
 */
@Injectable()
export class HttpMetricsMiddleware implements NestMiddleware {
  constructor(private readonly metrics: MetricsService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const done = this.metrics.httpDuration.startTimer();
    const method = req.method;

    res.on('finish', () => {
      const route =
        (req.route as { path?: string } | undefined)?.path ?? 'unmatched';
      done({ method, route, status: String(res.statusCode) });
    });

    next();
  }
}
