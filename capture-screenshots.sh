#!/bin/bash

# Play Store Screenshot Capture Script
# Captures screenshots from Android emulator/device for Play Store submission
# Requirements: Android device/emulator running ViralForge app

set -e

# Color output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Create output directory
SCREENSHOTS_DIR="/home/omar/viralforge/docs/play-store-assets/screenshots"
mkdir -p "$SCREENSHOTS_DIR"

echo -e "${BLUE}📱 Play Store Screenshot Capture${NC}"
echo "=================================="
echo ""

# Check if device is connected
if ! adb devices | grep -q "device$"; then
    echo -e "${YELLOW}⚠️  No Android device/emulator connected${NC}"
    echo "Please start the emulator or connect a device, then try again"
    exit 1
fi

echo -e "${GREEN}✓ Device connected${NC}"
echo ""

# Screenshot 1: Dashboard / Idea Lab
echo -e "${BLUE}📸 Screenshot 1: Dashboard (Idea Lab)${NC}"
echo "Please navigate to the Dashboard/Idea Lab screen showing trending ideas"
echo -e "${YELLOW}Press Enter when ready...${NC}"
read
adb shell screencap -p /sdcard/screenshot1.png
adb pull /sdcard/screenshot1.png "$SCREENSHOTS_DIR/1-dashboard.png"
echo -e "${GREEN}✓ Saved: 1-dashboard.png${NC}"
echo ""

# Screenshot 2: Profile Analysis
echo -e "${BLUE}📸 Screenshot 2: Profile Analysis${NC}"
echo "Please navigate to Profile Analysis modal with viral score insights"
echo -e "${YELLOW}Press Enter when ready...${NC}"
read
adb shell screencap -p /sdcard/screenshot2.png
adb pull /sdcard/screenshot2.png "$SCREENSHOTS_DIR/2-profile-analysis.png"
echo -e "${GREEN}✓ Saved: 2-profile-analysis.png${NC}"
echo ""

# Screenshot 3: Optimize Tab (Launch Pad)
echo -e "${BLUE}📸 Screenshot 3: Optimize Tab (Launch Pad)${NC}"
echo "Please navigate to Optimize tab showing YouTube URL analysis"
echo -e "${YELLOW}Press Enter when ready...${NC}"
read
adb shell screencap -p /sdcard/screenshot3.png
adb pull /sdcard/screenshot3.png "$SCREENSHOTS_DIR/3-optimize.png"
echo -e "${GREEN}✓ Saved: 3-optimize.png${NC}"
echo ""

# Screenshot 4: Multiply Tab
echo -e "${BLUE}📸 Screenshot 4: Multiply Tab${NC}"
echo "Please navigate to Multiply tab showing video processing"
echo -e "${YELLOW}Press Enter when ready...${NC}"
read
adb shell screencap -p /sdcard/screenshot4.png
adb pull /sdcard/screenshot4.png "$SCREENSHOTS_DIR/4-multiply.png"
echo -e "${GREEN}✓ Saved: 4-multiply.png${NC}"
echo ""

# Optional Screenshot 5: Settings/Subscriptions
echo -e "${BLUE}📸 Screenshot 5 (Optional): Settings/Subscriptions${NC}"
echo "Navigate to Settings/Subscriptions screen (or skip)"
echo -e "${YELLOW}Press Enter to capture, or Ctrl+C to skip...${NC}"
read
adb shell screencap -p /sdcard/screenshot5.png
adb pull /sdcard/screenshot5.png "$SCREENSHOTS_DIR/5-subscriptions.png"
echo -e "${GREEN}✓ Saved: 5-subscriptions.png${NC}"
echo ""

# Cleanup device
adb shell rm /sdcard/screenshot*.png

echo ""
echo -e "${GREEN}✅ Screenshot capture complete!${NC}"
echo "=================================="
echo ""
echo "Screenshots saved to: $SCREENSHOTS_DIR"
echo ""
ls -lh "$SCREENSHOTS_DIR"
echo ""

# Check if screenshots need resizing
echo -e "${BLUE}Checking screenshot dimensions...${NC}"
for img in "$SCREENSHOTS_DIR"/*.png; do
    if [ -f "$img" ]; then
        dims=$(identify -format "%wx%h" "$img" 2>/dev/null || echo "unknown")
        echo "  $(basename "$img"): $dims"
    fi
done
echo ""

# Offer to resize if needed
echo -e "${YELLOW}Play Store requires 1080x2400 resolution${NC}"
echo "Do you want to resize screenshots now? (y/n)"
read -r resize_choice

if [ "$resize_choice" = "y" ]; then
    echo -e "${BLUE}Resizing screenshots to 1080x2400...${NC}"
    for img in "$SCREENSHOTS_DIR"/*.png; do
        if [ -f "$img" ]; then
            filename=$(basename "$img")
            convert "$img" -resize 1080x2400^ -gravity center -extent 1080x2400 "$SCREENSHOTS_DIR/resized-$filename"
            echo -e "${GREEN}✓ Resized: resized-$filename${NC}"
        fi
    done
    echo ""
    echo -e "${GREEN}✅ Resizing complete!${NC}"
    echo "Resized screenshots saved with 'resized-' prefix"
fi

echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Review screenshots in: $SCREENSHOTS_DIR"
echo "2. Upload to Play Console: Store presence → Main store listing"
echo "3. Add app descriptions and privacy policy URL"
echo ""
