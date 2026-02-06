#!/bin/bash
# Beat Detector - macOS Installation Script
# Version 1.1.3

echo ""
echo "========================================"
echo "Beat Detector - Installation macOS"
echo "========================================"
echo ""

# Get script directory
SOURCE_DIR="$(cd "$(dirname "$0")" && pwd)"
EXTENSION_PATH="/Library/Application Support/Adobe/CEP/extensions/PremiereBeatDetector"

echo "Source: $SOURCE_DIR"
echo "Target: $EXTENSION_PATH"
echo ""

# Check for sudo and auto-elevate if needed
if [ "$EUID" -ne 0 ]; then
    echo "This script requires administrator privileges."
    echo "Requesting sudo permissions..."
    sudo "$0" "$@"
    exit $?
fi

echo "[OK] Running with appropriate permissions"
echo ""

# Check if already installed
if [ "$SOURCE_DIR" = "$EXTENSION_PATH" ]; then
    echo "Extension is already installed at the correct location."
    echo "Skipping file copy."
    SKIP_COPY=1
else
    SKIP_COPY=0
fi

# Step 1: Enable debug mode
echo "Step 1/2: Enabling CEP debug mode..."
defaults write com.adobe.CSXS.11 PlayerDebugMode 1
defaults write com.adobe.CSXS.12 PlayerDebugMode 1
echo "[OK] Debug mode enabled"

# Step 2: Copy extension files
if [ "$SKIP_COPY" = "0" ]; then
    echo ""
    echo "Step 2/2: Installing extension files..."
    
    # Check source files exist
    if [ ! -d "$SOURCE_DIR/client" ]; then
        echo "ERROR: Extension files not found!"
        echo "This script must be run from the extension folder."
        exit 1
    fi
    
    # Create extensions directory if needed
    if [ ! -d "/Library/Application Support/Adobe/CEP/extensions" ]; then
        mkdir -p "/Library/Application Support/Adobe/CEP/extensions"
    fi
    
    # Remove old installation if exists
    if [ -d "$EXTENSION_PATH" ]; then
        rm -rf "$EXTENSION_PATH"
    fi
    
    # Copy files
    cp -R "$SOURCE_DIR" "$EXTENSION_PATH"
    
    if [ $? -eq 0 ]; then
        echo "[OK] Extension installed successfully"
    else
        echo "[ERROR] Failed to copy extension files"
        exit 1
    fi
else
    echo ""
    echo "Step 2/2: Skipped (already installed)"
fi

echo ""
echo "========================================"
echo "Installation Complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Restart Adobe Premiere Pro"
echo "2. Go to Window > Extensions > Beat Detector"
echo "3. Load an audio clip and detect beats!"
echo ""
