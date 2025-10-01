import React, { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

// Tab Card Component - Draggable tab with favicon and title
function TabCard({ tab, isSelected, isDuplicate, onSelect }) {
  const [faviconLoaded, setFaviconLoaded] = useState(false);
  const [faviconError, setFaviconError] = useState(false);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `tab-${tab.id}`,
    data: { tab }
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
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
      {...listeners}
      {...attributes}
      className={`tab-card ${isSelected ? 'selected' : ''} ${isDuplicate ? 'duplicate' : ''} ${isDragging ? 'dragging' : ''}`}
      onClick={(e) => onSelect && onSelect(tab.id, e)}
      title={`${tab.title}\n${tab.url}`}
    >
      <img
        src={getFaviconUrl(tab)}
        alt=""
        className={`tab-favicon ${!faviconLoaded && !faviconError ? 'loading' : ''}`}
        onLoad={() => setFaviconLoaded(true)}
        onError={(e) => {
          setFaviconError(true);
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

export default React.memo(TabCard);