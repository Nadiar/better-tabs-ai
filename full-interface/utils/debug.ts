/**
 * Debug utility for conditional logging
 * Only logs in development mode to keep production builds clean
 */

const isDevelopment = process.env.NODE_ENV !== 'production';

/**
 * Conditional console.log - only logs in development
 * @param args - Arguments to log
 */
export const debug = (...args: any[]): void => {
  if (isDevelopment) {
    console.log(...args);
  }
};

/**
 * Conditional console.warn - only warns in development
 * @param args - Arguments to warn
 */
export const debugWarn = (...args: any[]): void => {
  if (isDevelopment) {
    console.warn(...args);
  }
};

/**
 * Conditional console.error - always logs errors
 * @param args - Arguments to error
 */
export const debugError = (...args: any[]): void => {
  console.error(...args);
};

/**
 * Logs with a specific prefix for better filtering
 * @param prefix - Prefix to add (e.g., '🔄 DRAG', '📊 ANALYSIS')
 * @param args - Arguments to log
 */
export const debugWithPrefix = (prefix: string, ...args: any[]): void => {
  if (isDevelopment) {
    console.log(prefix, ...args);
  }
};
