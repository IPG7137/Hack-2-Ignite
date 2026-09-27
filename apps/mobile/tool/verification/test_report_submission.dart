import 'dart:io';
import 'package:civic_resolve/app_config.dart';
import 'package:civic_resolve/comprehensive_database_service.dart';
import 'package:civic_resolve/auth_service.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

void main() async {
  print('🧪 Testing Report Submission Functionality');
  print('==========================================');
  await AppConfig.initialize();
  
  // Initialize Supabase
  try {
    await Supabase.initialize(
      url: AppConfig.supabaseUrl,
      anonKey: AppConfig.supabaseAnonKey,
    );
    print('✅ Supabase initialized successfully');
  } catch (e) {
    print('❌ Supabase initialization failed: $e');
    exit(1);
  }
  
  // Test database connectivity
  print('\n📡 Testing database connectivity...');
  try {
    final supabase = Supabase.instance.client;
    await supabase.from('users').select('count').single();
    print('✅ Database connection successful');
  } catch (e) {
    print('❌ Database connection failed: $e');
  }
  
  // Test RPC function existence
  print('\n🔧 Testing submit_comprehensive_report RPC function...');
  try {
    final supabase = Supabase.instance.client;
    final response = await supabase.rpc('submit_comprehensive_report', params: {
      'report_user_id': 'test_user',
      'report_title': 'Test Report',
      'report_description': 'This is a test report to verify the RPC function',
      'report_category': 'roads_infrastructure',
      'report_location': 'Test Location',
      'report_latitude': 17.6868,
      'report_longitude': 75.9228,
      'report_image_urls': '[]',
      'report_contact_number': '1234567890',
    });
    
    if (response != null && response.isNotEmpty) {
      print('✅ RPC function exists and responds: $response');
    } else {
      print('⚠️ RPC function exists but returned empty response');
    }
  } catch (e) {
    print('❌ RPC function test failed: $e');
    print('   This likely means the enhanced_database_schema.sql was not applied to your database');
    print('   Please run the enhanced_database_schema.sql script in your Supabase SQL Editor');
  }
  
  // Test comprehensive database service
  print('\n📊 Testing ComprehensiveDatabaseService...');
  try {
    final databaseService = ComprehensiveDatabaseService();
    final result = await databaseService.submitComprehensiveReport(
      userId: 'test_user_${DateTime.now().millisecondsSinceEpoch}',
      title: 'Test Report from Dart',
      description: 'This is a comprehensive test of the report submission flow',
      category: 'roads_infrastructure',
      location: 'Test Location, India',
      latitude: 17.6868,
      longitude: 75.9228,
      imageUrls: ['data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='],
      contactNumber: '9876543210',
    );
    
    if (result.success) {
      print('✅ Report submission successful!');
      print('   Report ID: ${result.reportId}');
      print('   Priority: ${result.priority}');
      print('   Message: ${result.message}');
    } else {
      print('❌ Report submission failed: ${result.message}');
    }
  } catch (e) {
    print('❌ ComprehensiveDatabaseService test failed: $e');
  }
  
  // Test authentication service
  print('\n🔐 Testing AuthService...');
  try {
    final authService = AuthService.instance;
    print('✅ AuthService instance created successfully');
    print('   Current user: ${authService.userEmail ?? 'Not logged in'}');
  } catch (e) {
    print('❌ AuthService test failed: $e');
  }
  
  print('\n🏁 Test Summary');
  print('================');
  print('If you see ❌ for the RPC function test, you need to:');
  print('1. Open your Supabase dashboard');
  print('2. Go to SQL Editor');
  print('3. Run the enhanced_database_schema.sql script');
  print('4. Run this test again');
  print('\nIf all tests show ✅, your report submission should work correctly!');
}