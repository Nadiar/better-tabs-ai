// Summarizer Service - Chrome Built-in AI Summarizer API wrapper
// Handles session management, chunking, and batch processing

/**
 * Service for managing Chrome's built-in Summarizer API
 * Provides session lifecycle management, parallel processing via cloning,
 * and automatic chunking for large content
 */
class SummarizerService {
  constructor() {
    this.activeSessions = new Map();
    this.sessionIdCounter = 0;
    this.isAvailable = false;
    this.availability = 'no';

    // Configuration
    this.config = {
      chunkSize: 3000,        // ~750 tokens per chunk
      chunkOverlap: 200,      // Character overlap between chunks
      maxSessionAge: 5 * 60 * 1000,  // 5 minutes
      defaultType: 'key-points',
      defaultFormat: 'plain-text',
      defaultLength: 'short'
    };
  }

  /**
   * Check if Summarizer API is available
   * @returns {Promise<string>} 'readily-available', 'after-download', 'downloading', or 'no'
   */
  async checkAvailability() {
    try {
      if ('ai' in self && 'summarizer' in self.ai) {
        this.availability = await self.ai.summarizer.availability();
        this.isAvailable = this.availability === 'readily-available';
        console.log(`Summarizer API availability: ${this.availability}`);
        return this.availability;
      } else if ('Summarizer' in self) {
        // Fallback pattern
        this.availability = await Summarizer.availability();
        this.isAvailable = this.availability === 'readily-available';
        console.log(`Summarizer API availability: ${this.availability}`);
        return this.availability;
      }

      console.log('Summarizer API not found in global scope');
      this.availability = 'no';
      this.isAvailable = false;
      return 'no';
    } catch (error) {
      console.error('Error checking Summarizer availability:', error);
      this.availability = 'no';
      this.isAvailable = false;
      return 'no';
    }
  }

  /**
   * Create a new Summarizer session
   * @param {Object} options - Configuration options
   * @param {string} options.type - 'key-points', 'tldr', 'teaser', or 'headline'
   * @param {string} options.format - 'markdown' or 'plain-text'
   * @param {string} options.length - 'short', 'medium', or 'long'
   * @param {string} options.sharedContext - Additional context for summarization
   * @returns {Promise<{summarizer: Object, sessionId: string}>}
   */
  async createSummarizer(options = {}) {
    if (!this.isAvailable) {
      throw new Error('Summarizer API not available');
    }

    const config = {
      type: options.type || this.config.defaultType,
      format: options.format || this.config.defaultFormat,
      length: options.length || this.config.defaultLength,
      sharedContext: options.sharedContext || ''
    };

    try {
      let summarizer;

      if ('ai' in self && 'summarizer' in self.ai) {
        summarizer = await self.ai.summarizer.create({
          ...config,
          monitor(m) {
            m.addEventListener('downloadprogress', (e) => {
              console.log(`Summarizer model download: ${Math.round(e.loaded * 100)}%`);
            });
          }
        });
      } else if ('Summarizer' in self) {
        summarizer = await Summarizer.create({
          ...config,
          monitor(m) {
            m.addEventListener('downloadprogress', (e) => {
              console.log(`Summarizer model download: ${Math.round(e.loaded * 100)}%`);
            });
          }
        });
      } else {
        throw new Error('Summarizer API not found');
      }

      // Track session for lifecycle management
      const sessionId = `summarizer-${this.sessionIdCounter++}`;
      this.activeSessions.set(sessionId, {
        summarizer,
        created: Date.now(),
        options: config,
        parent: null
      });

      console.log(`✅ Created Summarizer session ${sessionId} (type: ${config.type}, length: ${config.length})`);
      return { summarizer, sessionId };
    } catch (error) {
      console.error('Failed to create Summarizer session:', error);
      throw error;
    }
  }

  /**
   * Summarize text with automatic quota checking
   * @param {Object} summarizer - Summarizer instance
   * @param {string} text - Text to summarize
   * @param {string} context - Optional additional context
   * @returns {Promise<string>} - Summary text
   */
  async summarize(summarizer, text, context = '') {
    try {
      // Check quota before processing
      if (summarizer.measureInputUsage) {
        const usage = await summarizer.measureInputUsage(text);
        const quota = summarizer.inputQuota || 4000;

        if (usage > quota) {
          console.warn(`Text exceeds quota: ${usage}/${quota} tokens - using chunking`);
          return await this.summarizeInChunks(summarizer, text, context);
        }

        console.log(`Input usage: ${usage}/${quota} tokens (${Math.round(usage/quota*100)}%)`);
      }

      // Summarize with context
      const summary = await summarizer.summarize(text, context ? { context } : undefined);
      return summary;
    } catch (error) {
      console.error('Summarization failed:', error);
      throw error;
    }
  }

  /**
   * Stream summarization results in real-time
   * @param {Object} summarizer - Summarizer instance
   * @param {string} text - Text to summarize
   * @yields {string} - Progressive summary chunks
   */
  async *summarizeStreaming(summarizer, text) {
    try {
      const stream = summarizer.summarizeStreaming(text);

      for await (const chunk of stream) {
        yield chunk;
      }
    } catch (error) {
      console.error('Streaming summarization failed:', error);
      throw error;
    }
  }

  /**
   * Clone session for parallel processing
   * Creates an independent copy that can be used concurrently
   * @param {string} sessionId - ID of session to clone
   * @param {AbortSignal} abortSignal - Optional abort signal for cleanup
   * @returns {Promise<{summarizer: Object, sessionId: string}>}
   */
  async cloneSession(sessionId, abortSignal = null) {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    try {
      const cloned = await session.summarizer.clone(
        abortSignal ? { signal: abortSignal } : undefined
      );

      const clonedId = `${sessionId}-clone-${Date.now()}`;
      this.activeSessions.set(clonedId, {
        summarizer: cloned,
        created: Date.now(),
        options: session.options,
        parent: sessionId
      });

      console.log(`📋 Cloned session ${sessionId} → ${clonedId}`);
      return { summarizer: cloned, sessionId: clonedId };
    } catch (error) {
      console.error(`Failed to clone session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Destroy session to free memory
   * Should be called when summarization is complete
   * @param {string} sessionId - Session ID to destroy
   */
  async destroySession(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      try {
        session.summarizer.destroy();
        this.activeSessions.delete(sessionId);
        console.log(`🗑️ Destroyed session ${sessionId}`);
      } catch (error) {
        console.error(`Error destroying session ${sessionId}:`, error);
      }
    }
  }

  /**
   * Clean up old sessions (older than maxSessionAge)
   * Call periodically to prevent memory leaks
   */
  async cleanupOldSessions() {
    const now = Date.now();
    const maxAge = this.config.maxSessionAge;
    let cleaned = 0;

    for (const [id, session] of this.activeSessions.entries()) {
      if (now - session.created > maxAge) {
        await this.destroySession(id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} old Summarizer sessions`);
    }
  }

  /**
   * Handle large content using recursive chunking
   * Based on: https://developer.chrome.com/docs/ai/scale-summarization
   *
   * Strategy:
   * 1. Split text into chunks at sentence boundaries
   * 2. Summarize each chunk independently
   * 3. Concatenate summaries
   * 4. If still too large, recursively summarize the summaries
   *
   * @param {Object} summarizer - Summarizer instance
   * @param {string} text - Text to summarize
   * @param {string} context - Optional context
   * @returns {Promise<string>} - Summary text
   */
  async summarizeInChunks(summarizer, text, context = '') {
    const chunks = this.splitText(text, this.config.chunkSize, this.config.chunkOverlap);

    console.log(`📄 Splitting large content into ${chunks.length} chunks`);

    // Summarize each chunk
    const summaries = [];
    for (let i = 0; i < chunks.length; i++) {
      console.log(`  Processing chunk ${i + 1}/${chunks.length}...`);
      const summary = await summarizer.summarize(
        chunks[i],
        context ? { context } : undefined
      );
      summaries.push(summary);
    }

    // Combine summaries
    const combined = summaries.join('\n\n');
    console.log(`  Combined summaries: ${combined.length} chars`);

    // Check if combined still exceeds quota
    if (summarizer.measureInputUsage) {
      const combinedUsage = await summarizer.measureInputUsage(combined);
      const quota = summarizer.inputQuota || 4000;

      if (combinedUsage > quota) {
        console.log(`  Recursive summarization needed (${combinedUsage}/${quota} tokens)`);
        return await this.summarizeInChunks(summarizer, combined, context + ' (summary of summaries)');
      }
    }

    // Final summary of summaries
    console.log(`  Creating final summary...`);
    return await summarizer.summarize(combined, {
      context: context ? `${context} (summary of summaries)` : 'summary of summaries'
    });
  }

  /**
   * Split text into chunks with overlap at sentence boundaries
   * @param {string} text - Text to split
   * @param {number} chunkSize - Maximum characters per chunk
   * @param {number} overlap - Character overlap between chunks
   * @returns {string[]} - Array of text chunks
   */
  splitText(text, chunkSize, overlap) {
    const chunks = [];
    let start = 0;

    while (start < text.length) {
      let end = Math.min(start + chunkSize, text.length);

      // Try to break at sentence boundary (period, question mark, exclamation)
      if (end < text.length) {
        const sentenceEndings = ['. ', '.\n', '? ', '?\n', '! ', '!\n'];
        let bestBreak = -1;

        for (const ending of sentenceEndings) {
          const pos = text.lastIndexOf(ending, end);
          if (pos > start && pos > bestBreak) {
            bestBreak = pos + ending.length;
          }
        }

        // Fallback to newline if no sentence ending found
        if (bestBreak === -1) {
          const newlinePos = text.lastIndexOf('\n', end);
          if (newlinePos > start) {
            bestBreak = newlinePos + 1;
          }
        }

        // Use the break point if found
        if (bestBreak > start) {
          end = bestBreak;
        }
      }

      chunks.push(text.substring(start, end));
      start = end - overlap;

      // Avoid creating tiny last chunk
      if (text.length - start < chunkSize / 2) {
        chunks.push(text.substring(start));
        break;
      }
    }

    return chunks;
  }

  /**
   * Batch process multiple texts with parallel sessions
   * Creates clones for each text and processes concurrently
   * @param {string[]} texts - Array of texts to summarize
   * @param {Object} options - Summarizer options
   * @returns {Promise<string[]>} - Array of summaries
   */
  async batchSummarize(texts, options = {}) {
    if (texts.length === 0) return [];

    // Create base session
    const { summarizer, sessionId } = await this.createSummarizer(options);

    // Create abort controllers for each clone
    const controllers = texts.map(() => new AbortController());

    try {
      // Clone session for each text
      const clones = await Promise.all(
        texts.map((_, i) => this.cloneSession(sessionId, controllers[i].signal))
      );

      // Process all texts in parallel
      const results = await Promise.all(
        texts.map((text, i) =>
          this.summarize(clones[i].summarizer, text)
        )
      );

      // Clean up all clones
      await Promise.all(
        clones.map(clone => this.destroySession(clone.sessionId))
      );

      console.log(`✅ Batch summarized ${texts.length} texts`);
      return results;
    } catch (error) {
      // Abort all ongoing operations
      controllers.forEach(c => c.abort());
      console.error('Batch summarization failed:', error);
      throw error;
    } finally {
      // Always destroy base session
      await this.destroySession(sessionId);
    }
  }

  /**
   * Get statistics about active sessions
   * @returns {Object} Session statistics
   */
  getStats() {
    const now = Date.now();
    const sessions = Array.from(this.activeSessions.values());

    return {
      totalSessions: this.activeSessions.size,
      baseSessions: sessions.filter(s => !s.parent).length,
      clonedSessions: sessions.filter(s => s.parent).length,
      oldestSessionAge: sessions.length > 0
        ? Math.max(...sessions.map(s => now - s.created))
        : 0,
      isAvailable: this.isAvailable,
      availability: this.availability
    };
  }
}

// Export for use in service worker (ES module)
export default SummarizerService;
export { SummarizerService };
