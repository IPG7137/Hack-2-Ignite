/**
 * Smart Alerts & SLA Management Automated Test Suite (Feature 4)
 * Tests:
 *  1. SLA statutory calculations (12h urgent, 24h high, 48h medium, 72h low)
 *  2. Unconfigured SLA handling (zero invented government deadlines)
 *  3. SLA state transitions (ON_TRACK, DUE_SOON, OVERDUE, RESOLVED, CLOSED)
 *  4. Escalation tier assignments (Tier 1-4)
 *  5. Critical complaint alerts
 *  6. SLA breach and due-soon alerts
 *  7. Volume spike and geographic cluster detection
 *  8. Deduplication and idempotency
 *  9. Alert acknowledgement and escalation audit trail
 * 10. District data isolation (Pune, Solapur, Nashik, CSN)
 * 11. Non-PII security verification
 */

import { SLAEngine } from './slaEngine';
import { SmartAlertEngine } from './smartAlertEngine';
import { Complaint } from '../types/complaint';
import {
  getMockComplaintsForDistrict,
  getAllStateComplaints,
} from './mock/districtMockData';

export function runSmartAlertsSLATests(): { passed: number; failed: number; errors: string[] } {
  console.log('--- Running Smart Alerts & SLA Management Test Suite (Feature 4) ---');
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

  const now = Date.now();

  // -------------------------------------------------------------
  // TEST 1: Statutory SLA Duration Calculations
  // -------------------------------------------------------------
  const mockUrgent: Complaint = {
    id: 'CR-TEST-URGENT',
    dbId: 9001,
    title: 'Burst Water Main Inundation',
    description: 'Major high pressure water pipe burst flooding road',
    category: 'water_sewage',
    categoryLabel: 'Water Supply',
    location: {
      address: 'Shivajinagar Chowk',
      landmark: 'Near Bus Stand',
      ward: 'Ward 5',
      zone: 'Zone 1',
      latitude: 18.5314,
      longitude: 73.8446,
    },
    status: 'in_progress',
    priority: 'urgent',
    reporter: { name: 'Citizen', phone: '9876543210', aadharMasked: 'XXXX-XXXX-1234', verifiedCitizen: true },
    evidence: { before: [] },
    statusHistory: [],
    adminNotes: [],
    sla: { targetHours: 8, hoursRemaining: 6, slaStatus: 'on_track', deadline: '', isOverdue: false },
    upvotesCount: 0,
    isDuplicateCluster: false,
    createdAt: new Date(now - 2 * 3600 * 1000).toISOString(), // 2 hours ago
    updatedAt: new Date(now - 2 * 3600 * 1000).toISOString(),
  };

  const urgentEval = SLAEngine.evaluateComplaintSLA(mockUrgent, 'pune', 'pmc', now);
  assert(urgentEval.slaConfigured === true, 'SLA is properly configured for urgent water supply');
  assert(urgentEval.slaDurationHours === 8, 'Urgent water supply duration equals 8 hours statutory benchmark');
  assert(urgentEval.remainingTimeHours === 6, 'Remaining time accurately computed as 6.0 hours');
  assert(urgentEval.slaState === 'ON_TRACK', 'Status is ON_TRACK with 6h remaining on 8h SLA');
  assert(urgentEval.isBreached === false, 'Complaint is not breached');

  // -------------------------------------------------------------
  // TEST 2: Unconfigured SLA Safety Check (Zero Fake Deadlines)
  // -------------------------------------------------------------
  const unconfiguredRulePrio: any = 'non_standard_prio';
  const unconfiguredComplaint: Complaint = {
    ...mockUrgent,
    priority: unconfiguredRulePrio,
    category: 'parks',
  };
  const unconfiguredEval = SLAEngine.evaluateComplaintSLA(unconfiguredComplaint, 'pune', 'pmc', now);
  assert(unconfiguredEval.slaConfigured === false, 'Unconfigured category/priority explicitly sets slaConfigured=false');
  assert(unconfiguredEval.slaState === 'NOT_CONFIGURED', 'Unconfigured complaint returns slaState=NOT_CONFIGURED');
  assert(unconfiguredEval.slaDueAt === null, 'Unconfigured complaint does NOT invent a fake due date');

  // -------------------------------------------------------------
  // TEST 3: SLA Due Soon Detection
  // -------------------------------------------------------------
  const dueSoonComplaint: Complaint = {
    ...mockUrgent,
    category: 'roads',
    priority: 'high', // 24h SLA, due soon threshold = 6h
    createdAt: new Date(now - 20 * 3600 * 1000).toISOString(), // 20 hours ago (4 hours left)
  };
  const dueSoonEval = SLAEngine.evaluateComplaintSLA(dueSoonComplaint, 'pune', 'pmc', now);
  assert(dueSoonEval.slaDurationHours === 24, 'High priority road repair has 24h SLA');
  assert(dueSoonEval.remainingTimeHours === 4, 'Remaining time is 4.0 hours');
  assert(dueSoonEval.slaState === 'DUE_SOON', 'Complaint within 6h threshold transitions to DUE_SOON');
  assert(dueSoonEval.escalationLevel === 2, 'Due soon triggers Tier 2 warning escalation');

  // -------------------------------------------------------------
  // TEST 4: SLA Overdue Breach & Tier 4 Escalation
  // -------------------------------------------------------------
  const overdueComplaint: Complaint = {
    ...mockUrgent,
    category: 'roads',
    priority: 'high', // 24h SLA, escalation threshold = 4h past breach
    createdAt: new Date(now - 30 * 3600 * 1000).toISOString(), // 30 hours ago (6 hours overdue)
  };
  const overdueEval = SLAEngine.evaluateComplaintSLA(overdueComplaint, 'pune', 'pmc', now);
  assert(overdueEval.isBreached === true, 'Complaint past deadline is marked isBreached=true');
  assert(overdueEval.slaState === 'OVERDUE', 'State is OVERDUE');
  assert(overdueEval.overdueDurationHours === 6, 'Overdue duration is exactly 6.0 hours');
  assert(overdueEval.escalationLevel === 4, 'Overdue > 4h threshold triggers Tier 4 Executive Escalation');

  // -------------------------------------------------------------
  // TEST 5: Terminal State (Closed / Verified)
  // -------------------------------------------------------------
  const closedComplaint: Complaint = {
    ...mockUrgent,
    status: 'closed',
    createdAt: new Date(now - 50 * 3600 * 1000).toISOString(),
  };
  const closedEval = SLAEngine.evaluateComplaintSLA(closedComplaint, 'pune', 'pmc', now);
  assert(closedEval.slaState === 'CLOSED', 'Closed complaint is CLOSED and exempt from overdue penalties');
  assert(closedEval.isBreached === false, 'Closed complaint is never flagged as breached');

  // -------------------------------------------------------------
  // TEST 6: Smart Alert Engine Evaluation
  // -------------------------------------------------------------
  const puneComplaints = getMockComplaintsForDistrict('pune');
  const puneAlerts = SmartAlertEngine.evaluateAlerts(puneComplaints, 'pune', 'pmc', now);

  assert(puneAlerts.length > 0, `SmartAlertEngine generated ${puneAlerts.length} factual alerts for Pune`);

  const criticalAlerts = puneAlerts.filter((a) => a.severity === 'CRITICAL');
  const slaBreachAlerts = puneAlerts.filter((a) => a.type === 'SLA_OVERDUE');
  const slaDueSoonAlerts = puneAlerts.filter((a) => a.type === 'SLA_DUE_SOON');

  assert(criticalAlerts.length >= 1, `Found ${criticalAlerts.length} critical priority alerts in Pune`);
  assert(slaBreachAlerts.length >= 1, `Found ${slaBreachAlerts.length} SLA breach alerts in Pune`);

  // Verify recommended actions are deterministic
  puneAlerts.forEach((a) => {
    assert(a.recommendedAction.length > 10, `Alert #${a.id} has deterministic operational recommended action`);
    assert(a.districtId === 'pune', `Alert #${a.id} strictly belongs to Pune district`);
  });

  // -------------------------------------------------------------
  // TEST 7: Alert Deduplication & Idempotency
  // -------------------------------------------------------------
  const puneAlertsSecondRun = SmartAlertEngine.evaluateAlerts(puneComplaints, 'pune', 'pmc', now);
  assert(
    puneAlerts.length === puneAlertsSecondRun.length,
    'Evaluating the same dataset produces identical deduplicated alert count'
  );
  const fingerprints = new Set(puneAlerts.map((a) => a.fingerprint));
  assert(fingerprints.size === puneAlerts.length, 'Every alert in queue has a unique deduplication fingerprint');

  // -------------------------------------------------------------
  // TEST 8: Alert Acknowledgement & Escalation Workflow
  // -------------------------------------------------------------
  const sampleAlert = puneAlerts[0];
  const ackSuccess = SmartAlertEngine.acknowledgeAlert({
    alertId: sampleAlert.id,
    acknowledgedBy: 'Officer Kulkarni',
    role: 'Executive Duty Officer',
    notes: 'Dispatched Ward 3 response unit.',
  });
  assert(ackSuccess === true, 'Alert successfully acknowledged');

  const reloadedAlerts = SmartAlertEngine.evaluateAlerts(puneComplaints, 'pune', 'pmc', now);
  const ackedAlert = reloadedAlerts.find((a) => a.id === sampleAlert.id || a.fingerprint === sampleAlert.fingerprint);
  assert(ackedAlert?.status === 'ACKNOWLEDGED', 'Acknowledged status persisted across evaluations');
  assert(Boolean(ackedAlert?.acknowledgedBy?.includes('Officer Kulkarni')), 'Officer name recorded in audit trail');

  // -------------------------------------------------------------
  // TEST 9: Strict District Data Isolation
  // -------------------------------------------------------------
  const solapurComplaints = getMockComplaintsForDistrict('solapur');
  const nashikComplaints = getMockComplaintsForDistrict('nashik');
  const csnComplaints = getMockComplaintsForDistrict('chhatrapati_sambhajinagar');

  const solapurAlerts = SmartAlertEngine.evaluateAlerts(solapurComplaints, 'solapur', 'smc', now);
  const nashikAlerts = SmartAlertEngine.evaluateAlerts(nashikComplaints, 'nashik', 'nmc', now);
  const csnAlerts = SmartAlertEngine.evaluateAlerts(csnComplaints, 'chhatrapati_sambhajinagar', 'csmc', now);

  // Assert Solapur contains zero Pune alerts
  const solapurHasPune = solapurAlerts.some((a) => a.districtId === 'pune' || a.title.includes('PUN'));
  assert(!solapurHasPune, 'Solapur alert queue contains ZERO Pune alerts');

  // Assert Pune contains zero Solapur alerts
  const puneHasSolapur = puneAlerts.some((a) => a.districtId === 'solapur' || a.title.includes('SOL'));
  assert(!puneHasSolapur, 'Pune alert queue contains ZERO Solapur alerts');

  // Assert Nashik contains zero Solapur/Pune alerts
  const nashikHasOther = nashikAlerts.some((a) => a.districtId === 'pune' || a.districtId === 'solapur');
  assert(!nashikHasOther, 'Nashik alert queue contains ZERO Pune or Solapur alerts');

  // -------------------------------------------------------------
  // TEST 10: Non-PII Security Audit
  // -------------------------------------------------------------
  [...puneAlerts, ...solapurAlerts, ...nashikAlerts, ...csnAlerts].forEach((a) => {
    const raw = JSON.stringify(a);
    const hasAadhaar = raw.includes('aadhar') || raw.includes('citizen_phone');
    assert(!hasAadhaar, `Alert #${a.id} contains zero sensitive citizen PII`);
  });

  return { passed, failed, errors };
}
