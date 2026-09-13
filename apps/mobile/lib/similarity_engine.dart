import 'dart:math' as math;

/// Classification for candidate duplicate / related reports
enum SimilarityClassification {
  /// Score >= 0.75: Strong multi-signal evidence that reports describe the same issue
  highConfidenceDuplicate,

  /// Score 0.50 - 0.74: Reports share locality, category, or themes indicating a shared incident or root cause
  relatedIncident,

  /// Score < 0.50: Reports are distinct issues
  unrelated,
}

extension SimilarityClassificationExtension on SimilarityClassification {
  String get displayName {
    switch (this) {
      case SimilarityClassification.highConfidenceDuplicate:
        return 'HIGH CONFIDENCE POTENTIAL DUPLICATE';
      case SimilarityClassification.relatedIncident:
        return 'RELATED COMPLAINT / POSSIBLE SHARED INCIDENT';
      case SimilarityClassification.unrelated:
        return 'NOT RELATED';
    }
  }

  String get shortLabel {
    switch (this) {
      case SimilarityClassification.highConfidenceDuplicate:
        return 'Potential Duplicate';
      case SimilarityClassification.relatedIncident:
        return 'Related Issue';
      case SimilarityClassification.unrelated:
        return 'Distinct Issue';
    }
  }
}

/// Comprehensive explainable result from multi-signal similarity evaluation
class SimilarityAnalysisResult {
  final String candidateReportId;
  final double? distanceMeters;
  final double locationScore;
  final double categoryScore;
  final double textScore;
  final double temporalScore;
  final double totalConfidence;
  final SimilarityClassification classification;
  final List<String> explainableReasons;
  final Map<String, dynamic>? candidateReport;

  const SimilarityAnalysisResult({
    required this.candidateReportId,
    this.distanceMeters,
    required this.locationScore,
    required this.categoryScore,
    required this.textScore,
    required this.temporalScore,
    required this.totalConfidence,
    required this.classification,
    required this.explainableReasons,
    this.candidateReport,
  });

  /// Human-friendly summary of the similarity match
  String get primaryReason {
    if (explainableReasons.isEmpty) return 'Proximity match';
    return explainableReasons.first;
  }

  Map<String, dynamic> toJson() {
    return {
      'candidate_report_id': candidateReportId,
      'distance_meters': distanceMeters,
      'location_score': double.parse(locationScore.toStringAsFixed(3)),
      'category_score': double.parse(categoryScore.toStringAsFixed(3)),
      'text_score': double.parse(textScore.toStringAsFixed(3)),
      'temporal_score': double.parse(temporalScore.toStringAsFixed(3)),
      'total_confidence': double.parse(totalConfidence.toStringAsFixed(3)),
      'classification': classification.name,
      'reasons': explainableReasons,
    };
  }
}

/// Enterprise Civic Multi-Signal Similarity Engine
class CivicSimilarityEngine {
  // Configurable explainable signal weights (Sum = 1.0)
  static const double weightLocation = 0.30;
  static const double weightCategory = 0.25;
  static const double weightText = 0.30;
  static const double weightTime = 0.15;

  // Thresholds for officer recommendation
  static const double thresholdHighConfidence = 0.75;
  static const double thresholdRelatedIncident = 0.50;

  // Common Indian English and civic stop words for lexical token cleansing
  static const Set<String> _stopWords = {
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he',
    'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'were',
    'will', 'with', 'there', 'this', 'near', 'area', 'please', 'complaint',
    'issue', 'problem', 'sir', 'madam', 'road', 'street', 'colony', 'nagar',
    'ward', 'very', 'much', 'daily', 'urgent', 'kindly', 'help'
  };

  /// Calculate continuous location score with smooth distance decay
  /// Max radius baseline: 500m (at <=20m -> ~1.0, 100m -> ~0.80, 200m -> ~0.60, >500m -> 0.0)
  static double calculateLocationScore(double? distanceMeters, {double maxRadiusMeters = 500.0}) {
    if (distanceMeters == null || distanceMeters < 0) return 0.0;
    if (distanceMeters == 0) return 1.0;
    if (distanceMeters > maxRadiusMeters) return 0.0;

    // Smooth quadratic decay curve
    final normalized = distanceMeters / maxRadiusMeters;
    final score = 1.0 - (normalized * normalized);
    return math.max(0.0, math.min(1.0, score));
  }

  /// Calculate category match score
  /// Exact match = 1.0, related domain / substring match = 0.85, domain equivalence = 0.70, distinct = 0.0
  static double calculateCategoryScore(String? cat1, String? cat2) {
    if (cat1 == null || cat2 == null) return 0.0;
    final c1 = cat1.trim().toLowerCase();
    final c2 = cat2.trim().toLowerCase();
    if (c1.isEmpty || c2.isEmpty) return 0.0;

    if (c1 == c2) return 1.0;

    // Substring / partial match (e.g. "roads" vs "roads & pavements")
    if (c1.contains(c2) || c2.contains(c1)) return 0.85;

    // Domain equivalence groups
    if (_areInSameDomain(c1, c2)) return 0.70;

    return 0.0;
  }

  static bool _areInSameDomain(String c1, String c2) {
    const domainGroups = [
      {'road', 'pavement', 'traffic', 'footpath', 'pothole', 'street'},
      {'water', 'drainage', 'pipeline', 'leakage', 'sewage', 'manhole'},
      {'electricity', 'streetlight', 'pole', 'power', 'transformer'},
      {'waste', 'garbage', 'sanitation', 'debris', 'cleaning'},
      {'safety', 'police', 'fire', 'emergency', 'hazard'},
    ];

    for (final group in domainGroups) {
      final c1Match = group.any((kw) => c1.contains(kw));
      final c2Match = group.any((kw) => c2.contains(kw));
      if (c1Match && c2Match) return true;
    }
    return false;
  }

  /// Tokenize, clean, and compute lexical Jaccard similarity between two texts
  static double calculateTextSimilarity(String? text1, String? text2) {
    if (text1 == null || text2 == null) return 0.0;
    final tokens1 = _tokenizeAndClean(text1);
    final tokens2 = _tokenizeAndClean(text2);

    if (tokens1.isEmpty || tokens2.isEmpty) return 0.0;

    final intersection = tokens1.intersection(tokens2).length;
    final union = tokens1.union(tokens2).length;

    if (union == 0) return 0.0;
    return intersection / union;
  }

  static Set<String> _tokenizeAndClean(String rawText) {
    final cleaned = rawText
        .toLowerCase()
        .replaceAll(RegExp(r'[^a-z0-9\s]'), ' ')
        .trim();

    final rawTokens = cleaned.split(RegExp(r'\s+'));
    final result = <String>{};

    for (final token in rawTokens) {
      if (token.length >= 3 && !_stopWords.contains(token)) {
        result.add(token);
      }
    }
    return result;
  }

  /// Calculate temporal recency score with exponential decay
  /// Within 6h = 1.0, 24h = ~0.85, 3 days = ~0.65, 7 days = ~0.45, 30 days = ~0.20
  static double calculateTemporalScore(DateTime? time1, DateTime? time2) {
    if (time1 == null || time2 == null) return 0.5; // Neutral baseline for missing timestamp

    final diffSeconds = (time1.difference(time2).inSeconds).abs();
    final diffHours = diffSeconds / 3600.0;

    if (diffHours <= 6) return 1.0;
    if (diffHours <= 24) return 0.85;
    if (diffHours <= 72) return 0.65;
    if (diffHours <= 168) return 0.45; // 7 days
    if (diffHours <= 720) return 0.20; // 30 days
    return 0.05; // Older than 30 days
  }

  /// Parse timestamp safely from string or DateTime
  static DateTime? parseTimestamp(dynamic val) {
    if (val == null) return null;
    if (val is DateTime) return val;
    try {
      return DateTime.parse(val.toString());
    } catch (_) {
      return null;
    }
  }

  /// Evaluate full multi-signal similarity between a new report and an existing candidate
  static SimilarityAnalysisResult evaluateCandidate({
    required String candidateReportId,
    required double? distanceMeters,
    required String? newCategory,
    required String? candidateCategory,
    required String? newTitle,
    required String? newDescription,
    required String? candidateTitle,
    required String? candidateDescription,
    required dynamic newCreatedAt,
    required dynamic candidateCreatedAt,
    Map<String, dynamic>? candidateRawData,
  }) {
    final locationScore = calculateLocationScore(distanceMeters);
    final categoryScore = calculateCategoryScore(newCategory, candidateCategory);

    final combinedNewText = '${newTitle ?? ""} ${newDescription ?? ""}'.trim();
    final combinedCandidateText = '${candidateTitle ?? ""} ${candidateDescription ?? ""}'.trim();
    final textScore = calculateTextSimilarity(combinedNewText, combinedCandidateText);

    final t1 = parseTimestamp(newCreatedAt) ?? DateTime.now();
    final t2 = parseTimestamp(candidateCreatedAt);
    final temporalScore = calculateTemporalScore(t1, t2);

    final totalConfidence = (locationScore * weightLocation) +
        (categoryScore * weightCategory) +
        (textScore * weightText) +
        (temporalScore * weightTime);

    final normalizedTotal = math.max(0.0, math.min(1.0, totalConfidence));

    SimilarityClassification classification;
    if (normalizedTotal >= thresholdHighConfidence) {
      classification = SimilarityClassification.highConfidenceDuplicate;
    } else if (normalizedTotal >= thresholdRelatedIncident) {
      classification = SimilarityClassification.relatedIncident;
    } else {
      classification = SimilarityClassification.unrelated;
    }

    final reasons = <String>[];
    if (distanceMeters != null) {
      if (distanceMeters <= 30) {
        reasons.add('Exact location match (~${distanceMeters.toStringAsFixed(0)}m away)');
      } else if (distanceMeters <= 200) {
        reasons.add('Same neighborhood proximity (${distanceMeters.toStringAsFixed(0)}m away)');
      }
    }

    if (categoryScore >= 0.85) {
      reasons.add('Same category ($newCategory)');
    } else if (categoryScore >= 0.70) {
      reasons.add('Related municipal domain');
    }

    if (textScore >= 0.40) {
      reasons.add('High description similarity (${(textScore * 100).toStringAsFixed(0)}% keyword overlap)');
    } else if (textScore >= 0.20) {
      reasons.add('Shared keywords in issue description');
    }

    if (temporalScore >= 0.85) {
      reasons.add('Recently reported (within 24 hours)');
    } else if (temporalScore >= 0.65) {
      reasons.add('Reported within the last 3 days');
    }

    return SimilarityAnalysisResult(
      candidateReportId: candidateReportId,
      distanceMeters: distanceMeters,
      locationScore: locationScore,
      categoryScore: categoryScore,
      textScore: textScore,
      temporalScore: temporalScore,
      totalConfidence: normalizedTotal,
      classification: classification,
      explainableReasons: reasons,
      candidateReport: candidateRawData,
    );
  }
}
