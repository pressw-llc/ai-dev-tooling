---
sidebar_position: 1
---

# Getting Started

This guide will walk you through setting up the `@pressw/chat-nextjs` package in a new or existing Next.js application.

## Prerequisites

Before starting, ensure you have:

- Next.js 13+ with App Router (or Pages Router with limited support)
- A database supported by `@pressw/chat-core` adapters
- Basic understanding of Next.js API routes and Server Components

## Installation

Install the required packages:

```bash
npm install @pressw/chat-nextjs @pressw/chat-core
# or
bun add @pressw/chat-nextjs @pressw/chat-core
```

## Step 1: Database Setup

First, set up your database and create the required tables. The exact setup depends on your database adapter.

### Using Drizzle (PostgreSQL)

```typescript
// lib/db/schema.ts
import { pgTable, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';

export const threads = pgTable(
  'threads',
  {
    id: text('id').primaryKey().default('gen_random_uuid()'),
    title: text('title'),
    userId: text('user_id').notNull(),
    organizationId: text('organization_id'),
    tenantId: text('tenant_id'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('threads_user_id_idx').on(table.userId),
    orgIdIdx: index('threads_org_id_idx').on(table.organizationId),
    tenantIdIdx: index('threads_tenant_id_idx').on(table.tenantId),
  }),
);
```

```typescript
// lib/db/index.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const client = postgres(process.env.DATABASE_URL!);
export const db = drizzle(client, { schema });
```

### Database Migration

Create and run a migration to set up the tables:

```sql
-- migrations/001_create_threads.sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE threads (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  user_id TEXT NOT NULL,
  organization_id TEXT,
  tenant_id TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX threads_user_id_idx ON threads(user_id);
CREATE INDEX threads_org_id_idx ON threads(organization_id);
CREATE INDEX threads_tenant_id_idx ON threads(tenant_id);
```

## Step 2: Configure Database Adapter

Create a database adapter using `@pressw/chat-core`:

```typescript
// lib/adapter.ts
import { createDrizzleAdapter } from '@pressw/chat-core/adapters';
import { db } from './db';

export const adapter = createDrizzleAdapter({
  db,
  config: {
    provider: 'pg',
    tables: {
      thread: 'threads',
      user: 'users', // if you have a users table
      feedback: 'feedback', // if you need feedback functionality
    },
    supportsJSON: true,
    supportsDates: true,
    supportsBooleans: true,
    supportsReturning: true,
  },
});
```

## Step 3: Implement Authentication

Create a function to extract user context from requests:

```typescript
// lib/auth.ts
import { NextRequest } from 'next/server';
import { verify } from 'jsonwebtoken';
import type { GetUserContextFn, UserContext } from '@pressw/chat-core';

export const getUserContext: GetUserContextFn = async (
  request: NextRequest,
): Promise<UserContext> => {
  // Option 1: JWT from Authorization header
  const authHeader = request.headers.get('authorization');

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);

    try {
      const payload = verify(token, process.env.JWT_SECRET!) as any;

      return {
        userId: payload.sub || payload.userId,
        organizationId: payload.organizationId,
        tenantId: payload.tenantId,
      };
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  // Option 2: Session-based authentication
  const sessionCookie = request.cookies.get('session')?.value;

  if (sessionCookie) {
    const session = await validateSession(sessionCookie);

    if (session?.user) {
      return {
        userId: session.user.id,
        organizationId: session.user.organizationId,
        tenantId: session.user.tenantId,
      };
    }
  }

  // Option 3: API key authentication
  const apiKey = request.headers.get('x-api-key');

  if (apiKey) {
    const user = await validateApiKey(apiKey);

    if (user) {
      return {
        userId: user.id,
        organizationId: user.organizationId,
        tenantId: user.tenantId,
      };
    }
  }

  throw new Error('Authentication required');
};

// Helper functions (implement based on your auth system)
async function validateSession(sessionId: string) {
  // Implement session validation
  // Return user object or null
}

async function validateApiKey(apiKey: string) {
  // Implement API key validation
  // Return user object or null
}
```

## Step 4: Create API Routes

### Option A: Individual Route Files

Create separate files for list/create and detail operations:

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

### Option B: Catch-All Route

Create a single file that handles all thread operations:

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

## Step 5: Create React Components

Create components that use the thread functionality:

```typescript
// components/ThreadList.tsx
'use client';

import { useThreads, useCreateThread, useDeleteThread } from '@pressw/chat-core/react';
import { useState } from 'react';

export function ThreadList() {
  const [newThreadTitle, setNewThreadTitle] = useState('');

  const {
    data: threadsResponse,
    isLoading,
    error,
    refetch
  } = useThreads({
    apiConfig: {
      baseUrl: '/api/chat',
    },
    listOptions: {
      limit: 20,
      orderBy: 'updatedAt',
      orderDirection: 'desc',
    },
  });

  const createThreadMutation = useCreateThread({
    apiConfig: {
      baseUrl: '/api/chat',
    },
    onSuccess: () => {
      setNewThreadTitle('');
      refetch();
    },
  });

  const deleteThreadMutation = useDeleteThread({
    apiConfig: {
      baseUrl: '/api/chat',
    },
    onSuccess: () => {
      refetch();
    },
  });

  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newThreadTitle.trim()) return;

    createThreadMutation.mutate({
      title: newThreadTitle,
      metadata: {
        source: 'web-app',
        createdAt: new Date().toISOString(),
      },
    });
  };

  const handleDeleteThread = (threadId: string) => {
    if (confirm('Are you sure you want to delete this thread?')) {
      deleteThreadMutation.mutate(threadId);
    }
  };

  if (isLoading) {
    return <div className="p-4">Loading threads...</div>;
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded">
        <p className="text-red-700">Error loading threads: {error.message}</p>
        <button
          onClick={() => refetch()}
          className="mt-2 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const threads = threadsResponse?.threads || [];

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4">
          Threads ({threadsResponse?.total || 0})
        </h1>

        <form onSubmit={handleCreateThread} className="flex gap-2">
          <input
            type="text"
            value={newThreadTitle}
            onChange={(e) => setNewThreadTitle(e.target.value)}
            placeholder="Enter thread title..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={createThreadMutation.isPending || !newThreadTitle.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {createThreadMutation.isPending ? 'Creating...' : 'Create Thread'}
          </button>
        </form>
      </div>

      <div className="space-y-4">
        {threads.map((thread) => (
          <div
            key={thread.id}
            className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  {thread.title || 'Untitled Thread'}
                </h3>
                <p className="text-sm text-gray-500">
                  Created: {new Date(thread.createdAt).toLocaleDateString()}
                </p>
                <p className="text-sm text-gray-500">
                  Updated: {new Date(thread.updatedAt).toLocaleDateString()}
                </p>
                {thread.metadata && (
                  <p className="text-xs text-gray-400 mt-1">
                    Source: {(thread.metadata as any).source || 'unknown'}
                  </p>
                )}
              </div>
              <button
                onClick={() => handleDeleteThread(thread.id)}
                disabled={deleteThreadMutation.isPending}
                className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                {deleteThreadMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        ))}

        {threads.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No threads yet. Create your first thread above!
          </div>
        )}

        {threadsResponse?.hasMore && (
          <div className="text-center py-4">
            <button className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
              Load More
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

## Step 6: Create Pages

Create pages that use your components:

```typescript
// app/threads/page.tsx
import { ThreadList } from '@/components/ThreadList';

export default function ThreadsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <ThreadList />
    </div>
  );
}
```

For Server Components with SSR:

```typescript
// app/threads/server/page.tsx
import { createThreadServerClient } from '@pressw/chat-nextjs/server';
import { adapter } from '@/lib/adapter';
import { getCurrentUser } from '@/lib/auth-server';

export default async function ServerThreadsPage() {
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
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">
          Server-Rendered Threads ({threadsResponse.total})
        </h1>

        <div className="space-y-4">
          {threadsResponse.threads.map((thread) => (
            <div
              key={thread.id}
              className="p-4 bg-white border border-gray-200 rounded-lg"
            >
              <h3 className="text-lg font-semibold">
                {thread.title || 'Untitled Thread'}
              </h3>
              <p className="text-sm text-gray-500">
                Updated: {thread.updatedAt.toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// lib/auth-server.ts - Server-side authentication
export async function getCurrentUser() {
  // Implement server-side user authentication
  // This could use cookies, sessions, etc.
  // Return UserContext object
}
```

## Step 7: Environment Configuration

Set up your environment variables:

```bash
# .env.local
DATABASE_URL="postgresql://username:password@localhost:5432/myapp"
JWT_SECRET="your-jwt-secret-key"
NEXTAUTH_SECRET="your-nextauth-secret" # if using NextAuth.js
```

## Testing Your Setup

1. Start your Next.js development server:

```bash
npm run dev
```

2. Test the API endpoints directly:

```bash
# List threads
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/chat/threads

# Create a thread
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"My First Thread"}' \
  http://localhost:3000/api/chat/threads
```

3. Visit your threads page at `http://localhost:3000/threads`

## Common Issues and Solutions

### Authentication Errors

**Problem**: Getting 500 errors with "Authentication required"

**Solution**: Ensure your `getUserContext` function is properly implemented and the client is sending the correct authentication headers.

### Database Connection Issues

**Problem**: Database connection errors

**Solution**:

- Verify your `DATABASE_URL` is correct
- Ensure your database is running
- Check that the required tables exist

### Type Errors

**Problem**: TypeScript compilation errors

**Solution**:

- Ensure you're importing types from the correct packages
- Check that your database schema matches the expected types
- Verify peer dependencies are installed

### CORS Issues

**Problem**: CORS errors when calling from frontend

**Solution**: Add CORS headers to your API routes:

```typescript
// app/api/chat/threads/route.ts
import { NextResponse } from 'next/server';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
```

## Next Steps

- [API Reference](../api) - Detailed API documentation
- [Integration Patterns](./integration-patterns) - Advanced integration examples
- [Authentication Guide](./authentication) - In-depth authentication setup
- [Server Components](./server-components) - Using threads in Server Components
- [Performance Optimization](./performance) - Optimizing your thread implementation
