/**
 * MSW handlers for Chrome runtime message interception
 *
 * Since Chrome AI (Gemini Nano) runs in a private context that cannot be
 * controlled by Selenium or Playwright, we use MSW to mock the responses
 * from chrome.runtime.sendMessage() calls.
 *
 * This allows predictable E2E testing without relying on the actual AI model.
 */

import { http, HttpResponse } from 'msw';
import {
  mockAIAnalysisSuccess,
  mockAIAnalysisEmpty,
  mockAIAvailability,
  mockCacheCleared,
} from '../fixtures/ai-responses';

/**
 * Handler for analyzeAllTabs action
 * Returns mock AI analysis with suggestions
 */
export const analyzeAllTabsHandler = http.post(
  'chrome-extension://*/analyzeAllTabs',
  () => {
    return HttpResponse.json(mockAIAnalysisSuccess);
  }
);

/**
 * Handler for checkAIAvailability action
 * Returns mock AI availability status
 */
export const checkAIAvailabilityHandler = http.post(
  'chrome-extension://*/checkAIAvailability',
  () => {
    return HttpResponse.json(mockAIAvailability);
  }
);

/**
 * Handler for clearCache action
 * Returns success response
 */
export const clearCacheHandler = http.post(
  'chrome-extension://*/clearCache',
  () => {
    return HttpResponse.json(mockCacheCleared);
  }
);

/**
 * Handler for getAnalysisProgress action
 * Returns mock progress data
 */
export const getAnalysisProgressHandler = http.post(
  'chrome-extension://*/getAnalysisProgress',
  () => {
    return HttpResponse.json({
      inProgress: false,
      current: 0,
      total: 0,
      status: 'idle',
    });
  }
);

/**
 * Handler for getSettings action
 * Returns default settings
 */
export const getSettingsHandler = http.post(
  'chrome-extension://*/getSettings',
  () => {
    return HttpResponse.json({
      minConfidenceThreshold: 0.5,
      maxSuggestions: 10,
      showConfidenceScores: true,
      showInlineSuggestions: true,
      defaultGroupColor: 'grey',
      enableContentAnalysis: true,
      maxConcurrentAnalysis: 10,
    });
  }
);

/**
 * Handler for saveSettings action
 * Returns success response
 */
export const saveSettingsHandler = http.post(
  'chrome-extension://*/saveSettings',
  async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      success: true,
      settings: body,
    });
  }
);

/**
 * Handler for resetSettings action
 * Returns default settings
 */
export const resetSettingsHandler = http.post(
  'chrome-extension://*/resetSettings',
  () => {
    return HttpResponse.json({
      success: true,
      settings: {
        minConfidenceThreshold: 0.5,
        maxSuggestions: 10,
        showConfidenceScores: true,
        showInlineSuggestions: true,
        defaultGroupColor: 'grey',
        enableContentAnalysis: true,
        maxConcurrentAnalysis: 10,
      },
    });
  }
);

/**
 * All Chrome runtime message handlers
 * Export as array for MSW server setup
 */
export const chromeRuntimeHandlers = [
  analyzeAllTabsHandler,
  checkAIAvailabilityHandler,
  clearCacheHandler,
  getAnalysisProgressHandler,
  getSettingsHandler,
  saveSettingsHandler,
  resetSettingsHandler,
];
