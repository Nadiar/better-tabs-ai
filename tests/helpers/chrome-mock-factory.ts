/**
 * Chrome API Mock Factory
 *
 * Creates properly synchronized Chrome API mocks for testing.
 * Ensures tabs and groups are correctly linked.
 */

export interface MockTab {
  id: number;
  title: string;
  url: string;
  groupId?: number;
  index?: number;
  windowId?: number;
  favIconUrl?: string;
}

export interface MockGroup {
  id: number;
  title: string;
  color: string;
  collapsed?: boolean;
}

export interface MockWindow {
  id: number;
  tabs: MockTab[];
}

/**
 * Creates a fully configured Chrome API mock with tabs and groups
 */
export function createChromeMock(tabs: MockTab[], groups: MockGroup[], windows?: MockWindow[]) {
  // Default to single window with all tabs
  const mockWindows = windows || [{
    id: 1,
    tabs: tabs.map((tab, index) => ({
      ...tab,
      windowId: tab.windowId || 1,
      index: tab.index !== undefined ? tab.index : index
    }))
  }];

  // Ensure all tabs have required fields
  const fullTabs = tabs.map((tab, index) => ({
    id: tab.id,
    title: tab.title,
    url: tab.url,
    groupId: tab.groupId !== undefined ? tab.groupId : -1,
    index: tab.index !== undefined ? tab.index : index,
    windowId: tab.windowId || 1,
    favIconUrl: tab.favIconUrl || `https://www.google.com/s2/favicons?domain=${new URL(tab.url).hostname}`
  }));

  return {
    runtime: {
      sendMessage: async (msg: any) => {
        if (msg.action === 'getSettings') {
          return {
            settings: {
              minConfidenceThreshold: 0.5,
              minTabConfidence: 0.5,
              maxSuggestions: 10,
              showConfidenceScores: true,
              showInlineSuggestions: true,
              defaultGroupColor: 'grey',
              showAdvancedOptions: false
            }
          };
        }
        if (msg.action === 'checkAIAvailability') {
          return {
            available: true,
            status: 'ready',
            statusMessage: 'AI is ready',
            capabilities: { analyze: true, generateNames: true }
          };
        }
        if (msg.action === 'getAnalysisProgress') {
          return { status: 'idle', current: 0, total: 0 };
        }
        if (msg.action === 'getLastAnalysisResults') {
          return { results: null, timestamp: null };
        }
        return { success: true, data: { available: true, status: 'ready' } };
      },
      getManifest: () => ({ version: '2.2.0' }),
      getURL: (path: string) => `chrome-extension://mock/${path}`,
      onMessage: { addListener: () => {}, removeListener: () => {} }
    },
    tabs: {
      query: async () => fullTabs,
      get: async (tabId: number) => fullTabs.find(t => t.id === tabId) || null,
      group: async () => 1,
      ungroup: async () => {},
      remove: async () => {},
      move: async () => {},
      onCreated: { addListener: () => {}, removeListener: () => {} },
      onRemoved: { addListener: () => {}, removeListener: () => {} },
      onUpdated: { addListener: () => {}, removeListener: () => {} },
      onMoved: { addListener: () => {}, removeListener: () => {} }
    },
    tabGroups: {
      TAB_GROUP_ID_NONE: -1,
      query: async () => groups,
      get: async (groupId: number) => groups.find(g => g.id === groupId) || null,
      update: async () => ({}),
      move: async () => {},
      onCreated: { addListener: () => {}, removeListener: () => {} },
      onRemoved: { addListener: () => {}, removeListener: () => {} },
      onUpdated: { addListener: () => {}, removeListener: () => {} },
      onMoved: { addListener: () => {}, removeListener: () => {} }
    },
    windows: {
      getAll: async () => mockWindows,
      get: async (windowId: number) => mockWindows.find(w => w.id === windowId) || null
    },
    storage: {
      local: {
        get: async () => ({}),
        set: async () => {},
        remove: async () => {}
      },
      sync: {
        get: async () => ({}),
        set: async () => {},
        remove: async () => {}
      },
      onChanged: { addListener: () => {}, removeListener: () => {} }
    }
  };
}

/**
 * Sample data for testing drag and drop
 */
export const sampleDragDropData = {
  tabs: [
    { id: 1, title: 'Google', url: 'https://google.com', groupId: -1 },
    { id: 2, title: 'GitHub', url: 'https://github.com', groupId: -1 },
    { id: 3, title: 'Stack Overflow', url: 'https://stackoverflow.com', groupId: 1 },
    { id: 4, title: 'MDN Web Docs', url: 'https://developer.mozilla.org', groupId: 1 },
  ],
  groups: [
    { id: 1, title: 'Dev Resources', color: 'blue', collapsed: false }
  ]
};

/**
 * Sample data with multiple groups
 */
export const sampleMultiGroupData = {
  tabs: [
    { id: 1, title: 'Tab 1', url: 'https://example1.com', groupId: 1 },
    { id: 2, title: 'Tab 2', url: 'https://example2.com', groupId: 2 },
    { id: 3, title: 'Tab 3', url: 'https://example3.com', groupId: -1 },
  ],
  groups: [
    { id: 1, title: 'Group 1', color: 'blue', collapsed: false },
    { id: 2, title: 'Group 2', color: 'red', collapsed: false }
  ]
};
