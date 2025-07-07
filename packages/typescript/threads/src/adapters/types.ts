import { z } from 'zod';

export type DatabaseProvider = 'pg' | 'mysql' | 'sqlite';

export interface Where {
  field: string;
  value: string | number | boolean | Date | null | string[] | number[];
  operator?:
    | 'eq'
    | 'ne'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'in'
    | 'contains'
    | 'starts_with'
    | 'ends_with';
  connector?: 'AND' | 'OR';
}

export type CleanedWhere = Required<Where>;

export interface SortBy {
  field: string;
  direction: 'asc' | 'desc';
}

export interface AdapterConfig {
  /**
   * Use plural table names (users, threads, feedback instead of user, thread, feedback)
   */
  usePlural?: boolean;

  /**
   * Enable debug logs for adapter operations
   */
  debugLogs?: boolean;

  /**
   * Map field names during input transformation
   * Example: { id: "_id" } for MongoDB
   */
  mapKeysInput?: Record<string, string>;

  /**
   * Map field names during output transformation
   * Example: { "_id": "id" } for MongoDB
   */
  mapKeysOutput?: Record<string, string>;

  /**
   * Database-specific capabilities
   */
  supportsJSON?: boolean;
  supportsDates?: boolean;
  supportsBooleans?: boolean;
  supportsReturning?: boolean;

  /**
   * Custom ID generation function
   */
  generateId?: () => string;

  /**
   * Disable auto ID generation
   */
  disableIdGeneration?: boolean;
}

export interface ChatCoreAdapter {
  // CRUD operations
  create<T extends Record<string, unknown>>(params: {
    model: string;
    data: T;
    select?: string[];
  }): Promise<T>;

  findOne<T>(params: { model: string; where: Where[]; select?: string[] }): Promise<T | null>;

  findMany<T>(params: {
    model: string;
    where?: Where[];
    limit?: number;
    offset?: number;
    sortBy?: SortBy;
  }): Promise<T[]>;

  update<T>(params: { model: string; where: Where[]; data: Partial<T> }): Promise<T | null>;

  delete(params: { model: string; where: Where[] }): Promise<void>;

  count(params: { model: string; where?: Where[] }): Promise<number>;

  // Schema information
  getSchema(model: string): unknown;

  // Configuration
  config: AdapterConfig;
}

export interface CreateAdapterParams<TDatabase = unknown> {
  database: TDatabase;
  config: AdapterConfig;
  schemas?: Record<string, unknown>;
}

// Validation schemas
export const WhereSchema = z.object({
  field: z.string(),
  value: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.date(),
    z.null(),
    z.array(z.string()),
    z.array(z.number()),
  ]),
  operator: z
    .enum(['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'in', 'contains', 'starts_with', 'ends_with'])
    .optional(),
  connector: z.enum(['AND', 'OR']).optional(),
});

export const SortBySchema = z.object({
  field: z.string(),
  direction: z.enum(['asc', 'desc']),
});

// Model types based on our schemas
export interface BaseModel {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdapterUser extends BaseModel {
  name: string;
}

export interface AdapterThread extends BaseModel {
  title?: string;
  userId: string;
  metadata?: unknown;
}

export interface AdapterFeedback extends BaseModel {
  threadId: string;
  userId: string;
  type: string;
  value?: string;
  comment?: string;
  messageId?: string;
  helpful?: boolean;
  rating?: number;
}

export type Models = {
  user: AdapterUser;
  thread: AdapterThread;
  feedback: AdapterFeedback;
};

export type ModelName = keyof Models;
