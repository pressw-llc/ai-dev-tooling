export * from './types';
export * from './base-adapter';
export * from './drizzle-adapter';
export * from './factory';

// Re-export commonly used functions for convenience
export {
  createChatCoreAdapter,
  createAdapterWithUserTables,
  validateChatCoreSchema,
  type CreateChatCoreAdapterConfig,
} from './factory';

export type {
  ChatCoreAdapter,
  AdapterConfig,
  DatabaseProvider,
  Where,
  SortBy,
  Models,
  ModelName,
} from './types';
