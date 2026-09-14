import 'dart:convert';

// ========================================
// ENHANCED USER MODEL
// ========================================
class UserModel {
  final String id;
  final String email;
  final String fullName;
  final String? phoneNumber;
  final String? aadharNumber;
  final String? address;
  final String? profileImageUrl;
  final bool isAdmin;
  final bool isVerified;
  final DateTime createdAt;
  final DateTime updatedAt;
  final DateTime? lastLogin;

  UserModel({
    required this.id,
    required this.email,
    required this.fullName,
    this.phoneNumber,
    this.aadharNumber,
    this.address,
    this.profileImageUrl,
    required this.isAdmin,
    required this.isVerified,
    required this.createdAt,
    required this.updatedAt,
    this.lastLogin,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'].toString(),
      email: json['email'] ?? '',
      fullName: json['full_name'] ?? '',
      phoneNumber: json['phone_number'],
      aadharNumber: json['aadhar_number'],
      address: json['address'],
      profileImageUrl: json['profile_image_url'],
      isAdmin: json['is_admin'] ?? false,
      isVerified: json['is_verified'] ?? false,
      createdAt: DateTime.parse(json['created_at']),
      updatedAt: DateTime.parse(json['updated_at']),
      lastLogin: json['last_login'] != null ? DateTime.parse(json['last_login']) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'full_name': fullName,
      'phone_number': phoneNumber,
      'aadhar_number': aadharNumber,
      'address': address,
      'profile_image_url': profileImageUrl,
      'is_admin': isAdmin,
      'is_verified': isVerified,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
      'last_login': lastLogin?.toIso8601String(),
    };
  }
}

// ========================================
// COMPREHENSIVE REPORT MODEL
// ========================================
class ComprehensiveReportModel {
  final String id;
  final String userId;
  final String title;
  final String description;
  final String category;
  final String location;
  final double? latitude;
  final double? longitude;
  final List<String> imageUrls;
  
  // Status and Priority
  final ReportStatus status;
  final ReportPriority priority;
  
  // Reporter Information
  final String? reporterName;
  final String? contactNumber;
  final String? aadharNumber;
  
  // Timestamps
  final DateTime createdAt;
  final DateTime updatedAt;
  final DateTime lastStatusChange;
  
  // Admin Management
  final String? assignedOfficerId;
  final String? assignedOfficerName;
  final String? adminNotes;
  
  // Additional Fields
  final DateTime? estimatedCompletionDate;
  final DateTime? completionDate;
  final int consolidatedReports;
  final String? citizenFeedback;
  final int? rating;
  final bool isPotentialDuplicate;
  final String? parentReportId;
  final String? resolutionNotes;
  final String? resolutionImageUrl;

  // Display fields (from view)
  final String? userName;
  final String? userEmail;
  final String? userPhone;
  final String? categoryDisplayName;
  final String? categoryIcon;
  final String? categoryColor;
  final String statusDisplay;
  final String submittedTime;
  final String lastUpdatedTime;
  final String gpsDisplay;
  final int adminNotesCount;

  ComprehensiveReportModel({
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
    this.reporterName,
    this.contactNumber,
    this.aadharNumber,
    required this.createdAt,
    required this.updatedAt,
    required this.lastStatusChange,
    this.assignedOfficerId,
    this.assignedOfficerName,
    this.adminNotes,
    this.estimatedCompletionDate,
    this.completionDate,
    required this.consolidatedReports,
    this.citizenFeedback,
    this.rating,
    this.isPotentialDuplicate = false,
    this.parentReportId,
    this.resolutionNotes,
    this.resolutionImageUrl,
    this.userName,
    this.userEmail,
    this.userPhone,
    this.categoryDisplayName,
    this.categoryIcon,
    this.categoryColor,
    required this.statusDisplay,
    required this.submittedTime,
    required this.lastUpdatedTime,
    required this.gpsDisplay,
    required this.adminNotesCount,
  });

  factory ComprehensiveReportModel.fromJson(Map<String, dynamic> json) {
    // Parse image URLs
    List<String> imageUrls = [];
    if (json['image_urls'] != null) {
      if (json['image_urls'] is String) {
        try {
          final parsed = jsonDecode(json['image_urls']);
          if (parsed is List) {
            imageUrls = List<String>.from(parsed);
          }
        } catch (e) {
          // Error parsing, keep empty list
        }
      } else if (json['image_urls'] is List) {
        imageUrls = List<String>.from(json['image_urls']);
      }
    }

    // Parse latitude and longitude robustly
    double? latitude;
    double? longitude;
    if (json['latitude'] != null) {
      latitude = double.tryParse(json['latitude'].toString());
    }
    if (json['longitude'] != null) {
      longitude = double.tryParse(json['longitude'].toString());
    }
    if (latitude == null || longitude == null) {
      if (json['coordinates'] is Map) {
        latitude ??= double.tryParse(json['coordinates']['lat']?.toString() ?? '');
        longitude ??= double.tryParse(json['coordinates']['lng']?.toString() ?? '');
      } else if (json['coordinates'] is String) {
        try {
          final parsed = jsonDecode(json['coordinates']);
          if (parsed is Map) {
            latitude ??= double.tryParse(parsed['lat']?.toString() ?? '');
            longitude ??= double.tryParse(parsed['lng']?.toString() ?? '');
          }
        } catch (_) {}
      }
    }

    return ComprehensiveReportModel(
      id: json['id'].toString(),
      userId: json['user_id']?.toString() ?? '',
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      category: json['category'] ?? '',
      location: json['location'] ?? '',
      latitude: latitude,
      longitude: longitude,
      imageUrls: imageUrls,
      status: ReportStatusExtension.fromString(json['status'] ?? 'submitted'),
      priority: ReportPriorityExtension.fromString(json['priority'] ?? 'medium'),
      reporterName: json['reporter_name'],
      contactNumber: json['contact_number'],
      aadharNumber: json['aadhar_number'],
      createdAt: DateTime.parse(json['created_at']),
      updatedAt: DateTime.parse(json['updated_at']),
      lastStatusChange: DateTime.parse(json['last_status_change'] ?? json['updated_at']),
      assignedOfficerId: json['assigned_officer_id']?.toString(),
      assignedOfficerName: json['assigned_officer_name'],
      adminNotes: json['admin_notes'],
      estimatedCompletionDate: json['estimated_completion_date'] != null 
          ? DateTime.parse(json['estimated_completion_date']) : null,
      completionDate: json['completion_date'] != null 
          ? DateTime.parse(json['completion_date']) : null,
      consolidatedReports: json['consolidated_reports'] ?? 1,
      citizenFeedback: json['citizen_feedback'],
      rating: json['rating'],
      isPotentialDuplicate: json['potential_duplicate'] == true,
      parentReportId: json['parent_report_id']?.toString(),
      resolutionNotes: json['resolution_notes'],
      resolutionImageUrl: json['resolution_image_url'],
      // Display fields from view
      userName: json['user_name'],
      userEmail: json['user_email'],
      userPhone: json['user_phone'],
      categoryDisplayName: json['category_display_name'],
      categoryIcon: json['category_icon'],
      categoryColor: json['category_color'],
      statusDisplay: json['status_display'] ?? _mapStatusToDisplay(json['status'] ?? 'submitted'),
      submittedTime: json['submitted_time'] ?? _formatDateTime(DateTime.parse(json['created_at'])),
      lastUpdatedTime: json['last_updated_time'] ?? _formatDateTime(DateTime.parse(json['updated_at'])),
      gpsDisplay: json['gps_display'] ?? (latitude != null && longitude != null ? '${latitude.toStringAsFixed(5)}, ${longitude.toStringAsFixed(5)}' : 'GPS coordinates not available'),
      adminNotesCount: json['admin_notes_count'] ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'user_id': userId,
      'title': title,
      'description': description,
      'category': category,
      'location': location,
      'latitude': latitude,
      'longitude': longitude,
      'image_urls': jsonEncode(imageUrls),
      'status': status.value,
      'priority': priority.value,
      'reporter_name': reporterName,
      'contact_number': contactNumber,
      'aadhar_number': aadharNumber,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
      'last_status_change': lastStatusChange.toIso8601String(),
      'assigned_officer_id': assignedOfficerId,
      'resolution_notes': resolutionNotes,
      'resolution_image_url': resolutionImageUrl,
      'assigned_officer_name': assignedOfficerName,
      'admin_notes': adminNotes,
      'estimated_completion_date': estimatedCompletionDate?.toIso8601String(),
      'completion_date': completionDate?.toIso8601String(),
      'consolidated_reports': consolidatedReports,
      'citizen_feedback': citizenFeedback,
      'rating': rating,
    };
  }

  static String _mapStatusToDisplay(String status) {
    switch (status) {
      case 'submitted': return 'Submitted';
      case 'review': return 'Review';
      case 'assigned': return 'Assigned';
      case 'progress': return 'Progress';
      case 'resolved': return 'Resolved';
      default: return status;
    }
  }

  static String _formatDateTime(DateTime dateTime) {
    return '${dateTime.day.toString().padLeft(2, '0')}/${dateTime.month.toString().padLeft(2, '0')}/${dateTime.year} ${dateTime.hour.toString().padLeft(2, '0')}:${dateTime.minute.toString().padLeft(2, '0')}';
  }
}

// ========================================
// ========================================
// CANONICAL REPORT STATUS ENUM (Phase 13 Integration)
// ========================================
enum ReportStatus {
  submitted,
  review,
  under_review,
  assigned,
  progress,
  in_progress,
  resolution_submitted,
  resolved,
  verified,
  closed,
  rejected,
}

extension ReportStatusExtension on ReportStatus {
  String get value {
    switch (this) {
      case ReportStatus.submitted:
        return 'submitted';
      case ReportStatus.review:
        return 'review';
      case ReportStatus.under_review:
        return 'under_review';
      case ReportStatus.assigned:
        return 'assigned';
      case ReportStatus.progress:
        return 'progress';
      case ReportStatus.in_progress:
        return 'in_progress';
      case ReportStatus.resolution_submitted:
        return 'resolution_submitted';
      case ReportStatus.resolved:
        return 'resolved';
      case ReportStatus.verified:
        return 'verified';
      case ReportStatus.closed:
        return 'closed';
      case ReportStatus.rejected:
        return 'rejected';
    }
  }

  String get canonicalDbValue {
    switch (this) {
      case ReportStatus.submitted:
        return 'submitted';
      case ReportStatus.review:
      case ReportStatus.under_review:
        return 'under_review';
      case ReportStatus.assigned:
        return 'assigned';
      case ReportStatus.progress:
      case ReportStatus.in_progress:
        return 'in_progress';
      case ReportStatus.resolution_submitted:
        return 'resolution_submitted';
      case ReportStatus.resolved:
      case ReportStatus.verified:
        return 'verified';
      case ReportStatus.closed:
        return 'closed';
      case ReportStatus.rejected:
        return 'rejected';
    }
  }

  String get displayName {
    switch (this) {
      case ReportStatus.submitted:
        return 'Submitted';
      case ReportStatus.review:
      case ReportStatus.under_review:
        return 'Under Review';
      case ReportStatus.assigned:
        return 'Assigned';
      case ReportStatus.progress:
      case ReportStatus.in_progress:
        return 'In Progress';
      case ReportStatus.resolution_submitted:
        return 'Resolution Submitted';
      case ReportStatus.resolved:
        return 'Resolved';
      case ReportStatus.verified:
        return 'Verified';
      case ReportStatus.closed:
        return 'Closed';
      case ReportStatus.rejected:
        return 'Rejected';
    }
  }

  static ReportStatus fromString(String status) {
    final s = status.toLowerCase().trim().replaceAll(' ', '_').replaceAll('-', '_');
    switch (s) {
      case 'submitted':
        return ReportStatus.submitted;
      case 'review':
        return ReportStatus.review;
      case 'under_review':
      case 'in_review':
        return ReportStatus.under_review;
      case 'assigned':
        return ReportStatus.assigned;
      case 'progress':
        return ReportStatus.progress;
      case 'in_progress':
        return ReportStatus.in_progress;
      case 'resolution_submitted':
        return ReportStatus.resolution_submitted;
      case 'resolved':
        return ReportStatus.resolved;
      case 'verified':
        return ReportStatus.verified;
      case 'closed':
        return ReportStatus.closed;
      case 'rejected':
        return ReportStatus.rejected;
      default:
        return ReportStatus.submitted;
    }
  }
}

// ========================================
// REPORT PRIORITY ENUM
// ========================================
enum ReportPriority {
  low,
  medium,
  high,
}

extension ReportPriorityExtension on ReportPriority {
  String get value {
    switch (this) {
      case ReportPriority.low:
        return 'low';
      case ReportPriority.medium:
        return 'medium';
      case ReportPriority.high:
        return 'high';
    }
  }

  String get displayName {
    switch (this) {
      case ReportPriority.low:
        return 'Low';
      case ReportPriority.medium:
        return 'Medium';
      case ReportPriority.high:
        return 'High';
    }
  }

  static ReportPriority fromString(String priority) {
    switch (priority.toLowerCase()) {
      case 'low':
        return ReportPriority.low;
      case 'medium':
        return ReportPriority.medium;
      case 'high':
        return ReportPriority.high;
      default:
        return ReportPriority.medium;
    }
  }
}

// ========================================
// REPORT STATUS HISTORY MODEL
// ========================================
class ReportStatusHistoryModel {
  final String id;
  final String reportId;
  final String? oldStatus;
  final String newStatus;
  final String changedBy;
  final String? changedByName;
  final String? changeReason;
  final String? adminNotes;
  final DateTime createdAt;

  ReportStatusHistoryModel({
    required this.id,
    required this.reportId,
    this.oldStatus,
    required this.newStatus,
    required this.changedBy,
    this.changedByName,
    this.changeReason,
    this.adminNotes,
    required this.createdAt,
  });

  factory ReportStatusHistoryModel.fromJson(Map<String, dynamic> json) {
    return ReportStatusHistoryModel(
      id: json['id'].toString(),
      reportId: json['report_id'].toString(),
      oldStatus: json['old_status'],
      newStatus: json['new_status'] ?? '',
      changedBy: json['changed_by'].toString(),
      changedByName: json['changed_by_name'],
      changeReason: json['change_reason'],
      adminNotes: json['admin_notes'],
      createdAt: DateTime.parse(json['created_at']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'report_id': reportId,
      'old_status': oldStatus,
      'new_status': newStatus,
      'changed_by': changedBy,
      'changed_by_name': changedByName,
      'change_reason': changeReason,
      'admin_notes': adminNotes,
      'created_at': createdAt.toIso8601String(),
    };
  }
}

// ========================================
// ADMIN NOTE MODEL
// ========================================
class AdminNoteModel {
  final String id;
  final String reportId;
  final String adminId;
  final String adminName;
  final String noteText;
  final AdminNoteType noteType;
  final DateTime createdAt;
  final DateTime updatedAt;

  AdminNoteModel({
    required this.id,
    required this.reportId,
    required this.adminId,
    required this.adminName,
    required this.noteText,
    required this.noteType,
    required this.createdAt,
    required this.updatedAt,
  });

  factory AdminNoteModel.fromJson(Map<String, dynamic> json) {
    return AdminNoteModel(
      id: json['id'].toString(),
      reportId: json['report_id'].toString(),
      adminId: json['admin_id'].toString(),
      adminName: json['admin_name'] ?? '',
      noteText: json['note_text'] ?? '',
      noteType: AdminNoteTypeExtension.fromString(json['note_type'] ?? 'internal'),
      createdAt: DateTime.parse(json['created_at']),
      updatedAt: DateTime.parse(json['updated_at']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'report_id': reportId,
      'admin_id': adminId,
      'admin_name': adminName,
      'note_text': noteText,
      'note_type': noteType.value,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }
}

// ========================================
// ADMIN NOTE TYPE ENUM
// ========================================
enum AdminNoteType {
  internal,
  public,
  system,
}

extension AdminNoteTypeExtension on AdminNoteType {
  String get value {
    switch (this) {
      case AdminNoteType.internal:
        return 'internal';
      case AdminNoteType.public:
        return 'public';
      case AdminNoteType.system:
        return 'system';
    }
  }

  String get displayName {
    switch (this) {
      case AdminNoteType.internal:
        return 'Internal Note';
      case AdminNoteType.public:
        return 'Public Note';
      case AdminNoteType.system:
        return 'System Note';
    }
  }

  static AdminNoteType fromString(String type) {
    switch (type.toLowerCase()) {
      case 'internal':
        return AdminNoteType.internal;
      case 'public':
        return AdminNoteType.public;
      case 'system':
        return AdminNoteType.system;
      default:
        return AdminNoteType.internal;
    }
  }
}

// ========================================
// CATEGORY MODEL
// ========================================
class CategoryModel {
  final int id;
  final String name;
  final String displayName;
  final String? description;
  final String? iconName;
  final String? colorCode;
  final bool isActive;
  final DateTime createdAt;

  CategoryModel({
    required this.id,
    required this.name,
    required this.displayName,
    this.description,
    this.iconName,
    this.colorCode,
    required this.isActive,
    required this.createdAt,
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
      createdAt: DateTime.parse(json['created_at']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'display_name': displayName,
      'description': description,
      'icon_name': iconName,
      'color_code': colorCode,
      'is_active': isActive,
      'created_at': createdAt.toIso8601String(),
    };
  }
}

// ========================================
// NOTIFICATION MODEL
// ========================================
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
      scheduledFor: json['scheduled_for'] != null ? DateTime.parse(json['scheduled_for']) : null,
      deliveredAt: json['delivered_at'] != null ? DateTime.parse(json['delivered_at']) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'user_id': userId,
      'report_id': reportId,
      'title': title,
      'message': message,
      'type': type,
      'is_read': isRead,
      'created_at': createdAt.toIso8601String(),
      'scheduled_for': scheduledFor?.toIso8601String(),
      'delivered_at': deliveredAt?.toIso8601String(),
    };
  }
}

// ========================================
// REPORT SUBMISSION RESULT
// ========================================
class ReportSubmissionResult {
  final bool success;
  final String? reportId;
  final String message;
  final String? priority;
  final bool isPotentialDuplicate;
  final String? parentReportId;
  final double? distanceMeters;

  ReportSubmissionResult._({
    required this.success,
    this.reportId,
    required this.message,
    this.priority,
    this.isPotentialDuplicate = false,
    this.parentReportId,
    this.distanceMeters,
  });

  factory ReportSubmissionResult.success({
    required String reportId,
    required String message,
    String? priority,
    bool isPotentialDuplicate = false,
    String? parentReportId,
    double? distanceMeters,
  }) {
    return ReportSubmissionResult._(
      success: true,
      reportId: reportId,
      message: message,
      priority: priority,
      isPotentialDuplicate: isPotentialDuplicate,
      parentReportId: parentReportId,
      distanceMeters: distanceMeters,
    );
  }

  factory ReportSubmissionResult.error(String message) {
    return ReportSubmissionResult._(
      success: false,
      message: message,
    );
  }
}

// ========================================
// STATUS UPDATE RESULT
// ========================================
class StatusUpdateResult {
  final bool success;
  final String message;

  StatusUpdateResult._({
    required this.success,
    required this.message,
  });

  factory StatusUpdateResult.success(String message) {
    return StatusUpdateResult._(success: true, message: message);
  }

  factory StatusUpdateResult.error(String message) {
    return StatusUpdateResult._(success: false, message: message);
  }
}