// Chrome API Wrapper - Utility functions for Chrome tabs and groups APIs

const ChromeAPI = {
  /**
   * Get all tabs in all windows
   */
  async getAllTabs() {
    return await chrome.tabs.query({});
  },

  /**
   * Get all tab groups
   */
  async getAllGroups() {
    return await chrome.tabGroups.query({});
  },

  /**
   * Create a new tab group
   * @param {Array<number>} tabIds - Array of tab IDs to group
   * @param {string} name - Group name
   * @param {string} color - Group color (grey, blue, red, yellow, green, pink, purple, cyan)
   */
  async createGroup(tabIds, name = 'Untitled Group', color = 'grey') {
    if (!tabIds || tabIds.length === 0) {
      throw new Error('No tabs provided for grouping');
    }

    // Create group with tabs
    const groupId = await chrome.tabs.group({ tabIds });

    // Update group properties
    await chrome.tabGroups.update(groupId, {
      title: name,
      color: color,
      collapsed: false
    });

    return groupId;
  },

  /**
   * Move tab to an existing group
   * @param {number} tabId - Tab ID to move
   * @param {number} groupId - Destination group ID
   */
  async moveTabToGroup(tabId, groupId) {
    return await chrome.tabs.group({ tabIds: [tabId], groupId });
  },

  /**
   * Remove tab from its group (ungroup)
   * @param {number} tabId - Tab ID to ungroup
   */
  async ungroupTab(tabId) {
    return await chrome.tabs.ungroup([tabId]);
  },

  /**
   * Update group name
   * @param {number} groupId - Group ID
   * @param {string} newName - New group name
   */
  async updateGroupName(groupId, newName) {
    return await chrome.tabGroups.update(groupId, { title: newName });
  },

  /**
   * Update group color
   * @param {number} groupId - Group ID
   * @param {string} color - New color
   */
  async updateGroupColor(groupId, color) {
    return await chrome.tabGroups.update(groupId, { color });
  },

  /**
   * Delete a group (ungroups all tabs)
   * @param {number} groupId - Group ID to delete
   */
  async deleteGroup(groupId) {
    // Get all tabs in the group
    const tabs = await chrome.tabs.query({ groupId });
    const tabIds = tabs.map(t => t.id);

    // Ungroup all tabs
    if (tabIds.length > 0) {
      await chrome.tabs.ungroup(tabIds);
    }
  },

  /**
   * Reorder tabs
   * @param {Array<{tabId: number, position: number}>} moves - Array of tab moves
   */
  async reorderTabs(moves) {
    for (const move of moves) {
      await chrome.tabs.move(move.tabId, { index: move.position });
    }
  },

  /**
   * Close multiple tabs
   * @param {Array<number>} tabIds - Array of tab IDs to close
   */
  async closeTabs(tabIds) {
    if (!tabIds || tabIds.length === 0) return;
    return await chrome.tabs.remove(tabIds);
  },

  /**
   * Pin multiple tabs
   * @param {Array<number>} tabIds - Array of tab IDs to pin
   */
  async pinTabs(tabIds) {
    if (!tabIds || tabIds.length === 0) return;

    const promises = tabIds.map(tabId =>
      chrome.tabs.update(tabId, { pinned: true })
    );

    return await Promise.all(promises);
  },

  /**
   * Unpin multiple tabs
   * @param {Array<number>} tabIds - Array of tab IDs to unpin
   */
  async unpinTabs(tabIds) {
    if (!tabIds || tabIds.length === 0) return;

    const promises = tabIds.map(tabId =>
      chrome.tabs.update(tabId, { pinned: false })
    );

    return await Promise.all(promises);
  }
};

// Export for use in other modules
window.ChromeAPI = ChromeAPI;