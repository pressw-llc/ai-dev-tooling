---
sidebar_position: 4
title: 'Adapters'
---

# Adapters

Adapters provide the database abstraction layer for `@pressw/threads`, allowing you to use different database systems while maintaining a consistent API.

## Overview

The adapter system is designed to be:

- **Database Agnostic** - Support for multiple database providers
- **Type Safe** - Full TypeScript support with schema validation
- **Performant** - Optimized queries with proper indexing
- **Flexible** - Easy to extend with custom adapters

## Supported Databases

### PostgreSQL

The recommended database for production use with full feature support.

```typescript
import { createAdapter } from '@pressw/threads/adapters';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const sql = postgres(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

const adapter = createAdapter({
  provider: 'postgresql',
  db,
  schema,
});
```

#### PostgreSQL Schema

```sql
-- Users table
CREATE TABLE users (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255),
  image TEXT
);

-- Threads table with JSONB for metadata
CREATE TABLE threads (
  id VARCHAR(255) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id VARCHAR(255),
  tenant_id VARCHAR(255),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_threads_user_id ON threads(user_id);
CREATE INDEX idx_threads_organization_id ON threads(organization_id);
CREATE INDEX idx_threads_tenant_id ON threads(tenant_id);
CREATE INDEX idx_threads_created_at ON threads(created_at DESC);
CREATE INDEX idx_threads_title_search ON threads USING gin(to_tsvector('english', title));

-- Feedback table
CREATE TABLE feedback (
  id VARCHAR(255) PRIMARY KEY,
  thread_id VARCHAR(255) NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_feedback_thread_id ON feedback(thread_id);
```

### MySQL

Full support for MySQL 8.0+.

```typescript
import { createAdapter } from '@pressw/threads/adapters';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema';

const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const db = drizzle(connection, { schema });

const adapter = createAdapter({
  provider: 'mysql',
  db,
  schema,
});
```

#### MySQL Schema

```sql
-- Users table
CREATE TABLE users (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255),
  image TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Threads table with JSON for metadata
CREATE TABLE threads (
  id VARCHAR(255) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  organization_id VARCHAR(255),
  tenant_id VARCHAR(255),
  metadata JSON DEFAULT ('{}'),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Indexes
CREATE INDEX idx_threads_user_id ON threads(user_id);
CREATE INDEX idx_threads_organization_id ON threads(organization_id);
CREATE INDEX idx_threads_tenant_id ON threads(tenant_id);
CREATE INDEX idx_threads_created_at ON threads(created_at DESC);
CREATE FULLTEXT INDEX idx_threads_title ON threads(title);

-- Feedback table
CREATE TABLE feedback (
  id VARCHAR(255) PRIMARY KEY,
  thread_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (thread_id) REFERENCES threads(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_feedback_thread_id ON feedback(thread_id);
```

### SQLite

Perfect for development and testing.

```typescript
import { createAdapter } from '@pressw/threads/adapters';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';

const sqlite = new Database('threads.db');
const db = drizzle(sqlite, { schema });

const adapter = createAdapter({
  provider: 'sqlite',
  db,
  schema,
});
```

#### SQLite Schema

```sql
-- Users table
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  image TEXT
);

-- Threads table
CREATE TABLE threads (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id TEXT,
  tenant_id TEXT,
  metadata TEXT DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX idx_threads_user_id ON threads(user_id);
CREATE INDEX idx_threads_organization_id ON threads(organization_id);
CREATE INDEX idx_threads_tenant_id ON threads(tenant_id);
CREATE INDEX idx_threads_created_at ON threads(created_at DESC);

-- Feedback table
CREATE TABLE feedback (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_feedback_thread_id ON feedback(thread_id);
```

## Drizzle Schema Definition

Define your schema using Drizzle ORM:

```typescript
// schema.ts
import { pgTable, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
// or
// import { mysqlTable, varchar, timestamp, json, index } from "drizzle-orm/mysql-core";
// or
// import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  image: text('image'),
});

export const threads = pgTable(
  'threads',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    organizationId: text('organization_id'),
    tenantId: text('tenant_id'),
    metadata: jsonb('metadata').$type<Record<string, any>>(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index('idx_threads_user_id').on(table.userId),
    orgIdIdx: index('idx_threads_organization_id').on(table.organizationId),
    tenantIdIdx: index('idx_threads_tenant_id').on(table.tenantId),
    createdAtIdx: index('idx_threads_created_at').on(table.createdAt),
  }),
);

export const feedback = pgTable(
  'feedback',
  {
    id: text('id').primaryKey(),
    threadId: text('thread_id')
      .notNull()
      .references(() => threads.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    message: text('message'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    threadIdIdx: index('idx_feedback_thread_id').on(table.threadId),
  }),
);

// Export types
export type User = typeof users.$inferSelect;
export type Thread = typeof threads.$inferSelect;
export type Feedback = typeof feedback.$inferSelect;
```

## Adapter Interface

The adapter implements the `ChatCoreAdapter` interface:

```typescript
interface ChatCoreAdapter {
  create<T extends TableName>(table: T, data: InsertData<T>): Promise<SelectData<T>>;

  findOne<T extends TableName>(table: T, where: WhereConditions<T>): Promise<SelectData<T> | null>;

  findMany<T extends TableName>(
    table: T,
    options?: {
      where?: WhereConditions<T>;
      limit?: number;
      offset?: number;
      orderBy?: OrderByConfig<T>;
    },
  ): Promise<SelectData<T>[]>;

  update<T extends TableName>(
    table: T,
    where: WhereConditions<T>,
    data: Partial<InsertData<T>>,
  ): Promise<SelectData<T>>;

  delete<T extends TableName>(table: T, where: WhereConditions<T>): Promise<void>;

  count<T extends TableName>(table: T, where?: WhereConditions<T>): Promise<number>;
}
```

## Custom Adapters

You can create custom adapters for unsupported databases:

```typescript
import { ChatCoreAdapter } from '@pressw/threads/adapters';

class CustomAdapter implements ChatCoreAdapter {
  constructor(private db: YourDatabaseClient) {}

  async create(table, data) {
    // Implement create logic
  }

  async findOne(table, where) {
    // Implement findOne logic
  }

  async findMany(table, options) {
    // Implement findMany logic
  }

  async update(table, where, data) {
    // Implement update logic
  }

  async delete(table, where) {
    // Implement delete logic
  }

  async count(table, where) {
    // Implement count logic
  }
}

// Use custom adapter
const adapter = new CustomAdapter(yourDbClient);
const threadClient = new ThreadUtilityClient({ adapter });
```

## Performance Optimization

### Indexing Strategy

Proper indexing is crucial for performance:

```sql
-- User lookup performance
CREATE INDEX idx_threads_user_id ON threads(user_id);

-- Multi-tenant queries
CREATE INDEX idx_threads_organization_id ON threads(organization_id);
CREATE INDEX idx_threads_tenant_id ON threads(tenant_id);

-- Sorting and pagination
CREATE INDEX idx_threads_created_at ON threads(created_at DESC);

-- Full-text search (PostgreSQL)
CREATE INDEX idx_threads_title_search ON threads
USING gin(to_tsvector('english', title));

-- Full-text search (MySQL)
CREATE FULLTEXT INDEX idx_threads_title ON threads(title);
```

### Query Optimization

The adapter automatically optimizes queries:

```typescript
// Efficient pagination with proper indexes
const threads = await adapter.findMany('threads', {
  where: { userId: 'user_123' },
  limit: 20,
  offset: 40,
  orderBy: { createdAt: 'desc' },
});

// Optimized search queries
const searchResults = await adapter.findMany('threads', {
  where: {
    AND: [{ userId: 'user_123' }, { title: { contains: 'project' } }],
  },
});
```

### Connection Pooling

Configure connection pooling for production:

```typescript
// PostgreSQL
const sql = postgres(process.env.DATABASE_URL!, {
  max: 20, // connection pool size
  idle_timeout: 20,
  connect_timeout: 10,
});

// MySQL
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  connectionLimit: 20,
  waitForConnections: true,
  queueLimit: 0,
});
```

## Migrations

### Using Drizzle Kit

```bash
# Generate migrations
npx drizzle-kit generate:pg --schema=./src/schema.ts

# Run migrations
npx drizzle-kit migrate:pg --schema=./src/schema.ts

# Push schema changes (development)
npx drizzle-kit push:pg --schema=./src/schema.ts
```

### Migration Example

```typescript
// migrations/0001_create_threads_tables.sql
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255),
  image TEXT
);

CREATE TABLE IF NOT EXISTS threads (
  id VARCHAR(255) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id),
  organization_id VARCHAR(255),
  tenant_id VARCHAR(255),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_threads_user_id ON threads(user_id);
CREATE INDEX IF NOT EXISTS idx_threads_created_at ON threads(created_at DESC);
```

## Testing with Adapters

### In-Memory SQLite for Tests

```typescript
// test-utils.ts
import { createAdapter } from '@pressw/threads/adapters';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';

export function createTestAdapter() {
  // In-memory database
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite, { schema });

  // Initialize schema
  db.run(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT,
      image TEXT
    );

    CREATE TABLE threads (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      user_id TEXT NOT NULL,
      organization_id TEXT,
      tenant_id TEXT,
      metadata TEXT DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE feedback (
      id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      message TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  return createAdapter({
    provider: 'sqlite',
    db,
    schema,
  });
}

// In tests
describe('Thread operations', () => {
  let adapter: ChatCoreAdapter;

  beforeEach(() => {
    adapter = createTestAdapter();
  });

  test('creates thread', async () => {
    const thread = await adapter.create('threads', {
      id: 'test_1',
      title: 'Test Thread',
      userId: 'user_1',
    });

    expect(thread.title).toBe('Test Thread');
  });
});
```

## Troubleshooting

### Common Issues

1. **JSON/JSONB Storage**

   ```typescript
   // Ensure proper JSON serialization
   const thread = await adapter.create('threads', {
     title: 'Thread',
     userId: 'user_1',
     metadata: JSON.stringify({ custom: 'data' }), // SQLite
     // metadata: { custom: "data" } // PostgreSQL/MySQL
   });
   ```

2. **Date Handling**

   ```typescript
   // Different databases handle dates differently
   // PostgreSQL: Native Date objects
   // MySQL: Date objects or strings
   // SQLite: ISO strings
   ```

3. **Case Sensitivity**
   ```typescript
   // Be aware of case sensitivity in searches
   // PostgreSQL: Case-sensitive by default
   // MySQL: Depends on collation
   // SQLite: Case-insensitive by default
   ```
