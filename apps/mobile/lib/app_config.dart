import 'package:flutter_dotenv/flutter_dotenv.dart';

class AppConfig {
  static const String _defaultSupabaseUrl = '';
  static const String _defaultSupabaseAnonKey = '';
  static const String _defaultGeminiApiKey = '';

  /// Returns true if required backend Supabase parameters are present
  static bool get isConfigured => supabaseUrl.isNotEmpty && supabaseAnonKey.isNotEmpty;

  /// Initialize environment variables
  static Future<void> initialize() async {
    try {
      await dotenv.load(fileName: ".env");
      print('✅ AppConfig: Loaded .env configuration successfully');
    } catch (e) {
      print('ℹ️ AppConfig: Local .env asset not loaded, using compile-time environment flags (--dart-define / --dart-define-from-file)');
    }

    if (!isConfigured) {
      print('⚠️ [CivicResolve Configuration Warning]: SUPABASE_URL or SUPABASE_ANON_KEY is missing from environment.\n'
          'Please provide configuration via --dart-define=SUPABASE_URL=... --dart-define=SUPABASE_ANON_KEY=... '
          'or --dart-define-from-file=.env');
    }
  }

  /// Supabase project URL
  static String get supabaseUrl {
    if (dotenv.isInitialized && (dotenv.env['SUPABASE_URL']?.isNotEmpty ?? false)) {
      return dotenv.env['SUPABASE_URL']!;
    }
    const envUrl = String.fromEnvironment('SUPABASE_URL');
    if (envUrl.isNotEmpty) return envUrl;
    return _defaultSupabaseUrl;
  }

  /// Supabase Anonymous JWT Key
  static String get supabaseAnonKey {
    if (dotenv.isInitialized && (dotenv.env['SUPABASE_ANON_KEY']?.isNotEmpty ?? false)) {
      return dotenv.env['SUPABASE_ANON_KEY']!;
    }
    const envKey = String.fromEnvironment('SUPABASE_ANON_KEY');
    if (envKey.isNotEmpty) return envKey;
    return _defaultSupabaseAnonKey;
  }

  /// Google Gemini AI API Key (Dev / Prototype direct integration)
  static String get geminiApiKey {
    if (dotenv.isInitialized && (dotenv.env['GEMINI_API_KEY']?.isNotEmpty ?? false)) {
      return dotenv.env['GEMINI_API_KEY']!;
    }
    const envKey = String.fromEnvironment('GEMINI_API_KEY');
    if (envKey.isNotEmpty) return envKey;
    return _defaultGeminiApiKey;
  }
}
