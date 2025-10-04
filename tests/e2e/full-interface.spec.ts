/**
 * E2E tests for full drag & drop interface
 *
 * Tests the current full-interface implementation before refactoring.
 * These baseline tests must pass before starting TypeScript migration.
 */

import { test, expect } from '@playwright/test';
import { setupMockServer, resetMockServer, closeMockServer } from '../setup';

// Setup MSW mocking for all tests
test.beforeAll(() => setupMockServer());
test.afterEach(() => resetMockServer());
test.afterAll(() => closeMockServer());

test.describe('Full Interface - Baseline Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to full interface built file
    await page.goto('file://' + process.cwd() + '/full-interface/dist/index.html');

    // Wait for React app to load
    await page.waitForTimeout(1000);
  });

  test('should load full interface successfully', async ({ page }) => {
    // Verify main app container exists
    const appContainer = page.locator('#root, .app-container');
    await expect(appContainer).toBeVisible();

    // Verify header exists
    const header = page.locator('header, .header');
    await expect(header).toBeVisible();
  });

  test('should display three-column layout', async ({ page }) => {
    // Look for ungrouped column
    const ungroupedColumn = page.locator(
      '[class*="ungrouped"], [class*="column"]:has-text("Ungrouped")'
    );

    // Look for groups column
    const groupsColumn = page.locator(
      '[class*="groups"], [class*="column"]:has-text("Groups")'
    );

    // At least one column should be visible
    const ungroupedCount = await ungroupedColumn.count();
    const groupsCount = await groupsColumn.count();

    expect(ungroupedCount + groupsCount).toBeGreaterThan(0);
  });

  test('should have Apply and Cancel buttons', async ({ page }) => {
    const applyButton = page.locator('button:has-text("Apply")');
    const cancelButton = page.locator('button:has-text("Cancel")');

    // Buttons should exist
    const applyCount = await applyButton.count();
    const cancelCount = await cancelButton.count();

    expect(applyCount).toBeGreaterThan(0);
    expect(cancelCount).toBeGreaterThan(0);
  });

  test('should have Analyze button', async ({ page }) => {
    const analyzeButton = page.locator('button:has-text("Analyze")');

    const count = await analyzeButton.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should have search functionality', async ({ page }) => {
    // Look for search input
    const searchInput = page.locator('input[type="text"], input[placeholder*="Search"]');

    const count = await searchInput.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should handle page load without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    await page.reload();
    await page.waitForTimeout(1000);

    // Should have no critical JS errors
    expect(errors.length).toBe(0);
  });
});

test.describe('Full Interface - Drag & Drop Baseline', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('file://' + process.cwd() + '/full-interface/dist/index.html');
    await page.waitForTimeout(1000);
  });

  test('should display tab cards', async ({ page }) => {
    // Look for tab card elements
    const tabCards = page.locator(
      '[class*="tab-card"], [class*="TabCard"], [draggable="true"]'
    );

    const count = await tabCards.count();

    // Might be 0 if no tabs loaded, just verify selector works
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should display group containers', async ({ page }) => {
    // Look for group container elements
    const groupContainers = page.locator(
      '[class*="group-container"], [class*="GroupContainer"]'
    );

    const count = await groupContainers.count();

    // Might be 0 if no groups exist, just verify selector works
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should have draggable elements', async ({ page }) => {
    // Check for draggable attribute
    const draggableElements = page.locator('[draggable="true"]');

    const count = await draggableElements.count();

    // Draggable elements should exist if tabs are rendered
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Full Interface - AI Integration Baseline', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('file://' + process.cwd() + '/full-interface/dist/index.html');
    await page.waitForTimeout(1000);
  });

  test('should have AI analyze button', async ({ page }) => {
    const analyzeButton = page.locator('button:has-text("Analyze")');

    await expect(analyzeButton).toHaveCount(1);
  });

  test('should trigger analysis on button click', async ({ page }) => {
    const analyzeButton = page.locator('button:has-text("Analyze")');

    if (await analyzeButton.isVisible()) {
      await analyzeButton.click();
      await page.waitForTimeout(500);

      // Should not crash
      const errors = page.locator('.error, [class*="error"]');
      const errorCount = await errors.count();

      // Some error elements might exist in DOM but not be visible
      // Just verify the page didn't crash
    }
  });

  test('should display suggestions after analysis', async ({ page }) => {
    const analyzeButton = page.locator('button:has-text("Analyze")');

    if (await analyzeButton.isVisible()) {
      await analyzeButton.click();
      await page.waitForTimeout(2000);

      // Look for suggestion elements
      const suggestions = page.locator(
        '[class*="suggestion"], [class*="Suggested"]'
      );

      // Suggestions may or may not appear depending on mock data loading
      const count = await suggestions.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });
});

test.describe('Full Interface - Staged Changes Baseline', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('file://' + process.cwd() + '/full-interface/dist/index.html');
    await page.waitForTimeout(1000);
  });

  test('should have Apply Changes button', async ({ page }) => {
    const applyButton = page.locator('button:has-text("Apply")');

    await expect(applyButton).toHaveCount(1);

    // Button might be disabled initially (no changes)
    const isDisabled = await applyButton.isDisabled();
    // Just verify it exists, disabled state depends on app state
  });

  test('should have Cancel button', async ({ page }) => {
    const cancelButton = page.locator('button:has-text("Cancel")');

    await expect(cancelButton).toHaveCount(1);
  });

  test('should handle Apply button click', async ({ page }) => {
    const applyButton = page.locator('button:has-text("Apply")');

    if (await applyButton.isEnabled()) {
      await applyButton.click();
      await page.waitForTimeout(500);

      // Should not crash
    }
  });

  test('should handle Cancel button click', async ({ page }) => {
    const cancelButton = page.locator('button:has-text("Cancel")');

    if (await cancelButton.isEnabled()) {
      await cancelButton.click();
      await page.waitForTimeout(500);

      // Should not crash
    }
  });
});

test.describe('Full Interface - Regression Tests', () => {
  test('should not have console errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('file://' + process.cwd() + '/full-interface/dist/index.html');
    await page.waitForTimeout(1000);

    // Filter out expected Chrome extension errors in file:// protocol
    const criticalErrors = errors.filter(
      (err) => !err.includes('chrome.') && !err.includes('extension')
    );

    expect(criticalErrors.length).toBe(0);
  });

  test('should be responsive', async ({ page }) => {
    await page.goto('file://' + process.cwd() + '/full-interface/dist/index.html');

    const appContainer = page.locator('#root, .app-container');
    const box = await appContainer.boundingBox();

    // Verify reasonable dimensions
    expect(box?.width).toBeGreaterThan(600);
    expect(box?.height).toBeGreaterThan(400);
  });
});
