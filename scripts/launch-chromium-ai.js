/**
 * Launch Playwright Chromium with AI features enabled
 * Opens chrome://on-device-internals for Gemini Nano download
 */

const { chromium } = require('playwright');
const path = require('path');

async function launchChromiumWithAI() {
  console.log('🚀 Launching Chromium with AI features enabled...\n');

  // Extension path
  const extensionPath = path.join(__dirname, '..');

  console.log('Extension path:', extensionPath);
  console.log('\nEnabling flags:');
  console.log('  - PromptAPIForGeminiNano');
  console.log('  - SummarizationAPI\n');

  // Launch browser with AI flags and extension
  const browser = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      '--enable-features=PromptAPIForGeminiNano,SummarizationAPI',
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ],
    // Use a persistent profile to save model download
    userDataDir: path.join(__dirname, '..', 'chromium-profile')
  });

  const page = await browser.newPage();

  console.log('✅ Browser launched!\n');
  console.log('📋 Instructions:');
  console.log('1. The browser will open chrome://on-device-internals');
  console.log('2. Look for "Gemini Nano" section');
  console.log('3. Click "Download" if model not present');
  console.log('4. Wait for ~22GB download to complete');
  console.log('5. Status should show "Model ready"');
  console.log('\n💡 Tip: Download happens in background, close/reopen anytime');
  console.log('📁 Profile saved to: chromium-profile/\n');

  // Navigate to on-device internals
  await page.goto('chrome://on-device-internals/');

  console.log('🔍 Opened chrome://on-device-internals\n');
  console.log('🛠️  To test the extension:');
  console.log('1. Open a new tab with some websites');
  console.log('2. Click the Better Tabs AI extension icon');
  console.log('3. Click "Analyze Tabs"');
  console.log('4. Check console for: "✅ Summarizer API is ready to use"\n');

  console.log('Press Ctrl+C to close the browser and exit.\n');

  // Keep script running
  await new Promise(() => {});
}

// Run
launchChromiumWithAI().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
