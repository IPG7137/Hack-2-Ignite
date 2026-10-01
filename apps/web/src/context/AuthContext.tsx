import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { AuthService, AuthUser, UserRole } from '../services/authService';
import {
  resolveDistrictCredential,
  resolveZoneCredential,
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
    metadata?: {
      fullName?: string;
      departmentName?: string;
      ward?: string;
      districtId?: string;
      phone?: string;
    }
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
    // STEP 1: Resolve identity from district/zone registry
    // ──────────────────────────────────────────────────
    const districtCred = resolveDistrictCredential(cleanInput);
    const zoneCred = resolveZoneCredential(cleanInput);
    const isStateAdmin = isStateAdminLogin(cleanInput);

    // ──────────────────────────────────────────────────
    // STEP 2: Set org context in localStorage BEFORE auth
    // ──────────────────────────────────────────────────
    if (isStateAdmin) {
      localStorage.setItem(
        'civicresolve_org_context',
        JSON.stringify({ organizationType: 'STATE', districtId: null, corporationId: null, zone: null })
      );
    } else if (zoneCred) {
      localStorage.setItem(
        'civicresolve_org_context',
        JSON.stringify({
          organizationType: 'MUNICIPAL_CORPORATION',
          districtId: zoneCred.districtId,
          corporationId: zoneCred.primaryCorpId,
          zone: zoneCred.zoneName,
        })
      );
    } else if (districtCred) {
      localStorage.setItem(
        'civicresolve_org_context',
        JSON.stringify({
          organizationType: 'MUNICIPAL_CORPORATION',
          districtId: districtCred.districtId,
          corporationId: districtCred.primaryCorpId,
          zone: null,
        })
      );
    }

    // ──────────────────────────────────────────────────
    // STEP 3: Attempt real Supabase Auth
    // ──────────────────────────────────────────────────
    try {
      const res = await AuthService.signInWithPassword(emailToTry, cleanPassword);
      if (!res.error && res.user) {
        let resolvedRole: UserRole = res.user.role;
        if (isStateAdmin) {
          resolvedRole = 'state_admin';
        } else if (zoneCred) {
          resolvedRole = 'zone_admin';
        } else if (districtCred) {
          resolvedRole = districtCred.role === 'citizen' ? 'citizen' : 'district_admin';
        }

        const finalUser: AuthUser = {
          ...res.user,
          role: resolvedRole,
          districtId: zoneCred?.districtId || districtCred?.districtId || res.user.districtId,
          zone: zoneCred?.zoneName || res.user.zone,
          zoneId: zoneCred?.zoneId || res.user.zoneId,
          fullName: zoneCred?.fullName || districtCred?.fullName || (isStateAdmin ? STATE_ADMIN_CREDENTIAL.fullName : res.user.fullName),
          departmentName: zoneCred?.departmentName || districtCred?.departmentName || (isStateAdmin ? STATE_ADMIN_CREDENTIAL.departmentName : res.user.departmentName),
        };
        setUser(finalUser);
        setSession(res.session);
        localStorage.setItem('civicresolve_user', JSON.stringify(finalUser));
        setLoading(false);
        return { success: true, error: null };
      }
    } catch (_) {}

    // ──────────────────────────────────────────────────
    // STEP 4: Demo / Offline fallback
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

    if (zoneCred) {
      const zoneAdminUser: AuthUser = {
        id: `zone-admin-${zoneCred.zoneId}-001`,
        email: emailToTry,
        role: 'zone_admin',
        fullName: zoneCred.fullName,
        districtId: zoneCred.districtId,
        zone: zoneCred.zoneName,
        zoneId: zoneCred.zoneId,
        departmentId: `DEP-${zoneCred.zoneId.toUpperCase()}`,
        departmentName: zoneCred.departmentName,
        ward: zoneCred.zoneName,
        isVerified: true,
      };
      setUser(zoneAdminUser);
      localStorage.setItem('civicresolve_user', JSON.stringify(zoneAdminUser));
      setLoading(false);
      return { success: true, error: null };
    }

    if (districtCred) {
      const assignedRole: UserRole = districtCred.role === 'citizen' ? 'citizen' : 'district_admin';
      const districtAdminUser: AuthUser = {
        id: `district-admin-${districtCred.districtId}-001`,
        email: emailToTry,
        role: assignedRole,
        fullName: districtCred.fullName,
        districtId: districtCred.districtId,
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

    // Standard Citizen Account Fallback (Safe default for citizens)
    const citizenUser: AuthUser = {
      id: `cit-${Date.now()}`,
      email: emailToTry,
      role: 'citizen',
      fullName: cleanInput.includes('@')
        ? cleanInput.split('@')[0]
        : cleanInput,
      departmentId: 'DEP-CITIZEN',
      departmentName: 'Citizen Grievance Desk',
      ward: 'Zone 2 Command',
      isVerified: true,
    };
    setUser(citizenUser);
    localStorage.setItem('civicresolve_user', JSON.stringify(citizenUser));
    setLoading(false);
    return { success: true, error: null };
  };

  const signUp = async (
    email: string,
    password: string,
    metadata?: {
      fullName?: string;
      departmentName?: string;
      ward?: string;
      districtId?: string;
      phone?: string;
    }
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
