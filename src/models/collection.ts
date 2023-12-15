import { macrotask, pEvery } from 'async-utils-ts';
import { Cache } from 'cache-ts';
import { MutexRW } from 'mutex-ts';
import type { Query } from 'radix-ts';
import { Radix } from 'radix-ts';
import {
  AFTER_SEPARATOR,
  IN_ARRAY_PERSISTANCE_MARKER,
  SEPARATOR,
  STRIP_LAST_SEPARATOR,
} from '../constants';
import { rules } from '../rules';
import type { TCollection } from '../types/collection';
import type { IndexOfCollection } from '../types/index-of-collection';
import type { TQueryAll } from '../types/query-all';
import type { TSelectQuery } from '../types/select-query';
import { crawlIntersection } from '../utils/generator';
import { IndexRule } from '../utils/index-rule';
import { order } from '../utils/sorting';

export class Collection<
  TValue extends TCollection,
  TIndexes extends string & keyof TValue,
> {
  private readonly m_indexes: Map<string, (value: TValue[TIndexes]) => string>;
  private m_cache: Cache<string, unknown>;
  private m_path: string;

  constructor(
    private readonly name: string,
    cacheCapacity: number,
    private m_mutex: MutexRW,
    private m_radix: Radix,
    indexes: Pick<IndexOfCollection<TValue>, TIndexes>,
    private fastLoop: <TFilter extends Query>(
      filter: TFilter,
      update: (args: {
        filter: TFilter;
        same: boolean;
        lastId: string | undefined;
        node: string;
      }) => void,
      alter?: ((id: string, _node: string) => string) | undefined,
    ) => AsyncGenerator<
      string,
      void,
      {
        value: string | undefined;
        same: boolean;
      }
    >,
  ) {
    this.m_indexes = new Map(
      Object.entries(indexes).map(([index, rule]) => [
        index,
        IndexRule[rule as keyof typeof IndexRule] as (
          value: TValue[TIndexes],
        ) => string,
      ]),
    );
    this.m_path = name + SEPARATOR;
    this.m_cache = new Cache(cacheCapacity);
  }

  /**
   * Selects for record ids in the collection based on the specified query.
   * @param query An optional query object.
   * @returns An array of matching record ids.
   */
  public async selectIds(query?: TSelectQuery<TValue, TIndexes>) {
    const result: string[] = [];
    for await (const id of this.selectIdsSequential(query)) {
      result.push(id);
    }
    return result;
  }

  /**
   * Selects records in the collection based on the specified query.
   * @param query An optional query object.
   * @returns An array of matching records.
   */
  public async select(query?: TSelectQuery<TValue, TIndexes>) {
    const result: TValue[] = [];
    for await (const record of this.selectSequential(query)) {
      result.push(record);
    }
    return result;
  }

  /**
   * Asynchronously yields matching records based on the specified query.
   * @param query An optional query object.
   * @yields Asynchronously yields matching records.
   */
  public async *selectSequential(
    query?: TSelectQuery<TValue, TIndexes>,
  ): AsyncGenerator<TValue, void, unknown> {
    for await (const id of this.selectIdsSequential(query)) {
      yield (await this.get(id)) as TValue;
    }
  }

  /**
   * Asynchronously yields matching record ids based on the specified query.
   * @param query An optional query object.
   * @yields Asynchronously yields matching record ids.
   */
  public async *selectIdsSequential(
    query?: TSelectQuery<TValue, TIndexes>,
  ): AsyncGenerator<string, void, unknown> {
    const whereNoRulesApplied = (query?.where ?? {}) as Record<
      TIndexes,
      TQueryAll<TValue[TIndexes]> & { ruledEq?: string }
    >;
    const where = {} as Record<TIndexes, TQueryAll<string>>;
    const orderBy = Object.entries(query?.orderBy ?? {}) as [
      TIndexes,
      1 | -1,
    ][];
    const indexes = new Map<string, (value: TValue[TIndexes]) => string>();
    for (const [name, rule] of this.m_indexes) {
      const filters = whereNoRulesApplied[name as TIndexes];
      if (filters) {
        const whereIndex = Object.entries({
          everyEq:
            filters.everyEq !== undefined
              ? filters.everyEq.map(rule)
              : undefined,
          everyPrefix:
            filters.everyPrefix !== undefined
              ? filters.everyPrefix.map(rule)
              : undefined,
          in: filters.in !== undefined ? filters.in.map(rule) : undefined,
          out: filters.out !== undefined ? filters.out.map(rule) : undefined,
          eq: filters.eq !== undefined ? rule(filters.eq) : undefined,
          gt: filters.gt !== undefined ? rule(filters.gt) : undefined,
          gte: filters.gte !== undefined ? rule(filters.gte) : undefined,
          lt: filters.lt !== undefined ? rule(filters.lt) : undefined,
          lte: filters.lte !== undefined ? rule(filters.lte) : undefined,
          prefix:
            filters.prefix !== undefined ? rule(filters.prefix) : undefined,
          empty: filters.empty,
        }).filter(([, value]) => value !== undefined);
        if (whereIndex.length) {
          where[name as TIndexes] = Object.fromEntries(whereIndex);
        }
        indexes.set(name, rule);
      } else if (query?.orderBy?.[name as TIndexes]) {
        indexes.set(name, rule);
      }
    }
    yield* this.doSearch({
      collection: this.name,
      where,
      limit: query?.limit,
      offset: query?.offset,
      orderBy,
    });
  }

  private async *doSearch(request: {
    collection: string;
    where: {
      [index: string]: TQueryAll<string>;
    };
    orderBy: [TIndexes, 1 | -1][];
    offset?: number;
    limit?: number;
  }): AsyncGenerator<string, void, unknown> {
    const radix = this.m_radix;
    let loop = true;
    const orderBy = request?.orderBy;
    const offset = request?.offset ?? 0;
    const limit = request?.limit ?? Infinity;

    const gen = sorted(this)();
    const release = await this.m_mutex.obtainRO();
    try {
      let yieldedCnt = 0;
      const filterIndexesCrawling = this.getFilterIndexesCrawling(
        request.where,
      );
      const crw = filterIndexesCrawling.length
        ? crawled(this, filterIndexesCrawling)
        : new Promise<string[]>(() => {});
      do {
        // Options for testing purposes: crawling only vs sorting only
        // const d = await Promise.race([crw]);

        // const d = await Promise.race([gen.next()]);
        // const d = filterIndexesCrawling.length ? await crw : await gen.next();
        const d = await Promise.race([gen.next(), crw]);
        if (Array.isArray(d)) {
          // It's crawled
          for (const item of d.slice(yieldedCnt)) {
            yield item;
          }
          loop = false;
        } else {
          // It's sorted
          if (d.done) {
            loop = false;
          } else {
            yield d.value;
            if (++yieldedCnt === request.limit) {
              loop = false;
            }
          }
        }
      } while (loop);
    } finally {
      await gen.return();
      release();
    }

    function sorted(collection: Collection<TValue, TIndexes>) {
      const filterIndexesSorting = collection.getFilterIndexesSorting(
        request.where,
      );
      return orderBy.length
        ? orderBy.length > 1
          ? // recursive sorting by multiple indexes
            async function* (): AsyncGenerator<string, void, unknown> {
              const [[key, sort], ...orderThen] = orderBy;
              const pathSorted = collection.m_path + key + SEPARATOR;
              let offset = request.offset ?? 0;
              let after: string | undefined = undefined;
              do {
                const oldAfter: string | undefined = after;
                after = undefined;
                for await (const [path] of radix.loop<string>({
                  prefix: pathSorted,
                  sort,
                  ...oldAfter !== undefined
                    ? sort > 0
                      ? { gt: oldAfter + AFTER_SEPARATOR }
                      : { lt: oldAfter }
                    : {},
                })) {
                  if (!loop) break;
                  const indexValue = path.split(SEPARATOR)[2];
                  after = path.replace(STRIP_LAST_SEPARATOR, '');
                  await macrotask(); // Allow crawling to catch up
                  for await (const id of collection.doSearch({
                    ...request,
                    orderBy: orderThen,
                    where: {
                      ...request.where,
                      [key]: {
                        ...request.where?.[key],
                        eq: indexValue,
                      },
                    },
                  })) {
                    if (!loop) break;
                    if (offset) {
                      --offset;
                      continue;
                    }
                    yield id;
                  }
                  break;
                }
              } while (after);
            }
          : // sorting by single index
            async function* () {
              const [[key, sort]] = orderBy;
              const pathSorted = collection.m_path + key + SEPARATOR;
              let offset = request?.offset ?? 0;
              for await (const [, id] of radix.loop<string>({
                prefix: pathSorted,
                sort,
              })) {
                if (!loop) break;
                if (await pEvery(filterIndexesSorting, has => has(id))) {
                  if (!loop) break;
                  if (offset) {
                    --offset;
                    continue;
                  }
                  yield id;
                }
              }
            }
        : // no sorting needed
          async function* () {
            let offset = request?.offset ?? 0;
            for await (const [, id] of radix.loop<string>({
              prefix: collection.m_path + 'id',
            })) {
              if (!loop) break;
              if (await pEvery(filterIndexesSorting, has => has(id))) {
                if (!loop) break;
                if (offset) {
                  --offset;
                  continue;
                }
                yield id;
              }
            }
          };
    }

    // TODO: use ids instead of values when no sorting
    async function crawled(
      collection: Collection<TValue, TIndexes>,
      filterIndexesCrawling: AsyncGenerator<
        string,
        void,
        {
          value: string | undefined;
          same: boolean;
        }
      >[],
    ) {
      const values: Promise<TValue>[] = [];
      for await (const id of crawlIntersection(filterIndexesCrawling)) {
        if (!loop) return [];
        if (id === undefined) break;
        const value = collection.m_cache.get(id) as TValue;
        values.push(
          value
            ? Promise.resolve(value)
            : (radix.get<TValue>(
                collection.m_path + SEPARATOR + id,
              ) as Promise<TValue>),
        );
      }
      let result = await Promise.all(values);
      if (!loop) return [];
      if (orderBy.length) {
        const compare = (a: Awaited<TValue>, b: Awaited<TValue>) =>
          orderBy.reduce(
            (r, [index, sort]) =>
              (a, b) => {
                const rule = collection.m_indexes.get(index) as (
                  value: TValue[TIndexes],
                ) => string;
                return r(a, b) || order(rule(a[index]), rule(b[index]), sort);
              },
            (_a: Awaited<TValue>, _b: Awaited<TValue>): number => 0,
          )(a, b) || order(a.id, b.id, orderBy[orderBy.length - 1][1]);
        result.sort(compare); // apply sorting rule
        result = result.slice(offset, offset + limit);
      } else {
        result = result.slice(offset, offset + limit);
      }
      return result.map(({ id }) => id);
    }
  }

  private getFilterIndexesSorting(where: {
    [index: string]: TQueryAll<string>;
  }) {
    return Object.entries(where).map(([key, query]) => {
      const rule = this.m_indexes.get(key) as (
        value: TValue[TIndexes],
      ) => string;

      return async (id: string) => {
        let record = this.m_cache.get(id) as TValue;
        if (!record) {
          record = (await this.m_radix.get<TValue>(
            this.m_path + SEPARATOR + id,
          )) as TValue;
          this.m_cache.set(id, record);
        }
        const v = record[key as TIndexes] as
          | TValue[TIndexes]
          | TValue[TIndexes][];

        const [value, values] = (Array.isArray(v)
          ? [undefined, v.map(v => rule(v as TValue[TIndexes]))]
          : [rule(v), undefined]) as unknown as [string, string[]];

        return !rules.some(rule => rule.fails(query)({ value, values }));
      };
    });
  }

  private getFilterIndexesCrawling(where: {
    [index: string]: TQueryAll<string>;
  }) {
    return Object.entries(where).flatMap(([key, query]) => {
      const path = this.m_path + key + SEPARATOR;

      const allowedValuesGenerators: AsyncGenerator<
        string,
        void,
        { value: string | undefined; same: boolean }
      >[] = [];

      let prefix = path;
      for (const rule of rules) {
        if (rule.prefix) {
          const newPrefix = rule.prefix(query)(path);
          if (newPrefix !== undefined) {
            prefix = newPrefix;
            break;
          }
        }
      }

      rules.forEach(rule =>
        rule.loop(query)(allowedValuesGenerators, this.fastLoop, prefix, path),
      );

      // TODO: Full text select by sequenced terms, taking each term length into account
      // Intersection of unions of all sequenced combinations of term indexes?
      // const sequence = [''];
      // const POSITIONED_SEPARATOR = '#'; // TODO: Replace with nonprintable character as on the top of the file
      // if (sequence !== undefined) {
      //   allowedValuesGenerators.push(async function* () {
      //     const lastIndex = 0;
      //     let lastValue: undefined | string = undefined;
      //     next: for await (const [node] of radix.loop<string>({
      //       ...staticQuery,
      //       gt: lastValue ? lastValue + AFTER_SEPARATOR : lastValue,
      //     })) {
      //       const [value, indexStr] = node.replace(STRIP_LAST_SEPARATOR, '').split(POSITIONED_SEPARATOR);
      //       const index = +indexStr;
      //       if (lastValue === value) continue next;
      //       yield value + SEPARATOR;
      //       lastValue = value;
      //     }
      //   });
      // }

      if (!allowedValuesGenerators.length) {
        allowedValuesGenerators.push(
          this.fastLoop(
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
        // throw new Error('No filters matched or applied');
      }

      return allowedValuesGenerators;
    });
  }

  /**
   * Retrieves the record with the specified id.
   * @param id The id of the record to retrieve.
   * @returns The record with the specified id.
   */
  public async get(id: string) {
    const release = await this.m_mutex.obtainRO();
    try {
      let value = this.m_cache.get(id) as TValue | undefined;
      if (value) return value;
      value = (await this.m_radix.get(this.m_path + SEPARATOR + id)) as
        | TValue
        | undefined;
      this.m_cache.set(id, value);
      return value;
    } finally {
      release();
    }
  }

  /**
   * Sets the value for the record with the specified id.
   * @param id The id of the record.
   * @param value The value to set for the record.
   * @returns An array of keys that were changed.
   */
  public async set(id: string, value: TValue) {
    // TODO: Apply validator
    return await this.setNoValidation(id, value);
  }

  /**
   * Sets the value for the record with the specified id without applying validation.
   * @param id The id of the record.
   * @param value The value to set for the record.
   * @returns An array of keys that were changed.
   */
  public async setNoValidation(id: string, value: TValue) {
    const keysChanged = (await this.updateIndexAndValue(id, value)) as string[];

    for (const callback of this.m_watchCollection) {
      callback(id, value);
    }
    for (const key of keysChanged) {
      const keyCallbacks = this.m_watchCollectionKey.get(key);
      if (keyCallbacks) {
        for (const callback of keyCallbacks) {
          callback(id, key);
        }
      }
    }

    return keysChanged;
  }

  /**
   * Deletes the record with the specified id.
   * @param id The id of the record to delete.
   * @returns `true` if the record was deleted, `false` otherwise.
   */
  public async del(id: string) {
    const deleted = (await this.updateIndexAndValue(id, undefined)) as boolean;

    if (deleted) {
      for (const callback of this.m_watchCollection) {
        callback(id, undefined);
      }
    }
    return deleted;
  }

  // TODO: cover with tests
  // TODO: remove old, non-existing indexes
  /**
   * Reindexes the entire database.
   */
  public async reindex() {
    const toReindex: TValue[] = [];
    for await (const [, value] of this.m_radix.loop<TValue>({
      prefix: this.m_path + SEPARATOR,
    })) {
      toReindex.push(value);
    }
    await Promise.all(
      toReindex.map(value => this.updateIndexAndValue(value.id, value)),
    );
  }

  private indexPath(key: string, value: string, id: string) {
    return this.m_path + key + SEPARATOR + value + SEPARATOR + id;
  }

  private async updateIndexAndValue(id: string, valueNew: TValue | undefined) {
    const keysChanged = [];
    const release = await this.m_mutex.obtainRW();
    try {
      const key = this.m_path + SEPARATOR + id;

      // Update index
      const valueOld = await this.m_radix.get<TValue>(key); // if we use cache here, we'll start losing indexes
      for (const [key, rule] of this.m_indexes) {
        if (valueOld?.[key as TIndexes] === valueNew?.[key as TIndexes])
          continue;

        const valuesOld = valueOld
          ? Array.isArray(valueOld[key as TIndexes])
            ? [
                IN_ARRAY_PERSISTANCE_MARKER +
                  ((valueOld[key as TIndexes] as []).length ? '1' : '0'),
                ...(valueOld[key as TIndexes] as []),
              ]
            : [valueOld[key as TIndexes]]
          : [];

        const valuesNew = valueNew
          ? Array.isArray(valueNew[key as TIndexes])
            ? [
                IN_ARRAY_PERSISTANCE_MARKER +
                  ((valueNew[key as TIndexes] as []).length ? '1' : '0'),
                ...(valueNew[key as TIndexes] as []),
              ]
            : [valueNew[key as TIndexes]]
          : [];

        for (
          let i = Math.max(valuesOld.length, valuesNew.length);
          i > -1;
          --i
        ) {
          let value = valuesOld[i];
          const valueOld =
            value === undefined
              ? undefined
              : value === null
              ? null
              : typeof value === 'string' &&
                value[0] === IN_ARRAY_PERSISTANCE_MARKER
              ? value
              : (rule as (value: unknown) => string)(value);

          value = valuesNew[i];
          const valueNew =
            value === undefined
              ? undefined
              : value === null
              ? null
              : typeof value === 'string' &&
                value[0] === IN_ARRAY_PERSISTANCE_MARKER
              ? value
              : (rule as (value: unknown) => string)(value);

          if (valueNew !== valueOld) {
            let valueChanged = true;
            if (valueOld !== undefined) {
              const indexOld = this.indexPath(key, valueOld ?? '\x00', id);
              await this.m_radix.del(indexOld);
            } else valueChanged = false;
            if (valueNew !== undefined) {
              const indexNew = this.indexPath(key, valueNew ?? '\x00', id);
              await this.m_radix.set(indexNew, id);
            } else valueChanged = false;
            valueChanged && keysChanged.push(key);
          }
        }
      }
      if (valueNew === undefined) {
        this.m_cache.delete(id);
        await this.m_radix.del(this.m_path + id);
        await this.m_radix.del(
          this.m_path + 'id' + SEPARATOR + id + SEPARATOR + id,
        );
        return await this.m_radix.del(key);
      } else {
        this.m_cache.set(id, valueNew);
        if (valueOld === undefined) {
          await this.m_radix.set(
            this.m_path + 'id' + SEPARATOR + id + SEPARATOR + id,
            id,
          );
        }
        await this.m_radix.set(key, valueNew);
      }
    } finally {
      release();
    }
    return keysChanged;
  }

  private readonly m_watchCollection = new Set<
    (id: string, value: TValue | undefined) => void
  >();
  private readonly m_watchCollectionKey = new Map<
    string,
    Set<(id: string, key: string) => void>
  >();

  // TODO: Cover with tests
  /**
   * Watches for changes in the collection and invokes the specified callback when changes occur.
   * @param callback The callback function to be called when changes occur for a specific key or keys.
   * @returns A function to stop watching.
   */
  public watch(callback: (id: string) => void): () => void;

  /**
   * Watches for changes in the collection and invokes the specified callback when changes occur.
   * @param key The key to watch for changes.
   * @param callback The callback function to be called when changes occur for a specific key or keys.
   * @returns A function to stop watching.
   */
  public watch(
    key: TIndexes,
    callback: (id: string, key: string) => void,
  ): () => void;

  /**
   * Watches for changes in the collection and invokes the specified callback when changes occur.
   * @param keys An array of keys to watch for changes.
   * @param callback The callback function to be called when changes occur for a specific key or keys.
   * @returns A function to stop watching.
   */
  public watch(
    keys: TIndexes[],
    callback: (id: string, key: string) => void,
  ): () => void;

  public watch(
    keyOrKeysOrCallback: string | string[] | ((id: string) => void),
    callback?: (id: string, key: string) => void,
  ) {
    if (typeof keyOrKeysOrCallback === 'string') {
      keyOrKeysOrCallback = [keyOrKeysOrCallback];
    }
    if (Array.isArray(keyOrKeysOrCallback)) {
      const keys = keyOrKeysOrCallback;
      const cb = callback as (id: string) => void;
      for (const key of keys) {
        let watchers = this.m_watchCollectionKey.get(key);
        if (watchers === undefined) {
          this.m_watchCollectionKey.set(key, watchers = new Set());
        }
        watchers.add(cb);
      }
      return () => {
        for (const key of keys) {
          this.m_watchCollectionKey.get(key)?.delete(cb);
        }
      };
    }

    const cb = keyOrKeysOrCallback;
    this.m_watchCollection.add(cb);
    return () => {
      this.m_watchCollection.delete(cb);
    };
  }
}
