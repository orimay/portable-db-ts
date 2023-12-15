import type { Query } from 'radix-ts';
import { TQueryAll } from './query-all';

export type DBRule = {
  fails: (
    query: TQueryAll<string>,
  ) => ({ value, values }: { value: string; values: string[] }) => boolean;
  prefix?: (query: TQueryAll<string>) => (path: string) => string | undefined;
  loop: (query: TQueryAll<string>) => (
    allowedValuesGenerators: AsyncGenerator<
      string,
      void,
      {
        value: string | undefined;
        same: boolean;
      }
    >[],
    fastLoop: <TFilter extends Query>(
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
    prefix: string,
    path: string,
  ) => void;
};
