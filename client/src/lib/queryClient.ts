import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { mobileRequest } from '@/lib/mobileRequest';

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Get API base URL - same logic as AuthContext for consistency
const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  // For Capacitor apps on Android emulator IN DEVELOPMENT ONLY
  if (import.meta.env.DEV && typeof window !== 'undefined' && (window as any).Capacitor?.getPlatform() === 'android') {
    return 'http://10.0.2.2:5000';
  }
  // Production fallback - fail loudly if VITE_API_BASE_URL not set
  if (import.meta.env.PROD) {
    throw new Error('VITE_API_BASE_URL is required in production but not configured');
  }
  // For web deployment, use current origin
  return window.location.origin;
};

// Get auth token from Capacitor storage or localStorage
async function getAuthToken(): Promise<string | null> {
  // Try Capacitor first (mobile)
  if (typeof window !== 'undefined' && (window as any).Capacitor) {
    const { Preferences } = await import('@capacitor/preferences');
    const { value } = await Preferences.get({ key: 'auth_token' });
    if (value) return value;
  }

  // Fallback to localStorage (web)
  if (typeof window !== 'undefined' && window.localStorage) {
    const token = window.localStorage.getItem('auth_token');
    if (token) return token;
  }

  return null;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const fullUrl = url.startsWith('http') ? url : `${getApiBaseUrl()}${url}`;

  // Get auth token and add to headers
  const token = await getAuthToken();
  const headers: Record<string, string> = data ? { "Content-Type": "application/json" } : {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Debug logging (development only)
  if (process.env.NODE_ENV === 'development') {
    console.log('[apiRequest]', { method, url: fullUrl, hasToken: !!token });
  }

  // Use shared mobileRequest utility
  const res = await mobileRequest(fullUrl, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey.join("/") as string;
    const fullUrl = url.startsWith('http') ? url : `${getApiBaseUrl()}${url}`;

    // Get auth token and add to headers
    const token = await getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Use shared mobileRequest utility
    const res = await mobileRequest(fullUrl, {
      method: 'GET',
      headers,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes instead of Infinity to prevent stale data
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
