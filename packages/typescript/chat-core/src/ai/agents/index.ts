import { z } from 'zod';
import type {
  AIAgent,
  AIAgentDefinition,
  AIAgentTool,
  AIAgentToolDefinition,
  AIAgentToolHandler,
  AIActionContext,
  AIChatConfig,
} from '../types';
import { AIError, AI_ERROR_CODES } from '../types';

// Global agent registry
const agentRegistry = new Map<string, AIAgentDefinition>();

/**
 * Defines a new AI agent with tools and configuration
 *
 * This function creates a complete agent definition that can be registered
 * and used by the CopilotKit integration. Agents are self-contained AI
 * assistants with specific capabilities defined by their tools.
 *
 * @param definition - The agent definition including name, description, tools, and config
 * @returns The complete agent definition with validated tools
 *
 * @example
 * ```typescript
 * const customerServiceAgent = defineAgent({
 *   name: 'customer-service',
 *   description: 'Helps with customer inquiries and support tickets',
 *   systemMessage: 'You are a helpful customer service representative.',
 *   tools: [
 *     {
 *       name: 'create-ticket',
 *       description: 'Creates a new support ticket',
 *       parameters: {
 *         title: { type: 'string', description: 'Ticket title', required: true },
 *         description: { type: 'string', description: 'Ticket description', required: true }
 *       },
 *       handler: async (params, context) => {
 *         // Create ticket logic
 *         return 'Ticket created successfully';
 *       }
 *     }
 *   ],
 *   config: {
 *     model: 'gpt-4',
 *     temperature: 0.7,
 *     maxTokens: 1000
 *   }
 * });
 * ```
 */
export function defineAgent(
  definition: Omit<AIAgentDefinition, 'tools'> & {
    tools: Array<AIAgentTool & { handler: AIAgentToolHandler }>;
  },
): AIAgentDefinition {
  // Validate agent definition
  if (!definition.name || typeof definition.name !== 'string') {
    throw new AIError('Agent name is required and must be a string', AI_ERROR_CODES.INVALID_CONFIG);
  }

  if (!definition.description || typeof definition.description !== 'string') {
    throw new AIError(
      'Agent description is required and must be a string',
      AI_ERROR_CODES.INVALID_CONFIG,
    );
  }

  if (!Array.isArray(definition.tools)) {
    throw new AIError('Agent tools must be an array', AI_ERROR_CODES.INVALID_CONFIG);
  }

  // Validate each tool
  const validatedTools: AIAgentToolDefinition[] = definition.tools.map((tool) => {
    if (!tool.name || typeof tool.name !== 'string') {
      throw new AIError(
        `Tool name is required and must be a string for agent: ${definition.name}`,
        AI_ERROR_CODES.INVALID_CONFIG,
      );
    }

    if (!tool.description || typeof tool.description !== 'string') {
      throw new AIError(
        `Tool description is required and must be a string for tool: ${tool.name}`,
        AI_ERROR_CODES.INVALID_CONFIG,
      );
    }

    if (!tool.handler || typeof tool.handler !== 'function') {
      throw new AIError(
        `Tool handler is required and must be a function for tool: ${tool.name}`,
        AI_ERROR_CODES.INVALID_CONFIG,
      );
    }

    if (!tool.parameters || typeof tool.parameters !== 'object') {
      throw new AIError(
        `Tool parameters must be an object for tool: ${tool.name}`,
        AI_ERROR_CODES.INVALID_CONFIG,
      );
    }

    return {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
      handler: tool.handler,
    };
  });

  // Create the complete agent definition
  const agentDefinition: AIAgentDefinition = {
    name: definition.name,
    description: definition.description,
    systemMessage: definition.systemMessage,
    tools: validatedTools,
    config: definition.config,
  };

  return agentDefinition;
}

/**
 * Registers an agent in the global agent registry
 *
 * @param agent - The agent definition to register
 */
export function registerAgent(agent: AIAgentDefinition): void {
  if (agentRegistry.has(agent.name)) {
    throw new AIError(
      `Agent with name '${agent.name}' is already registered`,
      AI_ERROR_CODES.INVALID_CONFIG,
    );
  }

  agentRegistry.set(agent.name, agent);
}

/**
 * Gets a registered agent by name
 *
 * @param name - The name of the agent to retrieve
 * @returns The agent definition or undefined if not found
 */
export function getAgent(name: string): AIAgentDefinition | undefined {
  return agentRegistry.get(name);
}

/**
 * Gets all registered agents
 *
 * @returns Array of all registered agent definitions
 */
export function getAllAgents(): AIAgentDefinition[] {
  return Array.from(agentRegistry.values());
}

/**
 * Clears all registered agents (mainly for testing)
 */
export function clearAgents(): void {
  agentRegistry.clear();
}

/**
 * Checks if an agent is registered
 *
 * @param name - The name of the agent to check
 * @returns True if the agent is registered, false otherwise
 */
export function hasAgent(name: string): boolean {
  return agentRegistry.has(name);
}

/**
 * Executes a tool from an agent with the given parameters and context
 *
 * @param agentName - The name of the agent
 * @param toolName - The name of the tool to execute
 * @param params - The parameters to pass to the tool
 * @param context - The execution context
 * @returns The result from the tool execution
 */
export async function executeAgentTool(
  agentName: string,
  toolName: string,
  params: any,
  context: AIActionContext,
): Promise<string> {
  const agent = getAgent(agentName);
  if (!agent) {
    throw new AIError(`Agent '${agentName}' not found`, AI_ERROR_CODES.INVALID_CONFIG);
  }

  const tool = agent.tools.find((t) => t.name === toolName);
  if (!tool) {
    throw new AIError(
      `Tool '${toolName}' not found in agent '${agentName}'`,
      AI_ERROR_CODES.INVALID_CONFIG,
    );
  }

  try {
    return await tool.handler(params, context);
  } catch (error) {
    throw new AIError(
      `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      AI_ERROR_CODES.ACTION_FAILED,
      { agentName, toolName, params },
    );
  }
}

/**
 * Validates an agent definition against the schema
 *
 * @param agent - The agent definition to validate
 * @returns True if valid, throws AIError if invalid
 */
export function validateAgent(agent: AIAgentDefinition): boolean {
  try {
    // Basic validation
    if (!agent.name || !agent.description || !Array.isArray(agent.tools)) {
      throw new Error('Invalid agent structure');
    }

    // Validate each tool
    agent.tools.forEach((tool) => {
      if (!tool.name || !tool.description || !tool.parameters || !tool.handler) {
        throw new Error(`Invalid tool structure: ${tool.name}`);
      }
    });

    return true;
  } catch (error) {
    throw new AIError(
      `Agent validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      AI_ERROR_CODES.INVALID_CONFIG,
    );
  }
}

// Re-export types for convenience
export type {
  AIAgent,
  AIAgentDefinition,
  AIAgentTool,
  AIAgentToolDefinition,
  AIAgentToolHandler,
} from '../types';
