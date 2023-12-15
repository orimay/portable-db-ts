import { SEPARATOR, STRIP_LAST_SEPARATOR } from '../constants';
import { DBRule } from '../types/db-rule';
import { combinations } from '../utils/combinations';

export const dbRuleLt: DBRule = {
  fails:
    ({ lt }) =>
    ({ value }) =>
      lt !== undefined && value >= lt,
  loop:
    ({ lt }) =>
    (allowedValuesGenerators, fastLoop, prefix, path) => {
      if (lt === undefined) return;
      allowedValuesGenerators.push(
        combinations(
          fastLoop,
          fastLoop(
            {
              prefix,
              lt: path + lt,
              gte: undefined as string | undefined,
              gt: undefined as string | undefined,
            },
            ({ same, filter, node, lastId: lastId }) => {
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
            (_id, node) => node.replace(STRIP_LAST_SEPARATOR, SEPARATOR),
          ),
        ),
      );
    },
};
