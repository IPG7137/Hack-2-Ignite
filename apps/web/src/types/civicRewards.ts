/**
 * CIVICRESOLVE — District-Wise Civic Rewards & Champion System Types
 */

export type CivicBadgeLevel = 'starter' | 'contributor' | 'champion' | 'leader';

export type CivicContributionType =
  | 'verified_report'
  | 'accurate_location'
  | 'useful_evidence'
  | 'critical_issue_bonus'
  | 'resolution_verification'
  | 'resolution_upvote'
  | 'duplicate_reduced'
  | 'moderation_adjustment';

export interface CivicRewardsConfig {
  pointsValidReport: number; // default: 10
  pointsAccurateGps: number; // default: 5
  pointsUsefulEvidence: number; // default: 5
  pointsCriticalBonus: number; // default: 10
  pointsResolutionVerification: number; // default: 10
  pointsResolutionUpvote: number; // default: 2
  thresholdStarter: number; // default: 50
  thresholdContributor: number; // default: 200
  thresholdChampion: number; // default: 500
  thresholdLeader: number; // default: 1000
}

export interface CitizenCivicProfile {
  id: string;
  userId: string;
  districtId: string;
  municipalCorporationId?: string;
  displayName: string;
  civicScore: number;
  verifiedReportsCount: number;
  verifiedResolutionsCount: number;
  helpfulEvidenceCount: number;
  badgeLevel: CivicBadgeLevel;
  isFlagged: boolean;
  flagReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CivicContribution {
  id: string;
  citizenProfileId: string;
  userId: string;
  districtId: string;
  complaintId?: string;
  contributionType: CivicContributionType;
  points: number;
  description: string;
  verificationStatus: 'verified' | 'pending' | 'rejected';
  createdAt: string;
}

export interface DistrictLeaderboardEntry {
  rank: number;
  profileId: string;
  userId: string;
  displayName: string;
  districtId: string;
  municipalCorporationId?: string;
  civicScore: number;
  verifiedReportsCount: number;
  verifiedResolutionsCount: number;
  helpfulEvidenceCount: number;
  badgeLevel: CivicBadgeLevel;
  badgeLabel: string;
  isCurrentUser?: boolean;
}

export interface DistrictRecognitionCycle {
  id: string;
  districtId: string;
  districtName: string;
  eventName: string; // e.g. "Republic Day Civic Champions 2027" or "Independence Day Civic Champions 2027"
  eventDate: string; // YYYY-MM-DD
  eligibleRankLimit: number; // e.g. Top 10
  rewardType: string; // e.g. "District Collector Citation & Official Civic Recognition"
  status: 'proposed' | 'approved' | 'announced';
  announcedAt?: string;
}

export interface DistrictEngagementStats {
  districtId: string;
  districtName: string;
  division: string;
  activeCitizensCount: number;
  verifiedContributorsCount: number;
  totalCivicScore: number;
  reportsSubmitted: number;
  reportsVerified: number;
  duplicateReportsCount: number;
  invalidReportsCount: number;
  resolutionVerificationsCount: number;
  topChampionName?: string;
  topChampionScore?: number;
}
