import { describe, it, expect } from 'vitest';
import { DrizzleAdapter } from '../src/drizzle-adapter';
import type { DrizzleAdapterConfig, DrizzleDB } from '../src/drizzle-adapter';

describe('DrizzleAdapter', () => {
  describe('constructor', () => {
    it('should throw error if schema not found', () => {
      const invalidDb = {} as DrizzleDB;
      const config: DrizzleAdapterConfig = {
        provider: 'pg',
        tables: {
          user: 'users',
          thread: 'threads',
          feedback: 'feedback',
        },
      };

      expect(() => new DrizzleAdapter(invalidDb, config)).toThrow('Drizzle schema not found');
    });

    it('should throw error if table not found in schema', () => {
      const mockDb = {
        _: {
          fullSchema: {
            users: {
              id: { _type: 'column', name: 'id' },
              name: { _type: 'column', name: 'name' },
              createdAt: { _type: 'column', name: 'createdAt' },
              updatedAt: { _type: 'column', name: 'updatedAt' },
            },
          },
        },
      } as DrizzleDB;

      const config: DrizzleAdapterConfig = {
        provider: 'pg',
        tables: {
          user: 'non_existent_table',
          thread: 'threads',
          feedback: 'feedback',
        },
      };

      expect(() => new DrizzleAdapter(mockDb, config)).toThrow(
        'Table "non_existent_table" not found in database schema',
      );
    });

    it('should validate required fields', () => {
      const mockDb = {
        _: {
          fullSchema: {
            users: {
              id: { _type: 'column', name: 'id' },
              // Missing 'name' field
              createdAt: { _type: 'column', name: 'createdAt' },
              updatedAt: { _type: 'column', name: 'updatedAt' },
            },
            threads: {
              id: { _type: 'column', name: 'id' },
              userId: { _type: 'column', name: 'userId' },
              createdAt: { _type: 'column', name: 'createdAt' },
              updatedAt: { _type: 'column', name: 'updatedAt' },
            },
            feedback: {
              id: { _type: 'column', name: 'id' },
              threadId: { _type: 'column', name: 'threadId' },
              userId: { _type: 'column', name: 'userId' },
              type: { _type: 'column', name: 'type' },
              createdAt: { _type: 'column', name: 'createdAt' },
              updatedAt: { _type: 'column', name: 'updatedAt' },
            },
          },
        },
      } as DrizzleDB;

      const config: DrizzleAdapterConfig = {
        provider: 'pg',
        tables: {
          user: 'users',
          thread: 'threads',
          feedback: 'feedback',
        },
      };

      expect(() => new DrizzleAdapter(mockDb, config)).toThrow(
        'Required field "name" not found in table "users"',
      );
    });

    it('should handle custom field mappings', () => {
      const mockDb = {
        _: {
          fullSchema: {
            users: {
              id: { _type: 'column', name: 'id' },
              full_name: { _type: 'column', name: 'full_name' }, // Custom field name
              createdAt: { _type: 'column', name: 'createdAt' },
              updatedAt: { _type: 'column', name: 'updatedAt' },
            },
            threads: {
              id: { _type: 'column', name: 'id' },
              userId: { _type: 'column', name: 'userId' },
              createdAt: { _type: 'column', name: 'createdAt' },
              updatedAt: { _type: 'column', name: 'updatedAt' },
            },
            feedback: {
              id: { _type: 'column', name: 'id' },
              threadId: { _type: 'column', name: 'threadId' },
              userId: { _type: 'column', name: 'userId' },
              type: { _type: 'column', name: 'type' },
              createdAt: { _type: 'column', name: 'createdAt' },
              updatedAt: { _type: 'column', name: 'updatedAt' },
            },
          },
        },
      } as DrizzleDB;

      const config: DrizzleAdapterConfig = {
        provider: 'pg',
        tables: {
          user: 'users',
          thread: 'threads',
          feedback: 'feedback',
        },
        fields: {
          user: {
            name: 'full_name', // Map 'name' to 'full_name'
          },
        },
      };

      // Should not throw error
      expect(() => new DrizzleAdapter(mockDb, config)).not.toThrow();
    });
  });

  describe('getSchema', () => {
    it('should return schema for valid model', () => {
      const mockDb = {
        _: {
          fullSchema: {
            users: {
              id: { _type: 'column', name: 'id' },
              name: { _type: 'column', name: 'name' },
              createdAt: { _type: 'column', name: 'createdAt' },
              updatedAt: { _type: 'column', name: 'updatedAt' },
            },
            threads: {
              id: { _type: 'column', name: 'id' },
              userId: { _type: 'column', name: 'userId' },
              createdAt: { _type: 'column', name: 'createdAt' },
              updatedAt: { _type: 'column', name: 'updatedAt' },
            },
            feedback: {
              id: { _type: 'column', name: 'id' },
              threadId: { _type: 'column', name: 'threadId' },
              userId: { _type: 'column', name: 'userId' },
              type: { _type: 'column', name: 'type' },
              createdAt: { _type: 'column', name: 'createdAt' },
              updatedAt: { _type: 'column', name: 'updatedAt' },
            },
          },
        },
      } as DrizzleDB;

      const config: DrizzleAdapterConfig = {
        provider: 'pg',
        tables: {
          user: 'users',
          thread: 'threads',
          feedback: 'feedback',
        },
      };

      const adapter = new DrizzleAdapter(mockDb, config);
      const schema = adapter.getSchema('user');
      expect(schema).toBe(mockDb._!.fullSchema!.users);
    });

    it('should return undefined for invalid model', () => {
      const mockDb = {
        _: {
          fullSchema: {
            users: {
              id: { _type: 'column', name: 'id' },
              name: { _type: 'column', name: 'name' },
              createdAt: { _type: 'column', name: 'createdAt' },
              updatedAt: { _type: 'column', name: 'updatedAt' },
            },
            threads: {
              id: { _type: 'column', name: 'id' },
              userId: { _type: 'column', name: 'userId' },
              createdAt: { _type: 'column', name: 'createdAt' },
              updatedAt: { _type: 'column', name: 'updatedAt' },
            },
            feedback: {
              id: { _type: 'column', name: 'id' },
              threadId: { _type: 'column', name: 'threadId' },
              userId: { _type: 'column', name: 'userId' },
              type: { _type: 'column', name: 'type' },
              createdAt: { _type: 'column', name: 'createdAt' },
              updatedAt: { _type: 'column', name: 'updatedAt' },
            },
          },
        },
      } as DrizzleDB;

      const config: DrizzleAdapterConfig = {
        provider: 'pg',
        tables: {
          user: 'users',
          thread: 'threads',
          feedback: 'feedback',
        },
      };

      const adapter = new DrizzleAdapter(mockDb, config);
      const result = adapter.getSchema('invalid');
      expect(result).toBeUndefined();
    });
  });

  describe('data transformations', () => {
    it('should handle different database capabilities', () => {
      const mockDb = {
        _: {
          fullSchema: {
            users: {
              id: { _type: 'column', name: 'id' },
              name: { _type: 'column', name: 'name' },
              createdAt: { _type: 'column', name: 'createdAt' },
              updatedAt: { _type: 'column', name: 'updatedAt' },
            },
            threads: {
              id: { _type: 'column', name: 'id' },
              userId: { _type: 'column', name: 'userId' },
              metadata: { _type: 'column', name: 'metadata' },
              createdAt: { _type: 'column', name: 'createdAt' },
              updatedAt: { _type: 'column', name: 'updatedAt' },
            },
            feedback: {
              id: { _type: 'column', name: 'id' },
              threadId: { _type: 'column', name: 'threadId' },
              userId: { _type: 'column', name: 'userId' },
              type: { _type: 'column', name: 'type' },
              helpful: { _type: 'column', name: 'helpful' },
              createdAt: { _type: 'column', name: 'createdAt' },
              updatedAt: { _type: 'column', name: 'updatedAt' },
            },
          },
        },
      } as DrizzleDB;

      // Test with SQLite (no JSON, dates, or boolean support)
      const sqliteConfig: DrizzleAdapterConfig = {
        provider: 'sqlite',
        tables: {
          user: 'users',
          thread: 'threads',
          feedback: 'feedback',
        },
        supportsJSON: false,
        supportsDates: false,
        supportsBooleans: false,
      };

      // Should not throw
      expect(() => new DrizzleAdapter(mockDb, sqliteConfig)).not.toThrow();

      // Test with PostgreSQL (full support)
      const pgConfig: DrizzleAdapterConfig = {
        provider: 'pg',
        tables: {
          user: 'users',
          thread: 'threads',
          feedback: 'feedback',
        },
        supportsJSON: true,
        supportsDates: true,
        supportsBooleans: true,
        supportsReturning: true,
      };

      // Should not throw
      expect(() => new DrizzleAdapter(mockDb, pgConfig)).not.toThrow();
    });
  });
});
