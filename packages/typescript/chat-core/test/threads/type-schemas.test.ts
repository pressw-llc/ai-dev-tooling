import { describe, it, expect } from 'vitest';
import {
  UserContextSchema,
  CreateThreadOptionsSchema,
  UpdateThreadOptionsSchema,
  ListThreadsOptionsSchema,
  ThreadsResponseSchema,
  ApiErrorSchema,
  ApiResponseSchema,
} from '../../src/types';
import { createMockThread, createMockThreadsResponse } from './test-utils';

describe('Type Validation Schemas', () => {
  describe('UserContextSchema', () => {
    it('should validate valid user context with all fields', () => {
      const validContext = {
        userId: 'user-123',
        organizationId: 'org-456',
        tenantId: 'tenant-789',
      };

      const result = UserContextSchema.safeParse(validContext);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validContext);
      }
    });

    it('should validate user context with only userId', () => {
      const minimalContext = {
        userId: 'user-123',
      };

      const result = UserContextSchema.safeParse(minimalContext);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          userId: 'user-123',
          organizationId: undefined,
          tenantId: undefined,
        });
      }
    });

    it('should reject context without userId', () => {
      const invalidContext = {
        organizationId: 'org-456',
        tenantId: 'tenant-789',
      };

      const result = UserContextSchema.safeParse(invalidContext);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: ['userId'],
              code: 'invalid_type',
            }),
          ]),
        );
      }
    });

    it('should reject context with invalid userId type', () => {
      const invalidContext = {
        userId: 123,
        organizationId: 'org-456',
      };

      const result = UserContextSchema.safeParse(invalidContext);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: ['userId'],
              code: 'invalid_type',
            }),
          ]),
        );
      }
    });

    it('should allow null for optional fields', () => {
      const contextWithNulls = {
        userId: 'user-123',
        organizationId: null,
        tenantId: null,
      };

      const result = UserContextSchema.safeParse(contextWithNulls);

      expect(result.success).toBe(true);
    });
  });

  describe('CreateThreadOptionsSchema', () => {
    it('should validate valid create options with all fields', () => {
      const validOptions = {
        title: 'Test Thread',
        metadata: { source: 'test', priority: 'high' },
      };

      const result = CreateThreadOptionsSchema.safeParse(validOptions);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validOptions);
      }
    });

    it('should validate empty options', () => {
      const emptyOptions = {};

      const result = CreateThreadOptionsSchema.safeParse(emptyOptions);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          title: undefined,
          metadata: undefined,
        });
      }
    });

    it('should validate options with only title', () => {
      const titleOnlyOptions = {
        title: 'Only Title',
      };

      const result = CreateThreadOptionsSchema.safeParse(titleOnlyOptions);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          title: 'Only Title',
          metadata: undefined,
        });
      }
    });

    it('should validate options with only metadata', () => {
      const metadataOnlyOptions = {
        metadata: { key: 'value' },
      };

      const result = CreateThreadOptionsSchema.safeParse(metadataOnlyOptions);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          title: undefined,
          metadata: { key: 'value' },
        });
      }
    });

    it('should reject invalid title type', () => {
      const invalidOptions = {
        title: 123,
        metadata: {},
      };

      const result = CreateThreadOptionsSchema.safeParse(invalidOptions);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: ['title'],
              code: 'invalid_type',
            }),
          ]),
        );
      }
    });

    it('should reject invalid metadata type', () => {
      const invalidOptions = {
        title: 'Valid Title',
        metadata: 'invalid metadata',
      };

      const result = CreateThreadOptionsSchema.safeParse(invalidOptions);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: ['metadata'],
              code: 'invalid_type',
            }),
          ]),
        );
      }
    });
  });

  describe('UpdateThreadOptionsSchema', () => {
    it('should validate valid update options', () => {
      const validOptions = {
        title: 'Updated Thread',
        metadata: { updated: true },
      };

      const result = UpdateThreadOptionsSchema.safeParse(validOptions);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validOptions);
      }
    });

    it('should validate partial update options', () => {
      const partialOptions = {
        title: 'New Title',
      };

      const result = UpdateThreadOptionsSchema.safeParse(partialOptions);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          title: 'New Title',
          metadata: undefined,
        });
      }
    });

    it('should validate empty update options', () => {
      const emptyOptions = {};

      const result = UpdateThreadOptionsSchema.safeParse(emptyOptions);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          title: undefined,
          metadata: undefined,
        });
      }
    });

    it('should reject invalid types', () => {
      const invalidOptions = {
        title: null,
        metadata: 'invalid',
      };

      const result = UpdateThreadOptionsSchema.safeParse(invalidOptions);

      expect(result.success).toBe(false);
    });
  });

  describe('ListThreadsOptionsSchema', () => {
    it('should validate and transform valid options with all fields', () => {
      const validOptions = {
        limit: 15,
        offset: 10,
        orderBy: 'createdAt',
        orderDirection: 'asc',
        search: 'test query',
      };

      const result = ListThreadsOptionsSchema.safeParse(validOptions);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          limit: 15,
          offset: 10,
          orderBy: 'createdAt',
          orderDirection: 'asc',
          search: 'test query',
        });
      }
    });

    it('should apply default values for missing fields', () => {
      const partialOptions = {
        search: 'test',
      };

      const result = ListThreadsOptionsSchema.safeParse(partialOptions);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          limit: 20,
          offset: 0,
          orderBy: 'updatedAt',
          orderDirection: 'desc',
          search: 'test',
        });
      }
    });

    it('should apply all default values for empty options', () => {
      const emptyOptions = {};

      const result = ListThreadsOptionsSchema.safeParse(emptyOptions);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          limit: 20,
          offset: 0,
          orderBy: 'updatedAt',
          orderDirection: 'desc',
          search: undefined,
        });
      }
    });

    it('should reject invalid limit values', () => {
      const invalidOptions = {
        limit: 0, // Should be positive
      };

      const result = ListThreadsOptionsSchema.safeParse(invalidOptions);

      expect(result.success).toBe(false);
    });

    it('should reject limit values that are too large', () => {
      const invalidOptions = {
        limit: 150, // Should be max 100
      };

      const result = ListThreadsOptionsSchema.safeParse(invalidOptions);

      expect(result.success).toBe(false);
    });

    it('should reject negative offset values', () => {
      const invalidOptions = {
        offset: -1,
      };

      const result = ListThreadsOptionsSchema.safeParse(invalidOptions);

      expect(result.success).toBe(false);
    });

    it('should reject invalid orderBy values', () => {
      const invalidOptions = {
        orderBy: 'invalidField',
      };

      const result = ListThreadsOptionsSchema.safeParse(invalidOptions);

      expect(result.success).toBe(false);
    });

    it('should reject invalid orderDirection values', () => {
      const invalidOptions = {
        orderDirection: 'invalid',
      };

      const result = ListThreadsOptionsSchema.safeParse(invalidOptions);

      expect(result.success).toBe(false);
    });

    it('should reject non-string search values', () => {
      const invalidOptions = {
        search: 123,
      };

      const result = ListThreadsOptionsSchema.safeParse(invalidOptions);

      expect(result.success).toBe(false);
    });
  });

  describe('ThreadsResponseSchema', () => {
    it('should validate valid threads response', () => {
      const mockThreads = [createMockThread(), createMockThread({ id: 'thread-2' })];
      const validResponse = {
        threads: mockThreads,
        total: 2,
        hasMore: false,
      };

      const result = ThreadsResponseSchema.safeParse(validResponse);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validResponse);
      }
    });

    it('should validate response with empty threads array', () => {
      const emptyResponse = {
        threads: [],
        total: 0,
        hasMore: false,
      };

      const result = ThreadsResponseSchema.safeParse(emptyResponse);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(emptyResponse);
      }
    });

    it('should validate response with hasMore true', () => {
      const paginatedResponse = {
        threads: [createMockThread()],
        total: 10,
        hasMore: true,
      };

      const result = ThreadsResponseSchema.safeParse(paginatedResponse);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(paginatedResponse);
      }
    });

    it('should reject response with missing threads', () => {
      const invalidResponse = {
        total: 0,
        hasMore: false,
      };

      const result = ThreadsResponseSchema.safeParse(invalidResponse);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: ['threads'],
              code: 'invalid_type',
            }),
          ]),
        );
      }
    });

    it('should reject response with invalid total type', () => {
      const invalidResponse = {
        threads: [],
        total: 'invalid',
        hasMore: false,
      };

      const result = ThreadsResponseSchema.safeParse(invalidResponse);

      expect(result.success).toBe(false);
    });

    it('should reject response with negative total', () => {
      const invalidResponse = {
        threads: [],
        total: -1,
        hasMore: false,
      };

      const result = ThreadsResponseSchema.safeParse(invalidResponse);

      expect(result.success).toBe(false);
    });

    it('should reject response with invalid hasMore type', () => {
      const invalidResponse = {
        threads: [],
        total: 0,
        hasMore: 'yes',
      };

      const result = ThreadsResponseSchema.safeParse(invalidResponse);

      expect(result.success).toBe(false);
    });
  });

  describe('ApiErrorSchema', () => {
    it('should validate complete error object', () => {
      const validError = {
        error: 'Validation Error',
        message: 'Invalid input provided',
        code: 'VALIDATION_ERROR',
      };

      const result = ApiErrorSchema.safeParse(validError);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validError);
      }
    });

    it('should validate error without optional code', () => {
      const errorWithoutCode = {
        error: 'Internal Server Error',
        message: 'Something went wrong',
      };

      const result = ApiErrorSchema.safeParse(errorWithoutCode);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          error: 'Internal Server Error',
          message: 'Something went wrong',
          code: undefined,
        });
      }
    });

    it('should reject error without required fields', () => {
      const incompleteError = {
        code: 'ERROR_CODE',
      };

      const result = ApiErrorSchema.safeParse(incompleteError);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: ['error'],
              code: 'invalid_type',
            }),
            expect.objectContaining({
              path: ['message'],
              code: 'invalid_type',
            }),
          ]),
        );
      }
    });

    it('should reject error with invalid field types', () => {
      const invalidError = {
        error: 123,
        message: null,
        code: 456,
      };

      const result = ApiErrorSchema.safeParse(invalidError);

      expect(result.success).toBe(false);
    });
  });

  describe('ApiResponseSchema', () => {
    it('should validate successful response with data', () => {
      const dataSchema = CreateThreadOptionsSchema;
      const ResponseSchema = ApiResponseSchema(dataSchema);

      const validResponse = {
        success: true,
        data: { title: 'Test Thread', metadata: {} },
      };

      const result = ResponseSchema.safeParse(validResponse);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validResponse);
      }
    });

    it('should validate error response', () => {
      const dataSchema = CreateThreadOptionsSchema;
      const ResponseSchema = ApiResponseSchema(dataSchema);

      const errorResponse = {
        success: false,
        error: {
          error: 'Validation Error',
          message: 'Invalid input',
          code: 'VALIDATION_ERROR',
        },
      };

      const result = ResponseSchema.safeParse(errorResponse);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(errorResponse);
      }
    });

    it('should validate response with neither data nor error', () => {
      const dataSchema = CreateThreadOptionsSchema;
      const ResponseSchema = ApiResponseSchema(dataSchema);

      const minimalResponse = {
        success: true,
      };

      const result = ResponseSchema.safeParse(minimalResponse);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          success: true,
          data: undefined,
          error: undefined,
        });
      }
    });

    it('should reject response without success field', () => {
      const dataSchema = CreateThreadOptionsSchema;
      const ResponseSchema = ApiResponseSchema(dataSchema);

      const invalidResponse = {
        data: { title: 'Test' },
      };

      const result = ResponseSchema.safeParse(invalidResponse);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: ['success'],
              code: 'invalid_type',
            }),
          ]),
        );
      }
    });

    it('should reject response with invalid success type', () => {
      const dataSchema = CreateThreadOptionsSchema;
      const ResponseSchema = ApiResponseSchema(dataSchema);

      const invalidResponse = {
        success: 'yes',
        data: {},
      };

      const result = ResponseSchema.safeParse(invalidResponse);

      expect(result.success).toBe(false);
    });
  });

  describe('Schema Integration', () => {
    it('should work with nested schemas', () => {
      const ThreadsResponseWithValidation = ApiResponseSchema(ThreadsResponseSchema);

      const validApiResponse = {
        success: true,
        data: createMockThreadsResponse([createMockThread()]),
      };

      const result = ThreadsResponseWithValidation.safeParse(validApiResponse);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.data?.threads).toHaveLength(1);
      }
    });

    it('should chain validations correctly', () => {
      // First validate list options
      const listOptions = { limit: 10, search: 'test' };
      const listResult = ListThreadsOptionsSchema.safeParse(listOptions);

      expect(listResult.success).toBe(true);

      if (listResult.success) {
        // Then validate the transformed result has defaults applied
        expect(listResult.data.offset).toBe(0);
        expect(listResult.data.orderBy).toBe('updatedAt');
        expect(listResult.data.orderDirection).toBe('desc');
      }
    });
  });
});
