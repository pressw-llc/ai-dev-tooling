// CopilotKit handler tests
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import {
  createCopilotKitHandler,
  createRateLimitMiddleware,
  withRateLimit,
} from '../../src/ai/handlers/copilotkit-handler';
import type { CopilotKitHandlerConfig, UserContext } from '../../src/ai/types';
import { AIError, AI_ERROR_CODES } from '../../src/ai/types';
import { defineAgent, registerAgent, clearAgents } from '../../src/ai/agents';
import { mockUserContext, mockAdapter, mockThread } from './test-utils';

// Mock NextRequest
class MockNextRequest {
  url: string;
  headers: Map<string, string>;
  private body: any;

  constructor(url: string, options?: { headers?: Record<string, string>; body?: any }) {
    this.url = url;
    this.headers = new Map(Object.entries(options?.headers || {}));
    this.body = options?.body || { messages: [], model: 'gpt-4' };
  }

  async json() {
    return this.body;
  }

  header(name: string): string | null {
    return this.headers.get(name) || null;
  }
}

describe('createCopilotKitHandler', () => {
  beforeEach(() => {
    clearAgents();
  });

  afterEach(() => {
    clearAgents();
  });

  const mockGetUserContext = async () => mockUserContext;

  const defaultConfig: CopilotKitHandlerConfig = {
    adapter: mockAdapter,
    getUserContext: mockGetUserContext,
    agents: [],
    config: {
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 2000,
    },
  };

  test('should create handler function', () => {
    const handler = createCopilotKitHandler(defaultConfig);

    expect(typeof handler).toBe('function');
  });

  test('should throw error for missing adapter', () => {
    expect(() => {
      createCopilotKitHandler({
        ...defaultConfig,
        adapter: null as any,
      });
    }).toThrow(AIError);
  });

  test('should throw error for missing getUserContext', () => {
    expect(() => {
      createCopilotKitHandler({
        ...defaultConfig,
        getUserContext: null as any,
      });
    }).toThrow(AIError);
  });

  test('should handle request successfully', async () => {
    const handler = createCopilotKitHandler(defaultConfig);
    const request = new MockNextRequest('http://localhost:3000/api/copilotkit') as any;

    const response = await handler(request);

    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(200);

    const responseBody = await response.json();
    expect(responseBody).toHaveProperty('id');
    expect(responseBody).toHaveProperty('choices');
    expect(responseBody.choices[0]).toHaveProperty('message');
  });

  test('should extract threadId from URL parameters', async () => {
    mockAdapter.getThread = async () => mockThread;

    const handler = createCopilotKitHandler(defaultConfig);
    const request = new MockNextRequest(
      'http://localhost:3000/api/copilotkit?threadId=test-thread-123',
    ) as any;

    const response = await handler(request);

    expect(response.status).toBe(200);
  });

  test('should handle missing thread gracefully', async () => {
    mockAdapter.getThread = async () => {
      throw new Error('Thread not found');
    };

    const handler = createCopilotKitHandler(defaultConfig);
    const request = new MockNextRequest(
      'http://localhost:3000/api/copilotkit?threadId=non-existent-thread',
    ) as any;

    const response = await handler(request);

    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(200);
  });

  test('should handle getUserContext errors', async () => {
    const failingGetUserContext = async () => {
      throw new Error('Authentication failed');
    };

    const handler = createCopilotKitHandler({
      ...defaultConfig,
      getUserContext: failingGetUserContext,
    });

    const request = new MockNextRequest('http://localhost:3000/api/copilotkit') as any;

    const response = await handler(request);

    expect(response.status).toBe(401);
    const responseBody = await response.json();
    expect(responseBody.error.code).toBe(AI_ERROR_CODES.UNAUTHORIZED);
  });

  test('should process agent configuration correctly', async () => {
    const toolHandler = async () => 'Tool result';

    const testAgent = defineAgent({
      name: 'test-agent',
      description: 'Test agent for handler',
      tools: [
        {
          name: 'test-tool',
          description: 'Test tool',
          parameters: {
            input: { type: 'string', description: 'Test input' },
          },
          handler: toolHandler,
        },
      ],
    });

    registerAgent(testAgent);

    const handler = createCopilotKitHandler({
      ...defaultConfig,
      agents: [testAgent],
    });

    const request = new MockNextRequest('http://localhost:3000/api/copilotkit') as any;
    const response = await handler(request);

    expect(response.status).toBe(200);
  });

  test('should use default configuration when none provided', async () => {
    const handler = createCopilotKitHandler({
      adapter: mockAdapter,
      getUserContext: mockGetUserContext,
    });

    const request = new MockNextRequest('http://localhost:3000/api/copilotkit') as any;
    const response = await handler(request);

    expect(response.status).toBe(200);

    const responseBody = await response.json();
    expect(responseBody.model).toBe('gpt-4'); // Default model should be used
  });
});

describe('createRateLimitMiddleware', () => {
  const mockGetUserContext = async () => mockUserContext;

  test('should create middleware function', () => {
    const middleware = createRateLimitMiddleware(60000, 10);

    expect(typeof middleware).toBe('function');
  });

  test('should allow requests within limit', async () => {
    const middleware = createRateLimitMiddleware(60000, 10);
    const request = new MockNextRequest('http://localhost:3000/api/copilotkit') as any;

    const result = await middleware(request, mockGetUserContext);

    expect(result).toBeNull();
  });

  test('should block requests exceeding limit', async () => {
    const middleware = createRateLimitMiddleware(1000, 2);
    const request = new MockNextRequest('http://localhost:3000/api/copilotkit') as any;

    // First two requests should pass
    await expect(middleware(request, mockGetUserContext)).resolves.toBeNull();
    await expect(middleware(request, mockGetUserContext)).resolves.toBeNull();

    // Third request should fail
    await expect(middleware(request, mockGetUserContext)).rejects.toThrow(AIError);
  });
});

describe('withRateLimit', () => {
  const mockHandler = async () => new Response('OK');
  const mockGetUserContext = async () => mockUserContext;

  test('should wrap handler with rate limiting', () => {
    const rateLimitedHandler = withRateLimit(mockHandler, {
      windowMs: 60000,
      maxRequests: 10,
      getUserContext: mockGetUserContext,
    });

    expect(typeof rateLimitedHandler).toBe('function');
  });

  test('should call original handler when within limits', async () => {
    const rateLimitedHandler = withRateLimit(mockHandler, {
      windowMs: 60000,
      maxRequests: 10,
      getUserContext: mockGetUserContext,
    });

    const request = new MockNextRequest('http://localhost:3000/api/copilotkit') as any;
    const response = await rateLimitedHandler(request);

    expect(response).toBeInstanceOf(Response);
  });

  test('should return 429 response when rate limited', async () => {
    const rateLimitedHandler = withRateLimit(mockHandler, {
      windowMs: 1000,
      maxRequests: 1,
      getUserContext: mockGetUserContext,
    });

    const request = new MockNextRequest('http://localhost:3000/api/copilotkit') as any;

    // First request should succeed
    const response1 = await rateLimitedHandler(request);
    expect(response1.status).toBe(200);

    // Second request should be rate limited
    const response2 = await rateLimitedHandler(request);
    expect(response2.status).toBe(429);

    const responseBody = await response2.json();
    expect(responseBody.error.code).toBe(AI_ERROR_CODES.RATE_LIMITED);
  });
});

describe('Handler Integration Tests', () => {
  beforeEach(() => {
    clearAgents();
  });

  afterEach(() => {
    clearAgents();
  });

  test('should integrate CopilotKit handler with rate limiting', async () => {
    const toolHandler = async () => 'Integration test result';

    const testAgent = defineAgent({
      name: 'integration-agent',
      description: 'Agent for integration testing',
      tools: [
        {
          name: 'integration-tool',
          description: 'Tool for integration testing',
          parameters: {},
          handler: toolHandler,
        },
      ],
    });

    registerAgent(testAgent);

    const baseHandler = createCopilotKitHandler({
      adapter: mockAdapter,
      getUserContext: async () => mockUserContext,
      agents: [testAgent],
    });

    const rateLimitedHandler = withRateLimit(baseHandler, {
      windowMs: 60000,
      maxRequests: 5,
      getUserContext: async () => mockUserContext,
    });

    const request = new MockNextRequest('http://localhost:3000/api/copilotkit') as any;
    const response = await rateLimitedHandler(request);

    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(200);
  });
});
