/**
 * CIVICRESOLVE — Citizen Feedback & Resolution Integrity Types
 * 
 * Defines canonical data contracts for post-resolution citizen feedback,
 * deterministic heuristics integrity signals, human-in-the-loop review queues,
 * and operational resolution feedback metrics.
 */

import { ReopenReason } from './evidence';

export type IntegrityFlagType =
  | 'HIGH_VOLUME_BURST'
  | 'RAPID_SUBMISSION_BURST'
  | 'EXTREME_RATING_PATTERN'
  | 'CONTRADICTION_ANOMALY'
  | 'SUSPICIOUS_FREQUENCY';

export type IntegrityRiskLevel = 'low' | 'medium' | 'high' | 'elevated';

export type IntegrityFlagStatus = 'open' | 'under_review' | 'dismissed' | 'confirmed';

export interface ResolutionFeedback {
  id: string;
  complaintId: string;
  resolutionAttemptId?: string;
  userId: string;
  rating: number; // 1 to 5
  satisfied: boolean;
  comment?: string;
  reopenReason?: ReopenReason;
  verificationPhotoUrl?: string;
  districtId: string;
  organizationId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackIntegrityFlag {
  id: string;
  feedbackId: string;
  complaintId: string;
  userId: string;
  districtId: string;
  flagType: IntegrityFlagType;
  riskScore: number; // 0 to 100
  riskLevel: IntegrityRiskLevel;
  reasons: string[];
  status: IntegrityFlagStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrityEvaluationResult {
  hasFlag: boolean;
  flagType?: IntegrityFlagType;
  riskScore: number;
  riskLevel: IntegrityRiskLevel;
  reasons: string[];
  explanation: string;
}

export interface ResolutionFeedbackMetrics {
  totalFeedbacks: number;
  averageRating: number;
  resolvedPercentage: number;
  reopenCount: number;
  reopenRate: number;
  pendingIntegrityReviews: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

export interface SubmitFeedbackParams {
  complaintId: string;
  resolutionAttemptId?: string;
  userId: string;
  rating: number; // 1 to 5
  satisfied: boolean;
  comment?: string;
  reopenReason?: ReopenReason;
  verificationPhotoUrl?: string;
  districtId: string;
  organizationId?: string;
  timeSinceResolutionSeconds?: number;
  aiSimilarityScore?: number;
  locationWithinTolerance?: boolean;
}

export interface ReviewFlagParams {
  flagId: string;
  reviewerId: string;
  reviewerRole: 'officer' | 'dept_admin' | 'municipal_admin' | 'state_admin' | 'super_admin';
  decision: 'dismissed' | 'confirmed' | 'under_review';
  reviewNotes: string;
}
