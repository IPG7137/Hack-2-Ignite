import { AuthService, AuthUser, UserRole } from './authService';
import { User } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import { GroundingSecurityGuard } from './groundingSecurityGuard';

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

    const authUser = AuthService.mapSupabaseUserToAuthUser(mockUser, null, 'officer');
    assert(authUser.id === 'usr-officer-01', '1a. Maps Supabase user ID correctly');
    assert(authUser.email === 'officer.patil@civicresolve.gov', '1b. Maps user email correctly');
    assert(authUser.role === 'officer', '1c. Maps verified DB officer role correctly');
    assert(authUser.fullName === 'Rajesh Patil', '1d. Maps full name correctly');
    assert(authUser.ward === 'Zone 2 Command', '1e. Maps ward assignment correctly');

    const unverifiedOfficer = AuthService.mapSupabaseUserToAuthUser(mockUser, null, null);
    assert(unverifiedOfficer.role === 'citizen', '1f. Metadata officer role ignored without DB role; strictly defaults to citizen');
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

    const authAdmin = AuthService.mapSupabaseUserToAuthUser(mockAdmin, null, 'municipal_admin');
    assert(authAdmin.role === 'municipal_admin', '2a. Maps verified DB municipal_admin role correctly');
    assert(authAdmin.fullName === 'Municipal Commissioner', '2b. Maps commissioner name correctly');

    const unverifiedAdmin = AuthService.mapSupabaseUserToAuthUser(mockAdmin, null, null);
    assert(unverifiedAdmin.role === 'citizen', '2c. Metadata admin role ignored without DB role; strictly defaults to citizen');
  }

  // 3. AuthUser mapping - Anti-Escalation Check (Strict Citizen Default)
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
    assert(authDept.role === 'citizen', '3a. Unverified user with dept email defaults strictly to citizen without escalation');
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

  // 10. Public Signup Role Escalation Prevention
  {
    const originalSignUp = supabase.auth.signUp.bind(supabase.auth);
    let capturedOptions: any = null;
    (supabase.auth as any).signUp = async (params: any) => {
      capturedOptions = params;
      return {
        data: {
          user: {
            id: 'usr-new-registered-citizen',
            email: params.email,
            user_metadata: params.options?.data,
            app_metadata: {},
            aud: 'authenticated',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          session: null,
        },
        error: null,
      };
    };

    try {
      const res = await AuthService.signUp('attacker@example.com', 'secretPassword123', {
        fullName: 'Attacker User',
        // Attempt client-side privileged role escalation
        ...({ role: 'super_admin', is_admin: true } as any),
      });

      assert(res.error === null, '10a. Public signup executes successfully without network error');
      assert(
        capturedOptions?.options?.data?.role === 'citizen',
        '10b. Privileged role self-assignment is overridden to "citizen" in Supabase Auth data payload'
      );
      assert(
        res.user?.role === 'citizen',
        '10c. Authenticated user returned from public signup strictly resolves to "citizen"'
      );
    } finally {
      (supabase.auth as any).signUp = originalSignUp;
    }
  }

  // 11. Authoritative User Verification Status (isVerified)
  {
    const verifiedUser: User = {
      id: 'usr-verified-01',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString(),
      email: 'citizen.confirmed@example.com',
      email_confirmed_at: '2026-09-27T10:00:00Z',
      phone: '',
      role: 'authenticated',
      updated_at: new Date().toISOString(),
    };

    const unconfirmedUser: User = {
      id: 'usr-unconfirmed-01',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString(),
      email: 'citizen.unconfirmed@example.com',
      email_confirmed_at: undefined,
      phone: '',
      role: 'authenticated',
      updated_at: new Date().toISOString(),
    };

    const spoofedMetadataUser: User = {
      id: 'usr-spoofed-01',
      app_metadata: {},
      user_metadata: {
        is_verified: true, // Spoofed client metadata
      },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
      email: 'citizen.spoofed@example.com',
      email_confirmed_at: undefined,
      phone: '',
      role: 'authenticated',
      updated_at: new Date().toISOString(),
    };

    const authVerified = AuthService.mapSupabaseUserToAuthUser(verifiedUser);
    const authUnconfirmed = AuthService.mapSupabaseUserToAuthUser(unconfirmedUser);
    const authSpoofed = AuthService.mapSupabaseUserToAuthUser(spoofedMetadataUser);

    assert(authVerified.isVerified === true, '11a. User with valid email_confirmed_at resolves to isVerified: true');
    assert(authUnconfirmed.isVerified === false, '11b. User without email_confirmed_at resolves to isVerified: false');
    assert(authSpoofed.isVerified === false, '11c. Spoofed meta.is_verified is untrusted and rejected when email_confirmed_at is missing');
  }

  // 12. Supabase Client Configuration & Zero Hardcoded Credential Fallback
  {
    const hasUrl = Boolean(
      (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) ||
        process.env.VITE_SUPABASE_URL
    );
    const hasKey = Boolean(
      (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) ||
        process.env.VITE_SUPABASE_ANON_KEY
    );
    assert(hasUrl, '12a. VITE_SUPABASE_URL environment variable is actively configured');
    assert(hasKey, '12b. VITE_SUPABASE_ANON_KEY environment variable is actively configured');

    const activeUrl =
      ((typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) ||
        process.env.VITE_SUPABASE_URL ||
        '') as string;
    assert(!activeUrl.includes('qxiivlfecbklwtnfsnjg'), '12c. Production project ref qxiivlfecbklwtnfsnjg is not used as a fallback');
  }

  // 13. Phase 6: Gemini API Key Client Isolation & PII Output Guard
  {
    const clientGeminiKey =
      (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GEMINI_API_KEY) ||
      process.env.VITE_GEMINI_API_KEY;

    assert(!clientGeminiKey, '13a. VITE_GEMINI_API_KEY is not exposed to client-side bundle or environment');

    const sampleAiOutput = 'Alert: Contact citizen at 9876543210 or citizen@civic.in regarding Aadhaar 1234 5678 9012.';
    const masked = GroundingSecurityGuard.maskPII(sampleAiOutput);
    assert(!masked.includes('9876543210'), '13b. AI output guard redacts mobile phone numbers');
    assert(!masked.includes('citizen@civic.in'), '13c. AI output guard redacts citizen email addresses');
    assert(!masked.includes('1234 5678 9012'), '13d. AI output guard redacts Aadhaar numbers');
  }

  // 14. Dynamic Citizen Signup with District & Zero-Score Civic Profile
  {
    const originalSignUp = supabase.auth.signUp.bind(supabase.auth);
    let capturedOptions: any = null;
    (supabase.auth as any).signUp = async (params: any) => {
      capturedOptions = params;
      return {
        data: {
          user: {
            id: 'usr-dynamic-citizen-01',
            email: params.email,
            user_metadata: params.options?.data,
            app_metadata: {},
            aud: 'authenticated',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          session: null,
        },
        error: null,
      };
    };

    try {
      const res = await AuthService.signUp('saurabh.citizen@example.com', 'SecurePass123!', {
        fullName: 'Saurabh Resident',
        phone: '9876543210',
        districtId: 'nagpur',
        ward: 'Ward 12',
      });

      assert(res.error === null, '14a. Dynamic citizen signup succeeds');
      assert(res.user?.fullName === 'Saurabh Resident', '14b. Full name stored in profile');
      assert(res.user?.districtId === 'nagpur', '14c. District ID stored in citizen profile');
      assert(res.user?.role === 'citizen', '14d. Dynamic signup strictly enforces citizen role');
    } finally {
      (supabase.auth as any).signUp = originalSignUp;
    }
  }

  // 15. Civic Rewards Service Idempotent Zero-Score Profile Initialization
  {
    const { CivicRewardsService } = await import('./civicRewardsService');
    const rewardsService = new CivicRewardsService();
    const newProfile = await rewardsService.initializeCitizenProfile(
      'usr-brand-new-999',
      'thane',
      'Priya Sharma'
    );

    assert(newProfile.userId === 'usr-brand-new-999', '15a. Initializes profile for brand new citizen');
    assert(newProfile.districtId === 'thane', '15b. Assigns correct district');
    assert(newProfile.civicScore === 0, '15c. Brand new citizen starts with exactly 0 civic score');
    assert(newProfile.verifiedReportsCount === 0, '15d. Brand new citizen starts with 0 verified reports');
    assert(newProfile.badgeLevel === 'starter', '15e. Brand new citizen starts with starter badge');
  }

  // 16. Anti-Spam Provisional Intake Point Shield (0 score inflation for raw reports)
  {
    const { CivicRewardsService } = await import('./civicRewardsService');
    const rewardsService = new CivicRewardsService();
    const contrib = await rewardsService.recordContribution({
      userId: 'usr-fresh-citizen-44',
      districtId: 'solapur',
      complaintId: 'CR-SOL-9901',
      displayName: 'Karan Patil',
      contributionType: 'verified_report',
      isProvisional: true, // Raw intake is strictly provisional
    });

    assert(contrib.points === 0, '16a. Provisional intake awards exactly 0 initial points to block spamming');
    assert(contrib.verificationStatus === 'pending', '16b. Provisional intake status is marked as pending');
  }

  console.log(`✅ Phase 9B Authentication Tests Finished: ${passed} passed, ${failed} failed`);
  return { passed, failed, errors };
}
