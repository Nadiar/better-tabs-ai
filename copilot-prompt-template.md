# GitHub Copilot Issue Assignment Prompts

When assigning these issues to GitHub Copilot, use these prompts to provide context and guidance.

---

## Issue #1: Add E2E Tests for Ephemeral Groups (v2.3.0 Feature)

### Recommended Prompt:

```
@workspace I need you to implement E2E tests for the ephemeral groups feature introduced in v2.3.0.

**Context:**
- Ephemeral groups are AI suggestions that appear as regular groups with `isSuggested: true` flag
- They're defined in utils/shared/types.ts (lines 41-42)
- Creation logic is in full-interface/app.tsx (lines 508-509, 596-607)
- Rendering is in full-interface/components/GroupContainer.jsx

**Requirements:**
1. Create new test file: tests/e2e/ephemeral-groups.spec.ts
2. Implement at least 5 critical tests (see issue for details)
3. Follow existing test patterns from tests/e2e/drag-and-drop.spec.ts
4. Use setupMockExtension helper from tests/helpers/chrome-mock-factory.ts
5. Tests must complete in <60 seconds

**Sample test structure is provided in the issue description.**

Please analyze the existing codebase, understand the ephemeral groups architecture, and implement comprehensive E2E tests that validate:
- Creating ephemeral groups from AI analysis
- Dismissing individual groups
- Cancel removes all ephemeral groups
- Apply converts ephemeral to permanent
- Re-analysis clears old ephemeral groups

Start by reading the related files, then create the test file with detailed test cases.
```

---

## Issue #2: Fix E2E Test Suite Timeout (180s exceeded)

### Recommended Prompt:

```
@workspace I need you to fix the E2E test suite timeout issue. The test suite consistently times out after 180 seconds.

**Context:**
- Currently 65 tests, but only 16 start before timeout
- Root causes identified in issue: MSW overhead (~40s), hardcoded waits (~50s), Chrome mock overhead (~20s)

**Phase 1 Quick Wins (Target: <90s):**
1. Replace all `page.waitForTimeout()` with conditional waits
   - Use `page.waitForSelector()`, `expect().toBeVisible()`, etc.
   - Search pattern: `grep -r "waitForTimeout" tests/e2e/`

2. Disable MSW verbose logging in tests/setup.ts:
   ```typescript
   server.listen({ onUnhandledRequest: 'bypass' });
   ```

3. Create cached Chrome mock in tests/helpers/chrome-mock-cache.ts:
   ```typescript
   let cachedMock: any = null;
   export function getCachedChromeMock() {
     if (!cachedMock) cachedMock = createChromeMock(...);
     return cachedMock;
   }
   ```

4. Reduce drag steps from 20 to 5 in drag operations

**Implementation Plan:**
1. Audit all waitForTimeout usage across test files
2. Replace with conditional waits (one file at a time)
3. Implement mock caching
4. Test that all 65 tests complete successfully
5. Measure new execution time (target: <90s)

Please start by analyzing the test files, identifying all timeout usage, then systematically replace them with proper conditional waits. Focus on tests/e2e/drag-and-drop.spec.ts first as it has the most waits.
```

---

## Issue #3: Fix Performance Test Methodology (Measures Selenium, Not React)

### Recommended Prompt:

```
@workspace I need you to fix the performance test that currently measures Selenium overhead instead of actual React performance.

**Context:**
- Current test reports 1701ms drag time, but this is misleading
- The test measures WebDriver communication overhead, not React rendering
- Actual React performance is likely ~50-100ms based on the -1.4% degradation metric

**Task:**
Create new performance test file: tests/test_performance_real.py

**Requirements:**
1. Use Performance API instead of Selenium timing
2. Inject JavaScript that measures actual drag operations using:
   - `performance.now()` for timing
   - Native DOM DragEvents (not Selenium ActionChains)
   - `requestAnimationFrame()` to wait for React to finish rendering

3. Update assertions:
   - Change from `< 2000ms` to `< 100ms` for drag operations
   - Add warning threshold at 50-100ms
   - Measure layout shifts/reflows

**Sample implementation is provided in the issue.**

Please analyze the existing tests/test_performance.py to understand the test structure, then create a new file that accurately measures React's actual performance using the Performance API. Keep the old test for reference but mark it as deprecated.

The new test should prove that React performance is actually much faster than the current 1701ms metric suggests.
```

---

## General Tips for Copilot:

1. **Be Specific About Context:**
   - Always reference specific file paths and line numbers
   - Mention related files the agent should analyze
   - Provide code samples when possible

2. **Use @workspace:**
   - This gives Copilot access to the entire codebase
   - It can analyze existing patterns and follow them

3. **Break Down Complex Tasks:**
   - For Issue #2 (timeout), you might create sub-issues for each test file
   - For Issue #1 (tests), you could start with just 2-3 tests, then expand

4. **Request Validation:**
   - Ask Copilot to run the tests after implementation
   - Request that it verify the changes meet acceptance criteria

5. **Iterative Approach:**
   ```
   "Start with tests/e2e/drag-and-drop.spec.ts, fix all waits,
   then move to the next file. Test after each file to ensure
   no regressions."
   ```

---

## Example Iterative Workflow for Issue #2:

**Step 1:**
```
@workspace Please analyze tests/e2e/drag-and-drop.spec.ts and identify
all uses of page.waitForTimeout(). Create a list with line numbers.
```

**Step 2:**
```
@workspace Now replace each waitForTimeout in drag-and-drop.spec.ts
with appropriate conditional waits. For each replacement, explain
why you chose that specific wait condition.
```

**Step 3:**
```
@workspace Run the drag-and-drop tests to verify they still pass
after the changes. Report the execution time before and after.
```

**Step 4:**
```
@workspace Apply the same pattern to tests/e2e/drop-positioning.spec.ts
```

**Continue until all test files are fixed...**

---

## Monitoring Copilot's Progress:

After assigning each issue, periodically ask:
```
@workspace What's the current status of issue #X?
- What have you completed?
- What's remaining?
- Any blockers or questions?
```

This helps keep Copilot on track and allows you to provide guidance if it gets stuck.
