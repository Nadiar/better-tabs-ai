# Better Tabs AI - Changelog

## Version 2.2.0 - TypeScript + React Refactor (2025-01-05)

### 🎉 Major Refactor Complete

Comprehensive migration to TypeScript + React, eliminating ~40% code duplication through shared utilities.

### 🏗️ Architecture Improvements

#### Shared TypeScript Utilities (`utils/shared/`)
- **types.ts**: Comprehensive type definitions (TabData, GroupData, AISuggestion, Settings, etc.)
- **ai-operations.ts**: AIOperations namespace (5 methods) with Result<T> pattern
- **chrome-api.ts**: ChromeAPI namespace (11 methods) for consistent Chrome API access
- **settings-operations.ts**: SettingsOperations namespace (5 methods) for settings management
- **notifications.ts**: NotificationManager class with event-based toast system
- All operations use Go-style Result<T, E> error handling

#### React Popup Migration (`popup-react/`)
- **NEW**: React + TypeScript popup (470 lines, down from 732)
- **7 React components**: App, Header, AIUnavailable, QuickActions, TabStats, Results, Footer
- **Hooks-based**: useState/useEffect instead of class-based architecture
- **Build size**: 158.90 kB (50.33 kB gzipped)
- **Code reduction**: 36% reduction + ~250 lines of duplicated code eliminated

#### Full Interface TypeScript (`full-interface/app.tsx`)
- **Converted**: app.jsx → app.tsx with full TypeScript types
- **Integrated**: AIOperations, ChromeAPI, NotificationManager from @shared
- **~200 lines eliminated** through shared utilities
- **Build size**: 284.39 kB (88.77 kB gzipped)

#### Options Page TypeScript (`options-ts/`)
- **Converted**: options.js → options.ts (260 lines)
- **Integrated**: SettingsOperations, NotificationManager from @shared
- **~85 lines eliminated** through shared utilities
- **Build size**: 6.67 kB (2.24 kB gzipped)

### 📦 Build System Improvements

#### Consolidated Build Scripts
- `npm run build`: Builds all interfaces (shared, full, popup, options)
- `npm run typecheck`: Type-checks entire codebase
- `npm run dev:*`: Development servers for each interface
- Individual build commands: `build:full`, `build:popup`, `build:options`

#### Vite Configuration
- Path aliases configured (@shared, @/*)
- Consistent output structure across all interfaces
- Development mode with hot reload

### ✅ Testing Infrastructure

#### E2E Testing (Playwright + MSW)
- 58 baseline E2E tests (29 popup + 29 full interface)
- MSW handlers for Chrome API mocking
- Test fixtures for tabs, groups, AI responses
- Tests serve as documentation (Chrome AI requires actual Chrome)

### 🗑️ Code Elimination Summary

**Total Lines Eliminated**: ~535 lines

**By Category**:
- AI Operations: ~170 lines → AIOperations
- Chrome API calls: ~95 lines → ChromeAPI
- Settings operations: ~55 lines → SettingsOperations
- Toast notifications: ~75 lines → NotificationManager
- Error handling: ~140 lines → Result<T> pattern

**Affected Files**:
- popup.js (732 lines) → popup-react/ (470 lines): 36% reduction
- full-interface/app.jsx: ~200 lines removed
- options.js (180 lines): ~85 lines removed

### 🔧 Technical Changes

#### Type Safety
- Full TypeScript typing across all interfaces
- Chrome API properly typed with @types/chrome
- Settings, TabData, GroupData, AISuggestion all strongly typed
- Extended AIStatus type with all status codes

#### Error Handling
- Consistent Result<T, E> pattern everywhere
- Type-safe error handling (no unchecked exceptions)
- Centralized error messages through NotificationManager

#### State Management
- React hooks (useState, useEffect, useRef) in popup
- Existing staged state pattern in full interface
- Event-based notification system (framework-agnostic)

### 🚀 Performance

**Build Sizes**:
- Popup: 158.90 kB (50.33 kB gzipped)
- Full Interface: 284.39 kB (88.77 kB gzipped)
- Options: 6.67 kB (2.24 kB gzipped)

**Type Checking**: Clean across all interfaces

### 📝 Documentation Updates

- STATUS.md: Complete progress tracking
- REFACTOR_PLAN.md: 6-phase execution plan
- REFACTOR_DECISIONS.md: Architectural decisions
- DEVELOPMENT.md: Unified development guide
- TEST_RESULTS.md: E2E test limitations and strategy

### 🔄 Migration Notes

**Breaking Changes**: None (backward compatible)

**File Structure**:
- Old popup: `popup/popup.html` → New: `popup-react/dist/index.html`
- Old options: `options/options.html` → New: `options-ts/dist/index.html`
- Full interface: Now uses TypeScript (`app.tsx`)
- All old files preserved (not deleted)

**Build Required**: Run `npm run build` after pulling

### 🎯 Refactor Stats

- **6 Phases completed**: E2E Testing, Shared Utilities, Full Interface TS, React Popup, Options TS, Integration & Polish
- **Duration**: Single session
- **Progress**: 100% (all planned work complete)
- **Code quality**: Type-safe, DRY, maintainable

---

## Version 1.3.0 - Architecture & Reliability Update (2024-09-29)

### 🏗️ Major Improvements

#### AI Session Management Overhaul
- **Removed Tab Injection Dependency**: AI analysis now runs entirely in service worker context using `self.ai`
- **Persistent Session**: Single AI session maintained throughout service worker lifetime
- **Automatic Recovery**: Session automatically recreates on failure with single retry
- **Works with Special URLs**: No longer dependent on finding "valid" tabs for AI operations
- **Reduced Code**: Simplified from 120 lines to 91 lines (24% reduction)

#### Advanced Caching System
- **LRU Cache Manager**: Implemented proper Least Recently Used eviction (max 100 entries)
- **Content-Based Keys**: Cache keys now include content hash to detect changes
- **Automatic Invalidation**: Cache invalidates when tab content loads/updates
- **Statistics Tracking**: Cache hits, misses, evictions, and hit rate monitoring
- **Memory Efficient**: Prevents unbounded growth with automatic eviction

#### Error State Differentiation
- **7 Distinct States**: Ready, Downloading, Download Required, Flags Disabled, GPU Unavailable, Storage Full, Unsupported Browser, Unknown Error
- **Smart Error Interpretation**: Automatically detects error types from exception messages
- **Detailed Messages**: Each state provides specific explanation and actionable next steps
- **Visual Indicators**: Status-specific colors and animations (downloading shows pulsing indicator)
- **Collapsible UI**: Troubleshooting steps in expandable sections to reduce clutter

### 🚀 Performance Improvements
- **Faster Analysis**: LRU cache reduces repeated AI calls significantly
- **Better Memory Management**: Automatic eviction prevents memory bloat
- **Session Reuse**: Single persistent session eliminates recreation overhead
- **Content Change Detection**: Only reanalyzes when content actually changes

### 🔧 Bug Fixes
- **Fixed**: Tab injection failures with chrome:// and special URLs
- **Fixed**: Cache not invalidating on content updates
- **Fixed**: Silent failures with generic error messages
- **Fixed**: Session recreation on every analysis call

### ✨ New Features
- **Cache Statistics API**: New `getCacheStats` action returns hit rate and metrics
- **Status-Specific Styling**: Different colors for different error states
- **Error Actions**: Each error state includes specific remediation steps
- **Content Hashing**: Detects when tab content changes vs. just reloading

### 🛠 Technical Changes
- Created `CacheManager` class (130 lines) with full LRU implementation
- Added `AIStatus` enum and `AIStatusMessages` configuration
- Service worker AI session via `self.ai.languageModel` instead of `window.ai`
- Tab update listeners for automatic cache invalidation
- Enhanced error detection with regex patterns
- Cache key format: `${tab.url}:${contentHash}`

### 📚 Documentation
- Detailed comments explaining cache behavior
- Status state documentation in popup
- Troubleshooting guide in error UI

---

*For earlier versions, see git history*
