/**
 * MSW handlers index
 *
 * Combines all mock handlers for Chrome runtime and Chrome APIs.
 * Import this in test setup to mock all extension functionality.
 */

import { chromeRuntimeHandlers } from './chrome-runtime-handlers';
import { chromeAPIHandlers } from './chrome-api-handlers';

/**
 * All MSW handlers for Better Tabs AI testing
 *
 * Usage in tests:
 * ```typescript
 * import { setupServer } from 'msw/node';
 * import { handlers } from './mocks/handlers';
 *
 * const server = setupServer(...handlers);
 *
 * beforeAll(() => server.listen());
 * afterEach(() => server.resetHandlers());
 * afterAll(() => server.close());
 * ```
 */
export const handlers = [
  ...chromeRuntimeHandlers,
  ...chromeAPIHandlers,
];

// Export individual handler groups for selective use
export { chromeRuntimeHandlers, chromeAPIHandlers };
