import {
  pgTable,
  varchar,
  text,
  timestamp,
  uuid,
  jsonb,
  boolean,
  integer,
} from 'drizzle-orm/pg-core';
import {
  mysqlTable,
  varchar as mysqlVarchar,
  text as mysqlText,
  timestamp as mysqlTimestamp,
  json as mysqlJson,
  boolean as mysqlBoolean,
  int as mysqlInt,
} from 'drizzle-orm/mysql-core';
import { sqliteTable, text as sqliteText, integer as sqliteInteger } from 'drizzle-orm/sqlite-core';

// PostgreSQL Schema
export const pgUsers = pgTable('user', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});

export const pgThreads = pgTable('thread', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }),
  userId: uuid('userId')
    .notNull()
    .references(() => pgUsers.id, { onDelete: 'cascade' }),
  organizationId: uuid('organizationId'),
  tenantId: varchar('tenantId', { length: 255 }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});

export const pgFeedback = pgTable('feedback', {
  id: uuid('id').primaryKey().defaultRandom(),
  threadId: uuid('threadId')
    .notNull()
    .references(() => pgThreads.id, { onDelete: 'cascade' }),
  userId: uuid('userId')
    .notNull()
    .references(() => pgUsers.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 50 }).notNull(), // "thumbs_up", "thumbs_down", "rating", etc.
  value: text('value'), // JSON string for complex feedback values
  comment: text('comment'),
  messageId: varchar('messageId', { length: 255 }), // Optional reference to specific message
  helpful: boolean('helpful'),
  rating: integer('rating'), // 1-5 scale for rating-type feedback
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});

// MySQL Schema
export const mysqlUsers = mysqlTable('user', {
  id: mysqlVarchar('id', { length: 36 }).primaryKey(),
  name: mysqlVarchar('name', { length: 255 }).notNull(),
  createdAt: mysqlTimestamp('createdAt').defaultNow().notNull(),
  updatedAt: mysqlTimestamp('updatedAt').defaultNow().notNull(),
});

export const mysqlThreads = mysqlTable('thread', {
  id: mysqlVarchar('id', { length: 36 }).primaryKey(),
  title: mysqlVarchar('title', { length: 255 }),
  userId: mysqlVarchar('userId', { length: 36 })
    .notNull()
    .references(() => mysqlUsers.id, { onDelete: 'cascade' }),
  organizationId: mysqlVarchar('organizationId', { length: 36 }),
  tenantId: mysqlVarchar('tenantId', { length: 255 }),
  metadata: mysqlJson('metadata'),
  createdAt: mysqlTimestamp('createdAt').defaultNow().notNull(),
  updatedAt: mysqlTimestamp('updatedAt').defaultNow().notNull(),
});

export const mysqlFeedback = mysqlTable('feedback', {
  id: mysqlVarchar('id', { length: 36 }).primaryKey(),
  threadId: mysqlVarchar('threadId', { length: 36 })
    .notNull()
    .references(() => mysqlThreads.id, { onDelete: 'cascade' }),
  userId: mysqlVarchar('userId', { length: 36 })
    .notNull()
    .references(() => mysqlUsers.id, { onDelete: 'cascade' }),
  type: mysqlVarchar('type', { length: 50 }).notNull(),
  value: mysqlText('value'),
  comment: mysqlText('comment'),
  messageId: mysqlVarchar('messageId', { length: 255 }),
  helpful: mysqlBoolean('helpful'),
  rating: mysqlInt('rating'),
  createdAt: mysqlTimestamp('createdAt').defaultNow().notNull(),
  updatedAt: mysqlTimestamp('updatedAt').defaultNow().notNull(),
});

// SQLite Schema
export const sqliteUsers = sqliteTable('user', {
  id: sqliteText('id').primaryKey(),
  name: sqliteText('name').notNull(),
  createdAt: sqliteInteger('createdAt', { mode: 'timestamp' })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: sqliteInteger('updatedAt', { mode: 'timestamp' })
    .$defaultFn(() => new Date())
    .notNull(),
});

export const sqliteThreads = sqliteTable('thread', {
  id: sqliteText('id').primaryKey(),
  title: sqliteText('title'),
  userId: sqliteText('userId')
    .notNull()
    .references(() => sqliteUsers.id, { onDelete: 'cascade' }),
  organizationId: sqliteText('organizationId'),
  tenantId: sqliteText('tenantId'),
  metadata: sqliteText('metadata'), // JSON string
  createdAt: sqliteInteger('createdAt', { mode: 'timestamp' })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: sqliteInteger('updatedAt', { mode: 'timestamp' })
    .$defaultFn(() => new Date())
    .notNull(),
});

export const sqliteFeedback = sqliteTable('feedback', {
  id: sqliteText('id').primaryKey(),
  threadId: sqliteText('threadId')
    .notNull()
    .references(() => sqliteThreads.id, { onDelete: 'cascade' }),
  userId: sqliteText('userId')
    .notNull()
    .references(() => sqliteUsers.id, { onDelete: 'cascade' }),
  type: sqliteText('type').notNull(),
  value: sqliteText('value'),
  comment: sqliteText('comment'),
  messageId: sqliteText('messageId'),
  helpful: sqliteInteger('helpful', { mode: 'boolean' }),
  rating: sqliteInteger('rating'),
  createdAt: sqliteInteger('createdAt', { mode: 'timestamp' })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: sqliteInteger('updatedAt', { mode: 'timestamp' })
    .$defaultFn(() => new Date())
    .notNull(),
});

// Schema collections for easy import
export const schemas = {
  pg: {
    users: pgUsers,
    threads: pgThreads,
    feedback: pgFeedback,
  },
  mysql: {
    users: mysqlUsers,
    threads: mysqlThreads,
    feedback: mysqlFeedback,
  },
  sqlite: {
    users: sqliteUsers,
    threads: sqliteThreads,
    feedback: sqliteFeedback,
  },
};

// Types for better TypeScript support
export type User = typeof pgUsers.$inferSelect;
export type NewUser = typeof pgUsers.$inferInsert;
export type Thread = typeof pgThreads.$inferSelect;
export type NewThread = typeof pgThreads.$inferInsert;
export type Feedback = typeof pgFeedback.$inferSelect;
export type NewFeedback = typeof pgFeedback.$inferInsert;

// Database provider type
export type DatabaseProvider = 'pg' | 'mysql' | 'sqlite';

// Helper function to get schemas for a specific provider
export function getSchemas(provider: DatabaseProvider) {
  return schemas[provider];
}

// Helper functions for creating tables with any table function
export function usersTable(tableFunction: any) {
  if (tableFunction === pgTable) return pgUsers;
  if (tableFunction === mysqlTable) return mysqlUsers;
  if (tableFunction === sqliteTable) return sqliteUsers;
  throw new Error('Unknown table function');
}

export function threadsTable(tableFunction: any) {
  if (tableFunction === pgTable) return pgThreads;
  if (tableFunction === mysqlTable) return mysqlThreads;
  if (tableFunction === sqliteTable) return sqliteThreads;
  throw new Error('Unknown table function');
}

export function feedbackTable(tableFunction: any) {
  if (tableFunction === pgTable) return pgFeedback;
  if (tableFunction === mysqlTable) return mysqlFeedback;
  if (tableFunction === sqliteTable) return sqliteFeedback;
  throw new Error('Unknown table function');
}
