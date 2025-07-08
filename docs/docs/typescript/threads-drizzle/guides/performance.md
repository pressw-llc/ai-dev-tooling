---
sidebar_position: 2
---

# Performance Optimization

Optimize your thread management system for maximum performance with these database-specific techniques.

## Database Indexing

### Essential Indexes

```sql
-- User lookup (most common query)
CREATE INDEX idx_threads_user_id ON threads(user_id);

-- Multi-tenant queries
CREATE INDEX idx_threads_org_tenant ON threads(organization_id, tenant_id);

-- Time-based queries
CREATE INDEX idx_threads_created_at ON threads(created_at DESC);
CREATE INDEX idx_threads_updated_at ON threads(updated_at DESC);

-- Composite index for common patterns
CREATE INDEX idx_threads_user_updated
  ON threads(user_id, updated_at DESC);
```

### PostgreSQL-Specific Indexes

```sql
-- JSONB GIN index for metadata queries
CREATE INDEX idx_threads_metadata ON threads USING GIN (metadata);

-- Partial index for active threads
CREATE INDEX idx_threads_active
  ON threads(user_id, created_at DESC)
  WHERE metadata->>'status' != 'archived';

-- Expression index for common JSON queries
CREATE INDEX idx_threads_priority
  ON threads((metadata->>'priority'));

-- Full-text search index
CREATE INDEX idx_threads_search
  ON threads USING GIN (
    to_tsvector('english', title || ' ' || coalesce(metadata->>'description', ''))
  );
```

### MySQL-Specific Indexes

```sql
-- Virtual columns for frequently accessed JSON fields
ALTER TABLE threads
  ADD COLUMN priority VARCHAR(20) AS (metadata->>'$.priority') STORED,
  ADD COLUMN status VARCHAR(50) AS (metadata->>'$.status') STORED;

CREATE INDEX idx_threads_priority ON threads(priority);
CREATE INDEX idx_threads_status ON threads(status);

-- Full-text index
ALTER TABLE threads ADD FULLTEXT idx_threads_fulltext (title);

-- Covering index
CREATE INDEX idx_threads_covering
  ON threads(user_id, created_at, id, title);
```

### SQLite-Specific Indexes

```sql
-- Expression indexes for JSON extraction
CREATE INDEX idx_threads_json_priority
  ON threads(json_extract(metadata, '$.priority'));

CREATE INDEX idx_threads_json_status
  ON threads(json_extract(metadata, '$.status'));

-- Without ROWID for better performance (new tables only)
CREATE TABLE threads_optimized (
  id TEXT PRIMARY KEY,
  -- other columns
) WITHOUT ROWID;
```

## Query Optimization

### Efficient Pagination

```typescript
// Cursor-based pagination (recommended)
class ThreadPagination {
  async getCursorPage(cursor?: string, limit: number = 20): Promise<PaginatedResult> {
    const where: Where[] = [{ field: 'userId', value: this.userId }];

    if (cursor) {
      // Decode cursor (e.g., base64 encoded timestamp)
      const cursorDate = new Date(Buffer.from(cursor, 'base64').toString());
      where.push({
        field: 'createdAt',
        value: cursorDate,
        operator: 'lt',
      });
    }

    const threads = await this.adapter.findMany({
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
    const nextCursor =
      items.length > 0
        ? Buffer.from(items[items.length - 1].createdAt.toISOString()).toString('base64')
        : null;

    return {
      items,
      hasMore,
      nextCursor,
    };
  }
}

// Keyset pagination for better performance
async function getThreadsKeyset(lastId?: string, lastCreatedAt?: Date): Promise<Thread[]> {
  const query = db
    .select()
    .from(threadSchema)
    .orderBy(desc(threadSchema.createdAt), desc(threadSchema.id))
    .limit(20);

  if (lastId && lastCreatedAt) {
    query.where(
      or(
        lt(threadSchema.createdAt, lastCreatedAt),
        and(eq(threadSchema.createdAt, lastCreatedAt), lt(threadSchema.id, lastId)),
      ),
    );
  }

  return query;
}
```

### Avoiding N+1 Queries

```typescript
// Bad: N+1 query problem
const threads = await adapter.findMany({ model: 'thread' });
for (const thread of threads) {
  const user = await adapter.findOne({
    model: 'user',
    where: [{ field: 'id', value: thread.userId }],
  });
  thread.user = user;
}

// Good: Single query with join
const threadsWithUsers = await db
  .select({
    thread: threadSchema,
    user: userSchema,
  })
  .from(threadSchema)
  .leftJoin(userSchema, eq(threadSchema.userId, userSchema.id))
  .limit(20);

// Good: Batch loading
const threads = await adapter.findMany({ model: 'thread' });
const userIds = [...new Set(threads.map((t) => t.userId))];
const users = await adapter.findMany({
  model: 'user',
  where: [{ field: 'id', value: userIds, operator: 'in' }],
});
const userMap = new Map(users.map((u) => [u.id, u]));
threads.forEach((t) => (t.user = userMap.get(t.userId)));
```

### Query Result Caching

```typescript
class CachedThreadAdapter {
  private cache = new Map<string, { data: any; expires: number }>();

  async findOne(params: FindParams): Promise<Thread | null> {
    const cacheKey = this.getCacheKey(params);
    const cached = this.cache.get(cacheKey);

    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }

    const result = await this.adapter.findOne(params);

    if (result) {
      this.cache.set(cacheKey, {
        data: result,
        expires: Date.now() + 5 * 60 * 1000, // 5 minutes
      });
    }

    return result;
  }

  private getCacheKey(params: any): string {
    return JSON.stringify(params);
  }

  invalidateCache(model: string, id: string) {
    // Remove all cache entries for this record
    for (const [key, value] of this.cache.entries()) {
      const params = JSON.parse(key);
      if (params.model === model && params.where?.some((w) => w.field === 'id' && w.value === id)) {
        this.cache.delete(key);
      }
    }
  }
}
```

## Connection Pooling

### PostgreSQL Connection Pool

```typescript
import postgres from 'postgres';

// Optimal pool configuration
const sql = postgres({
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB,
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,

  // Pool settings
  max: 20, // Maximum connections
  idle_timeout: 30, // Close idle connections after 30s
  connect_timeout: 10, // Connection timeout

  // Performance settings
  prepare: false, // Disable prepared statements if not needed
  types: {
    // Custom type parsers for performance
    date: {
      to: 1184,
      from: [1082, 1083, 1114, 1184],
      serialize: (x: any) => x,
      parse: (x: any) => x, // Keep as string for faster parsing
    },
  },

  // Error handling
  onnotice: () => {}, // Ignore notices for performance
});

const db = drizzle(sql);
```

### MySQL Connection Pool

```typescript
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  database: process.env.MYSQL_DATABASE,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,

  // Pool configuration
  waitForConnections: true,
  connectionLimit: 20,
  maxIdle: 10,
  idleTimeout: 60000,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,

  // Performance settings
  supportBigNumbers: true,
  bigNumberStrings: false,
  dateStrings: false,

  // Timezone
  timezone: '+00:00',
});

const db = drizzle(pool);
```

### SQLite Performance Settings

```typescript
import Database from 'better-sqlite3';

const sqlite = new Database('threads.db', {
  // Performance options
  readonly: false,
  fileMustExist: false,
  timeout: 5000,
  verbose: process.env.NODE_ENV === 'development' ? console.log : undefined,
});

// Performance pragmas
sqlite.pragma('journal_mode = WAL'); // Write-Ahead Logging
sqlite.pragma('synchronous = NORMAL'); // Faster writes
sqlite.pragma('cache_size = -2000'); // 2MB cache
sqlite.pragma('temp_store = MEMORY'); // Use memory for temp tables
sqlite.pragma('mmap_size = 30000000000'); // Memory-mapped I/O

const db = drizzle(sqlite);
```

## Batch Operations

### Efficient Bulk Inserts

```typescript
class BatchThreadOperations {
  private batchSize = 1000;

  async bulkCreate(threads: NewThread[]): Promise<void> {
    // Process in batches to avoid memory issues
    for (let i = 0; i < threads.length; i += this.batchSize) {
      const batch = threads.slice(i, i + this.batchSize);

      // PostgreSQL: Use COPY for best performance
      if (this.provider === 'postgres') {
        await this.bulkCopyPostgres(batch);
      } else {
        // Fallback to batch insert
        await db.insert(threadSchema).values(batch);
      }
    }
  }

  private async bulkCopyPostgres(threads: NewThread[]) {
    const values = threads.map((t) => [
      t.id,
      t.title,
      t.userId,
      t.organizationId,
      t.tenantId,
      JSON.stringify(t.metadata),
      t.createdAt,
      t.updatedAt,
    ]);

    await sql`
      COPY threads (id, title, user_id, organization_id, tenant_id, metadata, created_at, updated_at)
      FROM STDIN WITH (FORMAT CSV)
    `.copy(values);
  }
}

// Batch updates with single query
async function archiveOldThreads(beforeDate: Date): Promise<number> {
  const result = await db.execute(sql`
    UPDATE threads
    SET
      metadata = CASE
        WHEN metadata IS NULL THEN '{"archived": true}'::jsonb
        ELSE jsonb_set(metadata, '{archived}', 'true')
      END,
      updated_at = NOW()
    WHERE created_at < ${beforeDate}
      AND (metadata->>'archived' IS DISTINCT FROM 'true' OR metadata IS NULL)
  `);

  return result.rowCount;
}
```

### Transaction Optimization

```typescript
// Group operations in transactions
async function createThreadWithActivities(
  threadData: NewThread,
  activities: Activity[],
): Promise<Thread> {
  return await db.transaction(
    async (tx) => {
      // Ensure serializable isolation for consistency
      await tx.execute(sql`SET TRANSACTION ISOLATION LEVEL SERIALIZABLE`);

      // Create thread
      const [thread] = await tx.insert(threadSchema).values(threadData).returning();

      // Batch insert activities
      if (activities.length > 0) {
        await tx.insert(activitySchema).values(
          activities.map((a) => ({
            ...a,
            threadId: thread.id,
          })),
        );
      }

      return thread;
    },
    {
      isolationLevel: 'serializable',
      accessMode: 'read write',
      deferrable: false,
    },
  );
}
```

## Monitoring and Profiling

### Query Performance Monitoring

```typescript
// Query timing wrapper
class PerformanceMonitor {
  async measureQuery<T>(name: string, query: () => Promise<T>): Promise<T> {
    const start = performance.now();

    try {
      const result = await query();
      const duration = performance.now() - start;

      // Log slow queries
      if (duration > 100) {
        console.warn(`Slow query (${name}): ${duration.toFixed(2)}ms`);
      }

      // Send metrics to monitoring service
      this.sendMetric('query.duration', duration, { query: name });

      return result;
    } catch (error) {
      this.sendMetric('query.error', 1, { query: name });
      throw error;
    }
  }

  private sendMetric(name: string, value: number, tags: Record<string, string>) {
    // Send to your monitoring service (DataDog, New Relic, etc.)
  }
}

// Use with adapter
const monitor = new PerformanceMonitor();
const threads = await monitor.measureQuery('findThreadsByUser', () =>
  adapter.findMany({
    model: 'thread',
    where: [{ field: 'userId', value: userId }],
  }),
);
```

### Database Query Analysis

```typescript
// PostgreSQL query analysis
async function analyzeQuery(query: string): Promise<void> {
  const plan = await db.execute(sql`
    EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
    ${sql.raw(query)}
  `);

  console.log('Query execution plan:', plan);

  // Check for common issues
  const planText = JSON.stringify(plan);
  if (planText.includes('Seq Scan')) {
    console.warn('Sequential scan detected - consider adding index');
  }
  if (planText.includes('Sort')) {
    console.warn('Sort operation detected - consider index on ORDER BY columns');
  }
}

// MySQL query profiling
async function profileMySQLQuery(query: string): Promise<void> {
  await db.execute(sql`SET profiling = 1`);
  await db.execute(sql.raw(query));

  const profile = await db.execute(sql`
    SELECT * FROM INFORMATION_SCHEMA.PROFILING
    WHERE QUERY_ID = (SELECT MAX(QUERY_ID) FROM INFORMATION_SCHEMA.PROFILING)
  `);

  console.log('Query profile:', profile);
}
```

## Memory Optimization

### Streaming Large Result Sets

```typescript
// PostgreSQL cursor for large datasets
async function* streamThreads(userId: string): AsyncGenerator<Thread, void, unknown> {
  const cursorName = `cursor_${Date.now()}`;

  await db.execute(sql`
    DECLARE ${sql.identifier([cursorName])} CURSOR FOR
    SELECT * FROM threads WHERE user_id = ${userId}
  `);

  try {
    while (true) {
      const batch = await db.execute(sql`
        FETCH 100 FROM ${sql.identifier([cursorName])}
      `);

      if (batch.rows.length === 0) break;

      for (const row of batch.rows) {
        yield row as Thread;
      }
    }
  } finally {
    await db.execute(sql`CLOSE ${sql.identifier([cursorName])}`);
  }
}

// Usage
for await (const thread of streamThreads(userId)) {
  // Process thread without loading all into memory
  await processThread(thread);
}
```

## Best Practices Summary

1. **Always measure** - Profile queries in production-like environments
2. **Index strategically** - Cover common query patterns, avoid over-indexing
3. **Use connection pooling** - Configure pools based on workload
4. **Batch operations** - Reduce round trips to the database
5. **Cache judiciously** - Cache read-heavy, slowly-changing data
6. **Monitor continuously** - Set up alerts for slow queries and errors
7. **Optimize data types** - Use appropriate column types and sizes
8. **Partition large tables** - Consider partitioning for very large datasets

## Next Steps

- Implement [field mapping](./field-mapping.md) for legacy databases
- Plan your [migration strategy](./migration.md)
