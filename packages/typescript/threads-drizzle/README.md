# @pressw/threads-drizzle

Drizzle ORM adapter for PressW thread management system.

## Installation

```bash
npm install @pressw/threads-drizzle @pressw/threads drizzle-orm
# or
yarn add @pressw/threads-drizzle @pressw/threads drizzle-orm
# or
bun add @pressw/threads-drizzle @pressw/threads drizzle-orm
```

## Usage

```typescript
import { createDrizzleAdapter } from '@pressw/threads-drizzle';
import { ThreadUtilityClient } from '@pressw/threads';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// Set up your database
const sql = postgres(DATABASE_URL);
const db = drizzle(sql);

// Create the adapter
const adapter = createDrizzleAdapter(db, {
  provider: 'pg', // 'pg' | 'mysql' | 'sqlite'
  tables: {
    user: 'users',
    thread: 'threads',
    feedback: 'feedback',
  },
});

// Create a thread client
const threadClient = new ThreadUtilityClient(adapter, async (request) => ({
  userId: 'user-123',
  organizationId: 'org-456',
}));

// Use the thread client
const thread = await threadClient.createThread(request, {
  title: 'New Conversation',
  metadata: { source: 'web' },
});
```

## Features

- **Database Agnostic**: Works with PostgreSQL, MySQL, and SQLite
- **Type Safety**: Full TypeScript support with Drizzle ORM
- **Field Mapping**: Map your existing database schema to PressW's thread model
- **Multi-tenant Support**: Built-in support for organization and tenant isolation
- **Performance**: Leverages Drizzle's query optimization

## Configuration

The adapter accepts the following configuration options:

```typescript
interface DrizzleAdapterConfig {
  // Required: Database provider
  provider: 'pg' | 'mysql' | 'sqlite';

  // Required: Map model names to your table names
  tables: {
    user: string; // e.g., "users", "customers", "accounts"
    thread: string; // e.g., "threads", "conversations", "chats"
    feedback: string; // e.g., "feedback", "ratings", "reviews"
  };

  // Optional: Map field names to your column names
  fields?: {
    user?: {
      id?: string;
      name?: string;
      createdAt?: string;
      updatedAt?: string;
    };
    thread?: {
      id?: string;
      title?: string;
      userId?: string;
      organizationId?: string;
      tenantId?: string;
      metadata?: string;
      createdAt?: string;
      updatedAt?: string;
    };
    feedback?: {
      id?: string;
      threadId?: string;
      userId?: string;
      type?: string;
      value?: string;
      comment?: string;
      messageId?: string;
      helpful?: string;
      rating?: string;
      createdAt?: string;
      updatedAt?: string;
    };
  };

  // Optional: Database capabilities
  supportsJSON?: boolean; // Default: true for PostgreSQL
  supportsDates?: boolean; // Default: true
  supportsBooleans?: boolean; // Default: true
  supportsReturning?: boolean; // Default: true except MySQL

  // Optional: Debug logging
  debugLogs?: boolean;
}
```

## Schema Requirements

Your database tables must have the following required fields:

### User Table

- `id` (primary key)
- `name` (string)
- `createdAt` (timestamp)
- `updatedAt` (timestamp)

### Thread Table

- `id` (primary key)
- `userId` (foreign key to user)
- `createdAt` (timestamp)
- `updatedAt` (timestamp)
- `title` (optional string)
- `organizationId` (optional string)
- `tenantId` (optional string)
- `metadata` (optional JSON/text)

### Feedback Table

- `id` (primary key)
- `threadId` (foreign key to thread)
- `userId` (foreign key to user)
- `type` (string)
- `createdAt` (timestamp)
- `updatedAt` (timestamp)
- Additional optional fields...

## Field Mapping Example

If your database uses different field names, you can map them:

```typescript
const adapter = createDrizzleAdapter(db, {
  provider: 'pg',
  tables: {
    user: 'app_users',
    thread: 'conversations',
    feedback: 'user_feedback',
  },
  fields: {
    user: {
      id: 'user_id',
      name: 'display_name',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
    thread: {
      id: 'conversation_id',
      userId: 'owner_id',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  },
});
```

## Database-Specific Features

### PostgreSQL

- Native JSON support
- RETURNING clause for efficient creates/updates
- Advanced query operators

### MySQL

- JSON stored as text (auto-converted)
- No RETURNING clause (adapter handles this)

### SQLite

- JSON stored as text (auto-converted)
- Limited query operators

## API Reference

See the [API documentation](./API.md) for detailed information about available methods and options.

## Migration from Built-in Adapter

If you're migrating from the previous built-in Drizzle adapter:

```typescript
// Before (built-in)
import { createDrizzleAdapter } from '@pressw/threads';

// After (separate package)
import { createDrizzleAdapter } from '@pressw/threads-drizzle';

// Usage remains the same!
```

## Support

For issues and questions:

- [GitHub Issues](https://github.com/pressw/ai-dev-tooling/issues)
- [Documentation](https://docs.pressw.ai)
