// Better Tabs AI - Service Worker
// Handles AI processing and tab management

// Import shared utilities
import { JSONParser } from '../dist/utils/shared/json-parser.js';
import { TopicParser } from '../dist/utils/shared/topic-parser.js';
import { URLHelpers } from '../dist/utils/shared/url-helpers.js';
import * as CONSTANTS from '../dist/utils/shared/constants.js';

// Note: SummarizerService is loaded dynamically when needed
// We can't use importScripts() with ES modules, so we'll import it inline when needed

// AI Status enum and error messages
const AIStatus = {
  READY: 'ready',
  DOWNLOADING: 'downloading',
  DOWNLOAD_REQUIRED: 'download-required',
  FLAGS_DISABLED: 'flags-disabled',
  GPU_UNAVAILABLE: 'gpu-unavailable',
  STORAGE_FULL: 'storage-full',
  UNSUPPORTED_BROWSER: 'unsupported-browser',
  UNKNOWN_ERROR: 'unknown-error',
  // Summarizer-specific states
  SUMMARIZER_READY: 'summarizer-ready',
  SUMMARIZER_DOWNLOADING: 'summarizer-downloading',
  SUMMARIZER_DOWNLOAD_REQUIRED: 'summarizer-download-required',
  SUMMARIZER_UNAVAILABLE: 'summarizer-unavailable'
};

const AIStatusMessages = {
  [AIStatus.READY]: {
    short: 'AI Ready',
    detail: 'Gemini Nano is ready to use',
    action: null
  },
  [AIStatus.DOWNLOADING]: {
    short: 'Downloading AI Model',
    detail: 'Gemini Nano model is being downloaded. This may take several minutes.',
    action: 'Check progress at chrome://on-device-internals'
  },
  [AIStatus.DOWNLOAD_REQUIRED]: {
    short: 'Download Required',
    detail: 'Gemini Nano model needs to be downloaded (approximately 22GB)',
    action: 'Visit chrome://on-device-internals to download'
  },
  [AIStatus.FLAGS_DISABLED]: {
    short: 'Chrome Flags Disabled',
    detail: 'Prompt API for Gemini Nano is not enabled in Chrome flags',
    action: 'Enable at chrome://flags/#prompt-api-for-gemini-nano'
  },
  [AIStatus.GPU_UNAVAILABLE]: {
    short: 'GPU Not Available',
    detail: 'Gemini Nano requires at least 4GB GPU memory',
    action: 'Check system requirements'
  },
  [AIStatus.STORAGE_FULL]: {
    short: 'Insufficient Storage',
    detail: 'Need at least 22GB free storage for Gemini Nano model',
    action: 'Free up disk space'
  },
  [AIStatus.UNSUPPORTED_BROWSER]: {
    short: 'Unsupported Browser',
    detail: 'Requires Chrome 118+ with AI features',
    action: 'Update Chrome to latest version'
  },
  [AIStatus.UNKNOWN_ERROR]: {
    short: 'Unknown Error',
    detail: 'Unable to determine AI availability',
    action: 'Check console for details'
  },
  [AIStatus.SUMMARIZER_READY]: {
    short: 'Summarizer Ready',
    detail: 'Chrome Summarizer API is ready to use',
    action: null
  },
  [AIStatus.SUMMARIZER_DOWNLOADING]: {
    short: 'Summarizer Downloading',
    detail: 'Summarizer model is being downloaded',
    action: 'Check progress at chrome://on-device-internals'
  },
  [AIStatus.SUMMARIZER_DOWNLOAD_REQUIRED]: {
    short: 'Summarizer Download Required',
    detail: 'Summarizer model needs to be downloaded',
    action: 'Visit chrome://on-device-internals to download'
  },
  [AIStatus.SUMMARIZER_UNAVAILABLE]: {
    short: 'Summarizer Unavailable',
    detail: 'Chrome Summarizer API is not available (requires Chrome 138+)',
    action: 'Update Chrome or enable Summarization API flag'
  }
};

// CacheManager - LRU cache for tab summaries
class CacheManager {
  constructor(options = {}) {
    this.maxSize = options.maxSize || CONSTANTS.CACHE.MAX_SIZE;
    this.cache = new Map();
    this.accessOrder = [];
    this.stats = { hits: 0, misses: 0, evictions: 0, invalidations: 0 };
  }

  generateKey(metadata, version = PROMPT_VERSION) {
    // Include version to invalidate cache when prompt changes
    return `v${version}_${metadata.url}_${metadata.title}`;
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    entry.accessCount++;
    entry.lastAccess = Date.now();
    this._updateAccessOrder(key);
    this.stats.hits++;
    return entry.value;
  }

  set(key, value) {
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this._evictLRU();
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      lastAccess: Date.now(),
      accessCount: 0
    });

    this._updateAccessOrder(key);

    // Persist cache asynchronously (don't await to avoid blocking)
    this.saveCache().catch(err => console.error('Cache save failed:', err));
  }

  invalidate(key) {
    if (this.cache.delete(key)) {
      this._removeFromAccessOrder(key);
      this.stats.invalidations++;
      return true;
    }
    return false;
  }

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

  clear() {
    const size = this.cache.size;
    this.cache.clear();
    this.accessOrder = [];
    this.stats.invalidations += size;

    // Persist cleared cache state asynchronously
    this.saveCache().catch(err => console.error('Cache save failed:', err));
  }

  getStats() {
    return {
      ...this.stats,
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0
    };
  }

  /**
   * Save cache to chrome.storage.local for persistence across service worker restarts
   */
  async saveCache() {
    try {
      const cacheData = {
        entries: Array.from(this.cache.entries()),
        accessOrder: this.accessOrder,
        stats: this.stats,
        timestamp: Date.now()
      };
      await chrome.storage.local.set({ summaryCacheData: cacheData });
      console.log(`💾 Saved ${this.cache.size} cache entries to storage`);
    } catch (error) {
      console.error('Failed to save cache:', error);
    }
  }

  /**
   * Load cache from chrome.storage.local
   */
  async loadCache() {
    try {
      const { summaryCacheData } = await chrome.storage.local.get('summaryCacheData');
      if (!summaryCacheData) {
        console.log('📭 No cached data found in storage');
        return;
      }

      const age = Date.now() - summaryCacheData.timestamp;
      const ageHours = age / (1000 * 60 * 60);

      // Skip cache if older than 24 hours
      if (ageHours > 24) {
        console.log(`⏰ Cache too old (${ageHours.toFixed(1)} hours), skipping restore`);
        await chrome.storage.local.remove('summaryCacheData');
        return;
      }

      this.cache = new Map(summaryCacheData.entries);
      this.accessOrder = summaryCacheData.accessOrder || [];
      this.stats = summaryCacheData.stats || { hits: 0, misses: 0, evictions: 0, invalidations: 0 };

      console.log(`✅ Restored ${this.cache.size} cache entries from storage (age: ${ageHours.toFixed(1)} hours)`);
    } catch (error) {
      console.error('Failed to load cache:', error);
    }
  }

  _evictLRU() {
    if (this.accessOrder.length === 0) return;
    const lruKey = this.accessOrder.shift();
    this.cache.delete(lruKey);
    this.stats.evictions++;
  }

  _updateAccessOrder(key) {
    this._removeFromAccessOrder(key);
    this.accessOrder.push(key);
  }

  _removeFromAccessOrder(key) {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }
}

// Default Settings (Phase E)
const PROMPT_VERSION = 10; // Increment when updating DEFAULT_AI_PROMPT_RULES or topic extraction format

const DEFAULT_AI_PROMPT_RULES = `CRITICAL GROUPING RULES:

1. **SPECIFIC TOPICS ONLY** - NO generic categories
   ❌ BAD: "Software Development" (too broad)
   ✅ GOOD: "GitHub better-tabs-ai Project" (specific repo)
   ❌ BAD: "Social Media" (5 different platforms)
   ✅ GOOD: "Reddit r/politics Discussion" (specific subreddit)

2. **EXACT SAME ACTIVITY** - Not just same website
   ❌ BAD: All Reddit tabs together (different subreddits = different topics)
   ✅ GOOD: Multiple tabs from r/woodworking (same community)
   ❌ BAD: All Google tabs together (Search, Maps, Sheets are different)
   ✅ GOOD: Multiple Google Sheets about same project

3. **FOCUS ON TOPIC MATCHING**:
   - ALL tabs must share the EXACT SAME specific topic
   - Users configure minimum tab count (typically 2-3)
   - Users configure confidence thresholds via settings
   - If in doubt about topic match, DON'T GROUP IT

4. **WHEN TO SKIP**:
   - Mixed topics from same domain = skip
   - Generic category name = you're doing it wrong
   - Tabs about different specific things = skip

5. **GOOD GROUP EXAMPLES**:
   ✅ "Baby Ketten Klub Karaoke" = multiple tabs all about this specific venue
   ✅ "ComicRack Metadata" = multiple tabs about ComicInfo.xml format
   ✅ "Woodworking Track Saw Projects" = multiple tabs about track saw techniques

6. **BAD GROUP EXAMPLES** (DO NOT CREATE THESE):
   ❌ "Home & DIY" = mixing woodworking + gardening + home repair
   ❌ "Development Tools" = mixing GitHub + VSCode + Kubernetes
   ❌ "Online Services" = mixing different websites
   ❌ Any group where tabs are about different specific things

**GROUPING PHILOSOPHY**: Focus on identifying tabs with the EXACT SAME specific topic. The algorithm handles confidence thresholds, minimum tab counts, and match scoring based on user preferences in settings. Your job is topic identification, not filtering.`;


const DEFAULT_SETTINGS = {
  // AI Analysis Settings
  aiAggressiveness: 0.6,           // 0.5 (aggressive) - 0.9 (conservative)
  minConfidenceThreshold: 0.5,     // Minimum group confidence to show suggestion
  minTabConfidence: 0.5,           // Minimum per-tab confidence to include in group
  correlationMode: 'similar',      // 'exact' | 'similar' | 'loose'
  maxSuggestions: 10,              // Maximum suggestions to show
  minTabsForSuggestion: 3,         // Minimum tabs needed to suggest a group (changed from 2 to 3)
  customAIPromptRules: DEFAULT_AI_PROMPT_RULES, // Customizable AI prompt rules
  promptVersion: PROMPT_VERSION,   // Track which version of prompt is in use
  promptCustomized: false,         // Whether user has customized the prompt

  // UI Preferences
  showConfidenceScores: true,      // Show percentage in UI
  showInlineSuggestions: true,     // Show suggestions in full interface
  autoCollapseGroups: false,       // Auto-collapse after creation
  defaultGroupColor: 'grey',       // Default color for new groups

  // Performance
  cacheDuration: 60000,            // Cache duration in ms
  enableContentAnalysis: true,     // Analyze tab content (slower but more accurate)
  maxConcurrentAnalysis: 10        // Max tabs to analyze at once
};

class BetterTabsAI {
  constructor() {
    this.session = null;
    this.sessionCreated = false;
    this.isAIAvailable = false;
    this.aiStatus = AIStatus.UNKNOWN_ERROR;
    this.summaryCache = new CacheManager({ maxSize: 200 }); // Cache for tab summaries
    this.settings = { ...DEFAULT_SETTINGS }; // Initialize with defaults
    this.analysisInProgress = false;
    this.analysisProgress = { current: 0, total: 0, status: 'idle' };
    this.aiConversationLog = []; // Track all AI prompts/responses for debugging

    // Summarizer Service integration (will be loaded dynamically)
    this.summarizerService = null;
    this.isSummarizerAvailable = false;
    this.summarizerStatus = AIStatus.SUMMARIZER_UNAVAILABLE;

    this.init();
  }

  async init() {
    console.log('Better Tabs AI: Initializing...');
    await this.loadSettings(); // Load user settings from storage
    await this.summaryCache.loadCache(); // Load persisted cache from storage
    await this.checkAIAvailability();
    this.setupEventListeners();

    // Try to create session on startup if AI is available
    if (this.isAIAvailable) {
      try {
        await this.createAISession();
        console.log('✅ AI session created on startup');
      } catch (error) {
        console.log('Failed to create AI session on startup:', error);
      }
    }

    // Start periodic session cleanup (every 5 minutes)
    if (this.isSummarizerAvailable) {
      setInterval(() => {
        this.summarizerService.cleanupOldSessions();
      }, 5 * 60 * 1000);
    }
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get('betterTabsSettings');
      if (result.betterTabsSettings) {
        const saved = result.betterTabsSettings;
        this.settings = { ...DEFAULT_SETTINGS, ...saved };

        // Check for prompt version mismatch (prompt update available)
        // Treat missing promptVersion as version 1
        const currentPromptVersion = saved.promptVersion || 1;
        const isCustomized = saved.promptCustomized === true;

        if (currentPromptVersion < PROMPT_VERSION) {
          console.log(`🆕 Prompt update available (v${currentPromptVersion} → v${PROMPT_VERSION})`);

          // If user has NOT customized the prompt, auto-update to new default
          if (!isCustomized) {
            console.log('⬆️ Auto-updating to new default prompt (user has not customized)');
            this.settings.customAIPromptRules = DEFAULT_AI_PROMPT_RULES;
            this.settings.promptVersion = PROMPT_VERSION;
            this.settings.promptCustomized = false;
            await this.saveSettings(this.settings);
          } else {
            // User has customized - store update availability for UI notification
            console.log('⚠️ Prompt update available but user has customizations');
            await chrome.storage.local.set({
              promptUpdateAvailable: {
                oldVersion: currentPromptVersion,
                newVersion: PROMPT_VERSION,
                timestamp: Date.now()
              }
            });
          }
        }

        console.log('📋 Loaded settings:', this.settings);
      } else {
        console.log('📋 Using default settings');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      this.settings = { ...DEFAULT_SETTINGS };
    }
  }

  async saveSettings(newSettings) {
    try {
      this.settings = { ...this.settings, ...newSettings };
      await chrome.storage.sync.set({ betterTabsSettings: this.settings });
      console.log('💾 Saved settings:', this.settings);
      return { success: true, settings: this.settings };
    } catch (error) {
      console.error('Error saving settings:', error);
      return { success: false, error: error.message };
    }
  }

  async checkAIAvailability() {
    try {
      // Check Summarizer API availability directly
      // Note: Can't use dynamic import() in service workers, so check API directly
      let summarizerAvailability = 'no';
      try {
        if ('ai' in self && 'summarizer' in self.ai) {
          summarizerAvailability = await self.ai.summarizer.availability();
          console.log('Found ai.summarizer API, availability:', summarizerAvailability);
        } else if ('Summarizer' in self) {
          summarizerAvailability = await Summarizer.availability();
          console.log('Found Summarizer API, availability:', summarizerAvailability);
        }
      } catch (error) {
        console.warn('Error checking Summarizer API:', error);
      }
      if (summarizerAvailability === 'readily-available') {
        this.isSummarizerAvailable = true;
        this.summarizerStatus = AIStatus.SUMMARIZER_READY;
        console.log('✅ Summarizer API is ready to use');
      } else if (summarizerAvailability === 'after-download') {
        this.summarizerStatus = AIStatus.SUMMARIZER_DOWNLOAD_REQUIRED;
        console.log('🟡 Summarizer API needs download');
      } else if (summarizerAvailability === 'downloading') {
        this.summarizerStatus = AIStatus.SUMMARIZER_DOWNLOADING;
        console.log('⏳ Summarizer API is downloading');
      } else {
        this.summarizerStatus = AIStatus.SUMMARIZER_UNAVAILABLE;
        console.log('❌ Summarizer API not available');
      }

      // Check for Chrome's built-in LanguageModel API
      if (typeof self.ai !== 'undefined' && self.ai.languageModel) {
        console.log('Found ai.languageModel API');
        try {
          const availability = await self.ai.languageModel.availability();
          console.log('AI Availability:', availability);

          if (availability === 'readily-available') {
            this.isAIAvailable = true;
            this.aiStatus = AIStatus.READY;
            console.log('✅ Gemini Nano is ready to use');
          } else if (availability === 'after-download') {
            this.isAIAvailable = false;
            this.aiStatus = AIStatus.DOWNLOAD_REQUIRED;
            console.log('🟡 Gemini Nano needs to be downloaded');
          } else if (availability === 'downloading') {
            this.isAIAvailable = false;
            this.aiStatus = AIStatus.DOWNLOADING;
            console.log('⏳ Gemini Nano is downloading');
          } else {
            this.isAIAvailable = false;
            this.aiStatus = AIStatus.UNKNOWN_ERROR;
            console.log('❌ Gemini Nano not available:', availability);
          }
        } catch (error) {
          console.log('Error checking ai.languageModel availability:', error);
          this.isAIAvailable = false;
          this._interpretError(error);
        }
      } else if (typeof LanguageModel !== 'undefined') {
        console.log('Found LanguageModel API');
        try {
          const availability = await LanguageModel.availability();
          console.log('AI Availability:', availability);

          if (availability === 'available') {
            this.isAIAvailable = true;
            this.aiStatus = AIStatus.READY;
            console.log('✅ Gemini Nano is ready to use');
          } else if (availability === 'downloadable') {
            this.isAIAvailable = false;
            this.aiStatus = AIStatus.DOWNLOAD_REQUIRED;
            console.log('🟡 Gemini Nano needs download');
          } else if (availability === 'downloading') {
            this.isAIAvailable = false;
            this.aiStatus = AIStatus.DOWNLOADING;
            console.log('⏳ Gemini Nano is downloading');
          } else {
            this.isAIAvailable = false;
            this.aiStatus = AIStatus.UNKNOWN_ERROR;
            console.log('❌ Gemini Nano not available:', availability);
          }
        } catch (error) {
          console.log('Error checking LanguageModel availability:', error);
          this.isAIAvailable = false;
          this._interpretError(error);
        }
      } else {
        console.log('❌ No AI APIs found');
        console.log('Available globals:', Object.keys(self).filter(k => k.toLowerCase().includes('ai') || k.toLowerCase().includes('language')));
        this.isAIAvailable = false;
        this.aiStatus = AIStatus.FLAGS_DISABLED;
      }
    } catch (error) {
      console.error('Error checking AI availability:', error);
      this.isAIAvailable = false;
      this._interpretError(error);
    }
  }

  _interpretError(error) {
    const errorMsg = error.message?.toLowerCase() || '';

    if (errorMsg.includes('gpu') || errorMsg.includes('graphics')) {
      this.aiStatus = AIStatus.GPU_UNAVAILABLE;
    } else if (errorMsg.includes('storage') || errorMsg.includes('disk') || errorMsg.includes('space')) {
      this.aiStatus = AIStatus.STORAGE_FULL;
    } else if (errorMsg.includes('flag') || errorMsg.includes('disabled')) {
      this.aiStatus = AIStatus.FLAGS_DISABLED;
    } else if (errorMsg.includes('version') || errorMsg.includes('browser')) {
      this.aiStatus = AIStatus.UNSUPPORTED_BROWSER;
    } else {
      this.aiStatus = AIStatus.UNKNOWN_ERROR;
    }
  }

  setupEventListeners() {
    // Listen for messages from popup/content scripts
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open for async responses
    });

    // Removed: Tab update/removal cache invalidation - no longer needed with hash-based caching
  }

  async handleMessage(message, sender, sendResponse) {
    try {
      switch (message.action) {
        case 'checkAIAvailability':
          await this.checkAIAvailability();
          const statusInfo = AIStatusMessages[this.aiStatus];
          sendResponse({
            available: this.isAIAvailable,
            status: this.aiStatus,
            statusMessage: statusInfo.short,
            detailedStatus: statusInfo.detail,
            action: statusInfo.action
          });
          break;

        case 'analyzeAllTabs':
          const result = await this.analyzeAllTabs(message.forceRefresh || false);
          sendResponse(result);
          break;

        case 'analyzeTab':
          const tabAnalysis = await this.analyzeTab(message.tabId);
          sendResponse(tabAnalysis);
          break;

        case 'suggestGroups':
          const suggestions = await this.suggestGroups(message.tabs);
          sendResponse(suggestions);
          break;

        case 'createGroups':
          const created = await this.createGroups(message.groups);
          sendResponse(created);
          break;

        case 'findDuplicates':
          const duplicates = await this.findDuplicateTabs();
          sendResponse(duplicates);
          break;

        case 'generateGroupName':
          const groupName = await this.generateGroupName(message.tabs);
          sendResponse(groupName);
          break;

        case 'clearCache':
          // Only clear summary cache (tab topic extraction cache)
          // Don't clear analysis results - user can click Analyze to force refresh
          this.summaryCache.clear();
          console.log('🧹 Summary cache cleared (topic extraction will be regenerated)');
          sendResponse({ success: true });
          break;

        case 'findGroupForTabs':
          const findResult = await this.findGroupForTabs(message.tabs, message.groups);
          sendResponse(findResult);
          break;

        case 'getAnalysisProgress':
          sendResponse({
            inProgress: this.analysisInProgress,
            progress: this.analysisProgress
          });
          break;

        case 'getLastAnalysisResults':
          const stored = await chrome.storage.local.get(['lastAnalysisResults', 'lastAnalysisTime']);
          sendResponse({
            success: true,
            results: stored.lastAnalysisResults || null,
            timestamp: stored.lastAnalysisTime || null
          });
          break;

        case 'getSettings':
          sendResponse({ settings: this.settings });
          break;

        case 'getDefaultPromptRules':
          sendResponse({ success: true, defaultRules: DEFAULT_AI_PROMPT_RULES });
          break;

        case 'getPromptUpdateStatus':
          const promptUpdate = await chrome.storage.local.get('promptUpdateAvailable');
          sendResponse({
            success: true,
            updateAvailable: !!promptUpdate.promptUpdateAvailable,
            updateInfo: promptUpdate.promptUpdateAvailable || null,
            currentVersion: PROMPT_VERSION,
            defaultRules: DEFAULT_AI_PROMPT_RULES
          });
          break;

        case 'saveSettings':
          const saveResult = await this.saveSettings(message.settings);
          sendResponse(saveResult);
          break;

        case 'resetSettings':
          this.settings = { ...DEFAULT_SETTINGS };
          await chrome.storage.sync.remove('betterTabsSettings');
          sendResponse({ success: true, settings: this.settings });
          break;

        case 'getCacheStats':
          sendResponse({ success: true, stats: this.summaryCache.getStats() });
          break;

        case 'getDebugInfo':
          const debugStoredData = await chrome.storage.local.get(['lastAnalysisResults', 'lastAnalysisTime']);
          sendResponse({
            success: true,
            aiConversationLog: this.aiConversationLog || [],
            analysisResults: debugStoredData.lastAnalysisResults || null,
            analysisTimestamp: debugStoredData.lastAnalysisTime || null,
            settings: this.settings,
            cacheStats: this.summaryCache.getStats(),
            aiStatus: {
              available: this.isAIAvailable,
              status: this.aiStatus
            }
          });
          break;

        default:
          sendResponse({ error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ error: error.message });
    }
  }

  async createAISession() {
    try {
      // For Chrome extensions, we need to check LanguageModel API availability
      // This should work in the service worker context
      
      let aiAPI = null;
      let availability = null;
      
      // Try different API patterns
      if (typeof self.ai !== 'undefined' && self.ai.languageModel) {
        aiAPI = self.ai.languageModel;
        availability = await aiAPI.availability();
      } else if (typeof LanguageModel !== 'undefined') {
        aiAPI = LanguageModel;
        availability = await aiAPI.availability();
      } else {
        throw new Error('No AI API found. Check Chrome flags and restart Chrome.');
      }
      
      console.log('AI Availability check result:', availability);
      
      if (availability === 'readily-available' || availability === 'available') {
        // Try to create a session with proper language specification
        this.aiSession = await aiAPI.create({
          systemPrompt: `You are a helpful assistant that categorizes and organizes web browser tabs based on their content.
          Your job is to:
          1. Analyze tab titles, URLs, and content to understand what each tab is about
          2. Suggest logical groupings based on topics, themes, or purposes
          3. Provide concise, clear category names for groups
          4. Be consistent in your categorization approach

          Always respond with valid JSON when requested.`,
          temperature: 0.7,
          topK: 3,
          expectedInputs: [{ type: "text", languages: ["en"] }],
          expectedOutputs: [{ type: "text", languages: ["en"] }]
        });
        
        this.isAIAvailable = true;
        console.log('✅ AI session created successfully');
        return true;
      } else if (availability === 'after-download' || availability === 'downloadable' || availability === 'downloading') {
        console.log('🟡 AI model needs to be downloaded first');
        // Try to trigger download by creating session
        try {
          this.aiSession = await aiAPI.create({
            expectedInputs: [{ type: "text", languages: ["en"] }],
            expectedOutputs: [{ type: "text", languages: ["en"] }]
          });
          this.isAIAvailable = true;
          console.log('✅ AI session created, download triggered');
          return true;
        } catch (downloadError) {
          console.log('❌ Failed to trigger download:', downloadError);
          throw new Error(`AI model needs download. Status: ${availability}`);
        }
      } else {
        throw new Error(`AI not available. Status: ${availability}. Check system requirements.`);
      }
    } catch (error) {
      console.error('Failed to create AI session:', error);
      this.isAIAvailable = false;
      this.aiSession = null;
      throw error;
    }
  }

  async promptAI(prompt, context = 'unknown') {
    // Wrapper to log all AI conversations for debugging
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      context,
      prompt: prompt.substring(0, 500) + (prompt.length > 500 ? '...' : ''), // Truncate long prompts
      fullPrompt: prompt, // Keep full for debug export
      response: null,
      error: null
    };

    try {
      const response = await this.aiSession.prompt(prompt);
      logEntry.response = response;
      this.aiConversationLog.push(logEntry);

      // Keep only last 50 entries to avoid memory issues
      if (this.aiConversationLog.length > 50) {
        this.aiConversationLog = this.aiConversationLog.slice(-50);
      }

      return response;
    } catch (error) {
      logEntry.error = error.message;
      this.aiConversationLog.push(logEntry);
      throw error;
    }
  }

  async generateTabSummary(tab) {
    // Generate a concise, context-rich summary for a tab
    // Uses Summarizer API if available, falls back to Prompt API
    // This is cached and used to reduce token usage in grouping prompts
    const metadata = {
      title: tab.title || '',
      url: tab.url || '',
      domain: this.extractDomain(tab.url),
      path: this.extractPath(tab.url)
    };

    // Check cache first
    const cacheKey = this.summaryCache.generateKey(metadata);
    const cached = this.summaryCache.get(cacheKey);
    if (cached) {
      console.log('✅ Summary cache hit:', metadata.title);
      return cached;
    }

    console.log('❌ Summary cache miss, generating:', metadata.title);

    // Try to extract page content using content script (already injected via manifest)
    let pageContent = null;
    try {
      // Send message to content script to extract metadata + basic content
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'extractContent',
        stage: 'basic' // Get metadata + headings + excerpt
      });

      if (response?.success && response?.content) {
        const extracted = response.content;
        // Transform content script format to expected format
        pageContent = {
          description: extracted.metadata?.description || '',
          keywords: extracted.metadata?.keywords || '',
          ogType: extracted.metadata?.type || '',
          headings: extracted.content?.headings?.map(h => h.text).slice(0, 5) || [],
          excerpt: extracted.content?.excerpt || '',
          text: extracted.content?.text || '' // Full text for Summarizer API
        };
      }

      // Log what we extracted
      if (pageContent && !pageContent.error) {
        console.log(`📄 Content extracted for "${metadata.title}":`, {
          hasDescription: !!pageContent.description,
          descriptionLength: pageContent.description?.length || 0,
          hasKeywords: !!pageContent.keywords,
          keywordsLength: pageContent.keywords?.length || 0,
          ogType: pageContent.ogType || 'none',
          headingCount: pageContent.headings?.length || 0,
          excerptLength: pageContent.excerpt?.length || 0,
          textLength: pageContent.text?.length || 0
        });
      }
    } catch (error) {
      // Content script not available (chrome://, discarded tabs, etc.)
      // This is expected and fine - we'll just use title + domain
    }

    // Note: Summarizer API integration commented out because dynamic import()
    // is not supported in service workers. Future: Consider using Summarizer API
    // directly without the wrapper class, or use a different architecture.
    //
    // For now, using Prompt API for all tab summarization.

    try {
      if (!this.aiSession) {
        await this.createAISession();
      }

      // Build prompt with available context
      let promptParts = [`Title: "${metadata.title}"`];

      // Add domain and path
      if (metadata.path && metadata.path.length > 1 && metadata.path.length < 50) {
        promptParts.push(`URL: ${metadata.domain}${metadata.path}`);
      } else {
        promptParts.push(`Domain: ${metadata.domain}`);
      }

      // Add metadata if available (budget ~600 chars total for metadata+content)
      if (pageContent) {
        // Keywords are VERY valuable - prioritize them
        if (pageContent.keywords) {
          promptParts.push(`Keywords: ${pageContent.keywords.substring(0, 100)}`);
        }
        if (pageContent.description) {
          promptParts.push(`Description: ${pageContent.description.substring(0, 150)}`);
        }
        if (pageContent.ogType) {
          promptParts.push(`Type: ${pageContent.ogType}`);
        }
        if (pageContent.headings && pageContent.headings.length > 0) {
          promptParts.push(`Headings: ${pageContent.headings.slice(0, 3).join(', ')}`);
        }
        if (pageContent.excerpt) {
          // Only include excerpt if we have token budget (~200 chars)
          promptParts.push(`Content excerpt: ${pageContent.excerpt.substring(0, 200)}`);
        }
      }

      const prompt = `Extract EXACTLY 6 topics for this page (count: 1, 2, 3, 4, 5, 6), from most specific to most general.

${promptParts.join('\n')}

CRITICAL RULES:
1. Extract EXACTLY 6 topics (not 4, not 5 - must be 6)
2. Extract topics from the Title and Domain (analyze what the page is about)
3. Use actual content keywords (NOT generic terms like "online", "platform", "service", "website")
4. Avoid generic terms: technology, software, internet, web, digital, platform, service, site

Required format (6 topics with these exact scores):
"topic1:0.95 > topic2:0.88 > topic3:0.80 > topic4:0.70 > topic5:0.58 > topic6:0.45"

Good examples (6 topics each, extracted from title/domain):
"traefik-kubernetes:0.95 > traefik:0.88 > reverse-proxy:0.80 > networking:0.70 > infrastructure:0.58 > devops:0.45"
"reddit-politics:0.95 > reddit:0.88 > social-media:0.80 > forum:0.70 > discussion:0.58 > community:0.45"
"github-copilot:0.95 > github:0.88 > code-assistant:0.80 > development-tools:0.70 > programming:0.58 > automation:0.45"
"baby-ketten-klub:0.95 > karaoke-bar:0.88 > karaoke:0.80 > nightlife:0.70 > entertainment:0.58 > venue:0.45"

BAD - WRONG (only 4 topics - FAIL):
"account:0.95 > user:0.90 > online-service:0.85 > web-platform:0.70"

Your 6 topics:`;

      const response = await this.promptAI(prompt, `topic-extraction:${metadata.domain}`);
      // Preserve hierarchy delimiters: | (taxonomies) and > (hierarchy levels)
      const cleanResponse = response.trim().toLowerCase().replace(/[^a-z0-9,:.\->|]/g, '');

      // Cache the result
      this.summaryCache.set(cacheKey, cleanResponse);

      return cleanResponse;
    } catch (error) {
      console.error('Error generating tab summary:', error);
      // Fallback to domain + title if AI fails
      return `${metadata.domain}: ${metadata.title.substring(0, 50)}`;
    }
  }

  /**
   * Convert Summarizer API key points to topic format
   * @param {string} keyPoints - Key points from Summarizer API
   * @param {Object} metadata - Tab metadata
   * @returns {string} - Topics in format "topic1:0.95 > topic2:0.88 > ..."
   */
  convertKeyPointsToTopics(keyPoints, metadata) {
    // Extract keywords from key points (bullet points or sentences)
    const lines = keyPoints.split('\n').filter(line => line.trim());
    const topics = [];

    // Parse key points and extract meaningful topics
    for (const line of lines.slice(0, 6)) { // Max 6 topics
      const cleaned = line
        .replace(/^[-*•]\s*/, '') // Remove bullet points
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')  // Remove punctuation
        .trim();

      if (cleaned.length > 3 && cleaned.length < 50) {
        // Convert spaces to hyphens for topic format
        const topic = cleaned.substring(0, 30).replace(/\s+/g, '-');
        topics.push(topic);
      }
    }

    // Add domain as a topic if we don't have enough
    if (topics.length < 3) {
      topics.push(metadata.domain.replace(/\./g, '-'));
    }

    // Ensure we have exactly 6 topics, fill with generic if needed
    while (topics.length < 6) {
      topics.push('content'); // Generic fallback
    }

    // Assign confidence scores (decreasing from 0.95 to 0.45)
    const confidences = [0.95, 0.88, 0.80, 0.70, 0.58, 0.45];
    const topicString = topics
      .slice(0, 6)
      .map((topic, i) => `${topic}:${confidences[i]}`)
      .join(' > ');

    return topicString;
  }

  // Removed: extractDomain() and extractPath() - moved to utils/shared/url-helpers.ts
  // Use imported URLHelpers utility
  extractDomain(url) {
    return URLHelpers.extractDomain(url);
  }

  extractPath(url) {
    return URLHelpers.extractPath(url);
  }

  async isTabGroupable(tab) {
    // Filter out tabs that shouldn't be grouped
    const url = tab.url || '';
    const title = tab.title || '';

    // Skip special Chrome/browser pages
    if (url.startsWith('chrome://') ||
        url.startsWith('chrome-extension://') ||
        url.startsWith('edge://') ||
        url.startsWith('about:') ||
        url.startsWith('file://') ||
        url.startsWith('devtools://') ||
        url.startsWith('view-source:')) {
      return false;
    }

    // Skip Chrome Web Store and other restricted Google pages
    if (url.includes('chrome.google.com/webstore') ||
        url.includes('chromewebstore.google.com')) {
      return false;
    }

    // Skip Google Keep - personal notes shouldn't be grouped by content
    if (url.includes('keep.google.com')) {
      return false;
    }

    // Skip PDF viewer extension pages
    if (url.includes('chrome-extension://') && url.includes('.pdf')) {
      return false;
    }

    // Skip empty or new tabs
    if (!url || url === 'about:blank' || title === 'New Tab') {
      return false;
    }

    // Skip already grouped tabs
    if (tab.groupId !== -1) {
      return false;
    }

    // Skip PWA apps (tabs in single-tab windows)
    if (tab.windowId) {
      try {
        const window = await chrome.windows.get(tab.windowId, { populate: true });
        if (window.tabs && window.tabs.length === 1) {
          return false; // Single-tab window = likely PWA
        }
      } catch (e) {
        // Window might have closed, continue
      }
    }

    return true;
  }

  async analyzeAllTabs(forceRefresh = false) {
    try {
      if (!this.isAIAvailable) {
        return { error: 'AI not available', requiresSetup: true };
      }

      // Check if already running
      if (this.analysisInProgress) {
        return {
          error: 'Analysis already in progress',
          progress: this.analysisProgress
        };
      }

      // Get all tabs
      const tabs = await chrome.tabs.query({});

      // Filter to only groupable tabs (async filter)
      const groupableResults = await Promise.all(
        tabs.map(async tab => ({ tab, groupable: await this.isTabGroupable(tab) }))
      );
      const groupableTabs = groupableResults.filter(r => r.groupable).map(r => r.tab);
      console.log(`Found ${groupableTabs.length} groupable tabs (filtered from ${tabs.length} total)`);

      if (groupableTabs.length === 0) {
        return {
          success: true,
          totalTabs: tabs.length,
          ungroupedTabs: 0,
          analyses: [],
          suggestions: [],
          message: 'All tabs have been analyzed or filtered out (special pages, PWAs, already grouped)'
        };
      }

      // Check for cached results unless force refresh
      if (!forceRefresh) {
        const stored = await chrome.storage.local.get(['lastAnalysisResults', 'lastAnalysisTime', 'lastTabsHash']);
        if (stored.lastAnalysisResults && stored.lastAnalysisTime) {
          // Create hash of current tabs (URL + title)
          const currentHash = groupableTabs.map(t => `${t.url}|${t.title}`).sort().join('::');
          const tabsUnchanged = stored.lastTabsHash === currentHash;

          if (tabsUnchanged) {
            const age = Date.now() - stored.lastAnalysisTime;
            console.log('✅ Using cached suggestions (age:', Math.round(age / 1000), 'seconds, tabs unchanged)');
            return {
              success: true,
              ...stored.lastAnalysisResults,
              cached: true,
              cacheAge: age,
              message: `Using cached suggestions (${Math.round(age / 1000)}s old)`
            };
          } else {
            console.log('🔄 Tabs changed - refreshing suggestions');
          }
        }
      }

      // Start background analysis
      this.analysisInProgress = true;
      this.analysisProgress = {
        current: 0,
        total: groupableTabs.length,
        status: 'analyzing'
      };

      // Run analysis in background (don't await)
      this.performBackgroundAnalysis(groupableTabs).catch(error => {
        console.error('Background analysis failed:', error);
        this.analysisInProgress = false;
        this.analysisProgress.status = 'error';
      });

      // Return immediately with status
      return {
        success: true,
        started: true,
        totalTabs: tabs.length,
        analyzingTabs: groupableTabs.length,
        analyses: [],
        suggestions: [],
        message: 'Analysis started in background. Close popup if needed - results will be saved.',
        progress: this.analysisProgress
      };
    } catch (error) {
      console.error('Error in analyzeAllTabs:', error);
      this.analysisInProgress = false;
      return { success: false, error: error.message };
    }
  }

  async performBackgroundAnalysis(tabs) {
    console.log(`🤖 Analyzing ${tabs.length} tabs (generating summaries + grouping)...`);

    this.analysisProgress.status = 'summarizing';
    this.analysisProgress.current = 0;
    this.analysisProgress.total = tabs.length;

    // Stage 1: Generate summaries for each tab (cached)
    console.log(`📝 Stage 1: Generating summaries for ${tabs.length} tabs...`);
    const tabData = await Promise.all(tabs.map(async (t, index) => {
      const topics = await this.generateTabSummary(t);
      this.analysisProgress.current = index + 1;
      return {
        id: t.id,
        title: t.title,
        url: t.url,
        domain: this.extractDomain(t.url),
        topics: topics // AI-generated topic keywords with confidence scores
      };
    }));

    console.log(`✅ Stage 1 complete: ${tabData.length} summaries generated`);

    // Stage 2: Get existing groups
    const existingGroups = await this.getExistingGroupInfo();

    // Stage 3: Single AI call to suggest groups using summaries
    this.analysisProgress.status = 'grouping';
    this.analysisProgress.current = 0;
    this.analysisProgress.total = 1;
    console.log(`🎯 Stage 2: Suggesting groups...`);
    const suggestionResult = await this.suggestGroupsDirect(tabData, existingGroups);

    this.analysisProgress.current = 1;

    const results = {
      totalTabs: tabs.length,
      suggestions: suggestionResult.suggestions || [],
      existingGroups: suggestionResult.existingGroups || [],
      // Include raw tab data with topics for debugging
      tabData: tabData.map(tab => ({
        id: tab.id,
        title: tab.title,
        url: tab.url,
        domain: tab.domain,
        topics: tab.topics,
        parsedTopics: this.parseTopicsWithConfidence(tab.topics)
      }))
    };

    // Create hash of tabs for cache invalidation
    const tabsHash = tabs.map(t => `${t.url}|${t.title}`).sort().join('::');

    // Store results for popup to retrieve
    await chrome.storage.local.set({
      lastAnalysisResults: results,
      lastAnalysisTime: Date.now(),
      lastTabsHash: tabsHash
    });

    this.analysisInProgress = false;
    this.analysisProgress.status = 'complete';

    // Broadcast completion to any open interfaces
    try {
      chrome.runtime.sendMessage({
        action: 'analysisComplete',
        results: results
      }).catch(() => {
        // Ignore if no listeners
      });
    } catch (e) {
      // Ignore broadcast errors
    }

    console.log('✅ Background analysis complete:', results);
    return results;
  }

  // Removed: analyzeTab() - no longer needed with single-pass direct grouping
  // Removed: extractPageContent() and performAIAnalysis() - no longer needed with single-pass direct grouping
  // Removed: cleanJSON() and _tryParseJSON() - moved to utils/shared/json-parser.ts

  // Use imported JSONParser utility
  cleanJSON(text) {
    return JSONParser.cleanJSON(text);
  }

  // Backward compatibility alias
  extractJSON(text) {
    return JSONParser.cleanJSON(text);
  }

  async getExistingGroupInfo() {
    try {
      const groups = await chrome.tabGroups.query({});
      const groupInfo = [];

      for (const group of groups) {
        // Get tabs in this group
        const groupTabs = await chrome.tabs.query({ groupId: group.id });

        if (groupTabs.length > 0) {
          groupInfo.push({
            id: group.id,
            title: group.title || 'Untitled Group',
            color: group.color,
            tabCount: groupTabs.length,
            tabs: groupTabs.map(t => ({
              id: t.id,
              title: t.title,
              url: t.url,
              domain: this.extractDomain(t.url)
            }))
          });
        }
      }

      return groupInfo;
    } catch (error) {
      console.error('Error getting existing groups:', error);
      return [];
    }
  }

  async suggestAddToExistingGroups(analyses, existingGroups) {
    const suggestions = [];

    if (existingGroups.length === 0) {
      return suggestions;
    }

    // For each ungrouped tab analysis
    for (const analysis of analyses) {
      // Find best matching existing group
      let bestMatch = null;
      let bestScore = 0;

      for (const group of existingGroups) {
        const score = this.calculateGroupMatchScore(analysis, group);

        if (score > bestScore && score > 0.6) { // 60% confidence threshold
          bestScore = score;
          bestMatch = group;
        }
      }

      if (bestMatch) {
        console.log(`  ➕ "${analysis.title}" → "${bestMatch.title}" (${Math.round(bestScore * 100)}% match)`);

        // Create suggestion to add to existing group
        suggestions.push({
          groupName: `Add to "${bestMatch.title}"`,
          existingGroupId: bestMatch.id,
          isAddToExisting: true,
          color: bestMatch.color,
          tabs: [analysis],
          confidence: bestScore
        });
      }
    }

    return suggestions;
  }

  calculateGroupMatchScore(analysis, group) {
    let score = 0;
    let factors = 0;

    // Compare category with group title
    const category = (analysis.category || '').toLowerCase();
    const groupTitle = (group.title || '').toLowerCase();

    if (category && groupTitle) {
      // Exact match
      if (groupTitle.includes(category) || category.includes(groupTitle)) {
        score += 0.8;
        factors++;
      } else {
        // Partial word match
        const categoryWords = category.split(/\s+/);
        const titleWords = groupTitle.split(/\s+/);
        const matches = categoryWords.filter(w => titleWords.includes(w)).length;
        if (matches > 0) {
          score += 0.5 * (matches / Math.max(categoryWords.length, titleWords.length));
          factors++;
        }
      }
    }

    // Compare domain with existing tabs in group
    const analysisDomain = analysis.domain || '';
    if (analysisDomain) {
      const domainMatch = group.tabs.some(tab => tab.domain === analysisDomain);
      if (domainMatch) {
        score += 0.7;
        factors++;
      }
    }

    // Compare keywords with group tab titles
    if (analysis.keywords && analysis.keywords.length > 0) {
      const groupText = group.tabs.map(t => t.title.toLowerCase()).join(' ');
      const keywordMatches = analysis.keywords.filter(kw =>
        groupText.includes(kw.toLowerCase())
      ).length;

      if (keywordMatches > 0) {
        score += 0.4 * (keywordMatches / analysis.keywords.length);
        factors++;
      }
    }

    return factors > 0 ? score / factors : 0;
  }

  createFallbackAnalysis(metadata) {
    // Create a simple categorization based on domain and title
    let category = 'Uncategorized';
    
    const domain = metadata.domain.toLowerCase();
    const title = (metadata.title || '').toLowerCase();
    
    // Simple domain-based categorization
    if (domain.includes('github') || domain.includes('stackoverflow') || domain.includes('dev')) {
      category = 'Development';
    } else if (domain.includes('youtube') || domain.includes('netflix') || domain.includes('twitch')) {
      category = 'Entertainment';
    } else if (domain.includes('amazon') || domain.includes('shop') || domain.includes('store')) {
      category = 'Shopping';
    } else if (domain.includes('news') || domain.includes('cnn') || domain.includes('bbc')) {
      category = 'News';
    } else if (domain.includes('social') || domain.includes('twitter') || domain.includes('facebook')) {
      category = 'Social';
    } else if (title.includes('work') || title.includes('office') || title.includes('productivity')) {
      category = 'Work';
    }

    return {
      category: category,
      summary: metadata.title || 'Web page',
      keywords: [metadata.domain],
      confidence: 0.3,
      domain: metadata.domain,
      title: metadata.title,
      url: metadata.url,
      fallback: true
    };
  }

  // ============================================================================
  // HYBRID GROUPING APPROACH - Programmatic + AI Validation
  // ============================================================================

  /**
   * Parse topics with confidence scores
   * Input: "github:0.9,better-tabs-ai:0.95" or legacy "github,better-tabs-ai"
   * Output: [{topic: "github", confidence: 0.9}, {topic: "better-tabs-ai", confidence: 0.95}]
   */
  // Removed: parseTopicsWithConfidence() - moved to utils/shared/topic-parser.ts
  // Use imported TopicParser utility
  parseTopicsWithConfidence(topicsString) {
    return TopicParser.parse(topicsString);
  }

  /**
   * Normalize topics for comparison (legacy support)
   * Returns just the topic strings without confidence
   */
  normalizeTopics(topics) {
    return TopicParser.getTopicStrings(topics);
  }

  /**
   * Calculate topic overlap using hierarchical taxonomy matching
   * Compares each taxonomy chain from tab1 with each taxonomy chain from tab2
   * Returns best match score found across all taxonomy comparisons
   */
  calculateTopicOverlap(tab1, tab2) {
    const topics1 = this.parseTopicsWithConfidence(tab1.topics);
    const topics2 = this.parseTopicsWithConfidence(tab2.topics);

    if (topics1.length === 0 || topics2.length === 0) return 0;

    // Group topics by taxonomy index (each taxonomy is independent)
    const taxonomies1 = this._groupByTaxonomy(topics1);
    const taxonomies2 = this._groupByTaxonomy(topics2);

    let bestScore = 0;
    let bestMatch = null;

    // Compare each taxonomy from tab1 with each taxonomy from tab2
    taxonomies1.forEach((tax1, idx1) => {
      taxonomies2.forEach((tax2, idx2) => {
        const result = this._compareTaxonomies(tax1, tax2);
        if (result.score > bestScore) {
          bestScore = result.score;
          bestMatch = { tax1, tax2, ...result };
        }
      });
    });

    // Log only if we found a meaningful match (reduce console noise)
    if (bestScore >= 0.5) {
      const tax1Str = bestMatch.tax1.map(t => `${t.topic}:${t.confidence.toFixed(2)}`).join(' > ');
      const tax2Str = bestMatch.tax2.map(t => `${t.topic}:${t.confidence.toFixed(2)}`).join(' > ');
      const matchInfo = bestMatch.matches.map(m => `${m.topic}(${m.type})`).join(', ');
      console.log(`  ✓ Match (${bestScore.toFixed(2)}): ${matchInfo}\n    [${tax1Str}]\n    [${tax2Str}]`);
    }

    return bestScore;
  }

  /**
   * Group topics by taxonomy index (each taxonomy is a separate hierarchy)
   */
  _groupByTaxonomy(topics) {
    const taxonomies = new Map();

    topics.forEach(topic => {
      const idx = topic.taxonomyIndex ?? 0;
      if (!taxonomies.has(idx)) {
        taxonomies.set(idx, []);
      }
      taxonomies.get(idx).push(topic);
    });

    // Sort each taxonomy by confidence (most specific first)
    taxonomies.forEach((topics, idx) => {
      topics.sort((a, b) => b.confidence - a.confidence);
    });

    return Array.from(taxonomies.values());
  }

  /**
   * Compare two taxonomy chains and return match score
   * Uses geometric mean of all matching topic confidences (no artificial scaling)
   * Supports cross-hierarchy matching since tier 2 on one page may equal tier 3 on another
   */
  _compareTaxonomies(tax1, tax2) {
    // Generic terms that should not be considered matches (too broad to be meaningful)
    const GENERIC_TERMS = new Set([
      'technology', 'software', 'internet', 'online', 'web', 'digital',
      'content', 'information', 'media', 'services', 'platform', 'application',
      'website', 'page', 'site', 'online-service', 'web-platform'
    ]);

    const matches = [];

    // Compare all topics across both taxonomies (cross-hierarchy matching)
    for (const topic1 of tax1) {
      // Skip generic terms
      if (GENERIC_TERMS.has(topic1.topic)) continue;

      for (const topic2 of tax2) {
        // Skip generic terms
        if (GENERIC_TERMS.has(topic2.topic)) continue;

        // Exact match on topic - record both confidences
        if (topic1.topic === topic2.topic) {
          matches.push({
            confidence1: topic1.confidence,
            confidence2: topic2.confidence,
            type: 'exact',
            topic: topic1.topic
          });
          continue;
        }

        // Check if one topic appears in the other's hierarchy
        if (topic1.hierarchy && topic1.hierarchy.includes(topic2.topic)) {
          matches.push({
            confidence1: topic1.confidence,
            confidence2: topic2.confidence,
            type: 'hierarchy',
            topic: topic2.topic
          });
          continue;
        }
        if (topic2.hierarchy && topic2.hierarchy.includes(topic1.topic)) {
          matches.push({
            confidence1: topic1.confidence,
            confidence2: topic2.confidence,
            type: 'hierarchy',
            topic: topic1.topic
          });
          continue;
        }

        // Partial word match (e.g., "karaoke" in both) - only for words > 3 chars
        const words1 = topic1.topic.split('-');
        const words2 = topic2.topic.split('-');
        const commonWords = words1.filter(w =>
          words2.includes(w) && w.length > 3 && !GENERIC_TERMS.has(w)
        );

        if (commonWords.length > 0) {
          matches.push({
            confidence1: topic1.confidence,
            confidence2: topic2.confidence,
            type: 'partial',
            topic: commonWords.join('-')
          });
        }
      }
    }

    if (matches.length === 0) return { score: 0, matches: [] };

    // Calculate geometric mean of all matching confidences
    // Formula: (c1 * c2 * c3 * ... * cn)^(1/n)
    const product = matches.reduce((prod, match) => {
      return prod * match.confidence1 * match.confidence2;
    }, 1);

    const totalValues = matches.length * 2; // Each match has 2 confidence values
    const geometricMean = Math.pow(product, 1 / totalValues);

    return {
      score: geometricMean,
      matches: matches
    };
  }

  /**
   * Check if a tab URL matches any exclusion pattern
   * @param {string} url - Tab URL to check
   * @returns {boolean} - True if tab should be excluded from grouping
   */
  _isExcluded(url) {
    if (!this.settings.excludedPatterns || this.settings.excludedPatterns.length === 0) {
      return false;
    }

    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      const pathname = urlObj.pathname;

      for (const pattern of this.settings.excludedPatterns) {
        if (!pattern.enabled) continue;

        switch (pattern.type) {
          case 'domain':
            // Exact domain match: example.com
            if (hostname === pattern.pattern) {
              console.log(`    ⊘ Excluded by domain pattern: ${pattern.pattern}`);
              return true;
            }
            break;

          case 'subdomain':
            // Wildcard subdomain match: *.example.com
            if (pattern.pattern.startsWith('*.')) {
              const baseDomain = pattern.pattern.substring(2);
              if (hostname === baseDomain || hostname.endsWith('.' + baseDomain)) {
                console.log(`    ⊘ Excluded by subdomain pattern: ${pattern.pattern}`);
                return true;
              }
            } else if (hostname === pattern.pattern) {
              console.log(`    ⊘ Excluded by domain pattern: ${pattern.pattern}`);
              return true;
            }
            break;

          case 'uri':
            // URI path matching: example.com/docs/*
            const [patternHost, ...patternPathParts] = pattern.pattern.split('/');
            const patternPath = '/' + patternPathParts.join('/');

            if (hostname === patternHost) {
              // Simple wildcard matching
              if (patternPath.endsWith('/*')) {
                const basePath = patternPath.slice(0, -2);
                if (pathname.startsWith(basePath)) {
                  console.log(`    ⊘ Excluded by URI pattern: ${pattern.pattern}`);
                  return true;
                }
              } else if (pathname === patternPath) {
                console.log(`    ⊘ Excluded by URI pattern: ${pattern.pattern}`);
                return true;
              }
            }
            break;
        }
      }
    } catch (error) {
      console.warn('Error checking exclusion pattern:', error);
    }

    return false;
  }

  /**
   * Create candidate groups based on programmatic topic matching with WEIGHTED confidence
   * Returns groups where 3+ tabs share significant topic overlap
   */
  createCandidateGroups(tabData) {
    console.log('🔍 Creating candidate groups from', tabData.length, 'tabs');

    const candidates = [];
    const used = new Set();

    // For each tab, find others with high topic overlap
    for (let i = 0; i < tabData.length; i++) {
      if (used.has(i)) continue;

      const anchor = tabData[i];
      const anchorTopics = this.parseTopicsWithConfidence(anchor.topics);

      // Skip excluded tabs
      if (this._isExcluded(anchor.url)) {
        console.log(`  ⊘ Skipping excluded tab ${i}: ${anchor.title}`);
        continue;
      }

      // Skip tabs with ONLY very low-confidence topics (but be lenient - we raised generic cap to 0.5)
      const maxConfidence = Math.max(...anchorTopics.map(t => t.confidence), 0);
      if (maxConfidence < this.settings.skipLowConfidenceTabs) {
        console.log(`  ⚠️ Skipping tab ${i} - all topics below ${this.settings.skipLowConfidenceTabs} confidence (max: ${maxConfidence.toFixed(2)})`);
        continue;
      }

      const group = [{ tab: anchor, index: i, score: 1.0 }];

      // Find matching tabs
      for (let j = i + 1; j < tabData.length; j++) {
        if (used.has(j)) continue;

        const candidate = tabData[j];
        const overlap = this.calculateTopicOverlap(anchor, candidate);

        // Skip excluded tabs
        if (this._isExcluded(candidate.url)) {
          continue;
        }

        // Include matches with geometric mean >= settings threshold (good topic overlap)
        // User has final say on grouping, so be inclusive
        if (overlap >= this.settings.minMatchScore) {
          group.push({ tab: candidate, index: j, score: overlap });
          console.log(`  ✓ Match: Tab ${i} ↔ Tab ${j} (overlap: ${overlap.toFixed(2)})`);
        }
      }

      // Only create candidate if we have minimum tab threshold from settings (user decides if they want to group)
      if (group.length >= this.settings.minTabsPerGroup) {
        // Mark tabs as used
        group.forEach(item => used.add(item.index));

        // Calculate average overlap
        const avgScore = group.reduce((sum, item) => sum + item.score, 0) / group.length;

        // Generate group name from most common HIGH-CONFIDENCE topics
        const allTopicsWithConf = group.flatMap(item =>
          this.parseTopicsWithConfidence(item.tab.topics)
        );

        // Weight topics by both frequency AND confidence
        const topicScores = {};
        allTopicsWithConf.forEach(({ topic, confidence }) => {
          topicScores[topic] = (topicScores[topic] || 0) + confidence;
        });

        const topTopics = Object.entries(topicScores)
          .sort((a, b) => b[1] - a[1]) // Sort by weighted score
          .slice(0, 2)
          .map(([topic]) => topic);

        console.log(`  ✅ Candidate group: "${topTopics.join(' & ')}" (${group.length} tabs, avg score: ${avgScore.toFixed(2)})`);

        candidates.push({
          tabs: group.map(item => item.tab),
          indices: group.map(item => item.index),
          scores: group.map(item => item.score),
          avgScore: avgScore,
          suggestedName: topTopics.join(' & '),
          topicBasis: topTopics
        });
      }
    }

    console.log(`✓ Created ${candidates.length} candidate groups`);
    console.log(`✅ Created ${candidates.length} candidate groups from topic matching`);
    candidates.forEach((c, i) => {
      console.log(`  Candidate ${i+1}: "${c.suggestedName}" - ${c.tabs.length} tabs, avg score: ${c.avgScore.toFixed(2)}`);
    });
    
    return candidates;
  }

  /**
   * Validate a candidate group with AI
   * Asks: "Do these tabs belong together? Which ones don't?"
   */
  async validateCandidateGroup(candidate) {
    try {
      const tabList = candidate.tabs.map((tab, i) => {
        const parts = [
          `${i + 1}. "${tab.title}"`,
          `@${tab.domain}`
        ];

        // Include summary/description if available (for better context)
        if (tab.summary && tab.summary !== tab.topics) {
          parts.push(`- ${tab.summary}`);
        }

        // Include topics hierarchy
        if (tab.topics) {
          parts.push(`(topics: ${tab.topics})`);
        }

        return parts.join(' ');
      }).join('\n');

      const prompt = `Do these ${candidate.tabs.length} tabs belong in ONE group?

${tabList}

Analyze if they share a RELATED topic (can be different aspects of the same domain).
Consider both the titles/summaries AND the topic hierarchies.
Respond ONLY with JSON:

{
  "belongs": true,
  "excludeIndices": [],
  "groupName": "Specific Topic Name",
  "confidence": 0.9,
  "reason": "All tabs are about X"
}

OR if some don't belong:

{
  "belongs": false,
  "excludeIndices": [1, 3],
  "groupName": "Topic for remaining tabs",
  "confidence": 0.7,
  "reason": "Tabs 1,3 are about Y, rest are about Z"
}

Rules:
- belongs=true if tabs share a common domain/ecosystem (e.g., "Comic Books", "GitHub Projects", "VSCode Development")
- Different tools/aspects within same domain ARE valid (e.g., comic database + comic reader = both comics)
- excludeIndices are 1-based indices of tabs that are completely unrelated
- groupName must be SPECIFIC, not generic (e.g., "Comic Books & Tools" not "Technology")
- If fewer than ${this.settings.minTabsPerGroup} tabs remain after exclusions, set belongs=false`;

      const response = await this.promptAI(prompt, `validate-group:${candidate.tabs.length}-tabs`);

      try {
        const result = this.extractJSON(response);
        console.log(`✓ AI validation for "${candidate.suggestedName}":`, result);
        return result;
      } catch (e) {
        console.warn('Failed to parse AI validation response:', response);
        return {
          belongs: false,
          excludeIndices: [],
          groupName: candidate.suggestedName,
          confidence: 0.5,
          reason: 'Parse error'
        };
      }
    } catch (error) {
      console.error('Error validating candidate group:', error);
      return null;
    }
  }

  /**
   * Hybrid grouping: Programmatic pre-grouping + AI validation
   */
  async suggestGroupsHybrid(tabData) {
    console.log('🤖 Starting hybrid grouping for', tabData.length, 'tabs');

    // Phase 1: Programmatic pre-grouping by topics
    const candidates = this.createCandidateGroups(tabData);

    if (candidates.length === 0) {
      console.log('No candidate groups found via topic matching');
      return [];
    }

    // Phase 2: AI validation of each candidate
    const validatedGroups = [];

    for (const candidate of candidates) {
      const validation = await this.validateCandidateGroup(candidate);

      if (!validation) continue;

      if (validation.belongs) {
        // All tabs belong together
        const tabIds = candidate.tabs.map(t => t.id);
        const tabConfidences = {};
        candidate.tabs.forEach((tab, i) => {
          tabConfidences[tab.id] = candidate.scores[i];
        });

        validatedGroups.push({
          groupName: validation.groupName || candidate.suggestedName,
          tabs: candidate.tabs,
          tabIds: tabIds,
          confidence: validation.confidence,
          tabConfidences: tabConfidences,
          reasoning: validation.reason
        });
      } else if (validation.excludeIndices && validation.excludeIndices.length > 0) {
        // Some tabs excluded
        const includedTabs = candidate.tabs.filter((_, i) =>
          !validation.excludeIndices.includes(i + 1)
        );

        if (includedTabs.length >= this.settings.minTabsPerGroup) {
          const tabIds = includedTabs.map(t => t.id);
          const tabConfidences = {};
          includedTabs.forEach((tab) => {
            const originalIndex = candidate.tabs.indexOf(tab);
            tabConfidences[tab.id] = candidate.scores[originalIndex];
          });

          validatedGroups.push({
            groupName: validation.groupName || candidate.suggestedName,
            tabs: includedTabs,
            tabIds: tabIds,
            confidence: validation.confidence,
            tabConfidences: tabConfidences,
            reasoning: validation.reason
          });
        }
      }
    }

    console.log(`✓ Validated ${validatedGroups.length} groups from ${candidates.length} candidates`);
    return validatedGroups;
  }

  async suggestGroupsDirect(tabData, existingGroups = []) {
    try {
      if (!this.aiSession) {
        await this.createAISession();
      }

      // Use hybrid approach: Programmatic pre-grouping + AI validation
      console.log('🔄 Using HYBRID approach: Topic matching + AI validation');
      const hybridGroups = await this.suggestGroupsHybrid(tabData);

      if (hybridGroups.length > 0) {
        console.log(`✓ Hybrid approach found ${hybridGroups.length} validated groups`);
        return {
          suggestions: hybridGroups,
          existingGroups
        };
      }

      // Fallback to old approach if hybrid finds nothing
      console.log('⚠️ Hybrid found no groups, falling back to batch approach');

      // Token estimation (rough: 1 token ≈ 4 characters)
      const estimateTokens = (text) => Math.ceil(text.length / 4);

      const promptRules = this.settings.customAIPromptRules || DEFAULT_AI_PROMPT_RULES;
      const PROMPT_OVERHEAD = estimateTokens(promptRules) + CONSTANTS.TOKENS.PROMPT_OVERHEAD_BASE;

      // Reserve tokens for both input AND output (Gemini Nano has 1000 token limit total)
      const TOTAL_TOKENS_PER_TAB = CONSTANTS.TOKENS.PER_TAB_INPUT + CONSTANTS.TOKENS.PER_TAB_OUTPUT;

      const maxTabsPerBatch = Math.floor(
        (CONSTANTS.AI.MAX_TOKENS - PROMPT_OVERHEAD - CONSTANTS.TOKENS.OUTPUT_OVERHEAD) / TOTAL_TOKENS_PER_TAB
      );
      console.log(`📊 Token budget: ${CONSTANTS.AI.MAX_TOKENS} tokens total, ${maxTabsPerBatch} tabs per batch (accounting for output)`);

      // Check if we need batching
      if (tabData.length <= maxTabsPerBatch) {
        console.log(`📊 Single batch: ${tabData.length} tabs`);
        return await this.suggestGroupsForBatch(tabData, existingGroups, 0);
      }

      // Multi-batch processing
      console.log(`📊 Multi-batch: ${tabData.length} tabs across ${Math.ceil(tabData.length / maxTabsPerBatch)} batches`);
      const batches = [];
      for (let i = 0; i < tabData.length; i += maxTabsPerBatch) {
        batches.push(tabData.slice(i, i + maxTabsPerBatch));
      }

      const allSuggestions = [];
      for (let i = 0; i < batches.length; i++) {
        console.log(`🤖 Processing batch ${i + 1}/${batches.length} (${batches[i].length} tabs)...`);
        const batchResult = await this.suggestGroupsForBatch(batches[i], existingGroups, i * maxTabsPerBatch);
        allSuggestions.push(...batchResult.suggestions);
      }

      // Merge overlapping groups across batches
      const merged = this.mergeBatchSuggestions(allSuggestions, tabData);
      console.log(`🔀 Merged ${allSuggestions.length} batch suggestions into ${merged.length} groups`);

      return {
        suggestions: merged,
        existingGroups
      };
    } catch (error) {
      console.error('Error suggesting groups:', error);
      return { suggestions: [], existingGroups: [] };
    }
  }

  async suggestGroupsForBatch(tabData, existingGroups, indexOffset = 0) {
    try {
      // Ask AI to suggest groupings based on topic keywords
      const groupingPrompt = `Analyze these browser tabs and suggest logical groupings based on TOPICS.

Tabs:
${tabData.map((t, i) => `${i + 1}. ${t.topics} @${t.domain}`).join('\n')}

${this.settings.customAIPromptRules || DEFAULT_AI_PROMPT_RULES}

Return COMPACT JSON array:
[{"name":"Group Name","tabs":[{"i":1,"c":0.9},{"i":3,"c":0.8}],"conf":0.85}]

Keys: name=groupName, tabs=array of {i:index,c:confidence}, conf=groupConfidence`;

      const aiResponse = await this.promptAI(groupingPrompt, `grouping:${tabData.length}-tabs`);
      const groupSuggestions = this.extractJSON(aiResponse);

      if (!groupSuggestions || !Array.isArray(groupSuggestions)) {
        console.warn('AI did not return valid group suggestions, returning empty');
        return { suggestions: [], existingGroups };
      }

      console.log(`🎯 AI suggested ${groupSuggestions.length} groups`);

      // Convert AI suggestions to our format with per-tab confidence
      // Handle both compact format {name,tabs:[{i,c}],conf} and verbose format {groupName,tabs:[{index,confidence}],groupConfidence}
      const suggestions = groupSuggestions.map(g => {
        const groupName = g.name || g.groupName;
        const groupConf = g.conf !== undefined ? g.conf : (g.groupConfidence || 0.7);

        const tabs = (g.tabs || [])
          .map(tabInfo => {
            // Handle compact format {i,c} or verbose format {index,confidence}
            const tabIndex = tabInfo.i !== undefined ? tabInfo.i : tabInfo.index;
            const tabConf = tabInfo.c !== undefined ? tabInfo.c : (tabInfo.confidence || 0.7);
            const tabId = tabData[tabIndex - 1]?.id; // Convert 1-based to 0-based

            return tabId ? {
              id: tabId,
              confidence: tabConf
            } : null;
          })
          .filter(Boolean)
          // Filter tabs by minimum per-tab confidence
          .filter(tab => tab.confidence >= this.settings.minTabConfidence);

        return {
          groupName: groupName,
          color: this.getCategoryColor(groupName),
          confidence: groupConf,
          tabs: tabs // Array of {id, confidence}
        };
      }).filter(s => s.tabs.length >= this.settings.minTabsPerGroup); // Enforce 2-tab minimum (user decides if they want to group)

      console.log(`✅ Generated ${suggestions.length} AI-suggested groups`);

      // Filter by minimum confidence threshold and minimum tab count
      const filtered = suggestions.filter(s =>
        s.confidence >= this.settings.minConfidenceThreshold &&
        s.tabs &&
        s.tabs.length >= this.settings.minTabsForSuggestion
      );
      console.log(`🎯 Filtered to ${filtered.length} suggestions (confidence >= ${this.settings.minConfidenceThreshold}, tabs >= ${this.settings.minTabsForSuggestion})`);

      // Sort by confidence and tab count (larger, more confident groups first)
      filtered.sort((a, b) => {
        const scoreA = a.tabs.length * a.confidence;
        const scoreB = b.tabs.length * b.confidence;
        return scoreB - scoreA;
      });

      // Limit to maxSuggestions
      const limited = filtered.slice(0, this.settings.maxSuggestions);
      console.log(`📋 Returning ${limited.length} suggestions (max: ${this.settings.maxSuggestions})`);

      // Remove overlapping suggestions using per-tab confidence
      const deduplicated = this.deduplicateSuggestionsWithTabConfidence(limited);
      console.log(`🔀 Deduplicated to ${deduplicated.length} non-overlapping suggestions`);

      console.log('Final suggestions:', deduplicated.map(s => ({
        name: s.groupName,
        tabs: s.tabIds.length
      })));

      return {
        suggestions: deduplicated,
        existingGroups
      };
    } catch (error) {
      console.error('Error in suggestGroupsForBatch:', error);
      return { suggestions: [], existingGroups: [] };
    }
  }

  mergeBatchSuggestions(suggestions, allTabData) {
    // Merge suggestions from multiple batches, combining groups with similar names
    // and handling overlapping tabs

    if (suggestions.length === 0) return [];

    // Group suggestions by similar group names
    const groupsByName = new Map();

    suggestions.forEach(suggestion => {
      const normalizedName = suggestion.groupName.toLowerCase().trim();

      if (!groupsByName.has(normalizedName)) {
        groupsByName.set(normalizedName, []);
      }
      groupsByName.get(normalizedName).push(suggestion);
    });

    // Merge groups with the same name
    const merged = [];
    for (const [name, groups] of groupsByName) {
      if (groups.length === 1) {
        merged.push(groups[0]);
        continue;
      }

      // Multiple groups with same name - merge them
      const allTabIds = new Set();
      const tabConfidences = {};
      let totalConfidence = 0;

      groups.forEach(group => {
        group.tabIds.forEach(tabId => {
          allTabIds.add(tabId);
          // Use highest confidence if tab appears in multiple groups
          const existingConf = tabConfidences[tabId] || 0;
          const newConf = group.tabConfidences?.[tabId] || 0.7;
          tabConfidences[tabId] = Math.max(existingConf, newConf);
        });
        totalConfidence += group.confidence;
      });

      merged.push({
        groupName: groups[0].groupName, // Use first group's capitalization
        color: groups[0].color,
        confidence: totalConfidence / groups.length, // Average confidence
        tabIds: Array.from(allTabIds),
        tabConfidences: tabConfidences
      });
    }

    // Apply final filtering and deduplication
    const filtered = merged.filter(s =>
      s.confidence >= this.settings.minConfidenceThreshold &&
      s.tabIds &&
      s.tabIds.length >= this.settings.minTabsPerGroup // Enforce 2-tab minimum (user decides)
    );

    // Sort by confidence and tab count
    filtered.sort((a, b) => {
      const scoreA = a.tabIds.length * a.confidence;
      const scoreB = b.tabIds.length * b.confidence;
      return scoreB - scoreA;
    });

    // Limit to maxSuggestions
    return filtered.slice(0, this.settings.maxSuggestions);
  }

  async findGroupForTabs(tabs, groups) {
    try {
      if (!this.aiSession) {
        await this.createAISession();
      }

      const prompt = `Find the best group for these tabs from the available groups.

Tabs to place:
${tabs.map((t, i) => `${i + 1}. "${t.title}" (${t.domain})`).join('\n')}

Available groups:
${groups.map((g, i) => `${i + 1}. "${g.name}" (color: ${g.color})`).join('\n')}

Return the index (1-based) of the BEST matching group, or 0 if none match well.
Respond with ONLY a JSON object:
{
  "groupIndex": 3,
  "confidence": 0.85,
  "reason": "These tabs are about X and group Y is for X"
}`;

      const aiResponse = await this.promptAI(prompt, `find-group:${tabs.length}-tabs`);
      const result = this.extractJSON(aiResponse);

      if (result.groupIndex && result.groupIndex > 0 && result.groupIndex <= groups.length) {
        const selectedGroup = groups[result.groupIndex - 1];
        return {
          success: true,
          groupId: selectedGroup.id,
          confidence: result.confidence,
          reason: result.reason
        };
      }

      return { success: false, message: 'No suitable group found' };
    } catch (error) {
      console.error('Error finding group:', error);
      return { success: false, error: error.message };
    }
  }

  // Removed: createSuggestionsFromPatterns() - no longer needed with single-pass direct grouping
  // Removed: fallbackCategoryGrouping() - no longer needed with single-pass direct grouping

  deduplicateSuggestionsWithTabConfidence(suggestions) {
    // Track best assignment for each tab based on:
    // 1. Tab's confidence in that group (primary)
    // 2. Group size (secondary - larger groups preferred at same confidence)
    // 3. Group confidence (tertiary)
    const tabAssignments = new Map();

    suggestions.forEach((suggestion, index) => {
      (suggestion.tabs || []).forEach(tab => {
        const existing = tabAssignments.get(tab.id);

        // Calculate scores for comparison
        const newScore = tab.confidence * (1 + suggestion.tabs.length * 0.1) * suggestion.confidence;
        const existingScore = existing
          ? existing.tabConfidence * (1 + existing.groupSize * 0.1) * existing.groupConfidence
          : 0;

        // Assign to group with higher score
        if (!existing || newScore > existingScore) {
          tabAssignments.set(tab.id, {
            suggestionIndex: index,
            tabConfidence: tab.confidence,
            groupSize: suggestion.tabs.length,
            groupConfidence: suggestion.confidence
          });
        }
      });
    });

    // Filter suggestions to only include tabs assigned to them, convert to tabIds format
    // Preserve per-tab confidence for UI display
    return suggestions.map((suggestion, index) => {
      const assignedTabs = (suggestion.tabs || [])
        .filter(tab => {
          const assignment = tabAssignments.get(tab.id);
          return assignment && assignment.suggestionIndex === index;
        });

      const assignedTabIds = assignedTabs.map(tab => tab.id);
      const tabConfidences = {};
      assignedTabs.forEach(tab => {
        tabConfidences[tab.id] = tab.confidence;
      });

      return {
        groupName: suggestion.groupName,
        color: suggestion.color,
        confidence: suggestion.confidence,
        tabIds: assignedTabIds,
        tabConfidences: tabConfidences // Per-tab confidence for UI
      };
    }).filter(s => s.tabIds.length >= this.settings.minTabsPerGroup); // Enforce 2-tab minimum (user decides)
  }

  // Removed: deduplicateSuggestions() - replaced by deduplicateSuggestionsSimple() for new tabIds format

  createSubGroups(tabs, mainCategory) {
    const subGroups = [];
    
    // Group by domain first
    const domainGroups = {};
    tabs.forEach(tab => {
      const domain = tab.domain || 'unknown';
      if (!domainGroups[domain]) {
        domainGroups[domain] = [];
      }
      domainGroups[domain].push(tab);
    });

    // Create subgroups for domains with multiple tabs
    for (const [domain, domainTabs] of Object.entries(domainGroups)) {
      if (domainTabs.length >= 2) {
        let groupName = mainCategory;
        
        // Create more specific names based on domain
        if (domain.includes('amazon')) {
          groupName = 'Amazon Shopping';
        } else if (domain.includes('github')) {
          groupName = 'GitHub Development';
        } else if (domain.includes('stackoverflow')) {
          groupName = 'Stack Overflow Development';
        } else if (domain.includes('youtube')) {
          groupName = 'YouTube Entertainment';
        } else if (domain.includes('reddit')) {
          groupName = 'Reddit Social';
        } else if (domain.includes('twitter') || domain.includes('x.com')) {
          groupName = 'Twitter Social';
        } else if (domain.includes('linkedin')) {
          groupName = 'LinkedIn Professional';
        } else if (domain.includes('developer.chrome') || domain.includes('chromium')) {
          groupName = 'Chrome Development';
        } else if (domain.includes('developer.mozilla') || domain.includes('mdn')) {
          groupName = 'MDN Documentation';
        } else {
          // Try to detect topic from titles/keywords
          const keywords = domainTabs.flatMap(tab => tab.keywords || []);
          const titles = domainTabs.map(tab => tab.title || '').join(' ').toLowerCase();
          
          if (keywords.some(k => k.toLowerCase().includes('gemini')) || titles.includes('gemini')) {
            groupName = 'Gemini Development';
          } else if (keywords.some(k => k.toLowerCase().includes('react')) || titles.includes('react')) {
            groupName = 'React Development';
          } else if (keywords.some(k => k.toLowerCase().includes('python')) || titles.includes('python')) {
            groupName = 'Python Development';
          } else if (keywords.some(k => k.toLowerCase().includes('ai')) || titles.includes('ai') || titles.includes('artificial intelligence')) {
            groupName = 'AI Development';
          } else {
            // Use domain name + category
            const cleanDomain = domain.replace(/^www\./, '').split('.')[0];
            groupName = `${cleanDomain.charAt(0).toUpperCase() + cleanDomain.slice(1)} ${mainCategory}`;
          }
        }

        subGroups.push({
          groupName: groupName,
          color: this.getCategoryColor(groupName),
          tabs: domainTabs,
          confidence: domainTabs.reduce((sum, tab) => sum + (tab.confidence || 0), 0) / domainTabs.length
        });
      } else {
        // Single tabs from this domain, add to a general group if we have enough
        if (subGroups.length === 0) {
          subGroups.push({
            groupName: mainCategory,
            color: this.getCategoryColor(mainCategory),
            tabs: [domainTabs[0]],
            confidence: domainTabs[0].confidence || 0
          });
        } else {
          // Add to the last subgroup if it makes sense
          subGroups[subGroups.length - 1].tabs.push(domainTabs[0]);
        }
      }
    }

    return subGroups;
  }

  getCategoryColor(category) {
    const colorMap = {
      // Shopping
      'Amazon Shopping': 'orange',
      'eBay Shopping': 'yellow',
      'Shopping': 'green',
      
      // Development
      'GitHub Development': 'grey',
      'Stack Overflow Development': 'orange',
      'Chrome Development': 'blue',
      'Gemini Development': 'purple',
      'Gemini Nano Development': 'purple',
      'React Development': 'cyan',
      'Python Development': 'green',
      'AI Development': 'purple',
      'Development': 'cyan',
      
      // Documentation
      'MDN Documentation': 'blue',
      'Documentation': 'blue',
      
      // Social
      'Twitter Social': 'cyan',
      'Reddit Social': 'red',
      'LinkedIn Professional': 'blue',
      'Social': 'pink',
      
      // Entertainment
      'YouTube Entertainment': 'red',
      'Entertainment': 'red',
      
      // Work & General
      'Work': 'blue',
      'Research': 'purple',
      'News': 'orange',
      'Education': 'yellow'
    };
    
    // If exact match found, use it
    if (colorMap[category]) {
      return colorMap[category];
    }
    
    // Otherwise, try partial matches
    const categoryLower = category.toLowerCase();
    if (categoryLower.includes('shopping') || categoryLower.includes('amazon') || categoryLower.includes('ebay')) {
      return 'green';
    } else if (categoryLower.includes('development') || categoryLower.includes('github') || categoryLower.includes('code')) {
      return 'cyan';
    } else if (categoryLower.includes('social') || categoryLower.includes('twitter') || categoryLower.includes('reddit')) {
      return 'pink';
    } else if (categoryLower.includes('entertainment') || categoryLower.includes('youtube') || categoryLower.includes('video')) {
      return 'red';
    } else if (categoryLower.includes('documentation') || categoryLower.includes('docs')) {
      return 'blue';
    } else if (categoryLower.includes('news')) {
      return 'orange';
    } else if (categoryLower.includes('ai') || categoryLower.includes('gemini') || categoryLower.includes('machine learning')) {
      return 'purple';
    }
    
    // Default
    return 'grey';
  }

  async createGroups(groupSuggestions) {
    try {
      console.log('Creating groups:', groupSuggestions);
      const results = [];

      for (const suggestion of groupSuggestions) {
        try {
          console.log('Processing suggestion:', suggestion);
          console.log('Tabs in suggestion:', suggestion.tabs);

          // Extract tab IDs and verify they still exist
          const tabIds = [];
          for (const tab of suggestion.tabs) {
            try {
              // Verify tab still exists
              const currentTab = await chrome.tabs.get(tab.tabId);

              // Only include tabs that are currently ungrouped
              // to avoid accidentally removing tabs from existing groups
              if (currentTab.groupId === -1) {
                tabIds.push(tab.tabId);
              } else {
                console.log(`⚠️ Skipping tab ${tab.tabId} - already in group ${currentTab.groupId}`);
              }
            } catch (error) {
              console.warn(`Tab ${tab.tabId} no longer exists, skipping`);
            }
          }

          if (tabIds.length === 0) {
            console.log(`⚠️ No ungrouped tabs available for group "${suggestion.groupName}"`);
            results.push({
              name: suggestion.groupName,
              error: 'No ungrouped tabs available',
              success: false
            });
            continue;
          }

          console.log('Creating/updating group with tab IDs:', tabIds);

          // Check if this is adding to an existing group
          if (suggestion.isAddToExisting && suggestion.existingGroupId) {
            // Add tabs to existing group
            const group = await chrome.tabs.group({
              groupId: suggestion.existingGroupId,
              tabIds: tabIds
            });

            console.log('Added to existing group ID:', group);

            results.push({
              groupId: group,
              name: suggestion.groupName,
              tabCount: tabIds.length,
              success: true,
              addedToExisting: true
            });

            console.log(`✅ Added ${tabIds.length} tab(s) to existing group "${suggestion.groupName}"`);
          } else {
            // Create new tab group
            const group = await chrome.tabs.group({
              tabIds: tabIds
            });

            console.log('Created group ID:', group);

            // Update group properties
            await chrome.tabGroups.update(group, {
              title: suggestion.groupName,
              color: suggestion.color,
              collapsed: false
            });

            results.push({
              groupId: group,
              name: suggestion.groupName,
              tabCount: tabIds.length,
              success: true
            });

            console.log(`✅ Created group "${suggestion.groupName}" with ${tabIds.length} tabs`);
          }
        } catch (error) {
          console.error(`Error creating group "${suggestion.groupName}":`, error);
          results.push({
            name: suggestion.groupName,
            error: error.message,
            success: false
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Error creating groups:', error);
      return { error: error.message };
    }
  }

  async findDuplicateTabs() {
    try {
      const tabs = await chrome.tabs.query({});
      const duplicates = [];
      const urlMap = new Map();

      // Group tabs by URL
      tabs.forEach(tab => {
        const url = tab.url;
        if (!urlMap.has(url)) {
          urlMap.set(url, []);
        }
        urlMap.get(url).push(tab);
      });

      // Find URLs with multiple tabs
      urlMap.forEach((tabList, url) => {
        if (tabList.length > 1) {
          duplicates.push({
            url: url,
            title: tabList[0].title,
            tabs: tabList,
            count: tabList.length
          });
        }
      });

      return duplicates;
    } catch (error) {
      console.error('Error finding duplicates:', error);
      return { error: error.message };
    }
  }

  async generateGroupName(tabs) {
    try {
      console.log('Generating name for group with', tabs.length, 'tabs');

      if (!tabs || tabs.length === 0) {
        return { error: 'No tabs provided' };
      }

      // Ensure AI session exists
      if (!this.aiSession) {
        await this.createAISession();
      }

      if (!this.aiSession) {
        return { error: 'AI session not available' };
      }

      // Create prompt for AI
      const tabInfo = tabs.map(t => `- ${t.title} (${t.url})`).join('\n');

      const prompt = `Based on these ${tabs.length} browser tabs, suggest a short, descriptive group name (2-4 words max):

${tabInfo}

Provide only the group name, nothing else. Examples of good names: "Social Media", "Work Docs", "Shopping", "Dev Tools", "News & Articles"`;

      console.log('Sending prompt to AI for group name generation...');

      const response = await this.promptAI(prompt, `generate-name:${tabs.length}-tabs`);
      const groupName = response.trim();

      console.log('✓ Generated group name:', groupName);

      return { groupName };
    } catch (error) {
      console.error('Error generating group name:', error);
      return { error: error.message };
    }
  }
}

// Initialize the service worker
const betterTabsAI = new BetterTabsAI();