#!/bin/bash
# build-distribution.sh
# Automated distribution build for Better Tabs AI
# Creates both ZIP and CRX packages for distribution

set -e  # Exit on error

# Configuration
VERSION=$(grep '"version"' manifest.json | head -1 | sed 's/.*: "\(.*\)".*/\1/')
DIST_DIR="dist-extension"
ZIP_NAME="better-tabs-ai-v${VERSION}.zip"
CRX_NAME="better-tabs-ai-v${VERSION}.crx"
PEM_NAME="better-tabs-ai.pem"

echo "=========================================="
echo "Better Tabs AI - Distribution Build"
echo "Version: $VERSION"
echo "=========================================="
echo ""

# Step 1: Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf $DIST_DIR
rm -f $ZIP_NAME
rm -f $CRX_NAME
echo "✓ Cleaned"
echo ""

# Step 2: Build all components
echo "🔨 Building all components..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi
echo "✓ Build completed"
echo ""

# Step 3: Create distribution directory structure
echo "📁 Creating distribution directory..."
mkdir -p $DIST_DIR
echo "✓ Directory created"
echo ""

# Step 4: Copy essential files
echo "📋 Copying files to distribution..."

# Copy manifest
cp manifest.json $DIST_DIR/
echo "  ✓ manifest.json"

# Copy icons
cp -r icons/ $DIST_DIR/icons/
echo "  ✓ icons/"

# Copy background scripts
cp -r background/ $DIST_DIR/background/
echo "  ✓ background/"

# Copy content scripts
cp -r content-scripts/ $DIST_DIR/content-scripts/
echo "  ✓ content-scripts/"

# Copy built utilities (TypeScript compiled to JS)
mkdir -p $DIST_DIR/utils
cp -r utils/ $DIST_DIR/utils/
echo "  ✓ utils/"

# Copy full interface
mkdir -p $DIST_DIR/full-interface
cp -r full-interface/dist/ $DIST_DIR/full-interface/dist/
cp full-interface/full-interface.html $DIST_DIR/full-interface/
cp -r full-interface/styles/ $DIST_DIR/full-interface/styles/
cp -r full-interface/components/ $DIST_DIR/full-interface/components/
cp -r full-interface/lib/ $DIST_DIR/full-interface/lib/
echo "  ✓ full-interface/"

# Copy popup
mkdir -p $DIST_DIR/popup-react
cp -r popup-react/dist/ $DIST_DIR/popup-react/dist/
echo "  ✓ popup-react/"

# Copy options
mkdir -p $DIST_DIR/options-ts
cp -r options-ts/dist/ $DIST_DIR/options-ts/dist/
echo "  ✓ options-ts/"

echo "✓ All files copied"
echo ""

# Step 5: Clean development files from distribution
echo "🧹 Removing development files from distribution..."

cd $DIST_DIR

# Remove source directories (keep only dist/)
find . -name "src" -type d -exec rm -rf {} + 2>/dev/null || true
echo "  ✓ Removed src/ directories"

# Remove node_modules
find . -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true
echo "  ✓ Removed node_modules/"

# Remove package files
find . -name "package.json" -delete 2>/dev/null || true
find . -name "package-lock.json" -delete 2>/dev/null || true
echo "  ✓ Removed package files"

# Remove config files
find . -name "tsconfig.json" -delete 2>/dev/null || true
find . -name "vite.config.*" -delete 2>/dev/null || true
find . -name ".gitignore" -delete 2>/dev/null || true
echo "  ✓ Removed config files"

# Remove TypeScript source files from utils
find ./utils -name "*.ts" -delete 2>/dev/null || true
echo "  ✓ Removed TypeScript source files"

# Remove test files
find . -name "*.test.js" -delete 2>/dev/null || true
find . -name "*.test.ts" -delete 2>/dev/null || true
find . -name "*.spec.js" -delete 2>/dev/null || true
find . -name "*.spec.ts" -delete 2>/dev/null || true
echo "  ✓ Removed test files"

cd ..

echo "✓ Distribution cleaned"
echo ""

# Step 6: Calculate size
echo "📊 Distribution size:"
DIST_SIZE=$(du -sh $DIST_DIR | cut -f1)
echo "  $DIST_SIZE"
echo ""

# Step 7: Create ZIP package
echo "📦 Creating ZIP package..."
rm -f $ZIP_NAME
cd $DIST_DIR
zip -r ../$ZIP_NAME . -q
cd ..
ZIP_SIZE=$(ls -lh $ZIP_NAME | awk '{print $5}')
echo "✓ ZIP created: $ZIP_NAME ($ZIP_SIZE)"
echo ""

# Step 8: Create CRX package
echo "🔐 Creating CRX package..."

# Check if PEM key exists
if [ -f "$PEM_NAME" ]; then
    echo "  ℹ️  Using existing private key: $PEM_NAME"
else
    echo "  ℹ️  No private key found. Chrome will generate one."
    echo "  ⚠️  IMPORTANT: Save the generated .pem file for future updates!"
fi

# Check if Chrome is available
CHROME_PATH=""
if command -v google-chrome &> /dev/null; then
    CHROME_PATH="google-chrome"
elif command -v chrome &> /dev/null; then
    CHROME_PATH="chrome"
elif [ -f "/c/Program Files/Google/Chrome/Application/chrome.exe" ]; then
    CHROME_PATH="/c/Program Files/Google/Chrome/Application/chrome.exe"
elif [ -f "/c/Program Files (x86)/Google/Chrome/Application/chrome.exe" ]; then
    CHROME_PATH="/c/Program Files (x86)/Google/Chrome/Application/chrome.exe"
fi

if [ -z "$CHROME_PATH" ]; then
    echo "  ⚠️  Chrome not found. Skipping CRX generation."
    echo "  ℹ️  To create CRX manually:"
    echo "     1. Open Chrome → chrome://extensions/"
    echo "     2. Enable Developer mode"
    echo "     3. Click 'Pack extension'"
    echo "     4. Select: $DIST_DIR"
    if [ -f "$PEM_NAME" ]; then
        echo "     5. Private key: $PEM_NAME"
    fi
else
    echo "  ℹ️  Found Chrome at: $CHROME_PATH"

    # Pack extension using Chrome
    if [ -f "$PEM_NAME" ]; then
        "$CHROME_PATH" --pack-extension="$DIST_DIR" --pack-extension-key="$PEM_NAME" 2>/dev/null || true
    else
        "$CHROME_PATH" --pack-extension="$DIST_DIR" 2>/dev/null || true
    fi

    # Check if CRX was created
    if [ -f "${DIST_DIR}.crx" ]; then
        mv "${DIST_DIR}.crx" "$CRX_NAME"
        CRX_SIZE=$(ls -lh $CRX_NAME | awk '{print $5}')
        echo "  ✓ CRX created: $CRX_NAME ($CRX_SIZE)"

        # Check if PEM was created
        if [ -f "${DIST_DIR}.pem" ] && [ ! -f "$PEM_NAME" ]; then
            mv "${DIST_DIR}.pem" "$PEM_NAME"
            echo "  ✓ Private key saved: $PEM_NAME"
            echo "  ⚠️  KEEP THIS KEY SAFE! You need it for updates."
        fi
    else
        echo "  ⚠️  CRX generation failed. Use manual method above."
    fi
fi

echo ""

# Step 9: Summary
echo "=========================================="
echo "✅ Build Complete!"
echo "=========================================="
echo ""
echo "📦 Packages created:"
echo "  • $ZIP_NAME ($ZIP_SIZE) - For Chrome Web Store"
if [ -f "$CRX_NAME" ]; then
    echo "  • $CRX_NAME ($CRX_SIZE) - For direct installation"
fi
echo ""
echo "📁 Distribution folder: $DIST_DIR/"
echo "   (Load unpacked in Chrome for testing)"
echo ""

if [ -f "$PEM_NAME" ]; then
    echo "🔑 Private key: $PEM_NAME"
    echo "   ⚠️  IMPORTANT: Keep this file safe and private!"
    echo "   This key is required to publish updates."
    echo ""
fi

echo "📝 Next steps:"
echo "  1. Test the extension:"
echo "     - Load $DIST_DIR as unpacked extension"
echo "     - Test all features thoroughly"
echo ""
echo "  2. For Chrome Web Store:"
echo "     - Upload $ZIP_NAME to Chrome Developer Dashboard"
echo "     - Fill out store listing"
echo "     - Submit for review"
echo ""
if [ -f "$CRX_NAME" ]; then
    echo "  3. For direct distribution:"
    echo "     - Share $CRX_NAME with users"
    echo "     - Users drag-drop into chrome://extensions/"
    echo "     - Or host on your website"
    echo ""
fi
echo "=========================================="
