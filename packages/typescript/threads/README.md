# @pressw/threads

Core thread management library providing the foundation for building conversational applications. This package defines the interfaces and React hooks, while database implementations are provided through adapter packages.

## Architecture

```
@pressw/threads (this package)
  ├── Core interfaces & types
  ├── React hooks
  └── Base adapter class
      ├── @pressw/threads-drizzle → SQL databases
      └── @pressw/threads-langgraph → Cloud storage
```

## Why @pressw/threads?

`@pressw/threads` provides a robust foundation for managing threaded data structures in your applications:

- 🎯 **Thread-First**: Purpose-built for managing conversational threads
- 🗄️ **Database Agnostic**: Adapter pattern supports any database backend
- 🏢 **Multi-tenant Ready**: Built-in user, organization, and tenant isolation
- ⚛️ **React Optimized**: Hooks with optimistic updates and caching
- 🔒 **Type-Safe**: Full TypeScript support with runtime validation
- 🎨 **Flexible Metadata**: Store any custom data with your threads

## Installation

```bash
npm install @pressw/threads

# Also install a database adapter
npm install @pressw/threads-drizzle drizzle-orm
# OR
npm install @pressw/threads-langgraph @langchain/langgraph-sdk
```

## Quick Start

### 1. Set up ThreadsProvider

```typescript
import { ThreadsProvider } from '@pressw/threads';
import { createDrizzleAdapter } from '@pressw/threads-drizzle';
import { drizzle } from 'drizzle-orm/postgres-js';

const db = drizzle(connectionString);
const adapter = createDrizzleAdapter(db, 'pg');

function App() {
  return (
    <ThreadsProvider
      config={{
        adapter,
        getUserContext: async (req) => ({
          userId: req.headers.get('x-user-id') || 'anonymous',
          organizationId: req.headers.get('x-org-id'),
        }),
      }}
    >
      <YourApp />
    </ThreadsProvider>
  );
}
```

### 2. Use Thread Hooks

```typescript
import { useThreads, useCreateThread } from '@pressw/threads/react';

function ThreadList() {
  const { data: threads, isLoading } = useThreads();
  const createThread = useCreateThread();

  const handleNewThread = async () => {
    const thread = await createThread.mutateAsync({
      title: 'New Thread',
      metadata: {
        type: 'discussion',
        priority: 'high'
      },
    });

    // Navigate to thread
    router.push(`/threads/${thread.id}`);
  };

  return (
    <div>
      <button onClick={handleNewThread}>New Thread</button>
      {threads?.threads.map(thread => (
        <ThreadItem key={thread.id} thread={thread} />
      ))}
    </div>
  );
}
```

## Core Concepts

### Threads

The central unit of organization. Each thread represents a conversation, task, ticket, or any sequential data structure.

```typescript
interface Thread {
  id: string;
  title?: string;
  userId: string;
  organizationId?: string;
  metadata?: Record<string, any>; // Store custom data
  createdAt: Date;
  updatedAt: Date;
}
```

### Metadata

Store any custom data with your threads. Perfect for:

- Task properties (status, assignee, due date)
- Support ticket details (priority, category, customer info)
- Discussion attributes (participants, tags, attachments)

### User Context

Every operation is scoped to a user context, enabling multi-tenant applications.

## Use Cases

### 💬 Chat & Messaging

Build chat applications where each thread is a conversation.

### 🎫 Support Tickets

Track customer support tickets with custom metadata for priority, status, and categories.

### 📋 Task Management

Create task tracking systems where threads represent tasks with assignees and due dates.

### 💭 Discussion Forums

Build discussion platforms where threads are topics with participants and tags.

### 📝 Comments & Reviews

Implement commenting systems where threads group related comments.

## Features

### Thread Management

- Create, update, delete threads
- List threads with pagination and search
- Filter and sort by any field
- Optimistic updates for instant UI feedback

### Database Support

- Adapter pattern for database flexibility
- Official adapters:
  - `@pressw/threads-drizzle` - PostgreSQL, MySQL, SQLite via Drizzle ORM
  - `@pressw/threads-langgraph` - LangGraph Cloud managed storage
- Easy to create custom adapters

### Multi-tenancy

- User-scoped operations
- Organization support
- Tenant isolation
- Row-level security ready

### Developer Experience

- Comprehensive TypeScript types
- Runtime validation with Zod
- React Query integration
- Detailed error messages

## API Reference

### React Hooks

#### useThreads

```typescript
const { data, isLoading, error } = useThreads({
  listOptions: {
    limit: 20,
    offset: 0,
    orderBy: 'updatedAt',
    orderDirection: 'desc',
    search: 'keyword',
  },
});
```

#### useThread

```typescript
const { data: thread } = useThread(threadId);
```

#### useCreateThread

```typescript
const createThread = useCreateThread();
await createThread.mutateAsync({
  title: 'New Thread',
  metadata: {
    /* custom data */
  },
});
```

#### useUpdateThread

```typescript
const updateThread = useUpdateThread();
await updateThread.mutateAsync({
  id: threadId,
  updates: {
    title: 'Updated',
    metadata: {
      /* ... */
    },
  },
});
```

#### useDeleteThread

```typescript
const deleteThread = useDeleteThread();
await deleteThread.mutateAsync(threadId);
```

### Server-side Client

```typescript
import { createThreadUtilityClient } from '@pressw/threads';

const client = createThreadUtilityClient({
  adapter,
  getUserContext: async (req) => ({ userId: 'user-123' }),
});

// CRUD operations
await client.createThread(request, options);
await client.updateThread(request, threadId, updates);
await client.getThread(request, threadId);
await client.listThreads(request, options);
await client.deleteThread(request, threadId);
```

## Available Adapters

Choose the adapter that fits your infrastructure:

### @pressw/threads-drizzle

SQL database adapter supporting PostgreSQL, MySQL, and SQLite through Drizzle ORM.

```bash
npm install @pressw/threads-drizzle drizzle-orm
```

Features:

- Support for PostgreSQL, MySQL, SQLite
- Field mapping for existing schemas
- Transaction support
- Type-safe queries

[Documentation](https://github.com/pressw/ai-dev-tooling/tree/main/packages/typescript/threads-drizzle)

### @pressw/threads-langgraph

Cloud-native adapter for LangGraph Cloud managed storage.

```bash
npm install @pressw/threads-langgraph @langchain/langgraph-sdk
```

Features:

- Managed cloud storage
- Built-in scalability
- Assistant integration
- No database management

[Documentation](https://github.com/pressw/ai-dev-tooling/tree/main/packages/typescript/threads-langgraph)

## Documentation

- [API Documentation](./docs/API.md) - Complete API reference
- [Migration Guide](./docs/MIGRATION.md) - Migrate from @pressw/chat-core
- [Examples](./examples/) - Implementation examples

## Contributing

We welcome contributions! Please see our [Contributing Guide](../../CONTRIBUTING.md) for details.

## License

Apache-2.0 © PressW Team
