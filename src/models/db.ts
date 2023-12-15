import { MutexRW } from 'mutex-ts';
import { IStore, JValue, Query, Radix } from 'radix-ts';
import { SEPARATOR } from '../constants';
import { TCollection } from '../types/collection';
import { IndexOfCollection } from '../types/index-of-collection';
import { Collection } from './collection';

export class DB<
  TCollections extends {
    [collectionName: string]: TCollection;
  },
  TRecords extends Record<string, JValue>,
> {
  private m_radix: Radix;
  private m_mutex: MutexRW;

  /**
   * Initializes a new instance of the `DB` class.
   * @param store The storage interface to be used by the database.
   */
  public constructor(store: IStore) {
    this.m_radix = new Radix(store);
    this.m_mutex = new MutexRW();
  }

  /**
   * Returns a record object that provides methods for interacting with a specific key in the database.
   * @param key The key for the record.
   * @param getDefault A function to get the default value for the record.
   * @returns A record object that provides methods for interacting with a specific key in the database.
   */
  public record<
    TKey extends string & keyof TRecords,
    TRecord extends TRecords[TKey],
  >(key: TKey, getDefault: () => TRecord) {
    return {
      /**
       * Retrieves the value associated with the record key from the database.
       * @returns The Promise that resolves to the value associated with the record key.
       * If the key is not found in the database, the Promise resolves to the default
       * value obtained from the `getDefault` function provided during the record object creation.
       */
      get: async () =>
        (await this.m_radix.get(SEPARATOR + key) ?? getDefault()) as TRecord,
      /**
       * Either deletes the record if the value is undefined or sets the
       * value associated with the record key in the database to the provided value.
       * @param value The value to be set for the record. If set to `undefined`, it deletes the record.
       * @returns The Promise that resolves to the result of the operation. If value is `undefined`,
       * a Promise that resolves to `true` if the key was deleted, and `false` if the key was not found.
       * If value is provided, a Promise that resolves when the value is successfully set.
       */
      set: async (value: TRecord | undefined) =>
        value === undefined
          ? await this.m_radix.del(SEPARATOR + key)
          : await this.m_radix.set(SEPARATOR + key, value),
    };
  }

  /**
   * Creates an instance of the `Collection` class.
   * @param name The name of the collection.
   * @param indexes  Indexes for the collection.
   * @param cacheCapacity The capacity of the cache for the collection.
   * @returns An instance of the `Collection` class.
   */
  public async collection<
    TCollectionName extends string & keyof TCollections,
    TIndexes extends string & keyof Partial<TCollections[TCollectionName]>,
  >(
    name: TCollectionName,
    indexes: Pick<IndexOfCollection<TCollections[TCollectionName]>, TIndexes>,
    cacheCapacity = 1000,
  ) {
    return new Collection<TCollections[TCollectionName], TIndexes>(
      name,
      cacheCapacity,
      this.m_mutex,
      this.m_radix,
      indexes,
      this.fastLoop.bind(this),
    );
  }

  private async *fastLoop<TFilter extends Query>(
    filter: TFilter,
    update: (args: {
      filter: TFilter;
      same: boolean;
      lastId: string | undefined;
      node: string;
    }) => void,
    alter = (id: string, _node: string) => id,
  ) {
    while (true) {
      const gen = this.m_radix.loop<string>(filter);
      try {
        let { done, value } = await gen.next();
        if (done) return;
        let [node, id] = value as [string, string];
        let same: boolean;
        let lastId: string | undefined;
        do {
          ({ value: lastId, same } = yield alter(id, node));
          ({ done, value } = await gen.next());
          if (done) return;
          [node, id] = value as [string, string];
        } while (same === (lastId === id));
        update({ filter, same, lastId, node });
      } finally {
        await gen.return();
      }
    }
  }
}
