import { IndexRule } from '../utils/index-rule';

export type IndexOfCollection<TCollection> = Partial<{
  [TIndex in string & keyof TCollection]: keyof typeof IndexRule;
}>;
