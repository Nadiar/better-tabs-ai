# Better Tabs AI - Refactor Implementation Plan

**Version**: 2.2.0
**Date**: 2025-10-04
**Status**: Ready to Execute

---

## 📋 Executive Summary

### Goals
1. **Eliminate 40% code duplication** - Extract shared utilities (~500 lines)
2. **Migrate to React + TypeScript** - Unified codebase, better type safety
3. **Unified build process** - Vite for all interfaces
4. **Comprehensive testing** - Mock-based E2E + unit tests

### Key Decisions (Approved)
- ✅ Full replacement migration (rely on git for rollback)
- ✅ Shared state via chrome.storage.sync
- ✅ Unified Vite builds for all interfaces
- ✅ Migrate popup to React completely
- ✅ Convert everything to TypeScript at once
- ✅ E2E testing with MSW (Mock Service Worker) - **Cannot use Selenium with Chrome AI**

---

## 🎯 Execution Order

### Phase 1: E2E Testing Infrastructure (FIRST - Critical Foundation)
**Duration**: 2-3 days
**Why First**: Must have working tests before refactor to prevent regressions

#### Tasks:
1. **Setup Playwright + MSW**
   ```bash
   npm install -D playwright @playwright/test msw
   npx playwright install
   ```

2. **Create Mock Handlers**
   ```typescript
   // tests/mocks/ai-handlers.ts
   import { http, HttpResponse } from 'msw';

   export const aiHandlers = [
     // Mock analyzeAllTabs response
     http.post('*/analyzeAllTabs', () => {
       return HttpResponse.json({
         suggestions: [
           { groupName: 'Shopping', tabIds: [1, 2], confidence: 0.85 },
           { groupName: 'Dev Tools', tabIds: [3, 4], confidence: 0.92 }
         ]
       })
     }),

     // Mock clearCache
     http.post('*/clearCache', () => {
       return HttpResponse.json({ success: true })
     })
   ];
   ```

3. **Create Test Fixtures**
   ```typescript
   // tests/fixtures/tabs.ts
   export const mockTabs = [
     { id: 1, title: 'Amazon Product', url: 'https://amazon.com/...' },
     { id: 2, title: 'eBay Item', url: 'https://ebay.com/...' },
     { id: 3, title: 'GitHub Repo', url: 'https://github.com/...' }
   ];
   ```

4. **Write Baseline Tests** (for current popup + full interface)
   - Test AI analysis flow (mocked)
   - Test cache clearing
   - Test group creation
   - Test settings page
   - **These tests must pass BEFORE refactor begins**

5. **Validate Tests Pass**
   ```bash
   npm run test:e2e
   # All tests must be green before proceeding
   ```

**Deliverables**:
- [ ] Playwright configured
- [ ] MSW mocking AI responses
- [ ] Baseline tests for current code (all green)
- [ ] CI/CD setup (optional but recommended)

---

### Phase 2: Shared TypeScript Utilities
**Duration**: 2-3 days
**Prerequisites**: E2E tests passing

#### Tasks:
1. **Setup TypeScript**
   ```bash
   npm install -D typescript @types/chrome
   npx tsc --init
   ```

2. **Create Shared Types**
   ```typescript
   // utils/shared/types.ts
   export interface TabData {
     id: number;
     title: string;
     url: string;
     groupId?: number;
     favIconUrl?: string;
   }

   export interface GroupData {
     id: number;
     title: string;
     color: ChromeColor;
     collapsed: boolean;
   }

   export interface AISuggestion {
     groupName: string;
     tabIds: number[];
     confidence: number;
     color?: ChromeColor;
   }

   export interface AnalysisResult {
     suggestions: AISuggestion[];
     analyses: any[];
   }
   ```

3. **Create AI Operations Module**
   ```typescript
   // utils/shared/ai-operations.ts
   export const AIOperations = {
     async analyzeAllTabs(): Promise<AnalysisResult> {
       const response = await chrome.runtime.sendMessage({
         action: 'analyzeAllTabs'
       });
       return response;
     },

     async checkAvailability(): Promise<AIStatus> {
       return await chrome.runtime.sendMessage({
         action: 'checkAIAvailability'
       });
     },

     async clearCache(): Promise<{ success: boolean }> {
       return await chrome.runtime.sendMessage({
         action: 'clearCache'
       });
     }
   };
   ```

4. **Create Chrome API Wrapper**
   ```typescript
   // utils/shared/chrome-api.ts
   export const ChromeAPI = {
     async getAllTabs(): Promise<TabData[]> {
       return await chrome.tabs.query({});
     },

     async getAllGroups(): Promise<GroupData[]> {
       return await chrome.tabGroups.query({});
     },

     async createGroup(tabIds: number[], title: string, color: ChromeColor) {
       // Implementation
     }
   };
   ```

5. **Create Notification System**
   ```typescript
   // utils/shared/notifications.ts
   export class NotificationManager {
     static show(message: string, type: NotificationType = 'info') {
       window.dispatchEvent(new CustomEvent('app-notification', {
         detail: { message, type }
       }));
     }
   }
   ```

6. **Write Unit Tests**
   ```bash
   npm install -D vitest @vitest/ui
   npm run test:unit
   ```

**Deliverables**:
- [ ] TypeScript configuration
- [ ] Shared types defined
- [ ] AI operations module
- [ ] Chrome API wrapper
- [ ] Notification system
- [ ] Unit tests (90%+ coverage)

---

### Phase 3: Convert Full Interface to TypeScript
**Duration**: 3-4 days
**Prerequisites**: Shared utilities complete, E2E tests passing

#### Tasks:
1. **Update Vite Config**
   ```typescript
   // vite.config.ts
   export default defineConfig({
     plugins: [react()],
     resolve: {
       alias: {
         '@': path.resolve(__dirname, './src'),
         '@shared': path.resolve(__dirname, '../utils/shared')
       }
     }
   });
   ```

2. **Convert Components (.jsx → .tsx)**
   - app.tsx
   - Header.tsx
   - GroupsColumn.tsx
   - TabCard.tsx
   - etc.

3. **Add TypeScript Props**
   ```typescript
   // components/TabCard.tsx
   interface TabCardProps {
     tab: TabData;
     isDragging?: boolean;
     onDragStart?: (tabId: number) => void;
   }

   export const TabCard: React.FC<TabCardProps> = ({ tab, isDragging }) => {
     // Implementation
   };
   ```

4. **Replace Duplicated Code**
   - Remove local `analyzeAllTabs` → use `AIOperations.analyzeAllTabs()`
   - Remove local `clearCache` → use `AIOperations.clearCache()`
   - Remove local Chrome API calls → use `ChromeAPI.*`

5. **Run E2E Tests**
   ```bash
   npm run test:e2e
   # Verify all tests still pass
   ```

**Deliverables**:
- [ ] All components TypeScript
- [ ] Using shared utilities
- [ ] E2E tests passing
- [ ] No TypeScript errors

---

### Phase 4: Migrate Popup to React + TypeScript
**Duration**: 3-4 days
**Prerequisites**: Full interface converted, E2E tests passing

#### Tasks:
1. **Create React Popup Structure**
   ```
   popup-react/
   ├── src/
   │   ├── App.tsx
   │   ├── components/
   │   │   ├── AIStatus.tsx
   │   │   ├── QuickActions.tsx
   │   │   └── StatusDisplay.tsx
   │   └── main.tsx
   ├── index.html
   ├── vite.config.ts
   └── package.json
   ```

2. **Convert PopupManager to React**
   - Extract state management to hooks
   - Create functional components
   - Reuse shared utilities

3. **Setup Vite Build**
   ```typescript
   // popup-react/vite.config.ts
   export default defineConfig({
     plugins: [react()],
     build: {
       outDir: '../popup',
       rollupOptions: {
         input: {
           popup: path.resolve(__dirname, 'index.html')
         }
       }
     }
   });
   ```

4. **Reuse Components from Full Interface**
   - Import AIStatus component
   - Import Toast system
   - Import shared styles

5. **Update manifest.json**
   ```json
   {
     "action": {
       "default_popup": "popup/index.html"
     }
   }
   ```

6. **Run E2E Tests**
   ```bash
   npm run test:e2e:popup
   # Verify popup tests pass
   ```

**Deliverables**:
- [ ] React popup working
- [ ] Using shared utilities
- [ ] Vite build configured
- [ ] E2E tests passing
- [ ] Old popup.js removed

---

### Phase 5: Convert Options Page to TypeScript
**Duration**: 1-2 days
**Prerequisites**: Shared utilities complete

#### Tasks:
1. **Convert options.js → options.ts**
2. **Use SettingsOperations from shared utilities**
3. **Add TypeScript types for settings**
4. **Run E2E tests for settings page**

**Deliverables**:
- [ ] Options page TypeScript
- [ ] Using shared utilities
- [ ] E2E tests passing

---

### Phase 6: Integration & Polish
**Duration**: 2-3 days

#### Tasks:
1. **Unified Build Script**
   ```json
   // package.json (root)
   {
     "scripts": {
       "build": "npm run build:popup && npm run build:full-interface",
       "build:popup": "cd popup-react && npm run build",
       "build:full-interface": "cd full-interface && npm run build",
       "test": "npm run test:unit && npm run test:e2e",
       "test:unit": "vitest run",
       "test:e2e": "playwright test"
     }
   }
   ```

2. **Documentation Updates**
   - Update README with new build process
   - Update DEVELOPMENT.md with TypeScript info
   - Create migration guide in archive/

3. **Performance Testing**
   - Test with 100+ tabs
   - Verify 60fps drag & drop
   - Check memory usage

4. **Final E2E Test Run**
   ```bash
   npm run test
   # All tests must pass
   ```

**Deliverables**:
- [ ] Unified build process
- [ ] Documentation updated
- [ ] Performance validated
- [ ] All tests passing

---

## 🧪 Testing Strategy (Detailed)

### Why MSW Instead of Selenium?
**Chrome Gemini Nano AI cannot be controlled in Selenium WebDriver**
- AI model runs locally in Chrome's private context
- No API to mock or control AI responses in WebDriver
- MSW intercepts network requests at the service worker level
- Allows full E2E testing with predictable, mocked AI responses

### Test Setup
```typescript
// tests/setup.ts
import { beforeAll, afterEach, afterAll } from 'vitest';
import { setupServer } from 'msw/node';
import { aiHandlers } from './mocks/ai-handlers';

const server = setupServer(...aiHandlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### Mock Data Examples
```typescript
// tests/mocks/ai-responses.ts
export const mockAIAnalysis = {
  success: true,
  suggestions: [
    {
      groupName: 'Shopping',
      tabIds: [1, 2, 5],
      confidence: 0.85,
      color: 'blue'
    },
    {
      groupName: 'Development Tools',
      tabIds: [3, 4, 6],
      confidence: 0.92,
      color: 'green'
    }
  ],
  analyses: [
    { tabId: 1, category: 'Shopping', confidence: 0.8 },
    { tabId: 2, category: 'Shopping', confidence: 0.9 }
  ]
};

export const mockTabs = [
  { id: 1, title: 'Amazon Product', url: 'https://amazon.com/product' },
  { id: 2, title: 'eBay Item', url: 'https://ebay.com/item' },
  { id: 3, title: 'GitHub Repo', url: 'https://github.com/user/repo' }
];
```

### Test Coverage Targets
- **Shared utilities**: 90%+ unit test coverage
- **React components**: 70%+ unit test coverage
- **E2E flows**: All critical user paths covered
- **Service worker**: Mock-based integration tests

---

## ⏱️ Timeline

| Phase | Duration | Status |
|-------|----------|--------|
| 1. E2E Testing Infrastructure | 2-3 days | 🔴 Not started |
| 2. Shared TypeScript Utilities | 2-3 days | 🔴 Not started |
| 3. Full Interface TypeScript | 3-4 days | 🔴 Not started |
| 4. React Popup Migration | 3-4 days | 🔴 Not started |
| 5. Options Page TypeScript | 1-2 days | 🔴 Not started |
| 6. Integration & Polish | 2-3 days | 🔴 Not started |
| **Total** | **13-19 days** | **0% Complete** |

---

## ✅ Success Criteria

### Code Quality
- [ ] Zero TypeScript errors
- [ ] 90%+ test coverage for shared utilities
- [ ] No duplicate code (AI ops, Chrome API, notifications)
- [ ] Unified build process works

### Functionality
- [ ] All E2E tests passing with mocked AI
- [ ] Popup works identically to current
- [ ] Full interface works identically to current
- [ ] Settings page works identically to current

### Performance
- [ ] 60fps drag & drop with 100+ tabs
- [ ] No memory leaks
- [ ] Build time < 10 seconds
- [ ] Extension size < 5MB

### Documentation
- [ ] README updated
- [ ] DEVELOPMENT.md complete
- [ ] Migration guide created
- [ ] API documentation for shared utilities

---

## 🚀 Next Steps

1. **Review this plan** - Confirm approach and timeline
2. **Setup testing infrastructure** - Start with Phase 1 (E2E tests)
3. **Create feature branch** - `git checkout -b refactor/react-typescript-v2.2`
4. **Execute phases sequentially** - Don't skip E2E testing first!
5. **Continuous validation** - Run tests after each phase
6. **Release v2.2.0** - Ship when all tests pass

---

*Created: 2025-10-04*
*Ready for execution pending final approvals*
