# Future Enhancements - Post v2.0.0

**Status**: Planning
**Target Version**: v2.1.0+
**Date**: 2025-10-01

---

## Overview

This document outlines enhancements to be implemented after the v2.0.0 release. These are tracked separately from the core Full Interface implementation (Phases 1-9) and represent strategic improvements to AI quality and user customization.

---

## High Priority: AI Grouping Improvements

**Source**: `AI_GROUPING_IMPROVEMENTS.md`
**Target Version**: v2.1.0

### Problem Statement

The AI analysis correctly categorizes individual tabs but fails to suggest grouping related tabs together. For example:
- Home Depot "Ladder Accessories" → "Home Improvement Shopping"
- Google Search "ladder stabilizers" → "Shopping Results"
- **Expected**: Suggest grouping these together
- **Actual**: 0 suggestions generated ❌

### Root Causes

1. **AI Prompt Limitations**
   - Doesn't emphasize domain similarity
   - Doesn't recognize tool ecosystems (*arr stack, game tools)
   - Doesn't suggest adding to existing groups

2. **Categorization Too Generic**
   - Broad categories like "Messaging App", "Shopping Results"
   - Missing specific tool type recognition

3. **Suggestion Logic Issues**
   - Threshold may be too high
   - Not comparing ungrouped tabs to existing groups
   - Not detecting patterns in domains/titles

### Proposed Implementation Phases

#### Phase A: Improve AI Prompt (Week 1-2)
**Priority**: High
**Effort**: Medium

**Tasks**:
- [ ] Review current prompt in `background/service-worker.js`
- [ ] Add examples of tool ecosystems to prompt
  - *arr stack (Radarr, Sonarr, etc.)
  - Google Workspace (Drive, Docs, Gmail)
  - Game tools (DIM, Braytech)
- [ ] Emphasize domain similarity in prompt
- [ ] Request suggestions for adding tabs to existing groups
- [ ] Lower confidence threshold from 0.7 to 0.6

**Expected Impact**: 50% improvement in suggestion quality

#### Phase B: Pattern Recognition (Week 3-4)
**Priority**: High
**Effort**: High

**Tasks**:
- [ ] Create pattern detection module (`utils/pattern-detector.js`)
- [ ] Detect same domain/subdomain patterns
- [ ] Identify common title prefixes (DIM, Bray, *arr)
- [ ] Recognize URL patterns (*.domain.com = related)
- [ ] Pre-process tabs before AI analysis
- [ ] Boost confidence scores for pattern matches

**Implementation**:
```javascript
// utils/pattern-detector.js
export function detectPatterns(tabs) {
  return {
    domainGroups: groupBySameDomain(tabs),
    titlePrefixGroups: groupByTitlePrefix(tabs),
    urlPatternGroups: groupByUrlPattern(tabs)
  };
}
```

**Expected Impact**: 70% improvement in related tab detection

#### Phase C: Enhanced Categorization (Week 5)
**Priority**: Medium
**Effort**: Medium

**Tasks**:
- [ ] Create category definitions (`utils/category-definitions.js`)
- [ ] Add specific tool categories:
  - Media Server Tools (Radarr, Sonarr, Prowlarr, etc.)
  - Game Tools (DIM, Braytech, light.gg, etc.)
  - Development Tools (GitHub, GitLab, Stack Overflow)
  - Cloud Services (Drive, Docs, Gmail, OneDrive)
- [ ] Integrate with AI prompt
- [ ] Test categorization accuracy

**Expected Impact**: 40% improvement in categorization precision

#### Phase D: Smart Suggestions (Week 6)
**Priority**: High
**Effort**: Medium

**Tasks**:
- [ ] Suggest adding to existing groups when relevant
- [ ] Generate clear group names based on patterns
- [ ] Add confidence scores to each suggestion
- [ ] Sort suggestions by confidence (highest first)
- [ ] Show reasoning for each suggestion

**UI Enhancement**:
```jsx
<SuggestedGroup
  suggestion={suggestion}
  confidence={0.85}
  reasoning="Same domain (homedepot.com) and keyword match (ladder)"
/>
```

**Expected Impact**: Better user trust and transparency

### Success Metrics

**Before Improvements**:
- Suggestions generated: 0/6 tabs (0%)
- False positives: N/A
- User acceptance rate: N/A

**After Improvements (Target)**:
- Suggestions generated: 4-5/6 tabs (70%+)
- False positives: < 20%
- User acceptance rate: > 60%

---

## Medium Priority: Settings & Configuration

**Source**: `SETTINGS_IDEAS.md`
**Target Version**: v2.2.0

### User Request

> "When we get to working on the Settings section, I think we should have an option for adjusting how aggressive it is about finding matches, as well as how much we want it to correlate. Basically adjusting the confidence threshold up or down."

### Proposed Settings Implementation

#### Settings Page Structure

**New Files**:
- `options.html` - Settings page UI
- `options/options.js` - Settings logic
- `options/options.css` - Settings styles
- `utils/settings-manager.js` - Settings storage/sync

#### Settings Categories

##### 1. AI Analysis Settings

```javascript
{
  // Aggressiveness: How eager to suggest groups
  aiAggressiveness: 0.7,        // Range: 0.5 (aggressive) - 0.9 (conservative)

  // Correlation: How strictly tabs must match
  correlationMode: 'similar',   // Options: 'exact' | 'similar' | 'loose'

  // Minimum confidence to show suggestion
  minConfidenceThreshold: 0.6,  // Range: 0.4 - 0.9

  // Show confidence percentages in UI
  showConfidenceScores: true,

  // Maximum suggestions to display
  maxSuggestions: 10,           // Range: 3 - 20

  // Minimum tabs to trigger suggestion
  minTabsForSuggestion: 2       // Range: 2 - 5
}
```

##### 2. UI Preferences

```javascript
{
  // Show suggestions inline in full interface
  showInlineSuggestions: true,

  // Auto-collapse groups after creation
  autoCollapseGroups: false,

  // Default group color for new groups
  defaultGroupColor: 'grey',

  // Theme (future)
  theme: 'system'               // Options: 'light' | 'dark' | 'system'
}
```

##### 3. Performance Settings

```javascript
{
  // Cache duration (milliseconds)
  cacheDuration: 60000,         // Range: 10000 - 600000

  // Enable tab content analysis (slower but more accurate)
  enableContentAnalysis: true,

  // Max tabs to analyze at once
  maxConcurrentAnalysis: 10     // Range: 5 - 20
}
```

##### 4. Privacy & Data

```javascript
{
  // Enable analytics (future)
  analyticsEnabled: false,

  // Send anonymous usage data
  telemetryEnabled: false,

  // Export/import settings
  allowExportImport: true
}
```

#### UI Components

**Settings Page Layout**:
```html
<div class="settings-container">
  <header class="settings-header">
    <h1>Better Tabs AI Settings</h1>
  </header>

  <section class="settings-section">
    <h2>AI Analysis</h2>

    <div class="setting-item">
      <label for="aggressiveness">AI Aggressiveness</label>
      <input type="range" id="aggressiveness"
             min="0.5" max="0.9" step="0.1" value="0.7">
      <span class="value-display">0.7 (Moderate)</span>
      <p class="setting-description">
        Lower = more suggestions (may include false positives)<br>
        Higher = fewer suggestions (higher accuracy)
      </p>
    </div>

    <div class="setting-item">
      <label for="correlation">Correlation Mode</label>
      <select id="correlation">
        <option value="exact">Exact Match</option>
        <option value="similar" selected>Similar Topics</option>
        <option value="loose">Loose (Any Relationship)</option>
      </select>
      <p class="setting-description">
        How strictly tabs must match to be grouped together
      </p>
    </div>
  </section>

  <!-- More sections... -->
</div>
```

#### Implementation Tasks

##### Phase E: Settings Infrastructure (Week 7)
- [ ] Create settings page HTML/CSS
- [ ] Create SettingsManager class
- [ ] Implement chrome.storage.sync integration
- [ ] Add default settings values
- [ ] Add settings validation

##### Phase F: Settings UI (Week 8)
- [ ] Build settings form components
- [ ] Add range sliders with live preview
- [ ] Add save/reset buttons
- [ ] Add export/import functionality
- [ ] Link from full interface header (⚙️ icon)

##### Phase G: Apply Settings (Week 9)
- [ ] Update service-worker to read settings
- [ ] Apply confidence threshold filtering
- [ ] Apply aggressiveness settings to AI prompt
- [ ] Update full interface to respect settings
- [ ] Add settings validation and error handling

### Success Metrics

**Phase E-F**:
- Settings page loads in < 200ms
- All settings persist correctly
- Export/import works reliably

**Phase G**:
- Settings changes apply immediately
- User can find optimal threshold for their use case
- Support tickets decrease due to customization

---

## Low Priority: Additional Features

**Target Version**: v2.3.0+

### 1. Advanced Keyboard Navigation
- Tab key to move focus between sections
- Arrow keys to navigate within lists
- Space bar to grab/drop tabs
- Enter to activate buttons
- Escape to cancel operations

### 2. Virtual Scrolling
- Implement react-window for 200+ tabs
- Render only visible items + buffer
- Maintain 60fps performance
- Dynamic height calculations

### 3. Filter Checkboxes
- Filter by domain (dropdown)
- Filter by grouped/ungrouped status
- Sort by recency (last accessed)
- Persist filter preferences

### 4. Bulk Operations Toolbar
- Select multiple tabs (Ctrl/Shift-click)
- Bulk actions: Group, Close, Pin
- Show selection count
- Clear selection button

### 5. Tab Session Management
- Export current tab layout as JSON
- Import saved sessions
- Quick restore functionality
- Session templates

---

## Release Roadmap

### v2.0.0 (Current) ✅
- Phases 1-9 complete
- Full drag & drop interface
- Undo/Redo functionality
- Performance optimizations

### v2.1.0 (Next, 6-8 weeks)
- **Focus**: AI Improvements
- Phases A-D (AI grouping improvements)
- Better suggestion quality
- Pattern recognition
- Enhanced categorization

### v2.2.0 (8-10 weeks)
- **Focus**: User Customization
- Phases E-G (Settings implementation)
- Confidence threshold adjustment
- Correlation mode settings
- UI preferences

### v2.3.0 (12+ weeks)
- **Focus**: Polish & Power Features
- Advanced keyboard navigation
- Virtual scrolling
- Filter checkboxes
- Bulk operations

---

## Development Notes

### Testing Strategy

**AI Improvements**:
- Create test suite with known tab patterns
- Track suggestion accuracy before/after
- User testing with real browsing patterns

**Settings**:
- Unit tests for settings validation
- Integration tests for chrome.storage.sync
- Manual testing of all setting combinations

### Documentation Updates

After each release:
- [ ] Update README.md with new features
- [ ] Update CHANGELOG.md with version notes
- [ ] Create demo GIFs/videos if applicable
- [ ] Update extension store listing

---

*Last Updated: 2025-10-01*
*Branch: main (after v2.0.0 merge)*
