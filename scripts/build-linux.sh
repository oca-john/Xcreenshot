#!/bin/bash
# Xcreenshot Linux Build Script
# Builds deb, rpm, and tar.gz packages with deployment scripts

set -e

# Get version from package.json
VERSION=$(node -p "require('./package.json').version")
APP_NAME="Xcreenshot"
APP_NAME_LOWER="xcreenshot"

echo -e "\033[36mBuilding $APP_NAME v$VERSION for Linux...\033[0m"

# Sync version
echo -e "\033[33mSyncing version...\033[0m"
node scripts/sync-version.js

# Build the application
echo -e "\033[33mBuilding Tauri application...\033[0m"
npm run tauri build

# Define paths
RELEASE_DIR="src-tauri/target/release"
BUNDLE_DIR="src-tauri/target/release/bundle"
OUTPUT_DIR="release/linux"
ICONS_DIR="src-tauri/icons"

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Clean previous builds in output directory
rm -f "$OUTPUT_DIR"/*

# Copy deb package
if [ -d "$BUNDLE_DIR/deb" ]; then
    for deb_file in "$BUNDLE_DIR/deb"/*.deb; do
        if [ -f "$deb_file" ]; then
            new_name="${APP_NAME_LOWER}_${VERSION}_amd64.deb"
            cp "$deb_file" "$OUTPUT_DIR/$new_name"
            echo -e "\033[32mCreated: $OUTPUT_DIR/$new_name\033[0m"
        fi
    done
fi

# Copy rpm package
if [ -d "$BUNDLE_DIR/rpm" ]; then
    for rpm_file in "$BUNDLE_DIR/rpm"/*.rpm; do
        if [ -f "$rpm_file" ]; then
            new_name="${APP_NAME_LOWER}-${VERSION}-1.x86_64.rpm"
            cp "$rpm_file" "$OUTPUT_DIR/$new_name"
            echo -e "\033[32mCreated: $OUTPUT_DIR/$new_name\033[0m"
        fi
    done
fi

# Create tar.gz portable package with deployment scripts
echo -e "\033[33mCreating portable tar.gz package...\033[0m"

TAR_DIR="${APP_NAME_LOWER}-${VERSION}-linux-x64"
TEMP_TAR_DIR="/tmp/$TAR_DIR"

# Clean and create temp directory
rm -rf "$TEMP_TAR_DIR"
mkdir -p "$TEMP_TAR_DIR"
mkdir -p "$TEMP_TAR_DIR/icons"

# Copy binary
if [ -f "$RELEASE_DIR/$APP_NAME" ]; then
    cp "$RELEASE_DIR/$APP_NAME" "$TEMP_TAR_DIR/$APP_NAME_LOWER"
    chmod +x "$TEMP_TAR_DIR/$APP_NAME_LOWER"
elif [ -f "$RELEASE_DIR/$APP_NAME_LOWER" ]; then
    cp "$RELEASE_DIR/$APP_NAME_LOWER" "$TEMP_TAR_DIR/$APP_NAME_LOWER"
    chmod +x "$TEMP_TAR_DIR/$APP_NAME_LOWER"
fi

# Copy icons
if [ -f "$ICONS_DIR/128x128.png" ]; then
    cp "$ICONS_DIR/128x128.png" "$TEMP_TAR_DIR/icons/"
fi
if [ -f "$ICONS_DIR/32x32.png" ]; then
    cp "$ICONS_DIR/32x32.png" "$TEMP_TAR_DIR/icons/"
fi

# Copy deployment scripts
cp "src-tauri/resources/linux/install.sh" "$TEMP_TAR_DIR/"
cp "src-tauri/resources/linux/uninstall.sh" "$TEMP_TAR_DIR/"
chmod +x "$TEMP_TAR_DIR/install.sh"
chmod +x "$TEMP_TAR_DIR/uninstall.sh"

# Create README for portable version
cat > "$TEMP_TAR_DIR/README.txt" << EOF
Xcreenshot v$VERSION - Portable Linux Version
=============================================

Cross-platform screenshot tool with annotation support.

Installation (User-level):
--------------------------
Run: ./install.sh

This will:
- Copy the binary to ~/bin/
- Create desktop entry in ~/.local/share/applications/
- Install icons to ~/.local/share/icons/

Uninstallation:
---------------
Run: ./uninstall.sh

Manual Run:
-----------
You can also run the application directly:
./xcreenshot

Requirements:
- libwebkit2gtk-4.1 (or webkit2gtk4.1 on Fedora)
- libappindicator3-1 (or libappindicator-gtk3 on Fedora)
EOF

# Create tar.gz
cd /tmp
tar -czvf "${APP_NAME_LOWER}-${VERSION}-linux-x64.tar.gz" "$TAR_DIR"
mv "${APP_NAME_LOWER}-${VERSION}-linux-x64.tar.gz" "$OLDPWD/$OUTPUT_DIR/"
cd "$OLDPWD"

echo -e "\033[32mCreated: $OUTPUT_DIR/${APP_NAME_LOWER}-${VERSION}-linux-x64.tar.gz\033[0m"

# Cleanup
rm -rf "$TEMP_TAR_DIR"

echo ""
echo -e "\033[32mLinux build completed!\033[0m"
echo -e "\033[36mOutput files in: $OUTPUT_DIR\033[0m"

# List created files
echo ""
echo -e "\033[33mCreated packages:\033[0m"
ls -la "$OUTPUT_DIR"
