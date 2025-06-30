---
sidebar_position: 2
---

# Thread Management

Thread management is the core functionality of `@pressw/chat-core`. Threads represent conversation contexts that can contain messages, metadata, and AI interactions. The thread system provides a complete CRUD API with React hooks and Next.js route handlers.

## Overview

Threads in chat-core are:

- **Multi-tenant**: Support organization and tenant isolation
- **Flexible**: Store custom metadata for your use case
- **Type-safe**: Full TypeScript support with runtime validation
- **Optimistic**: UI updates immediately with automatic rollback on errors
- **AI-aware**: Ready for AI integration and context sharing

## Core Hooks

### useThreads - List Threads

Query and filter threads with pagination and search:

```typescript
import { useThreads } from '@pressw/chat-core';

function ThreadList() {
  const {
    data: threadsResponse,
    isLoading,
    error
  } = useThreads({
    listOptions: {
      limit: 20,
      search: 'project planning',
      orderBy: 'updatedAt',
      orderDirection: 'desc'
    }
  });

  if (isLoading) return <div>Loading threads...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h2>Threads ({threadsResponse?.total})</h2>
      {threadsResponse?.threads.map((thread) => (
        <div key={thread.id} className="thread-item">
          <h3>{thread.title}</h3>
          <p>Updated: {thread.updatedAt.toLocaleDateString()}</p>
        </div>
      ))}

      {threadsResponse?.hasMore && (
        <button>Load More</button>
      )}
    </div>
  );
}
```

### useThread - Get Single Thread

Fetch a specific thread by ID:

```typescript
import { useThread } from '@pressw/chat-core';

function ThreadDetail({ threadId }: { threadId: string }) {
  const { data: thread, isLoading, error } = useThread(threadId);

  if (isLoading) return <div>Loading thread...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!thread) return <div>Thread not found</div>;

  return (
    <div>
      <h1>{thread.title}</h1>
      <p>Created: {thread.createdAt.toLocaleDateString()}</p>
      {thread.metadata && (
        <pre>{JSON.stringify(thread.metadata, null, 2)}</pre>
      )}
    </div>
  );
}
```

### useCreateThread - Create New Threads

Create threads with optimistic updates:

```typescript
import { useCreateThread } from '@pressw/chat-core';

function CreateThreadForm() {
  const createThread = useCreateThread({
    onSuccess: (thread) => {
      console.log('Thread created:', thread.id);
      // Redirect or update UI
    },
    onError: (error) => {
      alert('Failed to create thread: ' + error.message);
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);

    await createThread.mutateAsync({
      title: formData.get('title') as string,
      metadata: {
        category: formData.get('category'),
        priority: formData.get('priority')
      }
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        name="title"
        placeholder="Thread title"
        required
      />
      <select name="category">
        <option value="general">General</option>
        <option value="support">Support</option>
        <option value="feature">Feature Request</option>
      </select>
      <select name="priority">
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
      </select>
      <button
        type="submit"
        disabled={createThread.isPending}
      >
        {createThread.isPending ? 'Creating...' : 'Create Thread'}
      </button>
    </form>
  );
}
```

### useUpdateThread - Update Existing Threads

Update thread properties with optimistic updates:

```typescript
import { useUpdateThread } from '@pressw/chat-core';

function ThreadEditor({ thread }: { thread: Thread }) {
  const [title, setTitle] = useState(thread.title);
  const [isEditing, setIsEditing] = useState(false);

  const updateThread = useUpdateThread({
    onSuccess: () => {
      setIsEditing(false);
    }
  });

  const handleSave = () => {
    updateThread.mutate({
      id: thread.id,
      updates: { title }
    });
  };

  if (isEditing) {
    return (
      <div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') {
              setTitle(thread.title);
              setIsEditing(false);
            }
          }}
        />
        <button onClick={handleSave} disabled={updateThread.isPending}>
          Save
        </button>
        <button onClick={() => setIsEditing(false)}>
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 onClick={() => setIsEditing(true)}>{thread.title}</h1>
      <small>Click to edit</small>
    </div>
  );
}
```

### useDeleteThread - Delete Threads

Delete threads with confirmation and optimistic updates:

```typescript
import { useDeleteThread } from '@pressw/chat-core';

function ThreadActions({ threadId }: { threadId: string }) {
  const deleteThread = useDeleteThread({
    onSuccess: () => {
      // Redirect to thread list or show success message
      router.push('/threads');
    }
  });

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this thread?')) {
      deleteThread.mutate(threadId);
    }
  };

  return (
    <div className="thread-actions">
      <button
        onClick={handleDelete}
        disabled={deleteThread.isPending}
        className="danger"
      >
        {deleteThread.isPending ? 'Deleting...' : 'Delete Thread'}
      </button>
    </div>
  );
}
```

## Advanced Usage

### Custom API Client

Configure custom endpoints or authentication:

```typescript
import { DefaultThreadApiClient, setDefaultApiClient } from '@pressw/chat-core';

const customClient = new DefaultThreadApiClient({
  baseUrl: '/api/my-custom-threads',
  fetchOptions: {
    headers: {
      Authorization: `Bearer ${authToken}`,
      'X-Custom-Header': 'value',
    },
  },
});

setDefaultApiClient(customClient);
```

### Per-Hook API Configuration

Use different configurations for specific hooks:

```typescript
const customApiClient = new DefaultThreadApiClient({
  baseUrl: '/api/admin/threads',
});

function AdminThreadList() {
  const { data } = useThreads({
    apiClient: customApiClient,
    listOptions: { limit: 50 },
  });

  // This uses the admin API endpoint
}
```

### Infinite Loading

Load threads with infinite scroll:

```typescript
import { useInfiniteThreads } from '@pressw/chat-core';

function InfiniteThreadList() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteThreads(
    { limit: 10 }, // Base options
    {
      getNextPageParam: (lastPage) =>
        lastPage.hasMore ? lastPage.threads.length : undefined
    }
  );

  const threads = data?.pages.flatMap(page => page.threads) ?? [];

  return (
    <div>
      {threads.map((thread) => (
        <ThreadItem key={thread.id} thread={thread} />
      ))}

      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  );
}
```

## Next.js Route Handlers

### Basic Setup

Create API routes for thread management:

```typescript
// app/api/chat/threads/route.ts
import { createThreadRouteHandlers } from '@pressw/chat-core/nextjs';
import { drizzleAdapter } from './adapter';
import { getUserContext } from './auth';

const handlers = createThreadRouteHandlers({
  adapter: drizzleAdapter,
  getUserContext,
});

export const GET = handlers.GET;
export const POST = handlers.POST;
```

```typescript
// app/api/chat/threads/[id]/route.ts
import { createThreadDetailRouteHandlers } from '@pressw/chat-core/nextjs';
import { drizzleAdapter } from '../adapter';
import { getUserContext } from '../auth';

const handlers = createThreadDetailRouteHandlers({
  adapter: drizzleAdapter,
  getUserContext,
});

export const GET = handlers.GET;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;
```

### Catch-All Route

Use a single catch-all route for simpler setup:

```typescript
// app/api/chat/[...route]/route.ts
import { createCatchAllThreadRouteHandler } from '@pressw/chat-core/nextjs';
import { drizzleAdapter } from './adapter';
import { getUserContext } from './auth';

const handler = createCatchAllThreadRouteHandler({
  adapter: drizzleAdapter,
  getUserContext,
});

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
```

### Authentication

Implement user context for multi-tenancy:

```typescript
// auth.ts
import { type GetUserContextFn } from '@pressw/chat-core';
import { getSession } from './session';

export const getUserContext: GetUserContextFn = async (request) => {
  const session = await getSession(request);

  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  return {
    userId: session.user.id,
    organizationId: session.user.organizationId,
    tenantId: session.user.tenantId,
  };
};
```

## Thread Schema

Threads have the following structure:

```typescript
interface Thread {
  id: string; // Unique identifier
  title: string; // Thread title
  userId: string; // Owner user ID
  organizationId: string | null; // Organization for multi-tenancy
  tenantId: string | null; // Tenant for multi-tenancy
  metadata: Record<string, any> | null; // Custom data
  createdAt: Date; // Creation timestamp
  updatedAt: Date; // Last update timestamp
}
```

## Query Options

All query hooks support React Query options:

```typescript
const { data } = useThreads({
  listOptions: { limit: 10 },
  // React Query options
  staleTime: 5 * 60 * 1000, // 5 minutes
  refetchOnWindowFocus: false,
  enabled: userIsLoggedIn,
  retry: (failureCount, error) => {
    if (error.status === 404) return false;
    return failureCount < 3;
  },
});
```

## Error Handling

Handle errors gracefully:

```typescript
function ThreadListWithError() {
  const { data, error, isError } = useThreads();

  if (isError) {
    if (error.status === 403) {
      return <div>You don't have permission to view threads</div>;
    }
    if (error.status === 500) {
      return <div>Server error, please try again later</div>;
    }
    return <div>Something went wrong: {error.message}</div>;
  }

  return <ThreadList threads={data?.threads ?? []} />;
}
```

## Best Practices

### 1. Use Optimistic Updates

The built-in mutations already include optimistic updates, but you can customize them:

```typescript
const createThread = useCreateThread({
  onMutate: async (newThread) => {
    // Custom optimistic update logic
    console.log('Creating thread optimistically:', newThread);
  },
});
```

### 2. Handle Loading States

Always handle loading and error states:

```typescript
function ThreadComponent({ threadId }: { threadId: string }) {
  const { data: thread, isLoading, error } = useThread(threadId);

  if (isLoading) return <ThreadSkeleton />;
  if (error) return <ErrorMessage error={error} />;
  if (!thread) return <NotFound />;

  return <ThreadDetail thread={thread} />;
}
```

### 3. Invalidate Related Queries

Update related queries when data changes:

```typescript
const updateThread = useUpdateThread({
  onSuccess: (updatedThread) => {
    // Invalidate the thread list to reflect changes
    queryClient.invalidateQueries({ queryKey: ['threads'] });

    // Update the specific thread in cache
    queryClient.setQueryData(['thread', updatedThread.id], updatedThread);
  },
});
```

### 4. Use Metadata Effectively

Store structured data in metadata:

```typescript
const createThread = useCreateThread();

const createProjectThread = (projectId: string, taskId?: string) => {
  createThread.mutate({
    title: 'Project Discussion',
    metadata: {
      type: 'project',
      projectId,
      taskId,
      tags: ['urgent', 'frontend'],
      settings: {
        notifications: true,
        autoArchive: false,
      },
    },
  });
};
```

## Next Steps

- [AI-Powered Chat](./ai-chat) - Add intelligent conversations to your threads
- [Database Adapters](./adapters/overview) - Set up your database integration
- [API Reference](./api) - Detailed API documentation
