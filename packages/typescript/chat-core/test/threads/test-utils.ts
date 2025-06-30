import { vi, expect } from 'vitest';
import type {
  UserContext,
  CreateThreadOptions,
  UpdateThreadOptions,
  ListThreadsOptions,
  ThreadsResponse,
} from '../../src/types';
import type { ChatCoreAdapter } from '../../src/adapters/types';
import type { Thread } from '../../src/schema';

// Mock data factories
export const createMockUserContext = (overrides: Partial<UserContext> = {}): UserContext => ({
  userId: 'user-123',
  organizationId: 'org-456',
  tenantId: 'tenant-789',
  ...overrides,
});

export const createMockThread = (overrides: Partial<Thread> = {}): Thread => ({
  id: 'thread-123',
  title: 'Test Thread',
  userId: 'user-123',
  organizationId: 'org-456',
  tenantId: 'tenant-789',
  metadata: { source: 'test' },
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  ...overrides,
});

export const createMockThreadsResponse = (
  threads: Thread[] = [createMockThread()],
  overrides: Partial<ThreadsResponse> = {},
): ThreadsResponse => ({
  threads,
  total: threads.length,
  hasMore: false,
  ...overrides,
});

// Mock ChatCoreAdapter
export const createMockChatCoreAdapter = (): ChatCoreAdapter => ({
  create: vi.fn(),
  findOne: vi.fn(),
  findMany: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  count: vi.fn(),
  getSchema: vi.fn(),
  config: {
    usePlural: false,
    debugLogs: false,
    supportsJSON: true,
    supportsDates: true,
    supportsBooleans: true,
    supportsReturning: true,
    disableIdGeneration: false,
  },
});

// Mock Request object
export const createMockRequest = (
  options: {
    method?: string;
    url?: string;
    headers?: Record<string, string>;
    body?: any;
  } = {},
): Request => {
  const { method = 'GET', url = 'http://localhost/api/chat/threads', headers = {}, body } = options;

  return new Request(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
};

// Mock getUserContext function
export const createMockGetUserContext = (userContext: UserContext = createMockUserContext()) =>
  vi.fn().mockResolvedValue(userContext);

// Test data sets
export const testThreads: Thread[] = [
  createMockThread({
    id: 'thread-1',
    title: 'First Thread',
    createdAt: new Date('2024-01-01T00:00:00Z'),
  }),
  createMockThread({
    id: 'thread-2',
    title: 'Second Thread',
    createdAt: new Date('2024-01-02T00:00:00Z'),
  }),
  createMockThread({
    id: 'thread-3',
    title: 'Third Thread',
    createdAt: new Date('2024-01-03T00:00:00Z'),
  }),
];

// Mock Drizzle database
export const createMockDrizzleDB = () => ({
  _: {
    fullSchema: {
      threads: {
        id: { name: 'id' },
        title: { name: 'title' },
        userId: { name: 'userId' },
        organizationId: { name: 'organizationId' },
        tenantId: { name: 'tenantId' },
        metadata: { name: 'metadata' },
        createdAt: { name: 'createdAt' },
        updatedAt: { name: 'updatedAt' },
      },
      users: {
        id: { name: 'id' },
        name: { name: 'name' },
        createdAt: { name: 'createdAt' },
        updatedAt: { name: 'updatedAt' },
      },
      user: {
        id: { name: 'id' },
        name: { name: 'name' },
        createdAt: { name: 'createdAt' },
        updatedAt: { name: 'updatedAt' },
      },
      thread: {
        id: { name: 'id' },
        title: { name: 'title' },
        userId: { name: 'userId' },
        organizationId: { name: 'organizationId' },
        tenantId: { name: 'tenantId' },
        metadata: { name: 'metadata' },
        createdAt: { name: 'createdAt' },
        updatedAt: { name: 'updatedAt' },
      },
      feedback: {
        id: { name: 'id' },
        threadId: { name: 'threadId' },
        userId: { name: 'userId' },
        type: { name: 'type' },
        createdAt: { name: 'createdAt' },
        updatedAt: { name: 'updatedAt' },
      },
      custom_users: {
        id: { name: 'id' },
        name: { name: 'name' },
        createdAt: { name: 'createdAt' },
        updatedAt: { name: 'updatedAt' },
      },
      custom_threads: {
        id: { name: 'id' },
        title: { name: 'title' },
        user_id: { name: 'user_id' },
        org_id: { name: 'org_id' },
        tenantId: { name: 'tenantId' },
        metadata: { name: 'metadata' },
        createdAt: { name: 'createdAt' },
        updatedAt: { name: 'updatedAt' },
      },
      custom_feedback: {
        id: { name: 'id' },
        threadId: { name: 'threadId' },
        userId: { name: 'userId' },
        type: { name: 'type' },
        createdAt: { name: 'createdAt' },
        updatedAt: { name: 'updatedAt' },
      },
    },
  },
  insert: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  offset: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  returning: vi.fn(),
  execute: vi.fn(),
});

// Common test scenarios
export const testScenarios = {
  createThread: {
    input: { title: 'New Thread', metadata: { source: 'test' } } as CreateThreadOptions,
    expectedOutput: createMockThread({ title: 'New Thread', metadata: { source: 'test' } }),
  },
  updateThread: {
    input: { title: 'Updated Thread' } as UpdateThreadOptions,
    expectedOutput: createMockThread({ title: 'Updated Thread' }),
  },
  listThreads: {
    input: {
      limit: 10,
      offset: 0,
      orderBy: 'createdAt',
      orderDirection: 'desc',
    } as ListThreadsOptions,
    expectedOutput: createMockThreadsResponse(testThreads.slice(0, 2)),
  },
};

// Error scenarios
export const errorScenarios = {
  notFound: new Error('Thread not found'),
  unauthorized: new Error('Unauthorized'),
  validationError: new Error('Validation failed'),
  databaseError: new Error('Database connection failed'),
};

// Mock fetch for API tests
export const createMockFetch = (responses: { [key: string]: any } = {}) => {
  return vi.fn().mockImplementation((url: string, options?: RequestInit) => {
    const key = `${options?.method || 'GET'} ${url}`;
    const response = responses[key] || { success: true, data: null };

    return Promise.resolve({
      ok: response.success !== false,
      status: response.success !== false ? 200 : 400,
      json: () => Promise.resolve(response),
    });
  });
};

// Test helpers
export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const expectToHaveBeenCalledWithUserContext = (
  mockFn: any,
  expectedUserContext: UserContext,
  ...otherArgs: any[]
) => {
  expect(mockFn).toHaveBeenCalledWith(expectedUserContext, ...otherArgs);
};

export const expectThreadToMatchInput = (
  thread: Thread,
  input: CreateThreadOptions | UpdateThreadOptions,
  userContext: UserContext,
) => {
  if ('title' in input && input.title !== undefined) {
    expect(thread.title).toBe(input.title);
  }
  if ('metadata' in input && input.metadata !== undefined) {
    expect(thread.metadata).toEqual(input.metadata);
  }
  expect(thread.userId).toBe(userContext.userId);
  expect(thread.organizationId).toBe(userContext.organizationId);
  expect(thread.tenantId).toBe(userContext.tenantId);
};

// Setup helpers for different test environments
export const setupThreadTests = () => {
  const mockAdapter = createMockChatCoreAdapter();
  const mockUserContext = createMockUserContext();
  const mockGetUserContext = createMockGetUserContext(mockUserContext);

  return {
    mockAdapter,
    mockUserContext,
    mockGetUserContext,
  };
};

export const setupRouteTests = () => {
  const { mockAdapter, mockUserContext, mockGetUserContext } = setupThreadTests();

  return {
    mockAdapter,
    mockUserContext,
    mockGetUserContext,
    createRequest: createMockRequest,
  };
};

// Mock TanStack Query
export const createMockQueryClient = () => ({
  getQueryData: vi.fn(),
  setQueryData: vi.fn(),
  setQueriesData: vi.fn(),
  getQueriesData: vi.fn().mockReturnValue([]),
  invalidateQueries: vi.fn(),
  cancelQueries: vi.fn(),
  removeQueries: vi.fn(),
});

export const mockReactQuery = {
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useQueryClient: vi.fn(),
};
