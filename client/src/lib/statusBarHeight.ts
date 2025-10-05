/**
 * Status Bar Height Detection for Capacitor Android Apps
 *
 * This module provides accurate status bar height detection using:
 * 1. Capacitor StatusBar plugin API
 * 2. WindowInsets fallback via CSS variable injection
 * 3. Safe fallback values based on device density
 */

import { StatusBar } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

type StatusBarInfoWithHeight = Awaited<ReturnType<typeof StatusBar.getInfo>> & {
  height?: number;
};

let cachedStatusBarHeight: number | null = null;

/**
 * Get the accurate status bar height in pixels
 * Returns 0 for web/iOS (handled by safe-area-inset-top)
 */
export async function getStatusBarHeight(): Promise<number> {
  // Return cached value if available
  if (cachedStatusBarHeight !== null) {
    return cachedStatusBarHeight;
  }

  // Web and iOS use CSS env() variables
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() === 'ios') {
    cachedStatusBarHeight = 0;
    return 0;
  }

  // Android-specific detection
  if (Capacitor.getPlatform() === 'android') {
    try {
      // Method 1: Use StatusBar plugin's getInfo API
      const info = await StatusBar.getInfo() as StatusBarInfoWithHeight;
      if (info && typeof info.height === 'number' && info.height > 0) {
        cachedStatusBarHeight = info.height;
        return info.height;
      }
    } catch (error) {
      console.warn('StatusBar.getInfo() failed:', error);
    }

    // Method 2: Calculate from window.visualViewport (Android Chrome feature)
    if (window.visualViewport) {
      const viewportHeight = window.visualViewport.height;
      const windowHeight = window.innerHeight;
      const diff = windowHeight - viewportHeight;

      if (diff > 0 && diff < 100) { // Reasonable status bar height
        cachedStatusBarHeight = diff;
        return diff;
      }
    }

    // Method 3: Use device pixel ratio to estimate
    // Standard Android status bar: 24dp
    // High-density devices: 28-32dp
    const dpr = window.devicePixelRatio || 2;
    const estimatedHeight = Math.round(24 * dpr);

    // Common Android status bar heights based on density
    const fallbackHeight = dpr >= 3 ? 84 : dpr >= 2 ? 56 : 48;

    cachedStatusBarHeight = estimatedHeight || fallbackHeight;
    return cachedStatusBarHeight;
  }

  // Default fallback
  cachedStatusBarHeight = 0;
  return 0;
}

/**
 * Apply status bar height as CSS custom property
 * This creates a --status-bar-height variable available throughout the app
 */
export async function applyStatusBarHeightCSS(): Promise<void> {
  const height = await getStatusBarHeight();

  if (height > 0) {
    document.documentElement.style.setProperty('--status-bar-height', `${height}px`);
    console.log(`✅ Status bar height set: ${height}px`);
  } else {
    // Use CSS env() for iOS
    document.documentElement.style.setProperty('--status-bar-height', 'env(safe-area-inset-top, 0px)');
    console.log('✅ Using CSS env(safe-area-inset-top) for status bar');
  }
}

/**
 * Reset cached height (useful when orientation changes)
 */
export function resetStatusBarHeightCache(): void {
  cachedStatusBarHeight = null;
}

/**
 * Listen for orientation changes and update status bar height
 */
export function setupStatusBarHeightListener(): void {
  if (Capacitor.isNativePlatform()) {
    window.addEventListener('resize', async () => {
      resetStatusBarHeightCache();
      await applyStatusBarHeightCSS();
    });

    // Also listen for orientation change
    window.addEventListener('orientationchange', async () => {
      resetStatusBarHeightCache();
      setTimeout(async () => {
        await applyStatusBarHeightCSS();
      }, 100); // Small delay to let layout settle
    });
  }
}
