import React from 'react';

// Header Component with Apply/Cancel/Analyze buttons
function Header({ hasChanges, onApply, onCancel, onAnalyze, isApplying, isAnalyzing }) {
  const logoUrl = chrome.runtime.getURL('icons/icon32.png');

  return (
    <header className="main-header">
      <div className="header-left">
        <img src={logoUrl} alt="Better Tabs AI" className="header-logo" />
        <h1>Better Tabs AI</h1>
      </div>

      <div className="header-center">
        {hasChanges && (
          <span className="changes-indicator">
            {/* TODO: Show count of changes */}
            Unsaved changes
          </span>
        )}
      </div>

      <div className="header-right">
        <button
          className="btn-secondary"
          onClick={onAnalyze}
          disabled={isApplying || isAnalyzing}
          title="Analyze tabs and generate AI grouping suggestions"
        >
          {isAnalyzing ? '🤖 Analyzing...' : '🤖 Analyze'}
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