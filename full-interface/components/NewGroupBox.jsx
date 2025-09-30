import React from 'react';

// New Group Box - Right column drop target for creating new groups
function NewGroupBox() {
  return (
    <div className="column new-group-column">
      <div className="new-group-box">
        <div className="new-group-icon">📁</div>
        <h3>New Group</h3>
        <p>Drag tabs here to create a new group</p>
      </div>

      <div className="new-group-instructions">
        <h4>Quick Tips</h4>
        <ul>
          <li>Drag tabs to create groups</li>
          <li>Click group names to edit</li>
          <li>Use ✨ to generate AI names</li>
          <li>Click Apply to save changes</li>
        </ul>
      </div>
    </div>
  );
}

export default NewGroupBox;