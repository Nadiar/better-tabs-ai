# Better Tabs AI - Changelog

## Version 1.2.0 - Performance & Stability Update (2024-09-29)

### 🚀 Performance Improvements
- **AI Session Management**: Sessions now created on service worker startup instead of on-demand
- **Analysis Caching**: Added intelligent caching system for tab analysis results (1-minute cache)
- **Popup Optimizations**: Removed direct AI testing from popup to prevent timeout issues

### 🔧 Bug Fixes
- **Language Specification**: Fixed persistent language specification errors in AI sessions
- **Popup Timeout**: Resolved popup closing during analysis by removing direct AI availability checks
- **Session Creation**: Eliminated redundant AI session creation calls

### ✨ New Features
- **Cache Management**: Added "Clear Cache" button to manually refresh analysis results
- **Startup Session**: AI session automatically created when service worker initializes
- **Better Error Handling**: Improved error messages and fallback behavior

### 🛠 Technical Changes
- Moved AI session creation to service worker startup
- Implemented Map-based caching with timestamps
- Removed direct LanguageModel API calls from popup context
- Added cache clearing functionality

### 📋 User Experience
- Faster analysis when cache is available
- More reliable popup behavior during analysis
- Clear visual feedback for cache operations
- Reduced loading times for repeated operations

---

## Version 1.1.0 - Enhanced Categorization (2024-09-29)

- **Feature**: Significantly improved AI categorization for more granular, specific group names
- **Feature**: Smart domain-based subgrouping (e.g., "Amazon Shopping", "GitHub Development")
- **Feature**: Topic-aware grouping (e.g., "Gemini Nano Development", "React Development")
- **Feature**: Intelligent subcategory creation for larger groups (4+ tabs)
- **Enhanced**: AI prompt with detailed instructions for specific categorization
- **Enhanced**: Expanded color mapping for new specific categories
- **Improved**: Better grouping logic that creates meaningful, actionable tab groups

#### New Specific Categories:
- Shopping: "Amazon Shopping", "eBay Shopping"
- Development: "GitHub Development", "Gemini Development", "React Development", "Python Development"
- Social: "Twitter Social", "Reddit Social", "LinkedIn Professional"
- Entertainment: "YouTube Entertainment"
- Documentation: "MDN Documentation", "Chrome Development"

### v1.0.6 (2024-09-29)

- **Fixed**: Replaced inline onclick handlers with proper event listeners to resolve CSP violations
- **Fixed**: Added special URL filtering to prevent chrome:// injection errors
- **Fixed**: Enhanced error handling for tab grouping with detailed logging
- **Improved**: Better data handling for group creation with stored suggestions
- **Security**: Removed 'unsafe-inline' requirements for popup interface

### v1.0.5 (2024-09-29)

- **Added**: Comprehensive debugging logs for group creation troubleshooting
- **Improved**: Enhanced error reporting for tab grouping operations
- **Debug**: Added step-by-step logging for tab ID processing

### v1.0.4 (2024-09-29)

- **Fixed**: Added language specification to AI session creation in tab analysis
- **Fixed**: Updated availability check to handle "downloadable" status properly
- **Fixed**: Resolved "No output language was specified" error in popup
- **Improved**: AI session now triggers download when status is "downloadable"

### v1.0.3 (2024-09-29)

- **Fixed**: Added language specification to service worker AI session creation
- **Added**: Proper expectedInputs and expectedOutputs with English language
- **Improved**: Updated diagnostic tools with correct language specification

### v1.0.2 (2024-09-29)

- **Fixed**: Updated AI API detection to use correct LanguageModel API
- **Fixed**: Improved service worker AI session creation with proper error handling
- **Added**: Comprehensive Gemini Nano setup guide (GEMINI_NANO_SETUP.md)
- **Added**: Advanced troubleshooting with origin trial information
- **Added**: Diagnostic script for testing AI availability
- **Improved**: Updated test page with step-by-step Chrome flags setup

### v1.0.1 (2024-09-29)

- **Fixed**: Enhanced AI detection with detailed error messages and recheck functionality
- **Fixed**: Replaced broken 'Full Interface' and 'Settings' links with preview messages
- **Improved**: Added 'Coming Soon' indicators for incomplete features
- **Improved**: Enhanced troubleshooting documentation with accurate platform requirements
- **Improved**: Updated test page with correct Gemini Nano availability information

### v1.0.0 (2024-09-29)

- **Initial Release**: Chrome extension with AI-powered tab organization
- **Feature**: Automatic tab analysis and grouping suggestions using Gemini Nano
- **Feature**: Duplicate tab detection and management
- **Feature**: Local AI processing (no external API calls)
- **Feature**: Comprehensive setup validation and troubleshooting tools
