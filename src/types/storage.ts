export interface IStorage {
  get<T extends object>(key: string): Promise<T | null>;
  set<T extends object>(key: string, value: T | null): Promise<void>;
  del(key: string): Promise<void>;
}
