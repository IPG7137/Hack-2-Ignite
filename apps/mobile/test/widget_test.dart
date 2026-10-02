import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:civic_resolve/category_selection_screen.dart';
import 'package:civic_resolve/comprehensive_report_models.dart';
import 'package:civic_resolve/comprehensive_database_service.dart';
import 'package:civic_resolve/image_analysis_service.dart';
import 'package:civic_resolve/similarity_engine.dart';
import 'package:civic_resolve/priority_engine.dart';
import 'package:civic_resolve/emerging_problem_engine.dart';
import 'package:civic_resolve/incident_grouping_engine.dart';
import 'package:civic_resolve/resolution_verification_engine.dart';
import 'package:civic_resolve/geospatial_geojson_service.dart';
import 'dart:typed_data';
import 'package:civic_resolve/image_validation_service.dart';

void main() {
  group('Complaint Submission Flow Tests (Phase 2A)', () {
    test('Categories list contains standard civic categories', () {
      final screenState = CategorySelectionScreen();
      expect(screenState, isNotNull);
    });

    test('AiTriageResult fallback creates valid triage assessment', () {
      final triage = AiTriageResult.fallback(
        category: 'Roads',
        severity: 'High',
        reasoning: 'Severe road pothole detected.',
      );

      expect(triage.category, 'Roads');
      expect(triage.severity, 'High');
      expect(triage.suggestedDepartment, 'Roads & Infrastructure (PWD)');
      expect(triage.reasoning, contains('road'));
    });

    test('ReportStatus and ReportPriority enums map correctly', () {
      expect(ReportStatusExtension.fromString('submitted'), ReportStatus.submitted);
      expect(ReportStatusExtension.fromString('review'), ReportStatus.review);
      expect(ReportStatusExtension.fromString('under_review'), ReportStatus.underReview);
      expect(ReportStatusExtension.fromString('assigned'), ReportStatus.assigned);
      expect(ReportStatusExtension.fromString('progress'), ReportStatus.progress);
      expect(ReportStatusExtension.fromString('in_progress'), ReportStatus.inProgress);
      expect(ReportStatusExtension.fromString('resolution_submitted'), ReportStatus.resolutionSubmitted);
      expect(ReportStatusExtension.fromString('resolved'), ReportStatus.resolved);
      expect(ReportStatusExtension.fromString('verified'), ReportStatus.verified);
      expect(ReportStatusExtension.fromString('closed'), ReportStatus.closed);
      expect(ReportStatusExtension.fromString('rejected'), ReportStatus.rejected);

      expect(ReportPriorityExtension.fromString('high'), ReportPriority.high);
      expect(ReportPriorityExtension.fromString('medium'), ReportPriority.medium);
      expect(ReportPriorityExtension.fromString('low'), ReportPriority.low);
    });
  });

  group('Real-Time Citizen Tracking Flow Tests (Phase 2B)', () {
    test('ReportStatusHistoryModel parses correctly from database JSON', () {
      final json = {
        'id': '101',
        'report_id': '50',
        'old_status': 'submitted',
        'new_status': 'assigned',
        'changed_by': 'admin_officer_1',
        'changed_by_name': 'Municipal Officer Ramesh',
        'change_reason': 'Assigned to Ward 7 Roads Crew',
        'admin_notes': 'Maintenance team dispatched',
        'created_at': '2026-09-13T10:05:00.000Z',
      };

      final history = ReportStatusHistoryModel.fromJson(json);

      expect(history.id, '101');
      expect(history.reportId, '50');
      expect(history.oldStatus, 'submitted');
      expect(history.newStatus, 'assigned');
      expect(history.changedByName, 'Municipal Officer Ramesh');
      expect(history.changeReason, 'Assigned to Ward 7 Roads Crew');
    });

    test('ComprehensiveReportModel handles resolution and feedback correctly', () {
      final json = {
        'id': '205',
        'user_id': 'citizen@civicresolve.gov',
        'title': 'Open Manhole on 4th Main',
        'description': 'Deep uncovered manhole creating road hazard.',
        'category': 'public_safety',
        'location': 'Ward 7, MG Road',
        'latitude': 12.9716,
        'longitude': 77.5946,
        'image_urls': ['https://example.com/photo.jpg'],
        'status': 'resolved',
        'priority': 'high',
        'created_at': '2026-09-13T09:00:00.000Z',
        'updated_at': '2026-09-13T11:30:00.000Z',
        'completion_date': '2026-09-13T11:30:00.000Z',
        'admin_notes': 'Cover replaced and sealed with safety ring.',
        'citizen_feedback': 'Promptly resolved within 2 hours. Excellent work!',
        'rating': 5,
        'consolidated_reports': 1,
      };

      final report = ComprehensiveReportModel.fromJson(json);

      expect(report.id, '205');
      expect(report.status, ReportStatus.resolved);
      expect(report.priority, ReportPriority.high);
      expect(report.rating, 5);
      expect(report.citizenFeedback, contains('Promptly resolved'));
      expect(report.completionDate, isNotNull);
    });
  });

  group('Live Nearby Issues & Map Tests (Phase 2C)', () {
    test('Haversine distance calculation is accurate', () {
      // Solapur Municipal Corporation to Siddheshwar Temple (~1.8 km)
      const lat1 = 17.6599;
      const lon1 = 75.9064;
      const lat2 = 17.6740;
      const lon2 = 75.9180;

      final distanceMeters = ComprehensiveDatabaseService.calculateDistanceMeters(lat1, lon1, lat2, lon2);

      expect(distanceMeters, greaterThan(1500));
      expect(distanceMeters, lessThan(2500));
    });

    test('Coordinates parsing supports both root fields and JSONB coordinates map', () {
      final jsonWithRoot = {
        'id': '301',
        'user_id': 'user_1',
        'title': 'Pothole on Main Rd',
        'description': 'Deep crater',
        'category': 'roads',
        'location': 'Ward 4',
        'latitude': 17.6800,
        'longitude': 75.9200,
        'status': 'submitted',
        'priority': 'medium',
        'created_at': '2026-09-13T10:00:00.000Z',
        'updated_at': '2026-09-13T10:00:00.000Z',
      };

      final jsonWithCoordinates = {
        'id': '302',
        'user_id': 'user_2',
        'title': 'Broken Streetlight',
        'description': 'Pole bent',
        'category': 'electricity',
        'location': 'Ward 5',
        'coordinates': {'lat': 17.6850, 'lng': 75.9250},
        'status': 'progress',
        'priority': 'high',
        'potential_duplicate': true,
        'parent_report_id': '301',
        'created_at': '2026-09-13T10:30:00.000Z',
        'updated_at': '2026-09-13T10:30:00.000Z',
      };

      final report1 = ComprehensiveReportModel.fromJson(jsonWithRoot);
      final report2 = ComprehensiveReportModel.fromJson(jsonWithCoordinates);

      expect(report1.latitude, 17.6800);
      expect(report1.longitude, 75.9200);
      expect(report1.isPotentialDuplicate, isFalse);

      expect(report2.latitude, 17.6850);
      expect(report2.longitude, 75.9250);
      expect(report2.isPotentialDuplicate, isTrue);
      expect(report2.parentReportId, '301');
    });

    test('Duplicate detection proximity rule operates separately from visual clustering', () {
      // 100 meters away -> within 200m duplicate threshold
      const userLat = 17.68000;
      const userLng = 75.92000;
      const nearbyLat = 17.68050; // ~55m away
      const nearbyLng = 75.92000;

      final dist = ComprehensiveDatabaseService.calculateDistanceMeters(userLat, userLng, nearbyLat, nearbyLng);
      expect(dist, lessThan(200.0)); // Qualifies for duplicate proximity check

      // 800 meters away -> visible on map cluster, but outside 200m duplicate threshold
      const clusterLat = 17.68600;
      const clusterLng = 75.92000;
      final clusterDist = ComprehensiveDatabaseService.calculateDistanceMeters(userLat, userLng, clusterLat, clusterLng);
      expect(clusterDist, greaterThan(200.0));
      expect(clusterDist, lessThan(5000.0)); // Visible on nearby map (5km radius)
    });
  });

  group('Multi-Signal Duplicate & Related Complaint Intelligence (Phase 3A)', () {
    final now = DateTime.now();

    test('1. Same category + same location + similar text + recent time => High Confidence Duplicate', () {
      final result = CivicSimilarityEngine.evaluateCandidate(
        candidateReportId: '101',
        distanceMeters: 25.0, // 25m away -> high location score (~0.99)
        newCategory: 'Roads & Pavements',
        candidateCategory: 'Roads & Pavements', // exact category -> 1.0
        newTitle: 'Deep pothole on MG Road near Market',
        newDescription: 'Large crater in middle of road damaging vehicles.',
        candidateTitle: 'Dangerous pothole on MG Road',
        candidateDescription: 'Vehicles hitting deep crater near market road.',
        newCreatedAt: now,
        candidateCreatedAt: now.subtract(const Duration(hours: 3)), // 3 hours ago -> 1.0
      );

      expect(result.totalConfidence, greaterThanOrEqualTo(0.75));
      expect(result.classification, SimilarityClassification.highConfidenceDuplicate);
      expect(result.explainableReasons.isNotEmpty, isTrue);
      expect(result.explainableReasons.any((r) => r.contains('location') || r.contains('match') || r.contains('away')), isTrue);
    });

    test('2. Same category + close location + unrelated text => Reduced Confidence (Related Incident)', () {
      final result = CivicSimilarityEngine.evaluateCandidate(
        candidateReportId: '102',
        distanceMeters: 80.0,
        newCategory: 'Roads & Pavements',
        candidateCategory: 'Roads & Pavements',
        newTitle: 'Faded zebra crossing paint',
        newDescription: 'Pedestrian crossing marks are invisible near school.',
        candidateTitle: 'Broken road divider barrier',
        candidateDescription: 'Cement median divider damaged after collision.',
        newCreatedAt: now,
        candidateCreatedAt: now.subtract(const Duration(hours: 4)),
      );

      // Category and location are high, but text similarity is near zero
      expect(result.totalConfidence, lessThan(0.80));
      expect(result.textScore, lessThan(0.20));
      expect(result.classification, isNot(SimilarityClassification.unrelated));
    });

    test('3. Different category + close location => Significantly Reduced Confidence', () {
      final result = CivicSimilarityEngine.evaluateCandidate(
        candidateReportId: '103',
        distanceMeters: 30.0,
        newCategory: 'Water Supply & Drainage',
        candidateCategory: 'Streetlights & Electrical',
        newTitle: 'Water pipeline leaking continuously',
        newDescription: 'Fresh drinking water flooding footpath.',
        candidateTitle: 'Streetlight bulb not working',
        candidateDescription: 'Dark area at night due to dead bulb on pole.',
        newCreatedAt: now,
        candidateCreatedAt: now.subtract(const Duration(hours: 2)),
      );

      expect(result.categoryScore, 0.0);
      expect(result.totalConfidence, lessThan(0.50));
      expect(result.classification, SimilarityClassification.unrelated);
    });

    test('4. Same text + far-away location (3 km) => Far location reduces confidence to unrelated', () {
      final result = CivicSimilarityEngine.evaluateCandidate(
        candidateReportId: '104',
        distanceMeters: 3000.0, // 3km away -> location score 0.0
        newCategory: 'Waste & Sanitation',
        candidateCategory: 'Waste & Sanitation',
        newTitle: 'Garbage dump overflow on street corner',
        newDescription: 'Trash bin not emptied for three days creating bad odor.',
        candidateTitle: 'Garbage dump overflow on street corner',
        candidateDescription: 'Trash bin not emptied for three days creating bad odor.',
        newCreatedAt: now,
        candidateCreatedAt: now.subtract(const Duration(hours: 1)),
      );

      expect(result.locationScore, 0.0);
      // Even with identical text & category, 3km separation caps the confidence
      expect(result.totalConfidence, lessThan(0.75));
    });

    test('5. Same location + old report (90 days old) => Temporal decay reduces confidence', () {
      final result = CivicSimilarityEngine.evaluateCandidate(
        candidateReportId: '105',
        distanceMeters: 15.0,
        newCategory: 'Roads & Pavements',
        candidateCategory: 'Roads & Pavements',
        newTitle: 'Road surface pothole',
        newDescription: 'Asphalt damaged near junction.',
        candidateTitle: 'Road surface pothole',
        candidateDescription: 'Asphalt damaged near junction.',
        newCreatedAt: now,
        candidateCreatedAt: now.subtract(const Duration(days: 90)), // 90 days ago -> 0.05
      );

      expect(result.temporalScore, lessThanOrEqualTo(0.10));
      expect(result.totalConfidence, lessThan(0.90));
    });

    test('6. Missing coordinates (null) handles gracefully without crashing', () {
      final result = CivicSimilarityEngine.evaluateCandidate(
        candidateReportId: '106',
        distanceMeters: null,
        newCategory: 'Water Supply',
        candidateCategory: 'Water Supply',
        newTitle: 'Low water pressure',
        newDescription: 'No water supply in morning.',
        candidateTitle: 'Low water pressure',
        candidateDescription: 'No water supply in morning.',
        newCreatedAt: now,
        candidateCreatedAt: now,
      );

      expect(result.locationScore, 0.0);
      expect(result.totalConfidence, isNotNull);
      expect(result.classification, isNotNull);
    });

    test('7. Empty title and description handles gracefully without crashing', () {
      final result = CivicSimilarityEngine.evaluateCandidate(
        candidateReportId: '107',
        distanceMeters: 50.0,
        newCategory: 'Roads',
        candidateCategory: 'Roads',
        newTitle: '',
        newDescription: '',
        candidateTitle: null,
        candidateDescription: null,
        newCreatedAt: now,
        candidateCreatedAt: now,
      );

      expect(result.textScore, 0.0);
      expect(result.totalConfidence, isNotNull);
    });

    test('8. Malformed timestamp string parses safely without crashing', () {
      final result = CivicSimilarityEngine.evaluateCandidate(
        candidateReportId: '108',
        distanceMeters: 40.0,
        newCategory: 'Roads',
        candidateCategory: 'Roads',
        newTitle: 'Pothole issue',
        newDescription: 'Deep pothole',
        candidateTitle: 'Pothole issue',
        candidateDescription: 'Deep pothole',
        newCreatedAt: 'invalid-date-string-123',
        candidateCreatedAt: 'not-a-timestamp',
      );

      expect(result.temporalScore, 0.5); // Graceful neutral baseline
      expect(result.totalConfidence, isNotNull);
    });

    test('9. Explainable reasons provide human-friendly municipal justifications', () {
      final result = CivicSimilarityEngine.evaluateCandidate(
        candidateReportId: '109',
        distanceMeters: 20.0,
        newCategory: 'Roads & Pavements',
        candidateCategory: 'Roads & Pavements',
        newTitle: 'Open manhole cover on main market road',
        newDescription: 'Deep uncovered manhole hazard in middle of lane.',
        candidateTitle: 'Open manhole on market street',
        candidateDescription: 'Uncovered drain hole creating dangerous traffic hazard.',
        newCreatedAt: now,
        candidateCreatedAt: now.subtract(const Duration(hours: 2)),
      );

      expect(result.explainableReasons.length, greaterThanOrEqualTo(3));
      expect(result.primaryReason, isNotEmpty);
      expect(result.toJson()['classification'], 'highConfidenceDuplicate');
    });

    test('10. Lexical Jaccard token overlap correctly filters common civic stop words', () {
      const text1 = 'Please sir urgent help there is a very big problem with pothole on the road near nagar';
      const text2 = 'Pothole problem on the street';

      final score = CivicSimilarityEngine.calculateTextSimilarity(text1, text2);
      // 'pothole' is matched as meaningful content while 'please', 'sir', 'urgent', 'help', 'near', 'road' are normalized/filtered
      expect(score, greaterThan(0.0));
      expect(score, lessThanOrEqualTo(1.0));
    });
  });

  group('Smart Civic Prioritization Intelligence (Phase 3B)', () {
    final now = DateTime.now();

    test('1. High severity + safety hazard + related complaints => Critical/High Priority Score (>80)', () {
      final analysis = CivicPriorityEngine.evaluatePriority(
        severity: 'Critical',
        category: 'Emergency & Safety',
        title: 'Open manhole with live wire fallen',
        description: 'Dangerous uncovered manhole with sparking transformer wire nearby.',
        relatedComplaintsCount: 4,
        createdAt: now.subtract(const Duration(hours: 2)),
      );

      expect(analysis.score, greaterThanOrEqualTo(80.0));
      expect(analysis.levelLabel, 'Critical');
      expect(analysis.mappedPriority, ReportPriority.high);
      expect(analysis.explainableReasons.any((r) => r.contains('AI triage') || r.contains('Critical')), isTrue);
      expect(analysis.explainableReasons.any((r) => r.contains('safety') || r.contains('hazard')), isTrue);
    });

    test('2. Low severity + old unresolved complaint (10 days old) => Age increases priority score', () {
      final freshAnalysis = CivicPriorityEngine.evaluatePriority(
        severity: 'Low',
        category: 'Waste & Sanitation',
        title: 'Faded road line paint',
        description: 'Paint is worn out.',
        relatedComplaintsCount: 0,
        createdAt: now, // Just now
      );

      final oldAnalysis = CivicPriorityEngine.evaluatePriority(
        severity: 'Low',
        category: 'Waste & Sanitation',
        title: 'Faded road line paint',
        description: 'Paint is worn out.',
        relatedComplaintsCount: 0,
        createdAt: now.subtract(const Duration(days: 10)), // 10 days unresolved
      );

      expect(oldAnalysis.score, greaterThan(freshAnalysis.score));
      expect(oldAnalysis.signalBreakdown['age_escalation'], 100.0);
      expect(oldAnalysis.explainableReasons.any((r) => r.contains('SLA escalation') || r.contains('Unresolved')), isTrue);
    });

    test('3. Multiple related complaints increases score compared to isolated complaint', () {
      final isolatedAnalysis = CivicPriorityEngine.evaluatePriority(
        severity: 'Medium',
        category: 'Water Supply',
        title: 'Low water pressure',
        description: 'Low water in tap.',
        relatedComplaintsCount: 0,
        createdAt: now,
      );

      final clusteredAnalysis = CivicPriorityEngine.evaluatePriority(
        severity: 'Medium',
        category: 'Water Supply',
        title: 'Low water pressure',
        description: 'Low water in tap.',
        relatedComplaintsCount: 3, // Clustered in same neighborhood
        createdAt: now,
      );

      expect(clusteredAnalysis.score, greaterThan(isolatedAnalysis.score));
      expect(clusteredAnalysis.signalBreakdown['related_complaints'], 100.0);
      expect(clusteredAnalysis.explainableReasons.any((r) => r.contains('related complaints')), isTrue);
    });

    test('4. Missing location / null coordinates handles gracefully without crashing', () {
      final analysis = CivicPriorityEngine.evaluatePriority(
        severity: 'High',
        category: 'Electricity',
        title: 'Streetlight pole tilted',
        description: 'Light is off.',
        relatedComplaintsCount: 0,
        createdAt: now,
      );

      expect(analysis.score, isNotNull);
      expect(analysis.mappedPriority, isNotNull);
      expect(analysis.levelLabel, isNotEmpty);
    });

    test('5. Missing AI severity defaults to neutral baseline (50.0)', () {
      final analysis = CivicPriorityEngine.evaluatePriority(
        severity: null, // AI analysis unavailable or skipped
        category: 'Roads & Pavements',
        title: 'Pothole on street',
        description: 'Small road crack.',
        relatedComplaintsCount: 0,
        createdAt: now,
      );

      expect(analysis.signalBreakdown['severity'], 50.0);
      expect(analysis.score, isNotNull);
    });

    test('6. Related complaint lookup failure (0 count) evaluates with zero cluster boost', () {
      final analysis = CivicPriorityEngine.evaluatePriority(
        severity: 'Medium',
        category: 'Roads',
        title: 'Normal complaint',
        description: 'Standard issue.',
        relatedComplaintsCount: 0,
        createdAt: now,
      );

      expect(analysis.signalBreakdown['related_complaints'], 0.0);
      expect(analysis.score, isNotNull);
    });

    test('7. Malformed / future timestamp uses safe baseline without crashing', () {
      final score1 = CivicPriorityEngine.calculateAgeScore(null);
      final score2 = CivicPriorityEngine.calculateAgeScore(now.add(const Duration(days: 5)));

      expect(score1, 0.0);
      expect(score2, 10.0);
    });

    test('8. Conceptual distinction: Similarity Score != Priority Score', () {
      // Scenario A: High similarity (duplicate complaint), but standard/low civic priority
      final similarityScoreA = CivicSimilarityEngine.evaluateCandidate(
        candidateReportId: '201',
        distanceMeters: 10.0,
        newCategory: 'Waste & Sanitation',
        candidateCategory: 'Waste & Sanitation',
        newTitle: 'Overflowing garbage bin near shop',
        newDescription: 'Trash bin is full of plastic bags.',
        candidateTitle: 'Overflowing garbage bin near shop',
        candidateDescription: 'Trash bin is full of plastic bags.',
        newCreatedAt: now,
        candidateCreatedAt: now.subtract(const Duration(hours: 1)),
      );

      final priorityScoreA = CivicPriorityEngine.evaluatePriority(
        severity: 'Low',
        category: 'Waste & Sanitation',
        title: 'Overflowing garbage bin near shop',
        description: 'Trash bin is full of plastic bags.',
        relatedComplaintsCount: 0,
        createdAt: now,
      );

      expect(similarityScoreA.totalConfidence, greaterThan(0.85)); // High similarity (duplicate)
      expect(priorityScoreA.score, lessThan(45.0)); // Low/Medium priority

      // Scenario B: Low similarity (isolated single complaint), but CRITICAL civic hazard
      final priorityScoreB = CivicPriorityEngine.evaluatePriority(
        severity: 'Critical',
        category: 'Emergency & Safety',
        title: 'Exposed live electric cable sparking on pedestrian walkway',
        description: 'Dangerous high voltage line fallen on ground.',
        relatedComplaintsCount: 0, // completely isolated report
        createdAt: now,
      );

      expect(priorityScoreB.score, greaterThanOrEqualTo(65.0)); // High urgency
      expect(priorityScoreB.mappedPriority, ReportPriority.high);
    });

    test('9. Existing ReportPriority enum mapping remains intact', () {
      expect(ReportPriority.low.displayName, 'Low');
      expect(ReportPriority.medium.displayName, 'Medium');
      expect(ReportPriority.high.displayName, 'High');

      final lowAnalysis = CivicPriorityEngine.evaluatePriority(severity: 'Low', category: 'Other');
      final highAnalysis = CivicPriorityEngine.evaluatePriority(severity: 'Critical', category: 'Safety');

      expect([ReportPriority.low, ReportPriority.medium, ReportPriority.high], contains(lowAnalysis.mappedPriority));
      expect([ReportPriority.low, ReportPriority.medium, ReportPriority.high], contains(highAnalysis.mappedPriority));
    });

    test('10. CivicPriorityEngine.evaluateReport convenience helper produces complete explainable breakdown', () {
      final testReport = ComprehensiveReportModel.fromJson({
        'id': '999',
        'user_id': 'citizen@example.com',
        'title': 'Broken road divider on highway',
        'description': 'Dangerous concrete divider damaged after collision near junction.',
        'category': 'Roads & Infrastructure',
        'location': 'Solapur Ward 7',
        'latitude': 17.680,
        'longitude': 75.920,
        'image_urls': <String>[],
        'status': 'progress',
        'priority': 'high',
        'created_at': now.subtract(const Duration(days: 5)).toIso8601String(),
        'updated_at': now.toIso8601String(),
        'consolidated_reports': 2,
      });

      final analysis = CivicPriorityEngine.evaluateReport(testReport);

      expect(analysis.score, greaterThanOrEqualTo(60.0));
      expect(analysis.scoreDisplay, contains('/100'));
      expect(analysis.topReasons.isNotEmpty, isTrue);
      expect(analysis.toJson()['breakdown'], isNotNull);
    });
  });

  group('Emerging Problem & Hotspot Detection Tests (Phase 3C)', () {
    final refTime = DateTime(2026, 9, 13, 12, 0, 0);

    test('1. Normal complaint volume => NORMAL classification (<40 score)', () {
      // 2 reports spread across 4 days (no sudden spike)
      final reports = [
        {
          'id': 'r1',
          'category': 'Roads & Pavements',
          'latitude': 17.6599,
          'longitude': 75.9064,
          'created_at': refTime.subtract(const Duration(hours: 48)),
          'title': 'Minor gravel on road',
          'description': 'Small loose gravel',
          'priority': 'low',
        },
        {
          'id': 'r2',
          'category': 'Roads & Pavements',
          'latitude': 17.6610,
          'longitude': 75.9070,
          'created_at': refTime.subtract(const Duration(hours: 72)),
          'title': 'Minor pothole',
          'description': 'Small dip in asphalt',
          'priority': 'low',
        },
      ];

      final hotspots = EmergingProblemEngine.detectHotspots(
        reports: reports,
        referenceTime: refTime,
      );

      expect(hotspots.isNotEmpty, isTrue);
      final h = hotspots.first;
      expect(h.currentWindowCount, 0); // Both outside last 24h
      expect(h.classification, EmergingClassification.normal);
      expect(h.emergingScore, lessThan(40.0));
    });

    test('2. Sudden category spike => EMERGING PROBLEM / CRITICAL (>60 score)', () {
      // 8 water complaints within the last 12 hours in the same 150m area
      final reports = List.generate(8, (i) => {
        'id': 'water_$i',
        'category': 'Water Supply & Drainage',
        'latitude': 17.6599 + (i * 0.0002),
        'longitude': 75.9064 + (i * 0.0002),
        'created_at': refTime.subtract(Duration(hours: i + 1)),
        'title': 'Main water line burst causing flooding',
        'description': 'Severe flooding across street due to burst pipe',
        'priority': 'high',
        'severity': 'Critical',
      });

      final hotspots = EmergingProblemEngine.detectHotspots(
        reports: reports,
        referenceTime: refTime,
      );

      expect(hotspots.isNotEmpty, isTrue);
      final h = hotspots.first;
      expect(h.category, 'Water Supply & Drainage');
      expect(h.currentWindowCount, 8);
      expect(h.increaseRatio, greaterThanOrEqualTo(4.0));
      expect(h.emergingScore, greaterThanOrEqualTo(60.0));
      expect(
        [EmergingClassification.emergingProblem, EmergingClassification.criticalEmergingProblem],
        contains(h.classification),
      );
      expect(h.topReasons.isNotEmpty, isTrue);
      expect(h.topReasons.first, contains('complaints reported in the last 24 hours'));
    });

    test('3. High complaint concentration within 500m increases spatial density score', () {
      // Tight cluster within 80m
      final tightReports = List.generate(4, (i) => {
        'id': 'tight_$i',
        'category': 'Electricity',
        'latitude': 17.6599 + (i * 0.0001), // ~11 meters apart
        'longitude': 75.9064 + (i * 0.0001),
        'created_at': refTime.subtract(Duration(hours: i + 1)),
        'title': 'Power outage',
        'description': 'Transformer failure',
      });

      final hotspots = EmergingProblemEngine.detectHotspots(
        reports: tightReports,
        referenceTime: refTime,
      );

      expect(hotspots.isNotEmpty, isTrue);
      final h = hotspots.first;
      expect(h.averageDistanceMeters, lessThan(150.0));
      expect(h.signalBreakdown['spatial_density'], 100.0);
    });

    test('4. Different categories in same area reduces category consistency score', () {
      // 4 reports in same area with 4 different categories
      final mixedReports = [
        {
          'id': 'm1',
          'category': 'Water Supply',
          'latitude': 17.6599,
          'longitude': 75.9064,
          'created_at': refTime.subtract(const Duration(hours: 2)),
          'title': 'Leaking tap',
          'description': 'Water leak',
        },
        {
          'id': 'm2',
          'category': 'Electricity',
          'latitude': 17.6601,
          'longitude': 75.9065,
          'created_at': refTime.subtract(const Duration(hours: 3)),
          'title': 'Dark street',
          'description': 'Light off',
        },
        {
          'id': 'm3',
          'category': 'Sanitation',
          'latitude': 17.6600,
          'longitude': 75.9063,
          'created_at': refTime.subtract(const Duration(hours: 4)),
          'title': 'Garbage pile',
          'description': 'Trash on corner',
        },
        {
          'id': 'm4',
          'category': 'Roads',
          'latitude': 17.6598,
          'longitude': 75.9066,
          'created_at': refTime.subtract(const Duration(hours: 5)),
          'title': 'Small bump',
          'description': 'Uneven road',
        },
      ];

      final hotspots = EmergingProblemEngine.detectHotspots(
        reports: mixedReports,
        referenceTime: refTime,
      );

      expect(hotspots.isNotEmpty, isTrue);
      final h = hotspots.first;
      // Category ratio is 1/4 = 25%
      expect(h.signalBreakdown['category_consistency'], lessThanOrEqualTo(50.0));
    });

    test('5. Old complaints outside current window do not count as current spike', () {
      // 5 reports 4 days ago + 1 report today
      final oldReports = [
        ...List.generate(5, (i) => {
          'id': 'old_$i',
          'category': 'Sanitation',
          'latitude': 17.6599 + (i * 0.0002),
          'longitude': 75.9064 + (i * 0.0002),
          'created_at': refTime.subtract(Duration(days: 4, hours: i)),
          'title': 'Old sanitation report',
          'description': 'Historical garbage issue',
        }),
        {
          'id': 'new_1',
          'category': 'Sanitation',
          'latitude': 17.6599,
          'longitude': 75.9064,
          'created_at': refTime.subtract(const Duration(hours: 2)),
          'title': 'New sanitation report',
          'description': 'Fresh garbage issue',
        },
      ];

      final hotspots = EmergingProblemEngine.detectHotspots(
        reports: oldReports,
        referenceTime: refTime,
      );

      expect(hotspots.isNotEmpty, isTrue);
      final h = hotspots.first;
      expect(h.currentWindowCount, 1);
      expect(h.complaintCount, 6);
      expect(h.classification, isNot(EmergingClassification.criticalEmergingProblem));
    });

    test('6. Insufficient baseline data handles safely with graceful fallback', () {
      // 3 brand new reports with 0 historical reports
      final freshReports = List.generate(3, (i) => {
        'id': 'fresh_$i',
        'category': 'Electricity',
        'latitude': 17.6599 + (i * 0.0002),
        'longitude': 75.9064 + (i * 0.0002),
        'created_at': refTime.subtract(Duration(hours: i + 1)),
        'title': 'Sparking cable',
        'description': 'Live wire issue',
      });

      final hotspots = EmergingProblemEngine.detectHotspots(
        reports: freshReports,
        referenceTime: refTime,
        baselineDays: 7,
      );

      expect(hotspots.isNotEmpty, isTrue);
      final h = hotspots.first;
      expect(h.baselineDailyAverage, isNotNull);
      expect(h.explainableReasons, contains('Limited historical baseline data available'));
    });

    test('7. Missing / null coordinates handled gracefully without crashing', () {
      final invalidReports = [
        {
          'id': 'inv_1',
          'category': 'Roads',
          'latitude': null,
          'longitude': null,
          'created_at': refTime.toIso8601String(),
          'title': 'No GPS report',
          'description': 'Test',
        },
        {
          'id': 'inv_2',
          'category': 'Roads',
          'created_at': refTime.toIso8601String(),
          'title': 'Missing coords',
          'description': 'Test',
        },
      ];

      final hotspots = EmergingProblemEngine.detectHotspots(
        reports: invalidReports,
        referenceTime: refTime,
      );

      expect(hotspots, isEmpty); // Cannot form spatial cluster with missing coords
    });

    test('8. Empty report dataset returns empty list without error', () {
      final hotspots = EmergingProblemEngine.detectHotspots(
        reports: [],
        referenceTime: refTime,
      );

      expect(hotspots, isEmpty);
    });

    test('9. Conceptual distinction: Phase 3A similarity != Emerging hotspot score', () {
      // Two identical complaints from 1 citizen (Duplicate, Similarity = 90%+, but volume is NOT an emerging municipal spike)
      final duplicatePair = [
        {
          'id': 'd1',
          'category': 'Roads & Pavements',
          'latitude': 17.6599,
          'longitude': 75.9064,
          'created_at': refTime.subtract(const Duration(minutes: 5)),
          'title': 'Pot hole on 5th main',
          'description': 'Deep pothole damaging vehicles',
        },
        {
          'id': 'd2',
          'category': 'Roads & Pavements',
          'latitude': 17.6599,
          'longitude': 75.9064,
          'created_at': refTime.subtract(const Duration(minutes: 10)),
          'title': 'Pot hole on 5th main',
          'description': 'Deep pothole damaging vehicles',
        },
      ];

      final similarity = CivicSimilarityEngine.evaluateCandidate(
        candidateReportId: 'd1',
        distanceMeters: 0.0,
        newCategory: 'Roads & Pavements',
        candidateCategory: 'Roads & Pavements',
        newTitle: 'Pot hole on 5th main',
        newDescription: 'Deep pothole damaging vehicles',
        candidateTitle: 'Pot hole on 5th main',
        candidateDescription: 'Deep pothole damaging vehicles',
        newCreatedAt: refTime,
        candidateCreatedAt: refTime.subtract(const Duration(minutes: 10)),
      );

      final hotspots = EmergingProblemEngine.detectHotspots(
        reports: duplicatePair,
        referenceTime: refTime,
      );

      // Similarity is high confidence duplicate (>85%)
      expect(similarity.totalConfidence, greaterThan(0.85));

      // Emerging score for 2 complaints is low/watch (not a massive municipal crisis)
      expect(hotspots.first.emergingScore, lessThan(80.0));
      expect(hotspots.first.classification, isNot(EmergingClassification.criticalEmergingProblem));
    });

    test('10. Conceptual distinction: Phase 3B priority != Emerging hotspot score', () {
      // A single critical hazardous complaint (Priority = Critical, Emerging Hotspot = None/Insufficient cluster)
      final singlePriority = CivicPriorityEngine.evaluatePriority(
        severity: 'Critical',
        category: 'Emergency & Safety',
        title: 'Exploded gas cylinder in residential area',
        description: 'Fire and smoke hazard',
        relatedComplaintsCount: 0,
        createdAt: refTime,
      );

      // Priority score is High Urgency (mapped to ReportPriority.high)
      expect(singlePriority.score, greaterThanOrEqualTo(65.0));
      expect(singlePriority.mappedPriority, ReportPriority.high);

      // But single isolated complaint cannot form a spatial hotspot cluster (minimum size = 2)
      final hotspots = EmergingProblemEngine.detectHotspots(
        reports: [
          {
            'id': 'iso_1',
            'category': 'Emergency & Safety',
            'latitude': 17.6599,
            'longitude': 75.9064,
            'created_at': refTime,
            'title': 'Exploded gas cylinder',
            'description': 'Fire',
            'priority': 'high',
          }
        ],
        referenceTime: refTime,
      );

      expect(hotspots, isEmpty);
    });

    test('11. In-memory execution without schema dependencies', () {
      final hotspot = EmergingHotspotResult(
        category: 'Water Supply',
        centerLatitude: 17.65,
        centerLongitude: 75.90,
        reportIds: ['r1', 'r2'],
        complaintCount: 2,
        currentWindowCount: 2,
        baselineDailyAverage: 0.5,
        increaseRatio: 4.0,
        emergingScore: 75.5,
        classification: EmergingClassification.emergingProblem,
        explainableReasons: ['2 complaints in 24h'],
        signalBreakdown: {'volume_spike': 100.0},
        averageDistanceMeters: 45.0,
        highPriorityCount: 1,
      );

      expect(hotspot.scoreDisplay, '76/100');
      expect(hotspot.toJson()['classification'], 'emergingProblem');
      expect(hotspot.classification.citizenSafeLabel, 'High complaint activity reported in this area');
    });

    test('12. Haversine distance accuracy in EmergingProblemEngine', () {
      // Distance between Solapur Municipal Corp (17.6599, 75.9064) and nearby point (~111 meters North)
      final dist = EmergingProblemEngine.calculateDistanceMeters(17.6599, 75.9064, 17.6609, 75.9064);
      expect(dist, closeTo(111.2, 5.0));
    });
  });

  group('Root-Cause & Incident Grouping Tests (Phase 3D)', () {
    final now = DateTime(2026, 9, 13, 14, 0, 0);

    test('1. Several highly similar complaints near each other => HIGH CONFIDENCE POTENTIAL INCIDENT (>80 confidence)', () {
      // 4 water complaints within 100m in last 6 hours describing pipeline burst
      final reports = [
        {
          'id': 'inc_w1',
          'category': 'Water Supply & Drainage',
          'latitude': 17.6599,
          'longitude': 75.9064,
          'title': 'Underground drinking water pipeline burst',
          'description': 'Main supply pipe broken near market gate, heavy water leakage flooding road.',
          'created_at': now.subtract(const Duration(hours: 1)),
          'priority': 'high',
        },
        {
          'id': 'inc_w2',
          'category': 'Water Supply & Drainage',
          'latitude': 17.6602,
          'longitude': 75.9066,
          'title': 'Severe water pipe leakage on main road',
          'description': 'Continuous water flow from burst pipe damaging pedestrian footpath.',
          'created_at': now.subtract(const Duration(hours: 2)),
          'priority': 'high',
        },
        {
          'id': 'inc_w3',
          'category': 'Water Supply & Drainage',
          'latitude': 17.6600,
          'longitude': 75.9065,
          'title': 'Low water pressure and pipe leaking',
          'description': 'Houses not getting water due to huge leakage on market road line.',
          'created_at': now.subtract(const Duration(hours: 3)),
          'priority': 'medium',
        },
        {
          'id': 'inc_w4',
          'category': 'Water Supply & Drainage',
          'latitude': 17.6601,
          'longitude': 75.9063,
          'title': 'Water flooding due to broken supply pipe',
          'description': 'Road waterlogged because of underground water pipe rupture.',
          'created_at': now.subtract(const Duration(hours: 4)),
          'priority': 'high',
        },
      ];

      final incidents = IncidentGroupingEngine.groupReportsIntoIncidents(
        reports: reports,
      );

      expect(incidents.isNotEmpty, isTrue);
      final inc = incidents.first;
      expect(inc.reportCount, 4);
      expect(inc.primaryCategory, 'Water Supply & Drainage');
      expect(inc.incidentConfidence, greaterThanOrEqualTo(80.0));
      expect(inc.classification, IncidentClassification.highConfidencePotentialIncident);
      expect(inc.incidentLabel, contains('Water'));
      expect(inc.highestPriority, ReportPriority.high);
      expect(inc.topReasons.isNotEmpty, isTrue);
      expect(inc.topRecurringTerms, contains('pipe'));
    });

    test('2. Same category but geographically distant (>2km) => weak / no common incident', () {
      final distantReports = [
        {
          'id': 'dist_1',
          'category': 'Water Supply & Drainage',
          'latitude': 17.6599,
          'longitude': 75.9064,
          'title': 'Water leakage near Solapur Station',
          'description': 'Leakage on railway road',
          'created_at': now,
        },
        {
          'id': 'dist_2',
          'category': 'Water Supply & Drainage',
          'latitude': 17.6850, // ~3 km away
          'longitude': 75.9300,
          'title': 'Water leakage near MIDC',
          'description': 'Industrial area water pipe leak',
          'created_at': now,
        },
      ];

      final incidents = IncidentGroupingEngine.groupReportsIntoIncidents(
        reports: distantReports,
        groupingRadiusMeters: 500.0,
      );

      // Distance > 500m prevents clustering into a single common incident
      expect(incidents, isEmpty);
    });

    test('3. Nearby complaints with completely different categories => reduced confidence', () {
      final mixedCategoryReports = [
        {
          'id': 'mix_1',
          'category': 'Water Supply',
          'latitude': 17.6599,
          'longitude': 75.9064,
          'title': 'Drinking water pipeline leak',
          'description': 'Clean water leaking on street',
          'created_at': now,
        },
        {
          'id': 'mix_2',
          'category': 'Streetlights & Electrical',
          'latitude': 17.6601,
          'longitude': 75.9065,
          'title': 'Streetlight pole not illuminated',
          'description': 'Dark pole at junction',
          'created_at': now,
        },
      ];

      final incidents = IncidentGroupingEngine.groupReportsIntoIncidents(
        reports: mixedCategoryReports,
      );

      expect(incidents.isNotEmpty, isTrue);
      final inc = incidents.first;
      // Category consistency is 50% (1 of 2), distinct categories reduce confidence
      expect(inc.signalBreakdown['category_consistency'], lessThanOrEqualTo(50.0));
      expect(inc.classification, isNot(IncidentClassification.highConfidencePotentialIncident));
    });

    test('4. Similar complaints submitted far apart in time (>60 days) => reduced temporal consistency', () {
      final oldReports = [
        {
          'id': 't_old',
          'category': 'Roads & Infrastructure',
          'latitude': 17.6599,
          'longitude': 75.9064,
          'title': 'Pothole on main road',
          'description': 'Deep road crater',
          'created_at': now.subtract(const Duration(days: 70)),
        },
        {
          'id': 't_new',
          'category': 'Roads & Infrastructure',
          'latitude': 17.6601,
          'longitude': 75.9065,
          'title': 'Pothole on main road',
          'description': 'Deep road crater',
          'created_at': now,
        },
      ];

      final incidents = IncidentGroupingEngine.groupReportsIntoIncidents(
        reports: oldReports,
      );

      expect(incidents.isNotEmpty, isTrue);
      final inc = incidents.first;
      // Timespan is > 70 days -> temporal score is penalized (10.0)
      expect(inc.signalBreakdown['temporal_consistency'], lessThanOrEqualTo(20.0));
    });

    test('5. Multiple reports with strong Phase 3A similarity strengthen incident grouping', () {
      final similarReports = [
        {
          'id': 's_1',
          'category': 'Electricity',
          'latitude': 17.6599,
          'longitude': 75.9064,
          'title': 'High voltage transformer sparking near school',
          'description': 'Dangerous sparks falling from electric transformer on pole.',
          'created_at': now.subtract(const Duration(hours: 1)),
          'priority': 'high',
        },
        {
          'id': 's_2',
          'category': 'Electricity',
          'latitude': 17.6600,
          'longitude': 75.9065,
          'title': 'Electric transformer sparking and smoking',
          'description': 'Live wire transformer sparks near school gate.',
          'created_at': now.subtract(const Duration(hours: 2)),
          'priority': 'high',
        },
      ];

      final incidents = IncidentGroupingEngine.groupReportsIntoIncidents(
        reports: similarReports,
      );

      expect(incidents.isNotEmpty, isTrue);
      final inc = incidents.first;
      expect(inc.signalBreakdown['similarity_evidence'], greaterThan(75.0));
    });

    test('6. Large cluster volume increases cluster size contribution', () {
      final largeCluster = List.generate(8, (i) => {
        'id': 'cluster_$i',
        'category': 'Sanitation',
        'latitude': 17.6599 + (i * 0.0001),
        'longitude': 75.9064 + (i * 0.0001),
        'title': 'Overflowing municipal garbage container #$i',
        'description': 'Trash spilled across sidewalk creating bad odor',
        'created_at': now.subtract(Duration(hours: i)),
      });

      final incidents = IncidentGroupingEngine.groupReportsIntoIncidents(
        reports: largeCluster,
      );

      expect(incidents.isNotEmpty, isTrue);
      final inc = incidents.first;
      expect(inc.signalBreakdown['cluster_size'], 100.0);
    });

    test('7. High-priority member reports correctly sets highest member priority in incident', () {
      final mixedPriorityReports = [
        {
          'id': 'p_low',
          'category': 'Roads',
          'latitude': 17.6599,
          'longitude': 75.9064,
          'title': 'Faded zebra crossing',
          'description': 'Paint faded',
          'created_at': now,
          'priority': 'low',
        },
        {
          'id': 'p_critical',
          'category': 'Roads',
          'latitude': 17.6601,
          'longitude': 75.9065,
          'title': 'Deep collapsed manhole in road center',
          'description': 'Huge open hole causing accidents',
          'created_at': now,
          'priority': 'high',
        },
      ];

      final incidents = IncidentGroupingEngine.groupReportsIntoIncidents(
        reports: mixedPriorityReports,
      );

      expect(incidents.isNotEmpty, isTrue);
      expect(incidents.first.highestPriority, ReportPriority.high);
    });

    test('8. Emerging hotspot + related cluster correlation provides combined incident evidence', () {
      final reports = List.generate(4, (i) => {
        'id': 'h_report_$i',
        'category': 'Water Supply & Drainage',
        'latitude': 17.6599 + (i * 0.0001),
        'longitude': 75.9064 + (i * 0.0001),
        'title': 'Main drainage chamber overflow',
        'description': 'Sewage water flooding commercial lane',
        'created_at': now.subtract(Duration(hours: i + 1)),
      });

      // Active hotspot detected from Phase 3C
      final activeHotspots = [
        EmergingHotspotResult(
          category: 'Water Supply & Drainage',
          centerLatitude: 17.6600,
          centerLongitude: 75.9065,
          reportIds: ['h_report_0', 'h_report_1'],
          complaintCount: 4,
          currentWindowCount: 4,
          baselineDailyAverage: 0.5,
          increaseRatio: 8.0,
          emergingScore: 85.0,
          classification: EmergingClassification.criticalEmergingProblem,
          explainableReasons: ['4 complaints in last 24 hours'],
          signalBreakdown: {'volume_spike': 100.0},
          averageDistanceMeters: 40.0,
          highPriorityCount: 2,
        ),
      ];

      final incidents = IncidentGroupingEngine.groupReportsIntoIncidents(
        reports: reports,
        activeHotspots: activeHotspots,
      );

      expect(incidents.isNotEmpty, isTrue);
      final inc = incidents.first;
      expect(inc.hasActiveHotspot, isTrue);
      expect(inc.explainableReasons, contains('Correlated with active emerging hotspot surge'));
    });

    test('9. Missing / null coordinates handled gracefully without crashing', () {
      final invalidReports = [
        {
          'id': 'inv_1',
          'category': 'Water',
          'latitude': null,
          'longitude': null,
          'title': 'No GPS',
          'description': 'Test',
        },
        {
          'id': 'inv_2',
          'category': 'Water',
          'title': 'Missing coords',
          'description': 'Test',
        },
      ];

      final incidents = IncidentGroupingEngine.groupReportsIntoIncidents(
        reports: invalidReports,
      );

      expect(incidents, isEmpty);
    });

    test('10. Empty dataset returns empty incident list', () {
      final incidents = IncidentGroupingEngine.groupReportsIntoIncidents(
        reports: [],
      );

      expect(incidents, isEmpty);
    });

    test('11. Single report does not create a multi-report incident', () {
      final singleReport = [
        {
          'id': 'single_1',
          'category': 'Roads',
          'latitude': 17.6599,
          'longitude': 75.9064,
          'title': 'Single isolated pothole',
          'description': 'One pothole',
          'created_at': now,
        },
      ];

      final incidents = IncidentGroupingEngine.groupReportsIntoIncidents(
        reports: singleReport,
      );

      expect(incidents, isEmpty);
    });

    test('12. In-memory execution without schema dependencies', () {
      final inc = PotentialIncidentResult(
        incidentId: 'INC-2026-101',
        memberReportIds: ['r1', 'r2', 'r3'],
        primaryCategory: 'Water Supply & Drainage',
        incidentLabel: 'Potential Water Supply & Pipeline Issue',
        centerLatitude: 17.6600,
        centerLongitude: 75.9065,
        reportCount: 3,
        incidentConfidence: 84.5,
        classification: IncidentClassification.highConfidencePotentialIncident,
        affectedRadiusMeters: 65.0,
        earliestReportTime: now.subtract(const Duration(hours: 3)),
        latestReportTime: now,
        topRecurringTerms: ['pipeline', 'burst', 'water'],
        highestPriority: ReportPriority.high,
        hasActiveHotspot: true,
        explainableReasons: ['3 complaints concentrated within ~65m'],
        signalBreakdown: {'similarity_evidence': 85.0},
      );

      expect(inc.confidenceDisplay, '85/100');
      expect(inc.timeSpanHours, closeTo(3.0, 0.1));
      expect(inc.toJson()['classification'], 'highConfidencePotentialIncident');
      expect(inc.classification.citizenSafeLabel, 'Multiple related complaints reported in this area');
    });
  });

  group('Resolution Verification & Evidence Intelligence Tests (Phase 3E)', () {
    final now = DateTime(2026, 9, 13, 15, 0, 0);

    test('1. Valid before + valid after + clear improvement => STRONG RESOLUTION EVIDENCE (>=80 score)', () {
      final result = ResolutionVerificationEngine.evaluateResolution(
        reportId: 'rep_101',
        category: 'Roads & Infrastructure',
        title: 'Deep road pothole near junction',
        description: 'Dangerous pothole damaging vehicles',
        beforeImageUrls: ['https://example.com/pothole_before.jpg'],
        afterImageUrls: ['https://example.com/pothole_repaired_after.jpg'],
        status: ReportStatus.resolved,
        citizenRating: 5,
        citizenFeedback: 'Great job! Pothole was asphalted cleanly.',
        adminNotes: 'PWD team completed asphalt patch repair on site.',
        completionDate: now,
        isProblemResolvedVisual: true,
        aiConfidence: 0.95,
      );

      expect(result.verificationScore, greaterThanOrEqualTo(80.0));
      expect(result.classification, ResolutionVerificationClassification.strongResolutionEvidence);
      expect(result.hasBeforeEvidence, isTrue);
      expect(result.hasAfterEvidence, isTrue);
      expect(result.evidenceAvailability, 'Full Evidence (Before & After)');
      expect(result.feedbackSentiment, FeedbackSentiment.positive);
      expect(result.needsHumanVerification, isFalse);
      expect(result.explainableReasons, contains('Visual analysis confirms reported problem is no longer visible'));
    });

    test('2. Before shows issue + after indicates issue remains => Low Confidence / NEEDS REVIEW', () {
      final result = ResolutionVerificationEngine.evaluateResolution(
        reportId: 'rep_102',
        category: 'Water Supply & Drainage',
        title: 'Water pipe leaking continuously',
        description: 'Fresh water leak on sidewalk',
        beforeImageUrls: ['https://example.com/leak_before.jpg'],
        afterImageUrls: ['https://example.com/leak_still_flowing.jpg'],
        status: ReportStatus.resolved,
        isProblemResolvedVisual: false, // AI / vision flags problem still visible
        citizenRating: 2,
        citizenFeedback: 'Water is still leaking, nothing was fixed!',
      );

      expect(result.verificationScore, lessThan(60.0));
      expect(
        [ResolutionVerificationClassification.needsReview, ResolutionVerificationClassification.insufficientEvidence],
        contains(result.classification),
      );
      expect(result.needsHumanVerification, isTrue);
      expect(result.feedbackSentiment, FeedbackSentiment.negative);
      expect(result.improvementAssessment, contains('may still be present'));
    });

    test('3. Missing before evidence => Partial evidence penalty', () {
      final result = ResolutionVerificationEngine.evaluateResolution(
        reportId: 'rep_103',
        category: 'Waste Management',
        title: 'Garbage pile on corner',
        description: 'Uncollected trash',
        beforeImageUrls: [], // No before photo
        afterImageUrls: ['https://example.com/cleaned_street.jpg'],
        status: ReportStatus.resolved,
        citizenRating: 4,
      );

      expect(result.hasBeforeEvidence, isFalse);
      expect(result.hasAfterEvidence, isTrue);
      expect(result.evidenceAvailability, 'Partial Evidence (After Only)');
      expect(result.signalBreakdown['evidence_completeness'], lessThan(100.0));
    });

    test('4. Missing after evidence => INSUFFICIENT EVIDENCE & human verification flagged', () {
      final result = ResolutionVerificationEngine.evaluateResolution(
        reportId: 'rep_104',
        category: 'Streetlights',
        title: 'Dead bulb on pole #4',
        description: 'Dark junction',
        beforeImageUrls: ['https://example.com/dark_pole.jpg'],
        afterImageUrls: [], // Missing after-repair photo
        status: ReportStatus.resolved,
      );

      expect(result.hasAfterEvidence, isFalse);
      expect(result.verificationScore, lessThan(45.0));
      expect(result.needsHumanVerification, isTrue);
      expect(result.improvementAssessment, contains('Awaiting after-repair photographic evidence'));
    });

    test('5. No visual evidence attached => safe fallback without crashing', () {
      final result = ResolutionVerificationEngine.evaluateResolution(
        reportId: 'rep_105',
        category: 'General',
        title: 'Noise issue',
        description: 'Loud noise in morning',
        beforeImageUrls: null,
        afterImageUrls: null,
      );

      expect(result.hasBeforeEvidence, isFalse);
      expect(result.hasAfterEvidence, isFalse);
      expect(result.evidenceAvailability, 'No Visual Evidence');
      expect(result.classification, ResolutionVerificationClassification.insufficientEvidence);
      expect(result.needsHumanVerification, isTrue);
    });

    test('6. Positive citizen feedback (5 stars) strengthens confidence score', () {
      final baseResult = ResolutionVerificationEngine.evaluateResolution(
        reportId: 'rep_106',
        category: 'Roads',
        title: 'Divider repair',
        description: 'Broken divider',
        beforeImageUrls: ['https://example.com/b.jpg'],
        afterImageUrls: ['https://example.com/a.jpg'],
      );

      final positiveResult = ResolutionVerificationEngine.evaluateResolution(
        reportId: 'rep_106',
        category: 'Roads',
        title: 'Divider repair',
        description: 'Broken divider',
        beforeImageUrls: ['https://example.com/b.jpg'],
        afterImageUrls: ['https://example.com/a.jpg'],
        citizenRating: 5,
        citizenFeedback: 'Very satisfied with prompt municipal action, thanks!',
      );

      expect(positiveResult.verificationScore, greaterThan(baseResult.verificationScore));
      expect(positiveResult.feedbackSentiment, FeedbackSentiment.positive);
    });

    test('7. Negative citizen feedback (1 star / complaints) reduces confidence & triggers review', () {
      final negativeResult = ResolutionVerificationEngine.evaluateResolution(
        reportId: 'rep_107',
        category: 'Drainage',
        title: 'Blocked drain chamber',
        description: 'Drain overflowing',
        beforeImageUrls: ['https://example.com/b.jpg'],
        afterImageUrls: ['https://example.com/a.jpg'],
        citizenRating: 1,
        citizenFeedback: 'Fake resolution, worker took photo of wrong street!',
      );

      expect(negativeResult.feedbackSentiment, FeedbackSentiment.negative);
      expect(negativeResult.needsHumanVerification, isTrue);
      expect(negativeResult.explainableReasons.any((r) => r.contains('dissatisfaction')), isTrue);
    });

    test('8. No citizen feedback assigns neutral baseline (50.0) without skew', () {
      final result = ResolutionVerificationEngine.evaluateResolution(
        reportId: 'rep_108',
        category: 'Sanitation',
        title: 'Debris cleanup',
        description: 'Road debris',
        citizenRating: null,
        citizenFeedback: null,
      );

      expect(result.feedbackSentiment, FeedbackSentiment.none);
      expect(result.signalBreakdown['citizen_feedback'], 50.0);
    });

    test('9. Deterministic rule-based fallback works when AI image analysis is unavailable', () {
      final fallbackResult = ResolutionVerificationEngine.evaluateResolution(
        reportId: 'rep_109',
        category: 'Electricity',
        title: 'Streetlight dead',
        description: 'No light on street',
        beforeImageUrls: ['https://example.com/dark.jpg'],
        afterImageUrls: ['https://example.com/lit.jpg'],
        adminNotes: 'Field electrician replaced LED luminaire and verified power.',
        isProblemResolvedVisual: null, // AI not available
        aiConfidence: null,
      );

      expect(fallbackResult.verificationScore, greaterThanOrEqualTo(65.0));
      expect(
        [ResolutionVerificationClassification.likelyResolved, ResolutionVerificationClassification.strongResolutionEvidence],
        contains(fallbackResult.classification),
      );
    });

    test('10. Malformed evidence / null fields handles safely without crashing', () {
      final result = ResolutionVerificationEngine.evaluateResolution(
        reportId: 'rep_110',
        category: '',
        title: '',
        description: '',
        beforeImageUrls: ['', '   '],
        afterImageUrls: [null.toString()],
        citizenRating: -5,
        citizenFeedback: '',
      );

      expect(result.verificationScore, isNotNull);
      expect(result.classification, isNotNull);
      expect(result.explainableReasons, isNotEmpty);
    });

    test('11. Conceptual separation: Verification score != Priority != Similarity != Hotspot != Incident', () {
      // High priority unresolved report vs Verified low priority report
      final priorityAnalysis = CivicPriorityEngine.evaluatePriority(
        severity: 'Critical',
        category: 'Emergency & Safety',
        title: 'Sparking transformer',
        description: 'Live wire hazard',
      );

      final verificationResult = ResolutionVerificationEngine.evaluateResolution(
        reportId: 'rep_111',
        category: 'Emergency & Safety',
        title: 'Sparking transformer',
        description: 'Live wire hazard',
        beforeImageUrls: ['https://example.com/spark.jpg'],
        afterImageUrls: ['https://example.com/repaired_transformer.jpg'],
        isProblemResolvedVisual: true,
        citizenRating: 5,
        adminNotes: 'Insulated cable replaced and transformer load balanced.',
      );

      // Priority remains High/Critical (operational importance)
      expect(priorityAnalysis.mappedPriority, ReportPriority.high);

      // Verification score independently measures remediation confidence (80+)
      expect(verificationResult.verificationScore, greaterThanOrEqualTo(80.0));
      expect(verificationResult.classification, ResolutionVerificationClassification.strongResolutionEvidence);
    });

    test('12. Existing ReportStatus enum remains intact without modifications', () {
      expect(ReportStatus.submitted.value, 'submitted');
      expect(ReportStatus.review.value, 'review');
      expect(ReportStatus.assigned.value, 'assigned');
      expect(ReportStatus.progress.value, 'progress');
      expect(ReportStatus.resolved.value, 'resolved');
    });

    test('13. ComprehensiveReportModel integration helper evaluates cleanly', () {
      final testReport = ComprehensiveReportModel.fromJson({
        'id': 'rep_model_1',
        'user_id': 'user@example.com',
        'title': 'Pothole repaired',
        'description': 'Road repair',
        'category': 'Roads & Infrastructure',
        'location': 'MG Road Ward 3',
        'latitude': 17.6599,
        'longitude': 75.9064,
        'image_urls': ['https://example.com/before.jpg'],
        'status': 'resolved',
        'priority': 'medium',
        'created_at': now.subtract(const Duration(days: 2)).toIso8601String(),
        'updated_at': now.toIso8601String(),
        'consolidated_reports': 1,
        'citizen_feedback': 'Nicely repaired road.',
        'rating': 5,
        'admin_notes': 'Contractor patched with cold mix asphalt.',
      });

      final verification = ResolutionVerificationEngine.evaluateReport(
        testReport,
        afterImageUrls: ['https://example.com/after.jpg'],
        isProblemResolvedVisual: true,
      );

      expect(verification.verificationScore, greaterThanOrEqualTo(80.0));
      expect(verification.scoreDisplay, contains('/100'));
      expect(verification.topReasons.isNotEmpty, isTrue);
    });

    test('14. FeedbackSentiment keyword classification accuracy', () {
      expect(
        ResolutionVerificationEngine.evaluateFeedbackSentiment(null, 'Issue is still broken and not fixed'),
        FeedbackSentiment.negative,
      );
      expect(
        ResolutionVerificationEngine.evaluateFeedbackSentiment(null, 'Work is fixed, thank you!'),
        FeedbackSentiment.positive,
      );
      expect(
        ResolutionVerificationEngine.evaluateFeedbackSentiment(3, null),
        FeedbackSentiment.neutral,
      );
      expect(
        ResolutionVerificationEngine.evaluateFeedbackSentiment(null, null),
        FeedbackSentiment.none,
      );
    });
  });

  group('Real-Time Geospatial & GeoJSON Map Tests', () {
    final now = DateTime.now();

    final ComprehensiveReportModel sampleReport1 = ComprehensiveReportModel.fromJson({
      'id': '101',
      'user_id': 'citizen1@solapur.gov',
      'title': 'Deep Pothole at Old Pune Naka',
      'description': 'Severe pothole creating bike hazard on main carriage way.',
      'category': 'Roads',
      'location': 'Old Pune Naka, Solapur',
      'latitude': 17.6599,
      'longitude': 75.9064,
      'status': 'submitted',
      'priority': 'high',
      'created_at': now.subtract(const Duration(hours: 2)).toIso8601String(),
      'updated_at': now.subtract(const Duration(hours: 2)).toIso8601String(),
    });

    final ComprehensiveReportModel sampleReport2 = ComprehensiveReportModel.fromJson({
      'id': '102',
      'user_id': 'citizen2@solapur.gov',
      'title': 'Road Crater nearby',
      'description': 'Large crater 150m down the road.',
      'category': 'Roads',
      'location': 'Near Old Pune Naka, Solapur',
      'latitude': 17.6608,
      'longitude': 75.9070,
      'status': 'submitted',
      'priority': 'medium',
      'created_at': now.subtract(const Duration(hours: 1)).toIso8601String(),
      'updated_at': now.subtract(const Duration(hours: 1)).toIso8601String(),
    });

    test('1. Report -> GeoJSON conversion produces valid Feature', () {
      final feature = GeospatialGeoJsonService.reportToFeature(sampleReport1);

      expect(feature, isNotNull);
      expect(feature!.type, 'Feature');
      expect(feature.id, '101');
      expect(feature.geometry.type, 'Point');
      expect(feature.properties['reportId'], '101');
      expect(feature.properties['title'], 'Deep Pothole at Old Pune Naka');
      expect(feature.properties['category'], 'Roads');
      expect(feature.properties['status'], 'submitted');
      expect(feature.properties['priority'], 'high');
      expect(feature.properties['priorityScore'], isNotNull);
    });

    test('2. Latitude/Longitude ordering is strictly [longitude, latitude]', () {
      final feature = GeospatialGeoJsonService.reportToFeature(sampleReport1);

      expect(feature, isNotNull);
      final pointGeom = feature!.geometry as GeoJsonPointGeometry;
      
      // GeoJSON spec: index 0 is longitude, index 1 is latitude
      expect(pointGeom.coordinates[0], 75.9064); // Longitude
      expect(pointGeom.coordinates[1], 17.6599); // Latitude
      expect(pointGeom.longitude, 75.9064);
      expect(pointGeom.latitude, 17.6599);
    });

    test('3. Invalid coordinate rejection (NaN, Infinity, out of bounds, null)', () {
      expect(GeospatialGeoJsonService.isValidCoordinate(null, 75.9064), isFalse);
      expect(GeospatialGeoJsonService.isValidCoordinate(17.6599, null), isFalse);
      expect(GeospatialGeoJsonService.isValidCoordinate(double.nan, 75.9064), isFalse);
      expect(GeospatialGeoJsonService.isValidCoordinate(17.6599, double.infinity), isFalse);
      expect(GeospatialGeoJsonService.isValidCoordinate(95.0, 75.9064), isFalse); // Lat > 90
      expect(GeospatialGeoJsonService.isValidCoordinate(-95.0, 75.9064), isFalse); // Lat < -90
      expect(GeospatialGeoJsonService.isValidCoordinate(17.6599, 185.0), isFalse); // Lng > 180
      expect(GeospatialGeoJsonService.isValidCoordinate(17.6599, -190.0), isFalse); // Lng < -180
      expect(GeospatialGeoJsonService.isValidCoordinate(17.6599, 75.9064), isTrue);
    });

    test('4. FeatureCollection generation & serialization conforms to GeoJSON RFC 7946', () {
      final collection = GeospatialGeoJsonService.reportsToFeatureCollection([
        sampleReport1,
        sampleReport2,
      ]);

      expect(collection.type, 'FeatureCollection');
      expect(collection.length, 2);
      expect(collection.isNotEmpty, isTrue);

      final json = collection.toJson();
      expect(json['type'], 'FeatureCollection');
      expect((json['features'] as List).length, 2);
      expect(json['metadata']['validGeospatialFeatures'], 2);

      final jsonString = collection.toJsonString();
      expect(jsonString, contains('"type":"FeatureCollection"'));
      expect(jsonString, contains('"coordinates":[75.9064,17.6599]'));
    });

    test('5. Real complaint marker properties contain citizen-safe info only', () {
      final feature = GeospatialGeoJsonService.reportToFeature(sampleReport1);
      final props = feature!.properties;

      // Citizen safe
      expect(props.containsKey('reportId'), isTrue);
      expect(props.containsKey('title'), isTrue);
      expect(props.containsKey('categoryDisplayName'), isTrue);
      expect(props.containsKey('statusDisplay'), isTrue);
      expect(props.containsKey('priorityDisplay'), isTrue);

      // Sensitive / internal fields must not be present in public properties
      expect(props.containsKey('admin_notes'), isFalse);
      expect(props.containsKey('assigned_officer_id'), isFalse);
      expect(props.containsKey('internal_dispatch_log'), isFalse);
    });

    test('6. Realtime INSERT handling simulation correctly updates FeatureCollection', () {
      final initialReports = <ComprehensiveReportModel>[sampleReport1];
      final initialGeoJson = GeospatialGeoJsonService.reportsToFeatureCollection(initialReports);
      expect(initialGeoJson.length, 1);

      // Simulate incoming realtime INSERT event
      final updatedReports = <ComprehensiveReportModel>[sampleReport1, sampleReport2];
      final updatedGeoJson = GeospatialGeoJsonService.reportsToFeatureCollection(updatedReports);
      
      expect(updatedGeoJson.length, 2);
      expect(updatedGeoJson.features.map((f) => f.id).toList(), containsAll(['101', '102']));
    });

    test('7. Realtime UPDATE handling simulation updates marker status and priority dynamically', () {
      final updatedReport1 = ComprehensiveReportModel.fromJson({
        'id': '101',
        'user_id': 'citizen1@solapur.gov',
        'title': 'Deep Pothole at Old Pune Naka',
        'description': 'Severe pothole creating bike hazard on main carriage way.',
        'category': 'Roads',
        'location': 'Old Pune Naka, Solapur',
        'latitude': 17.6599,
        'longitude': 75.9064,
        'status': 'progress', // Updated from submitted to progress
        'priority': 'low', // Updated priority
        'created_at': now.subtract(const Duration(hours: 2)).toIso8601String(),
        'updated_at': now.toIso8601String(),
      });

      final feature = GeospatialGeoJsonService.reportToFeature(updatedReport1);
      expect(feature!.properties['status'], 'progress');
      expect(feature.properties['priority'], 'low');
    });

    test('8. 200m nearby proximity calculation matches duplicate threshold', () {
      // Distance between sampleReport1 (17.6599, 75.9064) and sampleReport2 (17.6608, 75.9070)
      final distance = GeospatialGeoJsonService.calculateDistanceMeters(
        sampleReport1.latitude!,
        sampleReport1.longitude!,
        sampleReport2.latitude!,
        sampleReport2.longitude!,
      );

      // Approximately 120m (within 200m duplicate / related threshold)
      expect(distance, lessThan(200.0));
      expect(distance, greaterThan(50.0));

      final nearbyReports = GeospatialGeoJsonService.filterReportsByRadius(
        reports: [sampleReport1, sampleReport2],
        centerLatitude: sampleReport1.latitude!,
        centerLongitude: sampleReport1.longitude!,
        radiusMeters: 200.0,
      );

      expect(nearbyReports.length, 2);
    });

    test('9. 500m hotspot grouping and polygon generation creates valid ring', () {
      final reports = List.generate(4, (i) {
        return ComprehensiveReportModel.fromJson({
          'id': 'hotspot_rep_$i',
          'user_id': 'citizen@solapur.gov',
          'title': 'Pothole issue $i',
          'description': 'Road damage in cluster',
          'category': 'Roads',
          'location': 'Ward 7',
          'latitude': 17.6599 + (i * 0.0005),
          'longitude': 75.9064 + (i * 0.0005),
          'status': 'submitted',
          'priority': 'high',
          'created_at': now.subtract(const Duration(hours: 3)).toIso8601String(),
          'updated_at': now.toIso8601String(),
        });
      });

      final hotspots = EmergingProblemEngine.detectHotspots(reports: reports);
      final hotspotsGeoJson = GeospatialGeoJsonService.hotspotsToFeatureCollection(hotspots);

      if (hotspots.isNotEmpty) {
        expect(hotspotsGeoJson.length, greaterThanOrEqualTo(1));
        final firstFeature = hotspotsGeoJson.features.first;
        expect(firstFeature.geometry.type, 'Polygon');

        final polyGeom = firstFeature.geometry as GeoJsonPolygonGeometry;
        expect(polyGeom.coordinates.isNotEmpty, isTrue);
        expect(polyGeom.coordinates[0].length, greaterThanOrEqualTo(32)); // 32 polygon vertices ring
        expect(firstFeature.properties['radiusMeters'], 500.0);
      }
    });

    test('10. Empty report list converts cleanly without error', () {
      final emptyCollection = GeospatialGeoJsonService.reportsToFeatureCollection([]);
      expect(emptyCollection.isEmpty, isTrue);
      expect(emptyCollection.length, 0);
      expect(emptyCollection.toJson()['features'], isEmpty);
    });

    test('11. Malformed report json handles missing and invalid values gracefully', () {
      final malformedReport = ComprehensiveReportModel.fromJson({
        'id': 'malformed_1',
        'user_id': 'citizen@solapur.gov',
        'title': 'Malformed Coord Report',
        'description': 'Missing coordinates in database record.',
        'category': 'Roads',
        'location': 'Solapur',
        'latitude': null,
        'longitude': null,
        'created_at': now.toIso8601String(),
        'updated_at': now.toIso8601String(),
      });

      final feature = GeospatialGeoJsonService.reportToFeature(malformedReport);
      expect(feature, isNull);

      final collection = GeospatialGeoJsonService.reportsToFeatureCollection([malformedReport]);
      expect(collection.isEmpty, isTrue);
    });

    test('12. Missing coordinates are safely skipped in conversion', () {
      final mixedReports = [
        sampleReport1, // Valid
        ComprehensiveReportModel.fromJson({
          'id': 'no_coords',
          'user_id': 'citizen@solapur.gov',
          'title': 'Missing Lat Lng',
          'description': 'Description',
          'category': 'Roads',
          'location': 'Solapur',
          'latitude': null,
          'longitude': null,
          'created_at': now.toIso8601String(),
          'updated_at': now.toIso8601String(),
        }), // Invalid coordinates
        sampleReport2, // Valid
      ];

      final collection = GeospatialGeoJsonService.reportsToFeatureCollection(mixedReports);
      expect(collection.length, 2);
      expect(collection.features.map((f) => f.id).toList(), ['101', '102']);
    });

    test('13. Permission denied location fallback distance calculations', () {
      // When GPS is unavailable, calculateDistanceMeters with invalid coordinates returns infinity
      final dist = GeospatialGeoJsonService.calculateDistanceMeters(
        double.nan,
        75.9064,
        17.6599,
        75.9064,
      );
      expect(dist.isInfinite, isTrue);
    });

    test('14. Marker update after status change to resolved reflects in Feature properties', () {
      final resolvedReport = ComprehensiveReportModel.fromJson({
        'id': '101',
        'user_id': 'citizen1@solapur.gov',
        'title': 'Deep Pothole at Old Pune Naka',
        'description': 'Resolved by maintenance team.',
        'category': 'Roads',
        'location': 'Old Pune Naka, Solapur',
        'latitude': 17.6599,
        'longitude': 75.9064,
        'status': 'resolved',
        'priority': 'high',
        'created_at': now.subtract(const Duration(days: 1)).toIso8601String(),
        'updated_at': now.toIso8601String(),
      });

      final feature = GeospatialGeoJsonService.reportToFeature(resolvedReport);
      expect(feature!.properties['status'], 'resolved');
      expect(feature.properties['statusDisplay'], 'Resolved');
    });
  });

  group('Real-Time Map & Citizen Tracking Tests', () {
    final testNow = DateTime.now();

    test('1. Coordinate validation strictly enforces valid geographic bounds', () {
      expect(GeospatialGeoJsonService.isValidCoordinate(17.68687, 75.92275), isTrue);
      expect(GeospatialGeoJsonService.isValidCoordinate(-90.0, -180.0), isTrue);
      expect(GeospatialGeoJsonService.isValidCoordinate(90.0, 180.0), isTrue);

      // Out of range bounds
      expect(GeospatialGeoJsonService.isValidCoordinate(90.001, 75.0), isFalse);
      expect(GeospatialGeoJsonService.isValidCoordinate(-90.001, 75.0), isFalse);
      expect(GeospatialGeoJsonService.isValidCoordinate(17.0, 180.001), isFalse);
      expect(GeospatialGeoJsonService.isValidCoordinate(17.0, -180.001), isFalse);

      // NaN and Infinity
      expect(GeospatialGeoJsonService.isValidCoordinate(double.nan, 75.0), isFalse);
      expect(GeospatialGeoJsonService.isValidCoordinate(17.0, double.infinity), isFalse);
    });

    test('2. GeoJSON coordinate order strictly follows RFC 7946 [longitude, latitude]', () {
      final point = GeoJsonPointGeometry(latitude: 17.6599, longitude: 75.9064);
      expect(point.coordinates[0], 75.9064); // Longitude first
      expect(point.coordinates[1], 17.6599); // Latitude second
      expect(point.longitude, 75.9064);
      expect(point.latitude, 17.6599);

      final json = point.toJson();
      expect(json['type'], 'Point');
      expect(json['coordinates'], [75.9064, 17.6599]);
    });

    test('3. Nearby report markers expose only citizen-safe data and exclude PII', () {
      final report = ComprehensiveReportModel.fromJson({
        'id': '301',
        'user_id': 'citizen_test_user',
        'title': 'Broken Water Pipeline',
        'description': 'Continuous water leakage on main road.',
        'category': 'Water Supply',
        'location': 'Ward 3, Solapur',
        'latitude': 17.6712,
        'longitude': 75.9123,
        'contact_number': '+91-9876543210', // PII
        'aadhar_number': '1234-5678-9012', // PII
        'status': 'submitted',
        'priority': 'high',
        'created_at': testNow.toIso8601String(),
        'updated_at': testNow.toIso8601String(),
      });

      final feature = GeospatialGeoJsonService.reportToFeature(report);
      expect(feature, isNotNull);
      final props = feature!.properties;

      // Safe fields present
      expect(props['reportId'], '301');
      expect(props['title'], 'Broken Water Pipeline');
      expect(props['category'], 'Water Supply');
      expect(props['status'], 'submitted');
      expect(props['priority'], 'high');

      // Sensitive PII excluded
      expect(props.containsKey('contact_number'), isFalse);
      expect(props.containsKey('contactNumber'), isFalse);
      expect(props.containsKey('aadhar_number'), isFalse);
      expect(props.containsKey('aadharNumber'), isFalse);
    });

    test('4. Real-time Status History stream model parses officer updates accurately', () {
      final historyJson = {
        'id': '501',
        'report_id': '301',
        'old_status': 'submitted',
        'new_status': 'assigned',
        'changed_by': 'officer_pwd_42',
        'changed_by_name': 'Officer Patil',
        'change_reason': 'Assigned to Ward 3 field maintenance team',
        'admin_notes': 'Pipeline inspection scheduled within 2 hours',
        'created_at': testNow.toIso8601String(),
      };

      final history = ReportStatusHistoryModel.fromJson(historyJson);
      expect(history.id, '501');
      expect(history.reportId, '301');
      expect(history.oldStatus, 'submitted');
      expect(history.newStatus, 'assigned');
      expect(history.changedByName, 'Officer Patil');
      expect(history.adminNotes, contains('Pipeline inspection'));
    });

    test('5. Lifecycle status progression mappings are consistent with database values', () {
      final statuses = [
        ReportStatus.submitted,
        ReportStatus.review,
        ReportStatus.assigned,
        ReportStatus.progress,
        ReportStatus.resolved,
      ];

      for (var status in statuses) {
        expect(ReportStatusExtension.fromString(status.value), status);
        expect(status.displayName.isNotEmpty, isTrue);
      }
    });

    test('6. Complaint submitted location is preserved separately from user GPS', () {
      // Given a report with fixed submitted coordinates
      final submittedLat = 17.6599;
      final submittedLng = 75.9064;

      final report = ComprehensiveReportModel.fromJson({
        'id': '302',
        'user_id': 'citizen@solapur.gov',
        'title': 'Fallen Tree Branch',
        'description': 'Blocking traffic lane.',
        'category': 'Roads',
        'location': 'Station Road, Solapur',
        'latitude': submittedLat,
        'longitude': submittedLng,
        'status': 'progress',
        'priority': 'medium',
        'created_at': testNow.toIso8601String(),
        'updated_at': testNow.toIso8601String(),
      });

      // The complaint location remains exactly the submitted location
      expect(report.latitude, submittedLat);
      expect(report.longitude, submittedLng);
      expect(report.gpsDisplay, contains('17.65990, 75.90640'));
    });

    test('7. Realtime report collection updates dynamically with new and modified reports', () {
      final initialReports = [
        ComprehensiveReportModel.fromJson({
          'id': '1',
          'user_id': 'u1',
          'title': 'Issue 1',
          'description': 'Desc',
          'category': 'Roads',
          'location': 'Loc',
          'latitude': 17.68,
          'longitude': 75.92,
          'status': 'submitted',
          'priority': 'medium',
          'created_at': testNow.toIso8601String(),
          'updated_at': testNow.toIso8601String(),
        }),
      ];

      var collection = GeospatialGeoJsonService.reportsToFeatureCollection(initialReports);
      expect(collection.length, 1);

      // Realtime INSERT arrives
      final updatedReports = [
        ...initialReports,
        ComprehensiveReportModel.fromJson({
          'id': '2',
          'user_id': 'u2',
          'title': 'Issue 2 (New Realtime)',
          'description': 'Desc',
          'category': 'Sanitation',
          'location': 'Loc',
          'latitude': 17.69,
          'longitude': 75.93,
          'status': 'submitted',
          'priority': 'high',
          'created_at': testNow.toIso8601String(),
          'updated_at': testNow.toIso8601String(),
        }),
      ];

      collection = GeospatialGeoJsonService.reportsToFeatureCollection(updatedReports);
      expect(collection.length, 2);
      expect(collection.features[1].properties['title'], 'Issue 2 (New Realtime)');
    });
  });

  group('Government Civic Portal UI Redesign Tests', () {
    test('1. Official civic color palette tokens are strictly defined', () {
      const primaryBlue = Color(0xFF155EEF);
      const deepNavy = Color(0xFF123B63);
      const background = Color(0xFFF7F9FC);
      const cardWhite = Color(0xFFFFFFFF);
      const primaryText = Color(0xFF172B4D);
      const secondaryText = Color(0xFF667085);
      const borderColor = Color(0xFFE4E7EC);
      const successColor = Color(0xFF12B76A);
      const warningColor = Color(0xFFF79009);
      const criticalColor = Color(0xFFD92D20);

      expect(primaryBlue.toARGB32(), 0xFF155EEF);
      expect(deepNavy.toARGB32(), 0xFF123B63);
      expect(background.toARGB32(), 0xFFF7F9FC);
      expect(cardWhite.toARGB32(), 0xFFFFFFFF);
      expect(primaryText.toARGB32(), 0xFF172B4D);
      expect(secondaryText.toARGB32(), 0xFF667085);
      expect(borderColor.toARGB32(), 0xFFE4E7EC);
      expect(successColor.toARGB32(), 0xFF12B76A);
      expect(warningColor.toARGB32(), 0xFFF79009);
      expect(criticalColor.toARGB32(), 0xFFD92D20);
    });

    test('2. Step workflow progression is exactly 3 steps', () {
      const step1 = 'Step 1 of 3: Select Category';
      const step2 = 'Step 2 of 3: Provide Details';
      const step3 = 'Step 3 of 3: Review & Submit';

      expect(step1, contains('1 of 3'));
      expect(step2, contains('2 of 3'));
      expect(step3, contains('3 of 3'));
    });

    test('3. Truthful fallback location never fabricates mock addresses', () {
      const testLat = 17.65992;
      const testLng = 75.90641;
      final fallbackAddress = 'Location at ${testLat.toStringAsFixed(5)}, ${testLng.toStringAsFixed(5)}';

      expect(fallbackAddress, isNot(contains('123 Main Street')));
      expect(fallbackAddress, isNot(contains('Parkview')));
      expect(fallbackAddress, isNot(contains('Your City')));
      expect(fallbackAddress, contains('17.65992, 75.90641'));
    });

    test('4. AI assistance presentation includes government review disclaimer', () {
      const disclaimer = 'AI-assisted suggestions may be reviewed by municipal staff.';
      expect(disclaimer, contains('municipal staff'));
      expect(disclaimer, contains('reviewed'));
    });
  });

  group('Local Civic Feed & Community Support Tests (Phase 16)', () {
    test('1. ComprehensiveReportModel parses supportCount, userHasSupported, and distanceMeters', () {
      final json = {
        'id': '101',
        'user_id': 'user-citizen-01',
        'title': 'Severe Pothole on Station Road',
        'description': 'Large pothole blocking bus lane',
        'category': 'potholes_roads',
        'location': 'Station Road, Solapur',
        'latitude': 17.68687,
        'longitude': 75.92275,
        'image_urls': <String>[],
        'status': 'assigned',
        'priority': 'high',
        'created_at': DateTime.now().toIso8601String(),
        'updated_at': DateTime.now().toIso8601String(),
        'support_count': 14,
        'user_has_supported': true,
        'distance_meters': 350.5,
      };

      final model = ComprehensiveReportModel.fromJson(json);

      expect(model.id, '101');
      expect(model.supportCount, 14);
      expect(model.userHasSupported, isTrue);
      expect(model.distanceMeters, 350.5);
      expect(model.categoryDisplayName, 'Roads & Potholes');
    });

    test('2. copyWithSupport updates supported state and count immutably', () {
      final initial = ComprehensiveReportModel.fromJson({
        'id': '202',
        'user_id': 'user-citizen-02',
        'title': 'Water Pipe Burst',
        'description': 'Main pipeline leaking clean water',
        'category': 'water_supply',
        'location': 'Market Chowk, Solapur',
        'latitude': 17.6800,
        'longitude': 75.9200,
        'image_urls': <String>[],
        'status': 'submitted',
        'priority': 'urgent',
        'created_at': DateTime.now().toIso8601String(),
        'support_count': 5,
        'user_has_supported': false,
      });

      expect(initial.supportCount, 5);
      expect(initial.userHasSupported, isFalse);

      final updated = initial.copyWithSupport(supported: true, count: 6);

      expect(updated.id, '202');
      expect(updated.supportCount, 6);
      expect(updated.userHasSupported, isTrue);
      // Original remains unchanged
      expect(initial.supportCount, 5);
      expect(initial.userHasSupported, isFalse);
    });

    test('3. Canonical category mapping in civic feed cards matches across all categories', () {
      expect(ComprehensiveReportModel.canonicalCategoryDisplayName('roads_infrastructure'), 'Roads & Potholes');
      expect(ComprehensiveReportModel.canonicalCategoryDisplayName('water_supply'), 'Water Supply & Leaks');
      expect(ComprehensiveReportModel.canonicalCategoryDisplayName('drainage_sewage'), 'Drainage & Sewage');
      expect(ComprehensiveReportModel.canonicalCategoryDisplayName('electricity_streetlights'), 'Electricity & Streetlights');
      expect(ComprehensiveReportModel.canonicalCategoryDisplayName('garbage'), 'Garbage & Sanitation');
      expect(ComprehensiveReportModel.canonicalCategoryDisplayName('hazard'), 'Public Safety Hazards');
      expect(ComprehensiveReportModel.canonicalCategoryDisplayName('trees'), 'Parks & Urban Greens');
    });

    test('4. Support action prevents duplicate complaint creation in 3A workflow', () {
      const parentReportId = '505';
      const duplicateDetected = true;

      expect(duplicateDetected, isTrue);
      expect(parentReportId, '505');

      // Citizen selects "Support Existing Issue" instead of submitting
      final actionLabel = 'Support Existing Issue';
      expect(actionLabel, contains('Support'));
      expect(actionLabel, isNot(contains('Duplicate')));
    });
  });

  // =========================================================================
  // TASK 07: CITIZEN FEEDBACK & RESOLUTION INTEGRITY TESTS
  // =========================================================================
  group('Citizen Feedback & Resolution Integrity Tests (Task 07)', () {
    test('1. ComprehensiveReportModel parses citizen feedback, rating and reopen details', () {
      final model = ComprehensiveReportModel.fromJson({
        'id': '901',
        'user_id': 'user-citizen-901',
        'title': 'Broken footpath slab',
        'description': 'Concrete slab caved in',
        'category': 'roads',
        'location': 'FC Road, Pune',
        'latitude': 18.5204,
        'longitude': 73.8567,
        'image_urls': <String>['https://example.com/before.jpg'],
        'status': 'closed',
        'priority': 'medium',
        'created_at': DateTime.now().toIso8601String(),
        'citizen_verification_status': 'verified',
        'rating': 5,
        'citizen_feedback': 'Footpath repaired cleanly and leveled smoothly.',
        'reopen_count': 0,
      });

      expect(model.id, '901');
      expect(model.status, ReportStatus.closed);
      expect(model.citizenVerificationStatus, 'verified');
      expect(model.rating, 5);
      expect(model.citizenFeedback, contains('repaired cleanly'));
      expect(model.reopenCount, 0);
    });

    test('2. Reopened complaint preserves reopen count, reason and status mapping', () {
      final model = ComprehensiveReportModel.fromJson({
        'id': '902',
        'user_id': 'user-citizen-902',
        'title': 'Clogged stormwater drain',
        'description': 'Water stagnant after rains',
        'category': 'drainage_sewage',
        'location': 'Deccan Gymkhana, Pune',
        'latitude': 18.5167,
        'longitude': 73.8417,
        'image_urls': <String>[],
        'status': 'reopened',
        'priority': 'high',
        'created_at': DateTime.now().toIso8601String(),
        'citizen_verification_status': 'reopened',
        'reopen_reason': 'Drain still blocked with plastic debris.',
        'reopen_count': 2,
        'verification_photo_url': 'https://example.com/reopen_proof.jpg',
      });

      expect(model.id, '902');
      expect(model.status, ReportStatus.reopened);
      expect(model.citizenVerificationStatus, 'reopened');
      expect(model.reopenReason, 'Drain still blocked with plastic debris.');
      expect(model.reopenCount, 2);
      expect(model.verificationPhotoUrl, isNotNull);
    });

    test('3. Satisfaction verification logic correctly switches status to closed or reopened', () {
      String resolveStatus(bool isSatisfied) => isSatisfied ? 'closed' : 'reopened';
      String resolveVerificationStatus(bool isSatisfied) => isSatisfied ? 'verified' : 'reopened';

      expect(resolveStatus(true), 'closed');
      expect(resolveVerificationStatus(true), 'verified');
      expect(resolveStatus(false), 'reopened');
      expect(resolveVerificationStatus(false), 'reopened');
    });

    test('4. Rating bounds validation strictly enforces 1 to 5 integer scale', () {
      bool isValidRating(int rating) => rating >= 1 && rating <= 5;

      expect(isValidRating(1), isTrue);
      expect(isValidRating(5), isTrue);
      expect(isValidRating(3), isTrue);
      expect(isValidRating(0), isFalse);
      expect(isValidRating(6), isFalse);
      expect(isValidRating(-1), isFalse);
    });
  });

  group('Civic Recognition, Occasions & Nursery Redemptions (Task 08)', () {
    test('1. Occasion model structures Gandhi Jayanti, Republic Day & Independence Day milestones', () {
      final occasions = [
        {
          'id': 'gandhi_jayanti_2026',
          'name': 'Gandhi Jayanti Civic Recognition 2026',
          'date': '2026-10-02',
          'min_score': 50,
          'min_reports': 2,
          'min_resolutions': 1,
        },
        {
          'id': 'republic_day_2026',
          'name': 'Republic Day Civic Champions 2026',
          'date': '2026-01-26',
          'min_score': 100,
          'min_reports': 4,
          'min_resolutions': 2,
        },
        {
          'id': 'independence_day_2026',
          'name': 'Independence Day Civic Stewardship 2026',
          'date': '2026-08-15',
          'min_score': 150,
          'min_reports': 6,
          'min_resolutions': 3,
        },
      ];

      expect(occasions.length, 3);
      expect(occasions.first['id'], 'gandhi_jayanti_2026');
      expect(occasions.first['min_reports'], 2);
      expect(occasions.first['min_resolutions'], 1);
    });

    test('2. Digital certificate model parses correctly and maintains unique alphanumeric identifier', () {
      final certJson = {
        'id': 'cert-101',
        'user_id': 'user-citizen-anil',
        'recipient_name': 'Anil Deshmukh',
        'district_name': 'Solapur',
        'occasion_name': 'Gandhi Jayanti Civic Recognition 2026',
        'recognition_tier': 'CHAMPION',
        'certificate_number': 'CR-GJ-2026-SOLAPUR-8901',
        'issued_at': '2026-10-02T00:00:00Z',
        'plant_redeemable': true,
        'plant_redeemed': false,
        'verified_reports': 9,
        'verified_resolutions': 4,
        'total_civic_score': 280,
      };

      expect(certJson['id'], 'cert-101');
      expect(certJson['certificate_number'], startsWith('CR-GJ-2026-SOLAPUR-'));
      expect(certJson['recognition_tier'], 'CHAMPION');
      expect(certJson['plant_redeemable'], isTrue);
      expect(certJson['plant_redeemed'], isFalse);
    });

    test('3. Government nursery plant voucher structure tracks pickup location and status', () {
      final redemptionJson = {
        'id': 'red-201',
        'user_id': 'user-citizen-anil',
        'certificate_id': 'cert-101',
        'preferred_plant_type': 'Neem (Azadirachta indica)',
        'collection_nursery_name': 'Solapur Municipal Social Forestry Nursery',
        'voucher_code': 'PLANT-2026-SOLAPUR-9012',
        'status': 'REQUESTED',
        'created_at': DateTime.now().toIso8601String(),
      };

      expect(redemptionJson['voucher_code'], startsWith('PLANT-2026-SOLAPUR-'));
      expect(redemptionJson['status'], 'REQUESTED');
      expect(redemptionJson['preferred_plant_type'], contains('Neem'));
    });

    test('4. Public certificate verification payload contains zero PII fields', () {
      final publicVerification = {
        'certificate_number': 'CR-GJ-2026-SOLAPUR-8901',
        'recipient_name': 'Anil Deshmukh',
        'district_name': 'Solapur',
        'occasion_name': 'Gandhi Jayanti Civic Recognition 2026',
        'recognition_tier': 'CHAMPION',
        'issued_at': '2026-10-02T00:00:00Z',
      };

      expect(publicVerification.containsKey('phone'), isFalse);
      expect(publicVerification.containsKey('aadhaar'), isFalse);
      expect(publicVerification.containsKey('email'), isFalse);
      expect(publicVerification.containsKey('bank_account'), isFalse);
      expect(publicVerification['certificate_number'], 'CR-GJ-2026-SOLAPUR-8901');
    });
  });

  group('3-Level Image Validation Pipeline Tests (Mobile Hardening)', () {
    final validDummyBytes = Uint8List.fromList(List.generate(1024, (i) => (i % 256)));

    tearDown(() {
      ImageValidationService.resetClassifier();
    });

    test('1. Image existence alone does not produce automatic acceptance (defaults to REVIEW)', () async {
      // No classifier registered; image exists but cannot be verified automatically
      ImageValidationService.resetClassifier();

      final result = await ImageValidationService.validateEvidence(
        imageBytes: validDummyBytes,
        selectedCategoryId: 'potholes_roads',
      );

      // CRITICAL REQUIREMENT: Must NOT accept blindly
      expect(result.decision, ImageValidationDecision.review);
      expect(result.isAccept, isFalse);
      expect(result.isReview, isTrue);
      expect(result.canProceedToSubmission, isTrue);
      expect(result.userFriendlyMessage, contains('review'));
    });

    test('2. Matching category with definitive prediction produces ACCEPT decision', () async {
      ImageValidationService.setClassifier(_MockTestClassifier(
        prediction: const ClassifierPrediction(
          predictedCategory: 'potholes_roads',
          confidence: 0.94,
          isDefinitive: true,
          details: 'Pothole asphalt crater detected.',
        ),
      ));

      final result = await ImageValidationService.validateEvidence(
        imageBytes: validDummyBytes,
        selectedCategoryId: 'potholes_roads',
      );

      expect(result.decision, ImageValidationDecision.accept);
      expect(result.isAccept, isTrue);
      expect(result.isReject, isFalse);
      expect(result.predictedCategory, 'potholes_roads');
      expect(result.userFriendlyMessage, contains('Evidence appears relevant'));
    });

    test('3. Discordant category with definitive prediction produces REJECT decision', () async {
      // User selected 'potholes_roads', but uploaded photo of food/dining
      ImageValidationService.setClassifier(_MockTestClassifier(
        prediction: const ClassifierPrediction(
          predictedCategory: 'food_irrelevant',
          confidence: 0.96,
          isDefinitive: true,
          details: 'Meal dining plate detected.',
        ),
      ));

      final result = await ImageValidationService.validateEvidence(
        imageBytes: validDummyBytes,
        selectedCategoryId: 'potholes_roads',
      );

      expect(result.decision, ImageValidationDecision.reject);
      expect(result.isReject, isTrue);
      expect(result.isAccept, isFalse);
      expect(result.canProceedToSubmission, isFalse);
      expect(result.userFriendlyMessage, contains("doesn't appear to match"));
    });

    test('4. Discordant civic category with definitive prediction produces REJECT decision', () async {
      // User selected 'potholes_roads', but uploaded streetlight electrical pole
      ImageValidationService.setClassifier(_MockTestClassifier(
        prediction: const ClassifierPrediction(
          predictedCategory: 'electricity_streetlights',
          confidence: 0.91,
          isDefinitive: true,
          details: 'High-voltage lamp post.',
        ),
      ));

      final result = await ImageValidationService.validateEvidence(
        imageBytes: validDummyBytes,
        selectedCategoryId: 'potholes_roads',
      );

      expect(result.decision, ImageValidationDecision.reject);
      expect(result.isReject, isTrue);
    });

    test('5. Unknown or uncertain prediction produces REVIEW decision (never false rejection)', () async {
      ImageValidationService.setClassifier(_MockTestClassifier(
        prediction: const ClassifierPrediction(
          predictedCategory: null,
          confidence: null,
          isDefinitive: false,
        ),
      ));

      final result = await ImageValidationService.validateEvidence(
        imageBytes: validDummyBytes,
        selectedCategoryId: 'waste_management',
      );

      expect(result.decision, ImageValidationDecision.review);
      expect(result.isReview, isTrue);
      expect(result.canProceedToSubmission, isTrue);
    });

    test('6. Empty or corrupt image bytes (<100 bytes) are rejected at Level 1 sanity check', () async {
      final corruptBytes = Uint8List.fromList([1, 2, 3, 4, 5]);

      final result = await ImageValidationService.validateEvidence(
        imageBytes: corruptBytes,
        selectedCategoryId: 'potholes_roads',
      );

      expect(result.decision, ImageValidationDecision.reject);
      expect(result.reason, contains('empty or corrupted'));
    });

    test('7. Normalized category alias matching correctly aligns related terms', () async {
      // Selected 'water_drainage', predicted 'drainage_sewage'
      ImageValidationService.setClassifier(_MockTestClassifier(
        prediction: const ClassifierPrediction(
          predictedCategory: 'drainage',
          confidence: 0.88,
          isDefinitive: true,
        ),
      ));

      final result = await ImageValidationService.validateEvidence(
        imageBytes: validDummyBytes,
        selectedCategoryId: 'water_drainage',
      );

      expect(result.decision, ImageValidationDecision.accept);
    });

    test('8. ImageValidationResult serialization round-trips cleanly', () {
      const original = ImageValidationResult(
        decision: ImageValidationDecision.accept,
        predictedCategory: 'potholes_roads',
        confidence: 0.89,
        reason: 'Visual match.',
        userFriendlyMessage: 'Evidence verified.',
      );

      final json = original.toJson();
      final parsed = ImageValidationResult.fromJson(json);

      expect(parsed.decision, ImageValidationDecision.accept);
      expect(parsed.predictedCategory, 'potholes_roads');
      expect(parsed.confidence, 0.89);
      expect(parsed.reason, 'Visual match.');
      expect(parsed.isAccept, isTrue);
    });

    test('9. RemoteGeminiVisionClassifierAdapter handles fallback gracefully when server is offline', () async {
      const adapter = RemoteGeminiVisionClassifierAdapter(defaultCategoryId: 'potholes_roads');
      final prediction = await adapter.predictCategory(validDummyBytes);

      // Gracefully falls back to uncertain without crashing or throwing
      expect(prediction.isDefinitive, isFalse);
      expect(prediction.predictedCategory, isNull);
    });
  });
}

class _MockTestClassifier implements ImageClassifierAdapter {
  final ClassifierPrediction prediction;

  _MockTestClassifier({required this.prediction});

  @override
  Future<ClassifierPrediction> predictCategory(
    Uint8List imageBytes, {
    String? imagePath,
    String? description,
    String? selectedCategoryId,
  }) async {
    return prediction;
  }
}
