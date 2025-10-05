import React from 'react';

interface TabStatsProps {
  stats: {
    total: number;
    ungrouped: number;
    groups: number;
  };
}

function TabStats({ stats }: TabStatsProps) {
  return (
    <div className="stats" id="tabStats">
      <div className="stat">
        <span className="stat-number" id="totalTabs">
          {stats.total}
        </span>
        <span className="stat-label">Total Tabs</span>
      </div>
      <div className="stat">
        <span className="stat-number" id="ungroupedTabs">
          {stats.ungrouped}
        </span>
        <span className="stat-label">Ungrouped</span>
      </div>
      <div className="stat">
        <span className="stat-number" id="groups">
          {stats.groups}
        </span>
        <span className="stat-label">Groups</span>
      </div>
    </div>
  );
}

export default TabStats;
