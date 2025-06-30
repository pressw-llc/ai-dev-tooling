---
sidebar_position: 1
---

# Chat Core

The `@pressw/chat-core` package provides the core functionality for building chat applications with AI integration. It includes type-safe client implementations, message handling, and flexible database adapters.

## Features

- **Type Safety**: Full TypeScript support with Zod validation
- **Database Adapters**: Work with any database through our adapter system
- **Flexible Architecture**: Designed to integrate with existing applications
- **AI Integration**: Built-in support for AI chat completions powered by [CopilotKit](https://github.com/CopilotKit/CopilotKit)
- **Intelligent Chat**: Context-aware AI conversations with actions and suggestions
- **Thread Management**: Complete thread lifecycle with AI enhancement
- **Modern Tooling**: Built with the latest TypeScript and tooling practices

## Installation

```bash
bun add @pressw/chat-core
# or
npm install @pressw/chat-core
```

## Core Concepts

### Chat Client

The chat client handles AI completions and message management:

```typescript
import { createChatClient } from '@pressw/chat-core';

const client = createChatClient({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4',
});

const response = await client.complete({
  messages: [{ role: 'user', content: 'Hello, how are you?' }],
});
```

### Database Adapters

Chat Core uses an adapter pattern to work with any database. Instead of forcing you to use specific tables or schemas, adapters let you map your existing database to Chat Core's requirements.

**Why Adapters?**

- **Work with existing databases** - No need to change your schema
- **Database agnostic** - Same API works with PostgreSQL, MySQL, SQLite
- **Flexible mapping** - Map any table/column names to Chat Core fields
- **Type safety** - Full TypeScript support with your existing schema
- **Future-proof** - Easy to add support for other ORMs (Prisma, etc.)

### Models

Chat Core requires three core models:

- **User** - Represents users in your system
- **Thread** - Represents conversation threads
- **Feedback** - Represents user feedback on responses

The adapter system maps these to your existing tables automatically.

## Getting Started

1. **Install the package**
2. **Choose and configure an adapter** (see [Database Adapters](./adapters/overview))
3. **Create a chat client**
4. **Start building your chat application**

## Next Steps

- [Thread Management](./threads) - Learn about core thread functionality
- [AI-Powered Chat](./ai-chat) - Enable intelligent conversations and AI actions
- [Database Adapters Overview](./adapters/overview) - Learn about the adapter system
- [Drizzle Adapter](./adapters/drizzle) - Use with Drizzle ORM
- API Reference - Detailed API documentation
