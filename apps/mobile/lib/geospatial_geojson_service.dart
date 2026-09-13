import 'dart:convert';
import 'dart:math' as math;
import 'comprehensive_report_models.dart';
import 'emerging_problem_engine.dart';
import 'incident_grouping_engine.dart';
import 'priority_engine.dart';

/// Abstract base class for GeoJSON Geometries
abstract class GeoJsonGeometry {
  String get type;
  Map<String, dynamic> toJson();
}

/// Point geometry representing a geographic coordinate in GeoJSON format.
/// IMPORTANT: GeoJSON coordinate order is [longitude, latitude].
class GeoJsonPointGeometry implements GeoJsonGeometry {
  @override
  final String type = 'Point';

  /// Coordinates in [longitude, latitude] order
  final List<double> coordinates;

  GeoJsonPointGeometry({
    required double longitude,
    required double latitude,
  }) : coordinates = [longitude, latitude];

  GeoJsonPointGeometry.fromList(this.coordinates) {
    if (coordinates.length < 2) {
      throw ArgumentError('Point coordinates must have at least 2 elements [longitude, latitude]');
    }
  }

  double get longitude => coordinates[0];
  double get latitude => coordinates[1];

  @override
  Map<String, dynamic> toJson() {
    return {
      'type': type,
      'coordinates': coordinates,
    };
  }
}

/// Polygon geometry representing a closed area or spatial buffer ring.
class GeoJsonPolygonGeometry implements GeoJsonGeometry {
  @override
  final String type = 'Polygon';

  /// Coordinates structured as [ [ [lng, lat], [lng, lat], ... ] ]
  final List<List<List<double>>> coordinates;

  GeoJsonPolygonGeometry({required this.coordinates});

  @override
  Map<String, dynamic> toJson() {
    return {
      'type': type,
      'coordinates': coordinates,
    };
  }
}

/// Strongly-typed GeoJSON Feature
class GeoJsonFeature {
  final String type = 'Feature';
  final String? id;
  final GeoJsonGeometry geometry;
  final Map<String, dynamic> properties;

  const GeoJsonFeature({
    this.id,
    required this.geometry,
    required this.properties,
  });

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{
      'type': type,
      'geometry': geometry.toJson(),
      'properties': properties,
    };
    if (id != null) {
      map['id'] = id;
    }
    return map;
  }

  String toJsonString() => jsonEncode(toJson());
}

/// Strongly-typed GeoJSON FeatureCollection
class GeoJsonFeatureCollection {
  final String type = 'FeatureCollection';
  final List<GeoJsonFeature> features;
  final Map<String, dynamic>? metadata;

  const GeoJsonFeatureCollection({
    required this.features,
    this.metadata,
  });

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{
      'type': type,
      'features': features.map((f) => f.toJson()).toList(),
    };
    if (metadata != null) {
      map['metadata'] = metadata;
    }
    return map;
  }

  String toJsonString() => jsonEncode(toJson());

  int get length => features.length;
  bool get isEmpty => features.isEmpty;
  bool get isNotEmpty => features.isNotEmpty;
}

/// High-performance, pure Geospatial and GeoJSON service for CivicResolve Mobile
class GeospatialGeoJsonService {
  static const double earthRadiusMeters = 6371000.0;
  static const double duplicateThresholdMeters = 200.0;
  static const double hotspotThresholdMeters = 500.0;

  /// Strict validation of geographic coordinates
  static bool isValidCoordinate(double? latitude, double? longitude) {
    if (latitude == null || longitude == null) return false;
    if (latitude.isNaN || longitude.isNaN) return false;
    if (latitude.isInfinite || longitude.isInfinite) return false;
    if (latitude < -90.0 || latitude > 90.0) return false;
    if (longitude < -180.0 || longitude > 180.0) return false;
    return true;
  }

  /// Convert a single ComprehensiveReportModel to a GeoJSON Feature
  static GeoJsonFeature? reportToFeature(ComprehensiveReportModel report) {
    if (!isValidCoordinate(report.latitude, report.longitude)) {
      return null;
    }

    final double lat = report.latitude!;
    final double lng = report.longitude!;

    // Calculate priority operational score if possible
    final priorityAssessment = CivicPriorityEngine.evaluatePriority(
      severity: report.priority.value,
      category: report.category,
      title: report.title,
      description: report.description,
      relatedComplaintsCount: report.consolidatedReports,
      createdAt: report.createdAt,
      isResolved: report.status == ReportStatus.resolved,
    );

    return GeoJsonFeature(
      id: report.id,
      geometry: GeoJsonPointGeometry(
        longitude: lng,
        latitude: lat,
      ),
      properties: {
        'reportId': report.id,
        'title': report.title,
        'description': report.description,
        'category': report.category,
        'categoryDisplayName': report.categoryDisplayName ?? report.category,
        'status': report.status.value,
        'statusDisplay': report.statusDisplay,
        'priority': report.priority.value,
        'priorityDisplay': report.priority.displayName,
        'priorityScore': priorityAssessment.score,
        'priorityLevel': priorityAssessment.levelLabel,
        'location': report.location,
        'submittedTime': report.submittedTime,
        'createdAt': report.createdAt.toIso8601String(),
        'isPotentialDuplicate': report.isPotentialDuplicate,
        'parentReportId': report.parentReportId,
        'hasImages': report.imageUrls.isNotEmpty,
        'imageCount': report.imageUrls.length,
        'rating': report.rating,
      },
    );
  }

  /// Convert a list of reports into a GeoJSON FeatureCollection
  static GeoJsonFeatureCollection reportsToFeatureCollection(
    List<ComprehensiveReportModel> reports, {
    Map<String, dynamic>? extraMetadata,
  }) {
    final List<GeoJsonFeature> features = [];

    for (final report in reports) {
      final feature = reportToFeature(report);
      if (feature != null) {
        features.add(feature);
      }
    }

    final metadata = <String, dynamic>{
      'totalReports': reports.length,
      'validGeospatialFeatures': features.length,
      'generatedAt': DateTime.now().toIso8601String(),
      if (extraMetadata != null) ...extraMetadata,
    };

    return GeoJsonFeatureCollection(
      features: features,
      metadata: metadata,
    );
  }

  /// Convert EmergingHotspotResult to a GeoJSON Feature with a 500m buffer polygon
  static GeoJsonFeature? hotspotToFeature(EmergingHotspotResult hotspot) {
    if (!isValidCoordinate(hotspot.centerLatitude, hotspot.centerLongitude)) {
      return null;
    }

    final polygonCoords = generateCirclePolygonCoordinates(
      hotspot.centerLatitude,
      hotspot.centerLongitude,
      hotspotThresholdMeters,
    );

    return GeoJsonFeature(
      id: 'hotspot_${hotspot.category.toLowerCase()}_${hotspot.centerLatitude.toStringAsFixed(4)}',
      geometry: GeoJsonPolygonGeometry(coordinates: [polygonCoords]),
      properties: {
        'category': hotspot.category,
        'classification': hotspot.classification.name,
        'classificationLabel': hotspot.classification.citizenSafeLabel,
        'increaseRatio': hotspot.increaseRatio,
        'surgeDisplay': '${hotspot.increaseRatio.toStringAsFixed(1)}x Surge',
        'emergingScore': hotspot.emergingScore,
        'complaintCount': hotspot.complaintCount,
        'reportIds': hotspot.reportIds,
        'centerLatitude': hotspot.centerLatitude,
        'centerLongitude': hotspot.centerLongitude,
        'radiusMeters': hotspotThresholdMeters,
        'isSevere': hotspot.classification == EmergingClassification.emergingProblem ||
            hotspot.classification == EmergingClassification.criticalEmergingProblem,
      },
    );
  }

  /// Convert a list of hotspots to a GeoJSON FeatureCollection
  static GeoJsonFeatureCollection hotspotsToFeatureCollection(
    List<EmergingHotspotResult> hotspots,
  ) {
    final List<GeoJsonFeature> features = [];
    for (final h in hotspots) {
      final f = hotspotToFeature(h);
      if (f != null) {
        features.add(f);
      }
    }

    return GeoJsonFeatureCollection(
      features: features,
      metadata: {
        'totalHotspots': hotspots.length,
        'activeHotspotsCount': features.length,
        'generatedAt': DateTime.now().toIso8601String(),
      },
    );
  }

  /// Convert PotentialIncidentResult to a GeoJSON Feature
  static GeoJsonFeature? incidentToFeature(PotentialIncidentResult incident) {
    if (!isValidCoordinate(incident.centerLatitude, incident.centerLongitude)) {
      return null;
    }

    final polygonCoords = generateCirclePolygonCoordinates(
      incident.centerLatitude,
      incident.centerLongitude,
      incident.affectedRadiusMeters.clamp(200.0, 1000.0),
    );

    return GeoJsonFeature(
      id: incident.incidentId,
      geometry: GeoJsonPolygonGeometry(coordinates: [polygonCoords]),
      properties: {
        'incidentId': incident.incidentId,
        'title': incident.incidentLabel,
        'primaryCategory': incident.primaryCategory,
        'classification': incident.classification.name,
        'classificationLabel': incident.classification.citizenSafeLabel,
        'incidentConfidence': incident.incidentConfidence,
        'reportCount': incident.reportCount,
        'memberReportIds': incident.memberReportIds,
        'centerLatitude': incident.centerLatitude,
        'centerLongitude': incident.centerLongitude,
        'radiusMeters': incident.affectedRadiusMeters,
      },
    );
  }

  /// Convert a list of potential incidents to a GeoJSON FeatureCollection
  static GeoJsonFeatureCollection incidentsToFeatureCollection(
    List<PotentialIncidentResult> incidents,
  ) {
    final List<GeoJsonFeature> features = [];
    for (final inc in incidents) {
      final f = incidentToFeature(inc);
      if (f != null) {
        features.add(f);
      }
    }

    return GeoJsonFeatureCollection(
      features: features,
      metadata: {
        'totalIncidents': incidents.length,
        'generatedAt': DateTime.now().toIso8601String(),
      },
    );
  }

  /// Pure Haversine distance formula between two lat/lng points in meters
  static double calculateDistanceMeters(
    double lat1,
    double lon1,
    double lat2,
    double lon2,
  ) {
    if (!isValidCoordinate(lat1, lon1) || !isValidCoordinate(lat2, lon2)) {
      return double.infinity;
    }

    final dLat = _degreesToRadians(lat2 - lat1);
    final dLon = _degreesToRadians(lon2 - lon1);

    final a = math.sin(dLat / 2) * math.sin(dLat / 2) +
        math.cos(_degreesToRadians(lat1)) *
            math.cos(_degreesToRadians(lat2)) *
            math.sin(dLon / 2) *
            math.sin(dLon / 2);

    final c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a));
    return earthRadiusMeters * c;
  }

  /// Filter a list of reports within a given radius from a central coordinate
  static List<ComprehensiveReportModel> filterReportsByRadius({
    required List<ComprehensiveReportModel> reports,
    required double centerLatitude,
    required double centerLongitude,
    required double radiusMeters,
  }) {
    if (!isValidCoordinate(centerLatitude, centerLongitude)) {
      return [];
    }

    return reports.where((report) {
      if (!isValidCoordinate(report.latitude, report.longitude)) {
        return false;
      }
      final distance = calculateDistanceMeters(
        centerLatitude,
        centerLongitude,
        report.latitude!,
        report.longitude!,
      );
      return distance <= radiusMeters;
    }).toList();
  }

  /// Filter reports near the citizen's current location in kilometers
  static List<ComprehensiveReportModel> filterReportsNearCitizen({
    required List<ComprehensiveReportModel> reports,
    required double citizenLatitude,
    required double citizenLongitude,
    double radiusKm = 10.0,
  }) {
    return filterReportsByRadius(
      reports: reports,
      centerLatitude: citizenLatitude,
      centerLongitude: citizenLongitude,
      radiusMeters: radiusKm * 1000.0,
    );
  }

  /// Generate a circular polygon coordinate ring [ [lng, lat], ... ] for GeoJSON rendering
  static List<List<double>> generateCirclePolygonCoordinates(
    double centerLatitude,
    double centerLongitude,
    double radiusMeters, {
    int numberOfPoints = 32,
  }) {
    final List<List<double>> coordinates = [];
    final double radiusInKm = radiusMeters / 1000.0;
    final double earthRadiusKm = earthRadiusMeters / 1000.0;

    final double latRad = _degreesToRadians(centerLatitude);
    final double lngRad = _degreesToRadians(centerLongitude);
    final double distRad = radiusInKm / earthRadiusKm;

    for (int i = 0; i <= numberOfPoints; i++) {
      final double bearing = (i * 360.0 / numberOfPoints) * (math.pi / 180.0);

      final double pointLatRad = math.asin(
        math.sin(latRad) * math.cos(distRad) +
            math.cos(latRad) * math.sin(distRad) * math.cos(bearing),
      );

      final double pointLngRad = lngRad +
          math.atan2(
            math.sin(bearing) * math.sin(distRad) * math.cos(latRad),
            math.cos(distRad) - math.sin(latRad) * math.sin(pointLatRad),
          );

      final double pointLat = _radiansToDegrees(pointLatRad);
      final double pointLng = _radiansToDegrees(pointLngRad);

      // GeoJSON requires [longitude, latitude]
      coordinates.add([pointLng, pointLat]);
    }

    return coordinates;
  }

  static double _degreesToRadians(double degrees) => degrees * (math.pi / 180.0);
  static double _radiansToDegrees(double radians) => radians * (180.0 / math.pi);
}
