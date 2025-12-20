/**
 * Tab helper utilities - Shared functions for tab operations
 */

import { TabData } from '@shared';

/**
 * Get the favicon URL for a tab, with fallback to extension icon
 * Uses Google's favicon service to avoid certificate validation errors
 */
export const getFaviconUrl = (tab: TabData): string => {
  // Use Google's public favicon service which handles cert errors gracefully
  // This avoids ERR_CERT_AUTHORITY_INVALID errors in console
  if (tab.url && tab.url.startsWith('http')) {
    try {
      const url = new URL(tab.url);
      // Use Google's favicon service which proxies favicons and avoids cert errors
      return `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=16`;
    } catch {
      // If URL parsing fails, use fallback
    }
  }

  // For chrome:// URLs, extension pages, and missing favicons
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
