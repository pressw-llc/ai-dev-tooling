import { z } from 'zod';
import type { Thread, User } from './schema';

export const MessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  timestamp: z.date().optional(),
});

export type Message = z.infer<typeof MessageSchema>;

export const ChatConfigSchema = z.object({
  apiKey: z.string(),
  baseUrl: z.string().url().optional(),
  timeout: z.number().positive().optional(),
});

export type ChatConfig = z.infer<typeof ChatConfigSchema>;

// User Context with tenant support
export const UserContextSchema = z.object({
  userId: z.string(),
  organizationId: z.string().nullable().optional(),
  tenantId: z.string().nullable().optional(),
});

export type UserContext = z.infer<typeof UserContextSchema>;

// Thread utility types
export const CreateThreadOptionsSchema = z.object({
  title: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type CreateThreadOptions = z.infer<typeof CreateThreadOptionsSchema>;

export const UpdateThreadOptionsSchema = z.object({
  title: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type UpdateThreadOptions = z.infer<typeof UpdateThreadOptionsSchema>;

export const ListThreadsOptionsSchema = z
  .object({
    limit: z.number().int().positive().max(100).optional(),
    offset: z.number().int().min(0).optional(),
    orderBy: z.enum(['createdAt', 'updatedAt', 'title']).optional(),
    orderDirection: z.enum(['asc', 'desc']).optional(),
    search: z.string().optional(),
  })
  .transform((data) => ({
    limit: data.limit ?? 20,
    offset: data.offset ?? 0,
    orderBy: data.orderBy ?? ('updatedAt' as const),
    orderDirection: data.orderDirection ?? ('desc' as const),
    search: data.search,
  }));

export type ListThreadsOptions = z.infer<typeof ListThreadsOptionsSchema>;

export const ThreadsResponseSchema = z.object({
  threads: z.array(z.custom<Thread>()),
  total: z.number().int().min(0),
  hasMore: z.boolean(),
});

export type ThreadsResponse = z.infer<typeof ThreadsResponseSchema>;

// Thread adapter interface
// ThreadAdapter interface removed - using base ChatCoreAdapter directly

// API response types
export const ApiErrorSchema = z.object({
  error: z.string(),
  message: z.string(),
  code: z.string().optional(),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;

export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: ApiErrorSchema.optional(),
  });

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: ApiError;
};

// Authentication callback type
export type GetUserContextFn = (request: Request) => Promise<UserContext>;
