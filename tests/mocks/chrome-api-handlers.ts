/**
 * MSW handlers for Chrome API mocking
 *
 * Mocks chrome.tabs and chrome.tabGroups API calls
 * for E2E testing without actual browser tab manipulation.
 */

import { http, HttpResponse } from 'msw';
import { mockTabs, mockGroups, mockTabsWithGroups } from '../fixtures/tabs';

/**
 * Handler for chrome.tabs.query()
 * Returns combined mock tabs (ungrouped + grouped)
 */
export const getTabsHandler = http.get(
  'chrome-extension://*/tabs/query',
  () => {
    const allTabs = [...mockTabs, ...mockTabsWithGroups];
    return HttpResponse.json(allTabs);
  }
);

/**
 * Handler for chrome.tabGroups.query()
 * Returns mock groups
 */
export const getGroupsHandler = http.get(
  'chrome-extension://*/tabGroups/query',
  () => {
    return HttpResponse.json(mockGroups);
  }
);

/**
 * Handler for chrome.tabGroups.create()
 * Returns newly created group
 */
export const createGroupHandler = http.post(
  'chrome-extension://*/tabGroups/create',
  async ({ request }) => {
    const body = await request.json();
    const newGroup = {
      id: Math.floor(Math.random() * 10000),
      title: body.title || 'New Group',
      color: body.color || 'grey',
      collapsed: false,
    };
    return HttpResponse.json(newGroup);
  }
);

/**
 * Handler for chrome.tabs.group()
 * Moves tabs into a group
 */
export const groupTabsHandler = http.post(
  'chrome-extension://*/tabs/group',
  async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      success: true,
      groupId: body.groupId,
      tabIds: body.tabIds,
    });
  }
);

/**
 * Handler for chrome.tabs.ungroup()
 * Removes tabs from group
 */
export const ungroupTabsHandler = http.post(
  'chrome-extension://*/tabs/ungroup',
  async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      success: true,
      tabIds: body.tabIds,
    });
  }
);

/**
 * Handler for chrome.tabGroups.update()
 * Updates group properties (title, color)
 */
export const updateGroupHandler = http.patch(
  'chrome-extension://*/tabGroups/:groupId',
  async ({ request, params }) => {
    const body = await request.json();
    return HttpResponse.json({
      id: params.groupId,
      ...body,
    });
  }
);

/**
 * Handler for chrome.tabs.remove()
 * Closes tabs
 */
export const closeTabsHandler = http.delete(
  'chrome-extension://*/tabs/remove',
  async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      success: true,
      removedTabIds: body.tabIds,
    });
  }
);

/**
 * All Chrome API handlers
 * Export as array for MSW server setup
 */
export const chromeAPIHandlers = [
  getTabsHandler,
  getGroupsHandler,
  createGroupHandler,
  groupTabsHandler,
  ungroupTabsHandler,
  updateGroupHandler,
  closeTabsHandler,
];
