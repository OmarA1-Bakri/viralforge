# Android App Shipping Checklist for ViralForge AI

## ✅ Completed (Production Ready)

### Build Configuration
- [x] Targeting Android 15 (API 35)
- [x] minSDK 23 (95%+ device coverage)
- [x] Gradle 8.13 + AGP 8.13.0 (latest)
- [x] Build optimizations enabled
- [x] R8/ProGuard enabled with proper rules
- [x] Code shrinking & obfuscation configured
- [x] Android App Bundle (AAB) ready

### Security
- [x] Network security config implemented
- [x] Modern granular permissions (API 33+)
- [x] `allowBackup=false` for security
- [x] ProGuard rules for Capacitor plugins
- [x] HTTPS enforced via `androidScheme`

### App Configuration
- [x] Package name: `com.viralforge.ai`
- [x] App name: ViralForgeAI
- [x] Capacitor plugins configured
- [x] Biometric authentication ready

## 🔧 Required Actions Before First Release

### 1. App Signing Setup (Critical)

**Generate Upload Keystore:**
```bash
cd android
keytool -genkey -v -keystore upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```

**Create keystore.properties:**
```bash
cp keystore.properties.example keystore.properties
# Edit keystore.properties with your actual values
```

**Store Keystore Securely:**
- Keep `upload-keystore.jks` in a secure location
- Back up to password manager (1Password, BitWarden, etc.)
- **NEVER commit to git** (already in .gitignore)

### 2. Google Play Console Setup

**Create App Listing:**
1. Go to [Google Play Console](https://play.google.com/console)
2. Create new app
3. Enable **Google Play App Signing** (recommended)

**Required Information:**
- App name: ViralForge AI
- Short description (80 chars)
- Full description (4000 chars)
- App category: Productivity / Social
- Content rating questionnaire
- Privacy policy URL
- Support email

### 3. Store Assets (Required)

**Screenshots (minimum 2, max 8 per type):**
- Phone: 1080x1920 to 7680x14336
- 7-inch tablet: 2048x1536 recommended
- 10-inch tablet: 2560x1600 recommended

**Graphic Assets:**
- Feature graphic: 1024x500 (required)
- App icon: 512x512
- Promo video (optional): YouTube link

### 4. Privacy & Compliance

**Data Safety Section:**
- Declare all data collection practices
- Location access justification
- Camera/media permissions explanation
- Third-party SDK data sharing (if any)

**Required Documents:**
- Privacy policy (hosted, accessible URL)
- Terms of service (recommended)

### 5. Testing & QA

**Pre-Launch Testing:**
```bash
# Build release AAB
npx cap sync android
cd android
./gradlew bundleRelease

# Output: android/app/build/outputs/bundle/release/app-release.aab
```

**Test Checklist:**
- [ ] Install release build on physical device
- [ ] Test all core features
- [ ] Verify biometric authentication
- [ ] Check network calls (all HTTPS)
- [ ] Test offline functionality
- [ ] Verify analytics tracking (PostHog)
- [ ] Test on multiple Android versions (12, 13, 14, 15)
- [ ] Test on different screen sizes

### 6. Version Management

**For Each Release:**
```gradle
// android/app/build.gradle
versionCode = 1  // Increment for each release
versionName = "1.0.0"  // Semantic versioning
```

## 📱 Build & Release Commands

### Development Build
```bash
npm run dev
npx cap sync android
npx cap open android
# Build from Android Studio
```

### Production Build (AAB)
```bash
# 1. Build web assets
npm run build

# 2. Sync to Android
npx cap sync android

# 3. Build signed AAB
cd android
./gradlew bundleRelease

# Output: android/app/build/outputs/bundle/release/app-release.aab
```

### Test Release Build Locally
```bash
# Generate APKs from AAB for testing
bundletool build-apks --bundle=app-release.aab --output=app-release.apks --mode=universal

# Install on device
adb install -r app-release.apks
```

## 🚀 Publishing Steps

1. **Build Production AAB** (see commands above)
2. **Upload to Play Console**
   - Go to Release → Production
   - Create new release
   - Upload `app-release.aab`
3. **Fill Release Notes**
4. **Review & Roll Out**
   - Start with 10% rollout
   - Monitor for crashes/ANRs
   - Gradually increase to 100%

## 📊 Post-Launch Monitoring

**Google Play Console:**
- Crash reports (Android Vitals)
- ANR (Application Not Responding) rate
- User reviews & ratings
- Install/uninstall metrics

**Analytics (PostHog):**
- User engagement
- Feature usage
- Conversion funnel
- Retention metrics

## 🔄 Update Workflow

For each app update:
1. Increment `versionCode` in `build.gradle`
2. Update `versionName` following semver
3. Update release notes
4. Build and test release AAB
5. Upload to Play Console
6. Staged rollout (10% → 50% → 100%)

## 🆘 Common Issues & Solutions

**Build Fails:**
```bash
# Clean and rebuild
cd android
./gradlew clean
./gradlew bundleRelease
```

**Signing Issues:**
- Verify `keystore.properties` paths
- Check keystore password is correct
- Ensure keystore file exists

**ProGuard Errors:**
- Add missing `-keep` rules to `proguard-rules.pro`
- Test obfuscated build thoroughly
- Check R8 output for warnings

## 📚 Resources

- [Android Developers - Publishing](https://developer.android.com/studio/publish)
- [Google Play Console](https://play.google.com/console)
- [Capacitor Android Guide](https://capacitorjs.com/docs/android)
- [Play App Signing](https://support.google.com/googleplay/android-developer/answer/9842756)

---

**Status:** Ready for production with app signing setup completed.
**Next Steps:** Generate keystore → Create Play Console listing → Build AAB → Upload!
