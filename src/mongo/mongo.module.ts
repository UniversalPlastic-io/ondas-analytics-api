import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

export function mongoUri(): string {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) {
    throw new Error('MONGODB_URI is required (see .env.example)');
  }
  return uri;
}

export function mongoDbName(): string {
  return process.env.MONGODB_DB?.trim() || 'ondas_dataspace';
}

@Global()
@Module({
  imports: [
    MongooseModule.forRootAsync({
      useFactory: () => ({
        uri: mongoUri(),
        dbName: mongoDbName(),
        // Indexes are declared on the schemas; building them at boot keeps a fresh
        // cluster queryable without a separate migration step.
        autoIndex: true,
        serverSelectionTimeoutMS: 15_000,
      }),
    }),
  ],
  exports: [MongooseModule],
})
export class MongoModule {}
