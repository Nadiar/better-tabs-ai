import React from 'react';
import GroupContainer from './GroupContainer';


// Groups Column - Center column showing existing groups
function GroupsColumn({ groups, tabs }) {
  return (
    <div className="column groups-column">
      <div className="column-header">
        <h2>Tab Groups</h2>
        <span className="count-badge">{groups.length}</span>
      </div>

      <div className="column-content">
        {groups.length === 0 ? (
          <div className="empty-state">
            <p>No groups yet</p>
            <small>Drag tabs to "New Group" to create one</small>
          </div>
        ) : (
          groups.map(group => (
            <GroupContainer
              key={group.id}
              group={group}
              tabs={tabs}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default GroupsColumn;