/**
 * Shared TypeScript type definitions for Better Tabs AI
 *
 * These types are used across all interfaces (popup, full interface, options)
 * to ensure type safety and consistency.
 */

// ============================================================================
// Chrome API Types
// ============================================================================

/**
 * Tab data structure
 * Represents a browser tab with its properties
 */
export interface TabData {
  id: number;
  title: string;
  url: string;
  groupId?: number;
  favIconUrl?: string;
  active?: boolean;
  pinned?: boolean;
  index?: number;
  windowId?: number;
}

/**
 * Chrome tab group colors
 */
export type ChromeColor = 'grey' | 'blue' | 'red' | 'yellow' | 'green' | 'pink' | 'purple' | 'cyan';

/**
 * Tab group data structure
 */
export interface GroupData {
  id: number;
  title: string;
  color: ChromeColor;
  collapsed: boolean;
}

// ============================================================================
// AI Analysis Types
// ============================================================================

/**
 * AI-generated grouping suggestion
 */
export interface AISuggestion {
  groupName: string;
  tabIds: number[];
  confidence: number;
  color?: ChromeColor;
  reasoning?: string;
}

/**
 * Individual tab analysis result
 */
export interface TabAnalysis {
  tabId: number;
  category: string;
  confidence: number;
  keywords?: string[];
}

/**
 * Complete AI analysis result
 */
export interface AnalysisResult {
  success: boolean;
  suggestions: AISuggestion[];
  analyses: TabAnalysis[];
  error?: string;
}

/**
 * AI availability status
 */
export interface AIStatus {
  available: boolean;
  status: 'ready' | 'not_ready' | 'downloading' | 'error';
  error?: string;
  capabilities?: {
    analyze: boolean;
    generateNames: boolean;
  };
}

/**
 * Analysis progress tracking
 */
export interface AnalysisProgress {
  inProgress: boolean;
  current: number;
  total: number;
  status: 'idle' | 'analyzing' | 'complete' | 'error';
  message?: string;
}

// ============================================================================
// Settings Types
// ============================================================================

/**
 * User settings configuration
 */
export interface Settings {
  // AI Analysis
  minConfidenceThreshold: number;
  maxSuggestions: number;

  // UI Preferences
  showConfidenceScores: boolean;
  showInlineSuggestions: boolean;
  defaultGroupColor: ChromeColor;

  // Performance
  enableContentAnalysis: boolean;
  maxConcurrentAnalysis: number;
  cacheDuration?: number;
}

/**
 * Default settings values
 */
export const DEFAULT_SETTINGS: Settings = {
  minConfidenceThreshold: 0.5,
  maxSuggestions: 10,
  showConfidenceScores: true,
  showInlineSuggestions: true,
  defaultGroupColor: 'grey',
  enableContentAnalysis: true,
  maxConcurrentAnalysis: 10,
  cacheDuration: 60000,
};

// ============================================================================
// Chrome Runtime Message Types
// ============================================================================

/**
 * Message actions supported by the service worker
 */
export type MessageAction =
  | 'analyzeAllTabs'
  | 'checkAIAvailability'
  | 'clearCache'
  | 'getAnalysisProgress'
  | 'getSettings'
  | 'saveSettings'
  | 'resetSettings';

/**
 * Chrome runtime message structure
 */
export interface RuntimeMessage {
  action: MessageAction;
  [key: string]: any;
}

/**
 * Chrome runtime message response
 */
export interface RuntimeResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================================
// Staged State Types (for full interface)
// ============================================================================

/**
 * Staged changes for full interface
 * Tracks changes before applying them
 */
export interface StagedState {
  tabs: TabData[];
  groups: GroupData[];
}

/**
 * Operation types for undo/redo
 */
export type OperationType =
  | 'moveTab'
  | 'createGroup'
  | 'deleteGroup'
  | 'renameGroup'
  | 'changeGroupColor'
  | 'ungroupTabs';

/**
 * History entry for undo/redo
 */
export interface HistoryEntry {
  type: OperationType;
  state: StagedState;
  timestamp: number;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * API error response
 */
export interface APIError {
  message: string;
  code?: string;
  details?: any;
}

/**
 * Result type for operations that can fail
 * Go-style error handling
 */
export type Result<T, E = APIError> =
  | { success: true; data: T; error?: never }
  | { success: false; data?: never; error: E };

/**
 * Toast notification types
 */
export type ToastType = 'success' | 'error' | 'info' | 'warning';

/**
 * Toast notification
 */
export interface Toast {
  message: string;
  type: ToastType;
  duration?: number;
}
