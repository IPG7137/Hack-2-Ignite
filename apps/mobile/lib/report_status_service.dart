import 'dart:async';
import 'package:flutter/foundation.dart' show debugPrint;
import 'database_service.dart';
import 'notification_service.dart';
import 'notifications_screen.dart';

class ReportStatusService {
  static final ReportStatusService _instance = ReportStatusService._internal();
  factory ReportStatusService() => _instance;
  ReportStatusService._internal();

  final DatabaseService _databaseService = DatabaseService();
  final NotificationService _notificationService = NotificationService();
  
  // Track previous statuses to detect changes
  final Map<String, String> _previousStatuses = {};
  StreamSubscription<List<ReportModel>>? _statusSubscription;

  // Start monitoring status changes for a user
  void startStatusMonitoring(String userId) {
    debugPrint('🔔 Starting status monitoring for user: $userId');
    
    // Cancel any existing subscription
    _statusSubscription?.cancel();
    
    // Listen to real-time report updates
    _statusSubscription = _databaseService.getUserReportsStream(userId).listen(
      (reports) {
        _checkForStatusChanges(reports);
      },
      onError: (error) {
        debugPrint('❌ Status monitoring error: $error');
      },
    );
  }

  // Stop monitoring status changes
  void stopStatusMonitoring() {
    debugPrint('🛑 Stopping status monitoring');
    _statusSubscription?.cancel();
    _statusSubscription = null;
  }

  // Check for status changes and send notifications
  void _checkForStatusChanges(List<ReportModel> reports) {
    for (final report in reports) {
      final reportId = report.id;
      final currentStatus = report.status;
      final previousStatus = _previousStatuses[reportId];
      
      if (previousStatus != null && previousStatus != currentStatus) {
        debugPrint('🔔 Status change detected for report $reportId: $previousStatus → $currentStatus');
        _sendStatusChangeNotification(report, previousStatus, currentStatus);
      }
      
      // Update the stored status
      _previousStatuses[reportId] = currentStatus;
    }
  }

  // Send appropriate notification based on status change
  void _sendStatusChangeNotification(ReportModel report, String previousStatus, String currentStatus) {
    final reportId = report.id;
    final categoryName = _getCategoryDisplayName(report.category);
    
    debugPrint('📢 Sending notification for status change: $currentStatus');
    
    switch (currentStatus.toLowerCase()) {
      case 'submitted':
        _notificationService.addReportSubmittedNotification(reportId, categoryName);
        break;
        
      case 'under_review':
        _notificationService.addReportUnderReviewNotification(reportId, categoryName);
        break;
        
      case 'assigned':
        _notificationService.addNotification(NotificationItem(
          id: DateTime.now().millisecondsSinceEpoch.toString(),
          title: 'Report Assigned',
          message: 'Your $categoryName report has been assigned to an officer for review',
          type: NotificationType.reportInProgress,
          timestamp: DateTime.now(),
          reportId: reportId,
        ));
        break;
        
      case 'in_progress':
      case 'progress':
        _notificationService.addReportInProgressNotification(reportId, categoryName);
        break;
        
      case 'resolution_submitted':
      case 'resolved':
        _notificationService.addNotification(NotificationItem(
          id: DateTime.now().millisecondsSinceEpoch.toString(),
          title: 'Resolution Submitted',
          message: 'Remediation completed for $categoryName with photo proof attached. Awaiting verification.',
          type: NotificationType.reportResolved,
          timestamp: DateTime.now(),
          reportId: reportId,
        ));
        break;

      case 'verified':
        _notificationService.addNotification(NotificationItem(
          id: DateTime.now().millisecondsSinceEpoch.toString(),
          title: 'Resolution Verified',
          message: 'Resolution for $categoryName has been verified by the municipal inspector/citizen.',
          type: NotificationType.reportResolved,
          timestamp: DateTime.now(),
          reportId: reportId,
        ));
        break;
        
      case 'rejected':
        _notificationService.addReportRejectedNotification(
          reportId, 
          categoryName, 
          'Please check with local authorities for more details'
        );
        break;
        
      case 'closed':
        _notificationService.addNotification(NotificationItem(
          id: DateTime.now().millisecondsSinceEpoch.toString(),
          title: 'Report Closed',
          message: 'Your $categoryName report has been closed. Thank you for your contribution!',
          type: NotificationType.system,
          timestamp: DateTime.now(),
          reportId: reportId,
        ));
        break;
        
      default:
        // Unknown status change
        _notificationService.addSystemNotification(
          'Report Updated',
          'Your $categoryName report status has been updated to $currentStatus'
        );
        break;
    }
  }

  // Get user-friendly category name
  String _getCategoryDisplayName(String category) {
    switch (category.toLowerCase()) {
      case 'roads':
      case 'potholes_roads':
        return 'Roads & Infrastructure';
      case 'water_sewage':
        return 'Water & Sewage';
      case 'electricity_streetlights':
        return 'Electricity & Street Lights';
      case 'waste_management':
        return 'Waste Management';
      case 'public_safety':
        return 'Public Safety';
      case 'parks_recreation':
        return 'Parks & Recreation';
      case 'public_transport':
        return 'Public Transport';
      case 'noise_pollution':
        return 'Noise Pollution';
      case 'environmental':
        return 'Environmental Issues';
      default:
        return category.replaceAll('_', ' ').split(' ').map((word) =>
          word.isEmpty ? '' : word[0].toUpperCase() + word.substring(1)).join(' ');
    }
  }

  // Method to manually trigger status check (useful for testing)
  Future<void> checkStatusUpdates(String userId) async {
    try {
      final reports = await _databaseService.getUserReports(userId);
      _checkForStatusChanges(reports);
    } catch (e) {
      debugPrint('❌ Error checking status updates: $e');
    }
  }

  // Initialize status tracking for existing reports
  Future<void> initializeStatusTracking(String userId) async {
    try {
      final reports = await _databaseService.getUserReports(userId);
      for (final report in reports) {
        _previousStatuses[report.id] = report.status;
      }
      debugPrint('✅ Initialized status tracking for ${reports.length} reports');
    } catch (e) {
      debugPrint('❌ Error initializing status tracking: $e');
    }
  }

  // Dispose method to clean up resources
  void dispose() {
    stopStatusMonitoring();
    _previousStatuses.clear();
  }
}