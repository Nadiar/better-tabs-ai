# Better Tabs AI - Screenshots & Animations

This directory contains visual documentation of the Better Tabs AI Chrome extension features.

## 📸 Static Screenshots

### Interface Overview

- **`01_full_interface_overview.png`** - Complete 3-column drag & drop interface
- **`02_ungrouped_tabs_column.png`** - Ungrouped tabs waiting to be organized
- **`03_groups_column.png`** - Organized tab groups with colors
- **`feature_showcase.png`** - Combined showcase of main interface and drag functionality

### Drag & Drop Sequence

- **`04_tab_highlighted_for_drag.png`** - Tab highlighted and ready to drag
- **`05_tab_being_dragged.png`** - Tab in drag state with visual feedback

## 🎬 Animated GIFs

### Core Functionality

- **`drag_drop_animation.gif`** - Complete drag & drop workflow showing:
  1. Tab selection and highlighting
  2. Drag state with visual feedback
  3. Drop zone highlighting
  4. Successful tab organization

### AI Features

- **`ai_suggestions_animation.gif`** - AI suggestions workflow showing:
  1. AI Analyze button activation
  2. Processing indicator
  3. Suggested groupings with confidence scores
  4. Group creation process
  5. Success confirmation

## 🛠️ Generation Scripts

### Available Scripts

- **`create_screenshots.py`** - Full screenshot generation with all features
- **`create_animated_gifs.py`** - Animated GIF generation for workflows
- **`create_feature_showcase.py`** - Combined feature showcase image

### Usage

```bash
# Generate static screenshots
python create_screenshots.py

# Generate animated GIFs
python create_animated_gifs.py

# Create feature showcase
python create_feature_showcase.py
```

## 📋 Requirements

- Python 3.11+
- Selenium WebDriver
- PIL/Pillow for image processing
- Chrome browser with ChromeDriver

## 🎯 Use Cases

These visual assets are perfect for:

- **Documentation** - README.md, GitHub pages
- **Marketing** - Website, app store listings
- **Presentations** - Demo videos, pitch decks
- **User Guides** - Tutorial content, help documentation

## 🔧 Technical Details

- **Resolution**: 1920x1080 (full HD)
- **Format**: PNG for screenshots, GIF for animations
- **Animation Timing**: 1.5-2 seconds per frame
- **Compression**: Optimized for web use while maintaining quality

