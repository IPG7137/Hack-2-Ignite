import 'dart:convert';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'credit_service.dart';
// import 'package:shared_preferences/shared_preferences.dart'; // Unused import

class ReportModel {
  final String id;
  final String title;
  final String description;
  final String category;
  final String location;
  final List<String> imageUrls;
  final String status;
  final DateTime createdAt;
  final DateTime updatedAt;
  final String userId;
  final Map<String, double>? coordinates;
  final String? priority;
  final int? consolidatedReports;
  final String? assignedOfficer;
  final String? contactNumber;

  ReportModel({
    required this.id,
    required this.title,
    required this.description,
    required this.category,
    required this.location,
    required this.imageUrls,
    required this.status,
    required this.createdAt,
    required this.updatedAt,
    required this.userId,
    this.coordinates,
    this.priority,
    this.consolidatedReports,
    this.assignedOfficer,
    this.contactNumber,
  });

  factory ReportModel.fromJson(Map<String, dynamic> json) {
    // Handle image_urls from JSONB format
    List<String> imageUrls = [];
    if (json['image_urls'] != null) {
      if (json['image_urls'] is List) {
        imageUrls = List<String>.from(json['image_urls']);
      } else if (json['image_urls'] is String) {
        try {
          // Try to parse as JSON string
          final parsed = jsonDecode(json['image_urls']);
          if (parsed is List) {
            imageUrls = List<String>.from(parsed);
          }
        } catch (e) {
          // Error parsing image_urls as JSON, using empty list
        }
      }
    }
    
    return ReportModel(
      id: json['id']?.toString() ?? '',
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      category: json['category'] ?? '',
      location: json['location'] ?? '',
      imageUrls: imageUrls,
      status: json['status'] ?? 'submitted',
      createdAt: json['created_at'] != null 
          ? DateTime.parse(json['created_at'])
          : DateTime.now(),
      updatedAt: json['updated_at'] != null 
          ? DateTime.parse(json['updated_at'])
          : DateTime.now(),
      userId: json['user_id'] ?? '',
      coordinates: json['coordinates'] != null 
          ? Map<String, double>.from(json['coordinates'])
          : null,
      priority: json['priority'] ?? 'medium',
      consolidatedReports: json['consolidated_reports'] ?? 1,
      assignedOfficer: json['assigned_officer'],
      contactNumber: json['contact_number'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'category': category,
      'location': location,
      'image_urls': imageUrls,
      'status': status,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
      'user_id': userId,
      'coordinates': coordinates,
      'priority': priority ?? 'medium',
      'consolidated_reports': consolidatedReports ?? 1,
      'assigned_officer': assignedOfficer,
      'contact_number': contactNumber,
    };
  }
}

class DatabaseService {
  static final DatabaseService _instance = DatabaseService._internal();
  factory DatabaseService() => _instance;
  DatabaseService._internal();

  final SupabaseClient _supabase = Supabase.instance.client;

  Future<ReportModel?> createReport({
    required String title,
    required String description,
    required String category,
    required String location,
    required List<String> imageUrls,
    required String userId,
    Map<String, double>? coordinates,
  }) async {
    try {
      final now = DateTime.now();
      
      // Check image sizes and truncate if necessary
      final processedImageUrls = <String>[];
      for (int i = 0; i < imageUrls.length; i++) {
        final imageUrl = imageUrls[i];
        final sizeInMB = (imageUrl.length * 0.75) / (1024 * 1024); // Rough base64 to bytes conversion
        
        if (sizeInMB > 10) { // Limit to 10MB per image
          continue;
        }
        
        processedImageUrls.add(imageUrl);
      }
      
      final reportData = {
        'title': title,
        'description': description,
        'category': category,
        'location': location,
        'image_urls': processedImageUrls, // Use processed images
        'status': 'submitted',
        'created_at': now.toIso8601String(),
        'updated_at': now.toIso8601String(),
        'user_id': userId,
        'coordinates': coordinates,
        'priority': 'medium',
        'consolidated_reports': 1,
      };

      final response = await _supabase
          .from('reports')
          .insert(reportData)
          .select('id')
          .single();
      
      final reportWithId = ReportModel(
        id: response['id'].toString(),
        title: title,
        description: description,
        category: category,
        location: location,
        imageUrls: processedImageUrls, // Use processed images
        status: 'submitted',
        createdAt: now,
        updatedAt: now,
        userId: userId,
        coordinates: coordinates,
        priority: 'medium',
        consolidatedReports: 1,
        assignedOfficer: null,
        contactNumber: null,
      );
      
      // Verify the report was saved with images by querying it back
      try {
        await _supabase
            .from('reports')
            .select('id, image_urls')
            .eq('id', reportWithId.id)
            .single();
      } catch (verifyError) {
        // Verification failed, but report was still created
      }

      // Award credits to user for successful report submission
      try {
        await CreditService.awardCreditsForReport(userId, reportWithId.id);
      } catch (creditError) {
        // Credit awarding failed, but report was still created successfully
      }
      
      return reportWithId;
    } catch (e) {
      return null;
    }
  }

  Future<List<ReportModel>> getUserReports(String userId) async {
    try {
      final response = await _supabase
          .from('reports')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', ascending: false);
      
      final supabaseReports = response
          .map((data) => ReportModel.fromJson(data))
          .toList();
      
      return supabaseReports;
      
    } catch (e) {
      return [];
    }
  }

  Future<ReportModel?> getReportById(String reportId) async {
    try {
      final response = await _supabase
          .from('reports')
          .select('*')
          .eq('id', reportId)
          .single();
      
      return ReportModel.fromJson(response);
    } catch (e) {
      return null;
    }
  }

  Future<bool> updateReportStatus(String reportId, String newStatus) async {
    try {
      print('📝 Updating report $reportId status to: $newStatus');
      
      final updateData = {
        'status': newStatus,
        'updated_at': DateTime.now().toIso8601String(),
      };
      
      // Add completion date if resolved
      if (newStatus.toLowerCase() == 'resolved') {
        updateData['completion_date'] = DateTime.now().toIso8601String();
      }
      
      await _supabase
          .from('reports')
          .update(updateData)
          .eq('id', reportId);
          
      print('✅ Report status updated successfully');
      return true;
    } catch (e) {
      print('❌ Failed to update report status: $e');
      return false;
    }
  }

  // Method for testing status progression
  Future<bool> progressReportStatus(String reportId) async {
    try {
      // Get current status
      final report = await getReportById(reportId);
      if (report == null) {
        print('❌ Report not found: $reportId');
        return false;
      }

      final currentStatus = report.status.toLowerCase();
      String nextStatus;

      // Define status progression
      switch (currentStatus) {
        case 'submitted':
          nextStatus = 'under_review';
          break;
        case 'under_review':
          nextStatus = 'assigned';
          break;
        case 'assigned':
          nextStatus = 'in_progress';
          break;
        case 'in_progress':
          nextStatus = 'resolved';
          break;
        default:
          print('⚠️ Report already at final status: $currentStatus');
          return false;
      }

      print('🔄 Progressing report from $currentStatus to $nextStatus');
      return await updateReportStatus(reportId, nextStatus);
    } catch (e) {
      print('❌ Failed to progress report status: $e');
      return false;
    }
  }

  Stream<List<ReportModel>> getUserReportsStream(String userId) {
    if (userId.isEmpty) {
      return Stream.value(<ReportModel>[]);
    }
    return _supabase
        .from('reports')
        .stream(primaryKey: ['id'])
        .eq('user_id', userId)
        .order('created_at', ascending: false)
        .map((data) {
          print('🔄 Real-time data received: ${data.length} reports');
          return data
              .map((item) {
                print('   Status for ${item['title']}: ${item['status']}');
                return ReportModel.fromJson(item);
              })
              .toList();
        });
  }

  Future<bool> deleteReport(String reportId) async {
    try {
      await _supabase
          .from('reports')
          .delete()
          .eq('id', reportId);
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<List<ReportModel>> getStoredReports() async {
    return [];
  }
}