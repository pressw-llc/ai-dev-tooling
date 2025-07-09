# ChatCore Database Adapters

This adapter system provides a database-agnostic interface for ChatCore that works with any existing Drizzle database. Simply point it at your existing tables and map the required fields - no schema changes needed.

## Quick Start

### Basic Usage with Existing Tables

```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import { createChatCoreAdapter } from '@pressw/chat-core';

// Your existing Drizzle database
const db = drizzle(connectionString, { schema: yourExistingSchema });

// Create adapter that maps to your existing tables
const adapter = createChatCoreAdapter(db, 'pg', {
  tables: {
    user: 'customers', // Your existing customers table
    thread: 'support_tickets', // Your existing support tickets table
    feedback: 'customer_reviews', // Your existing reviews table
  },
  fields: {
    user: {
      id: 'customer_id', // Map ChatCore 'id' to your 'customer_id'
      name: 'full_name', // Map ChatCore 'name' to your 'full_name'
    },
    thread: {
      id: 'ticket_id',
      title: 'subject', // Map ChatCore 'title' to your 'subject'
      userId: 'customer_id',
    },
    feedback: {
      id: 'review_id',
      threadId: 'ticket_id',
      userId: 'customer_id',
      type: 'review_type',
      comment: 'review_text',
    },
  },
  debugLogs: true,
});

// Now use ChatCore with your existing data!
const user = await adapter.findOne({
  model: 'user',
  where: [{ field: 'id', value: 'customer-123' }],
});

const thread = await adapter.create({
  model: 'thread',
  data: {
    title: 'Payment Issue',
    userId: user.id,
  },
});
```

### Using the Convenience Helper

For simpler cases where you just need to map user tables:

```typescript
import { createAdapterWithUserTables } from '@pressw/chat-core';

const adapter = createAdapterWithUserTables(db, 'pg', {
  userTable: 'customers',
  userIdField: 'customer_id',
  userNameField: 'full_name',
  threadTable: 'support_tickets',
  feedbackTable: 'customer_reviews',
  debugLogs: true,
});
```

## How It Works

The adapter takes **any Drizzle database instance** and:

1. **Maps your tables** to ChatCore's 3 required models (user, thread, feedback)
2. **Maps your columns** to ChatCore's required fields
3. **Validates at startup** that all required fields exist
4. **Provides consistent API** regardless of your underlying schema

### Required Fields per Model

**User model requires:**

- `id` (primary key)
- `name` (display name)
- `createdAt` (timestamp)
- `updatedAt` (timestamp)

**Thread model requires:**

- `id` (primary key)
- `userId` (foreign key to user)
- `createdAt` (timestamp)
- `updatedAt` (timestamp)
- `title` (optional)
- `metadata` (optional JSON/text)

**Feedback model requires:**

- `id` (primary key)
- `threadId` (foreign key to thread)
- `userId` (foreign key to user)
- `type` (string category)
- `createdAt` (timestamp)
- `updatedAt` (timestamp)
- Other fields like `rating`, `comment`, `helpful` are optional

## Configuration Options

```typescript
interface DrizzleAdapterConfig {
  provider: 'pg' | 'mysql' | 'sqlite';

  // Required: Map ChatCore models to your table names
  tables: {
    user: string; // e.g., "customers", "users", "accounts"
    thread: string; // e.g., "conversations", "tickets", "chats"
    feedback: string; // e.g., "reviews", "ratings", "feedback"
  };

  // Optional: Map ChatCore fields to your column names
  fields?: {
    user?: {
      id?: string; // default: "id"
      name?: string; // default: "name"
      createdAt?: string; // default: "createdAt"
      updatedAt?: string; // default: "updatedAt"
    };
    thread?: {
      id?: string;
      title?: string;
      userId?: string;
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

  // Optional: Database features
  supportsJSON?: boolean; // Auto-detected based on provider
  supportsDates?: boolean; // Default: true
  supportsBooleans?: boolean; // Default: true
  supportsReturning?: boolean; // Auto-detected based on provider

  debugLogs?: boolean; // Default: false
  generateId?: () => string; // Default: crypto.randomUUID()
  disableIdGeneration?: boolean; // Default: false
}
```

### Database Providers

- **PostgreSQL** (`'pg'`) - Full feature support including JSON
- **MySQL** (`'mysql'`) - Limited JSON support, no RETURNING
- **SQLite** (`'sqlite'`) - File-based, limited JSON support

## API Reference

### Core Methods

```typescript
// Create a new record
await adapter.create({
  model: 'user',
  data: { name: 'John Doe' },
});

// Find a single record
await adapter.findOne({
  model: 'thread',
  where: [{ field: 'userId', value: '123' }],
});

// Find multiple records
await adapter.findMany({
  model: 'feedback',
  where: [
    { field: 'threadId', value: 'thread-123' },
    { field: 'rating', value: 5, operator: 'gte' },
  ],
  limit: 10,
  sortBy: { field: 'createdAt', direction: 'desc' },
});

// Update a record
await adapter.update({
  model: 'user',
  where: [{ field: 'id', value: '123' }],
  data: { name: 'Jane Doe' },
});

// Delete a record
await adapter.delete({
  model: 'thread',
  where: [{ field: 'id', value: '123' }],
});

// Count records
await adapter.count({
  model: 'feedback',
  where: [{ field: 'helpful', value: true }],
});
```

### Where Clause Operators

```typescript
interface Where {
  field: string;
  value: any;
  operator?:
    | 'eq'
    | 'ne'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'in'
    | 'contains'
    | 'starts_with'
    | 'ends_with';
  connector?: 'AND' | 'OR';
}

// Examples
const conditions = [
  { field: 'status', value: 'active' }, // equals
  { field: 'rating', value: 3, operator: 'gte' }, // greater than or equal
  { field: 'tags', value: ['urgent', 'bug'], operator: 'in' }, // in array
  { field: 'title', value: 'payment', operator: 'contains' }, // contains text
  { field: 'category', value: 'support', connector: 'OR' }, // OR condition
];
```

## Real-World Examples

### E-commerce Site with Customer Support

```typescript
// Your existing schema
export const customers = pgTable('customers', {
  customer_id: uuid('customer_id').primaryKey(),
  full_name: varchar('full_name', { length: 255 }),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

export const support_tickets = pgTable('support_tickets', {
  ticket_id: uuid('ticket_id').primaryKey(),
  customer_id: uuid('customer_id').references(() => customers.customer_id),
  subject: varchar('subject', { length: 255 }),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

// ChatCore adapter
const adapter = createChatCoreAdapter(db, 'pg', {
  tables: {
    user: 'customers',
    thread: 'support_tickets',
    feedback: 'customer_feedback',
  },
  fields: {
    user: {
      id: 'customer_id',
      name: 'full_name',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
    thread: {
      id: 'ticket_id',
      title: 'subject',
      userId: 'customer_id',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  },
});
```

### Blog Platform

```typescript
// Your existing schema
export const authors = pgTable('authors', {
  author_uuid: uuid('author_uuid').primaryKey(),
  display_name: varchar('display_name', { length: 255 }),
  created_timestamp: timestamp('created_timestamp').defaultNow(),
  last_updated: timestamp('last_updated').defaultNow(),
});

// ChatCore adapter
const adapter = createChatCoreAdapter(db, 'pg', {
  tables: {
    user: 'authors',
    thread: 'conversations',
    feedback: 'reviews',
  },
  fields: {
    user: {
      id: 'author_uuid',
      name: 'display_name',
      createdAt: 'created_timestamp',
      updatedAt: 'last_updated',
    },
  },
});
```

## Benefits

1. **No Database Changes** - Use your existing schema as-is
2. **Any Table Names** - `customers`, `users`, `accounts` all work
3. **Any Column Names** - Map `customer_id` to ChatCore's `id` field
4. **Existing Relationships** - Your foreign keys and indexes remain
5. **Database Agnostic** - Same API works with PostgreSQL, MySQL, SQLite
6. **Type Safe** - Full TypeScript support with your existing schema types
7. **Validation at Startup** - Clear errors if required fields are missing
8. **Future-Proof** - Easy to add other ORMs (Prisma, etc.) later

## Migration Guide

### From Direct Database Queries

**Before:**

```typescript
// Direct Drizzle queries
const user = await db.insert(users).values({ name: 'John' }).returning();
const threads = await db.select().from(conversations).where(eq(conversations.userId, userId));
```

**After:**

```typescript
// Using ChatCore adapter
const user = await adapter.create({ model: 'user', data: { name: 'John' } });
const threads = await adapter.findMany({
  model: 'thread',
  where: [{ field: 'userId', value: userId }],
});
```

## Troubleshooting

### Validation Errors

The adapter validates at startup that all required fields exist:

```typescript
// This will throw a clear error if 'full_name' column doesn't exist
const adapter = createChatCoreAdapter(db, 'pg', {
  tables: { user: 'customers', thread: 'tickets', feedback: 'reviews' },
  fields: {
    user: { name: 'full_name' }, // Maps to non-existent column
  },
});
// Error: Required field "full_name" not found in table "customers"
```

### Common Issues

**Schema not found:**

- Make sure you pass a properly initialized Drizzle instance
- Ensure your schema is included when creating the Drizzle instance

**Field mapping not working:**

- Check that field names exactly match your database columns
- Remember field mappings are case-sensitive

**TypeScript errors:**

- Ensure your Drizzle types are properly exported and imported

For more detailed examples, see [EXAMPLES.md](./EXAMPLES.md).
