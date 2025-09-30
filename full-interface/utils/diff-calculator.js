/**
 * Diff Calculator - Compares original and staged state to generate operations
 */

export function calculateDiff(originalState, stagedState) {
  const operations = {
    newGroups: [],
    groupRenames: [],
    groupDeletes: [],
    tabMoves: [],
    tabReorders: [],
    tabCloses: [],
    tabPins: [],
    tabUnpins: []
  };

  // 1. Find new groups (negative IDs)
  operations.newGroups = stagedState.groups.filter(g => g.id < 0).map(group => ({
    tempId: group.id,
    title: group.title || 'New Group',
    color: group.color || 'grey',
    tabIds: stagedState.tabs.filter(t => t.groupId === group.id).map(t => t.id)
  }));

  // 2. Find deleted groups
  const stagedGroupIds = new Set(stagedState.groups.map(g => g.id));
  operations.groupDeletes = originalState.groups
    .filter(g => !stagedGroupIds.has(g.id))
    .map(g => g.id);

  // 3. Find renamed groups
  operations.groupRenames = stagedState.groups
    .filter(g => g.id > 0)
    .filter(g => {
      const original = originalState.groups.find(og => og.id === g.id);
      return original && original.title !== g.title;
    })
    .map(g => ({
      groupId: g.id,
      oldTitle: originalState.groups.find(og => og.id === g.id).title,
      newTitle: g.title
    }));

  // 4. Find moved tabs (different groupId)
  operations.tabMoves = stagedState.tabs
    .filter(t => {
      const original = originalState.tabs.find(ot => ot.id === t.id);
      return original && original.groupId !== t.groupId;
    })
    .map(t => {
      const original = originalState.tabs.find(ot => ot.id === t.id);
      return {
        tabId: t.id,
        fromGroup: original.groupId,
        toGroup: t.groupId,
        title: t.title
      };
    });

  // 5. Find reordered tabs (different index)
  operations.tabReorders = stagedState.tabs
    .filter(t => {
      const original = originalState.tabs.find(ot => ot.id === t.id);
      return original && original.index !== t.index;
    })
    .map(t => ({
      tabId: t.id,
      oldIndex: originalState.tabs.find(ot => ot.id === t.id).index,
      newIndex: t.index
    }));

  return operations;
}

export function countChanges(operations) {
  return (
    operations.newGroups.length +
    operations.groupRenames.length +
    operations.groupDeletes.length +
    operations.tabMoves.length +
    operations.tabReorders.length +
    operations.tabCloses.length +
    operations.tabPins.length +
    operations.tabUnpins.length
  );
}

export function describeChanges(operations) {
  const descriptions = [];

  if (operations.newGroups.length > 0) {
    descriptions.push(`${operations.newGroups.length} new group(s)`);
  }
  if (operations.groupRenames.length > 0) {
    descriptions.push(`${operations.groupRenames.length} renamed`);
  }
  if (operations.groupDeletes.length > 0) {
    descriptions.push(`${operations.groupDeletes.length} deleted`);
  }
  if (operations.tabMoves.length > 0) {
    descriptions.push(`${operations.tabMoves.length} tab(s) moved`);
  }
  if (operations.tabReorders.length > 0) {
    descriptions.push(`${operations.tabReorders.length} reordered`);
  }

  return descriptions.join(', ') || 'No changes';
}
