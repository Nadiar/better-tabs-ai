import React, { useState, useEffect } from 'react';

/**
 * AnalysisProgressIndicator - Shows detailed progress during tab analysis
 *
 * Displays:
 * - Current stage (Summarizing, Grouping)
 * - Progress bar with percentage
 * - Tab count being analyzed
 * - Time estimation
 * - Expandable details section
 */
function AnalysisProgressIndicator({ isAnalyzing, progress }) {
  const [startTime, setStartTime] = useState(null);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Track start time when analysis begins
  useEffect(() => {
    if (isAnalyzing && !startTime) {
      setStartTime(Date.now());
    } else if (!isAnalyzing) {
      setStartTime(null);
      setEstimatedTimeRemaining(null);
    }
  }, [isAnalyzing]);

  // Calculate time estimation
  useEffect(() => {
    if (!isAnalyzing || !startTime || !progress) return;

    const { current, total, status } = progress;

    if (current === 0 || total === 0) {
      setEstimatedTimeRemaining(null);
      return;
    }

    const elapsed = Date.now() - startTime;
    const rate = current / elapsed; // tabs per ms

    if (status === 'summarizing') {
      // Estimate based on summarizing phase
      const remainingTabs = total - current;
      const estimatedMs = remainingTabs / rate;
      setEstimatedTimeRemaining(Math.ceil(estimatedMs / 1000)); // Convert to seconds
    } else if (status === 'grouping') {
      // Grouping is typically fast (1-2 seconds)
      setEstimatedTimeRemaining(2);
    } else {
      setEstimatedTimeRemaining(null);
    }
  }, [isAnalyzing, startTime, progress]);

  if (!isAnalyzing) return null;

  const { current, total, status } = progress;

  // Calculate progress percentage
  let percentage = 0;
  if (status === 'summarizing' && total > 0) {
    // Summarizing is 0-90% of total progress
    percentage = Math.min(90, (current / total) * 90);
  } else if (status === 'grouping') {
    // Grouping is 90-100%
    percentage = 95; // Indeterminate within grouping
  } else if (status === 'complete') {
    percentage = 100;
  }

  // Status messages
  const statusMessages = {
    'summarizing': `Analyzing ${current} of ${total} tabs`,
    'grouping': 'Generating grouping suggestions',
    'complete': 'Analysis complete!',
    'error': 'Analysis failed'
  };

  const statusMessage = statusMessages[status] || 'Analyzing...';

  // Format time remaining
  const formatTimeRemaining = (seconds) => {
    if (!seconds || seconds < 1) return null;
    if (seconds < 60) return `~${seconds}s`;
    const minutes = Math.ceil(seconds / 60);
    return `~${minutes}m`;
  };

  const timeDisplay = formatTimeRemaining(estimatedTimeRemaining);

  return (
    <div className="analysis-progress-container">
      <div className="progress-header">
        <div className="progress-status">
          <span className="status-icon">
            {status === 'complete' ? '✓' : status === 'error' ? '⚠' : '⏳'}
          </span>
          <span className="status-text">{statusMessage}</span>
          {timeDisplay && (
            <span className="time-remaining" title="Estimated time remaining">
              {timeDisplay} remaining
            </span>
          )}
        </div>
        {status === 'summarizing' && (
          <button
            className="btn-expand"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Collapse details' : 'Expand details'}
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        )}
      </div>

      {/* Progress Bar */}
      <div className="progress-bar-container">
        <div
          className="progress-bar-fill"
          style={{ width: `${percentage}%` }}
          data-status={status}
        />
        <span className="progress-percentage">{Math.round(percentage)}%</span>
      </div>

      {/* Expandable Details */}
      {isExpanded && status === 'summarizing' && (
        <div className="progress-details">
          <div className="detail-item">
            <span className="detail-label">Stage:</span>
            <span className="detail-value">
              {status === 'summarizing' ? '1/2 - Content Analysis' : '2/2 - Group Suggestions'}
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Progress:</span>
            <span className="detail-value">{current} / {total} tabs</span>
          </div>
          {startTime && (
            <div className="detail-item">
              <span className="detail-label">Elapsed:</span>
              <span className="detail-value">
                {Math.round((Date.now() - startTime) / 1000)}s
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AnalysisProgressIndicator;
