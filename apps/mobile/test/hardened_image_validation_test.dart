import 'dart:typed_data';
import 'package:flutter_test/flutter_test.dart';
import 'package:civic_resolve/image_validation_service.dart';

/// Test mock classifier implementing the pluggable ImageClassifierAdapter
class _MockTestVisionClassifier implements ImageClassifierAdapter {
  final Future<ClassifierPrediction> Function(
    Uint8List bytes,
    String? categoryId,
    String? description,
  ) onPredict;

  _MockTestVisionClassifier(this.onPredict);

  @override
  Future<ClassifierPrediction> predictCategory(
    Uint8List imageBytes, {
    String? imagePath,
    String? description,
    String? selectedCategoryId,
  }) async {
    return onPredict(imageBytes, selectedCategoryId, description);
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('P0 Hardened AI Image Validation & Security Rules', () {
    final validDummyBytes = Uint8List.fromList(List.generate(1024, (i) => (i % 256)));

    tearDown(() {
      ImageValidationService.resetClassifier();
    });

    test('1. Successful Gemini response: matching category -> Verified Proof (ACCEPT)', () async {
      ImageValidationService.setClassifier(_MockTestVisionClassifier((bytes, cat, desc) async {
        return const ClassifierPrediction(
          predictedCategory: 'potholes_roads',
          confidence: 0.94,
          isDefinitive: true,
          isTechnicalFailure: false,
          details: 'Asphalt degradation and crater detected.',
        );
      }));

      final result = await ImageValidationService.validateEvidence(
        imageBytes: validDummyBytes,
        selectedCategoryId: 'potholes_roads',
      );

      expect(result.decision, ImageValidationDecision.accept);
      expect(result.isAccept, isTrue);
      expect(result.isAIVerified, isTrue);
      expect(result.isReject, isFalse);
      expect(result.isReview, isFalse);
      expect(result.isTechnicalFailure, isFalse);
      expect(result.confidence, 0.94);
      expect(result.statusLabel, 'Verified Proof');
      expect(result.canProceedToSubmission, isTrue);
      expect(result.userFriendlyMessage, contains('Evidence appears relevant'));
    });

    test('2. Category Mismatch: discordant prediction -> Invalid / Mismatch (REJECT)', () async {
      ImageValidationService.setClassifier(_MockTestVisionClassifier((bytes, cat, desc) async {
        return const ClassifierPrediction(
          predictedCategory: 'food_irrelevant',
          confidence: 0.96,
          isDefinitive: true,
          isTechnicalFailure: false,
          details: 'Restaurant meal detected.',
        );
      }));

      final result = await ImageValidationService.validateEvidence(
        imageBytes: validDummyBytes,
        selectedCategoryId: 'potholes_roads',
      );

      expect(result.decision, ImageValidationDecision.reject);
      expect(result.isReject, isTrue);
      expect(result.isCategoryMismatch, isTrue);
      expect(result.isAccept, isFalse);
      expect(result.isAIVerified, isFalse);
      expect(result.isTechnicalFailure, isFalse);
      expect(result.canProceedToSubmission, isFalse);
      expect(result.statusLabel, 'Invalid / Mismatch');
      expect(result.userFriendlyMessage, contains("doesn't appear to match"));
    });

    test('3. Malformed AI response payload -> Pending Review (Evidence Unverified)', () async {
      ImageValidationService.setClassifier(_MockTestVisionClassifier((bytes, cat, desc) async {
        // Simulates malformed response payload from Edge Function
        return const ClassifierPrediction.technicalFailure(
          details: 'Remote AI service returned malformed payload.',
        );
      }));

      final result = await ImageValidationService.validateEvidence(
        imageBytes: validDummyBytes,
        selectedCategoryId: 'waste_management',
      );

      expect(result.decision, ImageValidationDecision.review);
      expect(result.isReview, isTrue);
      expect(result.isUnverified, isTrue);
      expect(result.isAccept, isFalse);
      expect(result.isAIVerified, isFalse);
      expect(result.isReject, isFalse);
      expect(result.isTechnicalFailure, isTrue);
      expect(result.confidence, isNull, reason: 'AI unavailable must never fabricate fake confidence');
      expect(result.canProceedToSubmission, isTrue);
      expect(result.userFriendlyMessage, ImageValidationService.technicalFailureMessage);
      expect(result.statusLabel, 'Evidence Unverified (Pending Review)');
    });

    test('4. AI timeout -> Pending Review (Evidence Unverified)', () async {
      ImageValidationService.setClassifier(_MockTestVisionClassifier((bytes, cat, desc) async {
        // Simulates timeout contacting Edge Function
        return const ClassifierPrediction.technicalFailure(
          details: 'AI verification service timed out after 12s.',
        );
      }));

      final result = await ImageValidationService.validateEvidence(
        imageBytes: validDummyBytes,
        selectedCategoryId: 'water_leakage',
      );

      expect(result.decision, ImageValidationDecision.review);
      expect(result.isAccept, isFalse);
      expect(result.isAIVerified, isFalse);
      expect(result.isTechnicalFailure, isTrue);
      expect(result.confidence, isNull);
      expect(result.userFriendlyMessage, ImageValidationService.technicalFailureMessage);
    });

    test('5. Network failure / SocketException -> Pending Review (Evidence Unverified)', () async {
      ImageValidationService.setClassifier(_MockTestVisionClassifier((bytes, cat, desc) async {
        // Simulates unhandled network exception
        throw Exception('SocketException: Failed host lookup for supabase edge function');
      }));

      final result = await ImageValidationService.validateEvidence(
        imageBytes: validDummyBytes,
        selectedCategoryId: 'electricity_streetlights',
      );

      expect(result.decision, ImageValidationDecision.review);
      expect(result.isAccept, isFalse);
      expect(result.isAIVerified, isFalse);
      expect(result.isTechnicalFailure, isTrue);
      expect(result.confidence, isNull);
      expect(result.userFriendlyMessage, ImageValidationService.technicalFailureMessage);
      // Ensure raw stack trace is NOT exposed to user
      expect(result.userFriendlyMessage, isNot(contains('SocketException')));
    });

    test('6. Edge Function 500 error -> Pending Review (Evidence Unverified)', () async {
      ImageValidationService.setClassifier(_MockTestVisionClassifier((bytes, cat, desc) async {
        return const ClassifierPrediction.technicalFailure(
          details: 'Remote AI service returned status code 500.',
        );
      }));

      final result = await ImageValidationService.validateEvidence(
        imageBytes: validDummyBytes,
        selectedCategoryId: 'parks_trees',
      );

      expect(result.decision, ImageValidationDecision.review);
      expect(result.isAccept, isFalse);
      expect(result.isAIVerified, isFalse);
      expect(result.isTechnicalFailure, isTrue);
      expect(result.confidence, isNull);
      expect(result.userFriendlyMessage, ImageValidationService.technicalFailureMessage);
    });

    test('7. Uninitialized Supabase / production fallback -> Pending Review (No auto-accept)', () async {
      // Production path (no mock classifier) when Supabase client is not configured
      ImageValidationService.resetClassifier();

      final result = await ImageValidationService.validateEvidence(
        imageBytes: validDummyBytes,
        selectedCategoryId: 'potholes_roads',
      );

      // SECURITY INTEGRITY: AI unavailable != image verified. Must NOT be accept!
      expect(result.decision, ImageValidationDecision.review);
      expect(result.isAccept, isFalse);
      expect(result.isAIVerified, isFalse);
      expect(result.isTechnicalFailure, isTrue);
      expect(result.confidence, isNull);
      expect(result.userFriendlyMessage, ImageValidationService.technicalFailureMessage);
    });

    test('8. Ambiguous/Inconclusive AI evaluation without failure -> Pending Staff Review', () async {
      ImageValidationService.setClassifier(_MockTestVisionClassifier((bytes, cat, desc) async {
        return const ClassifierPrediction(
          predictedCategory: null,
          confidence: 0.45,
          isDefinitive: false,
          isTechnicalFailure: false,
          details: 'Unable to discern civic issue from low-angle shot.',
        );
      }));

      final result = await ImageValidationService.validateEvidence(
        imageBytes: validDummyBytes,
        selectedCategoryId: 'potholes_roads',
      );

      expect(result.decision, ImageValidationDecision.review);
      expect(result.isReview, isTrue);
      expect(result.isAIVerified, isFalse);
      expect(result.isTechnicalFailure, isFalse);
      expect(result.confidence, isNull);
      expect(result.statusLabel, 'Pending Staff Review');
      expect(result.userFriendlyMessage, contains("We couldn't confidently verify this image"));
    });

    test('9. Invalid confidence values (>1.0, <0.0, NaN) are safely ignored and not forged', () {
      const prediction = ClassifierPrediction(
        predictedCategory: 'potholes_roads',
        confidence: null,
        isDefinitive: false,
        isTechnicalFailure: false,
      );

      expect(prediction.confidence, isNull);
    });

    test('10. Serialization and deserialization preserves isTechnicalFailure status', () {
      const techFailure = ImageValidationResult(
        decision: ImageValidationDecision.review,
        predictedCategory: null,
        confidence: null,
        reason: 'Network disconnect',
        userFriendlyMessage: ImageValidationService.technicalFailureMessage,
        isTechnicalFailure: true,
      );

      final json = techFailure.toJson();
      final reconstituted = ImageValidationResult.fromJson(json);

      expect(reconstituted.decision, ImageValidationDecision.review);
      expect(reconstituted.isTechnicalFailure, isTrue);
      expect(reconstituted.isAIVerified, isFalse);
      expect(reconstituted.confidence, isNull);
      expect(reconstituted.statusLabel, 'Evidence Unverified (Pending Review)');
    });
  });
}
