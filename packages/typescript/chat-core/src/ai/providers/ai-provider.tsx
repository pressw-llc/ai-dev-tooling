import React, { createContext, useContext, useMemo } from 'react';
import { CopilotKit } from '@copilotkit/react-core';
import type { AIProviderProps, AIProviderConfig, AIChatConfig } from '../types';
import { AIError, AI_ERROR_CODES } from '../types';

// Context for AI configuration
interface AIContextValue {
  config: AIProviderConfig;
  chatConfig: AIChatConfig;
  copilotKitUrl: string;
}

const AIContext = createContext<AIContextValue | null>(null);

/**
 * Hook to access AI configuration context
 */
export const useAIConfig = (): AIContextValue => {
  const context = useContext(AIContext);
  if (!context) {
    throw new AIError(
      'useAIConfig must be used within an AIProvider',
      AI_ERROR_CODES.INVALID_CONFIG,
    );
  }
  return context;
};

/**
 * AI Provider component that wraps CopilotKit and manages AI configuration
 *
 * This component provides the foundational AI capabilities by:
 * - Wrapping the CopilotKit provider with chat-core configuration
 * - Managing global AI settings and defaults
 * - Providing context to AI hooks throughout the component tree
 * - Handling CopilotKit initialization and error boundaries
 *
 * @param config - AI configuration including CopilotKit URL and global settings
 * @param children - React components that will have access to AI capabilities
 */
export const AIProvider: React.FC<AIProviderProps> = ({ config, children }) => {
  // Validate configuration
  const validatedConfig = useMemo(() => {
    if (!config) {
      throw new AIError(
        'AIProvider requires a valid configuration object',
        AI_ERROR_CODES.INVALID_CONFIG,
      );
    }
    return config;
  }, [config]);

  // Merge default chat configuration with provided config
  const chatConfig: AIChatConfig = useMemo(
    () => ({
      model: 'gpt-4',
      enableMemory: true,
      memoryLimit: 10,
      enableActions: true,
      enableSuggestions: true,
      ...validatedConfig.config,
    }),
    [validatedConfig.config],
  );

  // Determine CopilotKit URL
  const copilotKitUrl = useMemo(() => {
    return validatedConfig.copilotKitUrl || '/api/copilotkit';
  }, [validatedConfig.copilotKitUrl]);

  // Context value
  const contextValue: AIContextValue = useMemo(
    () => ({
      config: validatedConfig,
      chatConfig,
      copilotKitUrl,
    }),
    [validatedConfig, chatConfig, copilotKitUrl],
  );

  return (
    <AIContext.Provider value={contextValue}>
      <CopilotKit
        runtimeUrl={copilotKitUrl}
        headers={{
          'Content-Type': 'application/json',
        }}
      >
        {children}
      </CopilotKit>
    </AIContext.Provider>
  );
};

// Default export for convenience
export default AIProvider;
