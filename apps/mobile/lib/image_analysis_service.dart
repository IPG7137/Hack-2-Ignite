import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Strongly-typed model representing structured civic issue triage from CivicResolve AI
class AiTriageResult {
  final String category;
  final String severity; // Low, Medium, High, Critical
  final String suggestedDepartment;
  final String reasoning;
  final bool isSuccessful;

  const AiTriageResult({
    required this.category,
    required this.severity,
    required this.suggestedDepartment,
    required this.reasoning,
    this.isSuccessful = true,
  });

  factory AiTriageResult.fromJson(Map<String, dynamic> json) {
    return AiTriageResult(
      category: json['category']?.toString() ?? 'Other',
      severity: _normalizeSeverity(json['severity']?.toString() ?? 'Medium'),
      suggestedDepartment: json['suggested_department']?.toString() ??
          json['suggestedDepartment']?.toString() ??
          'Municipal Administration',
      reasoning: json['reasoning']?.toString() ?? 'Analyzed via Civic AI Triage Engine.',
      isSuccessful: true,
    );
  }

  factory AiTriageResult.fallback({String? category, String? severity, String? reasoning}) {
    return AiTriageResult(
      category: category ?? 'Other',
      severity: severity ?? 'Medium',
      suggestedDepartment: _inferDepartment(category ?? 'Other'),
      reasoning: reasoning ?? 'Standard automated assessment based on category and submission parameters.',
      isSuccessful: false,
    );
  }

  static String _normalizeSeverity(String raw) {
    final lower = raw.trim().toLowerCase();
    if (lower.contains('critical')) return 'Critical';
    if (lower.contains('high')) return 'High';
    if (lower.contains('medium')) return 'Medium';
    if (lower.contains('low')) return 'Low';
    return 'Medium';
  }

  static String _inferDepartment(String category) {
    switch (category.toLowerCase()) {
      case 'roads':
      case 'potholes_roads':
        return 'Roads & Infrastructure (PWD)';
      case 'waste':
      case 'waste_management':
        return 'Solid Waste Management';
      case 'water':
      case 'drainage':
      case 'water_sewage':
        return 'Water Supply & Sewerage Board';
      case 'streetlights':
      case 'electricity_streetlights':
        return 'Electrical & Lighting Dept';
      case 'public safety':
      case 'public_safety':
        return 'Public Safety & Emergency Services';
      default:
        return 'Municipal General Administration';
    }
  }

  Map<String, dynamic> toJson() {
    return {
      'category': category,
      'severity': severity,
      'suggested_department': suggestedDepartment,
      'reasoning': reasoning,
      'is_successful': isSuccessful,
    };
  }
}

class ImageAnalysisService {
  /// Full structured AI triage analysis routed through authenticated Supabase Edge Function.
  /// Security Enforcement: Gemini API key exists ONLY on the backend server / Supabase secrets.
  /// Zero Gemini API keys are bundled or stored in the mobile client.
  static Future<AiTriageResult> analyzeImageBytes(Uint8List imageBytes, {String? description}) async {
    try {
      debugPrint('🔍 Invoking secure server-side AI triage via Supabase Edge Function...');

      final client = Supabase.instance.client;
      final session = client.auth.currentSession;

      // Invoke server-side 'ai-triage' function with user auth credentials
      final response = await client.functions.invoke(
        'ai-triage',
        headers: session != null
            ? {'Authorization': 'Bearer ${session.accessToken}'}
            : null,
        body: {
          'description': description ?? '',
          'image_base64': base64Encode(imageBytes),
          'mime_type': 'image/jpeg',
        },
      );

      if (response.status == 200 && response.data != null) {
        final data = response.data;
        final triagePayload = data is Map<String, dynamic> ? (data['data'] ?? data) : null;
        if (triagePayload is Map<String, dynamic>) {
          final result = AiTriageResult.fromJson(triagePayload);
          debugPrint('✅ Server AI Triage successful: Category=${result.category}, Severity=${result.severity}');
          return result;
        }
      }
    } catch (e) {
      debugPrint('ℹ️ Server-side AI triage unavailable ($e), falling back to deterministic triage.');
    }

    // Deterministic rule-based fallback when offline or during headless tests
    return _fallbackTriage(description);
  }

  /// Full structured AI triage analysis with JSON enforcement
  static Future<AiTriageResult> analyzeImage(File imageFile, {String? description}) async {
    try {
      final Uint8List imageBytes = await imageFile.readAsBytes();
      return await analyzeImageBytes(imageBytes, description: description);
    } catch (e) {
      debugPrint('⚠️ Error reading image file for analysis: $e. Using fallback triage.');
      return _fallbackTriage(description);
    }
  }

  /// Backward-compatible method returning severity string ('High', 'Medium', 'Low', 'Critical')
  static Future<String> analyzeImageForPriority(File imageFile, {String? description}) async {
    final result = await analyzeImage(imageFile, description: description);
    return result.severity;
  }

  static AiTriageResult _fallbackTriage(String? description) {
    if (description == null || description.isEmpty) {
      return AiTriageResult.fallback(
        category: 'Other',
        severity: 'Medium',
        reasoning: 'Standard assessment applied pending manual review.',
      );
    }

    final lower = description.toLowerCase();
    
    // Critical & High checks (exact semantic context)
    if (lower.contains('fire') || lower.contains('smoke') || lower.contains('explosion') ||
        lower.contains('flood') || lower.contains('submerged') || lower.contains('collapsed') ||
        lower.contains('sparking wire') || lower.contains('open manhole')) {
      return AiTriageResult.fallback(
        category: lower.contains('wire') ? 'Streetlights' : lower.contains('water') || lower.contains('flood') ? 'Water' : 'Public Safety',
        severity: 'High',
        reasoning: 'High priority assigned due to urgent civic safety keywords in description.',
      );
    }

    if (lower.contains('garbage') || lower.contains('waste') || lower.contains('trash') || lower.contains('dump')) {
      return AiTriageResult.fallback(
        category: 'Waste',
        severity: 'Medium',
        reasoning: 'Waste management issue identified from report description.',
      );
    }

    if (lower.contains('pothole') || lower.contains('road') || lower.contains('tar') || lower.contains('asphalt')) {
      return AiTriageResult.fallback(
        category: 'Roads',
        severity: 'Medium',
        reasoning: 'Road and infrastructure maintenance issue identified.',
      );
    }

    return AiTriageResult.fallback(
      category: 'Other',
      severity: 'Medium',
      reasoning: 'Automated keyword triage performed.',
    );
  }

  static Map<String, String> analyzeDescriptionForPriority(String description) {
    final triage = _fallbackTriage(description);
    return {
      'priority': triage.severity,
      'explanation': triage.reasoning,
    };
  }

  static Color getPriorityColor(String priority) {
    switch (priority.toLowerCase()) {
      case 'critical':
        return const Color(0xFFDC2626);
      case 'high':
        return const Color(0xFFEF4444);
      case 'medium':
        return const Color(0xFFF59E0B);
      case 'low':
        return const Color(0xFF10B981);
      default:
        return const Color(0xFF6B7280);
    }
  }

  static String getPriorityExplanation(String priority) {
    switch (priority.toLowerCase()) {
      case 'critical':
        return 'Critical Priority: Immediate intervention required. Poses direct risk to human safety or critical infrastructure.';
      case 'high':
        return 'High Priority: Urgent issue requiring rapid response. Causes significant public hazard or service interruption.';
      case 'medium':
        return 'Medium Priority: Standard municipal issue scheduled for regular resolution workflow.';
      case 'low':
        return 'Low Priority: Minor maintenance or cosmetic repair with no immediate safety hazard.';
      default:
        return 'Priority assessment pending verification.';
    }
  }
}