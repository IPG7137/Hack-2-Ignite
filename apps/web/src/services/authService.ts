import { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

export type UserRole =
  | 'citizen'
  | 'officer'
  | 'dept_admin'
  | 'municipal_admin'
  | 'super_admin';

export const VALID_ROLES: readonly UserRole[] = [
  'citizen',
  'officer',
  'dept_admin',
  'municipal_admin',
  'super_admin',
] as const;

export function isValidRole(role: any): role is UserRole {
  return typeof role === 'string' && VALID_ROLES.includes(role as UserRole);
}

export function normalizeLegacyRole(rawRole: string): UserRole {
  const r = rawRole.toLowerCase().trim();
  if (r === 'super_admin' || r === 'superadmin') return 'super_admin';
  if (r === 'municipal_admin' || r === 'admin' || r === 'administrator') return 'municipal_admin';
  if (r === 'dept_admin' || r === 'department_admin') return 'dept_admin';
  if (r === 'officer' || r === 'field_officer' || r === 'duty_officer' || r === 'contractor') return 'officer';
  return 'citizen';
}

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

export interface DatabaseProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  department_id: string | null;
  department_name: string | null;
  ward: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface DatabaseUserRole {
  id?: number;
  user_id: string;
  role: UserRole;
  created_at?: string;
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
  public static mapSupabaseUserToAuthUser(
    user: User,
    dbProfile?: DatabaseProfile | null,
    dbRole?: UserRole | null
  ): AuthUser {
    const meta = (user as any).user_metadata || (user as any).userMetadata || user.app_metadata || {};
    const email = user.email || dbProfile?.email || 'officer@civicresolve.gov';
    
    // Priority: 1. DB-backed role, 2. Metadata role (validated), 3. Heuristic fallback
    let role: UserRole = 'citizen';
    if (dbRole && isValidRole(dbRole)) {
      role = dbRole;
    } else if (meta.role && isValidRole(meta.role)) {
      role = meta.role;
    } else if (email.includes('admin') || meta.is_admin) {
      role = 'municipal_admin';
    } else if (email.includes('dept')) {
      role = 'dept_admin';
    } else if (email.includes('officer')) {
      role = 'officer';
    }

    return {
      id: user.id,
      email,
      role,
      fullName: dbProfile?.full_name || meta.full_name || meta.name || email.split('@')[0],
      departmentId: dbProfile?.department_id || meta.department_id || 'DEP-GEN',
      departmentName: dbProfile?.department_name || meta.department_name || 'General Municipal Command',
      ward: dbProfile?.ward || meta.ward || 'Zone 2 Command',
      isVerified: Boolean(user.email_confirmed_at || meta.is_verified || true),
    };
  }

  /**
   * Fetches profile and role information directly from public.profiles & public.user_roles
   */
  public static async fetchUserProfileAndRole(userId: string): Promise<{
    profile: DatabaseProfile | null;
    role: UserRole | null;
  }> {
    try {
      // 1. Query public.profiles
      const { data: profileData, error: profileErr } = await supabase
        .from('profiles')
        .select('id, email, full_name, phone, department_id, department_name, ward, is_active')
        .eq('id', userId)
        .maybeSingle();

      if (profileErr) {
        // Table may be unmigrated in local dev or permission pending
        console.warn('ℹ️ Notice: public.profiles query:', profileErr.message);
      }

      // 2. Query public.user_roles
      const { data: roleData, error: roleErr } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (roleErr) {
        console.warn('ℹ️ Notice: public.user_roles query:', roleErr.message);
      }

      const role = roleData?.role && isValidRole(roleData.role) ? (roleData.role as UserRole) : null;

      return {
        profile: (profileData as DatabaseProfile) || null,
        role,
      };
    } catch (err) {
      console.warn('ℹ️ fetchUserProfileAndRole fallback:', err);
      return { profile: null, role: null };
    }
  }

  /**
   * Returns current active Supabase Auth session enriched with DB profile/role
   */
  public static async getSession(): Promise<{ user: AuthUser | null; session: Session | null }> {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.warn('⚠️ Supabase auth getSession warning:', error.message);
        return { user: null, session: null };
      }

      if (data.session && data.session.user) {
        const { profile, role } = await this.fetchUserProfileAndRole(data.session.user.id);
        return {
          user: this.mapSupabaseUserToAuthUser(data.session.user, profile, role),
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
        const { profile, role } = await this.fetchUserProfileAndRole(data.user.id);
        const authUser = this.mapSupabaseUserToAuthUser(data.user, profile, role);
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
            role: metadata?.role || 'citizen',
            department_name: metadata?.departmentName || 'General Municipal Command',
            ward: metadata?.ward || 'Zone 2 Command',
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
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      let authUser: AuthUser | null = null;
      if (session?.user) {
        const { profile, role } = await this.fetchUserProfileAndRole(session.user.id);
        authUser = this.mapSupabaseUserToAuthUser(session.user, profile, role);
      }
      callback(event, session, authUser);
    });

    return {
      unsubscribe: () => subscription.unsubscribe(),
    };
  }
}
