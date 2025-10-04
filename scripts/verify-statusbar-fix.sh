#!/bin/bash
# Status Bar Fix Verification Script
# Run this before testing to ensure all components are properly configured

set -e

echo "🔍 Verifying Android Status Bar Fix Implementation..."
echo ""

# Check 1: StatusBar plugin installed
echo "✓ Checking @capacitor/status-bar plugin..."
if npm list @capacitor/status-bar --depth=0 2>/dev/null | grep -q "@capacitor/status-bar"; then
  echo "  ✅ StatusBar plugin installed"
else
  echo "  ❌ StatusBar plugin NOT found"
  echo "  Run: npm install @capacitor/status-bar"
  exit 1
fi

# Check 2: statusBarHeight.ts exists
echo ""
echo "✓ Checking statusBarHeight.ts module..."
if [ -f "client/src/lib/statusBarHeight.ts" ]; then
  echo "  ✅ statusBarHeight.ts exists"

  # Verify key functions
  if grep -q "getStatusBarHeight" client/src/lib/statusBarHeight.ts && \
     grep -q "applyStatusBarHeightCSS" client/src/lib/statusBarHeight.ts && \
     grep -q "setupStatusBarHeightListener" client/src/lib/statusBarHeight.ts; then
    echo "  ✅ All required functions present"
  else
    echo "  ⚠️  Some functions may be missing"
  fi
else
  echo "  ❌ statusBarHeight.ts NOT found"
  exit 1
fi

# Check 3: main.tsx imports and calls
echo ""
echo "✓ Checking main.tsx initialization..."
if grep -q "import.*statusBarHeight" client/src/main.tsx && \
   grep -q "applyStatusBarHeightCSS" client/src/main.tsx; then
  echo "  ✅ main.tsx properly imports and calls status bar functions"
else
  echo "  ❌ main.tsx missing status bar initialization"
  exit 1
fi

# Check 4: CSS variable definition
echo ""
echo "✓ Checking CSS configuration..."
if grep -q "\-\-status-bar-height" client/src/index.css && \
   grep -q "calc(var(\-\-status-bar-height)" client/src/index.css; then
  echo "  ✅ CSS uses --status-bar-height variable"
else
  echo "  ❌ CSS not properly configured for status bar"
  exit 1
fi

# Check 5: Capacitor config
echo ""
echo "✓ Checking Capacitor configuration..."
if grep -q "overlaysWebView.*true" capacitor.config.ts; then
  echo "  ✅ StatusBar overlaysWebView enabled"
else
  echo "  ⚠️  overlaysWebView may not be enabled"
fi

# Check 6: Android styles.xml
echo ""
echo "✓ Checking Android styles configuration..."
if [ -f "android/app/src/main/res/values/styles.xml" ]; then
  if grep -q "windowTranslucentStatus" android/app/src/main/res/values/styles.xml; then
    echo "  ✅ Android edge-to-edge configured"
  else
    echo "  ⚠️  Android may need edge-to-edge configuration"
  fi
else
  echo "  ⚠️  styles.xml not found (may need to sync)"
fi

# Check 7: Component headers
echo ""
echo "✓ Checking component headers..."
COMPONENTS=(
  "client/src/components/CreatorDashboard.tsx"
  "client/src/components/IdeaLabFeed.tsx"
  "client/src/components/LaunchPadAnalyzer.tsx"
  "client/src/components/MultiplierProcessor.tsx"
)

FIXED_COUNT=0
for component in "${COMPONENTS[@]}"; do
  if [ -f "$component" ]; then
    component_name=$(basename "$component")
    if grep -q "safe-area-top" "$component"; then
      echo "  ✅ $component_name uses safe-area-top"
      FIXED_COUNT=$((FIXED_COUNT + 1))
    else
      echo "  ❌ $component_name missing safe-area-top"
    fi
  fi
done

echo ""
echo "  $FIXED_COUNT/4 components configured"

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Verification Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $FIXED_COUNT -eq 4 ]; then
  echo "✅ All core components verified"
  echo ""
  echo "🚀 Next steps:"
  echo "  1. npm run build"
  echo "  2. npx cap sync android"
  echo "  3. npx cap open android"
  echo "  4. Run on device/emulator and test"
  echo ""
  echo "📖 See ANDROID_STATUS_BAR_FIX.md for testing guide"
  exit 0
else
  echo "⚠️  Some components need attention"
  echo ""
  echo "Please review the output above and fix any issues."
  exit 1
fi
