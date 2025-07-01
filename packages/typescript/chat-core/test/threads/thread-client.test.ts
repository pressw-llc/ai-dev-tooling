import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ThreadUtilityClient, createThreadUtilityClient } from '../../src/thread-client';
import {
  createMockChatCoreAdapter,
  createMockUserContext,
  createMockGetUserContext,
  createMockRequest,
  createMockThread,
  createMockThreadsResponse,
  testScenarios,
  errorScenarios,
} from './test-utils';

describe('ThreadUtilityClient', () => {
  let client: ThreadUtilityClient;
  let mockAdapter: ReturnType<typeof createMockChatCoreAdapter>;
  let mockGetUserContext: ReturnType<typeof createMockGetUserContext>;
  let mockUserContext: ReturnType<typeof createMockUserContext>;
  let mockRequest: Request;

  beforeEach(() => {
    mockAdapter = createMockChatCoreAdapter();
    mockUserContext = createMockUserContext();
    mockGetUserContext = createMockGetUserContext(mockUserContext);
    mockRequest = createMockRequest();

    client = new ThreadUtilityClient(mockAdapter, mockGetUserContext);
  });

  describe('constructor', () => {
    it('should create a client instance', () => {
      expect(client).toBeInstanceOf(ThreadUtilityClient);
    });
  });

  describe('createThread', () => {
    it('should create a thread with valid options', async () => {
      const { input, expectedOutput } = testScenarios.createThread;
      vi.spyOn(mockAdapter, 'create').mockResolvedValue(expectedOutput);

      const result = await client.createThread(mockRequest, input);

      expect(mockGetUserContext).toHaveBeenCalledWith(mockRequest);
      expect(mockAdapter.create).toHaveBeenCalledWith({
        model: 'thread',
        data: {
          title: input.title,
          userId: mockUserContext.userId,
          organizationId: mockUserContext.organizationId,
          tenantId: mockUserContext.tenantId,
          metadata: input.metadata,
        },
      });
      expect(result).toEqual(expectedOutput);
    });

    it('should create a thread with empty options', async () => {
      const emptyThread = createMockThread({ title: undefined, metadata: undefined });
      vi.spyOn(mockAdapter, 'create').mockResolvedValue(emptyThread);

      const result = await client.createThread(mockRequest, {});

      expect(mockAdapter.create).toHaveBeenCalledWith({
        model: 'thread',
        data: {
          title: undefined,
          userId: mockUserContext.userId,
          organizationId: mockUserContext.organizationId,
          tenantId: mockUserContext.tenantId,
          metadata: undefined,
        },
      });
      expect(result).toEqual(emptyThread);
    });

    it('should create a thread with default options when no options provided', async () => {
      const defaultThread = createMockThread({ title: undefined, metadata: undefined });
      vi.spyOn(mockAdapter, 'create').mockResolvedValue(defaultThread);

      const result = await client.createThread(mockRequest);

      expect(mockAdapter.create).toHaveBeenCalledWith({
        model: 'thread',
        data: {
          title: undefined,
          userId: mockUserContext.userId,
          organizationId: mockUserContext.organizationId,
          tenantId: mockUserContext.tenantId,
          metadata: undefined,
        },
      });
      expect(result).toEqual(defaultThread);
    });

    it('should propagate adapter errors', async () => {
      vi.spyOn(mockAdapter, 'create').mockRejectedValue(errorScenarios.databaseError);

      await expect(
        client.createThread(mockRequest, testScenarios.createThread.input),
      ).rejects.toThrow('Database connection failed');
    });

    it('should propagate authentication errors', async () => {
      mockGetUserContext.mockRejectedValue(errorScenarios.unauthorized);

      await expect(
        client.createThread(mockRequest, testScenarios.createThread.input),
      ).rejects.toThrow('Unauthorized');
    });
  });

  describe('updateThread', () => {
    const threadId = 'thread-123';

    it('should update a thread with valid options', async () => {
      const { input, expectedOutput } = testScenarios.updateThread;
      vi.spyOn(mockAdapter, 'update').mockResolvedValue(expectedOutput);

      const result = await client.updateThread(mockRequest, threadId, input);

      expect(mockGetUserContext).toHaveBeenCalledWith(mockRequest);
      expect(mockAdapter.update).toHaveBeenCalledWith({
        model: 'thread',
        where: [
          { field: 'id', value: threadId },
          { field: 'userId', value: mockUserContext.userId },
          { field: 'organizationId', value: mockUserContext.organizationId },
          { field: 'tenantId', value: mockUserContext.tenantId },
        ],
        data: expect.objectContaining({
          ...input,
          updatedAt: expect.any(Date),
        }),
      });
      expect(result).toEqual(expectedOutput);
    });

    it('should throw error when threadId is empty', async () => {
      await expect(
        client.updateThread(mockRequest, '', testScenarios.updateThread.input),
      ).rejects.toThrow('Thread ID is required');

      expect(mockAdapter.update).not.toHaveBeenCalled();
    });

    it('should throw error when threadId is not provided', async () => {
      await expect(
        client.updateThread(mockRequest, undefined as any, testScenarios.updateThread.input),
      ).rejects.toThrow('Thread ID is required');

      expect(mockAdapter.update).not.toHaveBeenCalled();
    });

    it('should propagate adapter errors', async () => {
      vi.spyOn(mockAdapter, 'update').mockResolvedValue(null);

      await expect(
        client.updateThread(mockRequest, threadId, testScenarios.updateThread.input),
      ).rejects.toThrow('Thread not found or access denied');
    });
  });

  describe('getThread', () => {
    const threadId = 'thread-123';

    it('should get a thread that exists', async () => {
      const expectedThread = createMockThread({ id: threadId });
      vi.spyOn(mockAdapter, 'findOne').mockResolvedValue(expectedThread);

      const result = await client.getThread(mockRequest, threadId);

      expect(mockGetUserContext).toHaveBeenCalledWith(mockRequest);
      expect(mockAdapter.findOne).toHaveBeenCalledWith({
        model: 'thread',
        where: [
          { field: 'id', value: threadId },
          { field: 'userId', value: mockUserContext.userId },
          { field: 'organizationId', value: mockUserContext.organizationId },
          { field: 'tenantId', value: mockUserContext.tenantId },
        ],
      });
      expect(result).toEqual(expectedThread);
    });

    it('should return null for non-existent thread', async () => {
      vi.spyOn(mockAdapter, 'findOne').mockResolvedValue(null);

      const result = await client.getThread(mockRequest, threadId);

      expect(mockAdapter.findOne).toHaveBeenCalledWith({
        model: 'thread',
        where: [
          { field: 'id', value: threadId },
          { field: 'userId', value: mockUserContext.userId },
          { field: 'organizationId', value: mockUserContext.organizationId },
          { field: 'tenantId', value: mockUserContext.tenantId },
        ],
      });
      expect(result).toBeNull();
    });

    it('should throw error when threadId is empty', async () => {
      await expect(client.getThread(mockRequest, '')).rejects.toThrow('Thread ID is required');

      expect(mockAdapter.findOne).not.toHaveBeenCalled();
    });

    it('should throw error when threadId is not provided', async () => {
      await expect(client.getThread(mockRequest, undefined as any)).rejects.toThrow(
        'Thread ID is required',
      );

      expect(mockAdapter.findOne).not.toHaveBeenCalled();
    });

    it('should propagate adapter errors', async () => {
      vi.spyOn(mockAdapter, 'findOne').mockRejectedValue(errorScenarios.databaseError);

      await expect(client.getThread(mockRequest, threadId)).rejects.toThrow(
        'Database connection failed',
      );
    });
  });

  describe('listThreads', () => {
    it('should list threads with default options', async () => {
      const { expectedOutput } = testScenarios.listThreads;
      vi.spyOn(mockAdapter, 'findMany').mockResolvedValue(expectedOutput.threads);
      vi.spyOn(mockAdapter, 'count').mockResolvedValue(expectedOutput.total);

      const result = await client.listThreads(mockRequest);

      expect(mockGetUserContext).toHaveBeenCalledWith(mockRequest);
      expect(mockAdapter.findMany).toHaveBeenCalledWith({
        model: 'thread',
        where: [
          { field: 'userId', value: mockUserContext.userId },
          { field: 'organizationId', value: mockUserContext.organizationId },
          { field: 'tenantId', value: mockUserContext.tenantId },
        ],
        limit: 20,
        offset: 0,
        sortBy: {
          field: 'updatedAt',
          direction: 'desc',
        },
      });
      expect(mockAdapter.count).toHaveBeenCalledWith({
        model: 'thread',
        where: [
          { field: 'userId', value: mockUserContext.userId },
          { field: 'organizationId', value: mockUserContext.organizationId },
          { field: 'tenantId', value: mockUserContext.tenantId },
        ],
      });
      expect(result).toEqual(expectedOutput);
    });

    it('should list threads with custom options', async () => {
      const customOptions = {
        limit: 5,
        offset: 10,
        orderBy: 'createdAt' as const,
        orderDirection: 'asc' as const,
        search: 'test',
      };
      const expectedOutput = createMockThreadsResponse([], { total: 0, hasMore: false });
      vi.spyOn(mockAdapter, 'findMany').mockResolvedValue(expectedOutput.threads);
      vi.spyOn(mockAdapter, 'count').mockResolvedValue(expectedOutput.total);

      const result = await client.listThreads(mockRequest, customOptions);

      expect(mockAdapter.findMany).toHaveBeenCalledWith({
        model: 'thread',
        where: [
          { field: 'userId', value: mockUserContext.userId },
          { field: 'organizationId', value: mockUserContext.organizationId },
          { field: 'tenantId', value: mockUserContext.tenantId },
          { field: 'title', value: 'test', operator: 'contains', connector: 'AND' },
        ],
        limit: 5,
        offset: 10,
        sortBy: {
          field: 'createdAt',
          direction: 'asc',
        },
      });
      expect(result).toEqual(expectedOutput);
    });

    it('should merge partial options with defaults', async () => {
      const partialOptions = { limit: 15, search: 'partial' };
      const expectedOutput = createMockThreadsResponse();
      vi.spyOn(mockAdapter, 'findMany').mockResolvedValue(expectedOutput.threads);
      vi.spyOn(mockAdapter, 'count').mockResolvedValue(expectedOutput.total);

      const result = await client.listThreads(mockRequest, partialOptions);

      expect(mockAdapter.findMany).toHaveBeenCalledWith({
        model: 'thread',
        where: [
          { field: 'userId', value: mockUserContext.userId },
          { field: 'organizationId', value: mockUserContext.organizationId },
          { field: 'tenantId', value: mockUserContext.tenantId },
          { field: 'title', value: 'partial', operator: 'contains', connector: 'AND' },
        ],
        limit: 15,
        offset: 0,
        sortBy: {
          field: 'updatedAt',
          direction: 'desc',
        },
      });
      expect(result).toEqual(expectedOutput);
    });

    it('should propagate adapter errors', async () => {
      vi.spyOn(mockAdapter, 'findMany').mockRejectedValue(errorScenarios.databaseError);

      await expect(client.listThreads(mockRequest)).rejects.toThrow('Database connection failed');
    });
  });

  describe('deleteThread', () => {
    const threadId = 'thread-123';

    it('should delete a thread successfully', async () => {
      vi.spyOn(mockAdapter, 'delete').mockResolvedValue(undefined);

      await client.deleteThread(mockRequest, threadId);

      expect(mockGetUserContext).toHaveBeenCalledWith(mockRequest);
      expect(mockAdapter.delete).toHaveBeenCalledWith({
        model: 'thread',
        where: [
          { field: 'id', value: threadId },
          { field: 'userId', value: mockUserContext.userId },
          { field: 'organizationId', value: mockUserContext.organizationId },
          { field: 'tenantId', value: mockUserContext.tenantId },
        ],
      });
    });

    it('should throw error when threadId is empty', async () => {
      await expect(client.deleteThread(mockRequest, '')).rejects.toThrow('Thread ID is required');

      expect(mockAdapter.delete).not.toHaveBeenCalled();
    });

    it('should throw error when threadId is not provided', async () => {
      await expect(client.deleteThread(mockRequest, undefined as any)).rejects.toThrow(
        'Thread ID is required',
      );

      expect(mockAdapter.delete).not.toHaveBeenCalled();
    });

    it('should propagate adapter errors', async () => {
      vi.spyOn(mockAdapter, 'delete').mockRejectedValue(errorScenarios.notFound);

      await expect(client.deleteThread(mockRequest, threadId)).rejects.toThrow('Thread not found');
    });
  });

  describe('withUserContext', () => {
    it('should handle getUserContext errors gracefully', async () => {
      mockGetUserContext.mockRejectedValue(errorScenarios.unauthorized);

      await expect(client.createThread(mockRequest, {})).rejects.toThrow('Unauthorized');

      expect(mockAdapter.create).not.toHaveBeenCalled();
    });

    it('should pass through the correct user context', async () => {
      const customUserContext = createMockUserContext({
        userId: 'custom-user',
        organizationId: 'custom-org',
        tenantId: 'custom-tenant',
      });
      mockGetUserContext.mockResolvedValue(customUserContext);
      vi.spyOn(mockAdapter, 'create').mockResolvedValue(createMockThread());

      await client.createThread(mockRequest, {});

      expect(mockAdapter.create).toHaveBeenCalledWith({
        model: 'thread',
        data: {
          title: undefined,
          userId: customUserContext.userId,
          organizationId: customUserContext.organizationId,
          tenantId: customUserContext.tenantId,
          metadata: undefined,
        },
      });
    });
  });
});

describe('createThreadUtilityClient', () => {
  it('should create a client instance with factory function', () => {
    const mockAdapter = createMockChatCoreAdapter();
    const mockGetUserContext = createMockGetUserContext();

    const client = createThreadUtilityClient({
      adapter: mockAdapter,
      getUserContext: mockGetUserContext,
    });

    expect(client).toBeInstanceOf(ThreadUtilityClient);
  });

  it('should create a client with the provided configuration', () => {
    const mockAdapter = createMockChatCoreAdapter();
    const mockGetUserContext = createMockGetUserContext();

    const client = createThreadUtilityClient({
      adapter: mockAdapter,
      getUserContext: mockGetUserContext,
    });

    // Verify the client was created with the right configuration by testing a method
    expect(client.createThread).toBeDefined();
    expect(client.listThreads).toBeDefined();
    expect(client.getThread).toBeDefined();
    expect(client.updateThread).toBeDefined();
    expect(client.deleteThread).toBeDefined();
  });
});
