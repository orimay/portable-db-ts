export type TQueryAll<T> = {
  everyEq?: T[];
  everyPrefix?: T[];
  eq?: T;
  in?: T[];
  out?: T[];
  gt?: T;
  gte?: T;
  lt?: T;
  lte?: T;
  prefix?: T;
  empty?: boolean;
};
