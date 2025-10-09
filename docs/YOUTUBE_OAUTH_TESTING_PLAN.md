# YouTube OAuth Testing Plan - CRITICAL BEFORE GOOGLE PLAY

**Status:** ⚠️ NOT TESTED YET - BLOCKING ISSUE FOR PRODUCTION

---

## 🚨 CRITICAL ISSUE: Chicken-and-Egg Problem

You mentioned earlier:
> "my keys are not working properly because oauth is not set up properly and i cant do that until i have the thing on google play"

### The Problem:
- Google OAuth consent screen requires **Authorized redirect URIs**
- Redirect URIs must use your **published app's package name**
- But you can't publish the app until OAuth is configured
- **SOLUTION:** Use Firebase Dynamic Links or custom URI scheme

---

## 📋 PRE-DEPLOYMENT TESTING CHECKLIST

### ⚠️ BLOCKERS (Must Fix Before Google Play):

- [ ] **1. Configure Google Cloud OAuth Consent Screen**
  - Create OAuth 2.0 Client ID in Google Cloud Console
  - Add authorized redirect URIs
  - Add YouTube Data API v3 scopes
  - **CRITICAL:** Verify consent screen is published (not in testing mode)

- [ ] **2. Configure Firebase for YouTube OAuth**
  - Enable Google Sign-In in Firebase Console
  - Add Android SHA-1 fingerprint from keystore
  - Verify `google-services.json` is up to date

- [ ] **3. Test YouTube OAuth Flow (Local/Staging)**
  - Test on physical Android device (not emulator)
  - Verify "Sign in with Google" works
  - Verify YouTube scopes are requested
  - Check if access token is stored in database
  - Verify OAuth status endpoint returns `youtube: true`

- [ ] **4. Test YouTube OAuth Flow (Mobile App)**
  - Build and install APK on test device
  - Sign in with Google account
  - Connect YouTube
  - Verify backend receives access token
  - Check encrypted token storage in database

---

## 🧪 DETAILED TEST SCENARIOS

### Test 1: Firebase Google Sign-In
**File:** `client/src/lib/firebase.ts:52-65`

```typescript
// Test steps:
1. Open mobile app
2. Click "Sign in with Google"
3. Select Google account
4. Verify redirect back to app
5. Check if user is authenticated

// Expected behavior:
✅ Google OAuth consent screen appears
✅ User can select account
✅ App receives Firebase ID token
✅ User is logged in

// Common failures:
❌ "Error 400: redirect_uri_mismatch" - OAuth config issue
❌ "Error 10" (Android) - SHA-1 fingerprint not configured
❌ "popup_closed_by_user" - User cancelled sign-in
```

### Test 2: YouTube OAuth Token Storage
**File:** `server/routes/oauth.ts:186-280`

```typescript
// Test steps:
1. After Google sign-in, click "Connect YouTube"
2. Grant YouTube permissions
3. Check server logs for token storage
4. Query database for social_media_tokens table

// Expected behavior:
✅ POST /api/oauth/youtube/connect succeeds
✅ Access token encrypted and stored
✅ Refresh token stored (if provided)
✅ expiresAt timestamp set correctly

// Common failures:
❌ "Invalid access token" - Token verification failed
❌ "ENCRYPTION_KEY_NOT_SET" - Missing env var
❌ Database constraint violation - User not created
```

### Test 3: YouTube API Access
**File:** `server/lib/platforms/youtube.ts`

```typescript
// Test steps:
1. Connect YouTube account
2. Trigger profile analysis
3. Check if YouTube API calls succeed
4. Verify video data is fetched

// Expected behavior:
✅ YouTube Data API v3 calls succeed
✅ Channel data retrieved
✅ Video metadata fetched
✅ Analytics data accessible

// Common failures:
❌ "YouTube quota exceeded" - API limit hit
❌ "Invalid credentials" - Token expired
❌ "Insufficient permissions" - Wrong scopes
```

### Test 4: Token Refresh Flow
**File:** `server/routes/oauth.ts` (token refresh logic)

```typescript
// Test steps:
1. Wait for access token to expire (1 hour)
2. Trigger API call requiring YouTube access
3. Verify token is auto-refreshed
4. Check updated expiresAt in database

// Expected behavior:
✅ Expired token detected
✅ Refresh token used to get new access token
✅ Database updated with new token
✅ API call retried successfully

// Common failures:
❌ Refresh token expired/revoked
❌ No refresh token stored
❌ Infinite retry loop
```

---

## 🔧 REQUIRED CONFIGURATION

### 1. Google Cloud Console Setup

**OAuth Consent Screen:**
```
Application name: ViralForge
User support email: <your-email>
Developer contact: <your-email>
Scopes:
  - https://www.googleapis.com/auth/youtube.readonly
  - https://www.googleapis.com/auth/userinfo.email
  - https://www.googleapis.com/auth/userinfo.profile
Publishing status: Production (NOT Testing)
```

**OAuth 2.0 Client ID:**
```
Application type: Android
Package name: com.viralforge.app
SHA-1 certificate fingerprint: <from your keystore>
```

**Authorized redirect URIs:**
```
https://viralforge-app.firebaseapp.com/__/auth/handler
https://your-domain.com/api/oauth/youtube/callback
```

### 2. Firebase Console Setup

**Authentication > Sign-in method:**
```
✅ Google (Enabled)
Android SHA-1: <from keystore>
Android package name: com.viralforge.app
```

**Project Settings > Your apps > Android app:**
```
Download latest google-services.json
Place in: android/app/google-services.json
```

### 3. Environment Variables

**Required on server:**
```bash
YOUTUBE_CLIENT_ID=<from Google Cloud Console>
YOUTUBE_CLIENT_SECRET=<from Google Cloud Console>
YOUTUBE_REDIRECT_URI=https://your-domain.com/api/oauth/youtube/callback
ENCRYPTION_KEY=<32-byte hex string for token encryption>
```

**Required in mobile app:**
```bash
VITE_FIREBASE_API_KEY=<from firebase config>
VITE_FIREBASE_AUTH_DOMAIN=<from firebase config>
VITE_FIREBASE_PROJECT_ID=<from firebase config>
```

---

## 🐛 DEBUGGING COMMANDS

### Check Keystore SHA-1 Fingerprint:
```bash
keytool -list -v -keystore android/viralforge-upload.keystore -alias upload -storepass <password> -keypass <password>
```

### Test OAuth Endpoint (Local):
```bash
curl -X GET http://localhost:5000/api/oauth/status \
  -H "Authorization: Bearer <firebase-id-token>"
```

### Check Database Token Storage:
```sql
SELECT
  firebase_uid,
  platform,
  token_type,
  expires_at,
  created_at,
  updated_at
FROM social_media_tokens
WHERE platform = 'youtube';
```

### Decrypt Token (Debugging):
```typescript
// server/lib/crypto.ts
import { decrypt } from './crypto';

const encryptedToken = '<from database>';
const decryptedToken = decrypt(encryptedToken);
console.log('Decrypted token:', decryptedToken);
```

---

## 📱 MANUAL TESTING STEPS

### Step 1: Build Test APK
```bash
cd android
./gradlew assembleRelease
adb install app/build/outputs/apk/release/app-release.apk
```

### Step 2: Test Sign-In Flow
1. Open app on physical Android device
2. Navigate to Settings/Account
3. Click "Sign in with Google"
4. **OBSERVE:** Google account picker appears
5. Select account
6. **VERIFY:** Redirect back to app succeeds
7. **CHECK:** User is logged in (Firebase)

### Step 3: Test YouTube Connection
1. Navigate to "Connect Accounts" page
2. Click "Connect YouTube" button
3. **OBSERVE:** OAuth consent screen appears
4. Grant YouTube permissions
5. **VERIFY:** Success message appears
6. **CHECK:** Badge shows "Connected"

### Step 4: Verify Backend
1. Check server logs:
   ```
   [INFO] YouTube OAuth token stored { firebaseUid: '...', platform: 'youtube' }
   ```
2. Query database:
   ```sql
   SELECT * FROM social_media_tokens WHERE platform = 'youtube' ORDER BY created_at DESC LIMIT 1;
   ```
3. Check OAuth status endpoint:
   ```bash
   curl -X GET https://your-domain.com/api/oauth/status \
     -H "Authorization: Bearer <firebase-token>"
   # Expected: { "youtube": true }
   ```

### Step 5: Test Profile Analysis
1. Navigate to Creator Dashboard
2. Click "Analyze Profile"
3. **VERIFY:** YouTube channel data loads
4. **CHECK:** Videos are fetched
5. **OBSERVE:** Viral score calculated

---

## ❌ KNOWN ISSUES & SOLUTIONS

### Issue 1: "redirect_uri_mismatch"
**Cause:** Redirect URI not in OAuth consent screen
**Solution:** Add `https://viralforge-app.firebaseapp.com/__/auth/handler` to authorized URIs

### Issue 2: "Error 10" (Android)
**Cause:** SHA-1 fingerprint not configured in Firebase
**Solution:**
```bash
keytool -list -v -keystore android/viralforge-upload.keystore -alias upload
# Copy SHA-1
# Add to Firebase Console > Project Settings > Your apps > Android
```

### Issue 3: "ENCRYPTION_KEY_NOT_SET"
**Cause:** Missing environment variable on server
**Solution:**
```bash
# Generate encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Add to .env
ENCRYPTION_KEY=<generated-key>
```

### Issue 4: "Invalid credentials"
**Cause:** YouTube Data API not enabled
**Solution:** Enable in Google Cloud Console > APIs & Services > Library

---

## 🚀 POST-TESTING CHECKLIST

Before deploying to Google Play:

- [ ] YouTube OAuth works on 3+ physical devices
- [ ] Token storage verified in database
- [ ] Token refresh tested (wait 1 hour)
- [ ] YouTube API calls succeed
- [ ] Profile analysis works end-to-end
- [ ] Error handling tested (revoke access, network failure)
- [ ] OAuth consent screen published (not in testing mode)
- [ ] Privacy policy URL added to consent screen
- [ ] Terms of service URL added to consent screen

---

## 📊 TEST RESULTS TEMPLATE

```markdown
## YouTube OAuth Test Results

**Date:** _____
**Tester:** _____
**Device:** _____
**Android Version:** _____

### Test 1: Google Sign-In
- [ ] PASS / [ ] FAIL
- Notes: _____

### Test 2: YouTube Connection
- [ ] PASS / [ ] FAIL
- Notes: _____

### Test 3: Token Storage
- [ ] PASS / [ ] FAIL
- Database entry ID: _____

### Test 4: Profile Analysis
- [ ] PASS / [ ] FAIL
- Notes: _____

### Blockers:
- _____

### Next Steps:
- _____
```

---

## 🆘 IF OAUTH STILL DOESN'T WORK

### Option 1: Use Firebase Dynamic Links
Instead of custom redirect URIs, use Firebase Dynamic Links:
```typescript
// firebase.ts
const dynamicLink = await firebase.dynamicLinks().buildShortLink({
  link: 'https://your-domain.com/oauth/callback',
  domainUriPrefix: 'https://viralforge.page.link',
  android: {
    packageName: 'com.viralforge.app'
  }
});
```

### Option 2: Use Custom URI Scheme
Add to `android/app/src/main/AndroidManifest.xml`:
```xml
<intent-filter>
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="viralforge" android:host="oauth" />
</intent-filter>
```

Then use redirect URI: `viralforge://oauth/callback`

---

## 📝 NEXT STEPS

1. **IMMEDIATE:** Configure Google Cloud OAuth consent screen
2. **IMMEDIATE:** Add SHA-1 fingerprint to Firebase
3. **BEFORE DEPLOYMENT:** Test OAuth flow on physical device
4. **BEFORE DEPLOYMENT:** Verify YouTube API access works
5. **POST-DEPLOYMENT:** Monitor OAuth success rate in production

**CRITICAL:** Do NOT submit to Google Play until OAuth is tested and working!
