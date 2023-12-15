import type { JValue } from 'radix-ts';

export type TValue = { id: string } & Record<string, unknown> & JValue;
