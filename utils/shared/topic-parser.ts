/**
 * Topic Parser Utility
 *
 * Parses topic strings with confidence scores and applies weighted penalty system
 * to penalize generic/broad categories while preserving specific topic relevance.
 */

export interface ParsedTopic {
  topic: string;
  confidence: number;
}

/**
 * Parses a comma-separated topic string with confidence scores.
 *
 * Supports formats:
 * - "topic:0.9,another:0.8" (with confidence)
 * - "topic,another" (defaults to 0.5 confidence)
 *
 * Applies tiered penalty system:
 * - Tier 1: Useless words (capped at 0.2) - "page", "site", "web"
 * - Tier 2: Broad categories (×0.5) - "shopping", "social-media", "news"
 * - Tier 3: Somewhat generic (×0.7) - "home", "account", "development"
 * - Tier 4: Activity words (×0.85) - "login", "search", "browse"
 * - Specific topics keep full confidence - "github", "better-tabs-ai"
 *
 * @param topicsString - Comma-separated topic string
 * @returns Array of parsed topics with adjusted confidence scores
 *
 * @example
 * TopicParser.parse("github:0.9,shopping:0.8,login:0.7")
 * // Returns: [
 * //   { topic: "github", confidence: 0.9 },      // Specific - no penalty
 * //   { topic: "shopping", confidence: 0.4 },    // Broad - 50% penalty
 * //   { topic: "login", confidence: 0.595 }      // Activity - 15% penalty
 * // ]
 */
export class TopicParser {
  private static readonly USELESS_WORDS = [
    'page', 'site', 'web', 'main', 'index', 'content'
  ];

  private static readonly BROAD_CATEGORIES = [
    'shopping', 'retail', 'store', 'food', 'restaurant',
    'social-media', 'social', 'news', 'media', 'video',
    'gaming', 'entertainment', 'music', 'movie',
    'sport', 'finance', 'business', 'technology',
    'education', 'learning', 'health', 'medical'
  ];

  private static readonly SOMEWHAT_GENERIC = [
    'home', 'account', 'profile', 'setting',
    'development', 'testing', 'local', 'api',
    'documentation', 'doc', 'guide', 'tutorial',
    'tool', 'utility', 'service', 'platform'
  ];

  private static readonly ACTIVITY_WORDS = [
    'login', 'signup', 'order', 'checkout', 'payment',
    'search', 'browse', 'watch', 'read', 'play',
    'download', 'upload', 'share', 'save'
  ];

  /**
   * Parse topics string with confidence scores and apply penalty system
   */
  static parse(topicsString: string): ParsedTopic[] {
    if (!topicsString) return [];

    const topics = topicsString
      .toLowerCase()
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0)
      .map(t => {
        // Parse "topic:confidence" format
        if (t.includes(':')) {
          const [topic, confStr] = t.split(':');
          const confidence = parseFloat(confStr) || 0.5;
          return { topic: topic.trim(), confidence };
        }
        // Legacy format without confidence - assume medium confidence
        return { topic: t, confidence: 0.5 };
      })
      .map(({ topic, confidence }) => {
        // Normalize topic (create new variable, don't mutate)
        let normalizedTopic = topic.replace(/\.(com|net|org|io|dev|ai)$/i, '');
        if (normalizedTopic.endsWith('s') && normalizedTopic.length > 3) {
          normalizedTopic = normalizedTopic.slice(0, -1);
        }

        // Apply category penalty system - broader categories get progressively lower weights
        // Even if AI says "shopping:0.9", it's still a broad category, not a specific topic
        let adjustedConfidence = confidence;

        if (this.USELESS_WORDS.includes(normalizedTopic)) {
          adjustedConfidence = Math.min(adjustedConfidence, 0.2); // Cap at very low
        } else if (this.BROAD_CATEGORIES.includes(normalizedTopic)) {
          adjustedConfidence = adjustedConfidence * 0.5; // 50% penalty for broad categories
        } else if (this.SOMEWHAT_GENERIC.includes(normalizedTopic)) {
          adjustedConfidence = adjustedConfidence * 0.7; // 30% penalty for generic terms
        } else if (this.ACTIVITY_WORDS.includes(normalizedTopic)) {
          adjustedConfidence = adjustedConfidence * 0.85; // 15% penalty for actions
        }
        // Specific topics (github, better-tabs-ai, baby-ketten-klub, etc.) keep full confidence!

        return { topic: normalizedTopic, confidence: adjustedConfidence };
      })
      .filter(({ confidence }) => confidence > 0.15); // Remove only truly useless topics

    // Remove duplicates, keeping highest confidence
    const topicMap = new Map<string, number>();
    topics.forEach(({ topic, confidence }) => {
      if (!topicMap.has(topic) || topicMap.get(topic)! < confidence) {
        topicMap.set(topic, confidence);
      }
    });

    return Array.from(topicMap, ([topic, confidence]) => ({ topic, confidence }));
  }

  /**
   * Get just the topic strings without confidence scores (legacy support)
   */
  static getTopicStrings(topicsString: string): string[] {
    return this.parse(topicsString).map(({ topic }) => topic);
  }
}
