// Better Tabs AI - React Popup
import React, { useState, useEffect } from 'react';
import {
  AIOperations,
  ChromeAPI,
  NotificationManager,
  SettingsOperations,
  type AISuggestion,
  type AIStatus,
} from '@shared';
import Header from './components/Header';
import AIUnavailable from './components/AIUnavailable';
import QuickActions from './components/QuickActions';
import TabStats from './components/TabStats';
import Results from './components/Results';
import Footer from './components/Footer';
import './styles.css';

interface TabStatsData {
  total: number;
  ungrouped: number;
  groups: number;
}

function App() {
  // AI Status
  const [aiStatus, setAIStatus] = useState<AIStatus | null>(null);
  const [isCheckingAI, setIsCheckingAI] = useState(true);

  // Tab Statistics
  const [tabStats, setTabStats] = useState<TabStatsData>({
    total: 0,
    ungrouped: 0,
    groups: 0,
  });

  // Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState({ current: 0, total: 0 });
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [lastAnalysisClick, setLastAnalysisClick] = useState(0);

  // Results Display
  const [showResults, setShowResults] = useState(false);
  const [resultMessage, setResultMessage] = useState('');
  const [resultType, setResultType] = useState<'info' | 'success' | 'error'>('info');

  // Duplicates
  const [duplicates, setDuplicates] = useState<any[]>([]);

  // Settings
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  // Initialize: Check AI status and load tab stats
  useEffect(() => {
    checkAIStatus();
    updateTabStats();
    checkOngoingAnalysis();
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const result = await SettingsOperations.get();
    if (result.success) {
      setShowAdvancedOptions(result.data.showAdvancedOptions);
    }
  };

  const checkAIStatus = async (retryCount = 0) => {
    try {
      setIsCheckingAI(true);
      const result = await AIOperations.checkAvailability();

      if (result.success) {
        setAIStatus(result.data);
        setIsCheckingAI(false);
      } else {
        // Retry up to 2 times with delays if error
        if (retryCount < 2) {
          const delay = retryCount === 0 ? 300 : 800;
          setTimeout(() => checkAIStatus(retryCount + 1), delay);
        } else {
          setAIStatus({
            available: false,
            status: 'unknown-error',
            statusMessage: 'Error checking AI status',
            detailedStatus: result.error.message,
          });
          setIsCheckingAI(false);
        }
      }
    } catch (error) {
      console.error('Error checking AI status:', error);
      // Retry on exception too
      if (retryCount < 2) {
        const delay = retryCount === 0 ? 300 : 800;
        setTimeout(() => checkAIStatus(retryCount + 1), delay);
      } else {
        setAIStatus({
          available: false,
          status: 'unknown-error',
          statusMessage: 'Error',
          detailedStatus: error instanceof Error ? error.message : 'Unknown error',
        });
        setIsCheckingAI(false);
      }
    }
  };

  const updateTabStats = async () => {
    try {
      const result = await ChromeAPI.getTabsAndGroups();

      if (result.success) {
        const { tabs, groups } = result.data;
        const ungroupedTabs = tabs.filter(
          tab => tab.groupId === chrome.tabGroups.TAB_GROUP_ID_NONE
        );

        setTabStats({
          total: tabs.length,
          ungrouped: ungroupedTabs.length,
          groups: groups.length,
        });
      }
    } catch (error) {
      console.error('Error updating tab stats:', error);
    }
  };

  const checkOngoingAnalysis = async () => {
    try {
      const progressResult = await AIOperations.getAnalysisProgress();

      if (progressResult.success && progressResult.data.status === 'analyzing') {
        setIsAnalyzing(true);
        startProgressMonitoring();
      } else if (progressResult.success && progressResult.data.status === 'complete') {
        // Show last results if available
        const resultsResponse = await chrome.runtime.sendMessage({
          action: 'getLastAnalysisResults',
        });

        if (resultsResponse.results && resultsResponse.timestamp) {
          displayResults(resultsResponse.results);

          const age = Date.now() - resultsResponse.timestamp;
          if (age > 60 * 1000) {
            showMessage(
              `Showing cached results from ${Math.round(age / 1000)}s ago`,
              'info'
            );
          }
        }
      }
    } catch (error) {
      console.error('Error checking ongoing analysis:', error);
    }
  };

  const analyzeAllTabs = async () => {
    try {
      // Check for double-click (force refresh)
      const now = Date.now();
      const timeSinceLastClick = now - lastAnalysisClick;
      const forceRefresh = timeSinceLastClick < 5000;
      setLastAnalysisClick(now);

      setIsAnalyzing(true);
      setShowResults(false);

      const response = await chrome.runtime.sendMessage({
        action: 'analyzeAllTabs',
        forceRefresh,
      });

      if (response.error) {
        showMessage(response.error, 'error');
        setIsAnalyzing(false);
      } else if (response.cached) {
        displayResults(response);
        showMessage(
          response.message + ' (Click again to force refresh)',
          'info'
        );
        setIsAnalyzing(false);
      } else if (response.started) {
        showMessage(response.message, 'info');
        startProgressMonitoring();
      } else if (response.message) {
        showMessage(response.message, 'info');
        setIsAnalyzing(false);
      } else {
        displayResults(response);
        setIsAnalyzing(false);
      }
    } catch (error) {
      console.error('Error analyzing tabs:', error);
      showMessage(
        error instanceof Error ? error.message : 'Analysis failed',
        'error'
      );
      setIsAnalyzing(false);
    }
  };

  const startProgressMonitoring = () => {
    const interval = setInterval(async () => {
      try {
        const progressResult = await AIOperations.getAnalysisProgress();

        if (!progressResult.success) {
          clearInterval(interval);
          setIsAnalyzing(false);
          return;
        }

        const progress = progressResult.data;
        setAnalysisProgress({ current: progress.current, total: progress.total });

        if (progress.status === 'complete') {
          clearInterval(interval);
          const resultsResponse = await chrome.runtime.sendMessage({
            action: 'getLastAnalysisResults',
          });

          if (resultsResponse.results) {
            displayResults(resultsResponse.results);
          }

          setIsAnalyzing(false);
          setAnalysisProgress({ current: 0, total: 0 });
        } else if (progress.status === 'error') {
          clearInterval(interval);
          showMessage('Analysis failed', 'error');
          setIsAnalyzing(false);
        }
      } catch (error) {
        clearInterval(interval);
        setIsAnalyzing(false);
      }
    }, 500);

    // Auto-cleanup after 2 minutes
    setTimeout(() => clearInterval(interval), 120000);
  };

  const displayResults = (response: any) => {
    setSuggestions(response.suggestions || []);
    setDuplicates([]);
    setShowResults(true);

    if (!response.suggestions || response.suggestions.length === 0) {
      setResultMessage(
        `No grouping suggestions found (analyzed ${response.analyses?.length || 0} tabs)`
      );
      setResultType('info');
    } else {
      setResultMessage(`Found ${response.suggestions.length} suggested groups`);
      setResultType('success');
    }
  };

  const findDuplicates = async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'findDuplicates',
      });

      if (response.error) {
        showMessage(response.error, 'error');
      } else {
        setDuplicates(response);
        setSuggestions([]);
        setShowResults(true);

        if (!response || response.length === 0) {
          setResultMessage('No duplicate tabs found');
          setResultType('info');
        } else {
          setResultMessage(`Found ${response.length} sets of duplicate tabs`);
          setResultType('success');
        }
      }
    } catch (error) {
      console.error('Error finding duplicates:', error);
      showMessage(
        error instanceof Error ? error.message : 'Failed to find duplicates',
        'error'
      );
    }
  };

  const createGroup = async (suggestion: AISuggestion, index: number) => {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'createGroups',
        groups: [suggestion],
      });

      if (response[0]?.success) {
        // Remove created suggestion
        const newSuggestions = suggestions.filter((_, i) => i !== index);
        setSuggestions(newSuggestions);

        if (newSuggestions.length > 0) {
          showMessage(
            `✅ Created group "${suggestion.groupName}" with ${response[0].tabCount} tabs. ${newSuggestions.length} suggestions remaining.`,
            'success'
          );
        } else {
          showMessage(
            `✅ Created group "${suggestion.groupName}" with ${response[0].tabCount} tabs. No more suggestions.`,
            'success'
          );
          setShowResults(false);
        }

        await updateTabStats();
        await updateCachedResults(newSuggestions);
      } else {
        const errorMsg = response[0]?.error || 'Failed to create group';
        showMessage(errorMsg, 'error');

        // Remove suggestion if no ungrouped tabs
        if (errorMsg === 'No ungrouped tabs available') {
          const newSuggestions = suggestions.filter((_, i) => i !== index);
          setSuggestions(newSuggestions);
        }
      }
    } catch (error) {
      console.error('Error creating group:', error);
      showMessage(
        error instanceof Error ? error.message : 'Failed to create group',
        'error'
      );
    }
  };

  const updateCachedResults = async (newSuggestions: AISuggestion[]) => {
    try {
      const stored = await chrome.storage.local.get([
        'lastAnalysisResults',
        'lastAnalysisTime',
        'lastAnalysisTabCount',
      ]);

      if (stored.lastAnalysisResults) {
        stored.lastAnalysisResults.suggestions = newSuggestions;
        await chrome.storage.local.set({
          lastAnalysisResults: stored.lastAnalysisResults,
          lastAnalysisTime: stored.lastAnalysisTime,
          lastAnalysisTabCount: stored.lastAnalysisTabCount,
        });
      }
    } catch (error) {
      console.error('Error updating cached results:', error);
    }
  };

  const closeDuplicates = async (url: string) => {
    try {
      const tabs = await chrome.tabs.query({ url });

      if (tabs.length <= 1) {
        showMessage('No duplicates to close', 'error');
        return;
      }

      const tabsToClose = tabs.slice(1).map(tab => tab.id).filter((id): id is number => id !== undefined);
      await chrome.tabs.remove(tabsToClose as any);

      showMessage(`Closed ${tabsToClose.length} duplicate tabs`, 'success');
      await updateTabStats();

      setTimeout(() => findDuplicates(), 500);
    } catch (error) {
      console.error('Error closing duplicates:', error);
      showMessage(
        error instanceof Error ? error.message : 'Failed to close duplicates',
        'error'
      );
    }
  };

  const clearCache = async () => {
    await AIOperations.clearCache();
    // Force page reload to clear UI completely
    window.location.reload();
  };

  const copyDebugInfo = async () => {
    try {
      const aiStatusData = await chrome.runtime.sendMessage({
        action: 'checkAIAvailability',
      });
      const progress = await chrome.runtime.sendMessage({
        action: 'getAnalysisProgress',
      });
      const cacheStats = await chrome.runtime.sendMessage({
        action: 'getCacheStats',
      });
      const lastResults = await chrome.runtime.sendMessage({
        action: 'getLastAnalysisResults',
      });

      const tabsResult = await ChromeAPI.getAllTabs();
      const groupsResult = await ChromeAPI.getTabsAndGroups();

      const debugInfo = {
        timestamp: new Date().toISOString(),
        extension_version: chrome.runtime.getManifest().version,
        browser: navigator.userAgent,
        ai_status: aiStatusData,
        analysis_state: progress,
        cache: cacheStats,
        tabs: tabsResult.success
          ? {
              total: tabsResult.data.length,
              grouped: tabsResult.data.filter(
                t => t.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE
              ).length,
            }
          : null,
        groups: groupsResult.success ? groupsResult.data.groups.length : 0,
        last_results: lastResults,
      };

      const debugText = JSON.stringify(debugInfo, null, 2);
      await navigator.clipboard.writeText(debugText);

      showMessage('Debug info copied to clipboard!', 'success');
    } catch (error) {
      console.error('Error copying debug info:', error);
      showMessage(
        error instanceof Error ? error.message : 'Failed to copy debug info',
        'error'
      );
    }
  };

  const openFullInterface = () => {
    chrome.tabs.create({
      url: chrome.runtime.getURL('full-interface/dist/index.html'),
    });
    window.close();
  };

  const showMessage = (message: string, type: 'info' | 'success' | 'error') => {
    setResultMessage(message);
    setResultType(type);
    setShowResults(true);
  };

  if (isCheckingAI) {
    return (
      <div className="container">
        <Header statusText="Checking AI..." />
        <main>
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <p>Loading...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!aiStatus?.available) {
    return (
      <div className="container">
        <Header aiStatus={aiStatus} />
        <main>
          <AIUnavailable aiStatus={aiStatus} onRecheck={() => checkAIStatus()} />
        </main>
      </div>
    );
  }

  return (
    <div className="container">
      <Header aiStatus={aiStatus} />
      <main>
        <div id="mainInterface">
          <QuickActions
            onAnalyze={analyzeAllTabs}
            onFindDuplicates={findDuplicates}
            onClearCache={clearCache}
            onCopyDebug={copyDebugInfo}
            isAnalyzing={isAnalyzing}
            analysisProgress={analysisProgress}
            showAdvancedOptions={showAdvancedOptions}
          />

          <TabStats stats={tabStats} />

          {showResults && (
            <Results
              message={resultMessage}
              type={resultType}
              suggestions={suggestions}
              duplicates={duplicates}
              onCreateGroup={createGroup}
              onCloseDuplicates={closeDuplicates}
            />
          )}
        </div>
      </main>

      <Footer
        onOpenFullInterface={openFullInterface}
      />
    </div>
  );
}

export default App;
