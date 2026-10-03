/// Supported languages in the Civic multilingual pipeline
enum CivicLanguage {
  marathi('mr', 'मराठी', 'Marathi'),
  hindi('hi', 'हिंदी', 'Hindi'),
  english('en', 'English', 'English');

  final String code;
  final String nativeName;
  final String englishName;

  const CivicLanguage(this.code, this.nativeName, this.englishName);

  static CivicLanguage fromCode(String? code) {
    if (code == null) return CivicLanguage.english;
    final lower = code.toLowerCase().trim();
    if (lower == 'mr' || lower.contains('marathi')) return CivicLanguage.marathi;
    if (lower == 'hi' || lower.contains('hindi')) return CivicLanguage.hindi;
    return CivicLanguage.english;
  }
}

/// Comprehensive civic semantic analysis result
class CivicSemanticAnalysis {
  final CivicLanguage language;
  final String originalText;
  final String translatedSummaryEn;
  final String canonicalCategoryId;
  final String categoryNameLocal;
  final String categoryNameEn;
  final String extractedIssue;
  final String extractedIssueEn;
  final bool hasSafetyHazard;
  final String? safetyContext;
  final String? safetyContextEn;
  final String priorityLevel; // 'Critical', 'High', 'Medium', 'Low'
  final String priorityLabelLocal;
  final String slaEstimate;
  final String routingDepartmentLocal;
  final String routingDepartmentEn;
  final double confidenceScore;

  const CivicSemanticAnalysis({
    required this.language,
    required this.originalText,
    required this.translatedSummaryEn,
    required this.canonicalCategoryId,
    required this.categoryNameLocal,
    required this.categoryNameEn,
    required this.extractedIssue,
    required this.extractedIssueEn,
    required this.hasSafetyHazard,
    this.safetyContext,
    this.safetyContextEn,
    required this.priorityLevel,
    required this.priorityLabelLocal,
    required this.slaEstimate,
    required this.routingDepartmentLocal,
    required this.routingDepartmentEn,
    this.confidenceScore = 0.95,
  });

  /// Citizen-facing structured summary in user's detected language
  String get localizedSummaryResponse {
    switch (language) {
      case CivicLanguage.marathi:
        return '🌐 **तक्रार विश्लेषण (मराठी):**\n'
            '• **वर्ग:** $categoryNameLocal\n'
            '• **समस्या:** $extractedIssue\n'
            '${hasSafetyHazard && safetyContext != null ? '• **सुरक्षितता संदर्भ:** $safetyContext\n' : ''}'
            '• **प्राधान्य:** $priorityLabelLocal (SLA: $slaEstimate)\n'
            '• **नियुक्त विभाग:** $routingDepartmentLocal';

      case CivicLanguage.hindi:
        return '🌐 **शिकायत विश्लेषण (हिंदी):**\n'
            '• **श्रेणी:** $categoryNameLocal\n'
            '• **समस्या:** $extractedIssue\n'
            '${hasSafetyHazard && safetyContext != null ? '• **सुरक्षा संदर्भ:** $safetyContext\n' : ''}'
            '• **प्राथमिकता:** $priorityLabelLocal (SLA: $slaEstimate)\n'
            '• **संबंधित विभाग:** $routingDepartmentLocal';

      case CivicLanguage.english:
        return '🌐 **Civic Analysis (English):**\n'
            '• **Category:** $categoryNameEn\n'
            '• **Issue:** $extractedIssueEn\n'
            '${hasSafetyHazard && safetyContextEn != null ? '• **Safety Context:** $safetyContextEn\n' : ''}'
            '• **Priority:** $priorityLevel (SLA: $slaEstimate)\n'
            '• **Assigned Dept:** $routingDepartmentEn';
    }
  }

  Map<String, dynamic> toJson() {
    return {
      'detected_language': language.code,
      'original_text': originalText,
      'translated_summary_en': translatedSummaryEn,
      'category_id': canonicalCategoryId,
      'category_name_local': categoryNameLocal,
      'category_name_en': categoryNameEn,
      'extracted_issue': extractedIssue,
      'extracted_issue_en': extractedIssueEn,
      'has_safety_hazard': hasSafetyHazard,
      'safety_context': safetyContext,
      'safety_context_en': safetyContextEn,
      'priority': priorityLevel,
      'priority_label_local': priorityLabelLocal,
      'sla_estimate': slaEstimate,
      'routing_department_local': routingDepartmentLocal,
      'routing_department_en': routingDepartmentEn,
      'confidence_score': confidenceScore,
    };
  }
}

/// Advanced Multilingual Civic Understanding & Triage Engine
class MultilingualCivicEngine {
  // Marathi specific markers
  static final RegExp _marathiMarkerRegex = RegExp(
    r'(आहे|आहेत|नाही|झाले|झाला|झाली|पडला|पडली|पडले|रस्त्यावर|खड्डा|खड्डे|पाणी|कचरा|कचऱ्याचे|कचऱ्याचा|'
    r'दुर्गंधी|दिवा|गटर|गटार|नाली|धोकादायक|रात्री|विजेचा|विजेची|खांब|इथे|मोठा|मोठे|लवकर|दुरुस्ती|त्रास|'
    r'माणसे|अपघात|शहरात|शाळेजवळ|दवाखाना|तुंबले|तुंबलेले|उघडे|उघडी|फुटली|गळती|अंधार|लाईट)',
    caseSensitive: false,
  );

  // Hindi specific markers
  static final RegExp _hindiMarkerRegex = RegExp(
    r'(है|हैं|नहीं|गया|गई|गए|हुआ|हुई|सड़क|गड्ढा|गड्ढे|पानी|कचरा|कूड़ा|कचरे|कूड़े|बदबू|दुर्गंध|'
    r'बत्ती|बिजली|खंभा|खंभे|नाला|नाली|खतरनाक|रात|यहाँ|बड़ा|बड़े|जल्दी|मरम्मत|परेशानी|लोग|दुर्घटना|'
    r'अस्पताल|स्कूल|खुला|खुली|फूटा|फूट|लीकेज|अंधेरा|लाइट|तार)',
    caseSensitive: false,
  );

  // Devanagari Unicode Block: \u0900-\u097F
  static final RegExp _devanagariRegex = RegExp(r'[\u0900-\u097F]');

  /// 1. Detect language from text
  static CivicLanguage detectLanguage(String text) {
    if (text.trim().isEmpty) return CivicLanguage.english;

    final devanagariCount = _devanagariRegex.allMatches(text).length;
    if (devanagariCount == 0) return CivicLanguage.english;

    int marathiMatches = _marathiMarkerRegex.allMatches(text).length;
    int hindiMatches = _hindiMarkerRegex.allMatches(text).length;

    // Special vocabulary markers
    if (text.contains('आहे') || text.contains('रस्त्यावर') || text.contains('खड्डा') ||
        text.contains('झाकण') || text.contains('धोकादायक') || text.contains('रात्री') ||
        text.contains('गटार') || text.contains('कचऱ्या')) {
      marathiMatches += 3;
    }

    if (text.contains('है') || text.contains('सड़क पर') || text.contains('गड्ढा') ||
        text.contains('ढक्कन') || text.contains('खतरनाक') || text.contains('कूड़ा')) {
      hindiMatches += 3;
    }

    if (marathiMatches >= hindiMatches && marathiMatches > 0) {
      return CivicLanguage.marathi;
    } else if (hindiMatches > 0) {
      return CivicLanguage.hindi;
    }

    // Default Devanagari to Marathi for Maharashtra / civic deployment
    return CivicLanguage.marathi;
  }

  /// 2. Deep Civic Semantic Understanding & Structured Extraction Pipeline
  static CivicSemanticAnalysis analyzeCivicComplaint(String text) {
    final rawText = text.trim();
    if (rawText.isEmpty) {
      return _emptyAnalysis();
    }

    final language = detectLanguage(rawText);
    final lowerText = rawText.toLowerCase();

    // Semantic Variables
    String categoryId = 'potholes_roads';
    String categoryNameLocal = 'रस्ते आणि खड्डे';
    String categoryNameEn = 'Roads & Potholes';
    String issueLocal = 'रस्त्यावरील समस्या';
    String issueEn = 'Road & surface defect';
    String routingDeptLocal = 'सार्वजनिक बांधकाम विभाग (PWD)';
    String routingDeptEn = 'Roads & Infrastructure (PWD)';
    String translationEn = rawText;

    bool hasSafetyHazard = false;
    String? safetyContextLocal;
    String? safetyContextEn;
    String priority = 'Medium';
    String priorityLabelLocal = 'मध्यम (Medium)';
    String slaEstimate = '४८ ते ७२ तास';

    // -------------------------------------------------------------
    // Category & Issue Identification
    // -------------------------------------------------------------

    // Check Electricity & Streetlights
    final bool isElectricity = _matchesAny(lowerText, [
      'लाईट', 'दिवा', 'विजेचा खांब', 'विजेची तार', 'विद्युत', 'अंधार', 'स्ट्रीट लाईट', 'स्पार्किंग', 'शॉर्ट सर्किट', 'करंट',
      'लाइट', 'बत्ती', 'बिजली का खंभा', 'बिजली का तार', 'बिजली', 'अंधेरा', 'स्ट्रीट लाइट', 'करंट', 'तार',
      'light', 'streetlight', 'lamp post', 'electric wire', 'darkness', 'power outage', 'sparking', 'live wire', 'wire'
    ]);

    // Check Drainage & Sewage
    final bool isDrainage = _matchesAny(lowerText, [
      'गटर', 'गटार', 'नाली', 'ड्रेनेज', 'झाकण', 'मॅनहोल', 'सांडपाणी', 'तुंबले', 'तुंबलेले',
      'नाला', 'सीवर', 'गंदा पानी', 'उफनता', 'मैनहोल', 'ढक्कन खुला',
      'drain', 'drainage', 'sewage', 'manhole', 'open manhole', 'gutter', 'sewer'
    ]);

    // Check Waste & Garbage
    final bool isWaste = _matchesAny(lowerText, [
      'कचरा', 'कचऱ्याचे', 'कचऱ्याचा', 'कचराकुंडी', 'उकिरडा', 'दुर्गंधी', 'घाण', 'सडलेला',
      'कूड़ा', 'कचरे', 'कूड़ेदान', 'बदबू', 'दुर्गंध', 'गंदगी',
      'garbage', 'waste', 'trash', 'dump', 'foul smell', 'stink', 'debris', 'litter'
    ]);

    // Check Water Supply
    final bool isWater = _matchesAny(lowerText, [
      'नळ', 'पाईपलाईन', 'पाईप', 'पाणीपुरवठा', 'पिण्याचे पाणी', 'गळती', 'कमी दाब', 'दूषित पाणी',
      'नल', 'पाइपलाइन', 'पाइप फूटा', 'जलापूर्ति', 'लीकेज', 'पीने का पानी',
      'tap', 'pipeline', 'pipe burst', 'water supply', 'pipe leak', 'drinking water'
    ]);

    // Check Fallen Trees & Parks
    final bool isTree = _matchesAny(lowerText, [
      'झाड पडले', 'झाडाची फांदी', 'झाडे', 'उद्यान', 'बगीचा',
      'पेड़ गिरा', 'पेड़ की डाली', 'पार्क', 'बगीचा',
      'fallen tree', 'tree branch', 'park', 'garden', 'broken tree'
    ]);

    // Check Specific Potholes & Road Damage (distinct from generic "on road" location phrase)
    final bool isRoad = _matchesAny(lowerText, [
      'खड्डा', 'खड्डे', 'डांबर', 'फूटपाथ', 'पादचारी मार्ग', 'उखडला', 'पॉथोल', 'रस्ता खराब',
      'गड्ढा', 'गड्ढे', 'डामर', 'फुटपाथ', 'टूटी सड़क', 'सड़क खराब',
      'pothole', 'potholes', 'asphalt', 'crater', 'footpath', 'tarmac', 'pavement', 'broken road'
    ]) || (_matchesAny(lowerText, ['रस्ता', 'रस्त्यावर', 'सड़क', 'road']) && !isElectricity && !isDrainage && !isWaste && !isWater && !isTree);

    // Assign Category & Routing based on specific defect priority
    if (isElectricity) {
      categoryId = 'electricity_streetlights';
      categoryNameLocal = language == CivicLanguage.marathi ? 'विद्युत व पथदिवे' : language == CivicLanguage.hindi ? 'बिजली व स्ट्रीट लाइट' : 'Electricity & Streetlights';
      categoryNameEn = 'Electricity & Streetlights';
      routingDeptLocal = language == CivicLanguage.marathi ? 'विद्युत व प्रकाश विभाग' : language == CivicLanguage.hindi ? 'विद्युत एवं प्रकाश विभाग' : 'Electrical & Lighting Dept';
      routingDeptEn = 'Electrical & Lighting Dept';

      if (_matchesAny(lowerText, ['तार', 'विजेची तार', 'स्पार्किंग', 'करंट', 'wire', 'live wire', 'sparking', 'शॉक', 'झटका'])) {
        issueLocal = language == CivicLanguage.marathi ? 'तुटलेली विजेची तार / स्पार्किंग' : language == CivicLanguage.hindi ? 'टूटा हुआ बिजली का तार / करंट का खतरा' : 'Broken live electric wire / sparking';
        issueEn = 'Broken live electric wire / sparking';
        translationEn = 'Broken electrical wire hanging down posing severe electrocution hazard.';
      } else {
        issueLocal = language == CivicLanguage.marathi ? 'बंद पथदिवे / अंधार' : language == CivicLanguage.hindi ? 'खराब स्ट्रीट लाइट / अंधेरा' : 'Non-functional streetlights';
        issueEn = 'Non-functional streetlights';
        translationEn = 'Streetlights are not functioning, causing complete darkness on the road.';
      }
    } else if (isDrainage) {
      categoryId = 'drainage_sewage';
      categoryNameLocal = language == CivicLanguage.marathi ? 'ड्रेनेज आणि सांडपाणी' : language == CivicLanguage.hindi ? 'ड्रेनेज और सीवरेज' : 'Drainage & Sewage';
      categoryNameEn = 'Drainage & Sewage';
      routingDeptLocal = language == CivicLanguage.marathi ? 'जलनिःसारण व सांडपाणी विभाग' : language == CivicLanguage.hindi ? 'जल निकासी एवं सीवरेज विभाग' : 'Water Supply & Sewerage Board';
      routingDeptEn = 'Water Supply & Sewerage Board';

      if (_matchesAny(lowerText, ['झाकण उघडे', 'ढक्कन खुला', 'open manhole', 'मॅनहोल', 'मैनहोल'])) {
        issueLocal = language == CivicLanguage.marathi ? 'उघडे गटाराचे झाकण / मॅनहोल' : language == CivicLanguage.hindi ? 'खुला हुआ मैनहोल / गटर का ढक्कन' : 'Open manhole / missing drain cover';
        issueEn = 'Open manhole / missing drain cover';
        translationEn = 'Open manhole chamber without cover posing severe danger to pedestrians and motorists.';
      } else {
        issueLocal = language == CivicLanguage.marathi ? 'गटार तुंबणे व सांडपाणी गळती' : language == CivicLanguage.hindi ? 'नाली जाम व सीवर ओवरफ्लो' : 'Blocked drain & sewage overflow';
        issueEn = 'Blocked drain & sewage overflow';
        translationEn = 'Drainage is blocked and dirty sewage water is overflowing onto the street.';
      }
    } else if (isWaste) {
      categoryId = 'waste_management';
      categoryNameLocal = language == CivicLanguage.marathi ? 'घनकचरा व्यवस्थापन' : language == CivicLanguage.hindi ? 'ठोस अपशिष्ट प्रबंधन' : 'Garbage & Sanitation';
      categoryNameEn = 'Garbage & Sanitation';
      routingDeptLocal = language == CivicLanguage.marathi ? 'घनकचरा व्यवस्थापन विभाग' : language == CivicLanguage.hindi ? 'ठोस अपशिष्ट प्रबंधन विभाग' : 'Solid Waste Management';
      routingDeptEn = 'Solid Waste Management';
      issueLocal = language == CivicLanguage.marathi ? 'कचऱ्याचा ढीग व तीव्र दुर्गंधी' : language == CivicLanguage.hindi ? 'कचरे का ढेर व तीव्र बदबू' : 'Garbage dump & foul odor';
      issueEn = 'Garbage accumulation & foul odor';
      translationEn = 'Uncollected garbage accumulation creating unhygienic conditions and foul odor.';
    } else if (isWater) {
      categoryId = 'water_drainage';
      categoryNameLocal = language == CivicLanguage.marathi ? 'पाणीपुरवठा व गळती' : language == CivicLanguage.hindi ? 'जलापूर्ति एवं लीकेज' : 'Water Supply & Leaks';
      categoryNameEn = 'Water Supply & Leaks';
      routingDeptLocal = language == CivicLanguage.marathi ? 'पाणी पुरवठा विभाग' : language == CivicLanguage.hindi ? 'जल आपूर्ति विभाग' : 'Water Supply Board';
      routingDeptEn = 'Water Supply Board';
      issueLocal = language == CivicLanguage.marathi ? 'पाईपलाईन फुटणे / पाणी गळती' : language == CivicLanguage.hindi ? 'पाइपलाइन लीकेज / जल बर्बादी' : 'Pipeline leakage / water waste';
      issueEn = 'Pipeline leakage / water waste';
      translationEn = 'Drinking water pipeline burst causing clean water wastage on public road.';
    } else if (isTree) {
      categoryId = 'parks_trees';
      categoryNameLocal = language == CivicLanguage.marathi ? 'उद्याने व पडलेली झाडे' : language == CivicLanguage.hindi ? 'पार्क एवं गिरे हुए पेड़' : 'Parks & Fallen Trees';
      categoryNameEn = 'Parks & Fallen Trees';
      routingDeptLocal = language == CivicLanguage.marathi ? 'उद्यान व वृक्ष प्राधिकरण' : language == CivicLanguage.hindi ? 'उद्यान एवं वृक्ष प्राधिकरण' : 'Horticulture & Tree Authority';
      routingDeptEn = 'Horticulture & Tree Authority';
      issueLocal = language == CivicLanguage.marathi ? 'रस्त्यावर पडलेले झाड / तुटलेली फांदी' : language == CivicLanguage.hindi ? 'सड़क पर गिरा हुआ पेड़ / टूटी डाली' : 'Fallen tree blocking path';
      issueEn = 'Fallen tree blocking path';
      translationEn = 'Fallen tree branch blocking traffic and pedestrian movement.';
    } else if (isRoad) {
      categoryId = 'potholes_roads';
      categoryNameLocal = language == CivicLanguage.marathi ? 'रस्ते आणि खड्डे' : language == CivicLanguage.hindi ? 'सड़क और गड्ढे' : 'Roads & Potholes';
      categoryNameEn = 'Roads & Potholes';
      routingDeptLocal = language == CivicLanguage.marathi ? 'सार्वजनिक बांधकाम विभाग (PWD)' : language == CivicLanguage.hindi ? 'लोक निर्माण विभाग (PWD)' : 'Roads & Infrastructure (PWD)';
      routingDeptEn = 'Roads & Infrastructure (PWD)';

      if (_matchesAny(lowerText, ['मोठा खड्डा', 'मोठे खड्डे', 'बड़ा गड्ढा', 'deep crater', 'large pothole', 'खूप खोल'])) {
        issueLocal = language == CivicLanguage.marathi ? 'रस्त्यावर मोठा खोल खड्डा' : language == CivicLanguage.hindi ? 'सड़क पर बड़ा गहरा गड्ढा' : 'Large deep pothole on roadway';
        issueEn = 'Large deep pothole on roadway';
        translationEn = 'There is a large pothole on the road creating dangerous traffic conditions.';
      } else {
        issueLocal = language == CivicLanguage.marathi ? 'रस्त्याची दुरावस्था / खड्डे' : language == CivicLanguage.hindi ? 'सड़क की खराबी / गड्ढे' : 'Road damage and surface potholes';
        issueEn = 'Road damage and surface potholes';
        translationEn = 'Road surface damage and potholes reported.';
      }
    } else if (isDrainage) {
      categoryId = 'drainage_sewage';
      categoryNameLocal = language == CivicLanguage.marathi ? 'ड्रेनेज आणि सांडपाणी' : language == CivicLanguage.hindi ? 'ड्रेनेज और सीवरेज' : 'Drainage & Sewage';
      categoryNameEn = 'Drainage & Sewage';
      routingDeptLocal = language == CivicLanguage.marathi ? 'जलनिःसारण व सांडपाणी विभाग' : language == CivicLanguage.hindi ? 'जल निकासी एवं सीवरेज विभाग' : 'Water Supply & Sewerage Board';
      routingDeptEn = 'Water Supply & Sewerage Board';

      if (_matchesAny(lowerText, ['झाकण उघडे', 'ढक्कन खुला', 'open manhole', 'मॅनहोल', 'मैनहोल'])) {
        issueLocal = language == CivicLanguage.marathi ? 'उघडे गटाराचे झाकण / मॅनहोल' : language == CivicLanguage.hindi ? 'खुला हुआ मैनहोल / गटर का ढक्कन' : 'Open manhole / missing drain cover';
        issueEn = 'Open manhole / missing drain cover';
        translationEn = 'Open manhole chamber without cover posing severe danger to pedestrians and motorists.';
      } else {
        issueLocal = language == CivicLanguage.marathi ? 'गटार तुंबणे व सांडपाणी गळती' : language == CivicLanguage.hindi ? 'नाली जाम व सीवर ओवरफ्लो' : 'Blocked drain & sewage overflow';
        issueEn = 'Blocked drain & sewage overflow';
        translationEn = 'Drainage is blocked and dirty sewage water is overflowing onto the street.';
      }
    } else if (isWaste) {
      categoryId = 'waste_management';
      categoryNameLocal = language == CivicLanguage.marathi ? 'घनकचरा व्यवस्थापन' : language == CivicLanguage.hindi ? 'ठोस अपशिष्ट प्रबंधन' : 'Garbage & Sanitation';
      categoryNameEn = 'Garbage & Sanitation';
      routingDeptLocal = language == CivicLanguage.marathi ? 'घनकचरा व्यवस्थापन विभाग' : language == CivicLanguage.hindi ? 'ठोस अपशिष्ट प्रबंधन विभाग' : 'Solid Waste Management';
      routingDeptEn = 'Solid Waste Management';
      issueLocal = language == CivicLanguage.marathi ? 'कचऱ्याचा ढीग व तीव्र दुर्गंधी' : language == CivicLanguage.hindi ? 'कचरे का ढेर व तीव्र बदबू' : 'Garbage dump & foul odor';
      issueEn = 'Garbage accumulation & foul odor';
      translationEn = 'Uncollected garbage accumulation creating unhygienic conditions and foul odor.';
    } else if (isElectricity) {
      categoryId = 'electricity_streetlights';
      categoryNameLocal = language == CivicLanguage.marathi ? 'विद्युत व पथदिवे' : language == CivicLanguage.hindi ? 'बिजली व स्ट्रीट लाइट' : 'Electricity & Streetlights';
      categoryNameEn = 'Electricity & Streetlights';
      routingDeptLocal = language == CivicLanguage.marathi ? 'विद्युत व प्रकाश विभाग' : language == CivicLanguage.hindi ? 'विद्युत एवं प्रकाश विभाग' : 'Electrical & Lighting Dept';
      routingDeptEn = 'Electrical & Lighting Dept';

      if (_matchesAny(lowerText, ['तार', 'विजेची तार', 'स्पार्किंग', 'करंट', 'wire', 'live wire', 'sparking', 'शॉक'])) {
        issueLocal = language == CivicLanguage.marathi ? 'तुटलेली विजेची तार / स्पार्किंग' : language == CivicLanguage.hindi ? 'टूटा हुआ बिजली का तार / स्पार्किंग' : 'Broken live electric wire / sparking';
        issueEn = 'Broken live electric wire / sparking';
        translationEn = 'Broken electrical wire hanging down posing severe electrocution hazard.';
      } else {
        issueLocal = language == CivicLanguage.marathi ? 'बंद पथदिवे / अंधार' : language == CivicLanguage.hindi ? 'खराब स्ट्रीट लाइट / अंधेरा' : 'Non-functional streetlights';
        issueEn = 'Non-functional streetlights';
        translationEn = 'Streetlights are not functioning, causing complete darkness on the road.';
      }
    } else if (isWater) {
      categoryId = 'water_drainage';
      categoryNameLocal = language == CivicLanguage.marathi ? 'पाणीपुरवठा व गळती' : language == CivicLanguage.hindi ? 'जलापूर्ति एवं लीकेज' : 'Water Supply & Leaks';
      categoryNameEn = 'Water Supply & Leaks';
      routingDeptLocal = language == CivicLanguage.marathi ? 'पाणी पुरवठा विभाग' : language == CivicLanguage.hindi ? 'जल आपूर्ति विभाग' : 'Water Supply Board';
      routingDeptEn = 'Water Supply Board';
      issueLocal = language == CivicLanguage.marathi ? 'पाईपलाईन फुटणे / पाणी गळती' : language == CivicLanguage.hindi ? 'पाइपलाइन लीकेज / जल बर्बादी' : 'Pipeline leakage / water waste';
      issueEn = 'Pipeline leakage / water waste';
      translationEn = 'Drinking water pipeline burst causing clean water wastage on public road.';
    } else if (isTree) {
      categoryId = 'parks_trees';
      categoryNameLocal = language == CivicLanguage.marathi ? 'उद्याने व पडलेली झाडे' : language == CivicLanguage.hindi ? 'पार्क एवं गिरे हुए पेड़' : 'Parks & Fallen Trees';
      categoryNameEn = 'Parks & Fallen Trees';
      routingDeptLocal = language == CivicLanguage.marathi ? 'उद्यान व वृक्ष प्राधिकरण' : language == CivicLanguage.hindi ? 'उद्यान एवं वृक्ष प्राधिकरण' : 'Horticulture & Tree Authority';
      routingDeptEn = 'Horticulture & Tree Authority';
      issueLocal = language == CivicLanguage.marathi ? 'रस्त्यावर पडलेले झाड / तुटलेली फांदी' : language == CivicLanguage.hindi ? 'सड़क पर गिरा हुआ पेड़ / टूटी डाली' : 'Fallen tree blocking path';
      issueEn = 'Fallen tree blocking path';
      translationEn = 'Fallen tree branch blocking traffic and pedestrian movement.';
    } else {
      categoryId = 'safety_hazard';
      categoryNameLocal = language == CivicLanguage.marathi ? 'सार्वजनिक सुरक्षितता' : language == CivicLanguage.hindi ? 'सार्वजनिक सुरक्षा' : 'Public Safety Hazards';
      categoryNameEn = 'Public Safety Hazards';
      routingDeptLocal = language == CivicLanguage.marathi ? 'नागरी प्रशासन व आपत्ती विभाग' : language == CivicLanguage.hindi ? 'नागरिक प्रशासन एवं आपदा विभाग' : 'Municipal Administration';
      routingDeptEn = 'Municipal Administration';
      issueLocal = language == CivicLanguage.marathi ? 'सार्वजनिक नागरी समस्या' : language == CivicLanguage.hindi ? 'सार्वजनिक नागरिक समस्या' : 'Civic grievance';
      issueEn = 'Civic grievance';
      translationEn = rawText;
    }

    // -------------------------------------------------------------
    // Safety Context & Urgency Detection
    // -------------------------------------------------------------

    final bool isNightHazard = _matchesAny(lowerText, [
      'रात्री', 'रात्रीचा', 'रात्र', 'अंधारात', 'रात', 'रात में', 'अंधेरा', 'night', 'night-time', 'dark', 'darkness'
    ]);

    final bool isDangerWord = _matchesAny(lowerText, [
      'धोकादायक', 'धोका', 'अपघात', 'जीवघेणा', 'खतरनाक', 'खतरा', 'दुर्घटना', 'जानलेवा', 'accident', 'danger', 'hazard', 'fatal', 'risk'
    ]);

    final bool isCriticalLifeSafety = _matchesAny(lowerText, [
      'विजेची तार', 'शॉक', 'करंट', 'आग', 'धूर', 'झाकण उघडे', 'मॅनहोल', 'गटर उघडे',
      'बिजली का तार', 'झटका', 'आग', 'धुआं', 'ढक्कन खुला', 'मैनहोल',
      'live wire', 'electrocution', 'fire', 'smoke', 'open manhole', 'submerged'
    ]);

    if (isCriticalLifeSafety) {
      hasSafetyHazard = true;
      safetyContextLocal = language == CivicLanguage.marathi
          ? '🚨 तातडीचा धोका: थेट जीवितहानी किंवा दुर्घटनेची शक्यता'
          : language == CivicLanguage.hindi
              ? '🚨 आपातकालीन खतरा: जान-माल का सीधा जोखिम'
              : '🚨 Critical Safety Alert: Direct life hazard or major accident risk';
      safetyContextEn = 'Critical Safety Alert: Direct life hazard or major accident risk';
      priority = 'Critical';
      priorityLabelLocal = language == CivicLanguage.marathi ? 'अति तातडीचे (Critical)' : language == CivicLanguage.hindi ? 'अति महत्वपूर्ण (Critical)' : 'Critical Priority';
      slaEstimate = language == CivicLanguage.marathi ? '४ ते ६ तास' : language == CivicLanguage.hindi ? '४ से ६ घंटे' : '4 to 6 Hours';
    } else if (isNightHazard || isDangerWord) {
      hasSafetyHazard = true;
      safetyContextLocal = language == CivicLanguage.marathi
          ? '⚠️ रात्रीचा गंभीर धोका / अपघाताची शक्यता (Night-time hazard)'
          : language == CivicLanguage.hindi
              ? '⚠️ रात में गंभीर खतरा / दुर्घटना की संभावना (Night-time hazard)'
              : '⚠️ Night-time hazard: Poor visibility and high collision risk';
      safetyContextEn = 'Night-time hazard: Poor visibility and high collision risk';
      priority = 'High';
      priorityLabelLocal = language == CivicLanguage.marathi ? 'उच्च प्राधान्य (High Priority)' : language == CivicLanguage.hindi ? 'उच्च प्राथमिकता (High Priority)' : 'High Priority';
      slaEstimate = language == CivicLanguage.marathi ? '२४ तास' : language == CivicLanguage.hindi ? '२४ घंटे' : '24 Hours';
    } else {
      // Standard Triage Priority
      if (categoryId == 'drainage_sewage' || categoryId == 'water_drainage') {
        priority = 'High';
        priorityLabelLocal = language == CivicLanguage.marathi ? 'उच्च (High)' : language == CivicLanguage.hindi ? 'उच्च (High)' : 'High Priority';
        slaEstimate = language == CivicLanguage.marathi ? '२४ ते ४८ तास' : language == CivicLanguage.hindi ? '२४ से ४८ घंटे' : '24 to 48 Hours';
      } else {
        priority = 'Medium';
        priorityLabelLocal = language == CivicLanguage.marathi ? 'मध्यम (Medium)' : language == CivicLanguage.hindi ? 'मध्यम (Medium)' : 'Medium Priority';
        slaEstimate = language == CivicLanguage.marathi ? '४८ ते ७२ तास' : language == CivicLanguage.hindi ? '४८ से ७२ घंटे' : '48 to 72 Hours';
      }
    }

    return CivicSemanticAnalysis(
      language: language,
      originalText: rawText,
      translatedSummaryEn: translationEn,
      canonicalCategoryId: categoryId,
      categoryNameLocal: categoryNameLocal,
      categoryNameEn: categoryNameEn,
      extractedIssue: issueLocal,
      extractedIssueEn: issueEn,
      hasSafetyHazard: hasSafetyHazard,
      safetyContext: safetyContextLocal,
      safetyContextEn: safetyContextEn,
      priorityLevel: priority,
      priorityLabelLocal: priorityLabelLocal,
      slaEstimate: slaEstimate,
      routingDepartmentLocal: routingDeptLocal,
      routingDepartmentEn: routingDeptEn,
      confidenceScore: 0.96,
    );
  }

  static bool _matchesAny(String text, List<String> keywords) {
    for (final kw in keywords) {
      if (text.contains(kw.toLowerCase())) return true;
    }
    return false;
  }

  static CivicSemanticAnalysis _emptyAnalysis() {
    return const CivicSemanticAnalysis(
      language: CivicLanguage.english,
      originalText: '',
      translatedSummaryEn: '',
      canonicalCategoryId: 'potholes_roads',
      categoryNameLocal: 'Roads & Potholes',
      categoryNameEn: 'Roads & Potholes',
      extractedIssue: 'Civic Issue',
      extractedIssueEn: 'Civic Issue',
      hasSafetyHazard: false,
      priorityLevel: 'Medium',
      priorityLabelLocal: 'Medium',
      slaEstimate: '48 Hours',
      routingDepartmentLocal: 'Municipal Administration',
      routingDepartmentEn: 'Municipal Administration',
      confidenceScore: 0.5,
    );
  }
}
