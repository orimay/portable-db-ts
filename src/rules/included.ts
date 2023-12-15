import { SEPARATOR } from '../constants';
import { DBRule } from '../types/db-rule';
import { crawlUnion } from '../utils/generator';

export const dbRuleIncluded: DBRule = {
  fails:
    ({ in: included }) =>
    ({ value }) =>
      included !== undefined && !included.includes(value),
  loop:
    ({ in: included }) =>
    (allowedValuesGenerators, fastLoop, _prefix, path) => {
      if (included === undefined) return;
      allowedValuesGenerators.push(
        crawlUnion(
          included.map(eq =>
            fastLoop(
              {
                prefix: path + eq + SEPARATOR,
                gte: undefined as string | undefined,
                gt: undefined as string | undefined,
              },
              ({ same, filter, lastId: lastId }) => {
                if (same) {
                  filter.gte = filter.prefix + lastId;
                  filter.gt = undefined;
                } else {
                  filter.gte = undefined;
                  filter.gt = filter.prefix + lastId;
                }
              },
            ),
          ),
        ),
      );
    },
};
