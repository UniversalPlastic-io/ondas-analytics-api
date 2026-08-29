import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { GeoPoint, PointSchema } from './geo.schema';

/**
 * One document per row / hourly reading / detected particle / nested day.
 * `values` holds canonical field names (see normalize/field-maps.ts) so the read
 * pipelines never touch a raw column spelling.
 */
@Schema({ collection: 'observations', timestamps: false })
export class Observation {
  @Prop({ type: Types.ObjectId, ref: 'Asset', required: true })
  assetId!: Types.ObjectId;

  /**
   * The ingest generation that wrote this document. An asset points at exactly
   * one current generation, so a replace becomes: write the new generation,
   * flip the asset's pointer, delete the rest. Readers only ever see documents
   * belonging to the generation their asset names.
   */
  @Prop({ type: Types.ObjectId, required: true })
  ingestId!: Types.ObjectId;

  @Prop({ required: true })
  datasetType!: string;

  @Prop({ required: true })
  category!: string;

  @Prop({ type: Types.ObjectId, ref: 'Organization', default: null })
  organizationId!: Types.ObjectId | null;

  @Prop({ required: true })
  ocean!: string;

  @Prop({ type: String, default: null })
  place!: string | null;

  @Prop({ type: String, default: null })
  placeName!: string | null;

  @Prop({ type: String, default: null })
  city!: string | null;

  /** Normalized YYYY-MM-DD, lexicographically comparable. */
  @Prop({ required: true })
  date!: string;

  @Prop({ type: String, default: null })
  time!: string | null;

  @Prop({ required: true })
  ts!: Date;

  /** Nested pre-event windows: the cleanup event this day belongs to. */
  @Prop({ type: String, default: null })
  eventDate!: string | null;

  /**
   * Only set when the record carries its own coordinates (a cleanup's start
   * point, a pre-event window's location). Otherwise the asset holds the
   * position, and copying it onto thousands of rows would only cost write time.
   */
  @Prop({ type: PointSchema, default: null })
  location!: GeoPoint | null;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  values!: Record<string, number | string | null>;

  /** Only populated for cleanup rows (evidence URLs, original duration string). */
  @Prop({ type: MongooseSchema.Types.Mixed, default: null })
  raw!: Record<string, unknown> | null;
}

export type ObservationDocument = HydratedDocument<Observation>;
export const ObservationSchema = SchemaFactory.createForClass(Observation);

// Deliberately just two indexes: each one costs write time on every ingest, and a
// buoy asset replaces thousands of documents at once.
//   {ingestId, date} — every read (the repository resolves assets to generations first)
//   {assetId, ingestId} — generation cleanup after a swap
// No 2dsphere: geographic selection happens on `assets`, never on observations.
ObservationSchema.index({ ingestId: 1, date: 1 });
ObservationSchema.index({ assetId: 1, ingestId: 1 });
