import { EmergingProblemEngine } from './emergingProblemEngine';
import { Complaint } from '../types/complaint';

function createMockComplaint(overrides: Partial<Complaint>): Complaint {
  return {
    id: 'CR-101',
    dbId: 101,
    title: 'Standard complaint',
    description: 'General municipal maintenance required.',
    category: 'roads',
    categoryLabel: 'Roads & Potholes',
    location: {
      address: 'Main Road',
      landmark: 'Shop',
      ward: 'Ward 01',
      zone: 'Central Zone',
      latitude: 17.6668,
      longitude: 75.9235,
    },
    status: 'submitted',
    priority: 'medium',
    reporter: {
      name: 'Ramesh Sharma',
      phone: '+91 98765 43210',
      aadharMasked: 'XXXX-XXXX-1234',
      verifiedCitizen: true,
    },
    evidence: { before: [] },
    statusHistory: [],
    adminNotes: [],
    sla: {
      targetHours: 48,
      hoursRemaining: 40,
      slaStatus: 'on_track',
      deadline: new Date(Date.now() + 144000000).toISOString(),
      isOverdue: false,
    },
    upvotesCount: 1,
    isDuplicateCluster: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function runEmergingProblemTests(): { passed: number; failed: number; errors: string[] } {
  const errors: string[] = [];
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      passed++;
    } else {
      failed++;
      errors.push(message);
      console.error(`❌ TEST FAILED: ${message}`);
    }
  }

  console.log('🧪 Starting Phase 3C Emerging Problem Engine Tests...');
  const refTime = new Date('2026-09-14T12:00:00Z');

  // Test 1: No complaints returns empty array
  const emptyRes = EmergingProblemEngine.detectHotspots([], { referenceTime: refTime });
  assert(emptyRes.length === 0, `Test 1: Empty complaints should return []`);

  // Test 2: Missing coordinates complaints are safely ignored
  const missingCoordReport = createMockComplaint({
    id: 'CR-NO-COORD',
    location: {
      address: 'Unknown',
      landmark: '',
      ward: '',
      zone: '',
      latitude: NaN,
      longitude: NaN,
    },
  });
  const missingRes = EmergingProblemEngine.detectHotspots([missingCoordReport], { referenceTime: refTime });
  assert(missingRes.length === 0, `Test 2: Missing coordinate report should not produce hotspot`);

  // Test 3: Strong recent volume surge in 24h within 500m (same category: roads) => Emerging Problem / Critical
  const surgeReports: Complaint[] = [];
  for (let i = 1; i <= 6; i++) {
    surgeReports.push(
      createMockComplaint({
        id: `CR-SURGE-${i}`,
        dbId: 200 + i,
        title: `Pothole crater on MG Road block ${i}`,
        description: `Dangerous road crater near block ${i}`,
        category: 'roads',
        location: {
          address: 'MG Road',
          landmark: `Block ${i}`,
          ward: 'Ward 1',
          zone: 'Zone A',
          latitude: 17.6668 + (i * 0.0005), // ~50m apart
          longitude: 75.9235 + (i * 0.0005),
        },
        priority: i <= 2 ? 'urgent' : 'high',
        createdAt: new Date(refTime.getTime() - (i * 3600 * 1000)).toISOString(), // Last 6 hours
      })
    );
  }

  const surgeRes = EmergingProblemEngine.detectHotspots(surgeReports, { referenceTime: refTime });
  assert(surgeRes.length >= 1, `Test 3: Surge cluster should produce at least 1 hotspot`);
  const topSurge = surgeRes[0];
  assert(
    topSurge.emergingScore >= 60.0,
    `Test 3: Surge cluster score should be >= 60.0 (Emerging/Critical), got ${topSurge.emergingScore}`
  );
  assert(
    topSurge.classification === 'emergingProblem' || topSurge.classification === 'criticalEmergingProblem',
    `Test 3: Classification should be emergingProblem or critical, got ${topSurge.classification}`
  );
  assert(
    topSurge.reportIds.length === 6,
    `Test 3: All 6 reports should be in the hotspot cluster, got ${topSurge.reportIds.length}`
  );

  // Test 4: Complaints far away (>2km) do not group into the same hotspot
  const farReport = createMockComplaint({
    id: 'CR-FAR',
    dbId: 301,
    title: 'Pothole in distant suburb',
    category: 'roads',
    location: {
      address: 'Distant Suburb',
      landmark: 'Gate',
      ward: 'Ward 9',
      zone: 'Zone D',
      latitude: 17.7500, // ~10km away
      longitude: 76.0100,
    },
    createdAt: new Date(refTime.getTime() - 7200000).toISOString(),
  });

  const combinedRes = EmergingProblemEngine.detectHotspots([...surgeReports, farReport], { referenceTime: refTime });
  assert(
    !combinedRes[0].reportIds.includes('CR-FAR'),
    `Test 4: Far-away report should not be merged into MG Road cluster`
  );

  // Test 5: Category consistency: Mixed categories reduce category consistency score
  const mixedReports: Complaint[] = [
    createMockComplaint({
      id: 'CR-MIX-1',
      dbId: 401,
      category: 'roads',
      location: { address: 'A', landmark: '', ward: '', zone: '', latitude: 17.6668, longitude: 75.9235 },
      createdAt: refTime.toISOString(),
    }),
    createMockComplaint({
      id: 'CR-MIX-2',
      dbId: 402,
      category: 'streetlights',
      location: { address: 'B', landmark: '', ward: '', zone: '', latitude: 17.6670, longitude: 75.9236 },
      createdAt: refTime.toISOString(),
    }),
    createMockComplaint({
      id: 'CR-MIX-3',
      dbId: 403,
      category: 'waste_management',
      location: { address: 'C', landmark: '', ward: '', zone: '', latitude: 17.6669, longitude: 75.9237 },
      createdAt: refTime.toISOString(),
    }),
  ];

  const mixedRes = EmergingProblemEngine.detectHotspots(mixedReports, { referenceTime: refTime });
  if (mixedRes.length > 0) {
    assert(
      mixedRes[0].signalBreakdown.categoryConsistency < 60.0,
      `Test 5: Mixed categories should reduce consistency score, got ${mixedRes[0].signalBreakdown.categoryConsistency}`
    );
  }

  // Test 6: Inactive historical complaints outside 24h window receive reduced activity score
  const oldReports: Complaint[] = [
    createMockComplaint({
      id: 'CR-OLD-1',
      dbId: 501,
      category: 'roads',
      location: { address: 'A', landmark: '', ward: '', zone: '', latitude: 17.6668, longitude: 75.9235 },
      createdAt: new Date(refTime.getTime() - 4 * 86400 * 1000).toISOString(), // 4 days ago
    }),
    createMockComplaint({
      id: 'CR-OLD-2',
      dbId: 502,
      category: 'roads',
      location: { address: 'B', landmark: '', ward: '', zone: '', latitude: 17.6669, longitude: 75.9236 },
      createdAt: new Date(refTime.getTime() - 5 * 86400 * 1000).toISOString(), // 5 days ago
    }),
  ];

  const oldRes = EmergingProblemEngine.detectHotspots(oldReports, { referenceTime: refTime });
  if (oldRes.length > 0) {
    assert(
      oldRes[0].currentWindowCount === 0,
      `Test 6: Old reports should have 0 current window count`
    );
    assert(
      oldRes[0].emergingScore < 50.0,
      `Test 6: Inactive cluster should have low emerging score, got ${oldRes[0].emergingScore}`
    );
  }

  // Test 7: Score boundary and NaN safety
  for (const r of [surgeRes, combinedRes, mixedRes, oldRes]) {
    for (const h of r) {
      assert(!isNaN(h.emergingScore), `Test 7: Score should never be NaN`);
      assert(isFinite(h.emergingScore), `Test 7: Score should never be Infinity`);
      assert(h.emergingScore >= 0.0 && h.emergingScore <= 100.0, `Test 7: Score must be in 0..100 range, got ${h.emergingScore}`);
      assert(h.centerLatitude >= -90 && h.centerLatitude <= 90, `Test 7: Centroid latitude valid`);
      assert(h.centerLongitude >= -180 && h.centerLongitude <= 180, `Test 7: Centroid longitude valid`);
    }
  }

  // Test 8: Deterministic output across multiple executions
  const det1 = EmergingProblemEngine.detectHotspots(surgeReports, { referenceTime: refTime });
  const det2 = EmergingProblemEngine.detectHotspots(surgeReports, { referenceTime: refTime });
  assert(
    det1.length === det2.length && det1[0].emergingScore === det2[0].emergingScore,
    `Test 8: Output must be strictly deterministic`
  );

  console.log(`✅ Emerging Problem Tests Finished: ${passed} passed, ${failed} failed`);
  return { passed, failed, errors };
}
