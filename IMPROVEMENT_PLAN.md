# Better Tabs AI - Improvement Plan v1.3

**Branch**: `feature/improvements-v1.3`
**Target Version**: 1.3.0
**Created**: 2024-09-29

---

## Overview

This plan addresses the high and medium priority improvements identified in the code review. The improvements focus on:
1. AI session management reliability
2. Cache strategy optimization
3. Code maintainability and configuration
4. User experience enhancements

---

## High Priority Improvements

### 1. Fix AI Session Management (Service Worker)
**File**: `background/service-worker.js`
**Problem**: AI analysis runs in active tab context, fragile when active tab is special URL
**Lines**: 365-485 (performAIAnalysis function)

**Current Behavior**:
- Creates AI session in active tab using `window.ai`
- Fails if active tab is chrome://, edge://, or other special URLs
- Requires finding a "valid" tab to inject AI code

**Solution**:
- Maintain persistent AI session in service worker context
- Use service worker's `self.ai` API directly instead of tab injection
- Remove dependency on active tab for AI operations
- Keep tab context only for content extraction

**Implementation Steps**:
- [ ] 1.1. Update `createAISession()` to use `self.ai` exclusively
- [ ] 1.2. Store persistent session in service worker (handle session lifecycle)
- [ ] 1.3. Refactor `performAIAnalysis()` to use service worker session
- [ ] 1.4. Remove tab injection logic for AI prompting
- [ ] 1.5. Test with various tab states (special URLs, no active tabs, etc.)

**Files to Modify**:
- `background/service-worker.js` (lines 147-210, 365-485)

**Testing**:
- Open chrome://flags and test analysis
- Test with all tabs in special URLs
- Test with no active tabs
- Test session persistence across multiple analyses

---

### 2. Improve Cache Invalidation Strategy
**File**: `background/service-worker.js`
**Problem**: Cache doesn't account for content changes, fixed 1-minute duration
**Lines**: 219-226, 292-297

**Current Behavior**:
- Simple 1-minute time-based cache
- Cache key: `${url}_${title}` doesn't detect content changes
- No invalidation on tab updates
- No user configuration for cache duration

**Solution**:
- Add cache invalidation on tab update events
- Make cache duration configurable per user preferences
- Add content hash to cache key for change detection
- Implement LRU cache to prevent memory bloat

**Implementation Steps**:
- [ ] 2.1. Create cache configuration in storage (default: 1 minute, max: 10 minutes)
- [ ] 2.2. Add content hash to cache keys (use excerpt hash)
- [ ] 2.3. Implement LRU cache with size limit (max 100 entries)
- [ ] 2.4. Add tab update listener to invalidate specific cache entries
- [ ] 2.5. Add cache statistics (hits, misses, size) for debugging

**Files to Modify**:
- `background/service-worker.js` (lines 9, 90-96, 219-226, 292-297)
- Add new file: `background/cache-manager.js` (optional, for cleaner separation)

**New Settings**:
```javascript
{
  cacheEnabled: true,
  cacheDuration: 60000, // milliseconds
  cacheMaxSize: 100,
  invalidateOnUpdate: true
}
```

**Testing**:
- Test cache hit/miss scenarios
- Test cache invalidation on tab reload
- Test LRU eviction with many tabs
- Test cache size limits

---

### 3. Add User Preferences and Settings
**New Files**: `settings/settings.html`, `settings/settings.js`, `settings/settings.css`
**Problem**: No user configuration, hard-coded values throughout

**Solution**:
- Create settings page UI
- Add storage API for user preferences
- Implement settings sync across extension components
- Add export/import settings functionality

**Settings to Implement**:
```javascript
{
  // Cache Settings
  cacheEnabled: true,
  cacheDuration: 60000,
  cacheMaxSize: 100,
  invalidateOnUpdate: true,

  // Analysis Settings
  analysisDepth: 'balanced', // 'metadata', 'balanced', 'extended'
  contentExcerptLength: 500,
  largeTabThreshold: 50,

  // Grouping Settings
  minimumGroupSize: 2,
  createSubGroups: true,
  subGroupThreshold: 4,
  preserveManualGroups: true,

  // UI Settings
  defaultGroupColor: 'blue',
  collapseGroupsAfterCreate: false,
  showConfidenceScores: true,

  // Advanced
  enableDebugLogging: false,
  analyticsEnabled: false
}
```

**Implementation Steps**:
- [ ] 3.1. Create settings page HTML structure
- [ ] 3.2. Create settings manager class with storage sync
- [ ] 3.3. Update service worker to read settings
- [ ] 3.4. Update popup to use settings
- [ ] 3.5. Add settings UI with form controls
- [ ] 3.6. Add settings validation and defaults
- [ ] 3.7. Implement export/import functionality
- [ ] 3.8. Update popup.html to link to settings page

**Files to Create**:
- `settings/settings.html`
- `settings/settings.js`
- `settings/settings.css`
- `utils/settings-manager.js`

**Files to Modify**:
- `popup/popup.html` (enable settings button)
- `popup/popup.js` (remove alert, open settings page)
- `background/service-worker.js` (read settings)
- `manifest.json` (add settings page permissions if needed)

---

### 4. Better Error State Differentiation
**Files**: `popup/popup.js`, `background/service-worker.js`
**Problem**: Silent failures, vague error messages, no granular status reporting

**Current Issues**:
- Generic "AI not available" message
- No distinction between: downloading, GPU unavailable, storage full, flags disabled
- Silent failures in checkAIAvailability
- No progress indication for model download

**Solution**:
- Create error state enum with specific statuses
- Add detailed status messages for each error type
- Implement progress tracking for model downloads
- Add troubleshooting suggestions per error type

**Error States**:
```javascript
const AIStatus = {
  READY: 'ready',
  DOWNLOADING: 'downloading',
  DOWNLOAD_REQUIRED: 'download-required',
  FLAGS_DISABLED: 'flags-disabled',
  GPU_UNAVAILABLE: 'gpu-unavailable',
  STORAGE_FULL: 'storage-full',
  UNSUPPORTED_BROWSER: 'unsupported-browser',
  UNKNOWN_ERROR: 'unknown-error'
};
```

**Implementation Steps**:
- [ ] 4.1. Create AIStatus enum and error messages map
- [ ] 4.2. Update `checkAIAvailability()` to return detailed status
- [ ] 4.3. Update popup UI to show specific error messages
- [ ] 4.4. Add troubleshooting links per error type
- [ ] 4.5. Add progress indicator for download status
- [ ] 4.6. Implement periodic status checks during download

**Files to Modify**:
- `background/service-worker.js` (lines 29-81)
- `popup/popup.js` (lines 47-97)
- `popup/popup.html` (lines 23-43)
- `popup/popup.css` (add error state styles)

**New UI Elements**:
- Progress bar for download status
- Specific error icons per status
- Direct links to chrome://flags, chrome://on-device-internals
- Estimated download time display

---

## Medium Priority Improvements

### 5. Refactor createSubGroups() for Maintainability
**File**: `background/service-worker.js`
**Problem**: Complex nested logic, hard to understand and maintain
**Lines**: 572-652

**Current Issues**:
- 80-line function with multiple nested loops
- Hard-coded domain patterns scattered throughout
- Unclear logic for single tab assignment
- Difficult to test

**Solution**:
- Extract domain-to-category mapping to separate module
- Split into smaller, focused functions
- Add clear documentation for grouping logic
- Make algorithm testable

**Implementation Steps**:
- [ ] 5.1. Create `utils/domain-patterns.js` config file
- [ ] 5.2. Extract `getDomainCategory(domain)` helper
- [ ] 5.3. Extract `detectTopicFromKeywords(keywords, titles)` helper
- [ ] 5.4. Refactor main logic into clear steps
- [ ] 5.5. Add JSDoc comments explaining algorithm
- [ ] 5.6. Add unit tests for grouping logic

**New Structure**:
```javascript
// utils/domain-patterns.js
export const DOMAIN_PATTERNS = {
  shopping: { ... },
  development: { ... },
  social: { ... },
  // etc.
};

// background/service-worker.js
createSubGroups(tabs, mainCategory) {
  const domainGroups = this.groupByDomain(tabs);
  const namedGroups = this.assignGroupNames(domainGroups, mainCategory);
  const mergedGroups = this.mergeSmallGroups(namedGroups);
  return mergedGroups;
}
```

**Files to Create**:
- `utils/domain-patterns.js`
- `utils/grouping-helpers.js`

**Files to Modify**:
- `background/service-worker.js` (lines 572-652)

---

### 6. Externalize Domain Patterns to Config
**Related to**: #5
**New File**: `utils/domain-patterns.js`

**Configuration Structure**:
```javascript
export const DOMAIN_PATTERNS = {
  shopping: {
    domains: ['amazon', 'ebay', 'etsy', 'shop', 'store'],
    categoryName: 'Shopping',
    specificNames: {
      'amazon': 'Amazon Shopping',
      'ebay': 'eBay Shopping'
    },
    color: 'green'
  },
  development: {
    domains: ['github', 'stackoverflow', 'dev', 'gitlab', 'bitbucket'],
    categoryName: 'Development',
    specificNames: {
      'github': 'GitHub Development',
      'stackoverflow': 'Stack Overflow Development'
    },
    color: 'cyan'
  },
  // ... more categories
};

export const TOPIC_KEYWORDS = {
  'gemini': 'Gemini Development',
  'react': 'React Development',
  'python': 'Python Development',
  'ai': 'AI Development',
  // ... more topics
};

export const COLOR_MAP = {
  // Moved from getCategoryColor()
};
```

**Implementation Steps**:
- [ ] 6.1. Create domain-patterns.js with all current patterns
- [ ] 6.2. Add ability to extend patterns via settings
- [ ] 6.3. Update service worker to import patterns
- [ ] 6.4. Update getCategoryColor() to use exported color map
- [ ] 6.5. Add pattern validation function
- [ ] 6.6. Document pattern configuration format

**Benefits**:
- Easier to add new patterns
- User-configurable patterns (future feature)
- Centralized category management
- Better testability

---

### 7. Implement Group Merge Suggestions
**File**: `background/service-worker.js`
**Problem**: No handling of similar existing groups, manual groups treated same as AI groups

**Solution**:
- Detect similar existing groups
- Suggest merging similar groups
- Track group creation source (manual vs AI)
- Ask user permission before modifying manual groups

**Implementation Steps**:
- [ ] 7.1. Add group metadata tracking (source: 'manual' | 'ai')
- [ ] 7.2. Create `findSimilarGroups()` function
- [ ] 7.3. Implement similarity scoring algorithm
- [ ] 7.4. Add merge suggestion UI in popup
- [ ] 7.5. Implement group merge operation
- [ ] 7.6. Add user preference for auto-merge threshold

**Similarity Algorithm**:
```javascript
function calculateGroupSimilarity(group1, group2) {
  // Compare group names (fuzzy match)
  // Compare tab domains
  // Compare tab categories
  // Return score 0-1
}
```

**Files to Modify**:
- `background/service-worker.js` (add group management methods)
- `popup/popup.js` (add merge UI)
- `popup/popup.html` (add merge buttons)

---

### 8. Add Unit Tests
**New Directory**: `tests/`
**Problem**: No automated testing, difficult to verify changes

**Test Coverage Goals**:
- Core grouping logic
- Cache operations
- Domain pattern matching
- Content extraction
- Error handling

**Implementation Steps**:
- [ ] 8.1. Set up Jest test environment
- [ ] 8.2. Create test fixtures (mock tab data)
- [ ] 8.3. Write tests for grouping algorithms
- [ ] 8.4. Write tests for cache manager
- [ ] 8.5. Write tests for domain patterns
- [ ] 8.6. Add CI/CD integration (optional)

**Files to Create**:
- `tests/service-worker.test.js`
- `tests/cache-manager.test.js`
- `tests/domain-patterns.test.js`
- `tests/grouping-helpers.test.js`
- `tests/fixtures/mock-tabs.js`
- `package.json` (for test dependencies)
- `.github/workflows/test.yml` (optional CI)

**Test Dependencies**:
```json
{
  "devDependencies": {
    "jest": "^29.0.0",
    "@types/chrome": "^0.0.250",
    "jest-chrome": "^0.8.0"
  }
}
```

---

## Low Priority / Nice to Have

### 9. Fix Content Extraction Bug
**File**: `content-scripts/content-script.js`
**Line**: 248
**Issue**: Uses `clone.body` but may reference original document

Quick fix - ensure using clone body correctly:
```javascript
const text = clone.body?.textContent || '';
```

---

### 10. Add Keyboard Shortcuts
**New File**: `manifest.json` (commands section)

```json
{
  "commands": {
    "analyze-tabs": {
      "suggested_key": { "default": "Ctrl+Shift+A" },
      "description": "Analyze and group tabs"
    },
    "find-duplicates": {
      "suggested_key": { "default": "Ctrl+Shift+D" },
      "description": "Find duplicate tabs"
    }
  }
}
```

---

## Implementation Order

### Phase 1: Core Fixes (High Priority)
1. ✅ Create branch and plan document
2. Fix AI session management (#1)
3. Improve cache strategy (#2)
4. Better error states (#4)

### Phase 2: User Experience (High Priority)
5. Add user preferences (#3)
6. Settings page UI

### Phase 3: Code Quality (Medium Priority)
7. Refactor grouping logic (#5)
8. Externalize domain patterns (#6)
9. Add unit tests (#8)

### Phase 4: Feature Enhancement (Medium Priority)
10. Group merge suggestions (#7)
11. Keyboard shortcuts (#10)

### Phase 5: Release
12. Update CHANGELOG.md
13. Update version to 1.3.0
14. Create pull request
15. Testing and QA
16. Merge to master

---

## Testing Checklist

Before completing each phase:

**AI Session Management**:
- [ ] Works with chrome:// URLs open
- [ ] Works with no active tabs
- [ ] Works with extension pages active
- [ ] Session persists across analyses
- [ ] Handles session creation failures gracefully

**Cache System**:
- [ ] Cache hits reduce analysis time
- [ ] Cache invalidates on tab updates
- [ ] LRU eviction works correctly
- [ ] Cache size limits enforced
- [ ] Statistics accurate

**Settings**:
- [ ] All settings persist on change
- [ ] Settings sync across popup/service worker
- [ ] Export creates valid JSON
- [ ] Import validates and applies settings
- [ ] Defaults work on first install

**Error Handling**:
- [ ] Each error state displays correctly
- [ ] Troubleshooting links work
- [ ] Download progress updates
- [ ] Status checks don't crash popup

**Grouping Logic**:
- [ ] Groups created with correct names
- [ ] Domain patterns match correctly
- [ ] Subgrouping works for large groups
- [ ] Colors assigned correctly
- [ ] Manual groups preserved

---

## Files Summary

**To Create**:
- `settings/settings.html`
- `settings/settings.js`
- `settings/settings.css`
- `utils/settings-manager.js`
- `utils/domain-patterns.js`
- `utils/grouping-helpers.js`
- `utils/cache-manager.js` (optional)
- `tests/` directory with test files
- `package.json` (for tests)

**To Modify**:
- `background/service-worker.js` (major refactor)
- `popup/popup.js` (settings, error handling)
- `popup/popup.html` (enable settings, improve errors)
- `popup/popup.css` (new error states)
- `content-scripts/content-script.js` (minor bug fix)
- `manifest.json` (add commands, bump version)
- `CHANGELOG.md` (v1.3.0 notes)
- `README.md` (update features)

---

## Notes

- Keep backward compatibility with existing user data
- Test thoroughly with Chrome flags in different states
- Document all new settings with tooltips/help text
- Keep performance in mind - don't slow down analysis
- Consider memory usage with caching improvements

---

## Progress Tracking

Use this section to mark progress as work is completed.

**Phase 1**: ⏳ In Progress
- ✅ Plan document created
- ⏳ AI session management
- ⏳ Cache strategy
- ⏳ Error states

**Phase 2**: ⏸️ Not Started
**Phase 3**: ⏸️ Not Started
**Phase 4**: ⏸️ Not Started
**Phase 5**: ⏸️ Not Started

---

*Last Updated: 2024-09-29*