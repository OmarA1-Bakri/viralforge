#!/bin/bash
set -e

echo "🚀 Android Deployment Script"
echo "=============================="

# Change to project root
cd /home/omar/viralforge

# 1. Check for uncommitted changes
if [[ -n $(git status -s) ]]; then
  echo "⚠️  WARNING: Uncommitted changes detected"
  echo "$(git status -s)"
  read -p "Continue anyway? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled"
    exit 1
  fi
fi

# 2. Kill existing dev server
echo "🔄 Stopping dev server..."
pkill -f "tsx.*server/index.ts" || echo "No dev server running"
sleep 2

# 3. Rebuild everything
echo "🔨 Building client and server..."
npm run build

# 4. Increment Android version
echo "📦 Incrementing Android version..."
./scripts/increment-version.sh

# 5. Sync to Android
echo "🔄 Syncing to Android..."
npx cap sync android

# 6. Restart dev server in background
echo "🚀 Starting dev server..."
npm run dev > /tmp/viralforge-server.log 2>&1 &
SERVER_PID=$!
echo "Server PID: $SERVER_PID"
sleep 5

# 7. Verify server is running
echo "🔍 Verifying server status..."
if curl -s http://localhost:5000/api/health > /dev/null; then
  echo "✅ Server running on http://localhost:5000"

  # Get version info
  VERSION_INFO=$(curl -s http://localhost:5000/api/version | jq -r '.server.gitHash // "unknown"')
  echo "📌 Server version: $VERSION_INFO"
else
  echo "❌ Server failed to start - check /tmp/viralforge-server.log"
  exit 1
fi

# 8. Uninstall old APK
echo "🗑️  Uninstalling old APK..."
adb uninstall com.viralforge.ai 2>/dev/null || echo "No existing APK found"

# 9. Deploy new APK
echo "📱 Deploying to Android..."
npx cap run android

echo "✅ Deployment complete!"
echo "📝 Server logs: tail -f /tmp/viralforge-server.log"
