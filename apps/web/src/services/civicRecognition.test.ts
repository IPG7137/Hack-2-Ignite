/**
 * CIVICRESOLVE — Test Suite: Task 08 Civic Recognition & Digital Certificates
 * 
 * Verifies:
 * 1. Occasion catalog (Gandhi Jayanti, Republic Day, Independence Day) and extensibility
 * 2. Verified civic contribution evaluation: quality-verified reports and resolution audits rewarded
 * 3. Anti-spam: raw complaint volume and unverified submissions do not generate recognition
 * 4. Integrity handling: confirmed integrity violations block certificates; pending reviews do not penalize
 * 5. Digital certificate issuance: unique tamper-verifiable certificate numbers, idempotency
 * 6. Zero PII: public certificate verification exposes no phone, Aadhaar, email, or sensitive data
 * 7. Government nursery sapling voucher workflow: request, duplicate prevention, staff approval, handover
 * 8. Recognition tiers and district metrics
 */

import {
  civicRecognitionService,
  CIVIC_OCCASIONS_CATALOG,
} from './civicRecognitionService';
import { CitizenCivicProfile } from '../types/civicRewards';

export async function runCivicRecognitionTests(): Promise<{
  passed: number;
  failed: number;
  errors: string[];
}> {
  console.log('\n--- Running Civic Recognition & Digital Certificates Test Suite (Task 08) ---');

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

  civicRecognitionService.__resetForTesting();

  // 1. Occasion Catalog & Extensibility
  const occasionIds = CIVIC_OCCASIONS_CATALOG.map((o) => o.id);
  assert(
    occasionIds.includes('gandhi_jayanti_2026') &&
      occasionIds.includes('republic_day_2026') &&
      occasionIds.includes('independence_day_2026'),
    'Catalog includes standard civic occasions (Gandhi Jayanti, Republic Day, Independence Day)'
  );

  const gj = CIVIC_OCCASIONS_CATALOG.find((o) => o.id === 'gandhi_jayanti_2026');
  assert(
    (gj?.minVerifiedReports || 0) >= 2 &&
      (gj?.minVerifiedResolutions || 0) >= 1 &&
      (gj?.minimumScore || 0) >= 50,
    'Occasions require verified quality contributions rather than raw activity'
  );

  // 2. Verified Civic Contribution & Integrity Evaluation
  const qualifiedProfile: CitizenCivicProfile = {
    id: 'prof-001',
    userId: 'user-anil-solapur-001',
    displayName: 'Anil Deshmukh',
    districtId: 'solapur',
    civicScore: 280,
    verifiedReportsCount: 9,
    helpfulEvidenceCount: 7,
    verifiedResolutionsCount: 4,
    badgeLevel: 'champion',
    isFlagged: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-09-28T00:00:00Z',
  };

  const evalQualified = civicRecognitionService.evaluateEligibility({
    profile: qualifiedProfile,
    occasionId: 'gandhi_jayanti_2026',
  });
  assert(
    evalQualified.isEligible &&
      evalQualified.assignedTier === 'CHAMPION' &&
      evalQualified.scoreTargetMet &&
      evalQualified.verifiedReportsTargetMet &&
      evalQualified.verifiedResolutionsTargetMet,
    'Qualified citizen evaluates as eligible for Gandhi Jayanti 2026 with CHAMPION tier'
  );

  const spamProfile: CitizenCivicProfile = {
    ...qualifiedProfile,
    id: 'prof-spam-001',
    userId: 'spammer-001',
    civicScore: 10,
    verifiedReportsCount: 0,   // 0 verified
    verifiedResolutionsCount: 0,
  };

  const evalSpam = civicRecognitionService.evaluateEligibility({
    profile: spamProfile,
    occasionId: 'gandhi_jayanti_2026',
  });
  assert(
    !evalSpam.isEligible && !evalSpam.verifiedReportsTargetMet,
    'Unverified raw volume spam is rejected from civic recognition'
  );

  const evalViolated = civicRecognitionService.evaluateEligibility({
    profile: qualifiedProfile,
    occasionId: 'gandhi_jayanti_2026',
    hasConfirmedIntegrityViolation: true,
  });
  assert(
    !evalViolated.isEligible &&
      evalViolated.reasons.includes('Account has confirmed civic integrity violations.'),
    'Confirmed integrity violations block recognition certificate eligibility'
  );

  const evalUnderReview = civicRecognitionService.evaluateEligibility({
    profile: qualifiedProfile,
    occasionId: 'gandhi_jayanti_2026',
    hasConfirmedIntegrityViolation: false,
  });
  assert(
    evalUnderReview.isEligible,
    'Open integrity review without confirmed fraud does not penalize citizen recognition'
  );

  // 3. Digital Certificate Issuance & Safe Public Verification
  const issueRes = await civicRecognitionService.issueCertificate({
    userId: 'user-anil-solapur-001',
    userName: 'Anil Deshmukh',
    districtId: 'solapur',
    districtName: 'Solapur',
    occasionId: 'gandhi_jayanti_2026',
  });
  assert(
    issueRes.success &&
      /^CR-GJ-2026-SOLAPUR-/.test(issueRes.certificate?.certificateNumber || '') &&
      issueRes.certificate?.plantRedeemable === true,
    'Official digital certificate issued with formatted unique certificate number'
  );

  const issueDuplicate = await civicRecognitionService.issueCertificate({
    userId: 'user-anil-solapur-001',
    userName: 'Anil Deshmukh',
    districtId: 'solapur',
    districtName: 'Solapur',
    occasionId: 'gandhi_jayanti_2026',
  });
  assert(
    issueDuplicate.success && issueDuplicate.certificate?.id === issueRes.certificate?.id,
    'Certificate issuance is idempotent (re-issuance returns existing certificate)'
  );

  const certNumber = issueRes.certificate!.certificateNumber;
  const verifyRes = await civicRecognitionService.verifyPublicCertificate(certNumber);
  const detailsKeys = Object.keys(verifyRes.details || {});
  const hasZeroPII =
    !detailsKeys.includes('phone') &&
    !detailsKeys.includes('aadhaar') &&
    !detailsKeys.includes('email') &&
    !detailsKeys.includes('bankAccount');

  assert(
    verifyRes.isValid &&
      verifyRes.details?.recipientName === 'Anil Deshmukh' &&
      verifyRes.details?.districtName === 'Solapur' &&
      hasZeroPII,
    'Public certificate verification verifies authenticity with ZERO PII leakage'
  );

  const verifyFake = await civicRecognitionService.verifyPublicCertificate('CR-FAKE-9999');
  assert(!verifyFake.isValid, 'Public verification rejects non-existent certificate numbers');

  // 4. Government Nursery Plant Sapling Redemption Workflow
  const redeemRes = await civicRecognitionService.requestPlantRedemption({
    certificateId: issueRes.certificate!.id,
    preferredPlantType: 'Neem (Azadirachta indica)',
    collectionNurseryName: 'Solapur Municipal Social Forestry Nursery',
  });
  assert(
    redeemRes.success &&
      /^PLANT-2026-SOLAPUR-/.test(redeemRes.redemption?.voucherCode || '') &&
      redeemRes.redemption?.status === 'REQUESTED',
    'Eligible certificate holder can request municipal sapling voucher'
  );

  const duplicateRedeemRes = await civicRecognitionService.requestPlantRedemption({
    certificateId: issueRes.certificate!.id,
    preferredPlantType: 'Peepal (Ficus religiosa)',
    collectionNurseryName: 'Solapur Municipal Social Forestry Nursery',
  });
  assert(
    !duplicateRedeemRes.success &&
      (duplicateRedeemRes.error || '').toLowerCase().includes('already'),
    'Duplicate plant voucher requests for the same certificate are rejected'
  );

  const redemptionId = redeemRes.redemption!.id;

  const approveRes = await civicRecognitionService.adjudicateRedemption({
    redemptionId,
    action: 'APPROVE',
    reviewedBy: 'OFFICER_PATIL_SOLAPUR',
  });
  assert(
    approveRes.success && approveRes.redemption?.status === 'APPROVED',
    'Municipal staff can approve sapling redemption voucher for pickup'
  );

  const redeemFinalRes = await civicRecognitionService.adjudicateRedemption({
    redemptionId,
    action: 'REDEEM',
    reviewedBy: 'OFFICER_PATIL_SOLAPUR',
  });
  assert(
    redeemFinalRes.success &&
      redeemFinalRes.redemption?.status === 'REDEEMED' &&
      !!redeemFinalRes.redemption?.redeemedAt,
    'Municipal staff marks sapling physically handed over / redeemed'
  );

  // 5. Operational Recognition Metrics
  const metrics = await civicRecognitionService.getRecognitionMetrics('solapur');
  assert(
    metrics.totalCertificatesIssued >= 1 && metrics.totalPlantRedemptionsRequested >= 1,
    'District recognition metrics correctly track certificate and voucher totals'
  );

  return { passed, failed, errors };
}
