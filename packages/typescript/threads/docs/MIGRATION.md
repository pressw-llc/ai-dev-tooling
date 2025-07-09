# Migration Guide: @pressw/chat-core to @pressw/threads

This guide helps you migrate from the old `@pressw/chat-core` package to the new `@pressw/threads` package.

## Overview of Changes

### 1. Package Rename

- **Old**: `@pressw/chat-core`
- **New**: `@pressw/threads`

### 2. Focus Shift

The library is now focused entirely on thread management. All AI and agent-specific features have been removed.

### 3. Import Changes

#### Core Imports

```typescript
// Old
import { ChatClient, ThreadUtilityClient } from '@pressw/chat-core';

// New
import { ThreadUtilityClient } from '@pressw/threads';
// Note: ChatClient has been removed
```

#### React Imports

```typescript
// Old
import { useThreads } from '@pressw/chat-core/react';

// New
import { useThreads, ThreadsProvider } from '@pressw/threads/react';
```

## Step-by-Step Migration

### 1. Update Dependencies

```bash
# Remove old package
npm uninstall @pressw/chat-core

# Install new package
npm install @pressw/threads
```

### 2. Add ThreadsProvider

The new package requires wrapping your app with `ThreadsProvider`:

```typescript
import { ThreadsProvider, createDrizzleAdapter } from '@pressw/threads';

function App() {
  const adapter = createDrizzleAdapter(db, 'pg');

  return (
    <ThreadsProvider
      config={{
        adapter,
        getUserContext: async (req) => ({
          userId: req.headers.get('x-user-id') || 'anonymous'
        }),
        apiBaseUrl: '/api/threads' // Default
      }}
    >
      <YourApp />
    </ThreadsProvider>
  );
}
```

### 3. Update API Endpoints

The default API endpoint has changed:

- **Old**: `/api/chat`
- **New**: `/api/threads`

Update your API client configuration if you were using custom endpoints:

```typescript
// Old
const client = new DefaultThreadApiClient({
  baseUrl: '/api/chat'
});

// New (in ThreadsProvider config)
<ThreadsProvider
  config={{
    adapter,
    getUserContext,
    apiBaseUrl: '/api/threads'
  }}
>
```

### 4. Update Imports

Update all imports throughout your codebase:

```typescript
// Old
import { Thread, Message } from '@pressw/chat-core';
import { useThreads, useCreateThread } from '@pressw/chat-core/react';

// New
import { Thread } from '@pressw/threads';
import { useThreads, useCreateThread } from '@pressw/threads/react';
// Note: Message type has been removed
```

## Breaking Changes

### 1. Removed Features

- All AI-related functionality (AIProvider, useAIChat, etc.)
- All agent-related functionality
- ChatClient class
- Message type and message-related functions
- CopilotKit integration

### 2. Required Configuration

- `ThreadsProvider` is now required to use React hooks
- `adapter` and `getUserContext` are required in ThreadsProvider config

### 3. API Changes

- Default API endpoint changed from `/api/chat` to `/api/threads`
- Some type names may have changed

## New Features

### 1. ThreadsProvider

A centralized provider for thread management configuration.

### 2. Better Type Safety

Improved TypeScript types for thread operations.

### 3. Cleaner API

Focused solely on thread management without AI/chat complexity.

## Common Migration Patterns

### Using Threads with Your Own Chat System

```typescript
// Store your chat messages separately
const messages = useChatMessages(threadId); // Your implementation

// Use threads for conversation management
const { data: thread } = useThread(threadId);
const updateThread = useUpdateThread();

// Update thread metadata when needed
const handleMessageSent = async (message) => {
  await sendMessage(message); // Your chat implementation

  await updateThread.mutateAsync({
    id: threadId,
    updates: {
      metadata: {
        lastMessageAt: new Date(),
        messageCount: messages.length + 1,
      },
    },
  });
};
```

### Custom Metadata Storage

```typescript
// Use metadata for any custom data
const createSupportTicket = async () => {
  const thread = await createThread.mutateAsync({
    title: 'Customer Issue',
    metadata: {
      type: 'support',
      priority: 'high',
      customerEmail: 'user@example.com',
      assignedTo: 'support-team',
      status: 'open',
    },
  });
};
```

## Need Help?

If you encounter issues during migration:

1. Check the [examples](../examples/) for implementation patterns
2. Review the [API documentation](./API.md)
3. Open an issue on [GitHub](https://github.com/pressw/ai-dev-tooling)
