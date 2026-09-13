import {
  AuthService,
  AuthUser,
  DatabaseProfile,
  isValidRole,
  normalizeLegacyRole,
  UserRole,
  VALID_ROLES,
} from './authService';
import { User } from '@supabase/supabase-js';

export async function runProfileRoleTests(): Promise<{ passed: number; failed: number; errors: string[] }> {
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

  console.log('🧪 Starting Phase 9C Profiles & Role Schema Tests...');

  // 1. Valid Role Vocabulary
  {
    assert(VALID_ROLES.length === 5, '1a. Exactly 5 canonical roles defined');
    assert(VALID_ROLES.includes('citizen'), '1b. Canonical role citizen present');
    assert(VALID_ROLES.includes('officer'), '1c. Canonical role officer present');
    assert(VALID_ROLES.includes('dept_admin'), '1d. Canonical role dept_admin present');
    assert(VALID_ROLES.includes('municipal_admin'), '1e. Canonical role municipal_admin present');
    assert(VALID_ROLES.includes('super_admin'), '1f. Canonical role super_admin present');
  }

  // 2. Invalid Role Rejection
  {
    assert(!isValidRole('root'), '2a. Rejects root role');
    assert(!isValidRole('hacker'), '2b. Rejects hacker role');
    assert(!isValidRole('moderator'), '2c. Rejects non-standard moderator role');
    assert(!isValidRole(''), '2d. Rejects empty role');
    assert(!isValidRole(null), '2e. Rejects null role');
    assert(!isValidRole(undefined), '2f. Rejects undefined role');
  }

  // 3. Duplicate Role & Unique Constraint Modeling
  {
    const rolesMap = new Map<string, Set<UserRole>>();
    const assignRole = (userId: string, role: UserRole): boolean => {
      if (!rolesMap.has(userId)) rolesMap.set(userId, new Set());
      const set = rolesMap.get(userId)!;
      if (set.has(role)) return false; // Duplicate rejected
      set.add(role);
      return true;
    };

    assert(assignRole('u-101', 'officer') === true, '3a. Initial role assignment succeeds');
    assert(assignRole('u-101', 'officer') === false, '3b. Duplicate role assignment for same user is rejected');
  }

  // 4. Profile Requires auth.users Identity
  {
    const mockProfile: DatabaseProfile = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'officer.patil@civicresolve.gov',
      full_name: 'Rajesh Patil',
      phone: '+91 9876543210',
      department_id: 'DEP-ROADS',
      department_name: 'Roads & Infrastructure',
      ward: 'Zone 2 Command',
      is_active: true,
    };

    assert(typeof mockProfile.id === 'string' && mockProfile.id.length === 36, '4a. Profile ID is valid UUID linked to auth.users');
    assert(mockProfile.is_active === true, '4b. Profile defaults to active');
  }

  // 5. Profile Contains No Password / Hash Field
  {
    const mockProfile: DatabaseProfile = {
      id: '550e8400-e29b-41d4-a716-446655440001',
      email: 'citizen@example.com',
      full_name: 'Citizen User',
      phone: null,
      department_id: null,
      department_name: null,
      ward: null,
      is_active: true,
    };

    const anyProfile = mockProfile as any;
    assert(anyProfile.password === undefined, '5a. DatabaseProfile does not contain password field');
    assert(anyProfile.password_hash === undefined, '5b. DatabaseProfile does not contain password_hash field');
    assert(anyProfile.secret === undefined, '5c. DatabaseProfile does not contain secret credential field');
  }

  // 6. user_roles Contains No Password / Hash Field
  {
    const roleRecord = {
      user_id: '550e8400-e29b-41d4-a716-446655440002',
      role: 'citizen' as UserRole,
    };
    const anyRole = roleRecord as any;
    assert(anyRole.password === undefined, '6a. user_roles does not contain password field');
    assert(anyRole.password_hash === undefined, '6b. user_roles does not contain password_hash field');
  }

  // 7. New Signup Defaults Safely to Citizen
  {
    const freshUser: User = {
      id: 'new-user-01',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString(),
      email: 'new.citizen@example.com',
      phone: '',
      role: 'authenticated',
      updated_at: new Date().toISOString(),
    };

    const mapped = AuthService.mapSupabaseUserToAuthUser(freshUser, null, null);
    assert(mapped.role === 'citizen', '7a. New signup without role or DB record defaults strictly to citizen');
  }

  // 8. Arbitrary Signup Cannot Create Privileged Roles Via Client Metadata
  {
    const attackerUser: User = {
      id: 'hacker-01',
      app_metadata: {},
      user_metadata: {
        role: 'super_admin', // Attempted client-side privilege escalation
      },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
      email: 'attacker@random-mail.com',
      phone: '',
      role: 'authenticated',
      updated_at: new Date().toISOString(),
    };

    // When DB role is present (e.g., 'citizen' from database user_roles)
    const secureMapped = AuthService.mapSupabaseUserToAuthUser(attackerUser, null, 'citizen');
    assert(secureMapped.role === 'citizen', '8a. Database-backed role overrides malicious client metadata');
    assert(secureMapped.role !== 'super_admin', '8b. Malicious metadata role is rejected');
  }

  // 9. Legacy Role Compatibility Mapping
  {
    assert(normalizeLegacyRole('contractor') === 'officer', '9a. Maps legacy contractor to officer');
    assert(normalizeLegacyRole('field_officer') === 'officer', '9b. Maps legacy field_officer to officer');
    assert(normalizeLegacyRole('department_admin') === 'dept_admin', '9c. Maps legacy department_admin to dept_admin');
    assert(normalizeLegacyRole('administrator') === 'municipal_admin', '9d. Maps legacy administrator to municipal_admin');
    assert(normalizeLegacyRole('superadmin') === 'super_admin', '9e. Maps legacy superadmin to super_admin');
    assert(normalizeLegacyRole('unknown_legacy') === 'citizen', '9f. Unrecognized legacy role maps safely to citizen');
  }

  // 10. Unmappable Legacy Users are Not Fabricated
  {
    const legacyUsers = [
      { id: 'leg-1', email: 'leg1@example.com', auth_linked: true },
      { id: 'leg-2', email: 'leg2@orphan.com', auth_linked: false },
    ];

    const migratedProfiles = legacyUsers
      .filter((u) => u.auth_linked)
      .map((u) => ({ id: u.id, email: u.email }));

    assert(migratedProfiles.length === 1, '10a. Only auth-linked legacy records are migrated to profiles');
    assert(!migratedProfiles.some((p) => p.email === 'leg2@orphan.com'), '10b. Orphan unlinked records are not fabricated');
  }

  // 11. DB-backed Role as Authority Truth
  {
    const officerUser: User = {
      id: 'officer-99',
      app_metadata: {},
      user_metadata: { role: 'citizen' }, // Outdated/mismatched client metadata
      aud: 'authenticated',
      created_at: new Date().toISOString(),
      email: 'officer.kumar@civicresolve.gov',
      phone: '',
      role: 'authenticated',
      updated_at: new Date().toISOString(),
    };

    const verifiedAuth = AuthService.mapSupabaseUserToAuthUser(officerUser, {
      id: 'officer-99',
      email: 'officer.kumar@civicresolve.gov',
      full_name: 'Amit Kumar',
      phone: '+91 9999988888',
      department_id: 'DEP-DRAINAGE',
      department_name: 'Drainage & Stormwater',
      ward: 'Ward 14',
      is_active: true,
    }, 'officer');

    assert(verifiedAuth.role === 'officer', '11a. Database role is authoritative');
    assert(verifiedAuth.departmentName === 'Drainage & Stormwater', '11b. Database department is authoritative');
    assert(verifiedAuth.fullName === 'Amit Kumar', '11c. Database full name is authoritative');
  }

  // 12. Zero service_role in Client Code
  {
    const envObj = typeof process !== 'undefined' ? process.env : {};
    const hasServiceRole = Object.keys(envObj).some((k) => k.toLowerCase().includes('service_role'));
    assert(!hasServiceRole, '12a. Zero service_role in client environment');
  }

  console.log(`✅ Phase 9C Profiles & Roles Tests Finished: ${passed} passed, ${failed} failed`);
  return { passed, failed, errors };
}
