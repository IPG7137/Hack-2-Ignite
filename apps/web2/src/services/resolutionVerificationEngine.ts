import { Complaint } from '../types/complaint';

export type ResolutionVerificationClassification =
  | 'strongResolutionEvidence'
  | 'likelyResolved'
  | 'needsReview'
  | 'insufficientEvidence';

export type FeedbackSentiment = 'positive' | 'neutral' | 'negative' | 'none';

export interface ResolutionSignalBreakdown {
  problemDisappearance: number;
  evidenceCompleteness: number;
  consistency: number;
  locationContext: number;
  citizenFeedback: number;
}

export interface ResolutionVerificationResult {
  verificationScore: number; // 0.0 - 100.0
  scoreDisplay: string; // e.g. "86/100"
  classification: ResolutionVerificationClassification;
  levelLabel: string;
  shortLabel: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  badgeColor: string;
  hasBeforeEvidence: boolean;
  hasAfterEvidence: boolean;
  evidenceAvailability: string;
  beforeEvidenceCount: number;
  afterEvidenceCount: number;
  citizenRating?: number;
  citizenFeedbackText?: string;
  feedbackSentiment: FeedbackSentiment;
  improvementAssessment: string;
  needsHumanVerification: boolean;
  explainableReasons: string[];
  topReasons: string[];
  signalBreakdown: ResolutionSignalBreakdown;
}

export class ResolutionVerificationEngine {
  // Decision-support signal weights (Sum = 1.0)
  public static readonly weightProblemDisappearance = 0.35;
  public static readonly weightEvidenceCompleteness = 0.25;
  public static readonly weightBeforeAfterConsistency = 0.20;
  public static readonly weightLocationContext = 0.10;
  public static readonly weightCitizenFeedback = 0.10;

  // Thresholds for classification
  public static readonly thresholdStrong = 80.0;
  public static readonly thresholdLikely = 60.0;
  public static readonly thresholdReview = 40.0;

  // Negative feedback indicator keywords
  private static readonly negativeKeywords = new Set<string>([
    'not fixed', 'still broken', 'unresolved', 'worse', 'fake', 'poor', 'bad',
    'not done', 'incomplete', 'still leaking', 'same issue', 'terrible',
    'useless', 'reopen', 'not resolved', 'not working', 'unhappy', 'fraud'
  ]);

  // Positive feedback indicator keywords
  private static readonly positiveKeywords = new Set<string>([
    'fixed', 'resolved', 'great', 'thank', 'thanks', 'good job', 'clean',
    'repaired', 'excellent', 'fast', 'satisfied', 'cleared', 'appreciated', 'working fine'
  ]);

  /**
   * Evaluate sentiment of citizen feedback text and numerical rating
   */
  public static evaluateFeedbackSentiment(
    rating?: number | null,
    feedbackText?: string | null
  ): FeedbackSentiment {
    if ((rating === undefined || rating === null) && (!feedbackText || feedbackText.trim() === '')) {
      return 'none';
    }

    const text = feedbackText ? feedbackText.toLowerCase().trim() : '';

    // Check explicit negative keywords first
    for (const kw of this.negativeKeywords) {
      if (text.includes(kw)) return 'negative';
    }

    if (rating !== undefined && rating !== null && rating <= 2) {
      return 'negative';
    }

    // Check positive keywords
    for (const kw of this.positiveKeywords) {
      if (text.includes(kw)) return 'positive';
    }

    if (rating !== undefined && rating !== null && rating >= 4) {
      return 'positive';
    }

    return 'neutral';
  }

  /**
   * Primary evaluation function: Verify complaint resolution evidence
   */
  public static evaluateComplaintResolution(
    complaint: Complaint,
    options?: {
      isProblemResolvedVisual?: boolean;
      aiConfidence?: number;
    }
  ): ResolutionVerificationResult {
    const beforeList = complaint.evidence?.before?.filter((url) => url && url.trim().length > 0) || [];
    const afterList = complaint.evidence?.after?.filter((url) => url && url.trim().length > 0) || [];

    const hasBefore = beforeList.length > 0;
    const hasAfter = afterList.length > 0;

    let evidenceAvailability: string;
    if (hasBefore && hasAfter) {
      evidenceAvailability = 'Full Evidence (Before & After)';
    } else if (hasBefore && !hasAfter) {
      evidenceAvailability = 'Partial Evidence (Before Only)';
    } else if (!hasBefore && hasAfter) {
      evidenceAvailability = 'Partial Evidence (After Only)';
    } else {
      evidenceAvailability = 'No Visual Evidence';
    }

    const rating = complaint.citizenFeedback?.rating;
    const feedbackText = complaint.citizenFeedback?.comment;
    const sentiment = this.evaluateFeedbackSentiment(rating, feedbackText);

    // 1. Evidence Completeness Score (25% weight)
    let evidenceCompletenessScore = 0.0;
    if (hasBefore && hasAfter) {
      evidenceCompletenessScore = 100.0;
    } else if (hasAfter && !hasBefore) {
      evidenceCompletenessScore = 55.0;
    } else if (hasBefore && !hasAfter) {
      evidenceCompletenessScore = 35.0;
    } else {
      evidenceCompletenessScore = 15.0;
    }

    // 2. Problem Disappearance / Remediation Score (35% weight)
    let problemDisappearanceScore = 50.0;
    if (options?.isProblemResolvedVisual !== undefined) {
      if (options.isProblemResolvedVisual === true) {
        problemDisappearanceScore = options.aiConfidence !== undefined
          ? Math.min(100.0, Math.max(70.0, options.aiConfidence * 100.0))
          : 95.0;
      } else {
        problemDisappearanceScore = 20.0;
      }
    } else if (hasBefore && hasAfter) {
      const notesCombined = complaint.adminNotes.map((n) => n.text).join(' ').toLowerCase();
      const hasCompletedNote =
        notesCombined.includes('repaired') ||
        notesCombined.includes('fixed') ||
        notesCombined.includes('resolved') ||
        notesCombined.includes('completed') ||
        notesCombined.includes('cleared');
      problemDisappearanceScore = hasCompletedNote ? 85.0 : 75.0;
    } else if (hasAfter && !hasBefore) {
      problemDisappearanceScore = 65.0;
    } else if (hasBefore && !hasAfter) {
      problemDisappearanceScore = 25.0;
    } else {
      problemDisappearanceScore = 30.0;
    }

    // 3. Before/After Context Consistency Score (20% weight)
    let consistencyScore = 50.0;
    if (hasBefore && hasAfter) {
      consistencyScore = 90.0;
    } else if (hasBefore || hasAfter) {
      consistencyScore = 60.0;
    } else {
      consistencyScore = 30.0;
    }

    // 4. Location / Admin Context Consistency Score (10% weight)
    let locationContextScore = 50.0;
    if (complaint.adminNotes && complaint.adminNotes.length > 0) {
      locationContextScore = 80.0;
    }
    if (complaint.resolvedAt || complaint.closedAt) {
      locationContextScore = 90.0;
    }

    // 5. Citizen Feedback Score (10% weight)
    let feedbackScore = 50.0;
    switch (sentiment) {
      case 'positive':
        if (rating === 5) {
          feedbackScore = 100.0;
        } else if (rating === 4) {
          feedbackScore = 85.0;
        } else {
          feedbackScore = 80.0;
        }
        break;
      case 'neutral':
        feedbackScore = 50.0;
        break;
      case 'negative':
        feedbackScore = 10.0;
        break;
      case 'none':
        feedbackScore = 50.0;
        break;
    }

    // Composite Continuous Verification Score (0 - 100)
    let rawScore =
      problemDisappearanceScore * this.weightProblemDisappearance +
      evidenceCompletenessScore * this.weightEvidenceCompleteness +
      consistencyScore * this.weightBeforeAfterConsistency +
      locationContextScore * this.weightLocationContext +
      feedbackScore * this.weightCitizenFeedback;

    // Penalty if negative feedback exists
    if (sentiment === 'negative') {
      rawScore = rawScore * 0.70;
    }

    // Penalty if no after evidence is provided
    if (!hasAfter) {
      rawScore = rawScore * 0.65;
    }

    const verificationScore = Math.min(100.0, Math.max(0.0, rawScore));

    // Classification
    let classification: ResolutionVerificationClassification;
    let levelLabel = '';
    let shortLabel = '';
    let badgeBg = '';
    let badgeBorder = '';
    let badgeText = '';
    let badgeColor = '';

    if (verificationScore >= this.thresholdStrong) {
      classification = 'strongResolutionEvidence';
      levelLabel = 'Strong Resolution Evidence';
      shortLabel = 'Strong Evidence';
      badgeBg = 'bg-emerald-50';
      badgeBorder = 'border-emerald-200';
      badgeText = 'text-emerald-800';
      badgeColor = '#16803C';
    } else if (verificationScore >= this.thresholdLikely) {
      classification = 'likelyResolved';
      levelLabel = 'Likely Resolved';
      shortLabel = 'Likely Resolved';
      badgeBg = 'bg-blue-50';
      badgeBorder = 'border-blue-200';
      badgeText = 'text-blue-800';
      badgeColor = '#1769D2';
    } else if (verificationScore >= this.thresholdReview) {
      classification = 'needsReview';
      levelLabel = 'Needs Officer Review';
      shortLabel = 'Needs Review';
      badgeBg = 'bg-amber-50';
      badgeBorder = 'border-amber-200';
      badgeText = 'text-amber-800';
      badgeColor = '#D99A00';
    } else {
      classification = 'insufficientEvidence';
      levelLabel = 'Insufficient Evidence';
      shortLabel = 'Insufficient Evidence';
      badgeBg = 'bg-red-50';
      badgeBorder = 'border-red-200';
      badgeText = 'text-red-700';
      badgeColor = '#D92D20';
    }

    // Human verification flag
    const needsHumanVerification =
      verificationScore < this.thresholdStrong ||
      sentiment === 'negative' ||
      !hasAfter ||
      options?.isProblemResolvedVisual === false;

    // Improvement Assessment
    let assessment: string;
    if (options?.isProblemResolvedVisual === false) {
      assessment = `Evidence indicates reported ${complaint.categoryLabel} issue may still be present`;
    } else if (hasBefore && hasAfter && verificationScore >= this.thresholdStrong) {
      assessment = `Before and after visual evidence supports successful remediation of ${complaint.categoryLabel} issue`;
    } else if (hasAfter && !hasBefore) {
      assessment = 'After-repair evidence provided; before evidence was not attached';
    } else if (!hasAfter) {
      assessment = 'Awaiting after-repair photographic evidence from field team';
    } else {
      assessment = 'Resolution evidence is pending further administrative verification';
    }

    // Explainable Reasons
    const reasons: string[] = [];

    if (hasBefore && hasAfter) {
      reasons.push(`Both before (${beforeList.length}) and after (${afterList.length}) photos available`);
    } else if (hasAfter && !hasBefore) {
      reasons.push(`After-repair evidence submitted (${afterList.length} photos)`);
    } else if (hasBefore && !hasAfter) {
      reasons.push('Only initial complaint photo available; after evidence missing');
    } else {
      reasons.push('No visual before/after evidence attached');
    }

    if (options?.isProblemResolvedVisual === true) {
      reasons.push('Visual analysis confirms reported problem is no longer visible');
    } else if (options?.isProblemResolvedVisual === false) {
      reasons.push('Visual evidence indicates reported hazard or damage may persist');
    }

    switch (sentiment) {
      case 'positive':
        reasons.push(`Citizen submitted positive feedback (${rating ?? 5}★)`);
        break;
      case 'negative':
        reasons.push(`Citizen reported dissatisfaction (${rating ?? 1}★) - verification flagged`);
        break;
      case 'neutral':
        reasons.push(`Citizen submitted neutral feedback (${rating ?? 3}★)`);
        break;
      case 'none':
        reasons.push('Citizen feedback not yet submitted (neutral baseline)');
        break;
    }

    if (complaint.adminNotes && complaint.adminNotes.length > 0) {
      reasons.push('Officer resolution notes recorded in system');
    }

    if (needsHumanVerification) {
      reasons.push('Municipal officer sign-off recommended before final closure');
    }

    return {
      verificationScore,
      scoreDisplay: `${Math.round(verificationScore)}/100`,
      classification,
      levelLabel,
      shortLabel,
      badgeBg,
      badgeBorder,
      badgeText,
      badgeColor,
      hasBeforeEvidence: hasBefore,
      hasAfterEvidence: hasAfter,
      evidenceAvailability,
      beforeEvidenceCount: beforeList.length,
      afterEvidenceCount: afterList.length,
      citizenRating: rating,
      citizenFeedbackText: feedbackText,
      feedbackSentiment: sentiment,
      improvementAssessment: assessment,
      needsHumanVerification,
      explainableReasons: reasons,
      topReasons: reasons.slice(0, 3),
      signalBreakdown: {
        problemDisappearance: problemDisappearanceScore,
        evidenceCompleteness: evidenceCompletenessScore,
        consistency: consistencyScore,
        locationContext: locationContextScore,
        citizenFeedback: feedbackScore,
      },
    };
  }
}
