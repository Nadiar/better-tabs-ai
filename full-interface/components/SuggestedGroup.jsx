import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortableTabCard from './SortableTabCard';


// Suggested Group - Displays an AI-generated grouping suggestion
function SuggestedGroup({ suggestion, tabs, onCreate, onDismiss, onRegenerateName, duplicateTabs = [], suggestionIndex }) {
  const suggestedTabs = tabs.filter(tab => suggestion.tabIds?.includes(tab.id));
  const [isGeneratingName, setIsGeneratingName] = useState(false);

  // Make the suggestion droppable
  const { setNodeRef, isOver } = useDroppable({
    id: `suggestion-${suggestionIndex}`,
    data: { suggestion, suggestionIndex }
  });

  const handleRegenerateName = async () => {
    if (isGeneratingName || suggestedTabs.length === 0) return;

    setIsGeneratingName(true);

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'generateGroupName',
        tabs: suggestedTabs.map(t => ({
          title: t.title,
          url: t.url
        }))
      });

      if (response.error) {
        console.error('Failed to generate name:', response.error);
      } else if (response.groupName) {
        onRegenerateName(suggestionIndex, response.groupName);
      }
    } catch (error) {
      console.error('Error generating group name:', error);
    } finally {
      setIsGeneratingName(false);
    }
  };

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
      className={`group-container suggested ${isOver ? 'drag-over' : ''}`}
      style={{ borderLeftColor: getGroupColor(suggestion.color || 'grey') }}
    >
      <div className="group-header" style={{ backgroundColor: getGroupColor(suggestion.color || 'grey') + '20' }}>
        <div className="group-title-section">
          <span className="group-title">
            {suggestion.groupName}
          </span>

          {/* AI Name Generation */}
          {suggestedTabs.length > 0 && (
            <button
              className="btn-icon ai-name-btn"
              onClick={handleRegenerateName}
              disabled={isGeneratingName}
              title="Regenerate AI name"
            >
              {isGeneratingName ? '⏳' : '✨'}
            </button>
          )}

          <span className="suggested-badge">Suggested</span>
          {suggestion.confidence && (
            <span className="confidence-badge">{Math.round(suggestion.confidence * 100)}%</span>
          )}
        </div>

        <div className="group-actions">
          <span className="tab-count">{suggestedTabs.length}</span>
          <button
            className="btn-suggestion create"
            onClick={onCreate}
            title="Create this group"
          >
            ✓
          </button>
          <button
            className="btn-suggestion dismiss"
            onClick={onDismiss}
            title="Dismiss suggestion"
          >
            ✗
          </button>
        </div>
      </div>

      <SortableContext
        items={suggestedTabs.map(t => `tab-${t.id}`)}
        strategy={verticalListSortingStrategy}
      >
        <div className="group-tabs">
          {suggestedTabs.map(tab => {
            const isDuplicate = duplicateTabs.includes(tab.id);

            return (
              <SortableTabCard
                key={tab.id}
                tab={tab}
                isSelected={false}
                isDuplicate={isDuplicate}
                onSelect={() => {}}
                onFindGroup={() => {}}
              />
            );
          })}
        </div>
      </SortableContext>
    </div>
  );
}

// Memoize with custom comparison to prevent unnecessary re-renders
export default React.memo(SuggestedGroup, (prevProps, nextProps) => {
  // Only re-render if suggestion data or relevant tabs changed
  return (
    prevProps.suggestion.groupName === nextProps.suggestion.groupName &&
    prevProps.suggestion.tabIds.length === nextProps.suggestion.tabIds.length &&
    prevProps.suggestion.tabIds.every((id, i) => id === nextProps.suggestion.tabIds[i]) &&
    prevProps.tabs.length === nextProps.tabs.length
  );
});
