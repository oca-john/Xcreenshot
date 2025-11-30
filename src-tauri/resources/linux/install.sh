#!/bin/bash
# Xcreenshot Linux Installation Script
# Usage: ./install.sh

set -e

APP_NAME="xcreenshot"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
USER_BIN_DIR="$HOME/bin"
USER_APPS_DIR="$HOME/.local/share/applications"
USER_ICONS_DIR="$HOME/.local/share/icons/hicolor"

echo "Installing Xcreenshot..."

# Create directories if not exist
mkdir -p "$USER_BIN_DIR"
mkdir -p "$USER_APPS_DIR"
mkdir -p "$USER_ICONS_DIR/128x128/apps"
mkdir -p "$USER_ICONS_DIR/32x32/apps"

# Copy application binary
if [ -f "$SCRIPT_DIR/$APP_NAME" ]; then
    cp "$SCRIPT_DIR/$APP_NAME" "$USER_BIN_DIR/"
    chmod +x "$USER_BIN_DIR/$APP_NAME"
    echo "Binary installed to $USER_BIN_DIR/$APP_NAME"
elif [ -f "$SCRIPT_DIR/Xcreenshot" ]; then
    cp "$SCRIPT_DIR/Xcreenshot" "$USER_BIN_DIR/$APP_NAME"
    chmod +x "$USER_BIN_DIR/$APP_NAME"
    echo "Binary installed to $USER_BIN_DIR/$APP_NAME"
else
    echo "Error: Application binary not found!"
    exit 1
fi

# Copy icons
if [ -f "$SCRIPT_DIR/icons/128x128.png" ]; then
    cp "$SCRIPT_DIR/icons/128x128.png" "$USER_ICONS_DIR/128x128/apps/$APP_NAME.png"
fi
if [ -f "$SCRIPT_DIR/icons/32x32.png" ]; then
    cp "$SCRIPT_DIR/icons/32x32.png" "$USER_ICONS_DIR/32x32/apps/$APP_NAME.png"
fi

# Create desktop entry
cat > "$USER_APPS_DIR/$APP_NAME.desktop" << EOF
[Desktop Entry]
Name=Xcreenshot
Comment=Cross-platform screenshot tool with annotation support
Exec=$USER_BIN_DIR/$APP_NAME
Icon=$APP_NAME
Terminal=false
Type=Application
Categories=Office;TextEditor;Utility;
StartupWMClass=Xcreenshot
Keywords=screenshot;capture;annotation;
EOF

chmod +x "$USER_APPS_DIR/$APP_NAME.desktop"

# Update icon cache
if command -v gtk-update-icon-cache &> /dev/null; then
    gtk-update-icon-cache -f -t "$USER_ICONS_DIR" 2>/dev/null || true
fi

# Add ~/bin to PATH if not already
if [[ ":$PATH:" != *":$USER_BIN_DIR:"* ]]; then
    echo ""
    echo "Note: Add the following line to your ~/.bashrc or ~/.zshrc:"
    echo "  export PATH=\"\$HOME/bin:\$PATH\""
fi

echo ""
echo "Xcreenshot installed successfully!"
echo "You can now run it from the application menu or by typing '$APP_NAME' in terminal."
