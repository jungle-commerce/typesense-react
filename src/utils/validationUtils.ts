/**
 * @fileoverview Input validation utilities for Typesense operations
 */

import type { SearchRequest } from '../types';

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validates a search request
 */
export function validateSearchRequest(request: SearchRequest): ValidationResult {
  const errors: string[] = [];
  
  if (!request.query_by) {
    errors.push('query_by is required');
  }
  
  if (request.page !== undefined && request.page < 1) {
    errors.push('page must be greater than 0');
  }
  
  if (request.per_page && (request.per_page < 1 || request.per_page > 250)) {
    errors.push('per_page must be between 1 and 250');
  }
  
  // Validate filter_by if present
  if (request.filter_by && typeof request.filter_by === 'string') {
    const filterResult = validateFilterString(request.filter_by);
    if (!filterResult.isValid) {
      errors.push(...filterResult.errors);
    }
  }
  
  // Validate sort_by if present
  if (request.sort_by && typeof request.sort_by === 'string') {
    const sortResult = validateSortString(request.sort_by);
    if (!sortResult.isValid) {
      errors.push(...sortResult.errors);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates a filter string
 */
export function validateFilterString(filterString: string): ValidationResult {
  const errors: string[] = [];
  
  // Allow empty filter string
  if (!filterString || filterString.trim().length === 0) {
    return { isValid: true, errors: [] };
  }
  
  // Check for basic filter syntax
  const filterRegex = /^[a-zA-Z0-9_]+:(=|!=|<=|>=|<|>|~)(`[^`]+`|\[[^\]]+\]|[^\s&|]+)$/;
  const compoundRegex = /\s*(&&|\|\|)\s*/;
  
  // Split by && or || operators
  const filters = filterString.split(compoundRegex).filter((_, index) => index % 2 === 0);
  
  filters.forEach(filter => {
    const trimmed = filter.trim();
    if (trimmed && !filterRegex.test(trimmed)) {
      errors.push(`Invalid filter syntax: ${trimmed}`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates a sort string
 */
export function validateSortString(sortString: string): ValidationResult {
  const errors: string[] = [];
  
  // Allow empty sort string
  if (!sortString || sortString.trim().length === 0) {
    return { isValid: true, errors: [] };
  }
  
  // Check for valid sort syntax - field:direction or just field (defaults to asc)
  const sortRegex = /^[a-zA-Z0-9_]+(?::(asc|desc))?$/;
  const sorts = sortString.split(',');
  
  sorts.forEach(sort => {
    const trimmed = sort.trim();
    if (trimmed && !sortRegex.test(trimmed)) {
      errors.push(`Invalid sort syntax: ${trimmed}`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Options for numeric range validation
 */
export interface NumericRangeOptions {
  allowNegative?: boolean;
  minValue?: number;
  maxValue?: number;
}

/**
 * Validates a numeric range
 */
export function validateNumericRange(
  min?: number, 
  max?: number, 
  options: NumericRangeOptions = {}
): ValidationResult & { error?: string } {
  const errors: string[] = [];
  let error: string | undefined;
  
  if (min !== undefined && max !== undefined && min > max) {
    error = 'Min value must be less than or equal to max value';
    errors.push(error);
  }
  
  if (options.allowNegative === false) {
    if ((min !== undefined && min < 0) || (max !== undefined && max < 0)) {
      error = 'Values must be non-negative';
      errors.push(error);
    }
  }
  
  if (options.minValue !== undefined) {
    if ((min !== undefined && min < options.minValue) || (max !== undefined && max < options.minValue)) {
      error = `Values must be at least ${options.minValue}`;
      errors.push(error);
    }
  }
  
  if (options.maxValue !== undefined) {
    if ((min !== undefined && min > options.maxValue) || (max !== undefined && max > options.maxValue)) {
      error = `Values must not exceed ${options.maxValue}`;
      errors.push(error);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    error
  };
}

/**
 * Options for date range validation
 */
export interface DateRangeOptions {
  allowFuture?: boolean;
  maxDays?: number;
}

/**
 * Validates a date range
 */
export function validateDateRange(
  start?: Date | string, 
  end?: Date | string,
  options: DateRangeOptions = {}
): ValidationResult & { error?: string } {
  const errors: string[] = [];
  let error: string | undefined;
  
  if (start && end) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    if (isNaN(startDate.getTime())) {
      errors.push('Invalid start date');
    }
    
    if (isNaN(endDate.getTime())) {
      errors.push('Invalid end date');
    }
    
    if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime()) && startDate > endDate) {
      error = 'Start date must be before or equal to end date';
      errors.push(error);
    }
    
    // Check future dates
    if (options.allowFuture === false) {
      const now = new Date();
      if (startDate > now || endDate > now) {
        error = 'Dates cannot be in the future';
        errors.push(error);
      }
    }
    
    // Check max days
    if (options.maxDays !== undefined && !isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff > options.maxDays) {
        error = `Date range cannot exceed ${options.maxDays} days`;
        errors.push(error);
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    error
  };
}

/**
 * Validates a facet value
 */
export function validateFacetValue(value: any, type?: string): ValidationResult {
  const errors: string[] = [];
  
  // Handle arrays
  if (Array.isArray(value)) {
    if (value.length === 0) {
      errors.push('Facet array cannot be empty');
    }
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  // Convert to string for validation
  const stringValue = String(value);
  
  if (!stringValue || stringValue.trim().length === 0) {
    errors.push('Facet value cannot be empty');
  }
  
  // Type-specific validation
  if (type) {
    switch (type) {
      case 'int32':
      case 'int64':
      case 'float':
        if (isNaN(Number(stringValue))) {
          errors.push(`Invalid numeric value: ${stringValue}`);
        }
        break;
      case 'bool':
        if (stringValue !== 'true' && stringValue !== 'false') {
          errors.push(`Invalid boolean value: ${stringValue}`);
        }
        break;
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates a collection name
 */
export function validateCollectionName(name: string): ValidationResult {
  const errors: string[] = [];
  
  if (!name || name.trim().length === 0) {
    errors.push('Collection name cannot be empty');
  }
  
  // Typesense collection names must match this pattern
  const collectionRegex = /^[a-zA-Z0-9_-]+$/;
  if (!collectionRegex.test(name)) {
    errors.push('Collection name can only contain letters, numbers, underscores, and hyphens');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates a field name
 */
export function validateFieldName(name: string): ValidationResult {
  const errors: string[] = [];
  
  if (!name || name.trim().length === 0) {
    errors.push('Field name cannot be empty');
  }
  
  // Field names must match this pattern
  const fieldRegex = /^[a-zA-Z][a-zA-Z0-9_]*$/;
  if (!fieldRegex.test(name)) {
    errors.push('Field name must start with a letter and contain only letters, numbers, and underscores');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Options for search query validation
 */
export interface SearchQueryOptions {
  maxLength?: number;
}

/**
 * Validates a search query
 */
export function validateSearchQuery(query: string, options: SearchQueryOptions = {}): ValidationResult {
  const errors: string[] = [];
  
  // Allow empty queries for wildcard searches
  if (query === '') {
    return { isValid: true, errors: [] };
  }
  
  // Check length
  if (options.maxLength && query.length > options.maxLength) {
    errors.push(`Query exceeds maximum length of ${options.maxLength} characters`);
  }
  
  // Allow special characters that are commonly used in searches
  // Only check for actual dangerous injection patterns
  const dangerousPatterns = /<script|<\/script|javascript:|onclick=/i;
  if (dangerousPatterns.test(query)) {
    errors.push('Query contains potentially dangerous patterns');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates an email address
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates a URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates a phone number (basic validation)
 */
export function isValidPhone(phone: string): boolean {
  if (!phone || phone.trim().length === 0) {
    return false;
  }
  
  // Remove common formatting characters
  const cleaned = phone.replace(/[\s\-()\+]/g, '');
  
  // Check if it's too short
  if (cleaned.length < 7) {
    return false;
  }
  
  // Basic international phone number regex
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone.replace(/[\s\-()]/g, ''));
}

/**
 * Sanitizes input to prevent XSS
 */
export function sanitizeInput(input: string | null | undefined): string {
  // Handle null/undefined input
  if (input == null) {
    return '';
  }
  
  // Convert to string if needed
  let str = String(input);
  
  // First escape special characters
  str = str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
  
  // Then trim whitespace
  return str.trim();
}