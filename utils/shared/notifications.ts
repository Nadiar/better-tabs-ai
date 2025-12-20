/**
 * Notification System
 *
 * Event-based toast notification system that works across
 * React, vanilla JS, and any other interface.
 */

import type { Toast, ToastType } from './types';

/**
 * Notification event name
 * Listen for this event to handle notifications
 */
export const NOTIFICATION_EVENT = 'app-notification';

/**
 * Notification Manager
 * Dispatches toast notifications via CustomEvent
 *
 * @example
 * // In your UI component, listen for notifications:
 * window.addEventListener('app-notification', (event) => {
 *   const { message, type, duration } = event.detail;
 *   showToast(message, type, duration);
 * });
 *
 * // Then use NotificationManager anywhere:
 * NotificationManager.success('Operation completed!');
 */
export class NotificationManager {
  /**
   * Show a notification
   *
   * @param message Notification message
   * @param type Notification type (success, error, info, warning)
   * @param duration Duration in ms (default: 5000)
   */
  static show(message: string, type: ToastType = 'info', duration: number = 5000): void {
    const event = new CustomEvent<Toast>(NOTIFICATION_EVENT, {
      detail: { message, type, duration },
    });
    window.dispatchEvent(event);
  }

  /**
   * Show a success notification
   *
   * @param message Success message
   * @param duration Duration in ms
   */
  static success(message: string, duration?: number): void {
    this.show(message, 'success', duration);
  }

  /**
   * Show an error notification
   *
   * @param message Error message
   * @param duration Duration in ms (default: 7000 for errors)
   */
  static error(message: string, duration: number = 7000): void {
    this.show(message, 'error', duration);
  }

  /**
   * Show an info notification
   *
   * @param message Info message
   * @param duration Duration in ms
   */
  static info(message: string, duration?: number): void {
    this.show(message, 'info', duration);
  }

  /**
   * Show a warning notification
   *
   * @param message Warning message
   * @param duration Duration in ms (default: 6000)
   */
  static warning(message: string, duration: number = 6000): void {
    this.show(message, 'warning', duration);
  }

  /**
   * Subscribe to notifications
   *
   * @param handler Event handler function
   * @returns Cleanup function to remove listener
   * @example
   * const cleanup = NotificationManager.subscribe((toast) => {
   *   console.log(toast.message);
   * });
   * // Later: cleanup();
   */
  static subscribe(
    handler: (toast: Toast) => void
  ): () => void {
    const listener = (event: Event) => {
      const customEvent = event as CustomEvent<Toast>;
      handler(customEvent.detail);
    };

    window.addEventListener(NOTIFICATION_EVENT, listener);

    // Return cleanup function
    return () => {
      window.removeEventListener(NOTIFICATION_EVENT, listener);
    };
  }

  /**
   * Show notification from Result type
   * Automatically shows error or success based on result
   *
   * @param result Result object
   * @param successMessage Message to show on success
   * @example
   * const result = await ChromeAPI.createGroup([1,2,3], 'Work', 'blue');
   * NotificationManager.fromResult(result, 'Group created successfully');
   */
  static fromResult<T>(
    result: { success: boolean; data?: T; error?: { message: string } },
    successMessage?: string
  ): void {
    if (result.success) {
      if (successMessage) {
        this.success(successMessage);
      }
    } else {
      this.error(result.error?.message || 'Operation failed');
    }
  }
}

/**
 * Notification hook for React components
 * @example
 * // In React component:
 * useEffect(() => {
 *   const cleanup = NotificationManager.subscribe((toast) => {
 *     setToasts(prev => [...prev, toast]);
 *   });
 *   return cleanup;
 * }, []);
 */
export function useNotifications(handler: (toast: Toast) => void): void {
  if (typeof window !== 'undefined') {
    // Only works in browser environment
    const cleanup = NotificationManager.subscribe(handler);

    // If this is being called from useEffect, the cleanup will be handled by React
    // This is just TypeScript boilerplate
    return cleanup as unknown as void;
  }
}
