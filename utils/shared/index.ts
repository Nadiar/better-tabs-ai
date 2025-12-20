/**
 * Shared Utilities Index
 *
 * Central export point for all shared utilities.
 * Import from here to use shared functionality across all interfaces.
 *
 * @example
 * // Import everything
 * import { AIOperations, ChromeAPI, NotificationManager } from '@shared';
 *
 * // Or import specific items
 * import { AIOperations } from '@shared/ai-operations';
 */

// Export all types
export * from './types';

// Export all operations
export { AIOperations } from './ai-operations';
export { ChromeAPI } from './chrome-api';
export { SettingsOperations } from './settings-operations';
export { NotificationManager, NOTIFICATION_EVENT, useNotifications } from './notifications';
