import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { secureStorage } from '@/lib/mobileStorage';
import { analytics } from '@/lib/analytics';
import { revenueCat } from '@/lib/revenueCat';
import { mobileRequest } from '@/lib/mobileRequest';

export interface User {
  id: string;
  username: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (username: string, password: string, subscriptionTier?: string, email?: string, fullName?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

// Get API base URL - same logic as queryClient for consistency
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
  return window.location.origin;
};

const API_BASE_URL = getApiBaseUrl();

// Log the API URL being used for debugging
console.log('[AuthContext] API_BASE_URL:', API_BASE_URL);
console.log('[AuthContext] Environment:', import.meta.env);

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load token from secure storage on app start
  useEffect(() => {
    const loadSavedToken = async () => {
      const savedToken = await secureStorage.getAuthToken();
      if (savedToken) {
        setToken(savedToken);
        // Validate token and get user info
        validateToken(savedToken);
      } else {
        setIsLoading(false);
      }
    };
    
    loadSavedToken();
  }, []);

  const validateToken = async (token: string) => {
    try {
      const response = await mobileRequest(`${API_BASE_URL}/api/auth/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData.user);
        setToken(token);
        // Identify user in analytics
        analytics.identify(userData.user.id, {
          username: userData.user.username
        });
      } else {
        // Token is invalid, clear it
        await secureStorage.removeAuthToken();
        setToken(null);
        setUser(null);
      }
    } catch (error) {
      console.error('Token validation error:', error);
      await secureStorage.removeAuthToken();
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const loginUrl = `${API_BASE_URL}/api/auth/login`;
      console.log('[AuthContext] Logging in at:', loginUrl);

      const response = await mobileRequest(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok && data.token) {
        setToken(data.token);
        setUser(data.user);
        await secureStorage.setAuthToken(data.token);

        // ✅ CRITICAL FIX: Only call RevenueCat if it's actually initialized
        // RevenueCat is currently disabled for testing and requires Play Store setup
        // This prevents blocking the auth flow with RevenueCat errors
        // Remove this check once RevenueCat is properly configured
        const isRevenueCatReady = false; // TODO: Check revenueCat.initialized when re-enabling
        if (isRevenueCatReady) {
          try {
            await revenueCat.loginUser(data.user.id);
            await revenueCat.syncSubscriptionWithBackend();
          } catch (error) {
            console.error('[AuthContext] RevenueCat optional feature failed:', error);
          }
        }

        // Track login event
        analytics.trackLogin('password', {
          username: data.user.username,
          user_id: data.user.id
        });

        // Identify user in analytics
        analytics.identify(data.user.id, {
          username: data.user.username
        });

        return { success: true };
      } else {
        // ✅ CRITICAL FIX: Check data.error first (backend returns 'error' field, not 'message')
        return { success: false, error: data.error || data.message || 'Login failed' };
      }
    } catch (error) {
      console.error('[AuthContext] Login error:', error);
      console.error('[AuthContext] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        url: loginUrl // ✅ CRITICAL FIX: Use actual variable name, not hardcoded wrong URL
      });
      return { success: false, error: 'Network error. Please check your connection and try again.' };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (username: string, password: string, subscriptionTier: string = 'free', email?: string, fullName?: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const registerUrl = `${API_BASE_URL}/api/auth/register`;
      console.log('[AuthContext] Registering at:', registerUrl);

      const response = await mobileRequest(registerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password, subscriptionTier, email, fullName }),
      });

      const data = await response.json();

      if (response.ok && data.token) {
        setToken(data.token);
        setUser(data.user);
        await secureStorage.setAuthToken(data.token);

        // ✅ CRITICAL FIX: Only call RevenueCat if it's actually initialized
        const isRevenueCatReady = false; // TODO: Check revenueCat.initialized when re-enabling
        if (isRevenueCatReady) {
          try {
            await revenueCat.loginUser(data.user.id);
            await revenueCat.syncSubscriptionWithBackend();
          } catch (error) {
            console.error('[AuthContext] RevenueCat optional feature failed:', error);
          }
        }

        // Track signup event
        analytics.trackSignup('password', {
          username: data.user.username,
          user_id: data.user.id
        });

        // Identify user in analytics
        analytics.identify(data.user.id, {
          username: data.user.username
        });

        return { success: true };
      } else {
        // ✅ CRITICAL FIX: Check data.error first (backend returns 'error' field, not 'message')
        return { success: false, error: data.error || data.message || 'Registration failed' };
      }
    } catch (error) {
      console.error('[AuthContext] Registration error:', error);
      console.error('[AuthContext] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        url: registerUrl // ✅ CRITICAL FIX: Use actual variable name, not hardcoded wrong URL
      });
      return { success: false, error: 'Network error. Please check your connection and try again.' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    // Track logout event before clearing user data
    if (user) {
      analytics.trackLogout({
        username: user.username,
        user_id: user.id
      });
    }

    // Logout from RevenueCat
    try {
      await revenueCat.logoutUser();
    } catch (error) {
      console.error('[AuthContext] RevenueCat logout failed:', error);
    }
    
    setToken(null);
    setUser(null);
    await secureStorage.removeAuthToken();
    
    // Reset analytics
    analytics.reset();
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    register,
    logout,
    isLoading,
    isAuthenticated: !!token && !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};