# Full Drag & Drop Interface - Implementation Plan

**Status**: 🚧 Phase 4 Complete - Phases 1-4 Implemented

## Implementation Progress

- ✅ **Phase 1: Foundation & Staged State** (v1.3.0) - Complete
  - Staged state management with original/staged separation
  - Chrome API integration for tabs and groups
  - Apply/Cancel workflow
  - Auto-refresh with conflict detection

- ✅ **Phase 2: Drag & Drop with Staging** (v2.0.0) - Complete
  - dnd-kit integration for smooth drag and drop
  - Drag tabs between groups, to ungrouped, create new groups
  - Reorder tabs within groups
  - Visual feedback and drag overlays
  - Performance optimized with React.memo

- ✅ **Phase 3: Enhanced Apply & Progress** - Complete
  - Progress indicators during Apply operations
  - Toast notification system (success/error/warning/info)
  - Diff calculator for precise operation tracking
  - Better error handling with error collection
  - Auto-refresh on external Chrome changes
  - AI Analyze button integration
  - Fixed stale closure bugs

- ✅ **Phase 4: Group Management & AI Naming** - Complete
  - AI name generation with sparkle button (✨)
  - Color picker with Chrome's 8 colors
  - Random unused color selection for new groups
  - Delete group functionality with confirmation
  - Inline title editing with 50 char limit
  - Working delete that ungroups tabs

- 🔜 **Phase 5: AI Suggestions Inline** - Pending
- 🔜 **Phase 6: Search, Filter & Duplicates** - Pending
- 🔜 **Phase 7: Undo/Redo & Polish** - Pending
- 🔜 **Phase 8: Performance & Optimization** - Pending
- 🔜 **Phase 9: Testing & Deployment** - Pending

## Overview

Transform Better Tabs AI from a simple popup to a full-page drag-and-drop interface for managing Chrome tabs and groups, inspired by the character-page-v2 pattern with **staged changes** (Apply/Cancel workflow), inline editing, and AI-powered assistance.

---

## Key User Decisions Applied

### 🎯 Core Interaction Model
- **✅ Staged Changes**: All changes staged until "Apply Changes" clicked (nothing syncs to Chrome immediately)
- **✅ Cancel Support**: User can cancel all changes without affecting Chrome tabs/groups
- **✅ Conflict Detection**: Show "Refresh to see latest" banner if Chrome tabs change during editing session
- **✅ Apply Prompt**: On Apply, confirm deletion of empty groups and show count of tabs that will be ungrouped

### 📐 Layout & Organization
- **Mixed 3-Column Layout**: Groups/tabs mixed within columns for space efficiency, not separated by type
  - **Left**: Ungrouped tabs
  - **Center**: Existing groups (mixed with suggested groups labeled "Suggested")
  - **Right**: New Group Box at top
- **Inline Suggestions**: AI suggestions appear inline with existing groups (labeled "Suggested"), not separate panel

### 🎨 Visual Design
- **Tab Cards**: Favicon + title + domain (60px height)
- **Group Style**: Card with shadow and Chrome group color accent
- **Color Scheme**: Hybrid (gradient header, clean body) with exact Chrome group colors
- **Loading**: Skeleton placeholders on initial load, spinner icon for AI operations

### 🖱️ Drag & Drop Behavior
- **Visual Feedback**: Semi-transparent (0.5 opacity), shrinks slightly, shadow, drag handle follows cursor
- **Drop Zones**: Colored border + "Drop here" text overlay
- **Multi-select**: Both Ctrl/Cmd-click (multi) and Shift-click (range) enabled
- **Reordering**: Users can reorder both tabs within groups AND groups themselves
- **Error Handling**: Snap back to original position + show toast error on failure

### 🤖 AI Features
- **Name Generation**:
  - Small sparkle icon next to group name
  - Applies immediately (no accept/reject)
  - Button grayed out during generation
  - Prevents same name from being suggested twice
- **Suggestions Display**: Inline with existing groups, labeled "Suggested"
- **Editable Before Creation**: Can drag tabs in/out, rename before creating
- **Creation Method**: Both drag and "Create" button supported
- **Post-Creation**: Remove from suggestions immediately, refresh suggestions automatically
- **Limit**: Show top 10 suggestions

### 🔧 Group Operations
- **Name Editing**: Click name to edit inline (50 char limit with counter)
- **Empty Groups**: Kept empty during staging, prompt to delete on Apply if still empty
- **Delete**: Shaded X button, confirmation only on Apply with notification of tabs that will be ungrouped
- **Color Picker**: Standard Chrome color options

### 🔍 Search & Filtering
- **Global Search**: Search by title/URL, filters all sections
- **Individual Filter Checkboxes**:
  - ☐ By domain
  - ☐ Grouped/ungrouped status
  - ☐ Recency (last accessed)
- **Persistence**: Save preferences in chrome.storage

### ⌨️ Advanced Features
- **Bulk Operations Toolbar**: When tabs selected, show: Group, Close, Pin
- **Multi-select**: Ctrl/Cmd + Shift click support
- **Undo/Redo**: Last 5 operations tracked
- **Duplicate Detection**: Highlight duplicates + show "Merge duplicates" button
- **Tab Tooltips**: Short title on first line, URL on second line
- **Keyboard Nav**: Arrow keys + Space to grab/drop
- **Accessibility**: Basic only (screen reader support deferred)

### 🚫 Desktop Only
- No mobile/tablet support initially
- Optimized for desktop workflows

---

## Architecture Pattern

Following the character-page-v2 pattern with **staged changes**:

### State Management
- **No external libraries** - Use React hooks (useState, useEffect, useContext)
- **Staged State**: All changes held in memory until "Apply" clicked
- **Original State**: Keep pristine copy of Chrome state for Cancel/Rollback
- **Diff Tracking**: Track what changed (tab moves, renames, deletions) for efficient Apply

### Data Flow
```
Chrome API → Original State (immutable)
                    ↓
              Staged State (mutable, user edits)
                    ↓
           User clicks "Apply"
                    ↓
         Batch Chrome API calls
                    ↓
            Success → Refresh
            Error → Rollback + Toast
```

### Component Strategy
- **Inline editing** - Click to edit group names
- **Drag to reorganize** - Tabs and groups both draggable
- **Visual feedback** - Loading states, success/error toasts, smooth animations
- **Optimistic UI** - Update staged state immediately, show loading during Apply

---

## File Structure

```
better-tabs-ai/
├── full-interface/
│   ├── index.html              # Main page entry point
│   ├── app.jsx                 # React app root with staged state management
│   ├── components/
│   │   ├── Layout.jsx          # Main 3-column layout container
│   │   ├── Header.jsx          # Title, Apply/Cancel buttons, search
│   │   ├── FilterBar.jsx       # Individual filter checkboxes
│   │   ├── UngroupedColumn.jsx # Left: ungrouped tabs
│   │   ├── GroupsColumn.jsx    # Center: groups (existing + suggested)
│   │   ├── NewGroupBox.jsx     # Right: "New Group" drop target
│   │   ├── TabCard.jsx         # Draggable tab item with favicon + title + domain
│   │   ├── GroupContainer.jsx  # Droppable group with header + tabs
│   │   ├── BulkToolbar.jsx     # Group/Close/Pin when tabs selected
│   │   ├── ConflictBanner.jsx  # "Refresh to see latest" warning
│   │   ├── ApplyConfirmModal.jsx # Confirm empty group deletion
│   │   ├── LoadingState.jsx    # Skeleton placeholders
│   │   ├── ErrorBoundary.jsx   # Error handling wrapper
│   │   └── Toast.jsx           # Success/error notifications
│   ├── hooks/
│   │   ├── useStagedState.js   # Core staging logic (original + staged + diff)
│   │   ├── useChromeTabs.js    # Fetch tabs, listen for changes
│   │   ├── useChromeGroups.js  # Fetch groups, listen for changes
│   │   ├── useDragDrop.js      # Drag & drop with staged updates
│   │   ├── useMultiSelect.js   # Ctrl/Shift click selection
│   │   ├── useUndoRedo.js      # History stack (last 5 ops)
│   │   ├── useAI.js            # AI suggestions and naming
│   │   ├── useSearch.js        # Search/filter logic
│   │   └── useDuplicates.js    # Duplicate detection
│   ├── utils/
│   │   ├── chrome-api.js       # Wrapper for chrome.tabs/tabGroups
│   │   ├── diff-calculator.js  # Calculate changes for Apply
│   │   ├── batch-applier.js    # Batch apply Chrome API calls
│   │   └── ai-helpers.js       # AI prompt formatting
│   └── styles/
│       ├── main.css            # Global styles (gradient header)
│       ├── layout.css          # 3-column grid
│       ├── drag-drop.css       # Drag feedback (opacity, shadow, shrink)
│       └── animations.css      # 60fps transitions (reduce if 50+ tabs)
├── background/
│   └── service-worker.js       # (existing, reuse AI logic)
└── manifest.json               # Add full-interface page
```

---

## Phase 1: Foundation & Staged State

**Goal**: Create page structure, load Chrome data, implement staged state management

### Tasks:

1. **Create HTML entry point** (`full-interface/index.html`)
   - Use React 18 from CDN (no build step to start)
   - Include dnd-kit library (modern, accessible, 40kb)
   - Basic page shell with gradient header

2. **Setup React app** (`full-interface/app.jsx`)
   - Initialize React with ErrorBoundary
   - Create StagedStateContext for global state
   - Render Layout component

3. **Implement staged state management** (`hooks/useStagedState.js`)
   ```javascript
   const useStagedState = () => {
     const [originalState, setOriginalState] = useState({ tabs: [], groups: [] });
     const [stagedState, setStagedState] = useState({ tabs: [], groups: [] });
     const [hasChanges, setHasChanges] = useState(false);

     const resetToOriginal = () => setStagedState(originalState);
     const applyChanges = async () => { /* batch Chrome API calls */ };

     return { originalState, stagedState, hasChanges, resetToOriginal, applyChanges, updateStaged };
   };
   ```

4. **Fetch Chrome data** (`hooks/useChromeTabs.js`, `hooks/useChromeGroups.js`)
   - Load tabs via `chrome.tabs.query({})`
   - Load groups via `chrome.tabGroups.query({})`
   - Setup `chrome.tabs.onUpdated` listener
   - On external change, show conflict banner (don't auto-refresh)

5. **Create chrome-api wrapper** (`utils/chrome-api.js`)
   - `getAllTabs()`
   - `getAllGroups()`
   - `createGroup(tabIds, name, color)`
   - `moveTabToGroup(tabId, groupId)`
   - `ungroupTab(tabId)`
   - `updateGroupName(groupId, name)`
   - `updateGroupColor(groupId, color)`
   - `deleteGroup(groupId)`
   - `reorderTabs(tabIds, positions)`
   - `closeTabs(tabIds)`
   - `pinTabs(tabIds)`

6. **Create Layout** (`components/Layout.jsx`)
   - Header with Apply/Cancel buttons (disabled until changes)
   - 3-column grid: UngroupedColumn | GroupsColumn | NewGroupBox
   - Footer with status text ("X changes pending")

7. **Display ungrouped tabs** (`components/TabCard.jsx`, `components/UngroupedColumn.jsx`)
   - Show tabs where groupId === -1
   - Card style: favicon + title + domain (60px height)
   - No drag functionality yet

8. **Display existing groups** (`components/GroupContainer.jsx`, `components/GroupsColumn.jsx`)
   - Show groups with header (name, color accent, X button)
   - List tabs inside each group
   - Mixed with suggested groups (labeled "Suggested")

**Acceptance Criteria**:
- ✅ Page loads with current Chrome tabs and groups
- ✅ Changes tracked but not applied until "Apply" clicked
- ✅ Cancel button resets to original state
- ✅ Apply button disabled when no changes
- ✅ Conflict banner shows if Chrome tabs change externally

---

## Phase 2: Drag & Drop with Staging

**Goal**: Enable drag-and-drop that updates staged state only

### Tasks:

1. **Setup dnd-kit** (chosen library)
   - Install via CDN or npm
   - Configure DndContext with sensors
   - Add collision detection

2. **Make TabCard draggable** (`components/TabCard.jsx`)
   - Use `useDraggable` hook
   - Visual feedback: opacity 0.5, transform scale(0.95), shadow
   - Show drag handle icon on hover
   - Drag preview follows cursor

3. **Make GroupContainer droppable** (`components/GroupContainer.jsx`)
   - Use `useDroppable` hook
   - Highlight with colored border on drag-over
   - Show "Drop here" text overlay
   - Support insertion position for reordering

4. **Implement New Group Box** (`components/NewGroupBox.jsx`)
   - Fixed drop zone at top of right column
   - Visual feedback on hover (pulsing border)
   - On drop: Create untitled group in staged state
   - Add sparkle icon for AI naming

5. **Handle drop operations** (`hooks/useDragDrop.js`)
   - **Tab → Group**: Update staged state, don't call Chrome API
   - **Tab → New Group**: Create new group in staged state
   - **Tab → Ungrouped**: Remove from group in staged state
   - **Reorder tabs**: Update positions in staged state
   - **Reorder groups**: Update group order in staged state
   - Track all changes for diff calculation

6. **Multi-select support** (`hooks/useMultiSelect.js`)
   - Ctrl/Cmd+click: Toggle selection
   - Shift+click: Select range
   - Show selected count badge
   - Drag all selected tabs together
   - Clear selection on Apply/Cancel

7. **Bulk toolbar** (`components/BulkToolbar.jsx`)
   - Show when tabs selected
   - Buttons: Group, Close, Pin
   - Actions update staged state only

8. **Visual state indicators**
   - Highlight changed tabs (subtle border)
   - Show "pending" badge on modified groups
   - Update footer text: "X tabs moved, Y groups changed"

**Acceptance Criteria**:
- ✅ Drag tabs between groups smoothly
- ✅ Multi-select with Ctrl/Shift works
- ✅ All changes update staged state only (no Chrome sync)
- ✅ Visual feedback shows what's changed
- ✅ Bulk operations available when tabs selected

---

## Phase 3: Apply/Cancel & Batch Operations

**Goal**: Implement Apply button that batches all Chrome API calls

### Tasks:

1. **Diff calculator** (`utils/diff-calculator.js`)
   - Compare originalState vs stagedState
   - Generate list of operations:
     ```javascript
     {
       tabMoves: [{ tabId, fromGroup, toGroup }],
       groupCreates: [{ name, color, tabIds }],
       groupDeletes: [groupId],
       groupRenames: [{ groupId, newName }],
       groupReorders: [{ groupId, newPosition }],
       tabCloses: [tabId],
       tabPins: [tabId]
     }
     ```

2. **Batch applier** (`utils/batch-applier.js`)
   - Execute operations in order:
     1. Create new groups
     2. Move tabs to groups
     3. Ungroup tabs
     4. Rename groups
     5. Reorder tabs
     6. Delete groups
     7. Close tabs
     8. Pin tabs
   - Show progress indicator
   - Collect errors, show toast for each failure
   - On success: Refresh from Chrome, clear staged state

3. **Apply confirmation modal** (`components/ApplyConfirmModal.jsx`)
   - Show if any groups will be empty after Apply
   - List groups: "GitHub Development (0 tabs) will be deleted"
   - Checkbox: "Delete empty groups"
   - Buttons: Cancel, Apply Anyway

4. **Apply button handler** (`app.jsx`)
   - Disable Apply button during execution
   - Show loading spinner in button
   - Calculate diff
   - Show confirmation if needed
   - Execute batch applier
   - On success: Toast "X tabs moved, Y groups created"
   - On error: Toast with retry button, rollback staged state

5. **Cancel button handler**
   - Simple: `setStagedState(originalState)`
   - Clear all pending changes
   - Toast: "Changes discarded"

6. **Conflict banner** (`components/ConflictBanner.jsx`)
   - Show when Chrome tabs change during session
   - Text: "Tabs have changed in other windows. Refresh to see latest, or continue editing."
   - Buttons: Refresh (reload), Ignore

**Acceptance Criteria**:
- ✅ Apply button batches all changes efficiently
- ✅ Empty groups prompt for deletion
- ✅ Success toast shows summary
- ✅ Errors show specific failures with retry
- ✅ Cancel fully resets to original state

---

## Phase 4: Group Management & AI Naming

**Goal**: Edit names, AI generation, color picker, delete groups

### Tasks:

1. **Inline name editing** (`components/GroupContainer.jsx`)
   - Click name to show input field
   - 50 char limit with character counter (near limit only)
   - Save on Enter, cancel on Escape
   - Update staged state only

2. **AI name generation** (`components/GroupContainer.jsx`)
   - Small sparkle icon next to name (✨)
   - On click:
     - Disable button, show spinner icon
     - Gather tab titles/URLs from group
     - Send to service worker: `chrome.runtime.sendMessage({ action: 'generateGroupName', tabs })`
     - Apply name immediately to staged state
     - Re-enable button
   - Track generated names to prevent repeats (store in hook state)

3. **Group color picker** (`components/GroupContainer.jsx`)
   - Show on click of color swatch in header
   - Display Chrome's 8 color options as swatches
   - Apply immediately to staged state (visual only until Apply button)

4. **Delete group** (`components/GroupContainer.jsx`)
   - Shaded X button in header (opacity: 0.6 normally, 1.0 on hover)
   - On click: Mark group for deletion in staged state
   - Tabs move to ungrouped in staged state
   - Visual: Gray out group, show "Will be deleted" badge
   - Actual deletion happens on Apply

5. **Empty group handling**
   - If all tabs dragged out, group stays empty in staged state
   - On Apply: Show confirmation modal listing empty groups
   - User chooses to delete or keep

**Acceptance Criteria**:
- ✅ Group names editable inline with validation
- ✅ AI generates names immediately, prevents duplicates
- ✅ Color picker shows Chrome colors
- ✅ Delete marks for deletion, confirmed on Apply
- ✅ Empty groups handled gracefully

---

## Phase 5: AI Suggestions Inline

**Goal**: Show AI suggestions inline with groups, editable before creation

### Tasks:

1. **Fetch suggestions** (`hooks/useAI.js`)
   - On page load, call existing `analyzeAllTabs` from service worker
   - Parse suggestions array
   - Store in state alongside existing groups

2. **Display inline** (`components/GroupsColumn.jsx`)
   - Mix suggested groups with existing groups
   - Visual distinction:
     - Dashed border instead of solid
     - "Suggested" badge in header
     - Lighter background
     - Confidence % shown

3. **Edit before creation** (`components/GroupContainer.jsx`)
   - Allow dragging tabs in/out of suggested groups
   - Allow renaming suggested group
   - Changes update suggestion object in state

4. **Create suggested group** (`components/GroupContainer.jsx`)
   - "Create" button in suggestion header
   - On click: Convert suggestion to regular group in staged state
   - Remove from suggestions list
   - Visual: Fade out suggestion, fade in new group

5. **Drag to create** (`hooks/useDragDrop.js`)
   - Allow dragging entire suggestion (by header) to groups column
   - Same effect as "Create" button

6. **Dismiss suggestion** (`components/GroupContainer.jsx`)
   - X button in suggestion header
   - Remove from suggestions list
   - No effect on tabs

7. **Refresh suggestions** (`components/Header.jsx`)
   - Button: "🔄 Refresh Suggestions"
   - Re-run AI analysis on current ungrouped tabs
   - Show loading state during analysis
   - Limit to top 10 suggestions

**Acceptance Criteria**:
- ✅ Suggestions appear inline with groups
- ✅ Can edit before creating
- ✅ Create button and drag both work
- ✅ Refresh updates suggestions
- ✅ Dismiss removes suggestion

---

## Phase 6: Search, Filter & Duplicates

**Goal**: Help users find tabs, detect duplicates

### Tasks:

1. **Search bar** (`components/Header.jsx`)
   - Text input with magnifying glass icon
   - Placeholder: "Search tabs by title or URL..."
   - Debounced (300ms)
   - Clear button (X)

2. **Search filtering** (`hooks/useSearch.js`)
   - Filter tabs by title (case-insensitive)
   - Filter tabs by URL/domain match
   - Return filtered tab IDs
   - Dim non-matching tabs, highlight matches

3. **Filter checkboxes** (`components/FilterBar.jsx`)
   - Individual checkboxes:
     - ☐ Filter by domain (shows domain dropdown when checked)
     - ☐ Show only ungrouped
     - ☐ Show only grouped
     - ☐ Sort by recency
   - Apply filters to tab list

4. **Domain filter dropdown** (`components/FilterBar.jsx`)
   - Extract unique domains from all tabs
   - Dropdown appears when "Filter by domain" checked
   - Select domain to show only tabs from that domain

5. **Persist preferences** (`hooks/useSearch.js`)
   - Save search term, active filters to `chrome.storage.local`
   - Restore on page load

6. **Duplicate detection** (`hooks/useDuplicates.js`)
   - On page load, find tabs with identical URLs
   - Group by URL, count duplicates
   - Return list of duplicate sets

7. **Duplicate highlighting** (`components/TabCard.jsx`)
   - Add orange border to duplicate tabs
   - Show badge: "2 duplicates"

8. **Merge duplicates** (`components/BulkToolbar.jsx` or `components/Header.jsx`)
   - Button: "Merge X Duplicates"
   - On click: Keep first tab of each set, mark others for closing in staged state
   - Show confirmation: "Will close X duplicate tabs"

**Acceptance Criteria**:
- ✅ Search filters tabs across all sections
- ✅ Individual filter checkboxes work
- ✅ Domain filter functional
- ✅ Preferences persist
- ✅ Duplicates highlighted with merge button

---

## Phase 7: Undo/Redo & Polish

**Goal**: Undo/redo stack, loading states, error handling, tooltips

### Tasks:

1. **Undo/Redo hook** (`hooks/useUndoRedo.js`)
   - Track last 5 staged state snapshots
   - On user action (drag, edit, delete), push to history
   - Undo: Pop from history, restore previous state
   - Redo: Move forward in history
   - Keyboard: Ctrl+Z (undo), Ctrl+Shift+Z (redo)

2. **Undo/Redo buttons** (`components/Header.jsx`)
   - ↶ Undo, ↷ Redo buttons
   - Disabled when at start/end of history
   - Tooltip shows what will be undone

3. **Loading states** (`components/LoadingState.jsx`)
   - Skeleton placeholders on initial load (3 columns)
   - Spinner icon in Apply button during batch operations
   - Spinner icon in AI sparkle button during name generation
   - Progress bar if applying 20+ operations

4. **Toast notifications** (`components/Toast.jsx`)
   - Success toasts (auto-dismiss 5s):
     - "5 tabs moved to GitHub Development"
     - "3 groups created"
   - Error toasts (manual dismiss):
     - "Failed to create group: [error]"
     - "Retry" button
   - Position: Bottom right
   - Stack multiple toasts

5. **Tab tooltips** (`components/TabCard.jsx`)
   - On hover, show tooltip:
     - Line 1: Full page title (truncated at 60 chars)
     - Line 2: Full URL (truncated at 80 chars)
   - Position: Above tab card

6. **Error handling**
   - Catch Chrome API errors
   - Show specific error message in toast
   - Offer retry button
   - On drag failure: Snap tab back + toast
   - On Apply failure: Rollback + detailed toast

7. **Keyboard navigation** (`components/Layout.jsx`)
   - Tab to navigate between sections
   - Arrow keys to move focus between tabs
   - Space to grab/drop tabs
   - Enter to activate buttons
   - Escape to cancel operations

**Acceptance Criteria**:
- ✅ Undo/Redo tracks last 5 operations
- ✅ All loading states show appropriate feedback
- ✅ Errors handled with clear messages and retry
- ✅ Tooltips show full tab info
- ✅ Keyboard navigation works

---

## Phase 8: Performance & Optimization

**Goal**: Handle large tab counts (100+) smoothly

### Tasks:

1. **Virtual scrolling** (`components/UngroupedColumn.jsx`, `components/GroupsColumn.jsx`)
   - Use react-window or react-virtual
   - Render only visible tabs (viewport + buffer)
   - Dynamic height based on card style (60px each)
   - Smooth scrolling

2. **Memoization**
   - `React.memo()` on TabCard (only re-render if props change)
   - `useMemo()` for filtered/sorted tab lists
   - `useCallback()` for drag handlers, search debounce

3. **Throttling**
   - Throttle drag-over events (50ms)
   - Throttle scroll events (100ms)
   - Debounce search input (300ms)

4. **Lazy load favicons**
   - Load favicons only when tabs scroll into view
   - Use IntersectionObserver
   - Cache loaded favicons in memory

5. **Animation optimization**
   - Use CSS transforms for drag (not position)
   - Use `will-change: transform` on draggable items
   - If 50+ tabs: Reduce animation duration (200ms → 100ms)
   - If 100+ tabs: Disable drag animations entirely

6. **Code splitting**
   - Lazy load FilterBar component (only if filters opened)
   - Lazy load ApplyConfirmModal (only when needed)
   - Defer loading AI suggestions until 2s after page load

**Acceptance Criteria**:
- ✅ Smooth performance with 100+ tabs
- ✅ 60fps animations (or 30fps if 50+ tabs)
- ✅ Virtual scrolling renders only visible items
- ✅ Memory usage stays low

---

## Phase 9: Testing & Deployment

**Goal**: Ship to users with quality assurance

### Tasks:

1. **Manual testing checklist**
   - [ ] Test with 0 tabs (empty state)
   - [ ] Test with 1-10 tabs
   - [ ] Test with 50 tabs
   - [ ] Test with 100+ tabs
   - [ ] Drag tab between groups
   - [ ] Drag tab to New Group Box
   - [ ] Drag tab to ungrouped
   - [ ] Reorder tabs within group
   - [ ] Reorder groups
   - [ ] Multi-select (Ctrl + Shift)
   - [ ] Bulk operations (Group, Close, Pin)
   - [ ] Edit group name
   - [ ] AI name generation
   - [ ] Change group color
   - [ ] Delete group
   - [ ] Create suggested group
   - [ ] Edit suggestion before creating
   - [ ] Dismiss suggestion
   - [ ] Search tabs
   - [ ] Filter by domain
   - [ ] Filter by grouped/ungrouped
   - [ ] Detect and merge duplicates
   - [ ] Undo/Redo
   - [ ] Apply changes (success)
   - [ ] Apply changes (with empty groups)
   - [ ] Apply changes (with errors)
   - [ ] Cancel changes
   - [ ] Conflict banner (external tab change)
   - [ ] Keyboard navigation
   - [ ] Error states
   - [ ] Loading states

2. **Update manifest.json**
   - Add full-interface page to web_accessible_resources
   - Ensure sufficient permissions
   - Bump version to 2.0.0 (major feature)

3. **Wire up popup button** (`popup/popup.js`)
   - Replace line 480-487 alert with:
     ```javascript
     chrome.tabs.create({
         url: chrome.runtime.getURL('full-interface/index.html')
     });
     window.close();
     ```

4. **Create README update**
   - Document full interface features
   - Add keyboard shortcuts table
   - Add screenshots/demo GIF
   - Explain Apply/Cancel workflow

5. **Git workflow**
   - Create branch: `feature/full-drag-drop-interface`
   - Commit after each phase
   - Final commit with README/manifest updates
   - Create PR for review

**Acceptance Criteria**:
- ✅ All features tested and working
- ✅ No console errors
- ✅ Documentation complete
- ✅ Ready for user testing

---

## Estimated Timeline

- **Phase 1 (Foundation & Staged State)**: 6-8 hours
- **Phase 2 (Drag & Drop with Staging)**: 8-10 hours
- **Phase 3 (Apply/Cancel & Batch Ops)**: 6-8 hours
- **Phase 4 (Group Management & AI)**: 4-5 hours
- **Phase 5 (AI Suggestions Inline)**: 3-4 hours
- **Phase 6 (Search/Filter/Duplicates)**: 4-5 hours
- **Phase 7 (Undo/Redo & Polish)**: 5-6 hours
- **Phase 8 (Performance)**: 3-4 hours
- **Phase 9 (Testing & Deploy)**: 3-4 hours

**Total**: ~42-54 hours of development work

---

## Technical Decisions Finalized

### ✅ Resolved
1. **Layout**: 3-column mixed (groups/tabs mixed within columns)
2. **Drag library**: dnd-kit (modern, accessible, good docs)
3. **React setup**: CDN initially (no build step), can migrate to Vite later if needed
4. **State management**: React Context for staged state, no external library
5. **Sync model**: Staged changes with Apply/Cancel, not immediate sync
6. **Multi-select**: Enabled (Ctrl + Shift)
7. **Keyboard drag**: Enabled (Arrow + Space)
8. **Accessibility**: Basic (no screen reader initially)

### 📝 Open Questions
1. **Favicon caching**: Use Chrome's cache or fetch separately?
   - **Recommendation**: Rely on Chrome's cache, use tab.favIconUrl
2. **Service worker**: Reuse existing for AI naming?
   - **Recommendation**: Yes, add new message handler for `generateGroupName`
3. **Export/Import**: Defer to later version?
   - **Recommendation**: Yes, not in initial release

---

*Next Steps*: Begin Phase 1 implementation - Foundation & Staged State*