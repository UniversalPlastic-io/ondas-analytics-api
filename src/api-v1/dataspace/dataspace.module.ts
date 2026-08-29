import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Asset, AssetSchema } from './schemas/asset.schema';
import { Observation, ObservationSchema } from './schemas/observation.schema';
import { SyncRun, SyncRunSchema } from './schemas/sync-run.schema';
import { IngestService } from './ingest.service';
import { SyncService } from './sync.service';
import { SyncController } from './sync.controller';
import { AssetsRepository } from './assets.repository';
import { ObservationsRepository } from './observations.repository';
import { IdentityModule } from '../identity/identity.module';

@Module({
  imports: [
    IdentityModule,
    MongooseModule.forFeature([
      { name: Asset.name, schema: AssetSchema },
      { name: Observation.name, schema: ObservationSchema },
      { name: SyncRun.name, schema: SyncRunSchema },
    ]),
  ],
  controllers: [SyncController],
  providers: [IngestService, SyncService, AssetsRepository, ObservationsRepository],
  exports: [IngestService, SyncService, AssetsRepository, ObservationsRepository, MongooseModule],
})
export class DataspaceModule {}
