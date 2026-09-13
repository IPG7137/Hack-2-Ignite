import 'package:shared_preferences/shared_preferences.dart';
import 'app_preferences.dart';

class AuthService {
  static AuthService? _instance;
  static AuthService get instance => _instance ??= AuthService._();
  
  AuthService._();

  // Login state
  bool _isLoggedIn = false;
  bool _isAdmin = false;
  String _userRole = 'citizen';
  String? _userEmail;

  bool get isLoggedIn => _isLoggedIn;
  bool get isAdmin => _isAdmin;
  String get userRole => _userRole;
  String? get userEmail => _userEmail;
  String get userName => _userEmail?.split('@').first ?? 'Citizen';

  // Simple login with explicit role passing
  Future<AuthResult> login(String emailOrId, String password, {String role = 'citizen'}) async {
    try {
      final normalizedRole = role.toLowerCase().trim() == 'contractor' ? 'contractor' : 'citizen';
      final isContractor = normalizedRole == 'contractor' || (emailOrId.toLowerCase() == 'admin' && password == 'admin');

      _isLoggedIn = true;
      _isAdmin = isContractor;
      _userRole = isContractor ? 'contractor' : 'citizen';
      _userEmail = isContractor ? (emailOrId.contains('@') ? emailOrId : 'contractor@civicresolve.gov') : emailOrId;

      await AppPreferences.setUserRole(_userRole);
      await _saveLoginState();

      return AuthResult.success(
        user: {
          'email': _userEmail,
          'role': _userRole,
          'is_admin': _isAdmin,
        },
        message: '$normalizedRole login successful',
      );
    } catch (e) {
      return AuthResult.error('Login failed: ${e.toString()}');
    }
  }

  // Logout
  Future<void> logout() async {
    _isLoggedIn = false;
    _isAdmin = false;
    _userRole = 'citizen';
    _userEmail = null;
    await AppPreferences.clearUserRole();
    await _clearLoginState();
  }

  Future<void> signOut() => logout();

  // Load saved login state
  Future<bool> loadSavedSession() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      _isLoggedIn = prefs.getBool('is_logged_in') ?? false;
      _isAdmin = prefs.getBool('is_admin') ?? false;
      _userRole = prefs.getString('user_role') ?? (_isAdmin ? 'contractor' : 'citizen');
      _userEmail = prefs.getString('user_email');
      return _isLoggedIn;
    } catch (e) {
      return false;
    }
  }

  // Save login state
  Future<void> _saveLoginState() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool('is_logged_in', _isLoggedIn);
      await prefs.setBool('is_admin', _isAdmin);
      await prefs.setString('user_role', _userRole);
      if (_userEmail != null) {
        await prefs.setString('user_email', _userEmail!);
      }
    } catch (e) {
      print('Error saving login state: $e');
    }
  }

  // Clear login state
  Future<void> _clearLoginState() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('is_logged_in');
      await prefs.remove('is_admin');
      await prefs.remove('user_role');
      await prefs.remove('user_email');
    } catch (e) {
      print('Error clearing login state: $e');
    }
  }

  // Validation methods
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

// Auth result class
class AuthResult {
  final bool success;
  final String message;
  final Map<String, dynamic>? user;

  AuthResult.success({required this.user, required this.message}) : success = true;
  AuthResult.error(this.message) : success = false, user = null;
}