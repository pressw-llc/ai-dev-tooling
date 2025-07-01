---
sidebar_position: 4
---

# Examples

This page provides comprehensive, real-world examples of using `@pressw/chat-nextjs` in various scenarios.

## Complete Next.js App Example

### Project Structure

```
my-chat-app/
├── app/
│   ├── api/
│   │   └── chat/
│   │       ├── threads/
│   │       │   ├── route.ts
│   │       │   └── [id]/
│   │       │       └── route.ts
│   │       └── [...route]/
│   │           └── route.ts
│   ├── threads/
│   │   ├── page.tsx
│   │   ├── [id]/
│   │   │   └── page.tsx
│   │   └── loading.tsx
│   └── layout.tsx
├── components/
│   ├── ThreadList.tsx
│   ├── ThreadDetail.tsx
│   └── CreateThreadForm.tsx
├── lib/
│   ├── adapter.ts
│   ├── auth.ts
│   └── db.ts
└── package.json
```

### Database Schema

```sql
-- migrations/001_threads.sql
CREATE TABLE threads (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  user_id TEXT NOT NULL,
  organization_id TEXT,
  tenant_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX threads_user_id_idx ON threads(user_id);
CREATE INDEX threads_org_id_idx ON threads(organization_id);
CREATE INDEX threads_tenant_id_idx ON threads(tenant_id);
CREATE INDEX threads_updated_at_idx ON threads(updated_at DESC);

-- For search functionality
CREATE INDEX threads_title_search_idx ON threads USING gin(to_tsvector('english', title));
```

### Environment Setup

```bash
# .env.local
DATABASE_URL="postgresql://username:password@localhost:5432/chatapp"
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
NEXTAUTH_SECRET="your-nextauth-secret"
NEXTAUTH_URL="http://localhost:3000"
```

### Database Configuration

```typescript
// lib/db.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { pgTable, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';

export const threads = pgTable(
  'threads',
  {
    id: text('id').primaryKey().default('gen_random_uuid()'),
    title: text('title'),
    userId: text('user_id').notNull(),
    organizationId: text('organization_id'),
    tenantId: text('tenant_id'),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('threads_user_id_idx').on(table.userId),
    orgIdIdx: index('threads_org_id_idx').on(table.organizationId),
    tenantIdIdx: index('threads_tenant_id_idx').on(table.tenantId),
    updatedAtIdx: index('threads_updated_at_idx').on(table.updatedAt),
  }),
);

const client = postgres(process.env.DATABASE_URL!);
export const db = drizzle(client, { schema: { threads } });
```

### Adapter Configuration

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
    },
    supportsJSON: true,
    supportsDates: true,
    supportsBooleans: true,
    supportsReturning: true,
  },
});
```

### Authentication Setup

```typescript
// lib/auth.ts
import { NextRequest } from 'next/server';
import { verify } from 'jsonwebtoken';
import type { GetUserContextFn } from '@pressw/chat-core';

export const getUserContext: GetUserContextFn = async (request: NextRequest) => {
  // Try multiple authentication methods

  // 1. JWT from Authorization header (for API clients)
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
      throw new Error('Invalid authorization token');
    }
  }

  // 2. Session cookie (for web app)
  const sessionCookie = request.cookies.get('session')?.value;
  if (sessionCookie) {
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

  // 3. Development mode - allow hardcoded user
  if (process.env.NODE_ENV === 'development') {
    const devUserId = request.headers.get('x-dev-user-id');
    if (devUserId) {
      return {
        userId: devUserId,
        organizationId: 'dev-org',
        tenantId: 'dev-tenant',
      };
    }
  }

  throw new Error('Authentication required');
};
```

### API Routes

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

### React Components

```typescript
// components/CreateThreadForm.tsx
'use client';

import { useState } from 'react';
import { useCreateThread } from '@pressw/chat-core/react';

interface CreateThreadFormProps {
  onSuccess?: () => void;
}

export function CreateThreadForm({ onSuccess }: CreateThreadFormProps) {
  const [title, setTitle] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const createThreadMutation = useCreateThread({
    apiConfig: {
      baseUrl: '/api/chat',
    },
    onSuccess: () => {
      setTitle('');
      setIsOpen(false);
      onSuccess?.();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    createThreadMutation.mutate({
      title,
      metadata: {
        source: 'web-app',
        createdAt: new Date().toISOString(),
      },
    });
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Create New Thread
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-4 border rounded-lg">
      <div className="mb-4">
        <label htmlFor="title" className="block text-sm font-medium mb-2">
          Thread Title
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter thread title..."
          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoFocus
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={createThreadMutation.isPending || !title.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {createThreadMutation.isPending ? 'Creating...' : 'Create'}
        </button>
        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            setTitle('');
          }}
          className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
        >
          Cancel
        </button>
      </div>

      {createThreadMutation.error && (
        <div className="mt-2 text-sm text-red-600">
          Error: {createThreadMutation.error.message}
        </div>
      )}
    </form>
  );
}
```

```typescript
// components/ThreadList.tsx
'use client';

import { useState } from 'react';
import { useThreads, useDeleteThread } from '@pressw/chat-core/react';
import { CreateThreadForm } from './CreateThreadForm';
import Link from 'next/link';

export function ThreadList() {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'updatedAt'>('updatedAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const {
    data: threadsResponse,
    isLoading,
    error,
    refetch,
  } = useThreads({
    apiConfig: {
      baseUrl: '/api/chat',
    },
    listOptions: {
      limit: 20,
      search: search || undefined,
      orderBy: sortBy,
      orderDirection: sortDirection,
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

  const handleDeleteThread = (threadId: string, title: string) => {
    if (confirm(`Are you sure you want to delete "${title || 'Untitled Thread'}"?`)) {
      deleteThreadMutation.mutate(threadId);
    }
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="text-red-800 font-semibold">Error loading threads</h3>
        <p className="text-red-600">{error.message}</p>
        <button
          onClick={() => refetch()}
          className="mt-2 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold">
          Threads {threadsResponse && `(${threadsResponse.total})`}
        </h1>
        <CreateThreadForm onSuccess={refetch} />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search threads..."
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'createdAt' | 'updatedAt')}
            className="px-3 py-2 border border-gray-300 rounded"
          >
            <option value="updatedAt">Sort by Updated</option>
            <option value="createdAt">Sort by Created</option>
          </select>
          <select
            value={sortDirection}
            onChange={(e) => setSortDirection(e.target.value as 'asc' | 'desc')}
            className="px-3 py-2 border border-gray-300 rounded"
          >
            <option value="desc">Newest First</option>
            <option value="asc">Oldest First</option>
          </select>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse bg-gray-200 h-24 rounded-lg"></div>
          ))}
        </div>
      )}

      {/* Thread List */}
      {threadsResponse && (
        <div className="space-y-4">
          {threadsResponse.threads.map((thread) => (
            <div
              key={thread.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <Link
                    href={`/threads/${thread.id}`}
                    className="text-lg font-semibold text-blue-600 hover:text-blue-800"
                  >
                    {thread.title || 'Untitled Thread'}
                  </Link>
                  <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600">
                    <span>Created: {new Date(thread.createdAt).toLocaleDateString()}</span>
                    <span>Updated: {new Date(thread.updatedAt).toLocaleDateString()}</span>
                    {thread.metadata && (thread.metadata as any).source && (
                      <span>Source: {(thread.metadata as any).source}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteThread(thread.id, thread.title)}
                  disabled={deleteThreadMutation.isPending}
                  className="ml-4 px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                >
                  {deleteThreadMutation.isPending ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          ))}

          {threadsResponse.threads.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">No threads found</p>
              {search && (
                <p className="mt-2">Try adjusting your search criteria</p>
              )}
            </div>
          )}

          {threadsResponse.hasMore && (
            <div className="text-center">
              <button className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
                Load More Threads
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

```typescript
// components/ThreadDetail.tsx
'use client';

import { useState } from 'react';
import { useThread, useUpdateThread, useDeleteThread } from '@pressw/chat-core/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ThreadDetailProps {
  threadId: string;
}

export function ThreadDetail({ threadId }: ThreadDetailProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');

  const {
    data: thread,
    isLoading,
    error,
    refetch,
  } = useThread({
    threadId,
    apiConfig: {
      baseUrl: '/api/chat',
    },
  });

  const updateThreadMutation = useUpdateThread({
    apiConfig: {
      baseUrl: '/api/chat',
    },
    onSuccess: () => {
      setIsEditing(false);
      refetch();
    },
  });

  const deleteThreadMutation = useDeleteThread({
    apiConfig: {
      baseUrl: '/api/chat',
    },
    onSuccess: () => {
      router.push('/threads');
    },
  });

  const handleStartEdit = () => {
    setEditTitle(thread?.title || '');
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (!thread) return;

    updateThreadMutation.mutate({
      id: thread.id,
      updates: { title: editTitle },
    });
  };

  const handleDelete = () => {
    if (!thread) return;

    if (confirm(`Are you sure you want to delete "${thread.title || 'Untitled Thread'}"?`)) {
      deleteThreadMutation.mutate(thread.id);
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-300 rounded w-1/2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        <div className="h-32 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (error || !thread) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="text-red-800 font-semibold">Thread not found</h3>
        <p className="text-red-600">
          {error?.message || 'The requested thread could not be found.'}
        </p>
        <Link
          href="/threads"
          className="mt-2 inline-block px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Back to Threads
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div className="flex items-center text-sm text-gray-600">
        <Link href="/threads" className="hover:text-blue-600">
          Threads
        </Link>
        <span className="mx-2">/</span>
        <span>{thread.title || 'Untitled Thread'}</span>
      </div>

      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex-1">
          {isEditing ? (
            <div className="space-y-2">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="text-2xl font-bold w-full px-2 py-1 border-2 border-blue-500 rounded"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveEdit}
                  disabled={updateThreadMutation.isPending || !editTitle.trim()}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {updateThreadMutation.isPending ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1 text-sm bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {thread.title || 'Untitled Thread'}
              </h1>
              <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600">
                <span>Created: {new Date(thread.createdAt).toLocaleDateString()}</span>
                <span>Updated: {new Date(thread.updatedAt).toLocaleDateString()}</span>
                <span>ID: {thread.id}</span>
              </div>
            </div>
          )}
        </div>

        {!isEditing && (
          <div className="flex gap-2 ml-4">
            <button
              onClick={handleStartEdit}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Edit
            </button>
            <button
              onClick={handleDelete}
              disabled={deleteThreadMutation.isPending}
              className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            >
              {deleteThreadMutation.isPending ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        )}
      </div>

      {/* Error Messages */}
      {updateThreadMutation.error && (
        <div className="bg-red-50 border border-red-200 rounded p-3">
          <p className="text-red-600 text-sm">
            Error updating thread: {updateThreadMutation.error.message}
          </p>
        </div>
      )}

      {/* Thread Content */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Thread Details</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <strong>ID:</strong>
            <p className="font-mono text-sm bg-white p-2 rounded border">{thread.id}</p>
          </div>

          <div>
            <strong>Title:</strong>
            <p className="bg-white p-2 rounded border">{thread.title || 'Untitled'}</p>
          </div>

          <div>
            <strong>Created At:</strong>
            <p className="bg-white p-2 rounded border">
              {new Date(thread.createdAt).toLocaleString()}
            </p>
          </div>

          <div>
            <strong>Updated At:</strong>
            <p className="bg-white p-2 rounded border">
              {new Date(thread.updatedAt).toLocaleString()}
            </p>
          </div>
        </div>

        {thread.metadata && Object.keys(thread.metadata).length > 0 && (
          <div className="mt-4">
            <strong>Metadata:</strong>
            <pre className="mt-2 bg-white p-3 rounded border text-sm overflow-auto">
              {JSON.stringify(thread.metadata, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Placeholder for future thread content (messages, etc.) */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Thread Messages</h2>
        <p className="text-gray-600">
          Thread messages functionality can be implemented here using additional
          chat-core features.
        </p>
      </div>
    </div>
  );
}
```

### Pages

```typescript
// app/threads/page.tsx
import { ThreadList } from '@/components/ThreadList';

export default function ThreadsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <ThreadList />
      </div>
    </div>
  );
}
```

```typescript
// app/threads/[id]/page.tsx
import { ThreadDetail } from '@/components/ThreadDetail';
import { notFound } from 'next/navigation';

interface ThreadPageProps {
  params: {
    id: string;
  };
}

export default function ThreadPage({ params }: ThreadPageProps) {
  // Basic validation
  if (!params.id || params.id.length < 5) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <ThreadDetail threadId={params.id} />
      </div>
    </div>
  );
}
```

```typescript
// app/threads/loading.tsx
export default function ThreadsLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="flex justify-between items-center">
            <div className="h-8 bg-gray-300 rounded w-1/4"></div>
            <div className="h-10 bg-gray-300 rounded w-32"></div>
          </div>

          <div className="flex gap-4">
            <div className="h-10 bg-gray-200 rounded flex-1"></div>
            <div className="h-10 bg-gray-200 rounded w-32"></div>
            <div className="h-10 bg-gray-200 rounded w-32"></div>
          </div>

          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

### Layout with Navigation

```typescript
// app/layout.tsx
import './globals.css';
import { QueryClientProvider } from './providers';
import { Navigation } from '@/components/Navigation';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50">
        <QueryClientProvider>
          <div className="min-h-screen">
            <Navigation />
            <main>{children}</main>
          </div>
        </QueryClientProvider>
      </body>
    </html>
  );
}
```

```typescript
// app/providers.tsx
'use client';

import { QueryClient, QueryClientProvider as TanStackQueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export function QueryClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        retry: 1,
      },
    },
  }));

  return (
    <TanStackQueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </TanStackQueryClientProvider>
  );
}
```

### Package.json

```json
{
  "name": "my-chat-app",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "db:migrate": "drizzle-kit push:pg"
  },
  "dependencies": {
    "@pressw/chat-nextjs": "^1.0.0",
    "@pressw/chat-core": "^1.0.0",
    "@tanstack/react-query": "^5.0.0",
    "@tanstack/react-query-devtools": "^5.0.0",
    "drizzle-orm": "^0.30.0",
    "jsonwebtoken": "^9.0.0",
    "next": "14.0.0",
    "postgres": "^3.4.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  },
  "devDependencies": {
    "@types/jsonwebtoken": "^9.0.0",
    "@types/node": "^20.0.0",
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0",
    "drizzle-kit": "^0.20.0",
    "typescript": "^5.0.0"
  }
}
```

## Multi-Tenant SaaS Example

### Organization-Based Tenancy

```typescript
// lib/tenant-resolver.ts
import { NextRequest } from 'next/server';
import type { GetUserContextFn } from '@pressw/chat-core';

export const getTenantFromSubdomain = (request: NextRequest): string | null => {
  const host = request.headers.get('host');
  if (!host) return null;

  // Extract subdomain (e.g., "acme.myapp.com" -> "acme")
  const subdomain = host.split('.')[0];
  if (subdomain === 'www' || subdomain === 'api') return null;

  return subdomain;
};

export const getUserContextWithTenancy: GetUserContextFn = async (request: NextRequest) => {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Authentication required');
  }

  const token = authHeader.slice(7);
  const payload = verify(token, process.env.JWT_SECRET!) as any;

  // Resolve tenant from subdomain
  const tenantFromDomain = getTenantFromSubdomain(request);

  // Verify user has access to this tenant
  if (tenantFromDomain && !payload.tenants?.includes(tenantFromDomain)) {
    throw new Error('Access denied to this organization');
  }

  return {
    userId: payload.sub,
    organizationId: tenantFromDomain || payload.defaultOrg,
    tenantId: tenantFromDomain || payload.defaultTenant,
  };
};
```

### Multi-Environment Configuration

```typescript
// lib/config.ts
const environments = {
  development: {
    apiUrl: 'http://localhost:3000/api',
    corsOrigins: ['http://localhost:3000'],
    jwtExpiry: '7d',
    debugMode: true,
  },
  staging: {
    apiUrl: 'https://staging-api.myapp.com/api',
    corsOrigins: ['https://staging.myapp.com'],
    jwtExpiry: '1d',
    debugMode: true,
  },
  production: {
    apiUrl: 'https://api.myapp.com/api',
    corsOrigins: [
      'https://myapp.com',
      'https://*.myapp.com', // Allow all subdomains
    ],
    jwtExpiry: '1h',
    debugMode: false,
  },
};

export const config =
  environments[process.env.NODE_ENV as keyof typeof environments] || environments.development;
```

## Enterprise Integration Example

### Custom Middleware Integration

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // CORS handling
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  // Rate limiting
  const rateLimitKey = `rate_limit_${request.ip}`;
  // Implement your rate limiting logic here

  // Security headers
  const response = NextResponse.next();
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
}

export const config = {
  matcher: '/api/chat/:path*',
};
```

### Advanced Error Handling

```typescript
// lib/error-handler.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR',
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function handleRouteError(error: unknown): NextResponse {
  console.error('Route error:', error);

  if (error instanceof AppError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error.message,
          code: error.code,
        },
      },
      { status: error.statusCode },
    );
  }

  if (error instanceof z.ZodError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: error.errors,
        },
      },
      { status: 400 },
    );
  }

  // Production: Don't leak error details
  const message =
    process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : error instanceof Error
        ? error.message
        : 'Unknown error';

  return NextResponse.json(
    {
      success: false,
      error: {
        message,
        code: 'INTERNAL_ERROR',
      },
    },
    { status: 500 },
  );
}

// Enhanced route handlers with error handling
export function createEnhancedThreadRouteHandlers(config: ThreadRouteConfig) {
  const baseHandlers = createThreadRouteHandlers(config);

  return {
    async GET(request: NextRequest) {
      try {
        return await baseHandlers.GET(request);
      } catch (error) {
        return handleRouteError(error);
      }
    },
    async POST(request: NextRequest) {
      try {
        return await baseHandlers.POST(request);
      } catch (error) {
        return handleRouteError(error);
      }
    },
  };
}
```

### Testing Setup

```typescript
// __tests__/setup.ts
import { beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { handlers } from './mocks/handlers';

const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

```typescript
// __tests__/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/chat/threads', () => {
    return HttpResponse.json({
      success: true,
      data: {
        threads: [
          {
            id: 'thread-1',
            title: 'Test Thread',
            userId: 'user-1',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        total: 1,
        hasMore: false,
      },
    });
  }),

  http.post('/api/chat/threads', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(
      {
        success: true,
        data: {
          id: 'thread-new',
          title: body.title,
          userId: 'user-1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
      { status: 201 },
    );
  }),
];
```

```typescript
// __tests__/integration/threads.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThreadList } from '@/components/ThreadList';

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
}

describe('ThreadList Integration', () => {
  it('should load and display threads', async () => {
    renderWithProviders(<ThreadList />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Test Thread')).toBeInTheDocument();
    });
  });

  it('should create a new thread', async () => {
    renderWithProviders(<ThreadList />);

    await waitFor(() => {
      expect(screen.getByText('Create New Thread')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Create New Thread'));

    const titleInput = screen.getByPlaceholderText('Enter thread title...');
    fireEvent.change(titleInput, { target: { value: 'New Test Thread' } });

    fireEvent.click(screen.getByText('Create'));

    await waitFor(() => {
      expect(screen.getByText('New Test Thread')).toBeInTheDocument();
    });
  });
});
```

This complete example demonstrates a production-ready Next.js application using `@pressw/chat-nextjs` with:

- Complete CRUD operations for threads
- Responsive UI with Tailwind CSS
- Error handling and loading states
- Multi-tenant support
- Testing setup
- Type safety throughout
- Production-ready configuration

You can use this as a starting point for your own applications and customize it based on your specific requirements.
