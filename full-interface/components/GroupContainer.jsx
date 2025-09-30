import React, { useState, useRef } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useStagedStateContext } from '../app';
import SortableTabCard from './SortableTabCard';


// Group Container - Droppable container for tab groups with sortable tabs
function GroupContainer({ group, tabs, isSuggested = false, confidence = null }) {
  const groupTabs = tabs.filter(tab => tab.groupId === group.id);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(group.title || '');
  const inputRef = useRef(null);
  const { updateStaged } = useStagedStateContext();

  const { setNodeRef, isOver } = useDroppable({
    id: `group-${group.id}`,
    data: { group }
  });

  const handleTitleClick = () => {
    if (!isSuggested) {
      setIsEditing(true);
      setEditValue(group.title || '');
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  const handleTitleChange = (e) => {
    setEditValue(e.target.value);
  };

  const handleTitleBlur = () => {
    setIsEditing(false);
    if (editValue.trim() !== group.title) {
      updateStaged((draft) => {
        const groupToUpdate = draft.groups.find(g => g.id === group.id);
        if (groupToUpdate) {
          groupToUpdate.title = editValue.trim() || 'Untitled Group';
        }
      });
    }
  };

  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTitleBlur();
    } else if (e.key === 'Escape') {
      setEditValue(group.title || '');
      setIsEditing(false);
    }
  };

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
      ref={setNodeRef}
      className={`group-container ${isSuggested ? 'suggested' : ''} ${isOver ? 'drag-over' : ''}`}
      style={{ borderLeftColor: getGroupColor(group.color) }}
    >
      <div className="group-header" style={{ backgroundColor: getGroupColor(group.color) + '20' }}>
        <div className="group-title-section">
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              className="group-title-input"
              value={editValue}
              onChange={handleTitleChange}
              onBlur={handleTitleBlur}
              onKeyDown={handleTitleKeyDown}
              placeholder="Group name"
            />
          ) : (
            <span
              className="group-title"
              onClick={handleTitleClick}
              style={{ cursor: isSuggested ? 'default' : 'pointer' }}
              title={isSuggested ? '' : 'Click to edit'}
            >
              {group.title || 'Untitled Group'}
            </span>
          )}
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

      <SortableContext
        items={groupTabs.map(t => `tab-${t.id}`)}
        strategy={verticalListSortingStrategy}
      >
        <div className="group-tabs">
          {groupTabs.length === 0 ? (
            <div className="empty-group">
              <p>Drop tabs here</p>
            </div>
          ) : (
            groupTabs.map(tab => (
              <SortableTabCard key={tab.id} tab={tab} />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}

export default React.memo(GroupContainer);