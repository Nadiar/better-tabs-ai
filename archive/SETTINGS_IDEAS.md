# Settings & Configuration Ideas

This document tracks ideas for future settings and configuration options.

## AI Configuration Settings

### Confidence Threshold Adjustment

**User Request**: "When we get to working on the Settings section, I think we should have an option for adjusting how aggressive it is about finding matches, as well as how much we want it to correlate. Basically adjusting the confidence threshold up or down. And a setting that enables those options in the Full Interface"

**Implementation Ideas**:

1. **AI Aggressiveness Slider**
   - Range: Conservative (0.8+) to Aggressive (0.5+)
   - Controls minimum confidence score for suggestions
   - Lower threshold = more suggestions, possibly less accurate
   - Higher threshold = fewer suggestions, higher accuracy

2. **Correlation Strength**
   - Controls how strictly tabs must match to be grouped
   - Options:
     - Exact Match: Same domain + similar content
     - Similar Topics: Related keywords/categories
     - Loose: Any AI-detected relationship

3. **Full Interface Toggle**
   - Enable/disable confidence percentage display
   - Show/hide AI suggestions inline
   - Option to require minimum confidence before showing

**Settings Location**:
- Extension options page (`options.html`)
- Accessible from full interface via ⚙️ button
- Synced via `chrome.storage.sync`

**Default Values**:
- Confidence threshold: 0.7 (moderate)
- Correlation: "Similar Topics"
- Show in Full Interface: Yes

**UI Components**:
```javascript
// Example settings UI
{
  aiAggressiveness: 0.7,        // 0.5-0.9 range
  correlationMode: 'similar',    // 'exact' | 'similar' | 'loose'
  showConfidence: true,          // Show % in UI
  minSuggestions: 3,             // Don't show if < 3 suggestions
  maxSuggestions: 10             // Limit suggestions shown
}
```

**Related Files**:
- `background/service-worker.js` - Apply thresholds during analysis
- `full-interface/app.jsx` - Filter suggestions by threshold
- `options.html` - Settings UI (to be created)
