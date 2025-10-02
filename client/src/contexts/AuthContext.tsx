import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { secureStorage } from '@/lib/mobileStorage';
import { analytics } from '@/lib/analytics';

export interface User {
  id: string;
  username: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (username: string, password: string, subscriptionTier?: string) => Promise<{ success: boolean; error?: string }>;
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

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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
      const response = await fetch(`${API_BASE_URL}/auth/validate`, {
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
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
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
        return { success: false, error: data.message || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (username: string, password: string, subscriptionTier: string = 'free'): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password, subscriptionTier }),
      });

      const data = await response.json();

      if (response.ok && data.token) {
        setToken(data.token);
        setUser(data.user);
        await secureStorage.setAuthToken(data.token);
        
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
        return { success: false, error: data.message || 'Registration failed' };
      }
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'Network error. Please try again.' };
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