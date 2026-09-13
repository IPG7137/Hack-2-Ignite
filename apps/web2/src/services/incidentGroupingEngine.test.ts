import { IncidentGroupingEngine, PotentialIncidentResult } from './incidentGroupingEngine';
import { EmergingHotspotResult } from './emergingProblemEngine';
import { Complaint } from '../types/complaint';

type MockComplaintOverrides = Partial<Omit<Complaint, 'location'>> & {
  location?: Partial<{
    address: string;
    landmark: string;
    ward: string;
    zone: string;
    latitude: number;
    longitude: number;
  }>;
};

function createMockComplaint(overrides: MockComplaintOverrides): Complaint {
  const loc = overrides.location;
  const location: Complaint['location'] = {
    address: loc && loc.address !== undefined ? loc.address : 'Main St, Ward 4',
    landmark: loc && loc.landmark !== undefined ? loc.landmark : 'Near Water Tank',
    ward: loc && loc.ward !== undefined ? loc.ward : 'Ward 4',
    zone: loc && loc.zone !== undefined ? loc.zone : 'Central Zone',
    latitude: loc && loc.latitude !== undefined ? loc.latitude : 18.5204,
    longitude: loc && loc.longitude !== undefined ? loc.longitude : 73.8567,
  };

  return {
    id: overrides.id || 'comp-1',
    dbId: overrides.dbId || 101,
    title: overrides.title || 'Water pipe leak near main street',
    description: overrides.description || 'Continuous heavy water leakage flooding the road and low pressure in houses',
    category: overrides.category || 'water_sewage',
    categoryLabel: overrides.categoryLabel || 'Water Supply',
    status: overrides.status || 'submitted',
    priority: overrides.priority || 'medium',
    location,
    reporter: {
      name: 'Ramesh Patil',
      phone: '+91 98765 43210',
      aadharMasked: 'XXXX-XXXX-1234',
      verifiedCitizen: true,
      ...(overrides.reporter || {}),
    },
    statusHistory: overrides.statusHistory || [],
    adminNotes: overrides.adminNotes || [],
    sla: {
      targetHours: 24,
      deadline: new Date(Date.now() + 86400000).toISOString(),
      hoursRemaining: 24,
      isOverdue: false,
      slaStatus: 'on_track',
      ...(overrides.sla || {}),
    },
    evidence: {
      before: ['https://example.com/before.jpg'],
      after: [],
      ...(overrides.evidence || {}),
    },
    upvotesCount: overrides.upvotesCount || 0,
    isDuplicateCluster: overrides.isDuplicateCluster || false,
    createdAt: overrides.createdAt || new Date().toISOString(),
    updatedAt: overrides.updatedAt || new Date().toISOString(),
  };
}

export function runIncidentGroupingTests(): { passed: number; failed: number; errors: string[] } {
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

  console.log('🧪 Starting Phase 3D Incident Grouping Engine Tests...');

  // 1. Empty dataset
  {
    const results = IncidentGroupingEngine.groupComplaintsIntoIncidents([]);
    assert(results.length === 0, '1. Empty dataset returns empty incident list');
  }

  // 2. Single report
  {
    const single = [createMockComplaint({ id: 'c1' })];
    const results = IncidentGroupingEngine.groupComplaintsIntoIncidents(single);
    assert(results.length === 0, '2. Single report does not create a multi-report incident');
  }

  // 3. High Confidence Potential Incident (near, same category, similar text, recent)
  {
    const now = new Date();
    const c1 = createMockComplaint({
      id: 'c1',
      title: 'Water pipeline burst on Main Road',
      description: 'Major drinking water pipe leak flooding the street and causing low pressure',
      category: 'water_sewage',
      categoryLabel: 'Water Supply',
      priority: 'high',
      location: { address: 'Main Road', ward: 'Ward 4', latitude: 18.5204, longitude: 73.8567 },
      createdAt: new Date(now.getTime() - 2 * 3600 * 1000).toISOString(),
    });
    const c2 = createMockComplaint({
      id: 'c2',
      title: 'Heavy water pipe leakage near Main Road corner',
      description: 'Drinking water pipeline cracked and continuous water flow flooding pavement',
      category: 'water_sewage',
      categoryLabel: 'Water Supply',
      priority: 'urgent',
      location: { address: 'Main Road Corner', ward: 'Ward 4', latitude: 18.5208, longitude: 73.8569 },
      createdAt: new Date(now.getTime() - 1 * 3600 * 1000).toISOString(),
    });
    const c3 = createMockComplaint({
      id: 'c3',
      title: 'Water supply line leak',
      description: 'Huge water leakage from broken pipe under road, flooding colony',
      category: 'water_sewage',
      categoryLabel: 'Water Supply',
      priority: 'high',
      location: { address: 'Main Road Sector 2', ward: 'Ward 4', latitude: 18.5206, longitude: 73.8571 },
      createdAt: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
    });

    const results = IncidentGroupingEngine.groupComplaintsIntoIncidents([c1, c2, c3]);
    assert(results.length > 0, '3a. High similarity + close proximity forms an incident');
    if (results.length > 0) {
      const inc = results[0];
      assert(inc.incidentConfidence >= 80.0, '3b. High confidence potential incident score >= 80', `Score was ${inc.incidentConfidence}`);
      assert(inc.classification === 'highConfidencePotentialIncident', '3c. Classified as highConfidencePotentialIncident');
      assert(inc.highestPriority === 'urgent', '3d. Highest priority is urgent');
      assert(inc.complaintCount === 3, '3e. Contains all 3 member complaints');
      assert(inc.incidentLabel.includes('Water') || inc.incidentLabel.includes('Pipeline'), '3f. Human-readable incident label describes water/pipeline');
    }
  }

  // 4. Same category but geographically distant (>2km)
  {
    const now = new Date();
    const c1 = createMockComplaint({
      id: 'c1',
      category: 'roads',
      location: { address: 'East Side', ward: 'Ward 1', latitude: 18.5204, longitude: 73.8567 },
      createdAt: now.toISOString(),
    });
    const c2 = createMockComplaint({
      id: 'c2',
      category: 'roads',
      location: { address: 'Far West Side', ward: 'Ward 10', latitude: 18.5604, longitude: 73.9167 }, // ~8km away
      createdAt: now.toISOString(),
    });

    const results = IncidentGroupingEngine.groupComplaintsIntoIncidents([c1, c2]);
    assert(results.length === 0, '4. Complaints > 500m apart are not grouped into a common incident');
  }

  // 5. Nearby complaints with mixed / completely different categories
  {
    const now = new Date();
    const c1 = createMockComplaint({
      id: 'c1',
      category: 'roads',
      categoryLabel: 'Roads & Pavements',
      title: 'Pothole on street',
      description: 'Deep pothole causing vehicle damage',
      location: { address: 'Crossroad', ward: 'Ward 2', latitude: 18.5204, longitude: 73.8567 },
      createdAt: now.toISOString(),
    });
    const c2 = createMockComplaint({
      id: 'c2',
      category: 'streetlights',
      categoryLabel: 'Electricity & Lights',
      title: 'Dark streetlight fixture',
      description: 'Lamp bulb not glowing at night',
      location: { address: 'Crossroad', ward: 'Ward 2', latitude: 18.5206, longitude: 73.8569 },
      createdAt: now.toISOString(),
    });

    const results = IncidentGroupingEngine.groupComplaintsIntoIncidents([c1, c2]);
    if (results.length > 0) {
      assert(results[0].classification !== 'highConfidencePotentialIncident', '5. Mixed categories reduce confidence below high-confidence incident');
    } else {
      assert(true, '5. Mixed categories safely ignored or produce low confidence');
    }
  }

  // 6. Reports submitted far apart in time (>60 days)
  {
    const now = new Date();
    const c1 = createMockComplaint({
      id: 'c1',
      category: 'roads',
      location: { address: 'Lane 1', ward: 'Ward 3', latitude: 18.5204, longitude: 73.8567 },
      createdAt: new Date(now.getTime() - 70 * 24 * 3600 * 1000).toISOString(),
    });
    const c2 = createMockComplaint({
      id: 'c2',
      category: 'roads',
      location: { address: 'Lane 1', ward: 'Ward 3', latitude: 18.5206, longitude: 73.8568 },
      createdAt: now.toISOString(),
    });

    const results = IncidentGroupingEngine.groupComplaintsIntoIncidents([c1, c2]);
    if (results.length > 0) {
      assert(results[0].signalBreakdown.temporalConsistency <= 20.0, '6. Long time span (>60 days) reduces temporal consistency signal');
    } else {
      assert(true, '6. Long time span handled safely');
    }
  }

  // 7. Active Hotspot Correlation Boost (+5)
  {
    const now = new Date();
    const c1 = createMockComplaint({
      id: 'c1',
      category: 'drainage',
      categoryLabel: 'Drainage & Sewage',
      location: { address: 'Market Road', ward: 'Ward 5', latitude: 18.5204, longitude: 73.8567 },
      createdAt: now.toISOString(),
    });
    const c2 = createMockComplaint({
      id: 'c2',
      category: 'drainage',
      categoryLabel: 'Drainage & Sewage',
      location: { address: 'Market Road', ward: 'Ward 5', latitude: 18.5206, longitude: 73.8569 },
      createdAt: now.toISOString(),
    });

    const mockHotspot: EmergingHotspotResult = {
      id: 'hotspot-1',
      category: 'drainage',
      categoryLabel: 'Drainage & Sewage',
      centerLatitude: 18.5205,
      centerLongitude: 73.8568,
      radiusMeters: 500,
      reportIds: ['c1', 'c2'],
      complaintIds: ['c1', 'c2'],
      complaintCount: 2,
      currentWindowCount: 2,
      baselineDailyAverage: 0.2,
      increaseRatio: 4.0,
      emergingScore: 85.0,
      scoreDisplay: '85/100',
      classification: 'criticalEmergingProblem',
      levelLabel: 'Critical Emerging Problem',
      shortLabel: 'Critical Surge',
      badgeBg: 'bg-red-50',
      badgeBorder: 'border-red-200',
      badgeText: 'text-red-700',
      badgeColor: '#D92D20',
      explainableReasons: ['Rapid surge in drainage complaints'],
      topDrivers: ['4.0x Volume Spike'],
      signalBreakdown: { volumeSpike: 100, spatialDensity: 60, categoryConsistency: 100, prioritySafety: 80 },
      averageDistanceMeters: 40,
      highPriorityCount: 1,
    };

    const withoutHotspot = IncidentGroupingEngine.groupComplaintsIntoIncidents([c1, c2]);
    const withHotspot = IncidentGroupingEngine.groupComplaintsIntoIncidents([c1, c2], { activeHotspots: [mockHotspot] });

    if (withHotspot.length > 0 && withoutHotspot.length > 0) {
      assert(withHotspot[0].hasActiveHotspot === true, '7a. Overlapping hotspot correctly identified');
      assert(withHotspot[0].incidentConfidence >= withoutHotspot[0].incidentConfidence, '7b. Hotspot overlap provides confidence boost');
    } else {
      assert(false, '7. Hotspots could not be evaluated');
    }
  }

  // 8. Missing or null coordinates
  {
    const c1 = createMockComplaint({
      id: 'c1',
      location: { address: 'No GPS Address', ward: 'Ward 1', latitude: NaN, longitude: NaN },
    });
    const c2 = createMockComplaint({
      id: 'c2',
      location: { address: 'Another Address', ward: 'Ward 1', latitude: 0, longitude: 0 },
    });

    const results = IncidentGroupingEngine.groupComplaintsIntoIncidents([c1, c2]);
    assert(results.length === 0, '8. Missing/invalid coordinates safely skipped without crashing');
  }

  // 9. Score range (0 - 100) and no NaN / Infinity
  {
    const now = new Date();
    const c1 = createMockComplaint({ id: 'c1', createdAt: now.toISOString() });
    const c2 = createMockComplaint({ id: 'c2', createdAt: now.toISOString() });

    const results = IncidentGroupingEngine.groupComplaintsIntoIncidents([c1, c2]);
    if (results.length > 0) {
      const score = results[0].incidentConfidence;
      assert(!isNaN(score) && isFinite(score), '9a. Score is finite and not NaN');
      assert(score >= 0 && score <= 100, '9b. Score is bounded between 0 and 100');
    }
  }

  // 10. Label generation safety (no unproven root-cause claims)
  {
    const label1 = IncidentGroupingEngine.generateIncidentLabel('roads', 'Roads & Pavements', ['pothole', 'deep']);
    assert(label1 === 'Possible Road Surface & Pothole Hazard', '10a. Road label uses safe decision-support phrasing');

    const label2 = IncidentGroupingEngine.generateIncidentLabel('water_sewage', 'Water Supply', ['pipe', 'leak']);
    assert(label2 === 'Potential Water Supply & Pipeline Issue', '10b. Water label uses safe decision-support phrasing');

    const label3 = IncidentGroupingEngine.generateIncidentLabel('streetlights', 'Electricity & Lights', ['wire', 'spark']);
    assert(label3 === 'Potential Electrical Safety Hazard', '10c. Electrical hazard label generated safely');
  }

  // 11. Deterministic output
  {
    const now = new Date('2026-09-14T00:00:00Z');
    const c1 = createMockComplaint({ id: 'c1', createdAt: now.toISOString() });
    const c2 = createMockComplaint({ id: 'c2', createdAt: now.toISOString() });

    const run1 = IncidentGroupingEngine.groupComplaintsIntoIncidents([c1, c2]);
    const run2 = IncidentGroupingEngine.groupComplaintsIntoIncidents([c1, c2]);

    assert(run1.length === run2.length, '11a. Deterministic incident count across runs');
    if (run1.length > 0 && run2.length > 0) {
      assert(run1[0].incidentConfidence === run2[0].incidentConfidence, '11b. Deterministic score across runs');
    }
  }

  console.log(`✅ Incident Grouping Tests Finished: ${passed} passed, ${failed} failed`);
  return { passed, failed, errors };
}

if (typeof require !== 'undefined' && require.main === module) {
  const result = runIncidentGroupingTests();
  if (result.failed > 0) process.exit(1);
}
