import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// SortableTabCard - Wrapper for TabCard that makes it sortable within groups
function SortableTabCard({ tab, isSelected, isDuplicate, onSelect }) {
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
    cursor: isDragging ? 'grabbing' : 'grab'
  };

  const getFaviconUrl = (tab) => {
    return tab.favIconUrl || chrome.runtime.getURL('icons/icon16.png');
  };

  const getDomain = (url) => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return url;
    }
  };

  const truncate = (str, maxLength) => {
    if (!str) return '';
    return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`tab-card ${isSelected ? 'selected' : ''} ${isDuplicate ? 'duplicate' : ''} ${isDragging ? 'dragging' : ''}`}
      onClick={(e) => onSelect && onSelect(tab.id, e)}
      title={`${tab.title}\n${tab.url}`}
    >
      <img
        src={getFaviconUrl(tab)}
        alt=""
        className="tab-favicon"
        onError={(e) => {
          e.target.src = chrome.runtime.getURL('icons/icon16.png');
        }}
      />
      <div className="tab-info">
        <div className="tab-title">{truncate(tab.title, 40)}</div>
        <div className="tab-domain">{getDomain(tab.url)}</div>
      </div>
      {isDuplicate && (
        <span className="duplicate-badge">Duplicate</span>
      )}
    </div>
  );
}

export default React.memo(SortableTabCard);
