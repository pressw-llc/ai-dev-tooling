# @pressw/chat-nextjs

Next.js integrations for the PressW Chat SDK.

## Overview

This package provides Next.js-specific functionality for `@pressw/chat-core`, enabling you to build chat applications with Next.js while keeping the core chat functionality framework-agnostic.

## Features

- **Next.js Route Handlers**: Pre-built API route handlers for thread management
- **Server Components**: Server-side rendering support with direct database access
- **App Router**: Full support for Next.js 13+ App Router
- **Edge Runtime**: Compatible with Next.js Edge Runtime
- **Type Safety**: Full TypeScript support with Next.js specific types

## Installation

```bash
npm install @pressw/chat-nextjs @pressw/chat-core
# or
bun add @pressw/chat-nextjs @pressw/chat-core
```

## Quick Start

### 1. Set up Route Handlers

```typescript
// app/api/chat/threads/route.ts
import { createThreadRouteHandlers } from '@pressw/chat-nextjs';
import { adapter } from '@/lib/adapter';
import { getUserContext } from '@/lib/auth';

const handlers = createThreadRouteHandlers({
  adapter,
  getUserContext,
});

export const GET = handlers.GET;
export const POST = handlers.POST;
```

### 2. Use in Server Components

```typescript
// app/threads/page.tsx
import { createThreadServerClient } from '@pressw/chat-nextjs/server';
import { adapter } from '@/lib/adapter';

export default async function ThreadsPage() {
  const client = createThreadServerClient({
    adapter,
    userContext: await getUserContext()
  });

  const threads = await client.listThreads({ limit: 20 });

  return (
    <div>
      {threads.threads.map((thread) => (
        <div key={thread.id}>{thread.title}</div>
      ))}
    </div>
  );
}
```

### 3. Use React Hooks in Client Components

```typescript
// components/ThreadList.tsx
'use client';

import { useThreads } from '@pressw/chat-core/react';

export function ThreadList() {
  const { data, isLoading } = useThreads();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {data?.threads.map((thread) => (
        <div key={thread.id}>{thread.title}</div>
      ))}
    </div>
  );
}
```

## Documentation

For complete documentation, visit: [Chat Next.js Documentation](../../docs/docs/typescript/chat-nextjs/)

## Compatibility

- **Next.js**: 14.0+ (App Router recommended)
- **React**: 18.0+
- **TypeScript**: 4.9+

## License

Apache 2.0
