# Better Tabs AI - Refactor Decisions

> **Purpose**: Answer key architectural questions for the refactor to ensure clean, maintainable shared code
> **Instructions**: Replace "YOUR ANSWER:" with your decision

---

## 🔴 Critical Decisions (Must Answer)

### 1. Module System & Architecture

**Question 1a**: What module system should we use for shared utilities?
**Context**: Chrome extensions with CSP have restrictions on module loading

**Options**:
- [X] ES6 modules with import/export (modern, but CSP restrictions)
- [ ] Inline scripts loaded in order (simple, but old-school)
- [ ] Single shared.js file with global namespace (works everywhere)
- [ ] UMD modules for maximum compatibility

**Default recommendation**: ES6 modules with proper CSP configuration
**YOUR ANSWER**: ES6 modules with TypeScript

---

**Question 1b**: Where should shared utilities be located?
**Context**: Need consistent location all interfaces can access

**Options**:
- [X] `/utils/shared/` - Group all shared code together
- [ ] `/lib/` - Traditional library folder
- [ ] `/shared/` - Clear naming
- [ ] Keep in `/utils/` with clear naming (shared-api.js, etc.)

**Default recommendation**: Keep in `/utils/` with `shared-` prefix
**YOUR ANSWER**: `/utils/shared/` for clear organization

---

### 2. Shared Functionality Scope

**Question 2a**: How much should we extract into shared utilities?
**Context**: Balance between DRY principle and over-abstraction

**Options**:
- [ ] Extract everything possible (maximum reuse)
- [ ] Only extract AI operations and Chrome API calls
- [X] Extract AI ops, Chrome API, and notifications
- [ ] Minimal - only truly duplicated code

**Default recommendation**: AI ops, Chrome API, and notifications
**YOUR ANSWER**: Extract AI operations, Chrome API wrappers, and notification system

---

**Question 2b**: Should we create a shared toast/notification component?
**Context**: Popup and full interface have different toast implementations

**Options**:
- [X] Shared event-based system (CustomEvent dispatch)
- [ ] Shared React component (but popup doesn't use React)
- [ ] Keep separate implementations, just standardize API
- [ ] Create web component that works everywhere

**Default recommendation**: Shared event-based system
**YOUR ANSWER**: Event-based system (works with React and vanilla JS)

---

### 3. Chrome API Wrapper

**Question 3a**: How comprehensive should the Chrome API wrapper be?
**Context**: Currently Chrome API calls are scattered throughout code

**Options**:
- [X] Comprehensive wrapper for all Chrome APIs used
- [ ] Minimal wrapper - only what's duplicated
- [ ] Typed wrapper with JSDoc for better IDE support
- [ ] No wrapper - just shared helper functions

**Default recommendation**: Comprehensive wrapper with JSDoc
**YOUR ANSWER**: Comprehensive TypeScript wrapper with full type definitions

---

**Question 3b**: Should we add error handling to the wrapper?
**Context**: Current code has inconsistent error handling

**Options**:
- [ ] Centralized error handling in wrapper (try/catch all)
- [X] Return error objects, let caller handle
- [ ] Throw errors, use global error handler
- [ ] Keep error handling in each interface

**Default recommendation**: Return standardized error objects
**YOUR ANSWER**: Return standardized { data, error } objects (Go-style error handling)

---

### 4. Code Migration Strategy

**Question 4a**: How should we migrate existing code?
**Context**: Both popup and full interface are working - don't want to break them

**Options**:
- [ ] Migrate popup first (smaller, simpler)
- [ ] Migrate full interface first (more complex, more to gain)
- [ ] Migrate both in parallel
- [X] Create shared utilities first, migrate both gradually

**Default recommendation**: Create utilities first, migrate popup, then full interface
**YOUR ANSWER**: E2E tests first → Shared utilities → Full interface → Popup (as per REFACTOR_PLAN.md)

---

**Question 4b**: Should we maintain backward compatibility during migration?
**Context**: May want to roll back if issues arise

**Options**:
- [ ] Keep old code commented out during migration
- [ ] Use feature flags to toggle old/new implementations
- [X] Full replacement, rely on git for rollback
- [ ] Create new files, keep old ones until migration complete

**Default recommendation**: Feature flags for safety
**YOUR ANSWER**:

---

### 5. State Management

**Question 5a**: Should we introduce shared state management?
**Context**: Popup and full interface currently have separate state

**Options**:
- [X] Shared state via chrome.storage (persist across sessions)
- [ ] Shared state via message passing (real-time sync)
- [ ] Keep separate state, just share operations
- [ ] Use a lightweight state library (Zustand, Jotai)

**Default recommendation**: Keep separate state, share operations only
**YOUR ANSWER**:

---

### 6. Build Process

**Question 6a**: Should we unify the build process?
**Context**: Full interface has Vite build, popup has no build step

**Options**:
- [X] Add Vite build for popup too (unified builds)
- [ ] Keep separate - popup vanilla, full interface Vite
- [ ] Use esbuild for everything (faster, simpler)
- [X] Move popup to React to match full interface

**Default recommendation**: Keep separate for now
**YOUR ANSWER**:

---

**Question 6b**: Should shared utilities have their own build step?
**Context**: Shared code might benefit from minification, tree-shaking

**Options**:
- [ ] Yes, build shared utilities separately
- [ ] No, include source files directly
- [ ] Only for production releases
- [ ] Bundle with each interface independently

**Default recommendation**: Include source files directly
**YOUR ANSWER**:

---

## 🟡 Design Clarifications

### 7. API Design

**Question 7a**: What should the shared API look like?
**Context**: Need clean, intuitive API for all interfaces

**Options**:
- [X] Object-based namespaces (AIOperations.analyze(), ChromeAPI.getTabs())
- [ ] Functional exports (analyzeAllTabs(), getAllTabs())
- [ ] Class-based (new AIService(), new ChromeService())
- [ ] Singleton pattern (AIService.getInstance())

**Default recommendation**: Object-based namespaces
**YOUR ANSWER**: Object-based namespaces (AIOperations.*, ChromeAPI.*, etc.)

---

**Question 7b**: How should we handle async operations?
**Context**: All Chrome API and message passing is async

**Options**:
- [X] Return Promises (standard async/await)
- [ ] Return objects with { data, error } (Go-style)
- [ ] Use callbacks for consistency with Chrome APIs
- [ ] Support both Promises and callbacks

**Default recommendation**: Return Promises with try/catch in callers
**YOUR ANSWER**: Promises with async/await, standardized error handling

---

### 8. Documentation Strategy

**Question 8a**: How should we document shared utilities?
**Context**: Multiple developers may use these utilities

**Options**:
- [ ] JSDoc comments for IDE autocomplete
- [ ] Separate API documentation file
- [X] Both JSDoc and API docs
- [ ] TypeScript definitions for type safety

**Default recommendation**: JSDoc comments + API docs
**YOUR ANSWER**: TypeScript type definitions + JSDoc comments + API documentation in DEVELOPMENT.md

---

**Question 8b**: Should we create examples/usage docs?
**Context**: Make it easy for future development

**Options**:
- [X] Yes, create examples/ directory with usage samples
- [ ] No, JSDoc should be sufficient
- [ ] Add usage examples to main README
- [ ] Create interactive playground/demo

**Default recommendation**: Examples in README
**YOUR ANSWER**:

---

### 9. Testing Strategy

**Question 9a**: Should we add tests for shared utilities?
**Context**: Shared code is critical - bugs affect all interfaces

**Options**:
- [ ] Yes, full unit test coverage (Jest/Vitest)
- [ ] Manual testing only
- [ ] E2E tests covering all interfaces
- [X] Combination of unit + E2E tests

**Default recommendation**: Unit tests for shared utilities
**YOUR ANSWER**:

---

## 🟢 Nice-to-Have Considerations

### 10. Future-Proofing

**Question 10a**: Should we prepare for Manifest V3 changes?
**Context**: Chrome extensions evolving, may need updates

**Options**:
- [ ] Yes, design for future MV3 requirements
- [ ] No, address when needed
- [ ] Create abstraction layer for future changes
- [ ] Document known MV3 compatibility issues

**Default recommendation**: Document known issues, address later
**YOUR ANSWER**:  Document known issues, address later, unless there is an imminint deprecation upcoming

---

**Question 10b**: Should we consider moving to TypeScript?
**Context**: Better type safety, IDE support

**Options**:
- [X] Yes, migrate to TypeScript during refactor
- [ ] No, keep JavaScript
- [ ] Use JSDoc for type hints (TypeScript-lite)
- [ ] Gradual migration - shared utilities first

**Default recommendation**: JSDoc for now, TypeScript maybe v3.0
**YOUR ANSWER**:

---

## Additional Notes

**Any other architectural decisions or preferences you want to specify?**

YOUR ANSWER:

---

**Specific shared utilities you definitely want/don't want:**

YOUR ANSWER:

---

**Timeline preferences (fast refactor vs careful migration):**

YOUR ANSWER:

---

*Once complete, this will guide the refactor implementation.*
