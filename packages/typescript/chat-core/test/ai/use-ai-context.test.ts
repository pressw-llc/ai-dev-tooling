import { describe, test, expect } from 'bun:test';
import {
  createContextItem,
  estimateContextItemSize,
  validateContextItems,
} from '../../src/ai/hooks/use-ai-context';
import type { AIContextItem } from '../../src/ai/types';

describe('useAIContext utilities', () => {
  describe('createContextItem', () => {
    test('should create valid context item', () => {
      const item = createContextItem('test', 'Test item', { key: 'value' }, 5);

      expect(item).toEqual({
        name: 'test',
        description: 'Test item',
        data: { key: 'value' },
        priority: 5,
      });
    });

    test('should trim whitespace from name and description', () => {
      const item = createContextItem('  test  ', '  Test item  ', {});

      expect(item.name).toBe('test');
      expect(item.description).toBe('Test item');
    });

    test('should clamp priority to valid range', () => {
      const lowItem = createContextItem('test', 'Test', {}, -5);
      const highItem = createContextItem('test', 'Test', {}, 15);

      expect(lowItem.priority).toBe(1);
      expect(highItem.priority).toBe(10);
    });

    test('should use default priority when not specified', () => {
      const item = createContextItem('test', 'Test', {});

      expect(item.priority).toBe(1);
    });
  });

  describe('estimateContextItemSize', () => {
    test('should estimate size correctly', () => {
      const item: AIContextItem = {
        name: 'test',
        description: 'Test item',
        data: { key: 'value' },
      };

      const size = estimateContextItemSize(item);
      const expectedSize = JSON.stringify({
        name: 'test',
        description: 'Test item',
        data: { key: 'value' },
      }).length;

      expect(size).toBe(expectedSize);
    });

    test('should handle null data', () => {
      const item: AIContextItem = {
        name: 'test',
        description: 'Test item',
        data: null,
      };

      const size = estimateContextItemSize(item);
      expect(size).toBeGreaterThan(0);
    });

    test('should handle complex nested objects', () => {
      const item: AIContextItem = {
        name: 'complex',
        description: 'Complex item',
        data: {
          nested: {
            array: [1, 2, 3],
            object: { key: 'value' },
            nullValue: null,
            boolValue: true,
          },
        },
      };

      const size = estimateContextItemSize(item);
      expect(size).toBeGreaterThan(50); // Should be a reasonable size for complex data
    });
  });

  describe('validateContextItems', () => {
    test('should validate correct context items', () => {
      const items: AIContextItem[] = [
        {
          name: 'valid-item',
          description: 'Valid item',
          data: { key: 'value' },
          priority: 5,
        },
      ];

      const result = validateContextItems(items);

      expect(result.valid).toHaveLength(1);
      expect(result.invalid).toHaveLength(0);
      expect(result.valid[0].name).toBe('valid-item');
    });

    test('should handle items without priority (default to valid)', () => {
      const items: AIContextItem[] = [
        {
          name: 'no-priority',
          description: 'No priority item',
          data: { key: 'value' },
        },
      ];

      const result = validateContextItems(items);

      expect(result.valid).toHaveLength(1);
      expect(result.invalid).toHaveLength(0);
    });

    test('should reject items with missing name', () => {
      const items: AIContextItem[] = [
        {
          name: '',
          description: 'Valid description',
          data: {},
        } as AIContextItem,
      ];

      const result = validateContextItems(items);

      expect(result.valid).toHaveLength(0);
      expect(result.invalid).toHaveLength(1);
      expect(result.invalid[0].error).toContain('name is required');
    });

    test('should reject items with non-string name', () => {
      const items: AIContextItem[] = [
        {
          name: null as any,
          description: 'Valid description',
          data: {},
        },
      ];

      const result = validateContextItems(items);

      expect(result.valid).toHaveLength(0);
      expect(result.invalid).toHaveLength(1);
      expect(result.invalid[0].error).toContain('name is required and must be a string');
    });

    test('should reject items with missing description', () => {
      const items: AIContextItem[] = [
        {
          name: 'valid-name',
          description: '',
          data: {},
        } as AIContextItem,
      ];

      const result = validateContextItems(items);

      expect(result.valid).toHaveLength(0);
      expect(result.invalid).toHaveLength(1);
      expect(result.invalid[0].error).toContain('description is required');
    });

    test('should reject items with non-string description', () => {
      const items: AIContextItem[] = [
        {
          name: 'valid-name',
          description: null as any,
          data: {},
        },
      ];

      const result = validateContextItems(items);

      expect(result.valid).toHaveLength(0);
      expect(result.invalid).toHaveLength(1);
      expect(result.invalid[0].error).toContain('description is required and must be a string');
    });

    test('should reject items with invalid priority (too low)', () => {
      const items: AIContextItem[] = [
        {
          name: 'valid-name',
          description: 'Valid description',
          data: {},
          priority: 0, // Invalid: too low
        },
      ];

      const result = validateContextItems(items);

      expect(result.valid).toHaveLength(0);
      expect(result.invalid).toHaveLength(1);
      expect(result.invalid[0].error).toContain('priority must be a number between 1 and 10');
    });

    test('should reject items with invalid priority (too high)', () => {
      const items: AIContextItem[] = [
        {
          name: 'valid-name',
          description: 'Valid description',
          data: {},
          priority: 15, // Invalid: too high
        },
      ];

      const result = validateContextItems(items);

      expect(result.valid).toHaveLength(0);
      expect(result.invalid).toHaveLength(1);
      expect(result.invalid[0].error).toContain('priority must be a number between 1 and 10');
    });

    test('should reject items with non-numeric priority', () => {
      const items: AIContextItem[] = [
        {
          name: 'valid-name',
          description: 'Valid description',
          data: {},
          priority: 'high' as any,
        },
      ];

      const result = validateContextItems(items);

      expect(result.valid).toHaveLength(0);
      expect(result.invalid).toHaveLength(1);
      expect(result.invalid[0].error).toContain('priority must be a number between 1 and 10');
    });

    test('should reject items with non-serializable data', () => {
      const circularData: any = { circular: null };
      circularData.circular = circularData;

      const items: AIContextItem[] = [
        {
          name: 'valid-name',
          description: 'Valid description',
          data: circularData,
        },
      ];

      const result = validateContextItems(items);

      expect(result.valid).toHaveLength(0);
      expect(result.invalid).toHaveLength(1);
      expect(result.invalid[0].error).toContain('must be serializable to JSON');
    });

    test('should handle mixed valid and invalid items', () => {
      const items: AIContextItem[] = [
        {
          name: 'valid-item',
          description: 'Valid item',
          data: { key: 'value' },
        },
        {
          name: '',
          description: 'Invalid item',
          data: {},
        } as AIContextItem,
        {
          name: 'another-valid',
          description: 'Another valid item',
          data: { other: 'data' },
          priority: 3,
        },
      ];

      const result = validateContextItems(items);

      expect(result.valid).toHaveLength(2);
      expect(result.invalid).toHaveLength(1);
      expect(result.valid[0].name).toBe('valid-item');
      expect(result.valid[1].name).toBe('another-valid');
      expect(result.invalid[0].error).toContain('name is required');
    });

    test('should handle empty array', () => {
      const result = validateContextItems([]);

      expect(result.valid).toHaveLength(0);
      expect(result.invalid).toHaveLength(0);
    });

    test('should handle complex valid data structures', () => {
      const items: AIContextItem[] = [
        {
          name: 'complex-valid',
          description: 'Complex valid item',
          data: {
            user: {
              id: '123',
              name: 'John Doe',
              preferences: {
                theme: 'dark',
                notifications: true,
              },
            },
            history: [
              { action: 'login', timestamp: '2023-01-01T00:00:00Z' },
              { action: 'view-page', page: '/dashboard' },
            ],
            metadata: {
              version: '1.0',
              tags: ['important', 'user-data'],
              counts: { views: 42, clicks: 13 },
            },
          },
          priority: 7,
        },
      ];

      const result = validateContextItems(items);

      expect(result.valid).toHaveLength(1);
      expect(result.invalid).toHaveLength(0);
      expect(result.valid[0].name).toBe('complex-valid');
    });

    test('should validate priority boundaries correctly', () => {
      const items: AIContextItem[] = [
        {
          name: 'min-priority',
          description: 'Minimum priority item',
          data: {},
          priority: 1, // Valid minimum
        },
        {
          name: 'max-priority',
          description: 'Maximum priority item',
          data: {},
          priority: 10, // Valid maximum
        },
      ];

      const result = validateContextItems(items);

      expect(result.valid).toHaveLength(2);
      expect(result.invalid).toHaveLength(0);
    });
  });

  describe('Context size calculations', () => {
    test('should handle very large context data', () => {
      const largeString = 'x'.repeat(10000);
      const item: AIContextItem = {
        name: 'large-item',
        description: 'Large data item',
        data: { content: largeString },
      };

      const size = estimateContextItemSize(item);
      expect(size).toBeGreaterThan(10000);
    });

    test('should handle context with arrays of objects', () => {
      const item: AIContextItem = {
        name: 'array-item',
        description: 'Item with array data',
        data: {
          items: Array.from({ length: 100 }, (_, i) => ({
            id: i,
            name: `Item ${i}`,
            active: i % 2 === 0,
          })),
        },
      };

      const size = estimateContextItemSize(item);
      expect(size).toBeGreaterThan(1000); // Should be substantial for 100 objects
    });

    test('should be consistent between multiple calculations', () => {
      const item: AIContextItem = {
        name: 'consistent-item',
        description: 'Consistency test item',
        data: { key: 'value', number: 42, boolean: true },
      };

      const size1 = estimateContextItemSize(item);
      const size2 = estimateContextItemSize(item);
      const size3 = estimateContextItemSize(item);

      expect(size1).toBe(size2);
      expect(size2).toBe(size3);
    });
  });

  describe('Edge cases and error handling', () => {
    test('should handle items with undefined data', () => {
      const items: AIContextItem[] = [
        {
          name: 'undefined-data',
          description: 'Item with undefined data',
          data: undefined,
        },
      ];

      const result = validateContextItems(items);
      expect(result.valid).toHaveLength(1); // undefined is serializable as null
    });

    test('should handle items with function data (should be invalid)', () => {
      const items: AIContextItem[] = [
        {
          name: 'function-data',
          description: 'Item with function data',
          data: { fn: () => 'test' },
        },
      ];

      const result = validateContextItems(items);
      expect(result.valid).toHaveLength(1); // Functions are ignored in JSON.stringify
    });

    test('should handle deeply nested objects', () => {
      const deepObject: any = { level: 1 };
      let current = deepObject;
      for (let i = 2; i <= 100; i++) {
        current.next = { level: i };
        current = current.next;
      }

      const items: AIContextItem[] = [
        {
          name: 'deep-object',
          description: 'Deeply nested object',
          data: deepObject,
        },
      ];

      const result = validateContextItems(items);
      expect(result.valid).toHaveLength(1);

      const size = estimateContextItemSize(items[0]);
      expect(size).toBeGreaterThan(1000);
    });

    test('should handle special characters in strings', () => {
      const items: AIContextItem[] = [
        {
          name: 'special-chars',
          description: 'Item with special characters: 你好, émojis 🎉, and "quotes"',
          data: {
            text: 'Special: \n\t\r\b\f\\\/"\'',
            unicode: '你好世界',
            emoji: '🎉🚀💡',
          },
        },
      ];

      const result = validateContextItems(items);
      expect(result.valid).toHaveLength(1);

      const size = estimateContextItemSize(items[0]);
      expect(size).toBeGreaterThan(50);
    });
  });
});

describe('useAIContext integration', () => {
  test('should export the hook and utilities', async () => {
    // Test that the module exports are available
    const module = await import('../../src/ai/hooks/use-ai-context');

    expect(typeof module.useAIContext).toBe('function');
    expect(typeof module.createContextItem).toBe('function');
    expect(typeof module.estimateContextItemSize).toBe('function');
    expect(typeof module.validateContextItems).toBe('function');
  });

  test('should be available through the hooks index', async () => {
    const hooksModule = await import('../../src/ai/hooks');

    expect(typeof hooksModule.useAIContext).toBe('function');
    expect(typeof hooksModule.createContextItem).toBe('function');
    expect(typeof hooksModule.estimateContextItemSize).toBe('function');
    expect(typeof hooksModule.validateContextItems).toBe('function');
  });
});
