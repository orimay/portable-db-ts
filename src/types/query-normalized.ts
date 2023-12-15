import { TQueryAll } from './query-all';

export type TQueryNormalized = Exclude<TQueryAll<string>, 'every'>;
