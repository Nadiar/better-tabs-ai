import React from 'react';
import { useDroppable } from '@dnd-kit/core';

// New Group Box - Droppable area for creating new groups
function NewGroupBox() {
  const { setNodeRef, isOver } = useDroppable({
    id: 'new-group-box'
  });

  return (
    <div className="column new-group-column">
      <div ref={setNodeRef} className={`new-group-box ${isOver ? 'drag-over' : ''}`}>
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