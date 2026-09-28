/**
 * CIVICRESOLVE — Phase 17: Feature 5 Before/After Resolution Verification Test Suite
 * 
 * Automated testing of evidence-based complaint resolution, GPS geotag audits,
 * timestamp tracking, AI-assisted advisory signals, citizen verification/reopening,
 * multi-attempt ledgers, and strict district isolation.
 */

import { ResolutionEvidenceService } from './resolutionEvidenceService';
import { ReopenReason, REOPEN_REASON_LABELS } from '../types/evidence';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

export async function runResolutionEvidenceTests(): Promise<{ passed: number; failed: number }> {
  console.log('\n--- Running Before/After Resolution Verification Test Suite (Feature 5) ---');
  ResolutionEvidenceService.resetStores();

  // Test 1: GPS Haversine Distance Calculation
  const distZero = ResolutionEvidenceService.calculateHaversineDistance(18.5204, 73.8567, 18.5204, 73.8567);
  assert(distZero === 0, 'Exact same GPS coordinates yield 0 meters distance');

  // Pune PMC Bhavan (18.5204, 73.8567) to Shaniwar Wada (~500m away, 18.5196, 73.8553)
  const distClose = ResolutionEvidenceService.calculateHaversineDistance(18.5204, 73.8567, 18.5196, 73.8553);
  assert(distClose > 100 && distClose < 300, `Close municipal proximity computed accurately (${distClose}m)`);

  // Test 2: Location Verification within 200m statutory tolerance
  const locWithin = ResolutionEvidenceService.verifyLocationCoordinates(
    { latitude: 18.5204, longitude: 73.8567 },
    { latitude: 18.5205, longitude: 73.8568 }
  );
  assert(locWithin.hasOriginalCoordinates === true, 'Original coordinates detected');
  assert(locWithin.hasResolutionCoordinates === true, 'Resolution coordinates detected');
  assert(locWithin.isWithinTolerance === true, 'Proximity within 200m tolerance marked isWithinTolerance=true');
  assert(locWithin.badgeVariant === 'success', 'Within tolerance badge is success');
  assert(locWithin.statusLabel.includes('Location verified'), 'Status label indicates location verified');

  // Test 3: Location Verification beyond tolerance (> 200m)
  const locFar = ResolutionEvidenceService.verifyLocationCoordinates(
    { latitude: 18.5204, longitude: 73.8567 },
    { latitude: 18.5300, longitude: 73.8700 }
  );
  assert(locFar.isWithinTolerance === false, 'Proximity beyond tolerance marked isWithinTolerance=false');
  assert(locFar.badgeVariant === 'warning', 'Beyond tolerance badge is warning');
  assert(
    locFar.statusLabel.includes('away from original complaint location'),
    'Status label objectively reports distance without fraudulent accusations'
  );

  // Test 4: Location Verification when coordinates missing
  const locMissing = ResolutionEvidenceService.verifyLocationCoordinates(null, null);
  assert(locMissing.isWithinTolerance === false, 'Missing coordinates sets isWithinTolerance=false');
  assert(
    locMissing.statusLabel === 'Location verification unavailable for this evidence.',
    'Missing coordinates displays honest fallback text'
  );

  // Test 5: Timestamp Verification
  const reportTime = '2026-09-28T08:00:00.000Z';
  const captureTime = '2026-09-28T11:30:00.000Z';
  const uploadTime = '2026-09-28T12:00:00.000Z';
  const timeResult = ResolutionEvidenceService.verifyTimestamps(reportTime, captureTime, uploadTime);
  assert(timeResult.reportedAt === reportTime, 'Reported timestamp preserved');
  assert(timeResult.resolutionCapturedAt === captureTime, 'Photo captured timestamp accurately distinguished');
  assert(timeResult.resolutionUploadedAt === uploadTime, 'Photo upload timestamp accurately distinguished');
  assert(timeResult.durationHoursFromReportToResolution === 4.0, 'Duration computed as exactly 4.0 hours');

  // Test 6: Evidence File Quality & Validation Checks
  const validJpg = ResolutionEvidenceService.validateEvidenceFile({
    mimeType: 'image/jpeg',
    fileSizeBytes: 2.5 * 1024 * 1024,
    fileHash: 'hash-jpg-001',
  });
  assert(validJpg.isValid === true, 'Valid JPEG image passes validation');
  assert(validJpg.errors.length === 0, 'Zero errors for standard resolution photo');

  const invalidExe = ResolutionEvidenceService.validateEvidenceFile({
    mimeType: 'application/x-msdownload',
    fileSizeBytes: 1024,
  });
  assert(invalidExe.isValid === false, 'Executable binary file format rejected');
  assert(invalidExe.errors.some((e) => e.includes('Unsupported file format')), 'Clear error for invalid format');

  const oversized = ResolutionEvidenceService.validateEvidenceFile({
    mimeType: 'image/png',
    fileSizeBytes: 20 * 1024 * 1024, // 20MB > 15MB
  });
  assert(oversized.isValid === false, 'File exceeding 15MB limit is rejected');

  // Duplicate image hash check
  const duplicateCheck = ResolutionEvidenceService.validateEvidenceFile({
    mimeType: 'image/jpeg',
    fileSizeBytes: 2.5 * 1024 * 1024,
    fileHash: 'hash-jpg-001', // Repeated hash
  });
  assert(duplicateCheck.isPotentialDuplicate === true, 'Duplicate image hash triggers warning signal');
  assert(
    duplicateCheck.warnings.some((w) => w.includes('Potential duplicate')),
    'Duplicate warning provides advisory note'
  );

  // Test 7: AI-Assisted Advisory Visual Review
  const aiEmpty = ResolutionEvidenceService.runAIAssistedEvidenceReview([], []);
  assert(aiEmpty.isAvailable === false, 'Empty photos sets isAvailable=false');
  assert(
    aiEmpty.summary === 'Insufficient visual evidence for automated assessment.',
    'Empty photos outputs honest fallback disclaimer'
  );

  const aiValid = ResolutionEvidenceService.runAIAssistedEvidenceReview(
    ['https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?w=600'],
    ['https://images.unsplash.com/photo-1515260268569-9271009adfdb?w=600'],
    'roads',
    'Pothole filled with cold mix asphalt and compacted'
  );
  assert(aiValid.isAvailable === true, 'Valid before/after images produce advisory assessment');
  assert(aiValid.confidenceScore >= 80, 'High quality evidence produces confidence score >= 80%');
  assert(aiValid.resolutionIndication === 'likely', 'Clear remediation results in likely indication');
  assert(
    aiValid.disclaimer.includes('advisory only'),
    'Mandatory disclaimer states AI review is advisory and requires human sign-off'
  );

  // Test 8: Submitting Formal Resolution Attempt
  const attemptResult1 = ResolutionEvidenceService.submitResolutionAttempt({
    complaintId: 'CR-PUN-101',
    resolvedBy: 'Er. S. Patil (Junior Engineer)',
    resolvedByRole: 'officer',
    resolutionNote: 'Main water distribution pipe joint welded and pressure test verified.',
    beforeImages: ['https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=600'],
    afterImages: ['https://images.unsplash.com/photo-1515260268569-9271009adfdb?w=600'],
    originalLocation: { latitude: 18.5204, longitude: 73.8567 },
    resolutionLocation: { latitude: 18.5205, longitude: 73.8568 },
    districtId: 'pune',
    organizationId: 'org-pmc',
  });
  assert(attemptResult1.attempt.attemptNumber === 1, 'First attempt is numbered #1');
  assert(
    attemptResult1.attempt.status === 'submitted_awaiting_verification',
    'Attempt status initialized to submitted_awaiting_verification'
  );
  assert(attemptResult1.attempt.locationVerified === true, 'Resolution location within tolerance verified');
  assert(attemptResult1.auditEvent.action === 'RESOLUTION_SUBMITTED', 'Audit event created for resolution submission');

  // Test 9: Citizen Rejection (Reopen Workflow)
  const citizenReopen = ResolutionEvidenceService.processCitizenVerification({
    complaintId: 'CR-PUN-101',
    resolutionAttemptId: attemptResult1.attempt.id,
    satisfied: false,
    reopenReason: 'partial_resolution',
    citizenComment: 'Water flow restored but small leak persists near the valve collar.',
    verifiedBy: 'Citizen Ramesh Shinde',
    districtId: 'pune',
  });
  assert(citizenReopen.success === true, 'Citizen verification processing succeeded');
  assert(citizenReopen.newStatus === 'reopened', 'Citizen rejection transitions status to reopened');
  assert(citizenReopen.verificationRecord.satisfied === false, 'Verification record satisfied=false');
  assert(
    citizenReopen.verificationRecord.reopenReason === 'partial_resolution',
    'Reopen reason structured as partial_resolution'
  );
  assert(
    citizenReopen.verificationRecord.reopenReasonLabel === REOPEN_REASON_LABELS.partial_resolution,
    'Reopen reason label properly mapped'
  );
  assert(citizenReopen.auditEvent.action === 'CITIZEN_REJECTED_REOPENED', 'Audit event recorded for reopen');

  // Test 10: Multi-Attempt Preservation (Second Attempt after Reopen)
  const attemptResult2 = ResolutionEvidenceService.submitResolutionAttempt({
    complaintId: 'CR-PUN-101',
    resolvedBy: 'Er. S. Patil (Junior Engineer)',
    resolvedByRole: 'officer',
    resolutionNote: 'Valve collar replaced with industrial gasket; zero leakage confirmed.',
    beforeImages: ['https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=600'],
    afterImages: [
      'https://images.unsplash.com/photo-1515260268569-9271009adfdb?w=600',
      'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=600',
    ],
    originalLocation: { latitude: 18.5204, longitude: 73.8567 },
    resolutionLocation: { latitude: 18.5204, longitude: 73.8567 },
    districtId: 'pune',
    organizationId: 'org-pmc',
  });
  assert(attemptResult2.attempt.attemptNumber === 2, 'Second resolution attempt is numbered #2');

  const history = ResolutionEvidenceService.getResolutionAttempts('CR-PUN-101');
  assert(history.length === 2, 'History ledger contains both Attempt 1 and Attempt 2');
  assert(history[0].status === 'rejected_reopened', 'Attempt 1 preserves rejected_reopened audit state');
  assert(
    history[1].status === 'submitted_awaiting_verification',
    'Attempt 2 is active submitted_awaiting_verification'
  );

  // Test 11: Citizen Confirmation (YES — Issue Resolved)
  const citizenSignOff = ResolutionEvidenceService.processCitizenVerification({
    complaintId: 'CR-PUN-101',
    resolutionAttemptId: attemptResult2.attempt.id,
    satisfied: true,
    citizenComment: 'Thoroughly checked on-site. Zero leak and road cleaned.',
    verifiedBy: 'Citizen Ramesh Shinde',
    districtId: 'pune',
  });
  assert(citizenSignOff.newStatus === 'closed', 'Citizen sign-off transitions complaint status to closed');
  assert(citizenSignOff.auditEvent.action === 'CITIZEN_VERIFIED_RESOLVED', 'Audit event recorded for case closure');

  const updatedHistory = ResolutionEvidenceService.getResolutionAttempts('CR-PUN-101');
  assert(updatedHistory[1].status === 'verified_resolved', 'Attempt 2 status updated to verified_resolved');

  // Test 12: Audit Trail Integrity
  const fullAudit = ResolutionEvidenceService.getAuditTrail('CR-PUN-101');
  assert(fullAudit.length === 4, 'Full chronological audit trail contains all 4 lifecycle events');
  assert(fullAudit[0].action === 'RESOLUTION_SUBMITTED', 'Audit Event 1: RESOLUTION_SUBMITTED');
  assert(fullAudit[1].action === 'CITIZEN_REJECTED_REOPENED', 'Audit Event 2: CITIZEN_REJECTED_REOPENED');
  assert(fullAudit[2].action === 'RESOLUTION_SUBMITTED', 'Audit Event 3: RESOLUTION_SUBMITTED (Attempt 2)');
  assert(fullAudit[3].action === 'CITIZEN_VERIFIED_RESOLVED', 'Audit Event 4: CITIZEN_VERIFIED_RESOLVED');

  // Test 13: District Isolation in Resolution Attempts
  ResolutionEvidenceService.submitResolutionAttempt({
    complaintId: 'CR-SOL-101',
    resolvedBy: 'Er. A. Kulkarni (Solapur Ward Officer)',
    resolvedByRole: 'officer',
    resolutionNote: 'Solapur water pipe repaired.',
    beforeImages: ['https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=600'],
    afterImages: ['https://images.unsplash.com/photo-1515260268569-9271009adfdb?w=600'],
    districtId: 'solapur',
    organizationId: 'org-smc',
  });

  const solapurAttempts = ResolutionEvidenceService.getResolutionAttempts('CR-SOL-101');
  assert(solapurAttempts.length === 1, 'Solapur complaint has 1 attempt');
  assert(solapurAttempts[0].districtId === 'solapur', 'Solapur attempt strictly belongs to Solapur district');

  const puneAttempts = ResolutionEvidenceService.getResolutionAttempts('CR-PUN-101');
  assert(
    puneAttempts.every((a) => a.districtId === 'pune'),
    'Pune attempts contain ZERO Solapur attempts (strict district isolation)'
  );

  // Test 14: Non-PII Audit Payload Verification
  for (const audit of fullAudit) {
    const jsonStr = JSON.stringify(audit);
    assert(!jsonStr.includes('password'), 'Audit payload contains zero passwords');
    assert(!jsonStr.includes('aadhar'), 'Audit payload contains zero Aadhar numbers');
    assert(!jsonStr.includes('phone'), 'Audit payload contains zero citizen phone numbers');
  }

  return { passed, failed };
}

// Direct CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  runResolutionEvidenceTests().then(({ passed, failed }) => {
    console.log(`\n📊 Feature 5 Tests: ${passed} passed, ${failed} failed\n`);
    if (failed > 0) process.exit(1);
  });
}
