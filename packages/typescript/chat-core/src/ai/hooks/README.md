# AI Hooks

This directory contains React hooks for AI functionality integration within the chat-core package.

## useAIChat

The `useAIChat` hook provides AI-powered chat functionality with thread system integration.

### Basic Usage

```typescript
import { useAIChat } from '@pressw/chat-core/ai/hooks';

function ChatComponent() {
  const {
    messages,
    input,
    isLoading,
    error,
    suggestions,
    handleInputChange,
    handleSubmit,
    sendMessage,
    clearMessages,
    applySuggestion,
  } = useAIChat();

  return (
    <div>
      <div>
        {messages.map((message) => (
          <div key={message.id}>
            <strong>{message.role}:</strong> {message.content}
          </div>
        ))}
      </div>

      {suggestions.length > 0 && (
        <div>
          {suggestions.map((suggestion, index) => (
            <button key={index} onClick={() => applySuggestion(suggestion)}>
              {suggestion}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Type your message..."
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading || !input.trim()}>
          {isLoading ? 'Sending...' : 'Send'}
        </button>
      </form>

      {error && <div>Error: {error.message}</div>}
    </div>
  );
}
```

### Advanced Usage with Thread Integration

```typescript
import { useAIChat } from '@pressw/chat-core/ai/hooks';

function ThreadedChatComponent({ threadId }: { threadId?: string }) {
  const { messages, input, isLoading, sendMessage, handleInputChange, handleSubmit } = useAIChat({
    threadId, // Messages will be persisted to this thread
    initialSystemMessage: 'You are a helpful coding assistant.',
    context: [
      {
        name: 'user_project',
        description: 'Current project context',
        data: { framework: 'React', language: 'TypeScript' },
        priority: 2,
      },
    ],
    config: {
      model: 'gpt-4',
      temperature: 0.7,
      enableSuggestions: true,
    },
    onError: (error) => {
      console.error('Chat error:', error);
    },
  });

  // Component implementation...
}
```

### Hook Options

- `threadId?: string` - Optional thread ID for message persistence
- `initialSystemMessage?: string` - System message to initialize the AI
- `context?: AIContextItem[]` - Context items to provide to the AI
- `config?: Partial<AIChatConfig>` - AI configuration options
- `onError?: (error: Error) => void` - Error handler callback

### Return Values

- `messages: AIMessage[]` - Array of conversation messages
- `input: string` - Current input value
- `isLoading: boolean` - Loading state indicator
- `error: Error | null` - Current error state
- `suggestions: string[]` - AI-generated suggestions
- `handleInputChange: (event) => void` - Input change handler
- `handleSubmit: (event?) => Promise<void>` - Form submit handler
- `sendMessage: (message: string) => Promise<void>` - Send message function
- `clearMessages: () => void` - Clear all messages
- `applySuggestion: (suggestion: string) => void` - Apply suggestion to input

## Features

### Thread Integration

- Automatic thread creation when no threadId is provided
- Message persistence to thread metadata
- Loading of existing messages from threads

### Context System

- Support for multiple context items with priorities
- Automatic system message generation with context
- Context-aware AI responses

### Suggestion System

- Context-based suggestion generation
- Default suggestions for common actions
- Configurable suggestion enablement

### Error Handling

- Comprehensive error types and codes
- Custom error handlers
- Graceful degradation on failures

## CopilotKit Integration

Currently, the hook uses a placeholder implementation for CopilotKit integration. This provides:

- Simulated AI responses for development
- Correct interface matching for future CopilotKit integration
- Echo responses for testing purposes

To integrate with actual CopilotKit:

1. Verify CopilotKit API compatibility
2. Replace the placeholder `useCopilotChat` function
3. Update imports to use `import { useCopilotChat } from '@copilotkit/react-core'`

## Testing

The hook includes comprehensive test coverage for:

- Type safety and interface compliance
- Message handling and validation
- Context processing and prioritization
- Error handling scenarios
- Suggestion generation logic
- Thread integration patterns

Run tests with:

```bash
bun test test/ai/use-ai-chat.test.ts
```
