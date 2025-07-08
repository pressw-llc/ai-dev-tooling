import type { ChatCoreAdapter, Where } from './adapters/types';
import type {
  UserContext,
  CreateThreadOptions,
  UpdateThreadOptions,
  ListThreadsOptions,
  ThreadsResponse,
  GetUserContextFn,
} from './types';
import type { Thread } from './schema';

// Helper functions for thread operations (moved from route handlers)
function buildTenantWhereConditions(userContext: UserContext): Where[] {
  const conditions: Where[] = [{ field: 'userId', value: userContext.userId }];

  if (userContext.organizationId) {
    conditions.push({ field: 'organizationId', value: userContext.organizationId });
  }

  if (userContext.tenantId) {
    conditions.push({ field: 'tenantId', value: userContext.tenantId });
  }

  return conditions;
}

export class ThreadUtilityClient {
  constructor(
    private adapter: ChatCoreAdapter,
    private getUserContext: GetUserContextFn,
  ) {}

  private async withUserContext<T>(
    request: Request,
    operation: (userContext: UserContext) => Promise<T>,
  ): Promise<T> {
    const userContext = await this.getUserContext(request);
    return operation(userContext);
  }

  async createThread(request: Request, options: CreateThreadOptions = {}): Promise<Thread> {
    return this.withUserContext(request, async (userContext) => {
      const result = await this.adapter.create<Thread>({
        model: 'thread',
        data: {
          id: crypto.randomUUID(),
          title: options.title,
          userId: userContext.userId,
          organizationId: userContext.organizationId ?? undefined,
          tenantId: userContext.tenantId ?? undefined,
          metadata: options.metadata,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      return result;
    });
  }

  async updateThread(
    request: Request,
    threadId: string,
    updates: UpdateThreadOptions,
  ): Promise<Thread> {
    if (!threadId) {
      throw new Error('Thread ID is required');
    }
    return this.withUserContext(request, async (userContext) => {
      const updated = await this.adapter.update<Thread>({
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
    });
  }

  async getThread(request: Request, threadId: string): Promise<Thread | null> {
    if (!threadId) {
      throw new Error('Thread ID is required');
    }
    return this.withUserContext(request, (userContext) =>
      this.adapter.findOne({
        model: 'thread',
        where: [{ field: 'id', value: threadId }, ...buildTenantWhereConditions(userContext)],
      }),
    );
  }

  async listThreads(
    request: Request,
    options: Partial<ListThreadsOptions> = {},
  ): Promise<ThreadsResponse> {
    const fullOptions: ListThreadsOptions = {
      limit: options.limit ?? 20,
      offset: options.offset ?? 0,
      orderBy: options.orderBy ?? 'updatedAt',
      orderDirection: options.orderDirection ?? 'desc',
      search: options.search,
    };

    return this.withUserContext(request, async (userContext) => {
      const where = buildTenantWhereConditions(userContext);

      // Add search filter if provided
      if (fullOptions.search) {
        where.push({
          field: 'title',
          value: fullOptions.search,
          operator: 'contains',
          connector: 'AND',
        });
      }

      const [threads, total] = await Promise.all([
        this.adapter.findMany<Thread>({
          model: 'thread',
          where,
          limit: fullOptions.limit,
          offset: fullOptions.offset,
          sortBy: {
            field: fullOptions.orderBy,
            direction: fullOptions.orderDirection,
          },
        }),
        this.adapter.count({
          model: 'thread',
          where,
        }),
      ]);

      return {
        threads,
        total,
        hasMore: (fullOptions.offset || 0) + threads.length < total,
      };
    });
  }

  async deleteThread(request: Request, threadId: string): Promise<void> {
    if (!threadId) {
      throw new Error('Thread ID is required');
    }
    return this.withUserContext(request, (userContext) =>
      this.adapter.delete({
        model: 'thread',
        where: [{ field: 'id', value: threadId }, ...buildTenantWhereConditions(userContext)],
      }),
    );
  }
}

export interface ThreadUtilityConfig {
  adapter: ChatCoreAdapter;
  getUserContext: GetUserContextFn;
}

export function createThreadUtilityClient(config: ThreadUtilityConfig): ThreadUtilityClient {
  return new ThreadUtilityClient(config.adapter, config.getUserContext);
}
