#!/usr/bin/env python3
"""
Better Tabs AI - Setup Checker
Verifies that all required files are present and ready for Chrome extension installation
"""

import os
import json
import sys

def check_file_exists(filepath, description):
    """Check if a file exists and print status"""
    if os.path.exists(filepath):
        print(f"✅ {description}: {filepath}")
        return True
    else:
        print(f"❌ {description}: {filepath} (MISSING)")
        return False

def check_manifest():
    """Check manifest.json validity"""
    try:
        with open('manifest.json', 'r') as f:
            manifest = json.load(f)
        
        print("✅ manifest.json is valid JSON")
        
        # Check required fields
        required_fields = ['manifest_version', 'name', 'version', 'action', 'background', 'permissions']
        missing_fields = []
        
        for field in required_fields:
            if field not in manifest:
                missing_fields.append(field)
        
        if missing_fields:
            print(f"❌ Missing required manifest fields: {', '.join(missing_fields)}")
            return False
        else:
            print("✅ All required manifest fields present")
            return True
            
    except json.JSONDecodeError as e:
        print(f"❌ manifest.json is invalid JSON: {e}")
        return False
    except FileNotFoundError:
        print("❌ manifest.json not found")
        return False

def main():
    print("🤖 Better Tabs AI - Setup Checker")
    print("=" * 50)
    
    all_good = True
    
    # Check manifest
    print("\n📋 Checking manifest.json...")
    all_good &= check_manifest()
    
    # Check required files
    print("\n📁 Checking required files...")
    required_files = [
        ('background/service-worker.js', 'Service Worker'),
        ('popup/popup.html', 'Popup HTML'),
        ('popup/popup.css', 'Popup CSS'),
        ('popup/popup.js', 'Popup JavaScript'),
        ('content-scripts/content-script.js', 'Content Script'),
    ]
    
    for filepath, description in required_files:
        all_good &= check_file_exists(filepath, description)
    
    # Check icons
    print("\n🎨 Checking extension icons...")
    icon_files = [
        ('icons/icon16.png', '16x16 Icon'),
        ('icons/icon32.png', '32x32 Icon'),
        ('icons/icon48.png', '48x48 Icon'),
        ('icons/icon128.png', '128x128 Icon'),
    ]
    
    for filepath, description in icon_files:
        all_good &= check_file_exists(filepath, description)
    
    # Check file sizes (basic validation)
    print("\n📊 Checking file sizes...")
    for filepath, _ in icon_files:
        if os.path.exists(filepath):
            size = os.path.getsize(filepath)
            if size > 0:
                print(f"✅ {filepath}: {size} bytes")
            else:
                print(f"❌ {filepath}: 0 bytes (empty file)")
                all_good = False
    
    # Summary
    print("\n" + "=" * 50)
    if all_good:
        print("🎉 SUCCESS: All files are present and ready!")
        print("\n📋 Next steps:")
        print("1. Go to chrome://extensions")
        print("2. Enable 'Developer mode'")
        print("3. Click 'Load unpacked'")
        print("4. Select this folder")
        print("\n🚀 Your extension should load successfully!")
        return 0
    else:
        print("❌ ERRORS FOUND: Some files are missing or invalid")
        print("\n🔧 Please fix the issues above before loading the extension")
        return 1

if __name__ == "__main__":
    sys.exit(main())