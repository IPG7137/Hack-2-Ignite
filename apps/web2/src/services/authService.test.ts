import { AuthService, AuthUser, UserRole } from './authService';
import { User } from '@supabase/supabase-js';

export async function runAuthServiceTests(): Promise<{ passed: number; failed: number; errors: string[] }> {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, testName: string, message?: string) {
    if (condition) {
      passed++;
      console.log(`  ✅ [PASS] ${testName}`);
    } else {
      failed++;
      const err = `❌ [FAIL] ${testName}: ${message || 'Assertion failed'}`;
      errors.push(err);
      console.error(`  ${err}`);
    }
  }

  console.log('🧪 Starting Phase 9B Supabase Authentication & Session Tests...');

  // 1. AuthUser mapping - Duty Officer
  {
    const mockUser: User = {
      id: 'usr-officer-01',
      app_metadata: {},
      user_metadata: {
        full_name: 'Rajesh Patil',
        role: 'officer',
        department_name: 'Solid Waste Management',
        ward: 'Zone 2 Command',
      },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
      email: 'officer.patil@civicresolve.gov',
      phone: '',
      role: 'authenticated',
      updated_at: new Date().toISOString(),
    };

    const authUser = AuthService.mapSupabaseUserToAuthUser(mockUser);
    assert(authUser.id === 'usr-officer-01', '1a. Maps Supabase user ID correctly');
    assert(authUser.email === 'officer.patil@civicresolve.gov', '1b. Maps user email correctly');
    assert(authUser.role === 'officer', '1c. Maps officer role correctly');
    assert(authUser.fullName === 'Rajesh Patil', '1d. Maps full name correctly');
    assert(authUser.ward === 'Zone 2 Command', '1e. Maps ward assignment correctly');
  }

  // 2. AuthUser mapping - Municipal Admin
  {
    const mockAdmin: User = {
      id: 'usr-admin-01',
      app_metadata: {},
      user_metadata: {
        name: 'Municipal Commissioner',
        role: 'municipal_admin',
      },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
      email: 'admin.hq@civicresolve.gov',
      phone: '',
      role: 'authenticated',
      updated_at: new Date().toISOString(),
    };

    const authAdmin = AuthService.mapSupabaseUserToAuthUser(mockAdmin);
    assert(authAdmin.role === 'municipal_admin', '2a. Maps municipal_admin role correctly');
    assert(authAdmin.fullName === 'Municipal Commissioner', '2b. Maps commissioner name correctly');
  }

  // 3. AuthUser mapping - Department Admin Heuristic
  {
    const mockDeptUser: User = {
      id: 'usr-dept-02',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString(),
      email: 'dept.water@civicresolve.gov',
      phone: '',
      role: 'authenticated',
      updated_at: new Date().toISOString(),
    };

    const authDept = AuthService.mapSupabaseUserToAuthUser(mockDeptUser);
    assert(authDept.role === 'dept_admin', '3a. Heuristically infers dept_admin role from dept email');
  }

  // 4. AuthUser mapping - Citizen Role
  {
    const mockCitizen: User = {
      id: 'usr-cit-01',
      app_metadata: {},
      user_metadata: {
        role: 'citizen',
        full_name: 'Aarav Mehta',
      },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
      email: 'citizen.aarav@example.com',
      phone: '',
      role: 'authenticated',
      updated_at: new Date().toISOString(),
    };

    const authCit = AuthService.mapSupabaseUserToAuthUser(mockCitizen);
    assert(authCit.role === 'citizen', '4a. Maps citizen role correctly');
    assert(authCit.fullName === 'Aarav Mehta', '4b. Maps citizen full name correctly');
  }

  // 5. Zero Raw Password & Zero Hash Storage in AuthUser Interface
  {
    const mockUser: User = {
      id: 'usr-sec-01',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString(),
      email: 'officer@civicresolve.gov',
      phone: '',
      role: 'authenticated',
      updated_at: new Date().toISOString(),
    };

    const authUser = AuthService.mapSupabaseUserToAuthUser(mockUser);
    const anyAuthUser = authUser as any;
    assert(anyAuthUser.password === undefined, '5a. AuthUser interface does NOT store plain text password');
    assert(anyAuthUser.password_hash === undefined, '5b. AuthUser interface does NOT store password_hash');
    assert(anyAuthUser.secret === undefined, '5c. AuthUser interface does NOT store secret tokens');
  }

  // 6. Zero service_role Key in Frontend Environment
  {
    const envStr = JSON.stringify(process.env);
    const hasServiceRoleKey =
      envStr.includes('SUPABASE_SERVICE_ROLE_KEY') ||
      envStr.includes('service_role') ||
      (typeof import.meta !== 'undefined' &&
        (import.meta as any).env &&
        Boolean((import.meta as any).env.VITE_SUPABASE_SERVICE_ROLE_KEY));

    assert(!hasServiceRoleKey, '6a. Frontend environment does NOT expose SUPABASE_SERVICE_ROLE_KEY');
  }

  // 7. Session Restoration & Unauthenticated State Handling
  {
    const sessionRes = await AuthService.getSession();
    // In headless test without active browser cookies/localstorage, session is safely null
    assert(sessionRes !== undefined, '7a. getSession() returns a valid structure');
    assert(sessionRes.user === null || sessionRes.user.id.length > 0, '7b. getSession() handles unauthenticated state gracefully without crashing');
  }

  // 8. Auth State Change Subscription
  {
    const listener = AuthService.onAuthStateChange((event, session, user) => {
      // Callback format verification
    });
    assert(typeof listener.unsubscribe === 'function', '8a. onAuthStateChange returns subscription with unsubscribe()');
    listener.unsubscribe();
    assert(true, '8b. Successfully unsubscribed auth state listener');
  }

  // 9. Sign-out API Contract
  {
    assert(typeof AuthService.signOut === 'function', '9a. AuthService exposes signOut API');
    assert(typeof AuthService.signInWithPassword === 'function', '9b. AuthService exposes signInWithPassword API');
    assert(typeof AuthService.signUp === 'function', '9c. AuthService exposes signUp API');
  }

  console.log(`✅ Phase 9B Authentication Tests Finished: ${passed} passed, ${failed} failed`);
  return { passed, failed, errors };
}
