import { useState, useEffect, useCallback, useMemo } from 'react';
import { useCopilotReadable, useCopilotAction } from '@copilotkit/react-core';
import { useThread, useThreads, useUpdateThread } from '../../react/thread-hooks';
import type { UseThreadIntelligenceOptions, UseThreadIntelligenceReturn } from '../types';
import type { Thread } from '../../schema';

/**
 * Hook for analyzing thread content and providing intelligent insights
 *
 * This hook uses CopilotKit to:
 * - Analyze thread content and metadata
 * - Generate intelligent summaries
 * - Suggest contextual actions
 * - Find related threads
 *
 * @param options - Configuration options for thread intelligence
 * @returns Thread intelligence data and functions
 */
export function useThreadIntelligence(
  options: UseThreadIntelligenceOptions,
): UseThreadIntelligenceReturn {
  const { threadId, enabled = true } = options;

  // Thread data hooks
  const {
    data: thread,
    isLoading: threadLoading,
    error: threadError,
  } = useThread(threadId, {
    enabled: enabled && !!threadId,
  });
  const { data: allThreads } = useThreads({
    enabled: enabled && !!threadId,
    listOptions: { limit: 100 }, // Get more threads for better relation analysis
  });
  const updateThread = useUpdateThread();

  // Analysis state
  const [summary, setSummary] = useState<string | null>(null);
  const [suggestedActions, setSuggestedActions] = useState<
    Array<{
      title: string;
      description: string;
      execute: () => Promise<void>;
    }>
  >([]);
  const [relatedThreads, setRelatedThreads] = useState<Thread[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Make thread data available to CopilotKit for context
  useCopilotReadable({
    description: 'Current thread being analyzed for intelligence insights',
    value: thread
      ? {
          id: thread.id,
          title: thread.title,
          userId: thread.userId,
          organizationId: thread.organizationId,
          tenantId: thread.tenantId,
          metadata: thread.metadata,
          createdAt: thread.createdAt,
          updatedAt: thread.updatedAt,
        }
      : null,
  });

  // Make all threads available for finding relations
  useCopilotReadable({
    description: 'All available threads for finding related content',
    value: allThreads?.threads || [],
  });

  // Analysis functions
  const analyzeThreadContent = useCallback(async () => {
    if (!thread || !enabled) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      // This will be handled by CopilotKit actions defined below
      // The actual analysis happens through the AI actions
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Analysis failed'));
    } finally {
      setIsAnalyzing(false);
    }
  }, [thread, enabled]);

  // CopilotKit action for generating thread summary
  useCopilotAction({
    name: 'generateThreadSummary',
    description: 'Generate an intelligent summary of the thread content and context',
    parameters: [
      {
        name: 'threadId',
        type: 'string',
        description: 'The ID of the thread to summarize',
      },
    ],
    handler: async ({ threadId: targetThreadId }) => {
      if (targetThreadId !== threadId) return 'Thread ID mismatch';

      const threadData = thread;
      if (!threadData) return 'Thread not found';

      // Generate summary based on thread data
      let summaryText = '';

      if (threadData.title) {
        summaryText += `Title: ${threadData.title}\n`;
      }

      if (threadData.metadata) {
        const metadata = threadData.metadata as Record<string, any>;
        if (metadata.description) {
          summaryText += `Description: ${metadata.description}\n`;
        }
        if (metadata.tags?.length > 0) {
          summaryText += `Tags: ${metadata.tags.join(', ')}\n`;
        }
        if (metadata.messageCount) {
          summaryText += `Messages: ${metadata.messageCount}\n`;
        }
        if (metadata.lastActivity) {
          summaryText += `Last Activity: ${new Date(metadata.lastActivity).toLocaleDateString()}\n`;
        }
      }

      const age = Math.floor(
        (Date.now() - new Date(threadData.createdAt).getTime()) / (1000 * 60 * 60 * 24),
      );
      summaryText += `Created: ${age} days ago\n`;

      if (!summaryText.trim()) {
        summaryText = 'This thread appears to be newly created with minimal content.';
      }

      setSummary(summaryText.trim());
      return `Summary generated for thread: ${threadData.title || threadData.id}`;
    },
  });

  // CopilotKit action for suggesting actions
  useCopilotAction({
    name: 'suggestThreadActions',
    description: 'Suggest intelligent actions based on thread content and context',
    parameters: [
      {
        name: 'threadId',
        type: 'string',
        description: 'The ID of the thread to analyze for action suggestions',
      },
    ],
    handler: async ({ threadId: targetThreadId }) => {
      if (targetThreadId !== threadId) return 'Thread ID mismatch';

      const threadData = thread;
      if (!threadData) return 'Thread not found';

      const actions: Array<{
        title: string;
        description: string;
        execute: () => Promise<void>;
      }> = [];

      // Suggest title update if thread has no title or generic title
      if (!threadData.title || threadData.title === 'New Thread') {
        actions.push({
          title: 'Update Thread Title',
          description: 'Give this thread a more descriptive title',
          execute: async () => {
            const suggestedTitle = `Thread ${new Date().toLocaleDateString()}`;
            await updateThread.mutateAsync({
              id: threadId,
              updates: { title: suggestedTitle },
            });
          },
        });
      }

      // Suggest metadata enhancement if metadata is sparse
      const metadata = (threadData.metadata as Record<string, any>) || {};
      if (!metadata.tags || metadata.tags.length === 0) {
        actions.push({
          title: 'Add Tags',
          description: 'Add relevant tags to help organize and find this thread',
          execute: async () => {
            const defaultTags = ['discussion', 'general'];
            await updateThread.mutateAsync({
              id: threadId,
              updates: {
                metadata: {
                  ...metadata,
                  tags: defaultTags,
                },
              },
            });
          },
        });
      }

      // Suggest archiving old inactive threads
      const daysSinceUpdate = Math.floor(
        (Date.now() - new Date(threadData.updatedAt).getTime()) / (1000 * 60 * 60 * 24),
      );
      if (daysSinceUpdate > 30) {
        actions.push({
          title: 'Archive Thread',
          description: 'This thread has been inactive for over 30 days',
          execute: async () => {
            await updateThread.mutateAsync({
              id: threadId,
              updates: {
                metadata: {
                  ...metadata,
                  archived: true,
                  archivedAt: new Date().toISOString(),
                },
              },
            });
          },
        });
      }

      // Suggest adding description if missing
      if (!metadata.description) {
        actions.push({
          title: 'Add Description',
          description: 'Add a description to provide more context about this thread',
          execute: async () => {
            await updateThread.mutateAsync({
              id: threadId,
              updates: {
                metadata: {
                  ...metadata,
                  description: 'Thread created for discussion and collaboration',
                },
              },
            });
          },
        });
      }

      setSuggestedActions(actions);
      return `Generated ${actions.length} action suggestions for thread`;
    },
  });

  // CopilotKit action for finding related threads
  useCopilotAction({
    name: 'findRelatedThreads',
    description: 'Find threads related to the current thread based on content and metadata',
    parameters: [
      {
        name: 'threadId',
        type: 'string',
        description: 'The ID of the thread to find relations for',
      },
    ],
    handler: async ({ threadId: targetThreadId }) => {
      if (targetThreadId !== threadId) return 'Thread ID mismatch';

      const threadData = thread;
      const allThreadsData = allThreads;

      if (!threadData || !allThreadsData?.threads) return 'Data not available';

      const currentThreadId = threadData.id;
      const currentTitle = threadData.title?.toLowerCase() || '';
      const currentMetadata = (threadData.metadata as Record<string, any>) || {};
      const currentTags = currentMetadata.tags || [];
      const currentUserId = threadData.userId;
      const currentOrgId = threadData.organizationId;

      // Find related threads based on various criteria
      const related = allThreadsData.threads
        .filter((t) => t.id !== currentThreadId) // Exclude self
        .map((t) => {
          let score = 0;
          const tMetadata = (t.metadata as Record<string, any>) || {};
          const tTags = tMetadata.tags || [];

          // Same user gets points
          if (t.userId === currentUserId) score += 2;

          // Same organization gets points
          if (t.organizationId && t.organizationId === currentOrgId) score += 1;

          // Similar titles get points
          if (t.title && currentTitle) {
            const tTitle = t.title.toLowerCase();
            const commonWords = currentTitle
              .split(' ')
              .filter((word) => word.length > 3 && tTitle.includes(word));
            score += commonWords.length;
          }

          // Common tags get points
          const commonTags = currentTags.filter((tag: string) => tTags.includes(tag));
          score += commonTags.length * 2;

          // Recent threads get slight boost
          const daysSinceCreated = Math.floor(
            (Date.now() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60 * 24),
          );
          if (daysSinceCreated < 7) score += 0.5;

          return { thread: t, score };
        })
        .filter(({ score }) => score > 0) // Only include threads with some relation
        .sort((a, b) => b.score - a.score) // Sort by relevance
        .slice(0, 5) // Take top 5
        .map(({ thread }) => thread);

      setRelatedThreads(related);
      return `Found ${related.length} related threads`;
    },
  });

  // Trigger analysis when thread data is available
  useEffect(() => {
    if (thread && enabled && !isAnalyzing) {
      analyzeThreadContent();
    }
  }, [thread, enabled, analyzeThreadContent, isAnalyzing]);

  // Combine loading states
  const isLoading = threadLoading || isAnalyzing;

  // Combine errors
  const combinedError = error || threadError || null;

  // Memoized return value for performance
  return useMemo(
    () => ({
      summary,
      suggestedActions,
      relatedThreads,
      isAnalyzing: isLoading,
      error: combinedError,
    }),
    [summary, suggestedActions, relatedThreads, isLoading, combinedError],
  );
}
