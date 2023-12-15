import {
  IN_ARRAY_PERSISTANCE_MARKER,
  SEPARATOR,
  STRIP_LAST_SEPARATOR,
} from '../constants';
import { DBRule } from '../types/db-rule';

export const dbRuleEmpty: DBRule = {
  fails:
    ({ empty }) =>
    ({ values }) =>
      empty !== undefined &&
      (empty && !!values.length || !empty && !values.length),
  prefix:
    ({ empty }) =>
    path =>
      empty === undefined
        ? undefined
        : path + IN_ARRAY_PERSISTANCE_MARKER + (empty ? '0' : '1'),
  loop:
    ({ empty }) =>
    (allowedValuesGenerators, fastLoop, prefix) => {
      if (empty === undefined) return;
      allowedValuesGenerators.push(
        fastLoop(
          {
            prefix,
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
