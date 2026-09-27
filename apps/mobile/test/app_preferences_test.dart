import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:civic_resolve/app_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('AppPreferences Onboarding & Roles Tests', () {
    setUp(() {
      SharedPreferences.setMockInitialValues({});
    });

    test('Initial onboarding and welcome state is false', () async {
      final prefs = AppPreferences.instance;
      expect(await prefs.hasSeenWelcome(), isFalse);
      expect(await prefs.hasSeenOnboarding(), isFalse);
    });

    test('Setting welcome seen updates state', () async {
      final prefs = AppPreferences.instance;
      await prefs.setWelcomeSeen();
      expect(await prefs.hasSeenWelcome(), isTrue);
      expect(await prefs.hasSeenOnboarding(), isFalse);
    });

    test('Setting onboarding seen updates state', () async {
      final prefs = AppPreferences.instance;
      await prefs.setOnboardingSeen();
      expect(await prefs.hasSeenOnboarding(), isTrue);
    });

    test('Resetting onboarding restores false state', () async {
      final prefs = AppPreferences.instance;
      await prefs.setWelcomeSeen();
      await prefs.setOnboardingSeen();
      expect(await prefs.hasSeenWelcome(), isTrue);
      expect(await prefs.hasSeenOnboarding(), isTrue);

      await prefs.resetOnboarding();
      expect(await prefs.hasSeenWelcome(), isFalse);
      expect(await prefs.hasSeenOnboarding(), isFalse);
    });

    test('User role can be stored, retrieved, and cleared', () async {
      expect(await AppPreferences.getUserRole(), isNull);
      await AppPreferences.setUserRole('citizen');
      expect(await AppPreferences.getUserRole(), equals('citizen'));
      await AppPreferences.setUserRole('contractor');
      expect(await AppPreferences.getUserRole(), equals('contractor'));
      await AppPreferences.clearUserRole();
      expect(await AppPreferences.getUserRole(), isNull);
    });

    test('User profile data can be persisted and cleared', () async {
      expect(await AppPreferences.getUserProfile(), isNull);
      final profile = {
        'id': 'user_123',
        'name': 'Test Citizen',
        'phone': '9876543210',
      };
      await AppPreferences.setUserProfile(profile);
      final loaded = await AppPreferences.getUserProfile();
      expect(loaded, isNotNull);
      expect(loaded?['name'], equals('Test Citizen'));
      await AppPreferences.clearUserProfile();
      expect(await AppPreferences.getUserProfile(), isNull);
    });
  });
}
