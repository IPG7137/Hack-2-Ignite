import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:civic_resolve/dynamic_translation_service.dart';
import 'package:civic_resolve/dynamic_translatable_text.dart';
import 'package:civic_resolve/language_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('Round 2 P1: Dynamic Civic Content Language Support Tests', () {
    late DynamicTranslationService translationService;
    late LanguageService languageService;

    setUp(() async {
      SharedPreferences.setMockInitialValues({});
      translationService = DynamicTranslationService();
      translationService.clearCache();
      languageService = LanguageService();
      final enLang = LanguageService.supportedLanguages.firstWhere((l) => l.code == 'en');
      await languageService.changeLanguage(enLang);
    });

    test('1. English original → Marathi on-demand translation', () async {
      const englishText = 'Large pothole near the highway';

      final result = await translationService.translate(
        text: englishText,
        targetLanguageCode: 'mr',
      );

      expect(result.isSuccessful, isTrue);
      expect(result.originalText, equals(englishText));
      expect(result.sourceLanguageCode, equals('en'));
      expect(result.targetLanguageCode, equals('mr'));
      expect(result.translatedText, contains('खड्डा'));
      expect(result.translatedText, contains('महामार्ग'));
    });

    test('2. English original → Hindi on-demand translation', () async {
      const englishText = 'Large pothole near the highway';

      final result = await translationService.translate(
        text: englishText,
        targetLanguageCode: 'hi',
      );

      expect(result.isSuccessful, isTrue);
      expect(result.originalText, equals(englishText));
      expect(result.sourceLanguageCode, equals('en'));
      expect(result.targetLanguageCode, equals('hi'));
      expect(result.translatedText, contains('गड्ढा'));
      expect(result.translatedText, contains('हाईवे'));
    });

    test('3. Marathi original → English and Hindi translation', () async {
      const marathiText = 'रस्त्यावर मोठा खड्डा आहे, रात्री खूप धोकादायक आहे.';

      // To English
      final toEnglish = await translationService.translate(
        text: marathiText,
        targetLanguageCode: 'en',
      );
      expect(toEnglish.isSuccessful, isTrue);
      expect(toEnglish.originalText, equals(marathiText));
      expect(toEnglish.sourceLanguageCode, equals('mr'));
      expect(toEnglish.targetLanguageCode, equals('en'));
      expect(toEnglish.translatedText.toLowerCase(), contains('pothole'));

      // To Hindi
      final toHindi = await translationService.translate(
        text: marathiText,
        targetLanguageCode: 'hi',
      );
      expect(toHindi.isSuccessful, isTrue);
      expect(toHindi.originalText, equals(marathiText));
      expect(toHindi.targetLanguageCode, equals('hi'));
      expect(toHindi.translatedText, contains('गड्ढा'));
    });

    test('4. Hindi original → Marathi translation', () async {
      const hindiText = 'गटर का ढक्कन खुला है और सीवर का पानी बह रहा है';

      final result = await translationService.translate(
        text: hindiText,
        targetLanguageCode: 'mr',
      );

      expect(result.isSuccessful, isTrue);
      expect(result.originalText, equals(hindiText));
      expect(result.sourceLanguageCode, equals('hi'));
      expect(result.targetLanguageCode, equals('mr'));
      expect(result.translatedText, contains('गटार'));
    });

    test('5. Translation Caching: Repeated requests hit cache without recalculation', () async {
      const sampleText = 'Water pipe leakage on main road';

      // First call (computes/fetches and caches)
      final first = await translationService.translate(
        text: sampleText,
        targetLanguageCode: 'mr',
      );
      expect(first.isSuccessful, isTrue);

      // Second call (must be from cache)
      final second = await translationService.translate(
        text: sampleText,
        targetLanguageCode: 'mr',
      );
      expect(second.isSuccessful, isTrue);
      expect(second.isFromCache, isTrue);
      expect(second.translatedText, equals(first.translatedText));
    });

    test('6. Translation unavailable fallback preserves report and never crashes', () async {
      const unknownText = 'Unknown landmark near sector 99';

      final result = await translationService.translate(
        text: unknownText,
        targetLanguageCode: 'mr',
      );

      // Must succeed and produce meaningful text without throwing
      expect(result.isSuccessful, isTrue);
      expect(result.originalText, equals(unknownText));
      expect(result.translatedText, isNotEmpty);
    });

    test('7. Pass-through when source language already matches target locale', () async {
      const marathiText = 'रस्त्यावरील खड्डे त्वरित बुजवावे';

      final result = await translationService.translate(
        text: marathiText,
        targetLanguageCode: 'mr',
      );

      expect(result.isSuccessful, isTrue);
      expect(result.originalText, equals(marathiText));
      expect(result.translatedText, equals(marathiText));
      expect(result.sourceLanguageCode, equals('mr'));
    });

    test('8. shouldOfferTranslation and Action Labels in Marathi and Hindi', () {
      const englishText = 'Large pothole near the highway';
      const marathiText = 'रस्त्यावर मोठा खड्डा आहे';

      // When app is in Marathi:
      expect(translationService.shouldOfferTranslation(text: englishText, currentLocaleCode: 'mr'), isTrue);
      expect(translationService.shouldOfferTranslation(text: marathiText, currentLocaleCode: 'mr'), isFalse);
      expect(translationService.getTranslateActionLabel('mr'), equals('मराठीत पहा'));
      expect(translationService.getSeeOriginalActionLabel('mr'), equals('मूळ मजकूर पहा'));

      // When app is in Hindi:
      expect(translationService.shouldOfferTranslation(text: englishText, currentLocaleCode: 'hi'), isTrue);
      expect(translationService.getTranslateActionLabel('hi'), equals('हिंदी में देखें'));
      expect(translationService.getSeeOriginalActionLabel('hi'), equals('मूल पाठ देखें'));

      // When app is in English:
      expect(translationService.shouldOfferTranslation(text: marathiText, currentLocaleCode: 'en'), isTrue);
      expect(translationService.getTranslateActionLabel('en'), equals('Translate to English'));
      expect(translationService.getSeeOriginalActionLabel('en'), equals('See original'));
    });

    testWidgets('9. DynamicTranslatableText Widget: on-demand toggle in Marathi locale', (tester) async {
      final mrLang = LanguageService.supportedLanguages.firstWhere((l) => l.code == 'mr');
      await languageService.changeLanguage(mrLang);

      const dynamicComplaint = 'Large pothole near the highway';

      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: DynamicTranslatableText(
              text: dynamicComplaint,
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Initially displays original English text + "मराठीत पहा" action
      expect(find.text(dynamicComplaint), findsOneWidget);
      expect(find.text('मराठीत पहा'), findsOneWidget);

      // Tap on-demand translation button
      await tester.tap(find.text('मराठीत पहा'));
      await tester.pumpAndSettle();

      // Displays Marathi translated text + "मूळ मजकूर पहा" revert action + badge
      expect(find.text('मराठीत पहा'), findsNothing);
      expect(find.text('मूळ मजकूर पहा'), findsOneWidget);
      expect(find.text('मराठी भाषांतर'), findsOneWidget);
      expect(find.text('महामार्गाजवळ मोठा खड्डा आहे.'), findsOneWidget);

      // Tap "मूळ मजकूर पहा" to revert back to original
      await tester.tap(find.text('मूळ मजकूर पहा'));
      await tester.pumpAndSettle();

      // Reverted to original text
      expect(find.text(dynamicComplaint), findsOneWidget);
      expect(find.text('मराठीत पहा'), findsOneWidget);
    });
  });
}
