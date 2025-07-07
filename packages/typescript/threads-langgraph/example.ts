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
    async (request: Request): Promise<UserContext> => {
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

  try {
    // Create a new thread
    const thread = await threadClient.createThread(mockRequest, {
      title: 'Customer Support Chat',
      metadata: {
        source: 'web',
        priority: 'high',
        tags: ['support', 'billing'],
      },
    });

    console.log('Created thread:', thread);

    // List threads
    const threads = await threadClient.listThreads(mockRequest, {
      limit: 10,
      offset: 0,
    });

    console.log('Found threads:', threads);

    // Update thread
    const updatedThread = await threadClient.updateThread(mockRequest, thread.id, {
      title: 'Customer Support Chat - Resolved',
      metadata: {
        ...thread.metadata,
        status: 'resolved',
        resolvedAt: new Date().toISOString(),
      },
    });

    console.log('Updated thread:', updatedThread);

    // Get specific thread
    const fetchedThread = await threadClient.getThread(mockRequest, thread.id);
    console.log('Fetched thread:', fetchedThread);

    // Delete thread
    await threadClient.deleteThread(mockRequest, thread.id);
    console.log('Thread deleted');
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the example
if (require.main === module) {
  main().catch(console.error);
}
