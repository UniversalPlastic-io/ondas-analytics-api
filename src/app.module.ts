import { Module } from '@nestjs/common';
import { ApiV1Module } from './api-v1/api-v1.module';
import { MetricsModule } from './metrics/metrics.module';
import { MongoModule } from './mongo/mongo.module';

@Module({
  imports: [MetricsModule, MongoModule, ApiV1Module],
})
export class AppModule {}
