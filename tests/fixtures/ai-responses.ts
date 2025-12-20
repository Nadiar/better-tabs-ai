/**
 * Mock AI analysis responses
 * These replace actual Gemini Nano responses for testing
 */

export const mockAIAnalysisSuccess = {
  success: true,
  suggestions: [
    {
      groupName: 'Shopping',
      tabIds: [1, 2, 5], // Amazon, eBay, Home Depot
      confidence: 0.85,
      color: 'blue',
    },
    {
      groupName: 'Development Tools',
      tabIds: [3, 4, 6], // GitHub, Stack Overflow, VS Code
      confidence: 0.92,
      color: 'green',
    },
  ],
  analyses: [
    { tabId: 1, category: 'Shopping', confidence: 0.8 },
    { tabId: 2, category: 'Shopping', confidence: 0.9 },
    { tabId: 3, category: 'Development', confidence: 0.95 },
    { tabId: 4, category: 'Development', confidence: 0.88 },
    { tabId: 5, category: 'Shopping', confidence: 0.7 },
    { tabId: 6, category: 'Development', confidence: 0.93 },
  ],
};

export const mockAIAnalysisEmpty = {
  success: true,
  suggestions: [],
  analyses: [],
};

export const mockAIAnalysisError = {
  success: false,
  error: 'AI model not available',
  suggestions: [],
  analyses: [],
};

export const mockAIAvailability = {
  available: true,
  status: 'ready',
  capabilities: {
    analyze: true,
    generateNames: true,
  },
};

export const mockAIUnavailable = {
  available: false,
  status: 'not_ready',
  error: 'Gemini Nano not installed',
  capabilities: {
    analyze: false,
    generateNames: false,
  },
};

export const mockCacheCleared = {
  success: true,
  message: 'Cache cleared successfully',
};
