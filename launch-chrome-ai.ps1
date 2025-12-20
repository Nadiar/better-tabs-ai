# Launch Chrome with Better Tabs AI Extension and AI Features
# PowerShell script for Windows

$ExtensionPath = $PSScriptRoot
$ProfilePath = Join-Path $PSScriptRoot "chrome-ai-profile"

# Find Chrome executable
$ChromePaths = @(
    "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "${env:LOCALAPPDATA}\Google\Chrome\Application\chrome.exe"
)

$ChromePath = $null
foreach ($path in $ChromePaths) {
    if (Test-Path $path) {
        $ChromePath = $path
        break
    }
}

if (-not $ChromePath) {
    Write-Host "ERROR: Chrome not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Chrome or update the script with your Chrome path."
    Write-Host ""
    pause
    exit 1
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " Better Tabs AI - Chrome Launcher with AI Support" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Extension path: $ExtensionPath" -ForegroundColor Yellow
Write-Host "Profile path: $ProfilePath" -ForegroundColor Yellow
Write-Host "Chrome path: $ChromePath" -ForegroundColor Yellow
Write-Host ""
Write-Host "Enabling Chrome AI features:" -ForegroundColor Green
Write-Host "  - PromptAPIForGeminiNano" -ForegroundColor Green
Write-Host "  - SummarizationAPI" -ForegroundColor Green
Write-Host ""

# Create profile directory if it doesn't exist
if (-not (Test-Path $ProfilePath)) {
    New-Item -ItemType Directory -Path $ProfilePath -Force | Out-Null
}

# Launch Chrome with AI features and extension
$arguments = @(
    "--enable-features=PromptAPIForGeminiNano,SummarizationAPI",
    "--disable-extensions-except=`"$ExtensionPath`"",
    "--load-extension=`"$ExtensionPath`"",
    "--user-data-dir=`"$ProfilePath`"",
    "chrome://extensions"
)

Start-Process -FilePath $ChromePath -ArgumentList $arguments

Write-Host "Chrome launched!" -ForegroundColor Green
Write-Host ""
Write-Host "NEXT STEPS:" -ForegroundColor Cyan
Write-Host "1. Check that 'Better Tabs AI' appears at chrome://extensions" -ForegroundColor White
Write-Host "2. If you see errors, make sure you ran 'npm run build' first" -ForegroundColor White
Write-Host "3. Enable the extension if it's disabled (toggle switch)" -ForegroundColor White
Write-Host "4. Navigate to chrome://on-device-internals to download Gemini Nano" -ForegroundColor White
Write-Host "5. Once downloaded, test with some tabs!" -ForegroundColor White
Write-Host ""
Write-Host "Profile saved to: $ProfilePath" -ForegroundColor Yellow
Write-Host "Extension auto-loaded from: $ExtensionPath" -ForegroundColor Yellow
Write-Host ""
