# portable-db-ts

`portable-db-ts` is a TypeScript library that provides a simple, in-memory database with a flexible API. It's designed to be portable, making it easy to integrate into your projects.

[![npm version](https://badge.fury.io/js/portable-db-ts.svg)](https://badge.fury.io/js/portable-db-ts) [![License](https://img.shields.io/badge/license-MIT-blue.svg)](https://opensource.org/licenses/MIT)

## Installation

```bash
npm install portable-db-ts
# or
yarn add portable-db-ts
```

# Usage

```javascript
// Import the necessary modules
import { DB, StoreInMemory } from 'portable-db-ts';

// Define your model structure
type TTask = {
  id: string; // Every collection entry must have a string id
  title: string;
  isDone: boolean;
  tags: string[];
  description: string;
  dateCreated: string;
  effort: number | null;
};

const db = new DB<
  { task: TTask }, // Define your collections
  { isDarkMode: boolean; } // Define your records
>(new StoreInMemory());

// Create a new task
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
    dateCreated: Date.now(),
  };
}

// ... (continue with other usage examples)
```

# Examples

## Using records

```javascript
// Get a database record for managing dark mode status
const isDarkModeRecord = db.record('isDarkMode', () => false);

// Get the current dark mode status
const isDarkMode = await isDarkModeRecord.get();

// Toggle the dark mode status and update the database record
await isDarkModeRecord.set(!isDarkMode);
```

## Using Index Rules to Build Collections

```javascript
// Create a collection with index rules
const taskCollection = await db.collection('task', {
  // This defines indexes for the collection. They are required for query capabilities.
  // You only need to index the fields used within queries
  title: 'stringNum',
  description: 'string',
  isDone: 'boolean',
  tags: 'string', // Array fields get indexed by their entry type
  dateCreated: 'number',
  effort: 'number',
});
```

## Setting Data (upsert)

```javascript
// Add a new task
const newTask = newTask('42', false, 3, ['tag1', 'tag2']);
await taskCollection.set('42', newTask);
```

## Deleting Data

```javascript
// Delete a task
await taskCollection.delete('42');
```

## Retrieving a Single Entry

```javascript
// Retrieve a single task by ID
const taskId = '42';
const task = await taskCollection.get(taskId);
console.log(task);
```

## Select Methods

### Select Ids

```javascript
// Select ids of all inserted tasks
const tasks = await taskCollection.selectIds();
console.log(tasks);
```

### Select Ids Sequentially

```javascript
// Select ids of all inserted tasks sequentially
const taskIds = [];
for await (const taskId of taskCollection.selectIdsSequential()) {
  taskIds.push(taskId);
}
console.log(taskIds);
```

### Select Data

```javascript
// Select all inserted values
const tasks = await taskCollection.select();
console.log(tasks);
```

### Select Data with filters and sorting

```javascript
// Select tasks using the select method
const tasks = await taskCollection.select({
  where: { isDone: { eq: false } },
  orderBy: { dateCreated: -1 },
  limit: 5,
  offset: 2,
});
console.log(tasks);
```

### Select Data Sequentially

```javascript
// Select tasks sequentially
const tasks = [];
for await (const task of taskCollection.selectSequential()) {
  tasks.push(task);
}
console.log(tasks);
```

## Filtering Data

### Equality Filter

```javascript
// Select tasks where 'isDone' is false
const tasks = await taskCollection.select({
  where: { isDone: { eq: false } },
});
console.log(tasks);
```

### Greater Than Filter

```javascript
// Select tasks where 'effort' is greater than or equal to 1
const tasks = await taskCollection.select({
  where: { effort: { gte: 1 } },
});
console.log(tasks);
```

### Less Than Filter

```javascript
// Select tasks where 'effort' is less than 0
const tasks = await taskCollection.select({
  where: { effort: { lt: 0 } },
});
console.log(tasks);
```

### In Filter

```javascript
// Select tasks where 'effort' is either -2 or 2
const tasks = await taskCollection.select({
  where: { effort: { in: [-2, 2] } },
});
console.log(tasks);
```

### Out Filter

```javascript
// Select tasks where 'effort' is neither -2 nor 2
const tasks = await taskCollection.select({
  where: { effort: { out: [-2, 2] } },
});
console.log(tasks);
```

### Prefix Filter

```javascript
// Select tasks where 'description' has a prefix 'Task #10'
const tasks = await taskCollection.select({
  where: { description: { prefix: 'Task #10' } },
});
console.log(tasks);
```

### Every Equal Filter

```javascript
// Select tasks where every tag is 'tag1' and 'tag2'
const tasks = await taskCollection.select({
  where: { tags: { everyEq: ['tag1', 'tag2'] } },
});
console.log(tasks);
```

### Empty Filter

```javascript
// Select tasks where 'tags' is empty
const tasks = await taskCollection.select({
  where: { tags: { empty: true } },
});
console.log(tasks);
```

## Sorting Data

### Simple Sort

```javascript
// Select tasks with orderBy
const tasks = await taskCollection.select({
  orderBy: { title: 1 },
});
console.log(tasks);
```

### Reverse Sort

```javascript
// Select tasks with orderBy and reverse sort
const tasks = await taskCollection.select({
  orderBy: { title: -1 },
});
console.log(tasks);
```

### Sort on Multiple Fields

```javascript
// Select tasks with orderBy and reverse sort on multiple fields
const tasks = await taskCollection.select({
  orderBy: { isDone: -1, title: 1 },
});
console.log(tasks);
```

# License

`portable-db-ts` is licensed under the [MIT License](LICENSE). Feel free to use and contribute!

For issues or suggestions, please [open an issue](https://github.com/your-username/portable-db-ts/issues).

Happy querying! 🚀

# Authors

- Dmitrii Baranov <dmitrii.a.baranov@gmail.com>
