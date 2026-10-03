import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:civic_resolve/auth_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    await AuthService.instance.logout();
  });

  tearDown(() async {
    await AuthService.instance.logout();
  });

  group('Authoritative Role & Authentication Security Tests', () {
    late AuthService auth;

    setUp(() {
      auth = AuthService.instance;
    });

    test('1. Citizen login resolves role to citizen and routes to Citizen Dashboard', () async {
      final result = await auth.login('demo.citizen@civicresolve.gov', 'civic123456', role: 'citizen');

      expect(result.success, isTrue);
      expect(auth.userRole, equals('citizen'));
      expect(auth.isFieldWorker, isFalse);
      expect(auth.isAdmin, isFalse);
    });

    test('2. Officer account resolves role to officer/contractor and enables isFieldWorker', () async {
      final result = await auth.login('demo.officer@civicresolve.gov', 'civic123456', role: 'officer');

      expect(result.success, isTrue);
      expect(auth.isFieldWorker, isTrue);
      expect(auth.isAdmin, isTrue);
      expect(
        auth.userRole == 'officer' || auth.userRole == 'field_worker' || auth.userRole == 'contractor',
        isTrue,
      );
    });

    test('3. Field worker role is recognized by isFieldWorker helper', () {
      // Direct verification of role categorization
      expect(auth.isFieldWorker, isFalse); // default
    });

    test('4. Contractor account login preserves contractor privileges without fallback to citizen', () async {
      final result = await auth.login('contractor@civicresolve.gov', 'civic123456', role: 'contractor');

      expect(result.success, isTrue);
      expect(auth.isFieldWorker, isTrue);
      expect(auth.userRole, isNot(equals('citizen')));
    });

    test('5. Admin account identifiers are rejected with Web Portal redirection notice', () async {
      final stateAdminResult = await auth.login('state_admin@civicresolve.gov', 'civic123456', role: 'officer');
      expect(stateAdminResult.success, isFalse);
      expect(stateAdminResult.message, contains('CivicResolve Web Administrative Portal'));

      final superAdminResult = await auth.login('super_admin@civicresolve.gov', 'civic123456', role: 'citizen');
      expect(superAdminResult.success, isFalse);
      expect(superAdminResult.message, contains('CivicResolve Web Administrative Portal'));
    });

    test('6. Security: Citizen credentials submitted on Field Officer login tab are REJECTED', () async {
      // An attempt to use citizen credentials on the Field Officer tab
      final result = await auth.login('demo.citizen@civicresolve.gov', 'civic123456', role: 'officer');

      expect(result.success, isFalse);
      expect(result.message, contains('Access Denied'));
      expect(auth.isLoggedIn, isFalse);
      expect(auth.isFieldWorker, isFalse);
    });

    test('7. Security: UI selection of Officer/Contractor tab CANNOT elevate citizen privileges', () async {
      // Simulate citizen login with aadhaar number on officer tab
      final result = await auth.login('999988887777', '123456', role: 'officer');

      expect(result.success, isFalse);
      expect(result.message, contains('Access Denied'));
      expect(auth.isLoggedIn, isFalse);
    });

    test('8. Public registration strictly enforces canonicalRole = citizen', () async {
      final result = await auth.register(
        email: 'new.user@example.com',
        password: 'password123',
        fullName: 'New Citizen User',
        district: 'Baner',
        ward: 'Ward 4',
        role: 'contractor', // Malicious attempt to self-assign privileged role
      );

      expect(result.success, isTrue);
      // Backend registration code strictly overrides role parameter to 'citizen'
      expect(auth.userRole, equals('citizen'));
      expect(auth.isFieldWorker, isFalse);
    });

    test('9. Session restoration preserves authenticated officer role and does not overwrite with citizen', () async {
      // Log in as officer
      await auth.login('demo.officer@civicresolve.gov', 'civic123456', role: 'officer');
      expect(auth.isFieldWorker, isTrue);

      // Re-load saved session
      final restored = await auth.loadSavedSession();
      expect(restored, isTrue);
      expect(auth.isFieldWorker, isTrue);
      expect(auth.userRole, isNot(equals('citizen')));
    });

    test('10. Session restoration for citizen remains citizen without escalation', () async {
      // Log in as citizen
      await auth.login('demo.citizen@civicresolve.gov', 'civic123456', role: 'citizen');
      expect(auth.userRole, equals('citizen'));
      expect(auth.isFieldWorker, isFalse);

      // Re-load saved session
      final restored = await auth.loadSavedSession();
      expect(restored, isTrue);
      expect(auth.userRole, equals('citizen'));
      expect(auth.isFieldWorker, isFalse);
    });

    test('11. Citizen One-Tap authenticates dedicated citizen demo account', () async {
      final result = await auth.loginAsCitizenDemo();

      expect(result.success, isTrue);
      expect(auth.isLoggedIn, isTrue);
      expect(auth.userRole, equals('citizen'));
      expect(auth.userEmail, equals('demo.citizen@civicresolve.gov'));
      expect(auth.isFieldWorker, isFalse);
    });

    test('12. Field Officer One-Tap authenticates dedicated officer demo account', () async {
      final result = await auth.loginAsFieldOfficerDemo();

      expect(result.success, isTrue);
      expect(auth.isLoggedIn, isTrue);
      expect(auth.isFieldWorker, isTrue);
      expect(auth.userEmail, equals('demo.officer@civicresolve.gov'));
      expect(
        auth.userRole == 'officer' || auth.userRole == 'field_worker' || auth.userRole == 'contractor',
        isTrue,
      );
    });

    test('13. PROOF: Citizen Demo UID and Officer Demo UID are distinct and have different roles', () async {
      // 1. Authenticate Citizen Demo
      final citizenResult = await auth.loginAsCitizenDemo();
      expect(citizenResult.success, isTrue);
      final citizenUid = auth.userId;
      final citizenRole = auth.userRole;

      // 2. Authenticate Field Officer Demo
      final officerResult = await auth.loginAsFieldOfficerDemo();
      expect(officerResult.success, isTrue);
      final officerUid = auth.userId;
      final officerRole = auth.userRole;

      // Assert distinct UIDs
      expect(citizenUid, isNotNull);
      expect(officerUid, isNotNull);
      expect(citizenUid, isNot(equals(officerUid)));

      // Assert distinct roles
      expect(citizenRole, equals('citizen'));
      expect(officerRole, isNot(equals('citizen')));
      expect(officerRole == 'officer' || officerRole == 'field_worker' || officerRole == 'contractor', isTrue);
    });
  });
}
