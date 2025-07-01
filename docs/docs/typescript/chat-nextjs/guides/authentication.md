---
sidebar_position: 2
---

# Authentication Guide

This guide covers implementing authentication for your `@pressw/chat-nextjs` integration, including various authentication strategies and best practices.

## Overview

The `@pressw/chat-nextjs` package requires a `getUserContext` function that extracts user authentication information from Next.js requests. This function is crucial for:

- **User Identification**: Determining which user is making the request
- **Multi-tenancy**: Isolating data between organizations and tenants
- **Authorization**: Ensuring users can only access their own data

## Authentication Function Interface

```typescript
import type { GetUserContextFn, UserContext } from '@pressw/chat-core';
import { NextRequest } from 'next/server';

type GetUserContextFn = (request: NextRequest) => Promise<UserContext>;

interface UserContext {
  userId: string;
  organizationId?: string;
  tenantId?: string;
}
```

## Implementation Strategies

### 1. JWT Token Authentication

Most common for API-based authentication.

```typescript
// lib/auth/jwt.ts
import { NextRequest } from 'next/server';
import { verify } from 'jsonwebtoken';
import type { GetUserContextFn } from '@pressw/chat-core';

export const getUserContextFromJWT: GetUserContextFn = async (request: NextRequest) => {
  const authHeader = request.headers.get('authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header');
  }

  const token = authHeader.slice(7);

  try {
    const payload = verify(token, process.env.JWT_SECRET!) as any;

    // Validate required fields
    if (!payload.sub && !payload.userId) {
      throw new Error('Token missing user ID');
    }

    return {
      userId: payload.sub || payload.userId,
      organizationId: payload.organizationId || payload.org_id,
      tenantId: payload.tenantId || payload.tenant_id,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Token validation failed: ${error.message}`);
    }
    throw new Error('Invalid token');
  }
};
```

#### Client-Side Usage

```typescript
// components/ThreadList.tsx
import { useThreads } from '@pressw/chat-core/react';

function ThreadList() {
  const { data, error } = useThreads({
    apiConfig: {
      baseUrl: '/api/chat',
      headers: {
        Authorization: `Bearer ${userToken}`, // Get from your auth state
      },
    },
  });

  // Component implementation...
}
```

### 2. Session-Based Authentication

Using cookies and server-side sessions.

```typescript
// lib/auth/session.ts
import { NextRequest } from 'next/server';
import type { GetUserContextFn } from '@pressw/chat-core';
import { decrypt } from '@/lib/crypto'; // Your session decryption logic

interface SessionData {
  userId: string;
  organizationId?: string;
  tenantId?: string;
  expiresAt: number;
}

export const getUserContextFromSession: GetUserContextFn = async (request: NextRequest) => {
  const sessionCookie = request.cookies.get('session')?.value;

  if (!sessionCookie) {
    throw new Error('No session found');
  }

  try {
    const sessionData = (await decrypt(sessionCookie)) as SessionData;

    // Check expiration
    if (Date.now() > sessionData.expiresAt) {
      throw new Error('Session expired');
    }

    return {
      userId: sessionData.userId,
      organizationId: sessionData.organizationId,
      tenantId: sessionData.tenantId,
    };
  } catch (error) {
    throw new Error('Invalid session');
  }
};
```

#### Session Management

```typescript
// lib/session.ts
import { cookies } from 'next/headers';
import { encrypt, decrypt } from '@/lib/crypto';

export async function createSession(userContext: UserContext) {
  const sessionData = {
    ...userContext,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  };

  const encrypted = await encrypt(sessionData);

  cookies().set('session', encrypted, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
}

export async function destroySession() {
  cookies().delete('session');
}
```

### 3. NextAuth.js Integration

Using NextAuth.js for authentication.

```typescript
// lib/auth/nextauth.ts
import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { GetUserContextFn } from '@pressw/chat-core';

export const getUserContextFromNextAuth: GetUserContextFn = async (request: NextRequest) => {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token?.sub) {
    throw new Error('Authentication required');
  }

  return {
    userId: token.sub,
    organizationId: token.organizationId as string,
    tenantId: token.tenantId as string,
  };
};
```

#### NextAuth Configuration

```typescript
// lib/auth/config.ts (NextAuth.js configuration)
import type { NextAuthOptions } from 'next-auth';
import { JWT } from 'next-auth/jwt';

export const authOptions: NextAuthOptions = {
  providers: [
    // Your auth providers
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      // Add custom fields to token
      if (user) {
        token.organizationId = user.organizationId;
        token.tenantId = user.tenantId;
      }
      return token;
    },
    async session({ session, token }) {
      // Add fields to session
      session.user.id = token.sub!;
      session.user.organizationId = token.organizationId;
      session.user.tenantId = token.tenantId;
      return session;
    },
  },
};
```

### 4. API Key Authentication

For service-to-service or programmatic access.

```typescript
// lib/auth/api-key.ts
import { NextRequest } from 'next/server';
import type { GetUserContextFn } from '@pressw/chat-core';
import { validateApiKey } from '@/lib/api-keys'; // Your API key validation

export const getUserContextFromApiKey: GetUserContextFn = async (request: NextRequest) => {
  const apiKey = request.headers.get('x-api-key');

  if (!apiKey) {
    throw new Error('API key required');
  }

  try {
    const keyData = await validateApiKey(apiKey);

    if (!keyData?.userId) {
      throw new Error('Invalid API key');
    }

    return {
      userId: keyData.userId,
      organizationId: keyData.organizationId,
      tenantId: keyData.tenantId,
    };
  } catch (error) {
    throw new Error('API key validation failed');
  }
};
```

#### API Key Validation

```typescript
// lib/api-keys.ts
import { db } from '@/lib/db';
import { apiKeys } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { createHash } from 'crypto';

interface ApiKeyData {
  userId: string;
  organizationId?: string;
  tenantId?: string;
  permissions?: string[];
}

export async function validateApiKey(apiKey: string): Promise<ApiKeyData | null> {
  // Hash the API key for comparison
  const hashedKey = createHash('sha256').update(apiKey).digest('hex');

  const keyRecord = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.hashedKey, hashedKey), eq(apiKeys.isActive, true)))
    .limit(1);

  if (!keyRecord[0]) {
    return null;
  }

  const key = keyRecord[0];

  // Check expiration
  if (key.expiresAt && new Date() > key.expiresAt) {
    return null;
  }

  // Update last used timestamp
  await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, key.id));

  return {
    userId: key.userId,
    organizationId: key.organizationId,
    tenantId: key.tenantId,
    permissions: key.permissions || [],
  };
}
```

### 5. Multi-Strategy Authentication

Combining multiple authentication methods.

```typescript
// lib/auth/multi-strategy.ts
import { NextRequest } from 'next/server';
import type { GetUserContextFn } from '@pressw/chat-core';
import { getUserContextFromJWT } from './jwt';
import { getUserContextFromSession } from './session';
import { getUserContextFromApiKey } from './api-key';

export const getUserContextMultiStrategy: GetUserContextFn = async (request: NextRequest) => {
  // Try strategies in order of preference
  const strategies = [getUserContextFromJWT, getUserContextFromApiKey, getUserContextFromSession];

  let lastError: Error | null = null;

  for (const strategy of strategies) {
    try {
      return await strategy(request);
    } catch (error) {
      lastError = error as Error;
      continue; // Try next strategy
    }
  }

  // All strategies failed
  throw new Error(`Authentication failed: ${lastError?.message || 'Unknown error'}`);
};
```

## Multi-Tenancy and Data Isolation

### Tenant Isolation Patterns

The `UserContext` supports multi-tenant applications through `organizationId` and `tenantId` fields.

#### Simple Organization-Based Tenancy

```typescript
// Each user belongs to one organization
const userContext = {
  userId: 'user-123',
  organizationId: 'org-456', // All data scoped to this organization
};
```

#### Hierarchical Tenancy

```typescript
// Users can belong to organizations and sub-tenants
const userContext = {
  userId: 'user-123',
  organizationId: 'org-456',
  tenantId: 'tenant-789', // Most specific scope
};
```

### Database Isolation

The chat-nextjs package automatically adds tenant isolation to all database queries:

```typescript
// Automatically applied WHERE conditions:
// WHERE user_id = ? AND organization_id = ? AND tenant_id = ?
```

#### Custom Tenant Resolution

```typescript
// lib/auth/tenant-resolver.ts
export async function resolveTenant(userId: string, requestContext: any) {
  // Custom logic to determine tenant based on:
  // - User preferences
  // - Request headers (subdomain, etc.)
  // - URL parameters
  // - Default organization membership

  const user = await getUserById(userId);

  // Resolve from subdomain
  const subdomain = extractSubdomain(requestContext.host);
  if (subdomain) {
    const org = await getOrganizationBySubdomain(subdomain);
    return {
      organizationId: org.id,
      tenantId: user.defaultTenantId,
    };
  }

  return {
    organizationId: user.defaultOrganizationId,
    tenantId: user.defaultTenantId,
  };
}
```

## Authorization and Permissions

### Role-Based Access Control

```typescript
// lib/auth/rbac.ts
import type { GetUserContextFn } from '@pressw/chat-core';

interface ExtendedUserContext extends UserContext {
  roles: string[];
  permissions: string[];
}

export const getUserContextWithRoles: GetUserContextFn = async (request: NextRequest) => {
  const baseContext = await getUserContextFromJWT(request);

  // Fetch user roles and permissions
  const user = await getUserWithRoles(baseContext.userId);

  return {
    ...baseContext,
    roles: user.roles,
    permissions: user.permissions,
  } as ExtendedUserContext;
};

// Custom route handler with permission checks
export function createSecureThreadRouteHandlers(config: ThreadRouteConfig) {
  const baseHandlers = createThreadRouteHandlers(config);

  return {
    async GET(request: NextRequest) {
      const userContext = (await config.getUserContext(request)) as ExtendedUserContext;

      if (!userContext.permissions.includes('threads:read')) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }

      return baseHandlers.GET(request);
    },

    async POST(request: NextRequest) {
      const userContext = (await config.getUserContext(request)) as ExtendedUserContext;

      if (!userContext.permissions.includes('threads:create')) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }

      return baseHandlers.POST(request);
    },
  };
}
```

## Error Handling

### Authentication Error Types

```typescript
// lib/auth/errors.ts
export class AuthenticationError extends Error {
  constructor(
    message: string,
    public code: string = 'AUTH_FAILED',
  ) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  constructor(
    message: string,
    public code: string = 'ACCESS_DENIED',
  ) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

// Enhanced getUserContext with proper error handling
export const getUserContextWithErrorHandling: GetUserContextFn = async (request: NextRequest) => {
  try {
    return await getUserContextFromJWT(request);
  } catch (error) {
    if (error instanceof Error) {
      // Log authentication failures for security monitoring
      console.warn('Authentication failed:', {
        error: error.message,
        ip: request.ip,
        userAgent: request.headers.get('user-agent'),
        timestamp: new Date().toISOString(),
      });

      throw new AuthenticationError(error.message);
    }
    throw new AuthenticationError('Unknown authentication error');
  }
};
```

### Global Error Handling

```typescript
// app/api/chat/threads/route.ts
import { createThreadRouteHandlers } from '@pressw/chat-nextjs';
import { AuthenticationError, AuthorizationError } from '@/lib/auth/errors';

const handlers = createThreadRouteHandlers({
  adapter,
  getUserContext: async (request) => {
    try {
      return await getUserContextWithErrorHandling(request);
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw new Error('Authentication required'); // Will become 500 error
      }
      if (error instanceof AuthorizationError) {
        throw new Error('Access denied');
      }
      throw error;
    }
  },
});

export const GET = handlers.GET;
export const POST = handlers.POST;
```

## Security Best Practices

### 1. Token Security

```typescript
// Secure JWT configuration
const jwtOptions = {
  algorithm: 'HS256' as const,
  expiresIn: '1h', // Short expiration
  issuer: 'your-app',
  audience: 'your-api',
};

// Token refresh pattern
export async function refreshToken(refreshToken: string) {
  // Validate refresh token
  const payload = verify(refreshToken, process.env.REFRESH_SECRET!);

  // Generate new access token
  const accessToken = sign(
    { sub: payload.sub, organizationId: payload.organizationId },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' },
  );

  return accessToken;
}
```

### 2. Rate Limiting

```typescript
// lib/auth/rate-limit.ts
import { NextRequest } from 'next/server';

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(identifier: string, limit = 100, windowMs = 60000) {
  const now = Date.now();
  const current = rateLimitMap.get(identifier);

  if (!current || now > current.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (current.count >= limit) {
    return false;
  }

  current.count++;
  return true;
}

// Enhanced getUserContext with rate limiting
export const getUserContextWithRateLimit: GetUserContextFn = async (request: NextRequest) => {
  const ip = request.ip || 'unknown';

  if (!rateLimit(ip)) {
    throw new Error('Too many requests');
  }

  return getUserContextFromJWT(request);
};
```

### 3. Request Validation

```typescript
// lib/auth/validation.ts
export function validateRequest(request: NextRequest) {
  // Check required headers
  const contentType = request.headers.get('content-type');
  if (request.method === 'POST' && !contentType?.includes('application/json')) {
    throw new Error('Invalid content type');
  }

  // Validate origin for CSRF protection
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');

  if (origin && !isValidOrigin(origin, host)) {
    throw new Error('Invalid origin');
  }

  // Check for suspicious patterns
  const userAgent = request.headers.get('user-agent');
  if (!userAgent || isSuspiciousUserAgent(userAgent)) {
    throw new Error('Invalid user agent');
  }
}

function isValidOrigin(origin: string, host: string | null): boolean {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
  return allowedOrigins.includes(origin) || origin === `https://${host}`;
}
```

## Testing Authentication

### Unit Tests

```typescript
// __tests__/auth.test.ts
import { getUserContextFromJWT } from '@/lib/auth/jwt';
import { NextRequest } from 'next/server';
import { sign } from 'jsonwebtoken';

describe('JWT Authentication', () => {
  const validToken = sign({ sub: 'user-123', organizationId: 'org-456' }, process.env.JWT_SECRET!);

  it('should extract user context from valid JWT', async () => {
    const request = new NextRequest('http://localhost/api/test', {
      headers: {
        authorization: `Bearer ${validToken}`,
      },
    });

    const context = await getUserContextFromJWT(request);

    expect(context.userId).toBe('user-123');
    expect(context.organizationId).toBe('org-456');
  });

  it('should throw error for missing token', async () => {
    const request = new NextRequest('http://localhost/api/test');

    await expect(getUserContextFromJWT(request)).rejects.toThrow(
      'Missing or invalid authorization header',
    );
  });
});
```

### Integration Tests

```typescript
// __tests__/integration/auth.test.ts
import { createMocks } from 'node-mocks-http';
import { GET } from '@/app/api/chat/threads/route';

describe('Thread API Authentication', () => {
  it('should require authentication', async () => {
    const { req } = createMocks({ method: 'GET' });
    const request = new NextRequest('http://localhost/api/chat/threads');

    const response = await GET(request);

    expect(response.status).toBe(500); // Auth error becomes 500
  });

  it('should work with valid token', async () => {
    const request = new NextRequest('http://localhost/api/chat/threads', {
      headers: {
        authorization: `Bearer ${validToken}`,
      },
    });

    const response = await GET(request);

    expect(response.status).toBe(200);
  });
});
```

## Next Steps

- [Server Components Guide](./server-components) - Using authentication in Server Components
