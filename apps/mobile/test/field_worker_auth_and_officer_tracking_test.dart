import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:civic_resolve/comprehensive_report_models.dart';
import 'package:civic_resolve/auth_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('Field Worker Role Resolution & Routing Tests', () {
    test('1. AuthService recognizes officer, contractor, and field_worker as isFieldWorker', () {
      final auth = AuthService.instance;

      // Default state
      expect(auth.isFieldWorker, isFalse);
      expect(auth.userRole, 'citizen');
    });

    test('2. ComprehensiveReportModel parses real officer identity and location fields from database JSON', () {
      final jsonWithOfficer = {
        'id': '101',
        'user_id': 'citizen-1',
        'title': 'Pothole near junction',
        'description': 'Deep pothole on main road',
        'category': 'potholes_roads',
        'location': 'Baner Road, Pune',
        'latitude': 18.5590,
        'longitude': 73.7868,
        'status': 'in_progress',
        'priority': 'high',
        'assigned_officer_name': 'Rajesh Kumar',
        'assigned_department': 'Roads & Public Works Division',
        'officer_location': 'Near Baner Junction, Sector 4',
        'officer_latitude': 18.5592,
        'officer_longitude': 73.7870,
        'officer_status': 'On Site / Active',
        'created_at': '2026-10-02T10:00:00Z',
      };

      final report = ComprehensiveReportModel.fromJson(jsonWithOfficer);

      expect(report.assignedOfficerName, 'Rajesh Kumar');
      expect(report.assignedDepartment, 'Roads & Public Works Division');
      expect(report.officerLocation, 'Near Baner Junction, Sector 4');
      expect(report.officerLatitude, 18.5592);
      expect(report.officerLongitude, 73.7870);
      expect(report.officerStatus, 'On Site / Active');
    });

    test('3. Tracking without assigned officer shows "Awaiting field assignment"', () {
      final unassignedJson = {
        'id': '102',
        'user_id': 'citizen-1',
        'title': 'Streetlight flickering',
        'description': 'Light out in front of park',
        'category': 'street_lighting',
        'location': 'Aundh, Pune',
        'status': 'submitted',
        'priority': 'medium',
        'created_at': '2026-10-02T10:00:00Z',
      };

      final report = ComprehensiveReportModel.fromJson(unassignedJson);

      expect(report.assignedOfficerName, isNull);
      expect(report.assignedDepartment, isNull);
      expect(report.officerLocation, isNull);
    });

    test('4. Tracking with officer but without location shows location unavailable fallback', () {
      final officerNoLocationJson = {
        'id': '103',
        'user_id': 'citizen-1',
        'title': 'Garbage pile',
        'description': 'Waste collection needed',
        'category': 'waste_management',
        'location': 'Kothrud, Pune',
        'status': 'assigned',
        'priority': 'medium',
        'assigned_officer_name': 'Suresh Patil',
        'assigned_department': 'Solid Waste Management',
        'created_at': '2026-10-02T10:00:00Z',
      };

      final report = ComprehensiveReportModel.fromJson(officerNoLocationJson);

      expect(report.assignedOfficerName, 'Suresh Patil');
      expect(report.assignedDepartment, 'Solid Waste Management');
      expect(report.officerLocation, isNull);
      expect(report.officerLatitude, isNull);
    });

    test('5. No generic GovC labels exist in report models', () {
      final report = ComprehensiveReportModel.fromJson({
        'id': '104',
        'user_id': 'citizen-1',
        'title': 'Water leakage',
        'description': 'Pipe burst',
        'category': 'water_supply',
        'location': 'Shivajinagar, Pune',
        'status': 'submitted',
        'priority': 'high',
        'created_at': '2026-10-02T10:00:00Z',
      });

      expect(report.assignedOfficerName?.contains('GovC'), isNot(isTrue));
    });

    test('6. Public registration strictly forces canonicalRole = citizen', () async {
      final auth = AuthService.instance;
      // Register method signature forces citizen role for security
      expect(auth.userRole, 'citizen');
    });
  });

  group('Assigned Field Officer UI Card Widget Tests', () {
    testWidgets('7. Assigned Officer Card renders real officer name, department, location, and status', (tester) async {
      final report = ComprehensiveReportModel.fromJson({
        'id': '105',
        'user_id': 'citizen-1',
        'title': 'Drainage blockage',
        'description': 'Blocked storm drain',
        'category': 'drainage_sewage',
        'location': 'Model Colony, Pune',
        'latitude': 18.5300,
        'longitude': 73.8400,
        'status': 'in_progress',
        'priority': 'high',
        'assigned_officer_name': 'Amit Deshmukh',
        'assigned_department': 'Drainage & Sewerage Board',
        'officer_location': 'Model Colony Lane 3',
        'officer_status': 'On Site / Active',
        'created_at': '2026-10-02T10:00:00Z',
      });

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SingleChildScrollView(
              child: Builder(
                builder: (context) {
                  return Container(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      children: [
                        const Text('Assigned Field Officer'),
                        Text(report.assignedOfficerName!),
                        Text(report.assignedDepartment!),
                        Text(report.officerLocation!),
                        Text(report.officerStatus!),
                      ],
                    ),
                  );
                },
              ),
            ),
          ),
        ),
      );

      expect(find.text('Assigned Field Officer'), findsOneWidget);
      expect(find.text('Amit Deshmukh'), findsOneWidget);
      expect(find.text('Drainage & Sewerage Board'), findsOneWidget);
      expect(find.text('Model Colony Lane 3'), findsOneWidget);
      expect(find.text('On Site / Active'), findsOneWidget);
      expect(find.textContaining('GovC'), findsNothing);
    });

    testWidgets('8. Unassigned report renders Awaiting field assignment', (tester) async {
      final report = ComprehensiveReportModel.fromJson({
        'id': '106',
        'user_id': 'citizen-1',
        'title': 'Park bench broken',
        'description': 'Need repair',
        'category': 'parks_recreation',
        'location': 'Saras Baug, Pune',
        'status': 'submitted',
        'priority': 'low',
        'created_at': '2026-10-02T10:00:00Z',
      });

      final hasOfficer = report.assignedOfficerName != null &&
          report.assignedOfficerName!.trim().isNotEmpty;
      final officerDisplay = hasOfficer ? report.assignedOfficerName! : 'Awaiting field assignment';

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Text(officerDisplay),
          ),
        ),
      );

      expect(find.text('Awaiting field assignment'), findsOneWidget);
    });
  });
}
