import { TestingModuleBuilder } from '@nestjs/testing';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Asset } from '../src/api-v1/dataspace/schemas/asset.schema';
import { Observation } from '../src/api-v1/dataspace/schemas/observation.schema';
import { SyncRun } from '../src/api-v1/dataspace/schemas/sync-run.schema';
import { Organization } from '../src/api-v1/identity/schemas/organization.schema';
import { User } from '../src/api-v1/identity/schemas/user.schema';

const MODELS = [Asset.name, Observation.name, SyncRun.name, Organization.name, User.name];

/**
 * Satisfies the Mongoose providers ApiV1Module declares without opening a
 * connection. The e2e specs then override the repositories with fixtures, so
 * they exercise routing, guards and projection rather than the database.
 */
export function stubMongo(builder: TestingModuleBuilder): TestingModuleBuilder {
  builder.overrideProvider(getConnectionToken()).useValue({});
  for (const model of MODELS) {
    builder.overrideProvider(getModelToken(model)).useValue({
      find: () => ({ sort: () => ({ lean: () => ({ exec: async () => [] }), exec: async () => [] }), select: () => ({ lean: () => ({ exec: async () => [] }), exec: async () => [] }), exec: async () => [] }),
      findOne: () => ({ select: () => ({ exec: async () => null }), exec: async () => null }),
      findById: () => ({ exec: async () => null }),
      countDocuments: () => ({ exec: async () => 0 }),
      aggregate: () => ({ exec: async () => [] }),
    });
  }
  return builder;
}
