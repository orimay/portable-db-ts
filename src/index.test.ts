import { JValue } from 'radix-ts';
import { describe, expect, it } from 'vitest';
import { DB } from './index';
import { IndexRule } from './utils/index-rule';
import { order } from './utils/sorting';
import { StoreInMemory } from './utils/store-in-memory';

const SKIP_NO_FILTER = false;

type TTask = {
  id: string;
  title: string;
  isDone: boolean;
  tags: string[];
  description: string;
  dateCreated: string;
  effort: number | null;
};

describe('db', () => {
  async function newTaskDbCollection() {
    return await new DB<
      {
        task: TTask;
      },
      Record<string, JValue>
    >(new StoreInMemory()).collection(
      'task',
      {
        title: 'stringNum',
        description: 'string',
        isDone: 'boolean',
        tags: 'string',
        dateCreated: 'stringNum',
        effort: 'number',
      },
      Infinity,
    );
  }

  function newTask(
    id: string,
    isDone: boolean,
    effort: number | null,
    tags: string[] = [],
  ) {
    return {
      id,
      title: `Task #${id}`,
      description: `Task #${id}`,
      isDone,
      tags,
      effort,
      dateCreated: Date.now().toString(),
    };
  }

  const tags = ['hobby', 'later', 'job'] as const;

  function newTaskSet() {
    return [
      ['1', newTask('1', true, null, [tags[0]])],
      ['2', newTask('2', false, null)],
      ['3', newTask('3', true, null, [tags[0], tags[1]])],
      ['4', newTask('4', true, null, [tags[1], tags[2]])], //
      ['5', newTask('5', false, 2, [tags[0], tags[1]])],
      ['6', newTask('6', false, -1, [tags[1], tags[2]])], //
      ['7', newTask('7', false, null, [tags[0]])],
      ['8', newTask('8', true, null)],
      ['9', newTask('9', false, 1, [tags[2], tags[1]])], //
      ['10', newTask('10', true, null, [tags[0]])],
      ['20', newTask('20', false, 2)],
      ['30', newTask('30', true, 2, [tags[0], tags[2], tags[1]])], //
      ['40', newTask('40', true, null, [tags[1], tags[2]])], //
      ['50', newTask('50', false, null, [tags[0], tags[1]])],
      ['60', newTask('60', false, -2, [tags[1], tags[2]])], //
      ['70', newTask('70', false, null, [tags[0]])],
      ['80', newTask('80', true, null)],
      ['90', newTask('90', false, null, [tags[2]])],
      ['100', newTask('100', true, -1, [tags[0]])],
      ['200', newTask('200', false, null)],
      ['300', newTask('300', true, null, [tags[0], tags[1]])],
      ['400', newTask('400', true, null, [tags[1], tags[2]])], //
      ['500', newTask('500', false, null, [tags[0], tags[1]])],
      ['600', newTask('600', false, null, [tags[1], tags[2]])], //
      ['700', newTask('700', false, null, [tags[0]])],
      ['800', newTask('800', true, -2)],
      ['900', newTask('900', false, -2, [tags[2]])],
    ] as const;
  }

  function comapre(a: [string, TTask], b: [string, TTask]) {
    return +(a[0] > b[0]) - 0.5;
  }

  // it('includes inserted array value', async () => {
  //   const cTask = await newTaskDbCollection();
  //   const tasks = newTaskSet();
  //   for (const [id, task] of tasks) {
  //     await cTask.set(id, task);
  //   }

  //   const includes = await cTask.includes('9', 'tags', tags[1]);
  //   expect(includes).toBeTruthy();
  // });

  // it("doesn't include non-inserted array value", async () => {
  //   const cTask = await newTaskDbCollection();
  //   const tasks = newTaskSet();
  //   for (const [id, task] of tasks) {
  //     await cTask.set(id, task);
  //   }

  //   const includes = await cTask.includes('9', 'tags', tags[0]);
  //   expect(includes).toBeFalsy();
  // });

  it.skipIf(SKIP_NO_FILTER)('selects all inserted ids', async () => {
    const cTask = await newTaskDbCollection();
    const tasks = newTaskSet();
    for (const [id, task] of tasks) {
      await cTask.set(id, task);
    }
    const result: [string, TTask][] = [];
    for await (const id of cTask.selectIdsSequential()) {
      result.push([id, (await cTask.get(id)) as TTask]);
    }

    expect(result).toEqual((tasks.slice() as [string, TTask][]).sort(comapre));
  });

  it.skipIf(SKIP_NO_FILTER)('selects all inserted values', async () => {
    const cTask = await newTaskDbCollection();
    const tasks = newTaskSet();
    for (const [id, task] of tasks) {
      await cTask.set(id, task);
    }
    const result: [string, TTask][] = [];
    for await (const task of cTask.selectSequential()) {
      result.push([task.id, task]);
    }

    expect(result).toEqual((tasks.slice() as [string, TTask][]).sort(comapre));
  });

  it.skipIf(SKIP_NO_FILTER)('selects with orderBy', async () => {
    const cTask = await newTaskDbCollection();
    const tasks = newTaskSet();
    for (const [id, task] of tasks) {
      await cTask.set(id, task);
    }
    const result: [string, TTask][] = [];
    for await (const id of cTask.selectIdsSequential({
      orderBy: { title: 1 },
    })) {
      result.push([id, (await cTask.get(id)) as TTask]);
    }

    expect(result).toEqual(
      (tasks.slice() as [string, TTask][]).sort(([a], [b]) => +a - +b),
    );
  });

  it.skipIf(SKIP_NO_FILTER)(
    'selects with orderBy and reverse sort',
    async () => {
      const cTask = await newTaskDbCollection();
      const tasks = newTaskSet();
      for (const [id, task] of tasks) {
        await cTask.set(id, task);
      }
      const result: [string, TTask][] = [];
      for await (const id of cTask.selectIdsSequential({
        orderBy: { title: -1 },
      })) {
        result.push([id, (await cTask.get(id)) as TTask]);
      }

      expect(result).toEqual(
        tasks
          .slice()
          .sort(([, { title: aTitle }], [, { title: bTitle }]) =>
            order(IndexRule.stringNum(aTitle), IndexRule.stringNum(bTitle), -1),
          ),
      );
    },
  );

  it.skipIf(SKIP_NO_FILTER)(
    'selects with orderBy and reverse sort on multiple fields',
    async () => {
      const cTask = await newTaskDbCollection();
      const tasks = newTaskSet();
      for (const [id, task] of tasks) {
        await cTask.set(id, task);
      }
      const result: [string, TTask][] = [];
      for await (const id of cTask.selectIdsSequential({
        orderBy: { isDone: -1, title: 1 },
      })) {
        result.push([id, (await cTask.get(id)) as TTask]);
      }

      expect(result).toEqual(
        tasks
          .slice()
          .sort(
            (
              [, { isDone: aIsDone, title: aTitle }],
              [, { isDone: bIsDone, title: bTitle }],
            ) =>
              order(
                IndexRule.boolean(aIsDone),
                IndexRule.boolean(bIsDone),
                -1,
              ) ||
              order(
                IndexRule.stringNum(aTitle),
                IndexRule.stringNum(bTitle),
                1,
              ),
          ),
      );
    },
  );

  it('selects with filter everyEq', async () => {
    const cTask = await newTaskDbCollection();
    const tasks = newTaskSet();
    for (const [id, task] of tasks) {
      await cTask.set(id, task);
    }

    const result: [string, TTask][] = [];
    for await (const id of cTask.selectIdsSequential({
      where: { tags: { everyEq: [tags[1], tags[2]] } },
    })) {
      result.push([id, (await cTask.get(id)) as TTask]);
    }

    expect(result.sort()).toEqual(
      tasks
        .filter(([, t]) => t.tags.includes(tags[1]) && t.tags.includes(tags[2]))
        .sort(),
    );
  });

  it('selects with filter empty true', async () => {
    const cTask = await newTaskDbCollection();
    const tasks = newTaskSet();
    for (const [id, task] of tasks) {
      await cTask.set(id, task);
    }

    const result: [string, TTask][] = [];
    for await (const id of cTask.selectIdsSequential({
      where: { tags: { empty: true } },
    })) {
      result.push([id, (await cTask.get(id)) as TTask]);
    }

    expect(result.sort()).toEqual(
      tasks.filter(([, t]) => !t.tags.length).sort(),
    );
  });

  it('selects with filter empty false', async () => {
    const cTask = await newTaskDbCollection();
    const tasks = newTaskSet();
    for (const [id, task] of tasks) {
      await cTask.set(id, task);
    }

    const result: [string, TTask][] = [];
    for await (const id of cTask.selectIdsSequential({
      where: { tags: { empty: false } },
    })) {
      result.push([id, (await cTask.get(id)) as TTask]);
    }

    expect(result.sort()).toEqual(
      tasks.filter(([, t]) => t.tags.length).sort(),
    );
  });

  it('selects with filter eq', async () => {
    const cTask = await newTaskDbCollection();
    const tasks = newTaskSet();
    for (const [id, task] of tasks) {
      await cTask.set(id, task);
    }

    const result: [string, TTask][] = [];
    for await (const id of cTask.selectIdsSequential({
      where: { isDone: { eq: false } },
    })) {
      result.push([id, (await cTask.get(id)) as TTask]);
    }

    expect(result.sort()).toEqual(tasks.filter(([, t]) => !t.isDone).sort());
  });

  it('selects with filter gt', async () => {
    const cTask = await newTaskDbCollection();
    const tasks = newTaskSet();
    for (const [id, task] of tasks) {
      await cTask.set(id, task);
    }

    const result: [string, TTask][] = [];
    for await (const id of cTask.selectIdsSequential({
      where: { description: { gt: 'Task #50' } },
    })) {
      result.push([id, (await cTask.get(id)) as TTask]);
    }

    expect(result.sort()).toEqual(
      tasks.filter(([, t]) => t.description > 'Task #50').sort(),
    );
  });

  it('selects with filter gte', async () => {
    const cTask = await newTaskDbCollection();
    const tasks = newTaskSet();
    for (const [id, task] of tasks) {
      await cTask.set(id, task);
    }

    const result: [string, TTask][] = [];
    for await (const id of cTask.selectIdsSequential({
      where: { description: { gte: 'Task #50' } },
    })) {
      result.push([id, (await cTask.get(id)) as TTask]);
    }

    expect(result.sort()).toEqual(
      tasks.filter(([, t]) => t.description >= 'Task #50').sort(),
    );
  });

  it('selects with filter lt', async () => {
    const cTask = await newTaskDbCollection();
    const tasks = newTaskSet();
    for (const [id, task] of tasks) {
      await cTask.set(id, task);
    }

    const result: [string, TTask][] = [];
    for await (const id of cTask.selectIdsSequential({
      where: { description: { lt: 'Task #60' } },
    })) {
      result.push([id, (await cTask.get(id)) as TTask]);
    }

    expect(result.sort()).toEqual(
      tasks.filter(([, t]) => t.description < 'Task #60').sort(),
    );
  });

  it('selects with filter lte', async () => {
    const cTask = await newTaskDbCollection();
    const tasks = newTaskSet();
    for (const [id, task] of tasks) {
      await cTask.set(id, task);
    }

    const result: [string, TTask][] = [];
    for await (const id of cTask.selectIdsSequential({
      where: { description: { lte: 'Task #60' } },
    })) {
      result.push([id, (await cTask.get(id)) as TTask]);
    }

    expect(result.sort()).toEqual(
      tasks.filter(([, t]) => t.description <= 'Task #60').sort(),
    );
  });

  it('selects with filter in', async () => {
    const cTask = await newTaskDbCollection();
    const tasks = newTaskSet();
    for (const [id, task] of tasks) {
      await cTask.set(id, task);
    }

    const result: [string, TTask][] = [];
    for await (const id of cTask.selectIdsSequential({
      where: { effort: { in: [-2, 2] } },
    })) {
      result.push([id, (await cTask.get(id)) as TTask]);
    }

    expect(result.sort()).toEqual(
      tasks.filter(([, t]) => [-2, 2].includes(t.effort as number)).sort(),
    );
  });

  it('selects with filter out', async () => {
    const cTask = await newTaskDbCollection();
    const tasks = newTaskSet();
    for (const [id, task] of tasks) {
      await cTask.set(id, task);
    }

    const result: [string, TTask][] = [];
    for await (const id of cTask.selectIdsSequential({
      where: { effort: { out: [2, -2] } },
    })) {
      result.push([id, (await cTask.get(id)) as TTask]);
    }

    expect(result.sort()).toEqual(
      tasks.filter(([, t]) => ![-2, 2].includes(t.effort as number)).sort(),
    );
  });

  it('selects with filter prefix', async () => {
    const cTask = await newTaskDbCollection();
    const tasks = newTaskSet();
    for (const [id, task] of tasks) {
      await cTask.set(id, task);
    }

    const result: [string, TTask][] = [];
    for await (const id of cTask.selectIdsSequential({
      where: { description: { prefix: 'Task #10' } },
    })) {
      result.push([id, (await cTask.get(id)) as TTask]);
    }

    expect(result.sort()).toEqual(
      tasks.filter(([, t]) => t.description.includes('Task #10')).sort(),
    );
  });

  it.skipIf(SKIP_NO_FILTER)('selects with limit', async () => {
    const cTask = await newTaskDbCollection();
    const tasks = newTaskSet();
    for (const [id, task] of tasks) {
      await cTask.set(id, task);
    }

    const result: [string, TTask][] = [];
    for await (const id of cTask.selectIdsSequential({
      limit: 15,
      orderBy: { title: 1 },
    })) {
      result.push([id, (await cTask.get(id)) as TTask]);
    }

    expect(result.sort()).toEqual(tasks.slice(0, 15).sort());
  });

  it.skipIf(SKIP_NO_FILTER)('selects with offset', async () => {
    const cTask = await newTaskDbCollection();
    const tasks = newTaskSet();
    for (const [id, task] of tasks) {
      await cTask.set(id, task);
    }

    const result: [string, TTask][] = [];
    for await (const id of cTask.selectIdsSequential({
      offset: 15,
      orderBy: { title: 1 },
    })) {
      result.push([id, (await cTask.get(id)) as TTask]);
    }

    expect(result).toEqual(
      tasks
        .slice()
        .sort(([, { title: aTitle }], [, { title: bTitle }]) =>
          order(IndexRule.stringNum(aTitle), IndexRule.stringNum(bTitle), 1),
        )
        .slice(15),
    );
  });

  it.skipIf(SKIP_NO_FILTER)('selects with limit and offset', async () => {
    const cTask = await newTaskDbCollection();
    const tasks = newTaskSet();
    for (const [id, task] of tasks) {
      await cTask.set(id, task);
    }

    const result: [string, TTask][] = [];
    for await (const id of cTask.selectIdsSequential({
      offset: 4,
      limit: 7,
      orderBy: { title: 1 },
    })) {
      result.push([id, (await cTask.get(id)) as TTask]);
    }

    expect(result.sort()).toEqual(tasks.slice(4, 4 + 7).sort());
  });

  it.skipIf(SKIP_NO_FILTER)('selects with limit, offset and sort', async () => {
    const cTask = await newTaskDbCollection();
    const tasks = newTaskSet();
    for (const [id, task] of tasks) {
      await cTask.set(id, task);
    }

    const result: [string, TTask][] = [];
    for await (const id of cTask.selectIdsSequential({
      offset: 4,
      limit: 7,
      orderBy: { title: -1 },
    })) {
      result.push([id, (await cTask.get(id)) as TTask]);
    }

    expect(result.sort()).toEqual(
      tasks
        .slice()
        .reverse()
        .slice(4, 4 + 7)
        .sort(),
    );
  });

  it('selects with limit, offset, sort and eq filter', async () => {
    const cTask = await newTaskDbCollection();
    const tasks = newTaskSet();
    for (const [id, task] of tasks) {
      await cTask.set(id, task);
    }

    const result: [string, TTask][] = [];
    for await (const id of cTask.selectIdsSequential({
      offset: 4,
      limit: 7,
      orderBy: { title: -1 },
      where: { isDone: { eq: false } },
    })) {
      result.push([id, (await cTask.get(id)) as TTask]);
    }

    expect(result).toEqual(
      tasks
        .filter(([, { isDone }]) => !isDone)
        .sort(([, { title: a }], [, { title: b }]) =>
          order(IndexRule.stringNum(a), IndexRule.stringNum(b), -1),
        )
        .slice(4, 4 + 7),
    );
  });

  it('selects with sort and filter on multiple fields', async () => {
    const cTask = await newTaskDbCollection();
    const tasks = newTaskSet();
    for (const [id, task] of tasks) {
      await cTask.set(id, task);
    }

    const result: [string, TTask][] = [];
    for await (const id of cTask.selectIdsSequential({
      orderBy: { dateCreated: -1 },
      where: {
        description: { gt: 'Task #1' },
        isDone: { eq: false },
        tags: { empty: false },
      },
    })) {
      result.push([id, (await cTask.get(id)) as TTask]);
    }

    expect(result).toEqual(
      tasks
        .filter(
          ([, { isDone, tags, description }]) =>
            !isDone && tags.length && description > 'Task #1',
        )
        .sort(
          (
            [, { dateCreated: dcA, id: idA }],
            [, { dateCreated: dcB, id: idB }],
          ) =>
            order(IndexRule.stringNum(dcA), IndexRule.stringNum(dcB), -1) ||
            order(idA, idB, -1),
        ),
    );
  });

  it('selects with multiple filters with a nullable field', async () => {
    const cTask = await newTaskDbCollection();
    const tasks = newTaskSet();
    for (const [id, task] of tasks) {
      await cTask.set(id, task);
    }

    const result: [string, TTask][] = [];
    for await (const id of cTask.selectIdsSequential({
      orderBy: { dateCreated: -1 },
      where: {
        isDone: { eq: false },
        effort: { gte: 1 },
      },
    })) {
      result.push([id, (await cTask.get(id)) as TTask]);
    }

    expect(result).toEqual(
      tasks
        .filter(
          ([, { isDone, effort }]) => !isDone && effort !== null && effort >= 1,
        )
        .sort(
          (
            [, { dateCreated: dcA, id: idA }],
            [, { dateCreated: dcB, id: idB }],
          ) =>
            order(IndexRule.stringNum(dcA), IndexRule.stringNum(dcB), -1) ||
            order(idA, idB, -1),
        ),
    );
  });
});
