# Better Tabs AI

🤖 AI-powered Chrome extension for intelligent tab organization and management using Chrome's built-in Gemini Nano AI.

## Features

- **AI-Powered Grouping**: Automatically categorize and group tabs by topic using Chrome's built-in AI
- **Granular Categorization**: Creates specific group names like "Amazon Shopping", "Python Development", "React Documentation"
- **Smart Content Analysis**: Staged analysis starting with metadata, expanding to full content when needed
- **Performance Optimized**: Analysis results cached for 1 minute, AI session created on startup
- **Manual Trigger**: Analyze tabs on-demand to keep things lightweight
- **Duplicate Detection**: Find and merge duplicate tabs automatically
- **Cache Management**: Clear cache button for fresh analysis when tabs change
- **Focus Mode**: Hide distracting tab groups to improve productivity
- **Minimal UI**: Clean popup interface with link to full-featured management page
- **Privacy-First**: Uses local Chrome AI - no data sent to external servers

## Version 1.2.0 Updates

### 🚀 Performance Improvements
- **AI Session Management**: Sessions now created on service worker startup
- **Analysis Caching**: Results cached for 1 minute to improve performance
- **Popup Optimizations**: Removed direct AI testing to prevent timeout issues

### 🔧 Bug Fixes
- **Language Specification**: Fixed persistent language specification errors
- **Popup Timeout**: Resolved popup closing during analysis
- **Session Creation**: Eliminated redundant AI session creation

### ✨ New Features
- **Cache Management**: Added "Clear Cache" button for manual refresh
- **Better Error Handling**: Improved error messages and fallback behavior

## Requirements

- Chrome 118+ with AI features enabled
- At least 4GB GPU memory
- 22GB free storage space (for Gemini Nano model)
- Enable "Prompt API for Gemini Nano" in `chrome://flags`

## Installation

### Development Installation

1. **Clone or download this repository**

   ```bash
   git clone <repository-url>
   cd better-tabs-ai
   ```

2. **Icons are pre-generated** ✅
   - All required icon files (`icon16.png`, `icon32.png`, `icon48.png`, `icon128.png`) are included
   - No additional icon generation needed

3. **Enable Chrome AI Features**
   - Go to `chrome://flags`
   - Search for "Prompt API for Gemini Nano"
   - Enable the flag and restart Chrome

4. **Load the Extension**
   - Go to `chrome://extensions`
   - Enable "Developer mode" (top right toggle)
   - Click "Load unpacked"
   - Select the `better-tabs-ai` folder

5. **Setup Chrome AI**
   - Click the extension icon in the toolbar
   - If AI is not available, follow the setup instructions
   - The AI model will download automatically (may take several minutes)

## Usage

### Quick Actions (Popup)

1. **Click the extension icon** to open the popup
2. **Check AI Status** - Green dot means AI is ready
3. **Analyze & Group Tabs** - Analyzes all ungrouped tabs and suggests groups
4. **Find Duplicates** - Identifies duplicate tabs for cleanup
5. **Open Full Interface** - Access advanced management features

### How It Works

1. **Content Analysis**: The extension extracts metadata and content from your tabs
2. **AI Categorization**: Chrome's Gemini Nano AI analyzes the content and suggests categories
3. **Group Suggestions**: You'll see suggested tab groups with confidence scores
4. **Manual Approval**: Click "Create Group" to apply suggestions
5. **Smart Handling**: Existing groups are preserved, with options to merge similar ones

## Architecture

### Core Components

- **Service Worker** (`background/service-worker.js`): Handles AI processing and tab management
- **Popup Interface** (`popup/`): Minimal UI for quick actions
- **Content Scripts** (`content-scripts/`): Extract page content for analysis
- **Full Interface** (planned): Drag-and-drop group management

### AI Integration

- **Primary**: Chrome's built-in Gemini Nano (local, private, free)
- **Fallback**: None (extension gracefully handles AI unavailability)
- **Analysis**: Staged approach (metadata → basic content → extended content)

## Privacy

- **Local Processing**: All AI analysis happens locally on your device
- **No External APIs**: No data sent to external servers
- **Minimal Storage**: Only caches analysis results and user preferences
- **Permission Transparency**: Only requests necessary Chrome APIs

## Development

### Project Structure

```
better-tabs-ai/
├── manifest.json                 # Extension configuration
├── background/
│   └── service-worker.js         # AI processing and tab management
├── popup/
│   ├── popup.html               # Popup interface
│   ├── popup.css                # Popup styles
│   └── popup.js                 # Popup logic
├── content-scripts/
│   └── content-script.js        # Page content extraction
├── icons/
│   ├── create-icons.html        # Icon generator
│   └── *.png                    # Extension icons
└── utils/                       # Utility functions (future)
```

### Key Design Decisions

- **Chrome AI Only**: Simplified architecture, no API key management
- **Manual Triggers**: User controls when analysis happens
- **Staged Analysis**: Start with metadata, expand if needed
- **Minimal UI**: Focus on essential features, link to full interface
- **Privacy-First**: Local processing, minimal data storage

## Troubleshooting

### AI Not Available
- Check Chrome version (118+)
- Enable flags in `chrome://flags`
- Ensure sufficient system resources (GPU, storage)
- Wait for model download (check `chrome://on-device-internals`)

### Extension Not Working
- Check `chrome://extensions` for errors
- Look at browser console for error messages
- Ensure all required permissions are granted
- Try reloading the extension

### Performance Issues
- Limit analysis to smaller batches of tabs
- Use metadata-only analysis for large tab counts
- Close unnecessary tabs before analysis

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Roadmap

- [ ] Full-page drag-and-drop interface
- [ ] Custom grouping rules
- [ ] Tab usage analytics
- [ ] Automatic tab archiving
- [ ] Enhanced search and filtering
- [ ] User-defined categories
- [ ] Export/import settings

---

**Note**: This extension requires Chrome's experimental AI features. AI availability may vary based on your system configuration and Chrome version.