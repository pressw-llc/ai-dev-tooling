---
sidebar_position: 3
---

# AI-Powered Chat

The `@pressw/chat-core` package provides intelligent chat capabilities that enable context-aware conversations, automated actions, and AI assistance within your threads. This system seamlessly integrates AI capabilities while maintaining the same familiar patterns as the core thread management API.

## Overview

The AI chat system extends your existing thread management with intelligent capabilities powered by [CopilotKit](https://github.com/CopilotKit/CopilotKit) under the hood:

- **Context-Aware Conversations**: AI understands your thread context and data
- **Intelligent Actions**: AI can perform operations on threads and user data
- **Smart Suggestions**: AI provides contextual suggestions for thread operations
- **Seamless Integration**: Works alongside existing thread hooks and components

> **Powered by CopilotKit**: chat-core uses [CopilotKit](https://copilotkit.ai) internally to provide AI capabilities while maintaining a unified API. CopilotKit handles the AI orchestration, and chat-core provides the business logic integration with your thread system.

## Core Features

### AI Chat Hook

The `useAIChat` hook provides intelligent chat capabilities within a thread context:

```typescript
import { useAIChat } from '@pressw/chat-core';

function ThreadChatComponent({ threadId }: { threadId: string }) {
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    suggestions
  } = useAIChat({
    threadId,
    initialSystemMessage: "You are an AI assistant helping with project management.",
  });

  return (
    <div>
      <div className="messages">
        {messages.map((message) => (
          <div key={message.id} className={`message ${message.role}`}>
            {message.content}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Type your message..."
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading}>
          Send
        </button>
      </form>

      {suggestions.length > 0 && (
        <div className="suggestions">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleInputChange({ target: { value: suggestion } })}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

### AI Actions

AI Actions allow the AI to perform operations on your application. These are automatically available to the AI based on your configuration:

```typescript
import { useAIActions } from '@pressw/chat-core';

function useProjectAIActions(projectId: string) {
  useAIActions({
    actions: [
      {
        name: 'createTask',
        description: 'Create a new task in the project',
        parameters: {
          title: { type: 'string', description: 'Task title' },
          description: { type: 'string', description: 'Task description' },
          priority: { type: 'string', enum: ['low', 'medium', 'high'] },
        },
        handler: async ({ title, description, priority }) => {
          const task = await createTask({
            projectId,
            title,
            description,
            priority,
          });
          return `Created task "${title}" with ID ${task.id}`;
        },
      },
      {
        name: 'updateThreadTitle',
        description: 'Update the current thread title',
        parameters: {
          title: { type: 'string', description: 'New thread title' },
        },
        handler: async ({ title }) => {
          // This integrates with existing thread hooks
          await updateThread(threadId, { title });
          return `Thread title updated to "${title}"`;
        },
      },
    ],
  });
}
```

### Context Providers

Make your application data available to the AI using context providers:

```typescript
import { useAIContext } from '@pressw/chat-core';

function ProjectProvider({ projectId, children }: { projectId: string, children: React.ReactNode }) {
  const { data: project } = useProject(projectId);
  const { data: tasks } = useProjectTasks(projectId);

  useAIContext({
    context: [
      {
        name: 'currentProject',
        description: 'Information about the current project',
        data: project
      },
      {
        name: 'projectTasks',
        description: 'List of tasks in the current project',
        data: tasks
      }
    ]
  });

  return <>{children}</>;
}
```

## Advanced Features

### Thread-Aware AI Provider

Wrap your application with the AI provider to enable AI features:

```typescript
import { AIProvider } from '@pressw/chat-core';

function App() {
  return (
    <AIProvider
      config={{
        apiKey: process.env.AI_API_KEY, // Your AI service API key
        model: 'gpt-4',
        systemMessage: 'You are a helpful assistant for project management.'
      }}
    >
      <QueryClient client={queryClient}>
        {/* Your app components */}
      </QueryClient>
    </AIProvider>
  );
}
```

### Thread Intelligence

Enable AI to understand and work with your thread data:

```typescript
import { useThreadIntelligence } from '@pressw/chat-core';

function IntelligentThread({ threadId }: { threadId: string }) {
  const {
    summary,
    suggestedActions,
    relatedThreads,
    isAnalyzing
  } = useThreadIntelligence({ threadId });

  return (
    <div>
      <h3>Thread Summary</h3>
      <p>{summary}</p>

      <h3>Suggested Actions</h3>
      <ul>
        {suggestedActions.map((action, index) => (
          <li key={index}>
            <button onClick={() => action.execute()}>
              {action.title}
            </button>
            <p>{action.description}</p>
          </li>
        ))}
      </ul>

      <h3>Related Threads</h3>
      <ul>
        {relatedThreads.map((thread) => (
          <li key={thread.id}>
            <a href={`/threads/${thread.id}`}>{thread.title}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Agent Definition

Define agents that work with your thread system. This follows CopilotKit's agent patterns while integrating with chat-core's adapter system:

```typescript
import { defineAgent } from '@pressw/chat-core';

const projectAgent = defineAgent({
  name: 'project-assistant',
  description: 'AI assistant for project management and thread organization',
  systemMessage: 'You help users manage projects and organize conversations in threads.',

  tools: [
    {
      name: 'create_thread',
      description: 'Create a new discussion thread',
      parameters: {
        title: { type: 'string', description: 'Thread title' },
        metadata: { type: 'object', description: 'Thread metadata' },
      },
      handler: async ({ title, metadata }, { userContext, adapter }) => {
        const thread = await adapter.create({
          model: 'thread',
          data: { title, metadata, ...userContext },
        });
        return `Created thread "${title}" with ID ${thread.id}`;
      },
    },
    {
      name: 'search_threads',
      description: 'Search existing threads',
      parameters: {
        query: { type: 'string', description: 'Search query' },
      },
      handler: async ({ query }, { userContext, adapter }) => {
        const threads = await adapter.findMany({
          model: 'thread',
          where: [
            { field: 'userId', value: userContext.userId },
            { field: 'title', value: query, operator: 'contains' },
          ],
        });
        return `Found ${threads.length} threads matching "${query}"`;
      },
    },
  ],
});

// Register the agent
export { projectAgent };
```

## CopilotKit Integration

chat-core integrates with [CopilotKit](https://github.com/CopilotKit/CopilotKit) to provide AI capabilities. CopilotKit is an open-source framework for building AI copilots and in-app AI agents.

### API Passthrough Handler

chat-core provides a passthrough handler that connects to CopilotKit's runtime while integrating with your thread system:

```typescript
// app/api/copilotkit/route.ts
import { createCopilotKitHandler } from '@pressw/chat-core/nextjs';
import { drizzleAdapter } from '../chat/adapter';
import { getUserContext } from '../chat/auth';
import { projectAgent } from './agents';

const handler = createCopilotKitHandler({
  adapter: drizzleAdapter,
  getUserContext,
  agents: [projectAgent],
  config: {
    model: 'gpt-4',
    systemMessage: 'You are an AI assistant for project management.',
  },
});

export const POST = handler;
```

### Client-Side Setup

Configure the AI provider in your app (this would typically use @pressw/chat-ui):

```typescript
// This example shows the business logic setup
// Actual UI components would come from @pressw/chat-ui
import { AIProvider } from '@pressw/chat-core';

function App() {
  return (
    <AIProvider
      config={{
        copilotKitUrl: '/api/copilotkit',
        agents: ['project-assistant']
      }}
    >
      {/* Your app components */}
      {/* UI components would come from @pressw/chat-ui */}
    </AIProvider>
  );
}
```

## Configuration

### AI Configuration Options

```typescript
interface AIConfig {
  apiKey: string; // Your AI service API key
  model?: string; // AI model to use (default: 'gpt-4')
  systemMessage?: string; // Default system message
  maxTokens?: number; // Maximum tokens per response
  temperature?: number; // Response creativity (0-1)
  enableMemory?: boolean; // Enable conversation memory
  memoryLimit?: number; // Max messages to remember
  enableActions?: boolean; // Enable AI actions
  enableSuggestions?: boolean; // Enable AI suggestions
  rateLimiting?: {
    maxRequests: number;
    windowMs: number;
  };
}
```

### Action Configuration

```typescript
interface AIAction {
  name: string; // Unique action name
  description: string; // What the action does
  parameters: {
    // Action parameters schema
    [key: string]: {
      type: string;
      description: string;
      enum?: string[];
      required?: boolean;
    };
  };
  handler: (params: any) => Promise<string>; // Action implementation
  requiresConfirmation?: boolean; // Require user confirmation
  permissions?: string[]; // Required permissions
}
```

## Integration with Existing Hooks

The AI features seamlessly integrate with your existing thread management:

```typescript
function useThreadAIIntegration(threadId: string) {
  // Existing thread hooks work as before
  const { data: thread } = useThread(threadId);
  const updateThread = useUpdateThread();

  // AI chat hook provides business logic
  const aiChat = useAIChat({
    threadId,
    context: { thread }, // AI knows about the thread
  });

  // AI actions integrate with existing mutations
  useAIActions({
    actions: [
      {
        name: 'updateTitle',
        description: 'Update thread title',
        handler: async ({ title }) => {
          await updateThread.mutateAsync({ id: threadId, updates: { title } });
          return `Updated thread title to "${title}"`;
        },
      },
    ],
  });

  return {
    thread,
    aiChat,
    // Business logic for UI components from @pressw/chat-ui
  };
}
```

## Best Practices

### 1. Context Management

Provide relevant context to improve AI responses:

```typescript
// Good: Specific, relevant context
useAIContext({
  context: [
    {
      name: 'currentUser',
      description: 'Information about the current user',
      data: { role: user.role, permissions: user.permissions },
    },
  ],
});

// Better: Include business context
useAIContext({
  context: [
    {
      name: 'projectContext',
      description: 'Current project and user role context',
      data: {
        project: project,
        userRole: user.role,
        recentActivity: recentActions.slice(0, 5),
      },
    },
  ],
});
```

### 2. Action Design

Design actions that are specific and safe:

```typescript
// Good: Specific action with validation
{
  name: 'markTaskComplete',
  description: 'Mark a specific task as completed',
  parameters: {
    taskId: { type: 'string', description: 'ID of the task to complete' }
  },
  handler: async ({ taskId }) => {
    if (!await canUserEditTask(userId, taskId)) {
      throw new Error('Permission denied');
    }
    await markTaskComplete(taskId);
    return `Task ${taskId} marked as complete`;
  }
}
```

### 3. Error Handling

Handle AI errors gracefully:

```typescript
function RobustAIChat({ threadId }: { threadId: string }) {
  const chat = useAIChat({
    threadId,
    onError: (error) => {
      if (error.code === 'RATE_LIMITED') {
        toast.error('Please wait before sending another message');
      } else if (error.code === 'CONTEXT_TOO_LARGE') {
        toast.error('Message too long, please shorten it');
      } else {
        toast.error('Sorry, something went wrong. Please try again.');
      }
    }
  });

  return <AIChatPanel {...chat} />;
}
```

## TypeScript Support

All AI features are fully typed:

```typescript
import type {
  AIMessage,
  AIAction,
  AIContext,
  AIChatOptions,
  AIProviderConfig,
} from '@pressw/chat-core';

// Type-safe action handlers
const createTaskAction: AIAction = {
  name: 'createTask',
  description: 'Create a new task',
  parameters: {
    title: { type: 'string', description: 'Task title' },
    dueDate: { type: 'string', description: 'Due date (ISO string)' },
  },
  handler: async ({ title, dueDate }) => {
    // TypeScript knows the parameter types
    const task = await createTask({
      title, // string
      dueDate: new Date(dueDate), // Date
    });
    return `Created task: ${task.id}`;
  },
};
```

## Next Steps

- [Thread Management](./threads) - Learn about core thread functionality
- [Database Adapters](./adapters/overview) - Set up your database integration
- **@pressw/chat-ui** - Pre-built UI components that use these business logic hooks
- [CopilotKit Documentation](https://docs.copilotkit.ai) - Learn more about the underlying AI framework
- [API Reference](./api) - Detailed API documentation
- [Examples](./examples) - See complete implementation examples
