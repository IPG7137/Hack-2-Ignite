import 'dart:math' as math;
import 'comprehensive_report_models.dart';
import 'priority_engine.dart';

/// Classification for emerging problem urgency and volume anomalies
enum EmergingClassification {
  /// Score >= 80: Critical emerging municipal problem requiring immediate department intervention
  criticalEmergingProblem,

  /// Score 60 - 79: Significant emerging problem / localized complaint surge
  emergingProblem,

  /// Score 40 - 59: Heightened complaint activity to monitor
  watch,

  /// Score < 40: Normal complaint volume within expected baseline
  normal,
}

extension EmergingClassificationExtension on EmergingClassification {
  String get displayName {
    switch (this) {
      case EmergingClassification.criticalEmergingProblem:
        return 'CRITICAL EMERGING PROBLEM';
      case EmergingClassification.emergingProblem:
        return 'EMERGING PROBLEM';
      case EmergingClassification.watch:
        return 'WATCH / HEIGHTENED ACTIVITY';
      case EmergingClassification.normal:
        return 'NORMAL ACTIVITY';
    }
  }

  String get shortLabel {
    switch (this) {
      case EmergingClassification.criticalEmergingProblem:
        return 'Critical Surge';
      case EmergingClassification.emergingProblem:
        return 'Emerging Hotspot';
      case EmergingClassification.watch:
        return 'Watch';
      case EmergingClassification.normal:
        return 'Normal';
    }
  }

  /// Citizen-safe label (avoids alarming internal municipal terms)
  String get citizenSafeLabel {
    switch (this) {
      case EmergingClassification.criticalEmergingProblem:
      case EmergingClassification.emergingProblem:
        return 'High complaint activity reported in this area';
      case EmergingClassification.watch:
        return 'Multiple complaints nearby';
      case EmergingClassification.normal:
        return 'Normal activity';
    }
  }
}

/// Structured result of an identified emerging problem / hotspot
class EmergingHotspotResult {
  final String category;
  final double centerLatitude;
  final double centerLongitude;
  final List<String> reportIds;
  final int complaintCount;
  final int currentWindowCount;
  final double baselineDailyAverage;
  final double increaseRatio;
  final double emergingScore; // 0.0 - 100.0
  final EmergingClassification classification;
  final List<String> explainableReasons;
  final Map<String, double> signalBreakdown;
  final double averageDistanceMeters;
  final int highPriorityCount;

  const EmergingHotspotResult({
    required this.category,
    required this.centerLatitude,
    required this.centerLongitude,
    required this.reportIds,
    required this.complaintCount,
    required this.currentWindowCount,
    required this.baselineDailyAverage,
    required this.increaseRatio,
    required this.emergingScore,
    required this.classification,
    required this.explainableReasons,
    required this.signalBreakdown,
    required this.averageDistanceMeters,
    required this.highPriorityCount,
  });

  /// Formatted score string (e.g. "82/100")
  String get scoreDisplay => '${emergingScore.round()}/100';

  /// Top 2-3 explainable summary reasons for officer/dashboard
  List<String> get topReasons => explainableReasons.take(3).toList();

  Map<String, dynamic> toJson() {
    return {
      'category': category,
      'center_latitude': centerLatitude,
      'center_longitude': centerLongitude,
      'report_ids': reportIds,
      'complaint_count': complaintCount,
      'current_window_count': currentWindowCount,
      'baseline_daily_average': double.parse(baselineDailyAverage.toStringAsFixed(2)),
      'increase_ratio': double.parse(increaseRatio.toStringAsFixed(2)),
      'emerging_score': double.parse(emergingScore.toStringAsFixed(1)),
      'classification': classification.name,
      'reasons': explainableReasons,
      'signal_breakdown': signalBreakdown,
      'avg_distance_meters': double.parse(averageDistanceMeters.toStringAsFixed(1)),
      'high_priority_count': highPriorityCount,
    };
  }
}

/// Internal lightweight record for spatial clustering
class _ClusterItem {
  final String id;
  final String category;
  final double latitude;
  final double longitude;
  final DateTime createdAt;
  final String? priority;
  final String? severity;
  final String title;
  final String description;

  _ClusterItem({
    required this.id,
    required this.category,
    required this.latitude,
    required this.longitude,
    required this.createdAt,
    this.priority,
    this.severity,
    required this.title,
    required this.description,
  });
}

/// Enterprise Emerging Problem & Hotspot Detection Engine
class EmergingProblemEngine {
  // Decision-support signal weights (Sum = 1.0)
  static const double weightVolumeSpike = 0.40;
  static const double weightSpatialDensity = 0.25;
  static const double weightCategoryConsistency = 0.20;
  static const double weightPrioritySafety = 0.15;

  // Thresholds for classification
  static const double thresholdCritical = 80.0;
  static const double thresholdEmerging = 60.0;
  static const double thresholdWatch = 40.0;

  // Default spatial cluster radius (500 meters)
  static const double defaultClusterRadiusMeters = 500.0;

  /// Haversine formula to compute great-circle distance between two GPS coordinates in meters
  static double calculateDistanceMeters(double lat1, double lon1, double lat2, double lon2) {
    const double earthRadiusMeters = 6371000; // Earth radius in meters
    final double dLat = _toRadians(lat2 - lat1);
    final double dLon = _toRadians(lon2 - lon1);

    final double a = math.sin(dLat / 2) * math.sin(dLat / 2) +
        math.cos(_toRadians(lat1)) * math.cos(_toRadians(lat2)) *
            math.sin(dLon / 2) * math.sin(dLon / 2);

    final double c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a));
    return earthRadiusMeters * c;
  }

  static double _toRadians(double degree) => degree * (math.pi / 180.0);

  /// Extract `_ClusterItem` safely from `ComprehensiveReportModel` or raw `Map<String, dynamic>`
  static _ClusterItem? _parseItem(dynamic report) {
    if (report == null) return null;

    String id = '';
    String category = 'General';
    double? lat;
    double? lng;
    DateTime? createdAt;
    String? priority;
    String? severity;
    String title = '';
    String description = '';

    if (report is ComprehensiveReportModel) {
      id = report.id;
      category = report.category.isNotEmpty ? report.category : 'General';
      lat = report.latitude;
      lng = report.longitude;
      createdAt = report.createdAt;
      priority = report.priority.value;
      title = report.title;
      description = report.description;
    } else if (report is Map) {
      id = report['id']?.toString() ?? '';
      category = report['category']?.toString() ?? 'General';
      title = report['title']?.toString() ?? '';
      description = report['description']?.toString() ?? '';
      priority = report['priority']?.toString();
      severity = report['severity']?.toString() ?? report['ai_severity']?.toString();

      // Coordinates parsing
      if (report['latitude'] != null && report['longitude'] != null) {
        lat = double.tryParse(report['latitude'].toString());
        lng = double.tryParse(report['longitude'].toString());
      } else if (report['coordinates'] is Map) {
        lat = double.tryParse(report['coordinates']['lat']?.toString() ?? '');
        lng = double.tryParse(report['coordinates']['lng']?.toString() ?? '');
      }

      // Timestamp parsing
      final rawCreatedAt = report['created_at'];
      if (rawCreatedAt is DateTime) {
        createdAt = rawCreatedAt;
      } else if (rawCreatedAt is String) {
        createdAt = DateTime.tryParse(rawCreatedAt);
      }
    }

    if (id.isEmpty || lat == null || lng == null) {
      return null; // Missing coordinates or id cannot be clustered spatially
    }

    createdAt ??= DateTime.now();

    return _ClusterItem(
      id: id,
      category: category,
      latitude: lat,
      longitude: lng,
      createdAt: createdAt,
      priority: priority,
      severity: severity,
      title: title,
      description: description,
    );
  }

  /// Primary entry point: Detect emerging problem hotspots across a collection of reports
  static List<EmergingHotspotResult> detectHotspots({
    required List<dynamic> reports,
    DateTime? referenceTime,
    int currentWindowHours = 24,
    int baselineDays = 7,
    double clusterRadiusMeters = defaultClusterRadiusMeters,
    int minimumClusterSize = 2,
  }) {
    if (reports.isEmpty) return [];

    final refTime = referenceTime ?? DateTime.now();

    // 1. Parse and sanitize report items
    final List<_ClusterItem> items = [];
    for (final r in reports) {
      final parsed = _parseItem(r);
      if (parsed != null) items.add(parsed);
    }

    if (items.isEmpty) return [];

    // 2. Perform spatial clustering (O(N) seed expansion within clusterRadiusMeters)
    final List<List<_ClusterItem>> spatialClusters = [];
    final Set<String> assignedIds = {};

    for (int i = 0; i < items.length; i++) {
      final seed = items[i];
      if (assignedIds.contains(seed.id)) continue;

      final List<_ClusterItem> cluster = [seed];
      assignedIds.add(seed.id);

      for (int j = 0; j < items.length; j++) {
        if (i == j) continue;
        final candidate = items[j];
        if (assignedIds.contains(candidate.id)) continue;

        final dist = calculateDistanceMeters(
          seed.latitude, seed.longitude,
          candidate.latitude, candidate.longitude,
        );

        if (dist <= clusterRadiusMeters) {
          cluster.add(candidate);
          assignedIds.add(candidate.id);
        }
      }

      if (cluster.length >= minimumClusterSize) {
        spatialClusters.add(cluster);
      }
    }

    // 3. Evaluate each spatial cluster for emerging anomalies
    final List<EmergingHotspotResult> results = [];

    for (final cluster in spatialClusters) {
      final hotspot = _evaluateCluster(
        cluster: cluster,
        refTime: refTime,
        currentWindowHours: currentWindowHours,
        baselineDays: baselineDays,
        clusterRadiusMeters: clusterRadiusMeters,
      );

      if (hotspot != null) {
        results.add(hotspot);
      }
    }

    // Sort descending by emerging score
    results.sort((a, b) => b.emergingScore.compareTo(a.emergingScore));
    return results;
  }

  /// Evaluate an individual spatial cluster across category, time window, volume, and priority
  static EmergingHotspotResult? _evaluateCluster({
    required List<_ClusterItem> cluster,
    required DateTime refTime,
    required int currentWindowHours,
    required int baselineDays,
    required double clusterRadiusMeters,
  }) {
    if (cluster.isEmpty) return null;

    // A. Compute Geographic Centroid
    double sumLat = 0.0;
    double sumLng = 0.0;
    for (final item in cluster) {
      sumLat += item.latitude;
      sumLng += item.longitude;
    }
    final double centerLat = sumLat / cluster.length;
    final double centerLng = sumLng / cluster.length;

    // B. Calculate Average Distance to Centroid
    double sumDist = 0.0;
    for (final item in cluster) {
      sumDist += calculateDistanceMeters(centerLat, centerLng, item.latitude, item.longitude);
    }
    final double avgDistanceMeters = sumDist / cluster.length;

    // C. Determine Primary Category and Category Consistency
    final Map<String, int> categoryCounts = {};
    for (final item in cluster) {
      categoryCounts[item.category] = (categoryCounts[item.category] ?? 0) + 1;
    }

    String primaryCategory = 'General';
    int maxCategoryCount = 0;
    categoryCounts.forEach((cat, count) {
      if (count > maxCategoryCount) {
        maxCategoryCount = count;
        primaryCategory = cat;
      }
    });

    final double categoryRatio = maxCategoryCount / cluster.length;

    // D. Time Window Analysis (Current Window vs Historical Baseline)
    final currentWindowStart = refTime.subtract(Duration(hours: currentWindowHours));
    final baselineWindowStart = refTime.subtract(Duration(days: baselineDays));

    int currentWindowCount = 0;
    int baselineWindowCount = 0;

    for (final item in cluster) {
      if (item.createdAt.isAfter(currentWindowStart)) {
        currentWindowCount++;
      } else if (item.createdAt.isAfter(baselineWindowStart)) {
        baselineWindowCount++;
      }
    }

    // Daily historical baseline average (baselineDays duration)
    // If historical baseline window has 0 reports, fallback to safe baseline rate
    final double baselineDailyAverage = baselineDays > 0 && baselineWindowCount > 0
        ? (baselineWindowCount / baselineDays)
        : (baselineWindowCount == 0 && currentWindowCount > 0 ? 0.5 : 1.0);

    // Increase ratio: Current 24h count compared to daily baseline rate
    final double increaseRatio = currentWindowCount > 0
        ? (currentWindowCount / (baselineDailyAverage > 0 ? baselineDailyAverage : 1.0))
        : 0.0;

    // E. Priority & Public Safety in Cluster
    int highPriorityCount = 0;
    for (final item in cluster) {
      final isHighPriority = item.priority?.toLowerCase() == 'high' || item.priority?.toLowerCase() == 'critical';
      final hasHazard = CivicPriorityEngine.calculatePublicSafetyScore(
        category: item.category,
        title: item.title,
        description: item.description,
      ) >= 75.0;

      if (isHighPriority || hasHazard) {
        highPriorityCount++;
      }
    }
    final double priorityRatio = highPriorityCount / cluster.length;

    // F. Score Calculations (0 - 100 per component)
    // 1. Volume Spike Score (40% weight)
    double volumeSpikeScore = 0.0;
    if (currentWindowCount == 0) {
      volumeSpikeScore = 0.0;
    } else if (increaseRatio >= 4.0) {
      volumeSpikeScore = 100.0;
    } else if (increaseRatio >= 2.5) {
      volumeSpikeScore = 80.0;
    } else if (increaseRatio >= 1.5) {
      volumeSpikeScore = 60.0;
    } else if (increaseRatio >= 1.0) {
      volumeSpikeScore = 35.0;
    } else {
      volumeSpikeScore = 15.0;
    }

    // Volume magnitude scaling: A pair of 2 reports is a duplicate candidate, not a city surge
    if (currentWindowCount == 1) {
      volumeSpikeScore = math.min(volumeSpikeScore, 25.0);
    } else if (currentWindowCount == 2) {
      volumeSpikeScore = math.min(volumeSpikeScore, 50.0);
    } else if (currentWindowCount <= 4) {
      volumeSpikeScore = volumeSpikeScore * 0.85;
    }

    // 2. Spatial Density Score (25% weight)
    double spatialDensityScore = 0.0;
    if (avgDistanceMeters <= 150.0) {
      spatialDensityScore = 100.0;
    } else if (avgDistanceMeters <= 300.0) {
      spatialDensityScore = 75.0;
    } else if (avgDistanceMeters <= clusterRadiusMeters) {
      spatialDensityScore = 50.0;
    } else {
      spatialDensityScore = 25.0;
    }

    // 3. Category Consistency Score (20% weight)
    double categoryConsistencyScore = 0.0;
    if (categoryRatio >= 0.90) {
      categoryConsistencyScore = 100.0;
    } else if (categoryRatio >= 0.75) {
      categoryConsistencyScore = 80.0;
    } else if (categoryRatio >= 0.50) {
      categoryConsistencyScore = 50.0;
    } else {
      categoryConsistencyScore = 25.0;
    }

    // 4. Priority & Public Safety Score (15% weight)
    double prioritySafetyScore = 0.0;
    if (priorityRatio >= 0.50) {
      prioritySafetyScore = 100.0;
    } else if (priorityRatio >= 0.25) {
      prioritySafetyScore = 75.0;
    } else if (highPriorityCount > 0) {
      prioritySafetyScore = 50.0;
    } else {
      prioritySafetyScore = 20.0;
    }

    // Composite Continuous Emerging Score (0 - 100)
    double emergingScore = (volumeSpikeScore * weightVolumeSpike) +
        (spatialDensityScore * weightSpatialDensity) +
        (categoryConsistencyScore * weightCategoryConsistency) +
        (prioritySafetyScore * weightPrioritySafety);

    // If no reports in the current active window, cluster is inactive historical
    if (currentWindowCount == 0) {
      emergingScore = emergingScore * 0.35;
    }

    // G. Emerging Classification
    EmergingClassification classification;
    if (emergingScore >= thresholdCritical) {
      classification = EmergingClassification.criticalEmergingProblem;
    } else if (emergingScore >= thresholdEmerging) {
      classification = EmergingClassification.emergingProblem;
    } else if (emergingScore >= thresholdWatch) {
      classification = EmergingClassification.watch;
    } else {
      classification = EmergingClassification.normal;
    }

    // H. Explainable Reasons
    final List<String> reasons = [];

    if (currentWindowCount > 0) {
      reasons.add('$currentWindowCount complaints reported in the last $currentWindowHours hours');
    }
    if (baselineWindowCount > 0) {
      reasons.add('Normal baseline is ~${baselineDailyAverage.toStringAsFixed(1)} complaints/day');
    } else {
      reasons.add('Limited historical baseline data available');
    }

    if (increaseRatio >= 1.5) {
      reasons.add('${increaseRatio.toStringAsFixed(1)}× increase compared with recent baseline');
    }

    reasons.add('${cluster.length} complaints concentrated within ~${avgDistanceMeters.toStringAsFixed(0)}m');

    if (categoryRatio >= 0.70) {
      final pct = (categoryRatio * 100).round();
      reasons.add('$pct% of complaints belong to $primaryCategory');
    }

    if (highPriorityCount > 0) {
      reasons.add('$highPriorityCount high-priority / safety hazard reports in cluster');
    }

    return EmergingHotspotResult(
      category: primaryCategory,
      centerLatitude: centerLat,
      centerLongitude: centerLng,
      reportIds: cluster.map((e) => e.id).toList(),
      complaintCount: cluster.length,
      currentWindowCount: currentWindowCount,
      baselineDailyAverage: baselineDailyAverage,
      increaseRatio: increaseRatio,
      emergingScore: emergingScore,
      classification: classification,
      explainableReasons: reasons,
      signalBreakdown: {
        'volume_spike': volumeSpikeScore,
        'spatial_density': spatialDensityScore,
        'category_consistency': categoryConsistencyScore,
        'priority_safety': prioritySafetyScore,
      },
      averageDistanceMeters: avgDistanceMeters,
      highPriorityCount: highPriorityCount,
    );
  }
}
