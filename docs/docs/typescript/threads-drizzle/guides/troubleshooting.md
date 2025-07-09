---
sidebar_position: 5
---

# Troubleshooting Guide

Common issues and solutions when using @pressw/threads-drizzle.

## Common Errors

### Schema Validation Errors

#### Error: "Required field 'userId' not found in table"

**Cause**: The column name in your database doesn't match the expected field name.

**Solution**: Use field mapping to map the thread model field to your column:

```typescript
const adapter = new DrizzleAdapter(db, {
  provider: 'postgres',
  tables: {
    thread: 'threads',
    // ...
  },
  fields: {
    thread: {
      userId: 'user_id', // Map userId to user_id column
    },
  },
});
```

#### Error: "Table 'threads' not found in schema"

**Cause**: The table doesn't exist or isn't included in your Drizzle schema.

**Solution**: Ensure the table is defined and passed to Drizzle:

```typescript
// Define your schema
export const threads = pgTable('threads', {
  id: uuid('id').primaryKey(),
  // ... other columns
});

// Include in Drizzle instance
const db = drizzle(connection, {
  schema: {
    threads, // Make sure this is included
    users,
    feedback,
  },
});
```

### Type Errors

#### Error: Type constraints with Record

**Cause**: TypeScript strict mode requires the Thread interface to extend Record.

**Solution**: Ensure your Thread type extends the proper base type:

```typescript
interface Thread extends Record<string, unknown> {
  id: string;
  title?: string;
  userId: string;
  // ... other fields
}
```

#### Error: "Property 'metadata' is not assignable to type 'string'"

**Cause**: JSON fields need proper type handling based on database support.

**Solution**: Configure JSON support in your adapter:

```typescript
const adapter = new DrizzleAdapter(db, {
  provider: 'sqlite',
  supportsJSON: false, // SQLite stores JSON as text
  // ...
});
```

### Database-Specific Issues

#### PostgreSQL: JSONB operator errors

**Cause**: Trying to use JSONB operators on a text column.

**Solution**: Ensure your column is JSONB type:

```typescript
export const threads = pgTable('threads', {
  metadata: jsonb('metadata'), // Not text('metadata')
});
```

#### MySQL: "Data too long for column 'metadata'"

**Cause**: JSON data exceeds column size limit.

**Solution**: Use JSON type instead of VARCHAR:

```typescript
export const threads = mysqlTable('threads', {
  metadata: json('metadata'), // Not varchar with length limit
});
```

#### SQLite: JSON function not found

**Cause**: SQLite version doesn't support JSON functions.

**Solution**: Update SQLite or handle JSON in application:

```typescript
// Check SQLite version
const version = db.get('SELECT sqlite_version()');

// For older versions, handle JSON in application
const adapter = new DrizzleAdapter(db, {
  provider: 'sqlite',
  supportsJSON: false,
  transformOutput: (model, data) => {
    if (data?.metadata && typeof data.metadata === 'string') {
      try {
        data.metadata = JSON.parse(data.metadata);
      } catch {}
    }
    return data;
  },
});
```

## Performance Issues

### Slow Queries

#### Symptom: Thread listing takes several seconds

**Diagnosis**: Check for missing indexes:

```sql
-- PostgreSQL
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM threads
WHERE user_id = 'uuid'
ORDER BY created_at DESC
LIMIT 20;

-- Look for "Seq Scan" in output
```

**Solution**: Add appropriate indexes:

```sql
CREATE INDEX idx_threads_user_created
ON threads(user_id, created_at DESC);
```

#### Symptom: JSON queries are slow

**Solution**: Add GIN index for JSONB (PostgreSQL):

```sql
CREATE INDEX idx_threads_metadata
ON threads USING GIN (metadata);
```

### Memory Issues

#### Symptom: Out of memory when processing large datasets

**Solution**: Use streaming and pagination:

```typescript
// Instead of loading all at once
const allThreads = await adapter.findMany({
  model: 'thread',
  limit: 1000000, // Bad!
});

// Use cursor-based iteration
async function* iterateThreads() {
  let cursor = null;

  while (true) {
    const batch = await adapter.findMany({
      model: 'thread',
      where: cursor ? [{ field: 'id', value: cursor, operator: 'gt' }] : [],
      limit: 100,
      sortBy: { field: 'id', direction: 'asc' },
    });

    if (batch.length === 0) break;

    for (const thread of batch) {
      yield thread;
    }

    cursor = batch[batch.length - 1].id;
  }
}

// Use the iterator
for await (const thread of iterateThreads()) {
  // Process one at a time
}
```

## Connection Issues

### Connection Pool Exhaustion

#### Symptom: "too many connections" or "connection timeout"

**Solution**: Configure connection pool properly:

```typescript
// PostgreSQL
const sql = postgres({
  max: 20, // Reduce if hitting database limits
  idle_timeout: 30,
  connect_timeout: 10,
});

// MySQL
const pool = mysql.createPool({
  connectionLimit: 20,
  waitForConnections: true,
  queueLimit: 0, // Set limit to prevent memory issues
});
```

### Connection Drops

#### Symptom: "Connection terminated unexpectedly"

**Solution**: Implement retry logic:

```typescript
class ResilientAdapter extends DrizzleAdapter {
  async executeWithRetry(operation: () => Promise<any>, retries = 3): Promise<any> {
    for (let i = 0; i < retries; i++) {
      try {
        return await operation();
      } catch (error) {
        if (i === retries - 1) throw error;

        if (this.isRetryableError(error)) {
          await this.delay(Math.pow(2, i) * 1000); // Exponential backoff
          continue;
        }

        throw error;
      }
    }
  }

  private isRetryableError(error: any): boolean {
    return (
      error.code === 'ECONNRESET' ||
      error.code === 'ETIMEDOUT' ||
      error.message.includes('connection')
    );
  }
}
```

## Data Integrity Issues

### Duplicate Key Violations

#### Error: "duplicate key value violates unique constraint"

**Solution**: Handle conflicts appropriately:

```typescript
// PostgreSQL/MySQL - Insert or update
await db
  .insert(threads)
  .values(threadData)
  .onDuplicateKeyUpdate({
    set: {
      title: threadData.title,
      metadata: threadData.metadata,
      updatedAt: new Date(),
    },
  });

// PostgreSQL - Insert or ignore
await db.insert(threads).values(threadData).onConflictDoNothing();
```

### Foreign Key Violations

#### Error: "violates foreign key constraint"

**Solution**: Ensure referenced records exist:

```typescript
// Validate before insert
const userExists = await adapter.findOne({
  model: 'user',
  where: [{ field: 'id', value: threadData.userId }],
});

if (!userExists) {
  throw new Error('User not found');
}

// Or use transaction with proper order
await db.transaction(async (tx) => {
  // Create user first if needed
  await tx.insert(users).values(userData).onConflictDoNothing();

  // Then create thread
  await tx.insert(threads).values(threadData);
});
```

## Debugging Tips

### Enable Query Logging

```typescript
// Development logging
const db = drizzle(connection, {
  logger: true, // Logs all queries
});

// Custom logger
const db = drizzle(connection, {
  logger: {
    logQuery(query, params) {
      console.log('Query:', query);
      console.log('Params:', params);
    },
  },
});
```

### Inspect Generated SQL

```typescript
// Get SQL without executing
const query = db.select().from(threads).where(eq(threads.userId, 'user-123')).toSQL();

console.log('SQL:', query.sql);
console.log('Params:', query.params);
```

### Test Database Connection

```typescript
async function testConnection() {
  try {
    // Simple query to test connection
    await db.execute(sql`SELECT 1`);
    console.log('Database connected successfully');
  } catch (error) {
    console.error('Database connection failed:', error);
  }
}
```

## Environment-Specific Issues

### Docker/Container Issues

#### Symptom: Cannot connect to database from container

**Solution**: Use proper host names:

```typescript
// Instead of localhost
const connection = postgres({
  host: 'localhost', // Won't work from container
});

// Use container name or host.docker.internal
const connection = postgres({
  host: process.env.DB_HOST || 'postgres', // Container name
});
```

### Timezone Issues

#### Symptom: Dates are off by several hours

**Solution**: Ensure consistent timezone handling:

```typescript
// PostgreSQL - Set timezone
await db.execute(sql`SET timezone = 'UTC'`);

// MySQL - Connection config
const pool = mysql.createPool({
  timezone: '+00:00', // UTC
});

// Application-level handling
const adapter = new DrizzleAdapter(db, {
  transformInput: (model, data) => {
    // Ensure dates are UTC
    if (data.createdAt) {
      data.createdAt = new Date(data.createdAt.toISOString());
    }
    return data;
  },
});
```

## Getting Help

### Diagnostic Information

When reporting issues, include:

```typescript
// Version information
console.log({
  node: process.version,
  threads: require('@pressw/threads/package.json').version,
  threadsDrizzle: require('@pressw/threads-drizzle/package.json').version,
  drizzle: require('drizzle-orm/package.json').version,
  database: adapter.provider,
});

// Configuration
console.log('Adapter config:', {
  provider: config.provider,
  tables: config.tables,
  fields: config.fields,
  capabilities: {
    supportsJSON: config.supportsJSON,
    supportsDates: config.supportsDates,
    supportsBooleans: config.supportsBooleans,
  },
});

// Test query
try {
  const result = await adapter.findOne({
    model: 'thread',
    where: [{ field: 'id', value: 'test-id' }],
  });
  console.log('Test query successful');
} catch (error) {
  console.error('Test query failed:', error);
}
```

### Common Solutions Checklist

- [ ] Database connection is working
- [ ] Tables exist and have correct schema
- [ ] Required indexes are created
- [ ] Field mappings are configured
- [ ] Database user has necessary permissions
- [ ] Connection pool is properly sized
- [ ] JSON support is correctly configured
- [ ] Timezone settings are consistent

## Next Steps

- Review [performance guide](./performance.md) for optimization
- Check [examples](../examples.md) for working implementations
- Join community forums for additional support
