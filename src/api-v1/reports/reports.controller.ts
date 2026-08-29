import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { ReportRequest, ReportResponse } from './reports.types';
import { ReportRequestDto, ReportResponseDto } from './reports.swagger.dto';

@ApiTags('Reports')
@Controller('/v1')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Post('reports/request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generar un informe de recogidas (PDF Blue Resilience) y subirlo a S3' })
  @ApiBody({
    type: ReportRequestDto,
    examples: {
      monthlyAll: {
        summary: 'Informe mensual (todas las campañas)',
        value: { type: 'monthly', period: { preset: 'month' }, scope: { campaign: 'all' }, detail: 'standard', language: 'en', format: 'pdf' },
      },
      annualAll: { summary: 'Informe anual', value: { type: 'annual', period: { preset: 'year' }, scope: { campaign: 'all' } } },
      campaignC2: { summary: 'Informe de campaña (c2 → Badalona)', value: { type: 'campaign', period: { preset: 'all' }, scope: { campaign: 'c2' } } },
      customRange: { summary: 'Periodo personalizado', value: { type: 'custom', period: { start: '2025-01-01', end: '2025-12-31' }, scope: { campaign: 'all' } } },
      evidenceReport: { summary: 'Informe de evidencias', value: { type: 'evidence', period: { preset: 'all' }, scope: { campaign: 'all' } } },
    },
  })
  @ApiOkResponse({ type: ReportResponseDto })
  generate(@Body() body: ReportRequest): Promise<ReportResponse> {
    return this.reports.generate(body);
  }
}
