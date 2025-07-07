---
sidebar_position: 3
---

# Examples

Practical examples demonstrating common use cases for the LangGraph adapter.

## Basic Setup

### Environment Configuration

First, set up your environment variables:

```bash
# .env
LANGGRAPH_API_URL=https://your-deployment.langchain.com
LANGSMITH_API_KEY=lsv2_pt_your_api_key_here
ASSISTANT_ID=your-assistant-id
```

### Minimal Example

```typescript
import { createLangGraphAdapter } from '@pressw/threads-langgraph';
import { ThreadUtilityClient } from '@pressw/threads';

// Create adapter
const adapter = createLangGraphAdapter({
  apiUrl: process.env.LANGGRAPH_API_URL!,
  apiKey: process.env.LANGSMITH_API_KEY!,
});

// Create client
const threadClient = new ThreadUtilityClient(adapter, async (request) => ({
  userId: 'user-123',
}));

// Create a thread
const request = new Request('https://api.example.com');
const thread = await threadClient.createThread(request, {
  title: 'My First Thread',
});

console.log('Created thread:', thread.id);
```

## Complete CRUD Example

Here's a comprehensive example showing all CRUD operations:

```typescript
import { createLangGraphAdapter } from '@pressw/threads-langgraph';
import { ThreadUtilityClient } from '@pressw/threads';
import type { UserContext } from '@pressw/threads';

async function threadManagementExample() {
  // Initialize adapter with full configuration
  const adapter = createLangGraphAdapter({
    apiUrl: process.env.LANGGRAPH_API_URL!,
    apiKey: process.env.LANGSMITH_API_KEY!,
    assistantId: process.env.ASSISTANT_ID,
    debugLogs: true,
    defaultHeaders: {
      'X-App-Version': '1.0.0',
    },
  });

  // Create thread client with user context extraction
  const threadClient = new ThreadUtilityClient(
    adapter,
    async (request: Request): Promise<UserContext> => {
      // In production, extract from auth headers
      const authHeader = request.headers.get('Authorization');
      const userId = extractUserIdFromToken(authHeader);

      return {
        userId,
        organizationId: 'org-456',
        tenantId: 'tenant-789',
      };
    },
  );

  const request = new Request('https://api.example.com', {
    headers: {
      Authorization: 'Bearer token-here',
    },
  });

  try {
    // CREATE - Create a new thread
    console.log('Creating thread...');
    const thread = await threadClient.createThread(request, {
      title: 'Customer Support - Order #12345',
      metadata: {
        category: 'order-inquiry',
        orderId: '12345',
        priority: 'high',
        tags: ['urgent', 'billing'],
        customerInfo: {
          email: 'customer@example.com',
          plan: 'premium',
        },
      },
    });
    console.log('Created thread:', thread);

    // READ - Get the thread
    console.log('\nFetching thread...');
    const fetchedThread = await threadClient.getThread(request, thread.id);
    console.log('Fetched thread:', fetchedThread);

    // UPDATE - Update thread metadata
    console.log('\nUpdating thread...');
    const updatedThread = await threadClient.updateThread(request, thread.id, {
      title: 'Customer Support - Order #12345 [RESOLVED]',
      metadata: {
        ...thread.metadata,
        status: 'resolved',
        resolvedAt: new Date().toISOString(),
        resolutionNotes: 'Refund processed',
      },
    });
    console.log('Updated thread:', updatedThread);

    // LIST - Search for threads
    console.log('\nListing threads...');
    const threadsList = await threadClient.listThreads(request, {
      limit: 10,
      offset: 0,
    });
    console.log(`Found ${threadsList.total} threads`);
    console.log('First page:', threadsList.threads);

    // DELETE - Remove the thread
    console.log('\nDeleting thread...');
    await threadClient.deleteThread(request, thread.id);
    console.log('Thread deleted successfully');
  } catch (error) {
    console.error('Error:', error);
  }
}

// Helper function (implement based on your auth system)
function extractUserIdFromToken(authHeader: string | null): string {
  // Your token parsing logic here
  return 'user-123';
}
```

## Integration with LangGraph Runs

This example shows how to use the adapter alongside LangGraph's run functionality:

```typescript
import { createLangGraphAdapter } from '@pressw/threads-langgraph';
import { ThreadUtilityClient } from '@pressw/threads';
import { Client } from '@langchain/langgraph-sdk';

async function integratedExample() {
  const apiUrl = process.env.LANGGRAPH_API_URL!;
  const apiKey = process.env.LANGSMITH_API_KEY!;
  const assistantId = process.env.ASSISTANT_ID!;

  // Create adapter for thread management
  const adapter = createLangGraphAdapter({
    apiUrl,
    apiKey,
    assistantId,
  });

  const threadClient = new ThreadUtilityClient(adapter, async () => ({ userId: 'user-123' }));

  // Create LangGraph client for runs
  const langGraphClient = new Client({ apiUrl, apiKey });

  // Step 1: Create a thread using the adapter
  const request = new Request('https://api.example.com');
  const thread = await threadClient.createThread(request, {
    title: 'AI Assistant Conversation',
    metadata: {
      context: 'code-review',
      language: 'typescript',
    },
  });

  console.log('Thread created:', thread.id);

  // Step 2: Run the assistant on the thread
  const streamResponse = langGraphClient.runs.stream(thread.id, assistantId, {
    input: {
      messages: [
        {
          role: 'user',
          content: 'Can you review this TypeScript code for best practices?',
        },
      ],
    },
    streamMode: 'messages',
  });

  // Step 3: Process the stream
  console.log('\nAssistant response:');
  for await (const event of streamResponse) {
    if (event.event === 'messages/partial') {
      process.stdout.write(event.data[0].content);
    }
  }

  // Step 4: Update thread metadata after completion
  await threadClient.updateThread(request, thread.id, {
    metadata: {
      ...thread.metadata,
      lastActivity: new Date().toISOString(),
      messageCount: 2,
    },
  });

  // Step 5: Get thread state
  const state = await langGraphClient.threads.getState(thread.id);
  console.log('\n\nThread state:', state);
}
```

## Multi-tenant Application Example

Example showing proper multi-tenant isolation:

```typescript
import { createLangGraphAdapter } from '@pressw/threads-langgraph';
import { ThreadUtilityClient } from '@pressw/threads';
import type { UserContext } from '@pressw/threads';

class MultiTenantThreadService {
  private threadClient: ThreadUtilityClient;

  constructor() {
    const adapter = createLangGraphAdapter({
      apiUrl: process.env.LANGGRAPH_API_URL!,
      apiKey: process.env.LANGSMITH_API_KEY!,
    });

    this.threadClient = new ThreadUtilityClient(adapter, this.extractUserContext.bind(this));
  }

  private async extractUserContext(request: Request): Promise<UserContext> {
    // Extract from JWT or session
    const authToken = request.headers.get('Authorization')?.split(' ')[1];
    const decoded = decodeJWT(authToken!); // Your JWT decode logic

    return {
      userId: decoded.sub,
      organizationId: decoded.orgId,
      tenantId: decoded.tenantId,
    };
  }

  async createTenantThread(request: Request, data: any) {
    // The adapter automatically ensures tenant isolation
    return this.threadClient.createThread(request, {
      ...data,
      metadata: {
        ...data.metadata,
        createdBy: 'api',
        apiVersion: 'v1',
      },
    });
  }

  async listTenantThreads(request: Request, options = {}) {
    // Only returns threads for the user's tenant
    return this.threadClient.listThreads(request, {
      limit: 20,
      offset: 0,
      ...options,
    });
  }

  async updateTenantThread(request: Request, threadId: string, updates: any) {
    // Access control is enforced - can only update own tenant's threads
    return this.threadClient.updateThread(request, threadId, updates);
  }
}

// Usage
const threadService = new MultiTenantThreadService();

app.post('/api/threads', async (req, res) => {
  try {
    const thread = await threadService.createTenantThread(req, {
      title: req.body.title,
      metadata: req.body.metadata,
    });
    res.json(thread);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## React Integration Example

Using the adapter in a React application with React Query:

```typescript
// hooks/useThreads.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createLangGraphAdapter } from '@pressw/threads-langgraph';
import { ThreadUtilityClient } from '@pressw/threads';

// Create adapter singleton
const adapter = createLangGraphAdapter({
  apiUrl: process.env.NEXT_PUBLIC_LANGGRAPH_URL!,
  apiKey: process.env.NEXT_PUBLIC_LANGSMITH_KEY!,
});

const threadClient = new ThreadUtilityClient(
  adapter,
  async () => ({
    userId: getCurrentUserId(), // Your auth logic
  })
);

// Custom hooks
export function useThreads(options = {}) {
  return useQuery({
    queryKey: ['threads', options],
    queryFn: async () => {
      const request = new Request('https://api.local');
      return threadClient.listThreads(request, options);
    },
  });
}

export function useCreateThread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { title: string; metadata?: any }) => {
      const request = new Request('https://api.local');
      return threadClient.createThread(request, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['threads'] });
    },
  });
}

// Component usage
function ThreadList() {
  const { data, isLoading } = useThreads({ limit: 10 });
  const createThread = useCreateThread();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <button
        onClick={() =>
          createThread.mutate({
            title: 'New Thread',
            metadata: { source: 'ui' },
          })
        }
      >
        Create Thread
      </button>

      <ul>
        {data?.threads.map((thread) => (
          <li key={thread.id}>
            {thread.title} - Created: {thread.createdAt}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## Error Handling Example

Comprehensive error handling patterns:

```typescript
import { createLangGraphAdapter } from '@pressw/threads-langgraph';
import { ThreadUtilityClient } from '@pressw/threads';

class ThreadServiceWithErrorHandling {
  private threadClient: ThreadUtilityClient;

  constructor() {
    const adapter = createLangGraphAdapter({
      apiUrl: process.env.LANGGRAPH_API_URL!,
      apiKey: process.env.LANGSMITH_API_KEY!,
    });

    this.threadClient = new ThreadUtilityClient(adapter, async () => ({ userId: 'user-123' }));
  }

  async safeCreateThread(request: Request, data: any) {
    try {
      return await this.threadClient.createThread(request, data);
    } catch (error: any) {
      // Handle specific error types
      if (error.message?.includes('unauthorized')) {
        throw new Error('Authentication required');
      }

      if (error.message?.includes('rate limit')) {
        throw new Error('Too many requests. Please try again later.');
      }

      if (error.message?.includes('validation')) {
        throw new Error('Invalid thread data provided');
      }

      // Log unexpected errors
      console.error('Unexpected error creating thread:', error);
      throw new Error('Failed to create thread. Please try again.');
    }
  }

  async safeGetThread(request: Request, threadId: string) {
    try {
      const thread = await this.threadClient.getThread(request, threadId);

      if (!thread) {
        throw new Error('Thread not found');
      }

      return thread;
    } catch (error: any) {
      if (error.message === 'Thread not found') {
        throw error;
      }

      if (error.message?.includes('access denied')) {
        throw new Error('You do not have permission to access this thread');
      }

      console.error('Error fetching thread:', error);
      throw new Error('Failed to fetch thread');
    }
  }

  async safeUpdateThread(request: Request, threadId: string, updates: any) {
    try {
      // Validate updates
      if (!updates || Object.keys(updates).length === 0) {
        throw new Error('No updates provided');
      }

      return await this.threadClient.updateThread(request, threadId, updates);
    } catch (error: any) {
      if (error.message?.includes('not found')) {
        throw new Error('Thread not found or access denied');
      }

      if (error.message?.includes('conflict')) {
        throw new Error('Thread was updated by another user. Please refresh and try again.');
      }

      console.error('Error updating thread:', error);
      throw new Error('Failed to update thread');
    }
  }
}
```

## Batch Operations Example

Handling multiple thread operations efficiently:

```typescript
import { createLangGraphAdapter } from '@pressw/threads-langgraph';
import { ThreadUtilityClient } from '@pressw/threads';

async function batchOperationsExample() {
  const adapter = createLangGraphAdapter({
    apiUrl: process.env.LANGGRAPH_API_URL!,
    apiKey: process.env.LANGSMITH_API_KEY!,
  });

  const threadClient = new ThreadUtilityClient(adapter, async () => ({ userId: 'user-123' }));

  const request = new Request('https://api.example.com');

  // Create multiple threads in parallel
  const threadPromises = Array.from({ length: 5 }, (_, i) =>
    threadClient.createThread(request, {
      title: `Batch Thread ${i + 1}`,
      metadata: {
        batchId: 'batch-001',
        index: i,
      },
    }),
  );

  const threads = await Promise.all(threadPromises);
  console.log(`Created ${threads.length} threads`);

  // Update all threads in the batch
  const updatePromises = threads.map((thread) =>
    threadClient.updateThread(request, thread.id, {
      metadata: {
        ...thread.metadata,
        processed: true,
        processedAt: new Date().toISOString(),
      },
    }),
  );

  await Promise.all(updatePromises);
  console.log('All threads updated');

  // Clean up - delete all threads
  const deletePromises = threads.map((thread) => threadClient.deleteThread(request, thread.id));

  await Promise.all(deletePromises);
  console.log('All threads deleted');
}
```

## Testing Example

Example of testing with the adapter:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createLangGraphAdapter } from '@pressw/threads-langgraph';
import { ThreadUtilityClient } from '@pressw/threads';

describe('Thread Management Tests', () => {
  let threadClient: ThreadUtilityClient;
  let testRequest: Request;

  beforeEach(() => {
    const adapter = createLangGraphAdapter({
      apiUrl: 'http://localhost:8123', // Local test server
      apiKey: 'test-key',
    });

    threadClient = new ThreadUtilityClient(adapter, async () => ({ userId: 'test-user' }));

    testRequest = new Request('https://test.local');
  });

  it('should create and retrieve a thread', async () => {
    // Create thread
    const thread = await threadClient.createThread(testRequest, {
      title: 'Test Thread',
      metadata: { test: true },
    });

    expect(thread).toBeDefined();
    expect(thread.title).toBe('Test Thread');
    expect(thread.metadata?.test).toBe(true);

    // Retrieve thread
    const retrieved = await threadClient.getThread(testRequest, thread.id);
    expect(retrieved).toEqual(thread);
  });

  it('should handle thread not found', async () => {
    const thread = await threadClient.getThread(testRequest, 'non-existent');
    expect(thread).toBeNull();
  });

  it('should enforce access control', async () => {
    // Create thread as one user
    const thread = await threadClient.createThread(testRequest, {
      title: 'Private Thread',
    });

    // Try to access as different user
    const otherClient = new ThreadUtilityClient(adapter, async () => ({ userId: 'other-user' }));

    const accessed = await otherClient.getThread(testRequest, thread.id);
    expect(accessed).toBeNull();
  });
});
```
