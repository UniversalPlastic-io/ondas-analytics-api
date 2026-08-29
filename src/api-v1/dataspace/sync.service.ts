import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Asset } from './schemas/asset.schema';
import { SyncResultRow, SyncRun, SyncRunDocument, SyncStatus } from './schemas/sync-run.schema';
import { Organization } from '../identity/schemas/organization.schema';
import { IngestService, InvalidAssetError, UnsupportedKeyError } from './ingest.service';
import { headObject, listKeysWithFallback, ObjectNotFoundError } from './s3-reader';
import { parseKey } from './s3-keys';
import { ROOT_PREFIX } from './dataspace.constants';

export interface SyncActor {
  userId: string | null;
  organizationId: string | null;
  role: 'admin' | 'provider' | 'viewer';
}

export interface SyncRunSummary {
  runId: string;
  kind: 'asset' | 'scan';
  status: SyncStatus;
  startedAt: Date;
  finishedAt: Date | null;
  totals: Record<string, number>;
  results: SyncResultRow[];
  warnings: string[];
}

// Kept low on purpose: concurrent replaces of the large hourly assets contend
// on a shared-tier cluster and can outlive the server transaction limit.
const SCAN_CONCURRENCY = 2;

/** Runs `tasks` with a bounded number in flight, preserving input order. */
async function pooled<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      results[index] = await worker(items[index]);
    }
  });
  await Promise.all(runners);
  return results;
}

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private readonly ingest: IngestService,
    @InjectModel(Asset.name) private readonly assets: Model<Asset>,
    @InjectModel(SyncRun.name) private readonly runs: Model<SyncRun>,
    @InjectModel(Organization.name) private readonly organizations: Model<Organization>,
  ) {}

  /** The S3 prefixes an actor may sync. Admins get the whole root. */
  private async allowedPrefixes(actor: SyncActor): Promise<string[] | null> {
    if (actor.role === 'admin') return null;
    if (!actor.organizationId) return [];
    const org = await this.organizations.findById(actor.organizationId).exec();
    if (!org) return [];
    const explicit = org.s3?.prefix ? [org.s3.prefix] : [];
    const folders = (org.providerFolders ?? []).map((folder) => `${ROOT_PREFIX}*/${folder}/`);
    return [...explicit, ...folders];
  }

  private async assertKeyAllowed(actor: SyncActor, key: string): Promise<void> {
    const prefixes = await this.allowedPrefixes(actor);
    if (prefixes === null) return;
    const parsed = parseKey(key);
    if (!parsed) return; // the ingest rejects it anyway, with a clearer message
    const org = actor.organizationId ? await this.organizations.findById(actor.organizationId).exec() : null;
    const folders = org?.providerFolders ?? [];
    if (!folders.includes(parsed.providerFolder)) {
      throw new ForbiddenException(
        `your organization may only sync keys under its own provider folders (${folders.join(', ') || 'none configured'})`,
      );
    }
  }

  private async startRun(
    kind: 'asset' | 'scan',
    actor: SyncActor,
    input: Record<string, unknown>,
  ): Promise<Types.ObjectId> {
    const run = await this.runs.create({
      kind,
      userId: actor.userId ? new Types.ObjectId(actor.userId) : null,
      organizationId: actor.organizationId ? new Types.ObjectId(actor.organizationId) : null,
      input,
      startedAt: new Date(),
      status: 'running',
      results: [],
      totals: {},
      warnings: [],
    });
    return run._id;
  }

  private async finishRun(
    runId: Types.ObjectId,
    results: SyncResultRow[],
    warnings: string[],
  ): Promise<SyncRunSummary> {
    const totals = {
      assets: results.length,
      created: results.filter((r) => r.action === 'created').length,
      updated: results.filter((r) => r.action === 'updated').length,
      unchanged: results.filter((r) => r.action === 'unchanged').length,
      missing: results.filter((r) => r.action === 'missing').length,
      skipped: results.filter((r) => r.action === 'skipped').length,
      failed: results.filter((r) => r.action === 'failed').length,
      observations: results.reduce((a, r) => a + (r.observations ?? 0), 0),
      warnings: results.reduce((a, r) => a + (r.warnings?.length ?? 0), 0) + warnings.length,
    };
    const failed = totals.failed;
    const status: SyncStatus = failed === 0 ? 'ok' : failed === results.length ? 'failed' : 'partial';
    const finishedAt = new Date();

    const run = await this.runs
      .findByIdAndUpdate(runId, { $set: { results, totals, warnings, status, finishedAt } }, { new: true })
      .exec();

    return {
      runId: String(runId),
      kind: run?.kind ?? 'scan',
      status,
      startedAt: run?.startedAt ?? finishedAt,
      finishedAt,
      totals,
      results,
      warnings,
    };
  }

  /** Ingest one asset the caller names explicitly. */
  async syncAsset(key: string, opts: { force?: boolean; actor: SyncActor }): Promise<SyncRunSummary> {
    await this.assertKeyAllowed(opts.actor, key);
    const runId = await this.startRun('asset', opts.actor, { key, force: !!opts.force });
    const row = await this.ingestOne(key, { force: opts.force, syncRunId: runId });
    return this.finishRun(runId, [row], []);
  }

  private async ingestOne(
    key: string,
    opts: { force?: boolean; syncRunId: Types.ObjectId },
  ): Promise<SyncResultRow> {
    try {
      return await this.ingest.ingestKey(key, { force: opts.force, syncRunId: opts.syncRunId });
    } catch (e) {
      if (e instanceof ObjectNotFoundError) {
        const marked = await this.ingest.markMissing(key, opts.syncRunId);
        return marked
          ? { key, action: 'missing', assetId: String(marked._id), error: 'object not found in S3' }
          : { key, action: 'failed', error: 'object not found in S3' };
      }
      if (e instanceof InvalidAssetError) {
        return { key, action: 'failed', error: e.errors.join('; ') };
      }
      if (e instanceof UnsupportedKeyError) {
        return { key, action: 'failed', error: e.message };
      }
      this.logger.error(`ingest failed for ${key}: ${(e as Error).message}`);
      return { key, action: 'failed', error: (e as Error).message };
    }
  }

  /**
   * Reconciles a prefix: ingests new/changed objects, leaves unchanged ones alone,
   * and flags assets whose object has disappeared.
   */
  async scan(opts: {
    prefix?: string;
    dryRun?: boolean;
    force?: boolean;
    actor: SyncActor;
  }): Promise<SyncRunSummary> {
    const actorPrefixes = await this.allowedPrefixes(opts.actor);
    let prefix = opts.prefix?.trim() || ROOT_PREFIX;
    if (!prefix.startsWith(ROOT_PREFIX)) prefix = ROOT_PREFIX;

    const listing = await listKeysWithFallback(prefix);
    const warnings: string[] = listing.warning ? [listing.warning] : [];

    const candidates: string[] = [];
    let ignored = 0;
    for (const key of listing.keys) {
      if (!parseKey(key)) {
        ignored += 1;
        continue;
      }
      candidates.push(key);
    }
    if (ignored) warnings.push(`${ignored} keys ignored (schema or output folders, or an unrecognised layout)`);

    const scoped = actorPrefixes === null ? candidates : await this.filterToActor(candidates, opts.actor);
    if (scoped.length !== candidates.length) {
      warnings.push(`${candidates.length - scoped.length} keys outside your organization were not considered`);
    }

    const runId = await this.startRun('scan', opts.actor, {
      prefix,
      dryRun: !!opts.dryRun,
      force: !!opts.force,
      listingSource: listing.source,
    });

    const known = await this.assets.find({ key: { $in: scoped } }).select('key etag status').exec();
    const byKey = new Map(known.map((a) => [a.key, a]));

    const results = await pooled(scoped, SCAN_CONCURRENCY, async (key): Promise<SyncResultRow> => {
      const existing = byKey.get(key);
      let head: Awaited<ReturnType<typeof headObject>> = null;
      try {
        head = await headObject(key);
      } catch (e) {
        return { key, action: 'failed', error: `HEAD failed: ${(e as Error).message}` };
      }

      if (!head) {
        if (!existing) return { key, action: 'skipped', error: 'object not readable' };
        if (opts.dryRun) return { key, action: 'missing', assetId: String(existing._id) };
        const marked = await this.ingest.markMissing(key, runId);
        return { key, action: 'missing', assetId: marked ? String(marked._id) : undefined };
      }

      const unchanged =
        !opts.force && existing && existing.status === 'active' && existing.etag && existing.etag === head.etag;
      if (unchanged) {
        return { key, action: 'unchanged', assetId: String(existing!._id) };
      }
      if (opts.dryRun) {
        return { key, action: existing ? 'updated' : 'created', assetId: existing ? String(existing._id) : undefined };
      }
      return this.ingestOne(key, { force: opts.force, syncRunId: runId });
    });

    // Assets we hold that the bucket no longer lists. Only provable from a real
    // listing — the bundled inventory cannot show that something was removed.
    if (listing.source === 'bucket') {
      const listed = new Set(scoped);
      const orphanFilter: Record<string, unknown> = { status: 'active', key: { $nin: Array.from(listed) } };
      if (actorPrefixes !== null && opts.actor.organizationId) {
        orphanFilter.organizationId = new Types.ObjectId(opts.actor.organizationId);
      }
      const orphans = await this.assets.find(orphanFilter).select('key').exec();
      for (const orphan of orphans) {
        if (!orphan.key.startsWith(prefix)) continue;
        if (!opts.dryRun) await this.ingest.markMissing(orphan.key, runId);
        results.push({ key: orphan.key, action: 'missing', assetId: String(orphan._id) });
      }
    }

    if (opts.dryRun) warnings.push('dryRun: nothing was written');
    return this.finishRun(runId, results, warnings);
  }

  private async filterToActor(keys: string[], actor: SyncActor): Promise<string[]> {
    if (!actor.organizationId) return [];
    const org = await this.organizations.findById(actor.organizationId).exec();
    const folders = new Set(org?.providerFolders ?? []);
    return keys.filter((key) => {
      const parsed = parseKey(key);
      return parsed ? folders.has(parsed.providerFolder) : false;
    });
  }

  async listRuns(actor: SyncActor, limit = 20): Promise<SyncRunDocument[]> {
    const filter: Record<string, unknown> = {};
    if (actor.role !== 'admin' && actor.organizationId) {
      filter.organizationId = new Types.ObjectId(actor.organizationId);
    }
    return this.runs.find(filter).sort({ startedAt: -1 }).limit(Math.min(limit, 100)).exec();
  }

  async getRun(id: string, actor: SyncActor): Promise<SyncRunDocument> {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('sync run not found');
    const run = await this.runs.findById(id).exec();
    if (!run) throw new NotFoundException('sync run not found');
    if (
      actor.role !== 'admin' &&
      run.organizationId &&
      String(run.organizationId) !== String(actor.organizationId)
    ) {
      throw new ForbiddenException('this sync run belongs to another organization');
    }
    return run;
  }
}
