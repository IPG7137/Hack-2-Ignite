import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:civic_resolve/priority_engine.dart';
import 'package:civic_resolve/comprehensive_report_models.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('Round 2 P1: Explainable Civic Priority Engine (Deterministic 3B) Tests', () {
    test('1. Mathematical factor weights sum exactly to 1.0', () {
      const sumWeights = CivicPriorityEngine.weightSeverity +
          CivicPriorityEngine.weightPublicSafety +
          CivicPriorityEngine.weightRelatedComplaints +
          CivicPriorityEngine.weightAge +
          CivicPriorityEngine.weightCategory;

      expect(sumWeights, closeTo(1.0, 0.0001));
    });

    test('2. Low Priority Case: Routine maintenance with no safety hazard or cluster', () {
      final analysis = CivicPriorityEngine.evaluatePriority(
        severity: 'Low',
        category: 'Waste',
        title: 'Small litter on pavement',
        description: 'A few wrappers on the sidewalk.',
        relatedComplaintsCount: 0,
        createdAt: DateTime.now().subtract(const Duration(hours: 2)),
      );

      // Severity: 20 * 0.30 = 6.0
      // Safety: 25 * 0.25 = 6.25
      // Related: 0 * 0.20 = 0.0
      // Age: 15 * 0.15 = 2.25
      // Category: 45 * 0.10 = 4.5
      // Total: 19.0 -> Low (< 35.0)
      expect(analysis.score, closeTo(19.0, 0.1));
      expect(analysis.levelLabel, equals('Low'));
      expect(analysis.mappedPriority, equals(ReportPriority.low));
      expect(analysis.factors.length, equals(5));
    });

    test('3. Medium Priority Case: Standard municipal water issue with normal SLA', () {
      final analysis = CivicPriorityEngine.evaluatePriority(
        severity: 'Medium',
        category: 'Water Supply',
        title: 'Low water pressure in building',
        description: 'Water pressure is reduced since yesterday.',
        relatedComplaintsCount: 1,
        createdAt: DateTime.now().subtract(const Duration(days: 2)),
      );

      // Severity: 50 * 0.30 = 15.0
      // Safety: 50 * 0.25 = 12.5
      // Related: 40 * 0.20 = 8.0
      // Age: 40 * 0.15 = 6.0
      // Category: 75 * 0.10 = 7.5
      // Total: 49.0 -> Medium (35.0 - 59.9)
      expect(analysis.score, closeTo(49.0, 0.1));
      expect(analysis.levelLabel, equals('Medium'));
      expect(analysis.mappedPriority, equals(ReportPriority.medium));
      expect(analysis.explainableReasons, isNotEmpty);
    });

    test('4. High Priority Case: Deep pothole on road with multiple complaints', () {
      final analysis = CivicPriorityEngine.evaluatePriority(
        severity: 'High',
        category: 'Roads & Potholes',
        title: 'Deep pothole on main road',
        description: 'Large deep pothole causing traffic jam and hazard at night.',
        relatedComplaintsCount: 2,
        createdAt: DateTime.now().subtract(const Duration(days: 5)),
      );

      // Severity: 80 * 0.30 = 24.0
      // Safety (moderate hazard 'pothole'): 65 * 0.25 = 16.25
      // Related: 70 * 0.20 = 14.0
      // Age (5 days): 70 * 0.15 = 10.5
      // Category: 60 * 0.10 = 6.0
      // Total: 70.75 -> High (60.0 - 79.9)
      expect(analysis.score, closeTo(70.75, 0.1));
      expect(analysis.levelLabel, equals('High'));
      expect(analysis.mappedPriority, equals(ReportPriority.high));
      expect(analysis.explainableReasons.any((r) => r.contains('safety')), isTrue);
    });

    test('5. Critical Priority Case: Live electric wire fallen on street with active cluster', () {
      final analysis = CivicPriorityEngine.evaluatePriority(
        severity: 'Critical',
        category: 'Public Safety',
        title: 'Live wire broken and sparking',
        description: 'Live electric wire broken and hanging near school gate with immediate electrocution risk.',
        relatedComplaintsCount: 3,
        createdAt: DateTime.now().subtract(const Duration(hours: 4)),
      );

      // Severity: 100 * 0.30 = 30.0
      // Safety: 100 * 0.25 = 25.0
      // Related: 100 * 0.20 = 20.0
      // Age: 15 * 0.15 = 2.25
      // Category: 100 * 0.10 = 10.0
      // Total: 87.25 -> Critical (>= 80.0)
      expect(analysis.score, greaterThanOrEqualTo(80.0));
      expect(analysis.levelLabel, equals('Critical'));
      expect(analysis.mappedPriority, equals(ReportPriority.high)); // Mapped safely to DB enum
      expect(analysis.explainableReasons.any((r) => r.contains('Critical')), isTrue);
    });

    test('6. Boundary Score Thresholds (Exact 35.0, 60.0, 80.0, 100.0, 0.0)', () {
      // Exact boundary score tests
      expect(CivicPriorityEngine.thresholdCritical, equals(80.0));
      expect(CivicPriorityEngine.thresholdHigh, equals(60.0));
      expect(CivicPriorityEngine.thresholdMedium, equals(35.0));

      // Test bounds clamp [0.0, 100.0]
      final maxAnalysis = CivicPriorityEngine.evaluatePriority(
        severity: 'Critical',
        category: 'Emergency Disaster',
        title: 'Catastrophic fire collapse emergency',
        description: 'fire explosion live wire open manhole collapsed building',
        relatedComplaintsCount: 10,
        createdAt: DateTime.now().subtract(const Duration(days: 30)),
      );
      expect(maxAnalysis.score, lessThanOrEqualTo(100.0));
      expect(maxAnalysis.score, greaterThanOrEqualTo(95.0));
    });

    test('7. Related Complaints Density Scaling (0, 1, 2, 3+)', () {
      expect(CivicPriorityEngine.calculateRelatedComplaintsScore(0), equals(0.0));
      expect(CivicPriorityEngine.calculateRelatedComplaintsScore(1), equals(40.0));
      expect(CivicPriorityEngine.calculateRelatedComplaintsScore(2), equals(70.0));
      expect(CivicPriorityEngine.calculateRelatedComplaintsScore(3), equals(100.0));
      expect(CivicPriorityEngine.calculateRelatedComplaintsScore(10), equals(100.0));
    });

    test('8. SLA Aging Duration Escalation & Resolved State', () {
      final now = DateTime.now();

      // Fresh (< 24h)
      expect(CivicPriorityEngine.calculateAgeScore(now.subtract(const Duration(hours: 6))), equals(15.0));
      // 1 to 3 days
      expect(CivicPriorityEngine.calculateAgeScore(now.subtract(const Duration(days: 2))), equals(40.0));
      // 4 to 7 days (approaching SLA breach)
      expect(CivicPriorityEngine.calculateAgeScore(now.subtract(const Duration(days: 5))), equals(70.0));
      // > 7 days (urgent escalation)
      expect(CivicPriorityEngine.calculateAgeScore(now.subtract(const Duration(days: 10))), equals(100.0));
      // Resolved report should never escalate on age
      expect(CivicPriorityEngine.calculateAgeScore(now.subtract(const Duration(days: 10)), isResolved: true), equals(0.0));
    });

    test('9. Safety-Critical Category Baselines', () {
      expect(CivicPriorityEngine.calculateCategoryBaselineScore('Safety Hazard'), equals(100.0));
      expect(CivicPriorityEngine.calculateCategoryBaselineScore('Electricity'), equals(75.0));
      expect(CivicPriorityEngine.calculateCategoryBaselineScore('Water Supply'), equals(75.0));
      expect(CivicPriorityEngine.calculateCategoryBaselineScore('Drainage & Sewage'), equals(75.0));
      expect(CivicPriorityEngine.calculateCategoryBaselineScore('Roads & Potholes'), equals(60.0));
      expect(CivicPriorityEngine.calculateCategoryBaselineScore('Waste Management'), equals(45.0));
      expect(CivicPriorityEngine.calculateCategoryBaselineScore('Other'), equals(35.0));
    });

    test('10. Conflict Handling: User selects Low, but hazard signals elevate operational priority', () {
      final conflictAnalysis = CivicPriorityEngine.evaluatePriority(
        severity: 'Low',
        category: 'Electricity',
        title: 'Broken wire on path',
        description: 'Live electric wire sparking near walkway.',
        relatedComplaintsCount: 2,
        createdAt: DateTime.now().subtract(const Duration(days: 5)),
      );

      // User input is preserved as 'Low' (rawScore: 20 -> weighted: 6.0)
      final severityFactor = conflictAnalysis.factors.firstWhere((f) => f.key == 'severity');
      expect(severityFactor.rawScore, equals(20.0));
      expect(severityFactor.weightedPoints, equals(6.0));

      // Public safety evaluated to 100.0 (weighted: 25.0)
      final safetyFactor = conflictAnalysis.factors.firstWhere((f) => f.key == 'public_safety');
      expect(safetyFactor.rawScore, equals(100.0));
      expect(safetyFactor.weightedPoints, equals(25.0));

      // Overall score is elevated to High (>= 60)
      expect(conflictAnalysis.score, greaterThanOrEqualTo(60.0));
      expect(conflictAnalysis.conflictNotice, isNotNull);
      expect(conflictAnalysis.conflictNotice, contains('Citizen selected Low priority'));
    });

    test('11. Mathematical Integrity: Sum of 5 factor points matches total score', () {
      final analysis = CivicPriorityEngine.evaluatePriority(
        severity: 'High',
        category: 'Roads & Potholes',
        title: 'Pothole near market',
        description: 'Pothole on main lane.',
        relatedComplaintsCount: 1,
        createdAt: DateTime.now().subtract(const Duration(days: 3)),
      );

      double sumPoints = 0.0;
      for (final f in analysis.factors) {
        sumPoints += f.weightedPoints;
      }

      expect(sumPoints, closeTo(analysis.score, 0.01));
    });

    testWidgets('12. ExplainablePriorityCard Widget renders reasons and expands 5-factor formula', (tester) async {
      final analysis = CivicPriorityEngine.evaluatePriority(
        severity: 'High',
        category: 'Roads & Potholes',
        title: 'Deep pothole on road',
        description: 'Large deep pothole causing traffic jam and night hazard.',
        relatedComplaintsCount: 2,
        createdAt: DateTime.now().subtract(const Duration(days: 5)),
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SingleChildScrollView(
              child: ExplainablePriorityCard(
                analysis: analysis,
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Renders priority level and score
      expect(find.text('HIGH PRIORITY'), findsOneWidget);
      expect(find.text(analysis.scoreDisplay), findsOneWidget);
      expect(find.text('Why this priority?'), findsWidgets);

      // Tap to expand 3B factor breakdown
      await tester.tap(find.text('Why this priority?').first);
      await tester.pumpAndSettle();

      // Factor details are visible
      expect(find.text('Deterministic 3B Engine Weights & Contributions'), findsOneWidget);
      expect(find.text('Severity & Urgency'), findsOneWidget);
      expect(find.text('Public Safety Hazard'), findsOneWidget);
      expect(find.text('Related Complaints Cluster'), findsOneWidget);
      expect(find.text('SLA & Age Escalation'), findsOneWidget);
      expect(find.text('Category Baseline'), findsOneWidget);
      expect(find.textContaining('Architecture: AI / evidence understanding'), findsOneWidget);
    });
  });
}
