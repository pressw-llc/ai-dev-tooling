---
sidebar_position: 3
---

# Server Components Guide

This guide covers using `@pressw/chat-nextjs` with Next.js Server Components for server-side rendering (SSR) and static site generation (SSG).

## Overview

Server Components allow you to render thread data on the server, providing benefits like:

- **Faster Initial Page Load**: Data is pre-rendered on the server
- **Better SEO**: Search engines can crawl the rendered content
- **Reduced Client-Side JavaScript**: Less code shipped to the browser
- **Direct Database Access**: No HTTP overhead for data fetching

## ThreadServerClient

The `ThreadServerClient` enables direct database access in Server Components without making HTTP requests.

### Basic Usage

```typescript
// app/threads/page.tsx
import { createThreadServerClient } from '@pressw/chat-nextjs/server';
import { adapter } from '@/lib/adapter';
import { getCurrentUser } from '@/lib/auth-server';

export default async function ThreadsPage() {
  // Get user context from server-side authentication
  const userContext = await getCurrentUser();

  // Create server client
  const client = createThreadServerClient({
    adapter,
    userContext,
  });

  // Fetch threads directly from database
  const threadsResponse = await client.listThreads({
    limit: 20,
    orderBy: 'updatedAt',
    orderDirection: 'desc',
  });

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">
        Threads ({threadsResponse.total})
      </h1>

      <div className="grid gap-4">
        {threadsResponse.threads.map((thread) => (
          <div key={thread.id} className="p-4 border rounded-lg">
            <h2 className="text-lg font-semibold">
              {thread.title || 'Untitled Thread'}
            </h2>
            <p className="text-sm text-gray-600">
              Updated: {thread.updatedAt.toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>

      {threadsResponse.hasMore && (
        <div className="mt-4">
          <LoadMoreButton offset={threadsResponse.threads.length} />
        </div>
      )}
    </div>
  );
}
```

## Server-Side Authentication

Server Components require a different authentication approach since they don't have access to `NextRequest` objects.

### Cookie-Based Authentication

```typescript
// lib/auth-server.ts
import { cookies } from 'next/headers';
import { verify } from 'jsonwebtoken';
import type { UserContext } from '@pressw/chat-core';

export async function getCurrentUser(): Promise<UserContext> {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get('session')?.value;

  if (!sessionCookie) {
    throw new Error('No session found');
  }

  try {
    const payload = verify(sessionCookie, process.env.JWT_SECRET!) as any;

    return {
      userId: payload.userId,
      organizationId: payload.organizationId,
      tenantId: payload.tenantId,
    };
  } catch (error) {
    throw new Error('Invalid session');
  }
}
```

### NextAuth.js Server-Side

```typescript
// lib/auth-server.ts
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import type { UserContext } from '@pressw/chat-core';

export async function getCurrentUser(): Promise<UserContext> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error('Authentication required');
  }

  return {
    userId: session.user.id,
    organizationId: session.user.organizationId,
    tenantId: session.user.tenantId,
  };
}
```

### Headers-Based Authentication

```typescript
// lib/auth-server.ts
import { headers } from 'next/headers';
import { verify } from 'jsonwebtoken';
import type { UserContext } from '@pressw/chat-core';

export async function getCurrentUserFromHeaders(): Promise<UserContext> {
  const headersList = headers();
  const authorization = headersList.get('authorization');

  if (!authorization?.startsWith('Bearer ')) {
    throw new Error('Missing authorization header');
  }

  const token = authorization.slice(7);

  try {
    const payload = verify(token, process.env.JWT_SECRET!) as any;

    return {
      userId: payload.sub || payload.userId,
      organizationId: payload.organizationId,
      tenantId: payload.tenantId,
    };
  } catch (error) {
    throw new Error('Invalid token');
  }
}
```

## Static Site Generation (SSG)

Generate static pages with thread data at build time.

### Static Thread List

```typescript
// app/threads/static/page.tsx
import { createThreadServerClient } from '@pressw/chat-nextjs/server';
import { adapter } from '@/lib/adapter';

// Static generation with default user context
const DEFAULT_USER_CONTEXT = {
  userId: 'default-user',
  organizationId: 'public-org',
};

export default async function StaticThreadsPage() {
  const client = createThreadServerClient({
    adapter,
    userContext: DEFAULT_USER_CONTEXT,
  });

  const threadsResponse = await client.listThreads({
    limit: 50,
    orderBy: 'updatedAt',
    orderDirection: 'desc',
  });

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Public Threads</h1>

      <div className="grid gap-4">
        {threadsResponse.threads.map((thread) => (
          <div key={thread.id} className="p-4 border rounded-lg">
            <h2 className="text-lg font-semibold">
              {thread.title || 'Untitled Thread'}
            </h2>
            <p className="text-sm text-gray-600">
              Updated: {thread.updatedAt.toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// Force static generation
export const dynamic = 'force-static';
```

### Dynamic Static Paths

Generate static pages for individual threads:

```typescript
// app/threads/[id]/page.tsx
import { createThreadServerClient } from '@pressw/chat-nextjs/server';
import { adapter } from '@/lib/adapter';
import { notFound } from 'next/navigation';

interface ThreadPageProps {
  params: {
    id: string;
  };
}

export default async function ThreadPage({ params }: ThreadPageProps) {
  const userContext = await getCurrentUser();

  const client = createThreadServerClient({
    adapter,
    userContext,
  });

  const thread = await client.getThread(params.id);

  if (!thread) {
    notFound();
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">
        {thread.title || 'Untitled Thread'}
      </h1>

      <div className="bg-gray-50 p-4 rounded-lg">
        <p><strong>ID:</strong> {thread.id}</p>
        <p><strong>Created:</strong> {thread.createdAt.toLocaleDateString()}</p>
        <p><strong>Updated:</strong> {thread.updatedAt.toLocaleDateString()}</p>

        {thread.metadata && (
          <div className="mt-4">
            <strong>Metadata:</strong>
            <pre className="mt-2 bg-white p-2 rounded border text-sm">
              {JSON.stringify(thread.metadata, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

// Generate static params for known threads
export async function generateStaticParams() {
  const client = createThreadServerClient({
    adapter,
    userContext: DEFAULT_USER_CONTEXT,
  });

  const threadsResponse = await client.listThreads({
    limit: 100, // Generate for first 100 threads
    orderBy: 'updatedAt',
    orderDirection: 'desc',
  });

  return threadsResponse.threads.map((thread) => ({
    id: thread.id,
  }));
}
```

## Incremental Static Regeneration (ISR)

Combine static generation with periodic updates.

```typescript
// app/threads/isr/page.tsx
import { createThreadServerClient } from '@pressw/chat-nextjs/server';
import { adapter } from '@/lib/adapter';

export default async function ISRThreadsPage() {
  const userContext = await getCurrentUser();

  const client = createThreadServerClient({
    adapter,
    userContext,
  });

  const threadsResponse = await client.listThreads({
    limit: 20,
    orderBy: 'updatedAt',
    orderDirection: 'desc',
  });

  return (
    <div className="container mx-auto p-4">
      <div className="mb-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Latest Threads</h1>
        <p className="text-sm text-gray-600">
          Last updated: {new Date().toLocaleString()}
        </p>
      </div>

      <div className="grid gap-4">
        {threadsResponse.threads.map((thread) => (
          <div key={thread.id} className="p-4 border rounded-lg">
            <h2 className="text-lg font-semibold">
              {thread.title || 'Untitled Thread'}
            </h2>
            <p className="text-sm text-gray-600">
              Updated: {thread.updatedAt.toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// Revalidate every hour
export const revalidate = 3600;
```

## Combining Server and Client Components

Use Server Components for initial data loading and Client Components for interactivity.

### Server Component with Client Hydration

```typescript
// app/threads/hybrid/page.tsx (Server Component)
import { createThreadServerClient } from '@pressw/chat-nextjs/server';
import { adapter } from '@/lib/adapter';
import { getCurrentUser } from '@/lib/auth-server';
import { ThreadListClient } from '@/components/ThreadListClient';

export default async function HybridThreadsPage() {
  const userContext = await getCurrentUser();

  const client = createThreadServerClient({
    adapter,
    userContext,
  });

  // Get initial data on server
  const initialData = await client.listThreads({
    limit: 20,
    orderBy: 'updatedAt',
    orderDirection: 'desc',
  });

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Threads</h1>

      {/* Client component with server-side initial data */}
      <ThreadListClient
        initialData={initialData}
        userContext={userContext}
      />
    </div>
  );
}
```

```typescript
// components/ThreadListClient.tsx (Client Component)
'use client';

import { useState } from 'react';
import { useThreads, useCreateThread } from '@pressw/chat-core/react';
import type { ThreadsResponse, UserContext } from '@pressw/chat-core';

interface ThreadListClientProps {
  initialData: ThreadsResponse;
  userContext: UserContext;
}

export function ThreadListClient({ initialData, userContext }: ThreadListClientProps) {
  const [search, setSearch] = useState('');

  const {
    data: threadsResponse = initialData,
    refetch,
    isLoading,
  } = useThreads({
    apiConfig: {
      baseUrl: '/api/chat',
    },
    listOptions: {
      limit: 20,
      search: search || undefined,
    },
    // Use server data as initial data
    initialData,
  });

  const createThreadMutation = useCreateThread({
    apiConfig: {
      baseUrl: '/api/chat',
    },
    onSuccess: () => {
      refetch();
    },
  });

  const handleCreateThread = () => {
    const title = prompt('Enter thread title:');
    if (title) {
      createThreadMutation.mutate({ title });
    }
  };

  return (
    <div>
      <div className="mb-4 flex gap-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search threads..."
          className="flex-1 px-3 py-2 border rounded"
        />
        <button
          onClick={handleCreateThread}
          disabled={createThreadMutation.isPending}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {createThreadMutation.isPending ? 'Creating...' : 'Create Thread'}
        </button>
      </div>

      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <div className="grid gap-4">
          {threadsResponse.threads.map((thread) => (
            <div key={thread.id} className="p-4 border rounded-lg">
              <h2 className="text-lg font-semibold">
                {thread.title || 'Untitled Thread'}
              </h2>
              <p className="text-sm text-gray-600">
                Updated: {thread.updatedAt.toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

## Error Handling in Server Components

Handle authentication and database errors gracefully.

### Custom Error Pages

```typescript
// app/threads/error.tsx
'use client';

import { useEffect } from 'react';

export default function ThreadsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Threads page error:', error);
  }, [error]);

  return (
    <div className="container mx-auto p-4">
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-red-800 mb-2">
          Something went wrong!
        </h2>
        <p className="text-red-600 mb-4">
          {error.message === 'Authentication required'
            ? 'Please sign in to view threads.'
            : 'Unable to load threads. Please try again.'
          }
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
```

### Graceful Error Handling

```typescript
// app/threads/safe/page.tsx
import { createThreadServerClient } from '@pressw/chat-nextjs/server';
import { adapter } from '@/lib/adapter';
import { getCurrentUser } from '@/lib/auth-server';
import { redirect } from 'next/navigation';

export default async function SafeThreadsPage() {
  let userContext;
  let threadsResponse;

  try {
    userContext = await getCurrentUser();
  } catch (error) {
    // Redirect to login if authentication fails
    redirect('/login?return=/threads/safe');
  }

  try {
    const client = createThreadServerClient({
      adapter,
      userContext,
    });

    threadsResponse = await client.listThreads({
      limit: 20,
      orderBy: 'updatedAt',
      orderDirection: 'desc',
    });
  } catch (error) {
    console.error('Failed to load threads:', error);

    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Threads</h1>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            Unable to load threads at this time. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">
        Threads ({threadsResponse.total})
      </h1>

      <div className="grid gap-4">
        {threadsResponse.threads.map((thread) => (
          <div key={thread.id} className="p-4 border rounded-lg">
            <h2 className="text-lg font-semibold">
              {thread.title || 'Untitled Thread'}
            </h2>
            <p className="text-sm text-gray-600">
              Updated: {thread.updatedAt.toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Performance Optimization

### Data Streaming

Stream data for faster perceived performance:

```typescript
// app/threads/stream/page.tsx
import { Suspense } from 'react';
import { ThreadsListSkeleton } from '@/components/ThreadsListSkeleton';
import { ThreadsList } from '@/components/ThreadsList';

export default function StreamingThreadsPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Threads</h1>

      <Suspense fallback={<ThreadsListSkeleton />}>
        <ThreadsList />
      </Suspense>
    </div>
  );
}

// components/ThreadsList.tsx
import { createThreadServerClient } from '@pressw/chat-nextjs/server';
import { adapter } from '@/lib/adapter';
import { getCurrentUser } from '@/lib/auth-server';

export async function ThreadsList() {
  const userContext = await getCurrentUser();

  const client = createThreadServerClient({
    adapter,
    userContext,
  });

  const threadsResponse = await client.listThreads({
    limit: 20,
    orderBy: 'updatedAt',
    orderDirection: 'desc',
  });

  return (
    <div className="grid gap-4">
      {threadsResponse.threads.map((thread) => (
        <div key={thread.id} className="p-4 border rounded-lg">
          <h2 className="text-lg font-semibold">
            {thread.title || 'Untitled Thread'}
          </h2>
          <p className="text-sm text-gray-600">
            Updated: {thread.updatedAt.toLocaleDateString()}
          </p>
        </div>
      ))}
    </div>
  );
}
```

### Parallel Data Fetching

Fetch multiple data sources in parallel:

```typescript
// app/dashboard/page.tsx
import { createThreadServerClient } from '@pressw/chat-nextjs/server';
import { adapter } from '@/lib/adapter';
import { getCurrentUser } from '@/lib/auth-server';

export default async function DashboardPage() {
  const userContext = await getCurrentUser();

  const client = createThreadServerClient({
    adapter,
    userContext,
  });

  // Fetch data in parallel
  const [recentThreads, userStats] = await Promise.all([
    client.listThreads({
      limit: 5,
      orderBy: 'updatedAt',
      orderDirection: 'desc',
    }),
    getUserStats(userContext.userId), // Your custom function
  ]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-semibold mb-3">Recent Threads</h2>
          <div className="space-y-2">
            {recentThreads.threads.map((thread) => (
              <div key={thread.id} className="p-3 bg-gray-50 rounded">
                <h3 className="font-medium">{thread.title || 'Untitled'}</h3>
                <p className="text-sm text-gray-600">
                  {thread.updatedAt.toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">Statistics</h2>
          <div className="bg-blue-50 p-4 rounded">
            <p>Total Threads: {userStats.totalThreads}</p>
            <p>This Month: {userStats.thisMonth}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

## Caching Strategies

### React Cache

Use React's cache function for deduplication:

```typescript
// lib/cache.ts
import { cache } from 'react';
import { createThreadServerClient } from '@pressw/chat-nextjs/server';
import { adapter } from '@/lib/adapter';
import type { UserContext } from '@pressw/chat-core';

export const getThreadsForUser = cache(async (userContext: UserContext) => {
  const client = createThreadServerClient({
    adapter,
    userContext,
  });

  return client.listThreads({
    limit: 20,
    orderBy: 'updatedAt',
    orderDirection: 'desc',
  });
});

export const getThreadById = cache(async (userContext: UserContext, threadId: string) => {
  const client = createThreadServerClient({
    adapter,
    userContext,
  });

  return client.getThread(threadId);
});
```

### Unstable_cache

For longer-term caching:

```typescript
// lib/cache.ts
import { unstable_cache } from 'next/cache';
import { createThreadServerClient } from '@pressw/chat-nextjs/server';

export const getCachedThreads = unstable_cache(
  async (userId: string) => {
    const client = createThreadServerClient({
      adapter,
      userContext: { userId },
    });

    return client.listThreads({
      limit: 50,
      orderBy: 'updatedAt',
      orderDirection: 'desc',
    });
  },
  ['user-threads'],
  {
    revalidate: 60, // 1 minute
    tags: ['threads'],
  },
);

// Revalidate cache when threads change
export async function revalidateThreadsCache() {
  revalidateTag('threads');
}
```

## Best Practices

### 1. Keep Server Components Simple

Focus on data fetching and rendering, delegate complex logic to utilities:

```typescript
// Good: Simple, focused Server Component
export default async function ThreadsPage() {
  const threadsData = await getThreadsData(); // Utility function
  return <ThreadsDisplay data={threadsData} />;
}

// Avoid: Complex logic in Server Component
export default async function ThreadsPage() {
  // Lots of complex logic here...
}
```

### 2. Handle Loading States

Provide loading indicators for better UX:

```typescript
// app/threads/loading.tsx
export default function ThreadsLoading() {
  return (
    <div className="container mx-auto p-4">
      <div className="animate-pulse">
        <div className="h-8 bg-gray-300 rounded w-1/3 mb-4"></div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

### 3. Implement Proper Error Boundaries

Use error boundaries to handle Server Component errors:

```typescript
// app/threads/error.tsx
'use client';

export default function ThreadsError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  if (error.message.includes('Authentication')) {
    return <AuthenticationError />;
  }

  if (error.message.includes('Database')) {
    return <DatabaseError onRetry={reset} />;
  }

  return <GenericError onRetry={reset} />;
}
```

## Next Steps

- [Getting Started](./getting-started) - Initial setup guide
- [Authentication Guide](./authentication) - Authentication implementation details
