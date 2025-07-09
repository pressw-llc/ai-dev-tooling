---
sidebar_position: 3
---

# Field Mapping Guide

Learn how to use the Drizzle adapter with existing database schemas that have different column names or structures.

## Overview

Field mapping allows you to use the threads adapter with your existing database without modifying your schema. This is particularly useful when:

- Integrating with legacy databases
- Following different naming conventions
- Working with databases designed for other purposes
- Maintaining backward compatibility

## Basic Field Mapping

### Simple Column Mapping

Map thread model fields to your existing columns:

```typescript
const adapter = new DrizzleAdapter(db, {
  provider: 'postgres',
  tables: {
    user: 'customers', // Your table names
    thread: 'conversations',
    feedback: 'ratings',
  },
  fields: {
    thread: {
      id: 'conversation_id', // Map id -> conversation_id
      title: 'subject', // Map title -> subject
      userId: 'customer_id', // Map userId -> customer_id
      organizationId: 'company_id',
      tenantId: 'division_code',
      metadata: 'extra_data',
      createdAt: 'created_date',
      updatedAt: 'modified_date',
    },
    user: {
      id: 'customer_id',
      name: 'full_name',
      email: 'email_address',
    },
  },
});
```

### Working with Existing Schemas

Example legacy schema with different naming:

```typescript
// Your existing schema
export const conversations = pgTable('conversations', {
  conversation_id: uuid('conversation_id').primaryKey(),
  subject: varchar('subject', { length: 500 }),
  customer_id: uuid('customer_id').notNull(),
  company_id: uuid('company_id'),
  division_code: varchar('division_code', { length: 20 }),
  extra_data: jsonb('extra_data'),
  created_date: timestamp('created_date').notNull(),
  modified_date: timestamp('modified_date').notNull(),

  // Additional columns not in thread model
  status_code: integer('status_code'),
  assigned_agent: uuid('assigned_agent'),
  channel: varchar('channel', { length: 50 }),
});

// Use with field mapping
const thread = await threadClient.createThread(request, {
  title: 'Billing inquiry', // Stored in 'subject'
  metadata: {
    // Stored in 'extra_data'
    category: 'billing',
    priority: 'high',
  },
});
```

## Advanced Mapping Scenarios

### Composite Fields

When your schema uses multiple columns for what the thread model considers a single field:

```typescript
// Schema with separate date/time columns
const legacyThreads = pgTable('threads', {
  id: varchar('thread_id', { length: 50 }).primaryKey(),
  title: varchar('thread_title', { length: 200 }),
  user_id: integer('user_id').notNull(),

  // Date and time stored separately
  created_date: date('created_date').notNull(),
  created_time: time('created_time').notNull(),
  updated_date: date('updated_date').notNull(),
  updated_time: time('updated_time').notNull(),

  // JSON stored as text
  metadata_json: text('metadata_json'),
});

// Custom adapter extending DrizzleAdapter
class LegacyDrizzleAdapter extends DrizzleAdapter {
  protected transformInput(model: string, data: any): any {
    if (model === 'thread') {
      const transformed = { ...data };

      // Split datetime into date and time
      if (data.createdAt) {
        const date = new Date(data.createdAt);
        transformed.created_date = date.toISOString().split('T')[0];
        transformed.created_time = date.toTimeString().split(' ')[0];
        delete transformed.createdAt;
      }

      if (data.updatedAt) {
        const date = new Date(data.updatedAt);
        transformed.updated_date = date.toISOString().split('T')[0];
        transformed.updated_time = date.toTimeString().split(' ')[0];
        delete transformed.updatedAt;
      }

      // Convert metadata to JSON string if needed
      if (data.metadata && typeof data.metadata === 'object') {
        transformed.metadata_json = JSON.stringify(data.metadata);
        delete transformed.metadata;
      }

      return super.transformInput(model, transformed);
    }

    return super.transformInput(model, data);
  }

  protected transformOutput(model: string, data: any): any {
    if (model === 'thread' && data) {
      const transformed = { ...data };

      // Combine date and time
      if (data.created_date && data.created_time) {
        transformed.createdAt = new Date(`${data.created_date}T${data.created_time}`);
        delete transformed.created_date;
        delete transformed.created_time;
      }

      if (data.updated_date && data.updated_time) {
        transformed.updatedAt = new Date(`${data.updated_date}T${data.updated_time}`);
        delete transformed.updated_date;
        delete transformed.updated_time;
      }

      // Parse JSON string
      if (data.metadata_json) {
        try {
          transformed.metadata = JSON.parse(data.metadata_json);
        } catch {
          transformed.metadata = {};
        }
        delete transformed.metadata_json;
      }

      return super.transformOutput(model, transformed);
    }

    return super.transformOutput(model, data);
  }
}
```

### Type Conversions

Handle different data types between your schema and the thread model:

```typescript
// Schema with different types
const threads = sqliteTable('threads', {
  id: integer('id').primaryKey({ autoIncrement: true }), // Integer ID
  title: text('title'),
  user_id: integer('user_id').notNull(),

  // Booleans stored as integers
  is_active: integer('is_active').notNull().default(1),
  is_archived: integer('is_archived').notNull().default(0),

  // Dates stored as Unix timestamps
  created_timestamp: integer('created_timestamp').notNull(),
  updated_timestamp: integer('updated_timestamp').notNull(),

  // JSON stored as text
  metadata_text: text('metadata_text'),
});

// Adapter with type conversions
const adapter = new DrizzleAdapter(db, {
  provider: 'sqlite',
  tables: {
    user: 'users',
    thread: 'threads',
    feedback: 'feedback',
  },
  fields: {
    thread: {
      createdAt: 'created_timestamp',
      updatedAt: 'updated_timestamp',
      metadata: 'metadata_text',
    },
  },

  // Custom transformations
  generateId: () => undefined, // Let SQLite auto-increment

  // Override transform methods
  transformInput: (model, data) => {
    if (model === 'thread') {
      const transformed = { ...data };

      // Convert string ID to number
      if (data.id && typeof data.id === 'string') {
        transformed.id = parseInt(data.id, 10);
      }

      // Convert dates to Unix timestamps
      if (data.createdAt instanceof Date) {
        transformed.created_timestamp = Math.floor(data.createdAt.getTime() / 1000);
      }
      if (data.updatedAt instanceof Date) {
        transformed.updated_timestamp = Math.floor(data.updatedAt.getTime() / 1000);
      }

      // Store booleans as integers in metadata
      if (data.metadata) {
        const meta = { ...data.metadata };
        if (typeof meta.isActive === 'boolean') {
          transformed.is_active = meta.isActive ? 1 : 0;
          delete meta.isActive;
        }
        if (typeof meta.isArchived === 'boolean') {
          transformed.is_archived = meta.isArchived ? 1 : 0;
          delete meta.isArchived;
        }
        transformed.metadata_text = JSON.stringify(meta);
      }

      return transformed;
    }
    return data;
  },

  transformOutput: (model, data) => {
    if (model === 'thread' && data) {
      const transformed = { ...data };

      // Convert integer ID to string
      if (typeof data.id === 'number') {
        transformed.id = data.id.toString();
      }

      // Convert Unix timestamps to dates
      if (typeof data.created_timestamp === 'number') {
        transformed.createdAt = new Date(data.created_timestamp * 1000);
      }
      if (typeof data.updated_timestamp === 'number') {
        transformed.updatedAt = new Date(data.updated_timestamp * 1000);
      }

      // Parse metadata and include boolean fields
      let metadata = {};
      if (data.metadata_text) {
        try {
          metadata = JSON.parse(data.metadata_text);
        } catch {}
      }
      metadata.isActive = data.is_active === 1;
      metadata.isArchived = data.is_archived === 1;
      transformed.metadata = metadata;

      return transformed;
    }
    return data;
  },
});
```

## Handling Complex Relationships

### Denormalized Data

When thread data is spread across multiple tables:

```typescript
// Main thread table
const threads = pgTable('threads', {
  id: uuid('id').primaryKey(),
  user_id: uuid('user_id').notNull(),
  created_at: timestamp('created_at').notNull(),
  updated_at: timestamp('updated_at').notNull(),
});

// Thread details in separate table
const thread_details = pgTable('thread_details', {
  thread_id: uuid('thread_id').primaryKey(),
  title: varchar('title', { length: 500 }),
  description: text('description'),
  category: varchar('category', { length: 100 }),
  priority: varchar('priority', { length: 50 }),
  tags: text('tags'), // Comma-separated
});

// Custom adapter to handle joins
class JoinedDrizzleAdapter extends DrizzleAdapter {
  async findOne(params: FindParams): Promise<any> {
    if (params.model === 'thread') {
      const result = await db
        .select({
          id: threads.id,
          userId: threads.user_id,
          createdAt: threads.created_at,
          updatedAt: threads.updated_at,
          title: thread_details.title,
          metadata: sql<any>`
            jsonb_build_object(
              'description', ${thread_details.description},
              'category', ${thread_details.category},
              'priority', ${thread_details.priority},
              'tags', string_to_array(${thread_details.tags}, ',')
            )
          `.as('metadata'),
        })
        .from(threads)
        .leftJoin(thread_details, eq(threads.id, thread_details.thread_id))
        .where(this.buildWhereClause(params.where))
        .limit(1);

      return result[0] || null;
    }

    return super.findOne(params);
  }

  async create(params: CreateParams): Promise<any> {
    if (params.model === 'thread') {
      return await db.transaction(async (tx) => {
        // Insert into main table
        const [thread] = await tx
          .insert(threads)
          .values({
            id: params.data.id,
            user_id: params.data.userId,
            created_at: params.data.createdAt,
            updated_at: params.data.updatedAt,
          })
          .returning();

        // Insert into details table
        await tx.insert(thread_details).values({
          thread_id: thread.id,
          title: params.data.title,
          description: params.data.metadata?.description,
          category: params.data.metadata?.category,
          priority: params.data.metadata?.priority,
          tags: params.data.metadata?.tags?.join(','),
        });

        // Return combined result
        return this.findOne({
          model: 'thread',
          where: [{ field: 'id', value: thread.id }],
        });
      });
    }

    return super.create(params);
  }
}
```

### Polymorphic Associations

When threads can belong to different entity types:

```typescript
// Schema with polymorphic associations
const threads = pgTable('threads', {
  id: uuid('id').primaryKey(),
  title: varchar('title', { length: 255 }),

  // Polymorphic owner
  owner_type: varchar('owner_type', { length: 50 }).notNull(), // 'user', 'team', 'bot'
  owner_id: uuid('owner_id').notNull(),

  // Polymorphic context
  context_type: varchar('context_type', { length: 50 }), // 'project', 'ticket', 'chat'
  context_id: uuid('context_id'),

  metadata: jsonb('metadata'),
  created_at: timestamp('created_at').notNull(),
  updated_at: timestamp('updated_at').notNull(),
});

// Adapter handling polymorphic relationships
const adapter = new DrizzleAdapter(db, {
  provider: 'postgres',
  tables: {
    user: 'users',
    thread: 'threads',
    feedback: 'feedback',
  },

  // Custom transform to handle polymorphism
  transformInput: (model, data) => {
    if (model === 'thread') {
      const transformed = { ...data };

      // Map userId to polymorphic owner
      if (data.userId) {
        transformed.owner_type = 'user';
        transformed.owner_id = data.userId;
        delete transformed.userId;
      }

      // Map organizationId to context
      if (data.organizationId) {
        transformed.context_type = 'organization';
        transformed.context_id = data.organizationId;
        delete transformed.organizationId;
      }

      // Store additional context in metadata
      if (data.tenantId) {
        transformed.metadata = {
          ...transformed.metadata,
          tenantId: data.tenantId,
        };
        delete transformed.tenantId;
      }

      return transformed;
    }
    return data;
  },

  transformOutput: (model, data) => {
    if (model === 'thread' && data) {
      const transformed = { ...data };

      // Map polymorphic owner back to userId
      if (data.owner_type === 'user') {
        transformed.userId = data.owner_id;
      }

      // Map context back to organizationId
      if (data.context_type === 'organization') {
        transformed.organizationId = data.context_id;
      }

      // Extract tenantId from metadata
      if (data.metadata?.tenantId) {
        transformed.tenantId = data.metadata.tenantId;
      }

      return transformed;
    }
    return data;
  },
});
```

## Best Practices

### 1. Document Your Mappings

```typescript
/**
 * Field Mapping Documentation
 *
 * Thread Model -> Database Columns:
 * - id          -> conversation_id (UUID)
 * - title       -> subject (VARCHAR 500)
 * - userId      -> customer_id (UUID, FK to customers)
 * - metadata    -> extra_data (JSONB)
 * - createdAt   -> created_date (TIMESTAMP)
 * - updatedAt   -> modified_date (TIMESTAMP)
 *
 * Special handling:
 * - organizationId is stored in metadata.organizationId
 * - tenantId maps to division_code
 */
```

### 2. Validate Mappings

```typescript
// Test your mappings
async function validateFieldMapping(adapter: DrizzleAdapter) {
  const testData = {
    title: 'Test Thread',
    metadata: { test: true },
  };

  // Create
  const created = await threadClient.createThread(request, testData);
  console.assert(created.title === testData.title, 'Title mapping failed');

  // Read
  const found = await threadClient.getThread(request, created.id);
  console.assert(found?.metadata?.test === true, 'Metadata mapping failed');

  // Update
  const updated = await threadClient.updateThread(request, created.id, {
    title: 'Updated Title',
  });
  console.assert(updated.title === 'Updated Title', 'Update mapping failed');

  // Cleanup
  await threadClient.deleteThread(request, created.id);
}
```

### 3. Handle Migration Gradually

```typescript
// Dual-write pattern for gradual migration
class MigrationAdapter extends DrizzleAdapter {
  async create(params: CreateParams): Promise<any> {
    // Write to new schema
    const result = await super.create(params);

    // Also write to legacy system
    try {
      await this.writeLegacy(params);
    } catch (error) {
      console.error('Legacy write failed:', error);
      // Continue - new system is source of truth
    }

    return result;
  }
}
```

## Next Steps

- Review [migration strategies](./migration.md) for moving from other systems
- Explore [troubleshooting guide](./troubleshooting.md) for common issues
