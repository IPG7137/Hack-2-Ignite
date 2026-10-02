import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:civic_resolve/auth_service.dart';
import 'package:civic_resolve/app_preferences.dart';
import 'package:civic_resolve/login_page.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    await AuthService.instance.logout();
  });

  tearDown(() async {
    await AuthService.instance.logout();
  });

  group('Dynamic Citizen Auth & Fresh-Account Zero-State Tests (Phase 17)', () {
    test('1. Registering a new dynamic citizen sets identity, district, ward, and citizen role', () async {
      final auth = AuthService.instance;

      final result = await auth.register(
        fullName: 'Vikram R. Patil',
        email: 'vikram.patil@example.com',
        password: 'securePassword123',
        phoneNumber: '9876543210',
        district: 'Solapur',
        ward: 'Ward 4',
      );

      expect(result.success, isTrue);
      expect(auth.isLoggedIn, isTrue);
      expect(auth.userName, 'Vikram R. Patil');
      expect(auth.userEmail, 'vikram.patil@example.com');
      expect(auth.userPhone, '9876543210');
      expect(auth.userDistrict, 'Solapur');
      expect(auth.userWard, 'Ward 4');
      expect(auth.userRole, 'citizen');
      expect(auth.isAdmin, isFalse);
    });

    test('2. Fresh citizen account starts with truthful zero-state profile (Score 0, Reports 0)', () async {
      final auth = AuthService.instance;

      await auth.register(
        fullName: 'Aarav Deshmukh',
        email: 'aarav.deshmukh@civic.in',
        password: 'password123',
        phoneNumber: '9812345678',
        district: 'Pune',
        ward: 'Ward 12',
      );

      final profile = await AppPreferences.getUserProfile();
      expect(profile, isNotNull);
      expect(profile!['name'], 'Aarav Deshmukh');
      expect(profile['email'], 'aarav.deshmukh@civic.in');
      expect(profile['reportsSubmitted'], 0);
      expect(profile['communityScore'], 0.0);
      expect(profile['district'], 'Pune');
      expect(profile['ward'], 'Ward 12');
    });

    test('3. Public registration strictly enforces role: citizen and prevents privilege escalation', () async {
      final auth = AuthService.instance;

      // Attempting to self-assign 'super_admin' or 'officer'
      final result = await auth.register(
        fullName: 'Hacker User',
        email: 'hacker@example.com',
        password: 'password123',
        role: 'super_admin',
      );

      expect(result.success, isTrue);
      expect(auth.userRole, 'citizen');
      expect(auth.isAdmin, isFalse);
    });

    test('4. Administrative identifiers are barred from mobile citizen login', () async {
      final auth = AuthService.instance;

      final result = await auth.login('state_admin@civicresolve.gov', 'civic123456');
      expect(result.success, isFalse);
      expect(result.message, contains('Web Administrative Portal'));
      expect(auth.isLoggedIn, isFalse);
    });

    test('5. Logout cleans up session, memory properties, and stored role', () async {
      final auth = AuthService.instance;

      await auth.register(
        fullName: 'Meera Kulkarni',
        email: 'meera@example.com',
        password: 'password123',
      );

      expect(auth.isLoggedIn, isTrue);

      await auth.logout();

      expect(auth.isLoggedIn, isFalse);
      expect(auth.userId, isNull);
      expect(auth.userEmail, isNull);
      expect(auth.userPhone, isNull);
      expect(auth.userDistrict, isNull);
      expect(auth.userWard, isNull);

      final storedRole = await AppPreferences.getUserRole();
      expect(storedRole, isNull);
    });

    test('6. Saved session restoration rehydrates full dynamic identity', () async {
      final auth = AuthService.instance;

      await auth.register(
        fullName: 'Suresh Raina',
        email: 'suresh@cricket.in',
        password: 'password123',
        phoneNumber: '9988776655',
        district: 'Solapur',
        ward: 'Ward 2',
      );

      // Create fresh auth instance simulation by loading saved state
      final restored = await auth.loadSavedSession();
      expect(restored, isTrue);
      expect(auth.isLoggedIn, isTrue);
      expect(auth.userName, 'Suresh Raina');
      expect(auth.userPhone, '9988776655');
      expect(auth.userDistrict, 'Solapur');
      expect(auth.userWard, 'Ward 2');
    });

    testWidgets('7. LoginPage renders New Citizen Sign Up toggle and inputs', (WidgetTester tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: LoginPage(),
        ),
      );
      await tester.pumpAndSettle();

      // Verify Citizen and Field Officer user type toggle exists
      expect(find.text('Citizen'), findsOneWidget);
      expect(find.text('Field Officer'), findsOneWidget);

      // Verify Sign In vs New Citizen Sign Up toggle exists
      expect(find.text('Sign In (Aadhaar/OTP)'), findsOneWidget);
      expect(find.text('New Citizen Sign Up'), findsOneWidget);

      // Tap 'New Citizen Sign Up'
      await tester.tap(find.text('New Citizen Sign Up'));
      await tester.pumpAndSettle();

      // Verify registration form fields appear
      expect(find.text('Create Citizen Account'), findsOneWidget);
      expect(find.byType(TextFormField), findsWidgets);
      expect(find.text('Register & Enter Portal'), findsOneWidget);
    });
  });
}
