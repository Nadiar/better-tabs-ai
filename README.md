# Better Tabs AI

🤖 AI-powered Chrome extension for intelligent tab organization and management using Chrome's built-in Gemini Nano AI.

## Features

### 🎯 Core AI Features
- **AI-Powered Grouping**: Automatically categorize and group tabs by topic using Chrome's built-in AI
- **Granular Categorization**: Creates specific group names like "Amazon Shopping", "Python Development", "React Documentation"
- **Smart Content Analysis**: Staged analysis starting with metadata, expanding to full content when needed
- **Intelligent Suggestions**: AI analyzes ungrouped tabs and suggests adding them to existing groups
- **Manual Trigger**: Analyze tabs on-demand to keep things lightweight

### 🖱️ Full Drag & Drop Interface
- **Complete Visual Management**: Full-page interface with drag-and-drop tab organization
- **Staged Changes**: Apply/Cancel workflow - all changes staged until you click "Apply"
- **Interactive Group Management**: Create, rename, delete, and reorder groups with AI assistance
- **AI Name Generation**: Click sparkle (✨) button to generate intelligent group names
- **Visual Feedback**: Smooth animations, progress indicators, and conflict detection

### 🔍 Advanced Organization
- **Search & Filter**: Global search with individual filter options (domain, recency, type)
- **Duplicate Detection**: Find and merge duplicate tabs automatically
- **Bulk Operations**: Select multiple tabs for group operations, closing, or pinning
- **Smart Caching**: LRU cache with content-based invalidation for faster analysis

### 💡 User Experience
- **Minimal Popup**: Clean popup interface with link to full-featured management page
- **Real-time Updates**: Conflict detection when Chrome tabs change during editing
- **Toast Notifications**: Success/error feedback with detailed status messages
- **Privacy-First**: Uses local Chrome AI - no data sent to external servers

## Latest Updates (v1.5.2)

### 🚀 Full Interface Implementation (Phases 1-6 Complete)
- **✅ Phase 1**: Foundation & staged state management with original/staged separation
- **✅ Phase 2**: Complete drag & drop with dnd-kit integration and performance optimization
- **✅ Phase 3**: Enhanced Apply operations with progress tracking and batch processing
- **✅ Phase 4**: Group management with AI naming, color picker, and delete functionality
- **✅ Phase 5**: AI suggestions displayed inline with existing groups
- **✅ Phase 6**: Search bar with debounced input and duplicate detection

### 🏗️ Architecture Improvements
- **Modern Build System**: Vite build process with React 18 and HTM (JSX-less syntax)
- **CSP Compliance**: Content Security Policy compliant with local React libraries
- **Service Worker Architecture**: AI processing entirely in background service worker
- **Performance Optimized**: React.memo, useCallback, and efficient state management

### 🔧 Technical Enhancements
- **LRU Cache System**: Proper cache with content-hash keys and automatic eviction (max 100 entries)
- **Error Handling**: 7 distinct AI error states with specific troubleshooting actions
- **Session Management**: Persistent AI sessions with automatic recovery on failure
- **Memory Management**: Content-based invalidation and bounded cache growth

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

### 🎮 Quick Actions (Popup Interface)

1. **Click the extension icon** to open the popup
2. **Check AI Status** - Green dot means AI is ready, follow setup instructions if needed
3. **Analyze & Group Tabs** - AI analyzes ungrouped tabs and suggests intelligent groups
4. **Find Duplicates** - Identifies and highlights duplicate tabs for cleanup
5. **Clear Cache** - Reset analysis cache to force fresh AI analysis
6. **Open Full Interface** - Launch the complete drag-and-drop management interface

### 🎯 Full Interface (Complete Tab Management)

1. **Launch**: Click "🔧 Full Interface" in popup or navigate to the full interface page
2. **Drag & Drop**: Drag tabs between groups or create new groups visually
3. **Staged Changes**: All changes are staged until you click "Apply Changes"
4. **AI Assistance**: 
   - Click ✨ sparkle button to generate AI names for groups
   - View AI suggestions inline with existing groups
   - Accept or dismiss suggestions as needed
5. **Search & Filter**: Use the search bar to find specific tabs across all groups
6. **Bulk Operations**: Select multiple tabs (Ctrl/Shift+click) for group operations

### 🤖 How AI Analysis Works

1. **Metadata Analysis**: Extension extracts page titles, URLs, and basic metadata
2. **Content Analysis**: For ambiguous cases, analyzes page content intelligently
3. **Semantic Grouping**: Gemini Nano AI identifies topics and relationships between tabs
4. **Smart Suggestions**: Proposes specific group names like "Amazon Shopping" or "React Development"
5. **Context Awareness**: Considers existing groups and suggests additions when relevant

### 💡 Pro Tips

- **Staged Workflow**: In full interface, make all changes then "Apply" - nothing syncs immediately
- **AI Naming**: Use the sparkle (✨) button for intelligent group name suggestions
- **Conflict Detection**: If Chrome tabs change while editing, you'll see a "Refresh" banner
- **Search Everything**: Global search works across all tabs and groups simultaneously
- **Bulk Selection**: Ctrl+click (individual) and Shift+click (range) for multi-tab operations

## Architecture

### 🏗️ Core Components

- **Service Worker** (`background/service-worker.js`): AI processing, cache management, and tab operations
- **Popup Interface** (`popup/`): Minimal UI for quick actions and status checking
- **Full Interface** (`full-interface/`): Complete React-based drag-and-drop management
- **Content Scripts** (`content-scripts/`): Page content extraction when needed
- **Build System**: Vite-powered build with React 18 and HTM for JSX-less development

### 🤖 AI Integration

- **Primary**: Chrome's built-in Gemini Nano (local, private, free)
- **Fallback**: Graceful degradation with detailed error states
- **Analysis**: Staged approach (metadata → content → extended analysis)
- **Caching**: LRU cache with content-based invalidation for performance
- **Session Management**: Persistent AI sessions with automatic recovery

### 🔄 Data Flow

```
Chrome Tabs ↔ Service Worker (AI Analysis) ↔ LRU Cache
     ↓                    ↓                      ↓
  Popup UI          Full Interface         Local Storage
```

### 📁 Project Structure

```text
better-tabs-ai/
├── manifest.json                 # Extension configuration (v1.5.2)
├── background/
│   └── service-worker.js         # AI processing & tab management
├── popup/
│   ├── popup.html               # Minimal popup interface
│   ├── popup.css                # Popup styles
│   └── popup.js                 # Popup logic with AI status
├── full-interface/
│   ├── index.html               # Full React application entry
│   ├── app.jsx                  # Main app with staged state
│   ├── components/              # React components (drag-drop UI)
│   ├── hooks/                   # Custom React hooks
│   ├── utils/                   # Chrome API wrappers & helpers
│   ├── styles/                  # CSS for animations & layout
│   ├── lib/                     # Local React libraries (CSP compliant)
│   └── dist/                    # Vite build output
├── content-scripts/
│   └── content-script.js        # Page content extraction
├── icons/                       # Extension icons (16, 32, 48, 128px)
└── utils/
    └── cache-manager.js         # LRU cache implementation
```

### 🎨 Full Interface Architecture

- **React 18**: Modern React with hooks and functional components
- **HTM (Hyperscript Tagged Markup)**: JSX-like syntax without compilation
- **Staged State Management**: Apply/Cancel workflow with conflict detection
- **dnd-kit**: Modern drag-and-drop with accessibility support
- **Vite Build**: Fast development and optimized production builds
- **CSP Compliance**: All libraries loaded locally, no inline scripts

## Privacy & Security

- **Local Processing**: All AI analysis happens locally on your device using Chrome's Gemini Nano
- **No External APIs**: No data sent to external servers or third-party services
- **Minimal Storage**: Only caches analysis results and user preferences locally
- **Permission Transparency**: Only requests necessary Chrome APIs (tabs, tabGroups, scripting, storage)
- **Content Security Policy**: Strict CSP with local libraries, no inline scripts or external resources

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes and test thoroughly
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Submit a pull request

## Development Setup

```bash
# Clone the repository
git clone https://github.com/nadiar/better-tabs-ai.git
cd better-tabs-ai

# For full interface development
cd full-interface
npm install
npm run dev    # Development server
npm run build  # Production build
```

## License

MIT License - see LICENSE file for details.

## Roadmap

### ✅ Completed Features
- [x] AI-powered tab analysis with Chrome Gemini Nano
- [x] Full-page drag-and-drop interface with React
- [x] Staged changes workflow (Apply/Cancel)
- [x] AI group name generation and suggestions
- [x] Search and filtering capabilities
- [x] Duplicate tab detection and management
- [x] LRU caching system with performance optimization
- [x] Complete error handling and status management

### 🚧 In Progress
- [ ] Enhanced AI grouping logic (addressing semantic relationships)
- [ ] Mobile/tablet interface adaptation
- [ ] Advanced keyboard navigation and accessibility

### 🔮 Future Features
- [ ] Custom grouping rules and user-defined categories
- [ ] Tab usage analytics and insights
- [ ] Automatic tab archiving for old/unused tabs
- [ ] Export/import settings and group configurations
- [ ] Browser sync for cross-device group management
- [ ] Plugin system for custom AI providers
- [ ] Advanced search with regex and boolean operators

---

**Note**: This extension requires Chrome's experimental AI features. AI availability may vary based on your system configuration and Chrome version.