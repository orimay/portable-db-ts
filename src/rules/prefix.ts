import { SEPARATOR, STRIP_LAST_SEPARATOR } from '../constants';
import { DBRule } from '../types/db-rule';

export const dbRulePrefix: DBRule = {
  fails:
    ({ prefix }) =>
    ({ value }) =>
      prefix !== undefined && value.slice(0, prefix.length) !== prefix,
  prefix:
    ({ prefix }) =>
    path =>
      prefix === undefined ? undefined : path + prefix,
  loop:
    ({ prefix }) =>
    (allowedValuesGenerators, fastLoop, cachedPrefix) => {
      if (prefix === undefined) return;
      allowedValuesGenerators.push(
        fastLoop(
          {
            prefix: cachedPrefix,
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
        ),
      );
    },
};
