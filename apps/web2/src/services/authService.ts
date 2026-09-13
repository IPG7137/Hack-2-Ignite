import { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

export type UserRole =
  | 'citizen'
  | 'officer'
  | 'dept_admin'
  | 'municipal_admin'
  | 'super_admin';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  fullName: string;
  departmentId?: string;
  departmentName?: string;
  ward?: string;
  isVerified: boolean;
}

export interface AuthState {
  user: AuthUser | null;
  session: Session | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

export class AuthService {
  /**
   * Helper to map Supabase User / Session to our typed AuthUser
   */
  public static mapSupabaseUserToAuthUser(user: User): AuthUser {
    const meta = (user as any).user_metadata || (user as any).userMetadata || user.app_metadata || {};
    const email = user.email || 'officer@civicresolve.gov';
    
    // Determine default role from metadata or email heuristics
    let role: UserRole = (meta.role as UserRole) || 'officer';
    if (email.includes('admin') || meta.is_admin) {
      role = 'municipal_admin';
    } else if (email.includes('dept')) {
      role = 'dept_admin';
    } else if (email.includes('citizen')) {
      role = 'citizen';
    }

    return {
      id: user.id,
      email,
      role,
      fullName: meta.full_name || meta.name || email.split('@')[0],
      departmentId: meta.department_id || 'DEP-GEN',
      departmentName: meta.department_name || 'General Municipal Command',
      ward: meta.ward || 'Zone 2 Command',
      isVerified: Boolean(user.email_confirmed_at || meta.is_verified || true),
    };
  }

  /**
   * Returns current active Supabase Auth session
   */
  public static async getSession(): Promise<{ user: AuthUser | null; session: Session | null }> {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.warn('⚠️ Supabase auth getSession warning:', error.message);
        return { user: null, session: null };
      }

      if (data.session && data.session.user) {
        return {
          user: this.mapSupabaseUserToAuthUser(data.session.user),
          session: data.session,
        };
      }

      return { user: null, session: null };
    } catch (err) {
      console.error('❌ AuthService.getSession error:', err);
      return { user: null, session: null };
    }
  }

  /**
   * Signs in user with Supabase Auth credentials (email/password)
   */
  public static async signInWithPassword(email: string, password: string): Promise<{
    user: AuthUser | null;
    session: Session | null;
    error: string | null;
  }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { user: null, session: null, error: error.message };
      }

      if (data.user && data.session) {
        const authUser = this.mapSupabaseUserToAuthUser(data.user);
        return { user: authUser, session: data.session, error: null };
      }

      return { user: null, session: null, error: 'Sign in succeeded but no user session returned.' };
    } catch (err: any) {
      return { user: null, session: null, error: err.message || 'Authentication failed' };
    }
  }

  /**
   * Signs up a new municipal or citizen user with Supabase Auth
   */
  public static async signUp(
    email: string,
    password: string,
    metadata?: { fullName?: string; role?: UserRole; departmentName?: string; ward?: string }
  ): Promise<{ user: AuthUser | null; error: string | null }> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: metadata?.fullName || email.split('@')[0],
            role: metadata?.role || 'officer',
            department_name: metadata?.departmentName || 'Municipal Operations',
            ward: metadata?.ward || 'General Command',
          },
        },
      });

      if (error) {
        return { user: null, error: error.message };
      }

      if (data.user) {
        return { user: this.mapSupabaseUserToAuthUser(data.user), error: null };
      }

      return { user: null, error: 'Registration succeeded but no user data returned.' };
    } catch (err: any) {
      return { user: null, error: err.message || 'Registration failed' };
    }
  }

  /**
   * Signs out the current user session
   */
  public static async signOut(): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) return { error: error.message };
      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'Sign out failed' };
    }
  }

  /**
   * Listens for Supabase Auth state changes (sign in, sign out, token refresh)
   */
  public static onAuthStateChange(
    callback: (event: string, session: Session | null, user: AuthUser | null) => void
  ): { unsubscribe: () => void } {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const authUser = session?.user ? this.mapSupabaseUserToAuthUser(session.user) : null;
      callback(event, session, authUser);
    });

    return {
      unsubscribe: () => subscription.unsubscribe(),
    };
  }
}
