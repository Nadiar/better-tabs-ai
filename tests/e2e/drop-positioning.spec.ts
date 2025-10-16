/**
 * Drop Positioning E2E Tests - Issue #22
 *
 * Tests for precise tab positioning using left/right half detection.
 * Verifies that tabs can be inserted before/after target tabs based on hover position.
 */

import { test, expect } from '@playwright/test';
import { setupMockServer, resetMockServer, closeMockServer } from '../setup';
import { sampleMultiGroupData } from '../helpers/chrome-mock-factory';

// Setup MSW mocking for all tests
test.beforeAll(() => setupMockServer());
test.afterEach(() => resetMockServer());
test.afterAll(() => closeMockServer());

// Helper to perform drag with specific target position (left/right half)
async function performPositionedDrag(
  page: any,
  sourceLocator: any,
  targetLocator: any,
  position: 'before' | 'after'
) {
  const sourceBox = await sourceLocator.boundingBox();
  const targetBox = await targetLocator.boundingBox();

  if (sourceBox && targetBox) {
    const startX = sourceBox.x + sourceBox.width / 2;
    const startY = sourceBox.y + sourceBox.height / 2;

    // Position calculation: before = left quarter, after = right quarter
    const targetX = position === 'before'
      ? targetBox.x + targetBox.width * 0.25
      : targetBox.x + targetBox.width * 0.75;
    const targetY = targetBox.y + targetBox.height / 2;

    // Start drag
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.waitForTimeout(50);

    // Move slightly to activate drag (must exceed 8px activation constraint)
    await page.mouse.move(startX + 10, startY + 10);
    await page.waitForTimeout(100);

    // Move to target position
    await page.mouse.move(targetX, targetY, { steps: 20 });
    await page.waitForTimeout(300); // Extra time to see visual feedback

    // Drop
    await page.mouse.up();
    await page.waitForTimeout(200);
  }
}

// Helper to inject Chrome API mock
async function injectChromeMock(page: any, tabs: any[], groups: any[]) {
  await page.addInitScript(({ tabs, groups }) => {
    const fullTabs = tabs.map((tab: any, index: number) => ({
      id: tab.id,
      title: tab.title,
      url: tab.url,
      groupId: tab.groupId !== undefined ? tab.groupId : -1,
      index: tab.index !== undefined ? tab.index : index,
      windowId: tab.windowId || 1,
      favIconUrl: tab.favIconUrl || `https://www.google.com/s2/favicons?domain=${new URL(tab.url).hostname}`
    }));

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
          return { success: true };
        },
        getManifest: () => ({ version: '2.2.0' }),
        getURL: (path: string) => `chrome-extension://mock/${path}`,
        onMessage: { addListener: () => {}, removeListener: () => {} }
      },
      tabs: {
        query: async () => fullTabs,
        get: async (tabId: number) => fullTabs.find((t: any) => t.id === tabId) || null,
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
        get: async (groupId: number) => groups.find((g: any) => g.id === groupId) || null,
        update: async () => ({}),
        move: async () => {},
        onCreated: { addListener: () => {}, removeListener: () => {} },
        onRemoved: { addListener: () => {}, removeListener: () => {} },
        onUpdated: { addListener: () => {}, removeListener: () => {} },
        onMoved: { addListener: () => {}, removeListener: () => {} }
      },
      windows: {
        getAll: async () => [{
          id: 1,
          tabs: fullTabs
        }],
        get: async () => ({ id: 1, tabs: fullTabs })
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
  }, { tabs, groups });
}

test.describe('Drop Positioning - Insert Before', () => {
  test.beforeEach(async ({ page }) => {
    await injectChromeMock(page, sampleMultiGroupData.tabs, sampleMultiGroupData.groups);
    await page.goto('http://127.0.0.1:8080/full-interface/dist/index.html');
    await page.waitForTimeout(2000);
  });

  test('should insert tab BEFORE target when dropped on left half', async ({ page }) => {
    await expect(page.locator('.app-container')).toBeVisible();

    // Get first group with multiple tabs
    const groupContainer = page.locator('.group-container').first();
    const groupTabs = groupContainer.locator('.tab-card');
    const tabCount = await groupTabs.count();

    if (tabCount < 2) {
      test.skip();
      return;
    }

    // Get titles before drag
    const firstTabTitle = await groupTabs.nth(0).locator('.tab-title').textContent();
    const secondTabTitle = await groupTabs.nth(1).locator('.tab-title').textContent();
    const thirdTabTitle = tabCount > 2 ? await groupTabs.nth(2).locator('.tab-title').textContent() : null;

    // Drag third tab to BEFORE second tab (left half)
    if (tabCount > 2) {
      const thirdTab = groupTabs.nth(2);
      const secondTab = groupTabs.nth(1);

      await performPositionedDrag(page, thirdTab, secondTab, 'before');

      // Verify order: should be [first, third, second, ...]
      const newFirstTitle = await groupTabs.nth(0).locator('.tab-title').textContent();
      const newSecondTitle = await groupTabs.nth(1).locator('.tab-title').textContent();
      const newThirdTitle = await groupTabs.nth(2).locator('.tab-title').textContent();

      expect(newFirstTitle).toBe(firstTabTitle); // First unchanged
      expect(newSecondTitle).toBe(thirdTabTitle); // Third moved before second
      expect(newThirdTitle).toBe(secondTabTitle); // Second pushed down
    }
  });

  test('should show visual border feedback on left side when hovering left half', async ({ page }) => {
    await expect(page.locator('.app-container')).toBeVisible();

    const groupContainer = page.locator('.group-container').first();
    const groupTabs = groupContainer.locator('.tab-card');
    const tabCount = await groupTabs.count();

    if (tabCount < 2) {
      test.skip();
      return;
    }

    const firstTab = groupTabs.nth(0);
    const secondTab = groupTabs.nth(1);

    const firstBox = await firstTab.boundingBox();
    const secondBox = await secondTab.boundingBox();

    if (firstBox && secondBox) {
      // Start dragging first tab
      await page.mouse.move(firstBox.x + firstBox.width / 2, firstBox.y + firstBox.height / 2);
      await page.mouse.down();
      await page.waitForTimeout(50);
      await page.mouse.move(firstBox.x + firstBox.width / 2 + 10, firstBox.y + firstBox.height / 2 + 10);
      await page.waitForTimeout(100);

      // Hover over LEFT half of second tab
      const leftHalfX = secondBox.x + secondBox.width * 0.25;
      const centerY = secondBox.y + secondBox.height / 2;
      await page.mouse.move(leftHalfX, centerY, { steps: 10 });
      await page.waitForTimeout(200);

      // Check for visual feedback (border-left should be applied via inline style)
      const secondTabStyle = await secondTab.getAttribute('style');
      // Should contain border-left styling (from SortableTabCard inline styles)
      expect(secondTabStyle).toContain('border');

      // Clean up
      await page.mouse.up();
    }
  });
});

test.describe('Drop Positioning - Insert After', () => {
  test.beforeEach(async ({ page }) => {
    await injectChromeMock(page, sampleMultiGroupData.tabs, sampleMultiGroupData.groups);
    await page.goto('http://127.0.0.1:8080/full-interface/dist/index.html');
    await page.waitForTimeout(2000);
  });

  test('should insert tab AFTER target when dropped on right half', async ({ page }) => {
    await expect(page.locator('.app-container')).toBeVisible();

    const groupContainer = page.locator('.group-container').first();
    const groupTabs = groupContainer.locator('.tab-card');
    const tabCount = await groupTabs.count();

    if (tabCount < 3) {
      test.skip();
      return;
    }

    // Get titles before drag
    const firstTabTitle = await groupTabs.nth(0).locator('.tab-title').textContent();
    const secondTabTitle = await groupTabs.nth(1).locator('.tab-title').textContent();
    const thirdTabTitle = await groupTabs.nth(2).locator('.tab-title').textContent();

    // Drag first tab to AFTER second tab (right half)
    const firstTab = groupTabs.nth(0);
    const secondTab = groupTabs.nth(1);

    await performPositionedDrag(page, firstTab, secondTab, 'after');

    // Verify order: should be [second, first, third, ...]
    const newFirstTitle = await groupTabs.nth(0).locator('.tab-title').textContent();
    const newSecondTitle = await groupTabs.nth(1).locator('.tab-title').textContent();

    expect(newFirstTitle).toBe(secondTabTitle); // Second moved to first
    expect(newSecondTitle).toBe(firstTabTitle); // First moved after second
  });

  test('should show visual border feedback on right side when hovering right half', async ({ page }) => {
    await expect(page.locator('.app-container')).toBeVisible();

    const groupContainer = page.locator('.group-container').first();
    const groupTabs = groupContainer.locator('.tab-card');
    const tabCount = await groupTabs.count();

    if (tabCount < 2) {
      test.skip();
      return;
    }

    const firstTab = groupTabs.nth(0);
    const secondTab = groupTabs.nth(1);

    const firstBox = await firstTab.boundingBox();
    const secondBox = await secondTab.boundingBox();

    if (firstBox && secondBox) {
      // Start dragging first tab
      await page.mouse.move(firstBox.x + firstBox.width / 2, firstBox.y + firstBox.height / 2);
      await page.mouse.down();
      await page.waitForTimeout(50);
      await page.mouse.move(firstBox.x + firstBox.width / 2 + 10, firstBox.y + firstBox.height / 2 + 10);
      await page.waitForTimeout(100);

      // Hover over RIGHT half of second tab
      const rightHalfX = secondBox.x + secondBox.width * 0.75;
      const centerY = secondBox.y + secondBox.height / 2;
      await page.mouse.move(rightHalfX, centerY, { steps: 10 });
      await page.waitForTimeout(200);

      // Check for visual feedback
      const secondTabStyle = await secondTab.getAttribute('style');
      expect(secondTabStyle).toContain('border');

      // Clean up
      await page.mouse.up();
    }
  });
});

test.describe('Drop Positioning - Cross-Group', () => {
  test.beforeEach(async ({ page }) => {
    await injectChromeMock(page, sampleMultiGroupData.tabs, sampleMultiGroupData.groups);
    await page.goto('http://127.0.0.1:8080/full-interface/dist/index.html');
    await page.waitForTimeout(2000);
  });

  test('should move tab to different group with precise positioning', async ({ page }) => {
    await expect(page.locator('.app-container')).toBeVisible();

    // Should have 2 groups
    const groups = page.locator('.group-container');
    await expect(groups).toHaveCount(2);

    // Get first tab from first group
    const firstGroup = groups.nth(0);
    const firstGroupTab = firstGroup.locator('.tab-card').first();
    const firstGroupTabTitle = await firstGroupTab.locator('.tab-title').textContent();

    // Get second tab from second group (target)
    const secondGroup = groups.nth(1);
    const secondGroupTabs = secondGroup.locator('.tab-card');
    const secondGroupSecondTab = secondGroupTabs.nth(1);

    const initialSecondGroupCount = await secondGroupTabs.count();

    // Drag from group 1 to BEFORE second tab in group 2
    await performPositionedDrag(page, firstGroupTab, secondGroupSecondTab, 'before');

    // Verify tab moved to group 2
    const finalSecondGroupCount = await secondGroup.locator('.tab-card').count();
    expect(finalSecondGroupCount).toBe(initialSecondGroupCount + 1);

    // Verify it was inserted at correct position (index 1)
    const insertedTabTitle = await secondGroup.locator('.tab-card').nth(1).locator('.tab-title').textContent();
    expect(insertedTabTitle).toBe(firstGroupTabTitle);
  });
});

test.describe('Drop Positioning - Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await injectChromeMock(page, sampleMultiGroupData.tabs, sampleMultiGroupData.groups);
    await page.goto('http://127.0.0.1:8080/full-interface/dist/index.html');
    await page.waitForTimeout(2000);
  });

  test('should insert at start when dropping before first tab', async ({ page }) => {
    await expect(page.locator('.app-container')).toBeVisible();

    const groupContainer = page.locator('.group-container').first();
    const groupTabs = groupContainer.locator('.tab-card');
    const tabCount = await groupTabs.count();

    if (tabCount < 2) {
      test.skip();
      return;
    }

    const lastTab = groupTabs.nth(tabCount - 1);
    const firstTab = groupTabs.nth(0);

    const lastTabTitle = await lastTab.locator('.tab-title').textContent();

    // Drag last tab to BEFORE first tab
    await performPositionedDrag(page, lastTab, firstTab, 'before');

    // Verify it became the new first tab
    const newFirstTabTitle = await groupTabs.nth(0).locator('.tab-title').textContent();
    expect(newFirstTabTitle).toBe(lastTabTitle);
  });

  test('should append at end when dropping after last tab', async ({ page }) => {
    await expect(page.locator('.app-container')).toBeVisible();

    const groupContainer = page.locator('.group-container').first();
    const groupTabs = groupContainer.locator('.tab-card');
    const tabCount = await groupTabs.count();

    if (tabCount < 2) {
      test.skip();
      return;
    }

    const firstTab = groupTabs.nth(0);
    const lastTab = groupTabs.nth(tabCount - 1);

    const firstTabTitle = await firstTab.locator('.tab-title').textContent();

    // Drag first tab to AFTER last tab
    await performPositionedDrag(page, firstTab, lastTab, 'after');

    // Verify it became the new last tab
    const newTabCount = await groupTabs.count();
    const newLastTabTitle = await groupTabs.nth(newTabCount - 1).locator('.tab-title').textContent();
    expect(newLastTabTitle).toBe(firstTabTitle);
  });
});
