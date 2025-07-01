import { useEffect, useMemo, useCallback, useState } from 'react';
import { useCopilotReadable } from '@copilotkit/react-core';
import type { UseAIContextOptions, AIContextItem } from '../types';
import { useThread } from '../../react/thread-hooks';

/**
 * Maximum context size in characters to prevent overwhelming the AI model
 */
const MAX_CONTEXT_SIZE = 50000;

/**
 * Default context priority for thread data
 */
const THREAD_CONTEXT_PRIORITY = 5;

/**
 * Hook return type for useAIContext
 */
export interface UseAIContextReturn {
  /** All context items currently registered with the AI */
  contextItems: AIContextItem[];
  /** Total size of context in characters */
  contextSize: number;
  /** Whether context size exceeds recommended limits */
  isContextOversize: boolean;
  /** Register additional context items dynamically */
  addContextItem: (item: AIContextItem) => void;
  /** Remove context items by name */
  removeContextItem: (name: string) => void;
  /** Clear all dynamic context items (keeps thread/user context) */
  clearDynamicContext: () => void;
  /** Get context summary for debugging */
  getContextSummary: () => {
    totalItems: number;
    totalSize: number;
    itemsByPriority: Record<number, number>;
  };
}

/**
 * Custom hook for managing AI context data with CopilotKit integration.
 *
 * This hook handles:
 * - Context item registration and management
 * - Priority-based context sorting
 * - Thread-aware context (automatically includes thread data)
 * - Context size management and optimization
 * - Integration with CopilotKit's useCopilotReadable
 *
 * @param options - Configuration options for the AI context
 * @returns Object with context management functions and state
 */
export function useAIContext(options: UseAIContextOptions): UseAIContextReturn {
  const { context, threadId } = options;

  // Fetch thread data if threadId is provided
  const { data: thread } = useThread(threadId || '', {
    enabled: !!threadId,
  });

  // State for dynamic context items (items added at runtime)
  const [dynamicContextItems, setDynamicContextItems] = useState<AIContextItem[]>([]);

  // Create thread context item if thread data is available
  const threadContextItem = useMemo((): AIContextItem | null => {
    if (!thread) return null;

    return {
      name: 'current_thread',
      description: `Current thread: "${thread.title}" with metadata and conversation history`,
      data: {
        id: thread.id,
        title: thread.title,
        metadata: thread.metadata,
        createdAt: thread.createdAt,
        updatedAt: thread.updatedAt,
        // Include summary information for better AI understanding
        summary: `Thread "${thread.title}" created ${thread.createdAt.toLocaleDateString()}`,
      },
      priority: THREAD_CONTEXT_PRIORITY,
    };
  }, [thread]);

  // Combine all context items and sort by priority (higher priority first)
  const allContextItems = useMemo(() => {
    const items: AIContextItem[] = [];

    // Add provided context items
    items.push(...context);

    // Add dynamic context items
    items.push(...dynamicContextItems);

    // Add thread context if available
    if (threadContextItem) {
      items.push(threadContextItem);
    }

    // Sort by priority (higher priority first), then by name for consistency
    return items.sort((a, b) => {
      const priorityDiff = (b.priority || 1) - (a.priority || 1);
      if (priorityDiff !== 0) return priorityDiff;
      return a.name.localeCompare(b.name);
    });
  }, [context, dynamicContextItems, threadContextItem]);

  // Calculate total context size
  const contextSize = useMemo(() => {
    return allContextItems.reduce((total, item) => {
      // Serialize the item data to calculate approximate size
      const itemSize = JSON.stringify({
        name: item.name,
        description: item.description,
        data: item.data,
      }).length;
      return total + itemSize;
    }, 0);
  }, [allContextItems]);

  // Check if context is oversized
  const isContextOversize = contextSize > MAX_CONTEXT_SIZE;

  // Optimize context items if oversized by removing lower priority items
  const optimizedContextItems = useMemo(() => {
    if (!isContextOversize) return allContextItems;

    // Keep high priority items and trim lower priority ones
    let runningSize = 0;
    const optimized: AIContextItem[] = [];

    for (const item of allContextItems) {
      const itemSize = JSON.stringify({
        name: item.name,
        description: item.description,
        data: item.data,
      }).length;

      if (runningSize + itemSize <= MAX_CONTEXT_SIZE) {
        optimized.push(item);
        runningSize += itemSize;
      } else {
        // If this is a high priority item (>= 5), try to include it anyway
        if ((item.priority || 1) >= 5) {
          optimized.push(item);
        }
        break;
      }
    }

    return optimized;
  }, [allContextItems, isContextOversize]);

  // Register context with CopilotKit
  useCopilotReadable({
    description: 'Application context and thread data for AI assistant',
    value: optimizedContextItems.reduce(
      (acc, item) => {
        acc[item.name] = {
          description: item.description,
          data: item.data,
          priority: item.priority || 1,
        };
        return acc;
      },
      {} as Record<string, { description: string; data: unknown; priority: number }>,
    ),
  });

  // Add context item dynamically
  const addContextItem = useCallback((item: AIContextItem) => {
    setDynamicContextItems((prev) => {
      // Remove existing item with same name to avoid duplicates
      const filtered = prev.filter((existing) => existing.name !== item.name);
      return [...filtered, item];
    });
  }, []);

  // Remove context item by name
  const removeContextItem = useCallback((name: string) => {
    setDynamicContextItems((prev) => prev.filter((item) => item.name !== name));
  }, []);

  // Clear all dynamic context items
  const clearDynamicContext = useCallback(() => {
    setDynamicContextItems([]);
  }, []);

  // Get context summary for debugging
  const getContextSummary = useCallback(() => {
    const itemsByPriority = allContextItems.reduce(
      (acc, item) => {
        const priority = item.priority || 1;
        acc[priority] = (acc[priority] || 0) + 1;
        return acc;
      },
      {} as Record<number, number>,
    );

    return {
      totalItems: allContextItems.length,
      totalSize: contextSize,
      itemsByPriority,
    };
  }, [allContextItems, contextSize]);

  // Log warnings for oversized context
  useEffect(() => {
    if (isContextOversize) {
      console.warn(
        `AI context size (${contextSize} chars) exceeds recommended limit (${MAX_CONTEXT_SIZE} chars). ` +
          `Some lower priority context items may be excluded. Consider reducing context data or increasing priorities for important items.`,
      );
    }
  }, [isContextOversize, contextSize]);

  return {
    contextItems: optimizedContextItems,
    contextSize,
    isContextOversize,
    addContextItem,
    removeContextItem,
    clearDynamicContext,
    getContextSummary,
  };
}

/**
 * Utility function to create context items with proper validation
 */
export function createContextItem(
  name: string,
  description: string,
  data: unknown,
  priority = 1,
): AIContextItem {
  return {
    name: name.trim(),
    description: description.trim(),
    data,
    priority: Math.max(1, Math.min(10, priority)), // Clamp priority between 1-10
  };
}

/**
 * Utility function to estimate context item size
 */
export function estimateContextItemSize(item: AIContextItem): number {
  return JSON.stringify({
    name: item.name,
    description: item.description,
    data: item.data,
  }).length;
}

/**
 * Utility function to validate context items
 */
export function validateContextItems(items: AIContextItem[]): {
  valid: AIContextItem[];
  invalid: Array<{ item: AIContextItem; error: string }>;
} {
  const valid: AIContextItem[] = [];
  const invalid: Array<{ item: AIContextItem; error: string }> = [];

  for (const item of items) {
    try {
      // Validate required fields
      if (!item.name || typeof item.name !== 'string') {
        invalid.push({ item, error: 'Context item name is required and must be a string' });
        continue;
      }

      if (!item.description || typeof item.description !== 'string') {
        invalid.push({ item, error: 'Context item description is required and must be a string' });
        continue;
      }

      // Validate priority
      if (
        item.priority !== undefined &&
        (typeof item.priority !== 'number' || item.priority < 1 || item.priority > 10)
      ) {
        invalid.push({ item, error: 'Context item priority must be a number between 1 and 10' });
        continue;
      }

      // Check for serializable data
      try {
        JSON.stringify(item.data);
      } catch {
        invalid.push({ item, error: 'Context item data must be serializable to JSON' });
        continue;
      }

      valid.push(item);
    } catch (error) {
      invalid.push({
        item,
        error: `Context item validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }

  return { valid, invalid };
}
