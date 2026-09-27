import 'dart:convert';
import 'package:flutter/foundation.dart' show debugPrint;
import 'package:supabase_flutter/supabase_flutter.dart';
import 'auth_service.dart';

class EnhancedReportService {
  static final SupabaseClient _supabase = Supabase.instance.client;
  static final AuthService _authService = AuthService.instance;
  static EnhancedReportService? _instance;
  static EnhancedReportService get instance => _instance ??= EnhancedReportService._();
  
  EnhancedReportService._();

  // Submit a new report with user authentication
  Future<ReportSubmissionResult> submitReport({
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
      // Check if user is logged in
      if (!_authService.isLoggedIn) {
        return ReportSubmissionResult.error('Please log in to submit a report');
      }

      final currentUserEmail = _authService.userEmail;
      if (currentUserEmail == null) {
        return ReportSubmissionResult.error('User email not available');
      }

      // Get user ID from email
      final userQuery = await _supabase
          .from('users')
          .select('id, phone_number')
          .eq('email', currentUserEmail)
          .single();
      
      final userId = userQuery['id'];
      final phoneNumber = userQuery['phone_number'];
      
      // Use the database function to submit report
      final response = await _supabase.rpc('submit_report', params: {
        'report_user_id': userId,
        'report_title': title,
        'report_description': description,
        'report_category': category,
        'report_location': location,
        'report_latitude': latitude,
        'report_longitude': longitude,
        'report_image_urls': imageUrls ?? [],
        'report_contact_number': contactNumber ?? phoneNumber,
      });

      if (response != null && response.isNotEmpty) {
        final result = response[0];
        if (result['success'] == true) {
          return ReportSubmissionResult.success(
            reportId: result['report_id'].toString(),
            message: result['message'],
          );
        } else {
          return ReportSubmissionResult.error(result['message'] ?? 'Failed to submit report');
        }
      } else {
        return ReportSubmissionResult.error('Invalid response from server');
      }
    } catch (e) {
      debugPrint('Error submitting report: $e');
      return ReportSubmissionResult.error('Failed to submit report: ${e.toString()}');
    }
  }

  // Get user's reports
  Future<List<EnhancedReportModel>> getUserReports({String? status}) async {
    try {
      if (!_authService.isLoggedIn) {
        throw Exception('User not logged in');
      }

      final currentUserEmail = _authService.userEmail;
      if (currentUserEmail == null) {
        throw Exception('User email not available');
      }

      // Get user ID from email
      final userQuery = await _supabase
          .from('users')
          .select('id')
          .eq('email', currentUserEmail)
          .single();
      
      final userId = userQuery['id'];

      var query = _supabase
          .from('reports_with_user')
          .select()
          .eq('user_id', userId);

      if (status != null) {
        query = query.eq('status', status);
      }

      final response = await query.order('created_at', ascending: false);
      
      return response.map<EnhancedReportModel>((json) => 
          EnhancedReportModel.fromJson(json)).toList();
    } catch (e) {
      debugPrint('Error fetching user reports: $e');
      return [];
    }
  }

  // Get all reports (for admin view)
  Future<List<EnhancedReportModel>> getAllReports({
    String? status,
    String? category,
    int? limit,
    int? offset,
  }) async {
    try {
      if (!_authService.isLoggedIn || !_authService.isAdmin) {
        throw Exception('Admin access required');
      }

      var query = _supabase.from('reports_with_user').select();

      if (status != null) {
        query = query.eq('status', status);
      }
      
      if (category != null) {
        query = query.eq('category', category);
      }

      // Apply ordering first
      var orderedQuery = query.order('created_at', ascending: false);

      if (limit != null) {
        orderedQuery = orderedQuery.limit(limit);
      }

      if (offset != null) {
        orderedQuery = orderedQuery.range(offset, offset + (limit ?? 50) - 1);
      }

      final response = await orderedQuery;
      
      return response.map<EnhancedReportModel>((json) => 
          EnhancedReportModel.fromJson(json)).toList();
    } catch (e) {
      debugPrint('Error fetching all reports: $e');
      return [];
    }
  }

  // Update report status (admin only)
  Future<bool> updateReportStatus({
    required String reportId,
    required String newStatus,
    String? reason,
    String? assignedOfficerId,
    DateTime? estimatedCompletion,
  }) async {
    try {
      if (!_authService.isLoggedIn || !_authService.isAdmin) {
        throw Exception('Admin access required');
      }

      final updateData = <String, dynamic>{
        'status': newStatus,
        'updated_at': DateTime.now().toIso8601String(),
      };

      if (assignedOfficerId != null) {
        updateData['assigned_officer_id'] = assignedOfficerId;
      }

      if (estimatedCompletion != null) {
        updateData['estimated_completion_date'] = estimatedCompletion.toIso8601String();
      }

      if (newStatus == 'resolved') {
        updateData['completion_date'] = DateTime.now().toIso8601String();
      }

      await _supabase
          .from('reports')
          .update(updateData)
          .eq('id', reportId);

      // Log admin action
      await _logAdminAction(
        actionType: 'status_change',
        targetType: 'report',
        targetId: reportId,
        details: {
          'new_status': newStatus,
          'reason': reason,
          'assigned_officer_id': assignedOfficerId,
        },
      );

      return true;
    } catch (e) {
      debugPrint('Error updating report status: $e');
      return false;
    }
  }

  // Send notification to user
  Future<bool> sendNotificationToUser({
    required String userId,
    String? reportId,
    required String title,
    required String message,
    String type = 'admin_message',
  }) async {
    try {
      if (!_authService.isLoggedIn || !_authService.isAdmin) {
        throw Exception('Admin access required');
      }

      await _supabase.from('notifications').insert({
        'user_id': userId,
        'report_id': reportId,
        'title': title,
        'message': message,
        'type': type,
        'created_at': DateTime.now().toIso8601String(),
      });

      return true;
    } catch (e) {
      debugPrint('Error sending notification: $e');
      return false;
    }
  }

  // Get user notifications
  Future<List<NotificationModel>> getUserNotifications({bool? isRead}) async {
    try {
      if (!_authService.isLoggedIn) {
        throw Exception('User not logged in');
      }

      final currentUserEmail = _authService.userEmail;
      if (currentUserEmail == null) {
        throw Exception('User email not available');
      }

      // Get user ID from email
      final userQuery = await _supabase
          .from('users')
          .select('id')
          .eq('email', currentUserEmail)
          .single();
      
      final userId = userQuery['id'];

      var query = _supabase
          .from('notifications')
          .select()
          .eq('user_id', userId);

      if (isRead != null) {
        query = query.eq('is_read', isRead);
      }

      final response = await query.order('created_at', ascending: false);
      
      return response.map<NotificationModel>((json) => 
          NotificationModel.fromJson(json)).toList();
    } catch (e) {
      debugPrint('Error fetching notifications: $e');
      return [];
    }
  }

  // Mark notification as read
  Future<bool> markNotificationAsRead(String notificationId) async {
    try {
      await _supabase
          .from('notifications')
          .update({'is_read': true})
          .eq('id', notificationId);

      return true;
    } catch (e) {
      debugPrint('Error marking notification as read: $e');
      return false;
    }
  }

  // Get dashboard statistics
  Future<DashboardStats?> getDashboardStats() async {
    try {
      final response = await _supabase
          .from('dashboard_stats')
          .select()
          .single();

      return DashboardStats.fromJson(response);
    } catch (e) {
      debugPrint('Error fetching dashboard stats: $e');
      return null;
    }
  }

  // Get categories
  Future<List<CategoryModel>> getCategories() async {
    try {
      final response = await _supabase
          .from('categories')
          .select()
          .eq('is_active', true)
          .order('display_name');

      return response.map<CategoryModel>((json) => 
          CategoryModel.fromJson(json)).toList();
    } catch (e) {
      debugPrint('Error fetching categories: $e');
      return [];
    }
  }

  // Private method to log admin actions
  Future<void> _logAdminAction({
    required String actionType,
    required String targetType,
    required String targetId,
    Map<String, dynamic>? details,
  }) async {
    try {
      if (_authService.isLoggedIn && _authService.isAdmin) {
        final currentUserEmail = _authService.userEmail;
        if (currentUserEmail == null) {
          debugPrint('Cannot log admin action: User email not available');
          return;
        }

        // Get user ID from email
        final userQuery = await _supabase
            .from('users')
            .select('id')
            .eq('email', currentUserEmail)
            .single();
        
        final userId = userQuery['id'];

        await _supabase.from('admin_actions').insert({
          'admin_id': userId,
          'action_type': actionType,
          'target_type': targetType,
          'target_id': targetId,
          'details': details ?? {},
          'created_at': DateTime.now().toIso8601String(),
        });
      }
    } catch (e) {
      debugPrint('Error logging admin action: $e');
    }
  }
}

// Enhanced Report Model with user information
class EnhancedReportModel {
  final String id;
  final String userId;
  final String title;
  final String description;
  final String category;
  final String location;
  final double? latitude;
  final double? longitude;
  final List<String> imageUrls;
  final String status;
  final String priority;
  final DateTime createdAt;
  final DateTime updatedAt;
  final String? assignedOfficerId;
  final DateTime? estimatedCompletionDate;
  final DateTime? completionDate;
  final int consolidatedReports;
  final String? contactNumber;
  final String? adminNotes;
  final String? citizenFeedback;
  final int? rating;
  
  // User information
  final String userName;
  final String userEmail;
  final String? userPhone;
  final String? assignedOfficerName;
  final String? assignedOfficerEmail;
  
  // Category information
  final String categoryDisplayName;
  final String? categoryIcon;
  final String? categoryColor;

  EnhancedReportModel({
    required this.id,
    required this.userId,
    required this.title,
    required this.description,
    required this.category,
    required this.location,
    this.latitude,
    this.longitude,
    required this.imageUrls,
    required this.status,
    required this.priority,
    required this.createdAt,
    required this.updatedAt,
    this.assignedOfficerId,
    this.estimatedCompletionDate,
    this.completionDate,
    required this.consolidatedReports,
    this.contactNumber,
    this.adminNotes,
    this.citizenFeedback,
    this.rating,
    required this.userName,
    required this.userEmail,
    this.userPhone,
    this.assignedOfficerName,
    this.assignedOfficerEmail,
    required this.categoryDisplayName,
    this.categoryIcon,
    this.categoryColor,
  });

  factory EnhancedReportModel.fromJson(Map<String, dynamic> json) {
    // Handle image_urls from JSONB format
    List<String> imageUrls = [];
    if (json['image_urls'] != null) {
      if (json['image_urls'] is List) {
        imageUrls = List<String>.from(json['image_urls']);
      } else if (json['image_urls'] is String) {
        try {
          final parsed = jsonDecode(json['image_urls']);
          if (parsed is List) {
            imageUrls = List<String>.from(parsed);
          }
        } catch (e) {
          debugPrint('Error parsing image URLs: $e');
        }
      }
    }

    return EnhancedReportModel(
      id: json['id'].toString(),
      userId: json['user_id'].toString(),
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      category: json['category'] ?? '',
      location: json['location'] ?? '',
      latitude: json['latitude']?.toDouble(),
      longitude: json['longitude']?.toDouble(),
      imageUrls: imageUrls,
      status: json['status'] ?? 'submitted',
      priority: json['priority'] ?? 'medium',
      createdAt: DateTime.parse(json['created_at']),
      updatedAt: DateTime.parse(json['updated_at']),
      assignedOfficerId: json['assigned_officer_id']?.toString(),
      estimatedCompletionDate: json['estimated_completion_date'] != null 
          ? DateTime.parse(json['estimated_completion_date']) 
          : null,
      completionDate: json['completion_date'] != null 
          ? DateTime.parse(json['completion_date']) 
          : null,
      consolidatedReports: json['consolidated_reports'] ?? 1,
      contactNumber: json['contact_number'],
      adminNotes: json['admin_notes'],
      citizenFeedback: json['citizen_feedback'],
      rating: json['rating'],
      userName: json['user_name'] ?? '',
      userEmail: json['user_email'] ?? '',
      userPhone: json['user_phone'],
      assignedOfficerName: json['assigned_officer_name'],
      assignedOfficerEmail: json['assigned_officer_email'],
      categoryDisplayName: json['category_display_name'] ?? json['category'] ?? '',
      categoryIcon: json['category_icon'],
      categoryColor: json['category_color'],
    );
  }
}

// Notification Model
class NotificationModel {
  final String id;
  final String userId;
  final String? reportId;
  final String title;
  final String message;
  final String type;
  final bool isRead;
  final DateTime createdAt;
  final DateTime? scheduledFor;
  final DateTime? deliveredAt;

  NotificationModel({
    required this.id,
    required this.userId,
    this.reportId,
    required this.title,
    required this.message,
    required this.type,
    required this.isRead,
    required this.createdAt,
    this.scheduledFor,
    this.deliveredAt,
  });

  factory NotificationModel.fromJson(Map<String, dynamic> json) {
    return NotificationModel(
      id: json['id'].toString(),
      userId: json['user_id'].toString(),
      reportId: json['report_id']?.toString(),
      title: json['title'] ?? '',
      message: json['message'] ?? '',
      type: json['type'] ?? '',
      isRead: json['is_read'] ?? false,
      createdAt: DateTime.parse(json['created_at']),
      scheduledFor: json['scheduled_for'] != null 
          ? DateTime.parse(json['scheduled_for']) 
          : null,
      deliveredAt: json['delivered_at'] != null 
          ? DateTime.parse(json['delivered_at']) 
          : null,
    );
  }
}

// Dashboard Statistics Model
class DashboardStats {
  final int totalReports;
  final int submittedReports;
  final int underReviewReports;
  final int inProgressReports;
  final int resolvedReports;
  final int rejectedReports;
  final int urgentReports;
  final int highPriorityReports;
  final int reportsThisWeek;
  final int reportsThisMonth;

  DashboardStats({
    required this.totalReports,
    required this.submittedReports,
    required this.underReviewReports,
    required this.inProgressReports,
    required this.resolvedReports,
    required this.rejectedReports,
    required this.urgentReports,
    required this.highPriorityReports,
    required this.reportsThisWeek,
    required this.reportsThisMonth,
  });

  factory DashboardStats.fromJson(Map<String, dynamic> json) {
    return DashboardStats(
      totalReports: json['total_reports'] ?? 0,
      submittedReports: json['submitted_reports'] ?? 0,
      underReviewReports: json['under_review_reports'] ?? 0,
      inProgressReports: json['in_progress_reports'] ?? 0,
      resolvedReports: json['resolved_reports'] ?? 0,
      rejectedReports: json['rejected_reports'] ?? 0,
      urgentReports: json['urgent_reports'] ?? 0,
      highPriorityReports: json['high_priority_reports'] ?? 0,
      reportsThisWeek: json['reports_this_week'] ?? 0,
      reportsThisMonth: json['reports_this_month'] ?? 0,
    );
  }
}

// Category Model
class CategoryModel {
  final int id;
  final String name;
  final String displayName;
  final String? description;
  final String? iconName;
  final String? colorCode;
  final bool isActive;

  CategoryModel({
    required this.id,
    required this.name,
    required this.displayName,
    this.description,
    this.iconName,
    this.colorCode,
    required this.isActive,
  });

  factory CategoryModel.fromJson(Map<String, dynamic> json) {
    return CategoryModel(
      id: json['id'],
      name: json['name'] ?? '',
      displayName: json['display_name'] ?? '',
      description: json['description'],
      iconName: json['icon_name'],
      colorCode: json['color_code'],
      isActive: json['is_active'] ?? true,
    );
  }
}

// Report Submission Result
class ReportSubmissionResult {
  final bool success;
  final String? reportId;
  final String message;

  ReportSubmissionResult._({
    required this.success,
    this.reportId,
    required this.message,
  });

  factory ReportSubmissionResult.success({
    required String reportId,
    required String message,
  }) {
    return ReportSubmissionResult._(
      success: true,
      reportId: reportId,
      message: message,
    );
  }

  factory ReportSubmissionResult.error(String message) {
    return ReportSubmissionResult._(
      success: false,
      reportId: null,
      message: message,
    );
  }
}