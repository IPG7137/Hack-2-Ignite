import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { AuthService, AuthUser, UserRole } from '../services/authService';

export interface AuthContextValue {
  user: AuthUser | null;
  session: Session | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error: string | null }>;
  signUp: (
    email: string,
    password: string,
    metadata?: { fullName?: string; role?: UserRole; departmentName?: string; ward?: string }
  ) => Promise<{ success: boolean; error: string | null }>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 1. Initial active session restoration
    AuthService.getSession()
      .then(({ user: restoredUser, session: restoredSession }) => {
        setUser(restoredUser);
        setSession(restoredSession);
      })
      .catch((err) => {
        console.error('Session restoration failed:', err);
      })
      .finally(() => {
        setLoading(false);
      });

    // 2. Listen to Supabase Auth state events (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED)
    const { unsubscribe } = AuthService.onAuthStateChange((_event, newSession, authUser) => {
      setSession(newSession);
      setUser(authUser);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setError(null);
    setLoading(true);
    const res = await AuthService.signInWithPassword(email, password);
    setLoading(false);
    if (res.error) {
      setError(res.error);
      return { success: false, error: res.error };
    }
    setUser(res.user);
    setSession(res.session);
    return { success: true, error: null };
  };

  const signUp = async (
    email: string,
    password: string,
    metadata?: { fullName?: string; role?: UserRole; departmentName?: string; ward?: string }
  ) => {
    setError(null);
    setLoading(true);
    const res = await AuthService.signUp(email, password, metadata);
    setLoading(false);
    if (res.error) {
      setError(res.error);
      return { success: false, error: res.error };
    }
    return { success: true, error: null };
  };

  const signOut = async () => {
    setLoading(true);
    await AuthService.signOut();
    setUser(null);
    setSession(null);
    setLoading(false);
  };

  const clearError = () => setError(null);

  const value: AuthContextValue = {
    user,
    session,
    isAuthenticated: Boolean(user && session),
    loading,
    error,
    signIn,
    signUp,
    signOut,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};
