// Better Tabs AI - Service Worker
// Handles AI processing and tab management

// Import cache manager (inline since service workers don't support ES6 imports)
// Cache Manager - LRU cache with content-based invalidation (no TTL)
class CacheManager {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 100;
    this.cache = new Map();
    this.accessOrder = [];
    this.stats = { hits: 0, misses: 0, evictions: 0, invalidations: 0 };
  }

  generateKey(metadata, content = null) {
    const baseKey = `${metadata.url}_${metadata.title}`;
    if (content && content.excerpt) {
      const contentHash = this._simpleHash(content.excerpt.substring(0, 200));
      return `${baseKey}_${contentHash}`;
    }
    return baseKey;
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // No TTL check - cache is valid until content changes (detected by hash in key)
    // This allows cache to work indefinitely for unchanged pages
    entry.accessCount++;
    entry.lastAccess = Date.now();
    this._updateAccessOrder(key);
    this.stats.hits++;
    return entry.value;
  }

  set(key, value, options = {}) {
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
  }

  getStats() {
    return {
      ...this.stats,
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0
    };
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

  _simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
}

// AI Status enum and error messages
const AIStatus = {
  READY: 'ready',
  DOWNLOADING: 'downloading',
  DOWNLOAD_REQUIRED: 'download-required',
  FLAGS_DISABLED: 'flags-disabled',
  GPU_UNAVAILABLE: 'gpu-unavailable',
  STORAGE_FULL: 'storage-full',
  UNSUPPORTED_BROWSER: 'unsupported-browser',
  UNKNOWN_ERROR: 'unknown-error'
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
  }
};

// Pattern Detector - Inline version for service worker
// Detects relationships between tabs before AI analysis
const PatternDetector = {
  detectPatterns(tabs) {
    return {
      domainGroups: this.groupBySameDomain(tabs),
      subdomainGroups: this.groupBySameSubdomain(tabs),
      toolEcosystems: this.detectToolEcosystems(tabs),
      keywordMatches: this.detectKeywordMatches(tabs)
    };
  },

  groupBySameDomain(tabs) {
    const groups = {};
    tabs.forEach(tab => {
      const domain = this.extractDomain(tab.url);
      if (!groups[domain]) groups[domain] = [];
      groups[domain].push(tab);
    });
    return Object.entries(groups)
      .filter(([_, tabList]) => tabList.length >= 2)
      .map(([domain, tabList]) => ({ type: 'same-domain', domain, tabs: tabList, confidence: 0.9 }));
  },

  groupBySameSubdomain(tabs) {
    const groups = {};
    tabs.forEach(tab => {
      const subdomain = this.extractSubdomain(tab.url);
      if (subdomain) {
        if (!groups[subdomain]) groups[subdomain] = [];
        groups[subdomain].push(tab);
      }
    });
    return Object.entries(groups)
      .filter(([_, tabList]) => tabList.length >= 2)
      .map(([subdomain, tabList]) => ({ type: 'same-subdomain', subdomain, tabs: tabList, confidence: 0.7 }));
  },

  detectToolEcosystems(tabs) {
    const ecosystems = {
      'arr-stack': {
        keywords: ['radarr', 'sonarr', 'lidarr', 'prowlarr', 'autobrr', 'bazarr'],
        name: 'Media Server Tools',
        confidence: 0.95
      },
      'google-workspace': {
        keywords: ['docs.google', 'drive.google', 'mail.google', 'calendar.google', 'sheets.google'],
        name: 'Google Workspace',
        confidence: 0.95
      },
      'destiny-tools': {
        keywords: ['destinyitemmanager', 'braytech', 'light.gg', 'd2gunsmith'],
        name: 'Destiny Tools',
        confidence: 0.9
      },
      'development': {
        keywords: ['github', 'gitlab', 'stackoverflow', 'code.visualstudio'],
        name: 'Development Tools',
        confidence: 0.85
      }
    };

    const detected = [];
    for (const [ecosystemId, ecosystem] of Object.entries(ecosystems)) {
      const matchingTabs = tabs.filter(tab => {
        const url = tab.url.toLowerCase();
        const title = tab.title.toLowerCase();
        return ecosystem.keywords.some(keyword => url.includes(keyword) || title.includes(keyword));
      });
      if (matchingTabs.length >= 2) {
        detected.push({
          type: 'tool-ecosystem',
          ecosystem: ecosystemId,
          name: ecosystem.name,
          tabs: matchingTabs,
          confidence: ecosystem.confidence
        });
      }
    }
    return detected;
  },

  detectKeywordMatches(tabs) {
    // Find tabs with overlapping keywords in title
    const keywordGroups = new Map();
    tabs.forEach(tab => {
      const keywords = this.extractKeywords(tab.title);
      keywords.forEach(keyword => {
        if (!keywordGroups.has(keyword)) keywordGroups.set(keyword, []);
        keywordGroups.get(keyword).push(tab);
      });
    });

    return Array.from(keywordGroups.entries())
      .filter(([_, tabList]) => tabList.length >= 2)
      .map(([keyword, tabList]) => ({ type: 'keyword-match', keyword, tabs: tabList, confidence: 0.6 }));
  },

  extractKeywords(title) {
    if (!title) return [];
    // Extract meaningful words (3+ chars, not common words)
    const commonWords = ['the', 'and', 'for', 'with', 'from', 'about', 'this', 'that', 'page'];
    return title.toLowerCase()
      .split(/\W+/)
      .filter(word => word.length >= 3 && !commonWords.includes(word))
      .slice(0, 5);
  },

  extractDomain(url) {
    try {
      return new URL(url).hostname;
    } catch {
      return null;
    }
  },

  extractSubdomain(url) {
    try {
      const parts = new URL(url).hostname.split('.');
      return parts.length >= 2 ? parts.slice(-2).join('.') : null;
    } catch {
      return null;
    }
  },

  calculatePatternBoost(tab, patterns) {
    let boost = 0;
    patterns.domainGroups?.forEach(group => {
      if (group.tabs.some(t => t.id === tab.id)) boost += 0.3;
    });
    patterns.toolEcosystems?.forEach(group => {
      if (group.tabs.some(t => t.id === tab.id)) boost += 0.4;
    });
    patterns.keywordMatches?.forEach(group => {
      if (group.tabs.some(t => t.id === tab.id)) boost += 0.1;
    });
    return Math.min(boost, 0.5);
  }
};

// Default Settings (Phase E)
const DEFAULT_SETTINGS = {
  // AI Analysis Settings
  aiAggressiveness: 0.6,           // 0.5 (aggressive) - 0.9 (conservative)
  minConfidenceThreshold: 0.5,     // Minimum confidence to show suggestion (lowered from 0.6)
  correlationMode: 'similar',      // 'exact' | 'similar' | 'loose'
  maxSuggestions: 10,              // Maximum suggestions to show
  minTabsForSuggestion: 2,         // Minimum tabs needed to suggest a group

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
    this.cacheManager = new CacheManager({ maxSize: 100 });
    this.settings = { ...DEFAULT_SETTINGS }; // Initialize with defaults
    this.analysisInProgress = false;
    this.analysisProgress = { current: 0, total: 0, status: 'idle' };
    this.init();
  }

  async init() {
    console.log('Better Tabs AI: Initializing...');
    await this.loadSettings(); // Load user settings from storage
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
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get('betterTabsSettings');
      if (result.betterTabsSettings) {
        this.settings = { ...DEFAULT_SETTINGS, ...result.betterTabsSettings };
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

    // Listen for tab updates and invalidate cache
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.url) {
        // Tab finished loading - invalidate cache for this URL
        const invalidated = this.cacheManager.invalidateByUrl(tab.url);
        if (invalidated > 0) {
          console.log(`Cache invalidated for ${tab.url}: ${invalidated} entries`);
        }
      }
    });

    // Listen for tab removal to clean up cache
    chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
      // Cache will naturally expire, but we could add cleanup here if needed
    });
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
          this.cacheManager.clear();
          await chrome.storage.local.remove(['lastAnalysisResults', 'lastAnalysisTime', 'lastAnalysisTabCount']);
          console.log('🧹 Analysis cache cleared (including stored results)');
          sendResponse({ success: true, stats: this.cacheManager.getStats() });
          break;

        case 'getCacheStats':
          sendResponse({ stats: this.cacheManager.getStats() });
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
            results: stored.lastAnalysisResults || null,
            timestamp: stored.lastAnalysisTime || null
          });
          break;

        case 'getSettings':
          sendResponse({ settings: this.settings });
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
        const stored = await chrome.storage.local.get(['lastAnalysisResults', 'lastAnalysisTime', 'lastAnalysisTabCount']);
        if (stored.lastAnalysisResults && stored.lastAnalysisTime) {
          const age = Date.now() - stored.lastAnalysisTime;
          const tabCountChanged = stored.lastAnalysisTabCount !== groupableTabs.length;

          // Use cached results if tab count hasn't changed and cache is valid
          if (!tabCountChanged && stored.lastAnalysisResults && stored.lastAnalysisResults.analyses) {
            console.log('✅ Using cached analysis results (age:', Math.round(age / 1000), 'seconds, tab count unchanged)');
            return {
              ...stored.lastAnalysisResults,
              cached: true,
              cacheAge: age,
              message: `Using cached analysis (${Math.round(age / 1000)}s old)`
            };
          } else if (tabCountChanged) {
            console.log('🔄 Tab count changed:', stored.lastAnalysisTabCount, '→', groupableTabs.length, '- refreshing analysis');
          } else {
            console.log('🗑️ Cached results invalid, refreshing analysis');
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
    const results = {
      totalTabs: tabs.length,
      analyses: [],
      suggestions: [],
      cacheStats: this.cacheManager.getStats()
    };

    // Use concurrent queue - maintain N concurrent tasks, add new one as each completes
    const MAX_CONCURRENT = this.settings.maxConcurrentAnalysis || 5;
    const queue = [...tabs]; // Copy array
    const inProgress = new Set();
    let completed = 0;

    const analyzeWithTimeout = async (tab) => {
      try {
        const analysisPromise = this.analyzeTab(tab.id, tab);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Analysis timeout')), 30000)
        );

        const analysis = await Promise.race([analysisPromise, timeoutPromise]);

        if (analysis && !analysis.error && !analysis.fallback) {
          return {
            tabId: tab.id,
            ...analysis
          };
        }
        return null;
      } catch (error) {
        if (error.message === 'Analysis timeout') {
          console.warn(`⏱️ Timeout analyzing tab ${tab.id}: ${tab.title}`);
        } else {
          console.error(`Error analyzing tab ${tab.id}:`, error);
        }
        return null;
      }
    };

    const processNext = async () => {
      while (queue.length > 0 || inProgress.size > 0) {
        // Fill up to MAX_CONCURRENT tasks
        while (queue.length > 0 && inProgress.size < MAX_CONCURRENT) {
          const tab = queue.shift();
          const promise = analyzeWithTimeout(tab).then(result => {
            inProgress.delete(promise);
            completed++;
            this.analysisProgress.current = completed;
            console.log(`Progress: ${completed}/${this.analysisProgress.total}`);

            if (result) {
              results.analyses.push(result);
            }
            return result;
          });
          inProgress.add(promise);
        }

        // Wait for at least one to complete before continuing
        if (inProgress.size > 0) {
          await Promise.race(inProgress);
        }
      }
    };

    await processNext();

    // Generate grouping suggestions
    if (results.analyses.length > 0) {
      this.analysisProgress.status = 'grouping';
      const suggestionResult = await this.suggestGroups(results.analyses);
      results.suggestions = suggestionResult.suggestions;
      results.existingGroups = suggestionResult.existingGroups;
    }

    // Update cache stats
    results.cacheStats = this.cacheManager.getStats();

    // Store results for popup to retrieve
    await chrome.storage.local.set({
      lastAnalysisResults: results,
      lastAnalysisTime: Date.now(),
      lastAnalysisTabCount: tabs.length
    });

    this.analysisInProgress = false;
    this.analysisProgress.status = 'complete';

    console.log('✅ Background analysis complete:', results);
    return results;
  }

  async analyzeTab(tabId, tabData = null) {
    try {
      // Get tab data if not provided
      if (!tabData) {
        tabData = await chrome.tabs.get(tabId);
      }

      // Start with metadata analysis (staged approach)
      const metadata = {
        title: tabData.title || '',
        url: tabData.url || '',
        domain: this.extractDomain(tabData.url),
        favIconUrl: tabData.favIconUrl || ''
      };

      // Try to get additional content if metadata isn't sufficient
      let content = '';
      try {
        const contentResult = await chrome.scripting.executeScript({
          target: { tabId: tabId },
          function: this.extractPageContent
        });
        content = contentResult[0]?.result || '';
      } catch (error) {
        console.log('Could not extract content from tab:', error.message);
      }

      // Generate cache key with content hash
      const cacheKey = this.cacheManager.generateKey(metadata, content);

      // Check cache first
      const cached = this.cacheManager.get(cacheKey);
      if (cached) {
        console.log('✅ Cache hit for:', tabData.title);
        return cached;
      }

      console.log('❌ Cache miss for:', tabData.title);
      const analysis = await this.performAIAnalysis(metadata, content);

      // Cache the result
      this.cacheManager.set(cacheKey, analysis);

      return analysis;
    } catch (error) {
      console.error('Error analyzing tab:', error);
      return { error: error.message };
    }
  }

  extractDomain(url) {
    try {
      return new URL(url).hostname;
    } catch {
      return '';
    }
  }

  // This function runs in the context of the web page
  extractPageContent() {
    try {
      // Get meta description
      const metaDesc = document.querySelector('meta[name="description"]')?.content || '';
      
      // Get first 500 characters of text content
      const textContent = document.body?.innerText || '';
      const excerpt = textContent.substring(0, 500);
      
      // Get page headings
      const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
        .map(h => h.textContent?.trim())
        .filter(text => text && text.length > 0)
        .slice(0, 5);

      return {
        metaDescription: metaDesc,
        excerpt: excerpt,
        headings: headings
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  async performAIAnalysis(metadata, content) {
    try {
      // Ensure we have an AI session
      if (!this.aiSession) {
        console.log('No AI session available, attempting to create one...');
        try {
          await this.createAISession();
        } catch (error) {
          console.error('Failed to create AI session:', error);
          return this.createFallbackAnalysis(metadata);
        }
      }

      // If still no session, use fallback
      if (!this.aiSession) {
        console.log('AI session unavailable, using fallback analysis');
        return this.createFallbackAnalysis(metadata);
      }

      // Build the analysis prompt
      const prompt = `Analyze this web page and categorize it for intelligent tab grouping:

Title: ${metadata.title}
URL: ${metadata.url}
Domain: ${metadata.domain}
${content.metaDescription ? `Description: ${content.metaDescription}` : ''}
${content.excerpt ? `Content excerpt: ${content.excerpt}` : ''}
${content.headings?.length ? `Headings: ${content.headings.join(', ')}` : ''}

CRITICAL INSTRUCTIONS for categorization:

1. **Domain Similarity is Key**: If the domain matches other tabs, they should likely be grouped together
   - Same exact domain = very likely related (amazon.com tabs go together)
   - Same parent domain = likely related (docs.google.com and drive.google.com)

2. **Recognize Tool Ecosystems**: Look for these common patterns:
   - Media servers: Radarr, Sonarr, Lidarr, Prowlarr, autobrr (→ "Media Server Tools")
   - Google services: Docs, Drive, Gmail, Calendar (→ "Google Workspace")
   - Game tools: DIM, Braytech, light.gg (→ "Destiny Tools" or game name)
   - Development: GitHub, GitLab, Stack Overflow (→ "Development Tools")

3. **Shopping & Search Relationships**: Recognize when tabs are about the same topic
   - "ladder stabilizers" search + Home Depot "Ladder Accessories" = both about ladders/home improvement
   - Group by shopping topic, not just store: "Ladder Shopping" or "Home Improvement Shopping"

4. **Specific Categories** - Include identifying details:
   - Shopping: "{Store} Shopping" or "{Topic} Shopping" (e.g., "Ladder Shopping", "Amazon Electronics")
   - Development: "{Technology} Development" (e.g., "React Development", "Python Development")
   - Documentation: "{Technology} Docs" (e.g., "Chrome API Docs", "React Docs")
   - Social: "{Platform} Social" (e.g., "Twitter", "LinkedIn")

5. **Specific is Better**: Include identifying details in categories
   - Shopping: "{Topic} Shopping" or "{Store} Shopping"
   - Development: "{Technology} Development"
   - Documentation: "{Technology} Docs"
   - Tools: "{Tool Name}" or "{Purpose} Tools"

Examples of GOOD categorization:
- Home Depot page about ladders → category: "Home Improvement Shopping"
- Google search "ladder stabilizers" → category: "Shopping Results"
- Radarr web UI → category: "Media Server Tools"
- DIM (Destiny Item Manager) → category: "Destiny Tools"
- GitHub repo page → category: "Development Tools"

IMPORTANT: Respond with ONLY the raw JSON object, without any markdown formatting, code blocks, or explanatory text.

Provide a JSON response with this exact structure:
{
  "category": "specific category that emphasizes relationships and grouping potential",
  "subcategory": "even more specific if needed",
  "summary": "brief 1-sentence summary emphasizing topic/purpose",
  "confidence": 0.7
}`;

      // Use the persistent service worker AI session
      console.log('Sending prompt to AI session...');
      const response = await this.aiSession.prompt(prompt);
      console.log('Received AI response (length:', response.length, '):', response.substring(0, 100) + '...');

      // Warn if response seems truncated
      if (response.length < 50) {
        console.warn('⚠️ Response seems unusually short, may be truncated');
      }

      // Parse the response (handle markdown code blocks)
      try {
        const parsed = this.extractJSON(response);
        return {
          ...parsed,
          domain: metadata.domain,
          title: metadata.title,
          url: metadata.url
        };
      } catch (parseError) {
        console.error('Error parsing AI response:', parseError);
        console.error('Raw response:', response);
        return this.createFallbackAnalysis(metadata);
      }
    } catch (error) {
      console.error('Error in AI analysis:', error);

      // If session was destroyed or became invalid, try to recreate it once
      if (error.message?.includes('session') || error.message?.includes('Session')) {
        console.log('AI session may be invalid, attempting to recreate...');
        this.aiSession = null;
        try {
          await this.createAISession();
          // Retry the analysis once with new session
          return await this.performAIAnalysis(metadata, content);
        } catch (recreateError) {
          console.error('Failed to recreate session:', recreateError);
        }
      }

      return this.createFallbackAnalysis(metadata);
    }
  }

  extractJSON(text) {
    // Handle markdown code blocks that wrap JSON
    // Common patterns: ```json\n{...}\n``` or ```\n{...}\n``` or just {...}

    if (!text || text.trim().length === 0) {
      throw new Error('Empty response from AI');
    }

    // First try to extract from markdown code blocks
    const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)(?:\n?```|$)/);
    if (codeBlockMatch) {
      let jsonText = codeBlockMatch[1].trim();

      // If JSON appears incomplete (missing closing brace), try to complete it
      const openBraces = (jsonText.match(/\{/g) || []).length;
      const closeBraces = (jsonText.match(/\}/g) || []).length;
      if (openBraces > closeBraces) {
        jsonText += '\n}'.repeat(openBraces - closeBraces);
      }

      if (jsonText.length > 0) {
        try {
          return JSON.parse(jsonText);
        } catch (e) {
          console.warn('Failed to parse markdown code block JSON:', e.message);
          console.warn('Extracted text:', jsonText.substring(0, 200));
        }
      }
    }

    // Try to find the most complete JSON object
    // Use greedy matching to get the longest valid JSON
    const jsonMatches = text.matchAll(/\{[^\}]*\}/g);
    const matches = Array.from(jsonMatches);

    // Try parsing from longest to shortest match
    for (const match of matches.sort((a, b) => b[0].length - a[0].length)) {
      try {
        const parsed = JSON.parse(match[0]);
        // Validate it has expected fields
        if (parsed.category || parsed.summary) {
          return parsed;
        }
      } catch (e) {
        // Try next match
      }
    }

    // Try to find any JSON-like object with nested braces
    const nestedMatch = text.match(/\{[\s\S]*\}/);
    if (nestedMatch) {
      try {
        return JSON.parse(nestedMatch[0]);
      } catch (e) {
        console.warn('Failed to parse nested JSON:', e.message);
        console.warn('Text preview:', nestedMatch[0].substring(0, 200));
      }
    }

    // Last resort: try to parse the entire text as JSON
    try {
      return JSON.parse(text);
    } catch (e) {
      console.error('All JSON extraction methods failed');
      console.error('Response length:', text.length);
      console.error('Response preview:', text.substring(0, 300));
      throw new Error(`Unable to extract valid JSON from AI response: ${e.message}`);
    }
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

  async suggestGroups(analyses) {
    try {
      if (!this.aiSession) {
        await this.createAISession();
      }

      console.log('📊 Suggesting groups from', analyses.length, 'analyses using AI');

      // Prepare tab summaries for AI (focus on content, not domains)
      const tabSummaries = analyses.map(a => ({
        id: a.tabId,
        title: a.title,
        category: a.category,
        subcategory: a.subcategory,
        summary: a.summary,
        confidence: a.confidence
      }));

      // Ask AI to suggest groupings based on semantic similarity
      const groupingPrompt = `You are analyzing browser tabs to suggest logical groupings. Focus on CONTENT and PURPOSE, not domain names.

Here are the tabs:
${tabSummaries.map((t, i) => `${i + 1}. "${t.title}" - ${t.category}${t.subcategory ? ' > ' + t.subcategory : ''}: ${t.summary}`).join('\n')}

Suggest 2-${this.settings.maxSuggestions} meaningful groups based on:
- Shared topics/purposes (e.g., "Real Estate Search", "Woodworking Projects", "Social Media")
- Work context (e.g., "Shopping", "Research", "Development")
- Related activities (NOT just same domain)

AVOID generic names like "Www Tabs", "Domain Tabs", "Tools" - be specific about the PURPOSE.
Each group must have 2+ tabs. Tabs can only be in ONE group.

Return JSON array:
[
  {
    "groupName": "specific descriptive name",
    "reason": "why these tabs belong together",
    "tabIndices": [1, 3, 5],
    "confidence": 0.8
  }
]`;

      console.log('🤖 Asking AI to suggest groups...');
      const aiResponse = await this.aiSession.prompt(groupingPrompt);
      const groupSuggestions = this.extractJSON(aiResponse);

      if (!groupSuggestions || !Array.isArray(groupSuggestions)) {
        console.warn('AI did not return valid group suggestions, falling back to category grouping');
        return this.fallbackCategoryGrouping(analyses);
      }

      console.log(`🎯 AI suggested ${groupSuggestions.length} groups`);

      // Convert AI suggestions to our format
      const suggestions = groupSuggestions.map(g => {
        const tabs = (g.tabIndices || [])
          .map(idx => tabSummaries[idx - 1]) // Convert 1-based to 0-based
          .map(ts => analyses.find(a => a.tabId === ts.id))
          .filter(Boolean);

        return {
          groupName: g.groupName,
          color: this.getCategoryColor(g.groupName),
          tabs: tabs,
          confidence: g.confidence || 0.7,
          reason: g.reason
        };
      }).filter(s => s.tabs.length >= 2); // Remove groups with <2 tabs

      console.log(`✅ Generated ${suggestions.length} AI-suggested groups`);

      // Get existing groups for debugging
      const existingGroups = await this.getExistingGroupInfo();

      // Filter by minimum confidence threshold
      const filtered = suggestions.filter(s =>
        s.confidence >= this.settings.minConfidenceThreshold &&
        s.tabs &&
        s.tabs.length >= 2
      );
      console.log(`🎯 Filtered to ${filtered.length} suggestions (threshold: ${this.settings.minConfidenceThreshold}, min 2 tabs)`);

      // Sort by confidence and tab count
      filtered.sort((a, b) => {
        const scoreA = a.tabs.length * a.confidence;
        const scoreB = b.tabs.length * b.confidence;
        return scoreB - scoreA;
      });

      // Limit to maxSuggestions
      const limited = filtered.slice(0, this.settings.maxSuggestions);
      console.log(`📋 Returning ${limited.length} suggestions (max: ${this.settings.maxSuggestions})`);

      // Remove overlapping suggestions - keep only the highest confidence suggestion for each tab
      const deduplicated = this.deduplicateSuggestions(limited);
      console.log(`🔀 Deduplicated to ${deduplicated.length} non-overlapping suggestions`);

      // Transform suggestions to use tabIds instead of tabs array
      const transformed = deduplicated.map(s => {
        // Analysis objects have 'tabId' property, not 'id'
        const tabIds = (s.tabs || []).map(t => t.tabId || t.id).filter(Boolean);
        console.log(`Transforming suggestion "${s.groupName}":`, {
          originalTabs: s.tabs?.length || 0,
          tabIds: tabIds,
          tabIdsLength: tabIds.length
        });
        return {
          groupName: s.groupName,
          color: s.color,
          confidence: s.confidence,
          tabIds: tabIds,
          isAddToExisting: s.isAddToExisting,
          existingGroupId: s.existingGroupId
        };
      }).filter(s => s.tabIds && s.tabIds.length > 0);

      console.log('Final transformed suggestions:', transformed.map(s => ({
        name: s.groupName,
        tabIds: s.tabIds
      })));

      // Return both suggestions and existing groups info for debugging
      return {
        suggestions: transformed,
        existingGroups: existingGroups.map(g => ({
          title: g.title,
          tabCount: g.tabCount
        })),
        settings: {
          minConfidenceThreshold: this.settings.minConfidenceThreshold,
          maxSuggestions: this.settings.maxSuggestions
        }
      };
    } catch (error) {
      console.error('Error suggesting groups:', error);
      return { suggestions: [], existingGroups: [] };
    }
  }

  createSuggestionsFromPatterns(patterns, analyses) {
    const suggestions = [];

    // Tool ecosystems get highest priority
    patterns.toolEcosystems?.forEach(ecosystem => {
      const tabs = ecosystem.tabs.map(t => analyses.find(a => a.tabId === t.id)).filter(Boolean);
      if (tabs.length >= 2) {
        suggestions.push({
          groupName: ecosystem.name,
          color: this.getCategoryColor(ecosystem.name),
          tabs: tabs,
          confidence: ecosystem.confidence,
          source: 'pattern-ecosystem'
        });
      }
    });

    // Domain groups (same exact domain)
    patterns.domainGroups?.forEach(group => {
      const tabs = group.tabs.map(t => analyses.find(a => a.tabId === t.id)).filter(Boolean);
      if (tabs.length >= 2) {
        const domainName = group.domain.split('.')[0];
        const capitalizedName = domainName.charAt(0).toUpperCase() + domainName.slice(1);
        suggestions.push({
          groupName: `${capitalizedName} Tabs`,
          color: this.getCategoryColor('default'),
          tabs: tabs,
          confidence: group.confidence,
          source: 'pattern-domain'
        });
      }
    });

    // Keyword matches (shared keywords in titles)
    patterns.keywordMatches?.forEach(group => {
      const tabs = group.tabs.map(t => analyses.find(a => a.tabId === t.id)).filter(Boolean);
      if (tabs.length >= 3) { // Higher threshold for keyword matches
        const keyword = group.keyword.charAt(0).toUpperCase() + group.keyword.slice(1);
        suggestions.push({
          groupName: `${keyword} Related`,
          color: this.getCategoryColor('default'),
          tabs: tabs,
          confidence: group.confidence,
          source: 'pattern-keyword'
        });
      }
    });

    return suggestions;
  }

  fallbackCategoryGrouping(analyses) {
    // Simple fallback: group by category
    console.log('📋 Using fallback category grouping');
    const categoryGroups = {};
    analyses.forEach(a => {
      const cat = a.category || 'Uncategorized';
      if (!categoryGroups[cat]) categoryGroups[cat] = [];
      categoryGroups[cat].push(a);
    });

    const suggestions = Object.entries(categoryGroups)
      .filter(([_, tabs]) => tabs.length >= 2)
      .map(([category, tabs]) => ({
        groupName: category,
        color: this.getCategoryColor(category),
        tabs: tabs,
        confidence: tabs.reduce((sum, t) => sum + (t.confidence || 0.5), 0) / tabs.length
      }));

    return {
      suggestions: suggestions.slice(0, this.settings.maxSuggestions).map(s => ({
        groupName: s.groupName,
        color: s.color,
        confidence: s.confidence,
        tabIds: s.tabs.map(t => t.tabId)
      })),
      existingGroups: []
    };
  }

  deduplicateSuggestions(suggestions) {
    // Track which tabs are assigned to which suggestion (with confidence)
    const tabAssignments = new Map(); // tabId -> { suggestionIndex, confidence }

    // First pass: track all tab assignments
    suggestions.forEach((suggestion, index) => {
      (suggestion.tabs || []).forEach(tab => {
        const tabId = tab.tabId || tab.id;
        if (!tabId) return;

        const existing = tabAssignments.get(tabId);
        if (!existing || suggestion.confidence > existing.confidence) {
          tabAssignments.set(tabId, { suggestionIndex: index, confidence: suggestion.confidence });
        }
      });
    });

    // Second pass: filter each suggestion to only include tabs assigned to it
    const deduplicated = suggestions.map((suggestion, index) => {
      const assignedTabs = (suggestion.tabs || []).filter(tab => {
        const tabId = tab.tabId || tab.id;
        const assignment = tabAssignments.get(tabId);
        return assignment && assignment.suggestionIndex === index;
      });

      return {
        ...suggestion,
        tabs: assignedTabs
      };
    }).filter(s => s.tabs.length >= 2); // Remove suggestions with less than 2 tabs

    return deduplicated;
  }

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

      const response = await this.aiSession.prompt(prompt);
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