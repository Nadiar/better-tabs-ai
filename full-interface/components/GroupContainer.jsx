import React from 'react';
import TabCard from './TabCard';


// Group Container - Displays a tab group with its tabs
function GroupContainer({ group, tabs, isSuggested = false, confidence = null }) {
  const groupTabs = tabs.filter(tab => tab.groupId === group.id);

  // Chrome tab group colors
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
      className={`group-container ${isSuggested ? 'suggested' : ''}`}
      style={{ borderLeftColor: getGroupColor(group.color) }}
    >
      <div className="group-header" style={{ backgroundColor: getGroupColor(group.color) + '20' }}>
        <div className="group-title-section">
          <span className="group-title">{group.title || 'Untitled Group'}</span>
          {isSuggested && (
            <span className="suggested-badge">Suggested</span>
          )}
          {confidence && (
            <span className="confidence-badge">{Math.round(confidence * 100)}%</span>
          )}
        </div>

        <div className="group-actions">
          <span className="tab-count">{groupTabs.length}</span>
          {!isSuggested && (
            <button className="btn-icon delete-group" title="Delete group">
              ×
            </button>
          )}
        </div>
      </div>

      <div className="group-tabs">
        {groupTabs.length === 0 ? (
          <div className="empty-group">
            <p>Drop tabs here</p>
          </div>
        ) : (
          groupTabs.map(tab => (
            <TabCard key={tab.id} tab={tab} />
          ))
        )}
      </div>
    </div>
  );
}

export default GroupContainer;