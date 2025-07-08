---
sidebar_position: 1
---

# @pressw/chat-ui

Pre-built React components for creating beautiful chat interfaces. This package provides customizable UI components that work seamlessly with the @pressw/threads system.

## Overview

`@pressw/chat-ui` offers a complete set of React components for building chat applications:

- 💬 **Message Components** - Display messages with avatars, timestamps, and rich content
- 📝 **Input Components** - Text input with emoji support and file attachments
- 🎨 **Customizable Themes** - Built-in themes and easy customization
- ♿ **Accessible** - WCAG compliant with keyboard navigation
- 📱 **Responsive** - Mobile-first design that works on all devices
- ⚡ **Optimized** - Virtualized scrolling for large message lists

## Installation

```bash
npm install @pressw/chat-ui @pressw/threads

# Peer dependencies
npm install react react-dom
```

## Quick Start

### Basic Chat Window

```tsx
import { ChatWindow, ChatProvider } from '@pressw/chat-ui';
import { useThread } from '@pressw/threads';

function MyChat({ threadId }: { threadId: string }) {
  const { data: thread } = useThread(threadId);

  return (
    <ChatProvider>
      <ChatWindow
        thread={thread}
        onSendMessage={async (message) => {
          // Handle message sending
          console.log('Sending:', message);
        }}
      />
    </ChatProvider>
  );
}
```

### Custom Styling

```tsx
import { ChatWindow, ChatTheme } from '@pressw/chat-ui';

const customTheme: ChatTheme = {
  colors: {
    primary: '#007bff',
    background: '#f8f9fa',
    surface: '#ffffff',
    text: '#212529',
    textSecondary: '#6c757d',
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  },
  borderRadius: {
    message: '1rem',
    input: '0.5rem',
  },
};

function ThemedChat() {
  return (
    <ChatProvider theme={customTheme}>
      <ChatWindow />
    </ChatProvider>
  );
}
```

## Components

### ChatWindow

The main chat interface component that includes message list and input.

```tsx
<ChatWindow
  thread={thread}
  messages={messages}
  onSendMessage={handleSend}
  placeholder="Type a message..."
  showTypingIndicator={isTyping}
  allowFileUpload
  maxFileSize={10 * 1024 * 1024} // 10MB
/>
```

### MessageList

Displays a list of messages with virtualization for performance.

```tsx
<MessageList
  messages={messages}
  currentUserId={userId}
  onMessageClick={handleMessageClick}
  onLoadMore={handleLoadMore}
  hasMore={hasMoreMessages}
  loading={isLoading}
/>
```

### MessageInput

Input component with rich features.

```tsx
<MessageInput
  onSend={handleSend}
  onTyping={handleTyping}
  placeholder="Type your message..."
  allowEmoji
  allowFileAttachment
  maxLength={1000}
  disabled={isSending}
/>
```

### Message

Individual message component.

```tsx
<Message
  content="Hello, world!"
  author={{
    id: 'user-123',
    name: 'John Doe',
    avatar: '/avatar.jpg',
  }}
  timestamp={new Date()}
  isCurrentUser={false}
  status="delivered"
/>
```

### TypingIndicator

Shows when other users are typing.

```tsx
<TypingIndicator
  users={[
    { id: 'user-1', name: 'Alice' },
    { id: 'user-2', name: 'Bob' },
  ]}
/>
```

## Features

### Message Types

Support for various message content types:

```tsx
// Text message
<Message content="Hello!" type="text" />

// Image message
<Message
  type="image"
  content={{
    url: '/image.jpg',
    alt: 'Shared image',
    width: 400,
    height: 300,
  }}
/>

// File attachment
<Message
  type="file"
  content={{
    name: 'document.pdf',
    size: 1024000,
    url: '/download/document.pdf',
  }}
/>

// System message
<Message
  type="system"
  content="Alice joined the conversation"
/>
```

### Reactions

Add emoji reactions to messages:

```tsx
<Message
  content="Great idea!"
  reactions={[
    { emoji: '👍', count: 3, users: ['user-1', 'user-2', 'user-3'] },
    { emoji: '❤️', count: 1, users: ['user-4'] },
  ]}
  onReact={(emoji) => handleReaction(messageId, emoji)}
/>
```

### Message Actions

Context menu for message actions:

```tsx
<Message
  content="Important message"
  actions={[
    { label: 'Reply', icon: ReplyIcon, onClick: handleReply },
    { label: 'Edit', icon: EditIcon, onClick: handleEdit },
    { label: 'Delete', icon: DeleteIcon, onClick: handleDelete, danger: true },
  ]}
/>
```

### File Upload

Built-in file upload with preview:

```tsx
<MessageInput
  allowFileAttachment
  acceptedFileTypes={['image/*', '.pdf', '.doc', '.docx']}
  maxFileSize={10 * 1024 * 1024}
  onFileSelect={(files) => {
    // Handle file upload
    console.log('Selected files:', files);
  }}
/>
```

## Customization

### CSS Variables

Override CSS variables for quick theming:

```css
.chat-window {
  --chat-primary-color: #007bff;
  --chat-bg-color: #f8f9fa;
  --chat-message-bg: #ffffff;
  --chat-message-current-bg: #007bff;
  --chat-text-color: #212529;
  --chat-border-radius: 1rem;
}
```

### Custom Components

Replace any component with your own:

```tsx
<ChatWindow
  components={{
    Message: CustomMessage,
    Avatar: CustomAvatar,
    Timestamp: CustomTimestamp,
  }}
/>
```

### Localization

Support for multiple languages:

```tsx
import { ChatProvider } from '@pressw/chat-ui';
import { enUS, frFR, esES } from '@pressw/chat-ui/locales';

<ChatProvider locale={frFR}>
  <ChatWindow />
</ChatProvider>;
```

## Accessibility

All components follow WCAG 2.1 guidelines:

- Keyboard navigation support
- Screen reader announcements
- Focus management
- High contrast mode support
- Reduced motion support

## Performance

### Virtualization

Large message lists are automatically virtualized:

```tsx
<MessageList
  messages={messages} // Can handle thousands of messages
  overscan={5} // Number of items to render outside visible area
  estimatedItemSize={80} // Estimated height of each message
/>
```

### Lazy Loading

Images and files are lazy loaded:

```tsx
<Message
  type="image"
  content={{
    url: '/large-image.jpg',
    thumbnail: '/thumbnail.jpg', // Shows while loading
    lazy: true,
  }}
/>
```

## Integration with @pressw/threads

The components are designed to work seamlessly with the threads system:

```tsx
import { ChatWindow } from '@pressw/chat-ui';
import { useThread, useCreateMessage } from '@pressw/threads';

function ThreadChat({ threadId }: { threadId: string }) {
  const { data: thread } = useThread(threadId);
  const createMessage = useCreateMessage();

  return (
    <ChatWindow
      thread={thread}
      onSendMessage={async (content) => {
        await createMessage.mutateAsync({
          threadId,
          content,
        });
      }}
    />
  );
}
```

## Examples

- [Basic Chat](https://github.com/pressw/ai-dev-tooling/tree/main/examples/chat-ui-basic)
- [Custom Theme](https://github.com/pressw/ai-dev-tooling/tree/main/examples/chat-ui-theme)
- [Multi-user Chat](https://github.com/pressw/ai-dev-tooling/tree/main/examples/chat-ui-multiuser)
- [File Sharing](https://github.com/pressw/ai-dev-tooling/tree/main/examples/chat-ui-files)

## API Reference

For detailed API documentation, see the [API Reference](./api.md).

## Next Steps

- Explore [component examples](./examples.md)
- Learn about [theming](./guides/theming.md)
- Set up [real-time updates](./guides/realtime.md)
- Implement [file uploads](./guides/file-uploads.md)
