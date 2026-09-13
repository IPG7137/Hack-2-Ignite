import 'package:flutter_dotenv/flutter_dotenv.dart';

class AppConfig {
  static const String _defaultSupabaseUrl = 'https://qxiivlfecbklwtnfsnjg.supabase.co';
  static const String _defaultSupabaseAnonKey =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4aWl2bGZlY2JrbHd0bmZzbmpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5Njk0OTIsImV4cCI6MjEwNDU0NTQ5Mn0.gZXjrzaMiYl_6JyozMfCbnjirQGerkliVEKC_xVCTbA';
  static const String _defaultGeminiApiKey = '';

  /// Initialize environment variables
  static Future<void> initialize() async {
    try {
      await dotenv.load(fileName: ".env");
      print('✅ AppConfig: Loaded .env configuration successfully');
    } catch (e) {
      print('⚠️ AppConfig: .env file not found or failed to load ($e), using environment/compile-time defaults');
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

  /// Google Gemini AI API Key
  static String get geminiApiKey {
    if (dotenv.isInitialized && (dotenv.env['GEMINI_API_KEY']?.isNotEmpty ?? false)) {
      return dotenv.env['GEMINI_API_KEY']!;
    }
    const envKey = String.fromEnvironment('GEMINI_API_KEY');
    if (envKey.isNotEmpty) return envKey;
    return _defaultGeminiApiKey;
  }
}
