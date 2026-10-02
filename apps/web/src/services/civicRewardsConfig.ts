import { CivicRewardsConfig, CivicBadgeLevel } from '../types/civicRewards';

export interface CivicPointCategoryRule {
  id: string;
  contributionType: string;
  title: string;
  points: number;
  sampleCode: string;
  status: string;
  description: string;
  iconName: 'check' | 'map-pin' | 'camera' | 'shield-check';
}

/**
 * Official Civic Point Categories:
 * Restricted strictly to the 4 verified categories established in the system framework.
 */
export const OFFICIAL_CIVIC_POINT_CATEGORIES: CivicPointCategoryRule[] = [
  {
    id: 'verified_civic_grievance',
    contributionType: 'verified_report',
    title: 'Verified Civic Grievance',
    points: 10,
    sampleCode: 'CR-SOL-103',
    status: 'VERIFIED',
    description: 'Verified genuine report on commercial waste encroachment, potholes, or civic issues',
    iconName: 'check',
  },
  {
    id: 'precise_gis_audit',
    contributionType: 'accurate_location',
    title: 'Precise GIS Coordinate Audit',
    points: 5,
    sampleCode: 'CR-SOL-103',
    status: 'VERIFIED',
    description: 'High accuracy GPS coordinate verification (within 10m)',
    iconName: 'map-pin',
  },
  {
    id: 'geotagged_photographic_proof',
    contributionType: 'useful_evidence',
    title: 'Geotagged Photographic Proof',
    points: 5,
    sampleCode: 'CR-SOL-103',
    status: 'VERIFIED',
    description: 'Clear photographic evidence of blocked pedestrian path or verified grievance',
    iconName: 'camera',
  },
  {
    id: 'onsite_resolution_verification',
    contributionType: 'resolution_verification',
    title: 'On-Site Resolution Verification',
    points: 10,
    sampleCode: 'CR-SOL-105',
    status: 'VERIFIED',
    description: 'Verified successful on-site slab replacement, repair, & safety fencing confirmation',
    iconName: 'shield-check',
  },
];

export const DEFAULT_CIVIC_REWARDS_CONFIG: CivicRewardsConfig = {
  pointsValidReport: 10,
  pointsAccurateGps: 5,
  pointsUsefulEvidence: 5,
  pointsCriticalBonus: 0,
  pointsResolutionVerification: 10,
  pointsResolutionUpvote: 0,
  thresholdStarter: 50,
  thresholdContributor: 200,
  thresholdChampion: 500,
  thresholdLeader: 1000,
};

export const CIVIC_BADGE_DETAILS: Record<
  CivicBadgeLevel,
  { label: string; icon: string; minScore: number; colorClass: string; bgClass: string; borderClass: string }
> = {
  starter: {
    label: 'Civic Starter',
    icon: '🌱',
    minScore: 50,
    colorClass: 'text-emerald-700',
    bgClass: 'bg-emerald-50',
    borderClass: 'border-emerald-200',
  },
  contributor: {
    label: 'Civic Contributor',
    icon: '🟢',
    minScore: 200,
    colorClass: 'text-teal-700',
    bgClass: 'bg-teal-50',
    borderClass: 'border-teal-200',
  },
  champion: {
    label: 'Civic Champion',
    icon: '🔵',
    minScore: 500,
    colorClass: 'text-blue-700',
    bgClass: 'bg-blue-50',
    borderClass: 'border-blue-200',
  },
  leader: {
    label: 'Civic Leader',
    icon: '🟣',
    minScore: 1000,
    colorClass: 'text-purple-700',
    bgClass: 'bg-purple-50',
    borderClass: 'border-purple-200',
  },
};

/**
 * Calculates the appropriate badge level based on verified Civic Score.
 */
export function getBadgeLevelForScore(score: number, config: CivicRewardsConfig = DEFAULT_CIVIC_REWARDS_CONFIG): CivicBadgeLevel {
  if (score >= config.thresholdLeader) return 'leader';
  if (score >= config.thresholdChampion) return 'champion';
  if (score >= config.thresholdContributor) return 'contributor';
  return 'starter';
}

/**
 * Calculates progress and remaining points towards next level.
 */
export function getNextLevelProgress(score: number, config: CivicRewardsConfig = DEFAULT_CIVIC_REWARDS_CONFIG) {
  const currentLevel = getBadgeLevelForScore(score, config);
  let nextLevel: CivicBadgeLevel | null = null;
  let targetScore = config.thresholdStarter;
  let prevThreshold = 0;

  if (currentLevel === 'starter') {
    if (score < config.thresholdStarter) {
      nextLevel = 'starter';
      targetScore = config.thresholdStarter;
      prevThreshold = 0;
    } else {
      nextLevel = 'contributor';
      targetScore = config.thresholdContributor;
      prevThreshold = config.thresholdStarter;
    }
  } else if (currentLevel === 'contributor') {
    nextLevel = 'champion';
    targetScore = config.thresholdChampion;
    prevThreshold = config.thresholdContributor;
  } else if (currentLevel === 'champion') {
    nextLevel = 'leader';
    targetScore = config.thresholdLeader;
    prevThreshold = config.thresholdChampion;
  } else {
    // Max level achieved
    return {
      currentLevel,
      nextLevel: null,
      targetScore: config.thresholdLeader,
      progressPct: 100,
      pointsNeeded: 0,
    };
  }

  const range = targetScore - prevThreshold;
  const progressInLevel = Math.max(0, score - prevThreshold);
  const progressPct = Math.min(100, Math.round((progressInLevel / (range || 1)) * 100));
  const pointsNeeded = Math.max(0, targetScore - score);

  return {
    currentLevel,
    nextLevel,
    targetScore,
    progressPct,
    pointsNeeded,
  };
}

/**
 * Privacy-preserving formatter for citizen display names on public leaderboards.
 * Converts "Ishant Gangawane" -> "Ishant G." or preserves existing aliases.
 */
export function formatCitizenDisplayName(fullName?: string): string {
  if (!fullName) return 'Verified Citizen';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  const firstName = parts[0];
  const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
  return `${firstName} ${lastInitial}.`;
}

/**
 * Deterministic Leaderboard Tie-Breaker:
 * 1. Higher Civic Score
 * 2. Higher Number of Verified Reports
 * 3. Higher Number of Verified Resolutions
 * 4. Earlier Creation Timestamp
 */
export function compareLeaderboardEntries(
  a: { civicScore: number; verifiedReportsCount: number; verifiedResolutionsCount: number; createdAt?: string },
  b: { civicScore: number; verifiedReportsCount: number; verifiedResolutionsCount: number; createdAt?: string }
): number {
  if (b.civicScore !== a.civicScore) {
    return b.civicScore - a.civicScore;
  }
  if (b.verifiedReportsCount !== a.verifiedReportsCount) {
    return b.verifiedReportsCount - a.verifiedReportsCount;
  }
  if (b.verifiedResolutionsCount !== a.verifiedResolutionsCount) {
    return b.verifiedResolutionsCount - a.verifiedResolutionsCount;
  }
  const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
  const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
  return timeA - timeB;
}
