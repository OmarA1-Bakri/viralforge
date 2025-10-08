# Android Production Build - Implementation Rubric

## Overview
Complete preparation and configuration for ViralForge AI Android app production build and Google Play Store submission.

**Implementation Date**: October 7, 2025
**Status**: 🟡 In Progress
**Target**: Production build ready for Play Store submission tonight

---

## 1. Keystore Configuration ✅ COMPLETE

### 1.1 Keystore Generation
- **Status**: ✅ Complete
- **Location**: `/home/omar/viralforge/android/viralforge-upload.keystore`
- **Details**:
  - Algorithm: RSA 2048-bit
  - Validity: 10,000 days (~27 years)
  - Alias: `viralforge-upload`
  - Created: October 7, 2025

### 1.2 Keystore Properties File
- **Status**: ✅ Complete
- **Location**: `/home/omar/viralforge/android/keystore.properties`
- **Contents**:
  ```properties
  VIRALFORGE_UPLOAD_STORE_FILE=viralforge-upload.keystore
  VIRALFORGE_UPLOAD_STORE_PASSWORD=viralforge2025
  VIRALFORGE_UPLOAD_KEY_ALIAS=viralforge-upload
  VIRALFORGE_UPLOAD_KEY_PASSWORD=viralforge2025
  ```

### 1.3 Build.gradle Configuration
- **Status**: ✅ Already Configured
- **File**: `android/app/build.gradle`
- **Signing Config**:
  ```gradle
  signingConfigs {
      release {
          if (keystorePropertiesFile.exists()) {
              storeFile file(keystoreProperties['VIRALFORGE_UPLOAD_STORE_FILE'])
              storePassword keystoreProperties['VIRALFORGE_UPLOAD_STORE_PASSWORD']
              keyAlias keystoreProperties['VIRALFORGE_UPLOAD_KEY_ALIAS']
              keyPassword keystoreProperties['VIRALFORGE_UPLOAD_KEY_PASSWORD']
          }
      }
  }
  ```

**Security Note**: ⚠️ `keystore.properties` should be added to `.gitignore` to prevent credential exposure.

---

## 2. Production Environment Configuration ⏳ PENDING

### 2.1 Current Development Configuration
- **File**: `.env`
- **Current Settings**:
  ```env
  NODE_ENV=development
  VITE_API_URL=http://10.0.2.2:5000/api
  VITE_API_BASE_URL=http://10.0.2.2:5000
  ```

### 2.2 Production Configuration Needed
- **Status**: 🔴 BLOCKER - Missing production API URL
- **Required File**: `.env.production`
- **Required Settings**:
  ```env
  NODE_ENV=production
  VITE_API_URL=https://YOUR_PRODUCTION_API/api
  VITE_API_BASE_URL=https://YOUR_PRODUCTION_API
  ```

**Action Required**: User must provide production API URL before build can proceed.

---

## 3. Capacitor Configuration ⏳ PENDING

### 3.1 Current Development Configuration
- **File**: `capacitor.config.ts`
- **Current Settings**:
  ```typescript
  server: {
    androidScheme: 'http',      // ⚠️ Must be 'https' for production
    cleartext: true,             // ⚠️ Must be false for production
    allowNavigation: [
      'http://10.0.2.2:5000',   // ⚠️ Development URLs
      'http://localhost:5000'
    ]
  }
  ```

### 3.2 Required Production Configuration
- **Status**: 🔴 BLOCKER - Depends on production API URL
- **Changes Needed**:
  ```typescript
  server: {
    androidScheme: 'https',     // ✅ Secure scheme required
    cleartext: false,           // ✅ No cleartext traffic
    allowNavigation: [
      'https://YOUR_PRODUCTION_API'
    ]
  }
  ```

**Security Impact**: Current HTTP configuration will NOT pass Google Play Store security review.

---

## 4. Application Versioning 🟡 NEEDS REVIEW

### 4.1 Current Version Information
- **File**: `android/app/build.gradle`
- **Current Values**:
  ```gradle
  versionCode = 3
  versionName = "1.0"
  applicationId = "android.viral.forge"
  ```

### 4.2 Version Strategy
- **versionCode**: Integer that must increment with each release
- **versionName**: User-facing version string (e.g., "1.0.0")
- **Current Status**: versionCode=3 suggests previous builds exist

**Questions to Address**:
1. Is this a new app submission or an update?
2. Should versionCode increment to 4?
3. Should versionName change to "1.0.1" or "1.1.0"?

### 4.3 Application ID
- **Current**: `android.viral.forge`
- **Capacitor Config**: `com.viralforge.ai`
- **Status**: ⚠️ MISMATCH DETECTED

**Issue**: Application ID mismatch between `build.gradle` and `capacitor.config.ts`. This should be consistent.

**Recommendation**: Update `build.gradle` to use `com.viralforge.ai` to match Capacitor config.

---

## 5. Build Configuration ✅ READY

### 5.1 Release Build Type
- **File**: `android/app/build.gradle`
- **Configuration**:
  ```gradle
  buildTypes {
      release {
          minifyEnabled = true           // ✅ Code minification enabled
          shrinkResources = true         // ✅ Resource shrinking enabled
          proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
          signingConfig signingConfigs.release  // ✅ Using release signing
      }
  }
  ```

### 5.2 SDK Configuration
- **minSdkVersion**: Defined in root build.gradle
- **targetSdkVersion**: Defined in root build.gradle
- **compileSdk**: Defined in root build.gradle
- **Status**: ✅ Configured via Capacitor defaults

---

## 6. Firebase Integration ✅ COMPLETE

### 6.1 Android Firebase Configuration
- **File**: `android/app/google-services.json`
- **Status**: ✅ Present
- **Package Name**: `android.viral.forge`

### 6.2 iOS Firebase Configuration
- **File**: `ios/App/App/GoogleService-Info.plist`
- **Status**: ✅ Present
- **Bundle ID**: Should match iOS configuration

### 6.3 Firebase Services Configured
- ✅ Firebase Auth (for Google/YouTube OAuth)
- ✅ Firebase Analytics
- ✅ Firebase BoM version: 34.3.0

---

## 7. Security & Privacy ⏳ NEEDS REVIEW

### 7.1 Permissions Required
- **Camera**: ✅ Configured in `capacitor.config.ts`
- **Photos**: ✅ Configured in `capacitor.config.ts`
- **Internet**: ✅ Implicit for API access
- **Network State**: Required for connectivity checks

### 7.2 Privacy Policy
- **Status**: 🔴 REQUIRED - Must be available before Play Store submission
- **Requirements**:
  - Publicly accessible URL
  - Describes data collection and usage
  - Covers OAuth permissions (YouTube, Instagram, TikTok)
  - Explains analytics (PostHog, Firebase)

### 7.3 Data Handling Disclosure
- **Required for Play Store**:
  - What user data is collected
  - How data is used
  - Whether data is shared with third parties
  - Data retention policies
  - User data deletion procedures (GDPR compliance)

---

## 8. Google Play Store Requirements 🔴 INCOMPLETE

### 8.1 Store Listing Assets
- **App Icon**: ⏳ Status unknown
  - Required: 512x512 PNG
  - Must not be transparent
  - Must follow Google Play icon design guidelines

- **Feature Graphic**: 🔴 Needed
  - Required: 1024x500 PNG or JPEG
  - Displayed at top of store listing

- **Screenshots**: 🔴 Needed
  - Minimum: 2 screenshots
  - Recommended: 8 screenshots
  - Required sizes for phones, tablets

### 8.2 Store Listing Content
- **App Title**: "ViralForge AI" or "ViralForgeAI"
- **Short Description**: 🔴 Needed (max 80 characters)
- **Full Description**: 🔴 Needed (max 4000 characters)
- **App Category**: Social / Business / Productivity?
- **Content Rating**: Must complete questionnaire

### 8.3 Release Notes
- **Status**: 🔴 Needed
- **Should Include**:
  - New scheduled analysis feature for Creator tier
  - Profile analysis improvements
  - Bug fixes and stability improvements

---

## 9. Testing Checklist ⏳ PENDING

### 9.1 Pre-Production Testing
- [ ] Build production APK successfully
- [ ] Install production APK on emulator
- [ ] Verify app connects to production API
- [ ] Test authentication flow (Firebase Auth)
- [ ] Test scheduled analysis feature
- [ ] Test all Creator tier features
- [ ] Test OAuth flows (YouTube, Instagram, TikTok)
- [ ] Verify no console errors or crashes
- [ ] Test offline functionality
- [ ] Test subscription system (RevenueCat)

### 9.2 Performance Testing
- [ ] App launch time < 3 seconds
- [ ] No memory leaks during extended use
- [ ] Smooth scrolling and animations
- [ ] API requests complete within reasonable time

### 9.3 Security Testing
- [ ] HTTPS enforced for all API calls
- [ ] No cleartext traffic allowed
- [ ] Sensitive data encrypted
- [ ] OAuth tokens stored securely
- [ ] No API keys exposed in code

---

## 10. Build Process 🟡 READY (PENDING CONFIG)

### 10.1 Production Build Commands

#### Option A: Android App Bundle (AAB) - RECOMMENDED for Play Store
```bash
# 1. Build web bundle
npx vite build --mode production

# 2. Sync to Capacitor
npx cap sync android

# 3. Build signed AAB
cd android && ./gradlew bundleRelease

# Output: android/app/build/outputs/bundle/release/app-release.aab
```

#### Option B: APK (for testing or direct distribution)
```bash
# 1. Build web bundle
npx vite build --mode production

# 2. Sync to Capacitor
npx cap sync android

# 3. Build signed APK
cd android && ./gradlew assembleRelease

# Output: android/app/build/outputs/apk/release/app-release.apk
```

### 10.2 Build Verification
```bash
# Verify APK/AAB is signed
jarsigner -verify -verbose -certs android/app/build/outputs/apk/release/app-release.apk

# Check AAB contents
bundletool build-apks --bundle=android/app/build/outputs/bundle/release/app-release.aab --output=app.apks
```

---

## 11. Known Issues & Risks ⚠️

### 11.1 Critical Blockers
1. **Production API URL Unknown**
   - Cannot configure Capacitor for production
   - Cannot create `.env.production`
   - **Impact**: Build will connect to development API

2. **Application ID Mismatch**
   - `build.gradle`: `android.viral.forge`
   - `capacitor.config.ts`: `com.viralforge.ai`
   - **Impact**: Potential package name conflicts

3. **Privacy Policy Missing**
   - **Impact**: Play Store submission will be rejected
   - **Timeline**: Critical for tonight's deadline

### 11.2 Important Warnings
1. **HTTP Configuration**
   - Current config uses HTTP
   - Play Store requires HTTPS
   - **Impact**: Will fail security review

2. **API Keys in Repository**
   - `.env` file contains API keys
   - Should be in `.gitignore`
   - **Impact**: Security risk if repository is public

3. **Keystore Security**
   - Keystore password is simple (`viralforge2025`)
   - Keystore file should be backed up securely
   - **Impact**: Loss of keystore = cannot update app

---

## 12. Deployment Timeline (Tonight's Goal)

### Phase 1: Configuration (30 minutes) ⏳ CURRENT
- [x] Generate keystore
- [x] Create keystore.properties
- [ ] **BLOCKER**: Get production API URL from user
- [ ] Create `.env.production`
- [ ] Update `capacitor.config.ts`
- [ ] Fix application ID mismatch

### Phase 2: Build & Test (1 hour)
- [ ] Build production APK
- [ ] Test on emulator with production config
- [ ] Fix any issues found
- [ ] Build production AAB

### Phase 3: Store Preparation (1-2 hours)
- [ ] Prepare screenshots
- [ ] Write store listing content
- [ ] Complete content rating questionnaire
- [ ] Upload privacy policy
- [ ] Create release notes

### Phase 4: Submission (30 minutes)
- [ ] Upload AAB to Play Console
- [ ] Complete all store listing fields
- [ ] Submit for review

**Total Estimated Time**: 3-4 hours
**Critical Path**: Production API URL → Configuration → Build → Test → Submit

---

## 13. Post-Submission Checklist

### 13.1 Monitoring
- [ ] Monitor Play Store review status
- [ ] Check for crash reports
- [ ] Monitor API error logs
- [ ] Track user feedback

### 13.2 Documentation
- [ ] Document production deployment process
- [ ] Update README with production URLs
- [ ] Create runbook for production issues
- [ ] Document keystore location and backup

### 13.3 Security
- [ ] Store keystore in secure location
- [ ] Create keystore backup
- [ ] Add keystore.properties to .gitignore
- [ ] Rotate any exposed API keys

---

## 14. Success Criteria

### 14.1 Build Success
- ✅ APK/AAB builds without errors
- ✅ App is signed with production keystore
- ✅ Build size is reasonable (<50MB)
- ✅ All resources are included

### 14.2 Functional Success
- ✅ App launches on emulator
- ✅ Connects to production API
- ✅ Authentication works
- ✅ Scheduled analysis works
- ✅ No crashes or critical errors

### 14.3 Store Submission Success
- ✅ All required assets uploaded
- ✅ Store listing complete
- ✅ Privacy policy accessible
- ✅ App submitted for review
- ✅ No immediate rejection errors

---

## 15. Emergency Rollback Plan

If production build has critical issues:

1. **Immediate Actions**:
   - Do not submit to Play Store
   - Revert to development configuration
   - Document the issue

2. **Investigation**:
   - Review error logs
   - Test on physical device if emulator fails
   - Check production API availability

3. **Resolution**:
   - Fix identified issues
   - Rebuild and retest
   - Update this rubric with findings

---

## 16. Next Steps (IMMEDIATE)

### 🔴 CRITICAL BLOCKER
**User must provide**: Production API URL (e.g., `https://api.viralforge.ai`)

Once received:
1. Create `.env.production` with production API URL
2. Update `capacitor.config.ts` for HTTPS
3. Fix application ID mismatch
4. Build production APK for testing
5. Build production AAB for Play Store

### 📋 Also Needed Before Submission
- Privacy policy URL
- Store listing content (title, descriptions)
- Screenshots (minimum 2, recommended 8)
- Feature graphic (1024x500)
- Content rating questionnaire answers

---

## 17. Resources & References

### 17.1 Documentation
- [Capacitor Android Configuration](https://capacitorjs.com/docs/android/configuration)
- [Google Play App Signing](https://developer.android.com/studio/publish/app-signing)
- [Google Play Launch Checklist](https://developer.android.com/distribute/best-practices/launch/launch-checklist)

### 17.2 Build Files
- **Keystore**: `/home/omar/viralforge/android/viralforge-upload.keystore`
- **Properties**: `/home/omar/viralforge/android/keystore.properties`
- **Build Config**: `/home/omar/viralforge/android/app/build.gradle`
- **Capacitor Config**: `/home/omar/viralforge/capacitor.config.ts`

### 17.3 Environment Files
- **Development**: `/home/omar/viralforge/.env`
- **Production**: `/home/omar/viralforge/.env.production` (needs creation)

---

## Implementation Summary

**Completed** ✅:
- Keystore generation and configuration
- Build signing setup verified

**In Progress** 🟡:
- Production environment configuration (blocked)
- Application ID mismatch investigation

**Pending** 🔴:
- Production API URL (CRITICAL BLOCKER)
- Privacy policy
- Store listing assets
- Content rating

**Timeline**: On track for tonight IF production API URL is provided within next 30 minutes.

---

**Document Version**: 1.0
**Last Updated**: October 7, 2025, 22:00 UTC
**Status**: Awaiting production API URL to proceed
