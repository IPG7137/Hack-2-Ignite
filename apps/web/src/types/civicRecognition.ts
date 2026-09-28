/**
 * CIVICRESOLVE — Civic Recognition, Digital Certificates & Nursery Redemption Types
 * 
 * Defines canonical contracts for:
 * 1. Verified civic contribution recognition tiers (not raw unverified volume)
 * 2. Extensible civic occasion citations (Gandhi Jayanti 2 Oct, Republic Day 26 Jan, Independence Day 15 Aug)
 * 3. Digital verifiable certificates with unique verification codes and zero PII leakage
 * 4. Government nursery plant voucher redemption requests and municipal approval workflows
 */

export type CivicRecognitionTier = 'CHAMPION' | 'SUPPORTER' | 'CONTRIBUTOR';

export interface CivicOccasion {
  id: string; // e.g. 'gandhi_jayanti_2026'
  name: string; // e.g. 'Gandhi Jayanti Civic Recognition 2026'
  occasionDate: string; // e.g. '2026-10-02'
  calendarDate?: string;
  formattedDate: string; // e.g. '2 October 2026'
  description: string;
  theme: string; // e.g. 'Swachhata, Self-Reliance & Transparent Civic Action'
  minimumScore: number;
  minVerifiedReports?: number;
  minVerifiedResolutions?: number;
  minimumVerifiedActions: number;
  badgeIconName: string;
}

export interface ContributionSummary {
  verifiedReportsCount: number;
  verifiedResolutionsCount: number;
  totalCivicScore: number;
  verifiedReports?: number;
  verifiedResolutions?: number;
  helpfulSupports?: number;
  civicScore?: number;
  confirmedIntegrityViolations?: number;
}

export interface CivicCertificate {
  id: string;
  userId: string;
  userName?: string;
  recipientName?: string;
  recipientDisplayName: string;
  districtId: string;
  districtName: string;
  occasionId: string;
  occasionName: string;
  recognitionTier: CivicRecognitionTier;
  tierLabel?: string;
  certificateNumber: string; // e.g. 'CR-GJ-2026-SOLAPUR-8901'
  issuedAt: string;
  formattedIssuedDate: string;
  verifiedContributionsSummary: ContributionSummary;
  contributionSummary?: ContributionSummary;
  plantRedeemable: boolean;
  plantRedeemed: boolean;
  isRevoked: boolean;
  revocationReason?: string;
  verificationCode: string;
  citationText: string;
}

export type RedemptionStatus = 'REQUESTED' | 'APPROVED' | 'REDEEMED' | 'CANCELLED';

export interface CivicRedemption {
  id: string;
  userId: string;
  userName?: string;
  districtId: string;
  districtName: string;
  certificateId?: string;
  preferredPlantType: string;
  collectionNurseryName: string;
  voucherCode: string;
  redemptionCode?: string;
  rewardType: 'GOVERNMENT_NURSERY_SAPLING';
  itemTitle: string;
  description: string;
  status: RedemptionStatus;
  createdAt: string;
  requestedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  redeemedAt?: string;
  nurseryLocation: string;
  notes?: string;
}

export interface RecognitionEligibilityResult {
  isEligible: boolean;
  assignedTier: CivicRecognitionTier;
  scoreTargetMet: boolean;
  verifiedReportsTargetMet: boolean;
  verifiedResolutionsTargetMet: boolean;
  eligibleOccasions: CivicOccasion[];
  reasons: string[];
  missingRequirements: string[];
}

export interface PublicCertificateVerificationResult {
  isValid: boolean;
  certificateNumber: string;
  occasionName?: string;
  recognitionTier?: CivicRecognitionTier;
  recipientDisplayName?: string;
  districtName?: string;
  issuedAt?: string;
  contributionSummary?: ContributionSummary;
  details?: {
    certificateNumber: string;
    occasionName: string;
    recognitionTier: CivicRecognitionTier;
    recipientName: string;
    districtName: string;
    issuedAt: string;
    summary: ContributionSummary;
  };
  isRevoked?: boolean;
  revocationReason?: string;
  error?: string;
  message: string;
}

export interface CivicRecognitionMetrics {
  totalCertificatesIssued: number;
  totalRedemptionsRequested: number;
  totalRedemptionsApproved: number;
  totalPlantsRedeemed: number;
  totalPlantRedemptionsRequested: number;
  tierDistribution: {
    CHAMPION: number;
    SUPPORTER: number;
    CONTRIBUTOR: number;
  };
}
