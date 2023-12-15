import { IndexRule } from '../utils/index-rule';
import { TIndexes } from './indexes';
import { TQueryAll } from './query-all';
import { TValue } from './value';

export type TRequest =
  | {
      type: 'collection';
      name: string;
      cacheCapacity: number;
      indexes: Partial<{ [name: string]: keyof typeof IndexRule }>;
    }
  | { type: 'get'; record: string }
  | { type: 'set'; record: string; value: TValue | undefined }
  | { type: 'get'; collection: string; id: string }
  | { type: 'del'; collection: string; id: string }
  | { type: 'set'; collection: string; id: string; value: TValue }
  | { type: 'reindex'; collection: string }
  | {
      type: 'search';
      collection: string;
      where: {
        [index: string]: TQueryAll<string>;
      };
      orderBy: [TIndexes, 1 | -1][];
      offset?: number;
      limit?: number;
    }
  | { type: 'yield' }
  | { type: 'return' };
