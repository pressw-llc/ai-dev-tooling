import { describe, it, expect } from 'vitest';
import { LangGraphAdapter } from '../src/langgraph-adapter';
import type { LangGraphAdapterConfig } from '../src/langgraph-adapter';

describe('LangGraphAdapter', () => {
  describe('constructor', () => {
    it('should create adapter with valid config', () => {
      const config: LangGraphAdapterConfig = {
        apiUrl: 'https://api.langsmith.com',
        apiKey: 'test-key',
        assistantId: 'test-assistant',
        supportsJSON: true,
        supportsDates: true,
        supportsBooleans: true,
        supportsReturning: true,
      };

      const adapter = new LangGraphAdapter(config);
      expect(adapter).toBeInstanceOf(LangGraphAdapter);
      expect(adapter.config).toMatchObject(config);
    });

    it('should use default values for optional config', () => {
      const config: LangGraphAdapterConfig = {
        apiUrl: 'https://api.langsmith.com',
        apiKey: 'test-key',
        assistantId: 'test-assistant',
      };

      const adapter = new LangGraphAdapter(config);
      // BaseAdapter sets default values
      expect(adapter.config.supportsJSON).toBe(false); // Default from BaseAdapter
      expect(adapter.config.supportsDates).toBe(true);
      expect(adapter.config.supportsBooleans).toBe(true);
      expect(adapter.config.supportsReturning).toBe(true);
    });
  });

  describe('getSchema', () => {
    it('should return schema for thread model', () => {
      const config: LangGraphAdapterConfig = {
        apiUrl: 'https://api.langsmith.com',
        apiKey: 'test-key',
        assistantId: 'test-assistant',
      };

      const adapter = new LangGraphAdapter(config);
      const threadSchema = adapter.getSchema('thread');
      expect(threadSchema).toBeDefined();
      expect(threadSchema).toHaveProperty('id');
      expect(threadSchema).toHaveProperty('userId');

      // Non-thread models should return undefined
      expect(adapter.getSchema('user')).toBeUndefined();
      expect(adapter.getSchema('feedback')).toBeUndefined();
    });
  });
});
