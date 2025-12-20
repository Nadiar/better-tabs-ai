import React from 'react';

interface ProgressBarProps {
  current: number;
  total: number;
  message: string;
}

// ProgressBar Component - Shows progress during Apply operations
function ProgressBar({ current, total, message }: ProgressBarProps): JSX.Element | null {
  if (total === 0) return null;

  const percentage = Math.round((current / total) * 100);
  const showBar = total >= 20; // Only show bar for 20+ operations

  return (
    <div className="progress-container">
      <div className="progress-text">
        {showBar ? (
          <>
            <span className="progress-status">{message}</span>
            <span className="progress-count">{current}/{total} ({percentage}%)</span>
          </>
        ) : (
          <span className="progress-status">
            Applying {current}/{total}: {message}
          </span>
        )}
      </div>
      {showBar && (
        <div className="progress-bar-track">
          <div
            className="progress-bar-fill"
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
}

export default ProgressBar;
