# AI Grouping Improvements TODO

## Issue Identified: 2025-09-30

### Problem
The AI analysis is not generating grouping suggestions for tabs that should clearly be grouped together.

### Example from Debug Output

**Ungrouped Tabs That Should Be Grouped:**
- Home Depot: "Ladder Accessories" (categorized as "Home Improvement Shopping")
- Google Search: "ladder stabilizers" (categorized as "Shopping Results")
- **These are clearly related** (both about ladders/home improvement) but AI generated 0 suggestions ❌

**Existing Groups (already manually grouped by user):**
- "Destiny" group: DIM - Inventory, Braytech
- "Yarr" group: Radarr, Sonarr, autobrr, etc.

**Analysis Results:**
- Total analyzed: 6 ungrouped tabs
- Categories found: "Home Improvement Shopping", "Shopping Results", "Messaging App", etc.
- **Suggestions generated: 0** ❌

**Expected Behavior:**
- Should recognize the Home Depot ladder accessories tab
- Should recognize the Google search about ladder stabilizers
- Should suggest grouping them together as "Home Improvement" or "Ladder Shopping"
- AI correctly categorized them separately but **failed to suggest they belong together**
- The AI needs to look for semantic relationships between categories, not just categorize individually

### Root Causes to Investigate

1. **AI Prompt Quality**
   - Current prompt may not emphasize domain similarity
   - May not recognize tool ecosystems (*arr stack, game tools, etc.)
   - May not suggest adding to existing groups

2. **Categorization Too Generic**
   - "Messaging App", "Shopping Results" are too broad
   - Not recognizing specific tool types (media servers, game tools, dev tools)

3. **Suggestion Generation Logic**
   - May have threshold too high (not suggesting unless very confident)
   - May not be comparing ungrouped tabs to existing groups
   - May not be looking for patterns in domains/titles

### Proposed Improvements

#### Phase 1: Improve AI Prompt
- Add examples of tool ecosystems (*arr stack, Google Workspace, game tools)
- Emphasize domain similarity (same subdomain = likely related)
- Ask AI to suggest adding tabs to existing groups when relevant
- Lower confidence threshold for generating suggestions

#### Phase 2: Add Pattern Recognition
- Pre-process tabs to identify common patterns:
  - Same domain/subdomain
  - Common prefixes in titles (DIM, Bray = Destiny; *arr = media servers)
  - URL patterns (*.genjack.net = personal services)

#### Phase 3: Enhanced Categorization
- Add specific categories for tools:
  - "Media Server Tools" (Radarr, Sonarr, etc.)
  - "Game Tools" (DIM, Braytech, etc.)
  - "Development Tools" (GitHub, VS Code, etc.)
  - "Cloud Services" (Drive, Docs, Gmail)

#### Phase 4: Smart Grouping Suggestions
- Suggest adding to existing groups when relevant
- Suggest creating new groups with clear naming
- Show confidence scores for each suggestion
- Allow user to tune sensitivity/aggressiveness

### Debug Output Reference

```json
{
  "existing_groups": [
    {"tabCount": 2, "title": "Destiny"},
    {"tabCount": 8, "title": "Yarr"}
  ],
  "categories_found": {
    "Messaging App": 1,
    "Home Improvement Shopping": 1,
    "Shopping Results": 1,
    "Messaging & Collaboration": 1,
    "Email Service": 1,
    "Collaboration & Productivity": 1
  },
  "suggestions_breakdown": []
}
```

### Next Steps

1. Complete remaining full interface phases
2. Review AI prompt in service-worker.js
3. Test with various tab scenarios
4. Implement improvements incrementally
5. Add confidence scoring and user preferences

### Related Files

- `background/service-worker.js` - AI prompt and analysis logic
- `full-interface/app.jsx` - Suggestions display
- `popup/popup.js` - Original analysis implementation
