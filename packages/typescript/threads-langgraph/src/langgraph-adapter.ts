import { Client } from '@langchain/langgraph-sdk';
import { BaseAdapter } from '@pressw/threads';
import type { ChatCoreAdapter, AdapterConfig, Where, SortBy } from '@pressw/threads';

export interface LangGraphAdapterConfig extends AdapterConfig {
  apiUrl: string;
  apiKey: string;
  assistantId?: string;
  defaultHeaders?: Record<string, string>;
}

export class LangGraphAdapter extends BaseAdapter implements ChatCoreAdapter {
  private client: Client;
  private threads: Client['threads'];

  constructor(config: LangGraphAdapterConfig) {
    super(config);

    this.client = new Client({
      apiUrl: config.apiUrl,
      apiKey: config.apiKey,
      defaultHeaders: config.defaultHeaders,
    });

    this.threads = this.client.threads;
  }

  async create<T extends Record<string, unknown>>(params: {
    model: string;
    data: T;
    select?: string[];
  }): Promise<T> {
    const { model, data } = params;

    if (model === 'thread') {
      // Transform input data
      const transformedData = this.transformInput(data);

      // Create thread in LangGraph
      const thread = await this.threads.create({
        metadata: {
          userId: transformedData.userId,
          organizationId: transformedData.organizationId,
          tenantId: transformedData.tenantId,
          title: transformedData.title,
          ...((transformedData.metadata as Record<string, unknown>) || {}),
        },
        threadId: transformedData.id as string | undefined,
      });

      // Transform to match expected output
      const result = {
        id: thread.thread_id,
        title: thread.metadata?.title as string | undefined,
        userId: thread.metadata?.userId as string,
        organizationId: thread.metadata?.organizationId as string | undefined,
        tenantId: thread.metadata?.tenantId as string | undefined,
        metadata: thread.metadata,
        createdAt: new Date(thread.created_at),
        updatedAt: new Date(thread.updated_at),
      };

      return this.transformOutput(result) as T;
    }

    throw new Error(`Model ${model} not supported by LangGraphAdapter`);
  }

  async findOne<T>(params: {
    model: string;
    where: Where[];
    select?: string[];
  }): Promise<T | null> {
    const { model, where } = params;

    if (model === 'thread') {
      // Find thread ID from where clause
      const idWhere = where.find((w) => w.field === 'id');
      if (!idWhere) {
        throw new Error('Thread ID is required for findOne');
      }

      try {
        const thread = await this.threads.get(idWhere.value as string);

        // Check if thread matches other where conditions
        const userIdWhere = where.find((w) => w.field === 'userId');
        if (userIdWhere && thread.metadata?.userId !== userIdWhere.value) {
          return null;
        }

        const orgIdWhere = where.find((w) => w.field === 'organizationId');
        if (orgIdWhere && thread.metadata?.organizationId !== orgIdWhere.value) {
          return null;
        }

        const result = {
          id: thread.thread_id,
          title: thread.metadata?.title as string | undefined,
          userId: thread.metadata?.userId as string,
          organizationId: thread.metadata?.organizationId as string | undefined,
          tenantId: thread.metadata?.tenantId as string | undefined,
          metadata: thread.metadata,
          createdAt: new Date(thread.created_at),
          updatedAt: new Date(thread.updated_at),
        };

        return this.transformOutput(result) as T;
      } catch {
        // Thread not found
        return null;
      }
    }

    throw new Error(`Model ${model} not supported by LangGraphAdapter`);
  }

  async findMany<T>(params: {
    model: string;
    where?: Where[];
    limit?: number;
    offset?: number;
    sortBy?: SortBy;
  }): Promise<T[]> {
    const { model, where, limit = 20, offset = 0 } = params;

    if (model === 'thread') {
      // Build metadata filter from where conditions
      const metadata: Record<string, unknown> = {};
      if (where) {
        for (const condition of where) {
          if (condition.field === 'userId') {
            metadata.userId = condition.value;
          } else if (condition.field === 'organizationId') {
            metadata.organizationId = condition.value;
          } else if (condition.field === 'tenantId') {
            metadata.tenantId = condition.value;
          }
        }
      }

      // Search threads (Note: LangGraph doesn't support sorting in search)
      const threads = await this.threads.search({
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
        limit,
        offset,
      });

      // Transform results
      const results = threads.map((thread: any) => ({
        id: thread.thread_id,
        title: thread.metadata?.title as string | undefined,
        userId: thread.metadata?.userId as string,
        organizationId: thread.metadata?.organizationId as string | undefined,
        tenantId: thread.metadata?.tenantId as string | undefined,
        metadata: thread.metadata,
        createdAt: new Date(thread.created_at),
        updatedAt: new Date(thread.updated_at),
      }));

      return results.map((r: any) => this.transformOutput(r)) as T[];
    }

    throw new Error(`Model ${model} not supported by LangGraphAdapter`);
  }

  async update<T>(params: { model: string; where: Where[]; data: Partial<T> }): Promise<T | null> {
    const { model, where, data } = params;

    if (model === 'thread') {
      // Find thread ID from where clause
      const idWhere = where.find((w) => w.field === 'id');
      if (!idWhere) {
        throw new Error('Thread ID is required for update');
      }

      // Get existing thread first to merge metadata
      const existing = await this.findOne<T>({ model, where });
      if (!existing) {
        return null;
      }

      const transformedData = this.transformInput(data as Record<string, unknown>);

      // Update thread metadata
      const updatedThread = await this.threads.update(idWhere.value as string, {
        metadata: {
          ...(existing as any).metadata,
          ...transformedData,
          updatedAt: new Date().toISOString(),
        },
      });

      const result = {
        id: updatedThread.thread_id,
        title: updatedThread.metadata?.title as string | undefined,
        userId: updatedThread.metadata?.userId as string,
        organizationId: updatedThread.metadata?.organizationId as string | undefined,
        tenantId: updatedThread.metadata?.tenantId as string | undefined,
        metadata: updatedThread.metadata,
        createdAt: new Date(updatedThread.created_at),
        updatedAt: new Date(updatedThread.updated_at),
      };

      return this.transformOutput(result) as T;
    }

    throw new Error(`Model ${model} not supported by LangGraphAdapter`);
  }

  async delete(params: { model: string; where: Where[] }): Promise<void> {
    const { model, where } = params;

    if (model === 'thread') {
      // Find thread ID from where clause
      const idWhere = where.find((w) => w.field === 'id');
      if (!idWhere) {
        throw new Error('Thread ID is required for delete');
      }

      // Verify access before deletion
      const existing = await this.findOne<any>({ model, where });
      if (!existing) {
        throw new Error('Thread not found or access denied');
      }

      await this.threads.delete(idWhere.value as string);
      return;
    }

    throw new Error(`Model ${model} not supported by LangGraphAdapter`);
  }

  async count(params: { model: string; where?: Where[] }): Promise<number> {
    const { model, where } = params;

    if (model === 'thread') {
      // LangGraph doesn't have a direct count API, so we'll use search with limit 0
      // and rely on the total count if available, or do a full search
      const threads = await this.findMany<any>({
        model,
        where,
        limit: 1000, // Maximum we can fetch
        offset: 0,
      });

      return threads.length;
    }

    throw new Error(`Model ${model} not supported by LangGraphAdapter`);
  }

  getSchema(model: string): any {
    // LangGraph doesn't expose schemas, return a basic structure
    if (model === 'thread') {
      return {
        id: 'string',
        title: 'string?',
        userId: 'string',
        organizationId: 'string?',
        tenantId: 'string?',
        metadata: 'object?',
        createdAt: 'date',
        updatedAt: 'date',
      };
    }

    return undefined;
  }
}
