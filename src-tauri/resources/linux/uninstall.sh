#!/bin/bash
# Xcreenshot Linux Uninstallation Script
# Usage: ./uninstall.sh

set -e

APP_NAME="xcreenshot"
USER_BIN_DIR="$HOME/bin"
USER_APPS_DIR="$HOME/.local/share/applications"
USER_ICONS_DIR="$HOME/.local/share/icons/hicolor"
USER_CONFIG_DIR="$HOME/.config"

echo "Uninstalling Xcreenshot..."

# Remove binary
if [ -f "$USER_BIN_DIR/$APP_NAME" ]; then
    rm -f "$USER_BIN_DIR/$APP_NAME"
    echo "Removed binary: $USER_BIN_DIR/$APP_NAME"
fi

# Remove desktop entry
if [ -f "$USER_APPS_DIR/$APP_NAME.desktop" ]; then
    rm -f "$USER_APPS_DIR/$APP_NAME.desktop"
    echo "Removed desktop entry: $USER_APPS_DIR/$APP_NAME.desktop"
fi

# Remove icons
if [ -f "$USER_ICONS_DIR/128x128/apps/$APP_NAME.png" ]; then
    rm -f "$USER_ICONS_DIR/128x128/apps/$APP_NAME.png"
    echo "Removed icon: $USER_ICONS_DIR/128x128/apps/$APP_NAME.png"
fi
if [ -f "$USER_ICONS_DIR/32x32/apps/$APP_NAME.png" ]; then
    rm -f "$USER_ICONS_DIR/32x32/apps/$APP_NAME.png"
    echo "Removed icon: $USER_ICONS_DIR/32x32/apps/$APP_NAME.png"
fi

# Ask about config removal
if [ -d "$USER_CONFIG_DIR/com.xcreenshot.app" ]; then
    read -p "Remove configuration data? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf "$USER_CONFIG_DIR/com.xcreenshot.app"
        echo "Removed configuration: $USER_CONFIG_DIR/com.xcreenshot.app"
    fi
fi

# Update icon cache
if command -v gtk-update-icon-cache &> /dev/null; then
    gtk-update-icon-cache -f -t "$USER_ICONS_DIR" 2>/dev/null || true
fi

echo ""
echo "Xcreenshot uninstalled successfully!"
