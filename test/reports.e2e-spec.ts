import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ApiV1Module } from '../src/api-v1/api-v1.module';
import * as reportsS3 from '../src/api-v1/reports/reports-s3';
import { AssetsRepository } from '../src/api-v1/dataspace/assets.repository';
import { ObservationsRepository } from '../src/api-v1/dataspace/observations.repository';
import { stubMongo } from './mongo-stubs';

const ROW = {
  date: '2026-06-07',
  assetId: 'a1',
  location: 'Badalona',
  city: 'Badalona',
  lat: 41.437,
  lon: 2.244,
  kg: 1.0,
  volunteers: 3,
  km: 1.2,
  durationSeconds: 2700,
  evidence: 2,
  polymers: { pct_pet: 50, pct_hdpe: 20, pct_ldpe: 10, pct_pp: 10, pct_ps: 0, pct_pvc: 0, pct_others: 0 },
};

describe('POST /v1/reports/request (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    jest.spyOn(reportsS3, 'uploadReportToS3').mockResolvedValue({
      downloadUrl: 'https://universalplastic-sedia.s3.eu-central-1.amazonaws.com/public/mediterraneo/universal_plastic/reports/rep_x.pdf',
      s3Key: 'public/mediterraneo/universal_plastic/reports/rep_x.pdf',
    });
    const builder = Test.createTestingModule({ imports: [ApiV1Module] })
      .overrideProvider(AssetsRepository)
      .useValue({ findByFragments: async () => [{ _id: 'a1' }] })
      .overrideProvider(ObservationsRepository)
      .useValue({ cleanupRows: async () => [ROW] });
    const moduleRef = await stubMongo(builder).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => { await app.close(); jest.restoreAllMocks(); });

  it('generates a monthly report (ready + https url)', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/reports/request')
      .send({ type: 'monthly', period: { preset: 'all' } })
      .expect(200);
    expect(res.body.status).toBe('ready');
    expect(res.body.downloadUrl).toMatch(/^https:\/\//);
    expect(res.body.format).toBe('pdf');
  });

  it('rejects campaign report without campaign id (400)', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/reports/request')
      .send({ type: 'campaign', period: { preset: 'all' } })
      .expect(400);
    expect(res.body.error).toBe('campaign_required');
  });
});
