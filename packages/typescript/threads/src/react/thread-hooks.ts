import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
  type QueryKey,
} from '@tanstack/react-query';
import type {
  CreateThreadOptions,
  UpdateThreadOptions,
  ListThreadsOptions,
  ThreadsResponse,
  ApiResponse,
} from '../types';
import type { Thread } from '../schema';

// Query Keys Factory
export const threadQueryKeys = {
  all: ['threads'] as const,
  lists: () => [...threadQueryKeys.all, 'list'] as const,
  list: (options: Partial<ListThreadsOptions> = {}) =>
    [...threadQueryKeys.lists(), options] as const,
  details: () => [...threadQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...threadQueryKeys.details(), id] as const,
} as const;

// API Client Functions
export interface ThreadApiClient {
  baseUrl?: string;
  fetchOptions?: RequestInit;
}

export class DefaultThreadApiClient {
  private baseUrl: string;
  private defaultFetchOptions: RequestInit;

  constructor(config: ThreadApiClient = {}) {
    this.baseUrl = config.baseUrl ?? '/api/threads';
    this.defaultFetchOptions = {
      headers: {
        'Content-Type': 'application/json',
        ...config.fetchOptions?.headers,
      },
      ...config.fetchOptions,
    };
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...this.defaultFetchOptions,
      ...options,
      headers: {
        ...this.defaultFetchOptions.headers,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = (await response.json()) as ApiResponse<never>;
      throw new Error(
        errorData.error?.message ?? `HTTP ${response.status}: ${response.statusText}`,
      );
    }

    const data = (await response.json()) as ApiResponse<T>;

    if (!data.success || !data.data) {
      throw new Error(data.error?.message ?? 'Request failed');
    }

    return data.data;
  }

  async getThreads(options: Partial<ListThreadsOptions> = {}): Promise<ThreadsResponse> {
    const searchParams = new URLSearchParams();

    if (options.limit) searchParams.append('limit', options.limit.toString());
    if (options.offset) searchParams.append('offset', options.offset.toString());
    if (options.orderBy) searchParams.append('orderBy', options.orderBy);
    if (options.orderDirection) searchParams.append('orderDirection', options.orderDirection);
    if (options.search) searchParams.append('search', options.search);

    const query = searchParams.toString();
    const endpoint = `/threads${query ? `?${query}` : ''}`;

    return this.request<ThreadsResponse>(endpoint);
  }

  async getThread(id: string): Promise<Thread> {
    return this.request<Thread>(`/threads/${id}`);
  }

  async createThread(options: CreateThreadOptions): Promise<Thread> {
    return this.request<Thread>('/threads', {
      method: 'POST',
      body: JSON.stringify(options),
    });
  }

  async updateThread(id: string, options: UpdateThreadOptions): Promise<Thread> {
    return this.request<Thread>(`/threads/${id}`, {
      method: 'PUT',
      body: JSON.stringify(options),
    });
  }

  async deleteThread(id: string): Promise<void> {
    await this.request<{ success: boolean }>(`/threads/${id}`, {
      method: 'DELETE',
    });
  }
}

// Default API client instance
let defaultApiClient: DefaultThreadApiClient | null = null;

export function getDefaultApiClient(): DefaultThreadApiClient {
  if (!defaultApiClient) {
    defaultApiClient = new DefaultThreadApiClient();
  }
  return defaultApiClient;
}

export function setDefaultApiClient(client: DefaultThreadApiClient): void {
  defaultApiClient = client;
}

// Hook Interfaces
export interface UseThreadsOptions
  extends Omit<
    UseQueryOptions<ThreadsResponse, Error, ThreadsResponse, QueryKey>,
    'queryKey' | 'queryFn'
  > {
  apiClient?: DefaultThreadApiClient;
  listOptions?: Partial<ListThreadsOptions>;
}

export interface UseThreadOptions
  extends Omit<UseQueryOptions<Thread, Error, Thread, QueryKey>, 'queryKey' | 'queryFn'> {
  apiClient?: DefaultThreadApiClient;
}

export interface UseCreateThreadOptions
  extends Omit<
    UseMutationOptions<
      Thread,
      Error,
      CreateThreadOptions,
      { previousThreads: Array<[QueryKey, ThreadsResponse | undefined]> }
    >,
    'mutationFn'
  > {
  apiClient?: DefaultThreadApiClient;
}

export interface UseUpdateThreadOptions
  extends Omit<
    UseMutationOptions<
      Thread,
      Error,
      { id: string; updates: UpdateThreadOptions },
      { previousThread?: Thread }
    >,
    'mutationFn'
  > {
  apiClient?: DefaultThreadApiClient;
}

export interface UseDeleteThreadOptions
  extends Omit<
    UseMutationOptions<
      void,
      Error,
      string,
      {
        previousThread?: Thread;
        previousThreadsQueries: Array<[QueryKey, ThreadsResponse | undefined]>;
      }
    >,
    'mutationFn'
  > {
  apiClient?: DefaultThreadApiClient;
}

// Query Hooks
export function useThreads(options: UseThreadsOptions = {}) {
  const { apiClient = getDefaultApiClient(), listOptions = {}, ...queryOptions } = options;

  return useQuery({
    queryKey: threadQueryKeys.list(listOptions),
    queryFn: () => apiClient.getThreads(listOptions),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...queryOptions,
  });
}

export function useThread(id: string, options: UseThreadOptions = {}) {
  const { apiClient = getDefaultApiClient(), ...queryOptions } = options;

  return useQuery({
    queryKey: threadQueryKeys.detail(id),
    queryFn: () => apiClient.getThread(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...queryOptions,
  });
}

// Mutation Hooks
export function useCreateThread(options: UseCreateThreadOptions = {}) {
  const { apiClient = getDefaultApiClient(), ...mutationOptions } = options;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (createOptions: CreateThreadOptions) => apiClient.createThread(createOptions),
    onMutate: async (newThread: CreateThreadOptions) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: threadQueryKeys.lists() });

      // Snapshot the previous value
      const previousThreads = queryClient.getQueriesData<ThreadsResponse>({
        queryKey: threadQueryKeys.lists(),
      });

      // Optimistically update to the new value
      queryClient.setQueriesData<ThreadsResponse>({ queryKey: threadQueryKeys.lists() }, (old) => {
        if (!old) return old;

        const optimisticThread: Thread = {
          id: `temp-${Date.now()}`,
          title: newThread.title || 'New Thread',
          userId: 'current-user', // This will be set by the server
          organizationId: undefined,
          tenantId: undefined,
          metadata: newThread.metadata || undefined,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        return {
          ...old,
          threads: [optimisticThread, ...old.threads],
          total: old.total + 1,
        };
      });

      return { previousThreads };
    },
    onError: (err, newThread, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousThreads) {
        context.previousThreads.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSuccess: (data) => {
      // Update the specific thread in cache
      queryClient.setQueryData(threadQueryKeys.detail(data.id), data);

      // Invalidate and refetch threads list to get accurate data
      queryClient.invalidateQueries({ queryKey: threadQueryKeys.lists() });
    },
    ...mutationOptions,
  });
}

export function useUpdateThread(options: UseUpdateThreadOptions = {}) {
  const { apiClient = getDefaultApiClient(), ...mutationOptions } = options;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateThreadOptions }) =>
      apiClient.updateThread(id, updates),
    onMutate: async ({ id, updates }: { id: string; updates: UpdateThreadOptions }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: threadQueryKeys.detail(id) });

      // Snapshot the previous value
      const previousThread = queryClient.getQueryData<Thread>(threadQueryKeys.detail(id));

      // Optimistically update to the new value
      if (previousThread) {
        queryClient.setQueryData<Thread>(threadQueryKeys.detail(id), {
          ...previousThread,
          ...updates,
          updatedAt: new Date(),
        });
      }

      return { previousThread };
    },
    onError: (err, { id }, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousThread) {
        queryClient.setQueryData(threadQueryKeys.detail(id), context.previousThread);
      }
    },
    onSuccess: (data) => {
      // Update the thread in cache
      queryClient.setQueryData(threadQueryKeys.detail(data.id), data);

      // Invalidate and refetch threads list to reflect changes
      queryClient.invalidateQueries({ queryKey: threadQueryKeys.lists() });
    },
    ...mutationOptions,
  });
}

export function useDeleteThread(options: UseDeleteThreadOptions = {}) {
  const { apiClient = getDefaultApiClient(), ...mutationOptions } = options;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.deleteThread(id),
    onMutate: async (id: string) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: threadQueryKeys.detail(id) });
      await queryClient.cancelQueries({ queryKey: threadQueryKeys.lists() });

      // Snapshot the previous values
      const previousThread = queryClient.getQueryData<Thread>(threadQueryKeys.detail(id));
      const previousThreadsQueries = queryClient.getQueriesData<ThreadsResponse>({
        queryKey: threadQueryKeys.lists(),
      });

      // Optimistically remove from cache
      queryClient.removeQueries({ queryKey: threadQueryKeys.detail(id) });

      queryClient.setQueriesData<ThreadsResponse>({ queryKey: threadQueryKeys.lists() }, (old) => {
        if (!old) return old;
        return {
          ...old,
          threads: old.threads.filter((thread) => thread.id !== id),
          total: old.total - 1,
        };
      });

      return { previousThread, previousThreadsQueries };
    },
    onError: (err, id, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousThread) {
        queryClient.setQueryData(threadQueryKeys.detail(id), context.previousThread);
      }
      if (context?.previousThreadsQueries) {
        context.previousThreadsQueries.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSuccess: (_, id) => {
      // Ensure the thread is removed from cache
      queryClient.removeQueries({ queryKey: threadQueryKeys.detail(id) });

      // Invalidate and refetch threads list
      queryClient.invalidateQueries({ queryKey: threadQueryKeys.lists() });
    },
    ...mutationOptions,
  });
}

// Utility hook for infinite queries (useful for pagination)
export function useInfiniteThreads(
  baseOptions: Partial<ListThreadsOptions> = {},
  options: Omit<
    UseQueryOptions<ThreadsResponse, Error, ThreadsResponse, QueryKey>,
    'queryKey' | 'queryFn'
  > & { apiClient?: DefaultThreadApiClient } = {},
) {
  const { apiClient = getDefaultApiClient(), ...queryOptions } = options;

  return useQuery({
    queryKey: threadQueryKeys.list(baseOptions),
    queryFn: ({ pageParam = 0 }) =>
      apiClient.getThreads({
        ...baseOptions,
        offset: pageParam as number,
      }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...queryOptions,
  });
}
