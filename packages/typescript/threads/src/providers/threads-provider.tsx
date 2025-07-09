import React, { createContext, useContext, useMemo, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ChatCoreAdapter } from '../adapters/types';
import type { GetUserContextFn } from '../types';
import { DefaultThreadApiClient, setDefaultApiClient } from '../react/thread-hooks';

export interface ThreadsProviderConfig {
  adapter: ChatCoreAdapter;
  getUserContext: GetUserContextFn;
  apiBaseUrl?: string;
  queryClient?: QueryClient;
}

export interface ThreadsProviderProps {
  config: ThreadsProviderConfig;
  children: ReactNode;
}

interface ThreadsContextValue {
  adapter: ChatCoreAdapter;
  getUserContext: GetUserContextFn;
  apiClient: DefaultThreadApiClient;
}

const ThreadsContext = createContext<ThreadsContextValue | null>(null);

export const useThreadsContext = (): ThreadsContextValue => {
  const context = useContext(ThreadsContext);
  if (!context) {
    throw new Error('useThreadsContext must be used within ThreadsProvider');
  }
  return context;
};

/**
 * ThreadsProvider - The main provider component for thread management
 *
 * This provider sets up the thread management system and makes it available
 * to all child components. It handles:
 * - Database adapter configuration
 * - User context management
 * - React Query client setup
 * - API client configuration
 *
 * @example
 * ```tsx
 * import { ThreadsProvider, createDrizzleAdapter } from '@pressw/threads';
 *
 * function App() {
 *   const adapter = createDrizzleAdapter(db, 'pg');
 *
 *   return (
 *     <ThreadsProvider
 *       config={{
 *         adapter,
 *         getUserContext: async (req) => ({
 *           userId: req.headers.get('x-user-id') || 'anonymous',
 *         }),
 *       }}
 *     >
 *       <YourApp />
 *     </ThreadsProvider>
 *   );
 * }
 * ```
 */
export const ThreadsProvider: React.FC<ThreadsProviderProps> = ({ config, children }) => {
  const { adapter, getUserContext, apiBaseUrl, queryClient: providedQueryClient } = config;

  // Create or use provided query client
  const queryClient = useMemo(() => {
    return (
      providedQueryClient ||
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            gcTime: 10 * 60 * 1000, // 10 minutes
          },
        },
      })
    );
  }, [providedQueryClient]);

  // Create API client
  const apiClient = useMemo(() => {
    const client = new DefaultThreadApiClient({
      baseUrl: apiBaseUrl || '/api/threads',
    });
    setDefaultApiClient(client);
    return client;
  }, [apiBaseUrl]);

  // Context value
  const contextValue = useMemo<ThreadsContextValue>(
    () => ({
      adapter,
      getUserContext,
      apiClient,
    }),
    [adapter, getUserContext, apiClient],
  );

  return (
    <ThreadsContext.Provider value={contextValue}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ThreadsContext.Provider>
  );
};

export default ThreadsProvider;
