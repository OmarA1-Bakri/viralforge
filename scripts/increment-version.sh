#!/bin/bash

# Auto-increment Android versionCode script
BUILD_GRADLE="/home/omar/viralforge/android/app/build.gradle"

if [ ! -f "$BUILD_GRADLE" ]; then
  echo "❌ Error: build.gradle not found at $BUILD_GRADLE"
  exit 1
fi

# Extract current versionCode
CURRENT_VERSION=$(grep "versionCode = " "$BUILD_GRADLE" | sed 's/[^0-9]*//g')

if [ -z "$CURRENT_VERSION" ]; then
  echo "❌ Error: Could not find versionCode in build.gradle"
  exit 1
fi

# Increment version
NEW_VERSION=$((CURRENT_VERSION + 1))

# Update build.gradle
sed -i "s/versionCode = $CURRENT_VERSION/versionCode = $NEW_VERSION/" "$BUILD_GRADLE"

# Verify the change
UPDATED_VERSION=$(grep "versionCode = " "$BUILD_GRADLE" | sed 's/[^0-9]*//g')

if [ "$UPDATED_VERSION" = "$NEW_VERSION" ]; then
  echo "✅ Version incremented: $CURRENT_VERSION → $NEW_VERSION"
  exit 0
else
  echo "❌ Error: Version update failed"
  exit 1
fi
