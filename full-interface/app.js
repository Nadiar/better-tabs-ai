// Better Tabs AI - Full Interface Main App
const { useState, useEffect, createContext, useContext } = React;

// Staged State Context - Provides staged state to all components
const StagedStateContext = createContext(null);

window.useStagedStateContext = () => {
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
      const tabs = await chrome.tabs.query({});
      const groups = await chrome.tabGroups.query({});

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

  const updateStaged = (updates) => {
    setStagedState(prev => ({
      ...prev,
      ...updates
    }));
  };

  const resetToOriginal = () => {
    setStagedState(JSON.parse(JSON.stringify(originalState)));
    setHasChanges(false);
  };

  const applyChanges = async () => {
    // TODO: Implement batch apply in Phase 3
    console.log('Apply changes:', { originalState, stagedState });

    // For now, just refresh
    await loadChromeData();
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
    return html`
      <div className="error-container">
        <h2>Error Loading Tabs</h2>
        <p>${error}</p>
        <button onClick=${loadChromeData}>Retry</button>
      </div>
    `;
  }

  return html`
    <${ErrorBoundary}>
      <${StagedStateContext.Provider} value=${contextValue}>
        ${isLoading ? html`<${LoadingState} />` : html`<${Layout} />`}
      </${StagedStateContext.Provider}>
    </${ErrorBoundary}>
  `;
}

// Render app
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(html`<${App} />`);