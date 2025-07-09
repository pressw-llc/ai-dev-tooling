---
sidebar_position: 1
---

# @pressw/threads-langgraph

LangGraph Cloud adapter for @pressw/threads, providing managed thread storage with built-in scalability and assistant integration.

## Overview

`@pressw/threads-langgraph` connects your thread management to [LangGraph Cloud](https://langchain-ai.github.io/langgraph/cloud/), offering:

- ☁️ **Managed Storage** - No database to maintain
- 🚀 **Built-in Scalability** - Handles growth automatically
- 🤖 **Assistant Integration** - Native LangGraph assistant support
- 🔄 **Real-time Sync** - Cloud-based thread synchronization
- 📊 **Analytics Ready** - Built-in metrics and monitoring
- 🔐 **Enterprise Security** - SOC2 compliant infrastructure

## Installation

```bash
npm install @pressw/threads @pressw/threads-langgraph @langchain/langgraph-sdk
```

## Quick Start

### 1. Get Your LangGraph Cloud Credentials

First, sign up for [LangGraph Cloud](https://smith.langchain.com/) and create an assistant to get your credentials.

### 2. Create the Adapter

```typescript
import { LangGraphAdapter } from '@pressw/threads-langgraph';

const adapter = new LangGraphAdapter({
  apiUrl: 'https://api.langsmith.com',
  apiKey: process.env.LANGGRAPH_API_KEY!,
  assistantId: 'your-assistant-id',
});
```

### 3. Use with Thread Client

```typescript
import { createThreadUtilityClient } from '@pressw/threads';

const threadClient = createThreadUtilityClient({
  adapter,
  getUserContext: async (request) => {
    // Your auth logic
    const session = await getSession(request);
    return {
      userId: session.userId,
      organizationId: session.organizationId,
    };
  },
});

// Create a thread
const thread = await threadClient.createThread(request, {
  title: 'Customer Support Chat',
  metadata: {
    source: 'web',
    priority: 'high',
  },
});
```

## Configuration

### Basic Configuration

```typescript
const adapter = new LangGraphAdapter({
  apiUrl: 'https://api.langsmith.com',
  apiKey: process.env.LANGGRAPH_API_KEY!,
  assistantId: 'your-assistant-id',
});
```

### Advanced Configuration

```typescript
const adapter = new LangGraphAdapter({
  // Required
  apiUrl: 'https://api.langsmith.com',
  apiKey: process.env.LANGGRAPH_API_KEY!,
  assistantId: 'your-assistant-id',

  // Optional
  defaultThreadConfig: {
    // Default configuration for new threads
    configurable: {
      model_name: 'gpt-4',
      temperature: 0.7,
    },
  },

  // HTTP client options
  httpOptions: {
    timeout: 30000, // 30 seconds
    retries: 3,
  },

  // Custom headers
  headers: {
    'X-Custom-Header': 'value',
  },
});
```

## LangGraph Cloud Integration

### Working with Assistants

The adapter seamlessly integrates with LangGraph assistants:

```typescript
// Create a thread connected to your assistant
const thread = await threadClient.createThread(request, {
  title: 'AI Assistant Chat',
  metadata: {
    assistantVersion: '1.0',
    features: ['rag', 'tools'],
  },
});

// The thread ID can be used with LangGraph SDK
import { Client } from '@langchain/langgraph-sdk';

const langGraphClient = new Client({
  apiUrl: 'https://api.langsmith.com',
  apiKey: process.env.LANGGRAPH_API_KEY!,
});

// Use the same thread ID
const run = await langGraphClient.runs.create(
  thread.id, // Thread ID from our adapter
  'your-assistant-id',
  { input: { message: 'Hello!' } },
);
```

### Thread State Management

LangGraph threads maintain state that can be accessed:

```typescript
// Get thread with state
const thread = await threadClient.getThread(request, threadId);

// Access LangGraph state through metadata
const state = thread.metadata?.state;
const values = thread.metadata?.values;
```

### Multi-tenant Support

The adapter supports multi-tenancy through metadata:

```typescript
const threadClient = createThreadUtilityClient({
  adapter,
  getUserContext: async (request) => ({
    userId: session.userId,
    organizationId: session.organizationId,
    tenantId: session.tenantId, // Stored in metadata
  }),
});

// Threads are automatically filtered by tenant
const { threads } = await threadClient.listThreads(request);
```

## Features

### Automatic Thread Management

The adapter handles all thread lifecycle operations:

```typescript
// Create
const thread = await threadClient.createThread(request, {
  title: 'Support Thread',
});

// Update
await threadClient.updateThread(request, thread.id, {
  title: 'Resolved: Support Thread',
  metadata: {
    ...thread.metadata,
    status: 'resolved',
  },
});

// List with filtering
const { threads } = await threadClient.listThreads(request, {
  limit: 20,
  offset: 0,
  search: 'billing', // Searches in title and metadata
});

// Delete
await threadClient.deleteThread(request, thread.id);
```

### Metadata Storage

Store custom data with threads:

```typescript
interface CustomMetadata {
  department: string;
  priority: 'low' | 'medium' | 'high';
  tags: string[];
  customerId: string;
  resolution?: {
    resolvedAt: string;
    resolvedBy: string;
    solution: string;
  };
}

const thread = await threadClient.createThread(request, {
  title: 'Technical Issue',
  metadata: {
    department: 'engineering',
    priority: 'high',
    tags: ['bug', 'production'],
    customerId: 'cust-123',
  } satisfies CustomMetadata,
});
```

### Search Capabilities

Search across threads:

```typescript
// Search in titles and metadata
const { threads } = await threadClient.listThreads(request, {
  search: 'payment error',
  orderBy: 'createdAt',
  orderDirection: 'desc',
});

// Filter by user and organization automatically
// based on getUserContext
```

### Real-time Updates

Threads are stored in the cloud and updates are immediately available:

```typescript
// Update in one location
await threadClient.updateThread(request, threadId, {
  metadata: { status: 'in-progress' },
});

// Immediately available elsewhere
const updated = await threadClient.getThread(request, threadId);
console.log(updated.metadata.status); // 'in-progress'
```

## Usage Patterns

### Customer Support System

```typescript
// Create support thread
const supportThread = await threadClient.createThread(request, {
  title: `Support: ${customerIssue.subject}`,
  metadata: {
    customerId: customer.id,
    issueType: customerIssue.type,
    priority: calculatePriority(customerIssue),
    assignedAgent: null,
    status: 'open',
    sla: {
      responseTime: '2h',
      resolutionTime: '24h',
    },
  },
});

// Assign to agent
await threadClient.updateThread(request, supportThread.id, {
  metadata: {
    ...supportThread.metadata,
    assignedAgent: agentId,
    status: 'assigned',
    assignedAt: new Date().toISOString(),
  },
});
```

### AI Assistant Conversations

```typescript
// Create AI conversation thread
const aiThread = await threadClient.createThread(request, {
  title: 'AI Assistant Session',
  metadata: {
    model: 'gpt-4',
    systemPrompt: 'You are a helpful assistant...',
    maxTokens: 2000,
    temperature: 0.7,
    tools: ['web_search', 'calculator'],
  },
});

// Track conversation metrics
await threadClient.updateThread(request, aiThread.id, {
  metadata: {
    ...aiThread.metadata,
    metrics: {
      messageCount: 10,
      tokensUsed: 1500,
      toolCalls: 3,
      duration: 300, // seconds
    },
  },
});
```

### Project Collaboration

```typescript
// Create project thread
const projectThread = await threadClient.createThread(request, {
  title: project.name,
  metadata: {
    projectId: project.id,
    team: project.teamMembers,
    milestone: project.currentMilestone,
    dueDate: project.deadline,
    labels: project.labels,
    visibility: 'team', // or 'private', 'organization'
  },
});
```

## Error Handling

The adapter provides detailed error information:

```typescript
try {
  await threadClient.createThread(request, data);
} catch (error) {
  if (error.code === 'LANGGRAPH_AUTH_ERROR') {
    // Invalid API key or unauthorized
  } else if (error.code === 'LANGGRAPH_NOT_FOUND') {
    // Assistant not found
  } else if (error.code === 'RATE_LIMIT_EXCEEDED') {
    // Too many requests
  } else {
    // Other errors
  }
}
```

## Performance Considerations

### Caching

The adapter doesn't cache by default. Implement caching at the application level:

```typescript
import { LRUCache } from 'lru-cache';

const threadCache = new LRUCache<string, Thread>({
  max: 500,
  ttl: 1000 * 60 * 5, // 5 minutes
});

// Wrap thread client methods
async function getCachedThread(threadId: string) {
  const cached = threadCache.get(threadId);
  if (cached) return cached;

  const thread = await threadClient.getThread(request, threadId);
  if (thread) threadCache.set(threadId, thread);
  return thread;
}
```

### Batch Operations

For bulk operations, consider batching:

```typescript
// Instead of individual creates
for (const data of threadsData) {
  await threadClient.createThread(request, data);
}

// Consider parallel execution
await Promise.all(threadsData.map((data) => threadClient.createThread(request, data)));
```

### Rate Limiting

Respect LangGraph Cloud rate limits:

```typescript
import pLimit from 'p-limit';

// Limit concurrent requests
const limit = pLimit(5);

const threads = await Promise.all(
  threadIds.map((id) => limit(() => threadClient.getThread(request, id))),
);
```

## Migration Guide

### From Local Database

```typescript
// Export from local database
const localThreads = await db.select().from(threads);

// Import to LangGraph Cloud
for (const thread of localThreads) {
  await adapter.create({
    model: 'thread',
    data: {
      id: thread.id, // Preserve IDs if needed
      title: thread.title,
      userId: thread.userId,
      organizationId: thread.organizationId,
      metadata: {
        ...thread.metadata,
        migratedFrom: 'local-db',
        migratedAt: new Date().toISOString(),
      },
      createdAt: thread.createdAt,
      updatedAt: thread.updatedAt,
    },
  });
}
```

### From Other Cloud Services

```typescript
// Map from other service format
const mappedThread = {
  title: otherService.thread.name,
  userId: otherService.thread.ownerId,
  metadata: {
    originalId: otherService.thread.id,
    originalService: 'other-cloud',
    ...otherService.thread.properties,
  },
};

await threadClient.createThread(request, mappedThread);
```

## Best Practices

### 1. Use Metadata Effectively

```typescript
// Good: Structured metadata
metadata: {
  category: 'support',
  subcategory: 'billing',
  tags: ['urgent', 'customer'],
  internal: {
    notes: 'Escalated by manager',
    previousTickets: ['T-123', 'T-456'],
  },
}

// Avoid: Unstructured data
metadata: {
  data: 'support billing urgent', // Hard to query
}
```

### 2. Handle Network Failures

```typescript
import { retry } from '@lifeomic/attempt';

async function resilientCreateThread(data: CreateThreadData) {
  return retry(async () => threadClient.createThread(request, data), {
    maxAttempts: 3,
    delay: 1000,
    factor: 2,
    handleError: (error, context) => {
      console.log(`Attempt ${context.attemptNum} failed:`, error);
    },
  });
}
```

### 3. Monitor Usage

```typescript
// Track API usage
let apiCalls = 0;

const monitoredAdapter = new Proxy(adapter, {
  get(target, prop) {
    if (typeof target[prop] === 'function') {
      return async (...args) => {
        apiCalls++;
        console.log(`API call: ${prop}, Total: ${apiCalls}`);
        return target[prop](...args);
      };
    }
    return target[prop];
  },
});
```

## Limitations

- **Search**: Limited to basic text search in title and metadata
- **Filtering**: No complex query operators like SQL
- **Bulk Operations**: No native batch API
- **Transactions**: No transaction support
- **Real-time**: No WebSocket/subscription support

## Next Steps

- Review the [API Reference](./api.md) for detailed method documentation
- See [Examples](./examples.md) for real-world usage patterns
- Learn about [Integration Patterns](./guides/integration.md)
- Explore [Migration Guide](./guides/migration.md)
