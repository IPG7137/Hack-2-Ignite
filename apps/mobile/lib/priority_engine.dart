import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'comprehensive_report_models.dart';
import 'location_service.dart';

/// Single factor contribution breakdown in the explainable priority equation
class PriorityFactorContribution {
  final String key;
  final String name;
  final double rawScore; // 0.0 - 100.0
  final double weight; // e.g. 0.30
  final double weightedPoints; // rawScore * weight
  final String explanation;
  final bool isHighlighted;

  const PriorityFactorContribution({
    required this.key,
    required this.name,
    required this.rawScore,
    required this.weight,
    required this.weightedPoints,
    required this.explanation,
    this.isHighlighted = false,
  });

  Map<String, dynamic> toJson() {
    return {
      'key': key,
      'name': name,
      'raw_score': double.parse(rawScore.toStringAsFixed(1)),
      'weight': weight,
      'weighted_points': double.parse(weightedPoints.toStringAsFixed(1)),
      'explanation': explanation,
      'is_highlighted': isHighlighted,
    };
  }
}

/// Comprehensive result of the explainable civic priority analysis
class CivicPriorityAnalysis {
  final double score; // 0.0 - 100.0
  final ReportPriority mappedPriority;
  final String levelLabel; // 'Critical', 'High', 'Medium', 'Low'
  final List<String> explainableReasons;
  final List<PriorityFactorContribution> factors;
  final Map<String, double> signalBreakdown;
  final LocationContext? locationContext;
  final String? conflictNotice;
  final String architectureNote;

  const CivicPriorityAnalysis({
    required this.score,
    required this.mappedPriority,
    required this.levelLabel,
    required this.explainableReasons,
    required this.factors,
    required this.signalBreakdown,
    this.locationContext,
    this.conflictNotice,
    this.architectureNote = 'AI / evidence understanding → structured signals → Deterministic 3B engine → final operational priority',
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
      'factors': factors.map((f) => f.toJson()).toList(),
      'breakdown': signalBreakdown,
      'location_context': locationContext?.toJson(),
      'conflict_notice': conflictNotice,
      'architecture_note': architectureNote,
    };
  }
}

/// Alias for CivicPriorityAnalysis fulfilling PriorityResult naming
typedef PriorityResult = CivicPriorityAnalysis;

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

  /// High-risk keywords indicating immediate public hazard (English, Marathi, Hindi)
  static const Set<String> _criticalHazardKeywords = {
    // English
    'manhole', 'open manhole', 'wire', 'live wire', 'transformer', 'sparking',
    'electric shock', 'collapse', 'collapsed', 'cave in', 'caved', 'fire',
    'smoke', 'gas leak', 'pipeline burst', 'major flood', 'deep crater',
    'accident', 'emergency', 'fallen tree', 'hanging wire',
    // Marathi
    'विजेची तार', 'विजेचा शॉक', 'मॅनहोल', 'गटर उघडे', 'झाकण उघडे', 'जीवघेणा', 'धोकादायक',
    'आग', 'धूर', 'अपघात', 'झाड पडले', 'मोठा खड्डा', 'रात्री', 'रात्रीचा धोका',
    // Hindi
    'बिजली का तार', 'बिजली का झटका', 'मैनहोल', 'गटर खुला', 'ढक्कन खुला', 'जानलेवा', 'खतरनाक',
    'धुआं', 'दुर्घटना', 'पेड़ गिरा', 'बड़ा गड्ढा', 'रात', 'खतरा'
  };

  /// Moderate-risk keywords indicating heightened safety concern (English, Marathi, Hindi)
  static const Set<String> _moderateHazardKeywords = {
    // English
    'pothole', 'broken divider', 'dark street', 'blackout', 'streetlight dead',
    'waterlogging', 'sewage leak', 'garbage burning', 'blocked drain', 'slippery',
    // Marathi
    'खड्डा', 'खड्डे', 'अंधार', 'स्ट्रीट लाईट बंद', 'पाणी तुंबले', 'सांडपाणी', 'कचऱ्याचा ढीग', 'दुर्गंधी',
    // Hindi
    'गड्ढा', 'गड्ढे', 'अंधेरा', 'स्ट्रीट लाइट बंद', 'पानी भरा', 'सीवर ओवरफ्लो', 'कचरे का ढेर', 'बदबू'
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

  /// Calculate public safety impact and location exposure score (0 - 100)
  /// Incorporates hazard keywords, category baseline, and geographic exposure context
  static double calculatePublicSafetyScore({
    String? category,
    String? title,
    String? description,
    LocationContext? locationContext,
  }) {
    final combined = '${category ?? ""} ${title ?? ""} ${description ?? ""}'.toLowerCase();

    // 1. Check for critical hazards
    for (final kw in _criticalHazardKeywords) {
      if (combined.contains(kw)) return 100.0;
    }

    // 2. Check for moderate hazards
    bool isModerateHazard = false;
    for (final kw in _moderateHazardKeywords) {
      if (combined.contains(kw)) {
        isModerateHazard = true;
        break;
      }
    }

    if (isModerateHazard) {
      if (locationContext != null) {
        // Highway / major arterial traffic exposure elevates moderate road hazard
        if (locationContext.roadClass == 'highway' || locationContext.trafficExposure == 'high') {
          return 75.0;
        }
        // School / hospital sensitive zone elevates exposure
        if (locationContext.nearbySensitiveZone == 'hospital' || locationContext.nearbySensitiveZone == 'school') {
          return 70.0;
        }
      }
      return 65.0;
    }

    // 3. Category-based safety baseline
    final cat = (category ?? '').toLowerCase();
    if (cat.contains('safety') || cat.contains('emergency') || cat.contains('disaster')) {
      return 85.0;
    }

    // 4. Geographic context sensitivity (when no critical hazard keyword is present)
    if (locationContext != null) {
      if (locationContext.nearbySensitiveZone == 'hospital' || locationContext.nearbySensitiveZone == 'school') {
        return 55.0; // Heightened civic attention without making routine complaints critical
      }
      if (locationContext.roadClass == 'highway' || locationContext.trafficExposure == 'high') {
        return 50.0;
      }
    }

    if (cat.contains('electricity') || cat.contains('water') || cat.contains('road')) {
      return 50.0;
    }

    return 25.0; // Standard civic maintenance baseline / unknown context
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

  static String _deriveSafetyExplanation(
    double score,
    double weightedPoints,
    LocationContext? locationContext,
  ) {
    if (score >= 85.0) {
      return 'Critical hazard / direct public safety impact (+${weightedPoints.toStringAsFixed(1)} pts)';
    }
    if (locationContext != null && locationContext.nearbySensitiveZone == 'hospital') {
      return 'Sensitive healthcare zone proximity (+${weightedPoints.toStringAsFixed(1)} pts)';
    }
    if (locationContext != null && locationContext.nearbySensitiveZone == 'school') {
      return 'Sensitive educational zone proximity (+${weightedPoints.toStringAsFixed(1)} pts)';
    }
    if (locationContext != null && (locationContext.roadClass == 'highway' || locationContext.trafficExposure == 'high')) {
      return 'High-exposure transit corridor (+${weightedPoints.toStringAsFixed(1)} pts)';
    }
    if (locationContext != null && locationContext.roadClass == 'residential_lane') {
      return 'Local residential lane exposure (+${weightedPoints.toStringAsFixed(1)} pts)';
    }
    if (score >= 60.0) {
      return 'Elevated neighborhood safety concern (+${weightedPoints.toStringAsFixed(1)} pts)';
    }
    return 'Standard maintenance baseline (+${weightedPoints.toStringAsFixed(1)} pts)';
  }

  /// Evaluate complete multi-factor explainable civic priority for a complaint
  static CivicPriorityAnalysis evaluatePriority({
    String? severity,
    String? category,
    String? title,
    String? description,
    int relatedComplaintsCount = 0,
    DateTime? createdAt,
    bool isResolved = false,
    LocationContext? locationContext,
  }) {
    final severityScore = calculateSeverityScore(severity);
    final publicSafetyScore = calculatePublicSafetyScore(
      category: category,
      title: title,
      description: description,
      locationContext: locationContext,
    );
    final relatedScore = calculateRelatedComplaintsScore(relatedComplaintsCount);
    final ageScore = calculateAgeScore(createdAt, isResolved: isResolved);
    final categoryScore = calculateCategoryBaselineScore(category);

    // Exact deterministic 3B linear combination
    final double weightedSeverity = severityScore * weightSeverity;
    final double weightedSafety = publicSafetyScore * weightPublicSafety;
    final double weightedRelated = relatedScore * weightRelatedComplaints;
    final double weightedAge = ageScore * weightAge;
    final double weightedCategory = categoryScore * weightCategory;

    final totalScore = weightedSeverity + weightedSafety + weightedRelated + weightedAge + weightedCategory;
    final boundedScore = math.max(0.0, math.min(100.0, totalScore));

    // Map to levels and existing ReportPriority enum
    String levelLabel;
    ReportPriority mappedPriority;

    if (boundedScore >= thresholdCritical) {
      levelLabel = 'Critical';
      mappedPriority = ReportPriority.high; // Maps safely to high priority in database enum
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

    final factors = <PriorityFactorContribution>[
      PriorityFactorContribution(
        key: 'severity',
        name: 'Severity & Urgency',
        rawScore: severityScore,
        weight: weightSeverity,
        weightedPoints: weightedSeverity,
        explanation: '${severity ?? "Standard"} severity signal (+${weightedSeverity.toStringAsFixed(1)} pts)',
        isHighlighted: severityScore >= 80.0,
      ),
      PriorityFactorContribution(
        key: 'public_safety',
        name: 'Public Safety Hazard',
        rawScore: publicSafetyScore,
        weight: weightPublicSafety,
        weightedPoints: weightedSafety,
        explanation: _deriveSafetyExplanation(
          publicSafetyScore,
          weightedSafety,
          locationContext,
        ),
        isHighlighted: publicSafetyScore >= 60.0,
      ),
      PriorityFactorContribution(
        key: 'related_complaints',
        name: 'Related Complaints Cluster',
        rawScore: relatedScore,
        weight: weightRelatedComplaints,
        weightedPoints: weightedRelated,
        explanation: relatedComplaintsCount >= 3
            ? '$relatedComplaintsCount+ related reports clustered nearby (+${weightedRelated.toStringAsFixed(1)} pts)'
            : relatedComplaintsCount >= 1
                ? '$relatedComplaintsCount related report in area (+${weightedRelated.toStringAsFixed(1)} pts)'
                : 'Isolated civic report (+0.0 pts)',
        isHighlighted: relatedComplaintsCount >= 1,
      ),
      PriorityFactorContribution(
        key: 'age_escalation',
        name: 'SLA & Age Escalation',
        rawScore: ageScore,
        weight: weightAge,
        weightedPoints: weightedAge,
        explanation: ageScore >= 70.0 && !isResolved
            ? 'Active for >4 days, approaching SLA breach (+${weightedAge.toStringAsFixed(1)} pts)'
            : ageScore >= 40.0 && !isResolved
                ? 'Active for 1-3 days (+${weightedAge.toStringAsFixed(1)} pts)'
                : 'Freshly registered submission (+${weightedAge.toStringAsFixed(1)} pts)',
        isHighlighted: ageScore >= 70.0 && !isResolved,
      ),
      PriorityFactorContribution(
        key: 'category_baseline',
        name: 'Category Baseline',
        rawScore: categoryScore,
        weight: weightCategory,
        weightedPoints: weightedCategory,
        explanation: '${category ?? "General"} service baseline (+${weightedCategory.toStringAsFixed(1)} pts)',
        isHighlighted: categoryScore >= 75.0,
      ),
    ];

    final reasons = <String>[];

    if (severityScore >= 80.0) {
      reasons.add('${severity ?? "High"} severity identified by AI triage');
    }

    if (publicSafetyScore >= 85.0) {
      reasons.add('High public-safety impact / critical municipal hazard');
    } else if (publicSafetyScore >= 60.0) {
      reasons.add('Elevated neighborhood safety concern');
    }

    if (locationContext != null) {
      if (locationContext.nearbySensitiveZone == 'hospital') {
        reasons.add('Sensitive healthcare zone: Hospital proximity');
      } else if (locationContext.nearbySensitiveZone == 'school') {
        reasons.add('Sensitive educational zone: School proximity');
      } else if (locationContext.nearbySensitiveZone == 'transit_hub') {
        reasons.add('High footfall transit hub proximity');
      } else if (locationContext.roadClass == 'highway') {
        reasons.add('High-exposure transit corridor: Highway / expressway');
      } else if (locationContext.roadClass == 'major_arterial') {
        reasons.add('High-exposure thoroughfare: Major arterial road');
      } else if (locationContext.roadClass == 'residential_lane') {
        reasons.add('Local neighborhood road: Residential lane');
      }
    }

    if (relatedComplaintsCount >= 3) {
      reasons.add('$relatedComplaintsCount related complaints clustered nearby');
    } else if (relatedComplaintsCount >= 1) {
      reasons.add('$relatedComplaintsCount related complaints nearby');
    }

    if (ageScore >= 70.0 && !isResolved) {
      final days = createdAt != null ? (DateTime.now().difference(createdAt).inDays) : 4;
      reasons.add('Unresolved for ${math.max(days, 4)} days (SLA escalation)');
    }

    if (categoryScore >= 75.0) {
      reasons.add('Critical municipal infrastructure category ($category)');
    } else {
      reasons.add('Category baseline (${category ?? "General"})');
    }

    if (reasons.isEmpty) {
      reasons.add('Standard priority assessment for general civic grievance');
    }

    // Check for user-input vs hazard conflict
    String? conflict;
    final userRaw = (severity ?? '').toLowerCase();
    if (userRaw.contains('low') && boundedScore >= thresholdHigh) {
      conflict = 'Citizen selected Low priority. Deterministic 3B engine incorporated public safety hazard signals (+${weightedSafety.toStringAsFixed(1)} pts) and category baseline to assign operational ${levelLabel.toUpperCase()} priority (Score: ${boundedScore.round()}/100).';
    } else if (userRaw.contains('critical') && boundedScore < thresholdHigh) {
      conflict = 'Citizen requested Critical priority, but standard maintenance signals resulted in operational ${levelLabel.toUpperCase()} priority (Score: ${boundedScore.round()}/100).';
    }

    return CivicPriorityAnalysis(
      score: boundedScore,
      mappedPriority: mappedPriority,
      levelLabel: levelLabel,
      explainableReasons: reasons,
      factors: factors,
      locationContext: locationContext,
      conflictNotice: conflict,
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
  static CivicPriorityAnalysis evaluateReport(
    ComprehensiveReportModel report, {
    int relatedCount = 0,
    LocationContext? locationContext,
  }) {
    final isResolved = report.status == ReportStatus.resolved;
    final effectiveRelated = relatedCount > 0 ? relatedCount : report.consolidatedReports;

    // Resolve location context from report model location if not passed explicitly
    final resolvedContext = locationContext ??
        (report.location.isNotEmpty
            ? LocationContext.fromLocationString(report.location)
            : null);

    return evaluatePriority(
      severity: report.priority.displayName,
      category: report.category,
      title: report.title,
      description: report.description,
      relatedComplaintsCount: effectiveRelated,
      createdAt: report.createdAt,
      isResolved: isResolved,
      locationContext: resolvedContext,
    );
  }
}

/// Citizen and Judge-facing Explainable Priority Card Widget
class ExplainablePriorityCard extends StatefulWidget {
  final CivicPriorityAnalysis analysis;
  final bool initiallyExpanded;

  const ExplainablePriorityCard({
    super.key,
    required this.analysis,
    this.initiallyExpanded = false,
  });

  @override
  State<ExplainablePriorityCard> createState() => _ExplainablePriorityCardState();
}

class _ExplainablePriorityCardState extends State<ExplainablePriorityCard> {
  bool _isExpanded = false;

  @override
  void initState() {
    super.initState();
    _isExpanded = widget.initiallyExpanded;
  }

  Color _getBadgeColor(String level) {
    switch (level.toLowerCase()) {
      case 'critical':
        return const Color(0xFFDC2626);
      case 'high':
        return const Color(0xFFEA580C);
      case 'medium':
        return const Color(0xFFD97706);
      case 'low':
      default:
        return const Color(0xFF059669);
    }
  }

  @override
  Widget build(BuildContext context) {
    final analysis = widget.analysis;
    final badgeColor = _getBadgeColor(analysis.levelLabel);

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: badgeColor.withValues(alpha: 0.3)),
        boxShadow: [
          BoxShadow(
            color: badgeColor.withValues(alpha: 0.05),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header: Priority Level + Score Badge + Expand Toggle
          InkWell(
            onTap: () {
              setState(() {
                _isExpanded = !_isExpanded;
              });
            },
            borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
            child: Padding(
              padding: const EdgeInsets.all(14.0),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: badgeColor.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: badgeColor.withValues(alpha: 0.3)),
                    ),
                    child: Text(
                      '${analysis.levelLabel.toUpperCase()} PRIORITY',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        color: badgeColor,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    analysis.scoreDisplay,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF0F172A),
                    ),
                  ),
                  const Spacer(),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        _isExpanded ? 'Hide formula' : 'Why this priority?',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: badgeColor,
                        ),
                      ),
                      const SizedBox(width: 2),
                      Icon(
                        _isExpanded ? Icons.keyboard_arrow_up_rounded : Icons.keyboard_arrow_down_rounded,
                        size: 18,
                        color: badgeColor,
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),

          const Divider(height: 1, thickness: 1, color: Color(0xFFF1F5F9)),

          // Top Reasons Checkmarks
          Padding(
            padding: const EdgeInsets.all(14.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Why this priority?',
                  style: TextStyle(
                    fontSize: 12.5,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF1E293B),
                  ),
                ),
                const SizedBox(height: 8),
                ...analysis.explainableReasons.map(
                  (reason) => Padding(
                    padding: const EdgeInsets.only(bottom: 5),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(
                          Icons.check_circle_rounded,
                          color: Color(0xFF059669),
                          size: 15,
                        ),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            reason,
                            style: const TextStyle(
                              fontSize: 12,
                              color: Color(0xFF334155),
                              height: 1.3,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

                // Conflict Notice Banner if applicable
                if (analysis.conflictNotice != null) ...[
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFFBEB),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: const Color(0xFFFDE68A)),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(Icons.info_outline_rounded, size: 14, color: Color(0xFFD97706)),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            analysis.conflictNotice!,
                            style: const TextStyle(
                              fontSize: 11,
                              color: Color(0xFF92400E),
                              height: 1.3,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],

                // Expanded 3B Factor Breakdown & Weights
                if (_isExpanded) ...[
                  const SizedBox(height: 12),
                  const Divider(height: 1, thickness: 1, color: Color(0xFFE2E8F0)),
                  const SizedBox(height: 12),
                  const Text(
                    'Deterministic 3B Engine Weights & Contributions',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF0F172A),
                    ),
                  ),
                  const SizedBox(height: 8),
                  ...analysis.factors.map((factor) {
                    final percent = '${(factor.weight * 100).toInt()}%';
                    return Container(
                      margin: const EdgeInsets.only(bottom: 6),
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                      decoration: BoxDecoration(
                        color: factor.isHighlighted ? const Color(0xFFF8FAFC) : Colors.transparent,
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  factor.name,
                                  style: const TextStyle(
                                    fontSize: 11.5,
                                    fontWeight: FontWeight.w600,
                                    color: Color(0xFF1E293B),
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  factor.explanation,
                                  style: const TextStyle(
                                    fontSize: 10.5,
                                    color: Color(0xFF64748B),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(
                                '+${factor.weightedPoints.toStringAsFixed(1)} pts',
                                style: const TextStyle(
                                  fontSize: 11.5,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF0F172A),
                                ),
                              ),
                              Text(
                                'Weight: $percent',
                                style: const TextStyle(
                                  fontSize: 9.5,
                                  color: Color(0xFF94A3B8),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    );
                  }),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      'Architecture: ${analysis.architectureNote}',
                      style: const TextStyle(
                        fontSize: 10,
                        color: Color(0xFF475569),
                        fontStyle: FontStyle.italic,
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
