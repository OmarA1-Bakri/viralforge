# Capacitor App Testing Guide - ViralForge AI

## Understanding Your App Architecture

ViralForge AI is a **Capacitor hybrid app**:
- **Frontend**: React + TypeScript web app
- **Backend**: Express.js API server
- **Mobile Wrapper**: Capacitor (native WebView container)
- **Not** a native Android app with Camera Kit or TensorFlow

## Step 1: Development Environment Setup

### Prerequisites
1. Node.js and npm installed
2. Android Studio with Android SDK
3. Physical Android device (recommended) or emulator
4. Backend server running

### Initial Setup
```bash
# Install dependencies
npm install

# Build web assets
npm run build

# Sync to Android
npx cap sync android

# Open in Android Studio
npx cap open android
```

## Step 2: Running the App

### Option A: Development with Live Reload (Recommended)

1. **Start Full-Stack Dev Server**
```bash
# This single command starts the Express backend and Vite frontend with live reload
npm run dev
```

2. **Configure Capacitor for Dev Server**

For live reload to work, you need to point Capacitor to your computer's local IP address. Use the mobile development script:

```bash
./mobile-dev.sh android
```

Alternatively, you can manually edit `capacitor.config.ts` and add:

```typescript
// capacitor.config.ts - Add during development only
server: {
  url: 'http://192.168.1.X:5173', // Replace X with your local IP
  cleartext: true
}
```

3. **Run in Android Studio**
- Select your device/emulator
- Click Run ▶️
- App will load from dev server with hot reload

### Option B: Production Build Testing

```bash
# Build production assets
npm run build

# Sync to Android
npx cap sync android

# Open and run in Android Studio
npx cap open android
```

## Step 3: Systematic Testing Checklist

### 🔐 Authentication & Security

**Biometric Authentication:**
- [ ] Does biometric prompt appear on supported devices?
- [ ] Does fallback to password work?
- [ ] What happens on devices without biometric support?
- [ ] Test both fingerprint and face unlock (if available)

**JWT Token Management:**
- [ ] Login persists after app restart
- [ ] Token refresh works properly
- [ ] Logout clears all stored credentials

**Test Steps:**
```javascript
// Check Logcat for auth logs
adb logcat | grep "ViralForge"
```

### 📱 Core Features

**Dashboard & Navigation:**
- [ ] Bottom tab navigation works smoothly
- [ ] All screens load without white flashes
- [ ] Back button behavior is correct
- [ ] Deep links work (if implemented)

**Idea Lab Feed:**
- [ ] Trending content loads from API
- [ ] Infinite scroll works
- [ ] Pull-to-refresh updates data
- [ ] Empty states display correctly
- [ ] Loading states show properly

**LaunchPad Analyzer:**
- [ ] File picker opens correctly
- [ ] Video upload works
- [ ] Analysis results display
- [ ] Error handling for large files
- [ ] Progress indicators work

**Multiplier Processor:**
- [ ] Video processing queue works
- [ ] Status updates in real-time
- [ ] Download processed videos
- [ ] Handle processing failures gracefully

### 📷 Capacitor Plugins

**Camera Plugin:**
- [ ] Camera permission request appears
- [ ] Take photo works
- [ ] Select from gallery works
- [ ] Both front/back cameras work
- [ ] Image quality is acceptable
- [ ] Permissions denial handled gracefully

**Storage & Preferences:**
- [ ] User preferences persist
- [ ] Offline data caching works
- [ ] Clear cache functionality

**Device Features:**
- [ ] Network status detection
- [ ] Device info API works
- [ ] Share functionality (if implemented)

### 🌐 API Connectivity

**Network Requests:**
- [ ] API calls succeed from mobile app
- [ ] Loading states appear during requests
- [ ] Error messages are user-friendly
- [ ] Retry logic works
- [ ] Request timeouts handled

**Test Different Scenarios:**
```bash
# Check network requests in Logcat
adb logcat | grep "fetch\|axios\|network"
```

- [ ] WiFi connection
- [ ] Mobile data connection
- [ ] Slow 3G simulation
- [ ] Offline mode
- [ ] Switching between networks

### 💾 Offline Functionality

**IndexedDB Storage:**
- [ ] Data caches when online
- [ ] App works offline (cached data)
- [ ] Sync when coming back online
- [ ] Conflict resolution works

**Test Steps:**
1. Use app while online
2. Enable airplane mode
3. Verify cached content accessible
4. Disable airplane mode
5. Verify sync occurs

### 📊 Analytics & Monitoring

**PostHog Integration:**
- [ ] Events tracked correctly
- [ ] Session recording works (if enabled)
- [ ] User properties set
- [ ] Feature flags load

**Check in PostHog Dashboard:**
- Recent events appear
- User identified correctly
- Screen views tracked

### 🎨 UI/UX Testing

**Responsive Design:**
- [ ] Works on phones (small, medium, large)
- [ ] Works on tablets
- [ ] Landscape orientation works
- [ ] Portrait orientation works
- [ ] Rotation handles smoothly

**Dark Theme:**
- [ ] Consistent across all screens
- [ ] No white flashes
- [ ] Status bar color correct
- [ ] Splash screen matches theme

**Interactions:**
- [ ] Buttons have proper touch targets (44x44dp min)
- [ ] Animations smooth (60fps)
- [ ] Scrolling smooth
- [ ] No layout shifts
- [ ] Haptic feedback (if implemented)

### ⚡ Performance Testing

**Memory Usage:**
```bash
# Monitor memory via ADB
adb shell dumpsys meminfo com.viralforge.ai
```

- [ ] Memory stays stable (no leaks)
- [ ] No excessive memory growth
- [ ] App survives background/foreground cycles

**Battery Usage:**
- [ ] No abnormal battery drain
- [ ] Background tasks behave correctly
- [ ] Wake locks released properly

**Load Testing:**
- [ ] Large lists scroll smoothly
- [ ] Many images load efficiently
- [ ] Video playback is smooth
- [ ] No ANRs (App Not Responding)

## Step 4: Debugging Tools & Techniques

### Chrome DevTools (Recommended)

**Connect to WebView:**
1. Enable USB debugging on device
2. Connect device via USB
3. Open Chrome: `chrome://inspect`
4. Click "inspect" under your app
5. Full access to React DevTools, Console, Network tab

**Debugging Steps:**
```javascript
// Add debug logs
console.log('API response:', data);
console.error('Error occurred:', error);

// Check network requests
// Use Network tab in Chrome DevTools

// Inspect React components
// Use React DevTools extension
```

### Logcat (Native Logs)

**Filter for Your App:**
```bash
# All logs
adb logcat

# Filter by package
adb logcat | grep "com.viralforge.ai"

# Filter by tag
adb logcat -s CapacitorPlugin
adb logcat -s Capacitor

# Clear logs first
adb logcat -c
```

**Common Error Patterns:**
- `FATAL EXCEPTION` - App crash
- `ANR` - App Not Responding
- `E/` - Error logs
- `W/` - Warning logs

### Android Studio Profiler

**Monitor Performance:**
1. Run app from Android Studio
2. Open Profiler (View → Tool Windows → Profiler)
3. Monitor:
   - CPU usage
   - Memory allocation
   - Network activity
   - Battery usage

## Step 5: Common Issues & Solutions

### Issue: White Screen on Launch

**Causes:**
- Build not synced
- API server not running
- WebView error

**Solutions:**
```bash
# Rebuild and sync
npm run build
npx cap sync android

# Check Chrome inspect for console errors
# Start backend server
npm run dev
```

### Issue: API Calls Fail

**Causes:**
- CORS issues
- Backend not running
- Wrong API URL
- Network security config

**Solutions:**
```bash
# Check API is accessible
curl http://localhost:5000/api/health

# Verify network security config
# android/app/src/main/res/xml/network_security_config.xml
```

### Issue: Camera Not Working

**Causes:**
- Permissions not granted
- Plugin not synced
- Emulator limitations

**Solutions:**
```bash
# Check permissions in AndroidManifest.xml
# Test on real device
# Re-sync Capacitor
npx cap sync android
```

### Issue: Biometric Auth Fails

**Causes:**
- No biometric enrolled on device
- Plugin not configured
- Emulator doesn't support biometrics

**Solutions:**
- Test on real device with enrolled biometrics
- Check plugin installation
- Implement fallback to password

### Issue: Build Fails

**Solutions:**
```bash
# Clean build
cd android
./gradlew clean

# Invalidate caches in Android Studio
# File → Invalidate Caches / Restart

# Re-sync Capacitor
npx cap sync android
```

## Step 6: Pre-Release Testing

### Release Build Testing

```bash
# Build release AAB
npm run build
npx cap sync android
cd android
./gradlew bundleRelease

# Test release build
# Extract universal APK from AAB
bundletool build-apks --bundle=app/build/outputs/bundle/release/app-release.aab --output=app-release.apks --mode=universal

# Install and test
adb install -r app-release.apks
```

### Critical Pre-Launch Checks

- [ ] All API endpoints use HTTPS in production
- [ ] API keys secured (not in git)
- [ ] Debug logs removed/disabled
- [ ] Analytics configured correctly
- [ ] ProGuard rules tested
- [ ] No console.log in production
- [ ] Error tracking setup (Sentry)
- [ ] Privacy policy accessible
- [ ] Terms of service accessible

## Step 7: Test Automation (Future)

### E2E Testing with Playwright

```bash
# Install Playwright
npm install -D @playwright/test

# Run tests
npm run test:e2e
```

### Unit Testing

```bash
# Run Jest tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

## Debugging Checklist Summary

**Before Each Test Session:**
- [ ] Backend server running
- [ ] Latest code synced to Android
- [ ] Chrome DevTools connected
- [ ] Logcat ready for monitoring

**During Testing:**
- [ ] Monitor console for errors
- [ ] Check network requests
- [ ] Watch for memory leaks
- [ ] Test all user flows
- [ ] Try edge cases

**After Finding Issues:**
- [ ] Document steps to reproduce
- [ ] Check logs for stack traces
- [ ] Test fix on multiple devices
- [ ] Verify fix doesn't break other features

## Resources

- [Capacitor Docs](https://capacitorjs.com/docs)
- [Chrome DevTools Guide](https://developer.chrome.com/docs/devtools/)
- [Android Debug Bridge (ADB)](https://developer.android.com/studio/command-line/adb)
- [React DevTools](https://react.dev/learn/react-developer-tools)

---

**Next Steps:** Follow this guide step-by-step, documenting any issues you encounter. Focus on Chrome DevTools for frontend debugging and Logcat for native layer issues.
