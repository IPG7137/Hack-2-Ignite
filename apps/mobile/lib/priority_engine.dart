import 'dart:math' as math;
import 'comprehensive_report_models.dart';

/// Comprehensive result of the explainable civic priority analysis
class CivicPriorityAnalysis {
  final double score; // 0.0 - 100.0
  final ReportPriority mappedPriority;
  final String levelLabel; // 'Critical', 'High', 'Medium', 'Low'
  final List<String> explainableReasons;
  final Map<String, double> signalBreakdown;

  const CivicPriorityAnalysis({
    required this.score,
    required this.mappedPriority,
    required this.levelLabel,
    required this.explainableReasons,
    required this.signalBreakdown,
  });

  /// Formatted score string (e.g. "78/100")
  String get scoreDisplay => '${score.round()}/100';

  /// Top 2-3 explainable summary reasons
  List<String> get topReasons => explainableReasons.take(3).toList();

  Map<String, dynamic> toJson() {
    return {
      'score': double.parse(score.toStringAsFixed(1)),
      'level': levelLabel,
      'mapped_priority': mappedPriority.value,
      'reasons': explainableReasons,
      'breakdown': signalBreakdown,
    };
  }
}

/// Enterprise Civic Smart Prioritization Engine
class CivicPriorityEngine {
  // Decision-support signal weights (Sum = 1.0)
  static const double weightSeverity = 0.30;
  static const double weightPublicSafety = 0.25;
  static const double weightRelatedComplaints = 0.20;
  static const double weightAge = 0.15;
  static const double weightCategory = 0.10;

  // Thresholds for priority level mapping
  static const double thresholdCritical = 80.0;
  static const double thresholdHigh = 60.0;
  static const double thresholdMedium = 35.0;

  /// High-risk keywords indicating immediate public hazard
  static const Set<String> _criticalHazardKeywords = {
    'manhole', 'open manhole', 'wire', 'live wire', 'transformer', 'sparking',
    'electric shock', 'collapse', 'collapsed', 'cave in', 'caved', 'fire',
    'smoke', 'gas leak', 'pipeline burst', 'major flood', 'deep crater',
    'accident', 'emergency', 'fallen tree', 'hanging wire'
  };

  /// Moderate-risk keywords indicating heightened safety concern
  static const Set<String> _moderateHazardKeywords = {
    'pothole', 'broken divider', 'dark street', 'blackout', 'streetlight dead',
    'waterlogging', 'sewage leak', 'garbage burning', 'blocked drain', 'slippery'
  };

  /// Calculate severity score (0 - 100) from AI triage or manual input
  static double calculateSeverityScore(String? severity) {
    if (severity == null || severity.trim().isEmpty) return 50.0; // Neutral baseline

    final s = severity.trim().toLowerCase();
    if (s.contains('critical')) return 100.0;
    if (s.contains('high')) return 80.0;
    if (s.contains('medium')) return 50.0;
    if (s.contains('low')) return 20.0;
    return 50.0;
  }

  /// Calculate public safety impact score (0 - 100) from category, title, and description
  static double calculatePublicSafetyScore({
    String? category,
    String? title,
    String? description,
  }) {
    final combined = '${category ?? ""} ${title ?? ""} ${description ?? ""}'.toLowerCase();

    // Check for critical hazards
    for (final kw in _criticalHazardKeywords) {
      if (combined.contains(kw)) return 100.0;
    }

    // Check for moderate hazards
    for (final kw in _moderateHazardKeywords) {
      if (combined.contains(kw)) return 65.0;
    }

    // Category-based safety baseline
    final cat = (category ?? '').toLowerCase();
    if (cat.contains('safety') || cat.contains('emergency') || cat.contains('disaster')) {
      return 85.0;
    }
    if (cat.contains('electricity') || cat.contains('water') || cat.contains('road')) {
      return 50.0;
    }

    return 25.0; // Standard civic maintenance
  }

  /// Calculate related complaint cluster score (0 - 100)
  static double calculateRelatedComplaintsScore(int relatedCount) {
    if (relatedCount <= 0) return 0.0;
    if (relatedCount == 1) return 40.0;
    if (relatedCount == 2) return 70.0;
    return 100.0; // 3 or more related reports
  }

  /// Calculate complaint age / duration escalation score (0 - 100)
  static double calculateAgeScore(DateTime? createdAt, {bool isResolved = false}) {
    if (isResolved || createdAt == null) return 0.0;

    final diffSeconds = DateTime.now().difference(createdAt).inSeconds;
    if (diffSeconds < 0) return 10.0; // Future/clock skew safe baseline

    final diffDays = diffSeconds / 86400.0;

    if (diffDays < 1.0) return 15.0; // Fresh (< 24 hours)
    if (diffDays <= 3.0) return 40.0; // 1 to 3 days
    if (diffDays <= 7.0) return 70.0; // 4 to 7 days (approaching SLA breach)
    return 100.0; // Over 7 days unresolved (urgent escalation)
  }

  /// Calculate category baseline score (0 - 100)
  static double calculateCategoryBaselineScore(String? category) {
    if (category == null || category.trim().isEmpty) return 50.0;

    final c = category.trim().toLowerCase();
    if (c.contains('safety') || c.contains('emergency') || c.contains('disaster')) {
      return 100.0;
    }
    if (c.contains('electricity') || c.contains('water') || c.contains('drainage')) {
      return 75.0;
    }
    if (c.contains('road') || c.contains('traffic') || c.contains('pavement')) {
      return 60.0;
    }
    if (c.contains('waste') || c.contains('garbage') || c.contains('sanitation')) {
      return 45.0;
    }
    return 35.0;
  }

  /// Evaluate complete multi-factor civic priority for a complaint
  static CivicPriorityAnalysis evaluatePriority({
    String? severity,
    String? category,
    String? title,
    String? description,
    int relatedComplaintsCount = 0,
    DateTime? createdAt,
    bool isResolved = false,
  }) {
    final severityScore = calculateSeverityScore(severity);
    final publicSafetyScore = calculatePublicSafetyScore(
      category: category,
      title: title,
      description: description,
    );
    final relatedScore = calculateRelatedComplaintsScore(relatedComplaintsCount);
    final ageScore = calculateAgeScore(createdAt, isResolved: isResolved);
    final categoryScore = calculateCategoryBaselineScore(category);

    final totalScore = (severityScore * weightSeverity) +
        (publicSafetyScore * weightPublicSafety) +
        (relatedScore * weightRelatedComplaints) +
        (ageScore * weightAge) +
        (categoryScore * weightCategory);

    final boundedScore = math.max(0.0, math.min(100.0, totalScore));

    // Map to levels and existing ReportPriority enum
    String levelLabel;
    ReportPriority mappedPriority;

    if (boundedScore >= thresholdCritical) {
      levelLabel = 'Critical';
      mappedPriority = ReportPriority.high; // Maps safely to existing high enum in DB
    } else if (boundedScore >= thresholdHigh) {
      levelLabel = 'High';
      mappedPriority = ReportPriority.high;
    } else if (boundedScore >= thresholdMedium) {
      levelLabel = 'Medium';
      mappedPriority = ReportPriority.medium;
    } else {
      levelLabel = 'Low';
      mappedPriority = ReportPriority.low;
    }

    final reasons = <String>[];

    if (severityScore >= 80.0) {
      reasons.add('${severity ?? "High"} severity identified by AI triage');
    }

    if (publicSafetyScore >= 85.0) {
      reasons.add('High public-safety impact / critical municipal hazard');
    } else if (publicSafetyScore >= 60.0) {
      reasons.add('Elevated neighborhood safety concern');
    }

    if (relatedComplaintsCount >= 3) {
      reasons.add('$relatedComplaintsCount related complaints clustered nearby');
    } else if (relatedComplaintsCount >= 1) {
      reasons.add('$relatedComplaintsCount related complaint reported in area');
    }

    if (ageScore >= 70.0 && !isResolved) {
      final days = createdAt != null ? (DateTime.now().difference(createdAt).inDays) : 4;
      reasons.add('Unresolved for ${math.max(days, 4)} days (SLA escalation)');
    }

    if (categoryScore >= 75.0) {
      reasons.add('Critical infrastructure category ($category)');
    }

    if (reasons.isEmpty) {
      reasons.add('Standard priority assessment for general civic grievance');
    }

    return CivicPriorityAnalysis(
      score: boundedScore,
      mappedPriority: mappedPriority,
      levelLabel: levelLabel,
      explainableReasons: reasons,
      signalBreakdown: {
        'severity': severityScore,
        'public_safety': publicSafetyScore,
        'related_complaints': relatedScore,
        'age_escalation': ageScore,
        'category_baseline': categoryScore,
      },
    );
  }

  /// Convenience helper to calculate priority directly from a ComprehensiveReportModel
  static CivicPriorityAnalysis evaluateReport(ComprehensiveReportModel report, {int relatedCount = 0}) {
    final isResolved = report.status == ReportStatus.resolved;
    final effectiveRelated = relatedCount > 0 ? relatedCount : report.consolidatedReports;

    return evaluatePriority(
      severity: report.priority.displayName,
      category: report.category,
      title: report.title,
      description: report.description,
      relatedComplaintsCount: effectiveRelated,
      createdAt: report.createdAt,
      isResolved: isResolved,
    );
  }
}
