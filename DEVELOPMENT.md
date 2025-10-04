# Better Tabs AI - Development Guide

**Last Updated**: 2025-10-04
**Current Version**: 2.1.0

---

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Completed Features](#completed-features)
3. [Current Refactor (v2.2.0)](#current-refactor-v220)
4. [Testing Strategy](#testing-strategy)
5. [Roadmap](#roadmap)
6. [Development Workflow](#development-workflow)

---

## 🏗️ Architecture Overview

### Technology Stack
- **Frontend**: React 18 + HTM (JSX-less syntax)
- **Build**: Vite with hot reload
- **Drag & Drop**: dnd-kit library
- **AI**: Chrome Gemini Nano (local, built-in)
- **Storage**: chrome.storage.sync for persistence
- **Language**: JavaScript (migrating to TypeScript in v2.2.0)

### Project Structure
```
better-tabs-ai/
├── background/
│   ├── service-worker.js       # AI processing, pattern detection
│   └── pattern-detector.js     # Domain/ecosystem recognition
├── popup/
│   ├── popup.html              # Legacy popup (being migrated to React)
│   ├── popup.js                # 732 lines (to be replaced)
│   └── popup.css
├── full-interface/             # Main drag & drop interface
│   ├── app.jsx                 # React app with staged state
│   ├── components/             # 12 React components
│   ├── hooks/                  # useUndoRedo, useStagedState
│   ├── utils/                  # Chrome API, diff calculator
│   └── dist/                   # Vite build output
├── options/                    # Settings page
│   ├── options.html
│   ├── options.js
│   └── options.css
└── utils/                      # Shared utilities (upcoming)
    └── cache-manager.js        # LRU cache
```

---

## ✅ Completed Features

### v2.1.0 (Current)
Released: October 1, 2025

#### AI Grouping Improvements (Phases A-C)
- **Pattern Detection System**
  - Same-domain detection (0.9 confidence)
  - Subdomain grouping (0.7 confidence)
  - Tool ecosystem recognition:
    - Media Server Tools (Radarr, Sonarr, Prowlarr, etc.)
    - Google Workspace (Drive, Docs, Gmail)
    - Destiny Tools (DIM, Braytech, light.gg)
    - Development Tools (GitHub, GitLab, Stack Overflow)
  - Keyword matching with confidence boosting

- **Enhanced AI Prompt**
  - Critical instructions emphasizing domain similarity
  - Shopping relationship detection
  - Specific categorization examples
  - Better confidence scoring guidance

- **Suggestion Generation**
  - Pattern-based suggestions prioritized over categories
  - Tool ecosystems: 0.95 confidence
  - Domain groups: 0.9 confidence
  - Keyword groups: 0.6 confidence

#### Settings Infrastructure (Phases D-E)
- **Backend Complete** (message handlers ready)
  - `getSettings`, `saveSettings`, `resetSettings` actions
  - chrome.storage.sync persistence
  - Default settings with validation

- **Frontend Complete** (UI implemented but not committed)
  - options/options.html - Settings page UI
  - Dynamic confidence threshold (0.5-0.9)
  - Max suggestions limit (3-20)
  - UI preferences (show scores, inline suggestions, default color)
  - Performance settings (content analysis, concurrent limit)

- **Configuration Options**
  ```javascript
  {
    // AI Analysis
    minConfidenceThreshold: 0.5,  // Default lowered from 0.6
    maxSuggestions: 10,

    // UI Preferences
    showConfidenceScores: true,
    showInlineSuggestions: true,
    defaultGroupColor: 'grey',

    // Performance
    enableContentAnalysis: true,
    maxConcurrentAnalysis: 10
  }
  ```

### v2.0.0 (Previous)
Released: October 1, 2025

#### Full Drag & Drop Interface (Phases 1-6)
- **Foundation**: 3-column layout, staged state management
- **Drag & Drop**: dnd-kit integration, smooth animations
- **Apply/Cancel**: Batch operations with progress indicators
- **Group Management**: Inline editing, AI naming, color picker
- **AI Suggestions**: Inline display with create/dismiss
- **Search & Duplicates**: Real-time filtering, duplicate detection

#### Polish & Performance (Phases 7-8)
- **Undo/Redo**: Last 5 state snapshots, keyboard shortcuts
- **Custom Tooltips**: Full title/URL on hover
- **Progress Bar**: Percentage display for 20+ operations
- **Memoization**: useMemo, useCallback optimizations
- **Animation Throttling**: Reduced transitions for 50+ tabs, disabled for 100+

---

## 🔄 Current Refactor (v2.2.0)

### Goal
Eliminate code duplication, migrate to React + TypeScript, create shared component library.

### Key Decisions (from REFACTOR_DECISIONS.md)
- ✅ **Full Replacement Migration** - Rely on git for rollback
- ✅ **Shared State** - Via chrome.storage.sync
- ✅ **Unified Builds** - Vite for all interfaces
- ✅ **React Migration** - Convert popup to React
- ✅ **TypeScript** - Migrate during refactor
- ✅ **Testing** - Unit tests + E2E with mock data

### Code Duplication to Eliminate
**Current Duplicated Code** (~40% of codebase):
- `analyzeAllTabs()` - Popup (188-220) vs Full Interface (464-483)
- `clearCache()` - Popup (546-560) vs Full Interface (407-413)
- `checkAIAvailability()` - Popup (106) vs Full Interface (422)
- Toast systems - Different implementations
- Chrome API calls - Scattered throughout

**Reduction Target**: ~500 lines of duplicate code → shared utilities

### Refactor Phases

#### Phase 1: Shared Utilities (TypeScript)
**Location**: `/utils/shared/`

Create TypeScript modules:
- `ai-operations.ts` - AI analysis, cache, availability
- `chrome-api.ts` - Tabs, groups, storage wrappers
- `notifications.ts` - Event-based toast system
- `types.ts` - Shared TypeScript interfaces

#### Phase 2: React Popup Migration
**New Structure**: `popup-react/`
- Convert PopupManager class to React hooks
- Reuse components from full-interface where possible
- Vite build configuration
- TypeScript interfaces

#### Phase 3: Full Interface TypeScript Migration
- Add TypeScript to existing React components
- Convert .jsx → .tsx files
- Add proper type definitions
- Update Vite config for TypeScript

#### Phase 4: Integration & Testing
- Wire up shared utilities
- Test all three interfaces (popup, full interface, options)
- Performance validation
- Documentation updates

---

## 🧪 Testing Strategy

### Unit Testing
**Framework**: Vitest (Vite-native test runner)

**Coverage Targets**:
- Shared utilities: 90%+ coverage
- React components: 70%+ coverage
- Service worker: Mock-based testing

**Mock Requirements**:
```typescript
// Cannot use Selenium with Chrome AI - use mocks instead
const mockAIResponse = {
  suggestions: [
    { groupName: 'Shopping', tabIds: [1, 2], confidence: 0.85 },
    { groupName: 'Dev Tools', tabIds: [3, 4], confidence: 0.92 }
  ]
};

// Mock Chrome APIs
const mockChrome = {
  runtime: { sendMessage: vi.fn() },
  tabs: { query: vi.fn() },
  tabGroups: { query: vi.fn() }
};
```

### E2E Testing
**Approach**: Playwright with Mock Service Worker (MSW)

**Why Not Selenium**: Chrome's Gemini Nano AI cannot be controlled/mocked in Selenium WebDriver. Use MSW to intercept and mock AI responses.

**Test Scenarios**:
1. **Mock AI Analysis**
   - Inject predefined AI suggestions
   - Test UI rendering of suggestions
   - Verify drag & drop with mocked data

2. **Chrome API Mocking**
   - Mock tab/group creation
   - Mock storage operations
   - Verify state changes

3. **User Flows**
   - Create group from suggestion (mocked)
   - Drag tabs between groups
   - Apply changes with mocked Chrome API

**Example Test Setup**:
```typescript
// tests/setup.ts
import { setupWorker } from 'msw/browser';
import { handlers } from './mocks/handlers';

const worker = setupWorker(...handlers);
worker.start();

// tests/mocks/handlers.ts
export const handlers = [
  rest.post('chrome-extension://*/analyzeAllTabs', (req, res, ctx) => {
    return res(ctx.json(mockAIResponse));
  })
];
```

### Manual Testing Checklist
- [ ] All three interfaces load correctly
- [ ] Shared utilities work in popup, full interface, options
- [ ] TypeScript compilation has no errors
- [ ] Vite builds succeed for all targets
- [ ] Settings persist across sessions
- [ ] No console errors in any interface
- [ ] Performance: 60fps with 100+ tabs

---

## 🗺️ Roadmap

### v2.2.0 (Next - 4-6 weeks)
**Focus**: Refactor, React migration, TypeScript

- [ ] Create shared TypeScript utilities
- [ ] Migrate popup to React
- [ ] Convert full interface to TypeScript
- [ ] Setup Vitest unit tests
- [ ] Setup Playwright E2E with MSW
- [ ] Unified Vite build process
- [ ] Documentation updates

### v2.3.0 (8-10 weeks)
**Focus**: Advanced features

- [ ] Virtual scrolling for 200+ tabs
- [ ] Advanced keyboard navigation
- [ ] Filter checkboxes (domain, recency, type)
- [ ] Bulk operations toolbar
- [ ] Tab session management (export/import)

### v3.0.0 (Future)
**Focus**: AI enhancements, plugins

- [ ] Custom AI model support (OpenAI, Claude)
- [ ] Plugin system for custom categorization
- [ ] Advanced search with regex
- [ ] Cross-browser compatibility (Firefox, Edge)
- [ ] Mobile/tablet interface

---

## 🛠️ Development Workflow

### Setup
```bash
# Clone repository
git clone https://github.com/nadiar/better-tabs-ai.git
cd better-tabs-ai

# Install dependencies for full interface
cd full-interface
npm install

# Install dev dependencies (upcoming)
npm install -D vitest @vitest/ui playwright msw typescript
```

### Build Commands
```bash
# Full interface development
cd full-interface
npm run dev        # Vite dev server
npm run build      # Production build
npm run preview    # Preview production build

# Run tests (upcoming)
npm run test       # Vitest unit tests
npm run test:e2e   # Playwright E2E tests
npm run test:ui    # Vitest UI
```

### Extension Loading
1. Go to `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `better-tabs-ai` folder
5. Enable "Prompt API for Gemini Nano" in `chrome://flags`

### Git Workflow
```bash
# Create feature branch
git checkout -b feature/refactor-shared-utilities

# Make changes
git add .
git commit -m "feat: Add shared TypeScript utilities

- Create ai-operations.ts for AI analysis
- Create chrome-api.ts for Chrome wrapper
- Add TypeScript interfaces
- Setup Vitest testing"

# Push changes
git push origin feature/refactor-shared-utilities
```

### Code Style
- **TypeScript**: Strict mode enabled
- **React**: Functional components with hooks
- **Naming**: camelCase for functions, PascalCase for components
- **Imports**: Absolute paths from `src/`
- **Comments**: JSDoc for public APIs

---

## 📝 Documentation

### For Developers
- **This file** - Development guide
- **README.md** - User-facing documentation
- **REFACTOR_DECISIONS.md** - Architectural decisions
- **CHANGELOG.md** - Version history

### For Users
- **README.md** - Features, installation, usage
- **GEMINI_NANO_SETUP.md** - AI setup instructions

### Archived (Historical Reference)
- `archive/FULL_INTERFACE_PLAN.md` - Original phases 1-9 plan
- `archive/AI_GROUPING_IMPROVEMENTS.md` - v2.1.0 AI improvements
- `archive/PHASES_7-9_SUMMARY.md` - Phases 7-9 summary
- `archive/SETTINGS_IDEAS.md` - Settings brainstorming

---

## ❓ Questions & Support

### Common Issues
1. **AI not available**: Check `chrome://flags` for Gemini Nano
2. **Suggestions not showing**: Clear cache, check confidence threshold
3. **Build errors**: Delete node_modules, run `npm install` again

### Getting Help
- File issues: https://github.com/nadiar/better-tabs-ai/issues
- Read docs: README.md and GEMINI_NANO_SETUP.md

---

*Last Updated: 2025-10-04*
