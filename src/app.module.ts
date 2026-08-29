import { Module } from '@nestjs/common';
import { ApiV1Module } from './api-v1/api-v1.module';
import { MongoModule } from './mongo/mongo.module';

@Module({
  imports: [MongoModule, ApiV1Module],
})
export class AppModule {}
