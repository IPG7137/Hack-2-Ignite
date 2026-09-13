import { CopilotService } from './copilotService';
import { Complaint } from '../types/complaint';

function createMockComplaint(overrides: Partial<Complaint>): Complaint {
  return {
    id: overrides.id || 'comp-101',
    dbId: overrides.dbId || 101,
    title: overrides.title || 'Water pipe leak near main street',
    description: overrides.description || 'Continuous heavy water leakage flooding the road and low pressure in houses',
    category: overrides.category || 'water_sewage',
    categoryLabel: overrides.categoryLabel || 'Water Supply',
    status: overrides.status || 'submitted',
    priority: overrides.priority || 'medium',
    location: {
      address: 'Main St, Ward 4',
      landmark: 'Near Water Tank',
      ward: 'Ward 4',
      zone: 'Central Zone',
      latitude: 18.5204,
      longitude: 73.8567,
      ...(overrides.location || {}),
    },
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
    ...overrides,
  };
}

export async function runCopilotTests(): Promise<{ passed: number; failed: number; errors: string[] }> {
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

  console.log('🧪 Starting Step 8B Municipal AI Copilot Service Tests...');

  // 1. Intent Detection Accuracy
  {
    assert(CopilotService.detectIntent('What needs attention right now?') === 'PRIORITY_ATTENTION', '1a. Detects priority intent');
    assert(CopilotService.detectIntent('What are today\'s highest-priority complaints?') === 'PRIORITY_ATTENTION', '1b. Detects highest-priority intent');
    assert(CopilotService.detectIntent('Where are the emerging hotspots?') === 'HOTSPOTS_ANOMALIES', '1c. Detects hotspots intent');
    assert(CopilotService.detectIntent('Why is complaint #comp-101 high priority?') === 'SPECIFIC_COMPLAINT', '1d. Detects complaint lookup intent');
    assert(CopilotService.detectIntent('Which complaints may belong to the same incident?') === 'INCIDENTS_CLUSTERS', '1e. Detects incident grouping intent');
    assert(CopilotService.detectIntent('Which resolved cases need verification?') === 'RESOLUTION_AUDITS', '1f. Detects resolution verification intent');
    assert(CopilotService.detectIntent('Summarize the situation for the roads department') === 'CATEGORY_DEPARTMENT', '1g. Detects department category intent');
    assert(CopilotService.detectIntent('Give me a briefing for the municipal commissioner') === 'COMMISSIONER_BRIEFING', '1h. Detects commissioner briefing intent');
    assert(CopilotService.detectIntent('Which complaints are overdue?') === 'SLA_OVERDUE', '1i. Detects SLA overdue intent');
  }

  // 2. Empty dataset handling
  {
    const resp = await CopilotService.answerOfficerQuery('What needs attention right now?', []);
    assert(resp.content.includes("I don't have enough current data"), '2a. Returns safe fallback on empty data');
    assert(resp.referencedComplaintIds?.length === 0, '2b. No hallucinated complaint citations');
  }

  // 3. Priority query grounding
  {
    const cUrgent = createMockComplaint({
      id: 'comp-urgent-1',
      title: 'Major hazardous collapse on highway',
      description: 'Collapsed bridge wall and live wire sparking hazard',
      category: 'public_safety',
      categoryLabel: 'Public Safety',
      priority: 'urgent',
    });
    const cLow = createMockComplaint({
      id: 'comp-low-1',
      title: 'Faded signboard',
      priority: 'low',
    });

    const resp = await CopilotService.answerOfficerQuery('What are today\'s highest-priority complaints?', [cUrgent, cLow]);
    assert(resp.content.includes('comp-urgent-1'), '3a. Includes exact urgent complaint ID');
    assert(resp.content.includes('Priority Score:'), '3b. Includes grounded priority score');
    assert(Boolean(resp.referencedComplaintIds && resp.referencedComplaintIds.includes('comp-urgent-1')), '3c. Cites exact complaint ID');
  }

  // 4. Hotspots query grounding
  {
    const now = new Date();
    const c1 = createMockComplaint({
      id: 'c-hot-1',
      category: 'roads',
      categoryLabel: 'Roads & Pavements',
      location: { address: 'Cross 1', ward: 'Ward 3', latitude: 18.5204, longitude: 73.8567, landmark: 'Pole 1', zone: 'Central' },
      createdAt: new Date(now.getTime() - 2 * 3600 * 1000).toISOString(),
    });
    const c2 = createMockComplaint({
      id: 'c-hot-2',
      category: 'roads',
      categoryLabel: 'Roads & Pavements',
      location: { address: 'Cross 2', ward: 'Ward 3', latitude: 18.5206, longitude: 73.8569, landmark: 'Pole 2', zone: 'Central' },
      createdAt: new Date(now.getTime() - 1 * 3600 * 1000).toISOString(),
    });

    const resp = await CopilotService.answerOfficerQuery('Where are the emerging hotspots?', [c1, c2]);
    assert(resp.content.includes('Roads & Pavements Surge'), '4a. Identifies grounded category hotspot surge');
    assert(resp.content.includes('c-hot-1') || resp.content.includes('c-hot-2'), '4b. Mentions underlying complaint IDs');
    assert(Boolean(resp.referencedComplaintIds && resp.referencedComplaintIds.length > 0), '4c. Cites hotspot complaint IDs');
  }

  // 5. Specific complaint inquiry
  {
    const c1 = createMockComplaint({
      id: 'comp-101',
      title: 'Severe pipeline fracture',
      description: 'Major water pipeline burst flooding the roadway',
      priority: 'urgent',
    });
    const resp = await CopilotService.answerOfficerQuery('Why is complaint #comp-101 high priority?', [c1]);
    assert(resp.content.includes('comp-101'), '5a. Mentions exact complaint ID');
    assert(resp.content.includes('Phase 3B Priority Analysis:'), '5b. Grounded 3B score breakdown presented');
    assert(resp.content.includes('Severity Signal'), '5c. Grounded 5-signal breakdown');
    assert(resp.referencedComplaintIds?.includes('comp-101') === true, '5d. Cites requested complaint ID');
  }

  // 6. Non-existent complaint query (Zero hallucination)
  {
    const c1 = createMockComplaint({ id: 'comp-101' });
    const resp = await CopilotService.answerOfficerQuery('Why is complaint #fake-999 high priority?', [c1]);
    assert(resp.content.includes("I don't have enough current data"), '6a. Rejects non-existent complaint safely');
    assert(!resp.content.includes('fake-999 high priority because'), '6b. Does not invent reasons for non-existent complaints');
  }

  // 7. Incident grouping query
  {
    const now = new Date();
    const c1 = createMockComplaint({
      id: 'c-inc-1',
      title: 'Water pipe leak on Market Road',
      description: 'Pipeline burst flooding street',
      category: 'water_sewage',
      location: { address: 'Market Road', ward: 'Ward 4', latitude: 18.5204, longitude: 73.8567, landmark: 'Shop 1', zone: 'Central' },
      createdAt: now.toISOString(),
    });
    const c2 = createMockComplaint({
      id: 'c-inc-2',
      title: 'Pipeline leakage near Market Road',
      description: 'Continuous drinking water leak flooding pavement',
      category: 'water_sewage',
      location: { address: 'Market Road 2', ward: 'Ward 4', latitude: 18.5207, longitude: 73.8569, landmark: 'Shop 2', zone: 'Central' },
      createdAt: now.toISOString(),
    });

    const resp = await CopilotService.answerOfficerQuery('Which complaints may belong to the same incident?', [c1, c2]);
    assert(resp.content.includes('Potential Common Incident Groupings'), '7a. Formats Phase 3D incident grouping response');
    assert(resp.content.includes('c-inc-1') && resp.content.includes('c-inc-2'), '7b. Explains exact member complaints');
    assert(resp.referencedComplaintIds?.includes('c-inc-1') === true, '7c. Cites member IDs');
  }

  // 8. Resolution audit query
  {
    const cAudit = createMockComplaint({
      id: 'c-audit-1',
      title: 'Cleaned community dumpster',
      status: 'resolution_submitted',
      evidence: { before: ['https://example.com/b.jpg'], after: [] }, // missing after proof
      citizenFeedback: { rating: 1, comment: 'Dumpster is still overflowing!', satisfied: false },
    });

    const resp = await CopilotService.answerOfficerQuery('Which resolved cases need verification?', [cAudit]);
    assert(resp.content.includes('c-audit-1'), '8a. Identifies audited complaint ID');
    assert(resp.content.includes('Missing after-repair photo') || resp.content.includes('negative'), '8b. Flags grounded missing proof / dissatisfaction');
    assert(resp.referencedComplaintIds?.includes('c-audit-1') === true, '8c. Cites audited complaint ID');
  }

  // 9. Department summary query
  {
    const cRoad = createMockComplaint({
      id: 'c-road-1',
      title: 'Deep pothole on Main Road',
      category: 'roads',
      categoryLabel: 'Roads & Pavements',
      priority: 'high',
    });
    const resp = await CopilotService.answerOfficerQuery('Summarize the situation for the roads department', [cRoad]);
    assert(resp.content.includes('Roads & Pavements Operational Briefing'), '9a. Summarizes roads department status');
    assert(resp.content.includes('c-road-1'), '9b. References active roads complaints');
  }

  // 10. Commissioner Executive Briefing query
  {
    const c1 = createMockComplaint({ id: 'c-brief-1', priority: 'urgent' });
    const resp = await CopilotService.answerOfficerQuery('Give me a briefing for the municipal commissioner', [c1]);
    assert(resp.content.includes('Municipal Commissioner Executive Operational Briefing'), '10a. Formats executive briefing');
    assert(resp.content.includes('Command Overview'), '10b. Includes command overview');
    assert(resp.content.includes('Key Action Directives'), '10c. Includes grounded action directives');
  }

  console.log(`✅ Municipal AI Copilot Tests Finished: ${passed} passed, ${failed} failed`);
  return { passed, failed, errors };
}

if (typeof require !== 'undefined' && require.main === module) {
  runCopilotTests().then((res) => {
    if (res.failed > 0) process.exit(1);
  });
}
