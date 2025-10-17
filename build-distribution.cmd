@echo off
REM build-distribution.cmd
REM Automated distribution build for Better Tabs AI (Windows)
REM Creates both ZIP and CRX packages for distribution

setlocal enabledelayedexpansion

REM Configuration
for /f "tokens=2 delims=:, " %%a in ('findstr /r "\"version\"" manifest.json') do (
    set VERSION=%%~a
    goto :version_found
)
:version_found

set DIST_DIR=dist-extension
set ZIP_NAME=better-tabs-ai-v%VERSION%.zip
set CRX_NAME=better-tabs-ai-v%VERSION%.crx
set PEM_NAME=better-tabs-ai.pem

echo ==========================================
echo Better Tabs AI - Distribution Build
echo Version: %VERSION%
echo ==========================================
echo.

REM Step 1: Clean previous builds
echo Cleaning previous builds...
if exist %DIST_DIR% rmdir /s /q %DIST_DIR%
if exist %ZIP_NAME% del /q %ZIP_NAME%
if exist %CRX_NAME% del /q %CRX_NAME%
echo Done
echo.

REM Step 2: Build all components
echo Building all components...
call npm run build
if errorlevel 1 (
    echo Build failed!
    exit /b 1
)
echo Build completed
echo.

REM Step 3: Create distribution directory
echo Creating distribution directory...
mkdir %DIST_DIR%
echo Done
echo.

REM Step 4: Copy essential files
echo Copying files to distribution...

copy manifest.json %DIST_DIR%\ > nul
echo   - manifest.json

xcopy /E /I /Q icons %DIST_DIR%\icons > nul
echo   - icons\

xcopy /E /I /Q background %DIST_DIR%\background > nul
echo   - background\

xcopy /E /I /Q content-scripts %DIST_DIR%\content-scripts > nul
echo   - content-scripts\

xcopy /E /I /Q utils %DIST_DIR%\utils > nul
echo   - utils\

mkdir %DIST_DIR%\full-interface
xcopy /E /I /Q full-interface\dist %DIST_DIR%\full-interface\dist > nul
copy full-interface\full-interface.html %DIST_DIR%\full-interface\ > nul
xcopy /E /I /Q full-interface\styles %DIST_DIR%\full-interface\styles > nul
xcopy /E /I /Q full-interface\components %DIST_DIR%\full-interface\components > nul
xcopy /E /I /Q full-interface\lib %DIST_DIR%\full-interface\lib > nul
echo   - full-interface\

mkdir %DIST_DIR%\popup-react
xcopy /E /I /Q popup-react\dist %DIST_DIR%\popup-react\dist > nul
echo   - popup-react\

mkdir %DIST_DIR%\options-ts
xcopy /E /I /Q options-ts\dist %DIST_DIR%\options-ts\dist > nul
echo   - options-ts\

echo All files copied
echo.

REM Step 5: Clean development files
echo Removing development files from distribution...

cd %DIST_DIR%

REM Remove source directories
for /d /r %%d in (src) do @if exist "%%d" rmdir /s /q "%%d" 2>nul
echo   - Removed src\ directories

REM Remove node_modules
for /d /r %%d in (node_modules) do @if exist "%%d" rmdir /s /q "%%d" 2>nul
echo   - Removed node_modules\

REM Remove package files
del /s /q package.json 2>nul
del /s /q package-lock.json 2>nul
echo   - Removed package files

REM Remove config files
del /s /q tsconfig.json 2>nul
del /s /q vite.config.* 2>nul
del /s /q .gitignore 2>nul
echo   - Removed config files

REM Remove TypeScript source files
del /s /q utils\*.ts 2>nul
echo   - Removed TypeScript source files

REM Remove test files
del /s /q *.test.js 2>nul
del /s /q *.test.ts 2>nul
del /s /q *.spec.js 2>nul
del /s /q *.spec.ts 2>nul
echo   - Removed test files

cd ..

echo Distribution cleaned
echo.

REM Step 6: Create ZIP package
echo Creating ZIP package...
powershell -command "Compress-Archive -Path '%DIST_DIR%\*' -DestinationPath '%ZIP_NAME%' -Force"
if exist %ZIP_NAME% (
    for %%A in (%ZIP_NAME%) do set ZIP_SIZE=%%~zA
    echo ZIP created: %ZIP_NAME% (!ZIP_SIZE! bytes)
) else (
    echo Failed to create ZIP
)
echo.

REM Step 7: Create CRX package
echo Creating CRX package...

REM Check if PEM key exists
if exist %PEM_NAME% (
    echo   Using existing private key: %PEM_NAME%
) else (
    echo   No private key found. Chrome will generate one.
    echo   IMPORTANT: Save the generated .pem file for future updates!
)

REM Find Chrome
set CHROME_PATH=
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    set CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe
) else if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    set CHROME_PATH=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe
)

if not defined CHROME_PATH (
    echo   Chrome not found. Skipping CRX generation.
    echo   To create CRX manually:
    echo     1. Open Chrome -^> chrome://extensions/
    echo     2. Enable Developer mode
    echo     3. Click 'Pack extension'
    echo     4. Select: %DIST_DIR%
    if exist %PEM_NAME% echo     5. Private key: %PEM_NAME%
) else (
    echo   Found Chrome at: %CHROME_PATH%

    REM Pack extension using Chrome
    if exist %PEM_NAME% (
        "%CHROME_PATH%" --pack-extension="%CD%\%DIST_DIR%" --pack-extension-key="%CD%\%PEM_NAME%" 2>nul
    ) else (
        "%CHROME_PATH%" --pack-extension="%CD%\%DIST_DIR%" 2>nul
    )

    REM Check if CRX was created
    if exist "%DIST_DIR%.crx" (
        move "%DIST_DIR%.crx" "%CRX_NAME%" > nul
        for %%A in (%CRX_NAME%) do set CRX_SIZE=%%~zA
        echo   CRX created: %CRX_NAME% (!CRX_SIZE! bytes)

        REM Check if PEM was created
        if exist "%DIST_DIR%.pem" (
            if not exist %PEM_NAME% (
                move "%DIST_DIR%.pem" "%PEM_NAME%" > nul
                echo   Private key saved: %PEM_NAME%
                echo   KEEP THIS KEY SAFE! You need it for updates.
            )
        )
    ) else (
        echo   CRX generation failed. Use manual method above.
    )
)

echo.

REM Step 8: Summary
echo ==========================================
echo Build Complete!
echo ==========================================
echo.
echo Packages created:
if exist %ZIP_NAME% echo   * %ZIP_NAME% - For Chrome Web Store
if exist %CRX_NAME% echo   * %CRX_NAME% - For direct installation
echo.
echo Distribution folder: %DIST_DIR%\
echo    (Load unpacked in Chrome for testing)
echo.

if exist %PEM_NAME% (
    echo Private key: %PEM_NAME%
    echo    IMPORTANT: Keep this file safe and private!
    echo    This key is required to publish updates.
    echo.
)

echo Next steps:
echo   1. Test the extension:
echo      - Load %DIST_DIR% as unpacked extension
echo      - Test all features thoroughly
echo.
echo   2. For Chrome Web Store:
echo      - Upload %ZIP_NAME% to Chrome Developer Dashboard
echo      - Fill out store listing
echo      - Submit for review
echo.
if exist %CRX_NAME% (
    echo   3. For direct distribution:
    echo      - Share %CRX_NAME% with users
    echo      - Users drag-drop into chrome://extensions/
    echo      - Or host on your website
    echo.
)
echo ==========================================

endlocal
