import 'dart:math' as math;
import 'package:supabase_flutter/supabase_flutter.dart';
import 'comprehensive_report_models.dart';
import 'credit_service.dart';
import 'similarity_engine.dart';
import 'emerging_problem_engine.dart';
import 'incident_grouping_engine.dart';
import 'resolution_verification_engine.dart';

class ComprehensiveDatabaseService {
  static final ComprehensiveDatabaseService _instance = ComprehensiveDatabaseService._internal();
  factory ComprehensiveDatabaseService() => _instance;
  ComprehensiveDatabaseService._internal();

  final SupabaseClient _supabase = Supabase.instance.client;

  // ========================================
  // PROXIMITY & DUPLICATE DETECTION (PS 02 & Phase 3A)
  // ========================================

  /// Calculate distance between two coordinates in meters using the Haversine formula
  static double calculateDistanceMeters(double lat1, double lon1, double lat2, double lon2) {
    const double earthRadius = 6371000; // meters
    final dLat = (lat2 - lat1) * (math.pi / 180.0);
    final dLon = (lon2 - lon1) * (math.pi / 180.0);
    final a = math.sin(dLat / 2) * math.sin(dLat / 2) +
        math.cos(lat1 * (math.pi / 180.0)) * math.cos(lat2 * (math.pi / 180.0)) *
        math.sin(dLon / 2) * math.sin(dLon / 2);
    final c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a));
    return earthRadius * c;
  }

  /// Multi-Signal Duplicate Check: Evaluates candidate reports using Location, Category, Text, and Recency signals.
  /// Preserves exact backward-compatible return fields while adding multi-signal evaluation result.
  Future<({
    bool hasDuplicate,
    String? parentReportId,
    double? distanceMeters,
    Map<String, dynamic>? parentReport,
    SimilarityAnalysisResult? analysisResult,
  })> findNearbyDuplicateReports({
    required double latitude,
    required double longitude,
    required String category,
    String? title,
    String? description,
    DateTime? createdAt,
    double radiusMeters = 200.0,
  }) async {
    try {
      print('🔍 Multi-Signal duplicate evaluation within ${radiusMeters}m for category: $category');
      
      // Fetch candidate active markers (from public_report_markers view under RLS, or reports table)
      List<dynamic> response;
      try {
        response = await _supabase
            .from('public_report_markers')
            .select('id, category, status, priority, latitude, longitude, created_at')
            .not('status', 'in', '(closed,rejected)')
            .order('created_at', ascending: false)
            .limit(100);
      } catch (_) {
        response = await _supabase
            .from('reports')
            .select('id, title, description, category, status, coordinates, latitude, longitude, created_at')
            .not('status', 'in', '(closed,rejected)')
            .order('created_at', ascending: false)
            .limit(100);
      }

      SimilarityAnalysisResult? bestMatch;
      double highestConfidence = 0.0;
      Map<String, dynamic>? bestCandidateRaw;

      for (final report in response) {
        double? reportLat;
        double? reportLng;

        if (report['latitude'] != null && report['longitude'] != null) {
          reportLat = double.tryParse(report['latitude'].toString());
          reportLng = double.tryParse(report['longitude'].toString());
        } else if (report['coordinates'] is Map) {
          reportLat = double.tryParse(report['coordinates']['lat']?.toString() ?? '');
          reportLng = double.tryParse(report['coordinates']['lng']?.toString() ?? '');
        }

        if (reportLat == null || reportLng == null) continue;

        final dist = calculateDistanceMeters(latitude, longitude, reportLat, reportLng);

        // Evaluate using the multi-signal similarity engine
        final candidateId = report['id'].toString();
        final analysis = CivicSimilarityEngine.evaluateCandidate(
          candidateReportId: candidateId,
          distanceMeters: dist,
          newCategory: category,
          candidateCategory: report['category']?.toString(),
          newTitle: title,
          newDescription: description,
          candidateTitle: report['title']?.toString(),
          candidateDescription: report['description']?.toString(),
          newCreatedAt: createdAt ?? DateTime.now(),
          candidateCreatedAt: report['created_at'],
          candidateRawData: Map<String, dynamic>.from(report),
        );

        // Check if report qualifies as duplicate within proximity boundary or has high multi-signal confidence
        if (dist <= radiusMeters && analysis.totalConfidence > highestConfidence) {
          highestConfidence = analysis.totalConfidence;
          bestMatch = analysis;
          bestCandidateRaw = Map<String, dynamic>.from(report);
        }
      }

      // Backward-compatible determination: If best match within radius has valid category match or score >= 0.50
      if (bestMatch != null && (bestMatch.categoryScore >= 0.70 || bestMatch.totalConfidence >= 0.50)) {
        final parentId = bestMatch.candidateReportId;
        print('📍 Multi-signal duplicate candidate identified: Report #$parentId (${bestMatch.distanceMeters?.toStringAsFixed(1)}m, confidence: ${(bestMatch.totalConfidence * 100).toStringAsFixed(1)}%)');
        return (
          hasDuplicate: true,
          parentReportId: parentId,
          distanceMeters: bestMatch.distanceMeters,
          parentReport: bestCandidateRaw,
          analysisResult: bestMatch,
        );
      }

      return (
        hasDuplicate: false,
        parentReportId: null,
        distanceMeters: null,
        parentReport: null,
        analysisResult: null,
      );
    } catch (e) {
      print('⚠️ Multi-signal duplicate check warning: $e');
      return (
        hasDuplicate: false,
        parentReportId: null,
        distanceMeters: null,
        parentReport: null,
        analysisResult: null,
      );
    }
  }

  /// Get all ranked multi-signal duplicate/related candidates for a given complaint
  Future<List<SimilarityAnalysisResult>> findMultiSignalDuplicates({
    required double latitude,
    required double longitude,
    required String category,
    String? title,
    String? description,
    DateTime? createdAt,
    double radiusMeters = 500.0,
  }) async {
    try {
      final response = await _supabase
          .from('reports')
          .select('id, title, description, category, status, coordinates, latitude, longitude, created_at')
          .not('status', 'in', '(closed,rejected)')
          .order('created_at', ascending: false)
          .limit(100);

      final List<SimilarityAnalysisResult> results = [];

      for (final report in response) {
        double? reportLat;
        double? reportLng;

        if (report['latitude'] != null && report['longitude'] != null) {
          reportLat = double.tryParse(report['latitude'].toString());
          reportLng = double.tryParse(report['longitude'].toString());
        } else if (report['coordinates'] is Map) {
          reportLat = double.tryParse(report['coordinates']['lat']?.toString() ?? '');
          reportLng = double.tryParse(report['coordinates']['lng']?.toString() ?? '');
        }

        if (reportLat == null || reportLng == null) continue;

        final dist = calculateDistanceMeters(latitude, longitude, reportLat, reportLng);
        if (dist > radiusMeters) continue;

        final analysis = CivicSimilarityEngine.evaluateCandidate(
          candidateReportId: report['id'].toString(),
          distanceMeters: dist,
          newCategory: category,
          candidateCategory: report['category']?.toString(),
          newTitle: title,
          newDescription: description,
          candidateTitle: report['title']?.toString(),
          candidateDescription: report['description']?.toString(),
          newCreatedAt: createdAt ?? DateTime.now(),
          candidateCreatedAt: report['created_at'],
          candidateRawData: Map<String, dynamic>.from(report),
        );

        if (analysis.totalConfidence >= 0.40) {
          results.add(analysis);
        }
      }

      // Sort descending by total confidence
      results.sort((a, b) => b.totalConfidence.compareTo(a.totalConfidence));
      return results;
    } catch (e) {
      print('⚠️ Error in findMultiSignalDuplicates: $e');
      return [];
    }
  }

  // ========================================
  // DATABASE CONNECTION TEST
  // ========================================

  /// Test database connection and table access
  Future<bool> testDatabaseConnection() async {
    try {
      print('🔍 Testing database connection...');
      
      // Try to perform a simple query to test connection
      final response = await _supabase
          .from('reports')
          .select('id')
          .limit(1);
      
      print('✅ Database connection successful. Found ${response.length} sample records.');
      return true;
    } catch (e) {
      print('❌ Database connection test failed: $e');
      return false;
    }
  }

  // ========================================
  // USER AUTHENTICATION & MANAGEMENT
  // ========================================

  /// Authenticate user with Aadhar number and password
  Future<({bool success, UserModel? user, String message})> authenticateUserWithAadhar(
    String aadharNumber, 
    String password
  ) async {
    try {
      final response = await _supabase
          .rpc('authenticate_user_aadhar', params: {
            'user_aadhar': aadharNumber,
            'user_password': password,
          });

      if (response.isNotEmpty && response[0]['success'] == true) {
        final userData = response[0]['user_data'] as Map<String, dynamic>;
        final user = UserModel.fromJson(userData);
        return (success: true, user: user, message: response[0]['message'].toString());
      } else {
        return (success: false, user: null, message: (response[0]['message'] ?? 'Authentication failed').toString());
      }
    } catch (e) {
      print('Authentication error: $e');
      return (success: false, user: null, message: 'Authentication error: ${e.toString()}');
    }
  }

  /// Get user profile by ID
  Future<UserModel?> getUserProfile(String userId) async {
    try {
      final response = await _supabase
          .from('users')
          .select()
          .eq('id', userId)
          .single();

      return UserModel.fromJson(response);
    } catch (e) {
      print('Error fetching user profile: $e');
      return null;
    }
  }

  /// Update user profile raw data
  Future<bool> updateUserProfileData(String userId, Map<String, dynamic> updates) async {
    try {
      await _supabase
          .from('users')
          .update(updates)
          .eq('id', userId);
      return true;
    } catch (e) {
      print('Error updating user profile data: $e');
      return false;
    }
  }

  // ========================================
  // COMPREHENSIVE REPORT MANAGEMENT
  // ========================================

  /// Submit a comprehensive report
  Future<ReportSubmissionResult> submitComprehensiveReport({
    required String userId,
    required String title,
    required String description,
    required String category,
    required String location,
    double? latitude,
    double? longitude,
    List<String>? imageUrls,
    String? contactNumber,
  }) async {
    try {
      print('🔄 Submitting report to database...');
      print('   User ID: $userId');
      print('   Title: $title');
      print('   Category: $category');
      print('   Location: $location');
      print('   Latitude: $latitude');
      print('   Longitude: $longitude');
      print('   Images: ${imageUrls?.length ?? 0} images');
      print('   Contact: $contactNumber');
      
      // Validate required fields
      if (userId.isEmpty) {
        print('❌ Error: User ID is empty');
        return ReportSubmissionResult.error('User ID is required');
      }
      
      if (title.isEmpty) {
        print('❌ Error: Title is empty');
        return ReportSubmissionResult.error('Title is required');
      }
      
      if (description.isEmpty) {
        print('❌ Error: Description is empty');
        return ReportSubmissionResult.error('Description is required');
      }
      
      // Determine priority based on category
      String priority = 'medium';
      if (category.contains('public_safety') || category.contains('water') || category.contains('sewage')) {
        priority = 'high';
      } else if (category.contains('roads') || category.contains('electricity') || category.contains('streetlights')) {
        priority = 'medium';
      } else {
        priority = 'low';
      }
      
      print('   Calculated Priority: $priority');
      
      // Prepare coordinates as JSONB
      Map<String, dynamic>? coordinates;
      if (latitude != null && longitude != null) {
        coordinates = {'lat': latitude, 'lng': longitude};
        print('   Coordinates: $coordinates');
      }

      // Proximity-based duplicate pre-check (200m radius threshold - PS 02 4.D)
      bool isPotentialDuplicate = false;
      String? parentReportId;
      double? matchDistance;

      if (latitude != null && longitude != null) {
        final duplicateCheck = await findNearbyDuplicateReports(
          latitude: latitude,
          longitude: longitude,
          category: category,
          radiusMeters: 200.0,
        );

        if (duplicateCheck.hasDuplicate) {
          isPotentialDuplicate = true;
          parentReportId = duplicateCheck.parentReportId;
          matchDistance = duplicateCheck.distanceMeters;
          print('🔗 Report flagged as potential duplicate of #$parentReportId (${matchDistance?.toStringAsFixed(1)}m away)');
        }
      }
      
      // Ensure user_id is authenticated UUID
      final authUserId = _supabase.auth.currentUser?.id;
      final effectiveUserId = (authUserId != null && authUserId.isNotEmpty) ? authUserId : userId;

      // Prepare data for insertion
      final insertData = {
        'user_id': effectiveUserId,
        'title': title,
        'description': description,
        'category': category,
        'location': location,
        'latitude': latitude,
        'longitude': longitude,
        'image_urls': imageUrls ?? [],
        'coordinates': coordinates,
        'priority': priority,
        'contact_number': contactNumber,
        'status': 'submitted',
        'potential_duplicate': isPotentialDuplicate,
        if (parentReportId != null) 'parent_report_id': parentReportId,
      };
      
      print('📤 Attempting database insert with data: $insertData');
      
      // Insert directly into reports table
      final response = await _supabase
          .from('reports')
          .insert(insertData)
          .select('id')
          .single();

      print('📥 Database response received: $response');

      if (response['id'] != null) {
        final reportId = response['id'].toString();
        print('✅ Report submitted successfully with ID: $reportId');
        
        // Award credits to user for successful report submission
        try {
          await CreditService.awardCreditsForReport(userId, reportId);
          print('✅ Credits awarded for report submission');
        } catch (creditError) {
          print('⚠️ Credit awarding failed: $creditError');
        }

        return ReportSubmissionResult.success(
          reportId: reportId,
          message: isPotentialDuplicate 
              ? 'Report submitted and linked to existing nearby complaint #$parentReportId (${matchDistance?.toStringAsFixed(0)}m away)'
              : 'Report submitted successfully',
          priority: priority,
          isPotentialDuplicate: isPotentialDuplicate,
          parentReportId: parentReportId,
          distanceMeters: matchDistance,
        );
      } else {
        print('❌ Report submission failed - no response ID');
        return ReportSubmissionResult.error('Report submission failed - no response from database');
      }
    } catch (e, stackTrace) {
      print('❌ Report submission error: $e');
      print('❌ Stack trace: $stackTrace');
      
      // Check for specific error types
      if (e.toString().contains('duplicate key')) {
        return ReportSubmissionResult.error('Report already exists');
      } else if (e.toString().contains('connection')) {
        return ReportSubmissionResult.error('Database connection failed - please check your internet connection');
      } else if (e.toString().contains('timeout')) {
        return ReportSubmissionResult.error('Request timed out - please try again');
      } else if (e.toString().contains('authentication') || e.toString().contains('unauthorized')) {
        return ReportSubmissionResult.error('Authentication failed - please log in again');
      } else {
        return ReportSubmissionResult.error('Report submission error: ${e.toString()}');
      }
    }
  }

  /// Get comprehensive reports for a user
  Future<List<ComprehensiveReportModel>> getUserReportsComprehensive(String userId) async {
    try {
      print('🔍 Fetching reports for user: $userId');
      final response = await _supabase
          .from('reports')
          .select()
          .eq('user_id', userId)
          .order('created_at', ascending: false);

      print('✅ Fetched ${response.length} reports for user');
      return response.map((json) => ComprehensiveReportModel.fromJson(json)).toList();
    } catch (e) {
      print('❌ Error fetching user reports: $e');
      return [];
    }
  }

  /// Get all reports (for admin view)
  Future<List<ComprehensiveReportModel>> getAllReportsComprehensive() async {
    try {
      print('🔍 Fetching all reports for admin view');
      final response = await _supabase
          .from('reports')
          .select()
          .order('created_at', ascending: false);

      print('✅ Fetched ${response.length} total reports');
      return response.map((json) => ComprehensiveReportModel.fromJson(json)).toList();
    } catch (e) {
      print('❌ Error fetching all reports: $e');
      return [];
    }
  }

  /// Get live civic reports for nearby map visualization with distance filtering
  Future<List<ComprehensiveReportModel>> getNearbyMapReports({
    double? latitude,
    double? longitude,
    double radiusKm = 15.0,
    String? category,
    String? statusFilter,
  }) async {
    try {
      print('🗺️ Fetching live reports for map view (lat: $latitude, lng: $longitude, radius: ${radiusKm}km)');
      var query = _supabase.from('reports').select();

      if (category != null && category != 'All') {
        query = query.ilike('category', '%$category%');
      }

      if (statusFilter != null && statusFilter != 'All') {
        if (statusFilter == 'Active') {
          query = query.not('status', 'in', '(resolved,closed,rejected)');
        } else if (statusFilter == 'Resolved') {
          query = query.eq('status', 'resolved');
        }
      }

      final response = await query.order('created_at', ascending: false).limit(150);

      final List<ComprehensiveReportModel> reports = [];
      for (final json in response) {
        try {
          final model = ComprehensiveReportModel.fromJson(json);
          if (model.latitude != null && model.longitude != null) {
            if (latitude != null && longitude != null) {
              final distMeters = calculateDistanceMeters(
                latitude,
                longitude,
                model.latitude!,
                model.longitude!,
              );
              // Filter by radius in kilometers
              if (distMeters <= (radiusKm * 1000)) {
                reports.add(model);
              }
            } else {
              reports.add(model);
            }
          }
        } catch (e) {
          print('⚠️ Error parsing map report: $e');
        }
      }

      print('✅ Found ${reports.length} reports with valid coordinates for map');
      return reports;
    } catch (e) {
      print('❌ Error fetching map reports: $e');
      return [];
    }
  }

  /// Detect emerging civic problem hotspots from recent reports (Phase 3C)
  Future<List<EmergingHotspotResult>> detectEmergingHotspots({
    double? latitude,
    double? longitude,
    double radiusKm = 15.0,
    int currentWindowHours = 24,
    int baselineDays = 7,
  }) async {
    try {
      final reports = await getNearbyMapReports(
        latitude: latitude,
        longitude: longitude,
        radiusKm: radiusKm,
      );

      return EmergingProblemEngine.detectHotspots(
        reports: reports,
        currentWindowHours: currentWindowHours,
        baselineDays: baselineDays,
      );
    } catch (e) {
      print('⚠️ Error in detectEmergingHotspots: $e');
      return [];
    }
  }

  /// Group localized reports into potential common incidents (Phase 3D)
  Future<List<PotentialIncidentResult>> groupReportsIntoIncidents({
    double? latitude,
    double? longitude,
    double radiusKm = 15.0,
    double groupingRadiusMeters = 500.0,
  }) async {
    try {
      final reports = await getNearbyMapReports(
        latitude: latitude,
        longitude: longitude,
        radiusKm: radiusKm,
      );

      final activeHotspots = EmergingProblemEngine.detectHotspots(
        reports: reports,
      );

      return IncidentGroupingEngine.groupReportsIntoIncidents(
        reports: reports,
        activeHotspots: activeHotspots,
        groupingRadiusMeters: groupingRadiusMeters,
      );
    } catch (e) {
      print('⚠️ Error in groupReportsIntoIncidents: $e');
      return [];
    }
  }

  /// Verify civic resolution evidence for a report (Phase 3E)
  ResolutionVerificationResult verifyReportResolution(
    ComprehensiveReportModel report, {
    List<String>? afterImageUrls,
    bool? isProblemResolvedVisual,
    double? aiConfidence,
  }) {
    return ResolutionVerificationEngine.evaluateReport(
      report,
      afterImageUrls: afterImageUrls,
      isProblemResolvedVisual: isProblemResolvedVisual,
      aiConfidence: aiConfidence,
    );
  }

  /// Get reports by status
  Future<List<ComprehensiveReportModel>> getReportsByStatus(ReportStatus status) async {
    try {
      print('🔍 Fetching reports with status: ${status.value}');
      final response = await _supabase
          .from('reports')
          .select()
          .eq('status', status.value)
          .order('created_at', ascending: false);

      print('✅ Fetched ${response.length} reports with status ${status.value}');
      return response.map((json) => ComprehensiveReportModel.fromJson(json)).toList();
    } catch (e) {
      print('❌ Error fetching reports by status: $e');
      return [];
    }
  }

  /// Get reports by priority
  Future<List<ComprehensiveReportModel>> getReportsByPriority(ReportPriority priority) async {
    try {
      final response = await _supabase
          .from('reports_comprehensive')
          .select()
          .eq('priority', priority.value)
          .order('created_at', ascending: false);

      return response.map((json) => ComprehensiveReportModel.fromJson(json)).toList();
    } catch (e) {
      print('Error fetching reports by priority: $e');
      return [];
    }
  }

  /// Get single report by ID
  Future<ComprehensiveReportModel?> getReportById(String reportId) async {
    try {
      final response = await _supabase
          .from('reports_comprehensive')
          .select()
          .eq('id', reportId)
          .single();

      return ComprehensiveReportModel.fromJson(response);
    } catch (e) {
      print('Error fetching report by ID: $e');
      return null;
    }
  }

  /// Stream user reports for real-time updates with enhanced responsiveness
  Stream<List<ComprehensiveReportModel>> getUserReportsStream(String userId) {
    // Resolve authenticated UUID if available
    final authId = _supabase.auth.currentUser?.id;
    final effectiveUserId = (authId != null && authId.isNotEmpty) ? authId : userId;

    print('🔄 Setting up real-time stream for user: $effectiveUserId');
    return _supabase
        .from('reports')
        .stream(primaryKey: ['id'])
        .eq('user_id', effectiveUserId)
        .order('created_at', ascending: false)
        .asyncMap((data) async {
          print('📡 Real-time stream: ${data.length} reports received for user $effectiveUserId');
          
          final reports = data.map((json) {
            try {
              return ComprehensiveReportModel.fromJson(json);
            } catch (e) {
              print('❌ Error parsing report: $e');
              rethrow;
            }
          }).toList();
          
          return reports;
        });
  }

  /// Stream assigned reports for officer in real-time
  Stream<List<ComprehensiveReportModel>> getOfficerAssignedReportsStream(String officerId) {
    print('🔄 Setting up officer real-time stream for assigned reports: $officerId');
    return _supabase
        .from('reports')
        .stream(primaryKey: ['id'])
        .order('created_at', ascending: false)
        .asyncMap((data) async {
          final reports = data
              .where((json) =>
                  json['assigned_officer_id']?.toString() == officerId ||
                  json['status'] == 'assigned' ||
                  json['status'] == 'in_progress' ||
                  json['status'] == 'submitted')
              .map((json) {
            try {
              return ComprehensiveReportModel.fromJson(json);
            } catch (e) {
              print('❌ Error parsing officer report: $e');
              rethrow;
            }
          }).toList();
          return reports;
        });
  }

  /// Get officer assigned reports
  Future<List<ComprehensiveReportModel>> getOfficerAssignedReports({String? officerId}) async {
    try {
      final currentId = officerId ?? _supabase.auth.currentUser?.id;
      var query = _supabase.from('reports').select();
      if (currentId != null && currentId.isNotEmpty) {
        query = query.or('assigned_officer_id.eq.$currentId,status.in.(assigned,in_progress,submitted,under_review)');
      }
      final response = await query.order('created_at', ascending: false).limit(100);
      return response.map((json) => ComprehensiveReportModel.fromJson(json)).toList();
    } catch (e) {
      print('⚠️ Error fetching officer assigned reports: $e');
      return [];
    }
  }

  /// Stream all reports for admin real-time updates with enhanced responsiveness  
  Stream<List<ComprehensiveReportModel>> getAllReportsStream() {
    print('🔄 Setting up admin real-time stream for all reports');
    return _supabase
        .from('reports')
        .stream(primaryKey: ['id'])
        .order('created_at', ascending: false)
        .asyncMap((data) async {
          print('📡 Admin real-time stream: ${data.length} total reports received');
          
          final reports = data.map((json) {
            try {
              return ComprehensiveReportModel.fromJson(json);
            } catch (e) {
              print('❌ Error parsing admin report: $e');
              rethrow;
            }
          }).toList();
          
          return reports;
        });
  }

  // ========================================
  // ADMIN FUNCTIONS
  // ========================================

  /// Update report status (admin only)
  Future<StatusUpdateResult> updateReportStatus({
    required String reportId,
    required ReportStatus newStatus,
    required String adminId,
    String? adminNote,
  }) async {
    try {
      final response = await _supabase
          .rpc('update_report_status', params: {
            'report_id_input': int.parse(reportId),
            'new_status': newStatus.value,
            'admin_id_input': adminId,
            'admin_note': adminNote,
          });

      if (response.isNotEmpty && response[0]['success'] == true) {
        return StatusUpdateResult.success(response[0]['message']);
      } else {
        return StatusUpdateResult.error(response[0]['message'] ?? 'Status update failed');
      }
    } catch (e) {
      print('Status update error: $e');
      return StatusUpdateResult.error('Status update error: ${e.toString()}');
    }
  }

  /// Add admin note to report
  Future<StatusUpdateResult> addAdminNote({
    required String reportId,
    required String adminId,
    required String noteText,
    AdminNoteType noteType = AdminNoteType.internal,
  }) async {
    try {
      final response = await _supabase
          .rpc('add_admin_note', params: {
            'report_id_input': int.parse(reportId),
            'admin_id_input': adminId,
            'note_text_input': noteText,
            'note_type_input': noteType.value,
          });

      if (response.isNotEmpty && response[0]['success'] == true) {
        return StatusUpdateResult.success(response[0]['message']);
      } else {
        return StatusUpdateResult.error(response[0]['message'] ?? 'Adding note failed');
      }
    } catch (e) {
      print('Add note error: $e');
      return StatusUpdateResult.error('Add note error: ${e.toString()}');
    }
  }

  /// Get admin notes for a report
  Future<List<AdminNoteModel>> getAdminNotes(String reportId) async {
    try {
      final response = await _supabase
          .from('admin_notes')
          .select()
          .eq('report_id', reportId)
          .order('created_at', ascending: false);

      return response.map((json) => AdminNoteModel.fromJson(json)).toList();
    } catch (e) {
      print('Error fetching admin notes: $e');
      return [];
    }
  }

  /// Get report status history
  Future<List<ReportStatusHistoryModel>> getReportStatusHistory(String reportId) async {
    try {
      final response = await _supabase
          .from('report_status_history')
          .select()
          .eq('report_id', reportId)
          .order('created_at', ascending: false);

      return response.map((json) => ReportStatusHistoryModel.fromJson(json)).toList();
    } catch (e) {
      print('Error fetching status history: $e');
      return [];
    }
  }

  /// Stream real-time status history for a specific complaint
  Stream<List<ReportStatusHistoryModel>> getReportStatusHistoryStream(String reportId) {
    print('🔄 Subscribing to real-time status history stream for report #$reportId');
    return _supabase
        .from('report_status_history')
        .stream(primaryKey: ['id'])
        .eq('report_id', reportId)
        .order('created_at', ascending: false)
        .map((data) => data.map((json) => ReportStatusHistoryModel.fromJson(json)).toList());
  }

  /// Submit citizen rating and feedback for a resolved complaint
  Future<bool> submitCitizenFeedback({
    required String reportId,
    required int rating,
    required String feedback,
  }) async {
    try {
      await _supabase
          .from('reports')
          .update({
            'rating': rating,
            'citizen_feedback': feedback.trim(),
            'updated_at': DateTime.now().toIso8601String(),
          })
          .eq('id', reportId);
      print('✅ Citizen feedback submitted for report #$reportId (Rating: $rating)');
      return true;
    } catch (e) {
      print('❌ Error submitting citizen feedback: $e');
      return false;
    }
  }

  // ========================================
  // CATEGORIES MANAGEMENT
  // ========================================

  /// Get all active categories
  Future<List<CategoryModel>> getActiveCategories() async {
    try {
      final response = await _supabase
          .from('categories')
          .select()
          .eq('is_active', true)
          .order('display_name');

      return response.map((json) => CategoryModel.fromJson(json)).toList();
    } catch (e) {
      print('Error fetching categories: $e');
      return [];
    }
  }

  /// Get category by name
  Future<CategoryModel?> getCategoryByName(String categoryName) async {
    try {
      final response = await _supabase
          .from('categories')
          .select()
          .eq('name', categoryName)
          .single();

      return CategoryModel.fromJson(response);
    } catch (e) {
      print('Error fetching category: $e');
      return null;
    }
  }

  // ========================================
  // NOTIFICATIONS MANAGEMENT
  // ========================================

  /// Get user notifications
  Future<List<NotificationModel>> getUserNotifications(String userId) async {
    try {
      final response = await _supabase
          .from('notifications')
          .select()
          .eq('user_id', userId)
          .order('created_at', ascending: false);

      return response.map((json) => NotificationModel.fromJson(json)).toList();
    } catch (e) {
      print('Error fetching notifications: $e');
      return [];
    }
  }

  /// Mark notification as read
  Future<bool> markNotificationAsRead(String notificationId) async {
    try {
      await _supabase
          .from('notifications')
          .update({'is_read': true})
          .eq('id', notificationId);
      return true;
    } catch (e) {
      print('Error marking notification as read: $e');
      return false;
    }
  }

  /// Mark all notifications as read for user
  Future<bool> markAllNotificationsAsRead(String userId) async {
    try {
      await _supabase
          .from('notifications')
          .update({'is_read': true})
          .eq('user_id', userId);
      return true;
    } catch (e) {
      print('Error marking all notifications as read: $e');
      return false;
    }
  }

  // ========================================
  // DASHBOARD STATISTICS
  // ========================================

  /// Get dashboard statistics
  Future<Map<String, dynamic>> getDashboardStats() async {
    try {
      final response = await _supabase
          .from('dashboard_stats')
          .select()
          .single();

      return response;
    } catch (e) {
      print('Error fetching dashboard stats: $e');
      return {};
    }
  }

  /// Get user-specific statistics
  Future<Map<String, dynamic>> getUserStats(String userId) async {
    try {
      final response = await _supabase
          .from('reports')
          .select('status, priority')
          .eq('user_id', userId);

      // Process the data to create statistics
      int totalReports = response.length;
      int submittedReports = response.where((r) => r['status'] == 'submitted').length;
      int inProgressReports = response.where((r) => r['status'] == 'progress').length;
      int resolvedReports = response.where((r) => r['status'] == 'resolved').length;
      int highPriorityReports = response.where((r) => r['priority'] == 'high').length;

      return {
        'total_reports': totalReports,
        'submitted_reports': submittedReports,
        'in_progress_reports': inProgressReports,
        'resolved_reports': resolvedReports,
        'high_priority_reports': highPriorityReports,
      };
    } catch (e) {
      print('Error fetching user stats: $e');
      return {};
    }
  }

  // ========================================
  // SEARCH AND FILTER FUNCTIONS
  // ========================================

  /// Search reports by text
  Future<List<ComprehensiveReportModel>> searchReports(String searchText) async {
    try {
      final response = await _supabase
          .from('reports_comprehensive')
          .select()
          .or('title.ilike.%$searchText%,description.ilike.%$searchText%,location.ilike.%$searchText%')
          .order('created_at', ascending: false);

      return response.map((json) => ComprehensiveReportModel.fromJson(json)).toList();
    } catch (e) {
      print('Error searching reports: $e');
      return [];
    }
  }

  /// Filter reports by multiple criteria
  Future<List<ComprehensiveReportModel>> filterReports({
    String? userId,
    ReportStatus? status,
    ReportPriority? priority,
    String? category,
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    try {
      var query = _supabase.from('reports_comprehensive').select();

      if (userId != null) {
        query = query.eq('user_id', userId);
      }
      if (status != null) {
        query = query.eq('status', status.value);
      }
      if (priority != null) {
        query = query.eq('priority', priority.value);
      }
      if (category != null) {
        query = query.eq('category', category);
      }
      if (startDate != null) {
        query = query.gte('created_at', startDate.toIso8601String());
      }
      if (endDate != null) {
        query = query.lte('created_at', endDate.toIso8601String());
      }

      final response = await query.order('created_at', ascending: false);

      return response.map((json) => ComprehensiveReportModel.fromJson(json)).toList();
    } catch (e) {
      print('Error filtering reports: $e');
      return [];
    }
  }

  // ========================================
  // USER PROFILE OPERATIONS
  // ========================================

  /// Fetch user profile from Supabase ('users' or 'user_profiles')
  Future<Map<String, dynamic>?> fetchUserProfile(String userId) async {
    try {
      final response = await _supabase
          .from('users')
          .select()
          .eq('id', userId)
          .maybeSingle();
      if (response != null) return Map<String, dynamic>.from(response);
    } catch (e) {
      print('ℹ️ fetchUserProfile from users table: $e, trying user_profiles...');
    }

    try {
      final response = await _supabase
          .from('user_profiles')
          .select()
          .eq('id', userId)
          .maybeSingle();
      if (response != null) return Map<String, dynamic>.from(response);
    } catch (e) {
      print('⚠️ fetchUserProfile from user_profiles table: $e');
    }

    return null;
  }

  /// Update user profile in Supabase ('users' or 'user_profiles')
  Future<bool> updateUserProfile({
    required String userId,
    required String fullName,
    required String phoneNumber,
    required String address,
    String? email,
    String? occupation,
  }) async {
    final updateData = {
      'full_name': fullName.trim(),
      'phone_number': phoneNumber.trim(),
      'address': address.trim(),
      'updated_at': DateTime.now().toIso8601String(),
    };
    if (email != null && email.isNotEmpty) updateData['email'] = email.trim();
    if (occupation != null && occupation.isNotEmpty) updateData['occupation'] = occupation.trim();

    bool updated = false;

    try {
      await _supabase
          .from('users')
          .update(updateData)
          .eq('id', userId);
      updated = true;
      print('✅ Profile updated in users table for user $userId');
    } catch (e) {
      print('ℹ️ updateUserProfile in users table failed ($e), trying user_profiles...');
    }

    if (!updated) {
      try {
        await _supabase
            .from('user_profiles')
            .upsert({
              'id': userId,
              ...updateData,
            });
        updated = true;
        print('✅ Profile updated in user_profiles table for user $userId');
      } catch (e) {
        print('⚠️ updateUserProfile in user_profiles table: $e');
      }
    }

    return updated;
  }
}