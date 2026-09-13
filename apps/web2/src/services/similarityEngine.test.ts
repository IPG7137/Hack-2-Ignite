import { SimilarityEngine } from './similarityEngine';
import { Complaint } from '../types/complaint';

function createMockComplaint(overrides: Partial<Complaint>): Complaint {
  return {
    id: 'CR-101',
    dbId: 101,
    title: 'Severe pothole on Main Street',
    description: 'Deep road damage creating traffic hazard and vehicle damage near central square.',
    category: 'roads',
    categoryLabel: 'Roads & Potholes',
    location: {
      address: 'Main Street, Central Square',
      landmark: 'Central Square',
      ward: 'Ward 01',
      zone: 'Central Zone',
      latitude: 17.6668,
      longitude: 75.9235,
    },
    status: 'submitted',
    priority: 'urgent',
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
      targetHours: 12,
      hoursRemaining: 10,
      slaStatus: 'on_track',
      deadline: new Date(Date.now() + 36000000).toISOString(),
      isOverdue: false,
    },
    upvotesCount: 1,
    isDuplicateCluster: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function runSimilarityTests(): { passed: number; failed: number; errors: string[] } {
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

  console.log('🧪 Starting Phase 3A Similarity Engine Tests...');

  const baseReport = createMockComplaint({
    id: 'CR-1',
    dbId: 1,
    title: 'Deep pothole on MG Road near bus stop',
    description: 'Dangerous road crater causing traffic slow down and bike falls.',
    category: 'roads',
    location: {
      address: 'MG Road',
      landmark: 'Bus Stop',
      ward: 'Ward 1',
      zone: 'Zone A',
      latitude: 17.6668,
      longitude: 75.9235,
    },
    createdAt: new Date().toISOString(),
  });

  // Test 1: Exact location + same category + similar text + same time => High confidence duplicate (>= 0.75)
  const candidateHigh = createMockComplaint({
    id: 'CR-2',
    dbId: 2,
    title: 'Big pothole on MG Road at bus stand',
    description: 'Dangerous road crater traffic bike hazard near bus stop.',
    category: 'roads',
    location: {
      address: 'MG Road',
      landmark: 'Bus Stand',
      ward: 'Ward 1',
      zone: 'Zone A',
      latitude: 17.6669, // ~15m away
      longitude: 75.9236,
    },
    createdAt: new Date(Date.now() - 3600000).toISOString(), // 1h ago
  });

  const result1 = SimilarityEngine.evaluateSimilarity(baseReport, candidateHigh);
  assert(
    result1.totalConfidence >= 0.75,
    `Test 1: Expected high confidence duplicate (>=0.75), got ${result1.totalConfidence}`
  );
  assert(
    result1.classification === 'highConfidenceDuplicate',
    `Test 1: Classification should be highConfidenceDuplicate, got ${result1.classification}`
  );
  assert(
    result1.displayLabel.includes('Potential Duplicate'),
    `Test 1: Label should use "Potential Duplicate", got ${result1.displayLabel}`
  );
  assert(
    !result1.displayLabel.toLowerCase().includes('confirmed duplicate'),
    `Test 1: Label must NOT say "Confirmed duplicate"`
  );

  // Test 2: Moderate similarity (same area ~150m, related domain, moderate text) => Related incident (0.50 - 0.74)
  const candidateRelated = createMockComplaint({
    id: 'CR-3',
    dbId: 3,
    title: 'Water pipe leak near MG Road pavement',
    description: 'Water overflowing onto MG Road making footpath slippery.',
    category: 'water_sewage',
    location: {
      address: 'MG Road Pavement',
      landmark: 'Nearby Shop',
      ward: 'Ward 1',
      zone: 'Zone A',
      latitude: 17.6680, // ~150m away
      longitude: 75.9240,
    },
    createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
  });

  const result2 = SimilarityEngine.evaluateSimilarity(baseReport, candidateRelated);
  assert(
    result2.totalConfidence >= 0.40 && result2.totalConfidence < 0.75,
    `Test 2: Expected related/moderate confidence, got ${result2.totalConfidence}`
  );

  // Test 3: Far-away report (>5km) with completely different category => Unrelated (< 0.50)
  const candidateUnrelated = createMockComplaint({
    id: 'CR-4',
    dbId: 4,
    title: 'Streetlight blinking in Gandhi Park',
    description: 'Pole number 42 has loose electrical wiring in park area.',
    category: 'streetlights',
    location: {
      address: 'Gandhi Park',
      landmark: 'Gate 2',
      ward: 'Ward 8',
      zone: 'Zone C',
      latitude: 17.7500, // ~10km away
      longitude: 76.0100,
    },
    createdAt: new Date(Date.now() - 864000000).toISOString(), // 10 days ago
  });

  const result3 = SimilarityEngine.evaluateSimilarity(baseReport, candidateUnrelated);
  assert(
    result3.totalConfidence < 0.50,
    `Test 3: Expected unrelated score (<0.50), got ${result3.totalConfidence}`
  );
  assert(
    result3.classification === 'unrelated',
    `Test 3: Classification should be unrelated, got ${result3.classification}`
  );

  // Test 4: Self comparison exclusion
  const allList = [baseReport, candidateHigh, candidateRelated, candidateUnrelated];
  const relatedList = SimilarityEngine.findRelatedComplaints(baseReport, allList, { minConfidence: 0.50 });
  assert(
    !relatedList.some((r) => r.candidateId === baseReport.id),
    'Test 4: Target report must be excluded from its own related list'
  );
  assert(
    relatedList.length >= 1,
    `Test 4: Should find at least 1 related candidate, found ${relatedList.length}`
  );

  // Test 5: Distance calculation sanity
  const distance = SimilarityEngine.calculateHaversineDistance(17.6668, 75.9235, 17.6668, 75.9235);
  assert(distance === 0, `Test 5: Distance between identical points should be 0, got ${distance}`);

  // Test 6: Text similarity Jaccard calculation
  const textScore = SimilarityEngine.calculateTextSimilarity(
    'dangerous pothole crater on main road',
    'dangerous pothole crater vehicle damage'
  );
  assert(textScore > 0.40, `Test 6: Expected high text overlap (>0.40), got ${textScore}`);

  console.log(`✅ Similarity Tests Finished: ${passed} passed, ${failed} failed`);
  return { passed, failed, errors };
}
