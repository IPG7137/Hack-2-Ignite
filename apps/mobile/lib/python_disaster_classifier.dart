import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';

/// Service to integrate Python disaster classifier with Flutter app
class PythonDisasterClassifier {
  static const String _scriptPath = 'integrated_disaster_classifier.py';
  
  /// Classify disaster image using Python script
  /// Returns a map with classification results
  static Future<Map<String, dynamic>> classifyImage(String imagePath) async {
    if (kIsWeb) {
      return {
        'error': 'Python local execution is not supported in browser/Flutter Web environment',
        'priority': 'Medium',
        'success': false,
      };
    }

    try {
      // Ensure image file exists
      final imageFile = File(imagePath);
      if (!await imageFile.exists()) {
        return {
          'error': 'Image file not found: $imagePath',
          'priority': 'Medium',
          'success': false
        };
      }

      // Get the script path relative to the Flutter project
      final scriptFile = File(_scriptPath);
      String scriptFullPath;
      
      if (await scriptFile.exists()) {
        scriptFullPath = scriptFile.absolute.path;
      } else {
        // Try in project root
        final projectRoot = Directory.current;
        final rootScript = File('${projectRoot.path}/$_scriptPath');
        if (await rootScript.exists()) {
          scriptFullPath = rootScript.absolute.path;
        } else {
          return {
            'error': 'Python classifier script not found',
            'priority': 'Medium',
            'success': false
          };
        }
      }

      // Execute Python script
      final result = await Process.run(
        'python',
        [scriptFullPath, imagePath, '--format', 'json'],
        runInShell: true,
      );

      if (result.exitCode == 0) {
        try {
          final jsonResult = json.decode(result.stdout);
          jsonResult['success'] = true;
          
          // Log for debugging
          if (kDebugMode) {
            print('🐍 Python Classifier Result: $jsonResult');
          }
          
          return jsonResult;
        } catch (e) {
          return {
            'error': 'Failed to parse Python script output: $e',
            'priority': 'Medium',
            'success': false
          };
        }
      } else {
        return {
          'error': 'Python script execution failed: ${result.stderr}',
          'priority': 'Medium',
          'success': false
        };
      }
    } catch (e) {
      return {
        'error': 'Classification failed: $e',
        'priority': 'Medium',
        'success': false
      };
    }
  }

  /// Quick priority check - returns just the priority string
  static Future<String> getImagePriority(String imagePath) async {
    final result = await classifyImage(imagePath);
    return result['priority'] ?? 'Medium';
  }

  /// Enhanced classification that combines Python and Dart analysis
  static Future<Map<String, dynamic>> enhancedClassification(String imagePath) async {
    if (kIsWeb) {
      return {
        'error': 'Python classifier not available in web environment. Using intelligent client AI fallback.',
        'priority': 'Medium',
        'success': false,
      };
    }

    try {
      // Get Python classification
      final pythonResult = await classifyImage(imagePath);
      
      // Get filename for additional context
      final fileName = imagePath.split('/').last.toLowerCase();
      
      // Disaster keywords for additional validation
      final disasterKeywords = [
        'flood', 'fire', 'earthquake', 'storm', 'hurricane', 'tornado',
        'tsunami', 'landslide', 'avalanche', 'drought', 'explosion',
        'collapse', 'emergency', 'disaster', 'damage', 'destruction'
      ];
      
      // Check if filename suggests disaster
      bool filenameIndicatesDisaster = disasterKeywords.any(
        (keyword) => fileName.contains(keyword)
      );
      
      String finalPriority = pythonResult['priority'] ?? 'Medium';
      
      // Override LOW priority if filename suggests disaster
      if (finalPriority.toLowerCase() == 'low' && filenameIndicatesDisaster) {
        finalPriority = 'High';
        pythonResult['priority_override'] = 'Filename suggests disaster - elevated to High';
      }
      
      // Add enhanced metadata
      pythonResult['enhanced_analysis'] = true;
      pythonResult['filename_check'] = filenameIndicatesDisaster;
      pythonResult['final_priority'] = finalPriority;
      
      return pythonResult;
    } catch (e) {
      return {
        'error': 'Enhanced classification failed: $e',
        'priority': 'Medium',
        'success': false
      };
    }
  }

  /// Check if Python environment is ready
  static Future<bool> checkPythonEnvironment() async {
    if (kIsWeb) return false;
    try {
      final result = await Process.run('python', ['--version'], runInShell: true);
      return result.exitCode == 0;
    } catch (e) {
      if (kDebugMode) {
        print('Python check failed: $e');
      }
      return false;
    }
  }

  /// Install required Python packages
  static Future<bool> installPythonDependencies() async {
    if (kIsWeb) return false;
    try {
      final packages = ['google-generativeai', 'pillow'];
      
      for (String package in packages) {
        final result = await Process.run(
          'pip',
          ['install', package],
          runInShell: true,
        );
        
        if (result.exitCode != 0) {
          if (kDebugMode) {
            print('Failed to install $package: ${result.stderr}');
          }
          return false;
        }
      }
      
      return true;
    } catch (e) {
      if (kDebugMode) {
        print('Package installation failed: $e');
      }
      return false;
    }
  }
}