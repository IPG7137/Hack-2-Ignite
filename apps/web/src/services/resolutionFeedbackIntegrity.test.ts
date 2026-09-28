/**
 * CIVICRESOLVE — Test Suite: Task 07 Resolution Feedback & Integrity Review
 * 
 * Verifies:
 * 1. Post-resolution citizen feedback (1-5 star ratings, comments, satisfaction)
 * 2. Lifecycle integration (satisfied -> closed / unsatisfied -> reopened with structured reason)
 * 3. Resolution-cycle aware duplicate handling
 * 4. Deterministic heuristic integrity anomaly detection (frequency bursts, rapid submissions, extreme patterns)
 * 5. Human-in-the-loop municipal staff review queue and audit preservation
 * 6. Role-based security (citizens blocked from integrity flags and staff notes)
 * 7. Operational metrics computation (average rating, resolved %, reopen count, pending reviews)
 * 8. Zero PII leakage in feedback records
 */

import { ResolutionFeedbackService } from './resolutionFeedbackService';
import { ResolutionEvidenceService } from './resolutionEvidenceService';

export function runResolutionFeedbackIntegrityTests(): {
  passed: number;
  failed: number;
  errors: string[];
} {
  console.log('\n--- Running Resolution Feedback & Integrity Test Suite (Task 07) ---');

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

  // Reset stores for clean test isolation
  ResolutionFeedbackService.resetStores();
  ResolutionEvidenceService.resetStores();

  // Seed sample resolution attempt
  const attemptRes = ResolutionEvidenceService.submitResolutionAttempt({
    complaintId: 'CR-2026-PUNE-101',
    resolvedBy: 'officer-pune-44',
    resolvedByRole: 'officer',
    resolutionNote: 'Pothole filled and sealed with bitumen.',
    districtId: 'pune',
    beforeImages: ['https://civicresolve.gov.in/evidence/before-1.jpg'],
    afterImages: ['https://civicresolve.gov.in/evidence/after-1.jpg'],
    resolutionLocation: { latitude: 18.5204, longitude: 73.8567 },
    originalLocation: { latitude: 18.5205, longitude: 73.8568, address: '', landmark: '', ward: 'W-4', zone: 'Central' },
  });
  const attempt1Id = attemptRes.attempt.id;

  // -------------------------------------------------------------
  // 1. Citizen Feedback: Valid Submission & Satisfaction (5 Stars)
  // -------------------------------------------------------------
  const fb1 = ResolutionFeedbackService.submitFeedback({
    complaintId: 'CR-2026-PUNE-101',
    resolutionAttemptId: attempt1Id,
    userId: 'citizen-pune-01',
    rating: 5,
    satisfied: true,
    comment: 'Road is completely fixed. Excellent fast service!',
    districtId: 'pune',
  });

  assert(fb1.success === true, 'Eligible citizen can submit 5-star resolution feedback');
  assert(fb1.feedback.rating === 5, 'Feedback rating is recorded as 5 stars');
  assert(fb1.feedback.satisfied === true, 'Feedback records citizen satisfaction');
  assert(fb1.newStatus === 'closed', 'Satisfied feedback transitions complaint to closed');
  assert(fb1.integrityFlag === undefined, 'Standard genuine feedback generates zero integrity flags');

  // -------------------------------------------------------------
  // 2. Rating Bounds Validation
  // -------------------------------------------------------------
  let zeroRatingError = false;
  try {
    ResolutionFeedbackService.submitFeedback({
      complaintId: 'CR-2026-PUNE-102',
      userId: 'citizen-pune-02',
      rating: 0, // Invalid < 1
      satisfied: true,
      districtId: 'pune',
    });
  } catch (err: any) {
    zeroRatingError = err.message.includes('between 1 and 5');
  }
  assert(zeroRatingError, 'Rejects out-of-bounds rating < 1');

  let sixRatingError = false;
  try {
    ResolutionFeedbackService.submitFeedback({
      complaintId: 'CR-2026-PUNE-102',
      userId: 'citizen-pune-02',
      rating: 6, // Invalid > 5
      satisfied: true,
      districtId: 'pune',
    });
  } catch (err: any) {
    sixRatingError = err.message.includes('between 1 and 5');
  }
  assert(sixRatingError, 'Rejects out-of-bounds rating > 5');

  // -------------------------------------------------------------
  // 3. Resolution Cycle Awareness & Duplicate Prevention
  // -------------------------------------------------------------
  let dupError = false;
  try {
    ResolutionFeedbackService.submitFeedback({
      complaintId: 'CR-2026-PUNE-101',
      resolutionAttemptId: attempt1Id, // Same attempt
      userId: 'citizen-pune-01',
      rating: 5,
      satisfied: true,
      districtId: 'pune',
    });
  } catch (err: any) {
    dupError = err.message.includes('already been recorded');
  }
  assert(dupError, 'Duplicate feedback for the same resolution attempt cycle is rejected');

  // New Attempt (Cycle #2 after rework) allows new feedback
  const attempt2Res = ResolutionEvidenceService.submitResolutionAttempt({
    complaintId: 'CR-2026-PUNE-101',
    resolvedBy: 'officer-pune-44',
    resolvedByRole: 'officer',
    resolutionNote: 'Secondary leveling and tar recoating applied.',
    districtId: 'pune',
    beforeImages: ['https://civicresolve.gov.in/evidence/before-1.jpg'],
    afterImages: ['https://civicresolve.gov.in/evidence/after-2.jpg'],
  });
  const attempt2Id = attempt2Res.attempt.id;

  const fbCycle2 = ResolutionFeedbackService.submitFeedback({
    complaintId: 'CR-2026-PUNE-101',
    resolutionAttemptId: attempt2Id, // New attempt cycle
    userId: 'citizen-pune-01',
    rating: 4,
    satisfied: true,
    comment: 'Rework looks solid.',
    districtId: 'pune',
  });
  assert(fbCycle2.success === true, 'New resolution cycle accepts fresh citizen feedback without unique collision');

  // -------------------------------------------------------------
  // 4. Dispute & Reopen Flow
  // -------------------------------------------------------------
  let missingReasonError = false;
  try {
    ResolutionFeedbackService.submitFeedback({
      complaintId: 'CR-2026-PUNE-103',
      userId: 'citizen-pune-03',
      rating: 1,
      satisfied: false, // Dispute without reason
      districtId: 'pune',
    });
  } catch (err: any) {
    missingReasonError = err.message.includes('structured reopen reason is required');
  }
  assert(missingReasonError, 'Disputing resolution requires structured reopen reason');

  const fbDispute = ResolutionFeedbackService.submitFeedback({
    complaintId: 'CR-2026-PUNE-103',
    userId: 'citizen-pune-03',
    rating: 1,
    satisfied: false,
    reopenReason: 'partial_resolution',
    comment: 'Pothole filled with loose stones only, dust everywhere.',
    verificationPhotoUrl: 'https://civicresolve.gov.in/reopen-proof.jpg',
    districtId: 'pune',
  });
  assert(fbDispute.success === true, 'Unsatisfied citizen feedback recorded with reopen reason');
  assert(fbDispute.newStatus === 'reopened', 'Unsatisfied feedback transitions status to reopened');
  assert(fbDispute.feedback.reopenReason === 'partial_resolution', 'Reopen reason structured as partial_resolution');

  // -------------------------------------------------------------
  // 5. Deterministic Heuristics: High Volume / Frequency Burst
  // -------------------------------------------------------------
  // Submit 4 rapid feedbacks for same user
  for (let i = 1; i <= 3; i++) {
    ResolutionFeedbackService.submitFeedback({
      complaintId: `CR-BURST-${i}`,
      userId: 'burst-user-99',
      rating: 4,
      satisfied: true,
      comment: 'Good',
      districtId: 'pune',
    });
  }
  // 5th submission from same user in < 10 mins
  const burstResult = ResolutionFeedbackService.submitFeedback({
    complaintId: 'CR-BURST-5',
    userId: 'burst-user-99',
    rating: 4,
    satisfied: true,
    comment: 'Good',
    districtId: 'pune',
  });

  assert(burstResult.integrityFlag !== undefined, 'High volume burst triggers integrity review flag');
  assert(burstResult.integrityFlag?.flagType === 'HIGH_VOLUME_BURST', 'Flag type is HIGH_VOLUME_BURST');
  assert(burstResult.integrityFlag?.riskLevel === 'elevated', 'Flag risk level is elevated');
  assert(burstResult.integrityFlag?.status === 'open', 'Flag is initialized in open status');

  // -------------------------------------------------------------
  // 6. Deterministic Heuristics: Rapid Submission Burst (<10s)
  // -------------------------------------------------------------
  const rapidResult = ResolutionFeedbackService.submitFeedback({
    complaintId: 'CR-RAPID-01',
    userId: 'rapid-user-77',
    rating: 1,
    satisfied: false,
    reopenReason: 'other',
    timeSinceResolutionSeconds: 4, // 4 seconds after resolution event
    districtId: 'pune',
  });

  assert(rapidResult.integrityFlag !== undefined, 'Rapid submission (<10s) triggers integrity flag');
  assert(rapidResult.integrityFlag?.flagType === 'RAPID_SUBMISSION_BURST', 'Flag type is RAPID_SUBMISSION_BURST');
  assert(Boolean(rapidResult.integrityFlag?.reasons[0]?.includes('4s')), 'Flag reason explains rapid submission time window');

  // -------------------------------------------------------------
  // 7. Deterministic Heuristics: Repetitive Extreme Ratings Burst
  // -------------------------------------------------------------
  for (let i = 1; i <= 3; i++) {
    ResolutionFeedbackService.submitFeedback({
      complaintId: `CR-EXTREME-${i}`,
      userId: 'extreme-rater-11',
      rating: 1,
      satisfied: false,
      reopenReason: 'other',
      comment: '', // Empty comment
      districtId: 'pune',
    });
  }
  // 4th consecutive extreme 1-star without comment
  const extremeResult = ResolutionFeedbackService.submitFeedback({
    complaintId: 'CR-EXTREME-4',
    userId: 'extreme-rater-11',
    rating: 1,
    satisfied: false,
    reopenReason: 'other',
    comment: '',
    districtId: 'pune',
  });

  assert(extremeResult.integrityFlag !== undefined, 'Consecutive extreme ratings pattern triggers review flag');
  assert(extremeResult.integrityFlag?.flagType === 'EXTREME_RATING_PATTERN', 'Flag type is EXTREME_RATING_PATTERN');

  // -------------------------------------------------------------
  // 8. Deterministic Heuristics: Contradiction Anomaly
  // -------------------------------------------------------------
  const contradictionResult = ResolutionFeedbackService.submitFeedback({
    complaintId: 'CR-CONTRADICT-01',
    userId: 'contradict-user-33',
    rating: 1,
    satisfied: false,
    reopenReason: 'issue_still_exists',
    aiSimilarityScore: 96, // 96% AI image similarity proof
    locationWithinTolerance: true, // GPS verified within 10m
    districtId: 'pune',
  });

  assert(contradictionResult.integrityFlag !== undefined, 'Contradiction between verified photo evidence and 1-star dispute flagged');
  assert(contradictionResult.integrityFlag?.flagType === 'CONTRADICTION_ANOMALY', 'Flag type is CONTRADICTION_ANOMALY');

  // -------------------------------------------------------------
  // 9. Human-in-the-Loop Municipal Review & Adjudication
  // -------------------------------------------------------------
  const targetFlag = burstResult.integrityFlag!;
  const reviewedFlag = ResolutionFeedbackService.reviewIntegrityFlag({
    flagId: targetFlag.id,
    reviewerId: 'ward-officer-deshmukh',
    reviewerRole: 'officer',
    decision: 'dismissed',
    reviewNotes: 'Verified with citizen by phone; legitimate neighborhood ward feedback.',
  });

  assert(reviewedFlag.status === 'dismissed', 'Authorized officer can dismiss integrity flag after review');
  assert(reviewedFlag.reviewedBy === 'ward-officer-deshmukh', 'Reviewer ID preserved in audit trail');
  assert(Boolean(reviewedFlag.reviewNotes?.includes('Verified with citizen')), 'Officer review notes recorded accurately');

  // -------------------------------------------------------------
  // 10. Role Security & Citizen Boundary Enforcement
  // -------------------------------------------------------------
  let citizenReviewError = false;
  try {
    ResolutionFeedbackService.reviewIntegrityFlag({
      flagId: targetFlag.id,
      reviewerId: 'citizen-pune-01',
      reviewerRole: 'citizen' as any,
      decision: 'dismissed',
      reviewNotes: 'I am dismissing my own flag',
    });
  } catch (err: any) {
    citizenReviewError = err.message.includes('Unauthorized');
  }
  assert(citizenReviewError, 'Citizen role is strictly blocked from reviewing integrity flags');

  let citizenQueueAccessError = false;
  try {
    ResolutionFeedbackService.getIntegrityFlags({
      districtId: 'pune',
      userRole: 'citizen',
    });
  } catch (err: any) {
    citizenQueueAccessError = err.message.includes('Access Denied');
  }
  assert(citizenQueueAccessError, 'Citizens cannot query municipal integrity review queues');

  // -------------------------------------------------------------
  // 11. Authoritative Operational Metrics Calculation
  // -------------------------------------------------------------
  const metrics = ResolutionFeedbackService.getFeedbackMetrics('pune');
  assert(metrics.totalFeedbacks > 0, 'Computes total feedback count');
  assert(metrics.averageRating > 0 && metrics.averageRating <= 5, 'Computes accurate average rating (1-5 scale)');
  assert(metrics.resolvedPercentage >= 0 && metrics.resolvedPercentage <= 100, 'Computes resolution satisfaction percentage');
  assert(metrics.reopenCount > 0, 'Computes accurate reopen count');
  assert(metrics.pendingIntegrityReviews >= 0, 'Computes pending integrity reviews count');
  assert(metrics.ratingDistribution[1] >= 1 && metrics.ratingDistribution[5] >= 1, 'Maintains 1-5 star breakdown distribution');

  // -------------------------------------------------------------
  // 12. Security & Zero PII Leakage
  // -------------------------------------------------------------
  const allFeedbacks = ResolutionFeedbackService.getFeedbackForComplaint('CR-2026-PUNE-101');
  for (const fb of allFeedbacks) {
    const json = JSON.stringify(fb);
    assert(!json.includes('password'), 'Feedback payload contains zero passwords');
    assert(!json.match(/\d{4}\s\d{4}\s\d{4}/), 'Feedback payload contains zero raw Aadhar numbers');
    assert(!json.match(/\+91\d{10}/), 'Feedback payload contains zero citizen phone numbers');
  }

  console.log(`Resolution Feedback & Integrity Tests: ${passed} passed, ${failed} failed\n`);

  return { passed, failed, errors };
}
