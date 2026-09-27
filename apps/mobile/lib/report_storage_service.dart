import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'track_reports_screen.dart';
import 'category_selection_screen.dart';

class ReportStorageService {
  static const String _reportsKey = 'stored_reports';
  
  // Singleton pattern
  static final ReportStorageService _instance = ReportStorageService._internal();
  factory ReportStorageService() => _instance;
  ReportStorageService._internal();
  
  // Save a report to local storage
  Future<String> saveReport({
    required String title,
    required String description,
    required ReportCategory category,
    required String location,
    required List<File> images,
    double? latitude,
    double? longitude,
  }) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      
      // Generate unique report ID
      final reportId = 'CIV${DateTime.now().millisecondsSinceEpoch.toString().substring(5)}';
      
      // Convert images to base64 strings for storage
      List<String> imageBase64List = [];
      for (File image in images) {
        try {
          final bytes = await image.readAsBytes();
          final base64String = base64Encode(bytes);
          imageBase64List.add(base64String);
        } catch (e) {
          debugPrint('Error encoding image: $e');
          // Continue with other images even if one fails
        }
      }
      
      // Create report data
      final reportData = {
        'id': reportId,
        'title': category.name,
        'description': description,
        'categoryId': category.id,
        'categoryName': category.name,
        'location': location,
        'latitude': latitude,
        'longitude': longitude,
        'submissionDate': DateTime.now().toIso8601String(),
        'status': ReportStatus.submitted.name,
        'priority': _calculatePriority(category.id).name,
        'consolidatedReports': 1,
        'assignedOfficer': null,
        'contactNumber': null,
        'images': imageBase64List,
        'updates': [
          'Report submitted successfully on ${_formatDateTime(DateTime.now())}',
        ],
      };
      
      // Get existing reports
      final existingReports = await getStoredReports();
      
      // Add new report to the beginning of the list
      existingReports.insert(0, _createReportFromData(reportData));
      
      // Convert all reports to JSON
      final reportsJsonList = existingReports.map((report) => _reportToJson(report)).toList();
      
      // Save to SharedPreferences
      await prefs.setString(_reportsKey, jsonEncode(reportsJsonList));
      
      return reportId;
    } catch (e) {
      debugPrint('Error saving report: $e');
      rethrow;
    }
  }
  
  // Get all stored reports
  Future<List<Report>> getStoredReports() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final reportsJson = prefs.getString(_reportsKey);
      
      if (reportsJson == null || reportsJson.isEmpty) {
        return [];
      }
      
      final List<dynamic> reportsList = jsonDecode(reportsJson);
      return reportsList.map((json) => _createReportFromJson(json)).toList();
    } catch (e) {
      debugPrint('Error loading reports: $e');
      return [];
    }
  }
  
  // Update report status
  Future<void> updateReportStatus(String reportId, ReportStatus newStatus) async {
    try {
      final reports = await getStoredReports();
      final reportIndex = reports.indexWhere((report) => report.id == reportId);
      
      if (reportIndex != -1) {
        final currentReport = reports[reportIndex];
        final updatedUpdates = List<String>.from(currentReport.updates);
        updatedUpdates.add('Status updated to ${_getStatusDisplayName(newStatus)} on ${_formatDateTime(DateTime.now())}');
        
        final updatedReport = Report(
          id: currentReport.id,
          title: currentReport.title,
          description: currentReport.description,
          category: currentReport.category,
          location: currentReport.location,
          submissionDate: currentReport.submissionDate,
          status: newStatus,
          priority: currentReport.priority,
          consolidatedReports: currentReport.consolidatedReports,
          assignedOfficer: currentReport.assignedOfficer,
          contactNumber: currentReport.contactNumber,
          imageUrl: currentReport.imageUrl,
          updates: updatedUpdates,
        );
        
        reports[reportIndex] = updatedReport;
        
        final prefs = await SharedPreferences.getInstance();
        final reportsJsonList = reports.map((report) => _reportToJson(report)).toList();
        await prefs.setString(_reportsKey, jsonEncode(reportsJsonList));
      }
    } catch (e) {
      debugPrint('Error updating report status: $e');
    }
  }
  
  // Delete a report
  Future<void> deleteReport(String reportId) async {
    try {
      final reports = await getStoredReports();
      reports.removeWhere((report) => report.id == reportId);
      
      final prefs = await SharedPreferences.getInstance();
      final reportsJsonList = reports.map((report) => _reportToJson(report)).toList();
      await prefs.setString(_reportsKey, jsonEncode(reportsJsonList));
    } catch (e) {
      debugPrint('Error deleting report: $e');
    }
  }
  
  // Clear all reports
  Future<void> clearAllReports() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_reportsKey);
    } catch (e) {
      debugPrint('Error clearing reports: $e');
    }
  }
  
  // Helper methods
  PriorityLevel _calculatePriority(String categoryId) {
    switch (categoryId) {
      case 'public_safety':
      case 'water_drainage':
        return PriorityLevel.high;
      case 'potholes_roads':
      case 'electricity_streetlights':
        return PriorityLevel.medium;
      case 'waste_garbage':
      case 'public_transport':
      case 'parks_recreation':
      case 'noise_pollution':
      case 'other':
      default:
        return PriorityLevel.low;
    }
  }
  
  String _getStatusDisplayName(ReportStatus status) {
    switch (status) {
      case ReportStatus.submitted:
        return 'Submitted';
      case ReportStatus.inReview:
        return 'Under Review';
      case ReportStatus.assigned:
        return 'Assigned';
      case ReportStatus.inProgress:
        return 'In Progress';
      case ReportStatus.resolved:
        return 'Resolved';
      case ReportStatus.closed:
        return 'Closed';
    }
  }
  
  String _formatDateTime(DateTime dateTime) {
    return '${dateTime.day}/${dateTime.month}/${dateTime.year} at ${dateTime.hour.toString().padLeft(2, '0')}:${dateTime.minute.toString().padLeft(2, '0')}';
  }
  
  // Convert Report to JSON
  Map<String, dynamic> _reportToJson(Report report) {
    return {
      'id': report.id,
      'title': report.title,
      'description': report.description,
      'categoryId': 'unknown', // We'll store the category ID separately
      'categoryName': report.title, // Use title as category name
      'location': report.location,
      'submissionDate': report.submissionDate.toIso8601String(),
      'status': report.status.name,
      'priority': report.priority.name,
      'consolidatedReports': report.consolidatedReports,
      'assignedOfficer': report.assignedOfficer,
      'contactNumber': report.contactNumber,
      'imageUrl': report.imageUrl,
      'updates': report.updates,
    };
  }
  
  // Create Report from JSON
  Report _createReportFromJson(Map<String, dynamic> json) {
    return Report(
      id: json['id'] ?? '',
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      category: _createDummyCategory(json['categoryName'] ?? json['title'] ?? 'Other'),
      location: json['location'] ?? '',
      submissionDate: DateTime.parse(json['submissionDate'] ?? DateTime.now().toIso8601String()),
      status: ReportStatus.values.firstWhere(
        (e) => e.name == json['status'],
        orElse: () => ReportStatus.submitted,
      ),
      priority: PriorityLevel.values.firstWhere(
        (e) => e.name == json['priority'],
        orElse: () => PriorityLevel.low,
      ),
      consolidatedReports: json['consolidatedReports'] ?? 1,
      assignedOfficer: json['assignedOfficer'],
      contactNumber: json['contactNumber'],
      imageUrl: json['imageUrl'],
      updates: List<String>.from(json['updates'] ?? []),
    );
  }
  
  // Create Report from data map
  Report _createReportFromData(Map<String, dynamic> data) {
    return Report(
      id: data['id'] ?? '',
      title: data['title'] ?? '',
      description: data['description'] ?? '',
      category: _createDummyCategory(data['categoryName'] ?? data['title'] ?? 'Other'),
      location: data['location'] ?? '',
      submissionDate: DateTime.parse(data['submissionDate'] ?? DateTime.now().toIso8601String()),
      status: ReportStatus.values.firstWhere(
        (e) => e.name == data['status'],
        orElse: () => ReportStatus.submitted,
      ),
      priority: PriorityLevel.values.firstWhere(
        (e) => e.name == data['priority'],
        orElse: () => PriorityLevel.low,
      ),
      consolidatedReports: data['consolidatedReports'] ?? 1,
      assignedOfficer: data['assignedOfficer'],
      contactNumber: data['contactNumber'],
      imageUrl: data['imageUrl'],
      updates: List<String>.from(data['updates'] ?? []),
    );
  }
  
  // Create a dummy category for the Report constructor
  ReportCategory _createDummyCategory(String name) {
    return ReportCategory(
      id: 'stored_report',
      name: name,
      icon: Icons.description,
      color: Colors.blue,
      gradient: const LinearGradient(colors: [Colors.blue, Colors.blueAccent]),
      description: 'Stored report category',
    );
  }
}