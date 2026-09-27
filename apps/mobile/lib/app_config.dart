import 'package:flutter/foundation.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

class AppConfig {
  // Compile-time environment configuration via --dart-define or --dart-define-from-file
  static const String _envSupabaseUrl = String.fromEnvironment('SUPABASE_URL');
  static const String _envSupabaseAnonKey = String.fromEnvironment('SUPABASE_ANON_KEY');

  /// Returns true if required backend Supabase parameters are present
  static bool get isConfigured => supabaseUrl.isNotEmpty && supabaseAnonKey.isNotEmpty;

  /// Initialize environment configuration
  static Future<void> initialize() async {
    // Priority 1: Compile-time environment flags (--dart-define / --dart-define-from-file)
    if (_envSupabaseUrl.isNotEmpty && _envSupabaseAnonKey.isNotEmpty) {
      if (kDebugMode) {
        debugPrint('✅ AppConfig: Initialized using compile-time environment flags (--dart-define / --dart-define-from-file)');
      }
      return;
    }

    // Optional debug fallback: load local .env if present (only in debug mode)
    if (kDebugMode) {
      try {
        await dotenv.load(fileName: ".env");
        debugPrint('ℹ️ AppConfig: Loaded development .env file');
      } catch (_) {
        // .env asset is intentionally not packaged in production releases for security
      }
    }

    if (!isConfigured && kDebugMode) {
      debugPrint('⚠️ [CivicResolve Configuration Warning]: SUPABASE_URL or SUPABASE_ANON_KEY is missing.\n'
          'Please provide configuration at compile time:\n'
          '  flutter run --dart-define-from-file=.env\n'
          '  or --dart-define=SUPABASE_URL=... --dart-define=SUPABASE_ANON_KEY=...');
    }
  }

  /// Supabase project URL (reads compile-time define, then optional debug dotenv)
  static String get supabaseUrl {
    if (_envSupabaseUrl.isNotEmpty) return _envSupabaseUrl;
    if (dotenv.isInitialized && (dotenv.env['SUPABASE_URL']?.isNotEmpty ?? false)) {
      return dotenv.env['SUPABASE_URL']!;
    }
    return '';
  }

  /// Supabase Anonymous JWT Key (public client-side key governed by PostgreSQL RLS)
  static String get supabaseAnonKey {
    if (_envSupabaseAnonKey.isNotEmpty) return _envSupabaseAnonKey;
    if (dotenv.isInitialized && (dotenv.env['SUPABASE_ANON_KEY']?.isNotEmpty ?? false)) {
      return dotenv.env['SUPABASE_ANON_KEY']!;
    }
    return '';
  }
}
