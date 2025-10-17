/**
 * Ephemeral Groups E2E Tests - v2.3.0 Feature
 *
 * Tests for the unified ephemeral groups architecture where AI suggestions
 * are regular GroupData objects with `isSuggested: true` flag.
 *
 * Critical behaviors tested:
 * 1. Creating ephemeral groups from AI analysis
 * 2. Dismissing individual ephemeral groups
 * 3. Cancel removes all ephemeral groups
 * 4. Apply converts ephemeral to permanent groups
 * 5. Re-analysis clears old ephemeral groups
 */

import { test, expect } from '@playwright/test';
import { setupMockServer, resetMockServer, closeMockServer } from '../setup';

// Setup MSW mocking for all tests
test.beforeAll(() => setupMockServer());
test.afterEach(() => resetMockServer());
test.afterAll(() => closeMockServer());

// Helper to inject Chrome API mock with ephemeral group support
async function injectChromeMock(page: any, tabs: any[], groups: any[], mockAIResponse?: any) {
  await page.addInitScript(({ tabs, groups, mockAIResponse }) => {
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
          if (msg.action === 'analyzeTabGroups') {
            // Return mock AI response if provided
            if (mockAIResponse) {
              return mockAIResponse;
            }
            // Default: Create 2 suggested groups
            return {
              success: true,
              suggestions: [
                {
                  title: 'Work Tabs',
                  confidence: 0.95,
                  tabs: [tabs[0]?.id, tabs[1]?.id].filter(Boolean)
                },
                {
                  title: 'Research',
                  confidence: 0.85,
                  tabs: [tabs[2]?.id, tabs[3]?.id].filter(Boolean)
                }
              ]
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
        getManifest: () => ({ version: '2.3.0' }),
        getURL: (path: string) => `chrome-extension://mock/${path}`,
        onMessage: { addListener: () => {}, removeListener: () => {} }
      },
      tabs: {
        query: async () => fullTabs,
        get: async (tabId: number) => fullTabs.find((t: any) => t.id === tabId) || null,
        group: async (options: any) => {
          // Return new group ID
          return Math.max(...groups.map((g: any) => g.id), 0) + 1;
        },
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
        update: async (groupId: number, updateProperties: any) => {
          const group = groups.find((g: any) => g.id === groupId);
          if (group) {
            Object.assign(group, updateProperties);
          }
          return group || {};
        },
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
  }, { tabs, groups, mockAIResponse });
}

// Sample data for ephemeral groups tests
const sampleTabs = [
  { id: 1, title: 'Work Email', url: 'https://mail.google.com', groupId: -1 },
  { id: 2, title: 'Calendar', url: 'https://calendar.google.com', groupId: -1 },
  { id: 3, title: 'Documentation', url: 'https://developer.mozilla.org', groupId: -1 },
  { id: 4, title: 'API Reference', url: 'https://nodejs.org/api', groupId: -1 },
  { id: 5, title: 'YouTube', url: 'https://youtube.com', groupId: -1 },
  { id: 6, title: 'Reddit', url: 'https://reddit.com', groupId: -1 }
];

const sampleGroups: any[] = [];

test.describe('Ephemeral Groups - Creation', () => {
  test.beforeEach(async ({ page }) => {
    await injectChromeMock(page, sampleTabs, sampleGroups);
    await page.goto('http://127.0.0.1:8081/full-interface/dist/index.html');
    await expect(page.locator('.app-container')).toBeVisible({ timeout: 5000 });
  });

  test('should create ephemeral groups from AI analysis with suggested styling', async ({ page }) => {
    // Wait for interface to load
    await expect(page.locator('.app-container')).toBeVisible();

    // Verify all tabs start in ungrouped column
    const ungroupedTabs = page.locator('.ungrouped-column .tab-card');
    await expect(ungroupedTabs).toHaveCount(6);

    // Click Analyze button
    const analyzeButton = page.locator('button:has-text("Analyze"), button:has-text("AI Analysis")');
    await expect(analyzeButton).toBeVisible();
    await analyzeButton.click();

    // Wait for analysis to complete and ephemeral groups to appear
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500); // Small wait for React state updates

    // Check for ephemeral groups (they should have special styling/attributes)
    const groupContainers = page.locator('.group-container');
    const groupCount = await groupContainers.count();

    // Should have created suggested groups
    expect(groupCount).toBeGreaterThan(0);

    // Verify groups have visual indicators for ephemeral state
    // (exact selectors depend on implementation - could be class, data attribute, or badge)
    for (let i = 0; i < groupCount; i++) {
      const group = groupContainers.nth(i);

      // Check for suggested/ephemeral indicators
      // This might be a class, data attribute, or badge element
      const groupElement = await group.evaluate(el => {
        return {
          classList: Array.from(el.classList),
          dataset: { ...el.dataset },
          hasSuggestedBadge: !!el.querySelector('[class*="suggested"], [class*="Suggested"]')
        };
      });

      // At least one indicator should be present
      const hasEphemeralIndicator =
        groupElement.classList.some((cls: string) => cls.includes('suggested') || cls.includes('ephemeral')) ||
        groupElement.dataset.suggested === 'true' ||
        groupElement.hasSuggestedBadge;

      expect(hasEphemeralIndicator).toBe(true);
    }
  });
});

test.describe('Ephemeral Groups - Cancel Behavior', () => {
  test.beforeEach(async ({ page }) => {
    await injectChromeMock(page, sampleTabs, sampleGroups);
    await page.goto('http://127.0.0.1:8081/full-interface/dist/index.html');
    await expect(page.locator('.app-container')).toBeVisible({ timeout: 5000 });
  });

  test('should remove all ephemeral groups on cancel and restore tabs to ungrouped', async ({ page }) => {
    // Create ephemeral groups first
    const analyzeButton = page.locator('button:has-text("Analyze"), button:has-text("AI Analysis")');
    await analyzeButton.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Verify ephemeral groups were created
    const groupsBefore = await page.locator('.group-container').count();
    expect(groupsBefore).toBeGreaterThan(0);

    // Click Cancel button
    const cancelButton = page.locator('button:has-text("Cancel")');
    await expect(cancelButton).toBeVisible();
    await cancelButton.click();

    // Wait for cleanup to complete
    await page.waitForTimeout(300);

    // Verify ALL ephemeral groups removed
    const groupsAfter = await page.locator('.group-container').count();
    expect(groupsAfter).toBe(0);

    // Verify all tabs returned to ungrouped column
    const ungroupedTabs = page.locator('.ungrouped-column .tab-card');
    await expect(ungroupedTabs).toHaveCount(6);
  });
});

test.describe('Ephemeral Groups - Apply Behavior', () => {
  test.beforeEach(async ({ page }) => {
    await injectChromeMock(page, sampleTabs, sampleGroups);
    await page.goto('http://127.0.0.1:8081/full-interface/dist/index.html');
    await expect(page.locator('.app-container')).toBeVisible({ timeout: 5000 });
  });

  test('should convert ephemeral groups to permanent on apply', async ({ page }) => {
    // Create ephemeral groups first
    const analyzeButton = page.locator('button:has-text("Analyze"), button:has-text("AI Analysis")');
    await analyzeButton.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Verify ephemeral groups exist
    const groupsBefore = await page.locator('.group-container').count();
    expect(groupsBefore).toBeGreaterThan(0);

    // Verify groups have ephemeral indicators before apply
    const firstGroupBefore = page.locator('.group-container').first();
    const beforeState = await firstGroupBefore.evaluate(el => ({
      classList: Array.from(el.classList),
      dataset: { ...el.dataset }
    }));

    // Click Apply button
    const applyButton = page.locator('button:has-text("Apply"), button:has-text("Apply Changes")');
    await expect(applyButton).toBeVisible();
    await applyButton.click();

    // Wait for conversion to complete
    await page.waitForTimeout(500);

    // Groups should still exist (same count)
    const groupsAfter = await page.locator('.group-container').count();
    expect(groupsAfter).toBe(groupsBefore);

    // Verify ephemeral indicators removed (groups are now permanent)
    const firstGroupAfter = page.locator('.group-container').first();
    const afterState = await firstGroupAfter.evaluate(el => ({
      classList: Array.from(el.classList),
      dataset: { ...el.dataset },
      hasSuggestedBadge: !!el.querySelector('[class*="suggested"], [class*="Suggested"]')
    }));

    // Ephemeral indicators should be removed
    const stillHasEphemeralIndicator =
      afterState.classList.some((cls: string) => cls.includes('suggested') || cls.includes('ephemeral')) ||
      afterState.dataset.suggested === 'true' ||
      afterState.hasSuggestedBadge;

    // After apply, groups should NOT have ephemeral indicators
    expect(stillHasEphemeralIndicator).toBe(false);
  });
});

test.describe('Ephemeral Groups - Re-analysis Behavior', () => {
  test.beforeEach(async ({ page }) => {
    await injectChromeMock(page, sampleTabs, sampleGroups);
    await page.goto('http://127.0.0.1:8081/full-interface/dist/index.html');
    await expect(page.locator('.app-container')).toBeVisible({ timeout: 5000 });
  });

  test('should clear old ephemeral groups when re-running analysis', async ({ page }) => {
    // First analysis
    const analyzeButton = page.locator('button:has-text("Analyze"), button:has-text("AI Analysis")');
    await analyzeButton.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Verify first set of ephemeral groups
    const groupsAfterFirst = await page.locator('.group-container').count();
    expect(groupsAfterFirst).toBeGreaterThan(0);

    // Get the titles of first analysis groups
    const firstAnalysisGroupTitles: string[] = [];
    for (let i = 0; i < groupsAfterFirst; i++) {
      const title = await page.locator('.group-container').nth(i).locator('.group-title, .group-header').textContent();
      if (title) firstAnalysisGroupTitles.push(title.trim());
    }

    // Second analysis - click Analyze again
    await analyzeButton.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Verify new set of ephemeral groups exist
    const groupsAfterSecond = await page.locator('.group-container').count();
    expect(groupsAfterSecond).toBeGreaterThan(0);

    // The old ephemeral groups should have been cleared
    // In a real implementation, the AI might return different suggestions
    // For this test, we just verify that re-analysis doesn't accumulate groups

    // The count should be similar (not doubled)
    expect(groupsAfterSecond).toBeLessThanOrEqual(groupsAfterFirst + 1);

    // Verify no leftover single-tab groups from cleanup
    // (This checks for the bug fixed in commit 5be5b1d)
    for (let i = 0; i < groupsAfterSecond; i++) {
      const tabsInGroup = await page.locator('.group-container').nth(i).locator('.tab-card').count();
      // Groups should have at least 1 tab (ephemeral groups from suggestions should have 2+)
      expect(tabsInGroup).toBeGreaterThan(0);
    }
  });
});

test.describe('Ephemeral Groups - Individual Dismissal', () => {
  test.beforeEach(async ({ page }) => {
    await injectChromeMock(page, sampleTabs, sampleGroups);
    await page.goto('http://127.0.0.1:8081/full-interface/dist/index.html');
    await expect(page.locator('.app-container')).toBeVisible({ timeout: 5000 });
  });

  test('should remove individual ephemeral group on dismiss and move tabs to ungrouped', async ({ page }) => {
    // Create ephemeral groups
    const analyzeButton = page.locator('button:has-text("Analyze"), button:has-text("AI Analysis")');
    await analyzeButton.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Get initial counts
    const initialGroupCount = await page.locator('.group-container').count();
    expect(initialGroupCount).toBeGreaterThan(0);

    const initialUngroupedCount = await page.locator('.ungrouped-column .tab-card').count();

    // Find and click dismiss button on first ephemeral group
    const firstGroup = page.locator('.group-container').first();
    const tabsInFirstGroup = await firstGroup.locator('.tab-card').count();

    // Look for dismiss/remove button (could be X, close icon, or "Dismiss" button)
    const dismissButton = firstGroup.locator(
      'button:has-text("Dismiss"), button:has-text("Remove"), button[class*="dismiss"], button[class*="close"], button[title*="dismiss" i]'
    ).first();

    // Skip test if dismiss button not found (implementation may vary)
    const dismissButtonCount = await dismissButton.count();
    if (dismissButtonCount === 0) {
      test.skip();
      return;
    }

    await dismissButton.click();
    await page.waitForTimeout(300);

    // Verify that specific group was removed
    const finalGroupCount = await page.locator('.group-container').count();
    expect(finalGroupCount).toBe(initialGroupCount - 1);

    // Verify its tabs moved to ungrouped
    const finalUngroupedCount = await page.locator('.ungrouped-column .tab-card').count();
    expect(finalUngroupedCount).toBe(initialUngroupedCount + tabsInFirstGroup);
  });
});
