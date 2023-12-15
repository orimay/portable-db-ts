import { min } from './sorting';

export async function* crawlIntersection(
  asyncGenerators: AsyncGenerator<
    string,
    void,
    { value: string | undefined; same: boolean } | undefined
  >[],
) {
  const values = new Map<
    AsyncGenerator<string, void, { value: string | undefined; same: boolean }>,
    string
  >();
  let bump = false;
  let lastMaxValue: string | undefined = undefined;
  try {
    recheck: while (true) {
      for (const generator of asyncGenerators) {
        let lastGeneratorValue = values.get(generator);
        if (lastGeneratorValue === undefined) {
          const { done, value } = await generator.next({
            value: lastMaxValue,
            same: false,
          });
          if (done) return;
          lastGeneratorValue = value;
        }
        if (lastMaxValue !== undefined) {
          while (lastGeneratorValue < lastMaxValue) {
            // catch up with other generators
            const { done, value } = await generator.next({
              value: lastMaxValue,
              same: true,
            });
            if (done) return;
            lastGeneratorValue = value;
          }
          if (bump && lastGeneratorValue === lastMaxValue) {
            const { done, value } = await generator.next({
              value: lastMaxValue,
              same: false,
            });
            if (done) return;
            lastGeneratorValue = value;
            bump = false;
          }
        }
        values.set(generator, lastGeneratorValue);
        const doRecheck =
          lastMaxValue !== undefined && lastMaxValue < lastGeneratorValue;
        lastMaxValue = lastGeneratorValue;
        if (doRecheck) continue recheck;
      }
      if (lastMaxValue === undefined) return;
      yield lastMaxValue;
      bump = true;
    }
  } finally {
    await Promise.all(asyncGenerators.map(generator => generator.return()));
  }
}

export async function* crawlUnion(
  asyncGenerators: AsyncGenerator<
    string,
    void,
    { value: string | undefined; same: boolean } | undefined
  >[],
): AsyncGenerator<
  string,
  void,
  { value: string | undefined; same: boolean } | undefined
> {
  const values = new Map<
    AsyncGenerator<
      string,
      void,
      { value: string | undefined; same: boolean } | undefined
    >,
    string
  >();
  let lastMinValue: string | undefined = undefined;
  try {
    let nextValue: { value: string | undefined; same: boolean } | undefined = {
      value: undefined,
      same: false,
    };
    while (true) {
      let minValue: string | undefined = undefined;
      checkGenerators: for (const generator of asyncGenerators) {
        let lastGeneratorValue = values.get(generator);
        if (lastGeneratorValue === undefined) {
          const { done, value } = await generator.next(nextValue);
          if (done) continue;
          lastGeneratorValue = value;
        }
        if (lastMinValue) {
          while (lastGeneratorValue <= lastMinValue) {
            const { done, value } = await generator.next(nextValue);
            if (done) continue checkGenerators;
            lastGeneratorValue = value;
          }
        }
        values.set(generator, lastGeneratorValue);
        minValue = min(minValue, lastGeneratorValue);
      }
      if (minValue == undefined) return;
      nextValue = yield minValue;
      lastMinValue = minValue;
    }
  } finally {
    await Promise.all(asyncGenerators.map(generator => generator.return()));
  }
}
