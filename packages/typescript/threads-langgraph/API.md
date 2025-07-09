# @pressw/threads-langgraph API Reference

## LangGraphAdapter

The `LangGraphAdapter` class implements the `ChatCoreAdapter` interface from `@pressw/threads`, providing integration with LangGraph Cloud's thread management system.

### Constructor

```typescript
new LangGraphAdapter(config: LangGraphAdapterConfig)
```

#### Parameters

- `config` (LangGraphAdapterConfig): Configuration object containing:
  - `apiUrl` (string): The LangGraph Cloud API URL
  - `apiKey` (string): Your LangSmith API key
  - `assistantId?` (string): Optional assistant ID for runs
  - `defaultHeaders?` (Record<string, string>): Optional default headers
  - Additional adapter configuration options from `AdapterConfig`

### Methods

#### create

Creates a new thread in LangGraph Cloud.

```typescript
create<T extends Record<string, unknown>>(params: {
  model: string;
  data: T;
  select?: string[];
}): Promise<T>
```

**Note**: Currently only supports `model: 'thread'`.

#### findOne

Retrieves a single thread by ID.

```typescript
findOne<T>(params: {
  model: string;
  where: Where[];
  select?: string[];
}): Promise<T | null>
```

The `where` array must include an `id` field. Additional fields like `userId` and `organizationId` are used for access control.

#### findMany

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

Supports filtering by `userId`, `organizationId`, and `tenantId`. Sorting is available for `createdAt` and `updatedAt` fields.

#### update

Updates an existing thread's metadata.

```typescript
update<T>(params: {
  model: string;
  where: Where[];
  data: Partial<T>;
}): Promise<T | null>
```

The `where` array must include an `id` field.

#### delete

Deletes a thread from LangGraph Cloud.

```typescript
delete(params: {
  model: string;
  where: Where[];
}): Promise<void>
```

The `where` array must include an `id` field. Access control is enforced.

#### count

Returns the number of threads matching the criteria.

```typescript
count(params: {
  model: string;
  where?: Where[];
}): Promise<number>
```

**Note**: LangGraph doesn't have a native count API, so this method fetches up to 1000 threads and returns the count.

#### getSchema

Returns a basic schema structure for the requested model.

```typescript
getSchema(model: string): unknown
```

## Factory Function

### createLangGraphAdapter

Creates a new instance of the LangGraph adapter.

```typescript
createLangGraphAdapter(config: LangGraphAdapterConfig): LangGraphAdapter
```

## Types

### LangGraphAdapterConfig

```typescript
interface LangGraphAdapterConfig extends AdapterConfig {
  apiUrl: string;
  apiKey: string;
  assistantId?: string;
  defaultHeaders?: Record<string, string>;
}
```

## Thread Data Structure

When working with threads, the adapter maps between LangGraph's thread structure and the standard `@pressw/threads` format:

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

## Usage with ThreadUtilityClient

```typescript
import { createLangGraphAdapter } from '@pressw/threads-langgraph';
import { ThreadUtilityClient } from '@pressw/threads';

const adapter = createLangGraphAdapter({
  apiUrl: process.env.LANGGRAPH_API_URL!,
  apiKey: process.env.LANGSMITH_API_KEY!,
});

const client = new ThreadUtilityClient(adapter, async (request) => ({
  userId: 'user123',
  organizationId: 'org456',
}));

// Create a thread
const thread = await client.createThread(request, {
  title: 'New Conversation',
  metadata: { source: 'web' },
});

// List threads
const threads = await client.listThreads(request, {
  limit: 10,
  offset: 0,
});
```

## Limitations

1. **Model Support**: Currently only supports the `thread` model. Other models like `user` and `feedback` are not supported.

2. **Count Operation**: Due to LangGraph API limitations, the count operation fetches all threads (up to 1000) and returns the length.

3. **Query Operators**: Only basic equality checks are supported for filtering. Advanced operators like `contains`, `starts_with`, etc. are not implemented.

4. **Thread State**: The adapter focuses on thread metadata management. For thread state and message handling, use the LangGraph SDK directly.

## Error Handling

The adapter handles common error scenarios:

- **Not Found**: Returns `null` for `findOne` operations when a thread doesn't exist
- **Access Denied**: Validates user access based on `userId` and `organizationId` fields
- **Invalid Operations**: Throws descriptive errors for unsupported models or missing required fields
