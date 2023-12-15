import { AFTER_SEPARATOR, SEPARATOR, STRIP_LAST_SEPARATOR } from '../constants';
import { DBRule } from '../types/db-rule';
import { combinations } from '../utils/combinations';
import { crawlUnion } from '../utils/generator';
import { max } from '../utils/sorting';

export const dbRuleExcluded: DBRule = {
  fails:
    ({ out: excluded }) =>
    ({ value }) =>
      excluded !== undefined && excluded.includes(value),
  loop:
    ({ out: excluded }) =>
    (allowedValuesGenerators, fastLoop, prefix, path) => {
      if (excluded === undefined) return;
      const excl = excluded.sort().map(e => path + e);
      if (!excl.length) return;
      excl.unshift(undefined as unknown as string); // left < allowed
      excl.push(undefined as unknown as string); // allowed < right
      const allowedIntervalValuesGenerators: AsyncGenerator<
        string,
        void,
        unknown
      >[] = [];
      for (let i = 1; i < excl.length; ++i) {
        const excludeLeft = excl[i - 1];
        const excludeRight = excl[i];
        allowedIntervalValuesGenerators.push(
          combinations(
            fastLoop,
            fastLoop(
              {
                prefix,
                gte: undefined as string | undefined,
                gt:
                  excludeLeft === undefined
                    ? undefined
                    : excludeLeft + AFTER_SEPARATOR,
                lt: excludeRight,
              },
              ({ same, filter, node, lastId: lastId }) => {
                if (same) {
                  filter.gte = node.replace(
                    STRIP_LAST_SEPARATOR,
                    SEPARATOR + lastId,
                  );
                  filter.gt =
                    excludeLeft === undefined
                      ? undefined
                      : excludeLeft + AFTER_SEPARATOR;
                } else {
                  filter.gte = undefined;
                  filter.gt = max(
                    excludeLeft === undefined
                      ? undefined
                      : excludeLeft + AFTER_SEPARATOR,
                    node.replace(STRIP_LAST_SEPARATOR, SEPARATOR + lastId),
                  );
                }
              },
              (_id, node) => node.replace(STRIP_LAST_SEPARATOR, SEPARATOR),
            ),
          ),
        );
      }
      allowedValuesGenerators.push(crawlUnion(allowedIntervalValuesGenerators));
    },
};
