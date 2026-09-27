/**
 * CIVICRESOLVE — District Credential Registry
 *
 * This file defines the district-specific admin accounts for the DEMO environment.
 *
 * SECURITY RULES:
 * - These credentials are for DEVELOPMENT/DEMO use ONLY.
 * - In production, credentials are stored in Supabase Auth — NEVER in source code.
 * - Do NOT commit real production passwords to source control.
 * - Production deployment must use environment-variable-injected Supabase user records.
 *
 * HOW IT WORKS:
 * - Each district has a unique `loginId` (used as the identifier in the login form).
 * - Supabase Auth is tried first with these credentials.
 * - If Supabase Auth is unavailable/unconfigured, the local demo fallback resolves
 *   the correct district/role from this registry — but NEVER leaks credentials.
 * - The `districtId` and `corporationId` are stable IDs that match `maharashtraDistricts.ts`.
 *
 * SETUP: To seed these accounts in Supabase Auth, run:
 *   npm run seed:district-accounts   (see scripts/seedDistrictAccounts.ts)
 */

export interface DistrictCredential {
  /** Unique login identifier (used in the form — NOT an email, but mapped to one internally) */
  loginId: string;
  /** Human-readable district name */
  districtName: string;
  /** Stable district ID matching maharashtraDistricts.ts */
  districtId: string;
  /** Primary municipal corporation ID for this district */
  primaryCorpId: string;
  /** Role assigned to this account */
  role: 'district_admin' | 'municipal_admin' | 'citizen';
  /** Full name shown in the UI after login */
  fullName: string;
  /** Department or citizen title */
  departmentName: string;
}

/**
 * District admin registry.
 * Each district has a unique loginId.
 * Passwords are NOT stored here — they are managed in Supabase Auth.
 *
 * For DEMO environments where Supabase Auth is not set up:
 * The login form pre-fills the loginId and uses a demo password (shown in the UI).
 * The demo password is intentionally visible to testers, not treated as a secret.
 */
export const DISTRICT_CREDENTIAL_REGISTRY: DistrictCredential[] = [
  {
    loginId: 'pune_admin',
    districtName: 'Pune',
    districtId: 'pune',
    primaryCorpId: 'pmc',
    role: 'district_admin',
    fullName: 'Pune District Administrator',
    departmentName: 'Pune District Collectorate — Urban Development Cell',
  },
  {
    loginId: 'solapur_admin',
    districtName: 'Solapur',
    districtId: 'solapur',
    primaryCorpId: 'smc',
    role: 'district_admin',
    fullName: 'Solapur District Administrator',
    departmentName: 'Solapur District Collectorate — Urban Development Cell',
  },
  {
    loginId: 'mumbai_admin',
    districtName: 'Mumbai',
    districtId: 'mumbai',
    primaryCorpId: 'bmc',
    role: 'district_admin',
    fullName: 'Greater Mumbai District Administrator',
    departmentName: 'Mumbai District Collectorate — Urban Infrastructure Cell',
  },
  {
    loginId: 'thane_admin',
    districtName: 'Thane',
    districtId: 'thane',
    primaryCorpId: 'tmc',
    role: 'district_admin',
    fullName: 'Thane District Administrator',
    departmentName: 'Thane District Collectorate — Urban Development Cell',
  },
  {
    loginId: 'nashik_admin',
    districtName: 'Nashik',
    districtId: 'nashik',
    primaryCorpId: 'nmc',
    role: 'district_admin',
    fullName: 'Nashik District Administrator',
    departmentName: 'Nashik District Collectorate — Urban Development Cell',
  },
  {
    loginId: 'nagpur_admin',
    districtName: 'Nagpur',
    districtId: 'nagpur',
    primaryCorpId: 'nmc_nagpur',
    role: 'district_admin',
    fullName: 'Nagpur District Administrator',
    departmentName: 'Nagpur District Collectorate — Urban Development Cell',
  },
  {
    loginId: 'csn_admin',
    districtName: 'Chhatrapati Sambhajinagar',
    districtId: 'chhatrapati_sambhajinagar',
    primaryCorpId: 'csmc',
    role: 'district_admin',
    fullName: 'Chhatrapati Sambhajinagar District Administrator',
    departmentName: 'CSN District Collectorate — Urban Development Cell',
  },
  {
    loginId: 'kolhapur_admin',
    districtName: 'Kolhapur',
    districtId: 'kolhapur',
    primaryCorpId: 'kmc',
    role: 'district_admin',
    fullName: 'Kolhapur District Administrator',
    departmentName: 'Kolhapur District Collectorate — Urban Development Cell',
  },
  {
    loginId: 'amravati_admin',
    districtName: 'Amravati',
    districtId: 'amravati',
    primaryCorpId: 'amc',
    role: 'district_admin',
    fullName: 'Amravati District Administrator',
    departmentName: 'Amravati District Collectorate — Urban Development Cell',
  },
  // Citizen Accounts for District Civic Champions Testing
  {
    loginId: 'solapur_citizen',
    districtName: 'Solapur',
    districtId: 'solapur',
    primaryCorpId: 'smc',
    role: 'citizen',
    fullName: 'Mahesh B. (Citizen)',
    departmentName: 'Solapur Citizen Civic Contributor',
  },
  {
    loginId: 'pune_citizen',
    districtName: 'Pune',
    districtId: 'pune',
    primaryCorpId: 'pmc',
    role: 'citizen',
    fullName: 'Siddharth J. (Citizen)',
    departmentName: 'Pune Citizen Civic Contributor',
  },
  {
    loginId: 'nashik_citizen',
    districtName: 'Nashik',
    districtId: 'nashik',
    primaryCorpId: 'nmc',
    role: 'citizen',
    fullName: 'Pooja N. (Citizen)',
    departmentName: 'Nashik Citizen Civic Contributor',
  },
  {
    loginId: 'csn_citizen',
    districtName: 'Chhatrapati Sambhajinagar',
    districtId: 'chhatrapati_sambhajinagar',
    primaryCorpId: 'csmc',
    role: 'citizen',
    fullName: 'Syed I. (Citizen)',
    departmentName: 'CSN Citizen Civic Contributor',
  },
  {
    loginId: 'mumbai_citizen',
    districtName: 'Mumbai',
    districtId: 'mumbai',
    primaryCorpId: 'bmc',
    role: 'citizen',
    fullName: 'Kunal M. (Citizen)',
    departmentName: 'Mumbai Citizen Civic Contributor',
  },
  {
    loginId: 'nagpur_citizen',
    districtName: 'Nagpur',
    districtId: 'nagpur',
    primaryCorpId: 'nmc_nagpur',
    role: 'citizen',
    fullName: 'Prashant G. (Citizen)',
    departmentName: 'Nagpur Citizen Civic Contributor',
  },
  {
    loginId: 'thane_citizen',
    districtName: 'Thane',
    districtId: 'thane',
    primaryCorpId: 'tmc',
    role: 'citizen',
    fullName: 'Aditya S. (Citizen)',
    departmentName: 'Thane Citizen Civic Contributor',
  },
  {
    loginId: 'kolhapur_citizen',
    districtName: 'Kolhapur',
    districtId: 'kolhapur',
    primaryCorpId: 'kmc',
    role: 'citizen',
    fullName: 'Digvijay P. (Citizen)',
    departmentName: 'Kolhapur Citizen Civic Contributor',
  },
  {
    loginId: 'amravati_citizen',
    districtName: 'Amravati',
    districtId: 'amravati',
    primaryCorpId: 'amc',
    role: 'citizen',
    fullName: 'Mangesh T. (Citizen)',
    departmentName: 'Amravati Citizen Civic Contributor',
  },
];

/**
 * Resolve district credential by loginId (case-insensitive).
 * Returns undefined if not a district admin account.
 */
export function resolveDistrictCredential(loginId: string): DistrictCredential | undefined {
  return DISTRICT_CREDENTIAL_REGISTRY.find(
    (d) => d.loginId.toLowerCase() === loginId.toLowerCase()
  );
}

/**
 * The state admin account.
 * loginId is unique and does not match any district.
 */
export const STATE_ADMIN_CREDENTIAL = {
  loginId: 'state_admin',
  fullName: 'Maharashtra State Administrator',
  departmentName: 'Maharashtra Urban Development Department (UDD)',
  role: 'state_admin' as const,
};

/**
 * Returns true if the loginId belongs to the state admin account.
 */
export function isStateAdminLogin(loginId: string): boolean {
  return (
    loginId.toLowerCase() === STATE_ADMIN_CREDENTIAL.loginId ||
    loginId.toLowerCase().includes('state') ||
    loginId.toLowerCase().includes('maharashtra') ||
    loginId.toLowerCase() === 'state.admin@civicresolve.gov'
  );
}
