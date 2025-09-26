import { PostHog } from 'posthog-node';

// PostHog configuration
const POSTHOG_API_KEY = process.env.POSTHOG_API_KEY;
const POSTHOG_HOST = process.env.POSTHOG_HOST || 'https://us.i.posthog.com';

let posthog: PostHog | null = null;

// Initialize PostHog
function initPostHog(): PostHog | null {
  if (posthog) return posthog;
  
  if (!POSTHOG_API_KEY) {
    console.warn('⚠️  PostHog API key not found. Server analytics disabled.');
    return null;
  }

  try {
    posthog = new PostHog(POSTHOG_API_KEY, {
      host: POSTHOG_HOST,
    });
    
    console.log('📊 Server analytics initialized');
    return posthog;
  } catch (error) {
    console.error('❌ Failed to initialize server analytics:', error);
    return null;
  }
}

export const serverAnalytics = {
  // Initialize (call this at server startup)
  init(): void {
    initPostHog();
  },

  // Track backend events
  track(userId: string, eventName: string, properties?: Record<string, any>): void {
    const client = initPostHog();
    if (!client) return;

    try {
      client.capture({
        distinctId: userId,
        event: eventName,
        properties: {
          timestamp: new Date().toISOString(),
          ...properties
        }
      });
    } catch (error) {
      console.error('Failed to track server event:', error);
    }
  },

  // Identify user
  identify(userId: string, properties?: Record<string, any>): void {
    const client = initPostHog();
    if (!client) return;

    try {
      client.identify({
        distinctId: userId,
        properties
      });
    } catch (error) {
      console.error('Failed to identify user on server:', error);
    }
  },

  // Backend-specific events
  trackTrendDiscovery(userId: string, platform: string, trendsCount: number, properties?: Record<string, any>): void {
    this.track(userId, 'server_trend_discovery', {
      platform,
      trends_count: trendsCount,
      source: 'backend',
      ...properties
    });
  },

  trackContentAnalysisRequest(userId: string, platform: string, analysisType: string, properties?: Record<string, any>): void {
    this.track(userId, 'server_content_analysis', {
      platform,
      analysis_type: analysisType,
      source: 'backend',
      ...properties
    });
  },

  trackVideoProcessingRequest(userId: string, videoDuration?: number, properties?: Record<string, any>): void {
    this.track(userId, 'server_video_processing', {
      video_duration: videoDuration,
      source: 'backend',
      ...properties
    });
  },

  trackClipGenerationComplete(userId: string, clipCount: number, properties?: Record<string, any>): void {
    this.track(userId, 'server_clip_generation', {
      clip_count: clipCount,
      source: 'backend',
      ...properties
    });
  },

  trackAPIUsage(userId: string, endpoint: string, method: string, responseTime: number, statusCode: number): void {
    this.track(userId, 'api_request', {
      endpoint,
      method,
      response_time: responseTime,
      status_code: statusCode,
      source: 'backend'
    });
  },

  trackErrorEvent(userId: string, errorType: string, errorMessage: string, properties?: Record<string, any>): void {
    this.track(userId, 'server_error', {
      error_type: errorType,
      error_message: errorMessage,
      source: 'backend',
      ...properties
    });
  },

  trackPreferencesSaved(userId: string, preferences: any): void {
    this.track(userId, 'server_preferences_saved', {
      niche: preferences.niche,
      target_audience: preferences.targetAudience,
      content_style: preferences.contentStyle,
      platforms_count: preferences.preferredPlatforms?.length || 0,
      categories_count: preferences.preferredCategories?.length || 0,
      source: 'backend'
    });
  },

  // Clean shutdown
  async shutdown(): Promise<void> {
    if (posthog) {
      await posthog.shutdown();
      console.log('📊 Analytics service shut down');
    }
  }
};

// Initialize on import
serverAnalytics.init();

export default serverAnalytics;