---
sidebar_position: 2
---

# API Reference

Comprehensive API documentation for the `@pressw/threads-langgraph` package.

## Classes

### LangGraphAdapter

The main adapter class that implements the `ChatCoreAdapter` interface from `@pressw/threads`.

```typescript
class LangGraphAdapter extends BaseAdapter implements ChatCoreAdapter
```

#### Constructor

```typescript
constructor(config: LangGraphAdapterConfig)
```

Creates a new instance of the LangGraph adapter.

**Parameters:**

| Parameter | Type                     | Description                          |
| --------- | ------------------------ | ------------------------------------ |
| `config`  | `LangGraphAdapterConfig` | Configuration object for the adapter |

**Example:**

```typescript
const adapter = new LangGraphAdapter({
  apiUrl: 'https://your-deployment.langchain.com',
  apiKey: 'lsv2_pt_your_key',
  assistantId: 'my-assistant',
});
```

#### Methods

##### create

Creates a new thread in LangGraph Cloud.

```typescript
create<T extends Record<string, unknown>>(params: {
  model: string;
  data: T;
  select?: string[];
}): Promise<T>
```

**Parameters:**

| Parameter       | Type       | Description                          |
| --------------- | ---------- | ------------------------------------ |
| `params.model`  | `string`   | Model name (must be `'thread'`)      |
| `params.data`   | `T`        | Thread data including metadata       |
| `params.select` | `string[]` | Optional fields to select (not used) |

**Returns:** `Promise<T>` - The created thread object

**Example:**

```typescript
const thread = await adapter.create({
  model: 'thread',
  data: {
    title: 'Support Chat',
    userId: 'user-123',
    metadata: { priority: 'high' },
  },
});
```

##### findOne

Retrieves a single thread by ID with access control.

```typescript
findOne<T>(params: {
  model: string;
  where: Where[];
  select?: string[];
}): Promise<T | null>
```

**Parameters:**

| Parameter       | Type       | Description                             |
| --------------- | ---------- | --------------------------------------- |
| `params.model`  | `string`   | Model name (must be `'thread'`)         |
| `params.where`  | `Where[]`  | Array of conditions (must include `id`) |
| `params.select` | `string[]` | Optional fields to select (not used)    |

**Returns:** `Promise<T | null>` - The thread if found and accessible, null otherwise

**Example:**

```typescript
const thread = await adapter.findOne({
  model: 'thread',
  where: [
    { field: 'id', value: 'thread-123' },
    { field: 'userId', value: 'user-123' },
  ],
});
```

##### findMany

Searches for threads matching the given criteria.

```typescript
findMany<T>(params: {
  model: string;
  where?: Where[];
  limit?: number;
  offset?: number;
  sortBy?: SortBy;
}): Promise<T[]>
```

**Parameters:**

| Parameter       | Type      | Description                        |
| --------------- | --------- | ---------------------------------- |
| `params.model`  | `string`  | Model name (must be `'thread'`)    |
| `params.where`  | `Where[]` | Optional filter conditions         |
| `params.limit`  | `number`  | Maximum results (default: 20)      |
| `params.offset` | `number`  | Pagination offset (default: 0)     |
| `params.sortBy` | `SortBy`  | Sort configuration (not supported) |

**Returns:** `Promise<T[]>` - Array of matching threads

**Note:** LangGraph doesn't support sorting in the search API. Results are returned in the order provided by LangGraph.

**Example:**

```typescript
const threads = await adapter.findMany({
  model: 'thread',
  where: [{ field: 'userId', value: 'user-123' }],
  limit: 10,
  offset: 0,
});
```

##### update

Updates an existing thread's metadata.

```typescript
update<T>(params: {
  model: string;
  where: Where[];
  data: Partial<T>;
}): Promise<T | null>
```

**Parameters:**

| Parameter      | Type         | Description                     |
| -------------- | ------------ | ------------------------------- |
| `params.model` | `string`     | Model name (must be `'thread'`) |
| `params.where` | `Where[]`    | Conditions including thread ID  |
| `params.data`  | `Partial<T>` | Fields to update                |

**Returns:** `Promise<T | null>` - Updated thread or null if not found

**Example:**

```typescript
const updated = await adapter.update({
  model: 'thread',
  where: [{ field: 'id', value: 'thread-123' }],
  data: {
    title: 'Updated Title',
    metadata: { status: 'resolved' },
  },
});
```

##### delete

Deletes a thread from LangGraph Cloud.

```typescript
delete(params: {
  model: string;
  where: Where[];
}): Promise<void>
```

**Parameters:**

| Parameter      | Type      | Description                     |
| -------------- | --------- | ------------------------------- |
| `params.model` | `string`  | Model name (must be `'thread'`) |
| `params.where` | `Where[]` | Conditions including thread ID  |

**Throws:** Error if thread not found or access denied

**Example:**

```typescript
await adapter.delete({
  model: 'thread',
  where: [
    { field: 'id', value: 'thread-123' },
    { field: 'userId', value: 'user-123' },
  ],
});
```

##### count

Returns the number of threads matching the criteria.

```typescript
count(params: {
  model: string;
  where?: Where[];
}): Promise<number>
```

**Parameters:**

| Parameter      | Type      | Description                     |
| -------------- | --------- | ------------------------------- |
| `params.model` | `string`  | Model name (must be `'thread'`) |
| `params.where` | `Where[]` | Optional filter conditions      |

**Returns:** `Promise<number>` - Count of matching threads

**Note:** LangGraph doesn't have a native count API. This method fetches up to 1000 threads and returns the count.

##### getSchema

Returns schema information for the requested model.

```typescript
getSchema(model: string): any
```

**Parameters:**

| Parameter | Type     | Description                  |
| --------- | -------- | ---------------------------- |
| `model`   | `string` | Model name to get schema for |

**Returns:** Schema object or undefined

## Functions

### createLangGraphAdapter

Factory function to create a new LangGraph adapter instance.

```typescript
function createLangGraphAdapter(config: LangGraphAdapterConfig): LangGraphAdapter;
```

**Parameters:**

| Parameter | Type                     | Description                   |
| --------- | ------------------------ | ----------------------------- |
| `config`  | `LangGraphAdapterConfig` | Configuration for the adapter |

**Returns:** A new `LangGraphAdapter` instance

**Example:**

```typescript
const adapter = createLangGraphAdapter({
  apiUrl: process.env.LANGGRAPH_API_URL!,
  apiKey: process.env.LANGSMITH_API_KEY!,
  assistantId: 'my-assistant',
  debugLogs: true,
});
```

## Types

### LangGraphAdapterConfig

Configuration interface for the LangGraph adapter.

```typescript
interface LangGraphAdapterConfig extends AdapterConfig {
  apiUrl: string;
  apiKey: string;
  assistantId?: string;
  defaultHeaders?: Record<string, string>;
}
```

**Properties:**

| Property         | Type                     | Required | Description                          |
| ---------------- | ------------------------ | -------- | ------------------------------------ |
| `apiUrl`         | `string`                 | Yes      | LangGraph Cloud API URL              |
| `apiKey`         | `string`                 | Yes      | LangSmith API key for authentication |
| `assistantId`    | `string`                 | No       | Optional assistant ID for runs       |
| `defaultHeaders` | `Record<string, string>` | No       | Additional headers for API requests  |

**Inherited from AdapterConfig:**

| Property              | Type                     | Default | Description                     |
| --------------------- | ------------------------ | ------- | ------------------------------- |
| `usePlural`           | `boolean`                | `false` | Use plural table names          |
| `debugLogs`           | `boolean`                | `false` | Enable debug logging            |
| `mapKeysInput`        | `Record<string, string>` | -       | Map field names on input        |
| `mapKeysOutput`       | `Record<string, string>` | -       | Map field names on output       |
| `generateId`          | `() => string`           | UUID v4 | Custom ID generator             |
| `disableIdGeneration` | `boolean`                | `false` | Disable automatic ID generation |

### Thread Data Structure

The adapter maps between LangGraph's thread format and PressW's standard format:

```typescript
interface Thread {
  id: string;
  title?: string;
  userId: string;
  organizationId?: string;
  tenantId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}
```

### Where Clause

Filter conditions for queries:

```typescript
interface Where {
  field: string;
  value: string | number | boolean | Date | null | string[] | number[];
  operator?:
    | 'eq'
    | 'ne'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'in'
    | 'contains'
    | 'starts_with'
    | 'ends_with';
  connector?: 'AND' | 'OR';
}
```

**Note:** The LangGraph adapter currently only supports basic equality (`eq`) operations.

### SortBy

Sorting configuration:

```typescript
interface SortBy {
  field: string;
  direction: 'asc' | 'desc';
}
```

**Note:** Sorting is not currently supported by LangGraph's search API.

## Error Handling

The adapter handles several error scenarios:

### Not Found Errors

When a thread is not found, `findOne` and `update` return `null`:

```typescript
const thread = await adapter.findOne({
  model: 'thread',
  where: [{ field: 'id', value: 'non-existent' }],
});
// thread === null
```

### Access Denied Errors

The adapter enforces access control based on `userId`, `organizationId`, and `tenantId`:

```typescript
try {
  await adapter.delete({
    model: 'thread',
    where: [
      { field: 'id', value: 'thread-123' },
      { field: 'userId', value: 'wrong-user' },
    ],
  });
} catch (error) {
  // Error: Thread not found or access denied
}
```

### Model Not Supported

Operations on unsupported models throw errors:

```typescript
try {
  await adapter.create({
    model: 'user', // Only 'thread' is supported
    data: { name: 'John' },
  });
} catch (error) {
  // Error: Model user not supported by LangGraphAdapter
}
```

## Limitations

1. **Model Support**: Only the `thread` model is supported. Other models like `user` and `feedback` are not implemented.

2. **Query Operators**: Only basic equality checks are supported. Advanced operators like `contains`, `starts_with`, etc. are not implemented.

3. **Sorting**: The LangGraph search API doesn't support sorting, so `sortBy` parameters are ignored.

4. **Count Performance**: The `count` method fetches all matching threads (up to 1000) to calculate the count.

5. **Field Selection**: The `select` parameter is not implemented as LangGraph returns complete thread objects.

## Usage with ThreadUtilityClient

The adapter is designed to work seamlessly with PressW's `ThreadUtilityClient`:

```typescript
import { ThreadUtilityClient } from '@pressw/threads';
import { createLangGraphAdapter } from '@pressw/threads-langgraph';

const adapter = createLangGraphAdapter({
  apiUrl: process.env.LANGGRAPH_API_URL!,
  apiKey: process.env.LANGSMITH_API_KEY!,
});

const client = new ThreadUtilityClient(adapter, async (request) => ({
  userId: getUserId(request),
  organizationId: getOrgId(request),
}));

// All ThreadUtilityClient methods work normally
const thread = await client.createThread(request, {
  title: 'New Thread',
  metadata: { source: 'api' },
});
```
