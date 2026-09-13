import 'comprehensive_report_models.dart';
import 'similarity_engine.dart';
import 'emerging_problem_engine.dart';

/// Decision-support classification for potential common civic incidents
enum IncidentClassification {
  /// Score >= 80: High confidence that member complaints describe a single shared incident
  highConfidencePotentialIncident,

  /// Score 60 - 79: Probable common incident or localized infrastructure issue
  possibleCommonIncident,

  /// Score 40 - 59: Weak related cluster with some localized commonalities
  weakRelatedCluster,

  /// Score < 40: Insufficient evidence of a common incident
  noIncidentGroup,
}

extension IncidentClassificationExtension on IncidentClassification {
  String get displayName {
    switch (this) {
      case IncidentClassification.highConfidencePotentialIncident:
        return 'HIGH CONFIDENCE POTENTIAL INCIDENT';
      case IncidentClassification.possibleCommonIncident:
        return 'POSSIBLE COMMON INCIDENT';
      case IncidentClassification.weakRelatedCluster:
        return 'WEAK RELATED CLUSTER';
      case IncidentClassification.noIncidentGroup:
        return 'NO INCIDENT GROUP';
    }
  }

  String get shortLabel {
    switch (this) {
      case IncidentClassification.highConfidencePotentialIncident:
        return 'Potential Incident';
      case IncidentClassification.possibleCommonIncident:
        return 'Possible Incident';
      case IncidentClassification.weakRelatedCluster:
        return 'Related Cluster';
      case IncidentClassification.noIncidentGroup:
        return 'Distinct Issues';
    }
  }

  /// Citizen-safe summary label (avoids internal operational jargon)
  String get citizenSafeLabel {
    switch (this) {
      case IncidentClassification.highConfidencePotentialIncident:
      case IncidentClassification.possibleCommonIncident:
        return 'Multiple related complaints reported in this area';
      case IncidentClassification.weakRelatedCluster:
        return 'Nearby civic complaints recorded';
      case IncidentClassification.noIncidentGroup:
        return 'Individual complaints';
    }
  }
}

/// Structured result representing a potential common civic incident
class PotentialIncidentResult {
  final String incidentId;
  final List<String> memberReportIds;
  final String primaryCategory;
  final String incidentLabel;
  final double centerLatitude;
  final double centerLongitude;
  final int reportCount;
  final double incidentConfidence; // 0.0 - 100.0
  final IncidentClassification classification;
  final double affectedRadiusMeters;
  final DateTime earliestReportTime;
  final DateTime latestReportTime;
  final List<String> topRecurringTerms;
  final ReportPriority highestPriority;
  final bool hasActiveHotspot;
  final List<String> explainableReasons;
  final Map<String, double> signalBreakdown;

  const PotentialIncidentResult({
    required this.incidentId,
    required this.memberReportIds,
    required this.primaryCategory,
    required this.incidentLabel,
    required this.centerLatitude,
    required this.centerLongitude,
    required this.reportCount,
    required this.incidentConfidence,
    required this.classification,
    required this.affectedRadiusMeters,
    required this.earliestReportTime,
    required this.latestReportTime,
    required this.topRecurringTerms,
    required this.highestPriority,
    required this.hasActiveHotspot,
    required this.explainableReasons,
    required this.signalBreakdown,
  });

  /// Formatted confidence string (e.g. "84/100")
  String get confidenceDisplay => '${incidentConfidence.round()}/100';

  /// Timespan in hours
  double get timeSpanHours =>
      latestReportTime.difference(earliestReportTime).inMinutes / 60.0;

  /// Top 2-3 explainable summary reasons
  List<String> get topReasons => explainableReasons.take(3).toList();

  Map<String, dynamic> toJson() {
    return {
      'incident_id': incidentId,
      'member_report_ids': memberReportIds,
      'primary_category': primaryCategory,
      'incident_label': incidentLabel,
      'center_latitude': centerLatitude,
      'center_longitude': centerLongitude,
      'report_count': reportCount,
      'incident_confidence': double.parse(incidentConfidence.toStringAsFixed(1)),
      'classification': classification.name,
      'affected_radius_meters': double.parse(affectedRadiusMeters.toStringAsFixed(1)),
      'earliest_report_time': earliestReportTime.toIso8601String(),
      'latest_report_time': latestReportTime.toIso8601String(),
      'time_span_hours': double.parse(timeSpanHours.toStringAsFixed(1)),
      'top_recurring_terms': topRecurringTerms,
      'highest_priority': highestPriority.value,
      'has_active_hotspot': hasActiveHotspot,
      'reasons': explainableReasons,
      'signal_breakdown': signalBreakdown,
    };
  }
}

/// Internal item representation for grouping
class _IncidentMember {
  final String id;
  final String category;
  final String title;
  final String description;
  final double latitude;
  final double longitude;
  final DateTime createdAt;
  final ReportPriority priority;
  final String? severity;

  _IncidentMember({
    required this.id,
    required this.category,
    required this.title,
    required this.description,
    required this.latitude,
    required this.longitude,
    required this.createdAt,
    required this.priority,
    this.severity,
  });
}

/// Enterprise Civic Root-Cause & Incident Grouping Engine
class IncidentGroupingEngine {
  // Decision-support signal weights (Sum = 1.0)
  static const double weightSimilarityEvidence = 0.30;
  static const double weightSpatialConcentration = 0.25;
  static const double weightCategoryConsistency = 0.20;
  static const double weightTemporalConsistency = 0.15;
  static const double weightClusterSize = 0.10;

  // Thresholds for incident classification
  static const double thresholdHighConfidence = 80.0;
  static const double thresholdPossibleIncident = 60.0;
  static const double thresholdWeakCluster = 40.0;

  // Maximum spatial grouping radius (500 meters)
  static const double defaultGroupingRadiusMeters = 500.0;

  // Common stop words to clean issue term extraction
  static const Set<String> _stopWords = {
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he',
    'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'were',
    'will', 'with', 'there', 'this', 'near', 'area', 'please', 'complaint',
    'issue', 'problem', 'sir', 'madam', 'colony', 'nagar', 'ward', 'daily',
    'urgent', 'kindly', 'help', 'report', 'reported', 'solapur'
  };

  /// Primary entry point: Group a collection of reports into potential common incidents
  static List<PotentialIncidentResult> groupReportsIntoIncidents({
    required List<dynamic> reports,
    List<EmergingHotspotResult>? activeHotspots,
    double groupingRadiusMeters = defaultGroupingRadiusMeters,
    int minimumClusterSize = 2,
  }) {
    if (reports.length < minimumClusterSize) return [];

    // 1. Parse and validate report items
    final List<_IncidentMember> items = [];
    for (final r in reports) {
      final parsed = _parseReport(r);
      if (parsed != null) items.add(parsed);
    }

    if (items.length < minimumClusterSize) return [];

    // 2. Spatial Clustering: Form geographical candidate groups
    final List<List<_IncidentMember>> spatialClusters = [];
    final Set<String> assignedIds = {};

    for (int i = 0; i < items.length; i++) {
      final seed = items[i];
      if (assignedIds.contains(seed.id)) continue;

      final List<_IncidentMember> cluster = [seed];
      assignedIds.add(seed.id);

      for (int j = 0; j < items.length; j++) {
        if (i == j) continue;
        final candidate = items[j];
        if (assignedIds.contains(candidate.id)) continue;

        final dist = EmergingProblemEngine.calculateDistanceMeters(
          seed.latitude, seed.longitude,
          candidate.latitude, candidate.longitude,
        );

        if (dist <= groupingRadiusMeters) {
          cluster.add(candidate);
          assignedIds.add(candidate.id);
        }
      }

      if (cluster.length >= minimumClusterSize) {
        spatialClusters.add(cluster);
      }
    }

    // 3. Sub-group each spatial cluster by domain / category affinity
    final List<PotentialIncidentResult> incidents = [];
    int incidentCounter = 101;

    for (final cluster in spatialClusters) {
      final evaluatedIncident = _evaluateSpatialGroup(
        incidentId: 'INC-${DateTime.now().year}-$incidentCounter',
        cluster: cluster,
        activeHotspots: activeHotspots,
        groupingRadiusMeters: groupingRadiusMeters,
      );

      if (evaluatedIncident != null) {
        incidents.add(evaluatedIncident);
        incidentCounter++;
      }
    }

    // Sort descending by incident confidence
    incidents.sort((a, b) => b.incidentConfidence.compareTo(a.incidentConfidence));
    return incidents;
  }

  /// Evaluate a spatial group into a structured PotentialIncidentResult
  static PotentialIncidentResult? _evaluateSpatialGroup({
    required String incidentId,
    required List<_IncidentMember> cluster,
    List<EmergingHotspotResult>? activeHotspots,
    required double groupingRadiusMeters,
  }) {
    if (cluster.length < 2) return null;

    // A. Geographic Centroid and Affected Radius
    double sumLat = 0.0;
    double sumLng = 0.0;
    for (final item in cluster) {
      sumLat += item.latitude;
      sumLng += item.longitude;
    }
    final double centerLat = sumLat / cluster.length;
    final double centerLng = sumLng / cluster.length;

    double maxDist = 0.0;
    for (final item in cluster) {
      final dist = EmergingProblemEngine.calculateDistanceMeters(
        centerLat, centerLng, item.latitude, item.longitude,
      );
      if (dist > maxDist) maxDist = dist;
    }
    final double affectedRadiusMeters = maxDist > 0 ? maxDist : 25.0;

    // B. Category Dominance & Primary Domain
    final Map<String, int> catCounts = {};
    for (final item in cluster) {
      catCounts[item.category] = (catCounts[item.category] ?? 0) + 1;
    }

    String primaryCategory = 'General';
    int maxCount = 0;
    catCounts.forEach((cat, count) {
      if (count > maxCount) {
        maxCount = count;
        primaryCategory = cat;
      }
    });
    final double categoryRatio = maxCount / cluster.length;

    // C. Phase 3A Multi-Signal Similarity Evidence
    // Sample pairwise similarity across cluster members
    double sumSimilarity = 0.0;
    int pairCount = 0;

    for (int i = 0; i < cluster.length; i++) {
      for (int j = i + 1; j < cluster.length; j++) {
        final a = cluster[i];
        final b = cluster[j];

        final dist = EmergingProblemEngine.calculateDistanceMeters(
          a.latitude, a.longitude, b.latitude, b.longitude,
        );

        final sim = CivicSimilarityEngine.evaluateCandidate(
          candidateReportId: b.id,
          distanceMeters: dist,
          newCategory: a.category,
          candidateCategory: b.category,
          newTitle: a.title,
          newDescription: a.description,
          candidateTitle: b.title,
          candidateDescription: b.description,
          newCreatedAt: a.createdAt,
          candidateCreatedAt: b.createdAt,
        );

        sumSimilarity += sim.totalConfidence;
        pairCount++;
      }
    }

    final double avgSimilarity = pairCount > 0 ? (sumSimilarity / pairCount) : 0.5;

    // D. Temporal Span & Consistency
    DateTime earliest = cluster.first.createdAt;
    DateTime latest = cluster.first.createdAt;

    for (final item in cluster) {
      if (item.createdAt.isBefore(earliest)) earliest = item.createdAt;
      if (item.createdAt.isAfter(latest)) latest = item.createdAt;
    }

    final double spanHours = latest.difference(earliest).inMinutes.abs() / 60.0;

    // Temporal score: < 24h -> 100, < 48h -> 80, < 7 days -> 60, < 30 days -> 35, > 30 days -> 10
    double temporalScore = 0.0;
    if (spanHours <= 24.0) {
      temporalScore = 100.0;
    } else if (spanHours <= 48.0) {
      temporalScore = 80.0;
    } else if (spanHours <= 168.0) {
      temporalScore = 60.0;
    } else if (spanHours <= 720.0) {
      temporalScore = 35.0;
    } else {
      temporalScore = 10.0;
    }

    // E. Extract Top Recurring Issue Terms
    final Map<String, int> termFrequency = {};
    for (final item in cluster) {
      final combined = '${item.title} ${item.description}'.toLowerCase();
      final words = combined.replaceAll(RegExp(r'[^a-z0-9\s]'), ' ').split(RegExp(r'\s+'));
      for (final w in words) {
        if (w.length > 2 && !_stopWords.contains(w)) {
          termFrequency[w] = (termFrequency[w] ?? 0) + 1;
        }
      }
    }

    final sortedTerms = termFrequency.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));
    final topTerms = sortedTerms.take(4).map((e) => e.key).toList();

    // F. Highest Priority among member reports
    ReportPriority highestPriority = ReportPriority.low;
    for (final item in cluster) {
      if (item.priority == ReportPriority.high) {
        highestPriority = ReportPriority.high;
        break;
      } else if (item.priority == ReportPriority.medium) {
        highestPriority = ReportPriority.medium;
      }
    }

    // G. Check for Active Hotspot Overlap (Phase 3C)
    bool hasActiveHotspot = false;
    if (activeHotspots != null) {
      for (final h in activeHotspots) {
        final distToHotspot = EmergingProblemEngine.calculateDistanceMeters(
          centerLat, centerLng, h.centerLatitude, h.centerLongitude,
        );
        if (distToHotspot <= groupingRadiusMeters) {
          hasActiveHotspot = true;
          break;
        }
      }
    }

    // H. Signal Calculations (0 - 100 per component)
    // 1. Similarity Evidence Score (30% weight)
    final double similarityEvidenceScore = (avgSimilarity * 100.0).clamp(0.0, 100.0);

    // 2. Spatial Concentration Score (25% weight)
    double spatialConcentrationScore = 0.0;
    if (affectedRadiusMeters <= 150.0) {
      spatialConcentrationScore = 100.0;
    } else if (affectedRadiusMeters <= 300.0) {
      spatialConcentrationScore = 80.0;
    } else if (affectedRadiusMeters <= groupingRadiusMeters) {
      spatialConcentrationScore = 60.0;
    } else {
      spatialConcentrationScore = 30.0;
    }

    // 3. Category Consistency Score (20% weight)
    double categoryConsistencyScore = 0.0;
    if (categoryRatio >= 0.90) {
      categoryConsistencyScore = 100.0;
    } else if (categoryRatio >= 0.70) {
      categoryConsistencyScore = 80.0;
    } else if (categoryRatio >= 0.50) {
      categoryConsistencyScore = 50.0;
    } else {
      categoryConsistencyScore = 20.0;
    }

    // 4. Temporal Consistency Score (15% weight)
    final double temporalConsistencyScore = temporalScore;

    // 5. Cluster Size Contribution (10% weight)
    double clusterSizeScore = 0.0;
    if (cluster.length >= 8) {
      clusterSizeScore = 100.0;
    } else if (cluster.length >= 5) {
      clusterSizeScore = 85.0;
    } else if (cluster.length >= 3) {
      clusterSizeScore = 65.0;
    } else {
      clusterSizeScore = 45.0;
    }

    // Hotspot boost (+5 points if confirmed emerging hotspot)
    final double hotspotBoost = hasActiveHotspot ? 5.0 : 0.0;

    // Composite Continuous Confidence Score (0 - 100)
    final double incidentConfidence = ((similarityEvidenceScore * weightSimilarityEvidence) +
        (spatialConcentrationScore * weightSpatialConcentration) +
        (categoryConsistencyScore * weightCategoryConsistency) +
        (temporalConsistencyScore * weightTemporalConsistency) +
        (clusterSizeScore * weightClusterSize) +
        hotspotBoost).clamp(0.0, 100.0);

    // I. Classification
    IncidentClassification classification;
    if (incidentConfidence >= thresholdHighConfidence) {
      classification = IncidentClassification.highConfidencePotentialIncident;
    } else if (incidentConfidence >= thresholdPossibleIncident) {
      classification = IncidentClassification.possibleCommonIncident;
    } else if (incidentConfidence >= thresholdWeakCluster) {
      classification = IncidentClassification.weakRelatedCluster;
    } else {
      classification = IncidentClassification.noIncidentGroup;
    }

    // J. Human-Readable Potential Incident Label
    final incidentLabel = _generateIncidentLabel(primaryCategory, topTerms);

    // K. Explainable Reasons
    final List<String> reasons = [];
    reasons.add('${cluster.length} complaints concentrated within ~${affectedRadiusMeters.toStringAsFixed(0)}m');

    final pct = (categoryRatio * 100).round();
    reasons.add('$pct% of complaints belong to $primaryCategory');

    if (topTerms.isNotEmpty) {
      reasons.add('Recurring issue terms: ${topTerms.take(3).join(', ')}');
    }

    if (spanHours <= 24.0) {
      reasons.add('All reports submitted within a ${spanHours.toStringAsFixed(1)}-hour window');
    } else {
      final days = (spanHours / 24.0).toStringAsFixed(1);
      reasons.add('Reports submitted over $days days');
    }

    if (avgSimilarity >= 0.60) {
      reasons.add('Strong multi-signal similarity (${(avgSimilarity * 100).round()}% average)');
    }

    if (highestPriority == ReportPriority.high) {
      reasons.add('Contains high-priority / safety-critical reports');
    }

    if (hasActiveHotspot) {
      reasons.add('Correlated with active emerging hotspot surge');
    }

    return PotentialIncidentResult(
      incidentId: incidentId,
      memberReportIds: cluster.map((e) => e.id).toList(),
      primaryCategory: primaryCategory,
      incidentLabel: incidentLabel,
      centerLatitude: centerLat,
      centerLongitude: centerLng,
      reportCount: cluster.length,
      incidentConfidence: incidentConfidence,
      classification: classification,
      affectedRadiusMeters: affectedRadiusMeters,
      earliestReportTime: earliest,
      latestReportTime: latest,
      topRecurringTerms: topTerms,
      highestPriority: highestPriority,
      hasActiveHotspot: hasActiveHotspot,
      explainableReasons: reasons,
      signalBreakdown: {
        'similarity_evidence': similarityEvidenceScore,
        'spatial_concentration': spatialConcentrationScore,
        'category_consistency': categoryConsistencyScore,
        'temporal_consistency': temporalConsistencyScore,
        'cluster_size': clusterSizeScore,
      },
    );
  }

  /// Generate safe, human-readable potential incident label without assuming unverified causes
  static String _generateIncidentLabel(String category, List<String> topTerms) {
    final catLower = category.toLowerCase();

    if (catLower.contains('water') || catLower.contains('drainage')) {
      if (topTerms.any((t) => t.contains('leak') || t.contains('pipe'))) {
        return 'Potential Water Supply & Pipeline Issue';
      } else if (topTerms.any((t) => t.contains('flood') || t.contains('drain'))) {
        return 'Possible Drainage Overflow Incident';
      }
      return 'Potential Water Infrastructure Incident';
    }

    if (catLower.contains('road') || catLower.contains('pavement')) {
      if (topTerms.any((t) => t.contains('pothole') || t.contains('crater'))) {
        return 'Possible Road Surface & Pothole Hazard';
      }
      return 'Potential Road Infrastructure Issue';
    }

    if (catLower.contains('electr') || catLower.contains('power') || catLower.contains('light')) {
      if (topTerms.any((t) => t.contains('wire') || t.contains('spark'))) {
        return 'Potential Electrical Safety Hazard';
      }
      return 'Possible Electrical Infrastructure Outage';
    }

    if (catLower.contains('waste') || catLower.contains('sanitat') || catLower.contains('garb')) {
      return 'Possible Localized Sanitation & Waste Incident';
    }

    return 'Potential Common $category Incident';
  }

  /// Extract `_IncidentMember` safely from `ComprehensiveReportModel` or `Map<String, dynamic>`
  static _IncidentMember? _parseReport(dynamic report) {
    if (report == null) return null;

    String id = '';
    String category = 'General';
    String title = '';
    String description = '';
    double? lat;
    double? lng;
    DateTime? createdAt;
    ReportPriority priority = ReportPriority.low;
    String? severity;

    if (report is ComprehensiveReportModel) {
      id = report.id;
      category = report.category.isNotEmpty ? report.category : 'General';
      title = report.title;
      description = report.description;
      lat = report.latitude;
      lng = report.longitude;
      createdAt = report.createdAt;
      priority = report.priority;
    } else if (report is Map) {
      id = report['id']?.toString() ?? '';
      category = report['category']?.toString() ?? 'General';
      title = report['title']?.toString() ?? '';
      description = report['description']?.toString() ?? '';
      severity = report['severity']?.toString() ?? report['ai_severity']?.toString();

      // Priority parsing
      final rawPriority = report['priority']?.toString().toLowerCase();
      if (rawPriority == 'high' || rawPriority == 'critical') {
        priority = ReportPriority.high;
      } else if (rawPriority == 'medium') {
        priority = ReportPriority.medium;
      } else {
        priority = ReportPriority.low;
      }

      // Coordinates parsing
      if (report['latitude'] != null && report['longitude'] != null) {
        lat = double.tryParse(report['latitude'].toString());
        lng = double.tryParse(report['longitude'].toString());
      } else if (report['coordinates'] is Map) {
        lat = double.tryParse(report['coordinates']['lat']?.toString() ?? '');
        lng = double.tryParse(report['coordinates']['lng']?.toString() ?? '');
      }

      // Date parsing
      final rawCreatedAt = report['created_at'];
      if (rawCreatedAt is DateTime) {
        createdAt = rawCreatedAt;
      } else if (rawCreatedAt is String) {
        createdAt = DateTime.tryParse(rawCreatedAt);
      }
    }

    if (id.isEmpty || lat == null || lng == null) {
      return null;
    }

    createdAt ??= DateTime.now();

    return _IncidentMember(
      id: id,
      category: category,
      title: title,
      description: description,
      latitude: lat,
      longitude: lng,
      createdAt: createdAt,
      priority: priority,
      severity: severity,
    );
  }
}
