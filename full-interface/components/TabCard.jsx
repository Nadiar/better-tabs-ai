import React, { useState } from 'react';

// Tab Card Component - Displays individual tab (will be draggable in Phase 2)
function TabCard({ tab, isSelected, isDuplicate, onSelect }) {
  const [faviconLoaded, setFaviconLoaded] = useState(false);
  const [faviconError, setFaviconError] = useState(false);

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
      className={`tab-card ${isSelected ? 'selected' : ''} ${isDuplicate ? 'duplicate' : ''}`}
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

export default TabCard;