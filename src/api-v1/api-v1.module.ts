import { Module } from '@nestjs/common';

import { AnalysesController } from './analyses/analyses.controller';
import { AnalysesService } from './analyses/analyses.service';
import { ScenarioLoader } from './analyses/analyses-scenario';
import { ReportsController } from './reports/reports.controller';
import { ReportsService } from './reports/reports.service';
import { OverviewController } from './overview/overview.controller';
import { OverviewService } from './overview/overview.service';
import { OverviewSources } from './overview/overview-sources';
import { MapController } from './map/map.controller';
import { MapService } from './map/map.service';
import { MarketplaceController } from './marketplace/marketplace.controller';
import { MarketplaceService } from './marketplace/marketplace.service';
import { AuthModule } from './auth/auth.module';
import { IdentityModule } from './identity/identity.module';
import { DataspaceModule } from './dataspace/dataspace.module';

@Module({
  imports: [IdentityModule, AuthModule, DataspaceModule],
  controllers: [AnalysesController, ReportsController, OverviewController, MapController, MarketplaceController],
  providers: [
    AnalysesService,
    ScenarioLoader,
    ReportsService,
    OverviewService,
    OverviewSources,
    MapService,
    MarketplaceService,
  ],
})
export class ApiV1Module {}
