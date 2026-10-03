import 'package:flutter_test/flutter_test.dart';
import 'package:civic_resolve/multilingual_civic_engine.dart';
import 'package:civic_resolve/priority_engine.dart';
import 'package:civic_resolve/image_analysis_service.dart';

void main() {
  group('MultilingualCivicEngine - Core Language & Semantic Pipeline', () {
    test('1. Judge Test Case: Marathi pothole complaint with night-time hazard', () {
      const complaintText = 'रस्त्यावर मोठा खड्डा आहे, रात्री खूप धोकादायक आहे.';

      final analysis = MultilingualCivicEngine.analyzeCivicComplaint(complaintText);

      // 1. Language Detection
      expect(analysis.language, equals(CivicLanguage.marathi));
      expect(analysis.language.nativeName, equals('मराठी'));

      // 2. Extracted Category
      expect(analysis.canonicalCategoryId, equals('potholes_roads'));
      expect(analysis.categoryNameEn, equals('Roads & Potholes'));
      expect(analysis.categoryNameLocal, equals('रस्ते आणि खड्डे'));

      // 3. Issue Meaning
      expect(analysis.extractedIssue.contains('खड्डा'), isTrue);
      expect(analysis.extractedIssueEn.toLowerCase().contains('pothole'), isTrue);

      // 4. Safety Context & Urgency Extraction
      expect(analysis.hasSafetyHazard, isTrue);
      expect(analysis.safetyContext, isNotNull);
      expect(analysis.safetyContext!.contains('रात्री'), isTrue);
      expect(analysis.safetyContextEn!.toLowerCase().contains('night'), isTrue);

      // 5. Priority / SLA / Routing
      expect(analysis.priorityLevel, equals('High'));
      expect(analysis.priorityLabelLocal.contains('उच्च'), isTrue);
      expect(analysis.slaEstimate.contains('२४ तास'), isTrue);
      expect(analysis.routingDepartmentLocal.contains('सार्वजनिक बांधकाम'), isTrue);
      expect(analysis.routingDepartmentEn, equals('Roads & Infrastructure (PWD)'));

      // 6. Response generated in citizen language
      final response = analysis.localizedSummaryResponse;
      expect(response.contains('तक्रार विश्लेषण (मराठी)'), isTrue);
      expect(response.contains('रस्ते आणि खड्डे'), isTrue);
      expect(response.contains('सार्वजनिक बांधकाम विभाग'), isTrue);
    });

    test('2. Hindi Critical Complaint: Open manhole and sewage hazard', () {
      const complaintText = 'गटर का ढक्कन खुला है और सीवर का पानी बह रहा है, बहुत खतरनाक है';

      final analysis = MultilingualCivicEngine.analyzeCivicComplaint(complaintText);

      // Language & Category
      expect(analysis.language, equals(CivicLanguage.hindi));
      expect(analysis.canonicalCategoryId, equals('drainage_sewage'));
      expect(analysis.categoryNameLocal, equals('ड्रेनेज और सीवरेज'));

      // Safety & Priority
      expect(analysis.hasSafetyHazard, isTrue);
      expect(analysis.priorityLevel, isIn(['Critical', 'High']));
      expect(analysis.routingDepartmentEn, equals('Water Supply & Sewerage Board'));

      final response = analysis.localizedSummaryResponse;
      expect(response.contains('शिकायत विश्लेषण (हिंदी)'), isTrue);
    });

    test('3. Marathi Waste Management: Garbage accumulation & foul smell', () {
      const complaintText = 'कचऱ्याचा मोठा ढीग साचला आहे आणि तीव्र दुर्गंधी येत आहे';

      final analysis = MultilingualCivicEngine.analyzeCivicComplaint(complaintText);

      expect(analysis.language, equals(CivicLanguage.marathi));
      expect(analysis.canonicalCategoryId, equals('waste_management'));
      expect(analysis.categoryNameLocal, equals('घनकचरा व्यवस्थापन'));
      expect(analysis.routingDepartmentEn, equals('Solid Waste Management'));
      expect(analysis.extractedIssue.contains('कचऱ्याचा'), isTrue);
    });

    test('4. Hindi Life Safety: Broken live electric wire on street', () {
      const complaintText = 'सड़क पर बिजली का तार टूट कर गिरा है, करंट लग सकता है बहुत खतरनाक है';

      final analysis = MultilingualCivicEngine.analyzeCivicComplaint(complaintText);

      expect(analysis.language, equals(CivicLanguage.hindi));
      expect(analysis.canonicalCategoryId, equals('electricity_streetlights'));
      expect(analysis.hasSafetyHazard, isTrue);
      expect(analysis.priorityLevel, equals('Critical'));
      expect(analysis.routingDepartmentEn, equals('Electrical & Lighting Dept'));
    });

    test('5. English Standard Complaint Pass-through', () {
      const complaintText = 'Water pipe leakage near the central bus terminal';

      final analysis = MultilingualCivicEngine.analyzeCivicComplaint(complaintText);

      expect(analysis.language, equals(CivicLanguage.english));
      expect(analysis.canonicalCategoryId, equals('water_drainage'));
      expect(analysis.categoryNameEn, equals('Water Supply & Leaks'));
      expect(analysis.routingDepartmentEn, equals('Water Supply Board'));
    });
  });

  group('PriorityEngine & ImageAnalysisService Multilingual Triage Integration', () {
    test('PriorityEngine computes high public safety score for Marathi and Hindi hazards', () {
      final scoreMarathi = CivicPriorityEngine.calculatePublicSafetyScore(
        category: 'Roads & Potholes',
        title: 'खड्डा',
        description: 'रस्त्यावर मोठा खड्डा आहे, रात्री खूप धोकादायक आहे.',
      );

      expect(scoreMarathi, greaterThanOrEqualTo(65.0));

      final scoreHindi = CivicPriorityEngine.calculatePublicSafetyScore(
        category: 'Electricity',
        title: 'बिजली का तार',
        description: 'बिजली का तार टूट कर गिरा है, करंट का खतरा है',
      );

      expect(scoreHindi, equals(100.0));
    });

    test('ImageAnalysisService triage leverages MultilingualCivicEngine', () {
      final res = ImageAnalysisService.analyzeDescriptionForPriority(
        'रस्त्यावर मोठा खड्डा आहे, रात्री खूप धोकादायक आहे.',
      );

      expect(res['priority'], equals('High'));
      expect(res['language'], equals('mr'));
      expect(res['category'], equals('Roads & Potholes'));
    });
  });
}
