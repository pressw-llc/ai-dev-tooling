// Shared test utilities for AI features
import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test';
import type {
  AIActionDefinition,
  AIAgentDefinition,
  AIContextItem,
  UserContext,
  ChatCoreAdapter,
} from '../../src/ai/types';

// Mock user context for tests
export const mockUserContext: UserContext = {
  userId: 'test-user-123',
  organizationId: 'test-org-456',
  tenantId: 'test-tenant-789',
};

// Mock adapter for tests
export const mockAdapter: ChatCoreAdapter = {
  create: async () => ({}),
  findOne: async () => null,
  findMany: async () => [],
  update: async () => ({}),
  delete: async () => ({}),
  count: async () => 0,
  getThread: async () => mockThread,
} as any;

// Mock thread for tests
export const mockThread = {
  id: 'thread-123',
  title: 'Test Thread',
  userId: 'test-user-123',
  organizationId: 'test-org-456',
  tenantId: 'test-tenant-789',
  metadata: { category: 'test' },
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Mock action definition
export const mockActionDefinition: AIActionDefinition = {
  name: 'test-action',
  description: 'A test action',
  parameters: {
    message: {
      type: 'string',
      description: 'Test message',
    },
  },
  handler: async () => 'Action completed',
};

// Mock agent definition
export const mockAgentDefinition: AIAgentDefinition = {
  name: 'test-agent',
  description: 'A test agent',
  systemMessage: 'You are a test agent',
  tools: [
    {
      name: 'test-tool',
      description: 'A test tool',
      parameters: {
        input: {
          type: 'string',
          description: 'Test input',
        },
      },
      handler: async () => 'Tool executed',
    },
  ],
};

// Mock context items
export const mockContextItems: AIContextItem[] = [
  {
    name: 'testContext',
    description: 'Test context data',
    data: { key: 'value' },
    priority: 1,
  },
];

// React Testing Library setup helpers
export const renderHookWithProviders = (hook: () => any) => {
  // This will be implemented once we have providers set up
  return { result: { current: hook() } };
};

// Cleanup helper
export const cleanupMocks = () => {
  // No-op for bun:test
};
