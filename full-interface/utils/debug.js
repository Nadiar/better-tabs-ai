/**
 * Debug utility for conditional logging
 * Only logs in development mode to keep production builds clean
 */

const isDevelopment = process.env.NODE_ENV !== 'production';

/**
 * Conditional console.log - only logs in development
 * @param {...any} args - Arguments to log
 */
export const debug = (...args) => {
  if (isDevelopment) {
    console.log(...args);
  }
};

/**
 * Conditional console.warn - only warns in development
 * @param {...any} args - Arguments to warn
 */
export const debugWarn = (...args) => {
  if (isDevelopment) {
    console.warn(...args);
  }
};

/**
 * Conditional console.error - always logs errors
 * @param {...any} args - Arguments to error
 */
export const debugError = (...args) => {
  console.error(...args);
};

/**
 * Logs with a specific prefix for better filtering
 * @param {string} prefix - Prefix to add (e.g., '🔄 DRAG', '📊 ANALYSIS')
 * @param {...any} args - Arguments to log
 */
export const debugWithPrefix = (prefix, ...args) => {
  if (isDevelopment) {
    console.log(prefix, ...args);
  }
};
