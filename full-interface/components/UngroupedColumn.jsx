import React from 'react';
import TabCard from './TabCard';


// Ungrouped Tabs Column - Left column showing tabs without groups
function UngroupedColumn({ tabs }) {
  const ungroupedTabs = tabs.filter(tab => tab.groupId === -1);

  return (
    <div className="column ungrouped-column">
      <div className="column-header">
        <h2>Ungrouped Tabs</h2>
        <span className="count-badge">{ungroupedTabs.length}</span>
      </div>

      <div className="column-content">
        {ungroupedTabs.length === 0 ? (
          <div className="empty-state">
            <p>🎉 All tabs are grouped!</p>
          </div>
        ) : (
          ungroupedTabs.map(tab => (
            <TabCard
              key={tab.id}
              tab={tab}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default UngroupedColumn;