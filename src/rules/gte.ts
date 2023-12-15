import { SEPARATOR, STRIP_LAST_SEPARATOR } from '../constants';
import { DBRule } from '../types/db-rule';
import { combinations } from '../utils/combinations';
import { max } from '../utils/sorting';

// TODO: Revise logic!
export const dbRuleGte: DBRule = {
  fails:
    ({ gte }) =>
    ({ value }) =>
      gte !== undefined && value < gte,
  loop:
    ({ gte }) =>
    (allowedValuesGenerators, fastLoop, prefix, path) => {
      if (gte === undefined) return;
      allowedValuesGenerators.push(
        combinations(
          fastLoop,
          fastLoop(
            {
              prefix,
              gte: path + gte,
              gt: undefined as string | undefined,
            },
            ({ same, filter, node, lastId: lastId }) => {
              if (same) {
                filter.gt = undefined;
                filter.gte = max(
                  path + gte,
                  node.replace(STRIP_LAST_SEPARATOR, SEPARATOR + lastId),
                );
              } else {
                filter.gt = node.replace(
                  STRIP_LAST_SEPARATOR,
                  SEPARATOR + lastId,
                );
                filter.gte = path + gte;
              }
            },
            (_id, node) => node.replace(STRIP_LAST_SEPARATOR, SEPARATOR),
          ),
        ),
      );
    },
};
