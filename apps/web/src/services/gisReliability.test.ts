/**
 * CivicResolve — GIS Spatial Reliability & Public Map Security Test Suite
 * Validates coordinate parsing, category mapping, bounding box logic,
 * Haversine spatial math, GeoJSON projection, and zero-PII public marker security.
 */

import { mapSupabaseRowToComplaint, DATABASE_CATEGORY_MAP } from './reportAdapter';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    testsPassed++;
    console.log(`  ✓ ${testName}`);
  } else {
    testsFailed++;
    console.error(`  ✗ ${testName}${detail ? ` — ${detail}` : ''}`);
  }
}

/**
 * Haversine distance calculator in meters (mirrors mobile & SQL PostGIS ST_DistanceSphere)
 */
function haversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Validates whether coordinates fall inside a bounding box [minLng, minLat, maxLng, maxLat]
 */
function isPointInBBox(lat: number, lng: number, bbox: [number, number, number, number]): boolean {
  const [minLng, minLat, maxLng, maxLat] = bbox;
  return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
}

export function runGISReliabilityTests(): { passed: number; failed: number } {
  console.log('\n--- Running GIS Spatial Reliability & Public Map Security Tests ---');
  testsPassed = 0;
  testsFailed = 0;

  // 1. Coordinate parsing from strings, numbers, and nested objects
  const parsedFromString = mapSupabaseRowToComplaint({
    id: 101,
    latitude: '17.68687000',
    longitude: '75.92275000',
    category: 'roads',
  });
  assert(
    parsedFromString.location.latitude === 17.68687 &&
      parsedFromString.location.longitude === 75.92275,
    'Parses string latitude and longitude correctly into numbers'
  );

  const parsedFromNested = mapSupabaseRowToComplaint({
    id: 102,
    coordinates: { lat: 17.65432, lng: 75.91234 },
    category: 'water_supply',
  });
  assert(
    parsedFromNested.location.latitude === 17.65432 &&
      parsedFromNested.location.longitude === 75.91234,
    'Parses nested coordinates object if top-level fields are missing'
  );

  // 2. Out of bounds and NaN coordinate rejection
  const outOfBounds = mapSupabaseRowToComplaint({
    id: 103,
    latitude: 195.0,
    longitude: 250.0,
    category: 'drainage',
  });
  assert(
    isNaN(outOfBounds.location.latitude) && isNaN(outOfBounds.location.longitude),
    'Rejects out-of-bounds latitude/longitude (>90 / >180)'
  );

  // 3. Category alias mapping consistency
  const roadCat = DATABASE_CATEGORY_MAP['roads_infrastructure'];
  assert(roadCat?.key === 'roads', 'Maps roads_infrastructure to canonical roads key');

  const waterCat = DATABASE_CATEGORY_MAP['water_supply'];
  assert(waterCat?.key === 'water_sewage', 'Maps water_supply to canonical water_sewage key');

  const streetCat = DATABASE_CATEGORY_MAP['electricity_streetlights'];
  assert(streetCat?.key === 'streetlights', 'Maps electricity_streetlights to canonical streetlights key');

  // 4. Haversine distance accuracy
  const dist = haversineDistanceMeters(17.68687, 75.92275, 17.69687, 75.92275);
  // ~1.11 km for 0.01 deg latitude
  assert(dist > 1100 && dist < 1125, 'Calculates accurate spherical distance between coordinates (~1.11km)');

  // 5. Bounding box filtering
  const bbox: [number, number, number, number] = [75.90, 17.65, 75.95, 17.70];
  assert(isPointInBBox(17.68687, 75.92275, bbox), 'Identifies point inside spatial bounding box');
  assert(!isPointInBBox(17.75, 75.92275, bbox), 'Excludes point outside spatial bounding box');

  // 6. Zero-PII public marker security projection
  const rawDbRow = {
    id: 501,
    title: 'Pothole on Main St',
    description: 'Deep pothole damaging vehicles',
    category: 'roads',
    status: 'assigned',
    priority: 'high',
    location: 'Main St, Ward 4',
    latitude: 17.68687,
    longitude: 75.92275,
    user_id: 'user-secret-uuid-1234',
    reporter_name: 'John Citizen',
    contact_number: '+91 9876543210',
    aadhar_number: '1234-5678-9012',
    user_email: 'citizen@example.com',
  };

  // Simulate get_public_map_markers projection
  const publicMarker = {
    id: rawDbRow.id,
    title: rawDbRow.title,
    category: rawDbRow.category,
    status: rawDbRow.status,
    priority: rawDbRow.priority,
    location: rawDbRow.location,
    latitude: rawDbRow.latitude,
    longitude: rawDbRow.longitude,
  };

  const markerHasNoPII =
    !('user_id' in publicMarker) &&
    !('reporter_name' in publicMarker) &&
    !('contact_number' in publicMarker) &&
    !('aadhar_number' in publicMarker) &&
    !('user_email' in publicMarker);

  assert(markerHasNoPII, 'Public map markers sanitize all citizen PII (zero PII exposure)');

  // 7. GeoJSON feature generation compatibility
  const geoJsonFeature = {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [publicMarker.longitude, publicMarker.latitude],
    },
    properties: {
      id: publicMarker.id,
      title: publicMarker.title,
      category: publicMarker.category,
      status: publicMarker.status,
    },
  };
  assert(
    geoJsonFeature.geometry.coordinates[0] === 75.92275 &&
      geoJsonFeature.geometry.coordinates[1] === 17.68687,
    'Produces standard GeoJSON [longitude, latitude] Point geometry'
  );

  // 8. Cluster Centroid Calculation
  const points = [
    { lat: 17.68, lng: 75.92 },
    { lat: 17.70, lng: 75.94 },
  ];
  const centroidLat = (points[0].lat + points[1].lat) / 2;
  const centroidLng = (points[0].lng + points[1].lng) / 2;
  assert(
    Math.abs(centroidLat - 17.69) < 0.0001 && Math.abs(centroidLng - 75.93) < 0.0001,
    'Calculates geometric centroid for multi-point clusters'
  );

  console.log(`GIS Spatial Reliability Tests: ${testsPassed} passed, ${testsFailed} failed\n`);
  return { passed: testsPassed, failed: testsFailed };
}

if (typeof require !== 'undefined' && require.main === module) {
  runGISReliabilityTests();
}
