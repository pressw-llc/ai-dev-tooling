---
sidebar_position: 3
title: 'React Hooks'
---

# React Hooks

`@pressw/threads` provides a comprehensive set of React hooks for building reactive thread-based interfaces with optimistic updates, caching, and real-time synchronization.

## Setup

### ThreadsProvider

The `ThreadsProvider` component sets up the React Query client and provides thread context to child components.

```tsx
import { ThreadsProvider } from '@pressw/threads/react';
import { createAdapter } from '@pressw/threads/adapters';

function App() {
  const adapter = createAdapter({
    // ... adapter configuration
  });

  return (
    <ThreadsProvider
      adapter={adapter}
      userId={currentUser.id}
      getUserContext={async (userId) => ({
        id: userId,
        organizationId: currentUser.organizationId,
        tenantId: currentUser.tenantId,
      })}
    >
      <YourApp />
    </ThreadsProvider>
  );
}
```

#### Props

- `adapter` - Database adapter instance (required)
- `userId` - Current user ID (required)
- `getUserContext` - Function to retrieve user context (optional)
- `queryClient` - Custom React Query client (optional)
- `children` - Child components

## Query Hooks

### useThreads

Fetches a list of threads with automatic caching and refetching.

```tsx
const { data, isLoading, error, refetch } = useThreads(options);
```

#### Parameters

- `options` (optional) - List configuration
  - `limit` - Number of threads per page (default: 10)
  - `offset` - Number of threads to skip
  - `search` - Search query for thread titles
  - `orderBy` - Sort order: "asc" or "desc" (default: "desc")

#### Returns

- `data` - Array of thread objects
- `isLoading` - Loading state
- `error` - Error object if query failed
- `refetch` - Function to manually refetch

#### Example

```tsx
function ThreadList() {
  const [search, setSearch] = useState('');

  const { data: threads, isLoading } = useThreads({
    limit: 20,
    search,
    orderBy: 'desc',
  });

  if (isLoading) return <Spinner />;

  return (
    <>
      <SearchInput value={search} onChange={setSearch} />
      <div className="thread-list">
        {threads?.map((thread) => (
          <ThreadCard key={thread.id} thread={thread} />
        ))}
      </div>
    </>
  );
}
```

### useThread

Fetches a single thread by ID with caching.

```tsx
const { data, isLoading, error } = useThread(threadId);
```

#### Parameters

- `threadId` - The ID of the thread to fetch

#### Returns

- `data` - Thread object
- `isLoading` - Loading state
- `error` - Error object if query failed

#### Example

```tsx
function ThreadDetail({ threadId }: { threadId: string }) {
  const { data: thread, isLoading } = useThread(threadId);

  if (isLoading) return <Skeleton />;
  if (!thread) return <NotFound />;

  return (
    <article>
      <h1>{thread.title}</h1>
      <time>{new Date(thread.createdAt).toLocaleDateString()}</time>
      {thread.metadata && (
        <div>
          <Badge>{thread.metadata.category}</Badge>
          <Priority level={thread.metadata.priority} />
        </div>
      )}
    </article>
  );
}
```

### useInfiniteThreads

Fetches threads with infinite scroll support.

```tsx
const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteThreads(options);
```

#### Parameters

- `options` (optional) - List configuration (same as `useThreads` but without `offset`)

#### Returns

- `data` - Pages of thread results
- `fetchNextPage` - Function to load next page
- `hasNextPage` - Whether more pages are available
- `isFetchingNextPage` - Loading state for next page

#### Example

```tsx
function InfiniteThreadFeed() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteThreads({
    limit: 20,
  });

  // Intersection Observer for infinite scroll
  const observerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 1.0 },
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="feed">
      {data?.pages.map((page, i) => (
        <Fragment key={i}>
          {page.threads.map((thread) => (
            <ThreadCard key={thread.id} thread={thread} />
          ))}
        </Fragment>
      ))}

      {hasNextPage && (
        <div ref={observerRef} className="loading-trigger">
          {isFetchingNextPage && <Spinner />}
        </div>
      )}
    </div>
  );
}
```

## Mutation Hooks

All mutation hooks include:

- Optimistic updates for instant UI feedback
- Automatic cache invalidation
- Error handling with rollback
- Loading states

### useCreateThread

Creates new threads with optimistic updates.

```tsx
const createThread = useCreateThread();
```

#### Returns

Mutation object with:

- `mutate` - Mutation function (fire and forget)
- `mutateAsync` - Async mutation function (returns promise)
- `isPending` - Loading state
- `error` - Error object if mutation failed
- `reset` - Reset mutation state

#### Example

```tsx
function CreateThreadDialog() {
  const [open, setOpen] = useState(false);
  const createThread = useCreateThread();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    try {
      const thread = await createThread.mutateAsync({
        title: formData.get('title') as string,
        metadata: {
          category: formData.get('category') as string,
          priority: formData.get('priority') as string,
          tags: formData
            .get('tags')
            ?.toString()
            .split(',')
            .map((t) => t.trim()),
        },
      });

      setOpen(false);
      // Navigate to new thread
      router.push(`/threads/${thread.id}`);
    } catch (error) {
      console.error('Failed to create thread:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <input name="title" placeholder="Thread title" required autoFocus />

          <select name="category">
            <option value="general">General</option>
            <option value="support">Support</option>
            <option value="feature">Feature Request</option>
          </select>

          <select name="priority">
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
          </select>

          <input name="tags" placeholder="Tags (comma separated)" />

          <button type="submit" disabled={createThread.isPending}>
            {createThread.isPending ? 'Creating...' : 'Create Thread'}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

### useUpdateThread

Updates existing threads with optimistic updates.

```tsx
const updateThread = useUpdateThread();
```

#### Returns

Same mutation object as `useCreateThread`

#### Example

```tsx
function EditableThreadTitle({ thread }: { thread: Thread }) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(thread.title);
  const updateThread = useUpdateThread();

  const handleSave = async () => {
    if (title !== thread.title) {
      await updateThread.mutateAsync({
        threadId: thread.id,
        title,
      });
    }
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="editable-title">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') {
              setTitle(thread.title);
              setIsEditing(false);
            }
          }}
          autoFocus
        />
      </div>
    );
  }

  return (
    <h1 onClick={() => setIsEditing(true)} className="editable">
      {thread.title}
      <EditIcon />
    </h1>
  );
}
```

### useDeleteThread

Deletes threads with optimistic removal from UI.

```tsx
const deleteThread = useDeleteThread();
```

#### Returns

Same mutation object as other mutations

#### Example

```tsx
function ThreadActions({ thread }: { thread: Thread }) {
  const deleteThread = useDeleteThread();
  const router = useRouter();

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: 'Delete Thread',
      description: 'Are you sure you want to delete this thread?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
    });

    if (confirmed) {
      try {
        await deleteThread.mutateAsync(thread.id);
        router.push('/threads');
        toast.success('Thread deleted');
      } catch (error) {
        toast.error('Failed to delete thread');
      }
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <MoreIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={handleDelete}>
          <TrashIcon />
          Delete Thread
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

## Advanced Patterns

### Optimistic Updates

All mutations automatically handle optimistic updates:

```tsx
function QuickActions() {
  const createThread = useCreateThread();
  const updateThread = useUpdateThread();

  // Create - immediately shows in UI
  const handleQuickCreate = () => {
    createThread.mutate({
      title: 'Quick Note',
      metadata: { type: 'note' },
    });
  };

  // Update - immediately reflects change
  const handleToggleStatus = (thread: Thread) => {
    updateThread.mutate({
      threadId: thread.id,
      metadata: {
        ...thread.metadata,
        status: thread.metadata?.status === 'open' ? 'closed' : 'open',
      },
    });
  };

  return (
    <div>
      <button onClick={handleQuickCreate}>Quick Note</button>
      {/* UI updates immediately, rolls back on error */}
    </div>
  );
}
```

### Custom Query Keys

Use custom query keys for fine-grained cache control:

```tsx
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { threadKeys } from '@pressw/threads/react';

function CustomThreadQuery() {
  const queryClient = useQueryClient();

  // Custom query with thread keys
  const { data } = useQuery({
    queryKey: [...threadKeys.all, 'custom'],
    queryFn: async () => {
      // Custom query logic
    },
  });

  // Invalidate specific queries
  const handleRefresh = () => {
    queryClient.invalidateQueries({
      queryKey: threadKeys.lists(),
    });
  };
}
```

### Error Handling

Implement global error handling:

```tsx
function ThreadsErrorBoundary({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  // Global error handler
  queryClient.setMutationDefaults(['threads'], {
    onError: (error) => {
      toast.error(error.message || 'Something went wrong');
    },
  });

  return <>{children}</>;
}
```

### Prefetching

Prefetch thread data for better performance:

```tsx
function ThreadLink({ threadId, children }: { threadId: string; children: ReactNode }) {
  const queryClient = useQueryClient();

  const handleHover = () => {
    queryClient.prefetchQuery({
      queryKey: threadKeys.detail(threadId),
      queryFn: () => threadClient.getThread(userId, threadId),
    });
  };

  return (
    <Link href={`/threads/${threadId}`} onMouseEnter={handleHover}>
      {children}
    </Link>
  );
}
```

### Real-time Updates

Integrate with WebSocket for real-time updates:

```tsx
function useThreadsRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const ws = new WebSocket(process.env.NEXT_PUBLIC_WS_URL!);

    ws.onmessage = (event) => {
      const { type, threadId, data } = JSON.parse(event.data);

      switch (type) {
        case 'thread.created':
          queryClient.invalidateQueries({ queryKey: threadKeys.lists() });
          break;

        case 'thread.updated':
          queryClient.setQueryData(threadKeys.detail(threadId), data);
          break;

        case 'thread.deleted':
          queryClient.invalidateQueries({ queryKey: threadKeys.all });
          break;
      }
    };

    return () => ws.close();
  }, [queryClient]);
}
```

## Best Practices

1. **Use the Provider** - Always wrap your app with `ThreadsProvider`
2. **Handle Loading States** - Show appropriate loading indicators
3. **Handle Errors** - Provide user-friendly error messages
4. **Optimize Queries** - Use pagination and search to limit data
5. **Prefetch When Possible** - Improve perceived performance
6. **Invalidate Wisely** - Only invalidate affected queries
7. **Use Optimistic Updates** - Provide instant feedback
8. **Handle Edge Cases** - Empty states, network errors, etc.
