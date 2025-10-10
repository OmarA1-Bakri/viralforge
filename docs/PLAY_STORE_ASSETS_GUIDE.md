# Play Store Assets Creation Guide

This guide will help you create all required assets for Google Play Store submission.

## 📋 Asset Checklist

- [ ] App Icon (512x512px)
- [ ] Feature Graphic (1024x500px)
- [ ] Phone Screenshots (minimum 2, recommended 4-8)
- [ ] Privacy Policy (hosted publicly)
- [ ] Short Description (80 chars)
- [ ] Full Description (4000 chars)

---

## 1. App Icon (512x512px)

### Requirements
- **Size:** 512 x 512 pixels
- **Format:** 32-bit PNG (with alpha channel)
- **File size:** Under 1 MB
- **Design:** No transparency, rounded corners added automatically by Play Store

### Source Asset
Your current app icon: `/home/omar/viralforge/client/public/viralforge_1758689165504.png`

### How to Create

**Option 1: Using ImageMagick (Command Line)**
```bash
cd /home/omar/viralforge/client/public

# Resize to 512x512 with high quality
convert viralforge_1758689165504.png \
  -resize 512x512 \
  -background none \
  -gravity center \
  -extent 512x512 \
  /home/omar/viralforge/docs/play-store-assets/app-icon-512.png
```

**Option 2: Using GIMP (GUI)**
1. Open: `viralforge_1758689165504.png` in GIMP
2. Image → Scale Image → 512x512
3. Export As → app-icon-512.png
4. Export options: PNG, no interlacing

**Option 3: Online Tool**
- Upload to: https://www.iloveimg.com/resize-image
- Resize to 512x512px
- Download PNG

---

## 2. Feature Graphic (1024x500px)

### Requirements
- **Size:** 1024 x 500 pixels (exactly)
- **Format:** JPEG or 24-bit PNG
- **File size:** Under 1 MB
- **Design:** Showcases app branding, no important text near edges

### Design Specifications

**Layout:**
```
┌─────────────────────────────────────────────┐
│  [App Icon]    ViralForge                   │
│   80x80        AI-Powered YouTube Analytics │
│                                              │
│  "Predict Viral Potential Before Posting"   │
└─────────────────────────────────────────────┘
     1024 x 500 px
```

**Design Elements:**
- **Background:** Dark gradient (#0e0e0e to #1a1a1a)
- **App Icon:** 80x80px, left side
- **App Name:** "ViralForge" - Bold, 48px, primary cyan (#49e8f3)
- **Tagline:** "AI-Powered YouTube Analytics" - 24px, white
- **CTA:** "Predict Viral Potential Before Posting" - 20px, accent pink (#ff5cc6)

### How to Create

**Option 1: Figma Template**
1. Go to: https://www.figma.com/
2. Create new file: 1024 x 500px
3. Design with specs above
4. Export as PNG

**Option 2: Canva Template**
1. Go to: https://www.canva.com/
2. Custom dimensions: 1024 x 500px
3. Upload app icon
4. Add text elements
5. Download as PNG

**Option 3: Photoshop/GIMP**
1. Create new image: 1024 x 500px
2. Add gradient background
3. Place app icon (80x80)
4. Add text with specified fonts/colors
5. Export as PNG or JPEG (quality 90+)

**Quick Script (if you have ImageMagick):**
```bash
mkdir -p /home/omar/viralforge/docs/play-store-assets

# Create feature graphic with text overlay
convert -size 1024x500 gradient:#0e0e0e-#1a1a1a \
  /home/omar/viralforge/client/public/viralforge_1758689165504.png -resize 80x80 -geometry +50+210 -composite \
  -font Arial-Bold -pointsize 48 -fill '#49e8f3' -annotate +150+240 'ViralForge' \
  -font Arial -pointsize 24 -fill white -annotate +150+280 'AI-Powered YouTube Analytics' \
  -font Arial -pointsize 20 -fill '#ff5cc6' -annotate +150+330 'Predict Viral Potential Before Posting' \
  /home/omar/viralforge/docs/play-store-assets/feature-graphic.png
```

---

## 3. Phone Screenshots (1080x2400px)

### Requirements
- **Size:** 1080 x 2400 pixels (9:20 aspect ratio)
- **Format:** JPEG or 24-bit PNG
- **Minimum:** 2 screenshots
- **Recommended:** 4-8 screenshots
- **File size:** Each under 8 MB

### Screenshot Plan

**Screenshot 1: Dashboard / Idea Lab**
- Show: Trending ideas feed with viral scores
- Highlight: Gradient buttons, trend cards, filters

**Screenshot 2: Profile Analysis**
- Show: Viral score modal with insights
- Highlight: Score breakdown, recommendations

**Screenshot 3: Optimize Tab (Launch Pad)**
- Show: YouTube URL input, analysis results
- Highlight: Clickability/clarity scores, feedback

**Screenshot 4: Multiply Tab**
- Show: Video processing, clip generation
- Highlight: Upload/YouTube options, processing status

**Screenshot 5: Settings/Subscriptions (Optional)**
- Show: Pricing tiers, scheduled analysis
- Highlight: Feature comparison

### How to Capture

**Method 1: Android Emulator (Automated Script)**

Create this script: `/home/omar/viralforge/capture-screenshots.sh`
```bash
#!/bin/bash

# Ensure emulator is running
adb devices

# Create output directory
mkdir -p /home/omar/viralforge/docs/play-store-assets/screenshots

# Capture screenshot 1: Dashboard
echo "📸 Capturing Dashboard..."
sleep 2
adb shell screencap -p /sdcard/screenshot1.png
adb pull /sdcard/screenshot1.png /home/omar/viralforge/docs/play-store-assets/screenshots/1-dashboard.png

# Navigate to profile analysis (you'll need to tap manually or use UI Automator)
echo "⏸️  Please navigate to Profile Analysis modal, then press Enter..."
read

echo "📸 Capturing Profile Analysis..."
adb shell screencap -p /sdcard/screenshot2.png
adb pull /sdcard/screenshot2.png /home/omar/viralforge/docs/play-store-assets/screenshots/2-profile-analysis.png

# Navigate to Optimize tab
echo "⏸️  Please navigate to Optimize tab, then press Enter..."
read

echo "📸 Capturing Launch Pad..."
adb shell screencap -p /sdcard/screenshot3.png
adb pull /sdcard/screenshot3.png /home/omar/viralforge/docs/play-store-assets/screenshots/3-optimize.png

# Navigate to Multiply tab
echo "⏸️  Please navigate to Multiply tab, then press Enter..."
read

echo "📸 Capturing Multiplier..."
adb shell screencap -p /sdcard/screenshot4.png
adb pull /sdcard/screenshot4.png /home/omar/viralforge/docs/play-store-assets/screenshots/4-multiply.png

echo "✅ Screenshots captured successfully!"
ls -lh /home/omar/viralforge/docs/play-store-assets/screenshots/
```

Make it executable:
```bash
chmod +x /home/omar/viralforge/capture-screenshots.sh
```

**Method 2: Manual Capture**
1. Open emulator with app running
2. Navigate to each screen
3. Press `Ctrl+S` in Android Studio emulator
4. Or use: `adb shell screencap -p /sdcard/screen.png`

**Method 3: Physical Device**
1. Open app on your Android phone
2. Press Power + Volume Down to screenshot
3. Transfer via USB or Google Photos

### Post-Processing (Optional)

**Add Device Frame:**
```bash
# Using device frames from Android Studio
# Or online: https://screenshots.pro/
```

**Resize if needed:**
```bash
for img in screenshots/*.png; do
  convert "$img" -resize 1080x2400^ -gravity center -extent 1080x2400 "${img%.png}-resized.png"
done
```

---

## 4. App Descriptions

### Short Description (80 characters max)
**Current:** "AI-powered YouTube analytics - predict viral potential before posting"
**Length:** 67 characters ✅

### Full Description (4000 characters max)
**Location:** `/home/omar/viralforge/docs/PLAY_STORE_SUBMISSION.md` (lines 28-70)
**Length:** ~1,850 characters ✅

**Copy this to Play Console:**
```
ViralForge is the AI-powered analytics platform that helps YouTube creators maximize their viral potential. Stop guessing what content will perform - get data-driven insights before you hit publish.

🎯 KEY FEATURES:

• Viral Score Prediction - AI analyzes your video concept and predicts viral potential
• Trend Analysis - Real-time tracking of trending topics in your niche
• Competitor Insights - See what's working for top creators in your category
• Content Ideas - AI-generated video ideas based on trending patterns
• Schedule Analysis - Automated daily reports on your channel performance

📊 CREATOR-FOCUSED ANALYTICS:

ViralForge specializes in YouTube creator analytics, providing:
- Profile analysis with viral scoring rubric
- Niche-specific trend identification
- Content optimization recommendations
- Engagement pattern analysis

💡 AI-POWERED INSIGHTS:

Our AI analyzes millions of data points to help you:
- Identify emerging trends before competitors
- Optimize titles and thumbnails for maximum CTR
- Find the perfect upload timing
- Discover untapped content opportunities

📱 DESIGNED FOR CREATORS:

- Clean, mobile-first interface
- YouTube-only focus (no TikTok/Instagram distractions)
- Scheduled analysis reports delivered daily
- Export and share insights with your team

🚀 SUBSCRIPTION TIERS:

• Starter (Free) - Basic trend tracking and analysis
• Creator ($19/mo) - Advanced analytics + AI insights
• Pro ($39/mo) - Competitor tracking + priority support
• Studio ($99/mo) - Unlimited analysis + team features

Perfect for YouTube creators, content agencies, and social media managers who want to maximize their content's viral potential with AI-powered analytics.
```

---

## 5. Hosting Privacy Policy & Terms

### Option 1: GitHub Pages (Free, Recommended)

**Step 1:** Create a new repository
```bash
cd /home/omar
mkdir viralforge-legal
cd viralforge-legal
git init

# Copy documents
cp /home/omar/viralforge/docs/PRIVACY_POLICY.md README.md
cp /home/omar/viralforge/docs/TERMS_OF_SERVICE.md TERMS.md

# Create index.html
cat > index.html <<'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ViralForge - Privacy Policy</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; line-height: 1.6; color: #333; }
        h1 { color: #49e8f3; }
        h2 { color: #ff5cc6; margin-top: 2em; }
        table { width: 100%; border-collapse: collapse; margin: 1em 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background: #f4f4f4; }
    </style>
</head>
<body>
    <h1>ViralForge Privacy Policy</h1>
    <!-- Paste privacy policy content here -->
</body>
</html>
EOF

# Commit and push
git add .
git commit -m "Initial legal documents"
```

**Step 2:** Create GitHub repo and enable Pages
1. Go to: https://github.com/new
2. Name: `viralforge-legal`
3. Create repository
4. Push code:
```bash
git remote add origin https://github.com/YOUR_USERNAME/viralforge-legal.git
git branch -M main
git push -u origin main
```

**Step 3:** Enable GitHub Pages
1. Go to: Settings → Pages
2. Source: Deploy from branch `main` → `/root`
3. Save

**Your Privacy Policy URL:**
`https://YOUR_USERNAME.github.io/viralforge-legal/`

**Your Terms URL:**
`https://YOUR_USERNAME.github.io/viralforge-legal/terms.html`

### Option 2: Firebase Hosting (Free)

```bash
cd /home/omar/viralforge/docs
firebase init hosting

# Deploy
firebase deploy --only hosting
```

**Privacy Policy URL:**
`https://YOUR_PROJECT.web.app/privacy`

### Option 3: Custom Domain (if you own one)

If you have `viralforge.ai`:
- Host on: Netlify, Vercel, or your server
- Privacy URL: `https://viralforge.ai/privacy`
- Terms URL: `https://viralforge.ai/terms`

---

## 6. Final Asset Checklist

Before uploading to Play Console:

### File Structure
```
/home/omar/viralforge/docs/play-store-assets/
├── app-icon-512.png          (512x512, <1MB)
├── feature-graphic.png        (1024x500, <1MB)
└── screenshots/
    ├── 1-dashboard.png        (1080x2400, <8MB)
    ├── 2-profile-analysis.png (1080x2400, <8MB)
    ├── 3-optimize.png         (1080x2400, <8MB)
    └── 4-multiply.png         (1080x2400, <8MB)
```

### Quality Check
- [ ] All images are high resolution (no pixelation)
- [ ] Screenshots show actual app functionality (no mockups)
- [ ] Text is readable on all screenshots
- [ ] Feature graphic has no cut-off text
- [ ] App icon looks good at small sizes (48x48)
- [ ] All files under size limits
- [ ] Consistent branding across all assets

### Upload to Play Console
1. Go to: **Play Console → Your App → Store presence → Main store listing**
2. Upload:
   - App icon: `app-icon-512.png`
   - Feature graphic: `feature-graphic.png`
   - Screenshots: Upload all 4-8 screenshots
3. Add:
   - Short description (67 chars)
   - Full description (1,850 chars)
   - Privacy policy URL
   - Terms URL (if required)

---

## 7. Quick Generation Commands

**Create all assets in one go:**

```bash
#!/bin/bash
# Run this script to generate all Play Store assets

mkdir -p /home/omar/viralforge/docs/play-store-assets/screenshots

# 1. App Icon
convert /home/omar/viralforge/client/public/viralforge_1758689165504.png \
  -resize 512x512 \
  -background none \
  -gravity center \
  -extent 512x512 \
  /home/omar/viralforge/docs/play-store-assets/app-icon-512.png

echo "✅ App icon created"

# 2. Feature Graphic
convert -size 1024x500 gradient:#0e0e0e-#1a1a1a \
  /home/omar/viralforge/client/public/viralforge_1758689165504.png -resize 80x80 -geometry +50+210 -composite \
  -font Arial-Bold -pointsize 48 -fill '#49e8f3' -annotate +150+240 'ViralForge' \
  -font Arial -pointsize 24 -fill white -annotate +150+280 'AI-Powered YouTube Analytics' \
  -font Arial -pointsize 20 -fill '#ff5cc6' -annotate +150+330 'Predict Viral Potential Before Posting' \
  /home/omar/viralforge/docs/play-store-assets/feature-graphic.png

echo "✅ Feature graphic created"

# 3. Screenshots (manual capture required)
echo "⏸️  Please run the emulator and use capture-screenshots.sh for screenshots"

echo ""
echo "📁 Assets saved to: /home/omar/viralforge/docs/play-store-assets/"
ls -lh /home/omar/viralforge/docs/play-store-assets/
```

Save as: `/home/omar/viralforge/generate-play-assets.sh`
Make executable: `chmod +x generate-play-assets.sh`
Run: `./generate-play-assets.sh`

---

## Next Steps

1. ✅ Create app icon & feature graphic (run script above)
2. ✅ Capture screenshots (use emulator or device)
3. ✅ Host privacy policy on GitHub Pages/Firebase
4. ✅ Upload all assets to Play Console
5. ✅ Fill in app descriptions
6. ✅ Complete content rating questionnaire
7. ✅ Upload AAB to Internal Testing track
8. ✅ Test and iterate
9. ✅ Submit for production review

**Estimated Time:** 2-3 hours total

Good luck with your Play Store submission! 🚀
