# Xcreenshot Windows Build Script
# Builds NSIS installer and portable exe with version numbers

$ErrorActionPreference = "Stop"

# Get version from package.json
$packageJson = Get-Content -Raw -Path "package.json" | ConvertFrom-Json
$version = $packageJson.version
$appName = "Xcreenshot"

Write-Host "Building $appName v$version for Windows..." -ForegroundColor Cyan

# Sync version
Write-Host "Syncing version..." -ForegroundColor Yellow
node scripts/sync-version.js

# Build the application
Write-Host "Building Tauri application..." -ForegroundColor Yellow
npm run tauri build

# Define paths
$releaseDir = "src-tauri\target\release"
$bundleDir = "src-tauri\target\release\bundle"
$outputDir = "release\windows"

# Create output directory
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

# Clean previous builds in output directory
Remove-Item "$outputDir\*" -Force -ErrorAction SilentlyContinue

# Copy NSIS installer with version
$nsisDir = "$bundleDir\nsis"
if (Test-Path $nsisDir) {
    $nsisFiles = Get-ChildItem -Path $nsisDir -Filter "*.exe"
    foreach ($file in $nsisFiles) {
        $newName = "${appName}_${version}_setup.exe"
        Copy-Item $file.FullName "$outputDir\$newName"
        Write-Host "Created: $outputDir\$newName" -ForegroundColor Green
    }
}

# Create portable version (copy exe with version)
$exePath = "$releaseDir\$appName.exe"
if (Test-Path $exePath) {
    $portableName = "${appName}_${version}_portable.exe"
    Copy-Item $exePath "$outputDir\$portableName"
    Write-Host "Created: $outputDir\$portableName" -ForegroundColor Green
}

Write-Host ""
Write-Host "Windows build completed!" -ForegroundColor Green
Write-Host "Output files in: $outputDir" -ForegroundColor Cyan

# List created files
Write-Host ""
Write-Host "Created packages:" -ForegroundColor Yellow
Get-ChildItem $outputDir | ForEach-Object { Write-Host "  - $($_.Name)" }
