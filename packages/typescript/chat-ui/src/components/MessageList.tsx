import React from 'react';
import type { Message } from './ChatWindow';

export interface MessageListProps {
  messages: Message[];
}

export const MessageList: React.FC<MessageListProps> = ({ messages }) => {
  return (
    <div className="message-list">
      {messages.map((message) => (
        <div key={message.id} className={`message message-${message.role}`}>
          <div className="message-role">{message.role}</div>
          <div className="message-content">{message.content}</div>
          {message.timestamp && (
            <div className="message-timestamp">{message.timestamp.toLocaleTimeString()}</div>
          )}
        </div>
      ))}
    </div>
  );
};
