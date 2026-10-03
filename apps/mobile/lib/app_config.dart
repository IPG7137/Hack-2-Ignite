import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';

class AppConfig {
  // 1. Compile-time environment configuration via --dart-define or --dart-define-from-file
  static const String _envSupabaseUrl = String.fromEnvironment('SUPABASE_URL');
  static const String _envSupabaseAnonKey = String.fromEnvironment('SUPABASE_ANON_KEY');

  // 2. Canonical production project defaults (public client keys governed strictly by PostgreSQL RLS)
  static const String _defaultSupabaseUrl = 'https://qxiivlfecbklwtnfsnjg.supabase.co';
  static const String _defaultSupabaseAnonKey =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4aWl2bGZlY2JrbHd0bmZzbmpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5Njk0OTIsImV4cCI6MjEwNDU0NTQ5Mn0.gZXjrzaMiYl_6JyozMfCbnjirQGerkliVEKC_xVCTbA';

  /// Returns true if required backend Supabase parameters are present
  static bool get isConfigured => supabaseUrl.isNotEmpty && supabaseAnonKey.isNotEmpty;

  /// Initialize environment configuration across debug, release, and packaged builds
  static Future<void> initialize() async {
    // Priority 1: Compile-time environment flags (--dart-define / --dart-define-from-file)
    if (_envSupabaseUrl.isNotEmpty && _envSupabaseAnonKey.isNotEmpty) {
      if (kDebugMode) {
        debugPrint('✅ AppConfig: Initialized using compile-time environment flags (--dart-define)');
      }
      return;
    }

    // Priority 2: Load bundled .env asset (works in both debug and release if asset bundled)
    try {
      await dotenv.load(fileName: ".env");
      if (kDebugMode) {
        debugPrint('ℹ️ AppConfig: Loaded environment variables from .env asset');
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('ℹ️ AppConfig: Note on .env asset loader ($e), falling back to production project config');
      }
    }
  }

  /// Supabase project URL (reads compile-time define, then dotenv asset, then canonical project URL)
  static String get supabaseUrl {
    if (_envSupabaseUrl.isNotEmpty) return _envSupabaseUrl;
    if (dotenv.isInitialized && (dotenv.env['SUPABASE_URL']?.isNotEmpty ?? false)) {
      return dotenv.env['SUPABASE_URL']!;
    }
    return _defaultSupabaseUrl;
  }

  /// Supabase Anonymous JWT Key (public client-side key governed by PostgreSQL RLS)
  static String get supabaseAnonKey {
    if (_envSupabaseAnonKey.isNotEmpty) return _envSupabaseAnonKey;
    if (dotenv.isInitialized && (dotenv.env['SUPABASE_ANON_KEY']?.isNotEmpty ?? false)) {
      return dotenv.env['SUPABASE_ANON_KEY']!;
    }
    return _defaultSupabaseAnonKey;
  }

  /// Safe diagnostic logging (Never logs keys, tokens, or PII)
  static void logDiagnostics() {
    final host = Uri.tryParse(supabaseUrl)?.host ?? 'unknown';
    debugPrint('====================================');
    debugPrint('[Supabase] URL configured: ${supabaseUrl.isNotEmpty}');
    debugPrint('[Supabase] Host: $host');
    debugPrint('[Supabase] Anon key configured: ${supabaseAnonKey.isNotEmpty}');
    debugPrint('====================================');
  }

  /// Layered connectivity check distinguishing network, DNS, config, initialization, and database layers
  static Future<Map<String, dynamic>> checkBackendConnectivity() async {
    final host = Uri.tryParse(supabaseUrl)?.host ?? '';

    // Layer C: Configuration check
    if (!isConfigured) {
      return {
        'status': 'config_missing',
        'message': 'Supabase configuration parameters are missing',
        'layer': 'C',
      };
    }

    // Layer A & B: Network and DNS reachability
    try {
      if (host.isNotEmpty) {
        final lookup = await InternetAddress.lookup(host).timeout(const Duration(seconds: 5));
        if (lookup.isEmpty || lookup[0].rawAddress.isEmpty) {
          return {
            'status': 'dns_failure',
            'message': 'Unable to resolve Supabase hostname ($host). Please check your internet connection.',
            'layer': 'B',
          };
        }
      }
    } catch (e) {
      return {
        'status': 'network_failure',
        'message': 'Device is offline or DNS lookup failed for Supabase host ($host).',
        'layer': 'A',
      };
    }

    // Layer B: TLS/HTTP reachability to Supabase root endpoint
    try {
      final response = await http.get(
        Uri.parse('$supabaseUrl/rest/v1/'),
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': 'Bearer $supabaseAnonKey',
        },
      ).timeout(const Duration(seconds: 8));

      // 200 or 404 (Swagger / root info) means server and TLS are responsive
      if (response.statusCode >= 500) {
        return {
          'status': 'server_error',
          'message': 'Supabase server returned HTTP ${response.statusCode}',
          'layer': 'B',
        };
      }
    } catch (e) {
      return {
        'status': 'tls_http_failure',
        'message': 'Unable to establish secure HTTPS connection to Supabase: $e',
        'layer': 'B',
      };
    }

    // Layer D: Supabase instance check
    try {
      final client = Supabase.instance.client;
      // Layer F: Test light database query
      final dbCheck = await client.from('reports').select('id').limit(1);
      return {
        'status': 'success',
        'message': 'Supabase connected and operational (${dbCheck.length} records probed)',
        'layer': 'ALL_OK',
      };
    } catch (e) {
      return {
        'status': 'db_query_warning',
        'message': 'Connected to Supabase endpoint, but database query returned: $e',
        'layer': 'F',
      };
    }
  }
}
