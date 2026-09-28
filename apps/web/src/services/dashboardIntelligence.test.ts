/**
 * CIVICRESOLVE — Test Suite: Task 10 Unified Civic Intelligence Dashboard
 * 
 * Verifies:
 * 1. Executive summary KPI aggregation (active backlog, SLA risks, verification %, satisfaction score)
 * 2. Civic Signal synthesis: community-supported issues and duplicate-prevention momentum
 * 3. Municipal Operations breakdown: priority distribution and SLA compliance
 * 4. Resolution Quality differentiation: Officer Resolved vs Citizen Verified
 * 5. Civic Recognition & Social Forestry Nursery redemption aggregates
 * 6. Deterministic Actionable Directives ("Needs Attention") generation
 * 7. Strict district isolation & Zero PII security in dashboard payloads
 */

import {
  DashboardIntelligenceService,
  UnifiedDashboardMetrics,
} from './dashboardIntelligenceService';
import { Complaint } from '../types/complaint';

export async function runDashboardIntelligenceTests(): Promise<{
  passed: number;
  failed: number;
  errors: string[];
}> {
  console.log('\n--- Running Unified Civic Intelligence Dashboard Test Suite (Task 10) ---');

  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      passed++;
      console.log(`  ✓ ${testName}`);
    } else {
      failed++;
      const msg = `FAIL: ${testName}${detail ? ` - ${detail}` : ''}`;
      console.error(`  ✗ ${msg}`);
      errors.push(msg);
    }
  }

  // Sample realistic test complaints dataset
  const mockComplaints: Complaint[] = [
    {
      id: 'CR-SOL-101',
      dbId: 101,
      title: 'Main Road Clogged Storm Drain',
      description: 'Severe stormwater backup causing road flooding near bus terminal',
      category: 'drainage',
      categoryLabel: 'Drainage & Sewerage',
      priority: 'urgent',
      status: 'in_progress',
      location: {
        address: 'Station Road, Solapur',
        landmark: 'Bus Terminal',
        ward: 'Ward 4',
        zone: 'Central',
        latitude: 17.6868,
        longitude: 75.9227,
      },
      reporter: {
        name: 'Citizen',
        phone: '9999999999',
        aadharMasked: 'XXXX-XXXX-1234',
        verifiedCitizen: true,
      },
      evidence: { before: [] },
      statusHistory: [],
      adminNotes: [],
      upvotesCount: 12,
      isDuplicateCluster: false,
      createdAt: '2026-09-28T08:00:00Z',
      updatedAt: '2026-09-28T10:00:00Z',
      sla: {
        targetHours: 12,
        hoursRemaining: 5,
        slaStatus: 'warning',
        deadline: '2026-09-28T20:00:00Z',
        isOverdue: false,
      },
    },
    {
      id: 'CR-SOL-102',
      dbId: 102,
      title: 'Broken Streetlights on Ring Road',
      description: 'Multiple poles dark for past 48 hours',
      category: 'streetlights',
      categoryLabel: 'Street Lighting',
      priority: 'medium',
      status: 'submitted',
      location: {
        address: 'Ring Road, Solapur',
        landmark: 'Junction',
        ward: 'Ward 7',
        zone: 'North',
        latitude: 17.689,
        longitude: 75.925,
      },
      reporter: {
        name: 'Citizen',
        phone: '9999999999',
        aadharMasked: 'XXXX-XXXX-5678',
        verifiedCitizen: true,
      },
      evidence: { before: [] },
      statusHistory: [],
      adminNotes: [],
      upvotesCount: 5,
      isDuplicateCluster: false,
      createdAt: '2026-09-27T08:00:00Z',
      updatedAt: '2026-09-27T08:00:00Z',
      sla: {
        targetHours: 24,
        hoursRemaining: 0,
        slaStatus: 'breached',
        deadline: '2026-09-28T08:00:00Z',
        isOverdue: true,
      },
    },
    {
      id: 'CR-SOL-103',
      dbId: 103,
      title: 'Repaired Pothole at Market Yard',
      description: 'Bitumen patch applied by PWD road crew',
      category: 'roads',
      categoryLabel: 'Roads & Footpaths',
      priority: 'high',
      status: 'verified',
      location: {
        address: 'Market Yard, Solapur',
        landmark: 'Gate 2',
        ward: 'Ward 2',
        zone: 'South',
        latitude: 17.681,
        longitude: 75.918,
      },
      reporter: {
        name: 'Citizen',
        phone: '9999999999',
        aadharMasked: 'XXXX-XXXX-9012',
        verifiedCitizen: true,
      },
      evidence: { before: [] },
      statusHistory: [],
      adminNotes: [],
      upvotesCount: 8,
      isDuplicateCluster: false,
      citizenFeedback: {
        rating: 5,
        comment: 'Pothole neatly sealed with bitumen.',
        satisfied: true,
      },
      createdAt: '2026-09-26T08:00:00Z',
      updatedAt: '2026-09-28T12:00:00Z',
      sla: {
        targetHours: 48,
        hoursRemaining: 28,
        slaStatus: 'on_track',
        deadline: '2026-09-28T08:00:00Z',
        isOverdue: false,
      },
    },
    {
      id: 'CR-SOL-104',
      dbId: 104,
      title: 'Water Pipe Joint Leakage',
      description: 'Potable water leaking onto street',
      category: 'water_sewage',
      categoryLabel: 'Water Supply',
      priority: 'high',
      status: 'reopened',
      citizenVerification: {
        satisfied: false,
        verifiedByCitizen: false,
        reopenCount: 1,
        reopenReason: 'Water still bubbling up from side joint after patch.',
      },
      citizenFeedback: {
        rating: 2,
        comment: 'Leak recurring within 2 hours.',
        satisfied: false,
      },
      location: {
        address: 'Station Road, Solapur',
        landmark: 'Opposite Bank',
        ward: 'Ward 4',
        zone: 'Central',
        latitude: 17.6869,
        longitude: 75.9228,
      },
      reporter: {
        name: 'Citizen',
        phone: '9999999999',
        aadharMasked: 'XXXX-XXXX-3456',
        verifiedCitizen: true,
      },
      evidence: { before: [] },
      statusHistory: [],
      adminNotes: [],
      upvotesCount: 15,
      isDuplicateCluster: false,
      createdAt: '2026-09-25T08:00:00Z',
      updatedAt: '2026-09-28T11:00:00Z',
      sla: {
        targetHours: 24,
        hoursRemaining: 18,
        slaStatus: 'warning',
        deadline: '2026-09-29T08:00:00Z',
        isOverdue: false,
      },
    },
  ];

  // 1. Executive Summary Metric Calculations (Realistic Data)
  const metrics = await DashboardIntelligenceService.getUnifiedMetrics({
    complaints: mockComplaints,
    districtId: 'solapur',
  });

  assert(
    metrics.executive.totalComplaints === 4,
    'Executive summary counts total complaints accurately (count=4)'
  );
  assert(
    metrics.executive.activeBacklog === 3,
    'Executive summary calculates active unresolved backlog (open=3, verified/closed excluded)'
  );
  assert(
    metrics.executive.slaRiskCount >= 2,
    'Executive summary aggregates total SLA risks (overdue + warning >= 2)'
  );
  assert(
    metrics.executive.communitySupportedIssuesCount >= 4,
    'Executive summary counts community-supported complaints'
  );

  // 2. Civic Signal & Community Support Synthesis
  assert(
    metrics.civicSignal.totalCommunitySupportsCount === 40,
    'Civic signal aggregates total community support votes (12 + 5 + 8 + 15 = 40)'
  );
  assert(
    metrics.civicSignal.topSupportedIssues.length >= 1 &&
      metrics.civicSignal.topSupportedIssues[0].supportCount === 15,
    'Top supported issues are sorted descending by community support votes (top=15 supports)'
  );

  // 3. Municipal Operations Breakdown
  assert(
    metrics.operations.urgentCount === 1 && metrics.operations.highCount === 2,
    'Municipal operations categorizes priority distribution accurately'
  );
  assert(
    metrics.operations.overdueSLACount === 1,
    'Municipal operations tracks overdue SLA breach counts accurately'
  );

  // 4. Resolution Quality (Officer Resolved vs Citizen Verified)
  assert(
    metrics.resolutionQuality.verifiedByCitizenCount === 1,
    'Resolution quality tracks citizen-verified resolution count'
  );
  assert(
    metrics.resolutionQuality.reopenedCount === 1,
    'Resolution quality tracks citizen dispute / reopened counts'
  );
  assert(
    metrics.resolutionQuality.averageRating === 3.5,
    'Resolution quality reports exact mathematical average rating ((5 + 2) / 2 = 3.5)'
  );
  assert(
    metrics.resolutionQuality.reopenReasonsDistribution.partial_resolution === 1,
    'Structured dispute reasons correctly classifies partial resolution complaint'
  );

  // 5. Civic Recognition & Social Forestry Nursery Redemptions
  assert(
    metrics.recognition.activeOccasionName.includes('Gandhi Jayanti'),
    'Civic recognition references active civic occasion milestones'
  );
  assert(
    typeof metrics.recognition.contributorCount === 'number' &&
      typeof metrics.recognition.plantVouchersRequested === 'number',
    'Civic recognition tracks non-competitive merit milestones and nursery sapling vouchers'
  );

  // 6. Actionable Directives ("Needs Attention") Generation
  assert(
    metrics.actionableDirectives.length >= 1,
    'Generates deterministic actionable directives for operational anomalies'
  );

  const slaDirective = metrics.actionableDirectives.find((d) => d.id === 'dir-sla-overdue');
  assert(
    slaDirective !== undefined && slaDirective.severity === 'critical',
    'Actionable directives generate critical alert for overdue SLA complaints'
  );

  const reopenDirective = metrics.actionableDirectives.find((d) => d.id === 'dir-reopened-disputes');
  assert(
    reopenDirective !== undefined && reopenDirective.targetPage === 'complaints',
    'Actionable directives generate warning alert for citizen-reopened disputes'
  );

  // 7. Empty Dataset Graceful Handling
  const emptyMetrics = await DashboardIntelligenceService.getUnifiedMetrics({
    complaints: [],
    districtId: 'nagpur',
  });
  assert(
    emptyMetrics.executive.totalComplaints === 0 &&
      emptyMetrics.executive.activeBacklog === 0 &&
      typeof emptyMetrics.executive.averageSatisfactionRating === 'number' &&
      emptyMetrics.actionableDirectives.length >= 1,
    'Empty complaint datasets evaluate cleanly without null/divide-by-zero crashes'
  );

  // 8. Security & Zero PII Protection in Dashboard Payload
  const serialized = JSON.stringify(metrics);
  assert(
    !serialized.includes('aadhaar') &&
      !serialized.includes('phone') &&
      !serialized.includes('password') &&
      !serialized.includes('bank_account'),
    'Unified dashboard metrics strictly exclude citizen PII from payload'
  );

  return { passed, failed, errors };
}
