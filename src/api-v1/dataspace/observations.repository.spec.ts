import { ObservationsRepository } from './observations.repository';

/**
 * The aggregation pipelines are asserted directly rather than against a live
 * Mongo: what matters here is the shape of the query the repository builds.
 */
describe('ObservationsRepository — determinismo de countByString', () => {
  const pipelineOf = async (): Promise<Record<string, unknown>[]> => {
    let captured: Record<string, unknown>[] = [];
    const model = {
      aggregate: (pipeline: Record<string, unknown>[]) => {
        captured = pipeline;
        return { exec: async () => [] };
      },
    };
    const assets = {
      find: () => ({
        select: () => ({ lean: () => ({ exec: async () => [] }) }),
      }),
    };

    const repo = new ObservationsRepository(model as never, assets as never);
    await repo.countByString({ ocean: 'mediterraneo' } as never, 'polymer');
    return captured;
  };

  it('breaks count ties by value, so equal counts keep a stable order', async () => {
    const sort = (await pipelineOf()).find((stage) => '$sort' in stage) as
      | { $sort: Record<string, number> }
      | undefined;

    expect(sort).toBeDefined();
    // Sorting by count alone left equally frequent polymers in an arbitrary
    // order, so two identical analytics requests returned different lists.
    expect(sort!.$sort).toEqual({ count: -1, _id: 1 });
    expect(Object.keys(sort!.$sort)).toEqual(['count', '_id']);
  });
});
