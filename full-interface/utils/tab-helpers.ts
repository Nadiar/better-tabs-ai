/**
 * Tab helper utilities - Shared functions for tab operations
 */

import { TabData } from '@shared';

/**
 * Get the favicon URL for a tab, with fallback to extension icon
 * Uses Chrome's favicon service to avoid CORS issues
 */
export const getFaviconUrl = (tab: TabData): string => {
  // For chrome:// URLs and data URLs, use extension icon
  if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('data:') || tab.url.startsWith('about:')) {
    return chrome.runtime.getURL('icons/icon16.png');
  }

  // Use Chrome's built-in favicon service to avoid CORS issues
  // This service fetches favicons from the browser's cache
  try {
    const pageUrl = new URL(tab.url);
    return `chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(tab.url)}&size=16`;
  } catch {
    // If URL is invalid, use extension icon
    return chrome.runtime.getURL('icons/icon16.png');
  }
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
