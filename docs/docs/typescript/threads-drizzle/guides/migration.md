---
sidebar_position: 4
---

# Migration Guide

Complete guide for migrating to @pressw/threads-drizzle from other systems and databases.

## Migration Strategies

### 1. Big Bang Migration

Complete migration in a single operation. Best for:

- Small datasets (< 100k records)
- Systems with maintenance windows
- Simple data structures

### 2. Gradual Migration

Migrate data incrementally while both systems run. Best for:

- Large datasets
- Zero-downtime requirements
- Complex data relationships

### 3. Dual-Write Pattern

Write to both systems during transition. Best for:

- Mission-critical systems
- Rollback requirements
- Phased migrations

## Database Migration

### From Raw SQL

```typescript
// Before: Raw SQL queries
async function getThreads(userId: string) {
  const result = await db.query(
    `SELECT * FROM threads
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 20`,
    [userId],
  );
  return result.rows;
}

// After: Using Drizzle adapter
async function getThreads(userId: string) {
  return await adapter.findMany({
    model: 'thread',
    where: [{ field: 'userId', value: userId }],
    sortBy: { field: 'createdAt', direction: 'desc' },
    limit: 20,
  });
}
```

### From Prisma

```typescript
// Before: Prisma client
const threads = await prisma.thread.findMany({
  where: {
    userId: userId,
    createdAt: { gte: lastWeek },
  },
  include: {
    user: true,
    feedback: true,
  },
  orderBy: { createdAt: 'desc' },
  take: 20,
});

// After: Drizzle adapter with joins
const threadsWithRelations = await db
  .select({
    thread: threadSchema,
    user: userSchema,
    feedback: feedbackSchema,
  })
  .from(threadSchema)
  .leftJoin(userSchema, eq(threadSchema.userId, userSchema.id))
  .leftJoin(feedbackSchema, eq(feedbackSchema.threadId, threadSchema.id))
  .where(and(eq(threadSchema.userId, userId), gte(threadSchema.createdAt, lastWeek)))
  .orderBy(desc(threadSchema.createdAt))
  .limit(20);
```

### From TypeORM

```typescript
// Before: TypeORM repository
@Entity()
class Thread {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @ManyToOne(() => User)
  user: User;

  @CreateDateColumn()
  createdAt: Date;
}

const threads = await threadRepository.find({
  where: { user: { id: userId } },
  relations: ['user'],
  order: { createdAt: 'DESC' },
});

// After: Drizzle schema and adapter
export const threads = pgTable('threads', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

const threads = await adapter.findMany({
  model: 'thread',
  where: [{ field: 'userId', value: userId }],
  sortBy: { field: 'createdAt', direction: 'desc' },
});
```

## Data Migration Scripts

### Basic Migration Script

```typescript
import { DrizzleAdapter } from '@pressw/threads-drizzle';
import { OldDatabase } from './legacy-system';

async function migrateThreads() {
  const oldDb = new OldDatabase();
  const adapter = new DrizzleAdapter(db, config);

  console.log('Starting thread migration...');

  // Get total count for progress tracking
  const totalCount = await oldDb.getThreadCount();
  let processed = 0;

  // Process in batches
  const batchSize = 1000;

  for (let offset = 0; offset < totalCount; offset += batchSize) {
    const batch = await oldDb.getThreads({
      limit: batchSize,
      offset,
    });

    // Transform and insert
    for (const oldThread of batch) {
      try {
        await adapter.create({
          model: 'thread',
          data: transformThread(oldThread),
        });
        processed++;
      } catch (error) {
        console.error(`Failed to migrate thread ${oldThread.id}:`, error);
        // Log to error file for later retry
        await logError(oldThread, error);
      }
    }

    // Progress update
    console.log(
      `Progress: ${processed}/${totalCount} (${((processed / totalCount) * 100).toFixed(2)}%)`,
    );
  }

  console.log('Migration complete!');
}

function transformThread(oldThread: any): Thread {
  return {
    id: oldThread.id,
    title: oldThread.subject || 'Untitled',
    userId: oldThread.ownerId,
    organizationId: oldThread.companyId,
    tenantId: oldThread.divisionCode,
    metadata: {
      migrated: true,
      migratedAt: new Date().toISOString(),
      oldSystem: 'legacy-v1',
      oldId: oldThread.legacyId,
      ...oldThread.customFields,
    },
    createdAt: new Date(oldThread.createdDate),
    updatedAt: new Date(oldThread.modifiedDate || oldThread.createdDate),
  };
}
```

### Advanced Migration with Validation

```typescript
class ThreadMigrator {
  private errors: MigrationError[] = [];
  private stats = {
    total: 0,
    success: 0,
    failed: 0,
    skipped: 0,
  };

  async migrate(options: MigrationOptions = {}) {
    const { batchSize = 1000, validateData = true, dryRun = false, resumeFrom = 0 } = options;

    console.log('Migration started', { options });

    // Get total count
    this.stats.total = await this.oldDb.count('threads');

    // Create checkpoint table for resume capability
    if (!dryRun) {
      await this.createCheckpointTable();
    }

    // Process batches
    for (let offset = resumeFrom; offset < this.stats.total; offset += batchSize) {
      const batch = await this.oldDb.getBatch('threads', offset, batchSize);

      if (batch.length === 0) break;

      // Process batch in transaction
      await db.transaction(async (tx) => {
        for (const record of batch) {
          await this.migrateRecord(record, { validateData, dryRun, tx });
        }

        // Save checkpoint
        if (!dryRun) {
          await this.saveCheckpoint(offset + batch.length);
        }
      });

      this.reportProgress();
    }

    this.generateReport();
  }

  private async migrateRecord(
    record: any,
    options: { validateData: boolean; dryRun: boolean; tx: any },
  ) {
    try {
      // Transform data
      const transformed = this.transformRecord(record);

      // Validate if requested
      if (options.validateData) {
        const validation = this.validateThread(transformed);
        if (!validation.valid) {
          throw new ValidationError(validation.errors);
        }
      }

      // Skip if already migrated
      const existing = await this.adapter.findOne({
        model: 'thread',
        where: [{ field: 'metadata.oldId', value: record.id }],
      });

      if (existing) {
        this.stats.skipped++;
        return;
      }

      // Insert if not dry run
      if (!options.dryRun) {
        await this.adapter.create({
          model: 'thread',
          data: transformed,
        });
      }

      this.stats.success++;
    } catch (error) {
      this.stats.failed++;
      this.errors.push({
        recordId: record.id,
        error: error.message,
        data: record,
      });
    }
  }

  private validateThread(thread: Thread): ValidationResult {
    const errors: string[] = [];

    // Required fields
    if (!thread.id) errors.push('Missing id');
    if (!thread.userId) errors.push('Missing userId');
    if (!thread.createdAt) errors.push('Missing createdAt');

    // Data types
    if (thread.createdAt && !(thread.createdAt instanceof Date)) {
      errors.push('createdAt must be a Date');
    }

    // Business rules
    if (thread.metadata && typeof thread.metadata !== 'object') {
      errors.push('metadata must be an object');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private async createCheckpointTable() {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS migration_checkpoints (
        migration_name VARCHAR(255) PRIMARY KEY,
        last_offset INTEGER NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
  }

  private async saveCheckpoint(offset: number) {
    await db.execute(sql`
      INSERT INTO migration_checkpoints (migration_name, last_offset, updated_at)
      VALUES ('thread_migration', ${offset}, NOW())
      ON CONFLICT (migration_name)
      DO UPDATE SET last_offset = ${offset}, updated_at = NOW()
    `);
  }

  private generateReport() {
    const report = {
      summary: this.stats,
      duration: this.endTime - this.startTime,
      errors: this.errors.slice(0, 100), // First 100 errors
      errorFile: `migration-errors-${Date.now()}.json`,
    };

    // Save full error log
    if (this.errors.length > 0) {
      fs.writeFileSync(report.errorFile, JSON.stringify(this.errors, null, 2));
    }

    console.log('Migration Report:', report);
  }
}

// Usage
const migrator = new ThreadMigrator();
await migrator.migrate({
  validateData: true,
  dryRun: false,
  batchSize: 5000,
});
```

## Dual-Write Implementation

```typescript
class DualWriteAdapter extends BaseAdapter {
  constructor(
    private primaryAdapter: DrizzleAdapter,
    private legacyAdapter: LegacyAdapter,
    private config: DualWriteConfig,
  ) {
    super();
  }

  async create(params: CreateParams): Promise<any> {
    // Write to primary (new system)
    const result = await this.primaryAdapter.create(params);

    // Async write to legacy
    if (this.config.writeLegacy) {
      this.writeLegacyAsync(params, result).catch((error) => {
        this.logError('Legacy write failed', error, params);
      });
    }

    return result;
  }

  async findOne(params: FindParams): Promise<any> {
    // Try primary first
    const result = await this.primaryAdapter.findOne(params);

    if (result || !this.config.fallbackToLegacy) {
      return result;
    }

    // Fallback to legacy
    const legacyResult = await this.legacyAdapter.findOne(params);

    if (legacyResult && this.config.backfillOnRead) {
      // Backfill to primary
      await this.primaryAdapter.create({
        model: params.model,
        data: legacyResult,
      });
    }

    return legacyResult;
  }

  private async writeLegacyAsync(params: CreateParams, primaryResult: any) {
    // Queue for async processing
    await this.queue.add('legacy-write', {
      params,
      primaryResult,
      timestamp: Date.now(),
    });
  }
}

// Usage during migration
const adapter = new DualWriteAdapter(drizzleAdapter, legacyAdapter, {
  writeLegacy: true,
  fallbackToLegacy: true,
  backfillOnRead: true,
});
```

## Rollback Strategy

```typescript
class MigrationRollback {
  async prepareRollback() {
    // 1. Create rollback tables
    await db.execute(sql`
      CREATE TABLE threads_rollback AS
      SELECT * FROM threads
      WHERE metadata->>'migrated' = 'true'
    `);

    // 2. Create reverse mapping
    await db.execute(sql`
      CREATE TABLE migration_mapping (
        new_id UUID PRIMARY KEY,
        old_id VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
  }

  async rollback() {
    console.log('Starting rollback...');

    // 1. Restore legacy data
    const migrated = await db
      .select()
      .from(threads)
      .where(sql`metadata->>'migrated' = 'true'`);

    for (const thread of migrated) {
      await this.legacyDb.restore({
        id: thread.metadata.oldId,
        data: this.reverseTransform(thread),
      });
    }

    // 2. Remove migrated records
    await db.delete(threads).where(sql`metadata->>'migrated' = 'true'`);

    // 3. Clean up
    await db.execute(sql`DROP TABLE IF EXISTS threads_rollback`);
    await db.execute(sql`DROP TABLE IF EXISTS migration_mapping`);

    console.log('Rollback complete');
  }
}
```

## Testing Migration

```typescript
describe('Thread Migration', () => {
  let migrator: ThreadMigrator;
  let testData: any[];

  beforeEach(async () => {
    // Setup test data in old system
    testData = await createTestThreads(100);
    migrator = new ThreadMigrator();
  });

  afterEach(async () => {
    // Cleanup
    await cleanupTestData();
  });

  test('migrates all fields correctly', async () => {
    await migrator.migrate({ batchSize: 10 });

    // Verify each record
    for (const oldThread of testData) {
      const migrated = await adapter.findOne({
        model: 'thread',
        where: [{ field: 'metadata.oldId', value: oldThread.id }],
      });

      expect(migrated).toBeTruthy();
      expect(migrated.title).toBe(oldThread.subject || 'Untitled');
      expect(migrated.userId).toBe(oldThread.ownerId);
      expect(migrated.metadata.migrated).toBe(true);
    }
  });

  test('handles errors gracefully', async () => {
    // Inject some bad data
    testData[5].ownerId = null; // Will cause validation error

    await migrator.migrate({ validateData: true });

    expect(migrator.stats.failed).toBe(1);
    expect(migrator.stats.success).toBe(99);
  });

  test('supports resume from checkpoint', async () => {
    // Migrate half
    await migrator.migrate({ batchSize: 50 });

    // Simulate failure and restart
    const newMigrator = new ThreadMigrator();
    await newMigrator.migrate({ resumeFrom: 50 });

    expect(newMigrator.stats.success).toBe(50);
  });
});
```

## Post-Migration Validation

```typescript
class MigrationValidator {
  async validate(): Promise<ValidationReport> {
    const report: ValidationReport = {
      totalSourceRecords: 0,
      totalMigratedRecords: 0,
      missingRecords: [],
      dataIntegrityIssues: [],
      performanceMetrics: {},
    };

    // 1. Count comparison
    report.totalSourceRecords = await this.oldDb.count('threads');
    report.totalMigratedRecords = await db
      .select({ count: sql<number>`count(*)` })
      .from(threads)
      .where(sql`metadata->>'migrated' = 'true'`);

    // 2. Sample validation
    const sample = await this.oldDb.getRandomSample('threads', 1000);

    for (const oldRecord of sample) {
      const migrated = await adapter.findOne({
        model: 'thread',
        where: [{ field: 'metadata.oldId', value: oldRecord.id }],
      });

      if (!migrated) {
        report.missingRecords.push(oldRecord.id);
      } else {
        // Validate data integrity
        const issues = this.compareRecords(oldRecord, migrated);
        if (issues.length > 0) {
          report.dataIntegrityIssues.push({
            id: oldRecord.id,
            issues,
          });
        }
      }
    }

    // 3. Performance testing
    report.performanceMetrics = await this.testPerformance();

    return report;
  }

  private compareRecords(old: any, migrated: any): string[] {
    const issues: string[] = [];

    // Check critical fields
    if (old.subject !== migrated.title && migrated.title !== 'Untitled') {
      issues.push(`Title mismatch: "${old.subject}" vs "${migrated.title}"`);
    }

    if (old.ownerId !== migrated.userId) {
      issues.push(`User ID mismatch: ${old.ownerId} vs ${migrated.userId}`);
    }

    // Check dates (allowing for timezone differences)
    const oldDate = new Date(old.createdDate);
    const migratedDate = new Date(migrated.createdAt);
    const dateDiff = Math.abs(oldDate.getTime() - migratedDate.getTime());

    if (dateDiff > 1000) {
      // More than 1 second difference
      issues.push(`Date mismatch: ${oldDate} vs ${migratedDate}`);
    }

    return issues;
  }

  private async testPerformance(): Promise<PerformanceMetrics> {
    const metrics: PerformanceMetrics = {};

    // Test query performance
    const queries = [
      { name: 'findByUser', test: () => this.testFindByUser() },
      { name: 'recentThreads', test: () => this.testRecentThreads() },
      { name: 'search', test: () => this.testSearch() },
    ];

    for (const query of queries) {
      const start = performance.now();
      await query.test();
      metrics[query.name] = performance.now() - start;
    }

    return metrics;
  }
}
```

## Migration Checklist

### Pre-Migration

- [ ] Backup existing data
- [ ] Test migration script on staging
- [ ] Prepare rollback plan
- [ ] Notify stakeholders
- [ ] Set up monitoring

### During Migration

- [ ] Monitor progress and errors
- [ ] Validate sample data
- [ ] Check system performance
- [ ] Keep audit log

### Post-Migration

- [ ] Run validation suite
- [ ] Performance testing
- [ ] Update documentation
- [ ] Train team on new system
- [ ] Monitor for issues

## Next Steps

- Review [troubleshooting guide](./troubleshooting.md) for common issues
- Set up [performance monitoring](./performance.md)
- Plan your rollback strategy
