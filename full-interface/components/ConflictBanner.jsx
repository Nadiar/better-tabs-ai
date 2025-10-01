import React from 'react';

// Conflict Banner - Shows when Chrome tabs change during editing
function ConflictBanner({ onRefresh, onIgnore }) {
  return (
    <div className="conflict-banner">
      <span className="conflict-icon">⚠️</span>
      <span className="conflict-message">
        Tabs have changed in other windows. Refresh to see latest, or continue editing.
      </span>
      <div className="conflict-actions">
        <button className="btn-secondary" onClick={onIgnore}>
          Continue Editing
        </button>
        <button className="btn-primary" onClick={onRefresh}>
          🔄 Refresh
        </button>
      </div>
    </div>
  );
}

export default ConflictBanner;