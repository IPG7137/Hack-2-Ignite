import 'package:flutter_test/flutter_test.dart';
import 'package:civic_resolve/location_service.dart';
import 'package:civic_resolve/priority_engine.dart';
import 'package:civic_resolve/comprehensive_report_models.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('Round 2 P1: Location Context For Priority Tests', () {
    test('1. Structured LocationContext data model fields and serialization', () {
      final context = LocationContext.fromLocationString(
        'Western Express Highway, near Trauma Hospital, Andheri East, Mumbai',
        latitude: 19.1136,
        longitude: 72.8697,
        locality: 'Andheri East',
        city: 'Mumbai',
        state: 'Maharashtra',
      );

      expect(context.roadClass, equals('highway'));
      expect(context.trafficExposure, equals('high'));
      expect(context.nearbySensitiveZone, equals('hospital'));
      expect(context.infrastructureType, equals('healthcare'));
      expect(context.hasGps, isTrue);
      expect(context.confidence, greaterThan(0.8));

      final json = context.toJson();
      expect(json['road_class'], equals('highway'));
      expect(json['traffic_exposure'], equals('high'));
      expect(json['nearby_sensitive_zone'], equals('hospital'));
      expect(json['infrastructure_type'], equals('healthcare'));
      expect(json['source'], equals('landmark_ner'));
    });

    test('2. Highway location context elevates exposure on moderate road hazards', () {
      final highwayContext = LocationContext.fromLocationString('Mumbai-Pune Expressway, Bypass Road');

      final analysis = CivicPriorityEngine.evaluatePriority(
        severity: 'High',
        category: 'Roads & Potholes',
        title: 'Deep pothole on fast lane',
        description: 'Large pothole on highway causing vehicles to swerve at high speed.',
        relatedComplaintsCount: 1,
        createdAt: DateTime.now().subtract(const Duration(days: 2)),
        locationContext: highwayContext,
      );

      // Severity (80 * 0.30 = 24.0)
      // Public Safety on Highway (75 * 0.25 = 18.75)
      // Related (40 * 0.20 = 8.0)
      // Age (40 * 0.15 = 6.0)
      // Category (60 * 0.10 = 6.0)
      // Total = 62.75 -> High
      expect(analysis.score, closeTo(62.75, 0.1));
      expect(analysis.levelLabel, equals('High'));
      expect(analysis.locationContext, isNotNull);
      expect(analysis.locationContext!.roadClass, equals('highway'));
      expect(analysis.explainableReasons.any((r) => r.contains('Highway / expressway')), isTrue);

      final safetyFactor = analysis.factors.firstWhere((f) => f.key == 'public_safety');
      expect(safetyFactor.explanation, contains('High-exposure transit corridor'));
    });

    test('3. Quiet residential road maintains standard baseline without artificial inflation', () {
      final residentialContext = LocationContext.fromLocationString('Galli No. 4, Shanti Nagar Society, Colony Road');

      expect(residentialContext.roadClass, equals('residential_lane'));
      expect(residentialContext.trafficExposure, equals('low'));

      final analysis = CivicPriorityEngine.evaluatePriority(
        severity: 'Low',
        category: 'Waste Management',
        title: 'Litter on inner lane',
        description: 'Small dry garbage wrapper inside residential society.',
        relatedComplaintsCount: 0,
        createdAt: DateTime.now().subtract(const Duration(hours: 3)),
        locationContext: residentialContext,
      );

      // Severity (20 * 0.30 = 6.0)
      // Safety (25 * 0.25 = 6.25)
      // Related (0 * 0.20 = 0.0)
      // Age (15 * 0.15 = 2.25)
      // Category (45 * 0.10 = 4.5)
      // Total = 19.0 -> Low (< 35.0)
      expect(analysis.score, closeTo(19.0, 0.1));
      expect(analysis.levelLabel, equals('Low'));
      expect(analysis.explainableReasons.any((r) => r.contains('Residential lane')), isTrue);
    });

    test('4. School proximity context elevates awareness without making routine issues Critical', () {
      final schoolContext = LocationContext.fromLocationString('Near Saraswati Shala Vidyalaya, Station Road');

      expect(schoolContext.nearbySensitiveZone, equals('school'));
      expect(schoolContext.infrastructureType, equals('education'));

      // Routine minor issue near school
      final minorReportAnalysis = CivicPriorityEngine.evaluatePriority(
        severity: 'Low',
        category: 'Waste Management',
        title: 'Empty carton outside school boundary',
        description: 'Paper carton lying on sidewalk.',
        relatedComplaintsCount: 0,
        createdAt: DateTime.now().subtract(const Duration(hours: 2)),
        locationContext: schoolContext,
      );

      // Proportionality verification: Must NOT be Critical
      expect(minorReportAnalysis.levelLabel, isNot(equals('Critical')));
      expect(minorReportAnalysis.score, lessThan(40.0));
      expect(minorReportAnalysis.explainableReasons.any((r) => r.contains('School proximity')), isTrue);
    });

    test('5. Hospital proximity context raises safety baseline proportionally', () {
      final hospitalContext = LocationContext.fromLocationString('Opposite Civil Hospital Trauma Center');

      expect(hospitalContext.nearbySensitiveZone, equals('hospital'));
      expect(hospitalContext.infrastructureType, equals('healthcare'));

      final analysis = CivicPriorityEngine.evaluatePriority(
        severity: 'Medium',
        category: 'Roads & Potholes',
        title: 'Broken road surface near ambulance gate',
        description: 'Potholes delaying ambulance entry into hospital gate.',
        relatedComplaintsCount: 1,
        createdAt: DateTime.now().subtract(const Duration(days: 1)),
        locationContext: hospitalContext,
      );

      expect(analysis.explainableReasons.any((r) => r.contains('Hospital proximity')), isTrue);
      expect(analysis.factors.firstWhere((f) => f.key == 'public_safety').explanation,
          contains('Sensitive healthcare zone'));
      // Elevated to High due to ambulance exposure and moderate hazard
      expect(analysis.score, greaterThanOrEqualTo(50.0));
    });

    test('6. Unknown / missing context fallback does NOT break priority calculation or throw errors', () {
      // Missing context (null)
      final nullContextAnalysis = CivicPriorityEngine.evaluatePriority(
        severity: 'Medium',
        category: 'Electricity',
        title: 'Streetlight blinking',
        description: 'Light fixture intermittently flickering.',
        locationContext: null,
      );

      expect(nullContextAnalysis.score.isFinite, isTrue);
      expect(nullContextAnalysis.score, greaterThan(0.0));
      expect(nullContextAnalysis.locationContext, isNull);

      // Default / unknown context object
      const defaultCtx = LocationContext.defaultContext;
      expect(defaultCtx.roadClass, equals('unknown'));
      expect(defaultCtx.trafficExposure, equals('unknown'));
      expect(defaultCtx.nearbySensitiveZone, equals('unknown'));

      final defaultCtxAnalysis = CivicPriorityEngine.evaluatePriority(
        severity: 'Medium',
        category: 'Electricity',
        title: 'Streetlight blinking',
        description: 'Light fixture intermittently flickering.',
        locationContext: defaultCtx,
      );

      expect(defaultCtxAnalysis.score, equals(nullContextAnalysis.score));
      expect(defaultCtxAnalysis.score.isFinite, isTrue);
    });

    test('7. Severity vs Location Impact Distinction: Same pothole on Highway vs Residential Lane', () {
      const String title = 'Open pothole on road';
      const String desc = 'Deep hole on asphalt creating hazard for vehicles.';

      final highwayContext = LocationContext.fromLocationString('National Highway NH-48');
      final residentialContext = LocationContext.fromLocationString('Sector 4 Residential Society Lane');

      // Equal physical severity ('High' = 80.0)
      final highwayAnalysis = CivicPriorityEngine.evaluatePriority(
        severity: 'High',
        category: 'Roads & Potholes',
        title: title,
        description: desc,
        relatedComplaintsCount: 0,
        createdAt: DateTime.now().subtract(const Duration(days: 1)),
        locationContext: highwayContext,
      );

      final residentialAnalysis = CivicPriorityEngine.evaluatePriority(
        severity: 'High',
        category: 'Roads & Potholes',
        title: title,
        description: desc,
        relatedComplaintsCount: 0,
        createdAt: DateTime.now().subtract(const Duration(days: 1)),
        locationContext: residentialContext,
      );

      // Physical severity factor points must be IDENTICAL (24.0 pts)
      final highwaySeverityFactor = highwayAnalysis.factors.firstWhere((f) => f.key == 'severity');
      final resSeverityFactor = residentialAnalysis.factors.firstWhere((f) => f.key == 'severity');
      expect(highwaySeverityFactor.rawScore, equals(resSeverityFactor.rawScore));
      expect(highwaySeverityFactor.weightedPoints, equals(resSeverityFactor.weightedPoints));

      // But location exposure factor points on highway must be HIGHER than residential lane
      final highwaySafetyFactor = highwayAnalysis.factors.firstWhere((f) => f.key == 'public_safety');
      final resSafetyFactor = residentialAnalysis.factors.firstWhere((f) => f.key == 'public_safety');
      expect(highwaySafetyFactor.rawScore, greaterThan(resSafetyFactor.rawScore));
      expect(highwayAnalysis.score, greaterThan(residentialAnalysis.score));
    });

    test('8. Multilingual Marathi and Hindi Landmark Parsing', () {
      // Marathi Landmark
      final marathiHospital = LocationContext.fromLocationString('जिल्हा रुग्णालय परिसर, मुख्य रस्ता');
      expect(marathiHospital.nearbySensitiveZone, equals('hospital'));
      expect(marathiHospital.infrastructureType, equals('healthcare'));
      expect(marathiHospital.roadClass, equals('major_arterial'));

      final marathiSchool = LocationContext.fromLocationString('महात्मा फुले शाळा आणि कनिष्ठ महाविद्यालय, महामार्ग');
      expect(marathiSchool.nearbySensitiveZone, equals('school'));
      expect(marathiSchool.roadClass, equals('highway'));

      // Hindi Landmark
      final hindiHospital = LocationContext.fromLocationString('सरकारी अस्पताल के पास, हाईवे कट');
      expect(hindiHospital.nearbySensitiveZone, equals('hospital'));
      expect(hindiHospital.roadClass, equals('highway'));

      final hindiTransit = LocationContext.fromLocationString('रेलवे स्टेशन बस स्टैंड चौराहा');
      expect(hindiTransit.nearbySensitiveZone, equals('transit_hub'));
      expect(hindiTransit.infrastructureType, equals('transit'));
    });

    test('9. ComprehensiveReportModel auto-extracts LocationContext in evaluateReport', () {
      final report = ComprehensiveReportModel.fromJson({
        'id': 'rep-loc-01',
        'user_id': 'user-123',
        'title': 'Waterlogging near school entrance',
        'description': 'Drainage water overflowing outside school during morning hours.',
        'category': 'Drainage & Sewage',
        'location': 'Zilla Parishad High School, Main Road, Pune',
        'priority': 'medium',
        'status': 'in_progress',
        'created_at': DateTime.now().subtract(const Duration(days: 2)).toIso8601String(),
      });

      final analysis = CivicPriorityEngine.evaluateReport(report);

      expect(analysis.locationContext, isNotNull);
      expect(analysis.locationContext!.nearbySensitiveZone, equals('school'));
      expect(analysis.locationContext!.roadClass, equals('major_arterial'));
      expect(analysis.explainableReasons.any((r) => r.contains('School proximity')), isTrue);
    });
  });
}
