import { describe, it, expect, beforeEach } from 'bun:test';

// Mock chat-core types
const mockAdapter = {
  findMany: () => Promise.resolve([]),
  findOne: () => Promise.resolve(null),
  count: () => Promise.resolve(0),
};

const mockUserContext = {
  userId: 'user-123',
  organizationId: 'org-123',
  tenantId: 'tenant-123',
};

const mockThread = {
  id: 'thread-123',
  title: 'Test Thread',
  userId: 'user-123',
  organizationId: 'org-123',
  tenantId: 'tenant-123',
  metadata: { category: 'test' },
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('ThreadServerClient', () => {
  let client: any;

  beforeEach(async () => {
    const { ThreadServerClient } = await import('../src/server');
    client = new ThreadServerClient({
      adapter: mockAdapter,
      userContext: mockUserContext,
    });
  });

  describe('listThreads', () => {
    it('should list threads with default options', async () => {
      const mockFindMany = () => Promise.resolve([mockThread]);
      const mockCount = () => Promise.resolve(1);

      client.adapter = {
        ...mockAdapter,
        findMany: mockFindMany,
        count: mockCount,
      };

      const result = await client.listThreads();

      expect(result).toEqual({
        threads: [mockThread],
        total: 1,
        hasMore: false,
      });
    });

    it('should list threads with custom options', async () => {
      const mockFindMany = () => Promise.resolve([mockThread]);
      const mockCount = () => Promise.resolve(10);

      client.adapter = {
        ...mockAdapter,
        findMany: mockFindMany,
        count: mockCount,
      };

      const result = await client.listThreads({
        limit: 5,
        offset: 0,
        orderBy: 'createdAt',
        orderDirection: 'asc',
        search: 'test',
      });

      expect(result).toEqual({
        threads: [mockThread],
        total: 10,
        hasMore: true,
      });
    });

    it('should handle user context without organization and tenant', async () => {
      const { ThreadServerClient } = await import('../src/server');
      const clientWithoutOrg = new ThreadServerClient({
        adapter: {
          ...mockAdapter,
          findMany: () => Promise.resolve([]),
          count: () => Promise.resolve(0),
        },
        userContext: {
          userId: 'user-123',
          organizationId: null,
          tenantId: null,
        },
      });

      const result = await clientWithoutOrg.listThreads();

      expect(result).toEqual({
        threads: [],
        total: 0,
        hasMore: false,
      });
    });
  });

  describe('getThread', () => {
    it('should get a thread by ID', async () => {
      client.adapter = {
        ...mockAdapter,
        findOne: () => Promise.resolve(mockThread),
      };

      const result = await client.getThread('thread-123');

      expect(result).toEqual(mockThread);
    });

    it('should return null for non-existent thread', async () => {
      client.adapter = {
        ...mockAdapter,
        findOne: () => Promise.resolve(null),
      };

      const result = await client.getThread('non-existent');

      expect(result).toBeNull();
    });

    it('should respect tenant isolation', async () => {
      let calledWith: any;
      client.adapter = {
        ...mockAdapter,
        findOne: (params: any) => {
          calledWith = params;
          return Promise.resolve(null);
        },
      };

      await client.getThread('thread-123');

      expect(calledWith.where).toContainEqual({ field: 'userId', value: 'user-123' });
      expect(calledWith.where).toContainEqual({ field: 'organizationId', value: 'org-123' });
      expect(calledWith.where).toContainEqual({ field: 'tenantId', value: 'tenant-123' });
    });
  });
});

describe('createThreadServerClient', () => {
  it('should create a ThreadServerClient instance', async () => {
    const { createThreadServerClient, ThreadServerClient } = await import('../src/server');
    const config = {
      adapter: mockAdapter,
      userContext: mockUserContext,
    };

    const client = createThreadServerClient(config);

    expect(client).toBeInstanceOf(ThreadServerClient);
  });
});
