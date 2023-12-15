import { TCollection } from './collection';

export type TSelectQuery<
  TValue extends TCollection,
  TIndexes extends string & keyof TValue,
> = {
  where?: {
    [TIndexKey in TIndexes]?: TValue[TIndexKey] extends Array<unknown>
      ? {
          everyEq?: TValue[TIndexKey];
          everyPrefix?: TValue[TIndexKey];
          empty?: boolean;
        }
      : object &
          (TValue[TIndexKey] extends boolean
            ? {
                eq?: TValue[TIndexKey];
              }
            : {
                gt?: TValue[TIndexKey];
                gte?: TValue[TIndexKey];
                lt?: TValue[TIndexKey];
                lte?: TValue[TIndexKey];
              } & (
                | {
                    prefix?: never;
                    eq?: never;
                    in?: TValue[TIndexKey][];
                    out?: TValue[TIndexKey][];
                  }
                | {
                    prefix?: never;
                    eq?: TValue[TIndexKey];
                    in?: never;
                    out?: never;
                  }
                | {
                    prefix?: TValue[TIndexKey];
                    eq?: never;
                    in?: never;
                    out?: never;
                  }
              ));
  };
  offset?: number;
  limit?: number;
  orderBy?: { [TIndexKey in TIndexes]?: 1 | -1 };
};
