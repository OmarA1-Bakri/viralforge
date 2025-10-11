# How to Send ViralForge App to Your Brother

## 📦 Package Ready

**File**: `viralforge-android-package.zipme` (13 MB)
**Location**: `/home/omar/viralforge/viralforge-android-package.zipme`

**Contains**:
- ViralForge.apk (Android app)
- Installation instructions (detailed)
- Quick start guide (1-minute version)
- README with all info

---

## 🚀 How to Send It

### Option 1: Google Drive (Recommended)

1. **Upload to Google Drive**:
   ```bash
   # Open Google Drive in browser
   # Upload: viralforge-android-package.zipme
   ```

2. **Get Shareable Link**:
   - Right-click the file → "Share" → "Get link"
   - Set to "Anyone with the link can view"
   - Copy the link

3. **Send to Your Brother**:
   ```
   Hey! Here's the ViralForge app for testing.

   Download: [PASTE GOOGLE DRIVE LINK]

   Instructions:
   1. Download the .zipme file
   2. Rename it to .zip (remove "me" from extension)
   3. Extract the zip file
   4. Read QUICK_START.txt or INSTALLATION_INSTRUCTIONS.md
   5. Install ViralForge.apk on your Android phone

   Let me know if you run into any issues!
   ```

---

### Option 2: WeTransfer (No Account Needed)

1. Go to **wetransfer.com**
2. Click "Upload files"
3. Upload `viralforge-android-package.zipme`
4. Enter your brother's email
5. Add message:
   ```
   ViralForge Android app for testing.

   After download:
   - Rename .zipme to .zip
   - Extract files
   - Install ViralForge.apk on Android
   - Read QUICK_START.txt for instructions
   ```
6. Click "Transfer"
7. He'll get download link via email

---

### Option 3: Email (If Under 25 MB)

Most email providers allow attachments up to 25 MB. The package is 13 MB, so it should work.

**Gmail/Outlook**:
1. Compose new email
2. Attach `viralforge-android-package.zipme`
3. Send to your brother with instructions

**Email Template**:
```
Subject: ViralForge Android App - Test Build

Hey,

Attached is the ViralForge app for testing.

To install:
1. Save the .zipme file
2. Rename it to .zip (just change the extension)
3. Extract/unzip the file
4. You'll see ViralForge.apk and instruction files
5. Read QUICK_START.txt for fast install
6. Or read INSTALLATION_INSTRUCTIONS.md for detailed steps

The app is safe - it's a test build I made. Android will warn about
"Unknown Sources" which is normal for apps not from Google Play.

Let me know if you have any issues installing it.

Thanks for testing!
```

---

### Option 4: Dropbox

1. Upload to Dropbox
2. Right-click → "Share" → "Create link"
3. Send link to your brother

---

### Option 5: Direct File Transfer

**If you're together or on same network**:

**USB Cable**:
```bash
# Copy to his phone directly
adb push viralforge-android-package.zipme /sdcard/Download/
```

**Via Bluetooth**:
- Right-click file → "Send via Bluetooth"
- Select his phone

**Via Local Network Share**:
- Use KDE Connect, Snapdrop, or similar

---

## 🔓 Enabling Tester Access (IMPORTANT!)

Your brother needs to enable "Tester Mode" to access the full tester tier features:

### How to Enable Tester Mode:
1. **Open the ViralForge app**
2. **On the login screen**, tap the title "Welcome Back" **7 times quickly** (within 3 seconds)
3. You'll see an alert: "🎉 Tester mode enabled!"
4. Now when you click **"Sign up"**, you'll be able to select the **"Tester Crew"** plan
5. **Register with approved email**:
   - Use an approved email address (you'll need to add your brother's email to the whitelist first)
   - Fill in your full name
   - The tester tier gives full Pro-level access for free

### Adding Your Brother's Email to Whitelist:
Before sending him the app, add his email to the whitelist:

1. Edit `server/routes/auth.ts`
2. Find the `APPROVED_TESTER_EMAILS` array (around line 50)
3. Add your brother's email:
   ```typescript
   const APPROVED_TESTER_EMAILS = [
     'omar@viralforgeai.co.uk',
     'info@viralforgeai.co.uk',
     'yourbrother@example.com',  // ADD THIS LINE
   ];
   ```
4. Save and redeploy the backend

**Important**: Without an approved email, he won't be able to complete tester registration even after enabling tester mode.

---

## 📱 What Your Brother Needs to Do

### Quick Version:
1. Download the .zipme file
2. Rename to .zip
3. Extract it
4. Read QUICK_START.txt
5. Install ViralForge.apk
6. **Tap "Welcome Back" 7 times** to enable tester mode
7. Register with approved email

### Detailed Version:
1. Download `viralforge-android-package.zipme`
2. Rename file extension from `.zipme` to `.zip`
3. Extract/unzip the file (right-click → Extract)
4. Inside you'll find:
   - **ViralForge.apk** ← The app to install
   - **QUICK_START.txt** ← 1-minute install guide
   - **INSTALLATION_INSTRUCTIONS.md** ← Full detailed guide
   - **README.txt** ← Overview of the package

5. Read QUICK_START.txt or INSTALLATION_INSTRUCTIONS.md
6. Transfer ViralForge.apk to Android phone
7. Install it (need to enable "Unknown Sources")
8. Create account and test

---

## ⚠️ Important Notes for Your Brother

**Tell him**:
- ✅ This is a test build, safe to install
- ✅ No payment or monetization screens (test mode)
- ✅ All features unlocked for testing
- ⚠️ Android will warn about "Unknown Sources" - this is normal
- ⚠️ Not from Google Play Store - it's a test version
- ⚠️ He needs to enable "Unknown Sources" in Android settings

**Package Name**: android.viral.forge
**Version**: 1.0 (Build 3)
**Backend**: Production (Firebase)

---

## 🐛 If He Has Issues

**Common Issues**:

1. **Can't open .zipme file**
   → Rename to .zip first

2. **"App not installed" error**
   → Uninstall any old version first
   → Make sure "Unknown Sources" is enabled

3. **Can't find "Unknown Sources" setting**
   → Check: Settings → Apps → Special Access → Install Unknown Apps
   → Or: Settings → Security → Unknown Sources

4. **Login/Register not working**
   → Check internet connection
   → Make sure backend is working (you can test at: https://api-an3oo7jicq-uc.a.run.app/api/health)

---

## ✅ What You Want Him to Test

Ask him to check:
- [ ] App installs successfully
- [ ] Registration & login work
- [ ] Trends feed loads
- [ ] YouTube channel analysis works
- [ ] App is stable (no crashes)
- [ ] Performance is good
- [ ] Any bugs or issues

---

## 📧 Quick Message Template

```
Hey! I built an Android app and need you to test it for me.

Download link: [YOUR GOOGLE DRIVE/WETRANSFER LINK]

Setup:
1. Download the .zipme file
2. Rename it to .zip
3. Extract it
4. Read QUICK_START.txt
5. Install ViralForge.apk on your Android phone

The app is safe - just enable "Unknown Sources" when Android asks.

Let me know:
- Does it install OK?
- Can you register and login?
- Does the trends feed load?
- Any crashes or bugs?

Thanks for testing! 🚀
```

---

**Package Location**: /home/omar/viralforge/viralforge-android-package.zipme
**Size**: 13 MB
**Ready to send!**
