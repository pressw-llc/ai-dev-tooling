import type {
  ChatCoreAdapter,
  UserContext,
  ListThreadsOptions,
  ThreadsResponse,
  Thread,
} from '@pressw/chat-core';

export interface ThreadServerClientConfig {
  adapter: ChatCoreAdapter;
  userContext: UserContext;
}

export class ThreadServerClient {
  private adapter: ChatCoreAdapter;
  private userContext: UserContext;

  constructor(config: ThreadServerClientConfig) {
    this.adapter = config.adapter;
    this.userContext = config.userContext;
  }

  private buildTenantWhereConditions() {
    const conditions = [{ field: 'userId', value: this.userContext.userId }];

    if (this.userContext.organizationId) {
      conditions.push({ field: 'organizationId', value: this.userContext.organizationId });
    }

    if (this.userContext.tenantId) {
      conditions.push({ field: 'tenantId', value: this.userContext.tenantId });
    }

    return conditions;
  }

  async listThreads(options: Partial<ListThreadsOptions> = {}): Promise<ThreadsResponse> {
    const where = this.buildTenantWhereConditions();

    // Add search filter if provided
    if (options.search) {
      where.push({
        field: 'title',
        value: options.search,
        operator: 'contains',
        connector: 'AND',
      } as any);
    }

    const [threads, total] = await Promise.all([
      this.adapter.findMany<Thread>({
        model: 'thread',
        where,
        limit: options.limit,
        offset: options.offset,
        sortBy: {
          field: options.orderBy || 'updatedAt',
          direction: options.orderDirection || 'desc',
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
      hasMore: (options.offset || 0) + threads.length < total,
    };
  }

  async getThread(threadId: string): Promise<Thread | null> {
    return this.adapter.findOne({
      model: 'thread',
      where: [{ field: 'id', value: threadId }, ...this.buildTenantWhereConditions()],
    });
  }
}

export function createThreadServerClient(config: ThreadServerClientConfig): ThreadServerClient {
  return new ThreadServerClient(config);
}
