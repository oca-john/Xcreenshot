#!/usr/bin/env node
/**
 * Xcreenshot Cross-Platform Release Script
 * 
 * Detects the current OS and runs the appropriate build script:
 * - Windows: Creates NSIS installer and portable exe (both with version)
 * - Linux: Creates deb, rpm, and tar.gz (with deployment scripts)
 * 
 * Usage: node scripts/release.js
 *        npm run release:auto
 */

const { execSync } = require('child_process');
const os = require('os');
const path = require('path');

const platform = os.platform();

console.log(`\n🚀 Xcreenshot Release Builder`);
console.log(`   Platform: ${platform}`);
console.log(`   Node: ${process.version}\n`);

try {
    if (platform === 'win32') {
        console.log('📦 Building for Windows...\n');
        execSync('powershell -ExecutionPolicy Bypass -File scripts/build-windows.ps1', {
            stdio: 'inherit',
            cwd: path.resolve(__dirname, '..')
        });
    } else if (platform === 'linux') {
        console.log('📦 Building for Linux...\n');
        execSync('bash scripts/build-linux.sh', {
            stdio: 'inherit',
            cwd: path.resolve(__dirname, '..')
        });
    } else if (platform === 'darwin') {
        console.log('📦 Building for macOS...\n');
        console.log('Note: macOS build not yet configured. Running default tauri build.');
        execSync('npm run tauri build', {
            stdio: 'inherit',
            cwd: path.resolve(__dirname, '..')
        });
    } else {
        console.error(`❌ Unsupported platform: ${platform}`);
        process.exit(1);
    }
    
    console.log('\n✅ Release build completed successfully!');
} catch (error) {
    console.error('\n❌ Release build failed:', error.message);
    process.exit(1);
}
