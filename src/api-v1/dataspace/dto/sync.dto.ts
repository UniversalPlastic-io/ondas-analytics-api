import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SyncAssetDto {
  @ApiPropertyOptional({
    example: 'public/mediterraneo/port_badalona/boya_biomasa_badalona.json',
    description: 'S3 object key of the asset that was uploaded or updated',
  })
  key?: string;

  @ApiPropertyOptional({
    example: 'https://universalplastic-sedia.s3.eu-central-1.amazonaws.com/public/…/file.json',
    description: 'Full object URL — an alternative to `key`',
  })
  url?: string;

  @ApiPropertyOptional({
    default: false,
    description: 'Re-ingest even when the object checksum is unchanged',
  })
  force?: boolean;
}

export class SyncScanDto {
  @ApiPropertyOptional({
    example: 'public/mediterraneo/',
    description: 'Prefix to reconcile. Defaults to your organization space, or the whole root for admins.',
  })
  prefix?: string;

  @ApiPropertyOptional({ default: false, description: 'Report the plan without writing anything' })
  dryRun?: boolean;

  @ApiPropertyOptional({ default: false, description: 'Re-ingest every object, changed or not' })
  force?: boolean;
}

export class SyncResultRowDto {
  @ApiProperty() key!: string;
  @ApiProperty({ enum: ['created', 'updated', 'unchanged', 'missing', 'failed', 'skipped'] }) action!: string;
  @ApiPropertyOptional() assetId?: string;
  @ApiPropertyOptional() observations?: number;
  @ApiPropertyOptional({ type: [String] }) warnings?: string[];
  @ApiPropertyOptional() error?: string;
}

export class SyncRunResponseDto {
  @ApiProperty() runId!: string;
  @ApiProperty({ enum: ['asset', 'scan'] }) kind!: string;
  @ApiProperty({ enum: ['running', 'ok', 'partial', 'failed'] }) status!: string;
  @ApiProperty() startedAt!: Date;
  @ApiProperty({ nullable: true }) finishedAt!: Date | null;
  @ApiProperty({ type: Object, description: 'assets/created/updated/unchanged/missing/failed/observations/warnings' })
  totals!: Record<string, number>;
  @ApiProperty({ type: [SyncResultRowDto] }) results!: SyncResultRowDto[];
  @ApiProperty({ type: [String] }) warnings!: string[];
}
