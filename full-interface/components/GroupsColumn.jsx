import React from 'react';
import GroupContainer from './GroupContainer';
import { useStagedStateContext } from '../app';

// Groups Column - Center column showing all groups (both regular and suggested)
function GroupsColumn({ groups, tabs, duplicateTabs = [], activeDropTarget, dropPosition }) {
  const { updateStaged } = useStagedStateContext();

  // Separate ephemeral (suggested) groups from regular groups
  const suggestedGroups = groups.filter(g => g.isSuggested);
  const regularGroups = groups.filter(g => !g.isSuggested);

  // Display suggested groups first, then regular groups
  const allGroups = [...suggestedGroups, ...regularGroups];

  const handleDismissGroup = (groupId) => {
    // Remove the ephemeral group
    updateStaged((draft) => {
      // Ungroup all tabs in this group
      draft.tabs.forEach(tab => {
        if (tab.groupId === groupId) {
          tab.groupId = -1; // Move to ungrouped
        }
      });
      // Remove the group
      draft.groups = draft.groups.filter(g => g.id !== groupId);
    });
  };

  return (
    <div className="column groups-column">
      <div className="column-header">
        <h2>Tab Groups</h2>
        <span className="count-badge">{regularGroups.length}</span>
        {suggestedGroups.length > 0 && (
          <span className="suggestions-badge" title="AI suggestions available">
            {suggestedGroups.length} 💡
          </span>
        )}
      </div>

      <div className="column-content">
        {allGroups.length === 0 ? (
          <div className="empty-state">
            <p>No groups yet</p>
            <small>Drag tabs to "New Group" to create one</small>
          </div>
        ) : (
          allGroups.map(group => (
            <GroupContainer
              key={`group-${group.id}`}
              group={group}
              tabs={tabs}
              duplicateTabs={duplicateTabs}
              activeDropTarget={activeDropTarget}
              dropPosition={dropPosition}
              onDismiss={group.isSuggested ? () => handleDismissGroup(group.id) : null}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default GroupsColumn;
