import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class ReportPeriodDto {
  @ApiPropertyOptional({ enum: ['month', 'year', '2024', 'all'] }) preset?: string;
  @ApiPropertyOptional({ example: '2025-03-01' }) start?: string;
  @ApiPropertyOptional({ example: '2025-05-31' }) end?: string;
}
class ReportScopeDto {
  @ApiPropertyOptional({ example: 'all', description: "'all' | campaign id (c1..c4)" }) campaign?: string;
  @ApiPropertyOptional({ example: 'auto' }) entity?: string;
}
class ReportIncludeDto {
  @ApiPropertyOptional({ default: true }) kpis?: boolean;
  @ApiPropertyOptional({ default: true }) map?: boolean;
  @ApiPropertyOptional({ default: true }) charts?: boolean;
  @ApiPropertyOptional({ default: true }) cleanupsList?: boolean;
  @ApiPropertyOptional({ default: true }) evidence?: boolean;
  @ApiPropertyOptional({ default: true }) plasticTypes?: boolean;
  @ApiPropertyOptional({ default: false }) ondas?: boolean;
  @ApiPropertyOptional({ default: true }) impactIndex?: boolean;
}

export class ReportRequestDto {
  @ApiProperty({ enum: ['monthly', 'annual', 'campaign', 'location', 'evidence', 'custom'], example: 'monthly' })
  type!: string;
  @ApiPropertyOptional({ type: ReportPeriodDto }) period?: ReportPeriodDto;
  @ApiPropertyOptional({ type: ReportScopeDto }) scope?: ReportScopeDto;
  @ApiPropertyOptional({ enum: ['summary', 'standard', 'detailed'], default: 'standard' }) detail?: string;
  @ApiPropertyOptional({ enum: ['en', 'es', 'fr'], default: 'en' }) language?: string;
  @ApiPropertyOptional({ enum: ['pdf', 'xlsx'], default: 'pdf', description: 'xlsx is coerced to pdf' }) format?: string;
  @ApiPropertyOptional({ type: ReportIncludeDto }) include?: ReportIncludeDto;
}

export class ReportResponseDto {
  @ApiProperty({ example: 'rep_ab12cd34' }) requestId!: string;
  @ApiProperty({ example: 'ready' }) status!: string;
  @ApiProperty({ example: 'Monthly cleanup report — June 2026' }) name!: string;
  @ApiProperty({ example: 'monthly' }) type!: string;
  @ApiProperty({ example: 'June 2026' }) period!: string;
  @ApiProperty({ example: '2026-06-18T10:32:00Z' }) generatedAt!: string;
  @ApiProperty({ example: 'pdf' }) format!: string;
  @ApiProperty({ example: '0.4 MB' }) size!: string;
  @ApiProperty({ example: 'https://universalplastic-sedia.s3.eu-central-1.amazonaws.com/public/mediterraneo/universal_plastic/reports/rep_ab12cd34.pdf' })
  downloadUrl!: string;
}
