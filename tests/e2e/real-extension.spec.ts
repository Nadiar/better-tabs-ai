/**
 * Real Extension E2E Tests
 *
 * Tests the actual Chrome extension loaded in a real browser instance.
 * This allows testing with real Chrome APIs and potentially real Gemini Nano.
 *
 * NOTE: These tests are slower than mock tests but provide real environment testing.
 */

import { test, expect, chromium, BrowserContext } from '@playwright/test';
import path from 'path';

// Path to the extension directory
const extensionPath = path.join(__dirname, '../..');

// Test with real extension loaded
test.describe('Real Extension Tests', () => {
  let context: BrowserContext;
  let extensionId: string;

  test.beforeAll(async () => {
    // Launch Chrome with extension loaded
    context = await chromium.launchPersistentContext('', {
      headless: false, // Extensions require headed mode
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ],
    });

    // Wait a bit for extension to initialize
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get extension ID from background page
    const backgroundPages = context.backgroundPages();
    if (backgroundPages.length > 0) {
      const backgroundPage = backgroundPages[0];
      const url = backgroundPage.url();
      extensionId = url.split('/')[2];
      console.log('Extension ID:', extensionId);
    } else {
      // Try to find it from service worker
      const serviceWorkers = context.serviceWorkers();
      if (serviceWorkers.length > 0) {
        const url = serviceWorkers[0].url();
        extensionId = url.split('/')[2];
        console.log('Extension ID from service worker:', extensionId);
      }
    }
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('should load extension successfully', async () => {
    expect(extensionId).toBeDefined();
    expect(extensionId).toMatch(/^[a-z]{32}$/); // Chrome extension IDs are 32 lowercase letters
  });

  test('should open popup interface', async ({ page }) => {
    // Open popup page directly
    await page.goto(`chrome-extension://${extensionId}/popup-react/dist/index.html`);
    await page.waitForTimeout(2000);

    // Check if popup loaded
    const title = await page.title();
    expect(title).toBeTruthy();

    // Check for main app container
    const app = await page.locator('#root').count();
    expect(app).toBeGreaterThan(0);
  });

  test('should open full interface', async ({ page }) => {
    // Open full interface page directly
    await page.goto(`chrome-extension://${extensionId}/full-interface/dist/index.html`);
    await page.waitForTimeout(2000);

    // Check if interface loaded
    const appContainer = page.locator('.app-container');
    await expect(appContainer).toBeVisible({ timeout: 10000 });
  });

  test('should have working service worker', async () => {
    const serviceWorkers = context.serviceWorkers();
    expect(serviceWorkers.length).toBeGreaterThan(0);

    const serviceWorker = serviceWorkers.find(sw =>
      sw.url().includes(extensionId)
    );

    expect(serviceWorker).toBeDefined();
  });

  test('should be able to query tabs', async ({ page }) => {
    // Open a test page first
    await page.goto('https://example.com');
    await page.waitForTimeout(1000);

    // Now open full interface
    const fullInterfacePage = await context.newPage();
    await fullInterfacePage.goto(`chrome-extension://${extensionId}/full-interface/dist/index.html`);
    await fullInterfacePage.waitForTimeout(2000);

    // Check if tabs are displayed (should show at least the example.com tab)
    const tabs = fullInterfacePage.locator('.tab-card');
    const tabCount = await tabs.count();

    // Should have at least 1 tab (the example.com page)
    expect(tabCount).toBeGreaterThanOrEqual(1);
  });

  test('should check AI availability in popup', async ({ page }) => {
    // Open popup
    await page.goto(`chrome-extension://${extensionId}/popup-react/dist/index.html`);
    await page.waitForTimeout(3000); // Wait for AI status check

    // Look for AI status indicator
    const statusIndicator = page.locator('[class*="status"], [class*="ai-status"]');
    const statusExists = await statusIndicator.count() > 0;

    if (statusExists) {
      const statusText = await statusIndicator.textContent();
      console.log('AI Status:', statusText);

      // Check if AI is ready or if there's a warning
      const hasReadyStatus = statusText?.toLowerCase().includes('ready');
      const hasWarning = statusText?.toLowerCase().includes('not') ||
                        statusText?.toLowerCase().includes('unavailable');

      expect(hasReadyStatus || hasWarning).toBe(true);
    }
  });

  test('should have analyze button visible (if AI available)', async ({ page }) => {
    // Open full interface
    await page.goto(`chrome-extension://${extensionId}/full-interface/dist/index.html`);
    await page.waitForTimeout(2000);

    // Look for analyze button
    const analyzeButton = page.locator('button:has-text("Analyze"), button:has-text("AI")');

    // Button should exist (even if disabled)
    const buttonCount = await analyzeButton.count();
    expect(buttonCount).toBeGreaterThan(0);

    if (buttonCount > 0) {
      const isVisible = await analyzeButton.first().isVisible();
      console.log('Analyze button visible:', isVisible);
    }
  });
});

test.describe('Real Extension - Chrome API Tests', () => {
  let context: BrowserContext;
  let extensionId: string;

  test.beforeAll(async () => {
    context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ],
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    const serviceWorkers = context.serviceWorkers();
    if (serviceWorkers.length > 0) {
      const url = serviceWorkers[0].url();
      extensionId = url.split('/')[2];
    }
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('should execute script in page context', async ({ page }) => {
    await page.goto(`chrome-extension://${extensionId}/full-interface/dist/index.html`);
    await page.waitForTimeout(2000);

    // Check if chrome APIs are available in extension context
    const hasChromeAPI = await page.evaluate(() => {
      return typeof (window as any).chrome !== 'undefined' &&
             typeof (window as any).chrome.runtime !== 'undefined';
    });

    expect(hasChromeAPI).toBe(true);
  });

  test('should be able to access chrome.storage', async ({ page }) => {
    await page.goto(`chrome-extension://${extensionId}/full-interface/dist/index.html`);
    await page.waitForTimeout(2000);

    // Try to read from storage
    const storageWorks = await page.evaluate(async () => {
      try {
        const result = await (window as any).chrome.storage.local.get('lastAnalysisResults');
        return { success: true, hasData: !!result };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    expect(storageWorks.success).toBe(true);
  });
});
