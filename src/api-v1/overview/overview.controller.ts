import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser, OptionalUserGuard } from '../identity/auth.guards';
import { RequestUser } from '../identity/jwt-payload';
import { organizationScope } from '../identity/scope';
import { OverviewService } from './overview.service';
import { OverviewPeriod, OverviewResponse } from './overview.types';
import { OverviewResponseDto } from './overview.swagger.dto';

const PERIODS: OverviewPeriod[] = ['month', 'year', 'all'];

@ApiTags('Overview')
@Controller('/v1')
@UseGuards(OptionalUserGuard)
export class OverviewController {
  constructor(private readonly overview: OverviewService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Resumen del dashboard: KPIs, serie kg, composición de plástico y top localizaciones' })
  @ApiQuery({ name: 'period', enum: PERIODS, required: false, description: "Por defecto 'all'" })
  @ApiQuery({ name: 'campaign', required: false, description: "'all' | id de campaña (c1..c4). Por defecto 'all'" })
  @ApiQuery({
    name: 'scope',
    required: false,
    enum: ['mine', 'all'],
    description:
      "Con token: 'mine' (por defecto) limita a los datasets de tu organización, 'all' usa todo el espacio de datos. Sin token siempre es 'all'.",
  })
  @ApiOkResponse({ type: OverviewResponseDto })
  get(
    @CurrentUser() user: RequestUser | null,
    @Query('period') period?: string,
    @Query('campaign') campaign?: string,
    @Query('scope') scope?: string,
  ): Promise<OverviewResponse> {
    const p: OverviewPeriod = PERIODS.includes(period as OverviewPeriod) ? (period as OverviewPeriod) : 'all';
    return this.overview.get(p, campaign ?? 'all', new Date(), organizationScope(user, scope));
  }
}
