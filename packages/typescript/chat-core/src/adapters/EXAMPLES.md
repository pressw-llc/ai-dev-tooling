# ChatCore Adapter Examples

The simplified Drizzle adapter works with any existing database by introspecting your Drizzle schema and mapping the required ChatCore fields to your existing tables.

## Basic Usage with Existing Tables

### Example 1: E-commerce Site with Customer Support

```typescript
// Your existing Drizzle schema
import { pgTable, uuid, varchar, timestamp, text, boolean, integer } from 'drizzle-orm/pg-core';

export const customers = pgTable('customers', {
  customer_id: uuid('customer_id').primaryKey().defaultRandom(),
  full_name: varchar('full_name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const support_tickets = pgTable('support_tickets', {
  ticket_id: uuid('ticket_id').primaryKey().defaultRandom(),
  customer_id: uuid('customer_id')
    .references(() => customers.customer_id)
    .notNull(),
  subject: varchar('subject', { length: 255 }),
  status: varchar('status', { length: 50 }).notNull(),
  priority: varchar('priority', { length: 20 }),
  metadata: text('metadata'), // JSON as text
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const customer_feedback = pgTable('customer_feedback', {
  feedback_id: uuid('feedback_id').primaryKey().defaultRandom(),
  ticket_id: uuid('ticket_id')
    .references(() => support_tickets.ticket_id)
    .notNull(),
  customer_id: uuid('customer_id')
    .references(() => customers.customer_id)
    .notNull(),
  feedback_type: varchar('feedback_type', { length: 50 }).notNull(),
  rating: integer('rating'),
  comments: text('comments'),
  is_helpful: boolean('is_helpful'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Your existing posts/content table
export const blog_posts = pgTable('blog_posts', {
  post_id: uuid('post_id').primaryKey().defaultRandom(),
  author_id: uuid('author_id').references(() => customers.customer_id),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(),
  status: varchar('status', { length: 20 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Your existing audit log
export const audit_log = pgTable('audit_log', {
  log_id: uuid('log_id').primaryKey().defaultRandom(),
  table_name: varchar('table_name', { length: 100 }).notNull(),
  record_id: varchar('record_id', { length: 255 }).notNull(),
  action: varchar('action', { length: 50 }).notNull(),
  user_id: uuid('user_id'),
  old_values: text('old_values'),
  new_values: text('new_values'),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
});
```

### Setting up ChatCore Adapter

```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import { createChatCoreAdapter } from '@pressw/chat-core';

const db = drizzle(connectionString, {
  schema: {
    customers,
    support_tickets,
    customer_feedback,
    blog_posts,
    audit_log,
  },
});

// Create ChatCore adapter that maps to your existing tables
const adapter = createChatCoreAdapter(db, 'pg', {
  tables: {
    user: 'customers', // ChatCore 'user' -> your 'customers' table
    thread: 'support_tickets', // ChatCore 'thread' -> your 'support_tickets' table
    feedback: 'customer_feedback', // ChatCore 'feedback' -> your 'customer_feedback' table
  },
  fields: {
    user: {
      id: 'customer_id', // ChatCore 'id' -> your 'customer_id'
      name: 'full_name', // ChatCore 'name' -> your 'full_name'
      createdAt: 'created_at', // ChatCore 'createdAt' -> your 'created_at'
      updatedAt: 'updated_at', // ChatCore 'updatedAt' -> your 'updated_at'
    },
    thread: {
      id: 'ticket_id',
      title: 'subject', // ChatCore 'title' -> your 'subject'
      userId: 'customer_id', // ChatCore 'userId' -> your 'customer_id'
      metadata: 'metadata', // This field exists in both schemas
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
    feedback: {
      id: 'feedback_id',
      threadId: 'ticket_id',
      userId: 'customer_id',
      type: 'feedback_type', // ChatCore 'type' -> your 'feedback_type'
      comment: 'comments', // ChatCore 'comment' -> your 'comments'
      helpful: 'is_helpful', // ChatCore 'helpful' -> your 'is_helpful'
      rating: 'rating', // This field exists in both schemas
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  },
  debugLogs: process.env.NODE_ENV === 'development',
});

// Now use ChatCore with your existing data!
const user = await adapter.findOne({
  model: 'user',
  where: [{ field: 'id', value: 'customer-123' }],
});

const thread = await adapter.create({
  model: 'thread',
  data: {
    title: 'Payment processing issue',
    userId: user.id,
    metadata: { priority: 'high', source: 'email' },
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
    helpful: true,
  },
});
```

## Example 2: Blog Platform Integration

```typescript
// Your existing blog schema
export const authors = pgTable('authors', {
  author_uuid: uuid('author_uuid').primaryKey().defaultRandom(),
  display_name: varchar('display_name', { length: 255 }).notNull(),
  bio: text('bio'),
  created_timestamp: timestamp('created_timestamp').defaultNow().notNull(),
  last_updated: timestamp('last_updated').defaultNow().notNull(),
});

export const conversations = pgTable('conversations', {
  conversation_uuid: uuid('conversation_uuid').primaryKey().defaultRandom(),
  author_uuid: uuid('author_uuid')
    .references(() => authors.author_uuid)
    .notNull(),
  topic: varchar('topic', { length: 255 }),
  conversation_data: text('conversation_data'), // JSON stored as text
  created_timestamp: timestamp('created_timestamp').defaultNow().notNull(),
  last_updated: timestamp('last_updated').defaultNow().notNull(),
});

export const reviews = pgTable('reviews', {
  review_uuid: uuid('review_uuid').primaryKey().defaultRandom(),
  conversation_uuid: uuid('conversation_uuid')
    .references(() => conversations.conversation_uuid)
    .notNull(),
  author_uuid: uuid('author_uuid')
    .references(() => authors.author_uuid)
    .notNull(),
  review_category: varchar('review_category', { length: 100 }).notNull(),
  score: integer('score'),
  review_text: text('review_text'),
  created_timestamp: timestamp('created_timestamp').defaultNow().notNull(),
  last_updated: timestamp('last_updated').defaultNow().notNull(),
});

// Setup ChatCore adapter
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
      metadata: 'conversation_data',
      createdAt: 'created_timestamp',
      updatedAt: 'last_updated',
    },
    feedback: {
      id: 'review_uuid',
      threadId: 'conversation_uuid',
      userId: 'author_uuid',
      type: 'review_category',
      comment: 'review_text',
      rating: 'score',
      createdAt: 'created_timestamp',
      updatedAt: 'last_updated',
    },
  },
});
```

## Example 3: Using Convenience Helper

For common cases where you just need to map a user table:

```typescript
import { createAdapterWithUserTables } from '@pressw/chat-core';

const adapter = createAdapterWithUserTables(db, 'pg', {
  userTable: 'customers',
  userIdField: 'customer_id',
  userNameField: 'full_name',
  threadTable: 'support_tickets',
  feedbackTable: 'customer_feedback',
  debugLogs: true,
});
```

## Working with Existing Tables

The key insight is that ChatCore doesn't need to control your database schema. It just needs to know:

1. **Which tables** contain the data it needs (via `tables` config)
2. **Which columns** map to ChatCore's expected fields (via `fields` config)
3. **What database provider** you're using for optimizations

### Required Fields per Model

**User model requires:**

- `id` (string/uuid primary key)
- `name` (string display name)
- `createdAt` (timestamp)
- `updatedAt` (timestamp)

**Thread model requires:**

- `id` (string/uuid primary key)
- `userId` (foreign key to user)
- `createdAt` (timestamp)
- `updatedAt` (timestamp)
- `title` (optional string)
- `metadata` (optional JSON/text)

**Feedback model requires:**

- `id` (string/uuid primary key)
- `threadId` (foreign key to thread)
- `userId` (foreign key to user)
- `type` (string category)
- `createdAt` (timestamp)
- `updatedAt` (timestamp)
- Other fields like `rating`, `comment`, `helpful` are optional

### Benefits

1. **No Database Changes** - Use your existing schema as-is
2. **Any Table Names** - `customers`, `users`, `accounts` all work
3. **Any Column Names** - Map `customer_id` to ChatCore's `id` field
4. **Existing Relationships** - Your foreign keys and indexes remain
5. **Database Agnostic** - Same API works with PostgreSQL, MySQL, SQLite
6. **Type Safe** - Full TypeScript support with your existing schema types

### Error Handling

The adapter will validate at startup that all required fields exist:

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

This ensures problems are caught early rather than at runtime during operations.
