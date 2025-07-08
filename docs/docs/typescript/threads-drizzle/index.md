---
sidebar_position: 1
---

# @pressw/threads-drizzle

Drizzle ORM adapter for @pressw/threads, providing SQL database support for thread management with PostgreSQL, MySQL, and SQLite.

## Overview

`@pressw/threads-drizzle` enables you to use your existing SQL database for thread storage with the flexibility of Drizzle ORM. It supports:

- 🐘 **PostgreSQL** - Full JSON support and advanced features
- 🐬 **MySQL** - Wide compatibility and performance
- 🪶 **SQLite** - Lightweight local storage
- 🔄 **Field Mapping** - Use your existing database schema
- 📊 **Type Safety** - Full TypeScript support with Drizzle
- 🚀 **Performance** - Optimized queries with proper indexing

## Installation

```bash
npm install @pressw/threads @pressw/threads-drizzle drizzle-orm

# Database drivers (install the one you need)
npm install postgres     # For PostgreSQL
npm install mysql2       # For MySQL
npm install better-sqlite3  # For SQLite
```

## Quick Start

### 1. Define Your Schema

```typescript
import { pgTable, varchar, text, timestamp, uuid, jsonb } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
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
```

### 2. Create the Adapter

```typescript
import { DrizzleAdapter } from '@pressw/threads-drizzle';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// Create database connection
const sql = postgres(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema: { users, threads } });

// Create adapter
const adapter = new DrizzleAdapter(db, {
  provider: 'postgres',
  tables: {
    user: 'users',
    thread: 'threads',
    feedback: 'feedback',
  },
});
```

### 3. Use with Thread Client

```typescript
import { createThreadUtilityClient } from '@pressw/threads';

const threadClient = createThreadUtilityClient({
  adapter,
  getUserContext: async (request) => {
    // Your auth logic
    return { userId: 'user-123' };
  },
});

// Now you can use all thread operations
const thread = await threadClient.createThread(request, {
  title: 'My Thread',
  metadata: { category: 'support' },
});
```

## Configuration

### Basic Configuration

```typescript
const adapter = new DrizzleAdapter(db, {
  provider: 'postgres', // 'postgres' | 'mysql' | 'sqlite'
  tables: {
    user: 'users', // Your user table name
    thread: 'threads', // Your thread table name
    feedback: 'feedback', // Your feedback table name
  },
});
```

### Advanced Configuration

```typescript
const adapter = new DrizzleAdapter(db, {
  provider: 'postgres',
  tables: {
    user: 'users',
    thread: 'threads',
    feedback: 'feedback',
  },

  // Map your existing column names
  fields: {
    thread: {
      id: 'thread_id', // Map 'id' to 'thread_id' column
      userId: 'user_id', // Map 'userId' to 'user_id' column
      title: 'thread_title', // Map 'title' to 'thread_title' column
      metadata: 'extra_data', // Map 'metadata' to 'extra_data' column
    },
  },

  // Database capabilities
  supportsJSON: true, // PostgreSQL, MySQL 5.7+
  supportsDates: true, // All databases
  supportsBooleans: true, // PostgreSQL, MySQL
  supportsReturning: true, // PostgreSQL only

  // Custom ID generation
  generateId: () => nanoid(),
});
```

## Database Schemas

### PostgreSQL Schema

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Threads table
CREATE TABLE threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID,
  tenant_id VARCHAR(255),
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_threads_user_id ON threads(user_id);
CREATE INDEX idx_threads_organization_id ON threads(organization_id);
CREATE INDEX idx_threads_tenant_id ON threads(tenant_id);
CREATE INDEX idx_threads_created_at ON threads(created_at DESC);
```

### MySQL Schema

```sql
-- Users table
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Threads table
CREATE TABLE threads (
  id VARCHAR(36) PRIMARY KEY,
  title VARCHAR(255),
  user_id VARCHAR(36) NOT NULL,
  organization_id VARCHAR(36),
  tenant_id VARCHAR(255),
  metadata JSON,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_organization_id (organization_id),
  INDEX idx_tenant_id (tenant_id),
  INDEX idx_created_at (created_at DESC)
);
```

### SQLite Schema

```sql
-- Users table
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Threads table
CREATE TABLE threads (
  id TEXT PRIMARY KEY,
  title TEXT,
  user_id TEXT NOT NULL,
  organization_id TEXT,
  tenant_id TEXT,
  metadata TEXT, -- JSON stored as text
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_threads_user_id ON threads(user_id);
CREATE INDEX idx_threads_organization_id ON threads(organization_id);
CREATE INDEX idx_threads_tenant_id ON threads(tenant_id);
CREATE INDEX idx_threads_created_at ON threads(created_at DESC);
```

## Using Existing Databases

If you have an existing database with different column names, use field mapping:

```typescript
// Your existing schema
const legacyThreads = pgTable('conversations', {
  conversationId: uuid('conversation_id').primaryKey(),
  subject: varchar('subject', { length: 500 }),
  ownerId: uuid('owner_id').notNull(),
  companyId: uuid('company_id'),
  customData: jsonb('custom_data'),
  createdDate: timestamp('created_date').notNull(),
  modifiedDate: timestamp('modified_date').notNull(),
});

// Map to thread model
const adapter = new DrizzleAdapter(db, {
  provider: 'postgres',
  tables: {
    user: 'users',
    thread: 'conversations', // Your table name
    feedback: 'feedback',
  },
  fields: {
    thread: {
      id: 'conversation_id',
      title: 'subject',
      userId: 'owner_id',
      organizationId: 'company_id',
      metadata: 'custom_data',
      createdAt: 'created_date',
      updatedAt: 'modified_date',
    },
  },
});
```

## Advanced Features

### Custom Queries

Access the underlying Drizzle instance for custom queries:

```typescript
import { sql } from 'drizzle-orm';

// Get schema from adapter
const threadSchema = adapter.getSchema('thread');

// Custom query with Drizzle
const popularThreads = await db
  .select()
  .from(threadSchema)
  .where(sql`metadata->>'views' > 100`)
  .orderBy(sql`metadata->>'views' DESC`)
  .limit(10);
```

### Transactions

Use Drizzle transactions for atomic operations:

```typescript
await db.transaction(async (tx) => {
  // Create thread using adapter with transaction
  const thread = await adapter.create({
    model: 'thread',
    data: threadData,
  });

  // Additional operations in same transaction
  await tx.insert(activities).values({
    threadId: thread.id,
    action: 'created',
  });
});
```

### Database-Specific Features

```typescript
// PostgreSQL: Use JSONB operators
const threads = await adapter.findMany({
  model: 'thread',
  where: [
    {
      field: 'metadata',
      value: { category: 'support' },
      operator: 'contains', // Uses @> operator
    },
  ],
});

// MySQL: Full-text search
const results = await db
  .select()
  .from(threads)
  .where(sql`MATCH(title) AGAINST(${searchTerm} IN NATURAL LANGUAGE MODE)`);

// SQLite: Use JSON functions
const threads = await db
  .select()
  .from(threads)
  .where(sql`json_extract(metadata, '$.priority') = 'high'`);
```

## Performance Optimization

### 1. **Use Indexes**

```sql
-- Most important indexes
CREATE INDEX idx_threads_user_org_tenant
  ON threads(user_id, organization_id, tenant_id);

CREATE INDEX idx_threads_updated_at
  ON threads(updated_at DESC);
```

### 2. **Optimize Metadata Queries**

```sql
-- PostgreSQL: GIN index for JSONB
CREATE INDEX idx_threads_metadata
  ON threads USING GIN (metadata);

-- MySQL: Virtual columns for frequently queried fields
ALTER TABLE threads ADD COLUMN priority VARCHAR(20)
  GENERATED ALWAYS AS (metadata->>'$.priority') STORED;
CREATE INDEX idx_threads_priority ON threads(priority);
```

### 3. **Connection Pooling**

```typescript
// PostgreSQL with connection pool
const sql = postgres(process.env.DATABASE_URL, {
  max: 20, // Max connections
  idle_timeout: 30,
});

// MySQL with pool
const pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
  connectionLimit: 20,
});
```

## Troubleshooting

### Common Issues

**1. Schema Validation Errors**

```typescript
// Ensure all required fields exist
Error: Required field "userId" not found in table "threads"

// Solution: Check field mapping
fields: {
  thread: {
    userId: 'user_id', // Map to your column name
  },
}
```

**2. JSON Support**

```typescript
// SQLite doesn't have native JSON
Error: SQLite does not support JSON operators

// Solution: Adapter handles this automatically
supportsJSON: false, // Set based on your database
```

**3. Date Handling**

```typescript
// SQLite stores dates as integers
// The adapter automatically converts between formats
```

## Migration from Other Adapters

### From Direct SQL

```typescript
// Before: Direct SQL
const threads = await db.query('SELECT * FROM threads WHERE user_id = $1', [userId]);

// After: With adapter
const threads = await adapter.findMany({
  model: 'thread',
  where: [{ field: 'userId', value: userId }],
});
```

### From Other ORMs

```typescript
// From Prisma
const threads = await prisma.thread.findMany({
  where: { userId },
});

// To Drizzle adapter
const threads = await adapter.findMany({
  model: 'thread',
  where: [{ field: 'userId', value: userId }],
});
```

## API Reference

See the [API documentation](./api.md) for detailed method signatures and options.

## Examples

- [Basic Setup](./examples.md#basic-setup)
- [Multi-tenant App](./examples.md#multi-tenant)
- [Custom Field Mapping](./examples.md#field-mapping)
- [Performance Optimization](./examples.md#performance)

## Next Steps

- Explore [advanced queries](./guides/advanced-queries.md)
- Learn about [performance optimization](./guides/performance.md)
- See [migration guide](./guides/migration.md) from other databases
