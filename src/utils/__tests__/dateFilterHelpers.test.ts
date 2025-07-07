/**
 * @fileoverview Tests for dateFilterHelpers utility functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getLastNDaysFilter,
  getLastNMonthsFilter,
  getCurrentMonthFilter,
  getCurrentYearFilter,
  getDateRangeFilter,
  getAfterDateFilter,
  getBeforeDateFilter,
  getMonthFilter,
  parseDateRangeFilter,
  DateRangePresets,
  applyDatePreset
} from '../dateFilterHelpers';

describe('dateFilterHelpers', () => {
  beforeEach(() => {
    // Mock current date to 2024-01-15 12:00:00 UTC
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getLastNDaysFilter', () => {
    it('creates filter for last N days', () => {
      const filter = getLastNDaysFilter('created_at', 7);
      const parsed = parseDateRangeFilter(filter);
      
      expect(parsed).toBeTruthy();
      expect(parsed!.field).toBe('created_at');
      
      // Check date range is approximately 7 days
      const daysDiff = (parsed!.endDate.getTime() - parsed!.startDate.getTime()) / (1000 * 60 * 60 * 24);
      expect(Math.round(daysDiff)).toBe(7);
      
      // End date should be current date
      expect(parsed!.endDate.toISOString().split('T')[0]).toBe('2024-01-15');
    });

    it('handles single day', () => {
      const filter = getLastNDaysFilter('created_at', 1);
      const parsed = parseDateRangeFilter(filter);
      
      const daysDiff = (parsed!.endDate.getTime() - parsed!.startDate.getTime()) / (1000 * 60 * 60 * 24);
      expect(Math.round(daysDiff)).toBe(1);
    });

    it('handles large number of days', () => {
      const filter = getLastNDaysFilter('created_at', 365);
      const parsed = parseDateRangeFilter(filter);
      
      const daysDiff = (parsed!.endDate.getTime() - parsed!.startDate.getTime()) / (1000 * 60 * 60 * 24);
      expect(Math.round(daysDiff)).toBe(365);
    });
  });

  describe('getLastNMonthsFilter', () => {
    it('creates filter for last N months', () => {
      const filter = getLastNMonthsFilter('created_at', 3);
      const parsed = parseDateRangeFilter(filter);
      
      expect(parsed!.endDate.toISOString().split('T')[0]).toBe('2024-01-15');
      expect(parsed!.startDate.toISOString().split('T')[0]).toBe('2023-10-15');
    });

    it('handles month boundary correctly', () => {
      // Set date to end of month
      vi.setSystemTime(new Date('2024-01-31T12:00:00Z'));
      
      const filter = getLastNMonthsFilter('created_at', 1);
      const parsed = parseDateRangeFilter(filter);
      
      expect(parsed!.endDate.toISOString().split('T')[0]).toBe('2024-01-31');
      expect(parsed!.startDate.toISOString().split('T')[0]).toBe('2023-12-31');
    });

    it('handles year boundary', () => {
      const filter = getLastNMonthsFilter('created_at', 13);
      const parsed = parseDateRangeFilter(filter);
      
      expect(parsed!.startDate.getFullYear()).toBe(2022);
    });
  });

  describe('getCurrentMonthFilter', () => {
    it('creates filter for current month', () => {
      const filter = getCurrentMonthFilter('created_at');
      const parsed = parseDateRangeFilter(filter);
      
      expect(parsed!.startDate.toISOString().split('T')[0]).toBe('2024-01-01');
      expect(parsed!.endDate.toISOString().split('T')[0]).toBe('2024-01-31');
    });

    it('handles different months correctly', () => {
      // February (leap year)
      vi.setSystemTime(new Date('2024-02-15T12:00:00Z'));
      const filterFeb = getCurrentMonthFilter('created_at');
      const parsedFeb = parseDateRangeFilter(filterFeb);
      
      expect(parsedFeb!.startDate.toISOString().split('T')[0]).toBe('2024-02-01');
      expect(parsedFeb!.endDate.toISOString().split('T')[0]).toBe('2024-02-29');
      
      // April (30 days)
      vi.setSystemTime(new Date('2024-04-15T12:00:00Z'));
      const filterApr = getCurrentMonthFilter('created_at');
      const parsedApr = parseDateRangeFilter(filterApr);
      
      expect(parsedApr!.endDate.toISOString().split('T')[0]).toBe('2024-04-30');
    });
  });

  describe('getCurrentYearFilter', () => {
    it('creates filter for current year', () => {
      const filter = getCurrentYearFilter('created_at');
      const parsed = parseDateRangeFilter(filter);
      
      expect(parsed!.startDate.toISOString().split('T')[0]).toBe('2024-01-01');
      expect(parsed!.endDate.toISOString().split('T')[0]).toBe('2024-12-31');
    });
  });

  describe('getDateRangeFilter', () => {
    it('creates filter for date range', () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-01-31');
      
      const filter = getDateRangeFilter('created_at', start, end);
      expect(filter).toMatch(/created_at:\[\d+\.\.\d+\]/);
      
      const parsed = parseDateRangeFilter(filter);
      expect(parsed!.startDate.toISOString()).toBe(start.toISOString());
      expect(parsed!.endDate.toISOString()).toBe(end.toISOString());
    });

    it('handles same day range', () => {
      const date = new Date('2024-01-15');
      const filter = getDateRangeFilter('created_at', date, date);
      
      const parsed = parseDateRangeFilter(filter);
      expect(parsed!.startDate.toISOString()).toBe(date.toISOString());
      expect(parsed!.endDate.toISOString()).toBe(date.toISOString());
    });

    it('swaps dates if end is before start', () => {
      const start = new Date('2024-01-31');
      const end = new Date('2024-01-01');
      
      const filter = getDateRangeFilter('created_at', start, end);
      const parsed = parseDateRangeFilter(filter);
      
      expect(parsed!.startDate.getTime()).toBeLessThanOrEqual(parsed!.endDate.getTime());
    });
  });

  describe('getAfterDateFilter', () => {
    it('creates filter for dates after given date', () => {
      const date = new Date('2024-01-10');
      const filter = getAfterDateFilter('created_at', date);
      
      expect(filter).toMatch(/created_at:>\d+/);
      
      const match = filter.match(/>(\d+)/);
      const timestamp = parseInt(match![1], 10);
      expect(timestamp).toBe(Math.floor(date.getTime() / 1000));
    });
  });

  describe('getBeforeDateFilter', () => {
    it('creates filter for dates before given date', () => {
      const date = new Date('2024-01-20');
      const filter = getBeforeDateFilter('created_at', date);
      
      expect(filter).toMatch(/created_at:<\d+/);
      
      const match = filter.match(/<(\d+)/);
      const timestamp = parseInt(match![1], 10);
      expect(timestamp).toBe(Math.floor(date.getTime() / 1000));
    });
  });

  describe('getMonthFilter', () => {
    it('creates filter for specific month', () => {
      const filter = getMonthFilter('created_at', 2023, 11); // December 2023
      const parsed = parseDateRangeFilter(filter);
      
      expect(parsed!.startDate.toISOString().split('T')[0]).toBe('2023-12-01');
      expect(parsed!.endDate.toISOString().split('T')[0]).toBe('2023-12-31');
    });

    it('handles February in leap year', () => {
      const filter = getMonthFilter('created_at', 2024, 1); // February 2024
      const parsed = parseDateRangeFilter(filter);
      
      expect(parsed!.endDate.toISOString().split('T')[0]).toBe('2024-02-29');
    });

    it('handles February in non-leap year', () => {
      const filter = getMonthFilter('created_at', 2023, 1); // February 2023
      const parsed = parseDateRangeFilter(filter);
      
      expect(parsed!.endDate.toISOString().split('T')[0]).toBe('2023-02-28');
    });
  });

  describe('parseDateRangeFilter', () => {
    it('parses range filter', () => {
      const filter = 'created_at:[1704067200..1706745599]';
      const parsed = parseDateRangeFilter(filter);
      
      expect(parsed).toBeTruthy();
      expect(parsed!.field).toBe('created_at');
      expect(parsed!.startDate).toBeInstanceOf(Date);
      expect(parsed!.endDate).toBeInstanceOf(Date);
    });

    it('returns null for invalid format', () => {
      expect(parseDateRangeFilter('invalid')).toBe(null);
      expect(parseDateRangeFilter('created_at:>123')).toBe(null);
      expect(parseDateRangeFilter('created_at:[123]')).toBe(null);
    });

    it('handles millisecond timestamps', () => {
      const now = Date.now();
      const filter = `created_at:[${now}..${now + 86400000}]`;
      const parsed = parseDateRangeFilter(filter);
      
      expect(parsed).toBeTruthy();
      // Should convert to seconds
      expect(parsed!.startDate.getTime()).toBe(Math.floor(now / 1000) * 1000);
    });
  });

  describe('DateRangePresets', () => {
    it('has all expected presets', () => {
      expect(DateRangePresets.TODAY).toBeDefined();
      expect(DateRangePresets.YESTERDAY).toBeDefined();
      expect(DateRangePresets.LAST_7_DAYS).toBeDefined();
      expect(DateRangePresets.LAST_30_DAYS).toBeDefined();
      expect(DateRangePresets.THIS_MONTH).toBeDefined();
      expect(DateRangePresets.LAST_MONTH).toBeDefined();
      expect(DateRangePresets.THIS_YEAR).toBeDefined();
      expect(DateRangePresets.LAST_YEAR).toBeDefined();
    });
  });

  describe('applyDatePreset', () => {
    it('applies TODAY preset', () => {
      const filter = applyDatePreset('created_at', 'TODAY');
      const parsed = parseDateRangeFilter(filter);
      
      const today = new Date();
      expect(parsed!.startDate.toISOString().split('T')[0]).toBe(today.toISOString().split('T')[0]);
      expect(parsed!.endDate.toISOString().split('T')[0]).toBe(today.toISOString().split('T')[0]);
    });

    it('applies YESTERDAY preset', () => {
      const filter = applyDatePreset('created_at', 'YESTERDAY');
      const parsed = parseDateRangeFilter(filter);
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      expect(parsed!.startDate.toISOString().split('T')[0]).toBe(yesterday.toISOString().split('T')[0]);
      expect(parsed!.endDate.toISOString().split('T')[0]).toBe(yesterday.toISOString().split('T')[0]);
    });

    it('applies LAST_7_DAYS preset', () => {
      const filter = applyDatePreset('created_at', 'LAST_7_DAYS');
      const parsed = parseDateRangeFilter(filter);
      
      const daysDiff = (parsed!.endDate.getTime() - parsed!.startDate.getTime()) / (1000 * 60 * 60 * 24);
      expect(Math.round(daysDiff)).toBe(7);
    });

    it('applies THIS_MONTH preset', () => {
      const filter = applyDatePreset('created_at', 'THIS_MONTH');
      const parsed = parseDateRangeFilter(filter);
      
      expect(parsed!.startDate.getUTCDate()).toBe(1);
      expect(parsed!.startDate.getUTCMonth()).toBe(0); // January
      expect(parsed!.endDate.getUTCMonth()).toBe(0); // January
    });

    it('applies LAST_MONTH preset', () => {
      const filter = applyDatePreset('created_at', 'LAST_MONTH');
      const parsed = parseDateRangeFilter(filter);
      
      expect(parsed!.startDate.getUTCMonth()).toBe(11); // December
      expect(parsed!.startDate.getUTCFullYear()).toBe(2023);
      expect(parsed!.endDate.getUTCMonth()).toBe(11); // December
    });

    it('applies THIS_YEAR preset', () => {
      const filter = applyDatePreset('created_at', 'THIS_YEAR');
      const parsed = parseDateRangeFilter(filter);
      
      expect(parsed!.startDate.getUTCFullYear()).toBe(2024);
      expect(parsed!.startDate.getUTCMonth()).toBe(0);
      expect(parsed!.startDate.getUTCDate()).toBe(1);
      expect(parsed!.endDate.getUTCFullYear()).toBe(2024);
      expect(parsed!.endDate.getUTCMonth()).toBe(11);
      expect(parsed!.endDate.getUTCDate()).toBe(31);
    });

    it('applies LAST_YEAR preset', () => {
      const filter = applyDatePreset('created_at', 'LAST_YEAR');
      const parsed = parseDateRangeFilter(filter);
      
      expect(parsed!.startDate.getUTCFullYear()).toBe(2023);
      expect(parsed!.endDate.getUTCFullYear()).toBe(2023);
    });

    it('handles invalid preset', () => {
      expect(() => applyDatePreset('created_at', 'INVALID' as any)).toThrow();
    });
  });
});