---
sidebar_position: 2
title: 'API Reference'
---

# API Reference

Complete API documentation for @pressw/threads.

## ThreadUtilityClient

The main server-side client for managing threads.

### Constructor

```typescript
new ThreadUtilityClient(options: ThreadUtilityClientOptions)
```

#### Parameters

- `options` - Configuration options
  - `adapter` - Database adapter instance
  - `getUserContext` - Function to retrieve user context for multi-tenancy

#### Example

```typescript
const threadClient = new ThreadUtilityClient({
  adapter: createAdapter({
    /* adapter config */
  }),
  getUserContext: async (userId: string) => ({
    id: userId,
    organizationId: 'org_123',
    tenantId: 'tenant_456',
  }),
});
```

### Methods

#### createThread

Creates a new thread.

```typescript
async createThread(
  userId: string,
  options: CreateThreadOptions
): Promise<Thread>
```

**Parameters:**

- `userId` - The ID of the user creating the thread
- `options` - Thread creation options
  - `title` - Thread title (required)
  - `metadata` - Custom metadata object (optional)

**Returns:** The created thread object

**Example:**

```typescript
const thread = await threadClient.createThread('user_123', {
  title: 'New Discussion',
  metadata: {
    category: 'general',
    tags: ['important', 'discussion'],
  },
});
```

#### updateThread

Updates an existing thread.

```typescript
async updateThread(
  userId: string,
  threadId: string,
  options: UpdateThreadOptions
): Promise<Thread>
```

**Parameters:**

- `userId` - The ID of the user updating the thread
- `threadId` - The ID of the thread to update
- `options` - Update options
  - `title` - New thread title (optional)
  - `metadata` - New metadata object (optional)

**Returns:** The updated thread object

**Example:**

```typescript
const updated = await threadClient.updateThread('user_123', 'thread_456', {
  title: 'Updated Title',
  metadata: {
    status: 'resolved',
    resolvedAt: new Date().toISOString(),
  },
});
```

#### getThread

Retrieves a single thread by ID.

```typescript
async getThread(
  userId: string,
  threadId: string
): Promise<Thread | null>
```

**Parameters:**

- `userId` - The ID of the user requesting the thread
- `threadId` - The ID of the thread to retrieve

**Returns:** The thread object or null if not found

**Example:**

```typescript
const thread = await threadClient.getThread('user_123', 'thread_456');
if (thread) {
  console.log(thread.title);
}
```

#### listThreads

Lists threads with pagination and search.

```typescript
async listThreads(
  userId: string,
  options?: ListThreadsOptions
): Promise<ThreadsResponse>
```

**Parameters:**

- `userId` - The ID of the user listing threads
- `options` - List options (optional)
  - `limit` - Number of threads to return (default: 10, max: 100)
  - `offset` - Number of threads to skip
  - `search` - Search query for thread titles
  - `orderBy` - Sort order: "asc" or "desc" (default: "desc")

**Returns:** Paginated thread response

**Example:**

```typescript
const response = await threadClient.listThreads('user_123', {
  limit: 20,
  offset: 0,
  search: 'project',
  orderBy: 'desc',
});

console.log(`Found ${response.total} threads`);
response.threads.forEach((thread) => {
  console.log(thread.title);
});
```

#### deleteThread

Deletes a thread.

```typescript
async deleteThread(
  userId: string,
  threadId: string
): Promise<void>
```

**Parameters:**

- `userId` - The ID of the user deleting the thread
- `threadId` - The ID of the thread to delete

**Example:**

```typescript
await threadClient.deleteThread('user_123', 'thread_456');
```

## Types

### Thread

The main thread entity.

```typescript
interface Thread {
  id: string;
  title: string;
  userId: string;
  organizationId?: string | null;
  tenantId?: string | null;
  metadata?: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### UserContext

User context for multi-tenant operations.

```typescript
interface UserContext {
  id: string;
  organizationId?: string;
  tenantId?: string;
}
```

### CreateThreadOptions

Options for creating a thread.

```typescript
interface CreateThreadOptions {
  title: string;
  metadata?: Record<string, any>;
}
```

### UpdateThreadOptions

Options for updating a thread.

```typescript
interface UpdateThreadOptions {
  title?: string;
  metadata?: Record<string, any>;
}
```

### ListThreadsOptions

Options for listing threads.

```typescript
interface ListThreadsOptions {
  limit?: number;
  offset?: number;
  search?: string;
  orderBy?: 'asc' | 'desc';
}
```

### ThreadsResponse

Response from listing threads.

```typescript
interface ThreadsResponse {
  threads: Thread[];
  total: number;
  limit: number;
  offset: number;
}
```

## React Hooks

### useThreads

Fetches a list of threads.

```typescript
function useThreads(options?: ListThreadsOptions): UseQueryResult<Thread[]>;
```

**Example:**

```tsx
function ThreadList() {
  const {
    data: threads,
    isLoading,
    error,
  } = useThreads({
    limit: 20,
    search: 'important',
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <ul>
      {threads?.map((thread) => (
        <li key={thread.id}>{thread.title}</li>
      ))}
    </ul>
  );
}
```

### useThread

Fetches a single thread.

```typescript
function useThread(threadId: string): UseQueryResult<Thread>;
```

**Example:**

```tsx
function ThreadDetail({ threadId }: { threadId: string }) {
  const { data: thread, isLoading } = useThread(threadId);

  if (isLoading) return <div>Loading...</div>;
  if (!thread) return <div>Thread not found</div>;

  return (
    <div>
      <h1>{thread.title}</h1>
      <p>Created: {thread.createdAt.toLocaleString()}</p>
    </div>
  );
}
```

### useCreateThread

Creates a new thread with optimistic updates.

```typescript
function useCreateThread(): UseMutationResult<Thread, Error, CreateThreadOptions>;
```

**Example:**

```tsx
function CreateThreadForm() {
  const createThread = useCreateThread();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);

    await createThread.mutateAsync({
      title: formData.get('title') as string,
      metadata: {
        category: formData.get('category') as string,
      },
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="title" placeholder="Thread title" required />
      <select name="category">
        <option value="general">General</option>
        <option value="support">Support</option>
      </select>
      <button type="submit" disabled={createThread.isPending}>
        Create Thread
      </button>
    </form>
  );
}
```

### useUpdateThread

Updates a thread with optimistic updates.

```typescript
function useUpdateThread(): UseMutationResult<
  Thread,
  Error,
  { threadId: string } & UpdateThreadOptions
>;
```

**Example:**

```tsx
function EditThreadForm({ thread }: { thread: Thread }) {
  const updateThread = useUpdateThread();

  const handleUpdate = async (newTitle: string) => {
    await updateThread.mutateAsync({
      threadId: thread.id,
      title: newTitle,
    });
  };

  return <input defaultValue={thread.title} onBlur={(e) => handleUpdate(e.target.value)} />;
}
```

### useDeleteThread

Deletes a thread with optimistic updates.

```typescript
function useDeleteThread(): UseMutationResult<void, Error, string>;
```

**Example:**

```tsx
function DeleteThreadButton({ threadId }: { threadId: string }) {
  const deleteThread = useDeleteThread();

  const handleDelete = async () => {
    if (confirm('Are you sure?')) {
      await deleteThread.mutateAsync(threadId);
    }
  };

  return (
    <button onClick={handleDelete} disabled={deleteThread.isPending}>
      Delete
    </button>
  );
}
```

### useInfiniteThreads

Fetches threads with infinite scroll support.

```typescript
function useInfiniteThreads(
  options?: Omit<ListThreadsOptions, 'offset'>,
): UseInfiniteQueryResult<ThreadsResponse>;
```

**Example:**

```tsx
function InfiniteThreadList() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteThreads({
    limit: 20,
  });

  return (
    <div>
      {data?.pages.map((page) =>
        page.threads.map((thread) => <div key={thread.id}>{thread.title}</div>),
      )}

      {hasNextPage && (
        <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
          Load More
        </button>
      )}
    </div>
  );
}
```

## Adapters

### createAdapter

Creates a database adapter for thread operations.

```typescript
function createAdapter(options: AdapterOptions): ChatCoreAdapter;
```

**Parameters:**

- `options` - Adapter configuration
  - `provider` - Database provider: "postgresql", "mysql", or "sqlite"
  - `db` - Drizzle database instance
  - `schema` - Database schema with users, threads, and feedback tables

**Example:**

```typescript
import { createAdapter } from '@pressw/threads/adapters';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const sql = postgres(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

const adapter = createAdapter({
  provider: 'postgresql',
  db,
  schema,
});
```

## Error Handling

All methods throw errors with descriptive messages when operations fail:

```typescript
try {
  await threadClient.createThread(userId, {
    title: 'New Thread',
  });
} catch (error) {
  if (error instanceof Error) {
    console.error('Failed to create thread:', error.message);
  }
}
```

Common error scenarios:

- User not found
- Thread not found
- Permission denied (multi-tenant violations)
- Validation errors (missing required fields)
- Database connection errors
