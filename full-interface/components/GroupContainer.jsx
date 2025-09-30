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
  const [isGeneratingName, setIsGeneratingName] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
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

  const handleGenerateName = async () => {
    if (isGeneratingName || groupTabs.length === 0) return;

    setIsGeneratingName(true);

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'generateGroupName',
        tabs: groupTabs.map(t => ({
          title: t.title,
          url: t.url
        }))
      });

      if (response.error) {
        console.error('Failed to generate name:', response.error);
      } else if (response.groupName) {
        updateStaged((draft) => {
          const groupToUpdate = draft.groups.find(g => g.id === group.id);
          if (groupToUpdate) {
            groupToUpdate.title = response.groupName;
          }
        });
      }
    } catch (error) {
      console.error('Error generating group name:', error);
    } finally {
      setIsGeneratingName(false);
    }
  };

  const handleColorChange = (newColor) => {
    updateStaged((draft) => {
      const groupToUpdate = draft.groups.find(g => g.id === group.id);
      if (groupToUpdate) {
        groupToUpdate.color = newColor;
      }
    });
    setShowColorPicker(false);
  };

  const handleDeleteGroup = () => {
    if (confirm(`Delete group "${group.title}"? Tabs will be ungrouped.`)) {
      updateStaged((draft) => {
        // Remove group
        draft.groups = draft.groups.filter(g => g.id !== group.id);

        // Ungroup all tabs
        draft.tabs.forEach(tab => {
          if (tab.groupId === group.id) {
            tab.groupId = -1;
          }
        });
      });
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

  const chromeColors = ['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan'];

  return (
    <div
      ref={setNodeRef}
      className={`group-container ${isSuggested ? 'suggested' : ''} ${isOver ? 'drag-over' : ''}`}
      style={{ borderLeftColor: getGroupColor(group.color) }}
    >
      <div className="group-header" style={{ backgroundColor: getGroupColor(group.color) + '20' }}>
        <div className="group-title-section">
          {/* Color swatch */}
          {!isSuggested && (
            <div className="color-swatch-container">
              <button
                className="color-swatch"
                style={{ backgroundColor: getGroupColor(group.color) }}
                onClick={() => setShowColorPicker(!showColorPicker)}
                title="Change color"
              />
              {showColorPicker && (
                <div className="color-picker-dropdown">
                  {chromeColors.map(color => (
                    <button
                      key={color}
                      className={`color-option ${group.color === color ? 'active' : ''}`}
                      style={{ backgroundColor: getGroupColor(color) }}
                      onClick={() => handleColorChange(color)}
                      title={color}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

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
              maxLength={50}
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

          {/* AI Name Generation */}
          {!isSuggested && !isEditing && groupTabs.length > 0 && (
            <button
              className="btn-icon ai-name-btn"
              onClick={handleGenerateName}
              disabled={isGeneratingName}
              title="Generate AI name"
            >
              {isGeneratingName ? '⏳' : '✨'}
            </button>
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
            <button
              className="btn-icon delete-group"
              onClick={handleDeleteGroup}
              title="Delete group"
            >
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