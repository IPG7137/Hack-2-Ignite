import { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

export type UserRole =
  | 'citizen'
  | 'officer'
  | 'dept_admin'
  | 'municipal_admin'
  | 'super_admin'
  | 'state_admin'
  | 'district_admin'
  | 'zone_admin';

export const VALID_ROLES: readonly UserRole[] = [
  'citizen',
  'officer',
  'dept_admin',
  'municipal_admin',
  'super_admin',
  'state_admin',
] as const;

export const EXTENDED_ADMIN_ROLES = ['district_admin', 'zone_admin'] as const;

export function isValidRole(role: any): role is UserRole {
  return (
    typeof role === 'string' &&
    ((VALID_ROLES as readonly string[]).includes(role) ||
      (EXTENDED_ADMIN_ROLES as readonly string[]).includes(role))
  );
}

export function normalizeLegacyRole(rawRole: string): UserRole {
  const r = rawRole.toLowerCase().trim();
  if (r === 'state_admin' || r === 'stateadmin') return 'state_admin';
  if (r === 'district_admin' || r === 'districtadmin') return 'district_admin';
  if (r === 'zone_admin' || r === 'zoneadmin') return 'zone_admin';
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
  districtId?: string;
  zone?: string;
  zoneId?: string;
  phone?: string;
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
  district_id?: string | null;
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
    
    // Security Model:
    // 1. The database role (from public.user_roles) is the ONLY source for privileged roles.
    // 2. Privileged roles (officer, dept_admin, municipal_admin, super_admin) are NEVER determined
    //    from email address, email text, user metadata, meta.role, meta.is_admin, or meta.is_verified.
    // 3. If a valid database role exists, use it.
    // 4. If no valid database role exists, default strictly to 'citizen'.
    const role: UserRole = dbRole && isValidRole(dbRole) ? dbRole : 'citizen';

    const resolvedDistrictId =
      role === 'state_admin'
        ? undefined
        : dbProfile?.district_id || meta.district_id || meta.districtId || undefined;

    const resolvedZone =
      role === 'state_admin'
        ? undefined
        : dbProfile?.ward || meta.zone || meta.ward || undefined;

    return {
      id: user.id,
      email,
      role,
      fullName: dbProfile?.full_name || meta.full_name || meta.name || email.split('@')[0],
      districtId: resolvedDistrictId,
      zone: resolvedZone,
      zoneId: meta.zone_id || meta.zoneId || undefined,
      phone: dbProfile?.phone || meta.phone || meta.phone_number || undefined,
      departmentId: dbProfile?.department_id || meta.department_id || 'DEP-GEN',
      departmentName: dbProfile?.department_name || meta.department_name || 'General Municipal Command',
      ward: dbProfile?.ward || meta.ward || resolvedZone || 'Zone 2 Command',
      // Authoritative Supabase verification state: strictly check email_confirmed_at.
      // Never use '|| true' fallback and do not trust client-controlled user metadata (meta.is_verified).
      isVerified: Boolean(user.email_confirmed_at),
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
   * Signs up a new citizen user with Supabase Auth.
   * Security Requirement:
   * Public registration MUST strictly enforce role: 'citizen'.
   * Privileged roles (officer, dept_admin, municipal_admin, super_admin) must NEVER
   * be assignable through public client registration metadata.
   */
  public static async signUp(
    email: string,
    password: string,
    metadata?: {
      fullName?: string;
      departmentName?: string;
      ward?: string;
      districtId?: string;
      phone?: string;
    }
  ): Promise<{ user: AuthUser | null; error: string | null }> {
    try {
      // Hardcoded strictly to 'citizen' - client can never self-assign privileged roles
      const publicRole: UserRole = 'citizen';
      const cleanDistrict = (metadata?.districtId || 'pune').toLowerCase().trim();
      const displayName = metadata?.fullName || email.split('@')[0];

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: displayName,
            role: publicRole,
            department_name: metadata?.departmentName || 'General Municipal Command',
            ward: metadata?.ward || 'Zone 2 Command',
            district_id: cleanDistrict,
            phone_number: metadata?.phone || '',
          },
        },
      });

      if (error) {
        return { user: null, error: error.message };
      }

      if (data.user) {
        // Idempotently create/update profile record if possible
        try {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            email: data.user.email,
            full_name: displayName,
            phone: metadata?.phone || null,
            ward: metadata?.ward || 'Zone 2 Command',
            department_name: metadata?.departmentName || 'General Municipal Command',
            is_active: true,
          });
        } catch (_) {}

        // Idempotently initialize civic rewards profile
        try {
          await supabase.from('citizen_civic_profiles').upsert({
            user_id: data.user.id,
            district_id: cleanDistrict,
            display_name: displayName,
            civic_score: 0,
            verified_reports_count: 0,
            verified_resolutions_count: 0,
            helpful_evidence_count: 0,
            badge_level: 'starter',
            is_flagged: false,
          });
        } catch (_) {}

        return { user: this.mapSupabaseUserToAuthUser(data.user, null, null), error: null };
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
      AuthService.clearSessionCache();
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

  /**
   * Clears in-memory session cache and wipes temporary auth context
   */
  private static cachedUser: AuthUser | null = null;

  public static clearSessionCache(): void {
    AuthService.cachedUser = null;
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem('civicresolve_user_cache');
      } catch (_) {}
    }
  }

  public static getCurrentUser(): AuthUser | null {
    return AuthService.cachedUser;
  }

  /**
   * Validates if role escalation is permitted
   */
  public static validateRolePromotion(
    currentRole: string,
    targetRole: string
  ): { allowed: boolean; reason?: string } {
    if (currentRole === 'citizen' && targetRole !== 'citizen') {
      return { allowed: false, reason: 'Citizens cannot self-promote to administrative or officer roles.' };
    }
    if (currentRole === 'officer' && (targetRole === 'state_admin' || targetRole === 'super_admin')) {
      return { allowed: false, reason: 'Officers cannot promote themselves to state or super admin.' };
    }
    return { allowed: true };
  }

  /**
   * Validates statutory complaint status transitions by role
   */
  public static canTransitionStatus(
    role: string,
    fromStatus: string,
    toStatus: string
  ): boolean {
    if (role === 'citizen') {
      // Citizens can only verify awaiting verification -> closed or reopened
      if (fromStatus === 'RESOLVED_AWAITING_VERIFICATION' && (toStatus === 'CLOSED' || toStatus === 'REOPENED')) {
        return true;
      }
      return false;
    }
    if (role === 'municipal_officer' || role === 'officer') {
      if (fromStatus === 'ASSIGNED' && toStatus === 'IN_PROGRESS') return true;
      if (fromStatus === 'IN_PROGRESS' && toStatus === 'RESOLVED_AWAITING_VERIFICATION') return true;
      return false;
    }
    if (
      role === 'municipal_admin' ||
      role === 'district_admin' ||
      role === 'zone_admin' ||
      role === 'state_admin' ||
      role === 'super_admin'
    ) {
      return true;
    }
    return false;
  }

  /**
   * RBAC Action Permission Checker
   */
  public static hasPermission(role: string, action: string): boolean {
    const rolePermissions: Record<string, string[]> = {
      citizen: ['complaints:create', 'complaints:view_own', 'complaints:verify_resolution'],
      officer: [
        'complaints:view_assigned',
        'complaints:update_progress',
        'complaints:submit_evidence',
        'alerts:view_assigned'
      ],
      municipal_officer: [
        'complaints:view_assigned',
        'complaints:update_progress',
        'complaints:submit_evidence',
        'alerts:view_assigned'
      ],
      dept_admin: [
        'complaints:view_department',
        'complaints:assign',
        'alerts:view_department',
        'alerts:acknowledge'
      ],
      zone_admin: [
        'complaints:view_zone',
        'complaints:assign_zone',
        'alerts:view_zone',
        'alerts:acknowledge_zone',
        'sla:view_zone'
      ],
      district_admin: [
        'complaints:view_district',
        'complaints:view_ulb',
        'complaints:assign',
        'complaints:reassign',
        'alerts:manage',
        'alerts:acknowledge',
        'sla:configure'
      ],
      municipal_admin: [
        'complaints:view_ulb',
        'complaints:assign',
        'complaints:reassign',
        'alerts:manage',
        'alerts:acknowledge',
        'sla:configure'
      ],
      state_admin: [
        'complaints:view_state',
        'complaints:audit',
        'alerts:manage_state',
        'sla:configure',
        'users:manage'
      ],
      super_admin: ['*']
    };

    const perms = rolePermissions[role] || [];
    if (perms.includes('*') || perms.includes(action)) {
      return true;
    }
    return false;
  }
}

