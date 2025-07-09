# @pressw/threads API Reference

## Table of Contents

1. [Core Components](#core-components)
2. [React Hooks](#react-hooks)
3. [Database Adapters](#database-adapters)
4. [Types and Interfaces](#types-and-interfaces)

## Core Components

### ThreadsProvider

The main provider component that sets up the thread management system.

```typescript
import { ThreadsProvider } from '@pressw/threads/react';

interface ThreadsProviderConfig {
  adapter: ChatCoreAdapter;
  getUserContext: GetUserContextFn;
  apiBaseUrl?: string; // Default: '/api/threads'
  queryClient?: QueryClient;
}
```

**Example:**

```typescript
<ThreadsProvider
  config={{
    adapter: drizzleAdapter,
    getUserContext: async (req) => ({
      userId: req.headers.get('x-user-id'),
      organizationId: req.headers.get('x-org-id'),
    }),
  }}
>
  <App />
</ThreadsProvider>
```

### ThreadUtilityClient

Server-side client for thread operations.

```typescript
import { createThreadUtilityClient } from '@pressw/threads';

const client = createThreadUtilityClient({
  adapter: drizzleAdapter,
  getUserContext: async (req) => ({ userId: 'user-123' }),
});

// Create thread
const thread = await client.createThread(request, {
  title: 'New Thread',
  metadata: { type: 'support', priority: 'high' },
});

// Update thread
await client.updateThread(request, threadId, {
  title: 'Updated Title',
  metadata: { resolved: true },
});

// Get thread
const thread = await client.getThread(request, threadId);

// List threads
const { threads, total, hasMore } = await client.listThreads(request, {
  limit: 20,
  offset: 0,
  orderBy: 'updatedAt',
  orderDirection: 'desc',
  search: 'keyword',
});

// Delete thread
await client.deleteThread(request, threadId);
```

## React Hooks

### useThreads

Fetch and manage a list of threads.

```typescript
import { useThreads } from '@pressw/threads/react';

const {
  data: threadsData,
  isLoading,
  error,
  refetch,
} = useThreads({
  listOptions: {
    limit: 20,
    offset: 0,
    orderBy: 'updatedAt',
    orderDirection: 'desc',
    search: 'search term',
  },
});
```

### useThread

Fetch a single thread by ID.

```typescript
import { useThread } from '@pressw/threads/react';

const { data: thread, isLoading, error } = useThread(threadId);
```

### useCreateThread

Create new threads with optimistic updates.

```typescript
import { useCreateThread } from '@pressw/threads/react';

const createThread = useCreateThread();

await createThread.mutateAsync({
  title: 'New Thread',
  metadata: {
    category: 'support',
    priority: 'high',
    status: 'open',
  },
});
```

### useUpdateThread

Update existing threads.

```typescript
import { useUpdateThread } from '@pressw/threads/react';

const updateThread = useUpdateThread();

await updateThread.mutateAsync({
  id: threadId,
  updates: {
    title: 'Updated Title',
    metadata: {
      resolved: true,
      resolvedAt: new Date().toISOString(),
    },
  },
});
```

### useDeleteThread

Delete threads with optimistic updates.

```typescript
import { useDeleteThread } from '@pressw/threads/react';

const deleteThread = useDeleteThread();

await deleteThread.mutateAsync(threadId);
```

### useInfiniteThreads

Load threads with pagination support.

```typescript
import { useInfiniteThreads } from '@pressw/threads/react';

const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteThreads({
  limit: 20,
  orderBy: 'createdAt',
});
```

## Database Adapters

### Drizzle Adapter

Built-in adapter for Drizzle ORM supporting PostgreSQL, MySQL, and SQLite.

```typescript
import { createDrizzleAdapter } from '@pressw/threads/adapters';
import { drizzle } from 'drizzle-orm/postgres-js';

const db = drizzle(connectionString);
const adapter = createDrizzleAdapter(db, 'pg'); // 'pg' | 'mysql' | 'sqlite'
```

### Custom Adapter

Implement the `ChatCoreAdapter` interface for custom storage solutions.

```typescript
import type { ChatCoreAdapter } from '@pressw/threads/adapters';

const customAdapter: ChatCoreAdapter = {
  async create({ model, data }) {
    // Implementation
  },
  async findOne({ model, where }) {
    // Implementation
  },
  async findMany({ model, where, limit, offset, sortBy }) {
    // Implementation
  },
  async update({ model, where, data }) {
    // Implementation
  },
  async delete({ model, where }) {
    // Implementation
  },
  async count({ model, where }) {
    // Implementation
  },
};
```

## Types and Interfaces

### Thread

```typescript
interface Thread {
  id: string;
  title?: string | null;
  userId: string;
  organizationId?: string | null;
  tenantId?: string | null;
  metadata?: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### UserContext

```typescript
interface UserContext {
  userId: string;
  organizationId?: string | null;
  tenantId?: string | null;
}
```

### CreateThreadOptions

```typescript
interface CreateThreadOptions {
  title?: string;
  metadata?: Record<string, any>;
}
```

### UpdateThreadOptions

```typescript
interface UpdateThreadOptions {
  title?: string;
  metadata?: Record<string, any>;
}
```

### ListThreadsOptions

```typescript
interface ListThreadsOptions {
  limit?: number; // Default: 20, Max: 100
  offset?: number; // Default: 0
  orderBy?: 'createdAt' | 'updatedAt' | 'title';
  orderDirection?: 'asc' | 'desc';
  search?: string;
}
```

### ThreadsResponse

```typescript
interface ThreadsResponse {
  threads: Thread[];
  total: number;
  hasMore: boolean;
}
```

### GetUserContextFn

```typescript
type GetUserContextFn = (request: Request) => Promise<UserContext> | UserContext;
```

## Query Keys

The library exports query key factories for cache management:

```typescript
import { threadQueryKeys } from '@pressw/threads/react';

// Available keys:
threadQueryKeys.all; // ['threads']
threadQueryKeys.lists(); // ['threads', 'list']
threadQueryKeys.list(options); // ['threads', 'list', options]
threadQueryKeys.details(); // ['threads', 'detail']
threadQueryKeys.detail(id); // ['threads', 'detail', id]
```

## Error Handling

All hooks and methods follow consistent error patterns:

```typescript
try {
  const thread = await client.createThread(request, options);
} catch (error) {
  if (error.code === 'AUTH_ERROR') {
    // Handle authentication error
  } else if (error.code === 'VALIDATION_ERROR') {
    // Handle validation error
  } else if (error.code === 'NOT_FOUND') {
    // Handle not found error
  } else {
    // Handle other errors
  }
}
```

## Best Practices

1. **Always wrap your app with ThreadsProvider** at the root level
2. **Use optimistic updates** for better UX with mutations
3. **Implement proper error boundaries** for error handling
4. **Cache thread data** using React Query's built-in caching
5. **Use TypeScript** for better type safety and autocomplete
6. **Leverage metadata** for flexible data storage
7. **Implement proper authentication** in getUserContext
