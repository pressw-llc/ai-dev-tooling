import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  threadQueryKeys,
  DefaultThreadApiClient,
  getDefaultApiClient,
  setDefaultApiClient,
  useThreads,
  useThread,
  useCreateThread,
  useUpdateThread,
  useDeleteThread,
  useInfiniteThreads,
} from '../../src/react/thread-hooks';
import {
  createMockThread,
  createMockThreadsResponse,
  createMockFetch,
  testScenarios,
  testThreads,
} from './test-utils';

// Mock fetch globally
const mockFetch = createMockFetch();
global.fetch = mockFetch;

describe('Thread Query Keys', () => {
  describe('threadQueryKeys', () => {
    it('should generate correct query keys', () => {
      expect(threadQueryKeys.all).toEqual(['threads']);
      expect(threadQueryKeys.lists()).toEqual(['threads', 'list']);
      expect(threadQueryKeys.details()).toEqual(['threads', 'detail']);
      expect(threadQueryKeys.detail('thread-123')).toEqual(['threads', 'detail', 'thread-123']);
    });

    it('should generate list query keys with options', () => {
      const options = { limit: 10, search: 'test' };
      expect(threadQueryKeys.list(options)).toEqual(['threads', 'list', options]);
    });

    it('should handle empty options for list query keys', () => {
      expect(threadQueryKeys.list()).toEqual(['threads', 'list', {}]);
      expect(threadQueryKeys.list({})).toEqual(['threads', 'list', {}]);
    });
  });
});

describe('DefaultThreadApiClient', () => {
  let client: DefaultThreadApiClient;

  beforeEach(() => {
    client = new DefaultThreadApiClient();
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create client with default config', () => {
      expect(client).toBeInstanceOf(DefaultThreadApiClient);
    });

    it('should create client with custom config', () => {
      const customClient = new DefaultThreadApiClient({
        baseUrl: '/custom/api',
        fetchOptions: {
          headers: { 'X-Custom': 'header' },
        },
      });

      expect(customClient).toBeInstanceOf(DefaultThreadApiClient);
    });
  });

  describe('getThreads', () => {
    it('should fetch threads with default options', async () => {
      const mockResponse = createMockThreadsResponse();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockResponse }),
      });

      const result = await client.getThreads();

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/threads/threads',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        }),
      );
      expect(result).toEqual(mockResponse);
    });

    it('should fetch threads with query parameters', async () => {
      const mockResponse = createMockThreadsResponse();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockResponse }),
      });

      const options = {
        limit: 10,
        offset: 5,
        orderBy: 'createdAt' as const,
        orderDirection: 'asc' as const,
        search: 'test',
      };

      await client.getThreads(options);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/threads/threads?limit=10&offset=5&orderBy=createdAt&orderDirection=asc&search=test',
        expect.any(Object),
      );
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () =>
          Promise.resolve({
            success: false,
            error: { message: 'Bad request' },
          }),
      });

      await expect(client.getThreads()).rejects.toThrow('Bad request');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(client.getThreads()).rejects.toThrow('Network error');
    });
  });

  describe('getThread', () => {
    const threadId = 'thread-123';

    it('should fetch a single thread', async () => {
      const mockThread = createMockThread({ id: threadId });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockThread }),
      });

      const result = await client.getThread(threadId);

      expect(mockFetch).toHaveBeenCalledWith(
        `/api/threads/threads/${threadId}`,
        expect.any(Object),
      );
      expect(result).toEqual(mockThread);
    });

    it('should handle thread not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () =>
          Promise.resolve({
            success: false,
            error: { message: 'Thread not found' },
          }),
      });

      await expect(client.getThread(threadId)).rejects.toThrow('Thread not found');
    });
  });

  describe('createThread', () => {
    it('should create a thread', async () => {
      const { input, expectedOutput } = testScenarios.createThread;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: expectedOutput }),
      });

      const result = await client.createThread(input);

      expect(mockFetch).toHaveBeenCalledWith('/api/threads/threads', {
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify(input),
      });
      expect(result).toEqual(expectedOutput);
    });
  });

  describe('updateThread', () => {
    const threadId = 'thread-123';

    it('should update a thread', async () => {
      const { input, expectedOutput } = testScenarios.updateThread;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: expectedOutput }),
      });

      const result = await client.updateThread(threadId, input);

      expect(mockFetch).toHaveBeenCalledWith(`/api/threads/threads/${threadId}`, {
        method: 'PUT',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify(input),
      });
      expect(result).toEqual(expectedOutput);
    });
  });

  describe('deleteThread', () => {
    const threadId = 'thread-123';

    it('should delete a thread', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { success: true } }),
      });

      await client.deleteThread(threadId);

      expect(mockFetch).toHaveBeenCalledWith(`/api/threads/threads/${threadId}`, {
        method: 'DELETE',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      });
    });
  });
});

describe('Default API Client Management', () => {
  let originalClient: DefaultThreadApiClient;

  beforeEach(() => {
    originalClient = getDefaultApiClient();
  });

  afterEach(() => {
    setDefaultApiClient(originalClient);
  });

  it('should get default API client', () => {
    const client = getDefaultApiClient();
    expect(client).toBeInstanceOf(DefaultThreadApiClient);
  });

  it('should set custom default API client', () => {
    const customClient = new DefaultThreadApiClient({ baseUrl: '/custom' });
    setDefaultApiClient(customClient);

    const retrievedClient = getDefaultApiClient();
    expect(retrievedClient).toBe(customClient);
  });
});

describe.skip('Thread Hooks', () => {
  let queryClient: QueryClient;
  let wrapper: React.ComponentType<{ children: React.ReactNode }>;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    vi.clearAllMocks();
  });

  describe('useThreads', () => {
    it('should fetch threads successfully', async () => {
      const mockResponse = createMockThreadsResponse(testThreads);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockResponse }),
      });

      const { result } = renderHook(() => useThreads(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith('/api/chat/threads', expect.any(Object));
    });

    it('should fetch threads with custom options', async () => {
      const mockResponse = createMockThreadsResponse([]);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockResponse }),
      });

      const { result } = renderHook(
        () =>
          useThreads({
            listOptions: { limit: 5, search: 'test' },
          }),
        { wrapper },
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/threads/threads?limit=5&search=test',
        expect.any(Object),
      );
    });

    it('should handle fetch errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useThreads(), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeInstanceOf(Error);
    });
  });

  describe('useThread', () => {
    const threadId = 'thread-123';

    it('should fetch a single thread', async () => {
      const mockThread = createMockThread({ id: threadId });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockThread }),
      });

      const { result } = renderHook(() => useThread(threadId), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockThread);
      expect(mockFetch).toHaveBeenCalledWith(
        `/api/threads/threads/${threadId}`,
        expect.any(Object),
      );
    });

    it('should not fetch when threadId is empty', () => {
      const { result } = renderHook(() => useThread(''), { wrapper });

      expect(result.current.isPending).toBe(true);
      expect(result.current.fetchStatus).toBe('idle');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle thread not found', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Thread not found'));

      const { result } = renderHook(() => useThread(threadId), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeInstanceOf(Error);
    });
  });

  describe('useCreateThread', () => {
    it('should create a thread successfully', async () => {
      const { input, expectedOutput } = testScenarios.createThread;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: expectedOutput }),
      });

      const { result } = renderHook(() => useCreateThread(), { wrapper });

      result.current.mutate(input);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(expectedOutput);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/threads/threads',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(input),
        }),
      );
    });

    it('should handle creation errors', async () => {
      const { input } = testScenarios.createThread;
      mockFetch.mockRejectedValueOnce(new Error('Creation failed'));

      const { result } = renderHook(() => useCreateThread(), { wrapper });

      result.current.mutate(input);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeInstanceOf(Error);
    });

    it('should call onSuccess callback', async () => {
      const { input, expectedOutput } = testScenarios.createThread;
      const onSuccess = vi.fn();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: expectedOutput }),
      });

      const { result } = renderHook(() => useCreateThread({ onSuccess }), { wrapper });

      result.current.mutate(input);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(onSuccess).toHaveBeenCalledWith(expectedOutput, input, undefined);
    });
  });

  describe('useUpdateThread', () => {
    const threadId = 'thread-123';

    it('should update a thread successfully', async () => {
      const { input, expectedOutput } = testScenarios.updateThread;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: expectedOutput }),
      });

      const { result } = renderHook(() => useUpdateThread(), { wrapper });

      result.current.mutate({ id: threadId, updates: input });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(expectedOutput);
      expect(mockFetch).toHaveBeenCalledWith(
        `/api/chat/threads/${threadId}`,
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(input),
        }),
      );
    });

    it('should handle update errors', async () => {
      const { input } = testScenarios.updateThread;
      mockFetch.mockRejectedValueOnce(new Error('Update failed'));

      const { result } = renderHook(() => useUpdateThread(), { wrapper });

      result.current.mutate({ id: threadId, updates: input });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeInstanceOf(Error);
    });
  });

  describe('useDeleteThread', () => {
    const threadId = 'thread-123';

    it('should delete a thread successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { success: true } }),
      });

      const { result } = renderHook(() => useDeleteThread(), { wrapper });

      result.current.mutate(threadId);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        `/api/chat/threads/${threadId}`,
        expect.objectContaining({
          method: 'DELETE',
        }),
      );
    });

    it('should handle delete errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Delete failed'));

      const { result } = renderHook(() => useDeleteThread(), { wrapper });

      result.current.mutate(threadId);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeInstanceOf(Error);
    });
  });

  describe('useInfiniteThreads', () => {
    it('should fetch threads for infinite scroll', async () => {
      const mockResponse = createMockThreadsResponse(testThreads.slice(0, 2));
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockResponse }),
      });

      const { result } = renderHook(() => useInfiniteThreads({ limit: 2 }), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith('/api/chat/threads?limit=2', expect.any(Object));
    });

    it('should handle infinite scroll errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Fetch failed'));

      const { result } = renderHook(() => useInfiniteThreads({ limit: 2 }), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeInstanceOf(Error);
    });
  });

  describe('Cache Management', () => {
    it('should invalidate threads list after creating a thread', async () => {
      const { input, expectedOutput } = testScenarios.createThread;

      // Mock the create response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: expectedOutput }),
      });

      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useCreateThread(), { wrapper });

      result.current.mutate(input);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: threadQueryKeys.lists(),
      });
    });

    it('should update thread cache after successful update', async () => {
      const threadId = 'thread-123';
      const { input, expectedOutput } = testScenarios.updateThread;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: expectedOutput }),
      });

      const setQueryDataSpy = vi.spyOn(queryClient, 'setQueryData');

      const { result } = renderHook(() => useUpdateThread(), { wrapper });

      result.current.mutate({ id: threadId, updates: input });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(setQueryDataSpy).toHaveBeenCalledWith(
        threadQueryKeys.detail(threadId),
        expectedOutput,
      );
    });

    it('should remove thread from cache after successful deletion', async () => {
      const threadId = 'thread-123';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { success: true } }),
      });

      const removeQueriesSpy = vi.spyOn(queryClient, 'removeQueries');

      const { result } = renderHook(() => useDeleteThread(), { wrapper });

      result.current.mutate(threadId);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(removeQueriesSpy).toHaveBeenCalledWith({
        queryKey: threadQueryKeys.detail(threadId),
      });
    });
  });
});
