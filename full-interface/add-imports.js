const fs = require('fs');

// Fix Layout.jsx
const layoutPath = './components/Layout.jsx';
let layout = fs.readFileSync(layoutPath, 'utf8');
if (!layout.includes('import { useStagedStateContext }')) {
  layout = layout.replace(
    "import React from 'react';\n",
    `import React from 'react';
import { useStagedStateContext } from '../app';
import Header from './Header';
import ConflictBanner from './ConflictBanner';
import UngroupedColumn from './UngroupedColumn';
import GroupsColumn from './GroupsColumn';
import NewGroupBox from './NewGroupBox';

`
  );
  fs.writeFileSync(layoutPath, layout);
  console.log('Fixed Layout.jsx');
}

// Fix UngroupedColumn.jsx
const ungroupedPath = './components/UngroupedColumn.jsx';
let ungrouped = fs.readFileSync(ungroupedPath, 'utf8');
if (!layout.includes('import TabCard')) {
  ungrouped = ungrouped.replace(
    "import React from 'react';\n",
    `import React from 'react';
import TabCard from './TabCard';

`
  );
  fs.writeFileSync(ungroupedPath, ungrouped);
  console.log('Fixed UngroupedColumn.jsx');
}

// Fix GroupsColumn.jsx
const groupsColPath = './components/GroupsColumn.jsx';
let groupsCol = fs.readFileSync(groupsColPath, 'utf8');
if (!groupsCol.includes('import GroupContainer')) {
  groupsCol = groupsCol.replace(
    "import React from 'react';\n",
    `import React from 'react';
import GroupContainer from './GroupContainer';

`
  );
  fs.writeFileSync(groupsColPath, groupsCol);
  console.log('Fixed GroupsColumn.jsx');
}

// Fix GroupContainer.jsx
const groupContPath = './components/GroupContainer.jsx';
let groupCont = fs.readFileSync(groupContPath, 'utf8');
if (!groupCont.includes('import TabCard')) {
  groupCont = groupCont.replace(
    "import React from 'react';\n",
    `import React from 'react';
import TabCard from './TabCard';

`
  );
  fs.writeFileSync(groupContPath, groupCont);
  console.log('Fixed GroupContainer.jsx');
}

console.log('All imports added!');
