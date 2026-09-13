import { AIInsightsService, AIInsightsSynthesis } from './aiInsightsService';
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

export function runAIInsightsTests(): { passed: number; failed: number; errors: string[] } {
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

  console.log('🧪 Starting Step 8A AI Insights Service Tests...');

  // 1. Empty dataset handling
  {
    const synthesis = AIInsightsService.synthesizeOperationalInsights([]);
    assert(synthesis.executiveBrief.totalActiveComplaints === 0, '1a. Total active complaints is 0 on empty set');
    assert(synthesis.criticalDispatch.length === 0, '1b. Critical dispatch array is empty');
    assert(synthesis.emergingAnomalies.length === 0, '1c. Emerging anomalies array is empty');
    assert(synthesis.incidentGrouping.length === 0, '1d. Incident grouping array is empty');
    assert(synthesis.resolutionAudits.length === 0, '1e. Resolution audits array is empty');
    assert(synthesis.executiveBrief.summaryParagraph.includes('No municipal grievance records'), '1f. Safe empty summary briefing');
  }

  // 2. Critical dispatch briefing derivation from Phase 3B Priority Engine
  {
    const cUrgent = createMockComplaint({
      id: 'comp-urgent-1',
      title: 'Open manhole danger on highway',
      description: 'Hazardous uncovered sewer manhole with broken lid live wires exposed',
      category: 'public_safety',
      categoryLabel: 'Public Safety Hazard',
      priority: 'urgent',
      createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
      sla: { isOverdue: true, targetHours: 12, hoursRemaining: 0, slaStatus: 'breached', deadline: new Date().toISOString() },
    });
    const cLow = createMockComplaint({
      id: 'comp-low-1',
      title: 'Faded signboard',
      description: 'Signboard paint is slightly worn',
      priority: 'low',
    });

    const synthesis = AIInsightsService.synthesizeOperationalInsights([cUrgent, cLow]);
    assert(synthesis.criticalDispatch.length >= 1, '2a. Urgent complaint populated into critical dispatch briefing');
    assert(synthesis.criticalDispatch[0].complaintId === 'comp-urgent-1', '2b. Exact complaint ID comp-urgent-1 traced');
    assert(synthesis.criticalDispatch[0].priorityScore >= 80.0, '2c. Grounded Phase 3B priority score >= 80');
    assert(synthesis.criticalDispatch[0].topDrivers.length > 0, '2d. Explains exact priority decision drivers');
    assert(synthesis.criticalDispatch[0].isOverdue === true, '2e. Traces exact SLA overdue flag');
  }

  // 3. Emerging anomaly alerts derivation from Phase 3C Hotspots Engine
  {
    const now = new Date();
    // 3 recent complaints in ~100m within 24 hours => Hotspot
    const c1 = createMockComplaint({
      id: 'c-hot-1',
      category: 'roads',
      location: { address: 'Cross 1', ward: 'Ward 3', latitude: 18.5204, longitude: 73.8567, landmark: 'Pole 1', zone: 'Central' },
      createdAt: new Date(now.getTime() - 2 * 3600 * 1000).toISOString(),
    });
    const c2 = createMockComplaint({
      id: 'c-hot-2',
      category: 'roads',
      location: { address: 'Cross 2', ward: 'Ward 3', latitude: 18.5206, longitude: 73.8569, landmark: 'Pole 2', zone: 'Central' },
      createdAt: new Date(now.getTime() - 1 * 3600 * 1000).toISOString(),
    });
    const c3 = createMockComplaint({
      id: 'c-hot-3',
      category: 'roads',
      location: { address: 'Cross 3', ward: 'Ward 3', latitude: 18.5208, longitude: 73.8568, landmark: 'Pole 3', zone: 'Central' },
      createdAt: now.toISOString(),
    });

    const synthesis = AIInsightsService.synthesizeOperationalInsights([c1, c2, c3]);
    assert(synthesis.emergingAnomalies.length > 0, '3a. Synthesizes emerging anomaly alert from 3C');
    if (synthesis.emergingAnomalies.length > 0) {
      const anomaly = synthesis.emergingAnomalies[0];
      assert(anomaly.complaintIds.includes('c-hot-1'), '3b. Exact member complaint ID c-hot-1 present');
      assert(anomaly.currentWindowCount === 3, '3c. Exact 24h recent count of 3 traced');
      assert(anomaly.emergingScore >= 40.0, '3d. Grounded Phase 3C score >= 40');
      assert(anomaly.explainableReasons.length > 0, '3e. Exposes explainable hotspot drivers');
    }
  }

  // 4. Incident grouping recommendations derivation from Phase 3D Incident Grouping Engine
  {
    const now = new Date();
    const c1 = createMockComplaint({
      id: 'c-inc-1',
      title: 'Water pipe leak on Market Road',
      description: 'Major water pipeline burst flooding the road',
      category: 'water_sewage',
      location: { address: 'Market Road', ward: 'Ward 4', latitude: 18.5204, longitude: 73.8567, landmark: 'Shop 1', zone: 'Central' },
      createdAt: new Date(now.getTime() - 3600 * 1000).toISOString(),
    });
    const c2 = createMockComplaint({
      id: 'c-inc-2',
      title: 'Heavy pipeline leakage near Market Road',
      description: 'Drinking water pipe cracked and continuous water flow flooding pavement',
      category: 'water_sewage',
      location: { address: 'Market Road 2', ward: 'Ward 4', latitude: 18.5207, longitude: 73.8569, landmark: 'Shop 2', zone: 'Central' },
      createdAt: now.toISOString(),
    });

    const synthesis = AIInsightsService.synthesizeOperationalInsights([c1, c2]);
    assert(synthesis.incidentGrouping.length > 0, '4a. Synthesizes incident grouping recommendation from 3D');
    if (synthesis.incidentGrouping.length > 0) {
      const inc = synthesis.incidentGrouping[0];
      assert(inc.memberComplaintIds.includes('c-inc-1') && inc.memberComplaintIds.includes('c-inc-2'), '4b. Exact member complaint IDs mapped');
      assert(inc.confidenceScore >= 60.0, '4c. Grounded Phase 3D confidence score >= 60');
      assert(inc.incidentLabel.includes('Water') || inc.incidentLabel.includes('Pipeline'), '4d. Safe descriptive incident label');
    }
  }

  // 5. Resolution audit flags derivation from Phase 3E Resolution Verification Engine
  {
    const cAudit = createMockComplaint({
      id: 'c-audit-1',
      status: 'resolution_submitted',
      evidence: {
        before: ['https://example.com/before.jpg'],
        after: ['https://example.com/after.jpg'],
      },
      citizenFeedback: {
        rating: 1,
        comment: 'Issue still remains, water is still leaking everywhere!',
        satisfied: false,
      },
    });

    const synthesis = AIInsightsService.synthesizeOperationalInsights([cAudit]);
    assert(synthesis.resolutionAudits.length > 0, '5a. Synthesizes resolution audit insight from 3E');
    if (synthesis.resolutionAudits.length > 0) {
      const audit = synthesis.resolutionAudits[0];
      assert(audit.complaintId === 'c-audit-1', '5b. Exact complaint ID traced');
      assert(audit.needsHumanVerification === true, '5c. Flags human verification requirement');
      assert(audit.feedbackSentiment === 'negative', '5d. Exposes citizen negative feedback sentiment');
      assert(audit.recommendedAction.includes('dissatisfaction'), '5e. Recommends corrective field action');
    }
  }

  // 6. Grounded traceability & safe metrics handling
  {
    const c1 = createMockComplaint({ id: 'c-trace-1', priority: 'urgent' });
    const synthesis = AIInsightsService.synthesizeOperationalInsights([c1]);

    assert(synthesis.executiveBrief.totalActiveComplaints === 1, '6a. Exact active count of 1 in executive brief');
    assert(!synthesis.executiveBrief.summaryParagraph.includes('undefined'), '6b. No undefined values in summary briefing');
    assert(synthesis.criticalDispatch.length > 0 && !isNaN(synthesis.criticalDispatch[0].priorityScore), '6c. Priority score is valid number and traced');
  }

  console.log(`✅ AI Insights Service Tests Finished: ${passed} passed, ${failed} failed`);
  return { passed, failed, errors };
}

if (typeof require !== 'undefined' && require.main === module) {
  const result = runAIInsightsTests();
  if (result.failed > 0) process.exit(1);
}
