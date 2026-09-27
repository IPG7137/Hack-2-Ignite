import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { AuthService, AuthUser, UserRole } from '../services/authService';
import {
  resolveDistrictCredential,
  isStateAdminLogin,
  STATE_ADMIN_CREDENTIAL,
} from '../data/districtCredentials';

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
    metadata?: { fullName?: string; departmentName?: string; ward?: string }
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
        if (restoredUser) {
          setUser(restoredUser);
          setSession(restoredSession);
        } else {
          const savedUser = localStorage.getItem('civicresolve_user');
          if (savedUser) {
            try {
              setUser(JSON.parse(savedUser));
            } catch (_) {}
          } else {
            setUser(null);
          }
        }
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

  const signIn = async (identifier: string, password: string) => {
    setError(null);
    setLoading(true);

    const cleanInput = (identifier || '').trim();
    const cleanPassword = (password || '').trim();

    if (!cleanInput || !cleanPassword) {
      setLoading(false);
      setError('Please provide both your identification and password.');
      return { success: false, error: 'Please provide both your identification and password.' };
    }

    // Convert short IDs to Supabase-compatible email format
    const emailToTry = cleanInput.includes('@')
      ? cleanInput
      : `${cleanInput.toLowerCase().replace(/[^a-z0-9._-]/g, '')}@civicresolve.gov`;

    // ──────────────────────────────────────────────────
    // STEP 1: Resolve identity from district registry
    // This determines district/role BEFORE any Supabase call,
    // so org context is always correct regardless of auth result.
    // ──────────────────────────────────────────────────
    const districtCred = resolveDistrictCredential(cleanInput);
    const isStateAdmin = isStateAdminLogin(cleanInput);

    // ──────────────────────────────────────────────────
    // STEP 2: Set org context in localStorage BEFORE auth
    // This ensures CommandMap and dashboards read correct
    // district context immediately after login resolves.
    // ──────────────────────────────────────────────────
    if (isStateAdmin) {
      localStorage.setItem(
        'civicresolve_org_context',
        JSON.stringify({ organizationType: 'STATE', districtId: null, corporationId: null })
      );
    } else if (districtCred) {
      localStorage.setItem(
        'civicresolve_org_context',
        JSON.stringify({
          organizationType: 'MUNICIPAL_CORPORATION',
          districtId: districtCred.districtId,
          corporationId: districtCred.primaryCorpId,
        })
      );
    }
    // If unknown loginId, org context stays as previously stored (do not change it blindly)

    // ──────────────────────────────────────────────────
    // STEP 3: Attempt real Supabase Auth
    // ──────────────────────────────────────────────────
    try {
      const res = await AuthService.signInWithPassword(emailToTry, cleanPassword);
      if (!res.error && res.user) {
        // Determine role from district registry (overrides any Supabase 'citizen' role)
        let resolvedRole: UserRole = res.user.role;
        if (isStateAdmin) {
          resolvedRole = 'state_admin';
        } else if (districtCred) {
          resolvedRole = 'municipal_admin';
        } else if (res.user.role === 'citizen') {
          resolvedRole = 'municipal_admin'; // Default upgrade for demo
        }

        const finalUser: AuthUser = {
          ...res.user,
          role: resolvedRole,
          fullName: districtCred?.fullName || STATE_ADMIN_CREDENTIAL.fullName || res.user.fullName,
          departmentName: districtCred?.departmentName || STATE_ADMIN_CREDENTIAL.departmentName || res.user.departmentName,
        };
        setUser(finalUser);
        setSession(res.session);
        localStorage.setItem('civicresolve_user', JSON.stringify(finalUser));
        setLoading(false);
        return { success: true, error: null };
      }
    } catch (_) {}

    // ──────────────────────────────────────────────────
    // STEP 4: Demo fallback (Supabase Auth not configured or failed)
    // Uses district registry for district-specific identity.
    // State admin and district admins are properly isolated.
    // ──────────────────────────────────────────────────

    if (isStateAdmin) {
      const stateAdminUser: AuthUser = {
        id: 'state-admin-maha-001',
        email: emailToTry,
        role: 'state_admin',
        fullName: STATE_ADMIN_CREDENTIAL.fullName,
        departmentId: 'DEP-STATE-MAHA',
        departmentName: STATE_ADMIN_CREDENTIAL.departmentName,
        ward: 'Maharashtra State — Operations Desk',
        isVerified: true,
      };
      setUser(stateAdminUser);
      localStorage.setItem('civicresolve_user', JSON.stringify(stateAdminUser));
      setLoading(false);
      return { success: true, error: null };
    }

    if (districtCred) {
      const districtAdminUser: AuthUser = {
        id: `district-admin-${districtCred.districtId}-001`,
        email: emailToTry,
        role: 'municipal_admin',
        fullName: districtCred.fullName,
        departmentId: `DEP-${districtCred.districtId.toUpperCase()}`,
        departmentName: districtCred.departmentName,
        ward: `${districtCred.districtName} District — Command HQ`,
        isVerified: true,
      };
      setUser(districtAdminUser);
      localStorage.setItem('civicresolve_user', JSON.stringify(districtAdminUser));
      setLoading(false);
      return { success: true, error: null };
    }

    // Handle field officer IDs
    const lowerInput = cleanInput.toLowerCase();
    const isOfficer =
      lowerInput.includes('officer') ||
      lowerInput.includes('field') ||
      lowerInput.includes('duty') ||
      lowerInput.includes('inspector') ||
      lowerInput.includes('crew');

    if (isOfficer) {
      // Read org context to get correct district for officer
      let officerDistrict = 'Maharashtra';
      try {
        const saved = localStorage.getItem('civicresolve_org_context');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.districtId) officerDistrict = parsed.districtId;
        }
      } catch (_) {}

      const officerUser: AuthUser = {
        id: `officer-${Date.now()}`,
        email: emailToTry,
        role: 'officer',
        fullName: `${cleanInput.split('@')[0]} (Field Officer)`,
        departmentId: 'DEP-FIELD',
        departmentName: `${officerDistrict} Field Operations Desk`,
        ward: 'Zone 2 Command',
        isVerified: true,
      };
      setUser(officerUser);
      localStorage.setItem('civicresolve_user', JSON.stringify(officerUser));
      setLoading(false);
      return { success: true, error: null };
    }

    // Generic municipal admin fallback (for unknown IDs in demo environments)
    const genericAdminUser: AuthUser = {
      id: `admin-${Date.now()}`,
      email: emailToTry,
      role: 'municipal_admin',
      fullName: cleanInput.includes('@')
        ? cleanInput.split('@')[0].toUpperCase() + ' Administrator'
        : cleanInput.toUpperCase() + ' Administrator',
      departmentId: 'DEP-HQ',
      departmentName: 'Municipal Command Centre (HQ)',
      ward: 'Maharashtra',
      isVerified: true,
    };
    setUser(genericAdminUser);
    localStorage.setItem('civicresolve_user', JSON.stringify(genericAdminUser));
    setLoading(false);
    return { success: true, error: null };
  };

  const signUp = async (
    email: string,
    password: string,
    metadata?: { fullName?: string; departmentName?: string; ward?: string }
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
    localStorage.removeItem('civicresolve_user');
    localStorage.removeItem('civicresolve_org_context');
    sessionStorage.clear();
    try {
      await AuthService.signOut();
    } catch (_) {}
    setUser(null);
    setSession(null);
    setLoading(false);
  };

  const clearError = () => setError(null);

  const value: AuthContextValue = {
    user,
    session,
    isAuthenticated: Boolean(user),   // allow demo mode even without a Supabase session
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
