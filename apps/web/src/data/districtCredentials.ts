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
 * Zone credential registry for Zone-scoped administrative accounts.
 */
export interface ZoneCredential {
  loginId: string;
  districtName: string;
  districtId: string;
  zoneName: string;
  zoneId: string;
  primaryCorpId: string;
  role: 'zone_admin';
  fullName: string;
  departmentName: string;
}

export const ZONE_CREDENTIAL_REGISTRY: ZoneCredential[] = [
  // 1. SOLAPUR (3 Zones)
  {
    loginId: 'solapur_north_admin',
    districtName: 'Solapur',
    districtId: 'solapur',
    zoneName: 'Solapur North',
    zoneId: 'solapur_north',
    primaryCorpId: 'smc',
    role: 'zone_admin',
    fullName: 'Solapur North Zone Administrator',
    departmentName: 'Solapur Municipal Corporation — North Zone Command',
  },
  {
    loginId: 'solapur_south_admin',
    districtName: 'Solapur',
    districtId: 'solapur',
    zoneName: 'Solapur South',
    zoneId: 'solapur_south',
    primaryCorpId: 'smc',
    role: 'zone_admin',
    fullName: 'Solapur South Zone Administrator',
    departmentName: 'Solapur Municipal Corporation — South Zone Command',
  },
  {
    loginId: 'solapur_central_admin',
    districtName: 'Solapur',
    districtId: 'solapur',
    zoneName: 'Solapur Central',
    zoneId: 'solapur_central',
    primaryCorpId: 'smc',
    role: 'zone_admin',
    fullName: 'Solapur Central Zone Administrator',
    departmentName: 'Solapur Municipal Corporation — Central Sector Command',
  },

  // 2. PUNE (3 Zones)
  {
    loginId: 'pune_zone1_admin',
    districtName: 'Pune',
    districtId: 'pune',
    zoneName: 'Zone 1 (Central Pune)',
    zoneId: 'pune_zone_1',
    primaryCorpId: 'pmc',
    role: 'zone_admin',
    fullName: 'Pune Zone 1 Administrator',
    departmentName: 'Pune Municipal Corporation — Central Sector Command',
  },
  {
    loginId: 'pune_zone2_admin',
    districtName: 'Pune',
    districtId: 'pune',
    zoneName: 'Zone 2 (Kothrud)',
    zoneId: 'pune_zone_2',
    primaryCorpId: 'pmc',
    role: 'zone_admin',
    fullName: 'Pune Zone 2 Administrator',
    departmentName: 'Pune Municipal Corporation — Kothrud Sector Command',
  },
  {
    loginId: 'pune_zone3_admin',
    districtName: 'Pune',
    districtId: 'pune',
    zoneName: 'Zone 3 (Ghole Road)',
    zoneId: 'pune_zone_3',
    primaryCorpId: 'pmc',
    role: 'zone_admin',
    fullName: 'Pune Zone 3 Administrator',
    departmentName: 'Pune Municipal Corporation — Ghole Road Sector Command',
  },

  // 3. NASHIK (3 Zones)
  {
    loginId: 'nashik_zone1_admin',
    districtName: 'Nashik',
    districtId: 'nashik',
    zoneName: 'Zone 1 (Nashik West)',
    zoneId: 'nashik_zone_1',
    primaryCorpId: 'nmc',
    role: 'zone_admin',
    fullName: 'Nashik West Zone Administrator',
    departmentName: 'Nashik Municipal Corporation — West Zone Command',
  },
  {
    loginId: 'nashik_zone2_admin',
    districtName: 'Nashik',
    districtId: 'nashik',
    zoneName: 'Zone 2 (Nashik East)',
    zoneId: 'nashik_zone_2',
    primaryCorpId: 'nmc',
    role: 'zone_admin',
    fullName: 'Nashik East Zone Administrator',
    departmentName: 'Nashik Municipal Corporation — East Zone Command',
  },
  {
    loginId: 'nashik_zone3_admin',
    districtName: 'Nashik',
    districtId: 'nashik',
    zoneName: 'Zone 3 (Panchavati)',
    zoneId: 'nashik_zone_3',
    primaryCorpId: 'nmc',
    role: 'zone_admin',
    fullName: 'Nashik Panchavati Zone Administrator',
    departmentName: 'Nashik Municipal Corporation — Panchavati Sector Command',
  },

  // 4. CHHATRAPATI SAMBHAJINAGAR (3 Zones)
  {
    loginId: 'csn_zone1_admin',
    districtName: 'Chhatrapati Sambhajinagar',
    districtId: 'chhatrapati_sambhajinagar',
    zoneName: 'Zone 1 (Cantonment)',
    zoneId: 'csn_zone_1',
    primaryCorpId: 'csmc',
    role: 'zone_admin',
    fullName: 'CSN Zone 1 Administrator',
    departmentName: 'CSMC — Zone 1 Administrative Cell',
  },
  {
    loginId: 'csn_zone2_admin',
    districtName: 'Chhatrapati Sambhajinagar',
    districtId: 'chhatrapati_sambhajinagar',
    zoneName: 'Zone 2 (CIDCO)',
    zoneId: 'csn_zone_2',
    primaryCorpId: 'csmc',
    role: 'zone_admin',
    fullName: 'CSN Zone 2 Administrator',
    departmentName: 'CSMC — Zone 2 CIDCO Command',
  },
  {
    loginId: 'csn_zone3_admin',
    districtName: 'Chhatrapati Sambhajinagar',
    districtId: 'chhatrapati_sambhajinagar',
    zoneName: 'Zone 3 (Kranti Chowk)',
    zoneId: 'csn_zone_3',
    primaryCorpId: 'csmc',
    role: 'zone_admin',
    fullName: 'CSN Zone 3 Administrator',
    departmentName: 'CSMC — Zone 3 Central Command',
  },

  // 5. MUMBAI (3 Zones)
  {
    loginId: 'mumbai_zone1_admin',
    districtName: 'Mumbai',
    districtId: 'mumbai',
    zoneName: 'Zone 1 (South Mumbai)',
    zoneId: 'mumbai_zone_1',
    primaryCorpId: 'bmc',
    role: 'zone_admin',
    fullName: 'Mumbai South Zone Administrator',
    departmentName: 'BMC — South Mumbai Administrative Cell',
  },
  {
    loginId: 'mumbai_zone2_admin',
    districtName: 'Mumbai',
    districtId: 'mumbai',
    zoneName: 'Zone 2 (Western Suburbs)',
    zoneId: 'mumbai_zone_2',
    primaryCorpId: 'bmc',
    role: 'zone_admin',
    fullName: 'Mumbai West Zone Administrator',
    departmentName: 'BMC — Western Suburbs Command',
  },
  {
    loginId: 'mumbai_zone3_admin',
    districtName: 'Mumbai',
    districtId: 'mumbai',
    zoneName: 'Zone 3 (Eastern Suburbs)',
    zoneId: 'mumbai_zone_3',
    primaryCorpId: 'bmc',
    role: 'zone_admin',
    fullName: 'Mumbai East Zone Administrator',
    departmentName: 'BMC — Eastern Suburbs Command',
  },

  // 6. THANE (3 Zones)
  {
    loginId: 'thane_zone1_admin',
    districtName: 'Thane',
    districtId: 'thane',
    zoneName: 'Zone 1 (Naupada/Majiwada)',
    zoneId: 'thane_zone_1',
    primaryCorpId: 'tmc',
    role: 'zone_admin',
    fullName: 'Thane Zone 1 Administrator',
    departmentName: 'TMC — Naupada Sector Command',
  },
  {
    loginId: 'thane_zone2_admin',
    districtName: 'Thane',
    districtId: 'thane',
    zoneName: 'Zone 2 (Wagle Estate)',
    zoneId: 'thane_zone_2',
    primaryCorpId: 'tmc',
    role: 'zone_admin',
    fullName: 'Thane Zone 2 Administrator',
    departmentName: 'TMC — Wagle Industrial Command',
  },
  {
    loginId: 'thane_zone3_admin',
    districtName: 'Thane',
    districtId: 'thane',
    zoneName: 'Zone 3 (Ghodbunder/Kalwa)',
    zoneId: 'thane_zone_3',
    primaryCorpId: 'tmc',
    role: 'zone_admin',
    fullName: 'Thane Zone 3 Administrator',
    departmentName: 'TMC — Ghodbunder & Kalwa Command',
  },

  // 7. NAGPUR (3 Zones)
  {
    loginId: 'nagpur_zone1_admin',
    districtName: 'Nagpur',
    districtId: 'nagpur',
    zoneName: 'Zone 1 (Dharampeth)',
    zoneId: 'nagpur_zone_1',
    primaryCorpId: 'nmc_nagpur',
    role: 'zone_admin',
    fullName: 'Nagpur Zone 1 Administrator',
    departmentName: 'NMC Nagpur — Dharampeth Zone Command',
  },
  {
    loginId: 'nagpur_zone2_admin',
    districtName: 'Nagpur',
    districtId: 'nagpur',
    zoneName: 'Zone 2 (Hanuman Nagar)',
    zoneId: 'nagpur_zone_2',
    primaryCorpId: 'nmc_nagpur',
    role: 'zone_admin',
    fullName: 'Nagpur Zone 2 Administrator',
    departmentName: 'NMC Nagpur — Hanuman Nagar Command',
  },
  {
    loginId: 'nagpur_zone3_admin',
    districtName: 'Nagpur',
    districtId: 'nagpur',
    zoneName: 'Zone 3 (Mangalwari)',
    zoneId: 'nagpur_zone_3',
    primaryCorpId: 'nmc_nagpur',
    role: 'zone_admin',
    fullName: 'Nagpur Zone 3 Administrator',
    departmentName: 'NMC Nagpur — Mangalwari Zone Command',
  },

  // 8. KOLHAPUR (3 Zones)
  {
    loginId: 'kolhapur_zone1_admin',
    districtName: 'Kolhapur',
    districtId: 'kolhapur',
    zoneName: 'Zone 1 (Mahalaxmi)',
    zoneId: 'kolhapur_zone_1',
    primaryCorpId: 'kmc',
    role: 'zone_admin',
    fullName: 'Kolhapur Zone 1 Administrator',
    departmentName: 'KMC — Mahalaxmi Heritage Sector',
  },
  {
    loginId: 'kolhapur_zone2_admin',
    districtName: 'Kolhapur',
    districtId: 'kolhapur',
    zoneName: 'Zone 2 (Rajarampuri)',
    zoneId: 'kolhapur_zone_2',
    primaryCorpId: 'kmc',
    role: 'zone_admin',
    fullName: 'Kolhapur Zone 2 Administrator',
    departmentName: 'KMC — Rajarampuri Zone Command',
  },
  {
    loginId: 'kolhapur_zone3_admin',
    districtName: 'Kolhapur',
    districtId: 'kolhapur',
    zoneName: 'Zone 3 (Shahupuri)',
    zoneId: 'kolhapur_zone_3',
    primaryCorpId: 'kmc',
    role: 'zone_admin',
    fullName: 'Kolhapur Zone 3 Administrator',
    departmentName: 'KMC — Shahupuri Commercial Command',
  },

  // 9. AMRAVATI (3 Zones)
  {
    loginId: 'amravati_zone1_admin',
    districtName: 'Amravati',
    districtId: 'amravati',
    zoneName: 'Zone 1 (Rajapeth)',
    zoneId: 'amravati_zone_1',
    primaryCorpId: 'amc',
    role: 'zone_admin',
    fullName: 'Amravati Zone 1 Administrator',
    departmentName: 'AMC — Rajapeth Zone Command',
  },
  {
    loginId: 'amravati_zone2_admin',
    districtName: 'Amravati',
    districtId: 'amravati',
    zoneName: 'Zone 2 (Gadge Nagar)',
    zoneId: 'amravati_zone_2',
    primaryCorpId: 'amc',
    role: 'zone_admin',
    fullName: 'Amravati Zone 2 Administrator',
    departmentName: 'AMC — Gadge Nagar Zone Command',
  },
  {
    loginId: 'amravati_zone3_admin',
    districtName: 'Amravati',
    districtId: 'amravati',
    zoneName: 'Zone 3 (Camp)',
    zoneId: 'amravati_zone_3',
    primaryCorpId: 'amc',
    role: 'zone_admin',
    fullName: 'Amravati Zone 3 Administrator',
    departmentName: 'AMC — Civil Lines & Camp Command',
  },
];

/**
 * Resolve zone credential by loginId (case-insensitive).
 */
export function resolveZoneCredential(loginId: string): ZoneCredential | undefined {
  return ZONE_CREDENTIAL_REGISTRY.find(
    (z) => z.loginId.toLowerCase() === loginId.toLowerCase()
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

export function isZoneAdminLogin(loginId: string): boolean {
  return resolveZoneCredential(loginId) !== undefined;
}

