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

  // Test 9: getContributingComplaints extracts the matching complaint objects
  const contributing = EmergingProblemEngine.getContributingComplaints(surgeRes[0], surgeReports);
  assert(
    contributing.length === 6,
    `Test 9: Contributing complaints should match all 6 reports, got ${contributing.length}`
  );
  assert(
    contributing.every((c) => surgeRes[0].complaintIds.includes(c.id)),
    `Test 9: All extracted complaints must be in the hotspot's complaintIds list`
  );

  // Test 10: generateGeoJSON produces valid FeatureCollection
  const geojson = EmergingProblemEngine.generateGeoJSON(surgeRes);
  assert(
    geojson.type === 'FeatureCollection',
    `Test 10: GeoJSON type must be FeatureCollection`
  );
  assert(
    geojson.features.length === surgeRes.length,
    `Test 10: GeoJSON features count must match hotspots count`
  );
  assert(
    geojson.features[0].geometry.type === 'Polygon',
    `Test 10: Geometry type must be Polygon`
  );
  assert(
    geojson.features[0].geometry.coordinates[0].length >= 32,
    `Test 10: Polygon ring must have at least 32 geodesic coordinate points`
  );
  assert(
    geojson.features[0].properties.id === surgeRes[0].id,
    `Test 10: Feature properties must preserve hotspot ID`
  );

  // Test 11: generateCircleCoordinates creates closed geodesic ring
  const circleCoords = EmergingProblemEngine.generateCircleCoordinates(17.6599, 75.9064, 500, 32);
  assert(circleCoords.length === 33, `Test 11: 32-point circle must contain 33 coordinates (closed loop)`);
  assert(
    Math.abs(circleCoords[0][0] - circleCoords[32][0]) < 0.0001 &&
    Math.abs(circleCoords[0][1] - circleCoords[32][1]) < 0.0001,
    `Test 11: First and last coordinates must match to form closed polygon`
  );

  // Test 12: Zero PII leaked in hotspot summary and driver records
  const serialized = JSON.stringify(surgeRes);
  assert(!serialized.includes('+91 98765 43210'), `Test 12: Phone number must never leak in hotspot results`);
  assert(!serialized.includes('XXXX-XXXX-1234'), `Test 12: Aadhaar number must never leak in hotspot results`);
  assert(!serialized.includes('Ramesh Sharma'), `Test 12: Citizen name must never leak in hotspot results`);

  // Test 13: Multiple spatial clusters in different quadrants form distinct hotspots
  const cluster2Reports: Complaint[] = [];
  for (let i = 1; i <= 4; i++) {
    cluster2Reports.push(
      createMockComplaint({
        id: `CR-WATER-${i}`,
        dbId: 600 + i,
        title: `Water pipeline rupture near Station Road #${i}`,
        category: 'water_sewage',
        location: {
          address: 'Station Road',
          landmark: '',
          ward: 'Ward 4',
          zone: 'Zone B',
          latitude: 17.6800 + (i * 0.0003), // ~3km away from cluster 1
          longitude: 75.9400 + (i * 0.0003),
        },
        priority: 'urgent',
        createdAt: new Date(refTime.getTime() - (i * 1800 * 1000)).toISOString(),
      })
    );
  }

  const multiHotspots = EmergingProblemEngine.detectHotspots(
    [...surgeReports, ...cluster2Reports],
    { referenceTime: refTime }
  );
  assert(
    multiHotspots.length >= 2,
    `Test 13: Two geographically separate clusters must produce >= 2 hotspots, got ${multiHotspots.length}`
  );
  const categories = multiHotspots.map((h) => h.category);
  assert(
    categories.includes('roads') && categories.includes('water_sewage'),
    `Test 13: Separate category hotspots must be distinctly categorized`
  );

  // Test 14: Top drivers & explainable reasons are generated
  assert(
    surgeRes[0].explainableReasons.length > 0,
    `Test 14: Hotspot must contain at least 1 explainable reason`
  );
  assert(
    surgeRes[0].topDrivers.length > 0,
    `Test 14: Hotspot must contain at least 1 top driver tag`
  );

  console.log(`✅ Emerging Problem Tests Finished: ${passed} passed, ${failed} failed`);
  return { passed, failed, errors };
}

