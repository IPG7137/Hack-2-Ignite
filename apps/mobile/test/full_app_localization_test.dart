import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:civic_resolve/language_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('Full App Multilingual Localization Tests (Round 2)', () {
    late LanguageService languageService;

    setUp(() async {
      SharedPreferences.setMockInitialValues({});
      languageService = LanguageService();
    });

    test('Supported languages include English, Hindi, and Marathi', () {
      final supportedCodes = LanguageService.supportedLanguages.map((l) => l.code).toList();
      expect(supportedCodes, containsAll(['en', 'hi', 'mr']));
    });

    test('Default locale is English', () {
      expect(languageService.currentLanguage.code, 'en');
      expect(languageService.getTranslation('citizen'), 'Citizen');
      expect(languageService.getTranslation('nav_home'), 'Home');
    });

    test('Switching to Hindi updates all citizen-facing keys without English fallback', () async {
      final hiLang = LanguageService.supportedLanguages.firstWhere((l) => l.code == 'hi');
      await languageService.changeLanguage(hiLang);

      expect(languageService.currentLanguage.code, 'hi');
      expect(languageService.getTranslation('citizen'), 'नागरिक');
      expect(languageService.getTranslation('nav_home'), 'होम');
      expect(languageService.getTranslation('nav_report'), 'रिपोर्ट');
      expect(languageService.getTranslation('nav_track'), 'ट्रैक');
      expect(languageService.getTranslation('nav_map'), 'नक्शा');
      expect(languageService.getTranslation('nav_profile'), 'प्रोफ़ाइल');
      expect(languageService.getTranslation('cat_potholes_roads'), 'सड़क और गड्ढे');
      expect(languageService.getTranslation('status_submitted'), 'जमा किया गया');
      expect(languageService.getTranslation('status_in_progress'), 'कार्य प्रगति पर');
      expect(languageService.getTranslation('status_resolved'), 'हल हो गया');
      expect(languageService.getTranslation('emergency_contacts'), 'आपातकालीन हेल्पलाइन नंबर');
      expect(languageService.getTranslation('my_profile'), 'मेरी प्रोफ़ाइल');
      expect(languageService.getTranslation('help_support'), 'सहायता और समर्थन');
      expect(languageService.getTranslation('notifications'), 'सूचनाएं');
    });

    test('Switching to Marathi updates entire app to Marathi without English fallback', () async {
      final mrLang = LanguageService.supportedLanguages.firstWhere((l) => l.code == 'mr');
      await languageService.changeLanguage(mrLang);

      expect(languageService.currentLanguage.code, 'mr');
      expect(languageService.getTranslation('citizen'), 'नागरिक');
      expect(languageService.getTranslation('nav_home'), 'मुख्यपृष्ठ');
      expect(languageService.getTranslation('nav_report'), 'तक्रार');
      expect(languageService.getTranslation('nav_track'), 'ट्रॅक');
      expect(languageService.getTranslation('nav_map'), 'नकाशा');
      expect(languageService.getTranslation('nav_profile'), 'प्रोफाइल');
      expect(languageService.getTranslation('cat_potholes_roads'), 'रस्ते आणि खड्डे');
      expect(languageService.getTranslation('status_submitted'), 'नोंदवले');
      expect(languageService.getTranslation('status_in_progress'), 'काम प्रगतीपथावर');
      expect(languageService.getTranslation('status_resolved'), 'समस्या निवारण झाले');
      expect(languageService.getTranslation('emergency_contacts'), 'आपत्कालीन हेल्पलाईन क्रमांक');
      expect(languageService.getTranslation('my_profile'), 'माझी प्रोफाइल');
      expect(languageService.getTranslation('help_support'), 'मदत आणि सहाय्य');
      expect(languageService.getTranslation('notifications'), 'सूचना');
    });

    test('Language preference persists in SharedPreferences across session restores', () async {
      SharedPreferences.setMockInitialValues({'selected_language': 'mr'});
      
      final restoredService = LanguageService();
      // Allow any microtask / async prefs load
      await Future.delayed(const Duration(milliseconds: 50));

      final mrLang = LanguageService.supportedLanguages.firstWhere((l) => l.code == 'mr');
      await restoredService.changeLanguage(mrLang);

      final prefs = await SharedPreferences.getInstance();
      expect(prefs.getString('selected_language'), 'mr');
    });

    test('Key parity: All critical citizen keys in EN exist in HI and MR', () {
      final criticalKeys = [
        'app_name', 'welcome_to_civicresolve', 'citizen', 'public_servant',
        'nav_home', 'nav_report', 'nav_track', 'nav_map', 'nav_profile',
        'report_problem_title', 'recent_grievances', 'my_reports', 'community_reports',
        'select_category_step', 'provide_details_step', 'review_submit_step',
        'cat_potholes_roads', 'cat_water_drainage', 'cat_electricity_streetlights',
        'cat_waste_management', 'cat_safety_hazard',
        'priority_high', 'priority_medium', 'priority_low', 'priority_critical',
        'status_submitted', 'status_under_review', 'status_assigned',
        'status_in_progress', 'status_resolution_submitted', 'status_citizen_verification',
        'status_resolved', 'status_closed', 'status_reopened',
        'civic_feed_title', 'nearby_issues', 'support_issue',
        'my_profile', 'edit_profile', 'logout', 'cancel', 'confirm',
        'emergency_contacts', 'help_support', 'notifications',
      ];

      final hiLang = LanguageService.supportedLanguages.firstWhere((l) => l.code == 'hi');
      final mrLang = LanguageService.supportedLanguages.firstWhere((l) => l.code == 'mr');

      // Test Hindi
      languageService.changeLanguage(hiLang);
      for (final key in criticalKeys) {
        final val = languageService.getTranslation(key);
        expect(val, isNotEmpty, reason: 'Key $key in HI should not be empty');
        expect(val, isNot(equals(key)), reason: 'Key $key in HI should have real translation, not raw key');
      }

      // Test Marathi
      languageService.changeLanguage(mrLang);
      for (final key in criticalKeys) {
        final val = languageService.getTranslation(key);
        expect(val, isNotEmpty, reason: 'Key $key in MR should not be empty');
        expect(val, isNot(equals(key)), reason: 'Key $key in MR should have real translation, not raw key');
      }
    });
  });
}
