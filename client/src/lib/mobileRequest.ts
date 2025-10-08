import { CapacitorHttp, HttpResponse } from '@capacitor/core';

/**
 * Platform detection cache to avoid repeated checks
 */
let platformCache: { isMobile: boolean; platform: string } | null = null;

/**
 * Detects if the app is running on a mobile platform (iOS or Android)
 * Results are cached after first detection
 */
export function isMobilePlatform(): boolean {
  // Return cached result if available
  if (platformCache !== null) return platformCache.isMobile;

  // SSR/Node environment
  if (typeof window === 'undefined') {
    platformCache = { isMobile: false, platform: 'ssr' };
    return false;
  }

  // Check for Capacitor
  const capacitor = (window as any).Capacitor;
  if (!capacitor) {
    platformCache = { isMobile: false, platform: 'web' };
    return false;
  }

  // Detect platform
  const platform = capacitor.getPlatform();
  const isMobile = platform === 'android' || platform === 'ios';
  platformCache = { isMobile, platform };

  if (process.env.NODE_ENV === 'development') {
    console.log('[Platform Detection]', platformCache);
  }

  return isMobile;
}

/**
 * Reset platform detection cache (useful for testing or if Capacitor loads late)
 */
export function resetPlatformDetection() {
  platformCache = null;
}

/**
 * Makes an HTTP request using CapacitorHttp on mobile or fetch on web
 * This is the single source of truth for all network requests in the app
 */
export async function mobileRequest(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const method = options.method || 'GET';
  const headers: Record<string, string> = {};

  // Convert Headers object to plain object
  if (options.headers) {
    if (options.headers instanceof Headers) {
      options.headers.forEach((value, key) => {
        headers[key] = value;
      });
    } else if (typeof options.headers === 'object') {
      Object.assign(headers, options.headers);
    }
  }

  // Debug logging (development only)
  if (process.env.NODE_ENV === 'development') {
    console.log('[mobileRequest]', {
      method,
      url,
      platform: isMobilePlatform() ? 'mobile' : 'web',
      hasAuth: !!headers['Authorization']
    });
  }

  // Use CapacitorHttp on mobile platforms
  if (isMobilePlatform()) {
    try {
      // Safely parse request body
      let requestData: any = undefined;
      if (options.body) {
        if (typeof options.body === 'string') {
          try {
            requestData = JSON.parse(options.body);
          } catch (e) {
            // Body is a string but not JSON - send as-is
            console.warn('[mobileRequest] Non-JSON body provided, sending as-is');
            requestData = options.body;
          }
        } else if (options.body instanceof FormData) {
          // FormData not supported in CapacitorHttp
          throw new Error('FormData not supported in mobile requests. Use JSON instead.');
        } else {
          // Already an object
          requestData = options.body;
        }
      }

      const response: HttpResponse = await CapacitorHttp.request({
        method,
        url,
        headers,
        data: requestData,
      });

      // Convert CapacitorHttp response to fetch Response
      // CapacitorHttp.data is already parsed JSON, so we need to re-stringify it
      // for Response constructor, then it gets parsed again by res.json()
      const responseBody = typeof response.data === 'string'
        ? response.data
        : JSON.stringify(response.data);

      return new Response(responseBody, {
        status: response.status,
        statusText: response.status >= 200 && response.status < 300 ? 'OK' : 'Error',
        headers: new Headers(response.headers || {}),
      });
    } catch (error: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[mobileRequest] CapacitorHttp error:', error);
      }
      throw new Error(`Network request failed: ${error.message || 'Unknown error'}`);
    }
  }

  // Use regular fetch on web
  return fetch(url, {
    ...options,
    credentials: options.credentials || 'include',
  });
}
