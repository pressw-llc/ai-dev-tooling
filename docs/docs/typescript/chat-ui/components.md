---
sidebar_position: 2
---

# Component Reference

Detailed documentation for all @pressw/chat-ui components.

## Core Components

### ChatProvider

The root provider component that supplies theme and configuration to all child components.

```tsx
interface ChatProviderProps {
  theme?: ChatTheme;
  locale?: Locale;
  children: React.ReactNode;
}
```

**Usage:**

```tsx
import { ChatProvider } from '@pressw/chat-ui';

<ChatProvider theme={customTheme} locale={enUS}>
  <App />
</ChatProvider>;
```

### ChatWindow

Complete chat interface including message list and input.

```tsx
interface ChatWindowProps {
  thread?: Thread;
  messages?: Message[];
  currentUserId: string;
  onSendMessage: (content: string, attachments?: File[]) => Promise<void>;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loading?: boolean;
  placeholder?: string;
  showTypingIndicator?: boolean;
  typingUsers?: User[];
  allowFileUpload?: boolean;
  maxFileSize?: number;
  acceptedFileTypes?: string[];
  components?: CustomComponents;
  className?: string;
}
```

## Message Components

### Message

Individual message display component.

```tsx
interface MessageProps {
  id: string;
  content: string | MessageContent;
  type?: 'text' | 'image' | 'file' | 'system';
  author: User;
  timestamp: Date;
  isCurrentUser?: boolean;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  reactions?: Reaction[];
  replyTo?: Message;
  edited?: boolean;
  editedAt?: Date;
  actions?: MessageAction[];
  onReact?: (emoji: string) => void;
  onReply?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
}
```

**Message Types:**

```tsx
// Text message
<Message
  content="Hello, world!"
  type="text"
  author={user}
  timestamp={new Date()}
/>

// Image message
<Message
  type="image"
  content={{
    url: '/image.jpg',
    alt: 'Vacation photo',
    width: 800,
    height: 600,
    thumbnail: '/image-thumb.jpg',
  }}
  author={user}
  timestamp={new Date()}
/>

// File message
<Message
  type="file"
  content={{
    name: 'report.pdf',
    size: 2048000,
    mimeType: 'application/pdf',
    url: '/files/report.pdf',
    icon: 'pdf',
  }}
  author={user}
  timestamp={new Date()}
/>

// System message
<Message
  type="system"
  content="John joined the conversation"
  timestamp={new Date()}
/>
```

### MessageList

Scrollable list of messages with virtualization.

```tsx
interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loading?: boolean;
  onMessageClick?: (message: Message) => void;
  onMessageDoubleClick?: (message: Message) => void;
  groupByDate?: boolean;
  showUnreadDivider?: boolean;
  unreadCount?: number;
  estimatedItemSize?: number;
  overscan?: number;
  className?: string;
}
```

**Features:**

- Automatic virtualization for performance
- Date grouping
- Unread message divider
- Smooth scrolling
- Jump to bottom button

### MessageGroup

Groups consecutive messages from the same author.

```tsx
interface MessageGroupProps {
  messages: Message[];
  author: User;
  showAvatar?: boolean;
  showTimestamp?: boolean;
  className?: string;
}
```

## Input Components

### MessageInput

Rich text input with file upload support.

```tsx
interface MessageInputProps {
  onSend: (content: string, attachments?: File[]) => void;
  onTyping?: () => void;
  onStopTyping?: () => void;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  allowEmoji?: boolean;
  allowFileAttachment?: boolean;
  acceptedFileTypes?: string[];
  maxFileSize?: number;
  maxFiles?: number;
  value?: string;
  onChange?: (value: string) => void;
  onKeyPress?: (event: React.KeyboardEvent) => void;
  className?: string;
}
```

**Features:**

- Emoji picker integration
- File upload with preview
- Character counter
- Typing indicators
- Keyboard shortcuts (Enter to send, Shift+Enter for new line)

### EmojiPicker

Emoji selection component.

```tsx
interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  position?: 'top' | 'bottom';
  align?: 'start' | 'center' | 'end';
  categories?: EmojiCategory[];
  recentEmojis?: string[];
  skinTone?: SkinTone;
  className?: string;
}
```

### FileUpload

File selection and preview component.

```tsx
interface FileUploadProps {
  onFileSelect: (files: File[]) => void;
  acceptedTypes?: string[];
  maxSize?: number;
  maxFiles?: number;
  preview?: boolean;
  dragAndDrop?: boolean;
  className?: string;
}
```

## User Components

### Avatar

User avatar display.

```tsx
interface AvatarProps {
  user: User;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showStatus?: boolean;
  status?: 'online' | 'away' | 'busy' | 'offline';
  onClick?: () => void;
  className?: string;
}
```

### UserList

List of users in a conversation.

```tsx
interface UserListProps {
  users: User[];
  currentUserId: string;
  showStatus?: boolean;
  onUserClick?: (user: User) => void;
  title?: string;
  className?: string;
}
```

### TypingIndicator

Shows when users are typing.

```tsx
interface TypingIndicatorProps {
  users: User[];
  variant?: 'dots' | 'text' | 'both';
  className?: string;
}
```

## Utility Components

### Timestamp

Formatted timestamp display.

```tsx
interface TimestampProps {
  date: Date;
  format?: 'relative' | 'absolute' | 'auto';
  showTime?: boolean;
  updateInterval?: number;
  className?: string;
}
```

### LoadingSpinner

Loading indicator.

```tsx
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
}
```

### ErrorBoundary

Error handling wrapper.

```tsx
interface ErrorBoundaryProps {
  fallback?: React.ComponentType<{ error: Error }>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  children: React.ReactNode;
}
```

## Composite Components

### ReactionPicker

Emoji reaction selector.

```tsx
interface ReactionPickerProps {
  onSelect: (emoji: string) => void;
  popular?: string[];
  position?: 'top' | 'bottom';
  className?: string;
}
```

### MessageActions

Context menu for message actions.

```tsx
interface MessageActionsProps {
  message: Message;
  actions: MessageAction[];
  onAction: (action: MessageAction) => void;
  position?: 'left' | 'right';
  className?: string;
}
```

### SearchBar

Message search component.

```tsx
interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  debounceMs?: number;
  showFilters?: boolean;
  filters?: SearchFilter[];
  className?: string;
}
```

## Custom Components

Replace default components with your own:

```tsx
interface CustomComponents {
  Message?: React.ComponentType<MessageProps>;
  Avatar?: React.ComponentType<AvatarProps>;
  Timestamp?: React.ComponentType<TimestampProps>;
  MessageInput?: React.ComponentType<MessageInputProps>;
  EmojiPicker?: React.ComponentType<EmojiPickerProps>;
  FileUpload?: React.ComponentType<FileUploadProps>;
  TypingIndicator?: React.ComponentType<TypingIndicatorProps>;
}

// Usage
<ChatWindow
  components={{
    Message: CustomMessage,
    Avatar: CustomAvatar,
  }}
/>;
```

## Hooks

### useChatTheme

Access the current theme:

```tsx
const theme = useChatTheme();
```

### useChatLocale

Access the current locale:

```tsx
const locale = useChatLocale();
```

### useMessageActions

Handle message actions:

```tsx
const { reply, edit, delete: deleteMessage } = useMessageActions(messageId);
```

### useEmojiRecent

Track recently used emojis:

```tsx
const { recent, addRecent } = useEmojiRecent();
```

## Type Definitions

### User

```tsx
interface User {
  id: string;
  name: string;
  avatar?: string;
  status?: 'online' | 'away' | 'busy' | 'offline';
  email?: string;
  role?: string;
}
```

### Message

```tsx
interface Message {
  id: string;
  threadId: string;
  content: string | MessageContent;
  type: MessageType;
  author: User;
  timestamp: Date;
  edited?: boolean;
  editedAt?: Date;
  deleted?: boolean;
  deletedAt?: Date;
  reactions?: Reaction[];
  replyTo?: string;
  metadata?: Record<string, any>;
}
```

### Reaction

```tsx
interface Reaction {
  emoji: string;
  users: string[];
  count: number;
}
```

### MessageAction

```tsx
interface MessageAction {
  id: string;
  label: string;
  icon?: React.ComponentType;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}
```
