# Contributing to Better Tabs AI

## Working with GitHub Copilot on Issues

This guide provides prompts and context for GitHub Copilot when working on open issues.

---

## Issue #1: Add E2E Tests for Ephemeral Groups (v2.3.0 Feature)

### Context for Copilot:

The v2.3.0 release introduced **ephemeral groups** - AI suggestions that appear as regular groups with an `isSuggested: true` flag. This unified architecture replaced the previous separate suggestions state.

**Key Files:**
- `utils/shared/types.ts` (lines 41-42) - `GroupData` interface with `isSuggested` flag
- `full-interface/app.tsx` (lines 508-509, 596-607) - Ephemeral group creation/cleanup logic
- `full-interface/components/GroupContainer.jsx` - Unified rendering for all groups
- `full-interface/components/GroupsColumn.jsx` - Separates ephemeral from regular groups

**Architecture:**
```typescript
// Ephemeral groups are just regular groups with a flag
interface GroupData {
  id: number;
  title: string;
  color: ChromeColor;
  collapsed: boolean;
  isSuggested?: boolean;  // TRUE = ephemeral (removed on cancel)
  confidence?: number;     // AI confidence score
}
```

### Recommended Approach:

1. **Study Existing Tests:**
   - Read `tests/e2e/drag-and-drop.spec.ts` for test patterns
   - Understand `setupMockExtension` helper in `tests/helpers/chrome-mock-factory.ts`
   - Review how Chrome API mocks are created

2. **Create Test File:**
   - New file: `tests/e2e/ephemeral-groups.spec.ts`
   - Import helpers from existing tests
   - Use same structure and naming conventions

3. **Implement 5 Critical Tests:**

```typescript
test('should create ephemeral groups from AI analysis', async ({ page }) => {
  // Mock AI response with suggestions
  // Trigger analysis via button click
  // Verify groups have data-suggested="true" attribute
  // Verify "Suggested" badge is visible
});

test('should remove individual ephemeral group on dismiss', async ({ page }) => {
  // Create ephemeral groups
  // Click dismiss button on one group
  // Verify that specific group removed
  // Verify its tabs moved to ungrouped
});

test('should remove all ephemeral groups on cancel', async ({ page }) => {
  // Create multiple ephemeral groups
  // Click "Cancel" button
  // Verify ALL isSuggested groups removed
  // Verify all tabs moved to ungrouped
});

test('should convert ephemeral to permanent on apply', async ({ page }) => {
  // Create ephemeral groups
  // Click "Apply" button
  // Verify isSuggested flag removed from groups
  // Verify groups persist in Chrome storage
});

test('should clear old ephemeral groups on re-analysis', async ({ page }) => {
  // Create ephemeral groups
  // Double-click "Analyze" to force refresh
  // Verify old ephemeral groups cleared first
  // Verify new ephemeral groups created
  // Verify no leftover single-tab groups
});
```

4. **Test Requirements:**
   - All tests must pass consistently (no flakes)
   - Total execution time <60 seconds
   - Follow existing test patterns for consistency
   - Use proper async/await and selectors

---

## Issue #2: Fix E2E Test Suite Timeout (180s exceeded)

### Context for Copilot:

The test suite times out after 180 seconds, with only 16/65 tests starting before timeout. Root causes:
- MSW interceptor setup: ~40s (10 workers × 4s each)
- Hardcoded `waitForTimeout()`: ~50s cumulative
- Chrome mock serialization: ~20s
- Drag operations: ~50s (using 20 steps)

### Recommended Approach:

**Phase 1: Replace All Fixed Waits (Target: <90s)**

1. **Audit Current Waits:**
```bash
# Find all waitForTimeout usage
grep -r "waitForTimeout" tests/e2e/
```

2. **Replace Pattern:**
```typescript
// ❌ BAD - Fixed wait
await page.waitForTimeout(2000);

// ✅ GOOD - Conditional wait
await page.waitForSelector('.app-container', { state: 'visible' });
await expect(page.locator('.tab-card')).toBeVisible({ timeout: 5000 });
await page.waitForLoadState('networkidle');
```

3. **File-by-File Approach:**
   - Start with `tests/e2e/drag-and-drop.spec.ts` (has most waits)
   - Replace all `waitForTimeout()` in that file
   - Run tests to verify no regressions
   - Move to next file: `tests/e2e/drop-positioning.spec.ts`
   - Continue until all test files are fixed

4. **Optimize MSW Setup:**
```typescript
// tests/setup.ts
const server = setupServer(...handlers);
// Disable verbose logging
server.listen({ onUnhandledRequest: 'bypass' });
```

5. **Create Cached Chrome Mock:**
```typescript
// tests/helpers/chrome-mock-cache.ts (NEW FILE)
let cachedMock: any = null;

export function getCachedChromeMock() {
  if (!cachedMock) {
    cachedMock = createChromeMock(...);
  }
  return cachedMock;
}

// Then update test files to use:
const chromeMock = getCachedChromeMock();
```

6. **Reduce Drag Steps:**
```typescript
// Change from 20 to 5 steps
await page.mouse.move(endX, endY, { steps: 5 });  // Was: { steps: 20 }
```

**Validation:**
- Run full suite: `npm test`
- Verify all 65 tests complete (no timeout)
- Measure execution time (should be <90s)
- Run 10 times to check for flakes

---

## Issue #3: Fix Performance Test Methodology

### Context for Copilot:

The current drag performance test reports **1701ms** average, but this measures Selenium WebDriver overhead, NOT React rendering performance. Evidence React is actually fast:
- Performance degradation: -1.4% (excellent - means getting faster!)
- Memory stability: 0% growth
- Scroll performance: 10.19ms = 98 FPS

### Recommended Approach:

1. **Create New Test File:**
   - File: `tests/test_performance_real.py`
   - Keep old test for comparison (mark as deprecated)

2. **Use Performance API Instead of Selenium:**

```python
def test_real_drag_performance(driver):
    """Measure actual React drag performance using Performance API"""

    driver.get('http://127.0.0.1:8081/tests/mock-interface.html')

    # Measure actual drag time using Performance API
    drag_time = driver.execute_script("""
        const start = performance.now();

        // Get elements
        const source = document.querySelector('.tab-card[data-tab-id="1"]');
        const target = document.querySelector('.group-container[data-group-id="1"]');

        // Create native drag events
        const dragStart = new DragEvent('dragstart', {
            bubbles: true,
            cancelable: true,
            dataTransfer: new DataTransfer()
        });

        const dragOver = new DragEvent('dragover', {
            bubbles: true,
            cancelable: true
        });

        const drop = new DragEvent('drop', {
            bubbles: true,
            cancelable: true
        });

        const dragEnd = new DragEvent('dragend', {
            bubbles: true,
            cancelable: true
        });

        // Dispatch events
        source.dispatchEvent(dragStart);
        target.dispatchEvent(dragOver);
        target.dispatchEvent(drop);
        source.dispatchEvent(dragEnd);

        // Wait for React to finish rendering
        return new Promise(resolve => {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    resolve(performance.now() - start);
                });
            });
        });
    """)

    return drag_time

def test_drag_performance_suite(driver):
    """Run 20 iterations and collect statistics"""
    times = []

    for i in range(20):
        drag_time = test_real_drag_performance(driver)
        times.append(drag_time)
        print(f"Iteration {i+1}/20: {drag_time:.2f}ms")

    avg_time = sum(times) / len(times)

    # NEW assertions based on actual React performance
    assert avg_time < 100, f"Drag time {avg_time:.2f}ms exceeds 100ms threshold"
    if avg_time > 50:
        print(f"⚠️  Warning: Drag time {avg_time:.2f}ms could be optimized")

    print(f"\n✓ Average drag time: {avg_time:.2f}ms (ACTUAL React performance)")
```

3. **Update Old Test File:**
```python
# tests/test_performance.py
# Mark old test as deprecated
def test_drag_performance_selenium_DEPRECATED():
    """
    DEPRECATED: This test measures Selenium overhead (~1700ms), not React.
    Use test_performance_real.py instead for accurate React performance metrics.
    """
    pass
```

4. **Validation:**
   - New test should report 20-100ms (not 1700ms!)
   - Run multiple times to verify consistency
   - Compare against manual testing feel

---

## General Guidelines for All Issues:

### 1. Understanding the Codebase:
- Always read related files first before making changes
- Understand existing patterns and follow them
- Check how similar features are tested/implemented

### 2. Testing Your Changes:
- Run relevant tests after each change
- Verify no regressions introduced
- Check execution time improvements

### 3. Code Quality:
- Follow existing naming conventions
- Add clear comments explaining complex logic
- Keep functions focused and single-purpose

### 4. Incremental Progress:
- Break large tasks into smaller steps
- Test after each step
- Don't move to next step if current fails

### 5. Documentation:
- Update comments when changing behavior
- Add JSDoc/docstrings to new functions
- Update README if adding new test files

---

## Testing Commands:

```bash
# Run all E2E tests
npm test

# Run specific test file
npx playwright test tests/e2e/ephemeral-groups.spec.ts

# Run with UI for debugging
npx playwright test --ui

# Run performance tests
python tests/test_performance_real.py

# Check test coverage
npm run test:coverage
```

---

## Need Help?

- Check existing test files for patterns
- Read Playwright docs: https://playwright.dev/docs/intro
- Review the issue description for detailed context
- Ask questions in the issue comments if blocked

---

## Architectural Context: Ephemeral Groups (v2.3.0)

The v2.3.0 refactor (commit `3b2b65c`) unified the architecture:

**Before v2.3.0:**
- AI suggestions stored in separate `suggestions` state
- Special handling with magic groupId=-999
- Separate `SuggestedGroup` component
- Parallel rendering logic

**After v2.3.0:**
- AI suggestions are regular `GroupData` with `isSuggested: true`
- No special groupId handling (use normal IDs)
- Single `GroupContainer` component for all groups
- Unified rendering with conditional styling

This simplification eliminated ~200 lines of complexity but requires comprehensive E2E testing to ensure the unified approach works correctly.
