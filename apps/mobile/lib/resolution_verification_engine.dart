import 'comprehensive_report_models.dart';

/// Decision-support classification for civic resolution verification
enum ResolutionVerificationClassification {
  /// Score >= 80: High confidence supported by before/after evidence and citizen feedback
  strongResolutionEvidence,

  /// Score 60 - 79: Likely resolved with moderate evidence support
  likelyResolved,

  /// Score 40 - 59: Resolution requires officer review (partial evidence or conflicting feedback)
  needsReview,

  /// Score < 40: Insufficient evidence to confirm issue remediation
  insufficientEvidence,
}

extension ResolutionVerificationClassificationExtension on ResolutionVerificationClassification {
  String get displayName {
    switch (this) {
      case ResolutionVerificationClassification.strongResolutionEvidence:
        return 'STRONG RESOLUTION EVIDENCE';
      case ResolutionVerificationClassification.likelyResolved:
        return 'LIKELY RESOLVED';
      case ResolutionVerificationClassification.needsReview:
        return 'NEEDS OFFICER REVIEW';
      case ResolutionVerificationClassification.insufficientEvidence:
        return 'INSUFFICIENT EVIDENCE';
    }
  }

  String get shortLabel {
    switch (this) {
      case ResolutionVerificationClassification.strongResolutionEvidence:
        return 'Strong Evidence';
      case ResolutionVerificationClassification.likelyResolved:
        return 'Likely Resolved';
      case ResolutionVerificationClassification.needsReview:
        return 'Needs Review';
      case ResolutionVerificationClassification.insufficientEvidence:
        return 'Insufficient Evidence';
    }
  }

  /// Citizen-safe summary label (transparent and non-alarming)
  String get citizenSafeLabel {
    switch (this) {
      case ResolutionVerificationClassification.strongResolutionEvidence:
        return 'Resolution evidence supports that the issue has been addressed';
      case ResolutionVerificationClassification.likelyResolved:
        return 'Work reported completed; verification in progress';
      case ResolutionVerificationClassification.needsReview:
      case ResolutionVerificationClassification.insufficientEvidence:
        return 'Additional verification may be required by municipal team';
    }
  }
}

/// Sentiment evaluation of citizen feedback
enum FeedbackSentiment {
  positive,
  neutral,
  negative,
  none,
}

/// Structured result of civic resolution verification analysis
class ResolutionVerificationResult {
  final double verificationScore; // 0.0 - 100.0
  final ResolutionVerificationClassification classification;
  final bool hasBeforeEvidence;
  final bool hasAfterEvidence;
  final String evidenceAvailability;
  final int beforeEvidenceCount;
  final int afterEvidenceCount;
  final int? citizenRating;
  final String? citizenFeedbackText;
  final FeedbackSentiment feedbackSentiment;
  final String improvementAssessment;
  final bool needsHumanVerification;
  final List<String> explainableReasons;
  final Map<String, double> signalBreakdown;

  const ResolutionVerificationResult({
    required this.verificationScore,
    required this.classification,
    required this.hasBeforeEvidence,
    required this.hasAfterEvidence,
    required this.evidenceAvailability,
    required this.beforeEvidenceCount,
    required this.afterEvidenceCount,
    this.citizenRating,
    this.citizenFeedbackText,
    required this.feedbackSentiment,
    required this.improvementAssessment,
    required this.needsHumanVerification,
    required this.explainableReasons,
    required this.signalBreakdown,
  });

  /// Formatted score string (e.g. "86/100")
  String get scoreDisplay => '${verificationScore.round()}/100';

  /// Top 2-3 explainable summary reasons
  List<String> get topReasons => explainableReasons.take(3).toList();

  Map<String, dynamic> toJson() {
    return {
      'verification_score': double.parse(verificationScore.toStringAsFixed(1)),
      'classification': classification.name,
      'has_before_evidence': hasBeforeEvidence,
      'has_after_evidence': hasAfterEvidence,
      'evidence_availability': evidenceAvailability,
      'before_evidence_count': beforeEvidenceCount,
      'after_evidence_count': afterEvidenceCount,
      'citizen_rating': citizenRating,
      'citizen_feedback': citizenFeedbackText,
      'feedback_sentiment': feedbackSentiment.name,
      'improvement_assessment': improvementAssessment,
      'needs_human_verification': needsHumanVerification,
      'reasons': explainableReasons,
      'signal_breakdown': signalBreakdown,
    };
  }
}

/// Enterprise Resolution Verification & Evidence Intelligence Engine
class ResolutionVerificationEngine {
  // Decision-support signal weights (Sum = 1.0)
  static const double weightProblemDisappearance = 0.35;
  static const double weightEvidenceCompleteness = 0.25;
  static const double weightBeforeAfterConsistency = 0.20;
  static const double weightLocationContext = 0.10;
  static const double weightCitizenFeedback = 0.10;

  // Thresholds for classification
  static const double thresholdStrong = 80.0;
  static const double thresholdLikely = 60.0;
  static const double thresholdReview = 40.0;

  // Negative feedback indicator keywords
  static const Set<String> _negativeKeywords = {
    'not fixed', 'still broken', 'unresolved', 'worse', 'fake', 'poor', 'bad',
    'not done', 'incomplete', 'still leaking', 'same issue', 'terrible',
    'useless', 'reopen', 'not resolved', 'not working', 'unhappy'
  };

  // Positive feedback indicator keywords
  static const Set<String> _positiveKeywords = {
    'fixed', 'resolved', 'great', 'thank', 'thanks', 'good job', 'clean',
    'repaired', 'excellent', 'fast', 'satisfied', 'cleared', 'appreciated', 'working fine'
  };

  /// Evaluate citizen feedback text and numerical rating
  static FeedbackSentiment evaluateFeedbackSentiment(int? rating, String? feedbackText) {
    if (rating == null && (feedbackText == null || feedbackText.trim().isEmpty)) {
      return FeedbackSentiment.none;
    }

    final text = feedbackText?.toLowerCase().trim() ?? '';

    // Check explicit negative keywords first
    for (final kw in _negativeKeywords) {
      if (text.contains(kw)) return FeedbackSentiment.negative;
    }

    if (rating != null && rating <= 2) {
      return FeedbackSentiment.negative;
    }

    // Check positive keywords
    for (final kw in _positiveKeywords) {
      if (text.contains(kw)) return FeedbackSentiment.positive;
    }

    if (rating != null && rating >= 4) {
      return FeedbackSentiment.positive;
    }

    return FeedbackSentiment.neutral;
  }

  /// Primary entry point: Perform resolution evidence verification
  static ResolutionVerificationResult evaluateResolution({
    required String reportId,
    required String category,
    required String title,
    required String description,
    List<String>? beforeImageUrls,
    List<String>? afterImageUrls,
    dynamic status,
    int? citizenRating,
    String? citizenFeedback,
    String? adminNotes,
    DateTime? completionDate,
    bool? isProblemResolvedVisual, // Vision / AI assessment signal
    double? aiConfidence,
  }) {
    final beforeList = beforeImageUrls?.where((url) => url.trim().isNotEmpty).toList() ?? [];
    final afterList = afterImageUrls?.where((url) => url.trim().isNotEmpty).toList() ?? [];

    final bool hasBefore = beforeList.isNotEmpty;
    final bool hasAfter = afterList.isNotEmpty;

    String evidenceAvailability;
    if (hasBefore && hasAfter) {
      evidenceAvailability = 'Full Evidence (Before & After)';
    } else if (hasBefore && !hasAfter) {
      evidenceAvailability = 'Partial Evidence (Before Only)';
    } else if (!hasBefore && hasAfter) {
      evidenceAvailability = 'Partial Evidence (After Only)';
    } else {
      evidenceAvailability = 'No Visual Evidence';
    }

    final sentiment = evaluateFeedbackSentiment(citizenRating, citizenFeedback);

    // 1. Evidence Completeness Score (25% weight)
    double evidenceCompletenessScore = 0.0;
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
    double problemDisappearanceScore = 50.0; // Default neutral baseline
    if (isProblemResolvedVisual != null) {
      if (isProblemResolvedVisual == true) {
        problemDisappearanceScore = aiConfidence != null ? (aiConfidence * 100.0).clamp(70.0, 100.0) : 95.0;
      } else {
        // Visual evidence indicates problem remains visible
        problemDisappearanceScore = 20.0;
      }
    } else if (hasBefore && hasAfter) {
      // Deterministic fallback when AI vision is not invoked: Both sets provided
      final notesLower = adminNotes?.toLowerCase() ?? '';
      final hasCompletedNote = notesLower.contains('repaired') ||
          notesLower.contains('fixed') ||
          notesLower.contains('resolved') ||
          notesLower.contains('completed') ||
          notesLower.contains('cleared');
      problemDisappearanceScore = hasCompletedNote ? 85.0 : 75.0;
    } else if (hasAfter && !hasBefore) {
      problemDisappearanceScore = 65.0;
    } else if (hasBefore && !hasAfter) {
      problemDisappearanceScore = 25.0;
    } else {
      problemDisappearanceScore = 30.0;
    }

    // 3. Before/After Context Consistency Score (20% weight)
    double consistencyScore = 50.0;
    if (hasBefore && hasAfter) {
      consistencyScore = 90.0;
    } else if (hasBefore || hasAfter) {
      consistencyScore = 60.0;
    } else {
      consistencyScore = 30.0;
    }

    // 4. Location / Admin Context Consistency Score (10% weight)
    double locationContextScore = 50.0;
    if (adminNotes != null && adminNotes.trim().isNotEmpty) {
      locationContextScore = 80.0;
    }
    if (completionDate != null) {
      locationContextScore = 90.0;
    }

    // 5. Citizen Feedback Score (10% weight)
    double feedbackScore = 50.0; // Neutral baseline when no feedback
    switch (sentiment) {
      case FeedbackSentiment.positive:
        if (citizenRating == 5) {
          feedbackScore = 100.0;
        } else if (citizenRating == 4) {
          feedbackScore = 85.0;
        } else {
          feedbackScore = 80.0;
        }
        break;
      case FeedbackSentiment.neutral:
        feedbackScore = 50.0;
        break;
      case FeedbackSentiment.negative:
        feedbackScore = 10.0;
        break;
      case FeedbackSentiment.none:
        feedbackScore = 50.0;
        break;
    }

    // Composite Continuous Verification Score (0 - 100)
    double verificationScore = (problemDisappearanceScore * weightProblemDisappearance) +
        (evidenceCompletenessScore * weightEvidenceCompleteness) +
        (consistencyScore * weightBeforeAfterConsistency) +
        (locationContextScore * weightLocationContext) +
        (feedbackScore * weightCitizenFeedback);

    // Penalty if negative feedback exists
    if (sentiment == FeedbackSentiment.negative) {
      verificationScore = verificationScore * 0.70;
    }

    // Penalty if no after evidence is provided
    if (!hasAfter) {
      verificationScore = verificationScore * 0.65;
    }

    verificationScore = verificationScore.clamp(0.0, 100.0);

    // Classification Mapping
    ResolutionVerificationClassification classification;
    if (verificationScore >= thresholdStrong) {
      classification = ResolutionVerificationClassification.strongResolutionEvidence;
    } else if (verificationScore >= thresholdLikely) {
      classification = ResolutionVerificationClassification.likelyResolved;
    } else if (verificationScore >= thresholdReview) {
      classification = ResolutionVerificationClassification.needsReview;
    } else {
      classification = ResolutionVerificationClassification.insufficientEvidence;
    }

    // Human verification flag (true if confidence is not strong or citizen is dissatisfied)
    final bool needsHumanVerification = verificationScore < thresholdStrong ||
        sentiment == FeedbackSentiment.negative ||
        !hasAfter ||
        (isProblemResolvedVisual == false);

    // Explainable Improvement Assessment
    String assessment;
    if (isProblemResolvedVisual == false) {
      assessment = 'Evidence indicates reported $category issue may still be present';
    } else if (hasBefore && hasAfter && verificationScore >= thresholdStrong) {
      assessment = 'Before and after visual evidence supports successful remediation of $category issue';
    } else if (hasAfter && !hasBefore) {
      assessment = 'After-repair evidence provided; before evidence was not attached';
    } else if (!hasAfter) {
      assessment = 'Awaiting after-repair photographic evidence from field team';
    } else {
      assessment = 'Resolution evidence is pending further administrative verification';
    }

    // Explainable Reasons
    final List<String> reasons = [];

    if (hasBefore && hasAfter) {
      reasons.add('Both before (${beforeList.length}) and after (${afterList.length}) photos available');
    } else if (hasAfter && !hasBefore) {
      reasons.add('After-repair evidence submitted (${afterList.length} photos)');
    } else if (hasBefore && !hasAfter) {
      reasons.add('Only initial complaint photo available; after evidence missing');
    } else {
      reasons.add('No visual before/after evidence attached');
    }

    if (isProblemResolvedVisual == true) {
      reasons.add('Visual analysis confirms reported problem is no longer visible');
    } else if (isProblemResolvedVisual == false) {
      reasons.add('Visual evidence indicates reported hazard or damage may persist');
    }

    switch (sentiment) {
      case FeedbackSentiment.positive:
        reasons.add('Citizen submitted positive feedback (${citizenRating ?? 5}★)');
        break;
      case FeedbackSentiment.negative:
        reasons.add('Citizen reported dissatisfaction (${citizenRating ?? 1}★) - verification flagged');
        break;
      case FeedbackSentiment.neutral:
        reasons.add('Citizen submitted neutral feedback (${citizenRating ?? 3}★)');
        break;
      case FeedbackSentiment.none:
        reasons.add('Citizen feedback not yet submitted (neutral baseline)');
        break;
    }

    if (adminNotes != null && adminNotes.trim().isNotEmpty) {
      reasons.add('Officer resolution notes recorded in system');
    }

    if (needsHumanVerification) {
      reasons.add('Municipal officer sign-off recommended before final closure');
    }

    return ResolutionVerificationResult(
      verificationScore: verificationScore,
      classification: classification,
      hasBeforeEvidence: hasBefore,
      hasAfterEvidence: hasAfter,
      evidenceAvailability: evidenceAvailability,
      beforeEvidenceCount: beforeList.length,
      afterEvidenceCount: afterList.length,
      citizenRating: citizenRating,
      citizenFeedbackText: citizenFeedback,
      feedbackSentiment: sentiment,
      improvementAssessment: assessment,
      needsHumanVerification: needsHumanVerification,
      explainableReasons: reasons,
      signalBreakdown: {
        'problem_disappearance': problemDisappearanceScore,
        'evidence_completeness': evidenceCompletenessScore,
        'consistency': consistencyScore,
        'location_context': locationContextScore,
        'citizen_feedback': feedbackScore,
      },
    );
  }

  /// Helper evaluating directly from `ComprehensiveReportModel`
  static ResolutionVerificationResult evaluateReport(
    ComprehensiveReportModel report, {
    List<String>? afterImageUrls,
    bool? isProblemResolvedVisual,
    double? aiConfidence,
  }) {
    return evaluateResolution(
      reportId: report.id,
      category: report.category,
      title: report.title,
      description: report.description,
      beforeImageUrls: report.imageUrls,
      afterImageUrls: afterImageUrls,
      status: report.status,
      citizenRating: report.rating,
      citizenFeedback: report.citizenFeedback,
      adminNotes: report.adminNotes,
      completionDate: report.completionDate,
      isProblemResolvedVisual: isProblemResolvedVisual,
      aiConfidence: aiConfidence,
    );
  }
}
