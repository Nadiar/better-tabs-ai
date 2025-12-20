/**
 * Global test setup for Playwright E2E tests
 *
 * Configures MSW to intercept Chrome extension API calls
 * and return mock responses for predictable testing.
 */

import { setupServer } from 'msw/node';
import { handlers } from './mocks/handlers';

/**
 * MSW server instance
 * Intercepts HTTP requests and returns mock responses
 */
export const server = setupServer(...handlers);

/**
 * Start MSW server before all tests
 * Listen for requests and mock responses
 */
export function setupMockServer() {
  server.listen({
    onUnhandledRequest: 'warn', // Warn on unmocked requests
  });
}

/**
 * Reset handlers after each test
 * Ensures test isolation
 */
export function resetMockServer() {
  server.resetHandlers();
}

/**
 * Close MSW server after all tests
 * Cleanup resources
 */
export function closeMockServer() {
  server.close();
}

/**
 * Note: For Playwright, use setupMockServer() in test.beforeAll()
 * and resetMockServer() in test.afterEach() directly in your test files.
 *
 * Playwright doesn't support global beforeAll/afterEach in the same way
 * as Jest/Vitest, so call these functions in your test files directly.
 *
 * Example usage in test file:
 * ```typescript
 * import { test } from '@playwright/test';
 * import { setupMockServer, resetMockServer, closeMockServer } from '../setup';
 *
 * test.beforeAll(() => setupMockServer());
 * test.afterEach(() => resetMockServer());
 * test.afterAll(() => closeMockServer());
 * ```
 */
