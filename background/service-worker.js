// Better Tabs AI - Service Worker
// Handles AI processing and tab management

// Import cache manager (inline since service workers don't support ES6 imports)
// Cache Manager - LRU cache with configurable size and TTL
class CacheManager {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 100;
    this.defaultTTL = options.defaultTTL || 60000;
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

  get(key, ttl = null) {
    const entry = this.cache.get(key);
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    const age = Date.now() - entry.timestamp;
    const maxAge = ttl !== null ? ttl : this.defaultTTL;

    if (age > maxAge) {
      this.cache.delete(key);
      this._removeFromAccessOrder(key);
      this.stats.misses++;
      return null;
    }

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

class BetterTabsAI {
  constructor() {
    this.session = null;
    this.sessionCreated = false;
    this.isAIAvailable = false;
    this.cacheManager = new CacheManager({ maxSize: 100, defaultTTL: 60000 });
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
            console.log('✅ Gemini Nano is ready to use');
          } else if (availability === 'after-download') {
            this.isAIAvailable = false;
            console.log('🟡 Gemini Nano needs to be downloaded');
          } else {
            this.isAIAvailable = false;
            console.log('❌ Gemini Nano not available:', availability);
          }
        } catch (error) {
          console.log('Error checking ai.languageModel availability:', error);
          this.isAIAvailable = false;
        }
      } else if (typeof LanguageModel !== 'undefined') {
        console.log('Found LanguageModel API');
        try {
          const availability = await LanguageModel.availability();
          console.log('AI Availability:', availability);
          
          if (availability === 'available') {
            this.isAIAvailable = true;
            console.log('✅ Gemini Nano is ready to use');
          } else if (availability === 'downloadable' || availability === 'downloading') {
            this.isAIAvailable = false;
            console.log('🟡 Gemini Nano needs download:', availability);
          } else {
            this.isAIAvailable = false;
            console.log('❌ Gemini Nano not available:', availability);
          }
        } catch (error) {
          console.log('Error checking LanguageModel availability:', error);
          this.isAIAvailable = false;
        }
      } else {
        console.log('❌ No AI APIs found');
        console.log('Available globals:', Object.keys(self).filter(k => k.toLowerCase().includes('ai') || k.toLowerCase().includes('language')));
        this.isAIAvailable = false;
      }
    } catch (error) {
      console.error('Error checking AI availability:', error);
      this.isAIAvailable = false;
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
          sendResponse({ available: this.isAIAvailable });
          break;

        case 'analyzeAllTabs':
          const result = await this.analyzeAllTabs();
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

        case 'clearCache':
          this.cacheManager.clear();
          console.log('🧹 Analysis cache cleared');
          sendResponse({ success: true, stats: this.cacheManager.getStats() });
          break;

        case 'getCacheStats':
          sendResponse({ stats: this.cacheManager.getStats() });
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

  async analyzeAllTabs() {
    try {
      if (!this.isAIAvailable) {
        return { error: 'AI not available', requiresSetup: true };
      }

      // Get all tabs
      const tabs = await chrome.tabs.query({});
      console.log(`Analyzing ${tabs.length} tabs`);

      // Check if we have a large number of tabs
      if (tabs.length > 50) {
        return {
          error: 'Large number of tabs detected',
          tabCount: tabs.length,
          requiresPermission: true
        };
      }

      // Filter out already grouped tabs initially
      const ungroupedTabs = tabs.filter(tab => tab.groupId === -1);
      console.log(`Found ${ungroupedTabs.length} ungrouped tabs`);

      const results = {
        totalTabs: tabs.length,
        ungroupedTabs: ungroupedTabs.length,
        analyses: [],
        suggestions: [],
        cacheStats: this.cacheManager.getStats()
      };

      // Analyze each ungrouped tab
      for (const tab of ungroupedTabs) {
        try {
          const analysis = await this.analyzeTab(tab.id, tab);
          if (analysis && !analysis.error) {
            results.analyses.push({
              tabId: tab.id,
              ...analysis
            });
          }
        } catch (error) {
          console.error(`Error analyzing tab ${tab.id}:`, error);
        }
      }

      // Generate grouping suggestions
      if (results.analyses.length > 0) {
        results.suggestions = await this.suggestGroups(results.analyses);
      }

      // Update cache stats
      results.cacheStats = this.cacheManager.getStats();

      return results;
    } catch (error) {
      console.error('Error in analyzeAllTabs:', error);
      return { error: error.message };
    }
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

Based on this information, provide a JSON response with:
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
      console.log('Received AI response:', response.substring(0, 100) + '...');

      // Parse the response
      try {
        const parsed = JSON.parse(response);
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

      // First, group by exact category match
      const exactGroups = {};
      analyses.forEach(analysis => {
        const category = analysis.category || 'Uncategorized';
        if (!exactGroups[category]) {
          exactGroups[category] = [];
        }
        exactGroups[category].push(analysis);
      });

      const suggestions = [];
      
      // Process each exact category group
      for (const [category, tabs] of Object.entries(exactGroups)) {
        if (tabs.length >= 2) {
          // For larger groups, try to create subcategories based on domains or keywords
          if (tabs.length >= 4) {
            const subGroups = this.createSubGroups(tabs, category);
            suggestions.push(...subGroups);
          } else {
            // Smaller groups keep the main category
            suggestions.push({
              groupName: category,
              color: this.getCategoryColor(category),
              tabs: tabs,
              confidence: tabs.reduce((sum, tab) => sum + (tab.confidence || 0), 0) / tabs.length
            });
          }
        }
      }

      // Sort by confidence and tab count
      suggestions.sort((a, b) => {
        const scoreA = a.tabs.length * a.confidence;
        const scoreB = b.tabs.length * b.confidence;
        return scoreB - scoreA;
      });

      return suggestions;
    } catch (error) {
      console.error('Error suggesting groups:', error);
      return [];
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
          
          // Extract tab IDs
          const tabIds = suggestion.tabs.map(tab => {
            console.log('Processing tab:', tab, 'tabId:', tab.tabId);
            return tab.tabId;
          });
          
          console.log('Creating group with tab IDs:', tabIds);
          
          // Create the tab group
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
            tabCount: suggestion.tabs.length,
            success: true
          });

          console.log(`Created group "${suggestion.groupName}" with ${suggestion.tabs.length} tabs`);
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
}

// Initialize the service worker
const betterTabsAI = new BetterTabsAI();