/**
 * Chrome API Wrapper
 *
 * Provides a typed, consistent interface for Chrome extension APIs.
 * Wraps chrome.tabs and chrome.tabGroups with error handling.
 */

import type {
  TabData,
  GroupData,
  ChromeColor,
  Result,
  APIError,
} from './types';

/**
 * Chrome API namespace
 * All Chrome extension API calls go through these methods
 */
export const ChromeAPI = {
  // ============================================================================
  // Tab Operations
  // ============================================================================

  /**
   * Get all tabs in the current window
   *
   * @returns Array of tab data
   * @example
   * const result = await ChromeAPI.getAllTabs();
   * if (result.success) {
   *   console.log('Tabs:', result.data);
   * }
   */
  async getAllTabs(): Promise<Result<TabData[]>> {
    try {
      const tabs = await chrome.tabs.query({});
      return { success: true, data: tabs as TabData[] };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to get tabs',
          code: 'GET_TABS_FAILED',
          details: error,
        },
      };
    }
  },

  /**
   * Get tabs in current window only
   *
   * @returns Array of tab data for current window
   */
  async getCurrentWindowTabs(): Promise<Result<TabData[]>> {
    try {
      const tabs = await chrome.tabs.query({ currentWindow: true });
      return { success: true, data: tabs as TabData[] };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to get tabs',
          code: 'GET_TABS_FAILED',
          details: error,
        },
      };
    }
  },

  /**
   * Get a specific tab by ID
   *
   * @param tabId Tab ID
   * @returns Tab data
   */
  async getTab(tabId: number): Promise<Result<TabData>> {
    try {
      const tab = await chrome.tabs.get(tabId);
      return { success: true, data: tab as TabData };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to get tab',
          code: 'GET_TAB_FAILED',
          details: error,
        },
      };
    }
  },

  /**
   * Close tabs by IDs
   *
   * @param tabIds Array of tab IDs to close
   * @returns Success status
   */
  async closeTabs(tabIds: number[]): Promise<Result<{ closed: number[] }>> {
    try {
      await chrome.tabs.remove(tabIds);
      return { success: true, data: { closed: tabIds } };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to close tabs',
          code: 'CLOSE_TABS_FAILED',
          details: error,
        },
      };
    }
  },

  // ============================================================================
  // Group Operations
  // ============================================================================

  /**
   * Get all tab groups
   *
   * @returns Array of group data
   * @example
   * const result = await ChromeAPI.getAllGroups();
   * if (result.success) {
   *   console.log('Groups:', result.data);
   * }
   */
  async getAllGroups(): Promise<Result<GroupData[]>> {
    try {
      const groups = await chrome.tabGroups.query({});
      return { success: true, data: groups as GroupData[] };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to get groups',
          code: 'GET_GROUPS_FAILED',
          details: error,
        },
      };
    }
  },

  /**
   * Create a new tab group
   *
   * @param tabIds Array of tab IDs to group
   * @param title Group title
   * @param color Group color
   * @returns Created group data
   * @example
   * const result = await ChromeAPI.createGroup([1, 2, 3], 'Work', 'blue');
   */
  async createGroup(
    tabIds: number[],
    title: string,
    color: ChromeColor = 'grey'
  ): Promise<Result<GroupData>> {
    try {
      // First, group the tabs
      const groupId = await chrome.tabs.group({ tabIds });

      // Then update the group properties
      const group = await chrome.tabGroups.update(groupId, {
        title,
        color,
      });

      return { success: true, data: group as GroupData };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to create group',
          code: 'CREATE_GROUP_FAILED',
          details: error,
        },
      };
    }
  },

  /**
   * Update group properties
   *
   * @param groupId Group ID
   * @param properties Properties to update (title and/or color)
   * @returns Updated group data
   */
  async updateGroup(
    groupId: number,
    properties: { title?: string; color?: ChromeColor; collapsed?: boolean }
  ): Promise<Result<GroupData>> {
    try {
      const group = await chrome.tabGroups.update(groupId, properties);
      return { success: true, data: group as GroupData };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to update group',
          code: 'UPDATE_GROUP_FAILED',
          details: error,
        },
      };
    }
  },

  /**
   * Add tabs to an existing group
   *
   * @param tabIds Array of tab IDs to add
   * @param groupId Group ID
   * @returns Success status
   */
  async addTabsToGroup(
    tabIds: number[],
    groupId: number
  ): Promise<Result<{ groupId: number; tabIds: number[] }>> {
    try {
      await chrome.tabs.group({ tabIds, groupId });
      return { success: true, data: { groupId, tabIds } };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to add tabs to group',
          code: 'ADD_TABS_FAILED',
          details: error,
        },
      };
    }
  },

  /**
   * Remove tabs from their group (ungroup)
   *
   * @param tabIds Array of tab IDs to ungroup
   * @returns Success status
   */
  async ungroupTabs(tabIds: number[]): Promise<Result<{ ungrouped: number[] }>> {
    try {
      await chrome.tabs.ungroup(tabIds);
      return { success: true, data: { ungrouped: tabIds } };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to ungroup tabs',
          code: 'UNGROUP_TABS_FAILED',
          details: error,
        },
      };
    }
  },

  /**
   * Delete a group (ungroups all tabs in it)
   *
   * @param groupId Group ID
   * @returns Success status
   */
  async deleteGroup(groupId: number): Promise<Result<{ deleted: number }>> {
    try {
      // Get tabs in group
      const tabs = await chrome.tabs.query({ groupId });
      const tabIds = tabs.map(t => t.id).filter((id): id is number => id !== undefined);

      // Ungroup all tabs
      if (tabIds.length > 0) {
        await chrome.tabs.ungroup(tabIds);
      }

      return { success: true, data: { deleted: groupId } };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to delete group',
          code: 'DELETE_GROUP_FAILED',
          details: error,
        },
      };
    }
  },

  // ============================================================================
  // Batch Operations
  // ============================================================================

  /**
   * Get all tabs and groups together
   *
   * @returns Tabs and groups data
   * @example
   * const result = await ChromeAPI.getTabsAndGroups();
   * if (result.success) {
   *   const { tabs, groups } = result.data;
   * }
   */
  async getTabsAndGroups(): Promise<
    Result<{ tabs: TabData[]; groups: GroupData[] }>
  > {
    try {
      const [tabs, groups] = await Promise.all([
        chrome.tabs.query({}),
        chrome.tabGroups.query({}),
      ]);

      return {
        success: true,
        data: {
          tabs: tabs as TabData[],
          groups: groups as GroupData[],
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message:
            error instanceof Error ? error.message : 'Failed to get tabs and groups',
          code: 'GET_DATA_FAILED',
          details: error,
        },
      };
    }
  },
};
