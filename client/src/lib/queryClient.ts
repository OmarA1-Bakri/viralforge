import { QueryClient, QueryFunction } from "@tanstack/react-query";

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
  // For Capacitor apps on Android emulator, use 10.0.2.2 instead of localhost
  if (typeof window !== 'undefined' && (window as any).Capacitor?.getPlatform() === 'android') {
    return 'http://10.0.2.2:5000';
  }
  // For web deployment, use current origin
  return window.location.origin;
};

// Get auth token from Capacitor storage
async function getAuthToken(): Promise<string | null> {
  if (typeof window !== 'undefined' && (window as any).Capacitor) {
    const { Preferences } = await import('@capacitor/preferences');
    const { value } = await Preferences.get({ key: 'auth_token' });
    return value;
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

  const res = await fetch(fullUrl, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
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

    const res = await fetch(fullUrl, {
      headers,
      credentials: "include",
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
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
