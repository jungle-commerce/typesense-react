/**
 * @fileoverview Helper functions for creating common date range filters.
 * Provides convenient methods for building Typesense date filters.
 */

/**
 * Creates a filter string for the last N days
 * @param field - The date field name
 * @param days - Number of days to go back
 * @returns Filter string in Typesense format
 */
export function getLastNDaysFilter(field: string, days: number): string {
  const now = new Date();
  // Set to end of today UTC (23:59:59.999)
  const endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
  
  // Go back N-1 days from today to get exactly N days including today
  const startDate = new Date(endDate);
  startDate.setUTCDate(startDate.getUTCDate() - (days - 1));
  // Set to start of day (00:00:00.000)
  startDate.setUTCHours(0, 0, 0, 0);
  
  const startTimestamp = Math.floor(startDate.getTime() / 1000);
  const endTimestamp = Math.floor(endDate.getTime() / 1000);
  
  return `${field}:[${startTimestamp}..${endTimestamp}]`;
}

/**
 * Creates a filter string for a specific date range
 * @param field - The date field name
 * @param start - Start date (inclusive)
 * @param end - End date (inclusive)
 * @returns Filter string in Typesense format
 */
export function getDateRangeFilter(field: string, start: Date, end: Date): string {
  // Swap dates if end is before start
  let startDate = start;
  let endDate = end;
  if (end.getTime() < start.getTime()) {
    startDate = end;
    endDate = start;
  }
  
  const startTimestamp = Math.floor(startDate.getTime() / 1000);
  const endTimestamp = Math.floor(endDate.getTime() / 1000);
  
  return `${field}:[${startTimestamp}..${endTimestamp}]`;
}

/**
 * Creates a filter string for the current month
 * @param field - The date field name
 * @returns Filter string in Typesense format
 */
export function getCurrentMonthFilter(field: string): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  
  // First day of the month at 00:00:00 UTC
  const startDate = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  
  // Last day of the month at 23:59:59 UTC
  // Note: Day 0 of next month gives us the last day of current month
  const endDate = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
  
  return getDateRangeFilter(field, startDate, endDate);
}

/**
 * Creates a filter string for the current year
 * @param field - The date field name
 * @returns Filter string in Typesense format
 */
export function getCurrentYearFilter(field: string): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  
  // First day of the year at 00:00:00 UTC
  const startDate = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
  // Last day of the year at 23:59:59 UTC
  const endDate = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
  
  return getDateRangeFilter(field, startDate, endDate);
}

/**
 * Creates a filter string for the last N months
 * @param field - The date field name
 * @param months - Number of months to go back
 * @returns Filter string in Typesense format
 */
export function getLastNMonthsFilter(field: string, months: number): string {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setUTCMonth(startDate.getUTCMonth() - months);
  
  return getDateRangeFilter(field, startDate, endDate);
}

/**
 * Creates a filter string for a specific month and year
 * @param field - The date field name
 * @param year - The year
 * @param month - The month (0-11)
 * @returns Filter string in Typesense format
 */
export function getMonthFilter(field: string, year: number, month: number): string {
  // First day of the month at 00:00:00 UTC
  const startDate = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  // Last day of the month at 23:59:59 UTC
  const endDate = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
  
  return getDateRangeFilter(field, startDate, endDate);
}

/**
 * Creates a filter string for dates after a specific date
 * @param field - The date field name
 * @param date - The date to filter after
 * @returns Filter string in Typesense format
 */
export function getAfterDateFilter(field: string, date: Date): string {
  const timestamp = Math.floor(date.getTime() / 1000);
  return `${field}:>${timestamp}`;
}

/**
 * Creates a filter string for dates before a specific date
 * @param field - The date field name
 * @param date - The date to filter before
 * @returns Filter string in Typesense format
 */
export function getBeforeDateFilter(field: string, date: Date): string {
  const timestamp = Math.floor(date.getTime() / 1000);
  return `${field}:<${timestamp}`;
}

/**
 * Common date range presets
 */
export const DateRangePresets = {
  TODAY: 'TODAY',
  YESTERDAY: 'YESTERDAY',
  LAST_7_DAYS: 'LAST_7_DAYS',
  LAST_30_DAYS: 'LAST_30_DAYS',
  THIS_MONTH: 'THIS_MONTH',
  LAST_MONTH: 'LAST_MONTH',
  THIS_YEAR: 'THIS_YEAR',
  LAST_YEAR: 'LAST_YEAR',
} as const;

export type DateRangePreset = typeof DateRangePresets[keyof typeof DateRangePresets];

/**
 * Applies a date preset to get a filter string
 * @param field - The date field name
 * @param preset - The preset to apply
 * @returns Filter string in Typesense format
 */
export function applyDatePreset(field: string, preset: DateRangePreset): string {
  const now = new Date();
  
  switch (preset) {
    case 'TODAY': {
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
      const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
      return getDateRangeFilter(field, start, end);
    }
    
    case 'YESTERDAY': {
      const yesterday = new Date(now);
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      const start = new Date(Date.UTC(yesterday.getUTCFullYear(), yesterday.getUTCMonth(), yesterday.getUTCDate(), 0, 0, 0, 0));
      const end = new Date(Date.UTC(yesterday.getUTCFullYear(), yesterday.getUTCMonth(), yesterday.getUTCDate(), 23, 59, 59, 999));
      return getDateRangeFilter(field, start, end);
    }
    
    case 'LAST_7_DAYS':
      return getLastNDaysFilter(field, 7);
      
    case 'LAST_30_DAYS':
      return getLastNDaysFilter(field, 30);
      
    case 'THIS_MONTH':
      return getCurrentMonthFilter(field);
      
    case 'LAST_MONTH': {
      const lastMonth = new Date(now);
      lastMonth.setUTCMonth(lastMonth.getUTCMonth() - 1);
      return getMonthFilter(field, lastMonth.getUTCFullYear(), lastMonth.getUTCMonth());
    }
    
    case 'THIS_YEAR':
      return getCurrentYearFilter(field);
      
    case 'LAST_YEAR': {
      const lastYear = now.getUTCFullYear() - 1;
      const start = new Date(Date.UTC(lastYear, 0, 1, 0, 0, 0, 0));
      const end = new Date(Date.UTC(lastYear, 11, 31, 23, 59, 59, 999));
      return getDateRangeFilter(field, start, end);
    }
    
    default:
      throw new Error(`Unknown date preset: ${preset}`);
  }
}

/**
 * Parses a date range filter string
 * @param filterString - The filter string to parse
 * @returns The parsed field and date range, or null if not a date range filter
 */
export function parseDateRangeFilter(filterString: string): {
  field: string;
  startDate: Date;
  endDate: Date;
} | null {
  // Match patterns like field:[timestamp..timestamp]
  const rangePattern = /^(\w+):\[(\d+)\.\.(\d+)\]$/;
  const match = filterString.match(rangePattern);
  
  if (match) {
    const field = match[1];
    // Handle both Unix seconds and milliseconds
    let startTimestamp = parseInt(match[2], 10);
    let endTimestamp = parseInt(match[3], 10);
    
    // If timestamps are in milliseconds (more than 10 digits), convert to seconds
    if (startTimestamp.toString().length > 10) {
      startTimestamp = Math.floor(startTimestamp / 1000);
    }
    if (endTimestamp.toString().length > 10) {
      endTimestamp = Math.floor(endTimestamp / 1000);
    }
    
    const startDate = new Date(startTimestamp * 1000);
    const endDate = new Date(endTimestamp * 1000);
    
    return { field, startDate, endDate };
  }
  
  return null;
}

/**
 * Gets the date range from a filter string
 * @param filterString - The filter string to parse
 * @param field - The field name to look for
 * @returns The start and end dates, or null if not found
 */
export function parseDateRangeFromFilter(
  filterString: string, 
  field: string
): { start: Date; end: Date } | null {
  // Match patterns like field:[timestamp..timestamp]
  const rangePattern = new RegExp(`${field}:\\[(\\d+)\\.\\.(\\d+)\\]`);
  const match = filterString.match(rangePattern);
  
  if (match) {
    const start = new Date(parseInt(match[1]) * 1000);
    const end = new Date(parseInt(match[2]) * 1000);
    return { start, end };
  }
  
  // Match patterns like field:>timestamp
  const afterPattern = new RegExp(`${field}:>(\\d+)`);
  const afterMatch = filterString.match(afterPattern);
  
  if (afterMatch) {
    const start = new Date(parseInt(afterMatch[1]) * 1000);
    return { start, end: new Date() };
  }
  
  // Match patterns like field:<timestamp
  const beforePattern = new RegExp(`${field}:<(\\d+)`);
  const beforeMatch = filterString.match(beforePattern);
  
  if (beforeMatch) {
    const end = new Date(parseInt(beforeMatch[1]) * 1000);
    return { start: new Date(0), end };
  }
  
  return null;
}