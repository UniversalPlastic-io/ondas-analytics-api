import { BadGatewayException, Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { MarketplaceService } from './marketplace.service';

@ApiTags('Marketplace')
@Controller('/v1')
export class MarketplaceController {
  constructor(private readonly marketplace: MarketplaceService) {}

  @Get('campaigns')
  @ApiOperation({ summary: 'Campañas (passthrough de marketplace/home → campaigns[])' })
  @ApiQuery({ name: 'username', required: false, description: 'Filtra por user.username; omitir = todas' })
  campaigns(@Query('username') username?: string): Promise<unknown[]> {
    return this.guard(() => this.marketplace.getCampaigns(username));
  }

  @Get('cleanups')
  @ApiOperation({ summary: 'Recogidas (passthrough de marketplace/home → wasteCollections[])' })
  @ApiQuery({ name: 'username', required: false, description: 'Filtra por user.username; omitir = todas' })
  cleanups(@Query('username') username?: string): Promise<unknown[]> {
    return this.guard(() => this.marketplace.getCleanups(username));
  }

  @Get('organizations')
  @ApiOperation({ summary: 'Organizaciones (passthrough de marketplace/home → organizations[])' })
  organizations(): Promise<unknown[]> {
    return this.guard(() => this.marketplace.getOrganizations());
  }

  private async guard(fn: () => Promise<unknown[]>): Promise<unknown[]> {
    try {
      return await fn();
    } catch {
      throw new BadGatewayException({ error: 'upstream_unavailable', message: 'Marketplace feed is currently unavailable.' });
    }
  }
}
