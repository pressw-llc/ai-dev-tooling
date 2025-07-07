---
sidebar_position: 1
---

# Chat Next.js

:::caution Beta Package
`@pressw/chat-nextjs` is in **extremely early beta**. APIs may change between versions, and you may encounter bugs. Please report any issues or feedback on our [GitHub repository](https://github.com/pressw/ai-dev-tooling/issues).
:::

The `@pressw/chat-nextjs` package provides Next.js-specific integrations for the `@pressw/threads` package. This separate package enables framework-agnostic use of the threads library while providing optimized Next.js functionality.

## Features

- **Next.js Route Handlers**: Pre-built API route handlers for thread management
- **Server Components**: Optimized server-side rendering support
- **App Router**: Full support for Next.js 13+ App Router
- **Type Safety**: Full TypeScript support with Next.js specific types
- **SSR/SSG**: Server-side and static generation compatibility
- **Middleware**: Built-in authentication and tenant isolation
- **Error Handling**: Next.js optimized error responses

## Why a Separate Package?

By separating Next.js specific functionality from `@pressw/threads`, we enable:

- **Framework Agnostic Core**: Use threads with Vite, Create React App, Expo, or any React framework
- **Optional Next.js Features**: Only include Next.js dependencies when needed
- **Smaller Bundle Size**: Core package stays lightweight without Next.js dependencies
- **Better Tree Shaking**: Import only the functionality you need
- **Clear Separation**: Framework-specific code is isolated and maintainable

## Installation

```bash
bun add @pressw/chat-nextjs @pressw/threads
# or
npm install @pressw/chat-nextjs @pressw/threads
```

:::note
The `@pressw/chat-nextjs` package requires `@pressw/threads` as a peer dependency.
:::

## Quick Start

### 1. Set up your database adapter

First, configure your database adapter with `@pressw/threads`:

```typescript
// lib/adapter.ts
import { createDrizzleAdapter } from '@pressw/threads/adapters';
import { db } from './db';

export const adapter = createDrizzleAdapter({ db });
```

### 2. Create route handlers

Use the pre-built route handlers for your API:

```typescript
// app/api/chat/threads/route.ts
import { createThreadRouteHandlers } from '@pressw/chat-nextjs';
import { adapter } from '@/lib/adapter';
import { getUserContext } from '@/lib/auth';

const handlers = createThreadRouteHandlers({
  adapter,
  getUserContext,
});

export const GET = handlers.GET;
export const POST = handlers.POST;
```

```typescript
// app/api/chat/threads/[id]/route.ts
import { createThreadDetailRouteHandlers } from '@pressw/chat-nextjs';
import { adapter } from '@/lib/adapter';
import { getUserContext } from '@/lib/auth';

const handlers = createThreadDetailRouteHandlers({
  adapter,
  getUserContext,
});

export const GET = handlers.GET;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;
```

### 3. Use React hooks in your components

```typescript
// components/ThreadList.tsx
import { useThreads } from '@pressw/threads/react';

export function ThreadList() {
  const { data, isLoading, error } = useThreads({
    listOptions: { limit: 20 }
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {data?.threads.map((thread) => (
        <div key={thread.id}>
          <h3>{thread.title}</h3>
          <p>{thread.createdAt.toLocaleDateString()}</p>
        </div>
      ))}
    </div>
  );
}
```

## API Routes

### Thread Management Routes

The `@pressw/chat-nextjs` package provides three main types of route handlers:

#### Individual Route Handlers

For granular control over each endpoint:

```typescript
// app/api/chat/threads/route.ts - List and create threads
export const { GET, POST } = createThreadRouteHandlers(config);

// app/api/chat/threads/[id]/route.ts - Single thread operations
export const { GET, PUT, DELETE } = createThreadDetailRouteHandlers(config);
```

#### Catch-All Route Handler

For simplified setup with a single route file:

```typescript
// app/api/chat/[...route]/route.ts
import { createCatchAllThreadRouteHandler } from '@pressw/chat-nextjs';

const handler = createCatchAllThreadRouteHandler({
  adapter,
  getUserContext,
});

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
```

### Configuration

All route handlers accept a configuration object:

```typescript
interface ThreadRouteConfig {
  adapter: ThreadsAdapter; // Database adapter
  getUserContext: GetUserContextFn; // Authentication function
}
```

### Authentication Function

Implement the `getUserContext` function to provide user authentication and multi-tenancy:

```typescript
import { type GetUserContextFn } from '@pressw/threads';
import { NextRequest } from 'next/server';

export const getUserContext: GetUserContextFn = async (request: NextRequest) => {
  // Extract user from session, JWT, etc.
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

## Error Handling

The package provides standardized error responses following Next.js conventions:

```typescript
interface ApiError {
  error: string;
  message: string;
  code: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}
```

Common error codes:

- `VALIDATION_ERROR` (400) - Invalid request parameters
- `NOT_FOUND` (404) - Thread not found
- `INTERNAL_ERROR` (500) - Server error

## Advanced Configuration

### Custom Error Handling

Override default error handling:

```typescript
import { createThreadRouteHandlers } from '@pressw/chat-nextjs';

const handlers = createThreadRouteHandlers({
  adapter,
  getUserContext,
  onError: (error, request) => {
    // Custom error logging
    console.error('Thread API Error:', error);

    // Custom error response
    return NextResponse.json(
      {
        success: false,
        error: {
          error: 'Custom Error',
          message: 'Something went wrong',
          code: 'CUSTOM_ERROR',
        },
      },
      { status: 500 },
    );
  },
});
```

### Request Validation

Add custom validation middleware:

```typescript
const handlers = createThreadRouteHandlers({
  adapter,
  getUserContext,
  middleware: {
    beforeAuth: (request) => {
      // Rate limiting, CORS, etc.
    },
    afterAuth: (request, userContext) => {
      // Additional authorization checks
    },
  },
});
```

### Response Transformation

Transform responses before sending:

```typescript
const handlers = createThreadRouteHandlers({
  adapter,
  getUserContext,
  transformResponse: (data, request) => {
    // Add custom fields, filter sensitive data, etc.
    return {
      ...data,
      _timestamp: Date.now(),
      _version: '1.0.0',
    };
  },
});
```

## Server Components

Use threads in Server Components for SSR/SSG:

```typescript
// app/threads/page.tsx
import { createThreadServerClient } from '@pressw/chat-nextjs/server';
import { adapter } from '@/lib/adapter';
import { getCurrentUser } from '@/lib/auth-server';

export default async function ThreadsPage() {
  const userContext = await getCurrentUser();

  const client = createThreadServerClient({
    adapter,
    userContext
  });

  const threads = await client.listThreads({
    limit: 20,
    orderBy: 'updatedAt',
    orderDirection: 'desc'
  });

  return (
    <div>
      <h1>Threads</h1>
      {threads.threads.map((thread) => (
        <div key={thread.id}>
          <h2>{thread.title}</h2>
          <p>Created: {thread.createdAt.toLocaleDateString()}</p>
        </div>
      ))}
    </div>
  );
}
```

## Middleware Integration

Integrate with Next.js middleware for authentication:

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Check authentication for chat API routes
  if (request.nextUrl.pathname.startsWith('/api/chat')) {
    const token = request.headers.get('authorization');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/chat/:path*',
};
```

## Performance Optimization

### Caching

Enable caching for read operations:

```typescript
// app/api/chat/threads/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const response = await handlers.GET(request);

  // Add cache headers
  response.headers.set('Cache-Control', 's-maxage=60, stale-while-revalidate');

  return response;
}
```

### Edge Runtime

Use Edge Runtime for better performance:

```typescript
// app/api/chat/threads/route.ts
export const runtime = 'edge';

import { createThreadRouteHandlers } from '@pressw/chat-nextjs/edge';
```

## Migration from Threads

If you're currently using Next.js route handlers from `@pressw/threads`, here's how to migrate:

### Before (threads)

```typescript
import { createThreadRouteHandlers } from '@pressw/threads/nextjs';
```

### After (chat-nextjs)

```typescript
import { createThreadRouteHandlers } from '@pressw/chat-nextjs';
```

The API remains the same, but you'll need to:

1. Install `@pressw/chat-nextjs`
2. Update your imports
3. Ensure `@pressw/threads` is installed as a peer dependency

## Best Practices

### 1. Environment-Specific Configuration

```typescript
// lib/config.ts
const config = {
  development: {
    enableDebugLogging: true,
    cors: { origin: '*' },
  },
  production: {
    enableDebugLogging: false,
    cors: { origin: 'https://yourdomain.com' },
  },
};

export const threadConfig = config[process.env.NODE_ENV];
```

### 2. Type Safety

Always use TypeScript for better developer experience:

```typescript
import type { Thread, CreateThreadOptions } from '@pressw/threads';
import type { NextRequest } from 'next/server';

export async function createThread(
  options: CreateThreadOptions,
  request: NextRequest,
): Promise<Thread> {
  // Implementation
}
```

### 3. Error Boundaries

Use React Error Boundaries with your thread components:

```typescript
'use client';

import { ErrorBoundary } from 'react-error-boundary';
import { ThreadList } from './ThreadList';

function ErrorFallback({ error }: { error: Error }) {
  return (
    <div className="error-boundary">
      <h2>Something went wrong:</h2>
      <pre>{error.message}</pre>
    </div>
  );
}

export function ThreadListPage() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <ThreadList />
    </ErrorBoundary>
  );
}
```

## Compatibility

- **Next.js**: 14.0+ or 15.0+ (App Router required)
- **React**: 18.0+ (optional - only needed for Client Components)
- **TypeScript**: 5.0+ (recommended)
- **Node.js**: 18.0+ (for server-side functionality)

## Next Steps

- [Getting Started](./guides/getting-started) - Complete setup guide
- [API Reference](./api) - Detailed API documentation
- [Authentication Guide](./guides/authentication) - Implementing authentication
- [Server Components](./guides/server-components) - Using with Server Components
- [Examples](./examples) - Real-world implementation examples
- [Thread Management](../threads/overview) - Learn about core thread functionality
- [Database Adapters](../threads/adapters) - Set up database integration
