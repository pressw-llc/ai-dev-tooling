import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LangGraphAdapter } from '../src/langgraph-adapter';
import { Client } from '@langchain/langgraph-sdk';

// Mock the LangGraph SDK
vi.mock('@langchain/langgraph-sdk', () => {
  const mockThreadsClient = {
    create: vi.fn(),
    get: vi.fn(),
    search: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  const MockClient = vi.fn().mockImplementation(() => ({
    threads: mockThreadsClient,
  }));

  return { Client: MockClient };
});

describe('LangGraphAdapter', () => {
  let adapter: LangGraphAdapter;
  let mockClient: any;
  let mockThreads: any;

  beforeEach(() => {
    vi.clearAllMocks();

    adapter = new LangGraphAdapter({
      apiUrl: 'https://test.langchain.com',
      apiKey: 'test-key',
      assistantId: 'test-assistant',
    });

    // Get mock instances
    mockClient = (Client as any).mock.results[0].value;
    mockThreads = mockClient.threads;
  });

  describe('create', () => {
    it('should create a thread', async () => {
      const mockThread = {
        thread_id: 'thread-123',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        metadata: {
          userId: 'user-123',
          title: 'Test Thread',
        },
      };

      mockThreads.create.mockResolvedValue(mockThread);

      const result = await adapter.create({
        model: 'thread',
        data: {
          id: 'thread-123',
          title: 'Test Thread',
          userId: 'user-123',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      expect(mockThreads.create).toHaveBeenCalledWith({
        metadata: expect.objectContaining({
          userId: 'user-123',
          title: 'Test Thread',
        }),
        threadId: 'thread-123',
      });

      expect(result).toMatchObject({
        id: 'thread-123',
        title: 'Test Thread',
        userId: 'user-123',
      });
    });

    it('should throw error for unsupported model', async () => {
      await expect(
        adapter.create({
          model: 'unsupported',
          data: {},
        }),
      ).rejects.toThrow('Model unsupported not supported by LangGraphAdapter');
    });
  });

  describe('findOne', () => {
    it('should find a thread by id', async () => {
      const mockThread = {
        thread_id: 'thread-123',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        metadata: {
          userId: 'user-123',
          title: 'Test Thread',
        },
      };

      mockThreads.get.mockResolvedValue(mockThread);

      const result = await adapter.findOne({
        model: 'thread',
        where: [
          { field: 'id', value: 'thread-123' },
          { field: 'userId', value: 'user-123' },
        ],
      });

      expect(mockThreads.get).toHaveBeenCalledWith('thread-123');
      expect(result).toMatchObject({
        id: 'thread-123',
        title: 'Test Thread',
        userId: 'user-123',
      });
    });

    it('should return null if thread not found', async () => {
      mockThreads.get.mockRejectedValue(new Error('Not found'));

      const result = await adapter.findOne({
        model: 'thread',
        where: [{ field: 'id', value: 'non-existent' }],
      });

      expect(result).toBeNull();
    });

    it('should return null if userId does not match', async () => {
      const mockThread = {
        thread_id: 'thread-123',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        metadata: {
          userId: 'user-123',
        },
      };

      mockThreads.get.mockResolvedValue(mockThread);

      const result = await adapter.findOne({
        model: 'thread',
        where: [
          { field: 'id', value: 'thread-123' },
          { field: 'userId', value: 'different-user' },
        ],
      });

      expect(result).toBeNull();
    });

    it('should throw error if id not provided', async () => {
      await expect(
        adapter.findOne({
          model: 'thread',
          where: [{ field: 'userId', value: 'user-123' }],
        }),
      ).rejects.toThrow('Thread ID is required for findOne');
    });
  });

  describe('findMany', () => {
    it('should find threads with filters', async () => {
      const mockThreads = [
        {
          thread_id: 'thread-1',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          metadata: { userId: 'user-123', title: 'Thread 1' },
        },
        {
          thread_id: 'thread-2',
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
          metadata: { userId: 'user-123', title: 'Thread 2' },
        },
      ];

      mockThreads.search.mockResolvedValue(mockThreads);

      const result = await adapter.findMany({
        model: 'thread',
        where: [{ field: 'userId', value: 'user-123' }],
        limit: 10,
        offset: 0,
        sortBy: { field: 'createdAt', direction: 'desc' },
      });

      expect(mockThreads.search).toHaveBeenCalledWith({
        metadata: { userId: 'user-123' },
        limit: 10,
        offset: 0,
        sortBy: 'created_at',
        sortOrder: 'desc',
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: 'thread-1',
        title: 'Thread 1',
        userId: 'user-123',
      });
    });
  });

  describe('update', () => {
    it('should update a thread', async () => {
      const existingThread = {
        thread_id: 'thread-123',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        metadata: {
          userId: 'user-123',
          title: 'Old Title',
        },
      };

      const updatedThread = {
        ...existingThread,
        updated_at: '2024-01-02T00:00:00Z',
        metadata: {
          ...existingThread.metadata,
          title: 'New Title',
        },
      };

      mockThreads.get.mockResolvedValue(existingThread);
      mockThreads.update.mockResolvedValue(updatedThread);

      const result = await adapter.update({
        model: 'thread',
        where: [{ field: 'id', value: 'thread-123' }],
        data: { title: 'New Title' },
      });

      expect(mockThreads.update).toHaveBeenCalledWith('thread-123', {
        metadata: expect.objectContaining({
          title: 'New Title',
          updatedAt: expect.any(String),
        }),
      });

      expect(result).toMatchObject({
        id: 'thread-123',
        title: 'New Title',
      });
    });

    it('should return null if thread not found', async () => {
      mockThreads.get.mockRejectedValue(new Error('Not found'));

      const result = await adapter.update({
        model: 'thread',
        where: [{ field: 'id', value: 'non-existent' }],
        data: { title: 'New Title' },
      });

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete a thread', async () => {
      const mockThread = {
        thread_id: 'thread-123',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        metadata: { userId: 'user-123' },
      };

      mockThreads.get.mockResolvedValue(mockThread);
      mockThreads.delete.mockResolvedValue(undefined);

      await adapter.delete({
        model: 'thread',
        where: [
          { field: 'id', value: 'thread-123' },
          { field: 'userId', value: 'user-123' },
        ],
      });

      expect(mockThreads.delete).toHaveBeenCalledWith('thread-123');
    });

    it('should throw error if thread not found', async () => {
      mockThreads.get.mockRejectedValue(new Error('Not found'));

      await expect(
        adapter.delete({
          model: 'thread',
          where: [{ field: 'id', value: 'non-existent' }],
        }),
      ).rejects.toThrow('Thread not found or access denied');
    });
  });

  describe('count', () => {
    it('should count threads', async () => {
      const mockThreadsList = Array(5)
        .fill(null)
        .map((_, i) => ({
          thread_id: `thread-${i}`,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          metadata: { userId: 'user-123' },
        }));

      mockThreads.search.mockResolvedValue(mockThreadsList);

      const count = await adapter.count({
        model: 'thread',
        where: [{ field: 'userId', value: 'user-123' }],
      });

      expect(count).toBe(5);
    });
  });

  describe('getSchema', () => {
    it('should return thread schema', () => {
      const schema = adapter.getSchema('thread');

      expect(schema).toMatchObject({
        id: 'string',
        title: 'string?',
        userId: 'string',
      });
    });

    it('should return undefined for unknown model', () => {
      const schema = adapter.getSchema('unknown');
      expect(schema).toBeUndefined();
    });
  });
});
