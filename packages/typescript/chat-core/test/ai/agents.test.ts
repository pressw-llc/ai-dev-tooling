// Agent system tests
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import {
  defineAgent,
  registerAgent,
  getAgent,
  getAllAgents,
  clearAgents,
  hasAgent,
  executeAgentTool,
  validateAgent,
} from '../../src/ai/agents';
import type { AIAgentDefinition, AIActionContext } from '../../src/ai/types';
import { AIError } from '../../src/ai/types';
import { mockUserContext, mockAdapter, mockThread } from './test-utils';

describe('defineAgent', () => {
  beforeEach(() => {
    clearAgents();
  });

  afterEach(() => {
    clearAgents();
  });

  test('should create a valid agent definition', () => {
    const toolHandler = async () => 'Tool executed';

    const agent = defineAgent({
      name: 'test-agent',
      description: 'A test agent for unit testing',
      systemMessage: 'You are a helpful test agent',
      tools: [
        {
          name: 'test-tool',
          description: 'A tool for testing',
          parameters: {
            input: {
              type: 'string',
              description: 'Test input parameter',
            },
          },
          handler: toolHandler,
        },
      ],
      config: {
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 1000,
      },
    });

    expect(agent).toBeDefined();
    expect(agent.name).toBe('test-agent');
    expect(agent.description).toBe('A test agent for unit testing');
    expect(agent.systemMessage).toBe('You are a helpful test agent');
    expect(agent.tools).toHaveLength(1);
    expect(agent.tools[0].name).toBe('test-tool');
    expect(agent.tools[0].handler).toBe(toolHandler);
    expect(agent.config).toBeDefined();
    expect(agent.config?.model).toBe('gpt-4');
  });

  test('should validate agent name', () => {
    expect(() => {
      defineAgent({
        name: '',
        description: 'Test agent',
        tools: [],
      });
    }).toThrow(AIError);

    expect(() => {
      defineAgent({
        name: null as unknown as string,
        description: 'Test agent',
        tools: [],
      });
    }).toThrow(AIError);
  });

  test('should validate agent description', () => {
    expect(() => {
      defineAgent({
        name: 'test-agent',
        description: '',
        tools: [],
      });
    }).toThrow(AIError);

    expect(() => {
      defineAgent({
        name: 'test-agent',
        description: null as unknown as string,
        tools: [],
      });
    }).toThrow(AIError);
  });

  test('should validate tools array', () => {
    expect(() => {
      defineAgent({
        name: 'test-agent',
        description: 'Test agent',
        tools: null as unknown as AIActionDefinition[],
      });
    }).toThrow(AIError);

    expect(() => {
      defineAgent({
        name: 'test-agent',
        description: 'Test agent',
        tools: 'invalid' as unknown as AIActionDefinition[],
      });
    }).toThrow(AIError);
  });

  test('should handle agent without tools', () => {
    const agent = defineAgent({
      name: 'simple-agent',
      description: 'An agent without tools',
      tools: [],
    });

    expect(agent).toBeDefined();
    expect(agent.tools).toHaveLength(0);
  });
});

describe('Agent Registry', () => {
  beforeEach(() => {
    clearAgents();
  });

  afterEach(() => {
    clearAgents();
  });

  const createTestAgent = (name: string): AIAgentDefinition => ({
    name,
    description: `Test agent ${name}`,
    tools: [
      {
        name: `${name}-tool`,
        description: `Tool for ${name}`,
        parameters: {},
        handler: async () => 'Success',
      },
    ],
  });

  test('should register agent', () => {
    const agent = createTestAgent('test-agent');

    expect(() => registerAgent(agent)).not.toThrow();
    expect(hasAgent('test-agent')).toBe(true);
    expect(getAgent('test-agent')).toBe(agent);
  });

  test('should prevent duplicate agent registration', () => {
    const agent1 = createTestAgent('duplicate-agent');
    const agent2 = createTestAgent('duplicate-agent');

    registerAgent(agent1);

    expect(() => registerAgent(agent2)).toThrow(AIError);
  });

  test('should get agent by name', () => {
    const agent = createTestAgent('get-test-agent');
    registerAgent(agent);

    const retrieved = getAgent('get-test-agent');
    expect(retrieved).toBe(agent);
  });

  test('should return undefined for non-existent agent', () => {
    const retrieved = getAgent('non-existent-agent');
    expect(retrieved).toBeUndefined();
  });

  test('should get all agents', () => {
    const agent1 = createTestAgent('agent-1');
    const agent2 = createTestAgent('agent-2');
    const agent3 = createTestAgent('agent-3');

    registerAgent(agent1);
    registerAgent(agent2);
    registerAgent(agent3);

    const allAgents = getAllAgents();
    expect(allAgents).toHaveLength(3);
    expect(allAgents).toContain(agent1);
    expect(allAgents).toContain(agent2);
    expect(allAgents).toContain(agent3);
  });

  test('should clear all agents', () => {
    const agent1 = createTestAgent('clear-agent-1');
    const agent2 = createTestAgent('clear-agent-2');

    registerAgent(agent1);
    registerAgent(agent2);

    expect(getAllAgents()).toHaveLength(2);

    clearAgents();

    expect(getAllAgents()).toHaveLength(0);
    expect(hasAgent('clear-agent-1')).toBe(false);
    expect(hasAgent('clear-agent-2')).toBe(false);
  });

  test('should check if agent exists', () => {
    const agent = createTestAgent('exists-test-agent');

    expect(hasAgent('exists-test-agent')).toBe(false);

    registerAgent(agent);

    expect(hasAgent('exists-test-agent')).toBe(true);
  });
});

describe('executeAgentTool', () => {
  beforeEach(() => {
    clearAgents();
  });

  afterEach(() => {
    clearAgents();
  });

  const mockContext: AIActionContext = {
    userContext: mockUserContext,
    adapter: mockAdapter,
    threadId: 'test-thread-123',
    thread: mockThread,
  };

  test('should execute agent tool successfully', async () => {
    let calledWith: unknown = null;
    const toolHandler = async (params: unknown) => {
      calledWith = params;
      return 'Tool executed successfully';
    };

    const agent = defineAgent({
      name: 'execution-test-agent',
      description: 'Agent for testing tool execution',
      tools: [
        {
          name: 'test-execution-tool',
          description: 'Tool for execution testing',
          parameters: {
            input: { type: 'string', description: 'Test input' },
          },
          handler: toolHandler,
        },
      ],
    });

    registerAgent(agent);

    const result = await executeAgentTool(
      'execution-test-agent',
      'test-execution-tool',
      { input: 'test value' },
      mockContext,
    );

    expect(result).toBe('Tool executed successfully');
    expect(calledWith).toEqual({ input: 'test value' });
  });

  test('should throw error for non-existent agent', async () => {
    await expect(
      executeAgentTool('non-existent-agent', 'some-tool', {}, mockContext),
    ).rejects.toThrow(AIError);
  });

  test('should throw error for non-existent tool', async () => {
    const agent = defineAgent({
      name: 'tool-error-agent',
      description: 'Agent for testing tool errors',
      tools: [
        {
          name: 'existing-tool',
          description: 'An existing tool',
          parameters: {},
          handler: async () => 'success',
        },
      ],
    });

    registerAgent(agent);

    await expect(
      executeAgentTool('tool-error-agent', 'non-existent-tool', {}, mockContext),
    ).rejects.toThrow(AIError);
  });

  test('should handle tool execution errors', async () => {
    const errorHandler = async () => {
      throw new Error('Tool execution failed');
    };

    const agent = defineAgent({
      name: 'error-test-agent',
      description: 'Agent for testing tool errors',
      tools: [
        {
          name: 'error-tool',
          description: 'Tool that throws errors',
          parameters: {},
          handler: errorHandler,
        },
      ],
    });

    registerAgent(agent);

    await expect(
      executeAgentTool('error-test-agent', 'error-tool', {}, mockContext),
    ).rejects.toThrow(AIError);
  });
});

describe('validateAgent', () => {
  test('should validate correct agent', () => {
    const validAgent: AIAgentDefinition = {
      name: 'valid-agent',
      description: 'A valid agent',
      tools: [
        {
          name: 'valid-tool',
          description: 'A valid tool',
          parameters: {},
          handler: async () => 'success',
        },
      ],
    };

    expect(() => validateAgent(validAgent)).not.toThrow();
    expect(validateAgent(validAgent)).toBe(true);
  });

  test('should throw error for invalid agent structure', () => {
    const invalidAgents = [
      { name: '', description: 'Test', tools: [] },
      { name: 'test', description: '', tools: [] },
      { name: 'test', description: 'Test', tools: null },
      { name: 'test', description: 'Test', tools: 'invalid' },
    ];

    invalidAgents.forEach((agent) => {
      expect(() => validateAgent(agent as unknown as AIAgentDefinition)).toThrow(AIError);
    });
  });
});
