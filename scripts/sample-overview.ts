import 'dotenv/config';
import * as fs from 'node:fs';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { OverviewService } from '../src/api-v1/overview/overview.service';

/** Regenerates docs/sample-overview.json from the live Mongo data. */
async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  const res = await app.get(OverviewService).get('all', 'all');
  const json = JSON.stringify(res, null, 2);
  fs.writeFileSync('docs/sample-overview.json', json + '\n');
  console.log(json);
  await app.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
