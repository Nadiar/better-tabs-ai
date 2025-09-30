import React, { useState, useMemo } from 'react';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useStagedStateContext } from '../app';
import Header from './Header';
import ConflictBanner from './ConflictBanner';
import UngroupedColumn from './UngroupedColumn';
import GroupsColumn from './GroupsColumn';
import NewGroupBox from './NewGroupBox';
import TabCard from './TabCard';
import ToastContainer from './Toast';


// Layout Component - Main 3-column layout with drag & drop
function Layout() {
  const { stagedState, hasChanges, showConflictBanner, isApplying, isAnalyzing, applyProgress, toasts, suggestions, resetToOriginal, applyChanges, analyzeTabs, refreshFromChrome, updateStaged, dismissConflictBanner } = useStagedStateContext();
  const [activeTab, setActiveTab] = useState(null);

  // Setup drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Prevent accidental drags on clicks
      },
    })
  );

  const handleApply = async () => {
    await applyChanges();
  };

  const handleCancel = () => {
    if (confirm('Discard all changes?')) {
      resetToOriginal();
    }
  };

  const handleRefresh = async () => {
    if (!hasChanges || confirm('Refreshing will discard unsaved changes. Continue?')) {
      await refreshFromChrome();
    }
  };

  const handleAnalyze = async () => {
    await analyzeTabs();
  };

  const handleDragStart = (event) => {
    const draggedTabId = parseInt(event.active.id.replace('tab-', ''));
    const tab = stagedState.tabs.find(t => t.id === draggedTabId);
    setActiveTab(tab);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;

    setActiveTab(null); // Clear active tab

    if (!over) return;

    const draggedTabId = parseInt(active.id.replace('tab-', ''));
    const dropTarget = over.id;

    console.log('Drag end:', { draggedTabId, dropTarget, activeId: active.id, overId: over.id });

    // Reordering within same group (sortable)
    if (dropTarget.startsWith('tab-')) {
      const overTabId = parseInt(dropTarget.replace('tab-', ''));

      updateStaged((draft) => {
        const draggedTabIndex = draft.tabs.findIndex(t => t.id === draggedTabId);
        const overTabIndex = draft.tabs.findIndex(t => t.id === overTabId);

        if (draggedTabIndex === -1 || overTabIndex === -1) return;

        const draggedTab = draft.tabs[draggedTabIndex];
        const overTab = draft.tabs[overTabIndex];

        // Only reorder if in same group
        if (draggedTab.groupId === overTab.groupId && draggedTabIndex !== overTabIndex) {
          // Remove dragged tab from array
          const [removed] = draft.tabs.splice(draggedTabIndex, 1);

          // Find new position (index may have shifted after removal)
          const newOverIndex = draft.tabs.findIndex(t => t.id === overTabId);

          // Insert at new position
          draft.tabs.splice(newOverIndex, 0, removed);

          // Update all tab indices to match their position
          draft.tabs.forEach((tab, idx) => {
            tab.index = idx;
          });

          console.log('Reordered tabs:', { draggedTabId, overTabId, from: draggedTabIndex, to: overTabIndex });
        }
      });
    }
    // Tab dropped on a group
    else if (dropTarget.startsWith('group-')) {
      const groupId = parseInt(dropTarget.replace('group-', ''));

      updateStaged((draft) => {
        const tab = draft.tabs.find(t => t.id === draggedTabId);
        if (tab) {
          tab.groupId = groupId;
        }
      });
    }
    // Tab dropped on "New Group" box
    else if (dropTarget === 'new-group-box') {
      console.log('Creating new group for tab:', draggedTabId);
      updateStaged((draft) => {
        // Create new group with unique negative ID (will be replaced on Apply)
        const newGroupId = Math.min(...draft.groups.map(g => g.id), -1) - 1;

        // Pick a random unused color
        const chromeColors = ['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan'];
        const usedColors = draft.groups.map(g => g.color);
        const availableColors = chromeColors.filter(c => !usedColors.includes(c));
        const randomColor = availableColors.length > 0
          ? availableColors[Math.floor(Math.random() * availableColors.length)]
          : chromeColors[Math.floor(Math.random() * chromeColors.length)];

        const newGroup = {
          id: newGroupId,
          title: 'New Group',
          color: randomColor,
          collapsed: false
        };
        draft.groups.push(newGroup);

        console.log('Created new group:', newGroup);

        // Move tab to new group
        const tab = draft.tabs.find(t => t.id === draggedTabId);
        if (tab) {
          const oldGroupId = tab.groupId;
          tab.groupId = newGroupId;
          console.log(`Moved tab ${draggedTabId} from group ${oldGroupId} to new group ${newGroupId}`);
        } else {
          console.error('Tab not found:', draggedTabId);
        }

        console.log('Draft state after new group:', {
          groups: draft.groups.length,
          newGroupTabs: draft.tabs.filter(t => t.groupId === newGroupId).length
        });
      });
    }
    // Tab dropped on ungrouped area
    else if (dropTarget === 'ungrouped-column') {
      updateStaged((draft) => {
        const tab = draft.tabs.find(t => t.id === draggedTabId);
        if (tab) {
          tab.groupId = -1;
        }
      });
    }
  };

  // Memoize columns to prevent unnecessary re-renders during drag
  const memoizedColumns = useMemo(() => ({
    ungrouped: <UngroupedColumn tabs={stagedState.tabs} />,
    groups: <GroupsColumn groups={stagedState.groups} tabs={stagedState.tabs} suggestions={suggestions} />,
    newGroup: <NewGroupBox />
  }), [stagedState.tabs, stagedState.groups, suggestions]);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="app-container">
        <Header
          hasChanges={hasChanges}
          onApply={handleApply}
          onCancel={handleCancel}
          onAnalyze={handleAnalyze}
          isApplying={isApplying}
          isAnalyzing={isAnalyzing}
        />

        {showConflictBanner && (
          <ConflictBanner
            onRefresh={handleRefresh}
            onIgnore={dismissConflictBanner}
          />
        )}

        <main className="main-content">
          <div className="three-column-grid">
            {memoizedColumns.ungrouped}
            {memoizedColumns.groups}
            {memoizedColumns.newGroup}
          </div>
        </main>

        <DragOverlay>
          {activeTab ? (
            <div className="tab-card dragging-overlay">
              <img
                src={activeTab.favIconUrl || chrome.runtime.getURL('icons/icon16.png')}
                alt=""
                className="tab-favicon"
              />
              <div className="tab-info">
                <div className="tab-title">{activeTab.title}</div>
              </div>
            </div>
          ) : null}
        </DragOverlay>

      <footer className="main-footer">
        {hasChanges && (
          <span className="footer-status">
            {/* TODO: Show detailed change count */}
            Unsaved changes pending
          </span>
        )}
        {isApplying && applyProgress.total > 0 && (
          <span className="progress-indicator">
            Applying {applyProgress.current}/{applyProgress.total}: {applyProgress.message}
          </span>
        )}
      </footer>

      <ToastContainer toasts={toasts} />
      </div>
    </DndContext>
  );
}

export default Layout;