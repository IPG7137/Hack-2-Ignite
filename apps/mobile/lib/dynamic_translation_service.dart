import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'multilingual_civic_engine.dart';

/// Result object encapsulating translation status, content, and metadata
class DynamicTranslationResult {
  final String originalText;
  final String translatedText;
  final String sourceLanguageCode;
  final String targetLanguageCode;
  final bool isFromCache;
  final bool isSuccessful;
  final String? errorMessage;

  const DynamicTranslationResult({
    required this.originalText,
    required this.translatedText,
    required this.sourceLanguageCode,
    required this.targetLanguageCode,
    this.isFromCache = false,
    this.isSuccessful = true,
    this.errorMessage,
  });

  /// Factory for empty or pass-through text
  factory DynamicTranslationResult.passThrough(String text, String langCode) {
    return DynamicTranslationResult(
      originalText: text,
      translatedText: text,
      sourceLanguageCode: langCode,
      targetLanguageCode: langCode,
      isFromCache: true,
      isSuccessful: true,
    );
  }

  /// Factory for failure fallback
  factory DynamicTranslationResult.fallback(
    String original,
    String fallbackText,
    String srcCode,
    String targetCode, {
    String? error,
  }) {
    return DynamicTranslationResult(
      originalText: original,
      translatedText: fallbackText,
      sourceLanguageCode: srcCode,
      targetLanguageCode: targetCode,
      isFromCache: false,
      isSuccessful: true,
      errorMessage: error,
    );
  }
}

/// Lightweight On-Demand Translation Service for Civic User-Generated Content
class DynamicTranslationService {
  static final DynamicTranslationService _instance = DynamicTranslationService._internal();
  factory DynamicTranslationService() => _instance;
  DynamicTranslationService._internal();

  // In-memory cache keyed by "${text.hashCode}_$targetLanguageCode"
  final Map<String, String> _translationCache = {};

  /// Translates dynamic civic content on-demand into target locale
  Future<DynamicTranslationResult> translate({
    required String text,
    required String targetLanguageCode,
    bool forceRefresh = false,
  }) async {
    final clean = text.trim();
    if (clean.isEmpty) {
      return DynamicTranslationResult.passThrough(text, targetLanguageCode);
    }

    final targetLang = CivicLanguage.fromCode(targetLanguageCode);
    final detectedSource = MultilingualCivicEngine.detectLanguage(clean);

    // If text is already in the target language, no translation needed
    if (detectedSource.code == targetLang.code) {
      return DynamicTranslationResult.passThrough(clean, targetLang.code);
    }

    final cacheKey = '${clean.hashCode}_${targetLang.code}';

    // 1. Check in-memory cache
    if (!forceRefresh && _translationCache.containsKey(cacheKey)) {
      final cached = _translationCache[cacheKey]!;
      return DynamicTranslationResult(
        originalText: clean,
        translatedText: cached,
        sourceLanguageCode: detectedSource.code,
        targetLanguageCode: targetLang.code,
        isFromCache: true,
        isSuccessful: true,
      );
    }

    // 2. Attempt Remote Translation via Supabase Edge Function (Zero API key exposure)
    String? remoteTranslation;
    try {
      if (Supabase.instance.isInitialized) {
        final client = Supabase.instance.client;
        final response = await client.functions.invoke(
          'ai-triage',
          body: {
            'action': 'translate',
            'text': clean,
            'target_language': targetLang.code,
          },
        );

        if (response.status == 200 && response.data != null) {
          final data = response.data is Map ? response.data['data'] : null;
          if (data is Map && data['translated_text'] != null) {
            final trans = data['translated_text'].toString().trim();
            if (trans.isNotEmpty && trans != clean) {
              remoteTranslation = trans;
            }
          }
        }
      }
    } catch (e) {
      debugPrint('ℹ️ Remote translation edge function unavailable: $e. Using local multilingual civic engine fallback.');
    }

    if (remoteTranslation != null && remoteTranslation.isNotEmpty) {
      _translationCache[cacheKey] = remoteTranslation;
      return DynamicTranslationResult(
        originalText: clean,
        translatedText: remoteTranslation,
        sourceLanguageCode: detectedSource.code,
        targetLanguageCode: targetLang.code,
        isFromCache: false,
        isSuccessful: true,
      );
    }

    // 3. High-Quality Local Civic Semantic Translation Fallback
    final localTranslation = MultilingualCivicEngine.translateCivicText(
      clean,
      targetLanguage: targetLang,
      sourceLanguage: detectedSource,
    );

    _translationCache[cacheKey] = localTranslation;

    return DynamicTranslationResult.fallback(
      clean,
      localTranslation,
      detectedSource.code,
      targetLang.code,
    );
  }

  /// Determines if an on-demand translation toggle should be offered
  bool shouldOfferTranslation({
    required String text,
    required String currentLocaleCode,
  }) {
    final clean = text.trim();
    if (clean.length < 3) return false;

    final detected = MultilingualCivicEngine.detectLanguage(clean);
    final current = CivicLanguage.fromCode(currentLocaleCode);

    return detected.code != current.code;
  }

  /// Button label for requesting translation
  String getTranslateActionLabel(String targetLanguageCode) {
    switch (targetLanguageCode.toLowerCase()) {
      case 'mr':
        return 'मराठीत पहा';
      case 'hi':
        return 'हिंदी में देखें';
      case 'en':
      default:
        return 'Translate to English';
    }
  }

  /// Button label for reverting to original text
  String getSeeOriginalActionLabel(String targetLanguageCode) {
    switch (targetLanguageCode.toLowerCase()) {
      case 'mr':
        return 'मूळ मजकूर पहा';
      case 'hi':
        return 'मूल पाठ देखें';
      case 'en':
      default:
        return 'See original';
    }
  }

  /// Manually seed cache (useful for testing or prefetching)
  void seedCache(String text, String targetLanguageCode, String translatedText) {
    final cacheKey = '${text.trim().hashCode}_$targetLanguageCode';
    _translationCache[cacheKey] = translatedText;
  }

  /// Clear in-memory translation cache
  void clearCache() {
    _translationCache.clear();
  }
}
