import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TabData } from '@shared';
import { getFaviconUrl, getDomain, truncate } from '../utils/tab-helpers';

interface SortableTabCardProps {
  tab: TabData;
  isSelected?: boolean;
  isDuplicate?: boolean;
  onSelect?: (tabId: number, e: React.MouseEvent) => void;
  onFindGroup?: (tabId: number, e: React.MouseEvent) => void;
  isDropTarget?: boolean;
  dropPosition?: 'before' | 'after' | null;
}

// SortableTabCard - Wrapper for TabCard that makes it sortable within groups
function SortableTabCard({ tab, isSelected, isDuplicate, onSelect, onFindGroup, isDropTarget, dropPosition }: SortableTabCardProps): JSX.Element {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: `tab-${tab.id}`,
    data: { tab }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
    // Add drop target visual feedback
    ...(isDropTarget && dropPosition === 'before' && {
      borderLeft: '3px solid var(--primary-color)',
      paddingLeft: 'calc(0.6rem - 2px)'
    }),
    ...(isDropTarget && dropPosition === 'after' && {
      borderRight: '3px solid var(--primary-color)',
      paddingRight: 'calc(0.6rem - 2px)'
    })
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      data-sortable-id={`tab-${tab.id}`}
      className={`tab-card ${isSelected ? 'selected' : ''} ${isDuplicate ? 'duplicate' : ''} ${isDragging ? 'dragging' : ''}`}
      onClick={(e) => onSelect && onSelect(tab.id, e)}
      title={`${tab.title}\n${tab.url}`}
    >
      <img
        src={getFaviconUrl(tab)}
        alt=""
        className="tab-favicon"
        onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
          e.currentTarget.src = chrome.runtime.getURL('icons/icon16.png');
        }}
      />
      <div className="tab-info">
        <div className="tab-title">{truncate(tab.title, 40)}</div>
        <div className="tab-domain">{getDomain(tab.url)}</div>
      </div>
      {isDuplicate && (
        <span className="duplicate-badge">Duplicate</span>
      )}
      {onFindGroup && (
        <button
          className="btn-icon find-group-btn"
          onClick={(e) => {
            e.stopPropagation();
            onFindGroup(tab.id, e);
          }}
          title="Find a group for this tab"
        >
          🔍
        </button>
      )}
    </div>
  );
}

export default React.memo(SortableTabCard);
