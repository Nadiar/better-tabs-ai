@echo off
REM Launch Chrome with Better Tabs AI extension and AI features enabled

echo.
echo ==================================================
echo  Better Tabs AI - Chrome Launcher with AI Support
echo ==================================================
echo.

set EXTENSION_PATH=%~dp0..
set PROFILE_PATH=%~dp0..\chrome-ai-profile

echo Extension path: %EXTENSION_PATH%
echo Profile path: %PROFILE_PATH%
echo.
echo Enabling Chrome AI features:
echo   - PromptAPIForGeminiNano
echo   - SummarizationAPI
echo.

REM Launch Chrome with extension and AI flags
start chrome.exe ^
  --enable-features=PromptAPIForGeminiNano,SummarizationAPI ^
  --disable-extensions-except="%EXTENSION_PATH%" ^
  --load-extension="%EXTENSION_PATH%" ^
  --user-data-dir="%PROFILE_PATH%" ^
  chrome://on-device-internals

echo.
echo Chrome launched!
echo.
echo INSTRUCTIONS:
echo 1. Chrome opened to chrome://on-device-internals
echo 2. Download Gemini Nano model (~22GB)
echo 3. Once ready, test the extension with some tabs
echo.
echo Profile saved to: chrome-ai-profile\
echo Extension auto-loaded!
echo.
pause
