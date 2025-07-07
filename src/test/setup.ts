/**
 * @fileoverview Test setup and global configuration for Vitest
 */

import { expect, afterEach, vi, beforeAll, afterAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import { mockSearchResponse, mockSchema } from './mockData';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Mock the TypesenseSearchClient before any imports
vi.mock('../core/TypesenseClient', () => {
  return {
    TypesenseSearchClient: vi.fn().mockImplementation(() => ({
      search: vi.fn().mockResolvedValue(mockSearchResponse),
      multiSearch: vi.fn().mockResolvedValue({ results: [mockSearchResponse] }),
      retrieveSchema: vi.fn().mockResolvedValue(mockSchema),
    })),
  };
});

// Cleanup after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
})) as any;

// Suppress console errors during tests (optional)
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});