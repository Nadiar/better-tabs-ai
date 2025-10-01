import React, { useState, useEffect, useRef } from 'react';

// Header Component with Search, Apply/Cancel/Analyze/Undo/Redo buttons
function Header({ hasChanges, onApply, onCancel, onAnalyze, isApplying, isAnalyzing, analysisProgress, onSearchChange, undoRedo }) {
  const logoUrl = chrome.runtime.getURL('icons/icon32.png');
  const [searchTerm, setSearchTerm] = useState('');
  const searchTimeout = useRef(null);

  // Debounced search (300ms)
  useEffect(() => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    searchTimeout.current = setTimeout(() => {
      onSearchChange(searchTerm);
    }, 300);

    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, [searchTerm, onSearchChange]);

  const handleClearSearch = () => {
    setSearchTerm('');
  };

  return (
    <header className="main-header">
      <div className="header-left">
        <img src={logoUrl} alt="Better Tabs AI" className="header-logo" />
        <h1>Better Tabs AI</h1>
      </div>

      <div className="header-center">
        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="Search tabs by title or URL..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              className="clear-search"
              onClick={handleClearSearch}
              title="Clear search"
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div className="header-right">
        <button
          className="btn-icon"
          onClick={undoRedo?.undo}
          disabled={!undoRedo?.canUndo || isApplying}
          title={undoRedo?.undoDescription || 'Undo (Ctrl+Z)'}
        >
          ↶
        </button>
        <button
          className="btn-icon"
          onClick={undoRedo?.redo}
          disabled={!undoRedo?.canRedo || isApplying}
          title={undoRedo?.redoDescription || 'Redo (Ctrl+Shift+Z)'}
        >
          ↷
        </button>
        <button
          className="btn-secondary"
          onClick={onAnalyze}
          disabled={isApplying || isAnalyzing}
          title="Analyze tabs and generate AI grouping suggestions"
        >
          {isAnalyzing && analysisProgress?.total > 0
            ? `🤖 Analyzing ${analysisProgress.current}/${analysisProgress.total}...`
            : isAnalyzing
            ? '🤖 Analyzing...'
            : '🤖 Analyze'}
        </button>
        <button
          className="btn-secondary"
          onClick={onCancel}
          disabled={!hasChanges || isApplying}
        >
          Cancel
        </button>
        <button
          className="btn-primary"
          onClick={onApply}
          disabled={!hasChanges || isApplying}
        >
          {isApplying ? '⏳ Applying...' : '✓ Apply Changes'}
        </button>
      </div>
    </header>
  );
}

export default Header;