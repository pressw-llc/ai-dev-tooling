---
sidebar_position: 1
title: '@pressw/threads'
---

# @pressw/threads

A flexible, type-safe thread management library for building conversational interfaces, support systems, and any threaded data structure.

## Overview

`@pressw/threads` is a modern TypeScript library that provides a complete solution for managing threaded conversations and hierarchical data structures. Whether you're building a chat application, support ticket system, task manager, or discussion forum, this library offers the flexibility and type safety you need.

### Key Features

- 🏗️ **Thread-First Architecture** - Built from the ground up for managing threaded data
- 🔌 **Database Agnostic** - Support for PostgreSQL, MySQL, and SQLite through adapters
- 🏢 **Multi-Tenant Ready** - Built-in user, organization, and tenant isolation
- ⚛️ **React Integration** - Powerful hooks with optimistic updates and caching
- 🛡️ **Type Safe** - Full TypeScript support with runtime validation via Zod
- 🎯 **Flexible Metadata** - Store any custom data with your threads
- 🚀 **Performance Optimized** - Efficient queries with pagination and search

## Installation

```bash
npm install @pressw/threads
# or
yarn add @pressw/threads
# or
pnpm add @pressw/threads
# or
bun add @pressw/threads
```

## Quick Start

### 1. Set Up Your Database

First, ensure you have the required database tables. The library expects three tables: `users`, `threads`, and `feedback`.

```sql
-- Example PostgreSQL schema
CREATE TABLE users (
  id VARCHAR PRIMARY KEY,
  email VARCHAR NOT NULL,
  name VARCHAR,
  image VARCHAR
);

CREATE TABLE threads (
  id VARCHAR PRIMARY KEY,
  title VARCHAR NOT NULL,
  user_id VARCHAR NOT NULL REFERENCES users(id),
  organization_id VARCHAR,
  tenant_id VARCHAR,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE feedback (
  id VARCHAR PRIMARY KEY,
  thread_id VARCHAR NOT NULL REFERENCES threads(id),
  user_id VARCHAR NOT NULL REFERENCES users(id),
  type VARCHAR NOT NULL,
  message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### 2. Configure Your Adapter

Choose and configure a database adapter:

```typescript
import { createAdapter } from '@pressw/threads/adapters';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// Create database connection
const sql = postgres(process.env.DATABASE_URL!);
const db = drizzle(sql);

// Create adapter with your schema
const adapter = createAdapter({
  provider: 'postgresql',
  db,
  schema: {
    users: usersTable,
    threads: threadsTable,
    feedback: feedbackTable,
  },
});
```

### 3. Create Thread Client

```typescript
import { ThreadUtilityClient } from '@pressw/threads';

const threadClient = new ThreadUtilityClient({
  adapter,
  getUserContext: async (userId) => {
    // Return user context for multi-tenancy
    return {
      id: userId,
      organizationId: 'org_123',
      tenantId: 'tenant_456',
    };
  },
});
```

### 4. Use in Your Application

```typescript
// Create a thread
const thread = await threadClient.createThread(userId, {
  title: 'Project Discussion',
  metadata: {
    category: 'general',
    priority: 'normal',
  },
});

// List threads
const threads = await threadClient.listThreads(userId, {
  limit: 20,
  search: 'project',
});

// Update thread
await threadClient.updateThread(userId, threadId, {
  title: 'Updated Title',
  metadata: {
    ...thread.metadata,
    status: 'resolved',
  },
});
```

### 5. React Integration

```tsx
import { ThreadsProvider, useThreads, useCreateThread } from '@pressw/threads/react';

function App() {
  return (
    <ThreadsProvider adapter={adapter} userId={currentUserId}>
      <ThreadList />
    </ThreadsProvider>
  );
}

function ThreadList() {
  const { data: threads, isLoading } = useThreads();
  const createThread = useCreateThread();

  const handleCreate = async () => {
    await createThread.mutateAsync({
      title: 'New Thread',
      metadata: { type: 'discussion' },
    });
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <button onClick={handleCreate}>Create Thread</button>
      {threads?.map((thread) => (
        <div key={thread.id}>
          <h3>{thread.title}</h3>
          <p>Created: {thread.createdAt}</p>
        </div>
      ))}
    </div>
  );
}
```

## Core Concepts

### Threads

Threads are the central entity in the library. Each thread has:

- Unique identifier
- Title
- Owner (userId)
- Multi-tenant support (organizationId, tenantId)
- Flexible metadata for custom data
- Timestamps (createdAt, updatedAt)

### Adapters

Adapters provide the database abstraction layer, allowing the library to work with different database systems. Currently supported:

- PostgreSQL (via Drizzle ORM)
- MySQL (via Drizzle ORM)
- SQLite (via Drizzle ORM)

### User Context

The library uses a user context system for multi-tenant data isolation. Every operation is scoped to the current user's context, ensuring data security and proper access control.

## Use Cases

`@pressw/threads` is designed to be flexible enough for various applications:

- **Chat Applications** - Real-time messaging with conversation threads
- **Support Systems** - Ticket management with customer interactions
- **Task Management** - Hierarchical task organization
- **Discussion Forums** - Topic-based discussions with replies
- **Comment Systems** - Nested comments on articles or posts
- **Project Management** - Team collaboration threads

## Next Steps

- [API Reference](./api) - Complete API documentation
- [React Hooks](./react-hooks) - Detailed guide on React integration
- [Adapters](./adapters) - Database adapter configuration
- [Examples](./examples) - Real-world implementation examples
