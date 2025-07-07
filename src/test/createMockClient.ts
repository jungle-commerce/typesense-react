/**
 * @fileoverview Create mock Typesense client for tests
 */

import { vi } from 'vitest';
import { mockSearchResponse, mockSchema } from './mockData';

export function createMockClient() {
  const mockClient = {
    collections: vi.fn((collectionName: string) => ({
      documents: vi.fn(() => ({
        search: vi.fn().mockResolvedValue(mockSearchResponse),
      })),
      retrieve: vi.fn().mockResolvedValue(mockSchema),
    })),
    multiSearch: {
      perform: vi.fn().mockResolvedValue({ results: [mockSearchResponse] }),
    },
  };

  return mockClient;
}