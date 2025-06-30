---
sidebar_position: 2
---

# Drizzle Adapter

The Drizzle adapter enables Chat Core to work with any existing Drizzle ORM database. It provides automatic schema introspection, field mapping, and database-specific optimizations.

## Installation

The Drizzle adapter is included with the core package:

```bash
bun add @pressw/chat-core drizzle-orm
```

## Quick Start

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
    feedback: 'reviews', // Your existing reviews table
  },
  fields: {
    user: {
      id: 'customer_id', // Map Chat Core 'id' to your 'customer_id'
      name: 'full_name', // Map Chat Core 'name' to your 'full_name'
    },
  },
});

// Now use Chat Core with your existing data!
const user = await adapter.findOne({
  model: 'user',
  where: [{ field: 'id', value: 'customer-123' }],
});
```

## Configuration

### Basic Configuration

```typescript
interface CreateChatCoreAdapterConfig {
  // Required: Map Chat Core models to your table names
  tables: {
    user: string; // e.g., "customers", "users", "accounts"
    thread: string; // e.g., "conversations", "tickets", "chats"
    feedback: string; // e.g., "reviews", "ratings", "feedback"
  };

  // Optional: Map Chat Core fields to your column names
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
      comment?: string;
      rating?: string;
      helpful?: string;
      createdAt?: string;
      updatedAt?: string;
    };
  };

  // Optional: Database feature flags
  supportsJSON?: boolean; // Auto-detected based on provider
  supportsDates?: boolean; // Default: true
  supportsBooleans?: boolean; // Default: true
  supportsReturning?: boolean; // Auto-detected based on provider

  // Optional: Debugging and ID generation
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

### Core Operations

#### Create a Record

```typescript
const user = await adapter.create({
  model: 'user',
  data: {
    name: 'John Doe',
    // Additional fields based on your schema
  },
});
```

#### Find Single Record

```typescript
const user = await adapter.findOne({
  model: 'user',
  where: [{ field: 'id', value: 'user-123' }],
});
```

#### Find Multiple Records

```typescript
const threads = await adapter.findMany({
  model: 'thread',
  where: [
    { field: 'userId', value: 'user-123' },
    { field: 'createdAt', value: new Date('2024-01-01'), operator: 'gte' },
  ],
  limit: 10,
  sortBy: { field: 'createdAt', direction: 'desc' },
});
```

#### Update a Record

```typescript
const updatedUser = await adapter.update({
  model: 'user',
  where: [{ field: 'id', value: 'user-123' }],
  data: { name: 'Jane Doe' },
});
```

#### Delete a Record

```typescript
await adapter.delete({
  model: 'thread',
  where: [{ field: 'id', value: 'thread-123' }],
});
```

#### Count Records

```typescript
const feedbackCount = await adapter.count({
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
  email: varchar('email', { length: 255 }),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

export const support_tickets = pgTable('support_tickets', {
  ticket_id: uuid('ticket_id').primaryKey(),
  customer_id: uuid('customer_id').references(() => customers.customer_id),
  subject: varchar('subject', { length: 255 }),
  status: varchar('status', { length: 50 }),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

export const customer_feedback = pgTable('customer_feedback', {
  feedback_id: uuid('feedback_id').primaryKey(),
  ticket_id: uuid('ticket_id').references(() => support_tickets.ticket_id),
  customer_id: uuid('customer_id').references(() => customers.customer_id),
  feedback_type: varchar('feedback_type', { length: 50 }),
  rating: integer('rating'),
  comments: text('comments'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

// Chat Core adapter
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
    feedback: {
      id: 'feedback_id',
      threadId: 'ticket_id',
      userId: 'customer_id',
      type: 'feedback_type',
      comment: 'comments',
      rating: 'rating',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  },
});

// Usage examples
const user = await adapter.findOne({
  model: 'user',
  where: [{ field: 'id', value: 'customer-123' }],
});

const thread = await adapter.create({
  model: 'thread',
  data: {
    title: 'Payment processing issue',
    userId: user.id,
  },
});

const feedback = await adapter.create({
  model: 'feedback',
  data: {
    threadId: thread.id,
    userId: user.id,
    type: 'satisfaction',
    rating: 4,
    comment: 'Issue was resolved quickly',
  },
});
```

### Blog Platform Integration

```typescript
// Your existing blog schema
export const authors = pgTable('authors', {
  author_uuid: uuid('author_uuid').primaryKey(),
  display_name: varchar('display_name', { length: 255 }),
  created_timestamp: timestamp('created_timestamp').defaultNow(),
  last_updated: timestamp('last_updated').defaultNow(),
});

export const conversations = pgTable('conversations', {
  conversation_uuid: uuid('conversation_uuid').primaryKey(),
  author_uuid: uuid('author_uuid').references(() => authors.author_uuid),
  topic: varchar('topic', { length: 255 }),
  created_timestamp: timestamp('created_timestamp').defaultNow(),
  last_updated: timestamp('last_updated').defaultNow(),
});

// Setup Chat Core adapter
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
    thread: {
      id: 'conversation_uuid',
      title: 'topic',
      userId: 'author_uuid',
      createdAt: 'created_timestamp',
      updatedAt: 'last_updated',
    },
  },
});
```

## Convenience Helper

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

## Error Handling and Validation

The adapter validates your schema at startup:

```typescript
// This will throw a clear error if required fields are missing
const adapter = createChatCoreAdapter(db, 'pg', {
  tables: { user: 'customers', thread: 'tickets', feedback: 'reviews' },
  fields: {
    user: { name: 'nonexistent_field' }, // Error!
  },
});

// Error: Required field "nonexistent_field" not found in table "customers"
```

### Common Issues

**Schema not found:**

- Ensure your Drizzle instance includes the schema when created
- Check that table names exactly match your database

**Field mapping errors:**

- Field names are case-sensitive
- Verify column names match your database exactly

**TypeScript errors:**

- Ensure Drizzle types are properly exported and imported

## Features

- **Automatic Schema Introspection**: Validates required fields at startup
- **Database-Specific Optimizations**: Handles JSON, dates, booleans per database
- **Type Transformations**: Automatically converts between database and Chat Core types
- **RETURNING Support**: Uses RETURNING when available, falls back gracefully
- **Debug Logging**: Optional detailed logging for development
- **Flexible ID Generation**: Customizable ID generation or use existing IDs

## Migration Guide

### From Direct Drizzle Queries

**Before:**

```typescript
const user = await db.insert(users).values({ name: 'John' }).returning();
const threads = await db.select().from(conversations).where(eq(conversations.userId, userId));
```

**After:**

```typescript
const user = await adapter.create({ model: 'user', data: { name: 'John' } });
const threads = await adapter.findMany({
  model: 'thread',
  where: [{ field: 'userId', value: userId }],
});
```

This provides a consistent API while preserving all the power and flexibility of your existing Drizzle setup.
