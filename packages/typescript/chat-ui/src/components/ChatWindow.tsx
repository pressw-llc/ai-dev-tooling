import React, { useState } from 'react';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: Date;
}

export interface ChatWindowProps {
  onSendMessage: (message: string) => Promise<void>;
  messages: Message[];
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ onSendMessage, messages }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async (message: string) => {
    setIsLoading(true);
    try {
      await onSendMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-window">
      <MessageList messages={messages} />
      <MessageInput onSend={handleSend} disabled={isLoading} />
    </div>
  );
};
