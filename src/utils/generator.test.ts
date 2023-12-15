import { describe, expect, it } from 'vitest';
import { crawlIntersection, crawlUnion } from './generator';

describe('crawlIntersection', () => {
  it.concurrent('yields intersection of input generators', async () => {
    async function* generatorA(): AsyncGenerator<string> {
      yield 'a';
      yield 'b';
      yield 'g';
      yield 'o';
      yield 'y';
      yield 'z';
    }

    async function* generatorB(): AsyncGenerator<string> {
      yield 'a';
      yield 'o';
      yield 'q';
      yield 't';
      yield 'u';
      yield 'y';
      yield 'z';
    }

    const intersectionGenerator = crawlIntersection([
      generatorA(),
      generatorB(),
    ]);

    const result: string[] = [];
    for await (const value of intersectionGenerator) {
      result.push(value);
    }

    expect(result).toEqual(['a', 'o', 'y', 'z']);
  });
});

describe('crawlUnion', () => {
  it.concurrent('yields union of input generators', async () => {
    async function* generatorA(): AsyncGenerator<string> {
      yield 'a';
      yield 'b';
      yield 'g';
      yield 'o';
      yield 'y';
      yield 'z';
    }

    async function* generatorB(): AsyncGenerator<string> {
      yield 'a';
      yield 'o';
      yield 'q';
      yield 't';
      yield 'u';
      yield 'y';
      yield 'z';
    }

    const unionGenerator = crawlUnion([generatorA(), generatorB()]);

    const result: string[] = [];
    for await (const value of unionGenerator) {
      result.push(value);
    }

    expect(result).toEqual(['a', 'b', 'g', 'o', 'q', 't', 'u', 'y', 'z']);
  });
});
