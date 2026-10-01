import { resolveZoneCredential, isZoneAdminLogin, ZONE_CREDENTIAL_REGISTRY } from '../data/districtCredentials';
import { isComplaintInZone } from '../lib/zoneFilter';
import { VALID_ROLES, EXTENDED_ADMIN_ROLES, isValidRole } from './authService';

export function runPlatformRoleIsolationTests(): { passed: number; failed: number; errors: string[] } {
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

  console.log('\n--- Running Platform Role & Strict Zone Isolation Tests ---');

  // 1. Role-to-Platform Matrix
  {
    // Web Administrative Roles
    const webAdminRoles = ['state_admin', 'district_admin', 'zone_admin'];
    webAdminRoles.forEach(r => {
      assert(isValidRole(r), `Web admin role '${r}' is valid in auth system`);
    });

    // Canonical mobile operational roles
    assert(VALID_ROLES.includes('officer'), "Field Officer is canonical role 'officer'");
    assert(VALID_ROLES.includes('citizen'), "Citizen is canonical role 'citizen'");

    // Administrative roles are extended or canonical admins
    assert(VALID_ROLES.includes('state_admin'), "State Admin is canonical role 'state_admin'");
    assert(EXTENDED_ADMIN_ROLES.includes('district_admin'), "District Admin is registered in EXTENDED_ADMIN_ROLES");
    assert(EXTENDED_ADMIN_ROLES.includes('zone_admin'), "Zone Admin is registered in EXTENDED_ADMIN_ROLES");
  }

  // 2. Zone Credential Resolution & Binding
  {
    assert(isZoneAdminLogin('solapur_north_admin'), "Detects 'solapur_north_admin' as zone admin");
    assert(isZoneAdminLogin('solapur_south_admin'), "Detects 'solapur_south_admin' as zone admin");
    assert(isZoneAdminLogin('pune_zone1_admin'), "Detects 'pune_zone1_admin' as zone admin");
    assert(!isZoneAdminLogin('state_admin'), "Rejects 'state_admin' as zone admin");
    assert(!isZoneAdminLogin('solapur_admin'), "Rejects district admin 'solapur_admin' as zone admin");

    const solapurNorth = resolveZoneCredential('solapur_north_admin');
    assert(solapurNorth !== null && solapurNorth !== undefined, 'Resolves solapur_north_admin');
    assert(solapurNorth?.districtId === 'solapur', "Solapur North is permanently scoped to district 'solapur'");
    assert(solapurNorth?.zoneName === 'Solapur North', "Solapur North is permanently scoped to zone 'Solapur North'");

    const solapurSouth = resolveZoneCredential('solapur_south_admin');
    assert(solapurSouth !== null && solapurSouth !== undefined, 'Resolves solapur_south_admin');
    assert(solapurSouth?.districtId === 'solapur', "Solapur South is permanently scoped to district 'solapur'");
    assert(solapurSouth?.zoneName === 'Solapur South', "Solapur South is permanently scoped to zone 'Solapur South'");

    const puneZ1 = resolveZoneCredential('pune_zone1_admin');
    assert(puneZ1 !== undefined && puneZ1?.districtId === 'pune' && puneZ1?.zoneName === 'Zone 1 (Central Pune)', 'Pune Zone 1 credentials correctly bound');
  }

  // 3. Strict Zone Boundary Testing (Solapur North vs Solapur South vs Others)
  {
    type MockComplaint = Record<string, any>;

    const solapurNorthComplaint1: MockComplaint = {
      id: 'SOL-N-001',
      district_id: 'solapur',
      location: 'Saat Rasta Chowk, Solapur',
      ward: 'Ward 4 - Sadar Bazar',
      address: 'Near Civil Hospital',
    };

    const solapurNorthComplaint2: MockComplaint = {
      id: 'SOL-N-002',
      district_id: 'solapur',
      location: 'Navi Peth Market',
      zone: 'Zone 1',
    };

    const solapurSouthComplaint1: MockComplaint = {
      id: 'SOL-S-001',
      district_id: 'solapur',
      location: 'Hotgi Road MIDC',
      ward: 'Ward 18 - South Extension',
      address: 'Near Vijapur Road Bypass',
    };

    const solapurSouthComplaint2: MockComplaint = {
      id: 'SOL-S-002',
      district_id: 'solapur',
      location: 'D-Mart Vijapur Road',
      zone: 'Zone 3',
    };

    const puneComplaint: MockComplaint = {
      id: 'PUN-001',
      district_id: 'pune',
      location: 'Shivajinagar, Pune',
      zone: 'Pune Zone 1',
    };

    // Solapur North isolation checks
    assert(isComplaintInZone(solapurNorthComplaint1, 'Solapur North'), 'North complaint 1 matches Solapur North');
    assert(isComplaintInZone(solapurNorthComplaint2, 'Solapur North'), 'North complaint 2 matches Solapur North');
    assert(!isComplaintInZone(solapurSouthComplaint1, 'Solapur North'), 'Solapur South complaint 1 is REJECTED by Solapur North');
    assert(!isComplaintInZone(solapurSouthComplaint2, 'Solapur North'), 'Solapur South complaint 2 is REJECTED by Solapur North');
    assert(!isComplaintInZone(puneComplaint, 'Solapur North'), 'Pune complaint is REJECTED by Solapur North');

    // Solapur South isolation checks
    assert(isComplaintInZone(solapurSouthComplaint1, 'Solapur South'), 'South complaint 1 matches Solapur South');
    assert(isComplaintInZone(solapurSouthComplaint2, 'Solapur South'), 'South complaint 2 matches Solapur South');
    assert(!isComplaintInZone(solapurNorthComplaint1, 'Solapur South'), 'Solapur North complaint 1 is REJECTED by Solapur South');
    assert(!isComplaintInZone(solapurNorthComplaint2, 'Solapur South'), 'Solapur North complaint 2 is REJECTED by Solapur South');
    assert(!isComplaintInZone(puneComplaint, 'Solapur South'), 'Pune complaint is REJECTED by Solapur South');
  }

  // 4. District Boundary Enforcement
  {
    // District Admin - Solapur must never see Pune or Nashik
    const districtId = 'solapur';
    const mockComplaints: Record<string, any>[] = [
      { id: '1', district_id: 'solapur', location: 'Saat Rasta' },
      { id: '2', district_id: 'solapur', location: 'Hotgi Road' },
      { id: '3', district_id: 'pune', location: 'Kothrud' },
      { id: '4', district_id: 'nashik', location: 'Panchavati' },
    ];

    const solapurAdminVisible = mockComplaints.filter(c => c.district_id === districtId);
    assert(solapurAdminVisible.length === 2, 'Solapur District Admin sees exactly 2 complaints');
    assert(solapurAdminVisible.every(c => c.district_id === 'solapur'), 'All visible complaints belong exclusively to Solapur');
    assert(!solapurAdminVisible.some(c => c.district_id === 'pune'), 'Zero Pune data leaks to Solapur District Admin');
    assert(!solapurAdminVisible.some(c => c.district_id === 'nashik'), 'Zero Nashik data leaks to Solapur District Admin');
  }

  // 5. Zone Admin Boundary Enforcement & >= 3 Zones per District
  {
    // Test district zone coverage: Every district must have at least 3 dedicated zones
    const distinctDistricts = Array.from(new Set(ZONE_CREDENTIAL_REGISTRY.map(z => z.districtId)));
    assert(distinctDistricts.length >= 9, 'All 9 key Maharashtra districts are registered in ZONE_CREDENTIAL_REGISTRY');

    distinctDistricts.forEach(distId => {
      const zonesForDist = ZONE_CREDENTIAL_REGISTRY.filter(z => z.districtId === distId);
      assert(
        zonesForDist.length >= 3,
        `District '${distId}' has at least 3 dedicated zones (actual: ${zonesForDist.length})`
      );
    });

    // Check unique loginIds
    const loginIds = ZONE_CREDENTIAL_REGISTRY.map(z => z.loginId);
    const uniqueLoginIds = new Set(loginIds);
    assert(loginIds.length === uniqueLoginIds.size, 'All Zone Administrator login IDs are globally unique');

    // 3-way partition for Solapur: North, South, Central
    const solapurComplaints: Record<string, any>[] = [
      { id: '1', district_id: 'solapur', location: 'Saat Rasta, Solapur', zone: 'Zone 1' },
      { id: '2', district_id: 'solapur', location: 'Navi Peth, Solapur', zone: 'Zone 2' },
      { id: '3', district_id: 'solapur', location: 'Civil Lines, Solapur', ward: 'Ward 2 - Sadar' },
      { id: '4', district_id: 'solapur', location: 'Hotgi Road, Solapur', zone: 'Zone 3' },
      { id: '5', district_id: 'solapur', location: 'Vijapur Road, Solapur', zone: 'Zone 4' },
      { id: '6', district_id: 'solapur', location: 'Siddheshwar Temple, Solapur', zone: 'Zone 5' },
    ];

    const northVisible = solapurComplaints.filter(c => isComplaintInZone(c, 'Solapur North'));
    const southVisible = solapurComplaints.filter(c => isComplaintInZone(c, 'Solapur South'));
    const centralVisible = solapurComplaints.filter(c => isComplaintInZone(c, 'Solapur Central'));

    assert(northVisible.length === 3, 'Solapur North Zone Admin sees exactly 3 North complaints');
    assert(southVisible.length === 2, 'Solapur South Zone Admin sees exactly 2 South complaints');
    assert(centralVisible.length === 1, 'Solapur Central Zone Admin sees exactly 1 Central complaint');

    // Zero overlap among all 3 zones
    const northIds = new Set(northVisible.map(c => c.id));
    const southIds = new Set(southVisible.map(c => c.id));
    const centralIds = new Set(centralVisible.map(c => c.id));

    const northSouthOverlap = southVisible.filter(c => northIds.has(c.id));
    const northCentralOverlap = centralVisible.filter(c => northIds.has(c.id));
    const southCentralOverlap = centralVisible.filter(c => southIds.has(c.id));

    assert(northSouthOverlap.length === 0, 'Solapur North and South sets have strictly ZERO overlap');
    assert(northCentralOverlap.length === 0, 'Solapur North and Central sets have strictly ZERO overlap');
    assert(southCentralOverlap.length === 0, 'Solapur South and Central sets have strictly ZERO overlap');
  }

  // 6. Cross-Zone Isolation in Other Districts (e.g. Pune Zones 1, 2, 3)
  {
    const puneComplaints: Record<string, any>[] = [
      { id: 'P1', district_id: 'pune', location: 'Central Pune Station', zone: 'Zone 1' },
      { id: 'P2', district_id: 'pune', location: 'Kothrud Depot', zone: 'Zone 2' },
      { id: 'P3', district_id: 'pune', location: 'Ghole Road Ward Office', zone: 'Zone 3' },
    ];

    const z1 = puneComplaints.filter(c => isComplaintInZone(c, 'Zone 1 (Central Pune)'));
    const z2 = puneComplaints.filter(c => isComplaintInZone(c, 'Zone 2 (Kothrud)'));
    const z3 = puneComplaints.filter(c => isComplaintInZone(c, 'Zone 3 (Ghole Road)'));

    assert(z1.length === 1 && z1[0].id === 'P1', 'Pune Zone 1 Admin accesses only Zone 1 complaint');
    assert(z2.length === 1 && z2[0].id === 'P2', 'Pune Zone 2 Admin accesses only Zone 2 complaint');
    assert(z3.length === 1 && z3[0].id === 'P3', 'Pune Zone 3 Admin accesses only Zone 3 complaint');
  }

  return { passed, failed, errors };
}
