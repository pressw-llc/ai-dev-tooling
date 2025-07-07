// Core exports
export * from '../types';
export { ThreadUtilityClient, createThreadUtilityClient } from '../thread-client';

// Adapter exports - using base adapters directly
export { DrizzleAdapter } from '../adapters/drizzle-adapter';
export type { DrizzleAdapterConfig, DrizzleDB } from '../adapters/drizzle-adapter';

// Next.js route handler exports
// TODO: Fix these imports once nextjs module is available
// export {
//   createThreadRouteHandlers,
//   createThreadDetailRouteHandlers,
//   createCatchAllThreadRouteHandler,
// } from '../nextjs/route-handlers';
// export type { ThreadRouteConfig } from '../nextjs/route-handlers';

// React hooks exports
export {
  useThreads,
  useThread,
  useCreateThread,
  useUpdateThread,
  useDeleteThread,
  useInfiniteThreads,
  threadQueryKeys,
  DefaultThreadApiClient,
  getDefaultApiClient,
  setDefaultApiClient,
} from '../react/thread-hooks';
export type {
  UseThreadsOptions,
  UseThreadOptions,
  UseCreateThreadOptions,
  UseUpdateThreadOptions,
  UseDeleteThreadOptions,
  ThreadApiClient,
} from '../react/thread-hooks';

// Convenience re-exports for common patterns
export type { Thread, User } from '../schema';
