/**
 * Tab helper utilities - Shared functions for tab operations
 */

import { TabData } from '@shared';

/**
 * Get the favicon URL for a tab, with fallback to extension icon
 */
export const getFaviconUrl = (tab: TabData): string => {
  // Use tab's favIconUrl if available, otherwise fallback to extension icon
  if (tab.favIconUrl && tab.favIconUrl.startsWith('http')) {
    return tab.favIconUrl;
  }
  return chrome.runtime.getURL('icons/icon16.png');
};

/**
 * Extract domain from URL
 */
export const getDomain = (url: string): string => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return url;
  }
};

/**
 * Truncate string to maximum length with ellipsis
 */
export const truncate = (str: string | undefined, maxLength: number): string => {
  if (!str) return '';
  return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
};
