import React from 'react';

// Loading State Component with Skeleton Placeholders
const { useMemo } = React;

function LoadingState() {
  return (
    <div className="loading-container">
      <div className="loading-header">
        <div className="skeleton skeleton-title"></div>
        <div className="skeleton skeleton-button"></div>
      </div>

      <div className="loading-grid">
        {/* Ungrouped Column Skeleton */}
        <div className="loading-column">
          <div className="skeleton skeleton-column-header"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton skeleton-tab-card"></div>
          ))}
        </div>

        {/* Groups Column Skeleton */}
        <div className="loading-column">
          <div className="skeleton skeleton-column-header"></div>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton skeleton-group">
              <div className="skeleton skeleton-group-header"></div>
              {[...Array(3)].map((_, j) => (
                <div key={j} className="skeleton skeleton-tab-card"></div>
              ))}
            </div>
          ))}
        </div>

        {/* New Group Box Skeleton */}
        <div className="loading-column">
          <div className="skeleton skeleton-new-group-box"></div>
        </div>
      </div>
    </div>
  );
}

export default LoadingState;