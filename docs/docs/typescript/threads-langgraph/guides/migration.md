---
sidebar_position: 2
---

# Migration Guide

This guide helps you migrate from other thread management systems to the LangGraph adapter.

## Migrating from Drizzle Adapter

If you're currently using the Drizzle adapter with a database, here's how to migrate to LangGraph:

### Before (Drizzle)

```typescript
import { createDrizzleAdapter } from '@pressw/threads';
import { drizzle } from 'drizzle-orm/postgres-js';

const db = drizzle(postgres(DATABASE_URL));
const adapter = createDrizzleAdapter(db, {
  provider: 'pg',
  schemas: { threads, users },
});

const threadClient = new ThreadUtilityClient(adapter, getUserContext);
```

### After (LangGraph)

```typescript
import { createLangGraphAdapter } from '@pressw/threads-langgraph';

const adapter = createLangGraphAdapter({
  apiUrl: process.env.LANGGRAPH_API_URL!,
  apiKey: process.env.LANGSMITH_API_KEY!,
});

const threadClient = new ThreadUtilityClient(adapter, getUserContext);
```

### Key Differences

1. **No Database Schema**: LangGraph manages the schema internally
2. **No SQL Queries**: All operations go through the LangGraph API
3. **Built-in Persistence**: No need to manage database connections
4. **API Authentication**: Uses API keys instead of database credentials

## Data Migration Strategy

### Step 1: Export Existing Threads

```typescript
async function exportThreadsFromDrizzle(drizzleAdapter: DrizzleAdapter) {
  const allThreads = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const batch = await drizzleAdapter.findMany({
      model: 'thread',
      limit,
      offset,
    });

    if (batch.length === 0) break;

    allThreads.push(...batch);
    offset += limit;
  }

  return allThreads;
}
```

### Step 2: Transform Thread Data

```typescript
function transformThreadForLangGraph(drizzleThread: any) {
  return {
    title: drizzleThread.title,
    userId: drizzleThread.userId,
    organizationId: drizzleThread.organizationId,
    tenantId: drizzleThread.tenantId,
    metadata: {
      ...drizzleThread.metadata,
      migratedFrom: 'drizzle',
      originalId: drizzleThread.id,
      migratedAt: new Date().toISOString(),
    },
  };
}
```

### Step 3: Import to LangGraph

```typescript
async function importThreadsToLangGraph(threads: any[], langGraphAdapter: LangGraphAdapter) {
  const results = {
    success: 0,
    failed: 0,
    errors: [] as any[],
  };

  for (const thread of threads) {
    try {
      const transformed = transformThreadForLangGraph(thread);
      await langGraphAdapter.create({
        model: 'thread',
        data: transformed,
      });
      results.success++;
    } catch (error) {
      results.failed++;
      results.errors.push({
        thread: thread.id,
        error: error.message,
      });
    }
  }

  return results;
}
```

### Complete Migration Script

```typescript
async function migrateToLangGraph() {
  console.log('Starting migration to LangGraph...');

  // Set up adapters
  const drizzleAdapter = createDrizzleAdapter(db, config);
  const langGraphAdapter = createLangGraphAdapter({
    apiUrl: process.env.LANGGRAPH_API_URL!,
    apiKey: process.env.LANGSMITH_API_KEY!,
  });

  // Export from Drizzle
  console.log('Exporting threads from database...');
  const threads = await exportThreadsFromDrizzle(drizzleAdapter);
  console.log(`Found ${threads.length} threads to migrate`);

  // Import to LangGraph
  console.log('Importing threads to LangGraph...');
  const results = await importThreadsToLangGraph(threads, langGraphAdapter);

  console.log('Migration complete:');
  console.log(`- Success: ${results.success}`);
  console.log(`- Failed: ${results.failed}`);

  if (results.errors.length > 0) {
    console.error('Errors:', results.errors);
  }
}
```

## Migrating from Custom Thread Systems

### Mapping Custom Fields

If you have custom thread fields, map them to LangGraph's metadata:

```typescript
// Custom thread structure
interface CustomThread {
  id: string;
  conversationId: string;
  customerEmail: string;
  supportAgent: string;
  status: 'open' | 'closed';
  tags: string[];
  createdDate: Date;
}

// Migration mapping
function mapCustomThread(custom: CustomThread) {
  return {
    title: `Support: ${custom.customerEmail}`,
    userId: custom.supportAgent,
    metadata: {
      conversationId: custom.conversationId,
      customerEmail: custom.customerEmail,
      status: custom.status,
      tags: custom.tags,
      importedFrom: 'custom-system',
      originalId: custom.id,
    },
    createdAt: custom.createdDate,
  };
}
```

### Preserving Relationships

Maintain relationships between threads and other entities:

```typescript
interface ThreadMigrationContext {
  threadMapping: Map<string, string>; // old ID -> new ID
  userMapping: Map<string, string>;
}

async function migrateWithRelationships(
  customThreads: CustomThread[],
  adapter: LangGraphAdapter,
  context: ThreadMigrationContext,
) {
  for (const customThread of customThreads) {
    // Map user IDs
    const userId = context.userMapping.get(customThread.supportAgent) || customThread.supportAgent;

    // Create thread
    const newThread = await adapter.create({
      model: 'thread',
      data: {
        ...mapCustomThread(customThread),
        userId,
      },
    });

    // Store mapping for related data
    context.threadMapping.set(customThread.id, newThread.id);
  }

  return context;
}
```

## API Compatibility Layer

Create a compatibility layer to minimize code changes:

```typescript
// Compatibility wrapper
class LangGraphCompatibilityAdapter {
  private langGraphAdapter: LangGraphAdapter;

  constructor(config: LangGraphAdapterConfig) {
    this.langGraphAdapter = createLangGraphAdapter(config);
  }

  // Mimic old adapter interface
  async query(sql: string, params: any[]): Promise<any[]> {
    throw new Error('SQL queries not supported. Use adapter methods.');
  }

  // Map old method names
  async fetchThread(id: string): Promise<any> {
    return this.langGraphAdapter.findOne({
      model: 'thread',
      where: [{ field: 'id', value: id }],
    });
  }

  async saveThread(data: any): Promise<any> {
    if (data.id) {
      return this.langGraphAdapter.update({
        model: 'thread',
        where: [{ field: 'id', value: data.id }],
        data,
      });
    }
    return this.langGraphAdapter.create({
      model: 'thread',
      data,
    });
  }
}
```

## Feature Parity Considerations

### Features Gained with LangGraph

1. **Automatic State Management**: Thread state is managed by LangGraph
2. **Built-in History**: Access to complete thread history
3. **Streaming Support**: Real-time updates for AI responses
4. **Assistant Integration**: Direct integration with LangGraph assistants

### Features That Require Adaptation

1. **Custom Queries**: Replace SQL queries with adapter methods
2. **Transactions**: Use LangGraph's consistency model
3. **Bulk Operations**: Implement batching at application level
4. **Complex Filtering**: Limited to metadata-based filtering

### Migration Checklist

- [ ] **Inventory Current Threads**: Count and categorize existing threads
- [ ] **Map Data Schema**: Define metadata structure for custom fields
- [ ] **Test Migration Script**: Run on subset of data first
- [ ] **Plan Downtime**: Determine migration window
- [ ] **Update Application Code**: Replace adapter initialization
- [ ] **Update Queries**: Convert custom queries to adapter methods
- [ ] **Test Thoroughly**: Verify all operations work correctly
- [ ] **Monitor Post-Migration**: Watch for any issues

## Rollback Strategy

Always have a rollback plan:

```typescript
class MigrationManager {
  private oldAdapter: ChatCoreAdapter;
  private newAdapter: LangGraphAdapter;
  private migrationLog: Map<string, string>;

  async migrate() {
    try {
      // Perform migration
      await this.doMigration();

      // Verify migration
      const isValid = await this.verifyMigration();
      if (!isValid) {
        throw new Error('Migration verification failed');
      }

      // Switch traffic
      await this.switchTraffic();
    } catch (error) {
      console.error('Migration failed, rolling back...', error);
      await this.rollback();
      throw error;
    }
  }

  async rollback() {
    // Revert configuration
    process.env.USE_LANGGRAPH = 'false';

    // Log rollback
    console.log('Rolled back to previous adapter');
  }
}
```

## Testing Migration

### Unit Tests

```typescript
describe('Thread Migration', () => {
  it('should preserve all thread fields', async () => {
    const original = {
      id: 'thread-123',
      title: 'Test Thread',
      userId: 'user-456',
      metadata: { custom: 'value' },
    };

    const migrated = transformThreadForLangGraph(original);

    expect(migrated.title).toBe(original.title);
    expect(migrated.userId).toBe(original.userId);
    expect(migrated.metadata.originalId).toBe(original.id);
  });
});
```

### Integration Tests

```typescript
describe('LangGraph Integration', () => {
  it('should handle migrated threads', async () => {
    const adapter = createLangGraphAdapter(config);

    // Create thread with migration metadata
    const thread = await adapter.create({
      model: 'thread',
      data: {
        title: 'Migrated Thread',
        userId: 'user-123',
        metadata: {
          migratedFrom: 'drizzle',
          originalId: 'old-123',
        },
      },
    });

    // Verify thread is accessible
    const fetched = await adapter.findOne({
      model: 'thread',
      where: [{ field: 'id', value: thread.id }],
    });

    expect(fetched).toBeTruthy();
    expect(fetched.metadata.migratedFrom).toBe('drizzle');
  });
});
```

## Post-Migration Optimization

After successful migration:

1. **Remove Old Dependencies**: Uninstall database drivers and ORMs
2. **Update Documentation**: Document the new architecture
3. **Train Team**: Ensure everyone understands LangGraph concepts
4. **Monitor Performance**: Compare with previous system
5. **Optimize Metadata**: Refine metadata schema based on usage

## Common Migration Issues

### Issue: Rate Limiting

```typescript
// Add rate limiting to migration
async function migrateWithRateLimit(threads: any[], adapter: LangGraphAdapter) {
  const rateLimit = 10; // requests per second
  const delay = 1000 / rateLimit;

  for (const thread of threads) {
    await adapter.create({ model: 'thread', data: thread });
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}
```

### Issue: Large Metadata Objects

```typescript
// Compress large metadata
function compressMetadata(metadata: any) {
  const json = JSON.stringify(metadata);
  if (json.length > 10000) {
    // Store large data elsewhere and reference it
    return {
      compressed: true,
      reference: storeInS3(json),
      summary: generateSummary(metadata),
    };
  }
  return metadata;
}
```

### Issue: Missing Features

```typescript
// Implement missing features at application level
class EnhancedThreadClient extends ThreadUtilityClient {
  async bulkCreate(request: Request, threads: any[]) {
    // LangGraph doesn't have bulk create, so we batch
    const results = await Promise.all(threads.map((data) => this.createThread(request, data)));
    return results;
  }
}
```
