# Building Better Tabs AI for Distribution

This document explains how to build and package Better Tabs AI for distribution.

## Quick Start

### Windows:
```cmd
build-distribution.cmd
```

### Linux/Mac/Git Bash:
```bash
bash build-distribution.sh
```

## What Gets Built

The build process creates:
- **`better-tabs-ai-v{version}.zip`** - For Chrome Web Store submission
- **`better-tabs-ai-v{version}.crx`** - For direct installation (if Chrome is found)
- **`dist-extension/`** - Unpacked extension directory for testing

## Build Process

### 1. Automated Build (Recommended)

Run the build script appropriate for your OS:

**Windows:**
```cmd
build-distribution.cmd
```

**Linux/Mac/Git Bash:**
```bash
bash build-distribution.sh
```

### 2. Manual Build Steps

If you need to build manually:

```bash
# Step 1: Build all components
npm run build

# Step 2: Create distribution structure
mkdir -p dist-extension
cp manifest.json dist-extension/
cp -r icons/ dist-extension/icons/
cp -r background/ dist-extension/background/
cp -r content-scripts/ dist-extension/content-scripts/
cp -r utils/ dist-extension/utils/

# Copy built React apps
cp -r full-interface/dist/ dist-extension/full-interface/dist/
cp full-interface/full-interface.html dist-extension/full-interface/
cp -r full-interface/styles/ dist-extension/full-interface/styles/
cp -r popup-react/dist/ dist-extension/popup-react/dist/
cp -r options-ts/dist/ dist-extension/options-ts/dist/

# Step 3: Clean development files
cd dist-extension
find . -name "src" -type d -exec rm -rf {} +
find . -name "node_modules" -type d -exec rm -rf {} +
find . -name "*.ts" -delete
find . -name "package.json" -delete
find . -name "tsconfig.json" -delete
cd ..

# Step 4: Create ZIP
cd dist-extension && zip -r ../better-tabs-ai-v2.3.0.zip . && cd ..
```

## What's Included in Distribution

### Included:
- ✅ `manifest.json` - Extension manifest
- ✅ `icons/` - Extension icons
- ✅ `background/service-worker.js` - Background service worker
- ✅ `content-scripts/` - Content scripts
- ✅ `utils/` - Compiled utilities (`.js` files only)
- ✅ `full-interface/dist/` - Built React full interface
- ✅ `popup-react/dist/` - Built React popup
- ✅ `options-ts/dist/` - Built options page

### Excluded (Development only):
- ❌ `node_modules/` - Dependencies (bundled into dist/)
- ❌ `src/` - Source files (compiled into dist/)
- ❌ `.ts` files - TypeScript source (compiled to `.js`)
- ❌ `package.json` - Build configuration
- ❌ `tsconfig.json` - TypeScript config
- ❌ `vite.config.*` - Build tool config
- ❌ `tests/` - Test files
- ❌ `.git/` - Git repository
- ❌ `.claude/` - AI context files

## Creating CRX Package

### Automated (Script handles this)

The build script automatically creates a CRX if Chrome is found.

### Manual CRX Creation

If the script fails to create a CRX:

1. Open Chrome → `chrome://extensions/`
2. Enable **Developer mode** (toggle in top right)
3. Click **Pack extension** button
4. Extension root directory: Select `dist-extension` folder
5. Private key file:
   - First time: Leave blank (Chrome will generate `better-tabs-ai.pem`)
   - Updates: Select existing `better-tabs-ai.pem`
6. Click **Pack Extension**

**IMPORTANT:** Save the `.pem` file! You need it to publish updates.

## Distribution Methods

### Method 1: Chrome Web Store (Recommended for Public)

1. Create Chrome Web Store developer account ($5 one-time fee)
2. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
3. Click **New Item**
4. Upload `better-tabs-ai-v{version}.zip`
5. Fill out store listing:
   - Description
   - Screenshots
   - Category
   - Privacy policy (if applicable)
6. Submit for review (typically 1-3 days)

**Advantages:**
- Automatic updates for users
- Better security/trust
- Easier installation (one click)

### Method 2: Direct CRX Distribution

Share the `.crx` file directly with users.

**Installation for users:**
1. Download `better-tabs-ai-v{version}.crx`
2. Open Chrome → `chrome://extensions/`
3. Enable **Developer mode**
4. Drag and drop the `.crx` file onto the page

**Advantages:**
- No review process
- Immediate distribution
- Full control

**Disadvantages:**
- Manual updates required
- Security warnings in Chrome
- Users must enable Developer mode

### Method 3: Load Unpacked (Testing)

Share the `dist-extension` folder.

**Installation for users:**
1. Extract/download `dist-extension` folder
2. Open Chrome → `chrome://extensions/`
3. Enable **Developer mode**
4. Click **Load unpacked**
5. Select the `dist-extension` folder

**Advantages:**
- Easy for testing
- Can modify files directly

**Disadvantages:**
- Developer mode required
- Not suitable for non-technical users
- No automatic updates

## Testing Before Distribution

**Critical tests before sharing:**

1. **Load unpacked test:**
   ```
   chrome://extensions/ → Load unpacked → dist-extension/
   ```

2. **Feature checklist:**
   - [ ] Popup opens and displays correctly
   - [ ] Full interface loads (`chrome-extension://YOUR_ID/full-interface/full-interface.html`)
   - [ ] Options page works
   - [ ] AI analysis functions (if Gemini Nano available)
   - [ ] Tab grouping works
   - [ ] Drag and drop works
   - [ ] Save/load state works
   - [ ] No console errors

3. **Clean install test:**
   - Remove extension
   - Install from CRX or ZIP
   - Verify all features work

4. **Size check:**
   ```bash
   # Distribution should be 2-5MB
   ls -lh better-tabs-ai-v*.zip
   ls -lh better-tabs-ai-v*.crx
   ```

## Version Updates

When releasing a new version:

1. Update version in `manifest.json` and `package.json`
2. Run build script (automatically picks up new version)
3. Use the **same** `.pem` file for CRX signing
4. Upload new ZIP to Chrome Web Store (if published there)

**NEVER lose the `.pem` file!** You cannot update a CRX without it.

## Troubleshooting

### Build fails at `npm run build`

**Solution:** Check that all sub-projects build individually:
```bash
npm run build:shared    # Should compile TypeScript
npm run build:full      # Should build React app
npm run build:popup     # Should build popup
npm run build:options   # Should build options
```

### CRX creation fails

**Solutions:**
1. Use manual CRX creation method above
2. Ensure Chrome is installed and in PATH
3. Check that `dist-extension/` folder exists

### Extension doesn't load

**Common issues:**
1. Missing `dist/` folders - Run `npm run build` first
2. Syntax errors - Check browser console
3. Manifest errors - Validate `manifest.json`

### "This extension may have been corrupted"

**Solution:** Rebuild CRX with the correct `.pem` file:
```bash
chrome --pack-extension=dist-extension --pack-extension-key=better-tabs-ai.pem
```

## File Structure After Build

```
better-tabs-ai/
├── better-tabs-ai-v2.3.0.zip      ← For Chrome Web Store
├── better-tabs-ai-v2.3.0.crx      ← For direct installation
├── better-tabs-ai.pem             ← Private key (KEEP SAFE!)
└── dist-extension/                ← Unpacked extension
    ├── manifest.json
    ├── icons/
    ├── background/
    ├── content-scripts/
    ├── utils/
    ├── full-interface/
    │   └── dist/
    ├── popup-react/
    │   └── dist/
    └── options-ts/
        └── dist/
```

## Security Notes

### Private Key (.pem file)

- **DO NOT commit to Git**
- **DO NOT share publicly**
- **BACKUP securely** (you need it for updates)
- **KEEP OFFLINE COPY** (USB drive, password manager, etc.)

Without this key, you cannot:
- Update existing CRX installations
- Maintain same extension ID
- Keep user data across updates

### Distribution Best Practices

1. **Always test thoroughly** before distribution
2. **Use HTTPS** for hosting CRX files
3. **Verify file integrity** (provide SHA256 hash)
4. **Update regularly** for security patches
5. **Monitor user feedback** for issues

## Additional Resources

- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [Chrome Web Store Policies](https://developer.chrome.com/docs/webstore/program-policies/)
- [Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/mv3/intro/)

## Support

For build issues, check:
1. Node.js version: `node --version` (should be 16+)
2. npm version: `npm --version`
3. TypeScript compiles: `npm run typecheck`
4. Individual builds work: `npm run build:shared`, etc.
