import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  inArray,
  like,
  lt,
  lte,
  ne,
  or,
  SQL,
} from 'drizzle-orm';
import { BaseAdapter } from './base-adapter';
import type {
  AdapterConfig,
  Where,
  CleanedWhere,
  SortBy,
  DatabaseProvider,
  ChatCoreAdapter,
} from './types';

export interface DrizzleAdapterConfig extends AdapterConfig {
  provider: DatabaseProvider;

  /**
   * Map ChatCore model names to your existing table names
   */
  tables: {
    user: string; // e.g., "users", "customers", "accounts"
    thread: string; // e.g., "threads", "conversations", "chats"
    feedback: string; // e.g., "feedback", "ratings", "reviews"
  };

  /**
   * Map ChatCore field names to your existing column names
   */
  fields?: {
    user?: {
      id?: string; // default: "id"
      name?: string; // default: "name"
      createdAt?: string; // default: "createdAt"
      updatedAt?: string; // default: "updatedAt"
    };
    thread?: {
      id?: string;
      title?: string;
      userId?: string;
      organizationId?: string;
      tenantId?: string;
      metadata?: string;
      createdAt?: string;
      updatedAt?: string;
    };
    feedback?: {
      id?: string;
      threadId?: string;
      userId?: string;
      type?: string;
      value?: string;
      comment?: string;
      messageId?: string;
      helpful?: string;
      rating?: string;
      createdAt?: string;
      updatedAt?: string;
    };
  };
}

export interface DrizzleDB {
  [key: string]: any;
  _?: {
    fullSchema?: Record<string, any>;
  };
}

export class DrizzleAdapter extends BaseAdapter {
  private db: DrizzleDB;
  private provider: DatabaseProvider;
  private drizzleConfig: DrizzleAdapterConfig;
  private tableSchemas: Record<string, any> = {};

  constructor(db: DrizzleDB, config: DrizzleAdapterConfig) {
    super(config);
    this.db = db;
    this.provider = config.provider;
    this.drizzleConfig = config;

    this.validateAndMapSchemas();
  }

  private validateAndMapSchemas(): void {
    const schema = this.db._?.fullSchema;
    if (!schema) {
      throw new Error(
        "Drizzle schema not found. Make sure you're passing a properly initialized Drizzle instance.",
      );
    }

    // Map each ChatCore model to the user's table
    for (const [chatCoreModel, userTableName] of Object.entries(this.drizzleConfig.tables)) {
      const tableSchema = schema[userTableName];
      if (!tableSchema) {
        throw new Error(`Table "${userTableName}" not found in database schema`);
      }

      // Validate required fields exist
      this.validateRequiredFields(
        chatCoreModel as keyof DrizzleAdapterConfig['tables'],
        tableSchema,
        userTableName,
      );

      this.tableSchemas[chatCoreModel] = tableSchema;
    }
  }

  private validateRequiredFields(
    model: keyof DrizzleAdapterConfig['tables'],
    tableSchema: any,
    tableName: string,
  ): void {
    const requiredFields = this.getRequiredFields(model);
    const fieldMapping = this.drizzleConfig.fields?.[model] || {};

    for (const chatCoreField of requiredFields) {
      const actualFieldName =
        fieldMapping[chatCoreField as keyof typeof fieldMapping] || chatCoreField;

      if (!tableSchema[actualFieldName]) {
        throw new Error(
          `Required field "${actualFieldName}" not found in table "${tableName}". ` +
            `ChatCore requires this field for model "${model}". ` +
            `Either add the field to your schema or map it using the fields config.`,
        );
      }
    }
  }

  private getRequiredFields(model: keyof DrizzleAdapterConfig['tables']): string[] {
    const commonFields = ['id', 'createdAt', 'updatedAt'];

    switch (model) {
      case 'user':
        return [...commonFields, 'name'];
      case 'thread':
        return [...commonFields, 'userId'];
      case 'feedback':
        return [...commonFields, 'threadId', 'userId', 'type'];
      default:
        return commonFields;
    }
  }

  private getSchemaTable(model: string): any {
    const schema = this.tableSchemas[model];
    if (!schema) {
      throw new Error(
        `Model "${model}" not found. Available models: ${Object.keys(this.tableSchemas).join(', ')}`,
      );
    }
    return schema;
  }

  private getModelFieldName(model: string, field: string): string {
    const modelFields = this.drizzleConfig.fields?.[model as keyof DrizzleAdapterConfig['fields']];
    return (modelFields as any)?.[field] || field;
  }

  private buildWhereClause(where: CleanedWhere[], model: string): SQL<unknown>[] {
    if (!where.length) return [];

    const table = this.getSchemaTable(model);

    if (where.length === 1) {
      const w = where[0];
      return [this.buildSingleCondition(w, table, model)];
    }

    const andGroup = where.filter((w) => w.connector === 'AND');
    const orGroup = where.filter((w) => w.connector === 'OR');

    const clauses: SQL<unknown>[] = [];

    if (andGroup.length) {
      clauses.push(and(...andGroup.map((w) => this.buildSingleCondition(w, table, model)))!);
    }

    if (orGroup.length) {
      clauses.push(or(...orGroup.map((w) => this.buildSingleCondition(w, table, model)))!);
    }

    return clauses;
  }

  private buildSingleCondition(where: CleanedWhere, table: any, model: string): SQL<unknown> {
    const fieldName = this.getModelFieldName(model, where.field);
    const field = table[fieldName];

    if (!field) {
      throw new Error(`Field "${fieldName}" not found in table schema for model "${model}"`);
    }

    switch (where.operator) {
      case 'eq':
        return eq(field, where.value);
      case 'ne':
        return ne(field, where.value);
      case 'gt':
        return gt(field, where.value);
      case 'gte':
        return gte(field, where.value);
      case 'lt':
        return lt(field, where.value);
      case 'lte':
        return lte(field, where.value);
      case 'in':
        if (!Array.isArray(where.value)) {
          throw new Error("Value must be an array for 'in' operator");
        }
        return inArray(field, where.value);
      case 'contains':
        return like(field, `%${where.value}%`);
      case 'starts_with':
        return like(field, `${where.value}%`);
      case 'ends_with':
        return like(field, `%${where.value}`);
      default:
        return eq(field, where.value);
    }
  }

  private transformModelInput(data: Record<string, any>, model: string): Record<string, any> {
    const transformed: Record<string, any> = {};

    for (const [chatCoreField, value] of Object.entries(data)) {
      const actualFieldName = this.getModelFieldName(model, chatCoreField);
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

      transformed[actualFieldName] = transformedValue;
    }

    // Add ID if not provided
    const idField = this.getModelFieldName(model, 'id');
    if (!transformed[idField] && !this.config.disableIdGeneration) {
      transformed[idField] = this.config.generateId
        ? this.config.generateId()
        : crypto.randomUUID();
    }

    return transformed;
  }

  private transformModelOutput(
    data: Record<string, any> | null,
    model: string,
  ): Record<string, any> | null {
    if (!data) return null;

    const transformed: Record<string, any> = {};
    const fieldMapping =
      this.drizzleConfig.fields?.[model as keyof DrizzleAdapterConfig['fields']] || {};

    // Reverse the field mapping
    const reverseMapping: Record<string, string> = {};
    for (const [chatCoreField, actualField] of Object.entries(fieldMapping)) {
      reverseMapping[actualField as string] = chatCoreField;
    }

    for (const [actualField, value] of Object.entries(data)) {
      const chatCoreField = reverseMapping[actualField] || actualField;
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

      transformed[chatCoreField] = transformedValue;
    }

    return transformed;
  }

  private async withReturning<T>(
    model: string,
    builder: any,
    data: Record<string, any>,
  ): Promise<T> {
    if (this.config.supportsReturning) {
      const result = await builder.returning();
      return this.transformModelOutput(result[0], model) as T;
    }

    // For databases without RETURNING support
    await builder.execute();

    const idField = this.getModelFieldName(model, 'id');
    if (data[idField]) {
      const found = await this.findOne({
        model,
        where: [{ field: 'id', value: data[idField] }],
      });
      return found as T;
    }

    throw new Error('Unable to retrieve created record. Consider enabling ID generation.');
  }

  async create<T extends Record<string, any>>(params: {
    model: string;
    data: T;
    select?: string[];
  }): Promise<T> {
    const table = this.getSchemaTable(params.model);
    const transformedData = this.transformModelInput(params.data, params.model);

    const builder = this.db.insert(table).values(transformedData);
    return await this.withReturning(params.model, builder, transformedData);
  }

  async findOne<T>(params: {
    model: string;
    where: Where[];
    select?: string[];
  }): Promise<T | null> {
    const table = this.getSchemaTable(params.model);
    const whereClause = this.buildWhereClause(
      this.cleanModelWhereClause(params.where),
      params.model,
    );

    const result = await this.db
      .select()
      .from(table)
      .where(...whereClause)
      .limit(1);

    return result.length ? (this.transformModelOutput(result[0], params.model) as T) : null;
  }

  private cleanModelWhereClause(where: Where[]): CleanedWhere[] {
    return where.map((w) => ({
      field: w.field,
      value: w.value,
      operator: w.operator || 'eq',
      connector: w.connector || 'AND',
    }));
  }

  async findMany<T>(params: {
    model: string;
    where?: Where[];
    limit?: number;
    offset?: number;
    sortBy?: SortBy;
  }): Promise<T[]> {
    const table = this.getSchemaTable(params.model);
    const whereClause = params.where
      ? this.buildWhereClause(this.cleanModelWhereClause(params.where), params.model)
      : [];

    let builder = this.db
      .select()
      .from(table)
      .limit(params.limit || 100)
      .offset(params.offset || 0);

    if (params.sortBy) {
      const sortFieldName = this.getModelFieldName(params.model, params.sortBy.field);
      const sortField = table[sortFieldName];
      if (sortField) {
        const sortFn = params.sortBy.direction === 'desc' ? desc : asc;
        builder = builder.orderBy(sortFn(sortField));
      }
    }

    const results = await builder.where(...whereClause);
    return results.map((r: any) => this.transformModelOutput(r, params.model)) as T[];
  }

  async update<T>(params: { model: string; where: Where[]; data: Partial<T> }): Promise<T | null> {
    const table = this.getSchemaTable(params.model);
    const whereClause = this.buildWhereClause(
      this.cleanModelWhereClause(params.where),
      params.model,
    );
    const transformedData = this.transformModelInput(
      params.data as Record<string, any>,
      params.model,
    );

    const builder = this.db
      .update(table)
      .set(transformedData)
      .where(...whereClause);

    return await this.withReturning(params.model, builder, transformedData);
  }

  async delete(params: { model: string; where: Where[] }): Promise<void> {
    const table = this.getSchemaTable(params.model);
    const whereClause = this.buildWhereClause(
      this.cleanModelWhereClause(params.where),
      params.model,
    );

    await this.db.delete(table).where(...whereClause);
  }

  async count(params: { model: string; where?: Where[] }): Promise<number> {
    const table = this.getSchemaTable(params.model);
    const whereClause = params.where
      ? this.buildWhereClause(this.cleanModelWhereClause(params.where), params.model)
      : [];

    const result = await this.db
      .select({ count: count() })
      .from(table)
      .where(...whereClause);

    return result[0].count;
  }

  getSchema(model: string): any {
    return this.getSchemaTable(model);
  }
}

// Factory function for creating Drizzle adapter
export function createDrizzleAdapter(db: DrizzleDB, config: DrizzleAdapterConfig): ChatCoreAdapter {
  return new DrizzleAdapter(db, config);
}
