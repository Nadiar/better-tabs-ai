import React from 'react';
import GroupContainer from './GroupContainer';
import SuggestedGroup from './SuggestedGroup';
import { useStagedStateContext } from '../app';


// Groups Column - Center column showing existing groups and AI suggestions
function GroupsColumn({ groups, tabs, suggestions }) {
  const { updateStaged } = useStagedStateContext();

  // Mix suggestions with existing groups (suggestions displayed first)
  const items = [];

  // Add suggestions first
  if (suggestions && suggestions.length > 0) {
    suggestions.forEach((suggestion, index) => {
      items.push({
        type: 'suggestion',
        key: `suggestion-${index}`,
        data: suggestion,
        index
      });
    });
  }

  // Add existing groups
  groups.forEach(group => {
    items.push({
      type: 'group',
      key: `group-${group.id}`,
      data: group
    });
  });

  const handleCreateSuggestion = (suggestion, index) => {
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

    // Remove suggestion from list
    window.dispatchEvent(new CustomEvent('dismissSuggestion', { detail: { index } }));
  };

  const handleDismissSuggestion = (index) => {
    window.dispatchEvent(new CustomEvent('dismissSuggestion', { detail: { index } }));
  };

  return (
    <div className="column groups-column">
      <div className="column-header">
        <h2>Tab Groups</h2>
        <span className="count-badge">{groups.length}</span>
        {suggestions && suggestions.length > 0 && (
          <span className="suggestions-badge" title="AI suggestions available">
            {suggestions.length} 💡
          </span>
        )}
      </div>

      <div className="column-content">
        {items.length === 0 ? (
          <div className="empty-state">
            <p>No groups yet</p>
            <small>Drag tabs to "New Group" to create one</small>
          </div>
        ) : (
          items.map(item => {
            if (item.type === 'suggestion') {
              return (
                <SuggestedGroup
                  key={item.key}
                  suggestion={item.data}
                  tabs={tabs}
                  onCreate={() => handleCreateSuggestion(item.data, item.index)}
                  onDismiss={() => handleDismissSuggestion(item.index)}
                />
              );
            } else {
              return (
                <GroupContainer
                  key={item.key}
                  group={item.data}
                  tabs={tabs}
                />
              );
            }
          })
        )}
      </div>
    </div>
  );
}

export default GroupsColumn;