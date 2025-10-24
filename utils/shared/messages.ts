/**
 * Type-Safe Message Definitions
 *
 * Provides type-safe interfaces for all chrome.runtime message passing
 * between service worker, popup, and full interface.
 */

/**
 * Base message interface
 */
interface BaseMessage {
  action: string;
}

/**
 * Base response interface
 */
interface BaseResponse {
  success?: boolean;
  error?: string;
}

/**
 * ============================================================================
 * REQUEST MESSAGES (sent TO service worker)
 * ============================================================================
 */

export interface CheckAIAvailabilityMessage extends BaseMessage {
  action: 'checkAIAvailability';
}

export interface AnalyzeAllTabsMessage extends BaseMessage {
  action: 'analyzeAllTabs';
  forceRefresh?: boolean;
}

export interface AnalyzeTabMessage extends BaseMessage {
  action: 'analyzeTab';
  tabId: number;
}

export interface SuggestGroupsMessage extends BaseMessage {
  action: 'suggestGroups';
  tabs: chrome.tabs.Tab[];
}

export interface CreateGroupsMessage extends BaseMessage {
  action: 'createGroups';
  groups: Array<{
    title: string;
    tabIds: number[];
  }>;
}

export interface FindDuplicatesMessage extends BaseMessage {
  action: 'findDuplicates';
}

export interface GenerateGroupNameMessage extends BaseMessage {
  action: 'generateGroupName';
  tabs: chrome.tabs.Tab[];
}

export interface ClearCacheMessage extends BaseMessage {
  action: 'clearCache';
}

export interface FindGroupForTabsMessage extends BaseMessage {
  action: 'findGroupForTabs';
  tabs: chrome.tabs.Tab[];
  groups: chrome.tabGroups.TabGroup[];
}

export interface GetAnalysisProgressMessage extends BaseMessage {
  action: 'getAnalysisProgress';
}

export interface GetLastAnalysisResultsMessage extends BaseMessage {
  action: 'getLastAnalysisResults';
}

export interface GetSettingsMessage extends BaseMessage {
  action: 'getSettings';
}

export interface GetDefaultPromptRulesMessage extends BaseMessage {
  action: 'getDefaultPromptRules';
}

export interface GetPromptUpdateStatusMessage extends BaseMessage {
  action: 'getPromptUpdateStatus';
}

export interface SaveSettingsMessage extends BaseMessage {
  action: 'saveSettings';
  settings: Record<string, any>;
}

export interface ResetSettingsMessage extends BaseMessage {
  action: 'resetSettings';
}

export interface GetCacheStatsMessage extends BaseMessage {
  action: 'getCacheStats';
}

export interface GetDebugInfoMessage extends BaseMessage {
  action: 'getDebugInfo';
}

/**
 * Union type of all possible request messages
 */
export type RequestMessage =
  | CheckAIAvailabilityMessage
  | AnalyzeAllTabsMessage
  | AnalyzeTabMessage
  | SuggestGroupsMessage
  | CreateGroupsMessage
  | FindDuplicatesMessage
  | GenerateGroupNameMessage
  | ClearCacheMessage
  | FindGroupForTabsMessage
  | GetAnalysisProgressMessage
  | GetLastAnalysisResultsMessage
  | GetSettingsMessage
  | GetDefaultPromptRulesMessage
  | GetPromptUpdateStatusMessage
  | SaveSettingsMessage
  | ResetSettingsMessage
  | GetCacheStatsMessage
  | GetDebugInfoMessage;

/**
 * ============================================================================
 * RESPONSE MESSAGES (sent FROM service worker)
 * ============================================================================
 */

export interface AIAvailabilityResponse extends BaseResponse {
  available: boolean;
  status: string;
  statusMessage: string;
  detailedStatus: string;
  action: string;
}

export interface AnalyzeAllTabsResponse extends BaseResponse {
  totalTabs: number;
  suggestions: Array<{
    title: string;
    tabs: number[];
    confidence: number;
  }>;
  existingGroups: chrome.tabGroups.TabGroup[];
  tabData?: Array<{
    id: number;
    title: string;
    url: string;
    domain: string;
    topics: string;
    parsedTopics: Array<{ topic: string; confidence: number }>;
  }>;
}

export interface TabAnalysisResponse extends BaseResponse {
  tabId: number;
  topics: string;
  confidence: number;
}

export interface CreateGroupsResponse extends BaseResponse {
  created: number;
  errors?: string[];
}

export interface FindDuplicatesResponse extends BaseResponse {
  duplicates: Array<{
    url: string;
    tabs: chrome.tabs.Tab[];
  }>;
}

export interface GenerateGroupNameResponse extends BaseResponse {
  name: string;
}

export interface ClearCacheResponse extends BaseResponse {
  success: true;
}

export interface FindGroupResponse extends BaseResponse {
  groupId?: number;
  confidence?: number;
}

export interface AnalysisProgressResponse extends BaseResponse {
  inProgress: boolean;
  progress: {
    current: number;
    total: number;
    status: string;
  };
}

export interface LastAnalysisResultsResponse extends BaseResponse {
  success: true;
  results: AnalyzeAllTabsResponse | null;
  timestamp: number | null;
}

export interface SettingsResponse extends BaseResponse {
  settings: Record<string, any>;
}

export interface DefaultPromptRulesResponse extends BaseResponse {
  success: true;
  defaultRules: string;
}

export interface PromptUpdateStatusResponse extends BaseResponse {
  success: true;
  updateAvailable: boolean;
  updateInfo: any;
  currentVersion: number;
  defaultRules: string;
}

export interface SaveSettingsResponse extends BaseResponse {
  success: true;
  settings: Record<string, any>;
}

export interface ResetSettingsResponse extends BaseResponse {
  success: true;
  settings: Record<string, any>;
}

export interface CacheStatsResponse extends BaseResponse {
  success: true;
  stats: {
    size: number;
    hits: number;
    misses: number;
    evictions: number;
    invalidations: number;
    hitRate: number;
  };
}

export interface DebugInfoResponse extends BaseResponse {
  success: true;
  aiConversationLog: Array<{
    timestamp: number;
    type: string;
    prompt?: string;
    response?: string;
    error?: string;
  }>;
  analysisResults: AnalyzeAllTabsResponse | null;
  analysisTimestamp: number | null;
  settings: Record<string, any>;
  cacheStats: CacheStatsResponse['stats'];
  aiStatus: {
    available: boolean;
    status: string;
  };
}

/**
 * ============================================================================
 * BROADCAST MESSAGES (sent FROM service worker to all listeners)
 * ============================================================================
 */

export interface AnalysisCompleteMessage extends BaseMessage {
  action: 'analysisComplete';
  results: AnalyzeAllTabsResponse;
}

/**
 * Union type of all possible broadcast messages
 */
export type BroadcastMessage = AnalysisCompleteMessage;

/**
 * ============================================================================
 * HELPER FUNCTIONS
 * ============================================================================
 */

/**
 * Send a message to the service worker and get typed response
 */
export async function sendMessage<T extends BaseResponse>(
  message: RequestMessage
): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response: T) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else if (response?.error) {
        reject(new Error(response.error));
      } else {
        resolve(response);
      }
    });
  });
}

/**
 * Listen for broadcast messages with type safety
 */
export function addBroadcastListener(
  callback: (message: BroadcastMessage) => void
): void {
  chrome.runtime.onMessage.addListener((message: BroadcastMessage) => {
    callback(message);
  });
}
