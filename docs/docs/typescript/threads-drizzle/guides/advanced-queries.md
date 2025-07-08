---
sidebar_position: 1
---

# Advanced Queries

Learn how to leverage Drizzle ORM's powerful query capabilities with the threads adapter.

## Direct Database Access

While the adapter provides a standardized interface, you can access the underlying Drizzle instance for complex queries:

```typescript
// Get the Drizzle table schema
const threadSchema = adapter.getSchema('thread');
const userSchema = adapter.getSchema('user');

// Perform complex joins
const threadsWithUsers = await db
  .select({
    thread: threadSchema,
    user: userSchema,
  })
  .from(threadSchema)
  .leftJoin(userSchema, eq(threadSchema.userId, userSchema.id))
  .where(eq(threadSchema.organizationId, 'org-123'))
  .limit(10);
```

## JSON/JSONB Queries

### PostgreSQL JSONB Operators

```typescript
import { sql } from 'drizzle-orm';

// Find threads with specific metadata
const highPriorityThreads = await db
  .select()
  .from(threadSchema)
  .where(sql`metadata @> '{"priority": "high"}'::jsonb`);

// Query nested JSON properties
const taggedThreads = await db
  .select()
  .from(threadSchema)
  .where(sql`metadata->'tags' ? 'urgent'`);

// Complex JSON queries
const complexQuery = await db
  .select()
  .from(threadSchema)
  .where(and(sql`metadata->>'status' = 'active'`, sql`(metadata->>'score')::int > 80`));
```

### MySQL JSON Functions

```typescript
// Extract JSON values
const threads = await db
  .select({
    id: threadSchema.id,
    title: threadSchema.title,
    category: sql<string>`JSON_EXTRACT(metadata, '$.category')`,
    tags: sql<string[]>`JSON_EXTRACT(metadata, '$.tags')`,
  })
  .from(threadSchema)
  .where(sql`JSON_CONTAINS(metadata->'$.tags', '"urgent"')`);

// Search within JSON arrays
const results = await db
  .select()
  .from(threadSchema)
  .where(sql`JSON_SEARCH(metadata->'$.tags', 'one', 'billing') IS NOT NULL`);
```

### SQLite JSON Functions

```typescript
// SQLite stores JSON as text
const threads = await db
  .select()
  .from(threadSchema)
  .where(sql`json_extract(metadata, '$.priority') = 'high'`);

// Query JSON arrays
const taggedThreads = await db
  .select()
  .from(threadSchema)
  .where(
    sql`EXISTS (
      SELECT 1 FROM json_each(json_extract(metadata, '$.tags'))
      WHERE json_each.value = 'urgent'
    )`,
  );
```

## Full-Text Search

### PostgreSQL Full-Text Search

```typescript
// Create search index
await db.execute(sql`
  CREATE INDEX idx_threads_search
  ON threads USING GIN (
    to_tsvector('english',
      coalesce(title, '') || ' ' ||
      coalesce(metadata->>'description', '')
    )
  )
`);

// Search with ranking
const searchResults = await db
  .select({
    thread: threadSchema,
    rank: sql<number>`
      ts_rank(
        to_tsvector('english', title || ' ' || coalesce(metadata->>'description', '')),
        plainto_tsquery('english', ${searchTerm})
      )
    `.as('rank'),
  })
  .from(threadSchema)
  .where(
    sql`to_tsvector('english', title || ' ' || coalesce(metadata->>'description', ''))
        @@ plainto_tsquery('english', ${searchTerm})`,
  )
  .orderBy(sql`rank DESC`)
  .limit(20);

// Search with highlighting
const highlightedResults = await db
  .select({
    id: threadSchema.id,
    title: sql<string>`
      ts_headline(
        'english',
        title,
        plainto_tsquery('english', ${searchTerm}),
        'StartSel=<mark>, StopSel=</mark>'
      )
    `,
    snippet: sql<string>`
      ts_headline(
        'english',
        metadata->>'description',
        plainto_tsquery('english', ${searchTerm}),
        'MaxWords=20, MinWords=10'
      )
    `,
  })
  .from(threadSchema)
  .where(/* search condition */);
```

### MySQL Full-Text Search

```typescript
// Create fulltext index
await db.execute(sql`
  ALTER TABLE threads
  ADD FULLTEXT idx_threads_search (title)
`);

// Natural language search
const results = await db
  .select({
    thread: threadSchema,
    relevance: sql<number>`
      MATCH(title) AGAINST(${searchTerm} IN NATURAL LANGUAGE MODE)
    `.as('relevance'),
  })
  .from(threadSchema)
  .where(sql`MATCH(title) AGAINST(${searchTerm} IN NATURAL LANGUAGE MODE)`)
  .orderBy(sql`relevance DESC`);

// Boolean mode search
const booleanSearch = await db
  .select()
  .from(threadSchema)
  .where(sql`MATCH(title) AGAINST(${'+billing -resolved'} IN BOOLEAN MODE)`);
```

## Aggregations and Analytics

### Thread Statistics

```typescript
// Thread count by user and status
const userStats = await db
  .select({
    userId: threadSchema.userId,
    status: sql<string>`metadata->>'status'`,
    count: sql<number>`count(*)`.as('count'),
    avgResponseTime: sql<number>`
      avg(
        EXTRACT(EPOCH FROM updated_at - created_at)
      )
    `.as('avgResponseTime'),
  })
  .from(threadSchema)
  .groupBy(threadSchema.userId, sql`metadata->>'status'`)
  .having(sql`count(*) > 5`);

// Daily thread creation
const dailyStats = await db
  .select({
    date: sql<string>`DATE(created_at)`.as('date'),
    count: sql<number>`count(*)`.as('count'),
    uniqueUsers: sql<number>`count(DISTINCT user_id)`.as('uniqueUsers'),
  })
  .from(threadSchema)
  .where(sql`created_at >= CURRENT_DATE - INTERVAL '30 days'`)
  .groupBy(sql`DATE(created_at)`)
  .orderBy(sql`date DESC`);
```

### Window Functions

```typescript
// Rank threads by activity within organization
const rankedThreads = await db
  .select({
    thread: threadSchema,
    rank: sql<number>`
      ROW_NUMBER() OVER (
        PARTITION BY organization_id
        ORDER BY updated_at DESC
      )
    `.as('rank'),
    percentile: sql<number>`
      PERCENT_RANK() OVER (
        PARTITION BY organization_id
        ORDER BY metadata->>'score'
      )
    `.as('percentile'),
  })
  .from(threadSchema)
  .where(isNotNull(threadSchema.organizationId));

// Running totals
const runningTotals = await db
  .select({
    date: sql<string>`DATE(created_at)`.as('date'),
    dailyCount: sql<number>`count(*)`.as('dailyCount'),
    runningTotal: sql<number>`
      SUM(count(*)) OVER (
        ORDER BY DATE(created_at)
        ROWS UNBOUNDED PRECEDING
      )
    `.as('runningTotal'),
  })
  .from(threadSchema)
  .groupBy(sql`DATE(created_at)`)
  .orderBy(sql`date`);
```

## Complex Filtering

### Dynamic Where Conditions

```typescript
function buildDynamicQuery(filters: ThreadFilters) {
  const conditions = [];

  if (filters.status) {
    conditions.push(sql`metadata->>'status' = ${filters.status}`);
  }

  if (filters.priority) {
    conditions.push(sql`metadata->>'priority' = ${filters.priority}`);
  }

  if (filters.tags && filters.tags.length > 0) {
    conditions.push(sql`metadata->'tags' ?| ${filters.tags}`);
  }

  if (filters.dateFrom) {
    conditions.push(gte(threadSchema.createdAt, filters.dateFrom));
  }

  if (filters.dateTo) {
    conditions.push(lte(threadSchema.createdAt, filters.dateTo));
  }

  return db
    .select()
    .from(threadSchema)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .limit(filters.limit || 20)
    .offset(filters.offset || 0);
}
```

### Subqueries

```typescript
// Find threads with the most feedback
const activeThreads = await db
  .select({
    thread: threadSchema,
    feedbackCount: sql<number>`(
      SELECT COUNT(*)
      FROM feedback f
      WHERE f.thread_id = threads.id
    )`.as('feedbackCount'),
  })
  .from(threadSchema)
  .where(
    sql`(
      SELECT COUNT(*)
      FROM feedback f
      WHERE f.thread_id = threads.id
    ) > 5`,
  )
  .orderBy(sql`feedbackCount DESC`);

// Threads with recent activity
const recentlyActive = await db
  .select()
  .from(threadSchema)
  .where(
    sql`EXISTS (
      SELECT 1
      FROM feedback f
      WHERE f.thread_id = threads.id
        AND f.created_at > NOW() - INTERVAL '7 days'
    )`,
  );
```

## Common Table Expressions (CTEs)

```typescript
// Hierarchical thread relationships
const threadHierarchy = await db
  .with('thread_tree', (qb) => {
    // Base case: root threads
    const base = qb
      .select({
        id: threadSchema.id,
        title: threadSchema.title,
        parentId: sql<string>`NULL`.as('parent_id'),
        level: sql<number>`0`.as('level'),
        path: sql<string>`id::text`.as('path'),
      })
      .from(threadSchema)
      .where(sql`metadata->>'parentId' IS NULL`);

    // Recursive case: child threads
    const recursive = qb
      .select({
        id: threadSchema.id,
        title: threadSchema.title,
        parentId: sql<string>`metadata->>'parentId'`.as('parent_id'),
        level: sql<number>`tt.level + 1`.as('level'),
        path: sql<string>`tt.path || '/' || threads.id::text`.as('path'),
      })
      .from(threadSchema)
      .innerJoin('thread_tree as tt', sql`threads.metadata->>'parentId' = tt.id`);

    return base.unionAll(recursive);
  })
  .select()
  .from('thread_tree')
  .orderBy('path');
```

## Performance Optimization

### Query Optimization

```typescript
// Use EXPLAIN to analyze queries
const queryPlan = await db.execute(sql`
  EXPLAIN (ANALYZE, BUFFERS)
  SELECT * FROM threads
  WHERE user_id = ${userId}
    AND metadata @> '{"status": "active"}'
  ORDER BY created_at DESC
  LIMIT 20
`);

// Create composite indexes
await db.execute(sql`
  CREATE INDEX idx_threads_user_status_created
  ON threads(user_id, created_at DESC)
  WHERE metadata->>'status' = 'active'
`);
```

### Batch Operations

```typescript
// Batch insert with proper typing
const threadsToInsert = data.map((item) => ({
  id: crypto.randomUUID(),
  title: item.title,
  userId: item.userId,
  metadata: item.metadata,
  createdAt: new Date(),
  updatedAt: new Date(),
}));

await db.insert(threadSchema).values(threadsToInsert).onConflictDoNothing();

// Batch update
await db.execute(sql`
  UPDATE threads
  SET metadata = jsonb_set(
    metadata,
    '{archived}',
    'true'
  ),
  updated_at = NOW()
  WHERE created_at < NOW() - INTERVAL '90 days'
    AND metadata->>'archived' IS DISTINCT FROM 'true'
`);
```

## Next Steps

- Learn about [performance optimization](./performance.md)
- Understand [field mapping](./field-mapping.md) for existing databases
- Explore [migration strategies](./migration.md)
