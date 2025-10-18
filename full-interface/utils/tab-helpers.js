/**
 * Tab helper utilities - Shared functions for tab operations
 */

/**
 * Get the favicon URL for a tab, with fallback to extension icon
 * @param {Object} tab - Tab object with favIconUrl property
 * @returns {string} - Favicon URL
 */
export const getFaviconUrl = (tab) => {
  // Use tab's favIconUrl if available, otherwise fallback to extension icon
  if (tab.favIconUrl && tab.favIconUrl.startsWith('http')) {
    return tab.favIconUrl;
  }
  return chrome.runtime.getURL('icons/icon16.png');
};

/**
 * Extract domain from URL
 * @param {string} url - Full URL
 * @returns {string} - Domain (hostname) or original URL if parsing fails
 */
export const getDomain = (url) => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return url;
  }
};

/**
 * Truncate string to maximum length with ellipsis
 * @param {string} str - String to truncate
 * @param {number} maxLength - Maximum length before truncation
 * @returns {string} - Truncated string with '...' if exceeded maxLength
 */
export const truncate = (str, maxLength) => {
  if (!str) return '';
  return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
};
