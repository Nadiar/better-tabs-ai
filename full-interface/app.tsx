// Better Tabs AI - Full Interface Main App
import React, { useState, useEffect, createContext, useContext, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingState from './components/LoadingState';
import Layout from './components/Layout';
import { calculateDiff, describeChanges } from './utils/diff-calculator';
import { useUndoRedo } from './hooks/useUndoRedo';
import {
  TabData,
  GroupData,
  AISuggestion,
  ChromeColor,
  AIOperations,
  ChromeAPI,
  NotificationManager,
  SettingsOperations,
  NOTIFICATION_EVENT,
  type Toast
} from '@shared';
import "./styles/main.css";
import "./styles/layout.css";
import "./styles/drag-drop.css";
import "./styles/animations.css";

// Progress tracking types
interface ApplyProgress {
  current: number;
  total: number;
  message: string;
}

interface AnalysisProgress {
  current: number;
  total: number;
  status: 'idle' | 'analyzing' | 'complete' | 'error';
}

// State type
interface AppState {
  tabs: TabData[];
  groups: GroupData[];
}

// Context type
interface StagedStateContextValue {
  originalState: AppState;
  stagedState: AppState;
  hasChanges: boolean;
  showConflictBanner: boolean;
  isApplying: boolean;
  isAnalyzing: boolean;
  analysisProgress: AnalysisProgress;
  applyProgress: ApplyProgress;
  toasts: Toast[];
  suggestions: AISuggestion[] | null;
  searchTerm: string;
  duplicateTabs: number[];
  showAdvancedOptions: boolean;
  undoRedo: ReturnType<typeof useUndoRedo>;
  updateStaged: (updaterFn: ((draft: AppState) => void) | Partial<AppState>) => void;
  resetToOriginal: () => void;
  applyChanges: () => Promise<void>;
  analyzeTabs: () => Promise<void>;
  clearCache: () => Promise<void>;
  copyDebugInfo: () => Promise<void>;
  refreshFromChrome: () => Promise<void>;
  dismissConflictBanner: () => void;
  handleSearchChange: (term: string) => void;
}

// Staged State Context - Provides staged state to all components
const StagedStateContext = createContext<StagedStateContextValue | null>(null);

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
  const [error, setError] = useState<string | null>(null);

  // Staged state management
  const [originalState, setOriginalState] = useState<AppState>({
    tabs: [],
    groups: []
  });

  const [stagedState, setStagedState] = useState<AppState>({
    tabs: [],
    groups: []
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [showConflictBanner, setShowConflictBanner] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [applyProgress, setApplyProgress] = useState<ApplyProgress>({ current: 0, total: 0, message: '' });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgress>({ current: 0, total: 0, status: 'idle' });
  const [suggestions, setSuggestions] = useState<AISuggestion[] | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [duplicateTabs, setDuplicateTabs] = useState<number[]>([]);
  const [lastAnalysisClick, setLastAnalysisClick] = useState(0);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  // Undo/Redo functionality
  const undoRedo = useUndoRedo(stagedState, setStagedState);

  // Use ref to track hasChanges for event listeners (avoid stale closure)
  const hasChangesRef = useRef(false);
  const isApplyingRef = useRef(false); // Track if we're applying changes

  // Load initial data from Chrome
  useEffect(() => {
    loadChromeData();
    loadSettings();

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
    const handleDismissSuggestion = (event: Event) => {
      const customEvent = event as CustomEvent<{ index: number }>;
      const { index } = customEvent.detail;
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

  // Toast notification system
  useEffect(() => {
    const handleNotification = (event: Event) => {
      const customEvent = event as CustomEvent<Toast>;
      const toast = customEvent.detail;
      const id = Date.now();
      setToasts(prev => [...prev, { ...toast, id }]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, toast.duration || 5000);
    };

    window.addEventListener(NOTIFICATION_EVENT, handleNotification);
    return () => window.removeEventListener(NOTIFICATION_EVENT, handleNotification);
  }, []);

  const loadSettings = async () => {
    const result = await SettingsOperations.get();
    if (result.success) {
      setShowAdvancedOptions(result.data.showAdvancedOptions);
    }
  };

  const loadChromeData = async () => {
    try {
      setIsLoading(true);

      // Use shared ChromeAPI
      const result = await ChromeAPI.getTabsAndGroups();

      if (!result.success) {
        throw new Error(result.error.message);
      }

      // Get window tab counts to filter out single-tab windows (PWA apps)
      const windows = await chrome.windows.getAll({ populate: true });
      const windowTabCounts: Record<number, number> = {};
      windows.forEach(window => {
        windowTabCounts[window.id] = window.tabs?.length || 0;
      });

      // Filter out tabs from windows with only 1 tab (PWA apps)
      const tabs = result.data.tabs.filter(tab => windowTabCounts[tab.windowId || 0] > 1);

      const initialState: AppState = { tabs, groups: result.data.groups };
      setOriginalState(initialState);
      setStagedState(JSON.parse(JSON.stringify(initialState))); // Deep clone

      setIsLoading(false);
    } catch (err) {
      console.error('Failed to load Chrome data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsLoading(false);
    }
  };

  const updateStaged = (updaterFn: ((draft: AppState) => void) | Partial<AppState>) => {
    // Push current state to history before making changes
    undoRedo.pushHistory();

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
    undoRedo.clearHistory(); // Clear undo/redo history on cancel
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

    const errors: string[] = [];
    const groupIdMap: Record<number, number> = {}; // Map negative IDs to real Chrome group IDs

    try {
      // 1. Create new groups
      for (const op of operations.newGroups) {
        try {
          currentOp++;
          setApplyProgress({ current: currentOp, total: totalOps, message: `Creating group "${op.title}"...` });

          if (op.tabIds.length === 0) continue;

          const result = await ChromeAPI.createGroup(op.tabIds, op.title, op.color as ChromeColor);

          if (!result.success) {
            throw new Error(result.error.message);
          }

          groupIdMap[op.tempId] = result.data.id;

          console.log(`✓ Created group "${op.title}" with ${op.tabIds.length} tabs`);
          NotificationManager.success(`Created group "${op.title}"`);
        } catch (err) {
          console.error(`Failed to create group "${op.title}":`, err);
          const errorMsg = `Failed to create group "${op.title}": ${err instanceof Error ? err.message : 'Unknown error'}`;
          errors.push(errorMsg);
          NotificationManager.error(errorMsg);
        }
      }

      // 2. Rename groups
      for (const op of operations.groupRenames) {
        try {
          currentOp++;
          setApplyProgress({ current: currentOp, total: totalOps, message: `Renaming group to "${op.newTitle}"...` });

          const result = await ChromeAPI.updateGroup(op.groupId, { title: op.newTitle });

          if (!result.success) {
            throw new Error(result.error.message);
          }

          console.log(`✓ Renamed "${op.oldTitle}" → "${op.newTitle}"`);
        } catch (err) {
          console.error(`Failed to rename group:`, err);
          const errorMsg = `Failed to rename group: ${err instanceof Error ? err.message : 'Unknown error'}`;
          errors.push(errorMsg);
          NotificationManager.error(errorMsg);
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
            const result = await ChromeAPI.ungroupTabs([op.tabId]);
            if (!result.success) {
              throw new Error(result.error.message);
            }
            console.log(`✓ Ungrouped tab: ${op.title}`);
          } else if (targetGroupId > 0) {
            const result = await ChromeAPI.addTabsToGroup([op.tabId], targetGroupId);
            if (!result.success) {
              throw new Error(result.error.message);
            }
            console.log(`✓ Moved tab "${op.title}" to group`);
          }
        } catch (err) {
          console.error(`Failed to move tab:`, err);
          const errorMsg = `Failed to move tab: ${err instanceof Error ? err.message : 'Unknown error'}`;
          errors.push(errorMsg);
          NotificationManager.error(errorMsg);
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

          const result = await ChromeAPI.deleteGroup(groupId);
          if (!result.success) {
            throw new Error(result.error.message);
          }
          console.log(`✓ Deleted group`);
        } catch (err) {
          console.error(`Failed to delete group:`, err);
          const errorMsg = `Failed to delete group: ${err instanceof Error ? err.message : 'Unknown error'}`;
          errors.push(errorMsg);
          NotificationManager.error(errorMsg);
        }
      }

      console.log(`✓ Applied ${changeDesc}`);

      // Show success toast
      if (errors.length === 0) {
        NotificationManager.success(`Successfully applied ${changeDesc}`);
      } else {
        NotificationManager.show(`Applied changes with ${errors.length} error(s)`, 'warning');
      }

      // Reload from Chrome
      setApplyProgress({ current: totalOps, total: totalOps, message: 'Reloading...' });
      await loadChromeData();
      undoRedo.clearHistory(); // Clear undo/redo history after successful apply
    } catch (error) {
      console.error('Failed to apply changes:', error);
      NotificationManager.error(`Failed to apply changes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsApplying(false);
      isApplyingRef.current = false; // Re-enable event listeners
      setApplyProgress({ current: 0, total: 0, message: '' });
    }
  };

  const dismissConflictBanner = () => {
    setShowConflictBanner(false);
  };

  // Convert AI suggestions into staged groups with tabs already assigned
  const applySuggestionsToStaged = (newSuggestions: AISuggestion[]) => {
    if (!newSuggestions || newSuggestions.length === 0) return;

    console.log('🎯 applySuggestionsToStaged called with:', newSuggestions);
    console.log('Current staged tabs (first 5):', stagedState.tabs.slice(0, 5).map(t => ({ id: t.id, title: t.title })));

    updateStaged(draft => {
      // Create a new group for each suggestion
      newSuggestions.forEach(suggestion => {
        console.log(`Processing suggestion "${suggestion.groupName}":`, {
          tabIds: suggestion.tabIds,
          tabIdsCount: suggestion.tabIds?.length || 0,
          availableTabs: draft.tabs.length
        });

        // Generate new group ID (negative to avoid conflicts)
        const newGroupId = Math.min(...draft.groups.map(g => g.id), -1) - 1;

        // Create new group marked as suggested
        const newGroup: GroupData = {
          id: newGroupId,
          title: suggestion.groupName,
          color: suggestion.color || 'grey',
          collapsed: false,
          isSuggested: true,  // Mark as AI-suggested
          confidence: suggestion.confidence
        };
        draft.groups.push(newGroup);

        // Move tabs into this group
        let movedCount = 0;
        if (suggestion.tabIds && Array.isArray(suggestion.tabIds)) {
          suggestion.tabIds.forEach(tabId => {
            const tab = draft.tabs.find(t => t.id === tabId);
            if (!tab) {
              console.warn(`❌ Tab ${tabId} not found in draft.tabs`);
            } else {
              console.log(`✓ Found tab ${tabId}: ${tab.title}`);
              tab.groupId = newGroupId;
              movedCount++;
            }
          });
        }

        console.log(`✅ Moved ${movedCount}/${suggestion.tabIds?.length || 0} tabs into group "${suggestion.groupName}"`);
      });
    });

    NotificationManager.success(`Created ${newSuggestions.length} suggested groups - drag tabs to adjust`);
  };

  const clearCache = async () => {
    const result = await AIOperations.clearCache();
    NotificationManager.fromResult(result, 'Cache cleared successfully');
  };

  const copyDebugInfo = async () => {
    try {
      NotificationManager.info('Collecting debug info...');

      const aiStatus = await chrome.runtime.sendMessage({ action: 'checkAIAvailability' });
      const progress = await chrome.runtime.sendMessage({ action: 'getAnalysisProgress' });
      const cacheStats = await chrome.runtime.sendMessage({ action: 'getCacheStats' });
      const lastResults = await chrome.runtime.sendMessage({ action: 'getLastAnalysisResults' });

      const tabsResult = await ChromeAPI.getAllTabs();
      const groupsResult = await ChromeAPI.getTabsAndGroups();

      const debugInfo = {
        timestamp: new Date().toISOString(),
        aiAvailability: aiStatus,
        analysisProgress: progress,
        cacheStats: cacheStats,
        lastResults: lastResults ? {
          hasResults: !!lastResults.results,
          suggestionCount: lastResults.results?.suggestions?.length || 0,
          analysisCount: lastResults.results?.analyses?.length || 0
        } : null,
        currentState: {
          totalTabs: tabsResult.success ? tabsResult.data.length : 0,
          totalGroups: groupsResult.success ? groupsResult.data.groups.length : 0,
          groupedTabs: tabsResult.success ? tabsResult.data.filter(t => t.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE).length : 0,
          hasChanges: hasChanges,
          stagedGroups: stagedState.groups.length,
          stagedTabs: stagedState.tabs.length
        },
        suggestions: suggestions
      };

      const debugText = JSON.stringify(debugInfo, null, 2);
      await navigator.clipboard.writeText(debugText);
      NotificationManager.success('Debug info copied to clipboard!');
    } catch (error) {
      NotificationManager.error(`Failed to collect debug info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const analyzeTabs = async () => {
    setIsAnalyzing(true);

    try {
      // Use shared AIOperations
      const result = await AIOperations.analyzeAllTabs();

      console.log('📊 Analysis response:', result);

      if (!result.success) {
        NotificationManager.error(`Analysis failed: ${result.error.message}`);
        setIsAnalyzing(false);
        return;
      }

      // Check if using cached results
      const isCached = (result.data as any).cached;

      if (isCached) {
        // Using cached results - check for double-click to force refresh
        const now = Date.now();
        const timeSinceLastClick = now - lastAnalysisClick;
        const isDoubleClick = timeSinceLastClick < 5000;
        setLastAnalysisClick(now);

        if (isDoubleClick) {
          // Force refresh on double-click
          NotificationManager.info('Force refreshing analysis...');
          // Call analyzeAllTabs with forceRefresh
          const refreshResult = await chrome.runtime.sendMessage({
            action: 'analyzeAllTabs',
            forceRefresh: true
          });

          if (refreshResult.started) {
            pollForAnalysisResults();
          } else if (refreshResult.suggestions) {
            applySuggestionsToStaged(refreshResult.suggestions);
            NotificationManager.success(`Found ${refreshResult.suggestions.length} grouping suggestions`);
            setIsAnalyzing(false);
          }
        } else {
          // First click - use cached results
          applySuggestionsToStaged(result.data.suggestions || []);
          NotificationManager.success((result.data as any).message || 'Analysis complete (cached)' + ' - Click again to force refresh');
          setIsAnalyzing(false);
        }
      } else if ((result.data as any).started) {
        // Background analysis started - poll for results
        console.log('🔄 Analysis started, polling for results...');
        NotificationManager.info('Analysis started in background...');
        setLastAnalysisClick(Date.now());
        pollForAnalysisResults();
      } else if (result.data.suggestions) {
        // Immediate results
        console.log('✅ Immediate results, suggestions:', result.data.suggestions);
        setLastAnalysisClick(Date.now());
        applySuggestionsToStaged(result.data.suggestions);
        NotificationManager.success(`Found ${result.data.suggestions.length} grouping suggestions`);
        setIsAnalyzing(false);
      }
    } catch (error) {
      console.error('Error analyzing tabs:', error);
      NotificationManager.error(`Analysis error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsAnalyzing(false);
    }
  };

  const pollForAnalysisResults = () => {
    const pollInterval = setInterval(async () => {
      try {
        const progressResult = await AIOperations.getAnalysisProgress();

        if (!progressResult.success) {
          clearInterval(pollInterval);
          setIsAnalyzing(false);
          setAnalysisProgress({ current: 0, total: 0, status: 'idle' });
          return;
        }

        // Update progress
        setAnalysisProgress(progressResult.data);

        if (progressResult.data.status === 'complete') {
          clearInterval(pollInterval);

          const resultsResponse = await chrome.runtime.sendMessage({
            action: 'getLastAnalysisResults'
          });

          console.log('📋 Poll complete, resultsResponse:', resultsResponse);

          if (resultsResponse.results && resultsResponse.results.suggestions) {
            console.log('✅ Setting suggestions:', resultsResponse.results.suggestions);
            applySuggestionsToStaged(resultsResponse.results.suggestions);
            NotificationManager.success(`Found ${resultsResponse.results.suggestions.length} grouping suggestions`);
          } else {
            console.warn('⚠️ No suggestions in resultsResponse:', resultsResponse);
          }

          setIsAnalyzing(false);
          setAnalysisProgress({ current: 0, total: 0, status: 'idle' });
        }
      } catch (error) {
        clearInterval(pollInterval);
        console.error('Error polling for results:', error);
        setIsAnalyzing(false);
        setAnalysisProgress({ current: 0, total: 0, status: 'idle' });
      }
    }, 500); // Poll more frequently for better UX

    // Stop polling after 2 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
      setIsAnalyzing(false);
    }, 120000);
  };

  // Detect duplicate tabs
  useEffect(() => {
    const urlMap = new Map<string, number>();
    const duplicates: number[] = [];

    stagedState.tabs.forEach(tab => {
      const url = tab.url;
      if (urlMap.has(url)) {
        // Both the original and this tab are duplicates
        const originalId = urlMap.get(url);
        if (originalId && !duplicates.includes(originalId)) {
          duplicates.push(originalId);
        }
        duplicates.push(tab.id);
      } else {
        urlMap.set(url, tab.id);
      }
    });

    setDuplicateTabs(duplicates);
  }, [stagedState.tabs]);

  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
  };

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Z or Cmd+Z for undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undoRedo.undo();
      }
      // Ctrl+Shift+Z or Cmd+Shift+Z for redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        undoRedo.redo();
      }
      // Ctrl+Y or Cmd+Y for redo (alternative)
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        undoRedo.redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undoRedo]);

  const contextValue: StagedStateContextValue = {
    originalState,
    stagedState,
    hasChanges,
    showConflictBanner,
    isApplying,
    isAnalyzing,
    analysisProgress,
    applyProgress,
    toasts,
    suggestions,
    searchTerm,
    duplicateTabs,
    showAdvancedOptions,
    undoRedo,
    updateStaged,
    resetToOriginal,
    applyChanges,
    analyzeTabs,
    clearCache,
    copyDebugInfo,
    refreshFromChrome: loadChromeData,
    dismissConflictBanner,
    handleSearchChange
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
const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);
