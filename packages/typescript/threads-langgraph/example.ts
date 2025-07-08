import { createLangGraphAdapter } from './src';
import { ThreadUtilityClient } from '@pressw/threads';
import type { UserContext } from '@pressw/threads';

// Example usage of the LangGraph adapter

async function main() {
  // Initialize the LangGraph adapter
  const adapter = createLangGraphAdapter({
    apiUrl: process.env.LANGGRAPH_API_URL || 'https://your-deployment.langchain.com',
    apiKey: process.env.LANGSMITH_API_KEY || 'your-api-key',
    assistantId: 'my-assistant', // Optional
    debugLogs: true,
  });

  // Create a thread utility client
  const threadClient = new ThreadUtilityClient(
    adapter,
    async (_request: Request): Promise<UserContext> => {
      // Extract user context from request
      // This is a simplified example - in production you'd extract from auth headers
      return {
        userId: 'user-123',
        organizationId: 'org-456',
        tenantId: 'tenant-789',
      };
    },
  );

  // Example: Create a thread
  const mockRequest = new Request('https://example.com');

  // Create a new thread
  const thread = await threadClient.createThread(mockRequest, {
    title: 'Customer Support Chat',
    metadata: {
      source: 'web',
      priority: 'high',
      tags: ['support', 'billing'],
    },
  });

  // Thread created successfully

  // List threads
  await threadClient.listThreads(mockRequest, {
    limit: 10,
    offset: 0,
  });

  // Threads listed successfully

  // Update thread
  await threadClient.updateThread(mockRequest, thread.id, {
    title: 'Customer Support Chat - Resolved',
    metadata: {
      ...thread.metadata,
      status: 'resolved',
      resolvedAt: new Date().toISOString(),
    },
  });

  // Thread updated successfully

  // Get specific thread
  await threadClient.getThread(mockRequest, thread.id);
  // Thread fetched successfully

  // Delete thread
  await threadClient.deleteThread(mockRequest, thread.id);
  // Thread deleted successfully
}

// Run the example
if (require.main === module) {
  main().catch((_error) => {
    process.exit(1);
  });
}
