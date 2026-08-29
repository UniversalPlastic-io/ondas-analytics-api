import { Global, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { HttpMetricsMiddleware } from './http-metrics.middleware';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';

/**
 * Global so any service can record a domain metric by injecting MetricsService,
 * without every module having to import this one.
 */
@Global()
@Module({
  controllers: [MetricsController],
  providers: [MetricsService, HttpMetricsMiddleware],
  exports: [MetricsService],
})
export class MetricsModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(HttpMetricsMiddleware).forRoutes('*');
  }
}
