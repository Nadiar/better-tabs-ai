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

class BetterTabsAI {
  constructor() {
    this.session = null;
    this.sessionCreated = false;
    this.isAIAvailable = false;
    this.aiStatus = AIStatus.UNKNOWN_ERROR;
    this.cacheManager = new CacheManager({ maxSize: 100 });
    this.analysisInProgress = false;
    this.analysisProgress = { current: 0, total: 0, status: 'idle' };
    this.init();
  }

  async init() {
    console.log('Better Tabs AI: Initializing...');
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
          console.log('🧹 Analysis cache cleared');
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

  isTabGroupable(tab) {
    // Filter out tabs that shouldn't be grouped
    const url = tab.url || '';
    const title = tab.title || '';

    // Skip special Chrome pages
    if (url.startsWith('chrome://') ||
        url.startsWith('chrome-extension://') ||
        url.startsWith('edge://') ||
        url.startsWith('about:') ||
        url.startsWith('file://')) {
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

      // Filter to only groupable tabs
      const groupableTabs = tabs.filter(tab => this.isTabGroupable(tab));
      console.log(`Found ${groupableTabs.length} groupable tabs (filtered from ${tabs.length} total)`);

      if (groupableTabs.length === 0) {
        return {
          totalTabs: tabs.length,
          ungroupedTabs: 0,
          analyses: [],
          suggestions: [],
          message: 'No groupable tabs found (filtered out special pages, new tabs, and already grouped tabs)'
        };
      }

      // Check for cached results unless force refresh
      if (!forceRefresh) {
        const stored = await chrome.storage.local.get(['lastAnalysisResults', 'lastAnalysisTime', 'lastAnalysisTabCount']);
        if (stored.lastAnalysisResults && stored.lastAnalysisTime) {
          const age = Date.now() - stored.lastAnalysisTime;
          const tabCountChanged = stored.lastAnalysisTabCount !== groupableTabs.length;

          // Use cached results if tab count hasn't changed
          if (!tabCountChanged) {
            console.log('✅ Using cached analysis results (age:', Math.round(age / 1000), 'seconds, tab count unchanged)');
            return {
              ...stored.lastAnalysisResults,
              cached: true,
              cacheAge: age,
              message: `Using cached analysis (${Math.round(age / 1000)}s old)`
            };
          } else {
            console.log('🔄 Tab count changed:', stored.lastAnalysisTabCount, '→', groupableTabs.length, '- refreshing analysis');
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
        started: true,
        totalTabs: tabs.length,
        analyzingTabs: groupableTabs.length,
        message: 'Analysis started in background. Close popup if needed - results will be saved.',
        progress: this.analysisProgress
      };
    } catch (error) {
      console.error('Error in analyzeAllTabs:', error);
      this.analysisInProgress = false;
      return { error: error.message };
    }
  }

  async performBackgroundAnalysis(tabs) {
    const results = {
      totalTabs: tabs.length,
      analyses: [],
      suggestions: [],
      cacheStats: this.cacheManager.getStats()
    };

    // Process in batches of 5 for better concurrency
    const BATCH_SIZE = 5;
    for (let i = 0; i < tabs.length; i += BATCH_SIZE) {
      const batch = tabs.slice(i, Math.min(i + BATCH_SIZE, tabs.length));

      // Analyze batch concurrently with timeout
      const batchPromises = batch.map(async (tab) => {
        try {
          // Add 30 second timeout per tab
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
      });

      const batchResults = await Promise.all(batchPromises);

      // Add successful analyses
      batchResults.forEach(result => {
        if (result) {
          results.analyses.push(result);
        }
      });

      // Update progress
      this.analysisProgress.current = Math.min(i + BATCH_SIZE, tabs.length);
      console.log(`Progress: ${this.analysisProgress.current}/${this.analysisProgress.total}`);
    }

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
      const prompt = `Analyze this web page and categorize it with specific, granular groupings:

Title: ${metadata.title}
URL: ${metadata.url}
Domain: ${metadata.domain}
${content.metaDescription ? `Description: ${content.metaDescription}` : ''}
${content.excerpt ? `Content excerpt: ${content.excerpt}` : ''}
${content.headings?.length ? `Headings: ${content.headings.join(', ')}` : ''}

Instructions for categorization:
1. Create SPECIFIC categories that group related content meaningfully
2. For shopping sites, include the store name (e.g., "Amazon Shopping", "eBay Shopping")
3. For development content, include the technology/topic (e.g., "React Development", "Gemini Nano Development")
4. For news/articles, group by topic area (e.g., "Tech News", "Politics News")
5. For social media, include platform (e.g., "Twitter Social", "LinkedIn Professional")
6. For documentation, include the technology (e.g., "Python Documentation", "Chrome API Documentation")

Examples of good specific categories:
- "Amazon Shopping" instead of just "Shopping"
- "GitHub Development" instead of just "Development"
- "YouTube Entertainment" instead of just "Entertainment"
- "Gemini Nano Development" for AI/ML development content
- "React Development" for React-related pages
- "Tech News" for technology news articles

IMPORTANT: Respond with ONLY the raw JSON object, without any markdown formatting, code blocks, or explanatory text.

Provide a JSON response with this exact structure:
{
  "category": "specific descriptive category that would be useful for tab grouping",
  "subcategory": "even more specific if needed",
  "summary": "brief 1-sentence summary of what this page is about",
  "keywords": ["3-5", "relevant", "keywords"],
  "confidence": 0.8
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
    const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (codeBlockMatch) {
      const jsonText = codeBlockMatch[1].trim();
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

      console.log('📊 Suggesting groups from', analyses.length, 'analyses');

      // Get existing tab groups to check for matches
      const existingGroups = await this.getExistingGroupInfo();
      console.log('📁 Found', existingGroups.length, 'existing groups:', existingGroups.map(g => g.title).join(', '));

      // First, group by exact category match
      const exactGroups = {};
      analyses.forEach(analysis => {
        const category = analysis.category || 'Uncategorized';
        if (!exactGroups[category]) {
          exactGroups[category] = [];
        }
        exactGroups[category].push(analysis);
        console.log('  -', analysis.title, '→', category);
      });

      console.log('📋 Category groups:', Object.entries(exactGroups).map(([cat, tabs]) => `${cat} (${tabs.length})`).join(', '));

      const suggestions = [];

      // Check for tabs that could be added to existing groups
      const addToGroupSuggestions = await this.suggestAddToExistingGroups(analyses, existingGroups);
      if (addToGroupSuggestions.length > 0) {
        console.log('➕ Found', addToGroupSuggestions.length, 'tabs to add to existing groups');
        suggestions.push(...addToGroupSuggestions);
      }

      // Process each exact category group
      for (const [category, tabs] of Object.entries(exactGroups)) {
        console.log(`  Processing category "${category}" with ${tabs.length} tabs`);
        if (tabs.length >= 2) {
          // For larger groups, try to create subcategories based on domains or keywords
          if (tabs.length >= 4) {
            const subGroups = this.createSubGroups(tabs, category);
            console.log(`    Created ${subGroups.length} subgroups`);
            suggestions.push(...subGroups);
          } else {
            // Smaller groups keep the main category
            const suggestion = {
              groupName: category,
              color: this.getCategoryColor(category),
              tabs: tabs,
              confidence: tabs.reduce((sum, tab) => sum + (tab.confidence || 0), 0) / tabs.length
            };
            console.log(`    Created suggestion: "${category}" with ${tabs.length} tabs`);
            suggestions.push(suggestion);
          }
        } else {
          console.log(`    Skipped (only ${tabs.length} tab, need 2+)`);
        }
      }

      console.log(`✅ Generated ${suggestions.length} total suggestions`);

      // Sort by confidence and tab count
      suggestions.sort((a, b) => {
        const scoreA = a.tabs.length * a.confidence;
        const scoreB = b.tabs.length * b.confidence;
        return scoreB - scoreA;
      });

      // Return both suggestions and existing groups info for debugging
      return {
        suggestions: suggestions,
        existingGroups: existingGroups.map(g => ({
          title: g.title,
          tabCount: g.tabCount
        }))
      };
    } catch (error) {
      console.error('Error suggesting groups:', error);
      return { suggestions: [], existingGroups: [] };
    }
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