/**
 * @fileoverview Tests for schemaPatterns utility functions
 */

import { describe, it, expect } from 'vitest';
import {
  matchesPattern,
  matchesAnyPattern,
  getMatchingPattern,
  DEFAULT_TIMESTAMP_PATTERNS,
  DEFAULT_DISJUNCTIVE_PATTERNS,
  DEFAULT_EXCLUDE_PATTERNS,
  DEFAULT_DATE_PATTERNS,
  DEFAULT_SELECT_PATTERNS,
  type FieldPattern
} from './schemaPatterns';

describe('schemaPatterns', () => {
  describe('matchesPattern', () => {
    describe('exact matching', () => {
      it('matches exact field names', () => {
        const pattern: FieldPattern = { pattern: 'created_at', matchType: 'exact' };
        expect(matchesPattern('created_at', pattern)).toBe(true);
        expect(matchesPattern('updated_at', pattern)).toBe(false);
        expect(matchesPattern('created_at_timestamp', pattern)).toBe(false);
      });

      it('handles case sensitivity for exact matching', () => {
        const caseSensitive: FieldPattern = { pattern: 'CreatedAt', matchType: 'exact' };
        const caseInsensitive: FieldPattern = { pattern: 'CreatedAt', matchType: 'exact', caseSensitive: false };
        
        expect(matchesPattern('CreatedAt', caseSensitive)).toBe(true);
        expect(matchesPattern('createdat', caseSensitive)).toBe(false);
        
        expect(matchesPattern('CreatedAt', caseInsensitive)).toBe(true);
        expect(matchesPattern('createdat', caseInsensitive)).toBe(true);
        expect(matchesPattern('CREATEDAT', caseInsensitive)).toBe(true);
      });
    });

    describe('contains matching', () => {
      it('matches fields containing pattern', () => {
        const pattern: FieldPattern = { pattern: 'date', matchType: 'contains' };
        expect(matchesPattern('created_date', pattern)).toBe(true);
        expect(matchesPattern('date_modified', pattern)).toBe(true);
        expect(matchesPattern('update_date_time', pattern)).toBe(true);
        expect(matchesPattern('timestamp', pattern)).toBe(false);
      });

      it('handles case sensitivity for contains matching', () => {
        const caseSensitive: FieldPattern = { pattern: 'Date', matchType: 'contains' };
        const caseInsensitive: FieldPattern = { pattern: 'Date', matchType: 'contains', caseSensitive: false };
        
        expect(matchesPattern('createdDate', caseSensitive)).toBe(true);
        expect(matchesPattern('createddate', caseSensitive)).toBe(false);
        
        expect(matchesPattern('createdDate', caseInsensitive)).toBe(true);
        expect(matchesPattern('createddate', caseInsensitive)).toBe(true);
        expect(matchesPattern('CREATEDDATE', caseInsensitive)).toBe(true);
      });
    });

    describe('startsWith matching', () => {
      it('matches fields starting with pattern', () => {
        const pattern: FieldPattern = { pattern: 'created', matchType: 'startsWith' };
        expect(matchesPattern('created_at', pattern)).toBe(true);
        expect(matchesPattern('created_date', pattern)).toBe(true);
        expect(matchesPattern('updated_created', pattern)).toBe(false);
        expect(matchesPattern('timestamp', pattern)).toBe(false);
      });

      it('handles case sensitivity for startsWith matching', () => {
        const caseSensitive: FieldPattern = { pattern: 'Created', matchType: 'startsWith' };
        const caseInsensitive: FieldPattern = { pattern: 'Created', matchType: 'startsWith', caseSensitive: false };
        
        expect(matchesPattern('CreatedAt', caseSensitive)).toBe(true);
        expect(matchesPattern('createdAt', caseSensitive)).toBe(false);
        
        expect(matchesPattern('CreatedAt', caseInsensitive)).toBe(true);
        expect(matchesPattern('createdAt', caseInsensitive)).toBe(true);
        expect(matchesPattern('CREATEDAT', caseInsensitive)).toBe(true);
      });
    });

    describe('endsWith matching', () => {
      it('matches fields ending with pattern', () => {
        const pattern: FieldPattern = { pattern: '_at', matchType: 'endsWith' };
        expect(matchesPattern('created_at', pattern)).toBe(true);
        expect(matchesPattern('updated_at', pattern)).toBe(true);
        expect(matchesPattern('at_created', pattern)).toBe(false);
        expect(matchesPattern('timestamp', pattern)).toBe(false);
      });

      it('handles case sensitivity for endsWith matching', () => {
        const caseSensitive: FieldPattern = { pattern: 'At', matchType: 'endsWith' };
        const caseInsensitive: FieldPattern = { pattern: 'At', matchType: 'endsWith', caseSensitive: false };
        
        expect(matchesPattern('createdAt', caseSensitive)).toBe(true);
        expect(matchesPattern('createdat', caseSensitive)).toBe(false);
        
        expect(matchesPattern('createdAt', caseInsensitive)).toBe(true);
        expect(matchesPattern('createdat', caseInsensitive)).toBe(true);
        expect(matchesPattern('CREATEDAT', caseInsensitive)).toBe(true);
      });
    });

    describe('edge cases', () => {
      it('handles empty strings', () => {
        const pattern: FieldPattern = { pattern: '', matchType: 'exact' };
        expect(matchesPattern('', pattern)).toBe(true);
        expect(matchesPattern('field', pattern)).toBe(false);
      });

      it('handles special characters', () => {
        const pattern: FieldPattern = { pattern: 'field_name', matchType: 'exact' };
        expect(matchesPattern('field_name', pattern)).toBe(true);
        
        const patternWithDot: FieldPattern = { pattern: 'field.name', matchType: 'exact' };
        expect(matchesPattern('field.name', patternWithDot)).toBe(true);
      });

      it('returns false for invalid matchType', () => {
        const pattern: FieldPattern = { pattern: 'test', matchType: 'invalid' as any };
        expect(matchesPattern('test', pattern)).toBe(false);
      });

      it('handles undefined caseSensitive as case-sensitive', () => {
        const pattern: FieldPattern = { pattern: 'Test', matchType: 'exact' };
        expect(matchesPattern('Test', pattern)).toBe(true);
        expect(matchesPattern('test', pattern)).toBe(false);
      });
    });
  });

  describe('matchesAnyPattern', () => {
    it('returns true if any pattern matches', () => {
      const patterns: FieldPattern[] = [
        { pattern: 'created_at', matchType: 'exact' },
        { pattern: '_at', matchType: 'endsWith' },
        { pattern: 'date', matchType: 'contains' }
      ];
      
      expect(matchesAnyPattern('created_at', patterns)).toBe(true);
      expect(matchesAnyPattern('updated_at', patterns)).toBe(true);
      expect(matchesAnyPattern('date_field', patterns)).toBe(true);
      expect(matchesAnyPattern('timestamp', patterns)).toBe(false);
    });

    it('returns false for empty patterns array', () => {
      expect(matchesAnyPattern('field', [])).toBe(false);
    });

    it('handles mixed case sensitivity', () => {
      const patterns: FieldPattern[] = [
        { pattern: 'Created', matchType: 'contains' },
        { pattern: 'updated', matchType: 'contains', caseSensitive: false }
      ];
      
      expect(matchesAnyPattern('CreatedAt', patterns)).toBe(true);
      expect(matchesAnyPattern('createdAt', patterns)).toBe(false);
      expect(matchesAnyPattern('UpdatedAt', patterns)).toBe(true);
      expect(matchesAnyPattern('updatedAt', patterns)).toBe(true);
    });
  });

  describe('getMatchingPattern', () => {
    it('returns the first matching pattern', () => {
      const patterns: FieldPattern[] = [
        { pattern: 'exact_match', matchType: 'exact' },
        { pattern: '_at', matchType: 'endsWith' },
        { pattern: 'created', matchType: 'startsWith' }
      ];
      
      const result = getMatchingPattern('created_at', patterns);
      expect(result).toEqual({ pattern: '_at', matchType: 'endsWith' });
    });

    it('returns null if no pattern matches', () => {
      const patterns: FieldPattern[] = [
        { pattern: 'exact_match', matchType: 'exact' },
        { pattern: '_at', matchType: 'endsWith' }
      ];
      
      expect(getMatchingPattern('timestamp', patterns)).toBeNull();
    });

    it('returns null for empty patterns array', () => {
      expect(getMatchingPattern('field', [])).toBeNull();
    });

    it('respects pattern order', () => {
      const patterns: FieldPattern[] = [
        { pattern: 'created_at', matchType: 'exact' },
        { pattern: '_at', matchType: 'endsWith' }
      ];
      
      const result = getMatchingPattern('created_at', patterns);
      expect(result).toEqual({ pattern: 'created_at', matchType: 'exact' });
    });
  });

  describe('default patterns', () => {
    describe('DEFAULT_TIMESTAMP_PATTERNS', () => {
      it('contains expected timestamp patterns', () => {
        expect(DEFAULT_TIMESTAMP_PATTERNS).toContainEqual({ pattern: 'created_at', matchType: 'exact' });
        expect(DEFAULT_TIMESTAMP_PATTERNS).toContainEqual({ pattern: 'updated_at', matchType: 'exact' });
        expect(DEFAULT_TIMESTAMP_PATTERNS).toContainEqual({ pattern: '_at', matchType: 'endsWith' });
        expect(DEFAULT_TIMESTAMP_PATTERNS).toContainEqual({ pattern: 'Date', matchType: 'contains' });
      });

      it('matches common timestamp fields', () => {
        expect(matchesAnyPattern('created_at', DEFAULT_TIMESTAMP_PATTERNS)).toBe(true);
        expect(matchesAnyPattern('publishedAt', DEFAULT_TIMESTAMP_PATTERNS)).toBe(true);
        expect(matchesAnyPattern('lastModifiedDate', DEFAULT_TIMESTAMP_PATTERNS)).toBe(true);
        expect(matchesAnyPattern('updateTime', DEFAULT_TIMESTAMP_PATTERNS)).toBe(true);
      });
    });

    describe('DEFAULT_DISJUNCTIVE_PATTERNS', () => {
      it('contains expected disjunctive patterns', () => {
        expect(DEFAULT_DISJUNCTIVE_PATTERNS).toContainEqual({ pattern: 'tags', matchType: 'exact' });
        expect(DEFAULT_DISJUNCTIVE_PATTERNS).toContainEqual({ pattern: 'category', matchType: 'contains' });
        expect(DEFAULT_DISJUNCTIVE_PATTERNS).toContainEqual({ pattern: 'status', matchType: 'contains' });
      });

      it('matches common disjunctive fields', () => {
        expect(matchesAnyPattern('tags', DEFAULT_DISJUNCTIVE_PATTERNS)).toBe(true);
        expect(matchesAnyPattern('product_category', DEFAULT_DISJUNCTIVE_PATTERNS)).toBe(true);
        expect(matchesAnyPattern('user_status', DEFAULT_DISJUNCTIVE_PATTERNS)).toBe(true);
        expect(matchesAnyPattern('labels', DEFAULT_DISJUNCTIVE_PATTERNS)).toBe(true);
      });
    });

    describe('DEFAULT_EXCLUDE_PATTERNS', () => {
      it('contains expected exclude patterns', () => {
        expect(DEFAULT_EXCLUDE_PATTERNS).toContainEqual({ pattern: 'id', matchType: 'exact' });
        expect(DEFAULT_EXCLUDE_PATTERNS).toContainEqual({ pattern: 'password', matchType: 'contains', caseSensitive: false });
        expect(DEFAULT_EXCLUDE_PATTERNS).toContainEqual({ pattern: 'secret', matchType: 'contains', caseSensitive: false });
      });

      it('matches sensitive and system fields', () => {
        expect(matchesAnyPattern('id', DEFAULT_EXCLUDE_PATTERNS)).toBe(true);
        expect(matchesAnyPattern('user_password', DEFAULT_EXCLUDE_PATTERNS)).toBe(true);
        expect(matchesAnyPattern('apiSecret', DEFAULT_EXCLUDE_PATTERNS)).toBe(true);
        expect(matchesAnyPattern('embedding_vector', DEFAULT_EXCLUDE_PATTERNS)).toBe(true);
      });

      it('is case insensitive for security fields', () => {
        expect(matchesAnyPattern('PASSWORD', DEFAULT_EXCLUDE_PATTERNS)).toBe(true);
        expect(matchesAnyPattern('Secret', DEFAULT_EXCLUDE_PATTERNS)).toBe(true);
        expect(matchesAnyPattern('TOKEN', DEFAULT_EXCLUDE_PATTERNS)).toBe(true);
      });
    });

    describe('DEFAULT_DATE_PATTERNS', () => {
      it('contains expected date patterns', () => {
        expect(DEFAULT_DATE_PATTERNS).toContainEqual({ pattern: 'date', matchType: 'contains', caseSensitive: false });
        expect(DEFAULT_DATE_PATTERNS).toContainEqual({ pattern: 'dob', matchType: 'exact', caseSensitive: false });
        expect(DEFAULT_DATE_PATTERNS).toContainEqual({ pattern: '_at', matchType: 'endsWith' });
      });

      it('matches common date fields', () => {
        expect(matchesAnyPattern('birth_date', DEFAULT_DATE_PATTERNS)).toBe(true);
        expect(matchesAnyPattern('created_at', DEFAULT_DATE_PATTERNS)).toBe(true);
        expect(matchesAnyPattern('DOB', DEFAULT_DATE_PATTERNS)).toBe(true);
        expect(matchesAnyPattern('eventTime', DEFAULT_DATE_PATTERNS)).toBe(true);
      });
    });

    describe('DEFAULT_SELECT_PATTERNS', () => {
      it('contains expected select field patterns', () => {
        expect(DEFAULT_SELECT_PATTERNS).toContainEqual({ pattern: 'status', matchType: 'exact' });
        expect(DEFAULT_SELECT_PATTERNS).toContainEqual({ pattern: 'type', matchType: 'exact' });
        expect(DEFAULT_SELECT_PATTERNS).toContainEqual({ pattern: 'gender', matchType: 'exact' });
      });

      it('matches common select fields', () => {
        expect(matchesAnyPattern('status', DEFAULT_SELECT_PATTERNS)).toBe(true);
        expect(matchesAnyPattern('priority', DEFAULT_SELECT_PATTERNS)).toBe(true);
        expect(matchesAnyPattern('country', DEFAULT_SELECT_PATTERNS)).toBe(true);
        expect(matchesAnyPattern('product_status', DEFAULT_SELECT_PATTERNS)).toBe(false); // exact match only
      });
    });
  });
});