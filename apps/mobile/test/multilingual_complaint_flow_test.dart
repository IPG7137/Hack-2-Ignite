import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:civic_resolve/multilingual_civic_engine.dart';
import 'package:civic_resolve/language_service.dart';
import 'package:civic_resolve/priority_engine.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('End-to-End Multilingual Complaint Intelligence Flow Tests', () {
    late LanguageService languageService;

    setUp(() async {
      SharedPreferences.setMockInitialValues({});
      languageService = LanguageService();
    });

    test('1. Marathi Flow: "रस्त्यावर मोठा खड्डा आहे आणि रात्री अपघात होण्याची शक्यता आहे."', () async {
      // Step 1: User chooses Marathi language preference
      final marathiLang = LanguageService.supportedLanguages.firstWhere((l) => l.code == 'mr');
      await languageService.changeLanguage(marathiLang);

      expect(languageService.currentLanguage.code, 'mr');
      expect(languageService.getTranslation('select_category_step'), 'टप्पा १/३: वर्ग निवडा');
      expect(languageService.getTranslation('complaint_description'), 'तक्रारीचे वर्णन *');
      expect(languageService.getTranslation('submit_complaint'), 'तक्रार दाखल करा');
      expect(languageService.getTranslation('cat_potholes_roads'), 'रस्ते आणि खड्डे');

      // Step 2: Citizen enters complaint in Marathi
      const rawComplaint = 'रस्त्यावर मोठा खड्डा आहे आणि रात्री अपघात होण्याची शक्यता आहे.';

      // Step 3: Multilingual Civic Engine semantic extraction
      final analysis = MultilingualCivicEngine.analyzeCivicComplaint(rawComplaint);

      // Verify language detection
      expect(analysis.language, CivicLanguage.marathi);

      // Verify category extraction
      expect(analysis.canonicalCategoryId, 'potholes_roads');
      expect(analysis.categoryNameLocal, contains('रस्ते'));

      // Verify issue extraction
      expect(analysis.extractedIssue.toLowerCase(), anyOf(contains('खड्डा'), contains('pothole'), contains('रस्ता')));

      // Verify safety context extraction
      expect(analysis.hasSafetyHazard, isTrue);
      expect(analysis.safetyContext, isNotNull);
      expect(analysis.safetyContext, contains('अपघात'));

      // Verify priority and routing
      expect(analysis.priorityLevel, anyOf('High', 'Critical'));
      expect(analysis.slaEstimate, contains('२४ तास'));
      expect(analysis.routingDepartmentLocal, contains('सार्वजनिक बांधकाम विभाग'));

      // Verify canonical English summary for backend
      expect(analysis.translatedSummaryEn.toLowerCase(), contains('pothole'));
    });

    test('2. Marathi Flow Variant: "रस्त्यावर मोठा खड्डा आहे, रात्री खूप धोकादायक आहे."', () {
      const rawComplaint = 'रस्त्यावर मोठा खड्डा आहे, रात्री खूप धोकादायक आहे.';
      final analysis = MultilingualCivicEngine.analyzeCivicComplaint(rawComplaint);

      expect(analysis.language, CivicLanguage.marathi);
      expect(analysis.canonicalCategoryId, 'potholes_roads');
      expect(analysis.hasSafetyHazard, isTrue);
      expect(analysis.priorityLevel, anyOf('High', 'Critical'));
    });

    test('3. Hindi Flow: "सड़क पर खुला मैनहोल है, बच्चे गिर सकते हैं तुरंत ठीक करें"', () async {
      // Step 1: User switches to Hindi
      final hindiLang = LanguageService.supportedLanguages.firstWhere((l) => l.code == 'hi');
      await languageService.changeLanguage(hindiLang);

      expect(languageService.currentLanguage.code, 'hi');
      expect(languageService.getTranslation('select_category_step'), 'चरण १/३: श्रेणी चुनें');
      expect(languageService.getTranslation('submit_complaint'), 'शिकायत दर्ज करें');

      // Step 2: Complaint entered in Hindi
      const rawComplaint = 'सड़क पर खुला मैनहोल है, बच्चे गिर सकते हैं तुरंत ठीक करें';

      // Step 3: Semantic extraction
      final analysis = MultilingualCivicEngine.analyzeCivicComplaint(rawComplaint);

      expect(analysis.language, CivicLanguage.hindi);
      expect(analysis.canonicalCategoryId, 'drainage_sewage');
      expect(analysis.hasSafetyHazard, isTrue);
      expect(analysis.safetyContext, isNotNull);
      expect(analysis.priorityLevel, anyOf('High', 'Critical'));
      expect(analysis.routingDepartmentLocal, anyOf(contains('जल निकासी'), contains('सीवरेज'), contains('ड्रेनेज')));
      expect(analysis.translatedSummaryEn.toLowerCase(), contains('manhole'));
    });

    test('4. Hindi Waste Flow: "बाजार में बहुत सारा कचरा फैला हुआ है और बहुत बदबू आ रही है"', () {
      const rawComplaint = 'बाजार में बहुत सारा कचरा फैला हुआ है और बहुत बदबू आ रही है';
      final analysis = MultilingualCivicEngine.analyzeCivicComplaint(rawComplaint);

      expect(analysis.language, CivicLanguage.hindi);
      expect(analysis.canonicalCategoryId, 'waste_management');
      expect(analysis.categoryNameLocal, anyOf(contains('अपशिष्ट'), contains('कचरा')));
      expect(analysis.routingDepartmentLocal, anyOf(contains('अपशिष्ट'), contains('स्वच्छता')));
    });

    test('5. English Electrical Safety Flow: "Sparking transformer and hanging live wires near bus stop."', () async {
      final engLang = LanguageService.supportedLanguages.firstWhere((l) => l.code == 'en');
      await languageService.changeLanguage(engLang);

      const rawComplaint = 'Sparking transformer and hanging live wires near bus stop.';
      final analysis = MultilingualCivicEngine.analyzeCivicComplaint(rawComplaint);

      expect(analysis.language, CivicLanguage.english);
      expect(analysis.canonicalCategoryId, 'electricity_streetlights');
      expect(analysis.hasSafetyHazard, isTrue);
      expect(analysis.priorityLevel, anyOf('High', 'Critical'));
      expect(analysis.routingDepartmentLocal, anyOf(contains('Electric'), contains('विद्युत')));
    });

    test('6. CivicPriorityEngine integration with Multilingual Civic descriptions', () {
      // Test Marathi hazard complaint with civic clustering
      const marathiComplaint = 'रस्त्यावर मोठा खड्डा आहे आणि रात्री अपघात होण्याची शक्यता आहे.';
      final marathiAnalysis = MultilingualCivicEngine.analyzeCivicComplaint(marathiComplaint);
      final marathiPriority = CivicPriorityEngine.evaluatePriority(
        severity: marathiAnalysis.priorityLevel,
        category: 'Roads & Potholes',
        title: 'Road Damage',
        description: marathiComplaint,
        relatedComplaintsCount: 1,
      );
      expect(marathiPriority.levelLabel, anyOf('High', 'Critical'));
      expect(marathiPriority.score, greaterThan(60.0));

      // Test Hindi open manhole through standard CivicPriorityEngine
      const hindiComplaint = 'सड़क पर खुला मैनहोल है, बच्चे गिर सकते हैं तुरंत ठीक करें';
      final hindiAnalysis = MultilingualCivicEngine.analyzeCivicComplaint(hindiComplaint);
      final hindiPriority = CivicPriorityEngine.evaluatePriority(
        severity: hindiAnalysis.priorityLevel,
        category: 'Drainage & Sewage',
        title: 'Open Manhole',
        description: hindiComplaint,
        relatedComplaintsCount: 1,
      );
      expect(hindiPriority.levelLabel, anyOf('High', 'Critical'));
      expect(hindiPriority.score, greaterThan(60.0));
    });
  });
}
