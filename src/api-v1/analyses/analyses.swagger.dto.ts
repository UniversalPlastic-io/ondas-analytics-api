import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LocationDto {
  @ApiProperty({ example: 41.3874, description: 'Latitud en WGS84.' })
  lat!: number;

  @ApiProperty({ example: 2.1686, description: 'Longitud en WGS84.' })
  lon!: number;
}

export class AreaDto {
  @ApiProperty({ example: 'radius_km', enum: ['radius_km'] })
  type!: 'radius_km';

  @ApiProperty({ example: 25, description: 'Radio en kilómetros.' })
  value!: number;
}

export class DateRangeDto {
  @ApiProperty({ example: '2025-01-01', description: 'Fecha de inicio (incluida) en formato YYYY-MM-DD.' })
  start!: string;

  @ApiProperty({ example: '2025-01-30', description: 'Fecha de fin (incluida) en formato YYYY-MM-DD.' })
  end!: string;
}

export class AggregationDto {
  @ApiPropertyOptional({ enum: ['raw', 'monthly'], example: 'raw' })
  mode?: 'raw' | 'monthly';
}

export class CacheOptionsDto {
  @ApiPropertyOptional({ enum: ['reuse', 'recompute', 'bypass'], example: 'reuse' })
  mode?: 'reuse' | 'recompute' | 'bypass';

  @ApiPropertyOptional({ example: 86400, description: 'TTL de caché en segundos.' })
  ttlSeconds?: number;
}

export class OptionsDto {
  @ApiPropertyOptional({ example: true })
  dataFormattedForPlots?: boolean;

  @ApiPropertyOptional({ example: false })
  savePlotsWebp?: boolean;

  @ApiPropertyOptional({ example: false })
  includeWarnings?: boolean;

  @ApiPropertyOptional({ type: CacheOptionsDto })
  cache?: CacheOptionsDto;
}

export class AnalysesRunRequestDto {
  @ApiProperty({
    type: LocationDto,
    description: 'Coordenadas objetivo para generar las analíticas (flujo de una sola ubicación).',
  })
  location!: LocationDto;

  @ApiProperty({
    type: AreaDto,
    description:
      'Área de interés alrededor de la ubicación. Actualmente solo se soportan áreas basadas en radio.',
  })
  area!: AreaDto;

  @ApiProperty({
    type: [String],
    example: ['basic_contamination', 'eco_risk'],
    description:
      'Lista de ids de análisis a ejecutar. Soportados: basic_contamination, trophic_transfer, eco_risk, plastic_origin. Usa "all" para ejecutar todos.',
  })
  analyses!: string[];

  @ApiPropertyOptional({
    type: DateRangeDto,
    description:
      'Rango de fechas opcional (YYYY-MM-DD). Si se omite, el API aplica un rango por defecto. Para demos suele usarse un año completo.',
  })
  dateRange?: DateRangeDto;

  @ApiPropertyOptional({
    type: AggregationDto,
    description: 'Configuración opcional de agregación.',
  })
  aggregation?: AggregationDto;

  @ApiPropertyOptional({
    type: OptionsDto,
    description:
      'Flags opcionales para devolver datos con forma de “plots” y/o exportar ficheros (WebP + PDF).',
  })
  options?: OptionsDto;
}

export class AnalysesRunResponseDto {
  @ApiProperty({ example: 'req_f59160fa' })
  requestId!: string;

  @ApiProperty({
    type: 'object',
    properties: {
      location: { $ref: '#/components/schemas/LocationDto' },
      area: { $ref: '#/components/schemas/AreaDto' },
    },
  })
  input!: { location: LocationDto; area: AreaDto };

  @ApiProperty({ type: [String], example: ['basic_contamination', 'eco_risk'] })
  executedAnalyses!: string[];

  @ApiProperty({
    type: 'object',
    properties: {
      aggregation: {
        type: 'object',
        properties: { mode: { type: 'string', enum: ['raw', 'monthly'] } },
        required: ['mode'],
      },
      dateRangeApplied: {
        type: 'object',
        properties: { start: { type: 'string' }, end: { type: 'string' } },
        required: ['start', 'end'],
      },
      datasetsUsed: {
        type: 'object',
        additionalProperties: { type: 'number' },
      },
      cache: {
        type: 'object',
        additionalProperties: true,
      },
    },
  })
  meta!: Record<string, unknown>;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    description: 'Resultados específicos por análisis. La forma depende de los análisis solicitados.',
  })
  results!: Record<string, unknown>;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    description: 'Presente cuando options.dataFormattedForPlots o options.savePlotsWebp es true.',
  })
  dataFormattedForPlots?: Record<string, unknown>;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: { type: 'string' },
    description: 'Presente cuando options.savePlotsWebp es true.',
  })
  plotWebpPaths?: Record<string, string>;

  @ApiPropertyOptional({
    description:
      'Ruta absoluta del PDF en el servidor, o su URL en S3 cuando la subida está configurada.',
    example: '/abs/path/to/output/plots/req_x/report.pdf',
  })
  plotPdfPath?: string;

  @ApiPropertyOptional({
    description:
      'URL del PDF en S3 (prefirmada, o pública si S3_PUBLIC_BASE_URL está definida). ' +
      'El API no expone una ruta de descarga propia: si la subida a S3 no está configurada, ' +
      'este campo repite la ruta local de `plotPdfPath`.',
    example:
      'https://universalplastic-sedia.s3.eu-central-1.amazonaws.com/plots/req_f59160fa/report.pdf',
  })
  plotPdfUrl?: string;

  @ApiPropertyOptional({
    type: 'object',
    properties: {
      pdfUrl: { type: 'string' },
      jsonUrl: { type: 'string' },
      s3Prefix: { type: 'string' },
    },
    description:
      'Copia del PDF y del JSON completo archivada en el bucket del espacio de datos, bajo ' +
      '`public/{océano}/universal_plastic/analise-{fecha}/`. Presente cuando ' +
      'options.savePlotsWebp es true y la subida ha tenido éxito.',
  })
  analysisArchive?: { pdfUrl: string; jsonUrl: string; s3Prefix: string };

  @ApiPropertyOptional({
    type: [String],
    description: 'Avisos de la ejecución. Presente sólo cuando hay alguno.',
    example: ['El rango solicitado excede el de los datos disponibles; se ha recortado.'],
  })
  warnings?: string[];
}

