import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { MapService } from './map.service';
import { MapResponse } from './map.types';
import { MapResponseDto } from './map.swagger.dto';
import { CurrentUser, OptionalUserGuard } from '../identity/auth.guards';
import { RequestUser } from '../identity/jwt-payload';
import { organizationScope } from '../identity/scope';

@ApiTags('Map')
@Controller('/v1')
@UseGuards(OptionalUserGuard)
export class MapController {
  constructor(private readonly map: MapService) {}

  @Get('map/points')
  @ApiOperation({ summary: 'Marcadores de datasets para el mapa (uno por dataset), con su info/summary' })
  @ApiQuery({ name: 'ocean', required: false, enum: ['mediterraneo', 'atlantico', 'catambrico'] })
  @ApiQuery({ name: 'datasetType', required: false, description: 'p. ej. recogidas_playa, boya_biomasa_slx+' })
  @ApiQuery({ name: 'provider', required: false })
  @ApiQuery({ name: 'format', required: false, enum: ['json', 'geojson'], description: "geojson → FeatureCollection [lng,lat]" })
  @ApiQuery({ name: 'scope', required: false, enum: ['mine', 'all'], description: "Con token: 'mine' (por defecto) limita a tu organización" })
  @ApiOkResponse({ type: MapResponseDto })
  async points(
    @CurrentUser() user: RequestUser | null,
    @Query('ocean') ocean?: string,
    @Query('datasetType') datasetType?: string,
    @Query('provider') provider?: string,
    @Query('format') format?: string,
    @Query('scope') scope?: string,
  ): Promise<MapResponse | unknown> {
    const res = await this.map.getPoints({
      ocean,
      datasetType,
      provider,
      organizationId: organizationScope(user, scope),
    });
    if (format === 'geojson') {
      return {
        type: 'FeatureCollection',
        bbox: res.bounds ? [res.bounds[0][1], res.bounds[0][0], res.bounds[1][1], res.bounds[1][0]] : undefined,
        features: res.points.map((p) => {
          const { lat, lng, ...rest } = p;
          return { type: 'Feature', geometry: { type: 'Point', coordinates: [lng, lat] }, properties: rest };
        }),
      };
    }
    return res;
  }
}
