/**
 * Drag-and-Drop E2E Tests
 *
 * Comprehensive tests for all drag-and-drop interactions in the full interface.
 * These tests verify that all user drag operations work correctly.
 */

import { test, expect } from '@playwright/test';
import { setupMockServer, resetMockServer, closeMockServer } from '../setup';

// Setup MSW mocking for all tests
test.beforeAll(() => setupMockServer());
test.afterEach(() => resetMockServer());
test.afterAll(() => closeMockServer());

// Helper to inject Chrome API mock
async function injectChromeMock(page: any) {
  await page.addInitScript(() => {
    (window as any).chrome = {
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
        query: async () => [
          { id: 1, title: 'Google', url: 'https://google.com', groupId: -1, index: 0 },
          { id: 2, title: 'GitHub', url: 'https://github.com', groupId: -1, index: 1 },
          { id: 3, title: 'Stack Overflow', url: 'https://stackoverflow.com', groupId: 1, index: 2 },
          { id: 4, title: 'MDN Web Docs', url: 'https://developer.mozilla.org', groupId: 1, index: 3 }
        ],
        get: async () => null,
        group: async () => 1,
        ungroup: async () => {},
        remove: async () => {},
        onCreated: { addListener: () => {}, removeListener: () => {} },
        onRemoved: { addListener: () => {}, removeListener: () => {} },
        onUpdated: { addListener: () => {}, removeListener: () => {} },
        onMoved: { addListener: () => {}, removeListener: () => {} }
      },
      tabGroups: {
        TAB_GROUP_ID_NONE: -1,
        query: async () => [
          { id: 1, title: 'Dev Resources', color: 'blue', collapsed: false }
        ],
        update: async () => ({}),
        move: async () => {},
        onCreated: { addListener: () => {}, removeListener: () => {} },
        onRemoved: { addListener: () => {}, removeListener: () => {} },
        onUpdated: { addListener: () => {}, removeListener: () => {} },
        onMoved: { addListener: () => {}, removeListener: () => {} }
      },
      windows: { getAll: async () => [{ id: 1, tabs: [] }] },
      storage: {
        local: { get: async () => ({}), set: async () => {}, remove: async () => {} },
        onChanged: { addListener: () => {}, removeListener: () => {} }
      }
    };
  });
}

test.describe('Drag and Drop - Ungrouped to Group', () => {
  test.beforeEach(async ({ page }) => {
    await injectChromeMock(page);
    await page.goto('http://127.0.0.1:8080/full-interface/dist/index.html');
    await page.waitForTimeout(2000);
  });

  test('should drag tab from ungrouped to existing group', async ({ page }) => {
    // Wait for interface to load
    await expect(page.locator('.app-container')).toBeVisible();

    // Check initial state - should have ungrouped tabs
    const ungroupedColumn = page.locator('.ungrouped-column');
    await expect(ungroupedColumn).toBeVisible();

    // Find an ungrouped tab (Google or GitHub)
    const ungroupedTab = page.locator('.ungrouped-column .tab-card').first();
    await expect(ungroupedTab).toBeVisible();

    // Find the group container
    const groupContainer = page.locator('.group-container').first();
    await expect(groupContainer).toBeVisible();

    // Get initial counts
    const initialUngroupedCount = await page.locator('.ungrouped-column .tab-card').count();
    const initialGroupCount = await page.locator('.group-container .tab-card').count();

    // Drag the tab from ungrouped to the group
    await ungroupedTab.dragTo(groupContainer);

    // Wait for state update
    await page.waitForTimeout(500);

    // Verify the tab moved
    const finalUngroupedCount = await page.locator('.ungrouped-column .tab-card').count();
    const finalGroupCount = await page.locator('.group-container .tab-card').count();

    // Ungrouped should have one less tab
    expect(finalUngroupedCount).toBe(initialUngroupedCount - 1);
    // Group should have one more tab
    expect(finalGroupCount).toBe(initialGroupCount + 1);
  });

  test('should drag tab from ungrouped to New Group box', async ({ page }) => {
    await expect(page.locator('.app-container')).toBeVisible();

    // Find an ungrouped tab
    const ungroupedTab = page.locator('.ungrouped-column .tab-card').first();
    await expect(ungroupedTab).toBeVisible();

    // Find the New Group box
    const newGroupBox = page.locator('.new-group-box');
    await expect(newGroupBox).toBeVisible();

    // Get initial group count
    const initialGroupCount = await page.locator('.group-container').count();

    // Drag to New Group box
    await ungroupedTab.dragTo(newGroupBox);
    await page.waitForTimeout(500);

    // Should have created a new group
    const finalGroupCount = await page.locator('.group-container').count();
    expect(finalGroupCount).toBe(initialGroupCount + 1);
  });
});

test.describe('Drag and Drop - Group to Ungrouped', () => {
  test.beforeEach(async ({ page }) => {
    await injectChromeMock(page);
    await page.goto('http://127.0.0.1:8080/full-interface/dist/index.html');
    await page.waitForTimeout(2000);
  });

  test('should drag tab from group to ungrouped column', async ({ page }) => {
    await expect(page.locator('.app-container')).toBeVisible();

    // Find a grouped tab
    const groupedTab = page.locator('.group-container .tab-card').first();
    await expect(groupedTab).toBeVisible();

    // Find ungrouped column
    const ungroupedColumn = page.locator('.ungrouped-column');
    await expect(ungroupedColumn).toBeVisible();

    // Get initial counts
    const initialGroupCount = await page.locator('.group-container .tab-card').count();
    const initialUngroupedCount = await page.locator('.ungrouped-column .tab-card').count();

    // Drag from group to ungrouped
    await groupedTab.dragTo(ungroupedColumn);
    await page.waitForTimeout(500);

    // Verify the tab moved
    const finalGroupCount = await page.locator('.group-container .tab-card').count();
    const finalUngroupedCount = await page.locator('.ungrouped-column .tab-card').count();

    expect(finalGroupCount).toBe(initialGroupCount - 1);
    expect(finalUngroupedCount).toBe(initialUngroupedCount + 1);
  });
});

test.describe('Drag and Drop - Group to Group', () => {
  test.beforeEach(async ({ page }) => {
    // Mock with multiple groups
    await page.addInitScript(() => {
      (window as any).chrome = {
        runtime: {
          sendMessage: async (msg: any) => {
            if (msg.action === 'getSettings') {
              return { settings: { minConfidenceThreshold: 0.5, minTabConfidence: 0.5, maxSuggestions: 10, showConfidenceScores: true, showInlineSuggestions: true, defaultGroupColor: 'grey', showAdvancedOptions: false } };
            }
            if (msg.action === 'checkAIAvailability') {
              return { available: true, status: 'ready', statusMessage: 'AI is ready', capabilities: { analyze: true, generateNames: true } };
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
          query: async () => [
            { id: 1, title: 'Tab 1', url: 'https://example1.com', groupId: 1, index: 0 },
            { id: 2, title: 'Tab 2', url: 'https://example2.com', groupId: 2, index: 1 }
          ],
          get: async () => null,
          group: async () => 1,
          ungroup: async () => {},
          remove: async () => {},
          onCreated: { addListener: () => {}, removeListener: () => {} },
          onRemoved: { addListener: () => {}, removeListener: () => {} },
          onUpdated: { addListener: () => {}, removeListener: () => {} },
          onMoved: { addListener: () => {}, removeListener: () => {} }
        },
        tabGroups: {
          TAB_GROUP_ID_NONE: -1,
          query: async () => [
            { id: 1, title: 'Group 1', color: 'blue', collapsed: false },
            { id: 2, title: 'Group 2', color: 'red', collapsed: false }
          ],
          update: async () => ({}),
          move: async () => {},
          onCreated: { addListener: () => {}, removeListener: () => {} },
          onRemoved: { addListener: () => {}, removeListener: () => {} },
          onUpdated: { addListener: () => {}, removeListener: () => {} },
          onMoved: { addListener: () => {}, removeListener: () => {} }
        },
        windows: { getAll: async () => [{ id: 1, tabs: [] }] },
        storage: {
          local: { get: async () => ({}), set: async () => {}, remove: async () => {} },
          onChanged: { addListener: () => {}, removeListener: () => {} }
        }
      };
    });

    await page.goto('http://127.0.0.1:8080/full-interface/dist/index.html');
    await page.waitForTimeout(2000);
  });

  test('should drag tab from one group to another', async ({ page }) => {
    await expect(page.locator('.app-container')).toBeVisible();

    // Should have 2 groups
    const groups = page.locator('.group-container');
    await expect(groups).toHaveCount(2);

    // Get first group's tab
    const firstGroupTab = page.locator('.group-container').nth(0).locator('.tab-card').first();
    await expect(firstGroupTab).toBeVisible();

    // Get second group container
    const secondGroup = page.locator('.group-container').nth(1);
    await expect(secondGroup).toBeVisible();

    // Get initial counts
    const initialFirstGroupCount = await page.locator('.group-container').nth(0).locator('.tab-card').count();
    const initialSecondGroupCount = await page.locator('.group-container').nth(1).locator('.tab-card').count();

    // Drag from first group to second group
    await firstGroupTab.dragTo(secondGroup);
    await page.waitForTimeout(500);

    // Verify counts changed
    const finalFirstGroupCount = await page.locator('.group-container').nth(0).locator('.tab-card').count();
    const finalSecondGroupCount = await page.locator('.group-container').nth(1).locator('.tab-card').count();

    expect(finalFirstGroupCount).toBe(initialFirstGroupCount - 1);
    expect(finalSecondGroupCount).toBe(initialSecondGroupCount + 1);
  });
});

test.describe('Drag and Drop - Reordering', () => {
  test.beforeEach(async ({ page }) => {
    await injectChromeMock(page);
    await page.goto('http://127.0.0.1:8080/full-interface/dist/index.html');
    await page.waitForTimeout(2000);
  });

  test('should reorder tabs within the same group', async ({ page }) => {
    await expect(page.locator('.app-container')).toBeVisible();

    // Find a group with multiple tabs
    const groupContainer = page.locator('.group-container').first();
    const groupTabs = groupContainer.locator('.tab-card');

    const tabCount = await groupTabs.count();
    if (tabCount < 2) {
      // Skip if group doesn't have enough tabs
      test.skip();
      return;
    }

    // Get first and second tab
    const firstTab = groupTabs.nth(0);
    const secondTab = groupTabs.nth(1);

    // Get their titles to verify reordering
    const firstTabTitle = await firstTab.locator('.tab-title').textContent();
    const secondTabTitle = await secondTab.locator('.tab-title').textContent();

    // Drag second tab to first position
    await secondTab.dragTo(firstTab);
    await page.waitForTimeout(500);

    // Verify order changed
    const newFirstTabTitle = await groupTabs.nth(0).locator('.tab-title').textContent();
    expect(newFirstTabTitle).toBe(secondTabTitle);
  });
});
