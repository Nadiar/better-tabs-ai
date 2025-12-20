/**
 * Topic Parser Utility
 *
 * Parses hierarchical topic taxonomies with confidence scores.
 * Each tab can have multiple taxonomies (e.g., product + platform + location).
 * Each taxonomy is a hierarchy from specific → general.
 */

export interface ParsedTopic {
  topic: string;
  confidence: number;
  hierarchy?: string[]; // Array of parent topics (specific → general)
  taxonomyIndex?: number; // Which taxonomy this belongs to (0-based)
}

/**
 * Parses hierarchical topic taxonomies with confidence scores.
 *
 * Format:
 * - Multiple taxonomies separated by " | "
 * - Each taxonomy: "specific:conf > general:conf > broader:conf"
 * - Legacy format: "topic:conf,topic:conf" (flat keywords)
 *
 * @param topicsString - Hierarchical taxonomy string
 * @returns Array of parsed topics with hierarchy information
 *
 * @example
 * TopicParser.parse("baby-ketten-klub:0.95 > karaoke-club:0.9 > karaoke:0.85 | portland:0.8 > oregon:0.6")
 * // Returns: [
 * //   { topic: "baby-ketten-klub", confidence: 0.95, hierarchy: ["karaoke-club", "karaoke"], taxonomyIndex: 0 },
 * //   { topic: "karaoke-club", confidence: 0.9, hierarchy: ["karaoke"], taxonomyIndex: 0 },
 * //   { topic: "karaoke", confidence: 0.85, hierarchy: [], taxonomyIndex: 0 },
 * //   { topic: "portland", confidence: 0.8, hierarchy: ["oregon"], taxonomyIndex: 1 },
 * //   { topic: "oregon", confidence: 0.6, hierarchy: [], taxonomyIndex: 1 }
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
   * Parse topics string - supports both hierarchical and legacy flat format
   */
  static parse(topicsString: string): ParsedTopic[] {
    if (!topicsString) return [];

    const normalized = topicsString.toLowerCase().trim();

    // Check if this is hierarchical format (contains > or |)
    if (normalized.includes('>') || normalized.includes('|')) {
      return this._parseHierarchical(normalized);
    }

    // Legacy flat format: "topic:conf,topic:conf"
    return this._parseLegacyFlat(normalized);
  }

  /**
   * Parse hierarchical taxonomy format
   * Example: "baby-ketten-klub:0.95 > karaoke:0.85 | portland:0.8 > oregon:0.6"
   */
  private static _parseHierarchical(topicsString: string): ParsedTopic[] {
    const allTopics: ParsedTopic[] = [];

    // Split by " | " to get separate taxonomies
    const taxonomies = topicsString.split('|').map(t => t.trim()).filter(t => t.length > 0);

    taxonomies.forEach((taxonomy, taxonomyIndex) => {
      // Split by " > " to get hierarchy levels (specific → general)
      const levels = taxonomy.split('>').map(l => l.trim()).filter(l => l.length > 0);

      // Parse each level as "topic:confidence"
      const parsedLevels = levels.map(level => {
        const [topic, confStr] = level.split(':');
        const confidence = parseFloat(confStr) || 0.5;
        return { topic: topic.trim(), confidence };
      });

      // Build hierarchy array for each level
      parsedLevels.forEach((level, index) => {
        // Hierarchy = all more general levels after this one
        const hierarchy = parsedLevels.slice(index + 1).map(l => l.topic);

        // Apply penalty system (less aggressive for hierarchical data)
        let adjustedConfidence = level.confidence;
        const normalizedTopic = this._normalizeTopic(level.topic);

        if (this.USELESS_WORDS.includes(normalizedTopic)) {
          adjustedConfidence = Math.min(adjustedConfidence, 0.2);
        } else if (this.BROAD_CATEGORIES.includes(normalizedTopic)) {
          // Only apply penalty if it's at the TOP of the hierarchy (most specific)
          // If it's deeper in hierarchy, it's supposed to be broad
          if (index === 0) {
            adjustedConfidence = adjustedConfidence * 0.5;
          }
        } else if (this.SOMEWHAT_GENERIC.includes(normalizedTopic)) {
          if (index === 0) {
            adjustedConfidence = adjustedConfidence * 0.7;
          }
        } else if (this.ACTIVITY_WORDS.includes(normalizedTopic)) {
          if (index === 0) {
            adjustedConfidence = adjustedConfidence * 0.85;
          }
        }

        if (adjustedConfidence > 0.15) {
          allTopics.push({
            topic: normalizedTopic,
            confidence: adjustedConfidence,
            hierarchy,
            taxonomyIndex
          });
        }
      });
    });

    return allTopics;
  }

  /**
   * Parse legacy flat format (backward compatibility)
   * Example: "github:0.9,better-tabs-ai:0.95"
   */
  private static _parseLegacyFlat(topicsString: string): ParsedTopic[] {
    const topics = topicsString
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
        return { topic: t, confidence: 0.5 };
      })
      .map(({ topic, confidence }) => {
        const normalizedTopic = this._normalizeTopic(topic);
        let adjustedConfidence = confidence;

        if (this.USELESS_WORDS.includes(normalizedTopic)) {
          adjustedConfidence = Math.min(adjustedConfidence, 0.2);
        } else if (this.BROAD_CATEGORIES.includes(normalizedTopic)) {
          adjustedConfidence = adjustedConfidence * 0.5;
        } else if (this.SOMEWHAT_GENERIC.includes(normalizedTopic)) {
          adjustedConfidence = adjustedConfidence * 0.7;
        } else if (this.ACTIVITY_WORDS.includes(normalizedTopic)) {
          adjustedConfidence = adjustedConfidence * 0.85;
        }

        return { topic: normalizedTopic, confidence: adjustedConfidence };
      })
      .filter(({ confidence }) => confidence > 0.15);

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
   * Normalize a topic string (remove TLDs, singular/plural, etc.)
   */
  private static _normalizeTopic(topic: string): string {
    let normalized = topic.replace(/\.(com|net|org|io|dev|ai)$/i, '');
    if (normalized.endsWith('s') && normalized.length > 3) {
      normalized = normalized.slice(0, -1);
    }
    return normalized;
  }

  /**
   * Get just the topic strings without confidence scores (legacy support)
   */
  static getTopicStrings(topicsString: string): string[] {
    return this.parse(topicsString).map(({ topic }) => topic);
  }
}
