#!/bin/bash
# Beat Detector - macOS Installation Script
# Version 1.2.3

echo ""
echo "========================================"
echo "Beat Detector - Installation macOS"
echo "========================================"
echo ""

# Get script directory
SOURCE_DIR="$(cd "$(dirname "$0")" && pwd)"
EXTENSIONS_DIR="$HOME/Library/Application Support/Adobe/CEP/extensions"
EXTENSION_PATH="$EXTENSIONS_DIR/com.antigravity.beatdetector"
SYSTEM_EXTENSION_PATH="/Library/Application Support/Adobe/CEP/extensions/com.antigravity.beatdetector"

echo "Source: $SOURCE_DIR"
echo "Target: $EXTENSION_PATH"
echo ""
echo "[OK] Installing for current user only. No administrator password is required."
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
# Enable PlayerDebugMode for a broad range of CEP hosts without requiring admin rights.
CSXS_VERSION=7
while [ "$CSXS_VERSION" -le 20 ]; do
    defaults write "com.adobe.CSXS.$CSXS_VERSION" PlayerDebugMode 1
    CSXS_VERSION=$((CSXS_VERSION + 1))
done
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
    
    # Create the per-user CEP extensions directory if needed.
    if [ ! -d "$EXTENSIONS_DIR" ]; then
        mkdir -p "$EXTENSIONS_DIR"
    fi

    if [ $? -ne 0 ]; then
        echo "[ERROR] Failed to create user extension folder"
        exit 1
    fi

    # Merge files into the user extension folder without deleting user-accessible data first.
    ditto "$SOURCE_DIR" "$EXTENSION_PATH"

    if [ $? -eq 0 ]; then
        echo "[OK] Extension installed successfully"
    else
        echo "[ERROR] Failed to copy extension files"
        exit 1
    fi

    if [ -d "$SYSTEM_EXTENSION_PATH" ]; then
        echo ""
        echo "Note: an older system-wide installation also exists:"
        echo "$SYSTEM_EXTENSION_PATH"
        echo "Beat Detector is now installed for this user. If Premiere still loads the old copy, ask an administrator to remove the system-wide folder."
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
