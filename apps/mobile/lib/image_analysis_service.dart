import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:google_generative_ai/google_generative_ai.dart';
import 'app_config.dart';

/// Strongly-typed model representing structured civic issue triage from Gemini AI
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
  static GenerativeModel? _model;
  
  static GenerativeModel get _geminiModel {
    final apiKey = AppConfig.geminiApiKey;
    _model ??= GenerativeModel(
      model: 'gemini-1.5-flash',
      apiKey: apiKey,
      generationConfig: GenerationConfig(
        responseMimeType: 'application/json',
        temperature: 0.1,
        topK: 30,
        topP: 0.9,
        maxOutputTokens: 1024,
      ),
      safetySettings: [
        SafetySetting(HarmCategory.harassment, HarmBlockThreshold.none),
        SafetySetting(HarmCategory.hateSpeech, HarmBlockThreshold.none),
        SafetySetting(HarmCategory.sexuallyExplicit, HarmBlockThreshold.none),
        SafetySetting(HarmCategory.dangerousContent, HarmBlockThreshold.none),
      ],
    );
    return _model!;
  }

  /// Full structured AI triage analysis with JSON enforcement from raw bytes
  static Future<AiTriageResult> analyzeImageBytes(Uint8List imageBytes, {String? description}) async {
    try {
      print('🔍 Starting structured Gemini AI Triage analysis...');
      final prompt = _buildStructuredPrompt(description);
      final content = [
        Content.multi([
          TextPart(prompt),
          DataPart('image/jpeg', imageBytes),
        ])
      ];

      String? rawResponse;
      for (int attempt = 1; attempt <= 3; attempt++) {
        try {
          final response = await _geminiModel.generateContent(content);
          if (response.text != null && response.text!.isNotEmpty) {
            rawResponse = response.text!;
            break;
          }
        } catch (e) {
          print('❌ Gemini attempt $attempt failed: $e');
          if (attempt == 3) rethrow;
          await Future.delayed(Duration(milliseconds: 500 * attempt));
        }
      }

      if (rawResponse == null) {
        throw Exception('Empty response from Gemini API');
      }

      print('🤖 Gemini Raw JSON Response: $rawResponse');

      // Strip markdown backticks if model wrapped JSON
      String cleanJson = rawResponse.trim();
      if (cleanJson.startsWith('```json')) {
        cleanJson = cleanJson.substring(7);
      }
      if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.substring(3);
      }
      if (cleanJson.endsWith('```')) {
        cleanJson = cleanJson.substring(0, cleanJson.length - 3);
      }
      cleanJson = cleanJson.trim();

      final decoded = jsonDecode(cleanJson) as Map<String, dynamic>;
      final result = AiTriageResult.fromJson(decoded);
      print('✅ AI Triage complete: Category=${result.category}, Severity=${result.severity}, Dept=${result.suggestedDepartment}');
      return result;
    } catch (e) {
      print('⚠️ Structured AI analysis encountered error: $e. Using intelligent fallback triage.');
      return _fallbackTriage(description);
    }
  }

  /// Full structured AI triage analysis with JSON enforcement
  static Future<AiTriageResult> analyzeImage(File imageFile, {String? description}) async {
    try {
      final Uint8List imageBytes = await imageFile.readAsBytes();
      return await analyzeImageBytes(imageBytes, description: description);
    } catch (e) {
      print('⚠️ Structured AI analysis encountered error reading file: $e. Using intelligent fallback triage.');
      return _fallbackTriage(description);
    }
  }

  /// Backward-compatible method returning severity string ('High', 'Medium', 'Low', 'Critical')
  static Future<String> analyzeImageForPriority(File imageFile, {String? description}) async {
    final result = await analyzeImage(imageFile, description: description);
    return result.severity;
  }

  static String _buildStructuredPrompt(String? description) {
    return '''
You are an expert Municipal Infrastructure and Civic Safety Triage AI for CivicResolve.
Analyze the provided image and description to categorize and prioritize the civic issue accurately.

Context / Citizen Description:
${description?.isNotEmpty == true ? description : 'No additional description provided.'}

Instructions:
1. Examine visual evidence for hazard level, structural risk, public health threat, or traffic disruption.
2. Accurately assign:
   - "category": One of ["Roads", "Waste", "Water", "Drainage", "Streetlights", "Public Safety", "Other"]
   - "severity": One of ["Critical", "High", "Medium", "Low"]
     - "Critical": Life-threatening hazards, open manholes, active fires, electrical shocks, bridge collapse.
     - "High": Major road blockages, severe water contamination, flooding, large garbage mounds near residential areas.
     - "Medium": Non-urgent potholes, broken street lights, missed trash pickup, minor leaks.
     - "Low": Faded road markings, aesthetic graffiti, minor roadside debris.
   - "suggested_department": Responsible municipal department.
   - "reasoning": 1-2 sentence concise explanation of findings.

Return ONLY a valid JSON object strictly matching this schema:
{
  "category": "Roads | Waste | Water | Drainage | Streetlights | Public Safety | Other",
  "severity": "Low | Medium | High | Critical",
  "suggested_department": "string",
  "reasoning": "string"
}
''';
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