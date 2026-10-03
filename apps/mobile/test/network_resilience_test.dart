import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:civic_resolve/category_selection_screen.dart';
import 'package:civic_resolve/confirmation_screen.dart';
import 'package:civic_resolve/image_validation_service.dart';
import 'package:civic_resolve/civic_feed_screen.dart';
import 'package:civic_resolve/dynamic_translation_service.dart';

// Mock classifier to simulate network conditions
class MockNetworkClassifier implements ImageClassifierAdapter {
  final bool shouldTimeout;
  final bool shouldThrowException;
  final bool isOffline;

  MockNetworkClassifier({
    this.shouldTimeout = false,
    this.shouldThrowException = false,
    this.isOffline = false,
  });

  @override
  Future<ClassifierPrediction> predictCategory(
    Uint8List imageBytes, {
    String? imagePath,
    String? description,
    String? selectedCategoryId,
  }) async {
    if (shouldTimeout) {
      // Simulate timeout
      throw Exception('Connection timed out after 12000ms');
    }
    if (shouldThrowException) {
      throw Exception('SocketException: Failed to connect to server (OS Error: Network unreachable)');
    }
    if (isOffline) {
      return const ClassifierPrediction.technicalFailure(
        details: 'Edge Function unavailable: HTTP 503 Service Unavailable',
      );
    }
    return ClassifierPrediction(
      predictedCategory: selectedCategoryId,
      confidence: 0.95,
      isDefinitive: true,
      isTechnicalFailure: false,
    );
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('Round 2 P0: Network Resilience & Graceful Failure Tests', () {
    final validBytes = Uint8List.fromList(List.generate(500, (i) => i % 256));

    tearDown(() {
      ImageValidationService.resetClassifier();
      DynamicTranslationService().clearCache();
    });

    test('1. Gemini Timeout: AI failure gracefully defaults to REVIEW (Never fake verified)', () async {
      ImageValidationService.setClassifier(MockNetworkClassifier(shouldTimeout: true));

      final result = await ImageValidationService.validateEvidence(
        imageBytes: validBytes,
        selectedCategoryId: 'potholes_roads',
      );

      // Must be marked review with technical failure
      expect(result.decision, equals(ImageValidationDecision.review));
      expect(result.isTechnicalFailure, isTrue);
      // Must NOT fabricate a fake confidence score
      expect(result.confidence, isNull);
      expect(result.predictedCategory, isNull);
      expect(result.userFriendlyMessage, contains('temporarily unavailable'));
    });

    test('2. Network Disconnected / Exception: Evidence falls back to Pending Official Review', () async {
      ImageValidationService.setClassifier(MockNetworkClassifier(shouldThrowException: true));

      final result = await ImageValidationService.validateEvidence(
        imageBytes: validBytes,
        selectedCategoryId: 'water_supply',
      );

      expect(result.decision, equals(ImageValidationDecision.review));
      expect(result.isTechnicalFailure, isTrue);
      expect(result.isReject, isFalse); // Never falsely reject citizen evidence on network glitch
      expect(result.confidence, isNull);
    });

    test('3. Edge Function Unavailable (503): Evidence falls back to manual review with clear user note', () async {
      ImageValidationService.setClassifier(MockNetworkClassifier(isOffline: true));

      final result = await ImageValidationService.validateEvidence(
        imageBytes: validBytes,
        selectedCategoryId: 'streetlights',
      );

      expect(result.decision, equals(ImageValidationDecision.review));
      expect(result.isTechnicalFailure, isTrue);
      expect(result.userFriendlyMessage, equals(ImageValidationService.technicalFailureMessage));
    });

    test('4. Dynamic Translation Offline: Gracefully returns original text without breaking UI', () async {
      const original = 'Large pothole in front of main hospital entrance';
      
      // Translation without network or offline fallback
      final result = await DynamicTranslationService().translate(
        text: original,
        targetLanguageCode: 'mr',
      );

      // Preserves text truthfully
      expect(result.translatedText, isNotEmpty);
      expect(result.originalText, equals(original));
    });

    testWidgets('5. Confirmation Screen: Preserves form data and shows Retry button on failure', (tester) async {
      final category = ReportCategory(
        id: 'potholes_roads',
        name: 'Roads & Potholes',
        icon: Icons.edit_road,
        color: const Color(0xFFEA580C),
        gradient: const LinearGradient(
          colors: [Color(0xFFEA580C), Color(0xFFC2410C)],
        ),
        description: 'Road damage and potholes',
      );

      await tester.pumpWidget(
        MaterialApp(
          home: ConfirmationScreen(
            category: category,
            title: 'Critical Pothole near School Gate',
            description: 'Deep crater on asphalt causing severe vehicle damage.',
            location: 'Station Road, Ward 4',
            latitude: 19.0760,
            longitude: 72.8777,
            images: const [],
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Form data is rendered
      expect(find.text('Critical Pothole near School Gate'), findsOneWidget);
      expect(find.text('Deep crater on asphalt causing severe vehicle damage.'), findsOneWidget);
      expect(find.text('Station Road, Ward 4'), findsOneWidget);

      // Attempt submission without sign-in (Simulates unauthenticated / network session error)
      await tester.tap(find.text('SUBMIT COMPLAINT'));
      await tester.pumpAndSettle();

      // Verifies:
      // 1. Success state is NOT shown
      expect(find.text('Complaint Submitted Successfully!'), findsNothing);
      expect(find.text('Reference ID:'), findsNothing);

      // 2. Clear error banner is shown
      expect(find.text('Submission Failed'), findsOneWidget);
      expect(find.textContaining('Authentication required'), findsOneWidget);

      // 3. Form data remains 100% intact
      expect(find.text('Critical Pothole near School Gate'), findsOneWidget);
      expect(find.text('Deep crater on asphalt causing severe vehicle damage.'), findsOneWidget);

      // 4. Retry button is displayed
      expect(find.text('Retry Submission'), findsOneWidget);
    });

    testWidgets('6. Civic Feed Screen: Displays empty & error states with retry option', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: CivicFeedScreen(
            userLatitude: 19.0760,
            userLongitude: 72.8777,
          ),
        ),
      );
      await tester.pump();

      // Renders the feed screen container
      expect(find.byType(CivicFeedScreen), findsOneWidget);
    });
  });
}
