import 'dotenv/config';
import * as fs from 'node:fs';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { MapService } from '../src/api-v1/map/map.service';

/** Regenerates docs/sample-map-points.json from the live Mongo data. */
async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  const res = await app.get(MapService).getPoints();
  const json = JSON.stringify(res, null, 2);
  fs.writeFileSync('docs/sample-map-points.json', json + '\n');
  console.log(`${res.count} markers written to docs/sample-map-points.json`);
  await app.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
