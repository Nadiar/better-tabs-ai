import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Better Tabs AI E2E testing
 *
 * Testing Strategy:
 * - Cannot use Selenium with Chrome AI (runs in private context)
 * - Use MSW to mock AI responses for predictable E2E tests
 * - Test popup, full interface, and options page
 */
export default defineConfig({
  testDir: './tests/e2e',

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,

  // Reporter to use
  reporter: 'html',

  // Shared settings for all the projects below
  use: {
    // Base URL for the extension
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',
  },

  // Configure projects for different browsers
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Chrome extension testing requires chromium
      },
    },
  ],

  // Run a simple HTTP server to serve the built extension files
  // This is needed because ES modules don't load from file:// protocol
  webServer: {
    command: 'npx http-server . -p 8081 --cors -c-1',
    url: 'http://127.0.0.1:8081',
    reuseExistingServer: !process.env.CI,
    timeout: 10000,
  },
});
