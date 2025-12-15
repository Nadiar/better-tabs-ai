import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock Chrome API globally
global.chrome = {
  runtime: {
    getURL: vi.fn((path: string) => `chrome-extension://mock-id/${path}`),
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn()
    }
  },
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn()
    },
    onChanged: {
      addListener: vi.fn(),
      removeListener: vi.fn()
    }
  },
  tabs: {
    query: vi.fn(),
    get: vi.fn(),
    update: vi.fn(),
    group: vi.fn(),
    ungroup: vi.fn()
  },
  tabGroups: {
    query: vi.fn(),
    update: vi.fn(),
    TAB_GROUP_ID_NONE: -1
  }
} as any;
