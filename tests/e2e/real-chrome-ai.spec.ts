/**
 * E2E Tests using REAL Chrome with AI APIs
 * Requires Chrome 138+ with Gemini Nano downloaded
 *
 * Run with: CHROME_CHANNEL=chrome npm test -- real-chrome-ai.spec.ts
 */

import { test, expect, chromium } from '@playwright/test';
import path from 'path';

const EXTENSION_PATH = path.resolve(__dirname, '../..');

// Skip these tests if not running against real Chrome
const isRealChrome = process.env.CHROME_CHANNEL === 'chrome';

test.describe.configure({ mode: 'serial' });

test.describe('Real Chrome AI APIs', () => {
  test.skip(!isRealChrome, 'Skipping real Chrome AI tests - set CHROME_CHANNEL=chrome to run');

  let browser: any;
  let context: any;

  test.beforeAll(async () => {
    // Launch real Chrome with AI flags using persistent context
    // This is REQUIRED for AI features - the model is stored in the profile
    const chromeExecutablePath = process.env.CHROME_PATH || undefined;
    const profilePath = path.join(EXTENSION_PATH, 'chrome-ai-test-profile');

    console.log('🚀 Launching Chrome with extension...');
    console.log('Extension path:', EXTENSION_PATH);
    console.log('Profile path:', profilePath);

    context = await chromium.launchPersistentContext(profilePath, {
      headless: false,
      channel: 'chrome',
      executablePath: chromeExecutablePath,
      args: [
        '--enable-features=PromptAPIForGeminiNano,SummarizationAPI',
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        '--no-sandbox'
      ]
    });

    // Note: browser is the context when using launchPersistentContext
    browser = context;

    // Wait a bit for extension to load
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Navigate to extensions page to verify loading
    const page = await context.newPage();
    await page.goto('chrome://extensions');
    await page.waitForTimeout(1000);

    console.log('✅ Chrome launched - check chrome://extensions to verify extension loaded');
  });

  test.afterAll(async () => {
    await context?.close();
    await browser?.close();
  });

  test('should have Summarizer API available', async () => {
    const page = await context.newPage();

    const availability = await page.evaluate(async () => {
      if ('ai' in self && 'summarizer' in (self as any).ai) {
        return await (self as any).ai.summarizer.availability();
      }
      return 'not-found';
    });

    console.log('Summarizer API availability:', availability);

    // Should be 'readily-available' or 'after-download'
    expect(['readily-available', 'after-download', 'downloading']).toContain(availability);

    await page.close();
  });

  test('should create real summarizer if model available', async () => {
    const page = await context.newPage();

    const result = await page.evaluate(async () => {
      if (!('ai' in self) || !('summarizer' in (self as any).ai)) {
        return { skip: true, reason: 'API not found' };
      }

      const avail = await (self as any).ai.summarizer.availability();
      if (avail !== 'readily-available') {
        return { skip: true, reason: `Model not ready: ${avail}` };
      }

      try {
        const summarizer = await (self as any).ai.summarizer.create({
          type: 'key-points',
          length: 'short'
        });

        const testText = 'Chrome built-in AI provides on-device processing. ' +
                        'This enables privacy-friendly summarization. ' +
                        'The Summarizer API supports multiple output types.';

        const summary = await summarizer.summarize(testText);
        summarizer.destroy();

        return {
          success: true,
          summary,
          hasContent: summary.length > 0
        };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    if (result.skip) {
      console.log(`⏭️ Skipping: ${result.reason}`);
      test.skip();
      return;
    }

    expect(result.success).toBe(true);
    expect(result.hasContent).toBe(true);
    console.log('Summary:', result.summary);

    await page.close();
  });

  test('should test extension with real AI', async () => {
    const page = await context.newPage();

    // Open some test pages
    await page.goto('https://developer.chrome.com/docs/ai/summarizer-api');
    await page.waitForTimeout(2000);

    const page2 = await context.newPage();
    await page2.goto('https://github.com/microsoft/playwright');
    await page2.waitForTimeout(2000);

    // Check service worker for Summarizer detection
    const pages = context.pages();
    const serviceWorkerPage = pages.find((p: any) =>
      p.url().includes('service-worker')
    );

    if (serviceWorkerPage) {
      const aiStatus = await serviceWorkerPage.evaluate(() => {
        return {
          summarizerAvailable: (window as any).betterTabsAI?.isSummarizerAvailable,
          summarizerStatus: (window as any).betterTabsAI?.summarizerStatus
        };
      });

      console.log('Extension AI Status:', aiStatus);
    }

    await page.close();
    await page2.close();
  });
});
