import { AFTER_SEPARATOR, SEPARATOR, STRIP_LAST_SEPARATOR } from '../constants';
import { DBRule } from '../types/db-rule';
import { combinations } from '../utils/combinations';
import { max } from '../utils/sorting';

// TODO: Revise logic!
export const dbRuleGt: DBRule = {
  fails:
    ({ gt }) =>
    ({ value }) =>
      gt !== undefined && value <= gt,
  loop:
    ({ gt }) =>
    (allowedValuesGenerators, fastLoop, prefix, path) => {
      if (gt === undefined) return;
      allowedValuesGenerators.push(
        combinations(
          fastLoop,
          fastLoop(
            {
              prefix,
              gte: undefined as string | undefined,
              gt: path + gt + AFTER_SEPARATOR,
            },
            ({ same, filter, node, lastId: lastId }) => {
              if (same) {
                filter.gte = node.replace(
                  STRIP_LAST_SEPARATOR,
                  SEPARATOR + lastId,
                );
                filter.gt = path + gt + AFTER_SEPARATOR;
              } else {
                filter.gte = undefined;
                filter.gt = max(
                  path + gt + AFTER_SEPARATOR,
                  node.replace(STRIP_LAST_SEPARATOR, SEPARATOR + lastId),
                );
              }
            },
            (_id, node) => node.replace(STRIP_LAST_SEPARATOR, SEPARATOR),
          ),
        ),
      );
    },
};
