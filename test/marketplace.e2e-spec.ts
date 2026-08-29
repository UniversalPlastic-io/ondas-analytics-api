import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ApiV1Module } from '../src/api-v1/api-v1.module';
import { stubMongo } from './mongo-stubs';

const HOME = {
  organizations: [{ id: 'o1', name: 'EcoAngola', username: 'ecoangola' }],
  campaigns: [{ id: 'c1', name: 'Kalunga', collected: 2519, statusId: 1 }],
  wasteCollections: [{ id: 'w1', city: 'Mahón', statusId: 6, campaign: { id: 'c1', name: 'Km de plástico' } }],
};

describe('Marketplace passthrough (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    jest.spyOn(global, 'fetch').mockImplementation((() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(HOME) } as unknown as Response)) as typeof fetch);
    const moduleRef = await stubMongo(Test.createTestingModule({ imports: [ApiV1Module] })).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => { await app.close(); jest.restoreAllMocks(); });

  it('GET /v1/campaigns → campaigns[]', async () => {
    const res = await request(app.getHttpServer()).get('/v1/campaigns').expect(200);
    expect(res.body).toEqual(HOME.campaigns);
  });
  it('GET /v1/cleanups → wasteCollections[]', async () => {
    const res = await request(app.getHttpServer()).get('/v1/cleanups').expect(200);
    expect(res.body[0].id).toBe('w1');
    expect(res.body[0].campaign.name).toBe('Km de plástico');
  });
  it('GET /v1/organizations → organizations[]', async () => {
    const res = await request(app.getHttpServer()).get('/v1/organizations').expect(200);
    expect(res.body[0].username).toBe('ecoangola');
  });
});
