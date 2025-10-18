import React, { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { TabData } from '@shared';
import { getFaviconUrl, getDomain, truncate } from '../utils/tab-helpers';
import Tooltip from './Tooltip';

interface TabCardProps {
  tab: TabData;
  isSelected?: boolean;
  isDuplicate?: boolean;
  onSelect?: (tabId: number, e: React.MouseEvent) => void;
  onFindGroup?: (tabId: number, e: React.MouseEvent) => void;
}

// Tab Card Component - Draggable tab with favicon and title
function TabCard({ tab, isSelected, isDuplicate, onSelect, onFindGroup }: TabCardProps): JSX.Element {
  const [faviconLoaded, setFaviconLoaded] = useState<boolean>(false);
  const [faviconError, setFaviconError] = useState<boolean>(false);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `tab-${tab.id}`,
    data: { tab }
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? 'grabbing' : 'grab'
  };

  return (
    <Tooltip tab={tab}>
      <div
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        className={`tab-card ${isSelected ? 'selected' : ''} ${isDuplicate ? 'duplicate' : ''} ${isDragging ? 'dragging' : ''}`}
        onClick={(e) => onSelect && onSelect(tab.id, e)}
      >
        <img
          src={getFaviconUrl(tab)}
          alt=""
          className={`tab-favicon ${!faviconLoaded && !faviconError ? 'loading' : ''}`}
          onLoad={() => setFaviconLoaded(true)}
          onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
            setFaviconError(true);
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
            className="find-group-btn"
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
    </Tooltip>
  );
}

export default React.memo(TabCard);
