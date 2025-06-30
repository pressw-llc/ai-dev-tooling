import { describe, it, expect } from 'bun:test';
import type { AIActionDefinition, UseAIActionsOptions, AIActionContext } from '../../src/ai/types';
import type { Thread, UserContext } from '../../src/types';
import type { ChatCoreAdapter } from '../../src/adapters/types';
import { AI_ERROR_CODES } from '../../src/ai/types';

// Test data
const mockUserContext: UserContext = {
  userId: 'user-123',
  organizationId: 'org-456',
  tenantId: 'tenant-789',
};

const mockAdapter: ChatCoreAdapter = {
  createThread: async () => ({ id: 'new-thread', title: 'New Thread' }) as any,
  updateThread: async () => ({ id: 'thread-123', title: 'Updated Thread' }) as any,
  deleteThread: async () => {},
  getThread: async () => ({ id: 'thread-123', title: 'Test Thread' }) as any,
  listThreads: async () => ({ threads: [], total: 0, hasMore: false }),
  getUserContext: async () => mockUserContext,
} as any;

const mockThread: Thread = {
  id: 'thread-123',
  title: 'Test Thread',
  userId: 'user-123',
  organizationId: 'org-456',
  tenantId: 'tenant-789',
  metadata: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('useAIActions Types and Interfaces', () => {
  describe('Type definitions', () => {
    it('should have correct UseAIActionsOptions interface', () => {
      const options: UseAIActionsOptions = {
        actions: [],
        threadId: 'thread-123',
        enabled: true,
        userContext: mockUserContext,
        adapter: mockAdapter,
      };

      expect(options.actions).toEqual([]);
      expect(options.threadId).toBe('thread-123');
      expect(options.enabled).toBe(true);
      expect(options.userContext).toEqual(mockUserContext);
      expect(options.adapter).toEqual(mockAdapter);
    });

    it('should define AIActionDefinition correctly', () => {
      const mockHandler = async (params: any, context: AIActionContext) => {
        return 'Action executed';
      };

      const actionDef: AIActionDefinition = {
        name: 'testAction',
        description: 'A test action',
        parameters: {
          param1: {
            type: 'string',
            description: 'First parameter',
            required: true,
          },
        },
        handler: mockHandler,
        requiresConfirmation: false,
        permissions: ['thread:read'],
      };

      expect(actionDef.name).toBe('testAction');
      expect(actionDef.description).toBe('A test action');
      expect(actionDef.parameters.param1.type).toBe('string');
      expect(actionDef.requiresConfirmation).toBe(false);
      expect(actionDef.permissions).toEqual(['thread:read']);
      expect(typeof actionDef.handler).toBe('function');
    });

    it('should define AIActionContext correctly', () => {
      const context: AIActionContext = {
        userContext: mockUserContext,
        adapter: mockAdapter,
        threadId: 'thread-123',
        thread: mockThread,
      };

      expect(context.userContext).toEqual(mockUserContext);
      expect(context.adapter).toEqual(mockAdapter);
      expect(context.threadId).toBe('thread-123');
      expect(context.thread).toEqual(mockThread);
    });
  });

  describe('Action handler execution', () => {
    it('should execute action handler with correct context', async () => {
      let receivedParams: any;
      let receivedContext: AIActionContext;

      const mockHandler = async (params: any, context: AIActionContext) => {
        receivedParams = params;
        receivedContext = context;
        return 'Handler executed successfully';
      };

      const action: AIActionDefinition = {
        name: 'testAction',
        description: 'Test action',
        parameters: {
          message: {
            type: 'string',
            description: 'Message parameter',
          },
        },
        handler: mockHandler,
      };

      const context: AIActionContext = {
        userContext: mockUserContext,
        adapter: mockAdapter,
        threadId: 'thread-123',
        thread: mockThread,
      };

      const params = { message: 'Hello World' };
      const result = await action.handler(params, context);

      expect(result).toBe('Handler executed successfully');
      expect(receivedParams).toEqual(params);
      expect(receivedContext).toEqual(context);
    });

    it('should handle action handler errors', async () => {
      const mockHandler = async () => {
        throw new Error('Action failed');
      };

      const action: AIActionDefinition = {
        name: 'failingAction',
        description: 'Action that fails',
        parameters: {},
        handler: mockHandler,
      };

      const context: AIActionContext = {
        userContext: mockUserContext,
        adapter: mockAdapter,
      };

      await expect(action.handler({}, context)).rejects.toThrow('Action failed');
    });
  });

  describe('Permission validation logic', () => {
    it('should validate thread permissions correctly', () => {
      // Simulate permission checking logic
      const checkPermissions = (
        permissions: string[],
        context: Partial<AIActionContext>,
      ): boolean => {
        if (!permissions || permissions.length === 0) {
          return true;
        }

        for (const permission of permissions) {
          switch (permission) {
            case 'thread:read':
              if (!context.threadId) return false;
              break;
            case 'thread:write':
              if (!context.threadId || !context.userContext) return false;
              break;
            case 'thread:delete':
              if (!context.threadId || !context.userContext) return false;
              break;
            case 'thread:create':
              if (!context.userContext) return false;
              break;
            default:
              return false;
          }
        }

        return true;
      };

      // Test thread:read permission
      expect(checkPermissions(['thread:read'], { threadId: 'thread-123' })).toBe(true);
      expect(checkPermissions(['thread:read'], {})).toBe(false);

      // Test thread:write permission
      expect(
        checkPermissions(['thread:write'], {
          threadId: 'thread-123',
          userContext: mockUserContext,
        }),
      ).toBe(true);
      expect(checkPermissions(['thread:write'], { threadId: 'thread-123' })).toBe(false);
      expect(checkPermissions(['thread:write'], { userContext: mockUserContext })).toBe(false);

      // Test thread:create permission
      expect(checkPermissions(['thread:create'], { userContext: mockUserContext })).toBe(true);
      expect(checkPermissions(['thread:create'], {})).toBe(false);

      // Test no permissions (should allow)
      expect(checkPermissions([], {})).toBe(true);
      expect(checkPermissions(undefined as any, {})).toBe(true);

      // Test unknown permission (should deny)
      expect(checkPermissions(['unknown:permission'], {})).toBe(false);
    });
  });

  describe('Built-in action definitions', () => {
    it('should define createThread action correctly', () => {
      const createThreadAction = {
        name: 'createThread',
        description: 'Create a new conversation thread',
        parameters: {
          title: {
            type: 'string',
            description: 'Title for the new thread',
            required: false,
          },
          metadata: {
            type: 'object',
            description: 'Additional metadata for the thread',
            required: false,
          },
        },
        permissions: ['thread:create'],
      };

      expect(createThreadAction.name).toBe('createThread');
      expect(createThreadAction.description).toContain('Create a new conversation');
      expect(createThreadAction.parameters.title.type).toBe('string');
      expect(createThreadAction.parameters.metadata.type).toBe('object');
      expect(createThreadAction.permissions).toEqual(['thread:create']);
    });

    it('should define updateThread action correctly', () => {
      const updateThreadAction = {
        name: 'updateThread',
        description: 'Update the current conversation thread',
        parameters: {
          title: {
            type: 'string',
            description: 'New title for the thread',
            required: false,
          },
          metadata: {
            type: 'object',
            description: 'Updated metadata for the thread',
            required: false,
          },
        },
        permissions: ['thread:write'],
      };

      expect(updateThreadAction.name).toBe('updateThread');
      expect(updateThreadAction.description).toContain('Update the current conversation');
      expect(updateThreadAction.parameters.title.type).toBe('string');
      expect(updateThreadAction.permissions).toEqual(['thread:write']);
    });

    it('should define deleteThread action correctly', () => {
      const deleteThreadAction = {
        name: 'deleteThread',
        description: 'Delete the current conversation thread (requires confirmation)',
        parameters: {
          confirm: {
            type: 'boolean',
            description: 'Confirmation that the thread should be deleted',
            required: true,
          },
        },
        permissions: ['thread:delete'],
        requiresConfirmation: true,
      };

      expect(deleteThreadAction.name).toBe('deleteThread');
      expect(deleteThreadAction.description).toContain('Delete the current conversation');
      expect(deleteThreadAction.description).toContain('requires confirmation');
      expect(deleteThreadAction.parameters.confirm.type).toBe('boolean');
      expect(deleteThreadAction.parameters.confirm.required).toBe(true);
      expect(deleteThreadAction.permissions).toEqual(['thread:delete']);
      expect(deleteThreadAction.requiresConfirmation).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should define AI error codes correctly', () => {
      expect(AI_ERROR_CODES.ACTION_FAILED).toBe('ACTION_FAILED');
      expect(AI_ERROR_CODES.UNAUTHORIZED).toBe('UNAUTHORIZED');
      expect(AI_ERROR_CODES.THREAD_NOT_FOUND).toBe('THREAD_NOT_FOUND');
      expect(AI_ERROR_CODES.INVALID_CONFIG).toBe('INVALID_CONFIG');
      expect(AI_ERROR_CODES.COPILOTKIT_ERROR).toBe('COPILOTKIT_ERROR');
    });

    it('should create proper error structure', () => {
      const createAIError = (message: string, code: string, context?: Record<string, unknown>) => {
        return {
          name: 'AIError',
          message,
          code,
          context,
        };
      };

      const error = createAIError('Action execution failed', AI_ERROR_CODES.ACTION_FAILED, {
        actionName: 'testAction',
      });

      expect(error.name).toBe('AIError');
      expect(error.message).toBe('Action execution failed');
      expect(error.code).toBe(AI_ERROR_CODES.ACTION_FAILED);
      expect(error.context).toEqual({ actionName: 'testAction' });
    });
  });

  describe('Configuration validation', () => {
    it('should validate required options', () => {
      const validateOptions = (options: Partial<UseAIActionsOptions>): string[] => {
        const errors: string[] = [];

        if (!options.userContext) {
          errors.push('userContext is required');
        }

        if (!options.adapter) {
          errors.push('adapter is required');
        }

        if (!Array.isArray(options.actions)) {
          errors.push('actions must be an array');
        }

        return errors;
      };

      // Valid options
      expect(
        validateOptions({
          actions: [],
          userContext: mockUserContext,
          adapter: mockAdapter,
        }),
      ).toEqual([]);

      // Missing userContext
      expect(
        validateOptions({
          actions: [],
          adapter: mockAdapter,
        }),
      ).toContain('userContext is required');

      // Missing adapter
      expect(
        validateOptions({
          actions: [],
          userContext: mockUserContext,
        }),
      ).toContain('adapter is required');

      // Invalid actions
      expect(
        validateOptions({
          actions: 'not an array' as any,
          userContext: mockUserContext,
          adapter: mockAdapter,
        }),
      ).toContain('actions must be an array');
    });
  });
});
