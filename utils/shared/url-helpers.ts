/**
 * URL Helper Utilities
 *
 * Provides utility functions for extracting and parsing URL components
 * used throughout the extension for tab grouping and analysis.
 */

/**
 * Extract the domain/hostname from a URL
 *
 * @param url - Full URL string
 * @returns Hostname (e.g., "github.com") or empty string if invalid
 *
 * @example
 * URLHelpers.extractDomain("https://github.com/user/repo")
 * // Returns: "github.com"
 *
 * URLHelpers.extractDomain("chrome://extensions")
 * // Returns: "extensions"
 */
export class URLHelpers {
  static extractDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return '';
    }
  }

  /**
   * Extract the pathname from a URL
   *
   * @param url - Full URL string
   * @returns Pathname (e.g., "/user/repo") or empty string if invalid
   *
   * @example
   * URLHelpers.extractPath("https://github.com/user/repo")
   * // Returns: "/user/repo"
   *
   * URLHelpers.extractPath("https://example.com")
   * // Returns: "/"
   */
  static extractPath(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname;
    } catch {
      return '';
    }
  }
}
