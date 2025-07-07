/**
 * @fileoverview Hook for managing date filters specifically.
 * Provides convenient methods for date range filtering.
 */

import { useCallback, useMemo } from 'react';
import { useAdditionalFilters } from './useAdditionalFilters';
import {
  getDateRangeFilter,
  getLastNDaysFilter,
  getCurrentMonthFilter,
  getCurrentYearFilter,
  getLastNMonthsFilter,
  getMonthFilter,
  getAfterDateFilter,
  getBeforeDateFilter,
  parseDateRangeFromFilter,
  DateRangePresets,
  applyDatePreset as applyDatePresetHelper,
  type DateRangePreset
} from '../utils/dateFilterHelpers';

/**
 * Return type for the useDateFilter hook
 */
export interface UseDateFilterReturn {
  /** Set a date range filter */
  setDateRange: (field: string, start: Date, end: Date) => void;
  /** Set a filter for the last N days */
  setLastNDays: (field: string, days: number) => void;
  /** Set a filter for the last N months */
  setLastNMonths: (field: string, months: number) => void;
  /** Set a filter for the current month */
  setCurrentMonth: (field: string) => void;
  /** Set a filter for the current year */
  setCurrentYear: (field: string) => void;
  /** Set a filter for a specific month */
  setMonth: (field: string, year: number, month: number) => void;
  /** Set a filter for dates after a specific date */
  setAfterDate: (field: string, date: Date) => void;
  /** Set a filter for dates before a specific date */
  setBeforeDate: (field: string, date: Date) => void;
  /** Apply a preset date range */
  applyPreset: (field: string, preset: keyof typeof DateRangePresets) => void;
  /** Clear date filter for a specific field */
  clearDateFilter: (field: string) => void;
  /** Get the current date range for a field */
  getDateRange: (field: string) => { start: Date; end: Date } | null;
  /** Check if a date filter exists for a field */
  hasDateFilter: (field: string) => boolean;
}

/**
 * Hook for managing date filters with convenient methods
 * @returns Object with date filter management functions
 */
export function useDateFilter(): UseDateFilterReturn {
  const { setFilter, removeFilter, hasFilter, getFilter } = useAdditionalFilters();
  
  /**
   * Set a date range filter
   */
  const setDateRange = useCallback((field: string, start: Date, end: Date) => {
    const filter = getDateRangeFilter(field, start, end);
    setFilter(field, filter);
  }, [setFilter]);
  
  /**
   * Set a filter for the last N days
   */
  const setLastNDays = useCallback((field: string, days: number) => {
    const filter = getLastNDaysFilter(field, days);
    setFilter(field, filter);
  }, [setFilter]);
  
  /**
   * Set a filter for the last N months
   */
  const setLastNMonths = useCallback((field: string, months: number) => {
    const filter = getLastNMonthsFilter(field, months);
    setFilter(field, filter);
  }, [setFilter]);
  
  /**
   * Set a filter for the current month
   */
  const setCurrentMonth = useCallback((field: string) => {
    const filter = getCurrentMonthFilter(field);
    setFilter(field, filter);
  }, [setFilter]);
  
  /**
   * Set a filter for the current year
   */
  const setCurrentYear = useCallback((field: string) => {
    const filter = getCurrentYearFilter(field);
    setFilter(field, filter);
  }, [setFilter]);
  
  /**
   * Set a filter for a specific month
   */
  const setMonth = useCallback((field: string, year: number, month: number) => {
    const filter = getMonthFilter(field, year, month);
    setFilter(field, filter);
  }, [setFilter]);
  
  /**
   * Set a filter for dates after a specific date
   */
  const setAfterDate = useCallback((field: string, date: Date) => {
    const filter = getAfterDateFilter(field, date);
    setFilter(field, filter);
  }, [setFilter]);
  
  /**
   * Set a filter for dates before a specific date
   */
  const setBeforeDate = useCallback((field: string, date: Date) => {
    const filter = getBeforeDateFilter(field, date);
    setFilter(field, filter);
  }, [setFilter]);
  
  /**
   * Apply a preset date range
   */
  const applyPreset = useCallback((field: string, preset: DateRangePreset) => {
    const filter = applyDatePresetHelper(field, preset);
    setFilter(field, filter);
  }, [setFilter]);
  
  /**
   * Clear date filter for a specific field
   */
  const clearDateFilter = useCallback((field: string) => {
    removeFilter(field);
  }, [removeFilter]);
  
  /**
   * Get the current date range for a field
   */
  const getDateRange = useCallback((field: string) => {
    const filter = getFilter(field);
    if (!filter) return null;
    
    return parseDateRangeFromFilter(filter, field);
  }, [getFilter]);
  
  /**
   * Check if a date filter exists for a field
   */
  const hasDateFilter = useCallback((field: string) => {
    return hasFilter(field);
  }, [hasFilter]);
  
  return {
    setDateRange,
    setLastNDays,
    setLastNMonths,
    setCurrentMonth,
    setCurrentYear,
    setMonth,
    setAfterDate,
    setBeforeDate,
    applyPreset,
    clearDateFilter,
    getDateRange,
    hasDateFilter,
  };
}

/**
 * Hook for managing a specific date field filter
 * @param field - The date field name
 * @returns Object with date filter management functions for that field
 */
export function useDateFieldFilter(field: string) {
  const dateFilter = useDateFilter();
  
  return useMemo(() => ({
    setDateRange: (start: Date, end: Date) => dateFilter.setDateRange(field, start, end),
    setLastNDays: (days: number) => dateFilter.setLastNDays(field, days),
    setLastNMonths: (months: number) => dateFilter.setLastNMonths(field, months),
    setCurrentMonth: () => dateFilter.setCurrentMonth(field),
    setCurrentYear: () => dateFilter.setCurrentYear(field),
    setMonth: (year: number, month: number) => dateFilter.setMonth(field, year, month),
    setAfterDate: (date: Date) => dateFilter.setAfterDate(field, date),
    setBeforeDate: (date: Date) => dateFilter.setBeforeDate(field, date),
    applyPreset: (preset: keyof typeof DateRangePresets) => dateFilter.applyPreset(field, preset),
    clear: () => dateFilter.clearDateFilter(field),
    getDateRange: () => dateFilter.getDateRange(field),
    hasFilter: () => dateFilter.hasDateFilter(field),
  }), [field, dateFilter]);
}