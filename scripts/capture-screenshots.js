/**
 * Capture screenshots for documentation
 *
 * Usage: node scripts/capture-screenshots.js
 */

const { chromium } = require('playwright');
const path = require('path');

async function captureScreenshots() {
  console.log('Starting screenshot capture...');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    recordVideo: {
      dir: path.join(__dirname, '../screenshots/videos'),
      size: { width: 1400, height: 900 }
    }
  });

  const page = await context.newPage();

  // Load the extension interface
  await page.goto('http://127.0.0.1:8081/full-interface/dist/index.html');
  await page.waitForSelector('.app-container', { timeout: 10000 });
  await page.waitForTimeout(2000);

  // Capture feature showcase
  console.log('Capturing feature_showcase.png...');
  await page.screenshot({
    path: path.join(__dirname, '../screenshots/feature_showcase.png'),
    fullPage: false
  });

  console.log('Screenshots captured!');
  console.log('Video recording will be saved after browser closes.');

  // Keep browser open for 10 seconds to capture some interaction
  await page.waitForTimeout(10000);

  await context.close();
  await browser.close();

  console.log('Done! Check screenshots/ directory.');
}

captureScreenshots().catch(console.error);
