import React from 'react';
import type { AISuggestion } from '@shared';

interface ResultsProps {
  message: string;
  type: 'info' | 'success' | 'error';
  suggestions: AISuggestion[];
  duplicates: any[];
  onCreateGroup: (suggestion: AISuggestion, index: number) => void;
  onCloseDuplicates: (url: string) => void;
}

function Results({
  message,
  type,
  suggestions,
  duplicates,
  onCreateGroup,
  onCloseDuplicates,
}: ResultsProps) {
  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return '#f0fdf4';
      case 'error':
        return '#fef2f2';
      case 'info':
      default:
        return '#e3f2fd';
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case 'success':
        return '#10b981';
      case 'error':
        return '#ef4444';
      case 'info':
      default:
        return '#2196f3';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'info':
      default:
        return 'ℹ️';
    }
  };

  return (
    <div className="results" id="results">
      <div
        className="result-item"
        style={{
          background: getBackgroundColor(),
          borderLeft: `4px solid ${getBorderColor()}`,
        }}
      >
        <strong>
          {getIcon()} {message}
        </strong>
      </div>

      {suggestions.length > 0 &&
        suggestions.map((suggestion, index) => (
          <div key={index} className="result-item">
            <strong>{suggestion.groupName}</strong> ({suggestion.tabIds.length}{' '}
            tabs)
            <br />
            <small>Confidence: {Math.round(suggestion.confidence * 100)}%</small>
            <button
              className="create-group-btn"
              onClick={() => onCreateGroup(suggestion, index)}
              style={{
                marginLeft: '8px',
                padding: '2px 6px',
                fontSize: '10px',
              }}
            >
              Create Group
            </button>
          </div>
        ))}

      {duplicates.length > 0 &&
        duplicates.map((duplicate, index) => (
          <div key={index} className="result-item">
            <strong>{duplicate.title}</strong>
            <br />
            <small>
              {duplicate.count} copies of {duplicate.url}
            </small>
            <button
              onClick={() => onCloseDuplicates(duplicate.url)}
              style={{
                marginLeft: '8px',
                padding: '2px 6px',
                fontSize: '10px',
              }}
            >
              Close Duplicates
            </button>
          </div>
        ))}
    </div>
  );
}

export default Results;
