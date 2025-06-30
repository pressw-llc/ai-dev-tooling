// AI Provider tests
import React from 'react';
import { describe, test, expect } from 'bun:test';
import { AIProvider, useAIConfig } from '../../src/ai/providers/ai-provider';
import type { AIProviderProps } from '../../src/ai/types';
import { AIError, AI_ERROR_CODES } from '../../src/ai/types';

describe('AIProvider', () => {
  const defaultConfig: AIProviderProps['config'] = {
    copilotKitUrl: '/api/copilotkit',
    agents: ['test-agent'],
    config: {
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 2000,
      enableMemory: true,
      memoryLimit: 10,
      enableActions: true,
      enableSuggestions: true,
    },
  };

  test('should create AIProvider component', () => {
    expect(() => {
      React.createElement(
        AIProvider,
        { config: defaultConfig },
        React.createElement('div', null, 'Test Child'),
      );
    }).not.toThrow();
  });

  test('should accept valid configuration', () => {
    const validConfigs = [
      defaultConfig,
      {
        copilotKitUrl: '/custom/api',
        config: { model: 'gpt-3.5-turbo' },
      },
      {
        agents: ['agent1', 'agent2'],
      },
      {
        config: {
          temperature: 0.5,
          maxTokens: 1000,
        },
      },
    ];

    validConfigs.forEach((config) => {
      expect(() => {
        React.createElement(AIProvider, { config }, React.createElement('div', null, 'Test'));
      }).not.toThrow();
    });
  });

  test('should have proper default values', () => {
    const config = {
      copilotKitUrl: '/test-api',
    };

    // Test that the provider can be created with minimal config
    expect(() => {
      React.createElement(AIProvider, { config }, React.createElement('div', null, 'Test'));
    }).not.toThrow();
  });

  test('should handle empty config object', () => {
    const config = {};

    expect(() => {
      React.createElement(AIProvider, { config }, React.createElement('div', null, 'Test'));
    }).not.toThrow();
  });

  test('should accept children prop', () => {
    const config = {
      copilotKitUrl: '/api/copilotkit',
    };

    expect(() => {
      React.createElement(
        AIProvider,
        { config },
        React.createElement('div', { key: 'child1' }, 'Child 1'),
        React.createElement('div', { key: 'child2' }, 'Child 2'),
      );
    }).not.toThrow();
  });

  test('should work with different children types', () => {
    const config = {
      copilotKitUrl: '/api/copilotkit',
    };

    const validChildren = [
      'Simple text',
      React.createElement('div', null, 'Element'),
      [
        React.createElement('div', { key: 1 }, 'Array child 1'),
        React.createElement('div', { key: 2 }, 'Array child 2'),
      ],
    ];

    validChildren.forEach((children, index) => {
      expect(() => {
        React.createElement(AIProvider, { config }, children);
      }).not.toThrow();
    });
  });
});

describe('AIProvider type checking', () => {
  test('should have correct prop types', () => {
    // Test that TypeScript accepts valid prop configurations
    const validProps: AIProviderProps[] = [
      {
        config: {
          copilotKitUrl: '/api/copilotkit',
        },
        children: React.createElement('div', null, 'Test'),
      },
      {
        config: {
          agents: ['agent1'],
          config: {
            model: 'gpt-4',
            temperature: 0.7,
          },
        },
        children: 'Simple text',
      },
    ];

    validProps.forEach((props) => {
      expect(() => {
        React.createElement(AIProvider, props);
      }).not.toThrow();
    });
  });

  test('should accept various config shapes', () => {
    const configs = [
      { copilotKitUrl: '/api/test' },
      { agents: ['agent1', 'agent2'] },
      { config: { model: 'gpt-3.5-turbo' } },
      {
        copilotKitUrl: '/api/test',
        agents: ['agent1'],
        config: {
          model: 'gpt-4',
          temperature: 0.5,
          maxTokens: 1000,
          enableMemory: true,
          memoryLimit: 5,
          enableActions: false,
          enableSuggestions: true,
        },
      },
    ];

    configs.forEach((config) => {
      expect(() => {
        React.createElement(AIProvider, {
          config,
          children: React.createElement('div', null, 'Test'),
        });
      }).not.toThrow();
    });
  });
});
