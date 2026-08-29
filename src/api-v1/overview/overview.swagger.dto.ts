import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class OverviewKpisDto {
  @ApiProperty({ example: 12540 }) kg!: number;
  @ApiProperty({ example: 154 }) cleanups!: number;
  @ApiProperty({ example: 327 }) volunteers!: number;
  @ApiProperty({ example: 24 }) locations!: number;
  @ApiProperty({ example: 562 }) km!: number;
  @ApiProperty({ example: 428 }) hours!: number;
  @ApiProperty({ example: 154 }) ondas!: number;
  @ApiProperty({ example: 1246 }) evidence!: number;
  @ApiProperty({ example: 100 }) verified!: number;
  @ApiProperty({ example: 81.4 }) avgKg!: number;
  @ApiProperty({ example: 78 }) index!: number;
}

class OverviewSeriesPointDto {
  @ApiProperty({ example: '2025' }) label!: string;
  @ApiProperty({ example: 1820 }) kg!: number;
}

class OverviewPlasticTypeDto {
  @ApiProperty({ example: 'PET' }) type!: string;
  @ApiProperty({ example: 32 }) pct!: number;
  @ApiProperty({ example: '#00003F' }) color!: string;
}

class OverviewTopLocationDto {
  @ApiProperty({ example: 'Barcelona' }) name!: string;
  @ApiProperty({ example: 342 }) kg!: number;
  @ApiProperty({ example: 12 }) cleanups!: number;
}

class OverviewPeriodDto {
  @ApiProperty({ example: '1970-01-01' }) start!: string;
  @ApiProperty({ example: '2999-12-31' }) end!: string;
  @ApiProperty({ example: 'All time' }) label!: string;
}

class BiomassSectionDto {
  @ApiProperty({ example: 41.2 }) meanTonnes!: number;
  @ApiProperty({ example: 'Tonnes' }) units!: string;
  @ApiProperty({ example: 3611 }) readings!: number;
  @ApiProperty({ type: [OverviewSeriesPointDto] }) series!: OverviewSeriesPointDto[];
}
class CountPairDto {
  @ApiProperty({ example: 'PE' }) type!: string;
  @ApiProperty({ example: 42 }) count!: number;
}
class SizePairDto {
  @ApiProperty({ example: 'Microplastics' }) size!: string;
  @ApiProperty({ example: 60 }) count!: number;
}
class MicroplasticsSectionDto {
  @ApiProperty({ example: 105 }) particles!: number;
  @ApiProperty({ type: [CountPairDto] }) byPolymer!: CountPairDto[];
  @ApiProperty({ type: [SizePairDto] }) bySize!: SizePairDto[];
}
class EnvironmentSectionDto {
  @ApiProperty({ example: 3865 }) readings!: number;
  @ApiProperty({ example: 18.4, nullable: true }) meanSeaSurfaceTemperatureC!: number | null;
  @ApiProperty({ example: 4.7, nullable: true }) meanWindSpeedMs!: number | null;
}

export class OverviewResponseDto {
  @ApiProperty({ type: OverviewPeriodDto }) period!: OverviewPeriodDto;
  @ApiProperty({ example: 'All campaigns' }) scope!: string;
  @ApiProperty({ example: ['recogidas_playa', 'boya_biomasa', 'boya_microplasticos', 'environmental_boya'] })
  sourcesIncluded!: string[];
  @ApiProperty({ type: OverviewKpisDto }) kpis!: OverviewKpisDto;
  @ApiProperty({ type: [OverviewSeriesPointDto] }) series!: OverviewSeriesPointDto[];
  @ApiProperty({ type: [OverviewPlasticTypeDto] }) plasticTypes!: OverviewPlasticTypeDto[];
  @ApiProperty({ type: [OverviewTopLocationDto] }) topLocations!: OverviewTopLocationDto[];
  @ApiPropertyOptional({ type: BiomassSectionDto }) biomass?: BiomassSectionDto;
  @ApiPropertyOptional({ type: MicroplasticsSectionDto }) microplastics?: MicroplasticsSectionDto;
  @ApiPropertyOptional({ type: EnvironmentSectionDto }) environment?: EnvironmentSectionDto;
}
