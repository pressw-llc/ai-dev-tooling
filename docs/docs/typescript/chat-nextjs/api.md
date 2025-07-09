---
sidebar_position: 2
---

# API Reference

Complete API reference for the `@pressw/chat-nextjs` package.

## Route Handlers

### createThreadRouteHandlers

Creates route handlers for thread list and creation operations.

```typescript
function createThreadRouteHandlers(config: ThreadRouteConfig): {
  GET: (request: NextRequest) => Promise<NextResponse>;
  POST: (request: NextRequest) => Promise<NextResponse>;
};
```

#### Parameters

- **config** (`ThreadRouteConfig`) - Configuration object containing:
  - `adapter` (`ThreadsAdapter`) - Database adapter instance
  - `getUserContext` (`GetUserContextFn`) - Function to extract user context from request

#### Returns

Object with HTTP method handlers:

- **GET** - Lists threads with optional query parameters
- **POST** - Creates a new thread

#### HTTP Endpoints

##### GET /api/chat/threads

Lists threads for the authenticated user.

**Query Parameters:**

| Parameter        | Type                         | Default       | Description                                  |
| ---------------- | ---------------------------- | ------------- | -------------------------------------------- |
| `limit`          | `number`                     | `50`          | Maximum number of threads to return (1-1000) |
| `offset`         | `number`                     | `0`           | Number of threads to skip for pagination     |
| `orderBy`        | `'createdAt' \| 'updatedAt'` | `'updatedAt'` | Field to sort by                             |
| `orderDirection` | `'asc' \| 'desc'`            | `'desc'`      | Sort direction                               |
| `search`         | `string`                     | -             | Search term to filter thread titles          |

**Response:**

```typescript
{
  success: true,
  data: {
    threads: Thread[],
    total: number,
    hasMore: boolean
  }
}
```

**Example:**

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

##### POST /api/chat/threads

Creates a new thread.

**Request Body:**

```typescript
{
  title?: string;
  metadata?: Record<string, unknown>;
}
```

**Response:**

```typescript
{
  success: true,
  data: Thread
}
```

### createThreadDetailRouteHandlers

Creates route handlers for individual thread operations.

```typescript
function createThreadDetailRouteHandlers(config: ThreadRouteConfig): {
  GET: (request: NextRequest, context: { params: { id: string } }) => Promise<NextResponse>;
  PUT: (request: NextRequest, context: { params: { id: string } }) => Promise<NextResponse>;
  DELETE: (request: NextRequest, context: { params: { id: string } }) => Promise<NextResponse>;
};
```

#### Parameters

- **config** (`ThreadRouteConfig`) - Configuration object (same as `createThreadRouteHandlers`)

#### Returns

Object with HTTP method handlers:

- **GET** - Retrieves a specific thread
- **PUT** - Updates a specific thread
- **DELETE** - Deletes a specific thread

#### HTTP Endpoints

##### GET /api/chat/threads/[id]

Retrieves a specific thread by ID.

**Path Parameters:**

- `id` (`string`) - Thread ID

**Response:**

```typescript
{
  success: true,
  data: Thread
}
```

##### PUT /api/chat/threads/[id]

Updates a specific thread.

**Path Parameters:**

- `id` (`string`) - Thread ID

**Request Body:**

```typescript
{
  title?: string;
  metadata?: Record<string, unknown>;
}
```

**Response:**

```typescript
{
  success: true,
  data: Thread
}
```

##### DELETE /api/chat/threads/[id]

Deletes a specific thread.

**Path Parameters:**

- `id` (`string`) - Thread ID

**Response:**

```typescript
{
  success: true,
  data: { success: true }
}
```

**Example:**

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

### createCatchAllThreadRouteHandler

Creates a single route handler that handles all thread operations.

```typescript
function createCatchAllThreadRouteHandler(
  config: ThreadRouteConfig,
): (request: NextRequest, context: { params: { route: string[] } }) => Promise<NextResponse>;
```

#### Parameters

- **config** (`ThreadRouteConfig`) - Configuration object (same as other handlers)

#### Returns

Single route handler function that dispatches to appropriate operations based on URL path and HTTP method.

#### Usage

```typescript
// app/api/chat/[...route]/route.ts
import { createCatchAllThreadRouteHandler } from '@pressw/chat-nextjs';
import { adapter } from '@/lib/adapter';
import { getUserContext } from '@/lib/auth';

const handler = createCatchAllThreadRouteHandler({
  adapter,
  getUserContext,
});

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
```

#### Supported Routes

- `GET /api/chat/threads` - List threads
- `POST /api/chat/threads` - Create thread
- `GET /api/chat/threads/[id]` - Get thread
- `PUT /api/chat/threads/[id]` - Update thread
- `DELETE /api/chat/threads/[id]` - Delete thread

## Server Components

### ThreadServerClient

Client for accessing thread data in Server Components without HTTP requests.

```typescript
class ThreadServerClient {
  constructor(config: ThreadServerClientConfig);
  listThreads(options?: Partial<ListThreadsOptions>): Promise<ThreadsResponse>;
  getThread(threadId: string): Promise<Thread | null>;
}
```

#### Constructor

```typescript
constructor(config: ThreadServerClientConfig)
```

**Parameters:**

- **config** (`ThreadServerClientConfig`) - Configuration object containing:
  - `adapter` (`ThreadsAdapter`) - Database adapter instance
  - `userContext` (`UserContext`) - User context for authentication and tenant isolation

#### Methods

##### listThreads

Lists threads for the authenticated user.

```typescript
async listThreads(options?: Partial<ListThreadsOptions>): Promise<ThreadsResponse>
```

**Parameters:**

- **options** (`Partial<ListThreadsOptions>`) - Optional filtering and pagination options:
  - `limit?: number` - Maximum number of threads (default: 50)
  - `offset?: number` - Number of threads to skip (default: 0)
  - `orderBy?: 'createdAt' | 'updatedAt'` - Sort field (default: 'updatedAt')
  - `orderDirection?: 'asc' | 'desc'` - Sort direction (default: 'desc')
  - `search?: string` - Search term for thread titles

**Returns:**

Promise resolving to `ThreadsResponse`:

```typescript
{
  threads: Thread[];
  total: number;
  hasMore: boolean;
}
```

##### getThread

Retrieves a specific thread by ID.

```typescript
async getThread(threadId: string): Promise<Thread | null>
```

**Parameters:**

- **threadId** (`string`) - ID of the thread to retrieve

**Returns:**

Promise resolving to `Thread` object or `null` if not found or access denied.

#### Example

```typescript
// app/threads/page.tsx
import { createThreadServerClient } from '@pressw/chat-nextjs/server';
import { adapter } from '@/lib/adapter';
import { getCurrentUser } from '@/lib/auth';

export default async function ThreadsPage() {
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
    <div>
      <h1>Threads ({threadsResponse.total})</h1>
      {threadsResponse.threads.map((thread) => (
        <div key={thread.id}>
          <h2>{thread.title}</h2>
          <p>Updated: {thread.updatedAt.toLocaleDateString()}</p>
        </div>
      ))}
    </div>
  );
}
```

### createThreadServerClient

Factory function for creating `ThreadServerClient` instances.

```typescript
function createThreadServerClient(config: ThreadServerClientConfig): ThreadServerClient;
```

**Parameters:**

- **config** (`ThreadServerClientConfig`) - Same as `ThreadServerClient` constructor

**Returns:**

New `ThreadServerClient` instance.

## Type Definitions

### ThreadRouteConfig

Configuration object for route handlers.

```typescript
interface ThreadRouteConfig {
  adapter: ThreadsAdapter;
  getUserContext: GetUserContextFn;
}
```

**Properties:**

- **adapter** (`ThreadsAdapter`) - Database adapter instance from `@pressw/threads`
- **getUserContext** (`GetUserContextFn`) - Function that extracts user context from requests

:::note
`ThreadRouteConfig` is defined in `@pressw/chat-nextjs`, not imported from `@pressw/threads`.
:::

#### GetUserContextFn

Function signature for extracting user context from Next.js requests.

```typescript
type GetUserContextFn = (request: NextRequest) => Promise<UserContext>;
```

**Parameters:**

- **request** (`NextRequest`) - Next.js request object

**Returns:**

Promise resolving to `UserContext` object:

```typescript
interface UserContext {
  userId: string;
  organizationId?: string;
  tenantId?: string;
}
```

**Throws:**

Should throw an error if the user is not authenticated or authorization fails.

#### Example Implementation

```typescript
import { NextRequest } from 'next/server';
import { verify } from 'jsonwebtoken';
import type { GetUserContextFn } from '@pressw/threads';

export const getUserContext: GetUserContextFn = async (request: NextRequest) => {
  const authHeader = request.headers.get('authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header');
  }

  const token = authHeader.slice(7);

  try {
    const payload = verify(token, process.env.JWT_SECRET!) as any;

    return {
      userId: payload.userId,
      organizationId: payload.organizationId,
      tenantId: payload.tenantId,
    };
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};
```

### ThreadServerClientConfig

Configuration object for Server Component client.

```typescript
interface ThreadServerClientConfig {
  adapter: ThreadsAdapter;
  userContext: UserContext;
}
```

**Properties:**

- **adapter** (`ThreadsAdapter`) - Database adapter instance
- **userContext** (`UserContext`) - Pre-authenticated user context

## Error Handling

### Error Response Format

All route handlers return standardized error responses:

```typescript
interface ApiError {
  error: string; // Error category
  message: string; // Human-readable error message
  code: string; // Machine-readable error code
}

interface ApiResponse<T> {
  success: boolean;
  data?: T; // Present when success is true
  error?: ApiError; // Present when success is false
}
```

### Error Codes

| Code                 | HTTP Status | Description                            |
| -------------------- | ----------- | -------------------------------------- |
| `VALIDATION_ERROR`   | 400         | Invalid request parameters or body     |
| `NOT_FOUND`          | 404         | Thread not found or access denied      |
| `METHOD_NOT_ALLOWED` | 405         | HTTP method not supported for endpoint |
| `INTERNAL_ERROR`     | 500         | Unexpected server error                |

### Authentication Errors

Authentication errors are handled by the `getUserContext` function. Common patterns:

```typescript
// Unauthorized request
throw new Error('Missing authorization header');

// Invalid token
throw new Error('Invalid or expired token');

// Insufficient permissions
throw new Error('Access denied to organization');
```

These errors will be caught by the route handlers and returned as 500 errors with the message included.

### Error Handling Example

```typescript
// Custom error handling
import { createThreadRouteHandlers } from '@pressw/chat-nextjs';
import { NextResponse } from 'next/server';

const handlers = createThreadRouteHandlers({
  adapter,
  getUserContext: async (request) => {
    try {
      return await extractUserFromRequest(request);
    } catch (error) {
      // Log authentication errors
      console.error('Auth error:', error);
      throw error; // Re-throw to let route handler convert to HTTP response
    }
  },
});

// The route handlers automatically convert thrown errors to appropriate HTTP responses
export const GET = handlers.GET;
export const POST = handlers.POST;
```

## Edge Runtime Support

All route handlers are compatible with Next.js Edge Runtime for improved performance and global distribution.

### Usage

```typescript
// app/api/chat/threads/route.ts
export const runtime = 'edge';

import { createThreadRouteHandlers } from '@pressw/chat-nextjs/edge';
import { adapter } from '@/lib/adapter';
import { getUserContext } from '@/lib/auth';

const handlers = createThreadRouteHandlers({
  adapter,
  getUserContext,
});

export const GET = handlers.GET;
export const POST = handlers.POST;
```

### Limitations

- Some database adapters may not be compatible with Edge Runtime
- File system access is not available
- Node.js-specific APIs are not available

Refer to the [Next.js Edge Runtime documentation](https://nextjs.org/docs/app/building-your-application/rendering/edge-and-nodejs-runtimes) for more details.

## Package Exports

The `@pressw/chat-nextjs` package provides multiple entry points:

```typescript
// Main entry point - route handlers
import { createThreadRouteHandlers } from '@pressw/chat-nextjs';

// Server Components client
import { createThreadServerClient } from '@pressw/chat-nextjs/server';

// Edge Runtime compatible (limited exports)
import { createThreadRouteHandlers } from '@pressw/chat-nextjs/edge';
```

### Available Exports

#### Main (`@pressw/chat-nextjs`)

- `createThreadRouteHandlers`
- `createThreadDetailRouteHandlers`
- `createCatchAllThreadRouteHandler`
- Type definitions: `ThreadRouteConfig`

#### Server (`@pressw/chat-nextjs/server`)

- `ThreadServerClient`
- `createThreadServerClient`
- Type definitions: `ThreadServerClientConfig`

#### Edge (`@pressw/chat-nextjs/edge`)

- `createThreadRouteHandlers`
- `createThreadDetailRouteHandlers`
- `createCatchAllThreadRouteHandler`
- Type definitions: `ThreadRouteConfig`

:::note
The Edge Runtime export provides the same API as the main export but is optimized for Edge Runtime environments.
:::
