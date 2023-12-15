import { Collection as DBCollection } from './models/collection';
import type { TCollection } from './types/collection';

export { DB } from './models/db';
export type { IStorage } from './types/storage';
export { StoreInMemory } from './utils/store-in-memory';
export type Collection<
  TValue extends TCollection,
  TIndexes extends string & keyof TValue,
> = DBCollection<TValue, TIndexes>;
