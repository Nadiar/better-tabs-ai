import React from 'react';
import type { AIStatus } from '@shared';

interface AIUnavailableProps {
  aiStatus: AIStatus | null;
  onRecheck: () => void;
}

function AIUnavailable({ aiStatus, onRecheck }: AIUnavailableProps) {
  return (
    <div id="aiNotAvailable" className="error-message">
      <h3>⚠️ Chrome AI Not Available</h3>
      <p
        id="errorDetail"
        style={{ fontWeight: 600, marginBottom: '10px' }}
      >
        {aiStatus?.detailedStatus || 'Checking AI availability...'}
      </p>
      {aiStatus?.action && (
        <p
          id="errorAction"
          style={{
            fontSize: '12px',
            background: '#f0f0f0',
            padding: '8px',
            borderRadius: '4px',
            margin: '10px 0',
          }}
        >
          {aiStatus.action}
        </p>
      )}
      <details style={{ marginTop: '10px' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
          Troubleshooting Steps
        </summary>
        <ol
          style={{
            textAlign: 'left',
            fontSize: '12px',
            marginLeft: '20px',
            marginTop: '10px',
          }}
        >
          <li>
            Go to <code>chrome://flags</code>
          </li>
          <li>Search for "Prompt API for Gemini Nano"</li>
          <li>Set it to "Enabled"</li>
          <li>Restart Chrome completely</li>
          <li>
            Check <code>chrome://on-device-internals</code> for model status
          </li>
        </ol>
      </details>
      <details style={{ marginTop: '10px' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
          System Requirements
        </summary>
        <ul
          style={{
            textAlign: 'left',
            fontSize: '11px',
            marginLeft: '20px',
            marginTop: '10px',
          }}
        >
          <li>Chrome 118+ with AI features enabled</li>
          <li>At least 4GB GPU memory</li>
          <li>22GB free storage space</li>
        </ul>
      </details>
      <button
        id="recheckAI"
        className="secondary-btn"
        style={{ marginTop: '10px' }}
        onClick={onRecheck}
      >
        🔄 Check Again
      </button>
    </div>
  );
}

export default AIUnavailable;
