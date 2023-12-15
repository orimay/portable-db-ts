import { IStorage } from '../types/storage';

export class StoreInMemory implements IStorage {
  private store = new Map<string, unknown>();

  async get<T>(key: string) {
    return this.store.get(key) as T;
  }

  async set<T>(key: string, value: T) {
    this.store.set(key, value);
  }

  async del(key: string) {
    this.store.delete(key);
  }

  toString(pathsOnly = false) {
    return JSON.stringify(
      pathsOnly
        ? [...this.store.keys()]
        : Object.fromEntries(this.store.entries()),
      null,
      2,
    );
  }
}
