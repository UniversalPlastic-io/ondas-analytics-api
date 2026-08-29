import { Schema as MongooseSchema } from 'mongoose';

export interface GeoPoint {
  type: 'Point';
  /** GeoJSON order: [lon, lat]. */
  coordinates: [number, number];
}

export const PointSchema = new MongooseSchema<GeoPoint>(
  {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true },
  },
  { _id: false },
);

export function point(lat: number, lon: number): GeoPoint {
  return { type: 'Point', coordinates: [lon, lat] };
}
