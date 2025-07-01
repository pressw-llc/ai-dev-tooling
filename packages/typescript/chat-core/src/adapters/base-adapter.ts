import type { ChatCoreAdapter, AdapterConfig, Where, CleanedWhere, SortBy } from './types';

// Type for Drizzle table schemas
type TableSchema = {
  [key: string]: unknown;
  $inferSelect?: unknown;
  $inferInsert?: unknown;
};

export abstract class BaseAdapter implements ChatCoreAdapter {
  config: AdapterConfig;
  protected schemas: Record<string, TableSchema>;

  constructor(config: AdapterConfig, schemas?: Record<string, TableSchema>) {
    this.config = {
      usePlural: false,
      debugLogs: false,
      supportsJSON: false,
      supportsDates: true,
      supportsBooleans: true,
      supportsReturning: true,
      disableIdGeneration: false,
      ...config,
    };
    this.schemas = schemas || {};
  }

  // Abstract methods that must be implemented by database-specific adapters
  abstract create<T extends Record<string, unknown>>(params: {
    model: string;
    data: T;
    select?: string[];
  }): Promise<T>;

  abstract findOne<T>(params: {
    model: string;
    where: Where[];
    select?: string[];
  }): Promise<T | null>;

  abstract findMany<T>(params: {
    model: string;
    where?: Where[];
    limit?: number;
    offset?: number;
    sortBy?: SortBy;
  }): Promise<T[]>;

  abstract update<T>(params: {
    model: string;
    where: Where[];
    data: Partial<T>;
  }): Promise<T | null>;

  abstract delete(params: { model: string; where: Where[] }): Promise<void>;

  abstract count(params: { model: string; where?: Where[] }): Promise<number>;

  // Utility methods for subclasses
  protected getModelName(model: string): string {
    return this.config.usePlural ? `${model}s` : model;
  }

  protected getFieldName(field: string, isInput = true): string {
    const mapping = isInput ? this.config.mapKeysInput : this.config.mapKeysOutput;
    return mapping?.[field] || field;
  }

  protected transformInput(data: Record<string, unknown>): Record<string, unknown> {
    const transformed: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
      const fieldName = this.getFieldName(key, true);
      let transformedValue = value;

      // Handle database-specific transformations
      if (!this.config.supportsJSON && typeof value === 'object' && value !== null) {
        transformedValue = JSON.stringify(value);
      }

      if (!this.config.supportsDates && value instanceof Date) {
        transformedValue = value.toISOString();
      }

      if (!this.config.supportsBooleans && typeof value === 'boolean') {
        transformedValue = value ? 1 : 0;
      }

      transformed[fieldName] = transformedValue;
    }

    // Add ID if not disabled and not provided
    if (
      !this.config.disableIdGeneration &&
      !transformed.id &&
      !transformed[this.getFieldName('id', true)]
    ) {
      const idField = this.getFieldName('id', true);
      transformed[idField] = this.config.generateId
        ? this.config.generateId()
        : this.generateDefaultId();
    }

    return transformed;
  }

  protected transformOutput(data: Record<string, unknown> | null): Record<string, unknown> | null {
    if (!data) return null;

    const transformed: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
      const fieldName = this.getFieldName(key, false);
      let transformedValue = value;

      // Reverse database-specific transformations
      if (!this.config.supportsJSON && typeof value === 'string') {
        try {
          transformedValue = JSON.parse(value);
        } catch {
          // Keep as string if not valid JSON
        }
      }

      if (!this.config.supportsDates && typeof value === 'string') {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          transformedValue = date;
        }
      }

      if (
        !this.config.supportsBooleans &&
        typeof value === 'number' &&
        (value === 0 || value === 1)
      ) {
        transformedValue = value === 1;
      }

      transformed[fieldName] = transformedValue;
    }

    return transformed;
  }

  protected cleanWhereClause(where: Where[]): CleanedWhere[] {
    return where.map((w) => ({
      field: this.getFieldName(w.field, true),
      value: w.value,
      operator: w.operator || 'eq',
      connector: w.connector || 'AND',
    }));
  }

  protected debugLog(..._args: unknown[]): void {
    if (this.config.debugLogs) {
      // Console.log removed as requested
    }
  }

  protected generateDefaultId(): string {
    return crypto.randomUUID();
  }

  public getSchema(model: string): TableSchema | undefined {
    const modelName = this.getModelName(model);
    return this.schemas[modelName] || this.schemas[model];
  }
}
