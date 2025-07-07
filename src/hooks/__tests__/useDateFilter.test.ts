/**
 * @fileoverview Tests for useDateFilter hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDateFilter, useDateFieldFilter } from '../useDateFilter';
import { createSearchProviderWrapper } from '../../test/testUtils';

describe('useDateFilter', () => {
  beforeEach(() => {
    // Mock current date for consistent tests
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sets date range filter', () => {
    const { result } = renderHook(() => useDateFilter(), {
      wrapper: createSearchProviderWrapper(),
    });

    const start = new Date('2024-01-01');
    const end = new Date('2024-01-31');

    act(() => {
      result.current.setDateRange('created_at', start, end);
    });

    const filter = result.current.getDateRange('created_at');
    expect(filter).toBeTruthy();
    expect(filter?.start).toEqual(start);
    expect(filter?.end).toEqual(end);
  });

  it('sets last N days filter', () => {
    const { result } = renderHook(() => useDateFilter(), {
      wrapper: createSearchProviderWrapper(),
    });

    act(() => {
      result.current.setLastNDays('created_at', 7);
    });

    const filter = result.current.getDateRange('created_at');
    expect(filter).toBeTruthy();
    
    // Check that the range is approximately 7 days
    const daysDiff = (filter!.end.getTime() - filter!.start.getTime()) / (1000 * 60 * 60 * 24);
    expect(Math.round(daysDiff)).toBe(7);
  });

  it('sets last N months filter', () => {
    const { result } = renderHook(() => useDateFilter(), {
      wrapper: createSearchProviderWrapper(),
    });

    act(() => {
      result.current.setLastNMonths('created_at', 3);
    });

    const filter = result.current.getDateRange('created_at');
    expect(filter).toBeTruthy();
    
    // End date should be current date
    expect(filter!.end.toISOString().split('T')[0]).toBe('2024-01-15');
    // Start date should be 3 months ago
    expect(filter!.start.toISOString().split('T')[0]).toBe('2023-10-15');
  });

  it('sets current month filter', () => {
    const { result } = renderHook(() => useDateFilter(), {
      wrapper: createSearchProviderWrapper(),
    });

    act(() => {
      result.current.setCurrentMonth('created_at');
    });

    const filter = result.current.getDateRange('created_at');
    expect(filter).toBeTruthy();
    
    // The mocked date is January 15, 2024, so we expect January dates
    // Using UTC date comparison to match the implementation
    expect(filter!.start.getUTCFullYear()).toBe(2024);
    expect(filter!.start.getUTCMonth()).toBe(0); // January
    expect(filter!.start.getUTCDate()).toBe(1);
    
    expect(filter!.end.getUTCFullYear()).toBe(2024);
    expect(filter!.end.getUTCMonth()).toBe(0); // January
    expect(filter!.end.getUTCDate()).toBe(31);
  });

  it('sets current year filter', () => {
    const { result } = renderHook(() => useDateFilter(), {
      wrapper: createSearchProviderWrapper(),
    });

    act(() => {
      result.current.setCurrentYear('created_at');
    });

    const filter = result.current.getDateRange('created_at');
    expect(filter).toBeTruthy();
    
    // The mocked date is in 2024
    expect(filter!.start.getUTCFullYear()).toBe(2024);
    expect(filter!.start.getUTCMonth()).toBe(0); // January
    expect(filter!.start.getUTCDate()).toBe(1);
    
    expect(filter!.end.getUTCFullYear()).toBe(2024);
    expect(filter!.end.getUTCMonth()).toBe(11); // December
    expect(filter!.end.getUTCDate()).toBe(31);
  });

  it('sets specific month filter', () => {
    const { result } = renderHook(() => useDateFilter(), {
      wrapper: createSearchProviderWrapper(),
    });

    act(() => {
      result.current.setMonth('created_at', 2023, 11); // December 2023
    });

    const filter = result.current.getDateRange('created_at');
    expect(filter).toBeTruthy();
    
    expect(filter!.start.getUTCFullYear()).toBe(2023);
    expect(filter!.start.getUTCMonth()).toBe(11); // December
    expect(filter!.start.getUTCDate()).toBe(1);
    
    expect(filter!.end.getUTCFullYear()).toBe(2023);
    expect(filter!.end.getUTCMonth()).toBe(11); // December
    expect(filter!.end.getUTCDate()).toBe(31);
  });

  it('sets after date filter', () => {
    const { result } = renderHook(() => useDateFilter(), {
      wrapper: createSearchProviderWrapper(),
    });

    const date = new Date('2024-01-10');

    act(() => {
      result.current.setAfterDate('created_at', date);
    });

    expect(result.current.hasDateFilter('created_at')).toBe(true);
  });

  it('sets before date filter', () => {
    const { result } = renderHook(() => useDateFilter(), {
      wrapper: createSearchProviderWrapper(),
    });

    const date = new Date('2024-01-20');

    act(() => {
      result.current.setBeforeDate('created_at', date);
    });

    expect(result.current.hasDateFilter('created_at')).toBe(true);
  });

  it('applies date presets', () => {
    const { result } = renderHook(() => useDateFilter(), {
      wrapper: createSearchProviderWrapper(),
    });

    act(() => {
      result.current.applyPreset('created_at', 'LAST_7_DAYS');
    });

    expect(result.current.hasDateFilter('created_at')).toBe(true);

    act(() => {
      result.current.applyPreset('created_at', 'THIS_MONTH');
    });

    const filter = result.current.getDateRange('created_at');
    expect(filter!.start.getUTCMonth()).toBe(0); // January
    expect(filter!.end.getUTCMonth()).toBe(0); // January
    expect(filter!.start.getUTCDate()).toBe(1); // First day
    expect(filter!.end.getUTCDate()).toBe(31); // Last day of January
  });

  it('clears date filter', () => {
    const { result } = renderHook(() => useDateFilter(), {
      wrapper: createSearchProviderWrapper(),
    });

    act(() => {
      result.current.setLastNDays('created_at', 7);
    });

    expect(result.current.hasDateFilter('created_at')).toBe(true);

    act(() => {
      result.current.clearDateFilter('created_at');
    });

    expect(result.current.hasDateFilter('created_at')).toBe(false);
    expect(result.current.getDateRange('created_at')).toBe(null);
  });

  it.skip('manages multiple date filters', () => {
    const { result } = renderHook(() => useDateFilter(), {
      wrapper: createSearchProviderWrapper(),
    });

    act(() => {
      result.current.setLastNDays('created_at', 7);
      result.current.setLastNDays('updated_at', 30);
    });

    expect(result.current.hasDateFilter('created_at')).toBe(true);
    expect(result.current.hasDateFilter('updated_at')).toBe(true);

    const createdFilter = result.current.getDateRange('created_at');
    const updatedFilter = result.current.getDateRange('updated_at');

    expect(createdFilter).toBeTruthy();
    expect(updatedFilter).toBeTruthy();
  });
});

describe('useDateFieldFilter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('provides field-specific date filter functions', () => {
    const { result } = renderHook(() => useDateFieldFilter('created_at'), {
      wrapper: createSearchProviderWrapper(),
    });

    act(() => {
      result.current.setLastNDays(7);
    });

    expect(result.current.hasFilter()).toBe(true);

    const range = result.current.getDateRange();
    expect(range).toBeTruthy();

    act(() => {
      result.current.clear();
    });

    expect(result.current.hasFilter()).toBe(false);
  });

  it('manages presets for specific field', () => {
    const { result } = renderHook(() => useDateFieldFilter('created_at'), {
      wrapper: createSearchProviderWrapper(),
    });

    act(() => {
      result.current.applyPreset('THIS_MONTH');
    });

    const range = result.current.getDateRange();
    expect(range).toBeTruthy();
    expect(range!.start.getMonth()).toBe(0); // January
  });
});