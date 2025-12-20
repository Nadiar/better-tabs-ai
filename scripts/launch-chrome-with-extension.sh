#!/bin/bash
# Launch Chrome with Better Tabs AI extension and AI features enabled

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXTENSION_PATH="$SCRIPT_DIR/.."
PROFILE_PATH="$SCRIPT_DIR/../chrome-ai-profile"

echo ""
echo "=================================================="
echo " Better Tabs AI - Chrome Launcher with AI Support"
echo "=================================================="
echo ""

echo "Extension path: $EXTENSION_PATH"
echo "Profile path: $PROFILE_PATH"
echo ""
echo "Enabling Chrome AI features:"
echo "  - PromptAPIForGeminiNano"
echo "  - SummarizationAPI"
echo ""

# Try to find Chrome
if command -v google-chrome &> /dev/null; then
    CHROME_BIN="google-chrome"
elif command -v chromium &> /dev/null; then
    CHROME_BIN="chromium"
elif command -v chromium-browser &> /dev/null; then
    CHROME_BIN="chromium-browser"
elif [ -f "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" ]; then
    CHROME_BIN="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
else
    echo "❌ Chrome not found!"
    echo "Please install Chrome or edit this script to point to your Chrome installation."
    exit 1
fi

echo "Using: $CHROME_BIN"
echo ""

# Launch Chrome
"$CHROME_BIN" \
  --enable-features=PromptAPIForGeminiNano,SummarizationAPI \
  --disable-extensions-except="$EXTENSION_PATH" \
  --load-extension="$EXTENSION_PATH" \
  --user-data-dir="$PROFILE_PATH" \
  chrome://on-device-internals &

echo ""
echo "✅ Chrome launched!"
echo ""
echo "INSTRUCTIONS:"
echo "1. Chrome opened to chrome://on-device-internals"
echo "2. Download Gemini Nano model (~22GB)"
echo "3. Once ready, test the extension with some tabs"
echo ""
echo "Profile saved to: chrome-ai-profile/"
echo "Extension auto-loaded!"
echo ""
