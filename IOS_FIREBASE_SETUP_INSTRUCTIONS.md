# iOS Firebase OAuth Setup Instructions

## Prerequisites
- macOS with Xcode installed
- CocoaPods installed (`sudo gem install cocoapods` if not installed)
- The ViralForge project folder

## Files Already Prepared
✅ `ios/App/App/GoogleService-Info.plist` - Already in the correct location
✅ `ios/App/App/Info.plist` - URL schemes already configured
✅ `ios/App/Podfile` - Firebase pods already added

## Step 1: Install Firebase Pods

Open Terminal and navigate to the iOS app directory:

```bash
cd /path/to/viralforge/ios/App
pod install
```

This will install:
- Firebase/Auth
- Firebase/Analytics

**Expected output:**
```
Analyzing dependencies
Downloading dependencies
Installing Firebase (11.x.x)
Installing FirebaseAuth (11.x.x)
Installing FirebaseAnalytics (11.x.x)
...
Pod installation complete!
```

## Step 2: Open Project in Xcode

**IMPORTANT:** Open the **workspace**, not the project:

```bash
open App.xcworkspace
```

OR double-click `ios/App/App.xcworkspace` in Finder.

⚠️ **Do NOT open `App.xcodeproj`** - this will break CocoaPods integration.

## Step 3: Verify GoogleService-Info.plist

In Xcode's Project Navigator (left sidebar):

1. Look for `GoogleService-Info.plist` under the App folder
2. If it's **missing**:
   - Drag `ios/App/App/GoogleService-Info.plist` from Finder
   - **Check "Copy items if needed"**
   - **Check "Add to targets: App"**
3. Click on `GoogleService-Info.plist` to verify it contains:
   - `REVERSED_CLIENT_ID`: `com.googleusercontent.apps.355579691551-3tcc2qs84sjr034v72igr0jnap0lf474`
   - `BUNDLE_ID`: `com.viralapps.viralforge`

## Step 4: Verify Info.plist Configuration

Click on `Info.plist` in Project Navigator and verify it contains:

```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleTypeRole</key>
        <string>Editor</string>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>com.googleusercontent.apps.355579691551-3tcc2qs84sjr034v72igr0jnap0lf474</string>
        </array>
    </dict>
</array>
```

This should already be there - just verify it exists.

## Step 5: Build the App

1. Select a simulator or device from the scheme dropdown (top left)
2. Click **Product → Build** (⌘B)
3. Wait for build to complete

**Expected:** Build should succeed with no errors.

If you see Firebase-related errors, clean build:
- **Product → Clean Build Folder** (⌘⇧K)
- Try building again

## Step 6: Test OAuth (Optional)

If you want to test the OAuth flow:

1. Run the app in simulator (⌘R)
2. Navigate to: **Settings → Accounts tab**
3. Tap **"Connect YouTube"**
4. Sign in with Google account
5. Grant YouTube readonly permission
6. Should see **"Connected"** badge

## Troubleshooting

### Problem: "No such module 'Firebase'"
**Solution:**
- Make sure you opened `App.xcworkspace` (not `App.xcodeproj`)
- Clean build folder and rebuild

### Problem: Pod install fails
**Solution:**
```bash
cd ios/App
pod repo update
pod install
```

### Problem: GoogleService-Info.plist not found at runtime
**Solution:**
- Verify file is added to **target membership** (select file, check Inspector pane)
- File should be listed under **Build Phases → Copy Bundle Resources**

### Problem: OAuth redirect not working
**Solution:**
- Verify `CFBundleURLSchemes` in Info.plist matches `REVERSED_CLIENT_ID` from GoogleService-Info.plist
- Should be: `com.googleusercontent.apps.355579691551-3tcc2qs84sjr034v72igr0jnap0lf474`

## What This Enables

After setup, the iOS app will be able to:
- ✅ Sign in with Google/YouTube OAuth
- ✅ Store OAuth tokens on backend
- ✅ Use user's YouTube API quota (not shared quota)
- ✅ Analyze user's YouTube channel data

## Files Modified

The following files have already been prepared in the project:

1. **ios/App/App/GoogleService-Info.plist** - Firebase iOS config
2. **ios/App/App/Info.plist** - OAuth URL scheme configured
3. **ios/App/Podfile** - Firebase pods added

No manual code changes needed - just run `pod install` and build.

## Questions?

If you encounter any issues:
1. Take a screenshot of the error
2. Check the troubleshooting section above
3. Report back with error details

---

**Summary:** Run `pod install` → Open `App.xcworkspace` → Build → Done ✅
