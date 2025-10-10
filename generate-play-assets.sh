#!/bin/bash

# Play Store Assets Generation Script
# Generates all required assets for Google Play Store submission

set -e

# Color output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔════════════════════════════════════════╗"
echo "║  Play Store Assets Generator          ║"
echo "║  ViralForge - AI YouTube Analytics     ║"
echo "╚════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# Create output directories
ASSETS_DIR="/home/omar/viralforge/docs/play-store-assets"
SCREENSHOTS_DIR="$ASSETS_DIR/screenshots"

mkdir -p "$ASSETS_DIR"
mkdir -p "$SCREENSHOTS_DIR"

# Source icon
SOURCE_ICON="/home/omar/viralforge/android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png"

# Check if source icon exists
if [ ! -f "$SOURCE_ICON" ]; then
    echo -e "${RED}❌ Error: Source icon not found at $SOURCE_ICON${NC}"
    exit 1
fi

echo -e "${BLUE}1. Generating App Icon (512x512)...${NC}"
convert "$SOURCE_ICON" \
  -resize 512x512 \
  -background none \
  -gravity center \
  -extent 512x512 \
  "$ASSETS_DIR/app-icon-512.png"

if [ -f "$ASSETS_DIR/app-icon-512.png" ]; then
    SIZE=$(identify -format "%wx%h" "$ASSETS_DIR/app-icon-512.png")
    FILESIZE=$(ls -lh "$ASSETS_DIR/app-icon-512.png" | awk '{print $5}')
    echo -e "${GREEN}✓ App icon created: ${SIZE}, ${FILESIZE}${NC}"
else
    echo -e "${RED}❌ Failed to create app icon${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}2. Generating Feature Graphic (1024x500)...${NC}"

# Create background
convert -size 1024x500 canvas:'#0e0e0e' "$ASSETS_DIR/feature-graphic-bg.png"

# Composite icon
convert "$ASSETS_DIR/feature-graphic-bg.png" \
  \( "$SOURCE_ICON" -resize 80x80 \) \
  -geometry +50+210 -composite \
  "$ASSETS_DIR/feature-graphic-with-icon.png"

# Add text
convert "$ASSETS_DIR/feature-graphic-with-icon.png" \
  -font 'DejaVu-Sans-Bold' -pointsize 48 -fill '#49e8f3' -annotate +150+240 'ViralForge' \
  -font 'DejaVu-Sans' -pointsize 24 -fill white -annotate +150+290 'AI-Powered YouTube Analytics' \
  -font 'DejaVu-Sans' -pointsize 20 -fill '#ff5cc6' -annotate +150+340 'Predict Viral Potential Before Posting' \
  "$ASSETS_DIR/feature-graphic.png"

# Cleanup temporary files
rm -f "$ASSETS_DIR/feature-graphic-bg.png" "$ASSETS_DIR/feature-graphic-with-icon.png"

if [ -f "$ASSETS_DIR/feature-graphic.png" ]; then
    SIZE=$(identify -format "%wx%h" "$ASSETS_DIR/feature-graphic.png")
    FILESIZE=$(ls -lh "$ASSETS_DIR/feature-graphic.png" | awk '{print $5}')
    echo -e "${GREEN}✓ Feature graphic created: ${SIZE}, ${FILESIZE}${NC}"
else
    echo -e "${RED}❌ Failed to create feature graphic${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Static assets generated successfully!${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${BLUE}📁 Generated Assets:${NC}"
echo ""
ls -lh "$ASSETS_DIR"/*.png
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check for screenshots
echo -e "${YELLOW}3. Screenshots (Manual Capture Required)${NC}"
echo ""
echo "Screenshots must be captured from a running Android device/emulator."
echo ""
echo -e "${BLUE}To capture screenshots:${NC}"
echo "  1. Start the Android emulator: ./android/run-emulator.sh"
echo "  2. Run the capture script: ./capture-screenshots.sh"
echo ""
echo -e "${BLUE}Or manually capture:${NC}"
echo "  - Navigate to each screen in the app"
echo "  - Press Ctrl+S in the emulator"
echo "  - Save to: $SCREENSHOTS_DIR"
echo ""

# Asset validation
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${BLUE}📋 Play Store Requirements Checklist:${NC}"
echo ""

# Check app icon
if [ -f "$ASSETS_DIR/app-icon-512.png" ]; then
    APP_ICON_SIZE=$(identify -format "%wx%h" "$ASSETS_DIR/app-icon-512.png")
    if [ "$APP_ICON_SIZE" = "512x512" ]; then
        echo -e "${GREEN}✓${NC} App Icon (512x512): Ready"
    else
        echo -e "${RED}✗${NC} App Icon: Wrong size ($APP_ICON_SIZE, need 512x512)"
    fi
else
    echo -e "${RED}✗${NC} App Icon: Not found"
fi

# Check feature graphic
if [ -f "$ASSETS_DIR/feature-graphic.png" ]; then
    FEATURE_SIZE=$(identify -format "%wx%h" "$ASSETS_DIR/feature-graphic.png")
    if [ "$FEATURE_SIZE" = "1024x500" ]; then
        echo -e "${GREEN}✓${NC} Feature Graphic (1024x500): Ready"
    else
        echo -e "${RED}✗${NC} Feature Graphic: Wrong size ($FEATURE_SIZE, need 1024x500)"
    fi
else
    echo -e "${RED}✗${NC} Feature Graphic: Not found"
fi

# Check screenshots
SCREENSHOT_COUNT=$(ls -1 "$SCREENSHOTS_DIR"/*.png 2>/dev/null | wc -l)
if [ "$SCREENSHOT_COUNT" -ge 2 ]; then
    echo -e "${GREEN}✓${NC} Screenshots: $SCREENSHOT_COUNT found (minimum 2 required)"
else
    echo -e "${YELLOW}⏸${NC}  Screenshots: $SCREENSHOT_COUNT found (need at least 2)"
fi

# Check privacy policy
if [ -f "/home/omar/viralforge/docs/PRIVACY_POLICY.md" ]; then
    echo -e "${GREEN}✓${NC} Privacy Policy: Created (needs hosting)"
else
    echo -e "${RED}✗${NC} Privacy Policy: Not found"
fi

# Check terms of service
if [ -f "/home/omar/viralforge/docs/TERMS_OF_SERVICE.md" ]; then
    echo -e "${GREEN}✓${NC} Terms of Service: Created (needs hosting)"
else
    echo -e "${RED}✗${NC} Terms of Service: Not found"
fi

# Check AAB
if [ -f "/home/omar/viralforge/android/app/build/outputs/bundle/release/app-release.aab" ]; then
    echo -e "${GREEN}✓${NC} Release AAB: Built and signed"
else
    echo -e "${YELLOW}⏸${NC}  Release AAB: Run './gradlew bundleRelease' to build"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${BLUE}📝 Next Steps:${NC}"
echo ""
echo "1. Capture screenshots using: ./capture-screenshots.sh"
echo "2. Host privacy policy (GitHub Pages, Firebase, or custom domain)"
echo "3. Upload assets to Play Console:"
echo "   - Store presence → Main store listing"
echo "   - Upload app-icon-512.png as app icon"
echo "   - Upload feature-graphic.png as feature graphic"
echo "   - Upload screenshots from screenshots/"
echo "4. Fill in app descriptions:"
echo "   - Short: AI-powered YouTube analytics - predict viral potential"
echo "   - Full: Copy from docs/PLAY_STORE_SUBMISSION.md"
echo "5. Set privacy policy URL"
echo "6. Upload AAB to Internal Testing track"
echo ""
echo -e "${GREEN}🚀 Estimated time to submission: 2-3 hours${NC}"
echo ""
