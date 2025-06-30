import { describe, expect, it } from 'bun:test';
import { ChatClient } from '../src/client';

describe('ChatClient', () => {
  it('should create a client instance', () => {
    const client = new ChatClient({
      apiKey: 'test-key',
    });
    expect(client).toBeDefined();
  });

  it('should send a message and receive response', async () => {
    const client = new ChatClient({
      apiKey: 'test-key',
    });

    const response = await client.sendMessage('Hello');

    expect(response).toBeDefined();
    expect(response.role).toBe('assistant');
    expect(response.content).toBe('Echo: Hello');
    expect(response.timestamp).toBeInstanceOf(Date);
  });

  it('should return empty history', async () => {
    const client = new ChatClient({
      apiKey: 'test-key',
    });

    const history = await client.getHistory();

    expect(history).toEqual([]);
  });
});
