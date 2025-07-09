---
sidebar_position: 3
---

# Examples

Real-world examples of using @pressw/threads-drizzle in various scenarios.

## Basic Setup

### PostgreSQL Setup

```typescript
import { DrizzleAdapter } from '@pressw/threads-drizzle';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Create connection
const sql = postgres(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

// Create adapter
const adapter = new DrizzleAdapter(db, {
  provider: 'postgres',
  tables: {
    user: 'users',
    thread: 'threads',
    feedback: 'feedback',
  },
});

// Use with thread client
import { createThreadUtilityClient } from '@pressw/threads';

const threadClient = createThreadUtilityClient({
  adapter,
  getUserContext: async (request) => {
    const token = request.headers.get('Authorization');
    return verifyToken(token);
  },
});
```

### MySQL Setup

```typescript
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

// Create connection pool
const pool = mysql.createPool({
  uri: process.env.DATABASE_URL!,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const db = drizzle(pool, { schema });

const adapter = new DrizzleAdapter(db, {
  provider: 'mysql',
  tables: {
    user: 'users',
    thread: 'threads',
    feedback: 'feedback',
  },
  // MySQL 5.7+ supports JSON
  supportsJSON: true,
});
```

### SQLite Setup

```typescript
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';

// Create database connection
const sqlite = new Database('threads.db');
const db = drizzle(sqlite, { schema });

const adapter = new DrizzleAdapter(db, {
  provider: 'sqlite',
  tables: {
    user: 'users',
    thread: 'threads',
    feedback: 'feedback',
  },
  // SQLite limitations
  supportsJSON: false,
  supportsBooleans: false,
  supportsReturning: false,
});
```

## Multi-tenant Application

Example of a multi-tenant SaaS application with organization and tenant isolation:

```typescript
// schema.ts
import { pgTable, uuid, varchar, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  tenantId: varchar('tenant_id', { length: 100 }).notNull().unique(),
  plan: varchar('plan', { length: 50 }).notNull().default('free'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id),
  role: varchar('role', { length: 50 }).notNull().default('member'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const threads = pgTable('threads', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id),
  tenantId: varchar('tenant_id', { length: 100 }).notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// indexes for performance
export const threadsIndexes = {
  byOrganization: index('idx_threads_org').on(threads.organizationId),
  byTenant: index('idx_threads_tenant').on(threads.tenantId),
  byUser: index('idx_threads_user').on(threads.userId),
  byCreated: index('idx_threads_created').on(threads.createdAt),
};
```

```typescript
// adapter-setup.ts
const adapter = new DrizzleAdapter(db, {
  provider: 'postgres',
  tables: {
    user: 'users',
    thread: 'threads',
    feedback: 'feedback',
  },
});

// Multi-tenant thread client
const threadClient = createThreadUtilityClient({
  adapter,
  getUserContext: async (request) => {
    const session = await getSession(request);

    if (!session) {
      throw new Error('Unauthorized');
    }

    // Return full context for multi-tenancy
    return {
      userId: session.userId,
      organizationId: session.organizationId,
      tenantId: session.tenantId,
    };
  },
});

// Usage - automatically scoped to organization/tenant
const threads = await threadClient.listThreads(request);
// Only returns threads for the user's organization and tenant
```

## Field Mapping

Using the adapter with an existing database that has different column names:

```typescript
// Existing legacy schema
const conversations = pgTable('customer_conversations', {
  conversationId: uuid('conversation_id').primaryKey(),
  subject: text('subject'),
  customerId: uuid('customer_id').notNull(),
  accountId: uuid('account_id'),
  divisionCode: varchar('division_code', { length: 20 }),
  extraInfo: jsonb('extra_info'),
  openedAt: timestamp('opened_at').notNull(),
  lastActivityAt: timestamp('last_activity_at').notNull(),
  closedAt: timestamp('closed_at'),
  status: varchar('status', { length: 50 }).notNull(),
});

// Map legacy schema to thread model
const adapter = new DrizzleAdapter(db, {
  provider: 'postgres',
  tables: {
    user: 'customers',
    thread: 'customer_conversations',
    feedback: 'conversation_feedback',
  },
  fields: {
    thread: {
      id: 'conversation_id',
      title: 'subject',
      userId: 'customer_id',
      organizationId: 'account_id',
      tenantId: 'division_code',
      metadata: 'extra_info',
      createdAt: 'opened_at',
      updatedAt: 'last_activity_at',
    },
  },
});

// Works seamlessly with the thread client
const thread = await threadClient.createThread(request, {
  title: 'Billing inquiry', // Stored in 'subject' column
  metadata: {
    // Stored in 'extra_info' column
    category: 'billing',
    priority: 'high',
  },
});
```

## Custom Metadata

Example of using strongly-typed metadata:

```typescript
// Define your metadata types
interface ThreadMetadata {
  category: 'support' | 'sales' | 'billing' | 'general';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  tags: string[];
  assignedTo?: string;
  resolvedAt?: string;
  customerSatisfaction?: number;
  internalNotes?: string;
}

// Use with thread operations
const thread = await threadClient.createThread(request, {
  title: 'Payment processing issue',
  metadata: {
    category: 'billing',
    priority: 'high',
    tags: ['payment', 'urgent', 'bug'],
    assignedTo: 'support-team-2',
  } satisfies ThreadMetadata,
});

// Query by metadata (PostgreSQL)
const urgentThreads = await adapter.findMany({
  model: 'thread',
  where: [
    {
      field: 'metadata',
      value: { priority: 'urgent' },
      operator: 'contains',
    },
  ],
});

// Complex metadata queries with Drizzle
const threadSchema = adapter.getSchema('thread');
const taggedThreads = await db
  .select()
  .from(threadSchema)
  .where(sql`metadata @> '{"tags": ["payment"]}'::jsonb`)
  .orderBy(sql`metadata->>'priority' DESC`);
```

## Performance Optimization

### Efficient Pagination

```typescript
// Cursor-based pagination for large datasets
async function getThreadsPaginated(cursor?: string, limit = 20) {
  const where: Where[] = [{ field: 'userId', value: userId }];

  if (cursor) {
    // Use cursor (last thread's createdAt)
    where.push({
      field: 'createdAt',
      value: new Date(cursor),
      operator: 'lt',
    });
  }

  const threads = await adapter.findMany({
    model: 'thread',
    where,
    limit: limit + 1, // Fetch one extra to check hasMore
    sortBy: {
      field: 'createdAt',
      direction: 'desc',
    },
  });

  const hasMore = threads.length > limit;
  const items = hasMore ? threads.slice(0, -1) : threads;
  const nextCursor = items[items.length - 1]?.createdAt.toISOString();

  return {
    items,
    hasMore,
    nextCursor,
  };
}
```

### Batch Operations

```typescript
// Batch create threads
async function createThreadsBatch(threadsData: CreateThreadData[]) {
  const db = adapter.getDatabase(); // If exposed
  const threadSchema = adapter.getSchema('thread');

  // Use Drizzle's batch insert
  const threads = await db
    .insert(threadSchema)
    .values(
      threadsData.map((data) => ({
        id: crypto.randomUUID(),
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    )
    .returning();

  return threads;
}

// Batch update with transaction
async function archiveOldThreads(beforeDate: Date) {
  await db.transaction(async (tx) => {
    const threadSchema = adapter.getSchema('thread');

    // Update in batches
    await tx
      .update(threadSchema)
      .set({
        metadata: sql`jsonb_set(metadata, '{archived}', 'true')`,
        updatedAt: new Date(),
      })
      .where(
        and(
          lt(threadSchema.createdAt, beforeDate),
          sql`metadata->>'archived' IS DISTINCT FROM 'true'`,
        ),
      );
  });
}
```

### Search Implementation

```typescript
// Full-text search with PostgreSQL
async function searchThreads(searchTerm: string) {
  const threadSchema = adapter.getSchema('thread');

  // Create search vector
  const threads = await db
    .select()
    .from(threadSchema)
    .where(
      sql`to_tsvector('english', title || ' ' || COALESCE(metadata->>'description', ''))
          @@ plainto_tsquery('english', ${searchTerm})`,
    )
    .orderBy(
      sql`ts_rank(
        to_tsvector('english', title || ' ' || COALESCE(metadata->>'description', '')),
        plainto_tsquery('english', ${searchTerm})
      ) DESC`,
    )
    .limit(20);

  return threads;
}

// Search with highlighting
async function searchWithHighlight(searchTerm: string) {
  const threadSchema = adapter.getSchema('thread');

  return await db
    .select({
      ...threadSchema,
      headline: sql<string>`
        ts_headline(
          'english',
          title,
          plainto_tsquery('english', ${searchTerm}),
          'HighlightAll=true'
        )
      `,
    })
    .from(threadSchema)
    .where(sql`to_tsvector('english', title) @@ plainto_tsquery('english', ${searchTerm})`);
}
```

## Next.js API Routes

Example of using the adapter in Next.js API routes:

```typescript
// app/api/threads/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { threadClient } from '@/lib/thread-client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const result = await threadClient.listThreads(request, {
      limit,
      offset,
      orderBy: 'updatedAt',
      orderDirection: 'desc',
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const thread = await threadClient.createThread(request, {
      title: body.title,
      metadata: body.metadata,
    });

    return NextResponse.json(thread, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
```

## Testing

Example of testing with the adapter:

```typescript
// thread-adapter.test.ts
import { DrizzleAdapter } from '@pressw/threads-drizzle';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

describe('Thread Adapter', () => {
  let sql: postgres.Sql;
  let db: ReturnType<typeof drizzle>;
  let adapter: DrizzleAdapter;

  beforeAll(async () => {
    // Use test database
    sql = postgres(process.env.TEST_DATABASE_URL!);
    db = drizzle(sql);

    // Run migrations
    await migrate(db, { migrationsFolder: './drizzle' });

    // Create adapter
    adapter = new DrizzleAdapter(db, {
      provider: 'postgres',
      tables: {
        user: 'users',
        thread: 'threads',
        feedback: 'feedback',
      },
    });
  });

  afterAll(async () => {
    await sql.end();
  });

  beforeEach(async () => {
    // Clean database
    await sql`TRUNCATE threads, users, feedback CASCADE`;
  });

  test('creates thread with metadata', async () => {
    const thread = await adapter.create({
      model: 'thread',
      data: {
        id: 'test-thread-1',
        title: 'Test Thread',
        userId: 'test-user-1',
        metadata: { test: true },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    expect(thread.id).toBe('test-thread-1');
    expect(thread.metadata).toEqual({ test: true });
  });

  test('finds threads by user', async () => {
    // Create test data
    await adapter.create({
      model: 'thread',
      data: {
        id: 'thread-1',
        userId: 'user-1',
        title: 'Thread 1',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Find by user
    const threads = await adapter.findMany({
      model: 'thread',
      where: [{ field: 'userId', value: 'user-1' }],
    });

    expect(threads).toHaveLength(1);
    expect(threads[0].title).toBe('Thread 1');
  });
});
```

## Migration Script

Example migration from another system:

```typescript
// migrate-to-drizzle.ts
import { DrizzleAdapter } from '@pressw/threads-drizzle';
import { OldDatabase } from './old-system';

async function migrateThreads() {
  const oldDb = new OldDatabase();
  const adapter = new DrizzleAdapter(db, config);

  // Migrate in batches
  const batchSize = 100;
  let offset = 0;

  while (true) {
    // Fetch old threads
    const oldThreads = await oldDb.getThreads({
      limit: batchSize,
      offset,
    });

    if (oldThreads.length === 0) break;

    // Transform and create
    for (const oldThread of oldThreads) {
      try {
        await adapter.create({
          model: 'thread',
          data: {
            id: oldThread.id,
            title: oldThread.subject || 'Untitled',
            userId: oldThread.ownerId,
            organizationId: oldThread.companyId,
            metadata: {
              migrated: true,
              oldSystem: 'legacy',
              oldId: oldThread.legacyId,
              ...oldThread.customFields,
            },
            createdAt: oldThread.createdDate,
            updatedAt: oldThread.modifiedDate || oldThread.createdDate,
          },
        });
      } catch (error) {
        console.error(`Failed to migrate thread ${oldThread.id}:`, error);
      }
    }

    offset += batchSize;
    console.log(`Migrated ${offset} threads...`);
  }

  console.log('Migration complete!');
}
```

## Next Steps

- Learn about [advanced queries](./guides/advanced-queries.md)
- Explore [performance tuning](./guides/performance.md)
- See [troubleshooting guide](./guides/troubleshooting.md)
