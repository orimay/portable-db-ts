import { SEPARATOR } from '../constants';
import { DBRule } from '../types/db-rule';
import { crawlIntersection } from '../utils/generator';

export const dbRuleEveryEq: DBRule = {
  fails:
    ({ everyEq }) =>
    ({ values }) =>
      everyEq !== undefined && !everyEq.every(eq => values.includes(eq)),
  loop:
    ({ everyEq }) =>
    (allowedValuesGenerators, fastLoop, _prefix, path) => {
      if (everyEq === undefined || !everyEq.length) return;
      allowedValuesGenerators.push(
        crawlIntersection(
          everyEq.map(eq =>
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
