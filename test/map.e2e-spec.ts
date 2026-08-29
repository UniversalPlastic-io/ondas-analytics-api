import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ApiV1Module } from '../src/api-v1/api-v1.module';
import { AssetsRepository } from '../src/api-v1/dataspace/assets.repository';
import { ObservationsRepository } from '../src/api-v1/dataspace/observations.repository';
import { stubMongo } from './mongo-stubs';

const ASSETS = [
  {
    _id: 'a1',
    key: 'public/mediterraneo/port_badalona/boya_biomasa_badalona.json',
    url: 'https://bucket/boya_biomasa_badalona.json',
    datasetType: 'boya_biomasa_slx+',
    category: 'biomass',
    dataProviderIdRaw: 'portbadalona',
    ocean: 'mediterraneo',
    place: 'badalona',
    placeName: 'Badalona',
    city: 'Badalona',
    location: { type: 'Point', coordinates: [2.2433, 41.4342] },
    format: 'rows',
    units: { 'Biomass depth -3_-5 m': 'Tonnes' },
    recordCount: 3611,
    observationCount: 3611,
    dateRange: { start: '2025-12-06', end: '2026-05-11' },
    summary: { meanTonnes: 18.24 },
    warnings: [],
    status: 'active',
    currentIngestId: 'g1',
    dcatSchemaRef: null,
  },
  {
    _id: 'a2',
    key: 'public/atlantico/innoceana/recogidas_playa_tenerife.json',
    url: 'https://bucket/recogidas_playa_tenerife.json',
    datasetType: 'recogidas_playa',
    category: 'cleanup',
    dataProviderIdRaw: 'innoceana',
    ocean: 'atlantico',
    place: 'tenerife',
    placeName: 'Tenerife',
    city: 'Canary Islands',
    location: { type: 'Point', coordinates: [-16.6596, 28.1876] },
    format: 'rows',
    units: {},
    recordCount: 7,
    observationCount: 7,
    dateRange: { start: '2025-04-10', end: '2026-04-07' },
    summary: { kg: 144.87, volunteers: 31, cleanups: 7 },
    warnings: ['coords corrected 31.483,-11.926 → Tenerife (28.188,-16.660)'],
    status: 'active',
    currentIngestId: 'g2',
    dcatSchemaRef: null,
  },
];

describe('GET /v1/map/points (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const builder = Test.createTestingModule({ imports: [ApiV1Module] })
      .overrideProvider(AssetsRepository)
      .useValue({ find: async () => ASSETS })
      .overrideProvider(ObservationsRepository)
      .useValue({
        cleanupRows: async () => [
          { date: '2025-04-10', kg: 17.29, volunteers: 4, km: 1.2, durationSeconds: 1718, evidence: 2 },
        ],
      });
    const moduleRef = await stubMongo(builder).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => { await app.close(); });

  it('returns one marker per dataset with bounds', async () => {
    const res = await request(app.getHttpServer()).get('/v1/map/points').expect(200);
    expect(res.body.count).toBe(2);
    expect(res.body.bounds).toEqual([[28.1876, -16.6596], [41.4342, 2.2433]]);
    const biomass = res.body.points.find((p: { category: string }) => p.category === 'biomass');
    expect(biomass).toMatchObject({ color: '#16a34a', label: 'Fish biomass buoy', records: 3611 });
  });

  it('carries the cleanup per-event list and the ingest warnings', async () => {
    const res = await request(app.getHttpServer()).get('/v1/map/points').expect(200);
    const cleanup = res.body.points.find((p: { category: string }) => p.category === 'cleanup');
    expect(cleanup.cleanupsList).toHaveLength(1);
    expect(cleanup.cleanupsList[0].duration).toBe('0:28:38');
    expect(cleanup.warnings[0]).toMatch(/coords corrected/);
  });

  it('renders GeoJSON with [lng, lat] coordinates', async () => {
    const res = await request(app.getHttpServer()).get('/v1/map/points?format=geojson').expect(200);
    expect(res.body.type).toBe('FeatureCollection');
    expect(res.body.features[0].geometry.coordinates).toEqual([2.2433, 41.4342]);
  });
});
