import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'app_preferences.dart';

class AuthService {
  static AuthService? _instance;
  static AuthService get instance => _instance ??= AuthService._();
  
  AuthService._() {
    _initSupabaseListener();
  }

  // Login state
  bool _isLoggedIn = false;
  bool _isAdmin = false;
  String _userRole = 'citizen';
  String? _userEmail;
  String? _userId;
  String? _userFullName;

  bool get isLoggedIn => _isLoggedIn;
  bool get isAdmin => _isAdmin;
  String get userRole => _userRole;
  String? get userEmail => _userEmail;
  String? get userId => _userId;
  String get userName => _userFullName ?? _userEmail?.split('@').first ?? 'Citizen';

  Map<String, dynamic>? get currentUser => _isLoggedIn
      ? {
          'id': _userId ?? supabaseUser?.id ?? '',
          'email': _userEmail ?? supabaseUser?.email ?? '',
          'full_name': userName,
          'role': _userRole,
          'is_admin': _isAdmin,
        }
      : null;

  User? get supabaseUser {
    try {
      return Supabase.instance.client.auth.currentUser;
    } catch (_) {
      return null;
    }
  }

  Session? get supabaseSession {
    try {
      return Supabase.instance.client.auth.currentSession;
    } catch (_) {
      return null;
    }
  }

  void _initSupabaseListener() {
    try {
      Supabase.instance.client.auth.onAuthStateChange.listen((data) {
        final session = data.session;
        if (session != null) {
          _isLoggedIn = true;
          _userId = session.user.id;
          _userEmail = session.user.email;
          _userFullName = session.user.userMetadata?['full_name']?.toString();
          final metaRole = session.user.userMetadata?['role']?.toString();
          if (metaRole != null) {
            _userRole = metaRole;
            _isAdmin = metaRole == 'admin' || metaRole == 'contractor' || metaRole == 'officer';
          }
          _syncDatabaseProfileAndRole(session.user.id);
        }
      });
    } catch (_) {
      // Supabase may not be initialized in isolated unit tests
    }
  }

  Future<void> _syncDatabaseProfileAndRole(String userId) async {
    try {
      final roleRes = await Supabase.instance.client
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .maybeSingle();
      if (roleRes != null && roleRes['role'] != null) {
        _userRole = roleRes['role'].toString();
        _isAdmin = _userRole == 'officer' ||
            _userRole == 'dept_admin' ||
            _userRole == 'municipal_admin' ||
            _userRole == 'super_admin';
      }
      final profileRes = await Supabase.instance.client
          .from('profiles')
          .select('full_name, phone')
          .eq('id', userId)
          .maybeSingle();
      if (profileRes != null && profileRes['full_name'] != null) {
        _userFullName = profileRes['full_name'].toString();
      }
    } catch (_) {
      // Safe fallback if offline or table unmigrated
    }
  }

  /// Login strictly with real Supabase Auth
  Future<AuthResult> login(String emailOrId, String password, {String role = 'citizen'}) async {
    try {
      final isOfficerRequest = role.toLowerCase().trim() == 'contractor' || role.toLowerCase().trim() == 'officer';
      final canonicalRole = isOfficerRequest ? 'officer' : 'citizen';

      String email = emailOrId.contains('@')
          ? emailOrId
          : (isOfficerRequest ? 'officer@civicresolve.gov' : '$emailOrId@civicresolve.citizen');

      // 1. Authenticate with real Supabase Auth
      final authResponse = await Supabase.instance.client.auth.signInWithPassword(
        email: email,
        password: password,
      );

      final user = authResponse.user;
      final session = authResponse.session;

      if (user == null || session == null) {
        return AuthResult.error('Authentication failed: No valid session returned from Supabase.');
      }

      _isLoggedIn = true;
      _userId = user.id;
      _userEmail = user.email ?? email;
      _userFullName = user.userMetadata?['full_name']?.toString();
      _userRole = canonicalRole;
      _isAdmin = isOfficerRequest;

      // Sync database profile and user_roles table
      await _syncDatabaseProfileAndRole(_userId!);

      await AppPreferences.setUserRole(_userRole);
      await _saveLoginState();

      return AuthResult.success(
        user: {
          'id': _userId,
          'email': _userEmail,
          'role': _userRole,
          'is_admin': _isAdmin,
          'full_name': userName,
        },
        message: '${isOfficerRequest ? 'Officer' : 'Citizen'} login successful',
      );
    } catch (e) {
      _isLoggedIn = false;
      _userId = null;
      _userEmail = null;
      return AuthResult.error('Login failed: ${e.toString()}');
    }
  }

  /// Register new user strictly with Supabase Auth
  Future<AuthResult> register({
    required String email,
    required String password,
    required String fullName,
    String? phoneNumber,
    String? aadharNumber,
    String role = 'citizen',
  }) async {
    try {
      final isOfficerRequest = role.toLowerCase().trim() == 'contractor' || role.toLowerCase().trim() == 'officer';
      final canonicalRole = isOfficerRequest ? 'officer' : 'citizen';

      final res = await Supabase.instance.client.auth.signUp(
        email: email,
        password: password,
        data: {
          'full_name': fullName,
          'phone_number': phoneNumber,
          'aadhar_number': aadharNumber,
          'role': canonicalRole,
        },
      );

      if (res.user == null) {
        return AuthResult.error('Registration failed: Supabase returned empty user.');
      }

      _isLoggedIn = true;
      _userId = res.user!.id;
      _userEmail = email;
      _userFullName = fullName;
      _userRole = canonicalRole;
      _isAdmin = isOfficerRequest;

      await AppPreferences.setUserRole(_userRole);
      await _saveLoginState();

      return AuthResult.success(
        user: {
          'id': _userId,
          'email': _userEmail,
          'full_name': _userFullName,
          'role': _userRole,
          'is_admin': _isAdmin,
        },
        message: 'Account registered successfully',
      );
    } catch (e) {
      _isLoggedIn = false;
      _userId = null;
      return AuthResult.error('Registration failed: ${e.toString()}');
    }
  }

  /// Logout
  Future<void> logout() async {
    try {
      await Supabase.instance.client.auth.signOut();
    } catch (_) {
      // Safe fallback if client is uninitialized or offline
    }

    _isLoggedIn = false;
    _isAdmin = false;
    _userRole = 'citizen';
    _userEmail = null;
    _userId = null;
    _userFullName = null;
    await AppPreferences.clearUserRole();
    await _clearLoginState();
  }

  Future<void> signOut() => logout();

  /// Load saved login state
  Future<bool> loadSavedSession() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      _isLoggedIn = prefs.getBool('is_logged_in') ?? false;
      _isAdmin = prefs.getBool('is_admin') ?? false;
      _userRole = prefs.getString('user_role') ?? (_isAdmin ? 'contractor' : 'citizen');
      _userEmail = prefs.getString('user_email');
      _userId = prefs.getString('user_id');
      _userFullName = prefs.getString('user_full_name');

      // Check active Supabase session if present
      try {
        final currentSession = Supabase.instance.client.auth.currentSession;
        if (currentSession != null) {
          _isLoggedIn = true;
          _userId = currentSession.user.id;
          _userEmail = currentSession.user.email;
        }
      } catch (_) {}

      return _isLoggedIn;
    } catch (e) {
      return false;
    }
  }

  Future<void> _saveLoginState() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool('is_logged_in', _isLoggedIn);
      await prefs.setBool('is_admin', _isAdmin);
      await prefs.setString('user_role', _userRole);
      if (_userEmail != null) {
        await prefs.setString('user_email', _userEmail!);
      }
      if (_userId != null) {
        await prefs.setString('user_id', _userId!);
      }
      if (_userFullName != null) {
        await prefs.setString('user_full_name', _userFullName!);
      }
    } catch (e) {
      print('Error saving login state: $e');
    }
  }

  Future<void> _clearLoginState() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('is_logged_in');
      await prefs.remove('is_admin');
      await prefs.remove('user_role');
      await prefs.remove('user_email');
      await prefs.remove('user_id');
      await prefs.remove('user_full_name');
    } catch (e) {
      print('Error clearing login state: $e');
    }
  }

  String? validateEmail(String email) {
    if (email.isEmpty) {
      return 'Email is required';
    }
    if (!RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(email)) {
      return 'Please enter a valid email address';
    }
    return null;
  }

  String? validatePassword(String password) {
    if (password.isEmpty) {
      return 'Password is required';
    }
    if (password.length < 6) {
      return 'Password must be at least 6 characters';
    }
    return null;
  }
}

class AuthResult {
  final bool success;
  final String message;
  final Map<String, dynamic>? user;

  AuthResult.success({required this.user, required this.message}) : success = true;
  AuthResult.error(this.message) : success = false, user = null;
}