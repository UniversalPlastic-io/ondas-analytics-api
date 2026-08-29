import { Controller, Get, Header } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { MetricsService } from './metrics.service';

/**
 * Prometheus scrape endpoint.
 *
 * Excluded from the OpenAPI document on purpose: it is an operational surface,
 * not part of the published API contract. It is also unauthenticated, which is
 * the usual arrangement for a scrape endpoint — see docs/deployment/03-monitoring.md
 * for why it must not be reachable from the public internet.
 */
@ApiExcludeController()
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  scrape(): Promise<string> {
    return this.metrics.metrics();
  }
}
