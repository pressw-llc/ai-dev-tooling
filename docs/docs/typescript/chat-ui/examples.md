---
sidebar_position: 4
---

# Examples

Real-world examples of using @pressw/chat-ui components in various scenarios.

## Basic Chat Application

A simple chat interface with message display and input:

```tsx
import React from 'react';
import { ChatProvider, ChatWindow } from '@pressw/chat-ui';
import { useThread } from '@pressw/threads';

export function BasicChat({ threadId }: { threadId: string }) {
  const { data: thread } = useThread(threadId);
  const [messages, setMessages] = useState<Message[]>([]);

  const handleSendMessage = async (content: string) => {
    const newMessage: Message = {
      id: generateId(),
      content,
      author: currentUser,
      timestamp: new Date(),
      type: 'text',
    };

    setMessages([...messages, newMessage]);

    // Send to backend
    await api.sendMessage(threadId, content);
  };

  return (
    <ChatProvider>
      <div style={{ height: '600px', width: '400px' }}>
        <ChatWindow
          thread={thread}
          messages={messages}
          currentUserId={currentUser.id}
          onSendMessage={handleSendMessage}
        />
      </div>
    </ChatProvider>
  );
}
```

## Multi-User Chat Room

Chat room with user list and typing indicators:

```tsx
import React, { useEffect, useState } from 'react';
import { ChatProvider, ChatWindow, UserList, TypingIndicator } from '@pressw/chat-ui';

export function ChatRoom({ roomId }: { roomId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [typingUsers, setTypingUsers] = useState<User[]>([]);

  useEffect(() => {
    // Connect to WebSocket
    const ws = new WebSocket(`wss://api.example.com/rooms/${roomId}`);

    ws.on('message', (message) => {
      setMessages((prev) => [...prev, message]);
    });

    ws.on('user-joined', (user) => {
      setUsers((prev) => [...prev, user]);
    });

    ws.on('user-typing', (user) => {
      setTypingUsers((prev) => [...prev, user]);

      // Remove after 3 seconds
      setTimeout(() => {
        setTypingUsers((prev) => prev.filter((u) => u.id !== user.id));
      }, 3000);
    });

    return () => ws.close();
  }, [roomId]);

  return (
    <ChatProvider>
      <div style={{ display: 'flex', height: '100vh' }}>
        <aside style={{ width: '250px', borderRight: '1px solid #e0e0e0' }}>
          <UserList users={users} currentUserId={currentUser.id} showStatus title="Online Users" />
        </aside>

        <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <ChatWindow
            messages={messages}
            currentUserId={currentUser.id}
            onSendMessage={handleSendMessage}
            showTypingIndicator={typingUsers.length > 0}
            typingUsers={typingUsers}
          />
        </main>
      </div>
    </ChatProvider>
  );
}
```

## Customer Support Chat

Support chat with file uploads and canned responses:

```tsx
import React, { useState } from 'react';
import {
  ChatProvider,
  ChatWindow,
  Message,
  MessageInput,
} from '@pressw/chat-ui';

const cannedResponses = [
  { id: '1', text: 'Thank you for contacting support. How can I help you today?' },
  { id: '2', text: 'I understand your concern. Let me look into this for you.' },
  { id: '3', text: 'Could you please provide your order number?' },
  { id: '4', text: 'I've escalated this to our technical team.' },
];

export function SupportChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'system',
      content: 'Welcome to customer support. An agent will be with you shortly.',
      timestamp: new Date(),
    },
  ]);

  const handleSendMessage = async (content: string, attachments?: File[]) => {
    // Handle file uploads
    if (attachments && attachments.length > 0) {
      for (const file of attachments) {
        const url = await uploadFile(file);

        const fileMessage: Message = {
          id: generateId(),
          type: 'file',
          content: {
            name: file.name,
            size: file.size,
            url,
            mimeType: file.type,
          },
          author: currentUser,
          timestamp: new Date(),
        };

        setMessages(prev => [...prev, fileMessage]);
      }
    }

    // Send text message
    if (content) {
      const message: Message = {
        id: generateId(),
        type: 'text',
        content,
        author: currentUser,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, message]);
    }
  };

  return (
    <ChatProvider theme={supportTheme}>
      <div style={{ height: '500px', width: '350px' }}>
        <div style={{ marginBottom: '10px' }}>
          <h4>Quick Responses:</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
            {cannedResponses.map(response => (
              <button
                key={response.id}
                onClick={() => handleSendMessage(response.text)}
                style={{
                  padding: '5px 10px',
                  fontSize: '12px',
                  borderRadius: '15px',
                }}
              >
                {response.text.substring(0, 20)}...
              </button>
            ))}
          </div>
        </div>

        <ChatWindow
          messages={messages}
          currentUserId={currentUser.id}
          onSendMessage={handleSendMessage}
          allowFileUpload
          maxFileSize={10 * 1024 * 1024} // 10MB
          acceptedFileTypes={['.pdf', '.png', '.jpg', '.doc', '.docx']}
          placeholder="Type your message or drag files here..."
        />
      </div>
    </ChatProvider>
  );
}
```

## Real-time Collaborative Chat

Chat with real-time updates, reactions, and editing:

```tsx
import React, { useEffect, useState } from 'react';
import { ChatProvider, ChatWindow, Message as MessageComponent } from '@pressw/chat-ui';
import { io } from 'socket.io-client';

export function CollaborativeChat({ projectId }: { projectId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const newSocket = io('wss://api.example.com', {
      query: { projectId },
    });

    newSocket.on('message:new', (message) => {
      setMessages((prev) => [...prev, message]);
    });

    newSocket.on('message:update', (updatedMessage) => {
      setMessages((prev) =>
        prev.map((msg) => (msg.id === updatedMessage.id ? updatedMessage : msg)),
      );
    });

    newSocket.on('message:delete', (messageId) => {
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
    });

    newSocket.on('reaction:add', ({ messageId, reaction }) => {
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === messageId) {
            const reactions = msg.reactions || [];
            const existing = reactions.find((r) => r.emoji === reaction.emoji);

            if (existing) {
              existing.users.push(reaction.userId);
              existing.count++;
            } else {
              reactions.push({
                emoji: reaction.emoji,
                users: [reaction.userId],
                count: 1,
              });
            }

            return { ...msg, reactions };
          }
          return msg;
        }),
      );
    });

    setSocket(newSocket);
    return () => newSocket.close();
  }, [projectId]);

  const handleSendMessage = async (content: string) => {
    socket.emit('message:send', {
      content,
      projectId,
    });
  };

  const handleEditMessage = (messageId: string, newContent: string) => {
    socket.emit('message:edit', {
      messageId,
      content: newContent,
    });
  };

  const handleDeleteMessage = (messageId: string) => {
    socket.emit('message:delete', { messageId });
  };

  const handleReaction = (messageId: string, emoji: string) => {
    socket.emit('reaction:toggle', {
      messageId,
      emoji,
    });
  };

  return (
    <ChatProvider>
      <ChatWindow
        messages={messages}
        currentUserId={currentUser.id}
        onSendMessage={handleSendMessage}
        components={{
          Message: ({ message, ...props }) => (
            <MessageComponent
              {...props}
              message={message}
              onEdit={() => {
                const newContent = prompt('Edit message:', message.content);
                if (newContent) handleEditMessage(message.id, newContent);
              }}
              onDelete={() => {
                if (confirm('Delete this message?')) {
                  handleDeleteMessage(message.id);
                }
              }}
              onReact={(emoji) => handleReaction(message.id, emoji)}
              actions={[
                { label: 'Edit', onClick: () => {}, icon: EditIcon },
                { label: 'Delete', onClick: () => {}, icon: DeleteIcon, danger: true },
              ]}
            />
          ),
        }}
      />
    </ChatProvider>
  );
}
```

## Mobile-Responsive Chat

Adaptive chat interface for mobile devices:

```tsx
import React, { useState } from 'react';
import { ChatProvider, ChatWindow, defaultTheme } from '@pressw/chat-ui';
import { useMediaQuery } from '@/hooks/useMediaQuery';

const mobileTheme = {
  ...defaultTheme,
  spacing: {
    xs: '0.125rem',
    sm: '0.25rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
  },
  typography: {
    ...defaultTheme.typography,
    fontSize: {
      xs: '0.75rem',
      sm: '0.813rem',
      base: '0.875rem',
      lg: '1rem',
      xl: '1.125rem',
    },
  },
};

export function MobileChat() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      // Detect virtual keyboard on mobile
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.clientHeight;
      setIsKeyboardOpen(windowHeight < documentHeight * 0.75);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <ChatProvider theme={isMobile ? mobileTheme : defaultTheme}>
      <div
        style={{
          height: isKeyboardOpen ? 'calc(100vh - 300px)' : '100vh',
          display: 'flex',
          flexDirection: 'column',
          transition: 'height 0.3s ease',
        }}
      >
        {isMobile && (
          <header
            style={{
              padding: '10px',
              borderBottom: '1px solid #e0e0e0',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <button onClick={() => window.history.back()}>←</button>
            <h3 style={{ margin: 0, flex: 1 }}>Chat</h3>
            <button>⋮</button>
          </header>
        )}

        <div style={{ flex: 1, overflow: 'hidden' }}>
          <ChatWindow
            messages={messages}
            currentUserId={currentUser.id}
            onSendMessage={handleSendMessage}
            // Mobile-specific props
            allowFileUpload={!isMobile}
            showTypingIndicator={!isKeyboardOpen}
            estimatedItemSize={isMobile ? 60 : 80}
          />
        </div>
      </div>
    </ChatProvider>
  );
}
```

## AI Assistant Chat

Chat interface with AI assistant integration:

```tsx
import React, { useState } from 'react';
import {
  ChatProvider,
  ChatWindow,
  Message,
  LoadingSpinner,
} from '@pressw/chat-ui';

export function AIAssistantChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'system',
      content: 'AI Assistant ready to help. Ask me anything!',
      timestamp: new Date(),
    },
  ]);
  const [isAITyping, setIsAITyping] = useState(false);

  const handleSendMessage = async (content: string) => {
    // Add user message
    const userMessage: Message = {
      id: generateId(),
      type: 'text',
      content,
      author: currentUser,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsAITyping(true);

    try {
      // Call AI API
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.author.id === 'ai' ? 'assistant' : 'user',
            content: m.content,
          })),
        }),
      });

      const data = await response.json();

      // Add AI response
      const aiMessage: Message = {
        id: generateId(),
        type: 'text',
        content: data.response,
        author: {
          id: 'ai',
          name: 'AI Assistant',
          avatar: '/ai-avatar.png',
        },
        timestamp: new Date(),
        metadata: {
          model: data.model,
          tokens: data.tokens,
        },
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      // Error message
      const errorMessage: Message = {
        id: generateId(),
        type: 'system',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsAITyping(false);
    }
  };

  return (
    <ChatProvider theme={aiTheme}>
      <div style={{ height: '600px', width: '400px' }}>
        <ChatWindow
          messages={messages}
          currentUserId={currentUser.id}
          onSendMessage={handleSendMessage}
          showTypingIndicator={isAITyping}
          typingUsers={isAITyping ? [{ id: 'ai', name: 'AI Assistant' }] : []}
          placeholder="Ask the AI assistant..."
          components={{
            Message: ({ message, ...props }) => (
              <MessageComponent
                {...props}
                message={message}
                // Show thinking indicator for AI messages
                {message.author.id === 'ai' && (
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                    Model: {message.metadata?.model} |
                    Tokens: {message.metadata?.tokens}
                  </div>
                )}
              />
            ),
          }}
        />
      </div>
    </ChatProvider>
  );
}
```

## Integrated with Threads

Full integration with @pressw/threads package:

```tsx
import React from 'react';
import { ChatProvider, ChatWindow } from '@pressw/chat-ui';
import {
  useThread,
  useThreadMessages,
  useCreateMessage,
  useUpdateMessage,
  useDeleteMessage,
} from '@pressw/threads';

export function ThreadsIntegratedChat({ threadId }: { threadId: string }) {
  const { data: thread } = useThread(threadId);
  const { data: messages, isLoading } = useThreadMessages(threadId);
  const createMessage = useCreateMessage();
  const updateMessage = useUpdateMessage();
  const deleteMessage = useDeleteMessage();

  const handleSendMessage = async (content: string, attachments?: File[]) => {
    await createMessage.mutateAsync({
      threadId,
      content,
      attachments,
    });
  };

  const handleEditMessage = async (messageId: string, content: string) => {
    await updateMessage.mutateAsync({
      id: messageId,
      content,
    });
  };

  const handleDeleteMessage = async (messageId: string) => {
    await deleteMessage.mutateAsync(messageId);
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <ChatProvider>
      <ChatWindow
        thread={thread}
        messages={messages}
        currentUserId={currentUser.id}
        onSendMessage={handleSendMessage}
        components={{
          Message: ({ message, ...props }) => (
            <MessageComponent
              {...props}
              message={message}
              onEdit={(content) => handleEditMessage(message.id, content)}
              onDelete={() => handleDeleteMessage(message.id)}
              editable={message.author.id === currentUser.id}
              deletable={message.author.id === currentUser.id}
            />
          ),
        }}
      />
    </ChatProvider>
  );
}
```
