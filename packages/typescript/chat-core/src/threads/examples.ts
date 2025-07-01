/**
 * @fileoverview Comprehensive examples for using the Thread Management System
 *
 * This file demonstrates how to set up and use the complete thread management
 * system including server setup with Next.js and client setup with React and TanStack Query.
 */

// import { drizzle } from 'drizzle-orm/postgres-js';
// import postgres from 'postgres';
import { DrizzleAdapter, createCatchAllThreadRouteHandler } from './index';
import type { ThreadRouteConfig, UserContext, DrizzleAdapterConfig } from './index';

// ==========================================
// 1. DATABASE SETUP EXAMPLE
// ==========================================

/**
 * Example database setup using Drizzle with PostgreSQL
 */
export function setupDatabase() {
  // Initialize PostgreSQL connection
  // const connectionString = process.env.DATABASE_URL!;
  // const queryClient = postgres(connectionString);
  // const db = drizzle(queryClient);
  const db = {} as any; // Placeholder for example

  // Create adapter with configuration
  const config: DrizzleAdapterConfig = {
    provider: 'pg',
    tables: {
      user: 'users',
      thread: 'threads',
      feedback: 'feedback',
    },
    usePlural: true,
    supportsJSON: true,
    supportsDates: true,
    supportsBooleans: true,
    supportsReturning: true,
  };

  const adapter = new DrizzleAdapter(db, config);

  return { db, adapter };
}

// ==========================================
// 2. NEXT.JS API ROUTE SETUP EXAMPLE
// ==========================================

/**
 * Example Next.js API route setup for /api/chat/[...route]/route.ts
 */
export function createNextJSApiRoute() {
  const { adapter } = setupDatabase();

  // Define how to get user context from the request
  const getUserContext = async (request: Request): Promise<UserContext> => {
    // Example: Extract from JWT token in Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Unauthorized');
    }

    // Your JWT verification logic here
    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyJWT(token); // Your JWT verification function

    return {
      userId: decoded.userId,
      organizationId: decoded.organizationId,
      tenantId: decoded.tenantId,
    };
  };

  // Create the route configuration
  const config: ThreadRouteConfig = {
    adapter,
    getUserContext,
  };

  // Return the catch-all handler
  return createCatchAllThreadRouteHandler(config);
}

// Example route file: /api/chat/[...route]/route.ts
export const exampleRouteFile = `
import { createNextJSApiRoute } from './path/to/your/setup';

const handler = createNextJSApiRoute();

export { handler as GET, handler as POST, handler as PUT, handler as DELETE };
`;

// ==========================================
// 3. REACT CLIENT SETUP EXAMPLE
// ==========================================

/**
 * Example React setup with TanStack Query
 */
export const reactSetupExample = `
// app/providers.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setDefaultApiClient, DefaultThreadApiClient } from '@pressw/chat-core/threads';

const queryClient = new QueryClient();

// Configure the API client
const apiClient = new DefaultThreadApiClient({
  baseUrl: '/api/chat',
  fetchOptions: {
    headers: {
      Authorization: \`Bearer \${getAuthToken()}\`, // Your auth token function
    },
  },
});

setDefaultApiClient(apiClient);

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

// components/ThreadList.tsx
import { useThreads, useCreateThread, useDeleteThread } from '@pressw/chat-core/threads';

export function ThreadList() {
  const { data: threadsData, isLoading, error } = useThreads({
    listOptions: { limit: 20, orderBy: 'updatedAt', orderDirection: 'desc' }
  });

  const createMutation = useCreateThread({
    onSuccess: () => {
      console.log('Thread created successfully!');
    },
  });

  const deleteMutation = useDeleteThread({
    onSuccess: () => {
      console.log('Thread deleted successfully!');
    },
  });

  const handleCreateThread = () => {
    createMutation.mutate({
      title: 'New Thread',
      metadata: { source: 'ui' },
    });
  };

  const handleDeleteThread = (id: string) => {
    deleteMutation.mutate(id);
  };

  if (isLoading) return <div>Loading threads...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <button onClick={handleCreateThread} disabled={createMutation.isPending}>
        {createMutation.isPending ? 'Creating...' : 'Create Thread'}
      </button>

      <div>
        {threadsData?.threads.map((thread) => (
          <div key={thread.id} className="thread-item">
            <h3>{thread.title || 'Untitled Thread'}</h3>
            <p>Created: {thread.createdAt.toLocaleDateString()}</p>
            <button
              onClick={() => handleDeleteThread(thread.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        ))}
      </div>

      {threadsData?.hasMore && (
        <button>Load More</button>
      )}
    </div>
  );
}

// components/ThreadDetail.tsx
import { useThread, useUpdateThread } from '@pressw/chat-core/threads';

export function ThreadDetail({ threadId }: { threadId: string }) {
  const { data: thread, isLoading } = useThread(threadId);
  const updateMutation = useUpdateThread({
    onSuccess: () => {
      console.log('Thread updated successfully!');
    },
  });

  const handleUpdateTitle = (newTitle: string) => {
    updateMutation.mutate({
      id: threadId,
      updates: { title: newTitle },
    });
  };

  if (isLoading) return <div>Loading thread...</div>;
  if (!thread) return <div>Thread not found</div>;

  return (
    <div>
      <input
        value={thread.title || ''}
        onChange={(e) => handleUpdateTitle(e.target.value)}
        placeholder="Thread title"
      />
      <pre>{JSON.stringify(thread.metadata, null, 2)}</pre>
    </div>
  );
}
`;

// ==========================================
// 4. CUSTOM ADAPTER EXAMPLE
// ==========================================

/**
 * Example of creating a custom adapter for a different database
 */
export const customAdapterExample = `
import type { ThreadAdapter, UserContext, CreateThreadOptions, UpdateThreadOptions, ListThreadsOptions, ThreadsResponse } from '@pressw/chat-core/threads';
import type { Thread } from '@pressw/chat-core/threads';

export class SupabaseThreadAdapter implements ThreadAdapter {
  constructor(private supabase: SupabaseClient) {}

  async createThread(userContext: UserContext, options: CreateThreadOptions): Promise<Thread> {
    const { data, error } = await this.supabase
      .from('threads')
      .insert({
        title: options.title,
        user_id: userContext.userId,
        organization_id: userContext.organizationId,
        tenant_id: userContext.tenantId,
        metadata: options.metadata,
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapToThread(data);
  }

  async getThread(userContext: UserContext, threadId: string): Promise<Thread | null> {
    const { data, error } = await this.supabase
      .from('threads')
      .select('*')
      .eq('id', threadId)
      .eq('user_id', userContext.userId)
      .maybeSingle();

    if (error) throw error;
    return data ? this.mapToThread(data) : null;
  }

  // ... implement other methods

  private mapToThread(data: any): Thread {
    return {
      id: data.id,
      title: data.title,
      userId: data.user_id,
      organizationId: data.organization_id,
      tenantId: data.tenant_id,
      metadata: data.metadata,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }
}
`;

// ==========================================
// 5. AUTHENTICATION PATTERNS
// ==========================================

/**
 * Various authentication pattern examples
 */
export const authenticationExamples = `
// 1. JWT-based authentication
async function getUserContextFromJWT(request: Request): Promise<UserContext> {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) throw new Error('No token provided');

  const payload = jwt.verify(token, process.env.JWT_SECRET!);
  return {
    userId: payload.sub,
    organizationId: payload.org,
    tenantId: payload.tenant,
  };
}

// 2. Session-based authentication (Next.js)
async function getUserContextFromSession(request: Request): Promise<UserContext> {
  const session = await getServerSession(authOptions); // Next-auth
  if (!session?.user) throw new Error('Not authenticated');

  return {
    userId: session.user.id,
    organizationId: session.user.organizationId,
    tenantId: session.user.tenantId,
  };
}

// 3. API Key authentication
async function getUserContextFromApiKey(request: Request): Promise<UserContext> {
  const apiKey = request.headers.get('X-API-Key');
  if (!apiKey) throw new Error('No API key provided');

  const user = await getUserByApiKey(apiKey);
  if (!user) throw new Error('Invalid API key');

  return {
    userId: user.id,
    organizationId: user.organizationId,
    tenantId: user.tenantId,
  };
}

// 4. Clerk authentication
async function getUserContextFromClerk(request: Request): Promise<UserContext> {
  const { userId, orgId } = auth(); // Clerk
  if (!userId) throw new Error('Not authenticated');

  return {
    userId,
    organizationId: orgId,
    tenantId: orgId, // Using org as tenant in this example
  };
}
`;

// Mock function for example
function verifyJWT(_token: string): any {
  // Your JWT verification logic
  return { userId: 'user-123', organizationId: 'org-456', tenantId: 'tenant-789' };
}
