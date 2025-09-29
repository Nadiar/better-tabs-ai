// Better Tabs AI - Popup Script

class PopupManager {
    constructor() {
        this.currentSuggestions = []; // Store suggestions for button handlers
        this.progressInterval = null;
        this.lastAnalysisClick = 0;
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.checkAIStatus();
        await this.updateTabStats();
        await this.checkOngoingAnalysis();

        // Cleanup on popup close
        window.addEventListener('unload', () => {
            if (this.progressInterval) {
                clearInterval(this.progressInterval);
            }
        });
    }

    async checkOngoingAnalysis() {
        try {
            const progressResponse = await this.sendMessage({ action: 'getAnalysisProgress' });

            if (progressResponse.inProgress) {
                // Resume monitoring
                const button = document.getElementById('analyzeTabsBtn');
                button.disabled = true;
                this.startProgressMonitoring();
            } else if (progressResponse.progress && progressResponse.progress.status === 'complete') {
                // Show last results
                const resultsResponse = await this.sendMessage({ action: 'getLastAnalysisResults' });

                if (resultsResponse.results && resultsResponse.timestamp) {
                    // Only show if less than 5 minutes old
                    const age = Date.now() - resultsResponse.timestamp;
                    if (age < 5 * 60 * 1000) {
                        this.displayResults(resultsResponse.results);
                    }
                }
            }
        } catch (error) {
            console.error('Error checking ongoing analysis:', error);
        }
    }

  setupEventListeners() {
    // AI Status recheck
    const recheckBtn = document.getElementById('recheckAI');
    if (recheckBtn) {
      recheckBtn.addEventListener('click', () => {
        this.checkAIStatus();
      });
    }

    // Main analyze button
    const analyzeBtn = document.getElementById('analyzeTabsBtn');
    if (analyzeBtn) {
      analyzeBtn.addEventListener('click', () => {
        this.analyzeAllTabs();
      });
    }

    // Find duplicates button
    const duplicatesBtn = document.getElementById('findDuplicatesBtn');
    if (duplicatesBtn) {
      duplicatesBtn.addEventListener('click', () => {
        this.findDuplicates();
      });
    }

    // Clear cache button
    const clearCacheBtn = document.getElementById('clearCacheBtn');
    if (clearCacheBtn) {
      clearCacheBtn.addEventListener('click', () => {
        this.clearCache();
      });
    }

    // Debug button
    const debugBtn = document.getElementById('debugBtn');
    if (debugBtn) {
      debugBtn.addEventListener('click', () => {
        this.copyDebugInfo();
      });
    }
  }  async checkAIStatus() {
    try {
      // Check AI status through service worker
      const response = await this.sendMessage({ action: 'checkAIAvailability' });

      const aiAvailable = response.available || false;
      const statusMessage = response.statusMessage || 'Unknown';
      const detailedStatus = response.detailedStatus || '';
      const action = response.action;
      const status = response.status || 'unknown-error';

      console.log('AI Status from service worker:', response);

      const statusDot = document.getElementById('statusDot');
      const statusText = document.getElementById('statusText');
      const aiNotAvailable = document.getElementById('aiNotAvailable');
      const mainInterface = document.getElementById('mainInterface');
      const errorDetail = document.getElementById('errorDetail');
      const errorAction = document.getElementById('errorAction');

      if (aiAvailable) {
        statusDot.className = 'status-dot available';
        statusText.textContent = statusMessage;
        statusText.title = detailedStatus;
        aiNotAvailable.style.display = 'none';
        mainInterface.style.display = 'block';
      } else {
        // Set status indicator
        statusDot.className = `status-dot unavailable status-${status}`;
        statusText.textContent = statusMessage;
        statusText.title = detailedStatus;

        // Update error message details
        if (errorDetail) {
          errorDetail.textContent = detailedStatus;
        }

        // Update action message if provided
        if (errorAction && action) {
          errorAction.textContent = action;
          errorAction.style.display = 'block';
        } else if (errorAction) {
          errorAction.style.display = 'none';
        }

        aiNotAvailable.style.display = 'block';
        mainInterface.style.display = 'none';
      }
    } catch (error) {
      console.error('Error checking AI status:', error);
      document.getElementById('statusText').textContent = 'Error';
      document.getElementById('statusText').title = error.message;
      document.getElementById('statusDot').className = 'status-dot unavailable';
      document.getElementById('aiNotAvailable').style.display = 'block';
      document.getElementById('mainInterface').style.display = 'none';
    }
  }    async updateTabStats() {
        try {
            const tabs = await chrome.tabs.query({});
            const groups = await chrome.tabGroups.query({});
            
            const ungroupedTabs = tabs.filter(tab => tab.groupId === -1);

            document.getElementById('totalTabs').textContent = tabs.length;
            document.getElementById('ungroupedTabs').textContent = ungroupedTabs.length;
            document.getElementById('groups').textContent = groups.length;
        } catch (error) {
            console.error('Error updating stats:', error);
        }
    }

    async analyzeAllTabs() {
        const button = document.getElementById('analyzeTabsBtn');
        const results = document.getElementById('results');

        try {
            // Check if double-click (within 5 seconds) to force refresh
            const now = Date.now();
            const timeSinceLastClick = now - this.lastAnalysisClick;
            const forceRefresh = timeSinceLastClick < 5000;
            this.lastAnalysisClick = now;

            // Show loading state
            button.disabled = true;
            button.textContent = forceRefresh ? '🔄 Refreshing...' : '🤖 Starting...';
            results.style.display = 'none';

            const response = await this.sendMessage({
                action: 'analyzeAllTabs',
                forceRefresh: forceRefresh
            });

            if (response.error) {
                this.showError(response.error);
                button.disabled = false;
                button.textContent = '🤖 Analyze & Group Tabs';
            } else if (response.cached) {
                // Using cached results
                this.displayResults(response);
                this.showInfo(response.message + ' (Click again to force refresh)');
                button.disabled = false;
                button.textContent = '🤖 Analyze & Group Tabs';
            } else if (response.started) {
                // Background analysis started
                this.showInfo(response.message);
                this.startProgressMonitoring();
            } else if (response.message) {
                // No tabs to analyze
                this.showInfo(response.message);
                button.disabled = false;
                button.textContent = '🤖 Analyze & Group Tabs';
            } else {
                // Immediate results
                this.displayResults(response);
                button.disabled = false;
                button.textContent = '🤖 Analyze & Group Tabs';
            }
        } catch (error) {
            console.error('Error analyzing tabs:', error);
            this.showError(error.message);
            button.disabled = false;
            button.textContent = '🤖 Analyze & Group Tabs';
        }
    }

    startProgressMonitoring() {
        const button = document.getElementById('analyzeTabsBtn');
        const results = document.getElementById('results');

        // Poll for progress every 500ms
        this.progressInterval = setInterval(async () => {
            try {
                const progressResponse = await this.sendMessage({ action: 'getAnalysisProgress' });

                if (progressResponse.inProgress) {
                    const progress = progressResponse.progress;
                    button.textContent = `🤖 Analyzing ${progress.current}/${progress.total}...`;
                } else if (progressResponse.progress.status === 'complete') {
                    // Analysis complete, fetch results
                    clearInterval(this.progressInterval);
                    const resultsResponse = await this.sendMessage({ action: 'getLastAnalysisResults' });

                    if (resultsResponse.results) {
                        this.displayResults(resultsResponse.results);
                    }

                    button.disabled = false;
                    button.textContent = '🤖 Analyze & Group Tabs';
                } else if (progressResponse.progress.status === 'error') {
                    clearInterval(this.progressInterval);
                    this.showError('Analysis failed. Check console for details.');
                    button.disabled = false;
                    button.textContent = '🤖 Analyze & Group Tabs';
                }
            } catch (error) {
                console.error('Error checking progress:', error);
                clearInterval(this.progressInterval);
                button.disabled = false;
                button.textContent = '🤖 Analyze & Group Tabs';
            }
        }, 500);
    }

    showInfo(message) {
        const results = document.getElementById('results');
        results.innerHTML = `
            <div class="result-item" style="background: #e3f2fd; border-left: 4px solid #2196f3;">
                <strong>ℹ️ ${message}</strong>
            </div>
        `;
        results.style.display = 'block';
    }

    async findDuplicates() {
        const button = document.getElementById('findDuplicatesBtn');
        const results = document.getElementById('results');
        
        try {
            button.disabled = true;
            button.textContent = '🔍 Searching...';

            const response = await this.sendMessage({ action: 'findDuplicates' });

            if (response.error) {
                this.showError(response.error);
            } else {
                this.displayDuplicates(response);
            }
        } catch (error) {
            console.error('Error finding duplicates:', error);
            this.showError(error.message);
        } finally {
            button.disabled = false;
            button.textContent = '🔍 Find Duplicates';
        }
    }

    displayResults(response) {
        const results = document.getElementById('results');
        
        // Store suggestions for button handlers
        this.currentSuggestions = response.suggestions || [];
        
        if (!response.suggestions || response.suggestions.length === 0) {
            results.innerHTML = `
                <div class="result-item">
                    <strong>No grouping suggestions found</strong><br>
                    <small>Analyzed ${response.analyses?.length || 0} tabs</small>
                </div>
            `;
        } else {
            let html = `<div class="result-item">
                <strong>Found ${response.suggestions.length} suggested groups:</strong>
            </div>`;

            response.suggestions.forEach((suggestion, index) => {
                html += `
                    <div class="result-item">
                        <strong>${suggestion.groupName}</strong> (${suggestion.tabs.length} tabs)<br>
                        <small>Confidence: ${Math.round(suggestion.confidence * 100)}%</small>
                        <button class="create-group-btn" data-suggestion-index="${index}" 
                                style="margin-left: 8px; padding: 2px 6px; font-size: 10px;">
                            Create Group
                        </button>
                    </div>
                `;
            });

            results.innerHTML = html;
            
            // Add event listeners to create group buttons
            document.querySelectorAll('.create-group-btn').forEach(button => {
                button.addEventListener('click', (event) => {
                    const index = parseInt(event.target.getAttribute('data-suggestion-index'));
                    const suggestion = this.currentSuggestions[index];
                    if (suggestion) {
                        this.createGroup(suggestion);
                    }
                });
            });
        }

        results.style.display = 'block';
        this.updateTabStats();
    }

    displayDuplicates(duplicates) {
        const results = document.getElementById('results');
        
        if (!duplicates || duplicates.length === 0) {
            results.innerHTML = `
                <div class="result-item">
                    <strong>No duplicate tabs found</strong>
                </div>
            `;
        } else {
            let html = `<div class="result-item">
                <strong>Found ${duplicates.length} sets of duplicate tabs:</strong>
            </div>`;

            duplicates.forEach(duplicate => {
                html += `
                    <div class="result-item">
                        <strong>${duplicate.title}</strong><br>
                        <small>${duplicate.count} copies of ${duplicate.url}</small>
                        <button onclick="popupManager.closeDuplicates('${duplicate.url}')" 
                                style="margin-left: 8px; padding: 2px 6px; font-size: 10px;">
                            Close Duplicates
                        </button>
                    </div>
                `;
            });

            results.innerHTML = html;
        }

        results.style.display = 'block';
    }

    async createGroup(suggestion) {
        try {
            console.log('Creating group with suggestion:', suggestion);
            const response = await this.sendMessage({ 
                action: 'createGroups', 
                groups: [suggestion] 
            });

            console.log('Create group response:', response);

            if (response[0]?.success) {
                this.showSuccess(`Created group "${suggestion.groupName}" with ${suggestion.tabs.length} tabs`);
                await this.updateTabStats();
            } else {
                this.showError(response[0]?.error || 'Failed to create group');
            }
        } catch (error) {
            console.error('Error creating group:', error);
            this.showError(error.message);
        }
    }

    async closeDuplicates(url) {
        try {
            const tabs = await chrome.tabs.query({ url: url });
            
            if (tabs.length <= 1) {
                this.showError('No duplicates to close');
                return;
            }

            // Keep the first tab, close the rest
            const tabsToClose = tabs.slice(1).map(tab => tab.id);
            await chrome.tabs.remove(tabsToClose);

            this.showSuccess(`Closed ${tabsToClose.length} duplicate tabs`);
            await this.updateTabStats();
            
            // Refresh the duplicates search
            setTimeout(() => this.findDuplicates(), 500);
        } catch (error) {
            console.error('Error closing duplicates:', error);
            this.showError(error.message);
        }
    }

    openFullInterface() {
        // TODO: Implement full-page interface
        alert('Full interface coming soon! This will provide drag-and-drop tab management.');
        // chrome.tabs.create({
        //     url: chrome.runtime.getURL('full-interface/index.html')
        // });
        // window.close();
    }

    openSettings() {
        // TODO: Implement settings page
        alert('Settings page coming soon! Currently using smart defaults.');
        // chrome.tabs.create({
        //     url: chrome.runtime.getURL('settings/index.html')
        // });
        // window.close();
    }

    showError(message) {
        const results = document.getElementById('results');
        results.innerHTML = `
            <div class="result-item" style="border-left-color: #ef4444; background: #fef2f2;">
                <strong>Error:</strong> ${message}
            </div>
        `;
        results.style.display = 'block';
    }

    showSuccess(message) {
        const results = document.getElementById('results');
        results.innerHTML = `
            <div class="result-item" style="border-left-color: #10b981; background: #f0fdf4;">
                <strong>Success:</strong> ${message}
            </div>
        `;
        results.style.display = 'block';
    }

    async recheckAI() {
        const button = document.getElementById('recheckAI');
        const originalText = button.textContent;
        
        try {
            button.disabled = true;
            button.textContent = '🔄 Checking...';
            
            // Wait a moment for any Chrome restarts to take effect
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            await this.checkAIStatus();
            
            if (document.getElementById('mainInterface').style.display === 'block') {
                this.showSuccess('AI is now available! 🎉');
            }
        } catch (error) {
            console.error('Error rechecking AI:', error);
        } finally {
            button.disabled = false;
            button.textContent = originalText;
        }
    }

    async clearCache() {
        try {
            const response = await this.sendMessage({ action: 'clearCache' });
            if (response.success) {
                // Show temporary success message
                const clearCacheBtn = document.getElementById('clearCacheBtn');
                const originalText = clearCacheBtn.textContent;
                clearCacheBtn.textContent = '✅ Cache Cleared';
                clearCacheBtn.disabled = true;

                setTimeout(() => {
                    clearCacheBtn.textContent = originalText;
                    clearCacheBtn.disabled = false;
                }, 2000);
            }
        } catch (error) {
            console.error('Failed to clear cache:', error);
        }
    }

    async copyDebugInfo() {
        const debugBtn = document.getElementById('debugBtn');
        const originalText = debugBtn.textContent;

        try {
            debugBtn.disabled = true;
            debugBtn.textContent = '⏳ Collecting...';

            // Gather all diagnostic info
            const aiStatus = await this.sendMessage({ action: 'checkAIAvailability' });
            const progress = await this.sendMessage({ action: 'getAnalysisProgress' });
            const cacheStats = await this.sendMessage({ action: 'getCacheStats' });
            const lastResults = await this.sendMessage({ action: 'getLastAnalysisResults' });
            const tabs = await chrome.tabs.query({});
            const groups = await chrome.tabGroups.query({});

            const debugInfo = {
                timestamp: new Date().toISOString(),
                extension_version: chrome.runtime.getManifest().version,
                browser: navigator.userAgent,

                ai_status: {
                    available: aiStatus.available,
                    status: aiStatus.status,
                    message: aiStatus.statusMessage,
                    detail: aiStatus.detailedStatus
                },

                analysis_state: {
                    in_progress: progress.inProgress,
                    current: progress.progress?.current || 0,
                    total: progress.progress?.total || 0,
                    status: progress.progress?.status || 'unknown'
                },

                cache: {
                    stats: cacheStats.stats,
                    last_analysis_time: lastResults.timestamp ? new Date(lastResults.timestamp).toISOString() : 'never',
                    last_results_count: lastResults.results?.suggestions?.length || 0
                },

                tabs: {
                    total: tabs.length,
                    grouped: tabs.filter(t => t.groupId !== -1).length,
                    ungrouped: tabs.filter(t => t.groupId === -1).length,
                    special_pages: tabs.filter(t =>
                        t.url?.startsWith('chrome://') ||
                        t.url?.startsWith('chrome-extension://') ||
                        t.url?.startsWith('about:')
                    ).length,
                    groups_count: groups.length
                },

                sample_tabs: tabs.slice(0, 5).map(t => ({
                    id: t.id,
                    title: t.title?.substring(0, 50),
                    url: t.url?.substring(0, 80),
                    groupId: t.groupId
                }))
            };

            // Format as readable text
            const debugText = `Better Tabs AI - Debug Report
Generated: ${debugInfo.timestamp}
Extension Version: ${debugInfo.extension_version}

=== AI STATUS ===
Available: ${debugInfo.ai_status.available}
Status: ${debugInfo.ai_status.status}
Message: ${debugInfo.ai_status.message}
Detail: ${debugInfo.ai_status.detail}

=== ANALYSIS STATE ===
In Progress: ${debugInfo.analysis_state.in_progress}
Progress: ${debugInfo.analysis_state.current}/${debugInfo.analysis_state.total}
Status: ${debugInfo.analysis_state.status}

=== CACHE ===
Size: ${debugInfo.cache.stats?.size || 0}/${debugInfo.cache.stats?.maxSize || 0}
Hits: ${debugInfo.cache.stats?.hits || 0}
Misses: ${debugInfo.cache.stats?.misses || 0}
Hit Rate: ${((debugInfo.cache.stats?.hitRate || 0) * 100).toFixed(1)}%
Last Analysis: ${debugInfo.cache.last_analysis_time}
Last Results: ${debugInfo.cache.last_results_count} suggestions

=== TABS ===
Total: ${debugInfo.tabs.total}
Ungrouped: ${debugInfo.tabs.ungrouped}
Grouped: ${debugInfo.tabs.grouped}
Special Pages: ${debugInfo.tabs.special_pages}
Groups: ${debugInfo.tabs.groups_count}

=== SAMPLE TABS (first 5) ===
${debugInfo.sample_tabs.map((t, i) => `${i+1}. [${t.groupId}] ${t.title}\n   ${t.url}`).join('\n')}

=== BROWSER ===
${debugInfo.browser}

=== RAW JSON ===
${JSON.stringify(debugInfo, null, 2)}
`;

            // Copy to clipboard
            await navigator.clipboard.writeText(debugText);

            debugBtn.textContent = '✅ Copied!';
            setTimeout(() => {
                debugBtn.textContent = originalText;
                debugBtn.disabled = false;
            }, 2000);

            this.showSuccess('Debug info copied to clipboard! Paste it to share.');
        } catch (error) {
            console.error('Failed to collect debug info:', error);
            this.showError('Failed to collect debug info: ' + error.message);
            debugBtn.textContent = originalText;
            debugBtn.disabled = false;
        }
    }

    async sendMessage(message) {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(message, (response) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(response);
                }
            });
        });
    }
}

// Initialize popup when DOM is ready
let popupManager;
document.addEventListener('DOMContentLoaded', () => {
    popupManager = new PopupManager();
});