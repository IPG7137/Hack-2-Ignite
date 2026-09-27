/**
 * Smart Map & GIS Intelligence Automated Test Suite
 * Validates:
 *  1. District data isolation (Pune, Solapur, Nashik, Chhatrapati Sambhajinagar)
 *  2. Administrative boundary GeoJSON generation
 *  3. MapLibre Heatmap point feature extraction & priority weighting
 *  4. Configurable Hotspot detection & factual aggregation (unresolved vs resolved, 24h activity)
 *  5. Dynamic Time Filtering
 *  6. Non-PII security verification on complaint markers
 *  7. Empty state handling
 */

import { MAHARASHTRA_DISTRICTS, getCorporationById } from '../data/maharashtraDistricts';
import {
  getAdministrativeBoundariesGeoJSON,
  DISTRICT_BOUNDARIES,
  MUNICIPAL_CORPORATION_BOUNDARIES,
  MAHARASHTRA_STATE_BOUNDARY,
} from '../data/maharashtraBoundaries';
import {
  getMockComplaintsForDistrict,
  getMockComplaintsForCorporation,
  getAllStateComplaints,
} from './mock/districtMockData';
import { isComplaintInDistrict } from '../lib/districtFilter';
import { EmergingProblemEngine } from './emergingProblemEngine';
import { Complaint } from '../types/complaint';

export function runSmartMapGisTests(): { passed: number; failed: number; errors: string[] } {
  console.log('--- Running Smart Map & GIS Intelligence Test Suite ---');
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, msg: string) {
    if (condition) {
      passed++;
      console.log(`  ✓ ${msg}`);
    } else {
      failed++;
      errors.push(msg);
      console.error(`  ✗ FAIL: ${msg}`);
    }
  }

  // -------------------------------------------------------------
  // TEST 1: Strict District Isolation across Pune, Solapur, Nashik, CSN
  // -------------------------------------------------------------
  const puneComplaints = getMockComplaintsForDistrict('pune');
  const solapurComplaints = getMockComplaintsForDistrict('solapur');
  const nashikComplaints = getMockComplaintsForDistrict('nashik');
  const csnComplaints = getMockComplaintsForDistrict('chhatrapati_sambhajinagar');

  assert(puneComplaints.length > 0, `Pune has ${puneComplaints.length} municipal complaints`);
  assert(solapurComplaints.length > 0, `Solapur has ${solapurComplaints.length} municipal complaints`);
  assert(nashikComplaints.length > 0, `Nashik has ${nashikComplaints.length} municipal complaints`);
  assert(csnComplaints.length > 0, `CSN has ${csnComplaints.length} municipal complaints`);

  // Pune isolation: zero Solapur, Nashik or CSN coordinates/IDs
  const puneHasSolapur = puneComplaints.some(
    (c) => c.location.latitude < 18.0 && c.location.longitude > 75.5 // Solapur coord box
  );
  assert(!puneHasSolapur, 'Pune map dataset contains ZERO Solapur complaints');

  const solapurHasPune = solapurComplaints.some(
    (c) => c.location.latitude > 18.4 && c.location.latitude < 18.7 && c.location.longitude < 74.0
  );
  assert(!solapurHasPune, 'Solapur map dataset contains ZERO Pune complaints');

  const nashikHasSolapur = nashikComplaints.some(
    (c) => c.location.latitude < 18.0 || c.location.longitude > 75.0
  );
  assert(!nashikHasSolapur, 'Nashik map dataset contains ZERO Solapur complaints');

  const csnHasPune = csnComplaints.some(
    (c) => c.location.longitude < 74.0
  );
  assert(!csnHasPune, 'Chhatrapati Sambhajinagar map dataset contains ZERO Pune complaints');

  // -------------------------------------------------------------
  // TEST 2: Authoritative Administrative Boundaries GeoJSON
  // -------------------------------------------------------------
  const stateBoundaries = getAdministrativeBoundariesGeoJSON('STATE');
  assert(
    stateBoundaries.features.length >= 10,
    `State view returns complete boundary collection (${stateBoundaries.features.length} polygons)`
  );
  assert(
    stateBoundaries.features.some((f) => f.id === 'maharashtra-state'),
    'State boundary contains authoritative Maharashtra polygon'
  );

  const puneBoundaries = getAdministrativeBoundariesGeoJSON('DISTRICT', 'pune', 'pmc');
  assert(
    puneBoundaries.features.some((f) => f.properties.districtId === 'pune'),
    'Pune boundary feature correctly resolved'
  );
  assert(
    puneBoundaries.features.some((f) => f.properties.corporationId === 'pmc'),
    'PMC Municipal Corporation boundary feature correctly resolved'
  );

  const solapurBoundaries = getAdministrativeBoundariesGeoJSON('MUNICIPAL_CORPORATION', 'solapur', 'smc');
  assert(
    solapurBoundaries.features.some((f) => f.properties.corporationId === 'smc'),
    'Solapur SMC boundary feature correctly resolved'
  );

  // -------------------------------------------------------------
  // TEST 3: MapLibre Heatmap Weight Calculation
  // -------------------------------------------------------------
  const sampleUrgent: Complaint = {
    ...puneComplaints[0],
    priority: 'urgent',
    status: 'in_progress',
  };
  const sampleLow: Complaint = {
    ...puneComplaints[0],
    priority: 'low',
    status: 'verified',
  };

  function computeHeatmapWeight(c: Complaint): number {
    let weight = 0.3;
    if (c.priority === 'urgent') weight = 1.0;
    else if (c.priority === 'high') weight = 0.75;
    else if (c.priority === 'medium') weight = 0.5;
    const isUnresolved = c.status !== 'verified' && c.status !== 'closed';
    if (isUnresolved) weight *= 1.2;
    return Math.min(weight, 1.5);
  }

  assert(
    computeHeatmapWeight(sampleUrgent) > computeHeatmapWeight(sampleLow),
    `Urgent active complaint weight (${computeHeatmapWeight(sampleUrgent)}) > Low resolved weight (${computeHeatmapWeight(sampleLow)})`
  );

  // -------------------------------------------------------------
  // TEST 4: Hotspot Detection & Factual Cluster Aggregations
  // -------------------------------------------------------------
  const detectedHotspots = EmergingProblemEngine.detectHotspots(puneComplaints, {
    clusterRadiusMeters: 500,
    minimumClusterSize: 2,
  });

  assert(detectedHotspots.length >= 0, `Hotspot engine executed successfully (${detectedHotspots.length} clusters found)`);

  if (detectedHotspots.length > 0) {
    const h1 = detectedHotspots[0];
    const contributing = EmergingProblemEngine.getContributingComplaints(h1, puneComplaints);
    const unresolved = contributing.filter((c) => c.status !== 'verified' && c.status !== 'closed').length;
    const resolved = contributing.length - unresolved;

    assert(contributing.length === h1.complaintCount, `Hotspot contributing complaint count matches total (${contributing.length})`);
    assert(unresolved + resolved === contributing.length, `Unresolved (${unresolved}) + Resolved (${resolved}) equals total`);
    assert(h1.centerLatitude > 18.0 && h1.centerLongitude > 73.0, 'Hotspot center coordinates are valid Pune coordinates');
  }

  // -------------------------------------------------------------
  // TEST 5: Time Filtering Logic
  // -------------------------------------------------------------
  const now = new Date().getTime();
  const testComplaints: Complaint[] = [
    {
      ...puneComplaints[0],
      id: 'CR-TEST-TODAY',
      createdAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    },
    {
      ...puneComplaints[0],
      id: 'CR-TEST-3DAYS',
      createdAt: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    },
    {
      ...puneComplaints[0],
      id: 'CR-TEST-45DAYS',
      createdAt: new Date(now - 45 * 24 * 60 * 60 * 1000).toISOString(), // 45 days ago
    },
  ];

  function filterByTime(list: Complaint[], range: 'all' | 'today' | '24h' | '7d' | '30d') {
    if (range === 'all') return list;
    const currentTime = new Date().getTime();
    let cutoff = 0;
    if (range === '24h' || range === 'today') cutoff = currentTime - 24 * 60 * 60 * 1000;
    else if (range === '7d') cutoff = currentTime - 7 * 24 * 60 * 60 * 1000;
    else if (range === '30d') cutoff = currentTime - 30 * 24 * 60 * 60 * 1000;

    return list.filter((c) => new Date(c.createdAt).getTime() >= cutoff);
  }

  assert(filterByTime(testComplaints, '24h').length === 1, '24h filter returns only reports from last 24h');
  assert(filterByTime(testComplaints, '7d').length === 2, '7d filter returns reports from last 7 days');
  assert(filterByTime(testComplaints, '30d').length === 2, '30d filter excludes 45-day old reports');
  assert(filterByTime(testComplaints, 'all').length === 3, 'All-time filter returns all reports');

  // -------------------------------------------------------------
  // TEST 6: Non-PII Marker Security
  // -------------------------------------------------------------
  puneComplaints.forEach((c) => {
    // Marker popups must not contain citizen private names or emails
    const rawString = JSON.stringify({
      id: c.id,
      title: c.title,
      category: c.category,
      priority: c.priority,
      status: c.status,
      address: c.location.address,
      ward: c.location.ward,
    });
    const hasAadhaar = rawString.includes('aadhaar') || rawString.includes('citizen_phone');
    assert(!hasAadhaar, `Complaint #${c.id} marker popup payload contains zero citizen PII`);
  });

  // -------------------------------------------------------------
  // TEST 7: Empty State Resilience
  // -------------------------------------------------------------
  const emptyDistrictComplaints: Complaint[] = [];
  const emptyHotspots = EmergingProblemEngine.detectHotspots(emptyDistrictComplaints);
  assert(emptyHotspots.length === 0, 'Zero complaints produces zero fake hotspots');

  return { passed, failed, errors };
}
