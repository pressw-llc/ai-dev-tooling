import { NextRequest, NextResponse } from 'next/server';
import type {
  ChatCoreAdapter,
  Where,
  GetUserContextFn,
  UserContext,
  CreateThreadOptions,
  UpdateThreadOptions,
  ListThreadsOptions,
  ThreadsResponse,
  ApiResponse,
  ApiError,
  Thread,
} from '@pressw/chat-core';

import {
  CreateThreadOptionsSchema,
  UpdateThreadOptionsSchema,
  ListThreadsOptionsSchema,
} from '@pressw/chat-core';

export interface ThreadRouteConfig {
  adapter: ChatCoreAdapter;
  getUserContext: GetUserContextFn;
}

function createApiResponse<T>(data?: T, error?: ApiError): ApiResponse<T> {
  return {
    success: !error,
    data,
    error,
  };
}

function handleError(error: unknown): NextResponse {
  console.error('Thread API Error:', error);

  const apiError: ApiError = {
    error: 'Internal Server Error',
    message: error instanceof Error ? error.message : 'An unknown error occurred',
    code: 'INTERNAL_ERROR',
  };

  return NextResponse.json(createApiResponse(undefined, apiError), {
    status: 500,
  });
}

function createValidationError(message: string): NextResponse {
  const apiError: ApiError = {
    error: 'Validation Error',
    message,
    code: 'VALIDATION_ERROR',
  };

  return NextResponse.json(createApiResponse(undefined, apiError), {
    status: 400,
  });
}

function createNotFoundError(): NextResponse {
  const apiError: ApiError = {
    error: 'Not Found',
    message: 'Thread not found',
    code: 'NOT_FOUND',
  };

  return NextResponse.json(createApiResponse(undefined, apiError), {
    status: 404,
  });
}

// Helper function to build tenant isolation where conditions
function buildTenantWhereConditions(userContext: UserContext) {
  const conditions = [{ field: 'userId', value: userContext.userId }];

  if (userContext.organizationId) {
    conditions.push({ field: 'organizationId', value: userContext.organizationId });
  }

  if (userContext.tenantId) {
    conditions.push({ field: 'tenantId', value: userContext.tenantId });
  }

  return conditions;
}

// Thread operations using base adapter
async function createThread(
  adapter: ChatCoreAdapter,
  userContext: UserContext,
  options: CreateThreadOptions,
): Promise<Thread> {
  return adapter.create<Thread>({
    model: 'thread',
    data: {
      title: options.title,
      userId: userContext.userId,
      organizationId: userContext.organizationId,
      tenantId: userContext.tenantId,
      metadata: options.metadata,
    } as Parameters<ChatCoreAdapter['create']>[0]['data'],
  });
}

async function getThread(
  adapter: ChatCoreAdapter,
  userContext: UserContext,
  threadId: string,
): Promise<Thread | null> {
  return adapter.findOne({
    model: 'thread',
    where: [{ field: 'id', value: threadId }, ...buildTenantWhereConditions(userContext)],
  });
}

async function updateThread(
  adapter: ChatCoreAdapter,
  userContext: UserContext,
  threadId: string,
  updates: UpdateThreadOptions,
): Promise<Thread> {
  const updated = await adapter.update<Thread>({
    model: 'thread',
    where: [{ field: 'id', value: threadId }, ...buildTenantWhereConditions(userContext)],
    data: {
      ...updates,
      updatedAt: new Date(),
    } as Parameters<ChatCoreAdapter['update']>[0]['data'],
  });

  if (!updated) {
    throw new Error('Thread not found or access denied');
  }

  return updated;
}

async function deleteThread(
  adapter: ChatCoreAdapter,
  userContext: UserContext,
  threadId: string,
): Promise<void> {
  return adapter.delete({
    model: 'thread',
    where: [{ field: 'id', value: threadId }, ...buildTenantWhereConditions(userContext)],
  });
}

async function listThreads(
  adapter: ChatCoreAdapter,
  userContext: UserContext,
  options: ListThreadsOptions,
): Promise<ThreadsResponse> {
  const where = buildTenantWhereConditions(userContext);

  // Add search filter if provided
  if (options.search) {
    where.push({
      field: 'title',
      value: options.search,
      operator: 'contains',
      connector: 'AND',
    } as Where);
  }

  const [threads, total] = await Promise.all([
    adapter.findMany<Thread>({
      model: 'thread',
      where,
      limit: options.limit,
      offset: options.offset,
      sortBy: {
        field: options.orderBy!,
        direction: options.orderDirection!,
      },
    }),
    adapter.count({
      model: 'thread',
      where,
    }),
  ]);

  return {
    threads,
    total,
    hasMore: (options.offset || 0) + threads.length < total,
  };
}

export function createThreadRouteHandlers(config: ThreadRouteConfig) {
  return {
    // GET /api/chat/threads - List threads
    async GET(request: NextRequest): Promise<NextResponse> {
      try {
        const userContext = await config.getUserContext(request);
        const url = new URL(request.url);
        const params = Object.fromEntries(url.searchParams.entries());

        // Parse and validate query parameters
        const parsedParams = ListThreadsOptionsSchema.safeParse({
          limit: params.limit ? parseInt(params.limit, 10) : undefined,
          offset: params.offset ? parseInt(params.offset, 10) : undefined,
          orderBy: params.orderBy,
          orderDirection: params.orderDirection,
          search: params.search,
        });

        if (!parsedParams.success) {
          return createValidationError(`Invalid query parameters: ${parsedParams.error.message}`);
        }

        const threads = await listThreads(config.adapter, userContext, parsedParams.data);
        return NextResponse.json(createApiResponse(threads));
      } catch (error) {
        return handleError(error);
      }
    },

    // POST /api/chat/threads - Create thread
    async POST(request: NextRequest): Promise<NextResponse> {
      try {
        const userContext = await config.getUserContext(request);
        const body = await request.json();
        const parsedBody = CreateThreadOptionsSchema.safeParse(body);

        if (!parsedBody.success) {
          return createValidationError(`Invalid request body: ${parsedBody.error.message}`);
        }

        const thread = await createThread(config.adapter, userContext, parsedBody.data);
        return NextResponse.json(createApiResponse(thread), { status: 201 });
      } catch (error) {
        return handleError(error);
      }
    },
  };
}

export function createThreadDetailRouteHandlers(config: ThreadRouteConfig) {
  return {
    // GET /api/chat/threads/[id] - Get single thread
    async GET(request: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
      try {
        const userContext = await config.getUserContext(request);
        const { id } = params;

        if (!id) {
          return createValidationError('Thread ID is required');
        }

        const thread = await getThread(config.adapter, userContext, id);

        if (!thread) {
          return createNotFoundError();
        }

        return NextResponse.json(createApiResponse(thread));
      } catch (error) {
        return handleError(error);
      }
    },

    // PUT /api/chat/threads/[id] - Update thread
    async PUT(request: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
      try {
        const userContext = await config.getUserContext(request);
        const { id } = params;

        if (!id) {
          return createValidationError('Thread ID is required');
        }

        const body = await request.json();
        const parsedBody = UpdateThreadOptionsSchema.safeParse(body);

        if (!parsedBody.success) {
          return createValidationError(`Invalid request body: ${parsedBody.error.message}`);
        }

        const thread = await updateThread(config.adapter, userContext, id, parsedBody.data);
        return NextResponse.json(createApiResponse(thread));
      } catch (error) {
        if (error instanceof Error && error.message.includes('not found')) {
          return createNotFoundError();
        }
        return handleError(error);
      }
    },

    // DELETE /api/chat/threads/[id] - Delete thread
    async DELETE(
      request: NextRequest,
      { params }: { params: { id: string } },
    ): Promise<NextResponse> {
      try {
        const userContext = await config.getUserContext(request);
        const { id } = params;

        if (!id) {
          return createValidationError('Thread ID is required');
        }

        await deleteThread(config.adapter, userContext, id);
        return NextResponse.json(createApiResponse({ success: true }), {
          status: 204,
        });
      } catch (error) {
        return handleError(error);
      }
    },
  };
}

// Utility to create catch-all route handler
export function createCatchAllThreadRouteHandler(config: ThreadRouteConfig) {
  const listHandlers = createThreadRouteHandlers(config);
  const detailHandlers = createThreadDetailRouteHandlers(config);

  return async function handler(
    request: NextRequest,
    { params }: { params: { route: string[] } },
  ): Promise<NextResponse> {
    const { route } = params;
    const method = request.method;

    try {
      // Handle /api/chat/threads (list/create)
      if (!route || route.length === 0) {
        switch (method) {
          case 'GET':
            return listHandlers.GET(request);
          case 'POST':
            return listHandlers.POST(request);
          default:
            return NextResponse.json(
              createApiResponse(undefined, {
                error: 'Method Not Allowed',
                message: `Method ${method} not allowed`,
                code: 'METHOD_NOT_ALLOWED',
              }),
              { status: 405 },
            );
        }
      }

      // Handle /api/chat/threads/[id] (get/update/delete)
      if (route.length === 1) {
        const [id] = route;
        const routeParams = { params: { id } };

        switch (method) {
          case 'GET':
            return detailHandlers.GET(request, routeParams);
          case 'PUT':
            return detailHandlers.PUT(request, routeParams);
          case 'DELETE':
            return detailHandlers.DELETE(request, routeParams);
          default:
            return NextResponse.json(
              createApiResponse(undefined, {
                error: 'Method Not Allowed',
                message: `Method ${method} not allowed`,
                code: 'METHOD_NOT_ALLOWED',
              }),
              { status: 405 },
            );
        }
      }

      // Handle unknown routes
      return NextResponse.json(
        createApiResponse(undefined, {
          error: 'Not Found',
          message: 'Route not found',
          code: 'NOT_FOUND',
        }),
        { status: 404 },
      );
    } catch (error) {
      return handleError(error);
    }
  };
}
