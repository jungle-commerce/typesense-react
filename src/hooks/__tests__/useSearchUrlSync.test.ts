/**
 * @fileoverview Tests for useSearchUrlSync hook
 * TDD - RED phase: Writing tests before implementation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSearchUrlSync, type UseSearchUrlSyncOptions } from '../useSearchUrlSync';
import type { SearchState } from '../../types';

// Mock window.history and window.location
const mockPushState = vi.fn();
const mockReplaceState = vi.fn();
const mockAddEventListener = vi.fn();
const mockRemoveEventListener = vi.fn();

const createMockLocation = (search = '') => ({
  search,
  href: `http://localhost${search}`,
  pathname: '/',
  hash: '',
  origin: 'http://localhost',
  host: 'localhost',
  hostname: 'localhost',
  port: '',
  protocol: 'http:',
});

describe('useSearchUrlSync', () => {
  let originalHistory: typeof window.history;
  let originalLocation: Location;
  let originalAddEventListener: typeof window.addEventListener;
  let originalRemoveEventListener: typeof window.removeEventListener;

  beforeEach(() => {
    // Store originals
    originalHistory = window.history;
    originalLocation = window.location;
    originalAddEventListener = window.addEventListener;
    originalRemoveEventListener = window.removeEventListener;

    // Mock history
    Object.defineProperty(window, 'history', {
      value: {
        pushState: mockPushState,
        replaceState: mockReplaceState,
        state: null,
      },
      writable: true,
    });

    // Mock location
    Object.defineProperty(window, 'location', {
      value: createMockLocation(),
      writable: true,
    });

    // Mock event listeners
    window.addEventListener = mockAddEventListener;
    window.removeEventListener = mockRemoveEventListener;

    // Clear mocks
    mockPushState.mockClear();
    mockReplaceState.mockClear();
    mockAddEventListener.mockClear();
    mockRemoveEventListener.mockClear();
  });

  afterEach(() => {
    // Restore originals
    Object.defineProperty(window, 'history', { value: originalHistory, writable: true });
    Object.defineProperty(window, 'location', { value: originalLocation, writable: true });
    window.addEventListener = originalAddEventListener;
    window.removeEventListener = originalRemoveEventListener;
  });

  describe('initialization', () => {
    it('reads initial state from URL on mount', () => {
      Object.defineProperty(window, 'location', {
        value: createMockLocation('?q=laptops&page=2'),
        writable: true,
      });

      const { result } = renderHook(() => useSearchUrlSync());

      expect(result.current.initialState.query).toBe('laptops');
      expect(result.current.initialState.page).toBe(2);
    });

    it('returns empty initial state when URL has no params', () => {
      const { result } = renderHook(() => useSearchUrlSync());

      expect(result.current.initialState.query).toBeUndefined();
      expect(result.current.initialState.page).toBeUndefined();
    });

    it('deserializes facet fields from URL', () => {
      Object.defineProperty(window, 'location', {
        value: createMockLocation('?status=active,pending'),
        writable: true,
      });

      const options: UseSearchUrlSyncOptions = {
        facetFields: ['status'],
      };

      const { result } = renderHook(() => useSearchUrlSync(options));

      expect(result.current.initialState.disjunctiveFacets).toEqual({
        status: ['active', 'pending'],
      });
    });

    it('deserializes numeric fields from URL', () => {
      Object.defineProperty(window, 'location', {
        value: createMockLocation('?price=100..500'),
        writable: true,
      });

      const options: UseSearchUrlSyncOptions = {
        numericFields: ['price'],
      };

      const { result } = renderHook(() => useSearchUrlSync(options));

      expect(result.current.initialState.numericFilters).toEqual({
        price: { min: 100, max: 500 },
      });
    });

    it('registers popstate event listener', () => {
      renderHook(() => useSearchUrlSync());

      expect(mockAddEventListener).toHaveBeenCalledWith(
        'popstate',
        expect.any(Function)
      );
    });

    it('removes popstate listener on unmount', () => {
      const { unmount } = renderHook(() => useSearchUrlSync());

      unmount();

      expect(mockRemoveEventListener).toHaveBeenCalledWith(
        'popstate',
        expect.any(Function)
      );
    });
  });

  describe('state synchronization', () => {
    it('updates URL when syncToUrl is called', () => {
      const { result } = renderHook(() => useSearchUrlSync());

      const state: Partial<SearchState> = {
        query: 'laptops',
        page: 1,
        perPage: 20,
        sortBy: '',
        disjunctiveFacets: {},
        numericFilters: {},
        dateFilters: {},
        selectiveFilters: {},
      };

      act(() => {
        result.current.syncToUrl(state);
      });

      expect(mockPushState).toHaveBeenCalledWith(
        null,
        '',
        expect.stringContaining('q=laptops')
      );
    });

    it('uses replaceState when replace option is true', () => {
      const { result } = renderHook(() => useSearchUrlSync());

      const state: Partial<SearchState> = {
        query: 'test',
        page: 1,
        perPage: 20,
        sortBy: '',
        disjunctiveFacets: {},
        numericFilters: {},
        dateFilters: {},
        selectiveFilters: {},
      };

      act(() => {
        result.current.syncToUrl(state, { replace: true });
      });

      expect(mockReplaceState).toHaveBeenCalled();
      expect(mockPushState).not.toHaveBeenCalled();
    });

    it('preserves non-search URL params', () => {
      Object.defineProperty(window, 'location', {
        value: createMockLocation('?tab=details&view=grid'),
        writable: true,
      });

      const { result } = renderHook(() =>
        useSearchUrlSync({ preserveParams: ['tab', 'view'] })
      );

      const state: Partial<SearchState> = {
        query: 'laptops',
        page: 1,
        perPage: 20,
        sortBy: '',
        disjunctiveFacets: {},
        numericFilters: {},
        dateFilters: {},
        selectiveFilters: {},
      };

      act(() => {
        result.current.syncToUrl(state);
      });

      const calledUrl = mockPushState.mock.calls[0][2];
      expect(calledUrl).toContain('tab=details');
      expect(calledUrl).toContain('view=grid');
      expect(calledUrl).toContain('q=laptops');
    });

    it('removes params when state is cleared', () => {
      Object.defineProperty(window, 'location', {
        value: createMockLocation('?q=laptops&page=2'),
        writable: true,
      });

      const { result } = renderHook(() => useSearchUrlSync());

      const clearedState: Partial<SearchState> = {
        query: '',
        page: 1,
        perPage: 20,
        sortBy: '',
        disjunctiveFacets: {},
        numericFilters: {},
        dateFilters: {},
        selectiveFilters: {},
      };

      act(() => {
        result.current.syncToUrl(clearedState);
      });

      const calledUrl = mockPushState.mock.calls[0][2];
      expect(calledUrl).not.toContain('q=');
      expect(calledUrl).not.toContain('page=');
    });

    it('omits default values from URL', () => {
      const { result } = renderHook(() => useSearchUrlSync());

      const state: Partial<SearchState> = {
        query: 'laptops',
        page: 1, // default, should be omitted
        perPage: 20, // default, should be omitted
        sortBy: '',
        disjunctiveFacets: {},
        numericFilters: {},
        dateFilters: {},
        selectiveFilters: {},
      };

      act(() => {
        result.current.syncToUrl(state);
      });

      const calledUrl = mockPushState.mock.calls[0][2];
      expect(calledUrl).toContain('q=laptops');
      expect(calledUrl).not.toContain('page=');
      expect(calledUrl).not.toContain('perPage=');
    });
  });

  describe('popstate handling', () => {
    it('calls onUrlChange when popstate fires', () => {
      const onUrlChange = vi.fn();

      renderHook(() => useSearchUrlSync({ onUrlChange }));

      // Get the popstate handler that was registered
      const popstateHandler = mockAddEventListener.mock.calls.find(
        (call) => call[0] === 'popstate'
      )?.[1];

      expect(popstateHandler).toBeDefined();

      // Simulate popstate event
      Object.defineProperty(window, 'location', {
        value: createMockLocation('?q=new-search'),
        writable: true,
      });

      act(() => {
        popstateHandler(new PopStateEvent('popstate'));
      });

      expect(onUrlChange).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'new-search',
        })
      );
    });
  });

  describe('options', () => {
    it('uses custom param prefix', () => {
      Object.defineProperty(window, 'location', {
        value: createMockLocation('?search_q=laptops'),
        writable: true,
      });

      const { result } = renderHook(() =>
        useSearchUrlSync({ paramPrefix: 'search_' })
      );

      expect(result.current.initialState.query).toBe('laptops');
    });

    it('excludes specified fields from serialization', () => {
      const { result } = renderHook(() =>
        useSearchUrlSync({ excludeFields: ['page'] })
      );

      const state: Partial<SearchState> = {
        query: 'laptops',
        page: 5,
        perPage: 20,
        sortBy: '',
        disjunctiveFacets: {},
        numericFilters: {},
        dateFilters: {},
        selectiveFilters: {},
      };

      act(() => {
        result.current.syncToUrl(state);
      });

      const calledUrl = mockPushState.mock.calls[0][2];
      expect(calledUrl).toContain('q=laptops');
      expect(calledUrl).not.toContain('page=');
    });

    it('respects enabled flag', () => {
      const { result } = renderHook(() => useSearchUrlSync({ enabled: false }));

      const state: Partial<SearchState> = {
        query: 'laptops',
        page: 1,
        perPage: 20,
        sortBy: '',
        disjunctiveFacets: {},
        numericFilters: {},
        dateFilters: {},
        selectiveFilters: {},
      };

      act(() => {
        result.current.syncToUrl(state);
      });

      expect(mockPushState).not.toHaveBeenCalled();
      expect(mockReplaceState).not.toHaveBeenCalled();
    });
  });

  describe('debouncing', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('debounces URL updates', () => {
      const { result } = renderHook(() =>
        useSearchUrlSync({ debounceMs: 100 })
      );

      const state: Partial<SearchState> = {
        query: 'lap',
        page: 1,
        perPage: 20,
        sortBy: '',
        disjunctiveFacets: {},
        numericFilters: {},
        dateFilters: {},
        selectiveFilters: {},
      };

      act(() => {
        result.current.syncToUrl({ ...state, query: 'lap' });
        result.current.syncToUrl({ ...state, query: 'lapt' });
        result.current.syncToUrl({ ...state, query: 'lapto' });
        result.current.syncToUrl({ ...state, query: 'laptop' });
      });

      // Should not have called yet (still debouncing)
      expect(mockPushState).not.toHaveBeenCalled();

      // Advance timers
      act(() => {
        vi.advanceTimersByTime(100);
      });

      // Should have called once with final value
      expect(mockPushState).toHaveBeenCalledTimes(1);
      expect(mockPushState.mock.calls[0][2]).toContain('q=laptop');
    });
  });

  describe('clearUrl', () => {
    it('removes all search params from URL', () => {
      Object.defineProperty(window, 'location', {
        value: createMockLocation('?q=laptops&page=2&status=active'),
        writable: true,
      });

      const { result } = renderHook(() => useSearchUrlSync());

      act(() => {
        result.current.clearUrl();
      });

      expect(mockPushState).toHaveBeenCalled();
      const calledUrl = mockPushState.mock.calls[0][2];
      // Should be just pathname with no query params
      expect(calledUrl).toBe('/');
    });

    it('preserves specified params when clearing', () => {
      Object.defineProperty(window, 'location', {
        value: createMockLocation('?q=laptops&tab=details'),
        writable: true,
      });

      const { result } = renderHook(() =>
        useSearchUrlSync({ preserveParams: ['tab'] })
      );

      act(() => {
        result.current.clearUrl();
      });

      const calledUrl = mockPushState.mock.calls[0][2];
      expect(calledUrl).toContain('tab=details');
      expect(calledUrl).not.toContain('q=');
    });
  });
});
