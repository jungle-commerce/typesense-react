/**
 * @fileoverview Tests for useAdditionalFilters hook
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAdditionalFilters } from '../useAdditionalFilters';
import { createSearchProviderWrapper } from '../../test/testUtils';

describe('useAdditionalFilters', () => {
  it('initializes with empty filters', () => {
    const { result } = renderHook(() => useAdditionalFilters(), {
      wrapper: createSearchProviderWrapper(),
    });

    expect(result.current.filters.size).toBe(0);
    expect(result.current.filterString).toBe('');
  });

  it('parses initial additional filters', () => {
    const { result } = renderHook(() => useAdditionalFilters(), {
      wrapper: createSearchProviderWrapper({
        initialState: {
          additionalFilters: 'category:electronics && price:>100',
        },
      }),
    });

    expect(result.current.filters.size).toBe(2);
    expect(result.current.filters.get('category')).toBe('category:electronics');
    expect(result.current.filters.get('price')).toBe('price:>100');
  });

  it('sets a filter for a field', () => {
    const { result } = renderHook(() => useAdditionalFilters(), {
      wrapper: createSearchProviderWrapper(),
    });

    act(() => {
      result.current.setFilter('in_stock', 'in_stock:true');
    });

    expect(result.current.filters.get('in_stock')).toBe('in_stock:true');
    expect(result.current.filterString).toBe('in_stock:true');
  });

  it('updates an existing filter', () => {
    const { result } = renderHook(() => useAdditionalFilters(), {
      wrapper: createSearchProviderWrapper({
        initialState: {
          additionalFilters: 'price:>100',
        },
      }),
    });

    act(() => {
      result.current.setFilter('price', 'price:>200');
    });

    expect(result.current.filters.get('price')).toBe('price:>200');
    expect(result.current.filterString).toBe('price:>200');
  });

  it('removes a filter', () => {
    const { result } = renderHook(() => useAdditionalFilters(), {
      wrapper: createSearchProviderWrapper({
        initialState: {
          additionalFilters: 'category:electronics && price:>100',
        },
      }),
    });

    act(() => {
      result.current.removeFilter('category');
    });

    expect(result.current.filters.has('category')).toBe(false);
    expect(result.current.filterString).toBe('price:>100');
  });

  it('clears all filters', () => {
    const { result } = renderHook(() => useAdditionalFilters(), {
      wrapper: createSearchProviderWrapper({
        initialState: {
          additionalFilters: 'category:electronics && price:>100 && in_stock:true',
        },
      }),
    });

    act(() => {
      result.current.clearFilters();
    });

    expect(result.current.filters.size).toBe(0);
    expect(result.current.filterString).toBe('');
  });

  it('checks if filter exists', () => {
    const { result } = renderHook(() => useAdditionalFilters(), {
      wrapper: createSearchProviderWrapper({
        initialState: {
          additionalFilters: 'category:electronics',
        },
      }),
    });

    expect(result.current.hasFilter('category')).toBe(true);
    expect(result.current.hasFilter('price')).toBe(false);
  });

  it('gets filter for field', () => {
    const { result } = renderHook(() => useAdditionalFilters(), {
      wrapper: createSearchProviderWrapper({
        initialState: {
          additionalFilters: 'category:electronics && price:>100',
        },
      }),
    });

    expect(result.current.getFilter('category')).toBe('category:electronics');
    expect(result.current.getFilter('brand')).toBe(null);
  });

  it('sets filter string directly', () => {
    const { result } = renderHook(() => useAdditionalFilters(), {
      wrapper: createSearchProviderWrapper(),
    });

    act(() => {
      result.current.setFilterString('featured:true && discount:>0');
    });

    expect(result.current.filters.size).toBe(2);
    expect(result.current.filters.get('featured')).toBe('featured:true');
    expect(result.current.filters.get('discount')).toBe('discount:>0');
  });

  it('merges filters', () => {
    const { result } = renderHook(() => useAdditionalFilters(), {
      wrapper: createSearchProviderWrapper({
        initialState: {
          additionalFilters: 'category:electronics',
        },
      }),
    });

    act(() => {
      result.current.mergeFilters('price:>100 && in_stock:true');
    });

    expect(result.current.filters.size).toBe(3);
    expect(result.current.filterString).toContain('category:electronics');
    expect(result.current.filterString).toContain('price:>100');
    expect(result.current.filterString).toContain('in_stock:true');
  });

  it('validates filter strings', () => {
    const { result } = renderHook(() => useAdditionalFilters(), {
      wrapper: createSearchProviderWrapper(),
    });

    const valid = result.current.validateFilter('category:electronics && price:>100');
    expect(valid.isValid).toBe(true);

    const invalid1 = result.current.validateFilter('category:electronics && (price:>100');
    expect(invalid1.isValid).toBe(false);
    expect(invalid1.error).toContain('parenthesis');

    const invalid2 = result.current.validateFilter('invalid filter');
    expect(invalid2.isValid).toBe(false);
  });

  it('logs error for invalid filter', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    const { result } = renderHook(() => useAdditionalFilters(), {
      wrapper: createSearchProviderWrapper(),
    });

    act(() => {
      result.current.setFilter('test', 'invalid filter');
    });

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid filter'));
    
    consoleSpy.mockRestore();
  });
});