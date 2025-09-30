// Better Tabs AI - Full Interface Main App
import React, { useState, useEffect, createContext, useContext } from 'react';
import ReactDOM from 'react-dom/client';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingState from './components/LoadingState';
import Layout from './components/Layout';
import { calculateDiff, describeChanges } from './utils/diff-calculator';
import "./styles/main.css";import "./styles/layout.css";import "./styles/drag-drop.css";import "./styles/animations.css";

// Staged State Context - Provides staged state to all components
const StagedStateContext = createContext(null);

export const useStagedStateContext = () => {
  const context = useContext(StagedStateContext);
  if (!context) {
    throw new Error('useStagedStateContext must be used within StagedStateProvider');
  }
  return context;
};

// Main App Component
function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Staged state management
  const [originalState, setOriginalState] = useState({
    tabs: [],
    groups: []
  });

  const [stagedState, setStagedState] = useState({
    tabs: [],
    groups: []
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [showConflictBanner, setShowConflictBanner] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [applyProgress, setApplyProgress] = useState({ current: 0, total: 0, message: '' });
  const [toasts, setToasts] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState(null);

  // Use ref to track hasChanges for event listeners (avoid stale closure)
  const hasChangesRef = React.useRef(false);
  const isApplyingRef = React.useRef(false); // Track if we're applying changes

  // Load initial data from Chrome
  useEffect(() => {
    loadChromeData();

    // Set up listeners for external Chrome changes
    const handleTabUpdate = () => {
      // Ignore events during Apply (we're making the changes ourselves)
      if (isApplyingRef.current) {
        console.log('Ignoring Chrome event during Apply');
        return;
      }

      // Use ref to get current value (avoid stale closure)
      if (!hasChangesRef.current) {
        // Only auto-refresh if there are no unsaved changes
        console.log('Auto-refreshing: external Chrome change detected');
        loadChromeData();
      } else {
        // Show conflict banner if there are unsaved changes
        console.log('Conflict detected: changes made externally while unsaved changes exist');
        setShowConflictBanner(true);
      }
    };

    // Handle suggestion dismissal
    const handleDismissSuggestion = (event) => {
      const { index } = event.detail;
      setSuggestions(prev => {
        if (!prev) return prev;
        const updated = [...prev];
        updated.splice(index, 1);
        return updated.length > 0 ? updated : null;
      });
    };

    // Listen to Chrome tab/group events
    chrome.tabs.onCreated.addListener(handleTabUpdate);
    chrome.tabs.onRemoved.addListener(handleTabUpdate);
    chrome.tabs.onUpdated.addListener(handleTabUpdate);
    chrome.tabGroups.onCreated.addListener(handleTabUpdate);
    chrome.tabGroups.onRemoved.addListener(handleTabUpdate);
    chrome.tabGroups.onUpdated.addListener(handleTabUpdate);

    // Listen to custom events
    window.addEventListener('dismissSuggestion', handleDismissSuggestion);

    // Cleanup listeners
    return () => {
      chrome.tabs.onCreated.removeListener(handleTabUpdate);
      chrome.tabs.onRemoved.removeListener(handleTabUpdate);
      chrome.tabs.onUpdated.removeListener(handleTabUpdate);
      chrome.tabGroups.onCreated.removeListener(handleTabUpdate);
      chrome.tabGroups.onRemoved.removeListener(handleTabUpdate);
      chrome.tabGroups.onUpdated.removeListener(handleTabUpdate);
      window.removeEventListener('dismissSuggestion', handleDismissSuggestion);
    };
  }, []); // Remove hasChanges dependency to avoid recreating listeners

  // Check for changes
  useEffect(() => {
    const changed = JSON.stringify(originalState) !== JSON.stringify(stagedState);
    setHasChanges(changed);
    hasChangesRef.current = changed; // Keep ref in sync
  }, [originalState, stagedState]);

  const loadChromeData = async () => {
    try {
      setIsLoading(true);

      // Fetch tabs and groups from Chrome
      const allTabs = await chrome.tabs.query({});
      const groups = await chrome.tabGroups.query({});

      // Get window tab counts to filter out single-tab windows (PWA apps)
      const windows = await chrome.windows.getAll({ populate: true });
      const windowTabCounts = {};
      windows.forEach(window => {
        windowTabCounts[window.id] = window.tabs.length;
      });

      // Filter out tabs from windows with only 1 tab (PWA apps)
      const tabs = allTabs.filter(tab => windowTabCounts[tab.windowId] > 1);

      const initialState = { tabs, groups };
      setOriginalState(initialState);
      setStagedState(JSON.parse(JSON.stringify(initialState))); // Deep clone

      setIsLoading(false);
    } catch (err) {
      console.error('Failed to load Chrome data:', err);
      setError(err.message);
      setIsLoading(false);
    }
  };

  const updateStaged = (updaterFn) => {
    setStagedState(prev => {
      // If updaterFn is a function, call it with a mutable draft
      if (typeof updaterFn === 'function') {
        const draft = JSON.parse(JSON.stringify(prev)); // Deep clone
        updaterFn(draft);
        return draft;
      }
      // Otherwise treat as direct updates object
      return {
        ...prev,
        ...updaterFn
      };
    });
  };

  const resetToOriginal = () => {
    setStagedState(JSON.parse(JSON.stringify(originalState)));
    setHasChanges(false);
  };

  const addToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  const applyChanges = async () => {
    setIsApplying(true);
    isApplyingRef.current = true; // Disable event listeners during Apply

    // Calculate diff
    const operations = calculateDiff(originalState, stagedState);
    const changeDesc = describeChanges(operations);

    console.log('Applying changes:', changeDesc, operations);

    // Calculate total operations for progress tracking
    const totalOps = operations.newGroups.length +
                     operations.groupRenames.length +
                     operations.tabMoves.length +
                     operations.tabReorders.length +
                     operations.groupDeletes.length;

    let currentOp = 0;
    setApplyProgress({ current: 0, total: totalOps, message: 'Starting...' });

    const errors = [];
    const groupIdMap = {}; // Map negative IDs to real Chrome group IDs

    try {
      // 1. Create new groups
      for (const op of operations.newGroups) {
        try {
          currentOp++;
          setApplyProgress({ current: currentOp, total: totalOps, message: `Creating group "${op.title}"...` });

          if (op.tabIds.length === 0) continue;

          const groupId = await chrome.tabs.group({
            tabIds: op.tabIds[0]
          });

          await chrome.tabGroups.update(groupId, {
            title: op.title,
            color: op.color
          });

          groupIdMap[op.tempId] = groupId;

          // Add remaining tabs
          if (op.tabIds.length > 1) {
            await chrome.tabs.group({
              groupId: groupId,
              tabIds: op.tabIds.slice(1)
            });
          }

          console.log(`✓ Created group "${op.title}" with ${op.tabIds.length} tabs`);
          addToast(`Created group "${op.title}"`, 'success');
        } catch (err) {
          console.error(`Failed to create group "${op.title}":`, err);
          const errorMsg = `Failed to create group "${op.title}": ${err.message}`;
          errors.push(errorMsg);
          addToast(errorMsg, 'error');
        }
      }

      // 2. Rename groups
      for (const op of operations.groupRenames) {
        try {
          currentOp++;
          setApplyProgress({ current: currentOp, total: totalOps, message: `Renaming group to "${op.newTitle}"...` });

          await chrome.tabGroups.update(op.groupId, {
            title: op.newTitle
          });
          console.log(`✓ Renamed "${op.oldTitle}" → "${op.newTitle}"`);
        } catch (err) {
          console.error(`Failed to rename group:`, err);
          const errorMsg = `Failed to rename group: ${err.message}`;
          errors.push(errorMsg);
          addToast(errorMsg, 'error');
        }
      }

      // 3. Move tabs to groups
      for (const op of operations.tabMoves) {
        try {
          currentOp++;
          setApplyProgress({ current: currentOp, total: totalOps, message: `Moving tab "${op.title}"...` });

          let targetGroupId = op.toGroup;

          // Map negative group IDs to real ones
          if (targetGroupId < 0 && groupIdMap[targetGroupId]) {
            targetGroupId = groupIdMap[targetGroupId];
          }

          if (targetGroupId === -1) {
            await chrome.tabs.ungroup(op.tabId);
            console.log(`✓ Ungrouped tab: ${op.title}`);
          } else if (targetGroupId > 0) {
            await chrome.tabs.group({
              groupId: targetGroupId,
              tabIds: op.tabId
            });
            console.log(`✓ Moved tab "${op.title}" to group`);
          }
        } catch (err) {
          console.error(`Failed to move tab:`, err);
          const errorMsg = `Failed to move tab: ${err.message}`;
          errors.push(errorMsg);
          addToast(errorMsg, 'error');
        }
      }

      // 4. Reorder tabs
      for (const op of operations.tabReorders) {
        try {
          currentOp++;
          setApplyProgress({ current: currentOp, total: totalOps, message: `Reordering tabs...` });

          await chrome.tabs.move(op.tabId, { index: op.newIndex });
        } catch (err) {
          console.error(`Failed to reorder tab:`, err);
          // Don't add to errors - reordering is non-critical
        }
      }

      // 5. Delete groups
      for (const groupId of operations.groupDeletes) {
        try {
          currentOp++;
          setApplyProgress({ current: currentOp, total: totalOps, message: `Deleting group...` });

          await chrome.tabGroups.update(groupId, { collapsed: false });
          const tabs = await chrome.tabs.query({ groupId: groupId });
          if (tabs.length > 0) {
            await chrome.tabs.ungroup(tabs.map(t => t.id));
          }
          console.log(`✓ Deleted group`);
        } catch (err) {
          console.error(`Failed to delete group:`, err);
          const errorMsg = `Failed to delete group: ${err.message}`;
          errors.push(errorMsg);
          addToast(errorMsg, 'error');
        }
      }

      console.log(`✓ Applied ${changeDesc}`);

      // Show success toast
      if (errors.length === 0) {
        addToast(`Successfully applied ${changeDesc}`, 'success');
      } else {
        addToast(`Applied changes with ${errors.length} error(s)`, 'warning');
      }

      // Reload from Chrome
      setApplyProgress({ current: totalOps, total: totalOps, message: 'Reloading...' });
      await loadChromeData();
    } catch (error) {
      console.error('Failed to apply changes:', error);
      addToast(`Failed to apply changes: ${error.message}`, 'error');
    } finally {
      setIsApplying(false);
      isApplyingRef.current = false; // Re-enable event listeners
      setApplyProgress({ current: 0, total: 0, message: '' });
    }
  };

  const dismissConflictBanner = () => {
    setShowConflictBanner(false);
  };

  const analyzeTabs = async () => {
    setIsAnalyzing(true);

    try {
      addToast('Analyzing tabs with AI...', 'info');

      const response = await chrome.runtime.sendMessage({
        action: 'analyzeAllTabs',
        forceRefresh: false
      });

      if (response.error) {
        addToast(`Analysis failed: ${response.error}`, 'error');
      } else if (response.cached) {
        // Using cached results
        setSuggestions(response.suggestions || []);
        addToast(response.message || 'Analysis complete (cached)', 'success');
      } else if (response.started) {
        // Background analysis started - poll for results
        addToast('Analysis started in background...', 'info');
        pollForAnalysisResults();
      } else if (response.suggestions) {
        // Immediate results
        setSuggestions(response.suggestions);
        addToast(`Found ${response.suggestions.length} grouping suggestions`, 'success');
      }
    } catch (error) {
      console.error('Error analyzing tabs:', error);
      addToast(`Analysis error: ${error.message}`, 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const pollForAnalysisResults = () => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await chrome.runtime.sendMessage({
          action: 'getAnalysisProgress'
        });

        if (response.progress && response.progress.status === 'complete') {
          clearInterval(pollInterval);

          const resultsResponse = await chrome.runtime.sendMessage({
            action: 'getLastAnalysisResults'
          });

          if (resultsResponse.results && resultsResponse.results.suggestions) {
            setSuggestions(resultsResponse.results.suggestions);
            addToast(`Found ${resultsResponse.results.suggestions.length} grouping suggestions`, 'success');
          }

          setIsAnalyzing(false);
        }
      } catch (error) {
        clearInterval(pollInterval);
        console.error('Error polling for results:', error);
        setIsAnalyzing(false);
      }
    }, 1000);

    // Stop polling after 2 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
      setIsAnalyzing(false);
    }, 120000);
  };

  const contextValue = {
    originalState,
    stagedState,
    hasChanges,
    showConflictBanner,
    isApplying,
    isAnalyzing,
    applyProgress,
    toasts,
    suggestions,
    updateStaged,
    resetToOriginal,
    applyChanges,
    analyzeTabs,
    refreshFromChrome: loadChromeData,
    dismissConflictBanner
  };

  if (error) {
    return (
      <div className="error-container">
        <h2>Error Loading Tabs</h2>
        <p>{error}</p>
        <button onClick={loadChromeData}>Retry</button>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <StagedStateContext.Provider value={contextValue}>
        {isLoading ? <LoadingState /> : <Layout />}
      </StagedStateContext.Provider>
    </ErrorBoundary>
  );
}

// Render app
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);