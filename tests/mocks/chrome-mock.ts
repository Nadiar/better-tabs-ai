/**
 * Chrome Extension API Mock for E2E Testing
 *
 * Provides a mock implementation of chrome.* APIs that return
 * predefined test data instead of requiring a real browser extension.
 */

import { mockTabs, mockGroups } from '../fixtures/tabs';
import { mockAIAnalysisSuccess, mockAIAvailability } from '../fixtures/ai-responses';

/**
 * Message handlers for chrome.runtime.sendMessage
 * Maps action names to mock responses
 */
const messageHandlers: Record<string, any> = {
  checkAIAvailability: mockAIAvailability,
  analyzeAllTabs: {
    success: true,
    data: {
      started: true,
      totalTabs: mockTabs.length,
    },
  },
  getAnalysisProgress: {
    inProgress: false,
    progress: {
      current: 0,
      total: 0,
      status: 'idle',
    },
  },
  getLastAnalysisResults: {
    success: true,
    results: mockAIAnalysisSuccess,
  },
  getCacheStats: {
    success: true,
    stats: {
      hits: 10,
      misses: 5,
      size: 15,
      maxSize: 100,
      hitRate: 0.67,
    },
  },
  clearCache: {
    success: true,
    message: 'Cache cleared',
  },
  getSettings: {
    settings: {
      minConfidenceThreshold: 0.5,
      minTabConfidence: 0.5,
      maxSuggestions: 10,
      showConfidenceScores: true,
      showInlineSuggestions: true,
      defaultGroupColor: 'grey',
      showAdvancedOptions: false,
    },
  },
};

/**
 * Chrome API mock object
 * Injects into global window.chrome for testing
 */
export const chromeMock = {
  runtime: {
    sendMessage: async (message: any, callback?: (response: any) => void) => {
      const response = messageHandlers[message.action] || { error: 'Unknown action' };

      // Handle both callback and promise styles
      if (callback) {
        callback(response);
        return undefined;
      }
      return Promise.resolve(response);
    },

    onMessage: {
      addListener: (callback: any) => {
        // Store listener for potential manual triggering in tests
        (chromeMock.runtime.onMessage as any)._listeners =
          (chromeMock.runtime.onMessage as any)._listeners || [];
        (chromeMock.runtime.onMessage as any)._listeners.push(callback);
      },
      removeListener: (callback: any) => {
        const listeners = (chromeMock.runtime.onMessage as any)._listeners || [];
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      },
    },

    getURL: (path: string) => {
      return `chrome-extension://mock-extension-id/${path}`;
    },

    getManifest: () => {
      return {
        version: '2.2.0',
        name: 'Better Tabs AI',
        manifest_version: 3,
      };
    },
  },

  tabs: {
    query: async (queryInfo: any) => {
      // Return all mock tabs by default
      return Promise.resolve(mockTabs);
    },

    get: async (tabId: number) => {
      const tab = mockTabs.find(t => t.id === tabId);
      return Promise.resolve(tab || null);
    },

    group: async (options: { groupId: number; tabIds: number[] }) => {
      return Promise.resolve(options.groupId);
    },

    ungroup: async (tabIds: number | number[]) => {
      return Promise.resolve();
    },

    remove: async (tabIds: number | number[]) => {
      return Promise.resolve();
    },

    // Event listeners
    onCreated: {
      addListener: (callback: any) => {},
      removeListener: (callback: any) => {},
    },
    onRemoved: {
      addListener: (callback: any) => {},
      removeListener: (callback: any) => {},
    },
    onUpdated: {
      addListener: (callback: any) => {},
      removeListener: (callback: any) => {},
    },
    onMoved: {
      addListener: (callback: any) => {},
      removeListener: (callback: any) => {},
    },
  },

  tabGroups: {
    TAB_GROUP_ID_NONE: -1,

    query: async (queryInfo: any) => {
      return Promise.resolve(mockGroups);
    },

    update: async (groupId: number, updateProperties: any) => {
      const group = mockGroups.find(g => g.id === groupId);
      return Promise.resolve({ ...group, ...updateProperties });
    },

    move: async (groupId: number, moveProperties: any) => {
      return Promise.resolve();
    },

    // Event listeners
    onCreated: {
      addListener: (callback: any) => {},
      removeListener: (callback: any) => {},
    },
    onRemoved: {
      addListener: (callback: any) => {},
      removeListener: (callback: any) => {},
    },
    onUpdated: {
      addListener: (callback: any) => {},
      removeListener: (callback: any) => {},
    },
    onMoved: {
      addListener: (callback: any) => {},
      removeListener: (callback: any) => {},
    },
  },

  storage: {
    local: {
      get: async (keys?: string | string[] | null) => {
        // Return empty object by default - tests can override
        return Promise.resolve({});
      },
      set: async (items: any) => {
        return Promise.resolve();
      },
      remove: async (keys: string | string[]) => {
        return Promise.resolve();
      },
    },

    sync: {
      get: async (keys?: string | string[] | null) => {
        return Promise.resolve({});
      },
      set: async (items: any) => {
        return Promise.resolve();
      },
      remove: async (keys: string | string[]) => {
        return Promise.resolve();
      },
    },
  },

  // Mock Gemini Nano API (chrome.aiOriginTrial)
  aiOriginTrial: {
    languageModel: {
      capabilities: async () => {
        return Promise.resolve({
          available: 'readily',
        });
      },

      create: async (options: any) => {
        return Promise.resolve({
          prompt: async (text: string) => {
            // Return a simple mock response
            return Promise.resolve('Mock AI response');
          },
          destroy: () => {},
        });
      },
    },
  },
};

/**
 * Inject Chrome mock into window object
 * Call this in beforeEach or test setup
 */
export function injectChromeMock() {
  (window as any).chrome = chromeMock;
}

/**
 * Clean up Chrome mock
 * Call this in afterEach or test teardown
 */
export function cleanupChromeMock() {
  delete (window as any).chrome;
}

/**
 * Override a specific message handler for a test
 * Useful for testing error cases or specific scenarios
 */
export function setMessageHandler(action: string, response: any) {
  messageHandlers[action] = response;
}

/**
 * Reset message handlers to defaults
 */
export function resetMessageHandlers() {
  // Clear any custom handlers added during tests
  Object.keys(messageHandlers).forEach(key => {
    if (!['checkAIAvailability', 'analyzeAllTabs', 'getAnalysisProgress',
         'getLastAnalysisResults', 'getCacheStats', 'clearCache', 'getSettings'].includes(key)) {
      delete messageHandlers[key];
    }
  });
}
