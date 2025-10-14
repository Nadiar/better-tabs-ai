import React, { useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import TabCard from './TabCard';


// Ungrouped Tabs Column - Droppable area for ungrouped tabs
function UngroupedColumn({ tabs, duplicateTabs, suggestions, onFindGroup, selectedTabs, onSelectTab }) {
  // Memoize filtered tabs to avoid recalculating on every render
  const ungroupedTabs = useMemo(() => {
    // Get all tab IDs that are in suggestions
    const suggestedTabIds = new Set();
    if (suggestions && Array.isArray(suggestions)) {
      suggestions.forEach(suggestion => {
        if (suggestion.tabIds && Array.isArray(suggestion.tabIds)) {
          suggestion.tabIds.forEach(id => suggestedTabIds.add(id));
        }
      });
    }

    // Filter to ungrouped tabs that are NOT in suggestions
    return tabs.filter(tab => tab.groupId === -1 && !suggestedTabIds.has(tab.id));
  }, [tabs, suggestions]);

  const { setNodeRef, isOver } = useDroppable({
    id: 'ungrouped-column'
  });

  return (
    <div ref={setNodeRef} className={`column ungrouped-column ${isOver ? 'drag-over' : ''}`}>
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
              isDuplicate={duplicateTabs.includes(tab.id)}
              onFindGroup={onFindGroup}
              isSelected={selectedTabs && selectedTabs.includes(tab.id)}
              onSelect={onSelectTab}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default UngroupedColumn;