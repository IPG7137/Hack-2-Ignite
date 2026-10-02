import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'image_analysis_service.dart';

/// 3-Level Image Validation Decision
enum ImageValidationDecision {
  /// Evidence is verified and clearly relevant to the selected civic category
  accept,

  /// Relevance cannot be definitively established; queued for municipal staff review
  review,

  /// Evidence is clearly irrelevant, corrupt, or discordant with the selected category
  reject,
}

/// Structured outcome of evidence validation
class ImageValidationResult {
  final ImageValidationDecision decision;
  final String? predictedCategory;
  final double? confidence;
  final String reason;
  final String userFriendlyMessage;
  final Map<String, dynamic> metadata;

  const ImageValidationResult({
    required this.decision,
    this.predictedCategory,
    this.confidence,
    required this.reason,
    required this.userFriendlyMessage,
    this.metadata = const {},
  });

  bool get isAccept => decision == ImageValidationDecision.accept;
  bool get isReview => decision == ImageValidationDecision.review;
  bool get isReject => decision == ImageValidationDecision.reject;

  /// Both 'accept' and 'review' can proceed to submission (with review flagged for staff verification).
  /// 'reject' blocks until the citizen replaces the irrelevant/invalid image.
  bool get canProceedToSubmission => decision != ImageValidationDecision.reject;

  String get statusLabel {
    switch (decision) {
      case ImageValidationDecision.accept:
        return 'Verified Proof';
      case ImageValidationDecision.review:
        return 'Pending Staff Review';
      case ImageValidationDecision.reject:
        return 'Invalid / Mismatch';
    }
  }

  Map<String, dynamic> toJson() {
    return {
      'decision': decision.name,
      'predicted_category': predictedCategory,
      'confidence': confidence,
      'reason': reason,
      'user_friendly_message': userFriendlyMessage,
      'can_proceed': canProceedToSubmission,
      'metadata': metadata,
    };
  }

  factory ImageValidationResult.fromJson(Map<String, dynamic> json) {
    final decisionStr = json['decision']?.toString().toLowerCase() ?? 'review';
    ImageValidationDecision dec = ImageValidationDecision.review;
    if (decisionStr == 'accept') dec = ImageValidationDecision.accept;
    if (decisionStr == 'reject') dec = ImageValidationDecision.reject;

    return ImageValidationResult(
      decision: dec,
      predictedCategory: json['predicted_category']?.toString(),
      confidence: (json['confidence'] is num) ? (json['confidence'] as num).toDouble() : null,
      reason: json['reason']?.toString() ?? 'Validation completed.',
      userFriendlyMessage: json['user_friendly_message']?.toString() ??
          'Evidence processed through verification pipeline.',
      metadata: (json['metadata'] is Map) ? Map<String, dynamic>.from(json['metadata']) : {},
    );
  }
}

/// Prediction payload returned by pluggable vision classifiers
class ClassifierPrediction {
  final String? predictedCategory;
  final double? confidence;
  final bool isDefinitive;
  final String? details;
  final Map<String, dynamic> rawOutput;

  const ClassifierPrediction({
    this.predictedCategory,
    this.confidence,
    this.isDefinitive = false,
    this.details,
    this.rawOutput = const {},
  });
}

/// Pluggable interface allowing future trained ML classifiers (TFLite, ONNX, PyTorch, remote API)
/// to be injected as drop-in upgrades without rewriting UI or submission pipelines.
abstract class ImageClassifierAdapter {
  Future<ClassifierPrediction> predictCategory(
    Uint8List imageBytes, {
    String? imagePath,
    String? description,
    String? selectedCategoryId,
  });
}

/// Production-grade Gemini Vision Classifier Adapter.
/// Executes remote server-side image verification via authenticated Supabase Edge Function ('ai-triage').
/// ZERO Gemini API keys are bundled into or exposed on the mobile client.
class RemoteGeminiVisionClassifierAdapter implements ImageClassifierAdapter {
  final String? defaultCategoryId;

  const RemoteGeminiVisionClassifierAdapter({this.defaultCategoryId});

  @override
  Future<ClassifierPrediction> predictCategory(
    Uint8List imageBytes, {
    String? imagePath,
    String? description,
    String? selectedCategoryId,
  }) async {
    final cat = selectedCategoryId ?? defaultCategoryId ?? '';
    return await validateWithServer(
      imageBytes: imageBytes,
      selectedCategoryId: cat,
      description: description,
    );
  }

  /// Direct server-to-server Gemini Vision classification
  static Future<ClassifierPrediction> validateWithServer({
    required Uint8List imageBytes,
    required String selectedCategoryId,
    String? description,
  }) async {
    try {
      debugPrint('🔍 Invoking server-side Gemini Vision evidence validation for $selectedCategoryId...');
      final client = Supabase.instance.client;
      final session = client.auth.currentSession;

      final response = await client.functions.invoke(
        'ai-triage',
        headers: session != null ? {'Authorization': 'Bearer ${session.accessToken}'} : null,
        body: {
          'action': 'validate_evidence',
          'selected_category': selectedCategoryId,
          'description': description ?? '',
          'image_base64': base64Encode(imageBytes),
          'mime_type': 'image/jpeg',
        },
      );

      if (response.status == 200 && response.data != null) {
        final data = response.data;
        final valPayload = data is Map<String, dynamic> ? (data['data'] ?? data) : null;
        if (valPayload is Map<String, dynamic>) {
          final categoryMatch = valPayload['category_match']?.toString().toLowerCase();
          final detectedSubject = valPayload['detected_subject']?.toString() ?? '';
          final confidence = (valPayload['confidence'] is num) ? (valPayload['confidence'] as num).toDouble() : null;
          final reasoning = valPayload['reasoning']?.toString() ?? '';

          if (categoryMatch == 'yes') {
            return ClassifierPrediction(
              predictedCategory: selectedCategoryId,
              confidence: confidence ?? 0.92,
              isDefinitive: true,
              details: reasoning,
              rawOutput: Map<String, dynamic>.from(valPayload),
            );
          } else if (categoryMatch == 'no') {
            return ClassifierPrediction(
              predictedCategory: detectedSubject.isNotEmpty ? detectedSubject : 'discordant_evidence',
              confidence: confidence ?? 0.90,
              isDefinitive: true,
              details: reasoning,
              rawOutput: Map<String, dynamic>.from(valPayload),
            );
          } else {
            return ClassifierPrediction(
              predictedCategory: null,
              confidence: confidence ?? 0.5,
              isDefinitive: false,
              details: reasoning,
              rawOutput: Map<String, dynamic>.from(valPayload),
            );
          }
        }
      }
    } catch (e) {
      debugPrint('ℹ️ Server-side Gemini Vision evaluation unavailable ($e).');
    }

    // Default fallback when server or Gemini Vision is unreachable: return uncertain/review
    return const ClassifierPrediction(
      predictedCategory: null,
      confidence: null,
      isDefinitive: false,
      details: 'Remote vision verification unavailable; falling back to conservative human review.',
    );
  }
}

/// Conservative 3-level image validation pipeline for civic evidence
class ImageValidationService {
  static ImageClassifierAdapter? _customClassifier;

  /// Registers a pluggable classifier implementation (e.g. trained vision model)
  static void setClassifier(ImageClassifierAdapter? classifier) {
    _customClassifier = classifier;
  }

  /// Resets to default conservative validator
  static void resetClassifier() {
    _customClassifier = null;
  }

  /// Main validation entrypoint
  static Future<ImageValidationResult> validateEvidence({
    required Uint8List imageBytes,
    required String selectedCategoryId,
    String? description,
    String? imagePath,
  }) async {
    // -------------------------------------------------------------------------
    // Level 1: Basic Sanity & Byte Validation
    // -------------------------------------------------------------------------
    if (imageBytes.isEmpty || imageBytes.length < 100) {
      return const ImageValidationResult(
        decision: ImageValidationDecision.reject,
        reason: 'Image file is empty or corrupted (under 100 bytes).',
        userFriendlyMessage:
            'This image file appears to be corrupted or empty. Please select a valid photo.',
        metadata: {'check': 'byte_size_invalid'},
      );
    }

    if (imageBytes.length > 25 * 1024 * 1024) {
      return const ImageValidationResult(
        decision: ImageValidationDecision.reject,
        reason: 'Image exceeds maximum 25MB limit.',
        userFriendlyMessage:
            'The selected image is larger than 25MB. Please upload a compressed or standard photo.',
        metadata: {'check': 'size_exceeded'},
      );
    }

    // -------------------------------------------------------------------------
    // Level 2: Pluggable / Vision Classifier Evaluation
    // -------------------------------------------------------------------------
    ClassifierPrediction? prediction;

    if (_customClassifier != null) {
      try {
        prediction = await _customClassifier!.predictCategory(
          imageBytes,
          imagePath: imagePath,
          description: description,
          selectedCategoryId: selectedCategoryId,
        );
      } catch (e) {
        debugPrint('⚠️ Custom classifier error: $e');
      }
    }

    // If no custom classifier or custom prediction failed, use remote Gemini Vision adapter
    if (prediction == null || (prediction.predictedCategory == null && prediction.confidence == null && !prediction.isDefinitive)) {
      try {
        final serverPrediction = await RemoteGeminiVisionClassifierAdapter.validateWithServer(
          imageBytes: imageBytes,
          selectedCategoryId: selectedCategoryId,
          description: description,
        );

        if (serverPrediction.predictedCategory != null || serverPrediction.isDefinitive) {
          prediction = serverPrediction;
        }
      } catch (e) {
        debugPrint('ℹ️ Gemini Vision evaluation fallback: $e');
      }
    }

    // If remote Gemini Vision is unavailable, check deterministic fallback
    if (prediction == null) {
      try {
        final triageResult = await ImageAnalysisService.analyzeImageBytes(
          imageBytes,
          description: description,
        );

        if (triageResult.isSuccessful && triageResult.category.isNotEmpty && triageResult.category != 'Other') {
          prediction = ClassifierPrediction(
            predictedCategory: triageResult.category,
            confidence: null, // Truthful: remote triage does not fabricate raw logits
            isDefinitive: false,
            details: triageResult.reasoning,
          );
        }
      } catch (e) {
        debugPrint('ℹ️ Image triage evaluation: $e');
      }
    }

    // -------------------------------------------------------------------------
    // Level 3: Category Compatibility & Conservative Triage
    // -------------------------------------------------------------------------
    // CRITICAL: Image existence alone NEVER produces automatic acceptance.
    // If no definitive prediction exists, the system defaults to REVIEW.
    if (prediction == null || prediction.predictedCategory == null || prediction.predictedCategory!.trim().isEmpty) {
      return const ImageValidationResult(
        decision: ImageValidationDecision.review,
        predictedCategory: null,
        confidence: null,
        reason: 'No conclusive visual category match; queued for municipal officer review.',
        userFriendlyMessage:
            "We couldn't confidently verify this image automatically. Your report will be queued for municipal staff review.",
        metadata: {'stage': 'unverified_fallback'},
      );
    }

    final normalizedSelected = _normalizeCategory(selectedCategoryId);
    final normalizedPredicted = _normalizeCategory(prediction.predictedCategory!);

    final isMatching = _categoriesMatch(normalizedSelected, normalizedPredicted);

    // If matching and prediction is marked definitive or matching category
    if (isMatching) {
      return ImageValidationResult(
        decision: ImageValidationDecision.accept,
        predictedCategory: prediction.predictedCategory,
        confidence: prediction.confidence,
        reason: 'Visual evidence matches selected civic category ($normalizedSelected).',
        userFriendlyMessage: 'Evidence appears relevant to the selected issue category.',
        metadata: {
          'selected': selectedCategoryId,
          'predicted': prediction.predictedCategory,
          'details': prediction.details,
        },
      );
    }

    // If prediction is clearly discordant (e.g. food / selfie / completely unrelated) with definitive flag
    final isDiscordant = _isClearlyDiscordant(normalizedSelected, normalizedPredicted);
    if (isDiscordant && prediction.isDefinitive) {
      return ImageValidationResult(
        decision: ImageValidationDecision.reject,
        predictedCategory: prediction.predictedCategory,
        confidence: prediction.confidence,
        reason: 'Visual evidence does not match category ($normalizedSelected vs $normalizedPredicted).',
        userFriendlyMessage:
            "This image doesn't appear to match the selected issue category. Please upload relevant evidence.",
        metadata: {
          'selected': selectedCategoryId,
          'predicted': prediction.predictedCategory,
          'mismatch': true,
        },
      );
    }

    // In all other ambiguous / non-definitive cases, conservatively send to REVIEW
    return ImageValidationResult(
      decision: ImageValidationDecision.review,
      predictedCategory: prediction.predictedCategory,
      confidence: prediction.confidence,
      reason: 'Partial or uncertain category alignment ($normalizedSelected / $normalizedPredicted); queued for staff review.',
      userFriendlyMessage:
          "We couldn't confidently verify this image. Your report will be reviewed by municipal staff.",
      metadata: {
        'selected': selectedCategoryId,
        'predicted': prediction.predictedCategory,
        'ambiguous': true,
      },
    );
  }

  /// Convenience wrapper for File objects
  static Future<ImageValidationResult> validateFile({
    required File imageFile,
    required String selectedCategoryId,
    String? description,
  }) async {
    try {
      final bytes = await imageFile.readAsBytes();
      return await validateEvidence(
        imageBytes: bytes,
        selectedCategoryId: selectedCategoryId,
        description: description,
        imagePath: imageFile.path,
      );
    } catch (e) {
      return ImageValidationResult(
        decision: ImageValidationDecision.reject,
        reason: 'Failed to read image file: $e',
        userFriendlyMessage: 'Unable to process the selected photo. Please try choosing another file.',
      );
    }
  }

  /// Canonical category normalization for civic domains
  static String _normalizeCategory(String raw) {
    final lower = raw.trim().toLowerCase().replaceAll('-', '_').replaceAll(' ', '_');

    if (lower.contains('pothole') || lower.contains('road') || lower.contains('footpath')) {
      return 'roads';
    }
    if (lower.contains('garbage') || lower.contains('waste') || lower.contains('trash') || lower.contains('sanitation')) {
      return 'waste';
    }
    if (lower.contains('water') || lower.contains('leak') || lower.contains('pipe')) {
      return 'water';
    }
    if (lower.contains('drain') || lower.contains('sewag') || lower.contains('manhole')) {
      return 'drainage';
    }
    if (lower.contains('electric') || lower.contains('light') || lower.contains('wire') || lower.contains('power')) {
      return 'electricity';
    }
    if (lower.contains('tree') || lower.contains('park') || lower.contains('branch')) {
      return 'parks';
    }
    if (lower.contains('encroach') || lower.contains('illegal') || lower.contains('unauthorized')) {
      return 'encroachment';
    }
    if (lower.contains('safety') || lower.contains('hazard') || lower.contains('fire') || lower.contains('danger')) {
      return 'safety';
    }
    if (lower.contains('food') || lower.contains('meal') || lower.contains('dining') || lower.contains('dish')) {
      return 'food_irrelevant';
    }
    if (lower.contains('selfie') || lower.contains('portrait') || lower.contains('face')) {
      return 'portrait_irrelevant';
    }

    return lower;
  }

  static bool _categoriesMatch(String cat1, String cat2) {
    if (cat1 == cat2) return true;
    if ((cat1 == 'water' && cat2 == 'drainage') || (cat1 == 'drainage' && cat2 == 'water')) {
      return true;
    }
    return false;
  }

  static bool _isClearlyDiscordant(String selected, String predicted) {
    if (predicted == 'food_irrelevant' || predicted == 'portrait_irrelevant') {
      return true;
    }
    if (selected != predicted && selected != 'other') {
      return true;
    }
    return false;
  }
}
