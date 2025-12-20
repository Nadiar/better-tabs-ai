/**
 * Application Constants
 *
 * Centralized location for all magic numbers and configuration values
 * used throughout the Better Tabs AI extension.
 */

/**
 * Cache Configuration
 */
export const CACHE = {
  /** Maximum number of cached AI responses (LRU eviction) */
  MAX_SIZE: 100,
  /** Cache age display divisor (convert ms to seconds) */
  AGE_DISPLAY_DIVISOR: 1000,
} as const;

/**
 * AI Model Configuration
 */
export const AI = {
  /** Maximum tokens per Gemini Nano prompt (both input AND output combined) */
  MAX_TOKENS: 1000,
  /** Temperature for AI responses (0.0-1.0, higher = more creative) */
  TEMPERATURE: 0.7,
} as const;

/**
 * Token Estimation for Batching
 */
export const TOKENS = {
  /** Estimated tokens per tab in input prompt */
  PER_TAB_INPUT: 15,
  /** Estimated tokens per tab in JSON output */
  PER_TAB_OUTPUT: 40,
  /** Overhead for prompt rules and instructions */
  PROMPT_OVERHEAD_BASE: 150,
  /** Overhead for JSON array structure in output */
  OUTPUT_OVERHEAD: 50,
} as const;

/**
 * Grouping Configuration
 */
export const GROUPING = {
  /** AI aggressiveness (0.5 aggressive - 0.9 conservative) */
  AI_AGGRESSIVENESS: 0.6,
  /** Minimum group confidence to show suggestion */
  MIN_CONFIDENCE_THRESHOLD: 0.5,
  /** Minimum per-tab confidence to include in group */
  MIN_TAB_CONFIDENCE: 0.5,
  /** Minimum weighted topic overlap required for hybrid grouping */
  MIN_TOPIC_OVERLAP: 0.5,
  /** Minimum confidence for programmatic group matching */
  PROGRAMMATIC_MATCH_THRESHOLD: 0.6,
  /** Skip tabs where all topics are below this confidence */
  SKIP_TAB_THRESHOLD: 0.3,
} as const;

/**
 * Topic Confidence Adjustments
 */
export const TOPIC_CONFIDENCE = {
  /** Default confidence when no score provided */
  DEFAULT: 0.5,
  /** Cap for useless generic words (tier 1) */
  USELESS_CAP: 0.2,
  /** Penalty multiplier for broad categories (tier 2) */
  BROAD_PENALTY: 0.5,
  /** Penalty multiplier for somewhat generic terms (tier 3) */
  GENERIC_PENALTY: 0.7,
  /** Penalty multiplier for activity/action words (tier 4) */
  ACTIVITY_PENALTY: 0.85,
  /** Filter out topics below this confidence */
  MIN_THRESHOLD: 0.15,
} as const;

/**
 * Programmatic Grouping Scores
 */
export const SCORE_WEIGHTS = {
  /** Bonus for exact domain match */
  DOMAIN_MATCH: 0.2,
  /** Bonus for category title match */
  CATEGORY_MATCH: 0.8,
  /** Partial category word match weight */
  CATEGORY_PARTIAL: 0.5,
  /** Bonus for exact title match */
  TITLE_MATCH: 0.7,
  /** Keyword match weight */
  KEYWORD_MATCH: 0.4,
  /** Fallback confidence for new groups */
  FALLBACK: 0.3,
} as const;

/**
 * Tab Content Validation
 */
export const TAB_CONTENT = {
  /** Maximum text length for topic extraction filters */
  MAX_TEXT_LENGTH: 100,
} as const;

/**
 * Scoring and Ranking
 */
export const SCORING = {
  /** Base score multiplier per tab in group */
  TAB_COUNT_BONUS: 0.1,
  /** Default tab confidence when not specified */
  DEFAULT_TAB_CONFIDENCE: 0.7,
  /** Default group confidence when not specified */
  DEFAULT_GROUP_CONFIDENCE: 0.7,
  /** Score display precision (percentage multiplier) */
  PERCENTAGE_MULTIPLIER: 100,
} as const;

/**
 * Default AI Grouping Examples (for prompts)
 */
export const GROUPING_EXAMPLES = {
  HIGH_SPECIFIC: "github:0.9,better-tabs-ai:0.95",
  MEDIUM_SPECIFIC: "reddit:0.8,politics:0.9",
  LOW_SPECIFIC: "discord:0.7,social:0.3",
  GENERIC: "localhost:0.4,development:0.3",
  VERY_SPECIFIC: "karaoke:0.95,portland:0.8",
} as const;
