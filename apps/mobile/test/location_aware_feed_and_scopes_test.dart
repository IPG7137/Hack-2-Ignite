import 'package:flutter_test/flutter_test.dart';
import 'package:civic_resolve/location_service.dart';
import 'package:civic_resolve/comprehensive_report_models.dart';
import 'package:civic_resolve/comprehensive_database_service.dart';

void main() {
  group('Location Context & Dynamic Municipality Resolution Tests', () {
    test('LocationContext default fallback provides neutral municipal title and label', () {
      const context = LocationContext.defaultContext;
      expect(context.municipalityTitle, 'Municipal Grievance Redressal Portal');
      expect(context.currentAreaLabel, 'Location unavailable');
      expect(context.hasGps, isFalse);
      expect(context.source, 'fallback');
    });

    test('LocationService derives dynamic municipality title from city or district', () {
      final locService = LocationService.instance;
      // When GPS is resolved or simulated
      expect(locService.municipalityTitle.isNotEmpty, isTrue);
      expect(locService.currentAreaLabel.isNotEmpty, isTrue);
      // Ensure no hardcoded old municipality in default state
      expect(locService.municipalityTitle.toLowerCase().contains('solapur'), isFalse);
    });
  });

  group('Data Scopes Isolation Tests (Personal vs Community)', () {
    final reportUserA = ComprehensiveReportModel(
      id: '101',
      userId: 'citizen_user_aaa',
      title: 'Water pipe leakage on Main Road',
      description: 'Major leak causing flooding across the pedestrian path.',
      category: 'Water Supply',
      location: 'Main Road, Sector 4',
      latitude: 18.5204,
      longitude: 73.8567,
      imageUrls: [],
      status: ReportStatus.inProgress,
      priority: ReportPriority.high,
      createdAt: DateTime.now().subtract(const Duration(hours: 2)),
      updatedAt: DateTime.now(),
      lastStatusChange: DateTime.now(),
      consolidatedReports: 1,
      statusDisplay: 'In Progress',
      submittedTime: 'Today • 10:30',
      lastUpdatedTime: 'Today • 11:00',
      gpsDisplay: '18.5204, 73.8567',
      adminNotesCount: 0,
      supportCount: 8,
    );

    final reportUserB = ComprehensiveReportModel(
      id: '102',
      userId: 'citizen_user_bbb',
      title: 'Streetlight not functioning',
      description: 'Dark junction creating safety concerns at night.',
      category: 'Streetlights',
      location: 'Junction 12, Sector 5',
      latitude: 18.5220,
      longitude: 73.8580,
      imageUrls: [],
      status: ReportStatus.submitted,
      priority: ReportPriority.medium,
      createdAt: DateTime.now().subtract(const Duration(hours: 5)),
      updatedAt: DateTime.now(),
      lastStatusChange: DateTime.now(),
      consolidatedReports: 1,
      statusDisplay: 'Submitted',
      submittedTime: 'Today • 07:30',
      lastUpdatedTime: 'Today • 07:30',
      gpsDisplay: '18.5220, 73.8580',
      adminNotesCount: 0,
      supportCount: 3,
    );

    final distantSeededReport = ComprehensiveReportModel(
      id: '2',
      userId: 'old_seeded_user',
      title: 'Old Seeded Grievance from Distant Region',
      description: 'Sample seeded grievance record from 2026-09-14.',
      category: 'Roads & Potholes',
      location: 'Distant Municipal Ward, 300km away',
      latitude: 17.6599,
      longitude: 75.9064,
      imageUrls: [],
      status: ReportStatus.resolved,
      priority: ReportPriority.low,
      createdAt: DateTime(2026, 9, 14, 10, 0),
      updatedAt: DateTime(2026, 9, 14, 12, 0),
      lastStatusChange: DateTime(2026, 9, 14, 12, 0),
      consolidatedReports: 1,
      statusDisplay: 'Resolved',
      submittedTime: '14 Sep 2026 • 10:00',
      lastUpdatedTime: '14 Sep 2026 • 12:00',
      gpsDisplay: '17.6599, 75.9064',
      adminNotesCount: 0,
      supportCount: 1,
    );

    test('Fresh citizen sees 0 personal reports in My Complaints', () {
      final allReports = [reportUserA, reportUserB, distantSeededReport];
      const freshCitizenId = 'new_citizen_user_999';

      final myPersonalReports = allReports.where((r) => r.userId == freshCitizenId).toList();
      expect(myPersonalReports, isEmpty);
      expect(myPersonalReports.length, 0);
    });

    test('Authenticated user sees strictly their own reports in My Complaints', () {
      final allReports = [reportUserA, reportUserB, distantSeededReport];

      final userAReports = allReports.where((r) => r.userId == 'citizen_user_aaa').toList();
      expect(userAReports.length, 1);
      expect(userAReports.first.id, '101');
      expect(userAReports.first.title, 'Water pipe leakage on Main Road');

      final userBReports = allReports.where((r) => r.userId == 'citizen_user_bbb').toList();
      expect(userBReports.length, 1);
      expect(userBReports.first.id, '102');
    });

    test('Local Civic Feed filters out distant reports using GPS and radius', () {
      // User is at Sector 4 (18.5204, 73.8567) with 5km radius
      const userLat = 18.5204;
      const userLng = 73.8567;
      const radiusKm = 5.0;

      final allReports = [reportUserA, reportUserB, distantSeededReport];
      final nearbyReports = <ComprehensiveReportModel>[];

      for (final report in allReports) {
        if (report.latitude != null && report.longitude != null) {
          final distMeters = ComprehensiveDatabaseService.calculateDistanceMeters(
            userLat,
            userLng,
            report.latitude!,
            report.longitude!,
          );
          if (distMeters <= (radiusKm * 1000)) {
            nearbyReports.add(report);
          }
        }
      }

      // reportUserA (0m) and reportUserB (~200m) should be included
      expect(nearbyReports.length, 2);
      expect(nearbyReports.any((r) => r.id == '101'), isTrue);
      expect(nearbyReports.any((r) => r.id == '102'), isTrue);

      // Distant seeded record (~250km away) MUST NOT appear in 5km nearby feed
      expect(nearbyReports.any((r) => r.id == '2'), isFalse);
    });

    test('Category and Status filtering behaves correctly on feed records', () {
      final allReports = [reportUserA, reportUserB, distantSeededReport];

      // Filter by category: 'Water Supply'
      final waterReports = allReports.where((r) => r.category == 'Water Supply').toList();
      expect(waterReports.length, 1);
      expect(waterReports.first.id, '101');

      // Filter by status: 'Active' (submitted or in progress)
      final activeReports = allReports.where((r) =>
          r.status != ReportStatus.resolved && r.status != ReportStatus.closed).toList();
      expect(activeReports.length, 2);
      expect(activeReports.any((r) => r.id == '101'), isTrue);
      expect(activeReports.any((r) => r.id == '102'), isTrue);
    });
  });

  group('Complaint Card Fields & Descriptions Rendering Tests', () {
    test('ComprehensiveReportModel correctly stores and exposes citizen problem description', () {
      final report = ComprehensiveReportModel.fromJson({
        'id': '205',
        'user_id': 'user_xyz',
        'title': 'Dangerous Open Manhole',
        'description': 'Uncovered manhole near school gate posing immediate risk to pedestrians.',
        'category': 'Drainage',
        'priority': 'high',
        'status': 'in_progress',
        'location': 'School Lane, Ward 2',
        'latitude': 18.5300,
        'longitude': 73.8500,
        'support_count': 14,
        'user_has_supported': true,
        'created_at': DateTime.now().toIso8601String(),
      });

      expect(report.title, 'Dangerous Open Manhole');
      expect(report.description, 'Uncovered manhole near school gate posing immediate risk to pedestrians.');
      expect(report.priority, ReportPriority.high);
      expect(report.status, ReportStatus.inProgress);
      expect(report.supportCount, 14);
      expect(report.userHasSupported, isTrue);
      expect(report.location, 'School Lane, Ward 2');
    });

    test('Truthful fallback when citizen description is genuinely empty', () {
      final report = ComprehensiveReportModel.fromJson({
        'id': '206',
        'user_id': 'user_xyz',
        'title': 'Broken Streetlight',
        'description': '',
        'category': 'Streetlights',
        'status': 'submitted',
        'location': 'Market Road',
        'created_at': DateTime.now().toIso8601String(),
      });

      final displayDesc = report.description.trim().isNotEmpty
          ? report.description.trim()
          : 'No description provided.';
      expect(displayDesc, 'No description provided.');
    });
  });
}
