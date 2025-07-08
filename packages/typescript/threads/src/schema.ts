// Type definitions for thread management schemas
// These are pure TypeScript types without any database dependencies

export interface User {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Thread extends Record<string, unknown> {
  id: string;
  title?: string;
  userId: string;
  organizationId?: string;
  tenantId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Feedback {
  id: string;
  threadId: string;
  userId: string;
  type: string;
  value?: string;
  comment?: string;
  messageId?: string;
  helpful?: boolean;
  rating?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Type for creating new records (without auto-generated fields)
export type NewUser = Omit<User, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export type NewThread = Omit<Thread, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export type NewFeedback = Omit<Feedback, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

// Database provider types
export type DatabaseProvider = 'postgres' | 'mysql' | 'sqlite';
