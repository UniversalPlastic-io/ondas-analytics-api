import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { IdentityService } from '../src/api-v1/identity/identity.service';

/**
 * Sets a user's password and prints it once.
 *
 *   npm run users:reset -- --email someone@example.org
 *   npm run users:reset -- --email someone@example.org --password 'chosen-one'
 */
async function main() {
  const args = process.argv.slice(2);
  const value = (name: string) => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const email = value('email');
  if (!email) {
    console.error('usage: npm run users:reset -- --email <email> [--password <password>]');
    process.exit(1);
  }
  const password = value('password') ?? randomBytes(15).toString('base64url');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  await app.get(IdentityService).setPassword(email, password);
  console.log(`\n${email}\n${password}\n\nShown once. Store it now.\n`);
  await app.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
