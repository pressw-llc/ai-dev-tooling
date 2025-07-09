import { DrizzleAdapter } from './drizzle-adapter';
import type { DrizzleDB, DrizzleAdapterConfig } from './drizzle-adapter';
import type { ChatCoreAdapter } from '@pressw/threads';

/**
 * Creates a new Drizzle adapter instance
 *
 * @param db - Drizzle database instance
 * @param config - Configuration for the Drizzle adapter
 * @returns A new DrizzleAdapter instance
 *
 * @example
 * ```typescript
 * import { drizzle } from 'drizzle-orm/postgres-js';
 * import postgres from 'postgres';
 *
 * const sql = postgres(DATABASE_URL);
 * const db = drizzle(sql);
 *
 * const adapter = createDrizzleAdapter(db, {
 *   provider: 'pg',
 *   tables: {
 *     user: 'users',
 *     thread: 'threads',
 *     feedback: 'feedback',
 *   },
 * });
 * ```
 */
export function createDrizzleAdapter(db: DrizzleDB, config: DrizzleAdapterConfig): ChatCoreAdapter {
  return new DrizzleAdapter(db, config);
}
