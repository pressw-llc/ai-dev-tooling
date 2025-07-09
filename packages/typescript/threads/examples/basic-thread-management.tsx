import React from 'react';
import {
  ThreadsProvider,
  useThreads,
  useCreateThread,
  useUpdateThread,
  useDeleteThread,
  useThread,
} from '@pressw/threads';
import { createDrizzleAdapter } from '@pressw/threads-drizzle';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// Example: Setting up the threads system
const setupThreads = () => {
  // 1. Create your database connection
  const sql = postgres(process.env.DATABASE_URL!);
  const db = drizzle(sql);

  // 2. Create the adapter using the separate package
  const adapter = createDrizzleAdapter(db, 'pg');

  // 3. Define how to get user context from requests
  const getUserContext = async (request: Request) => {
    // Extract user information from your auth system
    const userId = request.headers.get('x-user-id') || 'anonymous';
    const organizationId = request.headers.get('x-org-id') || null;

    return {
      userId,
      organizationId,
      tenantId: null, // Optional multi-tenancy support
    };
  };

  return { adapter, getUserContext };
};

// Example: App component with ThreadsProvider
export function App() {
  const { adapter, getUserContext } = setupThreads();

  return (
    <ThreadsProvider
      config={{
        adapter,
        getUserContext,
        apiBaseUrl: '/api/threads', // Optional: defaults to /api/threads
      }}
    >
      <ThreadManager />
    </ThreadsProvider>
  );
}

// Example: Thread management component
function ThreadManager() {
  // Fetch threads with automatic caching and updates
  const { data: threadsData, isLoading } = useThreads({
    listOptions: {
      limit: 20,
      orderBy: 'updatedAt',
      orderDirection: 'desc',
    },
  });

  // Mutations with optimistic updates
  const createThread = useCreateThread();
  const updateThread = useUpdateThread();
  const deleteThread = useDeleteThread();

  const handleCreateThread = async () => {
    try {
      await createThread.mutateAsync({
        title: 'New Conversation',
        metadata: {
          type: 'support',
          priority: 'high',
          category: 'technical',
        },
      });
      // Thread created successfully
    } catch (error) {
      console.error('Failed to create thread:', error);
    }
  };

  const handleUpdateThread = async (threadId: string) => {
    await updateThread.mutateAsync({
      id: threadId,
      updates: {
        title: 'Updated Title',
        metadata: {
          resolved: true,
          resolvedAt: new Date().toISOString(),
        },
      },
    });
  };

  const handleDeleteThread = async (threadId: string) => {
    if (confirm('Are you sure you want to delete this thread?')) {
      await deleteThread.mutateAsync(threadId);
    }
  };

  if (isLoading) return <div>Loading threads...</div>;

  return (
    <div>
      <h1>Thread Management</h1>

      <button onClick={handleCreateThread}>New Thread</button>

      <div className="threads-list">
        {threadsData?.threads.map((thread) => (
          <ThreadItem
            key={thread.id}
            thread={thread}
            onUpdate={() => handleUpdateThread(thread.id)}
            onDelete={() => handleDeleteThread(thread.id)}
          />
        ))}
      </div>

      {threadsData?.hasMore && <button>Load More</button>}
    </div>
  );
}

// Example: Individual thread component
function ThreadItem({
  thread,
  onUpdate,
  onDelete,
}: {
  thread: {
    id: string;
    title?: string;
    createdAt: string | Date;
    updatedAt: string | Date;
    metadata?: {
      type?: string;
      priority?: string;
      resolved?: boolean;
      notes?: Array<{ content: string; createdAt: string }>;
    };
  };
  onUpdate: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="thread-item">
      <h3>{thread.title || 'Untitled Thread'}</h3>
      <p>Created: {new Date(thread.createdAt).toLocaleString()}</p>
      <p>Updated: {new Date(thread.updatedAt).toLocaleString()}</p>

      {thread.metadata && (
        <div className="metadata">
          <p>Type: {thread.metadata.type}</p>
          <p>Priority: {thread.metadata.priority}</p>
          <p>Status: {thread.metadata.resolved ? 'Resolved' : 'Open'}</p>
        </div>
      )}

      <div className="actions">
        <button onClick={onUpdate}>Edit</button>
        <button onClick={onDelete}>Delete</button>
      </div>
    </div>
  );
}

// Example: Thread detail view
export function ThreadDetailView({ threadId }: { threadId: string }) {
  const { data: thread, isLoading } = useThread(threadId);
  const updateThread = useUpdateThread();

  if (isLoading) return <div>Loading thread...</div>;
  if (!thread) return <div>Thread not found</div>;

  const handleAddNote = async (note: string) => {
    await updateThread.mutateAsync({
      id: threadId,
      updates: {
        metadata: {
          ...thread.metadata,
          notes: [
            ...(thread.metadata?.notes || []),
            {
              content: note,
              createdAt: new Date().toISOString(),
            },
          ],
        },
      },
    });
  };

  return (
    <div className="thread-detail">
      <h1>{thread.title}</h1>
      <p>ID: {thread.id}</p>
      <p>User: {thread.userId}</p>
      <p>Organization: {thread.organizationId || 'None'}</p>

      <div className="metadata">
        <h3>Metadata</h3>
        <pre>{JSON.stringify(thread.metadata, null, 2)}</pre>
      </div>

      <div className="notes">
        <h3>Notes</h3>
        {thread.metadata?.notes?.map(
          (note: { content: string; createdAt: string }, index: number) => (
            <div key={index}>
              <p>{note.content}</p>
              <small>{new Date(note.createdAt).toLocaleString()}</small>
            </div>
          ),
        )}

        <button
          onClick={() => {
            const note = prompt('Add a note:');
            if (note) handleAddNote(note);
          }}
        >
          Add Note
        </button>
      </div>
    </div>
  );
}

// Example: Using threads for different purposes
export function UseCasesExample() {
  const createThread = useCreateThread();

  // Customer support ticket
  const createSupportTicket = async () => {
    await createThread.mutateAsync({
      title: 'Cannot access my account',
      metadata: {
        type: 'support',
        category: 'account-access',
        priority: 'high',
        customerEmail: 'user@example.com',
        status: 'open',
      },
    });
  };

  // Project discussion
  const createProjectDiscussion = async () => {
    await createThread.mutateAsync({
      title: 'Q4 Planning Discussion',
      metadata: {
        type: 'discussion',
        project: 'website-redesign',
        participants: ['user1', 'user2', 'user3'],
        dueDate: '2024-03-31',
      },
    });
  };

  // Task tracking
  const createTask = async () => {
    await createThread.mutateAsync({
      title: 'Implement user authentication',
      metadata: {
        type: 'task',
        assignee: 'developer1',
        status: 'in-progress',
        labels: ['backend', 'security'],
        estimatedHours: 8,
      },
    });
  };

  return (
    <div>
      <h2>Thread Use Cases</h2>
      <button onClick={createSupportTicket}>Create Support Ticket</button>
      <button onClick={createProjectDiscussion}>Create Discussion</button>
      <button onClick={createTask}>Create Task</button>
    </div>
  );
}
