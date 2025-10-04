# ViralForge Android Deployment Guide

## Understanding the Architecture

**CRITICAL**: The Android APK and server are SEPARATE systems:

- **Android APK** = Client-side React code (from `dist/public/`)
- **Dev Server** = Server-side Node.js code (from `dist/index.js`)
- **Connection**: Android connects to `http://10.0.2.2:5000` (localhost:5000 on host machine)

## When to Deploy What

### Server-Only Changes (auth.ts, storage-postgres.ts, routes.ts, etc.)
```bash
# Server now has --watch flag, so changes auto-reload
# No need to manually restart!

# If you need to manually restart:
pkill -f "tsx.*server/index.ts"
npm run dev
```

### Client-Only Changes (React components, UI, styles)
```bash
# 1. Build client
npm run build

# 2. Increment version
./scripts/increment-version.sh

# 3. Sync to Android
npx cap sync android

# 4. Uninstall old APK
adb uninstall com.viralforge.ai

# 5. Deploy new APK
npx cap run android
```

### Both Server + Client Changes
```bash
# Use the automated deployment script
./scripts/deploy-android.sh
```

## Deployment Scripts

### scripts/deploy-android.sh
Complete deployment automation:
- Checks for uncommitted changes
- Kills old server
- Rebuilds client and server
- Auto-increments Android version
- Syncs to Android
- Restarts server with new code
- Verifies server is running
- Uninstalls old APK
- Deploys new APK

### scripts/increment-version.sh
Auto-increments Android versionCode in `android/app/build.gradle`

## Verification

### Check Server Version
```bash
curl http://localhost:5000/api/version | jq
```

### Check Android Version
Look at bottom-right corner of app for git hash (e.g., "a1b2c3d")

### View Server Logs
```bash
tail -f /tmp/viralforge-server.log
```

## Common Issues

### "Wrong version deployed"
**Root Cause**: Android APK doesn't contain server code

**Solution**:
- Server changes: Just restart dev server (or wait for --watch to reload)
- Client changes: Rebuild APK and increment version
- Both: Use `./scripts/deploy-android.sh`

### "APK not updating"
**Root Cause**: Android caching old APK with same versionCode

**Solution**:
- Always run `./scripts/increment-version.sh` before deployment
- Or manually increment versionCode in `android/app/build.gradle`
- Uninstall old APK: `adb uninstall com.viralforge.ai`

### "Server changes not reflected"
**Root Cause**: TSX watch mode may not have detected changes

**Solution**:
```bash
pkill -f "tsx.*server/index.ts"
npm run dev
```

## Version Tracking

- **Server Version**: Shown in `/api/version` endpoint (git hash, branch, build time)
- **Client Version**: Displayed in bottom-right corner of app (7-char git hash)
- **Android Version**: versionCode in `android/app/build.gradle`

## Quick Commands

```bash
# Full automated deployment
./scripts/deploy-android.sh

# Server-only restart
pkill -f "tsx.*server/index.ts" && npm run dev

# Increment version manually
./scripts/increment-version.sh

# Check versions
curl http://localhost:5000/api/version | jq
```
