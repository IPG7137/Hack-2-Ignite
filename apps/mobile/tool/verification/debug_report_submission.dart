import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:civic_resolve/comprehensive_database_service.dart';
import 'package:civic_resolve/auth_service.dart';

// Quick test to debug report submission issues
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  print('🔬 DEBUGGING REPORT SUBMISSION ISSUE');
  print('=====================================');
  
  // Test 1: Check Supabase initialization
  print('\n1️⃣ Checking Supabase initialization...');
  try {
    final supabase = Supabase.instance.client;
    print('✅ Supabase client accessible');
    print('   Supabase instance ready');
  } catch (e) {
    print('❌ Supabase client error: $e');
    return;
  }
  
  // Test 2: Check database connectivity
  print('\n2️⃣ Testing database connectivity...');
  try {
    final supabase = Supabase.instance.client;
    final response = await supabase
        .from('reports')
        .select('count')
        .limit(1);
    print('✅ Database connection successful');
    print('   Response: $response');
  } catch (e) {
    print('❌ Database connection failed: $e');
    print('   This might indicate wrong table name or RLS policy issues');
  }
  
  // Test 3: Test direct insertion to reports table
  print('\n3️⃣ Testing direct report insertion...');
  try {
    final supabase = Supabase.instance.client;
    final testData = {
      'user_id': 'test_user_${DateTime.now().millisecondsSinceEpoch}',
      'title': 'Test Report ${DateTime.now().millisecondsSinceEpoch}',
      'description': 'Testing direct database insertion',
      'category': 'roads',
      'location': 'Test Location',
      'latitude': 17.6868,
      'longitude': 75.9228,
      'image_urls': [],
      'priority': 'medium',
      'status': 'submitted',
    };
    
    print('   Inserting test data: $testData');
    
    final response = await supabase
        .from('reports')
        .insert(testData)
        .select('id')
        .single();
    
    print('✅ Direct insertion successful!');
    print('   New report ID: ${response['id']}');
    
    // Clean up test data
    await supabase
        .from('reports')
        .delete()
        .eq('id', response['id']);
    print('✅ Test data cleaned up');
    
  } catch (e) {
    print('❌ Direct insertion failed: $e');
    print('   Stack trace: ${e.toString()}');
  }
  
  // Test 4: Test ComprehensiveDatabaseService
  print('\n4️⃣ Testing ComprehensiveDatabaseService...');
  try {
    final dbService = ComprehensiveDatabaseService();
    final result = await dbService.submitComprehensiveReport(
      userId: 'test_service_${DateTime.now().millisecondsSinceEpoch}',
      title: 'Service Test Report',
      description: 'Testing service submission',
      category: 'roads',
      location: 'Service Test Location',
      latitude: 17.6868,
      longitude: 75.9228,
      imageUrls: [],
      contactNumber: '9876543210',
    );
    
    if (result.success) {
      print('✅ Service submission successful!');
      print('   Report ID: ${result.reportId}');
      print('   Message: ${result.message}');
      print('   Priority: ${result.priority}');
    } else {
      print('❌ Service submission failed: ${result.message}');
    }
    
  } catch (e) {
    print('❌ Service test failed: $e');
  }
  
  // Test 5: Check AuthService integration
  print('\n5️⃣ Testing AuthService integration...');
  try {
    final authService = AuthService.instance;
    print('✅ AuthService accessible');
    print('   Is logged in: ${authService.isLoggedIn}');
    print('   User email: ${authService.userEmail}');
    
    if (!authService.isLoggedIn) {
      print('⚠️  User not logged in - this might cause submission issues');
    }
    
  } catch (e) {
    print('❌ AuthService test failed: $e');
  }
  
  print('\n🏁 DIAGNOSIS COMPLETE');
  print('=====================================');
}