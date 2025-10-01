import React, { useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import TabCard from './TabCard';


// Ungrouped Tabs Column - Droppable area for ungrouped tabs
function UngroupedColumn({ tabs, duplicateTabs }) {
  // Memoize filtered tabs to avoid recalculating on every render
  const ungroupedTabs = useMemo(() =>
    tabs.filter(tab => tab.groupId === -1),
    [tabs]
  );

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
            />
          ))
        )}
      </div>
    </div>
  );
}

export default UngroupedColumn;