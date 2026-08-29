import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Query,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { SyncActor, SyncService } from './sync.service';
import { SyncAssetDto, SyncRunResponseDto, SyncScanDto } from './dto/sync.dto';
import { CurrentUser, Roles, RolesGuard, UserJwtAuthGuard } from '../identity/auth.guards';
import { RequestUser } from '../identity/jwt-payload';
import { DATA_BUCKET_BASE_URL } from './dataspace.constants';

function actorOf(user: RequestUser | null): SyncActor {
  return {
    userId: user?.userId ?? null,
    organizationId: user?.organizationId ?? null,
    role: user?.role ?? 'viewer',
  };
}

/** Turns a full object URL into a bucket key. */
function keyFromUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed.startsWith(DATA_BUCKET_BASE_URL)) return null;
  const path = trimmed.slice(DATA_BUCKET_BASE_URL.length).replace(/^\/+/, '');
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

@ApiTags('Dataspace sync')
@ApiBearerAuth('portal-jwt')
@Controller('/v1/sync')
@UseGuards(UserJwtAuthGuard, RolesGuard)
@Roles('admin', 'provider')
export class SyncController {
  constructor(private readonly sync: SyncService) {}

  @Post('assets')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Ingest one asset that was uploaded or updated in the data space',
    description:
      'Fetches the object, validates its container, normalizes it and replaces its observations in one transaction. Idempotent: an unchanged checksum is reported as "unchanged" without writing.',
  })
  @ApiOkResponse({ type: SyncRunResponseDto })
  @ApiNotFoundResponse({ description: 'No such object in the bucket' })
  @ApiUnprocessableEntityResponse({ description: 'The object exists but is not a usable asset' })
  async syncAsset(@Body() body: SyncAssetDto, @CurrentUser() user: RequestUser | null) {
    const key = body.key?.trim() || (body.url ? keyFromUrl(body.url) : null);
    if (!key) {
      throw new BadRequestException('provide "key", or "url" pointing at the data space bucket');
    }

    const run = await this.sync.syncAsset(key, { force: !!body.force, actor: actorOf(user) });

    // A single-asset sync reports its outcome as a status code, so the caller can
    // branch without reading into the run. A scan cannot — it is a batch, and
    // reports per-asset failures inside a 200.
    const row = run.results[0];
    if (row?.action === 'missing') {
      throw new NotFoundException({ error: 'asset_not_found', message: `no such object in the bucket: ${key}`, run });
    }
    if (row?.action === 'failed') {
      const missing = /not found in S3/.test(row.error ?? '');
      const payload = { error: missing ? 'asset_not_found' : 'invalid_asset', message: row.error, run };
      throw missing ? new NotFoundException(payload) : new UnprocessableEntityException(payload);
    }
    return run;
  }

  @Post('scan')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reconcile a prefix against the bucket',
    description:
      'Ingests new and changed objects, leaves unchanged ones alone, and flags assets whose object has disappeared (their observations are kept).',
  })
  @ApiOkResponse({ type: SyncRunResponseDto })
  async scan(@Body() body: SyncScanDto, @CurrentUser() user: RequestUser | null) {
    return this.sync.scan({
      prefix: body.prefix,
      dryRun: !!body.dryRun,
      force: !!body.force,
      actor: actorOf(user),
    });
  }

  @Get('runs')
  @ApiOperation({ summary: 'Sync history' })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  async listRuns(@Query('limit') limit: string | undefined, @CurrentUser() user: RequestUser | null) {
    const runs = await this.sync.listRuns(actorOf(user), Number(limit) || 20);
    return runs.map((r) => ({
      runId: String(r._id),
      kind: r.kind,
      status: r.status,
      startedAt: r.startedAt,
      finishedAt: r.finishedAt,
      input: r.input,
      totals: r.totals,
      warnings: r.warnings,
    }));
  }

  @Get('runs/:id')
  @ApiOperation({ summary: 'One sync run, with its per-asset results' })
  async getRun(@Param('id') id: string, @CurrentUser() user: RequestUser | null) {
    const run = await this.sync.getRun(id, actorOf(user));
    return {
      runId: String(run._id),
      kind: run.kind,
      status: run.status,
      startedAt: run.startedAt,
      finishedAt: run.finishedAt,
      input: run.input,
      totals: run.totals,
      results: run.results,
      warnings: run.warnings,
    };
  }
}
