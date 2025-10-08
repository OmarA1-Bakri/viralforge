import { getIdToken } from './firebase';
import { mobileRequest } from './mobileRequest';

/**
 * OAuth API Client
 *
 * Handles communication with backend OAuth endpoints
 * Automatically includes Firebase ID token for authentication
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

async function apiRequest(method: string, endpoint: string, body?: any) {
  const idToken = await getIdToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (idToken) {
    headers['Authorization'] = `Bearer ${idToken}`;
  }

  const response = await mobileRequest(`${API_BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Connect YouTube account
 * Sends OAuth access token to backend for storage
 */
export async function connectYouTube(accessToken: string, refreshToken?: string, expiresIn?: number) {
  return apiRequest('POST', '/api/oauth/youtube/connect', {
    accessToken,
    refreshToken,
    expiresIn,
    scope: 'https://www.googleapis.com/auth/youtube.readonly',
  });
}

/**
 * Check YouTube connection status
 */
export async function getYouTubeStatus() {
  return apiRequest('GET', '/api/oauth/youtube/status');
}

/**
 * Disconnect YouTube account
 */
export async function disconnectYouTube() {
  return apiRequest('DELETE', '/api/oauth/youtube/disconnect');
}

/**
 * Get connection status for all platforms
 */
export async function getOAuthStatus() {
  return apiRequest('GET', '/api/oauth/status');
}
