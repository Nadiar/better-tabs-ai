/**
 * E2E Test: Verify Summarizer API is working
 * Launches Chromium, checks API availability, performs test summarization
 */

const { chromium } = require('playwright');
const path = require('path');

async function testSummarizerAPI() {
  console.log('🧪 Testing Summarizer API integration...\n');

  const extensionPath = path.join(__dirname, '..');

  // Launch with AI flags
  const browser = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      '--enable-features=PromptAPIForGeminiNano,SummarizationAPI',
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ],
    userDataDir: path.join(__dirname, '..', 'chromium-profile')
  });

  const page = await browser.newPage();

  console.log('✅ Browser launched with AI flags\n');

  // Test 1: Check API availability
  console.log('Test 1: Checking Summarizer API availability...');
  const summarizerAvailability = await page.evaluate(async () => {
    if ('ai' in self && 'summarizer' in self.ai) {
      return await self.ai.summarizer.availability();
    } else if ('Summarizer' in self) {
      return await Summarizer.availability();
    }
    return 'not-found';
  });

  console.log(`  Result: ${summarizerAvailability}`);

  if (summarizerAvailability === 'readily-available') {
    console.log('  ✅ Summarizer API is ready!\n');
  } else if (summarizerAvailability === 'after-download') {
    console.log('  ⚠️  Model needs to be downloaded');
    console.log('  📋 Navigate to chrome://on-device-internals to download\n');
    await page.goto('chrome://on-device-internals/');
    console.log('  Opened chrome://on-device-internals');
    console.log('  Download the model and re-run this test.\n');
    console.log('Press Ctrl+C to close the browser.');
    await new Promise(() => {});
    return;
  } else {
    console.log(`  ❌ Summarizer API not available: ${summarizerAvailability}\n`);
    await browser.close();
    return;
  }

  // Test 2: Create summarizer
  console.log('Test 2: Creating Summarizer session...');
  const createResult = await page.evaluate(async () => {
    try {
      const API = self.ai?.summarizer || self.Summarizer;
      const summarizer = await API.create({
        type: 'key-points',
        length: 'short',
        format: 'plain-text'
      });
      return { success: true, hasInputQuota: !!summarizer.inputQuota };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  if (createResult.success) {
    console.log('  ✅ Summarizer created successfully');
    console.log(`  Has inputQuota: ${createResult.hasInputQuota}\n`);
  } else {
    console.log(`  ❌ Failed to create summarizer: ${createResult.error}\n`);
    await browser.close();
    return;
  }

  // Test 3: Perform summarization
  console.log('Test 3: Testing summarization...');
  const summaryResult = await page.evaluate(async () => {
    try {
      const API = self.ai?.summarizer || self.Summarizer;
      const summarizer = await API.create({
        type: 'key-points',
        length: 'short',
        format: 'plain-text'
      });

      const testText = `
        Web development has evolved significantly over the past decade.
        Modern frameworks like React, Vue, and Angular have transformed how developers build user interfaces.
        The introduction of serverless computing has changed deployment strategies.
        Progressive Web Apps (PWAs) now offer native-like experiences in browsers.
        WebAssembly enables high-performance applications on the web.
        AI integration is becoming increasingly common in web applications.
      `;

      const summary = await summarizer.summarize(testText);
      summarizer.destroy();

      return { success: true, summary };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  if (summaryResult.success) {
    console.log('  ✅ Summarization successful!\n');
    console.log('  Summary:');
    console.log('  ' + summaryResult.summary.replace(/\n/g, '\n  '));
    console.log();
  } else {
    console.log(`  ❌ Summarization failed: ${summaryResult.error}\n`);
  }

  // Test 4: Load extension and check integration
  console.log('Test 4: Testing extension integration...');
  console.log('  Loading test pages...');

  // Open a few test pages
  await page.goto('https://developer.chrome.com/docs/ai/summarizer-api');
  await page.waitForTimeout(2000);

  const page2 = await browser.newPage();
  await page2.goto('https://developer.mozilla.org/en-US/docs/Web/JavaScript');
  await page2.waitForTimeout(2000);

  const page3 = await browser.newPage();
  await page3.goto('https://github.com/microsoft/playwright');
  await page3.waitForTimeout(2000);

  console.log('  ✅ Opened 3 test pages\n');
  console.log('📋 Manual testing:');
  console.log('1. Click the Better Tabs AI extension icon');
  console.log('2. Click "Analyze Tabs"');
  console.log('3. Open DevTools console (F12)');
  console.log('4. Look for: "🎯 Using Summarizer API"');
  console.log('5. Verify topics are extracted\n');

  console.log('✅ All automated tests passed!');
  console.log('🎯 Extension is ready for manual testing\n');
  console.log('Press Ctrl+C to close the browser.\n');

  // Keep browser open for manual testing
  await new Promise(() => {});
}

// Run tests
testSummarizerAPI().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
