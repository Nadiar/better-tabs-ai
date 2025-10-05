import React from 'react';

interface QuickActionsProps {
  onAnalyze: () => void;
  onFindDuplicates: () => void;
  onClearCache: () => void;
  onCopyDebug: () => void;
  isAnalyzing: boolean;
  analysisProgress: { current: number; total: number };
}

function QuickActions({
  onAnalyze,
  onFindDuplicates,
  onClearCache,
  onCopyDebug,
  isAnalyzing,
  analysisProgress,
}: QuickActionsProps) {
  const getAnalyzeButtonText = () => {
    if (!isAnalyzing) return '🤖 Analyze & Group Tabs';
    if (analysisProgress.total > 0) {
      return `🤖 Analyzing ${analysisProgress.current}/${analysisProgress.total}...`;
    }
    return '🤖 Starting...';
  };

  return (
    <div className="quick-actions">
      <button
        id="analyzeTabsBtn"
        className="primary-btn"
        onClick={onAnalyze}
        disabled={isAnalyzing}
      >
        {getAnalyzeButtonText()}
      </button>

      <button
        id="findDuplicatesBtn"
        className="secondary-btn"
        onClick={onFindDuplicates}
      >
        🔍 Find Duplicates
      </button>

      <button
        id="clearCacheBtn"
        className="secondary-btn"
        onClick={onClearCache}
      >
        🧹 Clear Cache
      </button>

      <button id="debugBtn" className="secondary-btn" onClick={onCopyDebug}>
        🔍 Debug Info
      </button>
    </div>
  );
}

export default QuickActions;
