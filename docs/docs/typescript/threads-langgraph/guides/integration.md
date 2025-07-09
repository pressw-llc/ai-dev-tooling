---
sidebar_position: 1
---

# Integration Guide

This guide covers advanced integration scenarios for the LangGraph adapter, including authentication, deployment, and production considerations.

## Authentication and Security

### API Key Management

The LangGraph adapter uses LangSmith API keys for authentication. Here's how to properly manage them:

```typescript
// Environment-based configuration
const adapter = createLangGraphAdapter({
  apiUrl: process.env.LANGGRAPH_API_URL!,
  apiKey: process.env.LANGSMITH_API_KEY!, // Never hardcode
});
```

### Key Resolution Order

The adapter resolves API keys in this order:

1. Explicit `apiKey` parameter
2. `LANGGRAPH_API_KEY` environment variable
3. `LANGSMITH_API_KEY` environment variable
4. `LANGCHAIN_API_KEY` environment variable

### Secure Key Storage

For production environments:

```typescript
// Using a secrets manager (e.g., AWS Secrets Manager)
import { getSecret } from '@aws-sdk/client-secrets-manager';

async function createSecureAdapter() {
  const secret = await getSecret({ SecretId: 'langgraph-api-key' });

  return createLangGraphAdapter({
    apiUrl: process.env.LANGGRAPH_API_URL!,
    apiKey: secret.SecretString!,
  });
}
```

## Multi-tenant Architecture

### Tenant Isolation Strategy

The adapter supports three levels of tenant isolation:

```typescript
interface UserContext {
  userId: string; // User-level isolation
  organizationId?: string; // Organization-level isolation
  tenantId?: string; // Tenant-level isolation
}
```

### Implementation Example

```typescript
class TenantAwareThreadService {
  private adapter: LangGraphAdapter;

  constructor() {
    this.adapter = createLangGraphAdapter({
      apiUrl: process.env.LANGGRAPH_API_URL!,
      apiKey: process.env.LANGSMITH_API_KEY!,
    });
  }

  async extractTenantContext(request: Request): Promise<UserContext> {
    // Extract from JWT
    const token = request.headers.get('Authorization')?.split(' ')[1];
    const claims = verifyJWT(token!);

    // Map claims to context
    return {
      userId: claims.sub,
      organizationId: claims.org_id,
      tenantId: claims.tenant_id,
    };
  }

  createClient(request: Request): ThreadUtilityClient {
    return new ThreadUtilityClient(this.adapter, () => this.extractTenantContext(request));
  }
}
```

### Metadata Schema for Tenants

Design your metadata to support tenant-specific features:

```typescript
interface TenantThreadMetadata {
  // Tenant identification
  workspaceId: string;
  projectId?: string;

  // Access control
  visibility: 'private' | 'team' | 'organization';
  allowedUsers?: string[];

  // Tenant-specific features
  customFields: Record<string, any>;
  integrations: {
    slack?: { channelId: string };
    jira?: { issueKey: string };
  };
}
```

## Performance Optimization

### Connection Pooling

The LangGraph SDK handles connection pooling internally, but you can optimize adapter instances:

```typescript
// Singleton pattern for adapter
let adapterInstance: LangGraphAdapter | null = null;

export function getAdapter(): LangGraphAdapter {
  if (!adapterInstance) {
    adapterInstance = createLangGraphAdapter({
      apiUrl: process.env.LANGGRAPH_API_URL!,
      apiKey: process.env.LANGSMITH_API_KEY!,
    });
  }
  return adapterInstance;
}
```

### Caching Strategy

Implement caching for frequently accessed threads:

```typescript
import { LRUCache } from 'lru-cache';

class CachedThreadClient {
  private cache: LRUCache<string, Thread>;
  private client: ThreadUtilityClient;

  constructor(adapter: LangGraphAdapter) {
    this.cache = new LRUCache({
      max: 500,
      ttl: 1000 * 60 * 5, // 5 minutes
    });

    this.client = new ThreadUtilityClient(adapter, async () => ({ userId: 'user-123' }));
  }

  async getThread(request: Request, threadId: string): Promise<Thread | null> {
    // Check cache first
    const cached = this.cache.get(threadId);
    if (cached) return cached;

    // Fetch from API
    const thread = await this.client.getThread(request, threadId);
    if (thread) {
      this.cache.set(threadId, thread);
    }

    return thread;
  }

  async updateThread(request: Request, threadId: string, updates: any): Promise<Thread | null> {
    const thread = await this.client.updateThread(request, threadId, updates);

    // Invalidate cache
    if (thread) {
      this.cache.set(threadId, thread);
    } else {
      this.cache.delete(threadId);
    }

    return thread;
  }
}
```

### Batch Operations

Optimize multiple operations with batching:

```typescript
class BatchThreadProcessor {
  constructor(private adapter: LangGraphAdapter) {}

  async processBatch<T>(
    operations: Array<() => Promise<T>>,
    options: { concurrency?: number } = {},
  ): Promise<T[]> {
    const { concurrency = 5 } = options;
    const results: T[] = [];

    for (let i = 0; i < operations.length; i += concurrency) {
      const batch = operations.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map((op) => op().catch((err) => ({ error: err }))),
      );
      results.push(...batchResults);
    }

    return results;
  }
}
```

## Error Handling and Resilience

### Retry Logic

Implement exponential backoff for transient failures:

```typescript
async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
  } = {},
): Promise<T> {
  const { maxRetries = 3, initialDelay = 1000, maxDelay = 10000 } = options;

  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      // Don't retry on client errors
      if (error.status >= 400 && error.status < 500) {
        throw error;
      }

      if (attempt < maxRetries) {
        const delay = Math.min(initialDelay * Math.pow(2, attempt), maxDelay);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
}

// Usage
const thread = await withRetry(() => threadClient.createThread(request, data));
```

### Circuit Breaker Pattern

Prevent cascading failures:

```typescript
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private threshold = 5,
    private timeout = 60000, // 1 minute
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await operation();
      if (this.state === 'half-open') {
        this.state = 'closed';
        this.failures = 0;
      }
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();

      if (this.failures >= this.threshold) {
        this.state = 'open';
      }

      throw error;
    }
  }
}
```

## Monitoring and Observability

### Logging Integration

Add structured logging to track operations:

```typescript
import { createLogger } from 'winston';

const logger = createLogger({
  level: 'info',
  format: winston.format.json(),
});

class MonitoredThreadClient {
  constructor(
    private client: ThreadUtilityClient,
    private logger: Logger,
  ) {}

  async createThread(request: Request, data: any): Promise<Thread> {
    const startTime = Date.now();
    const correlationId = request.headers.get('X-Correlation-ID') || generateId();

    try {
      this.logger.info('Creating thread', {
        correlationId,
        userId: data.userId,
        metadata: data.metadata,
      });

      const thread = await this.client.createThread(request, data);

      this.logger.info('Thread created successfully', {
        correlationId,
        threadId: thread.id,
        duration: Date.now() - startTime,
      });

      return thread;
    } catch (error: any) {
      this.logger.error('Failed to create thread', {
        correlationId,
        error: error.message,
        stack: error.stack,
        duration: Date.now() - startTime,
      });

      throw error;
    }
  }
}
```

### Metrics Collection

Track key performance indicators:

```typescript
import { Counter, Histogram } from 'prom-client';

const threadOperations = new Counter({
  name: 'thread_operations_total',
  help: 'Total number of thread operations',
  labelNames: ['operation', 'status'],
});

const operationDuration = new Histogram({
  name: 'thread_operation_duration_seconds',
  help: 'Duration of thread operations',
  labelNames: ['operation'],
});

class MetricsThreadClient {
  async createThread(request: Request, data: any): Promise<Thread> {
    const timer = operationDuration.startTimer({ operation: 'create' });

    try {
      const thread = await this.client.createThread(request, data);
      threadOperations.inc({ operation: 'create', status: 'success' });
      return thread;
    } catch (error) {
      threadOperations.inc({ operation: 'create', status: 'error' });
      throw error;
    } finally {
      timer();
    }
  }
}
```

## Deployment Considerations

### Environment Configuration

Structure your environment variables for different stages:

```bash
# .env.development
LANGGRAPH_API_URL=http://localhost:8123
LANGSMITH_API_KEY=dev-key

# .env.staging
LANGGRAPH_API_URL=https://staging.langchain.com
LANGSMITH_API_KEY=staging-key

# .env.production
LANGGRAPH_API_URL=https://prod.langchain.com
LANGSMITH_API_KEY=prod-key
```

### Health Checks

Implement health checks for your service:

```typescript
class HealthCheckService {
  constructor(private adapter: LangGraphAdapter) {}

  async checkHealth(): Promise<{
    status: 'healthy' | 'unhealthy';
    details: Record<string, any>;
  }> {
    try {
      // Try to create and delete a test thread
      const testClient = new ThreadUtilityClient(this.adapter, async () => ({
        userId: 'health-check',
      }));

      const request = new Request('https://health.check');
      const thread = await testClient.createThread(request, {
        title: 'Health Check',
        metadata: { healthCheck: true },
      });

      await testClient.deleteThread(request, thread.id);

      return {
        status: 'healthy',
        details: {
          langGraphConnection: 'ok',
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        details: {
          langGraphConnection: 'failed',
          error: error.message,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }
}
```

### Graceful Shutdown

Handle shutdown gracefully:

```typescript
class ThreadService {
  private shuttingDown = false;

  async shutdown(): Promise<void> {
    this.shuttingDown = true;

    // Wait for ongoing operations
    await this.waitForPendingOperations();

    // Clean up resources
    await this.cleanup();
  }

  private async waitForPendingOperations(): Promise<void> {
    // Implementation depends on your tracking mechanism
  }

  private async cleanup(): Promise<void> {
    // Clear caches, close connections, etc.
  }
}

// Register shutdown handlers
process.on('SIGTERM', async () => {
  await threadService.shutdown();
  process.exit(0);
});
```

## Next Steps

- Review the [Migration Guide](./migration) for moving from other systems
