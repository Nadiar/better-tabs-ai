import React, { useState, useMemo } from 'react';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCenter, pointerWithin } from '@dnd-kit/core';
import { useStagedStateContext } from '../app';
import Header from './Header';
import ConflictBanner from './ConflictBanner';
import UngroupedColumn from './UngroupedColumn';
import GroupsColumn from './GroupsColumn';
import NewGroupBox from './NewGroupBox';
import TabCard from './TabCard';
import ToastContainer from './Toast';
import ProgressBar from './ProgressBar';


// Layout Component - Main 3-column layout with drag & drop
function Layout() {
  const { stagedState, hasChanges, showConflictBanner, isApplying, isAnalyzing, analysisProgress, applyProgress, toasts, suggestions, searchTerm, duplicateTabs, showAdvancedOptions, selectedTabs, undoRedo, resetToOriginal, applyChanges, analyzeTabs, clearCache, copyDebugInfo, refreshFromChrome, updateStaged, dismissConflictBanner, handleSearchChange, handleSelectTab, handleFindGroup } = useStagedStateContext();
  const [activeTab, setActiveTab] = useState(null);
  const [activeDropTarget, setActiveDropTarget] = useState(null);
  const [dropPosition, setDropPosition] = useState(null); // 'before' | 'after' | null

  // Filter tabs based on search term
  const filteredTabs = useMemo(() => {
    if (!searchTerm.trim()) {
      return stagedState.tabs;
    }

    const term = searchTerm.toLowerCase();
    return stagedState.tabs.filter(tab => {
      const titleMatch = tab.title?.toLowerCase().includes(term);
      const urlMatch = tab.url?.toLowerCase().includes(term);
      return titleMatch || urlMatch;
    });
  }, [stagedState.tabs, searchTerm]);

  // Setup drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Prevent accidental drags on clicks
      },
    })
  );

  // Optimize collision detection for large tab counts
  const collisionDetectionStrategy = useMemo(() => {
    // For 50+ tabs, use pointerWithin for better performance
    // For < 50 tabs, use closestCenter for better UX (more forgiving)
    return stagedState.tabs.length >= 50 ? pointerWithin : closestCenter;
  }, [stagedState.tabs.length]);

  const handleApply = async () => {
    // If there are AI suggestions, prompt user to apply them first
    if (suggestions && suggestions.length > 0) {
      const shouldContinue = confirm(
        `You have ${suggestions.length} AI-suggested group${suggestions.length > 1 ? 's' : ''} pending.\n\n` +
        `Would you like to create all suggested groups before applying changes?\n\n` +
        `• OK - Create suggested groups and apply all changes\n` +
        `• Cancel - Just apply your manual changes (skip suggestions)`
      );

      if (!shouldContinue) {
        // User chose Cancel - just apply without creating suggestions
        await applyChanges();
        return;
      }

      // User chose OK - apply all suggestions first
      suggestions.forEach((suggestion) => {
        if (suggestion.tabIds && suggestion.tabIds.length > 0) {
          updateStaged((draft) => {
            // Generate new group ID
            const newGroupId = Math.min(...draft.groups.map(g => g.id), -1) - 1;

            // Create new group
            const newGroup = {
              id: newGroupId,
              title: suggestion.groupName,
              color: suggestion.color || 'grey',
              collapsed: false
            };
            draft.groups.push(newGroup);

            // Move suggested tabs to new group
            suggestion.tabIds.forEach(tabId => {
              const tab = draft.tabs.find(t => t.id === tabId);
              if (tab) {
                tab.groupId = newGroupId;
              }
            });
          });
        }
      });

      // Clear suggestions after applying them
      window.dispatchEvent(new CustomEvent('clearAllSuggestions'));
    }

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
    const draggedTabId = parseInt(event.active.id.replace('tab-', ''), 10);
    if (isNaN(draggedTabId)) {
      console.error('Invalid tab ID format in drag start:', event.active.id);
      return;
    }
    const tab = stagedState.tabs.find(t => t.id === draggedTabId);
    setActiveTab(tab);
  };

  const handleDragOver = (event) => {
    const { over, activatorEvent } = event;

    if (!over || !over.id) {
      setActiveDropTarget(null);
      setDropPosition(null);
      return;
    }

    const overId = over.id.toString();

    // Only calculate position for tab-to-tab drops
    if (overId.startsWith('tab-')) {
      const overElement = document.querySelector(`[data-sortable-id="${overId}"]`);

      if (!overElement || !activatorEvent) {
        setActiveDropTarget(null);
        setDropPosition(null);
        return;
      }

      const rect = overElement.getBoundingClientRect();

      // Get pointer position - handle both pointer and touch events
      const clientX = activatorEvent.clientX || (activatorEvent.touches && activatorEvent.touches[0]?.clientX);

      if (clientX === undefined) {
        setActiveDropTarget(null);
        setDropPosition(null);
        return;
      }

      // Calculate which half (left = before, right = after)
      const midpoint = rect.left + rect.width / 2;
      const position = clientX < midpoint ? 'before' : 'after';

      setActiveDropTarget(overId);
      setDropPosition(position);
    } else {
      // Dropping on group or other container - no position needed
      setActiveDropTarget(null);
      setDropPosition(null);
    }
  };

  const handleDragEnd = (event) => {
    try {
      const { active, over } = event;

      // Clear all drag state
      setActiveTab(null);
      setActiveDropTarget(null);
      setDropPosition(null);

      if (!over) return;

      const draggedTabId = parseInt(active.id.replace('tab-', ''), 10);
      if (isNaN(draggedTabId)) {
        console.error('Invalid tab ID format in drag end:', active.id);
        return;
      }

      const dropTarget = over.id;

      console.log('Drag end:', { draggedTabId, dropTarget, activeId: active.id, overId: over.id });

      // Check if tab is being moved FROM a suggestion
      let wasInSuggestion = false;
      if (suggestions) {
        suggestions.forEach((suggestion, index) => {
          if (suggestion.tabIds.includes(draggedTabId)) {
            wasInSuggestion = true;
            // Tab was in this suggestion - remove it unless staying in same suggestion
            if (!dropTarget.startsWith('suggestion-') || parseInt(dropTarget.replace('suggestion-', ''), 10) !== index) {
              const updatedSuggestions = [...suggestions];
              updatedSuggestions[index] = {
                ...suggestion,
                tabIds: suggestion.tabIds.filter(id => id !== draggedTabId)
              };
              window.dispatchEvent(new CustomEvent('updateSuggestions', {
                detail: { suggestions: updatedSuggestions }
              }));
            }
          }
        });
      }

      // If tab was in a suggestion (groupId === -999) and is being moved to a real target,
      // it needs to get a proper groupId based on the drop target
      if (wasInSuggestion && !dropTarget.startsWith('suggestion-')) {
        updateStaged((draft) => {
          const tab = draft.tabs.find(t => t.id === draggedTabId);
          if (tab && tab.groupId === -999) {
            // Default to ungrouped unless the drop target specifies otherwise
            // The specific drop handlers below will set the correct groupId
            tab.groupId = -1;
          }
        });
      }

      // Reordering within same group (sortable) or moving to different group with position
      if (dropTarget.startsWith('tab-')) {
        const overTabId = parseInt(dropTarget.replace('tab-', ''), 10);
        if (isNaN(overTabId)) {
          console.error('Invalid over tab ID format:', dropTarget);
          return;
        }

      updateStaged((draft) => {
        const draggedTabIndex = draft.tabs.findIndex(t => t.id === draggedTabId);
        const overTabIndex = draft.tabs.findIndex(t => t.id === overTabId);

        if (draggedTabIndex === -1 || overTabIndex === -1) return;

        const draggedTab = draft.tabs[draggedTabIndex];
        const overTab = draft.tabs[overTabIndex];

        // Check if moving to different group
        const isDifferentGroup = draggedTab.groupId !== overTab.groupId;

        if (isDifferentGroup) {
          // Move to target group
          draggedTab.groupId = overTab.groupId;
        }

        // Only reorder if:
        // - Moving to different group, OR
        // - In same group but different position
        if (isDifferentGroup || draggedTabIndex !== overTabIndex) {
          // Remove dragged tab from array
          const [removed] = draft.tabs.splice(draggedTabIndex, 1);

          // Find new position (index may have shifted after removal)
          let newOverIndex = draft.tabs.findIndex(t => t.id === overTabId);

          // Adjust insertion index based on drop position (before/after)
          // dropPosition is captured from handleDragOver
          if (dropPosition === 'after' && newOverIndex >= 0) {
            newOverIndex += 1;
          }

          // Insert at calculated position
          draft.tabs.splice(newOverIndex, 0, removed);

          // Note: We do NOT manually update tab.index here
          // Chrome manages tab indices automatically when we apply changes
          // The tabs array order is just for our UI representation

          console.log('Reordered tabs:', {
            draggedTabId,
            overTabId,
            from: draggedTabIndex,
            to: newOverIndex,
            position: dropPosition,
            movedGroup: isDifferentGroup
          });
        }
      });
    }
    // Tab dropped on a group
    else if (dropTarget.startsWith('group-')) {
      const groupId = parseInt(dropTarget.replace('group-', ''), 10);
      if (isNaN(groupId)) {
        console.error('Invalid group ID format:', dropTarget);
        return;
      }

      updateStaged((draft) => {
        const tab = draft.tabs.find(t => t.id === draggedTabId);
        if (tab) {
          tab.groupId = groupId;
        }
      });
    }
    // Tab dropped on a suggested group
    else if (dropTarget.startsWith('suggestion-')) {
      const suggestionIndex = parseInt(dropTarget.replace('suggestion-', ''), 10);
      if (isNaN(suggestionIndex) || !suggestions || !suggestions[suggestionIndex]) {
        console.error('Invalid suggestion index:', dropTarget);
        return;
      }

      // Add tab to suggestion's tabIds
      const suggestion = suggestions[suggestionIndex];
      if (!suggestion.tabIds.includes(draggedTabId)) {
        // Update the suggestions array to include this tab
        const updatedSuggestions = [...suggestions];
        updatedSuggestions[suggestionIndex] = {
          ...suggestion,
          tabIds: [...suggestion.tabIds, draggedTabId]
        };

        // Dispatch event to update suggestions in app.tsx
        window.dispatchEvent(new CustomEvent('updateSuggestions', {
          detail: { suggestions: updatedSuggestions }
        }));

        // Remove tab from its current group so it ONLY appears in the suggestion
        // Use a special groupId to mark it as "in suggestion"
        updateStaged((draft) => {
          const tab = draft.tabs.find(t => t.id === draggedTabId);
          if (tab) {
            // Use -999 as a special marker for "tab is in a suggestion"
            // This prevents it from showing in regular groups or ungrouped
            tab.groupId = -999;
          }
        });
      }
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
    } catch (error) {
      console.error('Drag end error:', error);
      // Ensure activeTab is always cleared even on error
      setActiveTab(null);
    }
  };

  const handleDragCancel = () => {
    setActiveTab(null);
    setActiveDropTarget(null);
    setDropPosition(null);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetectionStrategy}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div
        className="app-container"
        data-tab-count={
          stagedState.tabs.length >= 100 ? "100" :
          stagedState.tabs.length >= 50 ? "50" : "0"
        }
      >
        <Header
          hasChanges={hasChanges}
          onApply={handleApply}
          onCancel={handleCancel}
          onAnalyze={handleAnalyze}
          isApplying={isApplying}
          isAnalyzing={isAnalyzing}
          analysisProgress={analysisProgress}
          onSearchChange={handleSearchChange}
          undoRedo={undoRedo}
          onClearCache={clearCache}
          onCopyDebug={copyDebugInfo}
          showAdvancedOptions={showAdvancedOptions}
        />

        {showConflictBanner && (
          <ConflictBanner
            onRefresh={handleRefresh}
            onIgnore={dismissConflictBanner}
          />
        )}

        <main className="main-content">
          <div className="three-column-grid">
            <UngroupedColumn
              tabs={filteredTabs}
              duplicateTabs={duplicateTabs}
              suggestions={suggestions}
              onFindGroup={handleFindGroup}
              selectedTabs={selectedTabs}
              onSelectTab={handleSelectTab}
            />
            <GroupsColumn
              groups={stagedState.groups}
              tabs={filteredTabs}
              suggestions={suggestions}
              duplicateTabs={duplicateTabs}
              activeDropTarget={activeDropTarget}
              dropPosition={dropPosition}
            />
            <NewGroupBox />
          </div>
        </main>

        <DragOverlay>
          {activeTab ? (
            <div className="tab-card dragging-overlay">
              <img
                src={activeTab.favIconUrl || chrome.runtime.getURL('icons/icon16.png')}
                alt=""
                className="tab-favicon"
                onError={(e) => {
                  e.target.src = chrome.runtime.getURL('icons/icon16.png');
                }}
              />
              <div className="tab-info">
                <div className="tab-title">{activeTab.title || 'Untitled'}</div>
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
          <ProgressBar
            current={applyProgress.current}
            total={applyProgress.total}
            message={applyProgress.message}
          />
        )}
      </footer>

      <ToastContainer toasts={toasts} />
      </div>
    </DndContext>
  );
}

export default Layout;