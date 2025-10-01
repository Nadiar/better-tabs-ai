// Cache Manager - LRU cache with configurable size and TTL
// Handles tab analysis caching with content-based invalidation

class CacheManager {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 100;
    this.defaultTTL = options.defaultTTL || 60000; // 1 minute default
    this.cache = new Map(); // key -> { value, timestamp, accessCount, contentHash }
    this.accessOrder = []; // LRU tracking
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      invalidations: 0
    };
  }

  /**
   * Generate a cache key from metadata
   * @param {Object} metadata - Tab metadata (url, title, etc.)
   * @param {Object} content - Optional content for hashing
   * @returns {string} Cache key
   */
  generateKey(metadata, content = null) {
    const baseKey = `${metadata.url}_${metadata.title}`;

    if (content && content.excerpt) {
      // Add content hash for change detection
      const contentHash = this._simpleHash(content.excerpt.substring(0, 200));
      return `${baseKey}_${contentHash}`;
    }

    return baseKey;
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @param {number} ttl - Optional TTL override in milliseconds
   * @returns {*} Cached value or null if not found/expired
   */
  get(key, ttl = null) {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    const age = Date.now() - entry.timestamp;
    const maxAge = ttl !== null ? ttl : this.defaultTTL;

    if (age > maxAge) {
      // Expired
      this.cache.delete(key);
      this._removeFromAccessOrder(key);
      this.stats.misses++;
      return null;
    }

    // Update access tracking
    entry.accessCount++;
    entry.lastAccess = Date.now();
    this._updateAccessOrder(key);
    this.stats.hits++;

    return entry.value;
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {Object} options - Optional metadata
   */
  set(key, value, options = {}) {
    // Check if we need to evict
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this._evictLRU();
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      lastAccess: Date.now(),
      accessCount: 0,
      contentHash: options.contentHash || null
    });

    this._updateAccessOrder(key);
  }

  /**
   * Invalidate a specific cache entry
   * @param {string} key - Cache key to invalidate
   */
  invalidate(key) {
    if (this.cache.delete(key)) {
      this._removeFromAccessOrder(key);
      this.stats.invalidations++;
      return true;
    }
    return false;
  }

  /**
   * Invalidate all cache entries matching a URL
   * @param {string} url - URL to match
   */
  invalidateByUrl(url) {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(url)) {
        this.cache.delete(key);
        this._removeFromAccessOrder(key);
        count++;
      }
    }
    this.stats.invalidations += count;
    return count;
  }

  /**
   * Clear all cache entries
   */
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    this.accessOrder = [];
    this.stats.invalidations += size;
  }

  /**
   * Get cache statistics
   * @returns {Object} Statistics object
   */
  getStats() {
    return {
      ...this.stats,
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      invalidations: 0
    };
  }

  /**
   * Private: Evict least recently used entry
   */
  _evictLRU() {
    if (this.accessOrder.length === 0) return;

    const lruKey = this.accessOrder.shift();
    this.cache.delete(lruKey);
    this.stats.evictions++;

    console.log(`Cache evicted LRU entry: ${lruKey}`);
  }

  /**
   * Private: Update access order for LRU tracking
   */
  _updateAccessOrder(key) {
    this._removeFromAccessOrder(key);
    this.accessOrder.push(key);
  }

  /**
   * Private: Remove key from access order
   */
  _removeFromAccessOrder(key) {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  /**
   * Private: Simple hash function for content
   */
  _simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get detailed cache information for debugging
   */
  getDebugInfo() {
    const entries = [];
    for (const [key, entry] of this.cache.entries()) {
      entries.push({
        key,
        age: Date.now() - entry.timestamp,
        accessCount: entry.accessCount,
        lastAccess: Date.now() - entry.lastAccess
      });
    }

    return {
      stats: this.getStats(),
      entries: entries.sort((a, b) => b.accessCount - a.accessCount),
      accessOrder: this.accessOrder
    };
  }
}

// Export for use in service worker
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CacheManager;
}