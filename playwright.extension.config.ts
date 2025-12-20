import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Real Extension E2E testing
 *
 * This config loads the actual Chrome extension without mocks.
 * Tests run against real Chrome APIs and can test Gemini Nano if available.
 */
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/real-extension.spec.ts',

  // Run tests in serial for extension tests
  fullyParallel: false,
  workers: 1,

  // Retry on failure
  retries: 1,

  // Reporter to use
  reporter: 'list',

  // Shared settings
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  // Configure projects for different browsers
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Extensions require headed mode
        headless: false,
      },
    },
  ],

  // NO webServer needed for extension tests
});
