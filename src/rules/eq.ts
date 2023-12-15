import { SEPARATOR } from '../constants';
import { DBRule } from '../types/db-rule';

export const dbRuleEq: DBRule = {
  fails:
    ({ eq }) =>
    ({ value }) =>
      eq !== undefined && value !== eq,
  prefix:
    ({ eq }) =>
    path =>
      eq === undefined ? undefined : path + eq + SEPARATOR,
  loop:
    ({ eq }) =>
    (allowedValuesGenerators, fastLoop, prefix) => {
      if (eq === undefined) return;
      allowedValuesGenerators.push(
        fastLoop(
          {
            prefix,
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
      );
    },
};
