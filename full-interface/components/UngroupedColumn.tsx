import React, { useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { TabData, AISuggestion } from '@shared';
import SortableTabCard from './SortableTabCard';

interface UngroupedColumnProps {
  tabs: TabData[];
  duplicateTabs: number[];
  suggestions: AISuggestion[] | null;
  onFindGroup: (tabId: number, e: React.MouseEvent) => void;
  selectedTabs: number[];
  onSelectTab: (tabId: number, e: React.MouseEvent) => void;
}

// Ungrouped Tabs Column - Droppable area for ungrouped tabs
const UngroupedColumn = React.memo(function UngroupedColumn({ tabs, duplicateTabs, suggestions, onFindGroup, selectedTabs, onSelectTab }: UngroupedColumnProps): JSX.Element {
  // Memoize filtered tabs to avoid recalculating on every render
  const ungroupedTabs = useMemo(() => {
    // Simply filter to ungrouped tabs - suggestions don't matter here
    // If a tab has groupId === -1, it belongs in this column, period
    return tabs.filter(tab => tab.groupId === -1 || tab.groupId === chrome.tabGroups.TAB_GROUP_ID_NONE);
  }, [tabs]);

  const { setNodeRef, isOver } = useDroppable({
    id: 'ungrouped-column'
  });

  return (
    <div ref={setNodeRef} className={`column ungrouped-column ${isOver ? 'drag-over' : ''}`}>
      <div className="column-header">
        <h2>Ungrouped Tabs</h2>
        <span className="count-badge">{ungroupedTabs.length}</span>
      </div>

      <SortableContext
        items={ungroupedTabs.map(t => `tab-${t.id}`)}
        strategy={verticalListSortingStrategy}
      >
        <div className="column-content">
          {ungroupedTabs.length === 0 ? (
            <div className="empty-state">
              <p>🎉 All tabs are grouped!</p>
            </div>
          ) : (
            ungroupedTabs.map(tab => (
              <SortableTabCard
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
      </SortableContext>
    </div>
  );
});

export default UngroupedColumn;