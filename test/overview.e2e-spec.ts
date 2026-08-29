import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ApiV1Module } from '../src/api-v1/api-v1.module';
import { AssetsRepository } from '../src/api-v1/dataspace/assets.repository';
import { ObservationsRepository } from '../src/api-v1/dataspace/observations.repository';
import { stubMongo } from './mongo-stubs';

const ROW = {
  date: '2025-05-20',
  assetId: 'a1',
  location: 'Badalona',
  city: 'Badalona',
  lat: 41.437,
  lon: 2.244,
  kg: 30,
  volunteers: 9,
  km: 4,
  durationSeconds: 7200,
  evidence: 2,
  polymers: { pct_pet: 40, pct_hdpe: 20, pct_ldpe: 20, pct_pp: 10, pct_ps: 5, pct_pvc: 5, pct_others: 0 },
};

describe('GET /v1/overview (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const builder = Test.createTestingModule({ imports: [ApiV1Module] })
      .overrideProvider(AssetsRepository)
      .useValue({ findByFragments: async () => [{ _id: 'a1' }], nearest: async () => null })
      .overrideProvider(ObservationsRepository)
      .useValue({ cleanupRows: async () => [ROW], dailyMean: async () => new Map() });
    const moduleRef = await stubMongo(builder).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => { await app.close(); });

  it('returns the overview shape', async () => {
    const res = await request(app.getHttpServer()).get('/v1/overview?period=all&campaign=all').expect(200);
    expect(res.body.kpis.kg).toBeCloseTo(30, 5);
    expect(res.body.kpis.verified).toBe(100);
    expect(Array.isArray(res.body.series)).toBe(true);
    expect(Array.isArray(res.body.plasticTypes)).toBe(true);
    expect(Array.isArray(res.body.topLocations)).toBe(true);
    expect(res.body.scope).toBe('All campaigns');
    expect(res.body.sourcesIncluded).toContain('recogidas_playa');
  });

  it('is readable without a token', async () => {
    await request(app.getHttpServer()).get('/v1/overview').expect(200);
  });

  it('ignores an unreadable bearer token rather than rejecting the request', async () => {
    await request(app.getHttpServer()).get('/v1/overview').set('Authorization', 'Bearer nonsense').expect(200);
  });
});
