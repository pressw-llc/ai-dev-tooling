import { describe, expect, it } from 'bun:test';
import { generateMessageId, formatTimestamp } from '../src/utils';

describe('Utils', () => {
  describe('generateMessageId', () => {
    it('should generate a valid UUID', () => {
      const id = generateMessageId();

      // Check UUID v4 format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(id).toMatch(uuidRegex);
    });

    it('should generate unique IDs', () => {
      const id1 = generateMessageId();
      const id2 = generateMessageId();

      expect(id1).not.toBe(id2);
    });
  });

  describe('formatTimestamp', () => {
    it('should format date to ISO string', () => {
      const date = new Date('2024-01-01T12:00:00Z');
      const formatted = formatTimestamp(date);

      expect(formatted).toBe('2024-01-01T12:00:00.000Z');
    });
  });
});
