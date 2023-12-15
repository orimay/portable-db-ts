import { SEPARATOR, STRIP_LAST_SEPARATOR } from '../constants';
import { DBRule } from '../types/db-rule';
import { combinations } from '../utils/combinations';
import { crawlIntersection } from '../utils/generator';

// TODO: Cover by tests
export const dbRuleEveryPrefix: DBRule = {
  fails:
    ({ everyPrefix }) =>
    ({ values }) =>
      everyPrefix !== undefined &&
      !everyPrefix.every(prefix =>
        values.map(value => value.slice(0, prefix.length)).includes(prefix),
      ),
  loop:
    ({ everyPrefix }) =>
    (allowedValuesGenerators, fastLoop, _prefix, path) => {
      if (everyPrefix === undefined || !everyPrefix.length) return;
      allowedValuesGenerators.push(
        crawlIntersection(
          everyPrefix.map(prefix =>
            combinations(
              fastLoop,
              fastLoop(
                {
                  prefix: path + prefix,
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
                (_id, node) => node.replace(STRIP_LAST_SEPARATOR, SEPARATOR),
              ),
            ),
          ),
        ),
      );
    },
};
