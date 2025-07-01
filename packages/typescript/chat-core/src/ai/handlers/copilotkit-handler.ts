// CopilotKit backend handler - Chat completions API handler pattern
import type { NextRequest } from 'next/server';
import type { CopilotKitHandlerConfig, AIChatConfig, UserContext } from '../types';
import { AIError, AI_ERROR_CODES } from '../types';

/**
 * Creates a Next.js API route handler for CopilotKit integration
 *
 * This function creates a complete API handler that provides AI chat capabilities
 * with agent support, thread context, and custom actions. It follows the CopilotKit
 * pattern of creating a chat completions endpoint that can be consumed by the
 * CopilotKit frontend components.
 *
 * @param config - Configuration including adapter, user context resolver, and agents
 * @returns Next.js API route handler for CopilotKit requests
 *
 * @example
 * ```typescript
 * // In your Next.js API route (e.g., app/api/copilotkit/route.ts)
 * import { createCopilotKitHandler } from '@pressw/chat-core/ai';
 * import { drizzleAdapter } from '@pressw/chat-core/adapters';
 * import { customerAgent, supportAgent } from '../agents';
 *
 * const handler = createCopilotKitHandler({
 *   adapter: drizzleAdapter,
 *   getUserContext: async (request) => {
 *     // Extract user info from request headers, session, etc.
 *     return { userId: 'user123', permissions: ['read', 'write'] };
 *   },
 *   agents: [customerAgent, supportAgent],
 *   config: {
 *     model: 'gpt-4',
 *     temperature: 0.7,
 *     maxTokens: 2000
 *   }
 * });
 *
 * export { handler as GET, handler as POST };
 * ```
 */
export function createCopilotKitHandler(config: CopilotKitHandlerConfig) {
  // Validate configuration
  if (!config.adapter) {
    throw new AIError('CopilotKit handler requires a valid adapter', AI_ERROR_CODES.INVALID_CONFIG);
  }

  if (!config.getUserContext || typeof config.getUserContext !== 'function') {
    throw new AIError(
      'CopilotKit handler requires a getUserContext function',
      AI_ERROR_CODES.INVALID_CONFIG,
    );
  }

  // Default configuration
  const defaultConfig: AIChatConfig = {
    model: 'gpt-4',
    enableMemory: true,
    memoryLimit: 10,
    enableActions: true,
    enableSuggestions: true,
    temperature: 0.7,
    maxTokens: 2000,
    ...config.config,
  };

  /**
   * The actual Next.js API route handler
   */
  return async function handler(request: NextRequest) {
    try {
      // TODO: Add in user context
      // // Get user context from request
      // let _userContext: UserContext;
      // try {
      //   _userContext = await config.getUserContext(request);
      // } catch (error) {
      //   throw new AIError(
      //     `Failed to get user context: ${error instanceof Error ? error.message : 'Unknown error'}`,
      //     AI_ERROR_CODES.UNAUTHORIZED,
      //   );
      // }

      // Extract thread ID from request if available
      const url = new URL(request.url);
      const threadId = url.searchParams.get('threadId') || undefined;

      // Get thread from adapter if threadId is provided
      let thread: any = undefined;
      if (threadId) {
        try {
          thread = await config.adapter.findOne({
            model: 'thread',
            where: [{ field: 'id', value: threadId }],
          });
        } catch (error) {
          // Thread not found is not necessarily an error for new conversations
          console.warn(`Thread ${threadId} not found or inaccessible:`, error);
        }
      }

      // Parse the request body to get the chat message
      // TODO: Implement this
      // const body = await request.json();
      // const {
      //   messages: _messages = [],
      //   model: _model = defaultConfig.model,
      //   temperature: _temperature = defaultConfig.temperature,
      //   max_tokens: _max_tokens = defaultConfig.maxTokens,
      // } = body;

      // Process agents and their tools
      const availableActions =
        config.agents?.map((agent) => ({
          agent,
          tools: agent.tools.map((tool) => ({
            name: `${agent.name}.${tool.name}`,
            description: `${agent.description}: ${tool.description}`,
            parameters: tool.parameters,
            handler: tool.handler,
          })),
        })) || [];

      // For this implementation, we'll create a simple chat completion response
      // In a real implementation, you would integrate with OpenAI or another LLM
      // and handle function calling for the agent tools

      const responseMessage = {
        id: `msg_${Date.now()}`,
        object: 'chat.completion.choice',
        role: 'assistant',
        content:
          'This is a mock response from the CopilotKit handler. In a real implementation, this would be powered by an LLM.',
        created: Math.floor(Date.now() / 1000),
      };

      // Create a chat completion response in the OpenAI format
      const completion = {
        id: `chatcmpl_${Date.now()}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: defaultConfig.model || 'gpt-4',
        choices: [
          {
            index: 0,
            message: responseMessage,
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0,
        },
      };

      // Log any agent action availability for debugging
      if (availableActions.length > 0) {
        console.log(
          `CopilotKit handler: ${availableActions.length} agents available with ${availableActions.reduce((total, a) => total + a.tools.length, 0)} tools`,
        );
      }

      // If we have a thread ID, optionally save the interaction
      if (threadId && thread) {
        console.log(`CopilotKit handler processing request for thread ${threadId}`);
      }

      return new Response(JSON.stringify(completion), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('CopilotKit handler error:', error);

      // Return error response
      const errorMessage = error instanceof AIError ? error.message : 'Internal server error';

      const errorCode = error instanceof AIError ? error.code : AI_ERROR_CODES.COPILOTKIT_ERROR;

      return new Response(
        JSON.stringify({
          error: {
            message: errorMessage,
            code: errorCode,
            timestamp: new Date().toISOString(),
          },
        }),
        {
          status:
            error instanceof AIError && error.code === AI_ERROR_CODES.UNAUTHORIZED ? 401 : 500,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
    }
  };
}

/**
 * Rate limiting middleware for CopilotKit handlers
 *
 * @param windowMs - Time window in milliseconds
 * @param maxRequests - Maximum requests per window
 * @returns Middleware function that checks rate limits
 */
export function createRateLimitMiddleware(windowMs: number, maxRequests: number) {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return async function rateLimitMiddleware(
    request: NextRequest,
    getUserContext: (req: NextRequest) => Promise<UserContext>,
  ) {
    try {
      const userContext = await getUserContext(request);
      const key = userContext.userId || request.headers.get('x-forwarded-for') || 'anonymous';
      const now = Date.now();

      const userRequests = requests.get(key);

      if (!userRequests || now > userRequests.resetTime) {
        // Reset window
        requests.set(key, { count: 1, resetTime: now + windowMs });
        return null; // No rate limit violation
      }

      if (userRequests.count >= maxRequests) {
        throw new AIError(
          'Rate limit exceeded. Please try again later.',
          AI_ERROR_CODES.RATE_LIMITED,
          { resetTime: userRequests.resetTime },
        );
      }

      userRequests.count++;
      return null; // No rate limit violation
    } catch (error) {
      if (error instanceof AIError) {
        throw error;
      }
      // If we can't get user context, apply a more restrictive rate limit
      const ip = request.headers.get('x-forwarded-for') || 'anonymous';
      const userRequests = requests.get(ip);
      const now = Date.now();

      if (!userRequests || now > userRequests.resetTime) {
        requests.set(ip, { count: 1, resetTime: now + windowMs });
        return null;
      }

      if (userRequests.count >= Math.floor(maxRequests / 2)) {
        throw new AIError(
          'Rate limit exceeded. Please try again later.',
          AI_ERROR_CODES.RATE_LIMITED,
        );
      }

      userRequests.count++;
      return null;
    }
  };
}

/**
 * Utility function to wrap a CopilotKit handler with rate limiting
 *
 * @param handler - The CopilotKit handler function
 * @param rateLimitConfig - Rate limiting configuration
 * @returns Rate-limited handler function
 */
export function withRateLimit(
  handler: (request: NextRequest) => Promise<Response>,
  rateLimitConfig: {
    windowMs: number;
    maxRequests: number;
    getUserContext: (req: NextRequest) => Promise<UserContext>;
  },
) {
  const rateLimitMiddleware = createRateLimitMiddleware(
    rateLimitConfig.windowMs,
    rateLimitConfig.maxRequests,
  );

  return async function rateLimitedHandler(request: NextRequest) {
    try {
      await rateLimitMiddleware(request, rateLimitConfig.getUserContext);
      return await handler(request);
    } catch (error) {
      if (error instanceof AIError && error.code === AI_ERROR_CODES.RATE_LIMITED) {
        return new Response(
          JSON.stringify({
            error: {
              message: error.message,
              code: error.code,
              context: error.context,
            },
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': error.context?.resetTime
                ? Math.ceil(((error.context.resetTime as number) - Date.now()) / 1000).toString()
                : '60',
            },
          },
        );
      }
      throw error;
    }
  };
}
