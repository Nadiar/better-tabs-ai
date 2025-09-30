import React from 'react';


// Suggested Group - Displays an AI-generated grouping suggestion
function SuggestedGroup({ suggestion, tabs, onCreate, onDismiss }) {
  const suggestedTabs = tabs.filter(tab => suggestion.tabIds.includes(tab.id));

  const getGroupColor = (color) => {
    const colors = {
      grey: '#5f6368',
      blue: '#1a73e8',
      red: '#d93025',
      yellow: '#f9ab00',
      green: '#1e8e3e',
      pink: '#d01884',
      purple: '#9334e6',
      cyan: '#007b83'
    };
    return colors[color] || colors.grey;
  };

  return (
    <div
      className="group-container suggested"
      style={{ borderLeftColor: getGroupColor(suggestion.color || 'grey') }}
    >
      <div className="group-header" style={{ backgroundColor: getGroupColor(suggestion.color || 'grey') + '20' }}>
        <div className="group-title-section">
          <span className="group-title">
            {suggestion.groupName}
          </span>
          <span className="suggested-badge">Suggested</span>
          {suggestion.confidence && (
            <span className="confidence-badge">{Math.round(suggestion.confidence * 100)}%</span>
          )}
        </div>

        <div className="group-actions">
          <span className="tab-count">{suggestedTabs.length}</span>
          <button
            className="btn-suggestion create"
            onClick={onCreate}
            title="Create this group"
          >
            ✓
          </button>
          <button
            className="btn-suggestion dismiss"
            onClick={onDismiss}
            title="Dismiss suggestion"
          >
            ✗
          </button>
        </div>
      </div>

      <div className="group-tabs">
        {suggestedTabs.map(tab => (
          <div key={tab.id} className="tab-card suggested-tab">
            <img
              src={tab.favIconUrl || 'icons/icon16.png'}
              alt=""
              className="tab-favicon"
              onError={(e) => { e.target.src = 'icons/icon16.png'; }}
            />
            <div className="tab-info">
              <div className="tab-title">{tab.title}</div>
              <div className="tab-url">{new URL(tab.url).hostname}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default React.memo(SuggestedGroup);
