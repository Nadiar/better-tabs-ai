import React from 'react';
import type { AIStatus } from '@shared';

interface HeaderProps {
  aiStatus?: AIStatus | null;
  statusText?: string;
}

function Header({ aiStatus, statusText }: HeaderProps) {
  const getStatusClass = () => {
    if (!aiStatus) return 'checking';
    return aiStatus.available ? 'available' : `unavailable status-${aiStatus.status}`;
  };

  const getStatusText = () => {
    if (statusText) return statusText;
    if (!aiStatus) return 'Checking AI...';
    return aiStatus.statusMessage;
  };

  const getTitle = () => {
    if (!aiStatus) return '';
    return aiStatus.detailedStatus || '';
  };

  return (
    <header>
      <div className="logo">
        <img
          src="../icons/icon32.png"
          alt="Better Tabs AI"
          onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
        />
        <h1>Better Tabs AI</h1>
      </div>
      <div className="status" id="aiStatus">
        <span className={`status-dot ${getStatusClass()}`} id="statusDot"></span>
        <span id="statusText" title={getTitle()}>
          {getStatusText()}
        </span>
      </div>
    </header>
  );
}

export default Header;
