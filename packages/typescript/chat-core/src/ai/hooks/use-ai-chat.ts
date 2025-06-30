import { useState, useCallback, useEffect, useRef } from 'react';
import { useThread, useCreateThread, useUpdateThread } from '../../react/thread-hooks';
import type {
  UseAIChatOptions,
  UseAIChatReturn,
  AIMessage,
  AIChatConfig,
  AIContextItem,
} from '../types';
import { AIError, AI_ERROR_CODES } from '../types';

// Type for CopilotKit integration (to be properly typed when available)
interface CopilotChatHook {
  messages: any[];
  isLoading: boolean;
  append: (message: { role: string; content: string }) => Promise<void>;
  setMessages: (messages: any[]) => void;
}

// Placeholder implementation of useCopilotChat
// TODO: Replace with actual CopilotKit useCopilotChat import once API is verified
// This mock provides the expected interface and simulates AI responses
function useCopilotChat(options: any): CopilotChatHook {
  const [messages, setMessages] = useState<any[]>(options.initialMessages || []);
  const [isLoading, setIsLoading] = useState(false);

  const append = useCallback(
    async (message: { role: string; content: string }) => {
      setIsLoading(true);
      try {
        // Add user message
        const userMessage = {
          id: `msg-${Date.now()}-user`,
          role: message.role,
          content: message.content,
        };

        setMessages((prev) => [...prev, userMessage]);

        // Simulate AI response
        setTimeout(() => {
          const aiMessage = {
            id: `msg-${Date.now()}-ai`,
            role: 'assistant',
            content: `Echo: ${message.content}`,
          };
          setMessages((prev) => [...prev, aiMessage]);
          setIsLoading(false);
        }, 1000);
      } catch (error) {
        setIsLoading(false);
        options.onError?.(error);
      }
    },
    [options],
  );

  return { messages, isLoading, append, setMessages };
}

/**
 * AI-powered chat hook that integrates CopilotKit with thread system
 *
 * This hook provides a unified interface for AI chat functionality, integrating:
 * - CopilotKit for AI responses (currently using a mock implementation)
 * - Thread system for conversation persistence
 * - Context injection for enhanced AI responses
 * - Suggestion generation based on conversation context
 * - Error handling and loading states
 *
 * @param options Configuration options for the AI chat
 * @returns Object containing chat state and handlers
 */
export function useAIChat(options: UseAIChatOptions = {}): UseAIChatReturn {
  const { threadId, initialSystemMessage, context = [], config = {}, onError } = options;

  // Thread management
  const { data: thread, isLoading: threadLoading } = useThread(threadId ?? '', {
    enabled: !!threadId,
  });
  const createThreadMutation = useCreateThread();
  const updateThreadMutation = useUpdateThread();

  // Local state
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [currentThreadId, setCurrentThreadId] = useState<string | undefined>(threadId);

  // Refs for stable callbacks
  const contextRef = useRef<AIContextItem[]>(context);
  const configRef = useRef<Partial<AIChatConfig>>(config);

  // Update refs when props change
  useEffect(() => {
    contextRef.current = context;
  }, [context]);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  // Build system message with context
  const buildSystemMessage = useCallback(() => {
    let systemMessage = initialSystemMessage || 'You are a helpful AI assistant.';

    if (contextRef.current.length > 0) {
      const contextString = contextRef.current
        .sort((a, b) => (b.priority || 1) - (a.priority || 1))
        .map((item) => `${item.name}: ${item.description}\nData: ${JSON.stringify(item.data)}`)
        .join('\n\n');

      systemMessage += '\n\nContext:\n' + contextString;
    }

    return systemMessage;
  }, [initialSystemMessage]);

  // CopilotKit integration
  const copilotChat = useCopilotChat({
    instructions: buildSystemMessage(),
    initialMessages: messages.map((msg) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
    })),
    onError: (copilotError: Error) => {
      const aiError = new AIError(copilotError.message, AI_ERROR_CODES.COPILOTKIT_ERROR, {
        originalError: copilotError,
      });
      setError(aiError);
      onError?.(aiError);
    },
  });

  // Convert CopilotKit messages to AIMessage format
  const convertMessages = useCallback(
    (copilotMessages: any[]): AIMessage[] => {
      return copilotMessages.map((msg) => ({
        id: msg.id || `msg-${Date.now()}-${Math.random()}`,
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
        timestamp: new Date(),
        threadId: currentThreadId,
        metadata: msg.metadata,
      }));
    },
    [currentThreadId],
  );

  // Sync messages from CopilotKit
  useEffect(() => {
    if (copilotChat.messages) {
      const convertedMessages = convertMessages(copilotChat.messages);
      setMessages(convertedMessages);
    }
  }, [copilotChat.messages, convertMessages]);

  // Load messages from thread if available
  useEffect(() => {
    if (thread?.metadata && typeof thread.metadata === 'object' && thread.metadata !== null) {
      const metadata = thread.metadata as Record<string, any>;
      if (metadata.messages && Array.isArray(metadata.messages)) {
        const threadMessages = metadata.messages as AIMessage[];
        setMessages(threadMessages);
      }
    }
  }, [thread]);

  // Update loading state
  useEffect(() => {
    setIsLoading(copilotChat.isLoading || threadLoading);
  }, [copilotChat.isLoading, threadLoading]);

  // Generate suggestions based on conversation context
  const generateSuggestions = useCallback(async (currentMessages: AIMessage[]) => {
    if (!configRef.current.enableSuggestions) {
      setSuggestions([]);
      return;
    }

    try {
      // Simple suggestion logic based on last assistant message
      const lastAssistantMessage = currentMessages.filter((msg) => msg.role === 'assistant').pop();

      if (lastAssistantMessage) {
        // Generate contextual suggestions
        const baseSuggestions = [
          'Can you explain that further?',
          'What are the next steps?',
          'Can you provide an example?',
        ];

        // Add content-specific suggestions
        const content = lastAssistantMessage.content.toLowerCase();
        const contextualSuggestions: string[] = [];

        if (content.includes('error') || content.includes('issue')) {
          contextualSuggestions.push('How can I fix this?');
        }
        if (content.includes('code') || content.includes('function')) {
          contextualSuggestions.push('Show me the code');
        }
        if (content.includes('documentation') || content.includes('docs')) {
          contextualSuggestions.push('Where can I find more documentation?');
        }

        setSuggestions([...contextualSuggestions, ...baseSuggestions].slice(0, 3));
      } else {
        setSuggestions([]);
      }
    } catch (err) {
      console.warn('Failed to generate suggestions:', err);
      setSuggestions([]);
    }
  }, []);

  // Persist messages to thread
  const persistMessages = useCallback(
    async (newMessages: AIMessage[]) => {
      if (!currentThreadId) return;

      try {
        await updateThreadMutation.mutateAsync({
          id: currentThreadId,
          updates: {
            metadata: {
              ...(thread?.metadata && typeof thread.metadata === 'object'
                ? (thread.metadata as Record<string, any>)
                : {}),
              messages: newMessages,
              lastActivity: new Date().toISOString(),
            },
          },
        });
      } catch (err) {
        console.warn('Failed to persist messages to thread:', err);
      }
    },
    [currentThreadId, thread?.metadata, updateThreadMutation],
  );

  // Update messages with persistence and suggestions
  useEffect(() => {
    if (messages.length > 0) {
      persistMessages(messages);
      generateSuggestions(messages);
    }
  }, [messages, persistMessages, generateSuggestions]);

  // Create thread if sending message without threadId
  const ensureThread = useCallback(async (): Promise<string> => {
    if (currentThreadId) return currentThreadId;

    try {
      const newThread = await createThreadMutation.mutateAsync({
        title: input.slice(0, 50) + (input.length > 50 ? '...' : '') || 'New Conversation',
        metadata: { createdByAI: true },
      });

      setCurrentThreadId(newThread.id);
      return newThread.id;
    } catch (err) {
      throw new AIError(
        'Failed to create thread for conversation',
        AI_ERROR_CODES.THREAD_NOT_FOUND,
        { originalError: err },
      );
    }
  }, [currentThreadId, input, createThreadMutation]);

  // Handle input change
  const handleInputChange = useCallback((event: { target: { value: string } }) => {
    setInput(event.target.value);
    setError(null);
  }, []);

  // Send message
  const sendMessage = useCallback(
    async (message: string) => {
      if (!message.trim()) return;

      try {
        setError(null);

        // Ensure we have a thread
        const activeThreadId = await ensureThread();

        // Send message through CopilotKit
        await copilotChat.append({
          role: 'user',
          content: message,
        });

        // Clear input
        setInput('');
      } catch (err) {
        const aiError =
          err instanceof AIError
            ? err
            : new AIError('Failed to send message', AI_ERROR_CODES.ACTION_FAILED, {
                originalError: err,
              });
        setError(aiError);
        onError?.(aiError);
      }
    },
    [copilotChat, ensureThread, onError],
  );

  // Handle form submit
  const handleSubmit = useCallback(
    async (event?: React.FormEvent) => {
      event?.preventDefault();
      if (input.trim()) {
        await sendMessage(input);
      }
    },
    [input, sendMessage],
  );

  // Clear messages
  const clearMessages = useCallback(() => {
    copilotChat.setMessages([]);
    setMessages([]);
    setSuggestions([]);
    setError(null);
  }, [copilotChat]);

  // Apply suggestion
  const applySuggestion = useCallback((suggestion: string) => {
    setInput(suggestion);
    setError(null);
  }, []);

  return {
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
  };
}
