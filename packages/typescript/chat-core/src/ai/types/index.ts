// Core AI types for chat-core CopilotKit integration
import { z } from 'zod';
import type { Thread } from '../../schema';
import type { UserContext } from '../../types';
import type { ChatCoreAdapter } from '../../adapters/types';

// ========================================
// Message Types
// ========================================

export const AIMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  timestamp: z.date().optional(),
  threadId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type AIMessage = z.infer<typeof AIMessageSchema>;

// ========================================
// Chat Configuration
// ========================================

export const AIChatConfigSchema = z.object({
  model: z.string().optional().default('gpt-4'),
  systemMessage: z.string().optional(),
  maxTokens: z.number().positive().optional(),
  temperature: z.number().min(0).max(1).optional(),
  enableMemory: z.boolean().optional().default(true),
  memoryLimit: z.number().positive().optional().default(10),
  enableActions: z.boolean().optional().default(true),
  enableSuggestions: z.boolean().optional().default(true),
  rateLimiting: z
    .object({
      maxRequests: z.number().positive(),
      windowMs: z.number().positive(),
    })
    .optional(),
});

export type AIChatConfig = z.infer<typeof AIChatConfigSchema>;

// ========================================
// Action System Types
// ========================================

export const AIActionParameterSchema = z.object({
  type: z.string(),
  description: z.string(),
  enum: z.array(z.string()).optional(),
  required: z.boolean().optional(),
});

export const AIActionSchema = z.object({
  name: z.string(),
  description: z.string(),
  parameters: z.record(AIActionParameterSchema),
  requiresConfirmation: z.boolean().optional().default(false),
  permissions: z.array(z.string()).optional(),
});

export type AIActionParameter = z.infer<typeof AIActionParameterSchema>;
export type AIAction = z.infer<typeof AIActionSchema>;

// Action handler context
export interface AIActionContext {
  userContext: UserContext;
  adapter: ChatCoreAdapter;
  threadId?: string;
  thread?: Thread;
}

// Action handler function type
export type AIActionHandler<TParams = Record<string, unknown>> = (
  params: TParams,
  context: AIActionContext,
) => Promise<string>;

// Complete action definition
export interface AIActionDefinition extends AIAction {
  handler: AIActionHandler;
}

// ========================================
// Context System Types
// ========================================

export const AIContextItemSchema = z.object({
  name: z.string(),
  description: z.string(),
  data: z.unknown(),
  priority: z.number().optional().default(1),
});

export type AIContextItem = z.infer<typeof AIContextItemSchema>;

// ========================================
// Agent System Types
// ========================================

export const AIAgentToolSchema = z.object({
  name: z.string(),
  description: z.string(),
  parameters: z.record(AIActionParameterSchema),
});

export const AIAgentSchema = z.object({
  name: z.string(),
  description: z.string(),
  systemMessage: z.string().optional(),
  tools: z.array(AIAgentToolSchema),
  config: AIChatConfigSchema.optional(),
});

export type AIAgentTool = z.infer<typeof AIAgentToolSchema>;
export type AIAgent = z.infer<typeof AIAgentSchema>;

// Agent tool handler
export type AIAgentToolHandler<TParams = Record<string, unknown>> = (
  params: TParams,
  context: AIActionContext,
) => Promise<string>;

// Complete agent tool definition
export interface AIAgentToolDefinition extends AIAgentTool {
  handler: AIAgentToolHandler;
}

// Complete agent definition
export interface AIAgentDefinition extends Omit<AIAgent, 'tools'> {
  tools: AIAgentToolDefinition[];
}

// ========================================
// Hook Types
// ========================================

// useAIChat hook options
export interface UseAIChatOptions {
  threadId?: string;
  initialSystemMessage?: string;
  context?: AIContextItem[];
  config?: Partial<AIChatConfig>;
  onError?: (error: Error) => void;
}

// useAIChat hook return type
export interface UseAIChatReturn {
  messages: AIMessage[];
  input: string;
  isLoading: boolean;
  error: Error | null;
  suggestions: string[];
  handleInputChange: (event: { target: { value: string } }) => void;
  handleSubmit: (event?: React.FormEvent) => Promise<void>;
  sendMessage: (message: string) => Promise<void>;
  clearMessages: () => void;
  applySuggestion: (suggestion: string) => void;
}

// useAIActions hook options
export interface UseAIActionsOptions {
  actions: AIActionDefinition[];
  threadId?: string;
  enabled?: boolean;
  userContext: UserContext;
  adapter: ChatCoreAdapter;
}

// useAIContext hook options
export interface UseAIContextOptions {
  context: AIContextItem[];
  threadId?: string;
}

// useThreadIntelligence hook options
export interface UseThreadIntelligenceOptions {
  threadId: string;
  enabled?: boolean;
}

// useThreadIntelligence hook return type
export interface UseThreadIntelligenceReturn {
  summary: string | null;
  suggestedActions: Array<{
    title: string;
    description: string;
    execute: () => Promise<void>;
  }>;
  relatedThreads: Thread[];
  isAnalyzing: boolean;
  error: Error | null;
}

// ========================================
// Provider Types
// ========================================

export interface AIProviderConfig {
  copilotKitUrl?: string;
  agents?: string[];
  config?: AIChatConfig;
}

export interface AIProviderProps {
  config: AIProviderConfig;
  children: React.ReactNode;
}

// ========================================
// API Handler Types
// ========================================

export interface CopilotKitHandlerConfig {
  adapter: ChatCoreAdapter;
  getUserContext: (request: Request) => Promise<UserContext>;
  agents?: AIAgentDefinition[];
  config?: AIChatConfig;
}

// ========================================
// Error Types
// ========================================

export class AIError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AIError';
  }
}

export const AI_ERROR_CODES = {
  RATE_LIMITED: 'RATE_LIMITED',
  CONTEXT_TOO_LARGE: 'CONTEXT_TOO_LARGE',
  ACTION_FAILED: 'ACTION_FAILED',
  INVALID_CONFIG: 'INVALID_CONFIG',
  COPILOTKIT_ERROR: 'COPILOTKIT_ERROR',
  THREAD_NOT_FOUND: 'THREAD_NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
} as const;

export type AIErrorCode = (typeof AI_ERROR_CODES)[keyof typeof AI_ERROR_CODES];

// ========================================
// Utility Types
// ========================================

// Extract handler params from action definition
export type ActionParams<T extends AIActionDefinition> = T extends AIActionDefinition
  ? Parameters<T['handler']>[0]
  : never;

// Re-export important types for AI module
export type { UserContext } from '../../types';
export type { Thread } from '../../schema';
export type { ChatCoreAdapter } from '../../adapters/types';
