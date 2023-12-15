import type { Query } from 'radix-ts';
import { SEPARATOR, STRIP_LAST_SEPARATOR } from '../constants';
import { crawlUnion } from './generator';

/**
 * This method is required in order to process different entries, that satisfy query
 * Every index has values sorted by value, then id, so if we yield values sorted by the first value,
 * then values sorted by second value, that go before the latest id of the first value, will be ignored:
 *
 * value 1, id 1
 * value 1, id 3
 * value 2, id 2 // gets ignored
 * value 2, id 4
 */
export async function* combinations(
  fastLoop: <TFilter extends Query>(
    filter: TFilter,
    update: (args: {
      filter: TFilter;
      same: boolean;
      lastId: string | undefined;
      node: string;
    }) => void,
    alter?: ((id: string, _node: string) => string) | undefined,
  ) => AsyncGenerator<
    string,
    void,
    {
      value: string | undefined;
      same: boolean;
    }
  >,
  prefixes: AsyncGenerator<string, void, unknown>,
) {
  const allowedValues: AsyncGenerator<
    string,
    void,
    { value: string | undefined; same: boolean }
  >[] = [];

  try {
    const nextValue: { value: string | undefined; same: boolean } = {
      value: undefined,
      same: false,
    };
    while (true) {
      const { done, value: prefix } = await prefixes.next(nextValue);
      if (done) break;
      nextValue.value = prefix;
      allowedValues.push(
        fastLoop(
          {
            prefix,
            gte: undefined as string | undefined,
            gt: undefined as string | undefined,
          },
          ({ filter, same, node, lastId: lastId }) => {
            if (same) {
              filter.gte = node.replace(
                STRIP_LAST_SEPARATOR,
                SEPARATOR + lastId,
              );
              filter.gt = undefined;
            } else {
              filter.gte = undefined;
              filter.gt = node.replace(
                STRIP_LAST_SEPARATOR,
                SEPARATOR + lastId,
              );
            }
          },
        ),
      );
    }
  } finally {
    await prefixes.return();
  }

  yield* crawlUnion(allowedValues);
}
