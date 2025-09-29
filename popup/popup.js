// Better Tabs AI - Popup Script

class PopupManager {
    constructor() {
        this.currentSuggestions = []; // Store suggestions for button handlers
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.checkAIStatus();
        await this.updateTabStats();
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
            // Show loading state
            button.disabled = true;
            button.textContent = '🤖 Analyzing...';
            results.style.display = 'none';

            const response = await this.sendMessage({ action: 'analyzeAllTabs' });

            if (response.error) {
                if (response.requiresPermission) {
                    // Handle large number of tabs
                    const proceed = confirm(
                        `You have ${response.tabCount} tabs open. This may take a while to analyze. ` +
                        `Would you like to proceed?`
                    );
                    
                    if (proceed) {
                        // Retry with permission
                        const retryResponse = await this.sendMessage({ 
                            action: 'analyzeAllTabs', 
                            forceAnalyze: true 
                        });
                        this.displayResults(retryResponse);
                    }
                } else {
                    this.showError(response.error);
                }
            } else {
                this.displayResults(response);
            }
        } catch (error) {
            console.error('Error analyzing tabs:', error);
            this.showError(error.message);
        } finally {
            button.disabled = false;
            button.textContent = '🤖 Analyze & Group Tabs';
        }
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