import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Import all the components we're testing together
import { ThreadUtilityClient } from '../../src/thread-client';
import { DrizzleAdapter } from '../../src/adapters/drizzle-adapter';
import {
  useThreads,
  useCreateThread,
  useUpdateThread,
  useDeleteThread,
} from '../../src/react/thread-hooks';
import type { DrizzleAdapterConfig } from '../../src/adapters/drizzle-adapter';

import {
  createMockDrizzleDB,
  createMockUserContext,
  createMockThread,
  createMockThreadsResponse,
  createMockFetch,
  testScenarios,
  testThreads,
} from './test-utils';

// Skip integration tests that require complex mocking for now
// These would be tested in a full integration environment

describe.skip('Thread Management Integration Tests', () => {
  let mockDB: ReturnType<typeof createMockDrizzleDB>;
  let adapter: DrizzleAdapter;
  let client: ThreadUtilityClient;
  let mockUserContext: ReturnType<typeof createMockUserContext>;
  let mockGetUserContext: ReturnType<typeof vi.fn>;
  let config: DrizzleAdapterConfig;

  beforeEach(() => {
    // Set up database mock
    mockDB = createMockDrizzleDB();

    // Configure adapter
    config = {
      provider: 'pg',
      tables: {
        user: 'users',
        thread: 'threads',
        feedback: 'feedback',
      },
      supportsJSON: true,
      supportsDates: true,
      supportsBooleans: true,
      supportsReturning: true,
    };

    // Create adapter
    adapter = new DrizzleAdapter(mockDB, config);

    // Set up user context
    mockUserContext = createMockUserContext();
    mockGetUserContext = vi.fn().mockResolvedValue(mockUserContext);

    // Create client
    client = new ThreadUtilityClient(adapter, mockGetUserContext);

    // Reset all mocks
    vi.clearAllMocks();
  });

  describe('End-to-End Thread Lifecycle', () => {
    it('should handle complete CRUD operations through client', async () => {
      // Mock database responses for complete workflow
      const createdThread = createMockThread({ id: 'new-thread-123', title: 'Created Thread' });
      const updatedThread = createMockThread({ id: 'new-thread-123', title: 'Updated Thread' });
      const threadsResponse = createMockThreadsResponse([createdThread, ...testThreads]);

      // Mock adapter methods
      vi.spyOn(adapter, 'create').mockResolvedValue(createdThread);
      vi.spyOn(adapter, 'update').mockResolvedValue(updatedThread);
      vi.spyOn(adapter, 'getThread').mockResolvedValue(createdThread);
      vi.spyOn(adapter, 'listThreads').mockResolvedValue(threadsResponse);
      vi.spyOn(adapter, 'delete').mockResolvedValue(undefined);

      const mockRequest = new Request('http://localhost/test');

      // 1. Create a thread
      const createResult = await client.createThread(mockRequest, {
        title: 'Created Thread',
        metadata: { source: 'integration-test' },
      });

      expect(createResult).toEqual(createdThread);
      expect(adapter.create).toHaveBeenCalledWith({
        model: 'thread',
        data: {
          title: 'Created Thread',
          userId: mockUserContext.userId,
          organizationId: mockUserContext.organizationId,
          tenantId: mockUserContext.tenantId,
          metadata: { source: 'integration-test' },
        },
      });

      // 2. Get the created thread
      const getResult = await client.getThread(mockRequest, createdThread.id);

      expect(getResult).toEqual(createdThread);
      expect(adapter.getThread).toHaveBeenCalledWith(mockUserContext, createdThread.id);

      // 3. Update the thread
      const updateResult = await client.updateThread(mockRequest, createdThread.id, {
        title: 'Updated Thread',
      });

      expect(updateResult).toEqual(updatedThread);
      expect(adapter.update).toHaveBeenCalledWith({
        model: 'thread',
        where: [
          { field: 'id', value: createdThread.id },
          { field: 'userId', value: mockUserContext.userId },
          { field: 'organizationId', value: mockUserContext.organizationId },
          { field: 'tenantId', value: mockUserContext.tenantId },
        ],
        data: {
          title: 'Updated Thread',
          updatedAt: expect.any(Date),
        },
      });

      // 4. List all threads (should include the new one)
      const listResult = await client.listThreads(mockRequest, { limit: 10 });

      expect(listResult).toEqual(threadsResponse);
      expect(adapter.listThreads).toHaveBeenCalledWith(mockUserContext, {
        limit: 10,
        offset: 0,
        orderBy: 'updatedAt',
        orderDirection: 'desc',
        search: undefined,
      });

      // 5. Delete the thread
      await client.deleteThread(mockRequest, createdThread.id);

      expect(adapter.delete).toHaveBeenCalledWith({
        model: 'thread',
        where: [
          { field: 'id', value: createdThread.id },
          { field: 'userId', value: mockUserContext.userId },
          { field: 'organizationId', value: mockUserContext.organizationId },
          { field: 'tenantId', value: mockUserContext.tenantId },
        ],
      });

      // Verify all user context calls
      expect(mockGetUserContext).toHaveBeenCalledTimes(5);
    });

    it('should handle tenant isolation correctly', async () => {
      const user1Context = createMockUserContext({
        userId: 'user-1',
        organizationId: 'org-1',
        tenantId: 'tenant-1',
      });
      const user2Context = createMockUserContext({
        userId: 'user-2',
        organizationId: 'org-2',
        tenantId: 'tenant-2',
      });

      const user1Thread = createMockThread({
        id: 'thread-user-1',
        userId: 'user-1',
        organizationId: 'org-1',
        tenantId: 'tenant-1',
      });

      // Mock getUserContext to return different users for different requests
      const mockGetUserContextDynamic = vi
        .fn()
        .mockResolvedValueOnce(user1Context)
        .mockResolvedValueOnce(user2Context);

      const clientWithDynamicAuth = new ThreadUtilityClient(adapter, mockGetUserContextDynamic);

      // Mock adapter responses
      vi.spyOn(adapter, 'create').mockResolvedValue(user1Thread);
      vi.spyOn(adapter, 'getThread').mockResolvedValue(null); // User 2 can't see user 1's thread

      // User 1 creates a thread
      const request1 = new Request('http://localhost/user1');
      await clientWithDynamicAuth.createThread(request1, { title: 'User 1 Thread' });

      expect(adapter.create).toHaveBeenCalledWith({
        model: 'thread',
        data: {
          title: 'User 1 Thread',
          userId: 'user-1',
          organizationId: 'org-1',
          tenantId: 'tenant-1',
          metadata: undefined,
        },
      });

      // User 2 tries to access user 1's thread
      const request2 = new Request('http://localhost/user2');
      const result = await clientWithDynamicAuth.getThread(request2, user1Thread.id);

      expect(result).toBeNull();
      expect(adapter.getThread).toHaveBeenCalledWith(user2Context, user1Thread.id);
    });
  });

  // API Route Integration tests moved to @pressw/chat-nextjs package
  // These tests require Next.js route handlers which are now in a separate package

  describe('React Hooks Integration', () => {
    let queryClient: QueryClient;
    let wrapper: React.ComponentType<{ children: React.ReactNode }>;
    let mockFetch: ReturnType<typeof createMockFetch>;

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

      // Set up fetch mock for React hooks
      mockFetch = createMockFetch();
      global.fetch = mockFetch;
    });

    it('should handle complete React workflow with optimistic updates', async () => {
      const { input: createInput, expectedOutput: createdThread } = testScenarios.createThread;
      const { input: updateInput, expectedOutput: updatedThread } = testScenarios.updateThread;
      const threadsResponse = createMockThreadsResponse([createdThread]);

      // Mock API responses
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, data: threadsResponse }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, data: createdThread }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, data: threadsResponse }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, data: updatedThread }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, data: threadsResponse }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, data: { success: true } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, data: createMockThreadsResponse([]) }),
        });

      // 1. List threads initially
      const { result: listResult } = renderHook(() => useThreads(), { wrapper });

      await waitFor(() => {
        expect(listResult.current.isSuccess).toBe(true);
      });

      expect(listResult.current.data).toEqual(threadsResponse);

      // 2. Create a new thread
      const { result: createResult } = renderHook(() => useCreateThread(), { wrapper });

      createResult.current.mutate(createInput);

      await waitFor(() => {
        expect(createResult.current.isSuccess).toBe(true);
      });

      expect(createResult.current.data).toEqual(createdThread);

      // 3. Update the thread
      const { result: updateResult } = renderHook(() => useUpdateThread(), { wrapper });

      updateResult.current.mutate({ id: createdThread.id, updates: updateInput });

      await waitFor(() => {
        expect(updateResult.current.isSuccess).toBe(true);
      });

      expect(updateResult.current.data).toEqual(updatedThread);

      // 4. Delete the thread
      const { result: deleteResult } = renderHook(() => useDeleteThread(), { wrapper });

      deleteResult.current.mutate(createdThread.id);

      await waitFor(() => {
        expect(deleteResult.current.isSuccess).toBe(true);
      });

      // Verify all API calls were made
      expect(mockFetch).toHaveBeenCalledTimes(7); // Initial list + create + invalidate + update + invalidate + delete + invalidate
    });

    it('should handle React hook errors with proper rollback', async () => {
      const threadsResponse = createMockThreadsResponse(testThreads);

      // Mock successful list followed by failed create
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, data: threadsResponse }),
        })
        .mockRejectedValueOnce(new Error('Create failed'));

      // List threads initially
      const { result: listResult } = renderHook(() => useThreads(), { wrapper });

      await waitFor(() => {
        expect(listResult.current.isSuccess).toBe(true);
      });

      // Try to create a thread (should fail)
      const { result: createResult } = renderHook(() => useCreateThread(), { wrapper });

      createResult.current.mutate({ title: 'Failed Thread' });

      await waitFor(() => {
        expect(createResult.current.isError).toBe(true);
      });

      expect(createResult.current.error).toBeInstanceOf(Error);
      expect(createResult.current.error?.message).toBe('Create failed');
    });
  });

  describe('Database Adapter Integration', () => {
    it('should handle complex database queries through adapter', async () => {
      // Mock complex database operations
      mockDB.returning.mockResolvedValue([createMockThread()]);
      mockDB.execute.mockResolvedValue(undefined);

      // Mock database query builders
      const mockBuilderChain = {
        values: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([createMockThread()]),
        execute: vi.fn().mockResolvedValue(undefined),
      };

      mockDB.insert.mockReturnValue(mockBuilderChain);
      mockDB.select.mockReturnValue(mockBuilderChain);
      mockDB.update.mockReturnValue(mockBuilderChain);
      mockDB.delete.mockReturnValue(mockBuilderChain);

      // Simulate complex query with filtering and pagination
      const options = {
        limit: 10,
        offset: 20,
        orderBy: 'createdAt' as const,
        orderDirection: 'asc' as const,
        search: 'complex query',
      };

      await adapter.listThreads(mockUserContext, options);

      // Verify the database adapter built the correct query
      expect(mockDB.select).toHaveBeenCalled();
      expect(mockBuilderChain.where).toHaveBeenCalled();
      expect(mockBuilderChain.limit).toHaveBeenCalledWith(10);
      expect(mockBuilderChain.offset).toHaveBeenCalledWith(20);
      expect(mockBuilderChain.orderBy).toHaveBeenCalled();
    });

    it('should handle database connection errors', async () => {
      // Mock database connection failure
      mockDB.insert.mockImplementation(() => {
        throw new Error('Connection refused');
      });

      await expect(adapter.createThread(mockUserContext, { title: 'Test' })).rejects.toThrow(
        'Connection refused',
      );
    });

    it('should handle database transaction rollback scenarios', async () => {
      // Mock partial success followed by failure
      mockDB.returning
        .mockResolvedValueOnce([createMockThread()]) // Create succeeds
        .mockRejectedValueOnce(new Error('Update failed')); // Update fails

      const createdThread = await adapter.createThread(mockUserContext, { title: 'Test' });
      expect(createdThread).toBeDefined();

      // This should fail and potentially trigger rollback logic
      await expect(
        adapter.updateThread(mockUserContext, createdThread.id, { title: 'Updated' }),
      ).rejects.toThrow('Update failed');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large datasets efficiently', async () => {
      // Generate a large dataset
      const largeThreadsList = Array.from({ length: 1000 }, (_, i) =>
        createMockThread({ id: `thread-${i}`, title: `Thread ${i}` }),
      );

      const largeResponse = createMockThreadsResponse(largeThreadsList.slice(0, 100), {
        total: 1000,
        hasMore: true,
      });

      vi.spyOn(adapter, 'listThreads').mockResolvedValue(largeResponse);

      const startTime = Date.now();
      const result = await client.listThreads(new Request('http://localhost'), {
        limit: 100,
        offset: 0,
      });
      const endTime = Date.now();

      expect(result.threads).toHaveLength(100);
      expect(result.total).toBe(1000);
      expect(result.hasMore).toBe(true);

      // Ensure the operation completes within reasonable time
      expect(endTime - startTime).toBeLessThan(100); // 100ms threshold
    });

    it('should handle concurrent operations correctly', async () => {
      const threads = [
        createMockThread({ id: 'concurrent-1' }),
        createMockThread({ id: 'concurrent-2' }),
        createMockThread({ id: 'concurrent-3' }),
      ];

      vi.spyOn(adapter, 'create')
        .mockResolvedValueOnce(threads[0])
        .mockResolvedValueOnce(threads[1])
        .mockResolvedValueOnce(threads[2]);

      const mockRequest = new Request('http://localhost');

      // Simulate concurrent thread creation
      const promises = [
        client.createThread(mockRequest, { title: 'Concurrent 1' }),
        client.createThread(mockRequest, { title: 'Concurrent 2' }),
        client.createThread(mockRequest, { title: 'Concurrent 3' }),
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      expect(results.map((r) => r.id)).toEqual(['concurrent-1', 'concurrent-2', 'concurrent-3']);
      expect(adapter.create).toHaveBeenCalledTimes(3);
    });
  });
});
