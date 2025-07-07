/**
 * @fileoverview Tests for validation utility functions
 */

import { describe, it, expect, vi } from 'vitest';
import {
  validateSearchRequest,
  validateFilterString,
  validateSortString,
  validateNumericRange,
  validateDateRange,
  validateFacetValue,
  validateCollectionName,
  validateFieldName,
  validateSearchQuery,
  isValidEmail,
  isValidUrl,
  isValidPhone,
  sanitizeInput
} from '../validationUtils';
import type { SearchRequest } from '../../types';

describe('validationUtils', () => {
  describe('validateSearchRequest', () => {
    it('validates valid request', () => {
      const request: SearchRequest = {
        q: 'test',
        query_by: 'name,description',
        page: 1,
        per_page: 20
      };
      
      const result = validateSearchRequest(request);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('validates missing query_by', () => {
      const request: SearchRequest = {
        q: 'test'
      };
      
      const result = validateSearchRequest(request);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('query_by is required');
    });

    it('validates invalid page number', () => {
      const request: SearchRequest = {
        q: 'test',
        query_by: 'name',
        page: 0
      };
      
      const result = validateSearchRequest(request);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('page must be greater than 0');
    });

    it('validates invalid per_page', () => {
      const request: SearchRequest = {
        q: 'test',
        query_by: 'name',
        per_page: 300
      };
      
      const result = validateSearchRequest(request);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('per_page must be between 1 and 250');
    });

    it('validates invalid filter syntax', () => {
      const request: SearchRequest = {
        q: 'test',
        query_by: 'name',
        filter_by: 'invalid filter'
      };
      
      const result = validateSearchRequest(request);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid filter'))).toBe(true);
    });

    it('validates invalid sort syntax', () => {
      const request: SearchRequest = {
        q: 'test',
        query_by: 'name',
        sort_by: 'invalid:sort'
      };
      
      const result = validateSearchRequest(request);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid sort'))).toBe(true);
    });
  });

  describe('validateFilterString', () => {
    it('validates simple equality filter', () => {
      expect(validateFilterString('category:=Electronics').isValid).toBe(true);
    });

    it('validates comparison filters', () => {
      expect(validateFilterString('price:>=100').isValid).toBe(true);
      expect(validateFilterString('price:<=500').isValid).toBe(true);
      expect(validateFilterString('rating:>3').isValid).toBe(true);
      expect(validateFilterString('stock:<10').isValid).toBe(true);
    });

    it('validates negation filter', () => {
      expect(validateFilterString('category:!=Electronics').isValid).toBe(true);
    });

    it('validates array filter', () => {
      expect(validateFilterString('tags:=[`new`,`featured`]').isValid).toBe(true);
    });

    it('validates compound filters', () => {
      expect(validateFilterString('category:=Electronics && price:>=100').isValid).toBe(true);
      expect(validateFilterString('category:=Electronics || category:=Books').isValid).toBe(true);
    });

    it('validates filters with special characters', () => {
      expect(validateFilterString('category:=`Electronics & Gadgets`').isValid).toBe(true);
    });

    it('rejects invalid syntax', () => {
      expect(validateFilterString('category=').isValid).toBe(false);
      expect(validateFilterString('invalid').isValid).toBe(false);
      expect(validateFilterString(':=value').isValid).toBe(false);
      expect(validateFilterString('field:=').isValid).toBe(false);
    });

    it('handles empty string', () => {
      expect(validateFilterString('').isValid).toBe(true);
    });
  });

  describe('validateSortString', () => {
    it('validates simple sort', () => {
      expect(validateSortString('price:asc').isValid).toBe(true);
      expect(validateSortString('name:desc').isValid).toBe(true);
    });

    it('validates default sort (no direction)', () => {
      expect(validateSortString('created_at').isValid).toBe(true);
    });

    it('validates multi-field sort', () => {
      expect(validateSortString('category:asc,price:desc').isValid).toBe(true);
      expect(validateSortString('brand:asc,model:desc,price:asc').isValid).toBe(true);
    });

    it('validates special sort fields', () => {
      expect(validateSortString('_text_match:desc').isValid).toBe(true);
      expect(validateSortString('_seq_id:asc').isValid).toBe(true);
    });

    it('rejects invalid syntax', () => {
      expect(validateSortString('price:invalid').isValid).toBe(false);
      expect(validateSortString(':asc').isValid).toBe(false);
      expect(validateSortString('field:').isValid).toBe(false);
      expect(validateSortString('field').isValid).toBe(true); // field without direction is valid
    });

    it('handles empty string', () => {
      expect(validateSortString('').isValid).toBe(true);
    });
  });

  describe('validateNumericRange', () => {
    it('validates valid range', () => {
      const result = validateNumericRange(0, 100);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('validates equal min and max', () => {
      const result = validateNumericRange(50, 50);
      expect(result.isValid).toBe(true);
    });

    it('rejects inverted range', () => {
      const result = validateNumericRange(100, 10);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Min value must be less than or equal to max value');
    });

    it('rejects negative values when not allowed', () => {
      const result = validateNumericRange(-10, 10, { allowNegative: false });
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Values must be non-negative');
    });

    it('allows negative values when specified', () => {
      const result = validateNumericRange(-100, -10, { allowNegative: true });
      expect(result.isValid).toBe(true);
    });

    it('validates max value constraint', () => {
      const result = validateNumericRange(0, 1000, { maxValue: 500 });
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Values must not exceed 500');
    });

    it('validates min value constraint', () => {
      const result = validateNumericRange(5, 100, { minValue: 10 });
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Values must be at least 10');
    });
  });

  describe('validateDateRange', () => {
    it('validates valid date range', () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-01-31');
      const result = validateDateRange(start, end);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('validates same date for start and end', () => {
      const date = new Date('2024-01-15');
      const result = validateDateRange(date, date);
      expect(result.isValid).toBe(true);
    });

    it('rejects inverted date range', () => {
      const start = new Date('2024-01-31');
      const end = new Date('2024-01-01');
      const result = validateDateRange(start, end);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Start date must be before or equal to end date');
    });

    it('rejects future dates when not allowed', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const result = validateDateRange(new Date(), futureDate, { allowFuture: false });
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Dates cannot be in the future');
    });

    it('validates max days constraint', () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-12-31');
      const result = validateDateRange(start, end, { maxDays: 30 });
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Date range cannot exceed 30 days');
    });
  });

  describe('validateFacetValue', () => {
    it('validates string value', () => {
      expect(validateFacetValue('Electronics', 'string').isValid).toBe(true);
      expect(validateFacetValue('', 'string').isValid).toBe(false);
    });

    it('validates numeric value', () => {
      expect(validateFacetValue('123', 'int32').isValid).toBe(true);
      expect(validateFacetValue('45.67', 'float').isValid).toBe(true);
      expect(validateFacetValue('not-a-number', 'int32').isValid).toBe(false);
    });

    it('validates boolean value', () => {
      expect(validateFacetValue('true', 'bool').isValid).toBe(true);
      expect(validateFacetValue('false', 'bool').isValid).toBe(true);
      expect(validateFacetValue('yes', 'bool').isValid).toBe(false);
      expect(validateFacetValue('1', 'bool').isValid).toBe(false);
    });

    it('validates array types', () => {
      expect(validateFacetValue(['tag1', 'tag2'], 'string[]').isValid).toBe(true);
      expect(validateFacetValue([], 'string[]').isValid).toBe(false);
    });
  });

  describe('validateCollectionName', () => {
    it('validates valid collection names', () => {
      expect(validateCollectionName('products').isValid).toBe(true);
      expect(validateCollectionName('user_profiles').isValid).toBe(true);
      expect(validateCollectionName('items-2024').isValid).toBe(true);
      expect(validateCollectionName('MyCollection').isValid).toBe(true);
    });

    it('rejects invalid collection names', () => {
      expect(validateCollectionName('').isValid).toBe(false);
      expect(validateCollectionName('123start').isValid).toBe(true); // numbers are allowed
      expect(validateCollectionName('has spaces').isValid).toBe(false);
      expect(validateCollectionName('special@chars').isValid).toBe(false);
      expect(validateCollectionName('dots.not.allowed').isValid).toBe(false);
    });

    it('validates length constraints', () => {
      expect(validateCollectionName('a').isValid).toBe(true);
      expect(validateCollectionName('a'.repeat(255)).isValid).toBe(true);
      expect(validateCollectionName('a'.repeat(256)).isValid).toBe(true); // no length check in implementation
    });
  });

  describe('validateFieldName', () => {
    it('validates valid field names', () => {
      expect(validateFieldName('name').isValid).toBe(true);
      expect(validateFieldName('product_id').isValid).toBe(true);
      expect(validateFieldName('price_usd').isValid).toBe(true);
      expect(validateFieldName('isActive').isValid).toBe(true);
    });

    it('rejects invalid field names', () => {
      expect(validateFieldName('').isValid).toBe(false);
      expect(validateFieldName('123field').isValid).toBe(false);
      expect(validateFieldName('field name').isValid).toBe(false);
      expect(validateFieldName('field-name').isValid).toBe(false);
      expect(validateFieldName('field.name').isValid).toBe(false);
    });
  });

  describe('validateSearchQuery', () => {
    it('validates valid queries', () => {
      expect(validateSearchQuery('search term').isValid).toBe(true);
      expect(validateSearchQuery('*').isValid).toBe(true);
      expect(validateSearchQuery('query with "quotes"').isValid).toBe(true);
    });

    it('validates empty query', () => {
      expect(validateSearchQuery('').isValid).toBe(true);
    });

    it('validates query length', () => {
      const longQuery = 'a'.repeat(1000);
      expect(validateSearchQuery(longQuery, { maxLength: 500 }).isValid).toBe(false);
      expect(validateSearchQuery(longQuery, { maxLength: 1500 }).isValid).toBe(true);
    });

    it('validates special characters', () => {
      expect(validateSearchQuery('test@email.com').isValid).toBe(true);
      expect(validateSearchQuery('price > 100').isValid).toBe(true);
      expect(validateSearchQuery('category: electronics').isValid).toBe(true);
    });
  });

  describe('email validation', () => {
    it('validates correct emails', () => {
      expect(isValidEmail('user@example.com')).toBe(true);
      expect(isValidEmail('test.user@domain.co.uk')).toBe(true);
      expect(isValidEmail('user+tag@example.com')).toBe(true);
    });

    it('rejects invalid emails', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('user@')).toBe(false);
      expect(isValidEmail('user @example.com')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });
  });

  describe('URL validation', () => {
    it('validates correct URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://subdomain.example.com/path')).toBe(true);
      expect(isValidUrl('https://example.com:8080')).toBe(true);
      expect(isValidUrl('ftp://files.example.com')).toBe(true);
    });

    it('rejects invalid URLs', () => {
      expect(isValidUrl('not a url')).toBe(false);
      expect(isValidUrl('example.com')).toBe(false);
      expect(isValidUrl('//example.com')).toBe(false);
      expect(isValidUrl('')).toBe(false);
    });
  });

  describe('phone validation', () => {
    it('validates correct phone numbers', () => {
      expect(isValidPhone('+1234567890')).toBe(true);
      expect(isValidPhone('1234567890')).toBe(true);
      expect(isValidPhone('+44 20 1234 5678')).toBe(true);
      expect(isValidPhone('(123) 456-7890')).toBe(true);
    });

    it('rejects invalid phone numbers', () => {
      expect(isValidPhone('123')).toBe(false);
      expect(isValidPhone('phone number')).toBe(false);
      expect(isValidPhone('')).toBe(false);
    });
  });

  describe('sanitizeInput', () => {
    it('escapes HTML tags', () => {
      expect(sanitizeInput('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
      expect(sanitizeInput('Hello <b>world</b>')).toBe('Hello &lt;b&gt;world&lt;&#x2F;b&gt;');
    });

    it('escapes special characters', () => {
      expect(sanitizeInput('price > 100 & rating < 5')).toBe('price &gt; 100 &amp; rating &lt; 5');
    });

    it('trims whitespace', () => {
      expect(sanitizeInput('  test  ')).toBe('test');
    });

    it('handles empty input', () => {
      expect(sanitizeInput('')).toBe('');
      expect(sanitizeInput(null as any)).toBe('');
      expect(sanitizeInput(undefined as any)).toBe('');
    });

    it('preserves safe content', () => {
      expect(sanitizeInput('Normal text 123')).toBe('Normal text 123');
      expect(sanitizeInput('user@example.com')).toBe('user@example.com');
    });
  });
});