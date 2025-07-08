import { describe, it, expect } from 'vitest';
import {
  pgUsers,
  pgThreads,
  pgFeedback,
  mysqlUsers,
  mysqlThreads,
  mysqlFeedback,
  sqliteUsers,
  sqliteThreads,
  sqliteFeedback,
  schemas,
  getSchemas,
} from '../src/schema';

describe('Schema Tables', () => {
  describe('PostgreSQL schemas', () => {
    it('should export pgUsers table', () => {
      expect(pgUsers).toBeDefined();
      expect(pgUsers.id).toBeDefined();
      expect(pgUsers.name).toBeDefined();
      expect(pgUsers.createdAt).toBeDefined();
      expect(pgUsers.updatedAt).toBeDefined();
    });

    it('should export pgThreads table', () => {
      expect(pgThreads).toBeDefined();
      expect(pgThreads.id).toBeDefined();
      expect(pgThreads.userId).toBeDefined();
      expect(pgThreads.title).toBeDefined();
      expect(pgThreads.organizationId).toBeDefined();
      expect(pgThreads.tenantId).toBeDefined();
      expect(pgThreads.metadata).toBeDefined();
      expect(pgThreads.createdAt).toBeDefined();
      expect(pgThreads.updatedAt).toBeDefined();
    });

    it('should export pgFeedback table', () => {
      expect(pgFeedback).toBeDefined();
      expect(pgFeedback.id).toBeDefined();
      expect(pgFeedback.threadId).toBeDefined();
      expect(pgFeedback.userId).toBeDefined();
      expect(pgFeedback.type).toBeDefined();
      expect(pgFeedback.value).toBeDefined();
      expect(pgFeedback.comment).toBeDefined();
      expect(pgFeedback.messageId).toBeDefined();
      expect(pgFeedback.helpful).toBeDefined();
      expect(pgFeedback.rating).toBeDefined();
      expect(pgFeedback.createdAt).toBeDefined();
      expect(pgFeedback.updatedAt).toBeDefined();
    });
  });

  describe('MySQL schemas', () => {
    it('should export mysqlUsers table', () => {
      expect(mysqlUsers).toBeDefined();
      expect(mysqlUsers.id).toBeDefined();
      expect(mysqlUsers.name).toBeDefined();
      expect(mysqlUsers.createdAt).toBeDefined();
      expect(mysqlUsers.updatedAt).toBeDefined();
    });

    it('should export mysqlThreads table', () => {
      expect(mysqlThreads).toBeDefined();
      expect(mysqlThreads.id).toBeDefined();
      expect(mysqlThreads.userId).toBeDefined();
    });

    it('should export mysqlFeedback table', () => {
      expect(mysqlFeedback).toBeDefined();
      expect(mysqlFeedback.id).toBeDefined();
      expect(mysqlFeedback.threadId).toBeDefined();
      expect(mysqlFeedback.userId).toBeDefined();
    });
  });

  describe('SQLite schemas', () => {
    it('should export sqliteUsers table', () => {
      expect(sqliteUsers).toBeDefined();
      expect(sqliteUsers.id).toBeDefined();
      expect(sqliteUsers.name).toBeDefined();
      expect(sqliteUsers.createdAt).toBeDefined();
      expect(sqliteUsers.updatedAt).toBeDefined();
    });

    it('should export sqliteThreads table', () => {
      expect(sqliteThreads).toBeDefined();
      expect(sqliteThreads.id).toBeDefined();
      expect(sqliteThreads.userId).toBeDefined();
    });

    it('should export sqliteFeedback table', () => {
      expect(sqliteFeedback).toBeDefined();
      expect(sqliteFeedback.id).toBeDefined();
      expect(sqliteFeedback.threadId).toBeDefined();
      expect(sqliteFeedback.userId).toBeDefined();
    });
  });

  describe('schema collections', () => {
    it('should export all schemas in a collection', () => {
      expect(schemas).toBeDefined();
      expect(schemas.pg).toBeDefined();
      expect(schemas.pg.users).toBe(pgUsers);
      expect(schemas.pg.threads).toBe(pgThreads);
      expect(schemas.pg.feedback).toBe(pgFeedback);

      expect(schemas.mysql).toBeDefined();
      expect(schemas.mysql.users).toBe(mysqlUsers);
      expect(schemas.mysql.threads).toBe(mysqlThreads);
      expect(schemas.mysql.feedback).toBe(mysqlFeedback);

      expect(schemas.sqlite).toBeDefined();
      expect(schemas.sqlite.users).toBe(sqliteUsers);
      expect(schemas.sqlite.threads).toBe(sqliteThreads);
      expect(schemas.sqlite.feedback).toBe(sqliteFeedback);
    });
  });

  describe('getSchemas helper', () => {
    it('should return schemas for a specific provider', () => {
      const pgSchemas = getSchemas('pg');
      expect(pgSchemas).toBe(schemas.pg);

      const mysqlSchemas = getSchemas('mysql');
      expect(mysqlSchemas).toBe(schemas.mysql);

      const sqliteSchemas = getSchemas('sqlite');
      expect(sqliteSchemas).toBe(schemas.sqlite);
    });
  });
});
