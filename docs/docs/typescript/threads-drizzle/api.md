---
sidebar_position: 2
---

# API Reference

Complete API documentation for the @pressw/threads-drizzle adapter.

## DrizzleAdapter

The main adapter class that implements the ChatCoreAdapter interface for Drizzle ORM.

### Constructor

```typescript
new DrizzleAdapter(db: DrizzleDB, config: DrizzleAdapterConfig)
```

#### Parameters

- `db`: Drizzle database instance
- `config`: Adapter configuration object

#### Example

```typescript
import { DrizzleAdapter } from '@pressw/threads-drizzle';
import { drizzle } from 'drizzle-orm/postgres-js';

const db = drizzle(connection);
const adapter = new DrizzleAdapter(db, {
  provider: 'postgres',
  tables: {
    user: 'users',
    thread: 'threads',
    feedback: 'feedback',
  },
});
```

## Configuration

### DrizzleAdapterConfig

```typescript
interface DrizzleAdapterConfig extends AdapterConfig {
  provider: DatabaseProvider;
  tables: {
    user: string;
    thread: string;
    feedback: string;
  };
  fields?: {
    user?: FieldMapping;
    thread?: FieldMapping;
    feedback?: FieldMapping;
  };
}
```

#### Properties

| Property              | Type                                | Required | Description                                                             |
| --------------------- | ----------------------------------- | -------- | ----------------------------------------------------------------------- |
| `provider`            | `'postgres' \| 'mysql' \| 'sqlite'` | Yes      | Database provider                                                       |
| `tables`              | `object`                            | Yes      | Table name mappings                                                     |
| `fields`              | `object`                            | No       | Column name mappings                                                    |
| `supportsJSON`        | `boolean`                           | No       | Whether database supports JSON (default: based on provider)             |
| `supportsDates`       | `boolean`                           | No       | Whether database supports Date types (default: true)                    |
| `supportsBooleans`    | `boolean`                           | No       | Whether database supports boolean types (default: true)                 |
| `supportsReturning`   | `boolean`                           | No       | Whether database supports RETURNING clause (default: based on provider) |
| `generateId`          | `() => string`                      | No       | Custom ID generation function                                           |
| `disableIdGeneration` | `boolean`                           | No       | Disable automatic ID generation                                         |

### Field Mapping

Map ChatCore field names to your database column names:

```typescript
interface FieldMapping {
  id?: string;
  title?: string;
  userId?: string;
  organizationId?: string;
  tenantId?: string;
  metadata?: string;
  createdAt?: string;
  updatedAt?: string;
}
```

#### Example

```typescript
{
  fields: {
    thread: {
      id: 'thread_id',
      userId: 'owner_id',
      title: 'subject',
      metadata: 'custom_data',
      createdAt: 'created_date',
      updatedAt: 'modified_date',
    },
  },
}
```

## Methods

### create

Creates a new record in the database.

```typescript
create<T extends Record<string, unknown>>(params: {
  model: string;
  data: T;
  select?: string[];
}): Promise<T>
```

#### Parameters

- `model`: Model name ('user', 'thread', 'feedback')
- `data`: Data to insert
- `select`: Fields to return (optional)

#### Example

```typescript
const thread = await adapter.create({
  model: 'thread',
  data: {
    id: 'thread-123',
    title: 'Support Thread',
    userId: 'user-456',
    metadata: { priority: 'high' },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
});
```

### findOne

Finds a single record matching the criteria.

```typescript
findOne<T>(params: {
  model: string;
  where: Where[];
  select?: string[];
}): Promise<T | null>
```

#### Parameters

- `model`: Model name
- `where`: Array of where conditions
- `select`: Fields to return (optional)

#### Example

```typescript
const thread = await adapter.findOne({
  model: 'thread',
  where: [
    { field: 'id', value: 'thread-123' },
    { field: 'userId', value: 'user-456' },
  ],
});
```

### findMany

Finds multiple records matching the criteria.

```typescript
findMany<T>(params: {
  model: string;
  where?: Where[];
  limit?: number;
  offset?: number;
  sortBy?: SortBy;
}): Promise<T[]>
```

#### Parameters

- `model`: Model name
- `where`: Array of where conditions (optional)
- `limit`: Maximum records to return (default: 100)
- `offset`: Number of records to skip
- `sortBy`: Sort configuration

#### Example

```typescript
const threads = await adapter.findMany({
  model: 'thread',
  where: [{ field: 'userId', value: 'user-456' }],
  limit: 20,
  offset: 0,
  sortBy: {
    field: 'createdAt',
    direction: 'desc',
  },
});
```

### update

Updates records matching the criteria.

```typescript
update<T>(params: {
  model: string;
  where: Where[];
  data: Partial<T>;
}): Promise<T | null>
```

#### Parameters

- `model`: Model name
- `where`: Array of where conditions
- `data`: Fields to update

#### Example

```typescript
const updated = await adapter.update({
  model: 'thread',
  where: [{ field: 'id', value: 'thread-123' }],
  data: {
    title: 'Updated Title',
    metadata: { status: 'resolved' },
    updatedAt: new Date(),
  },
});
```

### delete

Deletes records matching the criteria.

```typescript
delete(params: {
  model: string;
  where: Where[];
}): Promise<void>
```

#### Parameters

- `model`: Model name
- `where`: Array of where conditions

#### Example

```typescript
await adapter.delete({
  model: 'thread',
  where: [{ field: 'id', value: 'thread-123' }],
});
```

### count

Counts records matching the criteria.

```typescript
count(params: {
  model: string;
  where?: Where[];
}): Promise<number>
```

#### Parameters

- `model`: Model name
- `where`: Array of where conditions (optional)

#### Example

```typescript
const count = await adapter.count({
  model: 'thread',
  where: [{ field: 'userId', value: 'user-456' }],
});
```

### getSchema

Returns the Drizzle table schema for a model.

```typescript
getSchema(model: string): TableSchema | undefined
```

#### Parameters

- `model`: Model name

#### Example

```typescript
const threadSchema = adapter.getSchema('thread');
// Use with Drizzle for custom queries
const results = await db.select().from(threadSchema);
```

## Where Conditions

### Where Interface

```typescript
interface Where {
  field: string;
  value: string | number | boolean | Date | null | string[] | number[];
  operator?: WhereOperator;
  connector?: 'AND' | 'OR';
}
```

### Operators

| Operator      | Description           | SQL Equivalent         |
| ------------- | --------------------- | ---------------------- |
| `eq`          | Equal (default)       | `=`                    |
| `ne`          | Not equal             | `!=`                   |
| `gt`          | Greater than          | `>`                    |
| `gte`         | Greater than or equal | `>=`                   |
| `lt`          | Less than             | `<`                    |
| `lte`         | Less than or equal    | `<=`                   |
| `in`          | In array              | `IN`                   |
| `contains`    | Contains (text/JSON)  | `LIKE %value%` or `@>` |
| `starts_with` | Starts with           | `LIKE value%`          |
| `ends_with`   | Ends with             | `LIKE %value`          |

### Examples

```typescript
// Simple equality
{ field: 'userId', value: 'user-123' }

// With operator
{ field: 'createdAt', value: new Date('2024-01-01'), operator: 'gte' }

// Array contains
{ field: 'tags', value: ['support', 'billing'], operator: 'in' }

// Text search
{ field: 'title', value: 'customer', operator: 'contains' }

// JSON contains (PostgreSQL)
{ field: 'metadata', value: { status: 'active' }, operator: 'contains' }

// Multiple conditions with OR
[
  { field: 'status', value: 'active', connector: 'OR' },
  { field: 'status', value: 'pending', connector: 'OR' },
]
```

## Sort Configuration

```typescript
interface SortBy {
  field: string;
  direction: 'asc' | 'desc';
}
```

### Example

```typescript
// Sort by created date, newest first
{
  field: 'createdAt',
  direction: 'desc'
}

// Sort by title alphabetically
{
  field: 'title',
  direction: 'asc'
}
```

## Data Type Handling

### JSON Fields

The adapter automatically handles JSON serialization based on database support:

```typescript
// PostgreSQL/MySQL with JSON support
const thread = await adapter.create({
  model: 'thread',
  data: {
    metadata: { complex: { nested: 'object' } }, // Stored as native JSON
  },
});

// SQLite without JSON support
// Same code works - adapter stringifies/parses automatically
```

### Date Fields

Dates are automatically converted based on database support:

```typescript
// All databases
const thread = await adapter.create({
  model: 'thread',
  data: {
    createdAt: new Date(), // Stored appropriately for each DB
  },
});

// SQLite: Stored as Unix timestamp
// PostgreSQL/MySQL: Stored as native timestamp
```

### Boolean Fields

Booleans are handled based on database capabilities:

```typescript
// PostgreSQL/MySQL
{
  helpful: true;
} // Stored as native boolean

// SQLite without boolean support
{
  helpful: true;
} // Stored as 1/0, converted automatically
```

## Error Handling

The adapter throws standard errors that should be caught:

```typescript
try {
  await adapter.create({ model: 'thread', data });
} catch (error) {
  if (error.code === 'P2002') {
    // Unique constraint violation (Prisma/Drizzle)
  } else if (error.message.includes('Required field')) {
    // Validation error
  } else {
    // Other database error
  }
}
```

### Common Errors

| Error                          | Description                   | Solution                            |
| ------------------------------ | ----------------------------- | ----------------------------------- |
| `Table "x" not found`          | Table doesn't exist in schema | Check table configuration           |
| `Required field "x" not found` | Missing required column       | Add field mapping or column         |
| `Model "x" not found`          | Invalid model name            | Use 'user', 'thread', or 'feedback' |
| `Field "x" not found in table` | Column doesn't exist          | Check field mapping                 |

## Performance Tips

1. **Use indexes for frequently queried fields**
2. **Limit result sets with pagination**
3. **Use field selection to reduce data transfer**
4. **Consider connection pooling for high traffic**
5. **Use transactions for related operations**

## Next Steps

- See [examples](./examples.md) for real-world usage
- Learn about [field mapping](./guides/field-mapping.md)
- Explore [performance optimization](./guides/performance.md)
