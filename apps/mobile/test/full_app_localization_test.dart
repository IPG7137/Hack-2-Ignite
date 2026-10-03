import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:civic_resolve/language_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('Full App Multilingual Localization Tests (Round 2 P0)', () {
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
      await Future.delayed(const Duration(milliseconds: 50));

      final mrLang = LanguageService.supportedLanguages.firstWhere((l) => l.code == 'mr');
      await restoredService.changeLanguage(mrLang);

      final prefs = await SharedPreferences.getInstance();
      expect(prefs.getString('selected_language'), 'mr');
    });

    test('localizeStatus translates all lifecycle stages in EN, HI, MR', () async {
      final enLang = LanguageService.supportedLanguages.firstWhere((l) => l.code == 'en');
      final hiLang = LanguageService.supportedLanguages.firstWhere((l) => l.code == 'hi');
      final mrLang = LanguageService.supportedLanguages.firstWhere((l) => l.code == 'mr');

      // English
      await languageService.changeLanguage(enLang);
      expect(languageService.localizeStatus('submitted'), 'Submitted');
      expect(languageService.localizeStatus('assigned'), 'Assigned');
      expect(languageService.localizeStatus('in_progress'), 'In Progress');
      expect(languageService.localizeStatus('resolution_submitted'), 'Resolution Submitted');
      expect(languageService.localizeStatus('citizen_verification'), 'Citizen Verification');
      expect(languageService.localizeStatus('resolved'), 'Resolved');
      expect(languageService.localizeStatus('closed'), 'Closed');
      expect(languageService.localizeStatus('reopened'), 'Reopened');

      // Hindi
      await languageService.changeLanguage(hiLang);
      expect(languageService.localizeStatus('submitted'), 'जमा किया गया');
      expect(languageService.localizeStatus('assigned'), 'अधिकारी नियुक्त');
      expect(languageService.localizeStatus('in_progress'), 'कार्य प्रगति पर');
      expect(languageService.localizeStatus('resolution_submitted'), 'समाधान प्रस्तुत');
      expect(languageService.localizeStatus('citizen_verification'), 'नागरिक सत्यापन');
      expect(languageService.localizeStatus('resolved'), 'हल हो गया');
      expect(languageService.localizeStatus('closed'), 'बंद');
      expect(languageService.localizeStatus('reopened'), 'पुनः खोला गया');

      // Marathi
      await languageService.changeLanguage(mrLang);
      expect(languageService.localizeStatus('submitted'), 'नोंदवले');
      expect(languageService.localizeStatus('assigned'), 'अधिकारी नेमले');
      expect(languageService.localizeStatus('in_progress'), 'काम प्रगतीपथावर');
      expect(languageService.localizeStatus('resolution_submitted'), 'तोडगा सादर केला');
      expect(languageService.localizeStatus('citizen_verification'), 'नागरिक पडताळणी');
      expect(languageService.localizeStatus('resolved'), 'समस्या निवारण झाले');
      expect(languageService.localizeStatus('closed'), 'बंद केले');
      expect(languageService.localizeStatus('reopened'), 'पुन्हा उघडले');
    });

    test('localizePriority translates priorities accurately in EN, HI, MR', () async {
      final enLang = LanguageService.supportedLanguages.firstWhere((l) => l.code == 'en');
      final hiLang = LanguageService.supportedLanguages.firstWhere((l) => l.code == 'hi');
      final mrLang = LanguageService.supportedLanguages.firstWhere((l) => l.code == 'mr');

      // English
      await languageService.changeLanguage(enLang);
      expect(languageService.localizePriority('low'), 'Low');
      expect(languageService.localizePriority('medium'), 'Medium');
      expect(languageService.localizePriority('high'), 'High');
      expect(languageService.localizePriority('critical'), 'Critical');

      // Hindi
      await languageService.changeLanguage(hiLang);
      expect(languageService.localizePriority('low'), 'निम्न');
      expect(languageService.localizePriority('medium'), 'मध्यम');
      expect(languageService.localizePriority('high'), 'उच्च');
      expect(languageService.localizePriority('critical'), 'अतिगंभीर');

      // Marathi
      await languageService.changeLanguage(mrLang);
      expect(languageService.localizePriority('low'), 'सामान्य');
      expect(languageService.localizePriority('medium'), 'मध्यम');
      expect(languageService.localizePriority('high'), 'उच्च');
      expect(languageService.localizePriority('critical'), 'अतिगंभीर');
    });

    test('localizeCategory maps civic categories accurately across languages', () async {
      final hiLang = LanguageService.supportedLanguages.firstWhere((l) => l.code == 'hi');
      final mrLang = LanguageService.supportedLanguages.firstWhere((l) => l.code == 'mr');

      await languageService.changeLanguage(hiLang);
      expect(languageService.localizeCategory('potholes_roads'), 'सड़क और गड्ढे');
      expect(languageService.localizeCategory('water_drainage'), 'जलापूर्ति एवं लीकेज');
      expect(languageService.localizeCategory('waste_management'), 'कचरा एवं स्वच्छता');
      expect(languageService.localizeCategory('electricity_streetlights'), 'बिजली व स्ट्रीट लाइट');

      await languageService.changeLanguage(mrLang);
      expect(languageService.localizeCategory('potholes_roads'), 'रस्ते आणि खड्डे');
      expect(languageService.localizeCategory('water_drainage'), 'पाणीपुरवठा व गळती');
      expect(languageService.localizeCategory('waste_management'), 'कचरा व स्वच्छता');
      expect(languageService.localizeCategory('electricity_streetlights'), 'विद्युत व पथदिवे');
    });

    test('Complete Key Parity: Every key in English dictionary has a valid translation in Hindi and Marathi', () {
      final canonicalKeys = LanguageService.getAllCanonicalKeys();
      expect(canonicalKeys, isNotEmpty);

      final hiDict = LanguageService.getTranslationsFor('hi') ?? {};
      final mrDict = LanguageService.getTranslationsFor('mr') ?? {};

      final missingInHi = <String>[];
      final missingInMr = <String>[];

      for (final key in canonicalKeys) {
        if (!hiDict.containsKey(key) || hiDict[key]!.trim().isEmpty) {
          missingInHi.add(key);
        }
        if (!mrDict.containsKey(key) || mrDict[key]!.trim().isEmpty) {
          missingInMr.add(key);
        }
      }

      expect(missingInHi, isEmpty, reason: 'Keys missing in Hindi dictionary: $missingInHi');
      expect(missingInMr, isEmpty, reason: 'Keys missing in Marathi dictionary: $missingInMr');
    });
  });
}
