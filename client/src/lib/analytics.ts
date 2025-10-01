import posthog from 'posthog-js';

// PostHog configuration
const POSTHOG_API_KEY = import.meta.env.VITE_POSTHOG_API_KEY;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';

let isInitialized = false;

export const analytics = {
  // Initialize PostHog
  init(): void {
    if (isInitialized || !POSTHOG_API_KEY) {
      if (!POSTHOG_API_KEY) {
        console.warn('PostHog API key not found. Analytics disabled.');
      }
      return;
    }

    try {
      posthog.init(POSTHOG_API_KEY, {
        api_host: POSTHOG_HOST,
        person_profiles: 'identified_only', // Only create profiles for identified users
        capture_pageview: true,
        capture_pageleave: true,
        loaded: (posthog) => {
          if (import.meta.env.DEV) {
            console.log('PostHog loaded successfully');
          }
        }
      });
      
      isInitialized = true;
      console.log('📊 Analytics initialized');
    } catch (error) {
      console.error('Failed to initialize analytics:', error);
    }
  },

  // Identify user
  identify(userId: string, properties?: Record<string, any>): void {
    if (!isInitialized) return;
    
    try {
      posthog.identify(userId, properties);
    } catch (error) {
      console.error('Failed to identify user:', error);
    }
  },

  // Track custom event
  track(eventName: string, properties?: Record<string, any>): void {
    if (!isInitialized) return;
    
    try {
      posthog.capture(eventName, properties);
    } catch (error) {
      console.error('Failed to track event:', error);
    }
  },

  // Track page views
  page(pageName?: string, properties?: Record<string, any>): void {
    if (!isInitialized) return;
    
    try {
      posthog.capture('$pageview', {
        $current_url: window.location.href,
        page_name: pageName,
        ...properties
      });
    } catch (error) {
      console.error('Failed to track page view:', error);
    }
  },

  // Set user properties
  setUserProperties(properties: Record<string, any>): void {
    if (!isInitialized) return;
    
    try {
      posthog.people.set(properties);
    } catch (error) {
      console.error('Failed to set user properties:', error);
    }
  },

  // Reset user (logout)
  reset(): void {
    if (!isInitialized) return;
    
    try {
      posthog.reset();
    } catch (error) {
      console.error('Failed to reset analytics:', error);
    }
  },

  // Feature flags
  isFeatureEnabled(flag: string): boolean {
    if (!isInitialized) return false;
    
    try {
      return posthog.isFeatureEnabled(flag) || false;
    } catch (error) {
      console.error('Failed to check feature flag:', error);
      return false;
    }
  },

  // Auth Events
  trackSignup(method: 'password' | 'biometric' = 'password', properties?: Record<string, any>): void {
    this.track('user_signup', {
      method,
      timestamp: new Date().toISOString(),
      ...properties
    });
  },

  trackLogin(method: 'password' | 'biometric' = 'password', properties?: Record<string, any>): void {
    this.track('user_login', {
      method,
      timestamp: new Date().toISOString(),
      ...properties
    });
  },

  trackLogout(properties?: Record<string, any>): void {
    this.track('user_logout', {
      timestamp: new Date().toISOString(),
      ...properties
    });
  },

  // Product Events
  trackTrendDiscovery(platform: string, category?: string, properties?: Record<string, any>): void {
    this.track('trend_discovery', {
      platform,
      category,
      timestamp: new Date().toISOString(),
      ...properties
    });
  },

  trackContentAnalysis(platform: string, contentType: 'title' | 'thumbnail' | 'both', properties?: Record<string, any>): void {
    this.track('content_analysis', {
      platform,
      content_type: contentType,
      timestamp: new Date().toISOString(),
      ...properties
    });
  },

  trackVideoProcessing(videoDuration?: number, properties?: Record<string, any>): void {
    this.track('video_processing', {
      video_duration: videoDuration,
      timestamp: new Date().toISOString(),
      ...properties
    });
  },

  trackClipGeneration(clipCount: number, properties?: Record<string, any>): void {
    this.track('clip_generation', {
      clip_count: clipCount,
      timestamp: new Date().toISOString(),
      ...properties
    });
  },

  trackTrendAction(action: 'saved' | 'liked' | 'used', trendId: number, platform: string, properties?: Record<string, any>): void {
    this.track('trend_action', {
      action,
      trend_id: trendId,
      platform,
      timestamp: new Date().toISOString(),
      ...properties
    });
  },

  trackPreferencesSave(properties?: Record<string, any>): void {
    this.track('preferences_saved', {
      timestamp: new Date().toISOString(),
      ...properties
    });
  },

  trackErrorEvent(errorType: string, errorMessage: string, properties?: Record<string, any>): void {
    this.track('error_occurred', {
      error_type: errorType,
      error_message: errorMessage,
      timestamp: new Date().toISOString(),
      ...properties
    });
  }
};

export default analytics;