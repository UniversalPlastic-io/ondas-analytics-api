import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, QueryFilter, Types } from 'mongoose';
import { Observation } from './schemas/observation.schema';
import { Asset } from './schemas/asset.schema';

export interface ObservationScope {
  assetIds?: Types.ObjectId[];
  organizationId?: string | null;
  datasetType?: string;
  category?: string;
  ocean?: string;
  /** Inclusive YYYY-MM-DD bounds. */
  start?: string;
  end?: string;
}

/** A cleanup event, shaped for the report/overview aggregators. */
export interface CleanupObservationRow {
  date: string;
  assetId: string;
  location: string;
  city: string;
  lat: number;
  lon: number;
  kg: number;
  volunteers: number;
  km: number;
  durationSeconds: number;
  evidence: number;
  polymers: Record<string, number>;
}

const POLYMER_FIELDS = [
  'pct_pet',
  'pct_hdpe',
  'pct_ldpe',
  'pct_pp',
  'pct_ps',
  'pct_pvc',
  'pct_others',
];

function n(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

/**
 * Aggregation pipelines over the canonical observations.
 *
 * Every read resolves the scope to a set of assets first and then matches their
 * *current* ingest generations. Observations from a superseded or half-written
 * generation are therefore invisible without needing a transaction on the write
 * side. See IngestService.publishGeneration.
 */
@Injectable()
export class ObservationsRepository {
  constructor(
    @InjectModel(Observation.name)
    private readonly observations: Model<Observation>,
    @InjectModel(Asset.name) private readonly assets: Model<Asset>,
  ) {}

  /** Current generation ids of every asset the scope selects. */
  private async generationsOf(
    scope: ObservationScope,
  ): Promise<Types.ObjectId[]> {
    const q: QueryFilter<Asset> = { currentIngestId: { $ne: null } };
    if (scope.assetIds?.length) q._id = { $in: scope.assetIds };
    if (scope.organizationId)
      q.organizationId = new Types.ObjectId(scope.organizationId);
    if (scope.datasetType) q.datasetType = scope.datasetType;
    if (scope.category) q.category = scope.category;
    if (scope.ocean) q.ocean = scope.ocean;

    const assets = await this.assets
      .find(q)
      .select('currentIngestId')
      .lean()
      .exec();
    return assets
      .map((a) => a.currentIngestId)
      .filter((id): id is Types.ObjectId => !!id);
  }

  private async matchOf(
    scope: ObservationScope,
  ): Promise<QueryFilter<Observation>> {
    const generations = await this.generationsOf(scope);
    const q: QueryFilter<Observation> = { ingestId: { $in: generations } };
    if (scope.start || scope.end) {
      const range: Record<string, string> = {};
      if (scope.start) range.$gte = scope.start;
      if (scope.end) range.$lte = scope.end;
      q.date = range;
    }
    return q;
  }

  /** Cleanup events in scope, date-filtered in the database. */
  async cleanupRows(scope: ObservationScope): Promise<CleanupObservationRow[]> {
    const match = await this.matchOf({ ...scope, category: 'cleanup' });
    const docs = await this.observations
      .find(match)
      .sort({ date: 1 })
      .lean()
      .exec();

    return docs.map((d) => {
      const values = (d.values ?? {}) as Record<string, unknown>;
      const polymers: Record<string, number> = {};
      for (const field of POLYMER_FIELDS) polymers[field] = n(values[field]);
      // Cleanup rows carry their own start point; other categories leave it null.
      const coords = d.location?.coordinates ?? [0, 0];
      return {
        date: d.date,
        assetId: String(d.assetId),
        location: d.placeName ?? d.place ?? 'Unknown',
        city: d.city ?? 'Spain',
        lat: n(values.start_lat) || coords[1],
        lon: n(values.start_lon) || coords[0],
        kg: n(values.kg),
        volunteers: n(values.participants),
        km: n(values.distance_km),
        durationSeconds: n(values.duration_s),
        evidence: n(values.evidence_count),
        polymers,
      };
    });
  }

  /** Mean of a numeric field per day: `Map<'YYYY-MM-DD', number>`. */
  async dailyMean(
    scope: ObservationScope,
    field: string,
  ): Promise<Map<string, number>> {
    const match = await this.matchOf(scope);
    const rows = await this.observations
      .aggregate<{
        _id: string;
        value: number;
      }>([
        { $match: { ...match, [`values.${field}`]: { $ne: null } } },
        { $group: { _id: '$date', value: { $avg: `$values.${field}` } } },
        { $sort: { _id: 1 } },
      ])
      .exec();
    return new Map(
      rows
        .filter((r) => typeof r.value === 'number')
        .map((r) => [r._id, r.value]),
    );
  }

  /**
   * Mean per day of the sum of several numeric fields.
   *
   * One pass instead of one aggregation per field, which matters for the water
   * samples: their concentration is spread over twelve polymer columns and the
   * quantity every reader wants is the total. A missing column counts as zero,
   * so a file that omits a polymer is not dropped from the total.
   */
  async dailyTotalMean(
    scope: ObservationScope,
    fields: string[],
  ): Promise<Map<string, number>> {
    if (!fields.length) return new Map();
    const match = await this.matchOf(scope);
    const total = {
      $add: fields.map((f) => ({ $ifNull: [`$values.${f}`, 0] })),
    };
    const rows = await this.observations
      .aggregate<{
        _id: string;
        value: number;
      }>([
        { $match: match },
        { $group: { _id: '$date', value: { $avg: total } } },
        { $sort: { _id: 1 } },
      ])
      .exec();
    return new Map(
      rows
        .filter((r) => typeof r.value === 'number')
        .map((r) => [r._id, r.value]),
    );
  }

  /** Sum of a numeric field per day. */
  async dailySum(
    scope: ObservationScope,
    field: string,
  ): Promise<Map<string, number>> {
    const match = await this.matchOf(scope);
    const rows = await this.observations
      .aggregate<{
        _id: string;
        value: number;
      }>([
        { $match: { ...match, [`values.${field}`]: { $ne: null } } },
        { $group: { _id: '$date', value: { $sum: `$values.${field}` } } },
        { $sort: { _id: 1 } },
      ])
      .exec();
    return new Map(rows.map((r) => [r._id, r.value]));
  }

  /** Every non-null value of a numeric field, for mean/std in the caller. */
  async fieldValues(scope: ObservationScope, field: string): Promise<number[]> {
    const match = await this.matchOf(scope);
    const rows = await this.observations
      .aggregate<{
        values: number[];
      }>([
        { $match: { ...match, [`values.${field}`]: { $ne: null } } },
        { $group: { _id: null, values: { $push: `$values.${field}` } } },
      ])
      .exec();
    const raw = rows[0]?.values ?? [];
    return raw.filter(
      (v): v is number => typeof v === 'number' && Number.isFinite(v),
    );
  }

  /** Counts of a string field, most frequent first. */
  async countByString(
    scope: ObservationScope,
    field: string,
  ): Promise<Array<{ key: string; count: number }>> {
    const match = await this.matchOf(scope);
    const rows = await this.observations
      .aggregate<{
        _id: string;
        count: number;
      }>([
        { $match: { ...match, [`values.${field}`]: { $type: 'string' } } },
        { $group: { _id: `$values.${field}`, count: { $sum: 1 } } },
        // `_id` breaks ties: sorting by count alone leaves equally frequent
        // values in an arbitrary order, so two identical requests returned the
        // same polymers in a different sequence.
        { $sort: { count: -1, _id: 1 } },
      ])
      .exec();
    return rows.map((r) => ({ key: r._id, count: r.count }));
  }

  async distinctStrings(
    scope: ObservationScope,
    field: string,
  ): Promise<string[]> {
    const rows = await this.countByString(scope, field);
    return rows.map((r) => r.key);
  }

  /** Mean of several numeric fields in one pass. */
  async fieldMeans(
    scope: ObservationScope,
    fields: string[],
  ): Promise<Record<string, number | null>> {
    if (!fields.length) return {};
    const match = await this.matchOf(scope);
    const group = { _id: null } as PipelineStage.Group['$group'];
    for (const f of fields) {
      (group as Record<string, unknown>)[f.replace(/\./g, '_')] = {
        $avg: `$values.${f}`,
      };
    }
    const rows = await this.observations
      .aggregate<
        Record<string, unknown>
      >([{ $match: match }, { $group: group }])
      .exec();
    const row = rows[0] ?? {};
    const out: Record<string, number | null> = {};
    for (const f of fields) {
      const v = row[f.replace(/\./g, '_')];
      out[f] = typeof v === 'number' && Number.isFinite(v) ? v : null;
    }
    return out;
  }

  async count(scope: ObservationScope): Promise<number> {
    return this.observations.countDocuments(await this.matchOf(scope)).exec();
  }

  /** Earliest and latest observation date in scope. */
  async dateRange(
    scope: ObservationScope,
  ): Promise<{ start: string; end: string } | null> {
    const match = await this.matchOf(scope);
    const rows = await this.observations
      .aggregate<{
        start: string;
        end: string;
      }>([
        { $match: match },
        {
          $group: {
            _id: null,
            start: { $min: '$date' },
            end: { $max: '$date' },
          },
        },
      ])
      .exec();
    const row = rows[0];
    return row?.start && row?.end ? { start: row.start, end: row.end } : null;
  }
}
