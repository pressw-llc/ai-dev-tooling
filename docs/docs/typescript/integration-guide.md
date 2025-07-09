---
sidebar_position: 2
---

# Integration Guide

This guide demonstrates how to integrate all PressW TypeScript packages together to build complete AI-powered applications with thread management.

## Package Overview

The PressW TypeScript ecosystem consists of these packages working together:

```mermaid
graph TB
    subgraph "Your Application"
        A[Next.js App]
        B[React Components]
    end

    subgraph "PressW Packages"
        C[pressw/chat-nextjs]
        D[pressw/chat-ui]
        E[pressw/threads]
        F[pressw/threads-drizzle]
        G[pressw/threads-langgraph]
    end

    subgraph "Storage"
        H[PostgreSQL/MySQL/SQLite]
        I[LangGraph Cloud]
    end

    A --> C
    B --> D
    C --> E
    D --> E
    E --> F
    E --> G
    F --> H
    G --> I

    style E fill:#f9f,stroke:#333,stroke-width:4px
```

## Complete Integration Example

Here's a full example of integrating all packages in a Next.js application:

### 1. Project Setup

```bash
# Create Next.js app
npx create-next-app@latest my-chat-app --typescript --tailwind --app

# Install PressW packages
npm install @pressw/threads @pressw/threads-drizzle @pressw/chat-ui @pressw/chat-nextjs

# Install database driver (choose one)
npm install drizzle-orm postgres  # For PostgreSQL
# OR
npm install drizzle-orm mysql2     # For MySQL
# OR
npm install drizzle-orm better-sqlite3  # For SQLite

# Install other dependencies
npm install @tanstack/react-query
```

### 2. Database Schema Setup

Create your database schema:

```typescript
// lib/db/schema.ts
import { pgTable, uuid, varchar, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const threads = pgTable('threads', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  organizationId: uuid('organization_id'),
  tenantId: varchar('tenant_id', { length: 255 }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const feedback = pgTable('feedback', {
  id: uuid('id').primaryKey().defaultRandom(),
  threadId: uuid('thread_id')
    .notNull()
    .references(() => threads.id),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  messageId: varchar('message_id', { length: 255 }).notNull(),
  rating: varchar('rating', { length: 50 }),
  comment: varchar('comment', { length: 1000 }),
  helpful: boolean('helpful'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### 3. Adapter Configuration

Set up your database adapter:

```typescript
// lib/threads/adapter.ts
import { DrizzleAdapter } from '@pressw/threads-drizzle';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@/lib/db/schema';

// Create database connection
const sql = postgres(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });

// Create adapter
export const adapter = new DrizzleAdapter(db, {
  provider: 'postgres',
  tables: {
    user: 'users',
    thread: 'threads',
    feedback: 'feedback',
  },
});
```

### 4. Thread Client Setup

Configure the thread client with authentication:

```typescript
// lib/threads/client.ts
import { createThreadUtilityClient } from '@pressw/threads';
import { adapter } from './adapter';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export const threadClient = createThreadUtilityClient({
  adapter,
  getUserContext: async (request) => {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      throw new Error('Unauthorized');
    }

    return {
      userId: session.user.id,
      organizationId: session.user.organizationId,
      tenantId: session.user.tenantId,
    };
  },
});
```

### 5. API Routes with Next.js

Use the Next.js integration package:

```typescript
// app/api/threads/[...path]/route.ts
import { createThreadRouteHandlers } from '@pressw/chat-nextjs';
import { threadClient } from '@/lib/threads/client';

const handlers = createThreadRouteHandlers({
  threadClient,
  // Optional: Add middleware
  middleware: async (request) => {
    // Add custom headers, logging, etc.
    console.log('Thread API request:', request.url);
  },
});

export const GET = handlers.GET;
export const POST = handlers.POST;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;
```

### 6. React Provider Setup

Configure React Query and thread context:

```typescript
// app/providers.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setDefaultApiClient, DefaultThreadApiClient } from '@pressw/threads';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
      },
    },
  }));

  // Set up API client
  useState(() => {
    const apiClient = new DefaultThreadApiClient({
      baseUrl: '/api/threads',
      fetchOptions: {
        credentials: 'include',
      },
    });
    setDefaultApiClient(apiClient);
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

### 7. Chat UI Implementation

Create a complete chat interface:

```typescript
// app/chat/page.tsx
'use client';

import { useState } from 'react';
import {
  ChatWindow,
  MessageList,
  MessageInput,
  Message
} from '@pressw/chat-ui';
import {
  useThreads,
  useCreateThread,
  useThread
} from '@pressw/threads';

export default function ChatPage() {
  const [selectedThreadId, setSelectedThreadId] = useState<string>();

  // Thread management hooks
  const { data: threadsData, isLoading } = useThreads({
    limit: 20,
    orderBy: 'updatedAt',
    orderDirection: 'desc',
  });

  const createThread = useCreateThread();
  const { data: selectedThread } = useThread(selectedThreadId);

  // Message handling
  const [messages, setMessages] = useState<Message[]>([]);

  const handleSendMessage = async (content: string) => {
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      role: 'user',
      createdAt: new Date(),
    };
    setMessages([...messages, userMessage]);

    // Send to your AI backend
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        threadId: selectedThreadId,
        message: content,
      }),
    });

    const aiMessage = await response.json();
    setMessages(prev => [...prev, aiMessage]);
  };

  const handleNewChat = async () => {
    const thread = await createThread.mutateAsync({
      title: 'New Chat',
      metadata: {
        source: 'web',
        timestamp: new Date().toISOString(),
      },
    });
    setSelectedThreadId(thread.id);
    setMessages([]);
  };

  return (
    <div className="flex h-screen">
      {/* Thread List Sidebar */}
      <div className="w-64 border-r p-4">
        <button
          onClick={handleNewChat}
          className="w-full mb-4 p-2 bg-blue-500 text-white rounded"
        >
          New Chat
        </button>

        {isLoading ? (
          <div>Loading...</div>
        ) : (
          <div className="space-y-2">
            {threadsData?.threads.map((thread) => (
              <div
                key={thread.id}
                onClick={() => setSelectedThreadId(thread.id)}
                className={`p-2 cursor-pointer rounded ${
                  selectedThreadId === thread.id ? 'bg-blue-100' : 'hover:bg-gray-100'
                }`}
              >
                <div className="font-medium">{thread.title || 'Untitled'}</div>
                <div className="text-sm text-gray-500">
                  {new Date(thread.updatedAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chat Area */}
      <div className="flex-1">
        {selectedThreadId ? (
          <ChatWindow
            title={selectedThread?.title}
            className="h-full"
          >
            <MessageList
              messages={messages}
              className="flex-1"
            />
            <MessageInput
              onSend={handleSendMessage}
              placeholder="Type your message..."
            />
          </ChatWindow>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            Select a chat or create a new one
          </div>
        )}
      </div>
    </div>
  );
}
```

### 8. Advanced Features

#### Multi-Adapter Support

Support both local storage and cloud storage:

```typescript
// lib/threads/multi-adapter.ts
import { DrizzleAdapter } from '@pressw/threads-drizzle';
import { LangGraphAdapter } from '@pressw/threads-langgraph';

// Use environment variable to switch adapters
export function createAdapter() {
  if (process.env.USE_LANGGRAPH === 'true') {
    return new LangGraphAdapter({
      apiUrl: process.env.LANGGRAPH_API_URL!,
      apiKey: process.env.LANGGRAPH_API_KEY!,
      assistantId: process.env.ASSISTANT_ID!,
    });
  }

  return new DrizzleAdapter(db, {
    provider: 'postgres',
    tables: {
      user: 'users',
      thread: 'threads',
      feedback: 'feedback',
    },
  });
}
```

#### Custom Hooks

Create application-specific hooks:

```typescript
// hooks/use-chat.ts
import { useThread, useCreateThread } from '@pressw/threads';
import { useMutation } from '@tanstack/react-query';

export function useChat(threadId?: string) {
  const thread = useThread(threadId);
  const createThread = useCreateThread();

  const sendMessage = useMutation({
    mutationFn: async (message: string) => {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId, message }),
      });
      return response.json();
    },
  });

  return {
    thread: thread.data,
    isLoading: thread.isLoading,
    sendMessage: sendMessage.mutate,
    createNewChat: createThread.mutate,
  };
}
```

#### Server Components

Use server components for initial data loading:

```typescript
// app/chat/[threadId]/page.tsx
import { threadClient } from '@/lib/threads/client';
import { ChatClient } from './chat-client';

export default async function ChatPage({
  params
}: {
  params: { threadId: string }
}) {
  // Fetch initial data on server
  const thread = await threadClient.getThread(
    new Request('http://localhost'),
    params.threadId
  );

  if (!thread) {
    return <div>Thread not found</div>;
  }

  // Pass to client component
  return <ChatClient initialThread={thread} />;
}
```

## Testing Integration

### Unit Tests

Test individual components:

```typescript
// __tests__/thread-client.test.ts
import { createThreadUtilityClient } from '@pressw/threads';
import { DrizzleAdapter } from '@pressw/threads-drizzle';

describe('Thread Client Integration', () => {
  let threadClient: ThreadUtilityClient;

  beforeEach(() => {
    const adapter = new DrizzleAdapter(testDb, {
      provider: 'sqlite',
      tables: {
        user: 'users',
        thread: 'threads',
        feedback: 'feedback',
      },
    });

    threadClient = createThreadUtilityClient({
      adapter,
      getUserContext: async () => ({
        userId: 'test-user',
      }),
    });
  });

  it('should create and retrieve threads', async () => {
    const thread = await threadClient.createThread(new Request('http://test'), {
      title: 'Test Thread',
    });

    expect(thread.title).toBe('Test Thread');

    const retrieved = await threadClient.getThread(new Request('http://test'), thread.id);

    expect(retrieved?.id).toBe(thread.id);
  });
});
```

### Integration Tests

Test the complete flow:

```typescript
// __tests__/chat-flow.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatPage } from '@/app/chat/page';

describe('Chat Flow', () => {
  it('should create thread and send messages', async () => {
    render(<ChatPage />);

    // Create new chat
    const newChatButton = screen.getByText('New Chat');
    await userEvent.click(newChatButton);

    // Type and send message
    const input = screen.getByPlaceholder('Type your message...');
    await userEvent.type(input, 'Hello, AI!');
    await userEvent.keyboard('{Enter}');

    // Verify message appears
    await waitFor(() => {
      expect(screen.getByText('Hello, AI!')).toBeInTheDocument();
    });
  });
});
```

## Production Considerations

### 1. Environment Configuration

```bash
# .env.production
DATABASE_URL=postgresql://user:pass@host:5432/dbname
NEXTAUTH_URL=https://your-app.com
NEXTAUTH_SECRET=your-secret-key

# Optional: LangGraph Cloud
USE_LANGGRAPH=false
LANGGRAPH_API_URL=https://api.langsmith.com
LANGGRAPH_API_KEY=your-api-key
ASSISTANT_ID=your-assistant-id
```

### 2. Database Migrations

Set up Drizzle migrations:

```typescript
// drizzle.config.ts
import type { Config } from 'drizzle-kit';

export default {
  schema: './lib/db/schema.ts',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
} satisfies Config;
```

Run migrations:

```bash
npx drizzle-kit generate:pg
npx drizzle-kit push:pg
```

### 3. Performance Optimization

Implement caching and optimization:

```typescript
// lib/cache/thread-cache.ts
import { LRUCache } from 'lru-cache';
import type { Thread } from '@pressw/threads';

const cache = new LRUCache<string, Thread>({
  max: 500,
  ttl: 1000 * 60 * 5, // 5 minutes
});

export function getCachedThread(id: string): Thread | undefined {
  return cache.get(id);
}

export function setCachedThread(thread: Thread): void {
  cache.set(thread.id, thread);
}

export function invalidateThread(id: string): void {
  cache.delete(id);
}
```

### 4. Error Boundaries

Add error handling for robustness:

```typescript
// app/error.tsx
'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Something went wrong!</h2>
        <p className="text-gray-600 mb-4">{error.message}</p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
```

## Common Patterns

### 1. Real-time Updates

Add WebSocket support for live updates:

```typescript
// hooks/use-realtime.ts
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { threadQueryKeys } from '@pressw/threads';

export function useRealtimeUpdates(threadId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!threadId) return;

    const ws = new WebSocket(`wss://your-api.com/threads/${threadId}`);

    ws.onmessage = (event) => {
      const update = JSON.parse(event.data);

      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: threadQueryKeys.detail(threadId),
      });
    };

    return () => ws.close();
  }, [threadId, queryClient]);
}
```

### 2. Optimistic Updates

Improve perceived performance:

```typescript
// hooks/use-optimistic-thread.ts
import { useUpdateThread } from '@pressw/threads';
import { useQueryClient } from '@tanstack/react-query';

export function useOptimisticThreadUpdate() {
  const queryClient = useQueryClient();
  const updateThread = useUpdateThread();

  return {
    updateTitle: (threadId: string, newTitle: string) => {
      return updateThread.mutate(
        { threadId, data: { title: newTitle } },
        {
          onMutate: async ({ threadId, data }) => {
            // Cancel in-flight queries
            await queryClient.cancelQueries({
              queryKey: ['thread', threadId],
            });

            // Optimistically update
            const previous = queryClient.getQueryData(['thread', threadId]);
            queryClient.setQueryData(['thread', threadId], (old: any) => ({
              ...old,
              ...data,
            }));

            return { previous };
          },
          onError: (err, variables, context) => {
            // Rollback on error
            if (context?.previous) {
              queryClient.setQueryData(['thread', variables.threadId], context.previous);
            }
          },
        },
      );
    },
  };
}
```

## Troubleshooting

### Common Issues

1. **Authentication Errors**

   ```typescript
   // Ensure session is available
   const session = await getServerSession(authOptions);
   if (!session) {
     return new Response('Unauthorized', { status: 401 });
   }
   ```

2. **CORS Issues**

   ```typescript
   // Add CORS headers in Next.js
   export async function OPTIONS(request: Request) {
     return new Response(null, {
       status: 200,
       headers: {
         'Access-Control-Allow-Origin': '*',
         'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
         'Access-Control-Allow-Headers': 'Content-Type, Authorization',
       },
     });
   }
   ```

3. **Type Errors**
   ```typescript
   // Ensure proper type imports
   import type { Thread, User, Feedback } from '@pressw/threads';
   ```

## Next Steps

- Review individual package documentation for detailed APIs
- Explore the [example repository](https://github.com/pressw/chat-example) for a complete implementation
- Join our [Discord community](https://discord.gg/pressw) for support
