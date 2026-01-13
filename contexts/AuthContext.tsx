'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  email: string;
  isAuthenticated: boolean;
  isSubscribed: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (email: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);

  // Set client-side flag
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Check authentication on mount (client-side only)
  useEffect(() => {
    console.log('=== AUTH CONTEXT CHECK TRIGGERED ===');
    console.log('isClient:', isClient);
    console.log('typeof window:', typeof window);
    
    if (isClient) {
      console.log('Running checkAuth...');
      checkAuth();
    } else {
      console.log('Not running checkAuth - conditions not met');
    }
  }, [isClient]); // Add isClient back to fix dependency error

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/check', {
        method: 'GET',
        credentials: 'include',
      });
      const result = await response.json();
      
      if (result.authenticated && result.subscriber_email) {
        setUser({
          email: result.subscriber_email,
          isAuthenticated: true,
          isSubscribed: result.user_status === 'subscribed',
        });
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string) => {
    console.log('=== AUTH CONTEXT LOGIN START ===');
    console.log('Email being submitted:', email);
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'auth' }),
        credentials: 'include',
      });
      
      const result = await response.json();
      console.log('Subscribe API response:', result);
      
      // Handle both success and "already subscribed" as successful login
      if (result.success || result.message === 'Email already subscribed' || result.error === 'Email already subscribed') {
        console.log('Login successful, setting user state');
        setUser({
          email: email.toLowerCase(),
          isAuthenticated: true,
          isSubscribed: true,
        });
        console.log('User state after login:', {
          email: email.toLowerCase(),
          isAuthenticated: true,
          isSubscribed: true
        });
      } else {
        console.log('Login failed:', result.error || result.message);
        throw new Error(result.error || result.message);
      }
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      console.log('=== AUTH CONTEXT LOGIN END ===');
      setIsLoading(false);
    }
  };

  const logout = () => {
    console.log('=== AUTH CONTEXT LOGOUT START ===');
    console.log('Current user state before logout:', user);
    setUser(null);
    
    // Show current cookies before clearing
    console.log('Cookies before logout:', document.cookie);
    console.log('Document cookie string length:', document.cookie.length);
    
    // Try to get all cookies individually
    const allCookies = document.cookie.split(';');
    console.log('All cookies found:', allCookies);
    
    // Clear auth cookies with multiple approaches
    const cookies = [
      'is_authenticated=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; sameSite=lax;',
      'subscriber_email=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; sameSite=lax;',
      'is_authenticated=; path=/; domain=localhost; expires=Thu, 01 Jan 1970 00:00:01 GMT; sameSite=lax;',
      'subscriber_email=; path=/; domain=localhost; expires=Thu, 01 Jan 1970 00:00:01 GMT; sameSite=lax;',
      'is_authenticated=; path=/; domain=127.0.0.1; expires=Thu, 01 Jan 1970 00:00:01 GMT; sameSite=lax;',
      'subscriber_email=; path=/; domain=127.0.0.1; expires=Thu, 01 Jan 1970 00:00:01 GMT; sameSite=lax;'
    ];
    
    cookies.forEach((cookie, index) => {
      console.log(`Clearing cookie ${index + 1}:`, cookie);
      document.cookie = cookie;
    });
    
    // Show cookies after clearing
    console.log('Cookies after logout:', document.cookie);
    console.log('Document cookie string length after clearing:', document.cookie.length);
    
    // Also try to clear localStorage
    if (typeof window !== 'undefined') {
      const emailBefore = localStorage.getItem('subscriber_email');
      console.log('LocalStorage email before clearing:', emailBefore);
      localStorage.removeItem('subscriber_email');
      const emailAfter = localStorage.getItem('subscriber_email');
      console.log('LocalStorage email after clearing:', emailAfter);
    }
    
    console.log('=== AUTH CONTEXT LOGOUT END ===');
    
    // Don't re-check auth immediately after logout - let cookies clear properly
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {isClient ? children : (
        <div style={{ visibility: 'hidden' }}>
          {children}
        </div>
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
