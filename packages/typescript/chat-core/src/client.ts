import type { ChatConfig, Message } from './types';

export class ChatClient {
  private config: ChatConfig;

  constructor(config: ChatConfig) {
    this.config = config;
  }

  async sendMessage(message: string): Promise<Message> {
    // Placeholder implementation
    return {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: `Echo: ${message}`,
      timestamp: new Date(),
    };
  }

  async getHistory(): Promise<Message[]> {
    // Placeholder implementation
    return [];
  }
}
