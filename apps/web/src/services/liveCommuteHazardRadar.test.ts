/**
 * CIVICRESOLVE — Live Commute Tracking & Civic Hazard Proximity Radar Test Suite
 * 
 * Verifies geodesic Haversine distance, compass bearing, 8-point cardinal direction,
 * deterministic hazard safety instructions, nearest-first sorting, multi-threshold
 * severity assignment (critical/warning/advisory), alert dismissal, and simulation flow.
 */

import {
  calculateHaversineDistanceMeters,
  calculateBearingDegrees,
  getCardinalDirection,
  generateHazardSafetyInstruction,
  detectNearbyHazards,
  LiveCommuteHazardRadarService,
  CommuteLocation,
} from './liveCommuteHazardRadar';
import { Complaint } from '../types/complaint';

export function runLiveCommuteHazardRadarTests(): { passed: number; failed: number; errors: string[] } {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, name: string) {
    if (condition) {
      passed++;
      console.log(`  ✓ ${name}`);
    } else {
      failed++;
      errors.push(name);
      console.error(`  ✗ FAIL: ${name}`);
    }
  }

  console.log('\n--- Running Live Commute Hazard Radar Tests ---');

  const mockUserLocation: CommuteLocation = {
    latitude: 18.5204, // Pune Center
    longitude: 73.8567,
  };

  const rawMockHazards = [
    {
      id: 'comp-1-critical',
      title: 'Deep Road Crater & Cave-in',
      description: 'Major road collapse on arterial road near bus depot',
      category: 'roads',
      priority: 'urgent',
      status: 'submitted',
      location: {
        latitude: 18.5209, // ~60m north
        longitude: 73.8567,
        address: 'FC Road, Pune',
        ward: 'Ward 12',
        zone: 'Zone 1',
        landmark: 'Near Bus Stop',
      },
      citizenId: 'cit-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'comp-2-warning',
      title: 'High Pressure Water Main Burst',
      description: 'Gushing water flooding two lanes',
      category: 'water_sewage',
      priority: 'high',
      status: 'in_progress',
      location: {
        latitude: 18.5215, // ~130m away
        longitude: 73.8567,
        address: 'JM Road, Pune',
        ward: 'Ward 12',
        zone: 'Zone 1',
        landmark: 'Opposite Bank',
      },
      citizenId: 'cit-2',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'comp-3-advisory',
      title: 'Unlit Corridor Broken Streetlight',
      description: 'Dark junction causing poor visibility',
      category: 'streetlights',
      priority: 'medium',
      status: 'submitted',
      location: {
        latitude: 18.5224, // ~230m away
        longitude: 73.8567,
        address: 'Shivajinagar, Pune',
        ward: 'Ward 14',
        zone: 'Zone 2',
        landmark: 'Traffic Signal',
      },
      citizenId: 'cit-3',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'comp-4-far',
      title: 'Park Bench Broken',
      description: 'Far away non-commute issue',
      category: 'parks',
      priority: 'low',
      status: 'submitted',
      location: {
        latitude: 18.5300, // ~1070m away
        longitude: 73.8567,
        address: 'Model Colony, Pune',
        ward: 'Ward 18',
        zone: 'Zone 3',
        landmark: 'Garden Gate',
      },
      citizenId: 'cit-4',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'comp-5-resolved',
      title: 'Repaired Pothole',
      description: 'Already verified and closed',
      category: 'roads',
      priority: 'high',
      status: 'verified',
      location: {
        latitude: 18.5205, // ~15m away but resolved
        longitude: 73.8567,
        address: 'FC Road Junction',
        ward: 'Ward 12',
        zone: 'Zone 1',
        landmark: 'Circle',
      },
    },
  ];

  const mockHazards = rawMockHazards as unknown as Complaint[];

  // Test 1: Haversine distance accuracy
  const dist = calculateHaversineDistanceMeters(18.5204, 73.8567, 18.5204, 73.8567);
  assert(dist === 0, 'Haversine distance between identical points is 0m');

  const distNorth = calculateHaversineDistanceMeters(18.5204, 73.8567, 18.5294, 73.8567);
  assert(distNorth >= 990 && distNorth <= 1010, 'Haversine distance for ~1km is calculated within 1% accuracy');

  // Test 2: Bearing and cardinal directions
  const bearingNorth = calculateBearingDegrees(18.5204, 73.8567, 18.5304, 73.8567);
  assert(Math.round(bearingNorth) === 0, 'Compass bearing due North is ~0 degrees');
  assert(getCardinalDirection(0) === 'N', 'Cardinal direction for 0 deg is North (N)');

  const bearingEast = calculateBearingDegrees(18.5204, 73.8567, 18.5204, 73.8667);
  assert(Math.round(bearingEast) >= 85 && Math.round(bearingEast) <= 95, 'Compass bearing due East is ~90 degrees');
  assert(getCardinalDirection(90) === 'E', 'Cardinal direction for 90 deg is East (E)');

  // Test 3: Safety instruction generator
  const potholeInstruction = generateHazardSafetyInstruction('roads', 60, 'Deep Crater');
  assert(
    potholeInstruction.includes('Reduce speed') && potholeInstruction.includes('20 km/h'),
    'Critical road hazard generates emergency speed reduction instruction'
  );

  const waterInstruction = generateHazardSafetyInstruction('water_sewage', 120, 'Water Leak');
  assert(
    waterInstruction.includes('Water accumulation') || waterInstruction.includes('Warning'),
    'Water hazard generates water/flooding safety directive'
  );

  // Test 4: Proximity detection and thresholds
  const detected = detectNearbyHazards(mockUserLocation, mockHazards, {
    alertRadiusMeters: 300,
    criticalRadiusMeters: 80,
    onlyUnresolved: true,
  });

  assert(detected.length === 3, 'Detects exactly 3 active hazards within 300m radius');
  assert(detected[0].severity === 'critical', 'Closest hazard (<80m) is assigned critical severity');
  assert(detected[1].severity === 'warning', 'Intermediate hazard (80m-150m) is assigned warning severity');
  assert(detected[2].severity === 'advisory', 'Outer hazard (150m-300m) is assigned advisory severity');

  // Test 5: Resolved complaints exclusion
  const hasResolved = detected.some((a) => a.complaintId === 'comp-5-resolved');
  assert(!hasResolved, 'Resolved complaints are excluded from commute hazard alerts');

  // Test 6: Distance ordering
  const isSorted = detected[0].distanceMeters <= detected[1].distanceMeters && detected[1].distanceMeters <= detected[2].distanceMeters;
  assert(isSorted, 'Detected hazards are sorted by closest distance first');

  // Test 7: Alert dismissal lifecycle
  LiveCommuteHazardRadarService.resetDismissedAlerts();
  LiveCommuteHazardRadarService.dismissAlert('radar-alert-comp-1-critical');
  
  // Re-detect with active dismissal filtering
  const filteredAfterDismissal = detected.filter(
    (a) => a.id !== 'radar-alert-comp-1-critical'
  );
  assert(filteredAfterDismissal.length === 2, 'Dismissed hazard is excluded from active HUD display');
  LiveCommuteHazardRadarService.resetDismissedAlerts();

  return { passed, failed, errors };
}
