// Better Tabs AI - Service Worker
// Handles AI processing and tab management

// Removed: CacheManager class - no longer needed with simple hash-based caching

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

// CacheManager - LRU cache for tab summaries
class CacheManager {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 100;
    this.cache = new Map();
    this.accessOrder = [];
    this.stats = { hits: 0, misses: 0, evictions: 0, invalidations: 0 };
  }

  generateKey(metadata) {
    return `${metadata.url}_${metadata.title}`;
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
}

// Default Settings (Phase E)
const DEFAULT_AI_PROMPT_RULES = `CRITICAL RULES:
1. **TOPIC MATCHING**: Tabs MUST be about the SAME specific topic/activity to be grouped
   - ❌ BAD: "Google Messages" + "Zillow house listings" (completely different purposes)
   - ✅ GOOD: Multiple Zillow tabs about the same area

2. **MESSAGING APPS EXCEPTION**:
   - Messages, WhatsApp, Telegram, Discord, Slack → Group ONLY by app name
   - ❌ DON'T read conversation titles or message content
   - ✅ Just use app name: "Discord", "Messages", etc.

3. **RESPECT TOPIC BOUNDARIES**:
   - If there's a "Woodworking" group, ALL woodworking tabs go there
   - Don't split related tabs across multiple groups
   - Check ALL tabs before creating a new group for a topic

4. **DOMAIN ≠ TOPIC**:
   - Same domain doesn't mean same group (Reddit has millions of topics)
   - Different domains CAN be same group (shopping across multiple stores)

5. **PER-TAB CONFIDENCE** (0.0-1.0):
   - 0.9-1.0: Perfectly fits the group topic
   - 0.7-0.8: Strongly related
   - 0.5-0.6: Somewhat related
   - <0.5: Probably doesn't belong

Examples:
✅ GOOD: "Woodworking Projects" = [Woodworking Reddit, DIY table saw tips, Router jig plans]
❌ BAD: "Home & DIY" = [Messages for Web, House listings, Woodworking]
✅ GOOD: "Messages" = [All Messages tabs regardless of conversations]
❌ BAD: "House Hunting Messages" = [Messages + Zillow]`;

const DEFAULT_SETTINGS = {
  // AI Analysis Settings
  aiAggressiveness: 0.6,           // 0.5 (aggressive) - 0.9 (conservative)
  minConfidenceThreshold: 0.5,     // Minimum group confidence to show suggestion
  minTabConfidence: 0.5,           // Minimum per-tab confidence to include in group
  correlationMode: 'similar',      // 'exact' | 'similar' | 'loose'
  maxSuggestions: 10,              // Maximum suggestions to show
  minTabsForSuggestion: 2,         // Minimum tabs needed to suggest a group
  customAIPromptRules: DEFAULT_AI_PROMPT_RULES, // Customizable AI prompt rules

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
          await chrome.storage.local.remove(['lastAnalysisResults', 'lastAnalysisTime', 'lastTabsHash']);
          this.summaryCache.clear();
          console.log('🧹 Analysis cache and summary cache cleared');
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

  async generateTabSummary(tab) {
    // Generate a concise, context-rich summary for a tab
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

    try {
      if (!this.aiSession) {
        await this.createAISession();
      }

      // Try to extract page content (metadata + text excerpt)
      let pageContent = null;
      try {
        const contentResult = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            try {
              // Get meta description
              const metaDesc = document.querySelector('meta[name="description"]')?.content ||
                              document.querySelector('meta[property="og:description"]')?.content || '';

              // Get page headings (h1, h2)
              const headings = Array.from(document.querySelectorAll('h1, h2'))
                .map(h => h.textContent?.trim())
                .filter(text => text && text.length > 0 && text.length < 100)
                .slice(0, 5);

              // Get first 300 characters of visible text content
              const textContent = document.body?.innerText || '';
              const excerpt = textContent.substring(0, 300).replace(/\s+/g, ' ').trim();

              return {
                description: metaDesc,
                headings: headings,
                excerpt: excerpt
              };
            } catch (error) {
              return { error: error.message };
            }
          }
        });
        pageContent = contentResult[0]?.result;
      } catch (error) {
        // Expected for Chrome system pages (chrome://, chrome-extension://, etc.)
        // These pages are restricted and cannot be accessed by extensions
      }

      // Build prompt with available context
      let promptParts = [`Title: "${metadata.title}"`];

      // Add domain and path
      if (metadata.path && metadata.path.length > 1 && metadata.path.length < 50) {
        promptParts.push(`URL: ${metadata.domain}${metadata.path}`);
      } else {
        promptParts.push(`Domain: ${metadata.domain}`);
      }

      // Add metadata if available (budget ~500 chars total for metadata+content)
      if (pageContent) {
        if (pageContent.description) {
          promptParts.push(`Description: ${pageContent.description.substring(0, 150)}`);
        }
        if (pageContent.headings && pageContent.headings.length > 0) {
          promptParts.push(`Headings: ${pageContent.headings.slice(0, 3).join(', ')}`);
        }
        if (pageContent.excerpt) {
          // Only include excerpt if we have token budget (~200 chars)
          promptParts.push(`Content excerpt: ${pageContent.excerpt.substring(0, 200)}`);
        }
      }

      const prompt = `Summarize this web page in 10-15 words, focusing on the main topic/purpose.

${promptParts.join('\n')}

Respond with ONLY the summary, no extra text. Focus on what the page is ABOUT, not what it IS.
Examples:
- "GitHub - Repository: Code editor plugin development"
- "Reddit discussion: Dog training techniques for puppies"
- "Amazon product: Wireless keyboard with backlight"
- "Stack Overflow: JavaScript async/await error handling"`;

      const summary = await this.aiSession.prompt(prompt);
      const cleanSummary = summary.trim();

      // Cache the result
      this.summaryCache.set(cacheKey, cleanSummary);

      return cleanSummary;
    } catch (error) {
      console.error('Error generating tab summary:', error);
      // Fallback to domain + title if AI fails
      return `${metadata.domain}: ${metadata.title.substring(0, 50)}`;
    }
  }

  extractDomain(url) {
    try {
      return new URL(url).hostname;
    } catch {
      return '';
    }
  }

  extractPath(url) {
    try {
      const urlObj = new URL(url);
      // Get pathname without query string or hash
      // e.g., "/woodburn-or/" from the Zillow URL
      return urlObj.pathname;
    } catch {
      return '';
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
      const summary = await this.generateTabSummary(t);
      this.analysisProgress.current = index + 1;
      return {
        id: t.id,
        title: t.title,
        url: t.url,
        domain: this.extractDomain(t.url),
        summary: summary // AI-generated concise summary
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
      existingGroups: suggestionResult.existingGroups || []
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

      // If JSON appears incomplete (missing closing brackets/braces), try to complete it
      const openBrackets = (jsonText.match(/\[/g) || []).length;
      const closeBrackets = (jsonText.match(/\]/g) || []).length;
      const openBraces = (jsonText.match(/\{/g) || []).length;
      const closeBraces = (jsonText.match(/\}/g) || []).length;

      // Complete missing braces and brackets
      if (openBraces > closeBraces) {
        jsonText += '\n  }'.repeat(openBraces - closeBraces);
      }
      if (openBrackets > closeBrackets) {
        jsonText += '\n]'.repeat(openBrackets - closeBrackets);
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

    // Try to find JSON array starting with [
    const arrayMatch = text.match(/\[([\s\S]*?)(?:\]|$)/);
    if (arrayMatch) {
      let jsonText = '[' + arrayMatch[1];

      // Complete incomplete JSON array
      const openBraces = (jsonText.match(/\{/g) || []).length;
      const closeBraces = (jsonText.match(/\}/g) || []).length;
      const openBrackets = (jsonText.match(/\[/g) || []).length;
      const closeBrackets = (jsonText.match(/\]/g) || []).length;

      if (openBraces > closeBraces) {
        jsonText += '\n  }'.repeat(openBraces - closeBraces);
      }
      if (openBrackets > closeBrackets) {
        jsonText += '\n]'.repeat(openBrackets - closeBrackets);
      }

      try {
        return JSON.parse(jsonText);
      } catch (e) {
        console.warn('Failed to parse array JSON:', e.message);
      }
    }

    // Try to find JSON object starting with {
    const objectMatch = text.match(/\{([\s\S]*?)(?:\}|$)/);
    if (objectMatch) {
      let jsonText = '{' + objectMatch[1];

      // Complete incomplete JSON object
      const openBraces = (jsonText.match(/\{/g) || []).length;
      const closeBraces = (jsonText.match(/\}/g) || []).length;

      if (openBraces > closeBraces) {
        jsonText += '\n}'.repeat(openBraces - closeBraces);
      }

      try {
        return JSON.parse(jsonText);
      } catch (e) {
        console.warn('Failed to parse object JSON:', e.message);
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

  async suggestGroupsDirect(tabData, existingGroups = []) {
    try {
      if (!this.aiSession) {
        await this.createAISession();
      }

      console.log('📊 Suggesting groups from', tabData.length, 'tabs using single AI call');

      // Ask AI to suggest groupings based on semantic similarity using summaries
      const groupingPrompt = `Analyze these browser tabs and suggest logical groupings based on their SUMMARIES.

Tabs:
${tabData.map((t, i) => `${i + 1}. ${t.summary} (${t.domain})`).join('\n')}

${this.settings.customAIPromptRules || DEFAULT_AI_PROMPT_RULES}

Aggressiveness: ${this.settings.aggressiveness}
- "conservative": Only group tabs that are VERY clearly related (confidence >= 0.8)
- "moderate": Group tabs that are likely related (confidence >= 0.6)
- "aggressive": Group tabs that might be related (confidence >= 0.4)

IMPORTANT: Keep response CONCISE - you may hit token limits!

Return COMPACT JSON array:
[{"name":"Group Name","tabs":[{"i":1,"c":0.9},{"i":3,"c":0.8}],"conf":0.85}]

Keys: name=groupName, tabs=array of {i:index,c:confidence}, conf=groupConfidence`;

      console.log('🤖 Asking AI to suggest groups...');
      const aiResponse = await this.aiSession.prompt(groupingPrompt);
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
      }).filter(s => s.tabs.length >= 2); // Remove groups with <2 tabs

      console.log(`✅ Generated ${suggestions.length} AI-suggested groups`);

      // Filter by minimum confidence threshold
      const filtered = suggestions.filter(s =>
        s.confidence >= this.settings.minConfidenceThreshold &&
        s.tabs &&
        s.tabs.length >= 2
      );
      console.log(`🎯 Filtered to ${filtered.length} suggestions (threshold: ${this.settings.minConfidenceThreshold})`);

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
      console.error('Error suggesting groups:', error);
      return { suggestions: [], existingGroups: [] };
    }
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

      const aiResponse = await this.aiSession.prompt(prompt);
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
    return suggestions.map((suggestion, index) => {
      const assignedTabIds = (suggestion.tabs || [])
        .filter(tab => {
          const assignment = tabAssignments.get(tab.id);
          return assignment && assignment.suggestionIndex === index;
        })
        .map(tab => tab.id);

      return {
        groupName: suggestion.groupName,
        color: suggestion.color,
        confidence: suggestion.confidence,
        tabIds: assignedTabIds
      };
    }).filter(s => s.tabIds.length >= 2);
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