/**
 * AI Operations Module
 *
 * Provides a unified interface for AI analysis operations.
 * Wraps chrome.runtime.sendMessage calls with proper typing.
 */

import type {
  AnalysisResult,
  AIStatus,
  AnalysisProgress,
  Result,
  APIError,
} from './types';

/**
 * AI Operations namespace
 * All AI-related operations go through these methods
 */
export const AIOperations = {
  /**
   * Analyze all tabs and get AI grouping suggestions
   *
   * @returns Analysis result with suggestions and individual tab analyses
   * @example
   * const result = await AIOperations.analyzeAllTabs();
   * if (result.success) {
   *   console.log('Suggestions:', result.data.suggestions);
   * }
   */
  async analyzeAllTabs(): Promise<Result<AnalysisResult>> {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'analyzeAllTabs',
      });

      if (response.success) {
        return { success: true, data: response };
      } else {
        return {
          success: false,
          error: {
            message: response.error || 'Analysis failed',
            code: 'ANALYSIS_FAILED',
          },
        };
      }
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'RUNTIME_ERROR',
          details: error,
        },
      };
    }
  },

  /**
   * Check if AI (Gemini Nano) is available
   *
   * @returns AI availability status
   * @example
   * const result = await AIOperations.checkAvailability();
   * if (result.success && result.data.available) {
   *   console.log('AI is ready');
   * }
   */
  async checkAvailability(): Promise<Result<AIStatus>> {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'checkAIAvailability',
      });

      return { success: true, data: response };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'AVAILABILITY_CHECK_FAILED',
          details: error,
        },
      };
    }
  },

  /**
   * Clear the analysis cache
   *
   * @returns Success status
   * @example
   * const result = await AIOperations.clearCache();
   * if (result.success) {
   *   console.log('Cache cleared');
   * }
   */
  async clearCache(): Promise<Result<{ success: boolean; message: string }>> {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'clearCache',
      });

      return { success: true, data: response };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'CACHE_CLEAR_FAILED',
          details: error,
        },
      };
    }
  },

  /**
   * Get current analysis progress
   *
   * @returns Analysis progress information
   * @example
   * const result = await AIOperations.getAnalysisProgress();
   * if (result.success) {
   *   console.log(`Progress: ${result.data.current}/${result.data.total}`);
   * }
   */
  async getAnalysisProgress(): Promise<Result<AnalysisProgress>> {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getAnalysisProgress',
      });

      return { success: true, data: response };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'PROGRESS_CHECK_FAILED',
          details: error,
        },
      };
    }
  },

  /**
   * Poll analysis progress with interval
   *
   * @param interval Polling interval in ms (default: 500ms)
   * @param onProgress Callback for progress updates
   * @returns Final analysis result when complete
   *
   * @example
   * const result = await AIOperations.pollAnalysisProgress(500, (progress) => {
   *   console.log(`Analyzing: ${progress.current}/${progress.total}`);
   * });
   */
  async pollAnalysisProgress(
    interval: number = 500,
    onProgress?: (progress: AnalysisProgress) => void
  ): Promise<Result<AnalysisResult>> {
    return new Promise((resolve) => {
      const pollInterval = setInterval(async () => {
        const progressResult = await this.getAnalysisProgress();

        if (!progressResult.success) {
          clearInterval(pollInterval);
          resolve({
            success: false,
            error: progressResult.error,
          });
          return;
        }

        const progress = progressResult.data;

        if (onProgress) {
          onProgress(progress);
        }

        if (progress.status === 'complete' || progress.status === 'error') {
          clearInterval(pollInterval);

          // Get final results
          const analysisResult = await this.analyzeAllTabs();
          resolve(analysisResult);
        }
      }, interval);
    });
  },
};
