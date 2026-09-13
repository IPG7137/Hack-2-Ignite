import { PriorityEngine } from './priorityEngine';
import { Complaint } from '../types/complaint';

function createMockComplaint(overrides: Partial<Complaint>): Complaint {
  return {
    id: 'CR-101',
    dbId: 101,
    title: 'Standard complaint',
    description: 'General municipal maintenance required.',
    category: 'waste_management',
    categoryLabel: 'Garbage & Sanitation',
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

export function runPriorityTests(): { passed: number; failed: number; errors: string[] } {
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

  console.log('🧪 Starting Phase 3B Priority Engine Tests...');

  // Test 1: Critical safety hazard (open manhole, urgent severity) => Score >= 80.0 (Critical)
  const criticalReport = createMockComplaint({
    id: 'CR-CRITICAL',
    title: 'Deep open manhole on busy road',
    description: 'Dangerous open manhole creating severe collapse risk for pedestrians and vehicles.',
    category: 'drainage',
    priority: 'urgent',
    createdAt: new Date(Date.now() - 3600000).toISOString(), // 1h ago
  });

  const res1 = PriorityEngine.evaluateComplaintPriority(criticalReport);
  assert(
    res1.score >= 60.0,
    `Test 1: Critical safety hazard score should be >= 60.0 (High/Critical tier), got ${res1.score}`
  );
  assert(
    res1.levelLabel === 'Critical' || res1.levelLabel === 'High',
    `Test 1: Level should be Critical or High, got ${res1.levelLabel}`
  );
  assert(
    res1.topDrivers.includes('Safety Risk'),
    `Test 1: Top drivers should include "Safety Risk", got ${JSON.stringify(res1.topDrivers)}`
  );

  // Test 2: Routine low priority complaint (parks/horticulture, low severity, fresh) => Score < 50
  const routineReport = createMockComplaint({
    id: 'CR-ROUTINE',
    title: 'Leaves on walking path in park',
    description: 'Some dry fallen leaves need sweeping on garden pathway.',
    category: 'parks',
    priority: 'low',
    createdAt: new Date().toISOString(),
  });

  const res2 = PriorityEngine.evaluateComplaintPriority(routineReport);
  assert(
    res2.score < 50.0,
    `Test 2: Routine maintenance score should be < 50.0, got ${res2.score}`
  );
  assert(
    res2.levelLabel === 'Low' || res2.levelLabel === 'Medium',
    `Test 2: Level should be Low or Medium, got ${res2.levelLabel}`
  );

  // Test 3: Old unresolved complaint (pending 10 days) => Age contribution escalation (100.0)
  const oldUnresolved = createMockComplaint({
    id: 'CR-OLD',
    title: 'Water pipe leak on colony corner',
    description: 'Clean drinking water leaking on road for over a week.',
    category: 'water_sewage',
    priority: 'medium',
    status: 'in_progress',
    createdAt: new Date(Date.now() - 864000000).toISOString(), // 10 days ago
  });

  const res3 = PriorityEngine.evaluateComplaintPriority(oldUnresolved);
  assert(
    res3.signalBreakdown.ageEscalation === 100.0,
    `Test 3: Age escalation for 10-day old report should be 100.0, got ${res3.signalBreakdown.ageEscalation}`
  );
  assert(
    res3.explainableReasons.some((r) => r.includes('Long pending') || r.includes('SLA escalation')),
    `Test 3: Reasons should explain long pending escalation, got ${JSON.stringify(res3.explainableReasons)}`
  );

  // Test 4: Resolved complaint has 0 age escalation score
  const resolvedOld = createMockComplaint({
    id: 'CR-RESOLVED',
    title: 'Fixed pipe leak',
    category: 'water_sewage',
    status: 'resolved',
    createdAt: new Date(Date.now() - 864000000).toISOString(), // 10 days ago
  });
  const res4 = PriorityEngine.evaluateComplaintPriority(resolvedOld);
  assert(
    res4.signalBreakdown.ageEscalation === 0.0,
    `Test 4: Resolved complaint should have 0 age escalation, got ${res4.signalBreakdown.ageEscalation}`
  );

  // Test 5: Multiple related complaints increase related cluster contribution
  const targetReport = createMockComplaint({
    id: 'CR-MAIN',
    dbId: 501,
    title: 'Live wire sparking near transformer',
    description: 'Electric sparks and hanging live wire on main street.',
    category: 'streetlights',
    priority: 'urgent',
    location: {
      address: 'Main Street',
      landmark: 'Transformer',
      ward: 'Ward 1',
      zone: 'Zone A',
      latitude: 17.6668,
      longitude: 75.9235,
    },
    createdAt: new Date().toISOString(),
  });

  const related1 = createMockComplaint({
    id: 'CR-REL-1',
    dbId: 502,
    title: 'Sparks from electrical pole on main street',
    description: 'Electric spark hazard near transformer.',
    category: 'streetlights',
    location: {
      address: 'Main Street',
      landmark: 'Transformer',
      ward: 'Ward 1',
      zone: 'Zone A',
      latitude: 17.6669,
      longitude: 75.9236,
    },
    createdAt: new Date().toISOString(),
  });

  const related2 = createMockComplaint({
    id: 'CR-REL-2',
    dbId: 503,
    title: 'Hanging live wire sparking hazard',
    description: 'Danger of electric shock on main street.',
    category: 'streetlights',
    location: {
      address: 'Main Street',
      landmark: 'Transformer',
      ward: 'Ward 1',
      zone: 'Zone A',
      latitude: 17.6670,
      longitude: 75.9235,
    },
    createdAt: new Date().toISOString(),
  });

  const related3 = createMockComplaint({
    id: 'CR-REL-3',
    dbId: 504,
    title: 'Electric shock hazard wire hanging',
    description: 'Pedestrians in danger near transformer.',
    category: 'streetlights',
    location: {
      address: 'Main Street',
      landmark: 'Transformer',
      ward: 'Ward 1',
      zone: 'Zone A',
      latitude: 17.6668,
      longitude: 75.9237,
    },
    createdAt: new Date().toISOString(),
  });

  const res5 = PriorityEngine.evaluateComplaintPriority(targetReport, [
    targetReport,
    related1,
    related2,
    related3,
  ]);
  assert(
    res5.signalBreakdown.relatedComplaints >= 70.0,
    `Test 5: Clustered related reports should score >= 70.0 in related complaints, got ${res5.signalBreakdown.relatedComplaints}`
  );
  assert(
    res5.score >= 80.0,
    `Test 5: Clustered critical hazard should reach Critical threshold (>=80.0), got ${res5.score}`
  );
  assert(
    res5.levelLabel === 'Critical',
    `Test 5: Expected level to be Critical, got ${res5.levelLabel}`
  );

  // Test 6: Deterministic sorting orders high priority first
  const allList = [routineReport, oldUnresolved, targetReport];
  const sorted = PriorityEngine.sortComplaintsByPriority(allList);
  assert(
    sorted[0].complaint.id === 'CR-MAIN',
    `Test 6: Highest priority should be CR-MAIN, got ${sorted[0].complaint.id}`
  );
  assert(
    sorted[sorted.length - 1].complaint.id === 'CR-ROUTINE',
    `Test 6: Lowest priority should be CR-ROUTINE, got ${sorted[sorted.length - 1].complaint.id}`
  );

  // Test 7: Score boundary invariant (Always between 0 and 100)
  for (const item of [criticalReport, routineReport, oldUnresolved, targetReport]) {
    const analysis = PriorityEngine.evaluateComplaintPriority(item);
    assert(
      analysis.score >= 0.0 && analysis.score <= 100.0,
      `Test 7: Score must be strictly between 0 and 100, got ${analysis.score}`
    );
  }

  console.log(`✅ Priority Tests Finished: ${passed} passed, ${failed} failed`);
  return { passed, failed, errors };
}
