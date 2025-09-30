// Better Tabs AI - Full Interface Main App
import React, { useState, useEffect, createContext, useContext } from 'react';
import ReactDOM from 'react-dom/client';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingState from './components/LoadingState';
import Layout from './components/Layout';
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

  // Load initial data from Chrome
  useEffect(() => {
    loadChromeData();
  }, []);

  // Check for changes
  useEffect(() => {
    const changed = JSON.stringify(originalState) !== JSON.stringify(stagedState);
    setHasChanges(changed);
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

  const applyChanges = async () => {
    console.log('Applying changes:', { originalState, stagedState });

    try {
      // 1. Handle new groups (negative IDs)
      const newGroups = stagedState.groups.filter(g => g.id < 0);
      const groupIdMap = {}; // Map negative IDs to real Chrome group IDs

      for (const newGroup of newGroups) {
        // Find tabs that should be in this group
        const tabsInGroup = stagedState.tabs.filter(t => t.groupId === newGroup.id);

        if (tabsInGroup.length > 0) {
          // Create group with first tab
          const groupId = await chrome.tabs.group({
            tabIds: tabsInGroup[0].id
          });

          // Update group properties
          await chrome.tabGroups.update(groupId, {
            title: newGroup.title || 'New Group',
            color: newGroup.color || 'grey'
          });

          groupIdMap[newGroup.id] = groupId;

          // Add remaining tabs to group
          if (tabsInGroup.length > 1) {
            await chrome.tabs.group({
              groupId: groupId,
              tabIds: tabsInGroup.slice(1).map(t => t.id)
            });
          }
        }
      }

      // 2. Handle existing groups - update titles
      const existingGroups = stagedState.groups.filter(g => g.id > 0);
      for (const group of existingGroups) {
        const originalGroup = originalState.groups.find(g => g.id === group.id);
        if (originalGroup && originalGroup.title !== group.title) {
          await chrome.tabGroups.update(group.id, {
            title: group.title
          });
        }
      }

      // 3. Handle tab movements
      for (const tab of stagedState.tabs) {
        const originalTab = originalState.tabs.find(t => t.id === tab.id);

        if (!originalTab) continue;

        let targetGroupId = tab.groupId;

        // Map negative group IDs to real ones
        if (targetGroupId < 0 && groupIdMap[targetGroupId]) {
          targetGroupId = groupIdMap[targetGroupId];
        }

        // Tab moved to a group
        if (originalTab.groupId !== tab.groupId) {
          if (targetGroupId === -1) {
            // Ungroup tab
            await chrome.tabs.ungroup(tab.id);
          } else if (targetGroupId > 0) {
            // Move to group
            await chrome.tabs.group({
              groupId: targetGroupId,
              tabIds: tab.id
            });
          }
        }

        // Handle tab reordering (if index changed)
        if (originalTab.index !== tab.index) {
          await chrome.tabs.move(tab.id, { index: tab.index });
        }
      }

      console.log('✓ Changes applied successfully');

      // Reload from Chrome
      await loadChromeData();
    } catch (error) {
      console.error('Failed to apply changes:', error);
      alert(`Failed to apply changes: ${error.message}`);
    }
  };

  const contextValue = {
    originalState,
    stagedState,
    hasChanges,
    showConflictBanner,
    updateStaged,
    resetToOriginal,
    applyChanges,
    refreshFromChrome: loadChromeData
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