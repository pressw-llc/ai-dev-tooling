---
sidebar_position: 5
title: 'Examples'
---

# Examples

Real-world examples demonstrating how to use `@pressw/threads` in various applications.

## Chat Application

Build a real-time chat application with conversation threads.

### Setup

```typescript
// lib/threads.ts
import { createAdapter } from '@pressw/threads/adapters';
import { ThreadUtilityClient } from '@pressw/threads';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@/db/schema';

const sql = postgres(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

export const adapter = createAdapter({
  provider: 'postgresql',
  db,
  schema,
});

export const threadClient = new ThreadUtilityClient({
  adapter,
  getUserContext: async (userId: string) => {
    const user = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);

    return {
      id: userId,
      organizationId: user[0]?.organizationId,
    };
  },
});
```

### Chat Interface Component

```tsx
// components/ChatInterface.tsx
import { useState } from 'react';
import { useThreads, useCreateThread, useUpdateThread } from '@pressw/threads/react';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { ThreadList } from './ThreadList';

export function ChatInterface() {
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const { data: threads } = useThreads();
  const createThread = useCreateThread();

  const handleNewChat = async () => {
    const thread = await createThread.mutateAsync({
      title: 'New Conversation',
      metadata: {
        type: 'chat',
        participants: [currentUser.id],
        lastMessageAt: new Date().toISOString(),
      },
    });
    setSelectedThreadId(thread.id);
  };

  return (
    <div className="chat-container">
      <aside className="chat-sidebar">
        <button onClick={handleNewChat} className="new-chat-btn">
          New Chat
        </button>
        <ThreadList
          threads={threads}
          selectedId={selectedThreadId}
          onSelect={setSelectedThreadId}
        />
      </aside>

      <main className="chat-main">
        {selectedThreadId ? (
          <ChatThread threadId={selectedThreadId} />
        ) : (
          <EmptyState onNewChat={handleNewChat} />
        )}
      </main>
    </div>
  );
}

function ChatThread({ threadId }: { threadId: string }) {
  const { data: thread } = useThread(threadId);
  const updateThread = useUpdateThread();
  const [messages, setMessages] = useState<Message[]>([]);

  const handleSendMessage = async (content: string) => {
    const message = {
      id: generateId(),
      content,
      userId: currentUser.id,
      timestamp: new Date(),
    };

    setMessages([...messages, message]);

    // Update thread metadata with last message info
    await updateThread.mutateAsync({
      threadId,
      metadata: {
        ...thread?.metadata,
        lastMessage: content,
        lastMessageAt: new Date().toISOString(),
        messageCount: (thread?.metadata?.messageCount || 0) + 1,
      },
    });
  };

  return (
    <div className="chat-thread">
      <ChatHeader thread={thread} />
      <MessageList messages={messages} />
      <MessageInput onSend={handleSendMessage} />
    </div>
  );
}
```

### Real-time Updates with WebSocket

```typescript
// hooks/useRealtimeThreads.ts
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { threadKeys } from '@pressw/threads/react';
import { io } from 'socket.io-client';

export function useRealtimeThreads(userId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_WS_URL!, {
      auth: { userId },
    });

    socket.on('thread:message', ({ threadId, message }) => {
      // Update thread's last message metadata
      queryClient.setQueryData(threadKeys.detail(threadId), (old: Thread) => ({
        ...old,
        metadata: {
          ...old.metadata,
          lastMessage: message.content,
          lastMessageAt: message.timestamp,
          unreadCount: (old.metadata?.unreadCount || 0) + 1,
        },
      }));

      // Invalidate thread list to reorder by last message
      queryClient.invalidateQueries({
        queryKey: threadKeys.lists(),
      });
    });

    socket.on('thread:typing', ({ threadId, userId, isTyping }) => {
      // Handle typing indicators
    });

    return () => {
      socket.disconnect();
    };
  }, [userId, queryClient]);
}
```

## Support Ticket System

Build a customer support ticket management system.

### Ticket Creation Form

```tsx
// components/CreateTicketForm.tsx
import { useState } from 'react';
import { useCreateThread } from '@pressw/threads/react';
import { useRouter } from 'next/navigation';

type Priority = 'low' | 'normal' | 'high' | 'urgent';
type Category = 'billing' | 'technical' | 'feature' | 'other';

export function CreateTicketForm() {
  const router = useRouter();
  const createThread = useCreateThread();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);

    try {
      const ticket = await createThread.mutateAsync({
        title: formData.get('subject') as string,
        metadata: {
          type: 'ticket',
          status: 'open',
          priority: formData.get('priority') as Priority,
          category: formData.get('category') as Category,
          description: formData.get('description') as string,
          customerEmail: formData.get('email') as string,
          assignedTo: null,
          createdBy: currentUser.id,
          tags: [],
          slaDeadline: calculateSLADeadline(formData.get('priority') as Priority),
        },
      });

      router.push(`/tickets/${ticket.id}`);
    } catch (error) {
      console.error('Failed to create ticket:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="ticket-form">
      <h2>Create Support Ticket</h2>

      <input
        name="subject"
        placeholder="Brief description of your issue"
        required
        maxLength={200}
      />

      <textarea
        name="description"
        placeholder="Detailed description of the issue..."
        rows={5}
        required
      />

      <input name="email" type="email" placeholder="your@email.com" required />

      <select name="category" required>
        <option value="">Select Category</option>
        <option value="billing">Billing</option>
        <option value="technical">Technical Issue</option>
        <option value="feature">Feature Request</option>
        <option value="other">Other</option>
      </select>

      <select name="priority" required>
        <option value="low">Low</option>
        <option value="normal">Normal</option>
        <option value="high">High</option>
        <option value="urgent">Urgent</option>
      </select>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creating...' : 'Create Ticket'}
      </button>
    </form>
  );
}

function calculateSLADeadline(priority: Priority): string {
  const now = new Date();
  const hoursToAdd = {
    urgent: 2,
    high: 8,
    normal: 24,
    low: 72,
  }[priority];

  now.setHours(now.getHours() + hoursToAdd);
  return now.toISOString();
}
```

### Support Dashboard

```tsx
// components/SupportDashboard.tsx
import { useState } from 'react';
import { useThreads, useUpdateThread } from '@pressw/threads/react';
import { TicketList } from './TicketList';
import { TicketDetail } from './TicketDetail';
import { TicketFilters } from './TicketFilters';

export function SupportDashboard() {
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    assignedTo: 'all',
    search: '',
  });

  const { data: tickets } = useThreads({
    search: filters.search,
    limit: 50,
  });

  // Client-side filtering
  const filteredTickets = tickets?.filter((ticket) => {
    const meta = ticket.metadata || {};

    if (filters.status !== 'all' && meta.status !== filters.status) {
      return false;
    }

    if (filters.priority !== 'all' && meta.priority !== filters.priority) {
      return false;
    }

    if (filters.assignedTo !== 'all') {
      if (filters.assignedTo === 'unassigned' && meta.assignedTo) {
        return false;
      }
      if (filters.assignedTo === 'me' && meta.assignedTo !== currentUser.id) {
        return false;
      }
    }

    return true;
  });

  const stats = {
    open: tickets?.filter((t) => t.metadata?.status === 'open').length || 0,
    inProgress: tickets?.filter((t) => t.metadata?.status === 'in_progress').length || 0,
    resolved: tickets?.filter((t) => t.metadata?.status === 'resolved').length || 0,
    urgent: tickets?.filter((t) => t.metadata?.priority === 'urgent').length || 0,
  };

  return (
    <div className="support-dashboard">
      <DashboardStats stats={stats} />
      <TicketFilters filters={filters} onChange={setFilters} />
      <TicketList tickets={filteredTickets} />
    </div>
  );
}

function DashboardStats({ stats }: { stats: typeof stats }) {
  return (
    <div className="dashboard-stats">
      <StatCard label="Open Tickets" value={stats.open} color="blue" />
      <StatCard label="In Progress" value={stats.inProgress} color="yellow" />
      <StatCard label="Resolved" value={stats.resolved} color="green" />
      <StatCard label="Urgent" value={stats.urgent} color="red" />
    </div>
  );
}
```

### Ticket Assignment System

```tsx
// components/TicketAssignment.tsx
import { useUpdateThread } from '@pressw/threads/react';
import { useAgents } from '@/hooks/useAgents';

export function TicketAssignment({ ticket }: { ticket: Thread }) {
  const updateThread = useUpdateThread();
  const { data: agents } = useAgents();

  const handleAssign = async (agentId: string) => {
    await updateThread.mutateAsync({
      threadId: ticket.id,
      metadata: {
        ...ticket.metadata,
        assignedTo: agentId,
        assignedAt: new Date().toISOString(),
        status: ticket.metadata?.status === 'open' ? 'in_progress' : ticket.metadata?.status,
      },
    });

    // Send notification to assigned agent
    await sendNotification({
      userId: agentId,
      type: 'ticket_assigned',
      title: 'New Ticket Assigned',
      message: `Ticket #${ticket.id.slice(-6)}: ${ticket.title}`,
      link: `/tickets/${ticket.id}`,
    });
  };

  return (
    <div className="ticket-assignment">
      <h3>Assignment</h3>

      {ticket.metadata?.assignedTo ? (
        <div className="assigned-agent">
          <AgentAvatar agentId={ticket.metadata.assignedTo} />
          <button onClick={() => handleAssign('')}>Unassign</button>
        </div>
      ) : (
        <select onChange={(e) => handleAssign(e.target.value)}>
          <option value="">Assign to agent...</option>
          {agents?.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name} ({agent.activeTickets} active)
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
```

## Task Management System

Build a project task management system with hierarchical tasks.

### Task Board

```tsx
// components/TaskBoard.tsx
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useThreads, useUpdateThread } from '@pressw/threads/react';

type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';

export function TaskBoard({ projectId }: { projectId: string }) {
  const { data: tasks } = useThreads({
    search: `project:${projectId}`,
  });
  const updateThread = useUpdateThread();

  const columns: Record<TaskStatus, Thread[]> = {
    todo: [],
    in_progress: [],
    review: [],
    done: [],
  };

  tasks?.forEach((task) => {
    const status = (task.metadata?.status as TaskStatus) || 'todo';
    columns[status].push(task);
  });

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const taskId = result.draggableId;
    const newStatus = result.destination.droppableId as TaskStatus;

    await updateThread.mutateAsync({
      threadId: taskId,
      metadata: {
        ...tasks?.find((t) => t.id === taskId)?.metadata,
        status: newStatus,
        movedAt: new Date().toISOString(),
        movedBy: currentUser.id,
      },
    });
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="task-board">
        {(['todo', 'in_progress', 'review', 'done'] as const).map((status) => (
          <TaskColumn key={status} status={status} tasks={columns[status]} />
        ))}
      </div>
    </DragDropContext>
  );
}

function TaskColumn({ status, tasks }: { status: TaskStatus; tasks: Thread[] }) {
  const statusConfig = {
    todo: { label: 'To Do', color: 'gray' },
    in_progress: { label: 'In Progress', color: 'blue' },
    review: { label: 'Review', color: 'yellow' },
    done: { label: 'Done', color: 'green' },
  };

  return (
    <Droppable droppableId={status}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className={`task-column ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
        >
          <h3 style={{ color: statusConfig[status].color }}>
            {statusConfig[status].label} ({tasks.length})
          </h3>

          <div className="task-list">
            {tasks.map((task, index) => (
              <TaskCard key={task.id} task={task} index={index} />
            ))}
            {provided.placeholder}
          </div>
        </div>
      )}
    </Droppable>
  );
}

function TaskCard({ task, index }: { task: Thread; index: number }) {
  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`task-card ${snapshot.isDragging ? 'dragging' : ''}`}
        >
          <h4>{task.title}</h4>

          {task.metadata && (
            <>
              <div className="task-meta">
                <PriorityBadge priority={task.metadata.priority} />
                <DueDate date={task.metadata.dueDate} />
              </div>

              {task.metadata.assignees && (
                <div className="task-assignees">
                  {task.metadata.assignees.map((userId: string) => (
                    <UserAvatar key={userId} userId={userId} />
                  ))}
                </div>
              )}

              {task.metadata.tags && (
                <div className="task-tags">
                  {task.metadata.tags.map((tag: string) => (
                    <Tag key={tag} name={tag} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </Draggable>
  );
}
```

### Subtask Management

```tsx
// components/SubtaskManager.tsx
import { useState } from 'react';
import { useCreateThread, useUpdateThread } from '@pressw/threads/react';

export function SubtaskManager({ parentTask }: { parentTask: Thread }) {
  const [subtasks, setSubtasks] = useState<Thread[]>([]);
  const createThread = useCreateThread();
  const updateThread = useUpdateThread();

  const handleAddSubtask = async (title: string) => {
    const subtask = await createThread.mutateAsync({
      title,
      metadata: {
        type: 'subtask',
        parentId: parentTask.id,
        projectId: parentTask.metadata?.projectId,
        status: 'todo',
        completed: false,
        order: subtasks.length,
      },
    });

    setSubtasks([...subtasks, subtask]);

    // Update parent task completion
    await updateParentCompletion();
  };

  const handleToggleSubtask = async (subtaskId: string, completed: boolean) => {
    await updateThread.mutateAsync({
      threadId: subtaskId,
      metadata: {
        ...subtasks.find((s) => s.id === subtaskId)?.metadata,
        completed,
        completedAt: completed ? new Date().toISOString() : null,
      },
    });

    setSubtasks(
      subtasks.map((s) =>
        s.id === subtaskId ? { ...s, metadata: { ...s.metadata, completed } } : s,
      ),
    );

    await updateParentCompletion();
  };

  const updateParentCompletion = async () => {
    const completedCount = subtasks.filter((s) => s.metadata?.completed).length;
    const totalCount = subtasks.length;
    const completion = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

    await updateThread.mutateAsync({
      threadId: parentTask.id,
      metadata: {
        ...parentTask.metadata,
        subtaskCompletion: completion,
        hasSubtasks: totalCount > 0,
      },
    });
  };

  return (
    <div className="subtask-manager">
      <h4>
        Subtasks ({subtasks.filter((s) => s.metadata?.completed).length}/{subtasks.length})
      </h4>

      <ProgressBar value={parentTask.metadata?.subtaskCompletion || 0} />

      <ul className="subtask-list">
        {subtasks.map((subtask) => (
          <li key={subtask.id}>
            <input
              type="checkbox"
              checked={subtask.metadata?.completed || false}
              onChange={(e) => handleToggleSubtask(subtask.id, e.target.checked)}
            />
            <span className={subtask.metadata?.completed ? 'completed' : ''}>{subtask.title}</span>
          </li>
        ))}
      </ul>

      <AddSubtaskForm onAdd={handleAddSubtask} />
    </div>
  );
}
```

## Discussion Forum

Build a community discussion forum with nested replies.

### Forum Thread View

```tsx
// components/ForumThread.tsx
import { useState } from 'react';
import { useThread, useThreads, useCreateThread } from '@pressw/threads/react';
import { formatDistanceToNow } from 'date-fns';

export function ForumThread({ threadId }: { threadId: string }) {
  const { data: thread } = useThread(threadId);
  const { data: replies } = useThreads({
    search: `parentId:${threadId}`,
    orderBy: 'asc',
  });

  return (
    <div className="forum-thread">
      <ThreadPost thread={thread} isOriginal />

      <div className="replies-section">
        <h3>{replies?.length || 0} Replies</h3>

        {replies?.map((reply) => (
          <ReplyThread key={reply.id} reply={reply} depth={0} />
        ))}

        <ReplyForm parentId={threadId} />
      </div>
    </div>
  );
}

function ReplyThread({ reply, depth }: { reply: Thread; depth: number }) {
  const [showReplies, setShowReplies] = useState(true);
  const { data: nestedReplies } = useThreads({
    search: `parentId:${reply.id}`,
    orderBy: 'asc',
  });

  return (
    <div className="reply-thread" style={{ marginLeft: depth * 20 }}>
      <ThreadPost thread={reply} />

      {nestedReplies && nestedReplies.length > 0 && (
        <>
          <button className="toggle-replies" onClick={() => setShowReplies(!showReplies)}>
            {showReplies ? 'Hide' : 'Show'} {nestedReplies.length} replies
          </button>

          {showReplies && (
            <div className="nested-replies">
              {nestedReplies.map((nestedReply) => (
                <ReplyThread key={nestedReply.id} reply={nestedReply} depth={depth + 1} />
              ))}
            </div>
          )}
        </>
      )}

      {depth < 3 && <ReplyForm parentId={reply.id} />}
    </div>
  );
}

function ThreadPost({ thread, isOriginal = false }: { thread: Thread; isOriginal?: boolean }) {
  const [isEditing, setIsEditing] = useState(false);
  const updateThread = useUpdateThread();

  return (
    <article className={`thread-post ${isOriginal ? 'original' : ''}`}>
      <header>
        <UserInfo userId={thread.userId} />
        <time>{formatDistanceToNow(new Date(thread.createdAt))} ago</time>
      </header>

      {isEditing ? (
        <EditForm
          thread={thread}
          onSave={async (content) => {
            await updateThread.mutateAsync({
              threadId: thread.id,
              metadata: {
                ...thread.metadata,
                content,
                editedAt: new Date().toISOString(),
              },
            });
            setIsEditing(false);
          }}
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        <div className="post-content">
          <h2>{thread.title}</h2>
          <div dangerouslySetInnerHTML={{ __html: thread.metadata?.content }} />

          {thread.metadata?.editedAt && (
            <small>Edited {formatDistanceToNow(new Date(thread.metadata.editedAt))} ago</small>
          )}
        </div>
      )}

      <PostActions thread={thread} onEdit={() => setIsEditing(true)} />
    </article>
  );
}

function ReplyForm({ parentId }: { parentId: string }) {
  const [isReplying, setIsReplying] = useState(false);
  const createThread = useCreateThread();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    await createThread.mutateAsync({
      title: `Re: ${formData.get('title')}`,
      metadata: {
        type: 'reply',
        parentId,
        content: formData.get('content'),
        upvotes: 0,
        downvotes: 0,
      },
    });

    setIsReplying(false);
    e.currentTarget.reset();
  };

  if (!isReplying) {
    return (
      <button onClick={() => setIsReplying(true)} className="reply-button">
        Reply
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="reply-form">
      <textarea name="content" placeholder="Write your reply..." rows={4} required />
      <div className="form-actions">
        <button type="submit">Post Reply</button>
        <button type="button" onClick={() => setIsReplying(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}
```

## Best Practices

### 1. Metadata Design

Design your metadata schema carefully:

```typescript
// Good: Structured metadata
const thread = await createThread({
  title: 'Project Alpha',
  metadata: {
    type: 'project',
    status: 'active',
    priority: 'high',
    tags: ['frontend', 'urgent'],
    assignees: ['user_1', 'user_2'],
    dueDate: '2024-12-31',
    customFields: {
      budget: 50000,
      client: 'Acme Corp',
    },
  },
});

// Avoid: Unstructured metadata
const thread = await createThread({
  title: 'Project Alpha',
  metadata: {
    data: 'project|active|high|frontend,urgent',
  },
});
```

### 2. Search Optimization

Implement efficient search patterns:

```typescript
// Use search parameter for title searches
const results = await threadClient.listThreads(userId, {
  search: 'project alpha',
  limit: 20,
});

// For metadata searches, filter client-side
const filtered = threads.filter((thread) => {
  return thread.metadata?.tags?.includes('urgent');
});
```

### 3. Pagination Strategy

Implement proper pagination:

```typescript
// Standard pagination
function usePaginatedThreads(pageSize = 20) {
  const [page, setPage] = useState(0);

  const { data, isLoading } = useThreads({
    limit: pageSize,
    offset: page * pageSize,
  });

  return {
    threads: data,
    isLoading,
    page,
    setPage,
    hasMore: data?.length === pageSize,
  };
}

// Infinite scroll
function useInfiniteScroll() {
  const { data, fetchNextPage, hasNextPage } = useInfiniteThreads({
    limit: 20,
  });

  useIntersectionObserver({
    target: bottomRef,
    onIntersect: fetchNextPage,
    enabled: hasNextPage,
  });

  return data?.pages.flatMap((page) => page.threads) || [];
}
```

### 4. Optimistic Updates

Leverage optimistic updates for better UX:

```typescript
// Immediate UI update
const createThread = useCreateThread();

const handleCreate = () => {
  // UI updates immediately
  createThread.mutate({
    title: 'New Thread',
    metadata: { status: 'draft' },
  });

  // No need to wait for server response
};
```

### 5. Error Handling

Implement comprehensive error handling:

```typescript
function ThreadForm() {
  const createThread = useCreateThread();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: CreateThreadOptions) => {
    try {
      await createThread.mutateAsync(data);
      setError(null);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred");
      }
    }
  };

  return (
    <form>
      {error && <ErrorAlert message={error} />}
      {/* form fields */}
    </form>
  );
}
```
