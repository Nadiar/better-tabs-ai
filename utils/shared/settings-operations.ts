/**
 * Settings Operations Module
 *
 * Provides a unified interface for settings management.
 * Wraps chrome.runtime.sendMessage calls for settings operations.
 */

import type { Settings, DEFAULT_SETTINGS, Result, APIError } from './types';

/**
 * Settings Operations namespace
 * All settings-related operations go through these methods
 */
export const SettingsOperations = {
  /**
   * Get current settings
   *
   * @returns Current user settings
   * @example
   * const result = await SettingsOperations.get();
   * if (result.success) {
   *   console.log('Settings:', result.data);
   * }
   */
  async get(): Promise<Result<Settings>> {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getSettings',
      });

      return { success: true, data: response.settings };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to get settings',
          code: 'GET_SETTINGS_FAILED',
          details: error,
        },
      };
    }
  },

  /**
   * Save settings
   *
   * @param settings Settings to save
   * @returns Saved settings
   * @example
   * const result = await SettingsOperations.save({
   *   minConfidenceThreshold: 0.7,
   *   maxSuggestions: 15
   * });
   */
  async save(settings: Partial<Settings>): Promise<Result<Settings>> {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'saveSettings',
        settings,
      });

      if (response.success) {
        return { success: true, data: response.settings };
      } else {
        return {
          success: false,
          error: {
            message: response.error || 'Failed to save settings',
            code: 'SAVE_SETTINGS_FAILED',
          },
        };
      }
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to save settings',
          code: 'SAVE_SETTINGS_ERROR',
          details: error,
        },
      };
    }
  },

  /**
   * Reset settings to defaults
   *
   * @returns Default settings
   * @example
   * const result = await SettingsOperations.reset();
   * if (result.success) {
   *   console.log('Settings reset to defaults');
   * }
   */
  async reset(): Promise<Result<Settings>> {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'resetSettings',
      });

      if (response.success) {
        return { success: true, data: response.settings };
      } else {
        return {
          success: false,
          error: {
            message: response.error || 'Failed to reset settings',
            code: 'RESET_SETTINGS_FAILED',
          },
        };
      }
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to reset settings',
          code: 'RESET_SETTINGS_ERROR',
          details: error,
        },
      };
    }
  },

  /**
   * Update specific setting
   *
   * @param key Setting key
   * @param value Setting value
   * @returns Updated settings
   * @example
   * const result = await SettingsOperations.update('minConfidenceThreshold', 0.6);
   */
  async update<K extends keyof Settings>(
    key: K,
    value: Settings[K]
  ): Promise<Result<Settings>> {
    try {
      const currentResult = await this.get();
      if (!currentResult.success) {
        return currentResult;
      }

      const updatedSettings = {
        ...currentResult.data,
        [key]: value,
      };

      return await this.save(updatedSettings);
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to update setting',
          code: 'UPDATE_SETTING_ERROR',
          details: error,
        },
      };
    }
  },

  /**
   * Get a specific setting value
   *
   * @param key Setting key
   * @param defaultValue Fallback value if setting doesn't exist
   * @returns Setting value
   * @example
   * const threshold = await SettingsOperations.getValue('minConfidenceThreshold', 0.5);
   */
  async getValue<K extends keyof Settings>(
    key: K,
    defaultValue: Settings[K]
  ): Promise<Settings[K]> {
    try {
      const result = await this.get();
      if (result.success) {
        return result.data[key] ?? defaultValue;
      }
      return defaultValue;
    } catch {
      return defaultValue;
    }
  },
};
