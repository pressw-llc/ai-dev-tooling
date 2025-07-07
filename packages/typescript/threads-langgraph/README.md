# @pressw/threads-langgraph

LangGraph Cloud adapter for PressW thread management system.

## Installation

```bash
npm install @pressw/threads-langgraph @pressw/threads
# or
yarn add @pressw/threads-langgraph @pressw/threads
# or
bun add @pressw/threads-langgraph @pressw/threads
```

## Usage

```typescript
import { createLangGraphAdapter } from '@pressw/threads-langgraph';
import { ThreadUtilityClient } from '@pressw/threads';

// Initialize the adapter
const adapter = createLangGraphAdapter({
  apiUrl: process.env.LANGGRAPH_API_URL!,
  apiKey: process.env.LANGSMITH_API_KEY!,
  assistantId: 'your-assistant-id', // Optional
});

// Create a thread client
const threadClient = new ThreadUtilityClient(adapter, async (request) => {
  // Your user context extraction logic
  return {
    userId: 'user123',
    organizationId: 'org456',
  };
});

// Use the thread client
const thread = await threadClient.createThread(request, {
  title: 'New Conversation',
  metadata: { source: 'web' },
});
```

## Features

- Full compatibility with @pressw/threads adapter interface
- Automatic thread state synchronization with LangGraph Cloud
- Support for thread metadata and history
- Batch operations support
- Real-time streaming capabilities

## Configuration

The adapter accepts the following configuration options:

```typescript
interface LangGraphAdapterConfig {
  // LangGraph Cloud API URL
  apiUrl: string;

  // LangSmith API key
  apiKey: string;

  // Optional assistant ID for runs
  assistantId?: string;

  // Optional default headers
  defaultHeaders?: Record<string, string>;

  // Adapter configuration
  usePlural?: boolean;
  debugLogs?: boolean;
  mapKeysInput?: Record<string, string>;
  mapKeysOutput?: Record<string, string>;
}
```

## API Reference

See the [API documentation](./API.md) for detailed information about available methods and options.
