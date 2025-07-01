import type { ChatCoreAdapter, DatabaseProvider } from './types';
import { createDrizzleAdapter, type DrizzleDB, type DrizzleAdapterConfig } from './drizzle-adapter';

// Simple factory interface that wraps the Drizzle adapter config
export type CreateChatCoreAdapterConfig = Omit<DrizzleAdapterConfig, 'provider'>;

/**
 * Creates a ChatCore adapter that works with user's existing Drizzle database
 */
export function createChatCoreAdapter(
  db: DrizzleDB,
  provider: DatabaseProvider,
  config: CreateChatCoreAdapterConfig,
): ChatCoreAdapter {
  return createDrizzleAdapter(db, {
    ...config,
    provider,
    supportsJSON: config.supportsJSON ?? provider === 'pg',
    supportsDates: config.supportsDates ?? true,
    supportsBooleans: config.supportsBooleans ?? true,
    supportsReturning: config.supportsReturning ?? provider !== 'mysql',
  });
}

/**
 * Helper function to create adapter with existing user tables
 * This is a convenience function for common use cases
 */
export function createAdapterWithUserTables(
  db: DrizzleDB,
  provider: DatabaseProvider,
  options: {
    userTable: string;
    userIdField?: string;
    userNameField?: string;
    threadTable?: string;
    feedbackTable?: string;
    debugLogs?: boolean;
  },
): ChatCoreAdapter {
  const { userTable, userIdField, userNameField, threadTable, feedbackTable, debugLogs } = options;

  return createChatCoreAdapter(db, provider, {
    tables: {
      user: userTable,
      thread: threadTable || 'threads',
      feedback: feedbackTable || 'feedback',
    },
    fields: {
      user: {
        ...(userIdField && userIdField !== 'id' ? { id: userIdField } : {}),
        ...(userNameField && userNameField !== 'name' ? { name: userNameField } : {}),
      },
    },
    debugLogs,
  });
}

/**
 * Helper to validate that required models exist in the schema
 */
export function validateChatCoreSchema(
  adapter: ChatCoreAdapter,
  requiredModels: string[] = ['user', 'thread', 'feedback'],
): void {
  const missingModels = requiredModels.filter((model) => {
    try {
      adapter.getSchema(model);
      return false;
    } catch {
      return true;
    }
  });

  if (missingModels.length > 0) {
    throw new Error(
      `Missing required schemas for models: ${missingModels.join(', ')}. ` +
        'Please provide schemas or use the default ChatCore schemas.',
    );
  }
}
