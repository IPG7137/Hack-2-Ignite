import 'dart:io';
import 'dart:typed_data';
import 'package:google_generative_ai/google_generative_ai.dart';

void main() async {
  print('🧪 Testing Gemini AI API Connection...');
  
  // API key from environment
  final String apiKey = Platform.environment['GEMINI_API_KEY'] ?? '';
  if (apiKey.isEmpty) {
    print('❌ GEMINI_API_KEY environment variable is required.');
    return;
  }
  
  try {
    // Initialize the model
    final model = GenerativeModel(
      model: 'gemini-1.5-flash',
      apiKey: apiKey,
      generationConfig: GenerationConfig(
        temperature: 0.2,
        topK: 1,
        topP: 0.9,
        maxOutputTokens: 100,
      ),
    );
    
    print('✅ Model initialized successfully');
    
    // Test with simple text-only prompt first
    print('🔍 Testing text-only prompt...');
    
    final textPrompt = 'Respond with exactly: "API CONNECTION SUCCESSFUL"';
    final textResponse = await model.generateContent([
      Content.text(textPrompt)
    ]).timeout(Duration(seconds: 10));
    
    print('📝 Text Response: ${textResponse.text}');
    
    // Test if we can use vision capabilities
    print('🖼️ Testing vision capabilities with sample data...');
    
    // Create a minimal test image (1x1 red pixel PNG)
    final testImageBytes = Uint8List.fromList([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 pixel
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, // RGB color
      0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, 0x54, // IDAT chunk
      0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01,
      0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82 // IEND
    ]);
    
    final imageData = DataPart('image/png', testImageBytes);
    final visionPrompt = 'What do you see in this image? Respond briefly.';
    
    final visionContent = [
      Content.multi([
        TextPart(visionPrompt),
        imageData,
      ])
    ];
    
    final visionResponse = await model.generateContent(visionContent)
        .timeout(Duration(seconds: 15));
    
    print('👁️ Vision Response: ${visionResponse.text}');
    
    print('✅ ALL TESTS PASSED - Gemini AI is working correctly!');
    
  } catch (e) {
    print('❌ ERROR: $e');
    print('🔧 This indicates an issue with:');
    print('   - API Key authentication');
    print('   - Network connectivity');
    print('   - Package configuration');
    print('   - Model access permissions');
  }
}