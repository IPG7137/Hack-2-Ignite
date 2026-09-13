import 'package:flutter/material.dart';
import 'dart:io';
import 'dart:async';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:image_picker/image_picker.dart';
import 'package:geolocator/geolocator.dart';
import 'package:geocoding/geocoding.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'language_service.dart';
import 'category_selection_screen.dart';
import 'confirmation_screen.dart';
import 'image_analysis_service.dart';
import 'python_disaster_classifier.dart';
import 'comprehensive_database_service.dart';
import 'comprehensive_report_models.dart';
import 'credit_service.dart';
import 'leaflet_map_service.dart';
import 'geospatial_geojson_service.dart';
import 'similarity_engine.dart';

class ReportDetailsScreen extends StatefulWidget {
  final ReportCategory category;
  
  const ReportDetailsScreen({super.key, required this.category});

  @override
  State<ReportDetailsScreen> createState() => _ReportDetailsScreenState();
}

class _ReportDetailsScreenState extends State<ReportDetailsScreen> with TickerProviderStateMixin {
  final LanguageService _languageService = LanguageService();
  final _formKey = GlobalKey<FormState>();
  final _descriptionController = TextEditingController();
  final _addressController = TextEditingController();
  
  List<File> selectedImages = [];
  String? currentLocation;
  double? currentLatitude;
  double? currentLongitude;
  bool isLoadingLocation = false;
  bool showMap = false;
  
  // AI Priority Detection & Scanning Shimmer
  String selectedPriority = 'Medium';
  bool isAnalyzingImage = false;
  String? aiAnalysisResult;
  late AnimationController _scannerController;

  // Proximity & Multi-Signal Duplicate Detection
  bool _hasDuplicate = false;
  String? _duplicateParentId;
  double? _duplicateDistance;
  Map<String, dynamic>? _duplicateReport;
  SimilarityAnalysisResult? _duplicateAnalysisResult;
  bool _duplicateDismissed = false;
  
  // WebView controller for Leaflet map (mobile/desktop)
  WebViewController? _webViewController;
  // Default coordinates for Solapur, Maharashtra, India
  static const double _defaultLatitude = 17.68687;
  static const double _defaultLongitude = 75.92275;

  // Nearby reports for real-time map visualization
  List<ComprehensiveReportModel> _nearbyReports = [];
  StreamSubscription<List<ComprehensiveReportModel>>? _nearbyReportsSubscription;

  @override
  void initState() {
    super.initState();
    _languageService.addListener(_onLanguageChanged);
    
    _scannerController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    );
    
    // Add listener to description field for real-time AI analysis
    _descriptionController.addListener(_onDescriptionChanged);
    
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _initializeMap();
      _checkNearbyDuplicates();
      _subscribeToRealtimeNearbyReports();
    });
  }

  @override
  void dispose() {
    _scannerController.dispose();
    _nearbyReportsSubscription?.cancel();
    _descriptionController.removeListener(_onDescriptionChanged);
    _descriptionController.dispose();
    _addressController.dispose();
    _languageService.removeListener(_onLanguageChanged);
    super.dispose();
  }

  /// Multi-signal duplicate pre-check within proximity radius
  Future<void> _checkNearbyDuplicates() async {
    final lat = currentLatitude ?? _defaultLatitude;
    final lng = currentLongitude ?? _defaultLongitude;
    if (_duplicateDismissed) return;

    try {
      final res = await ComprehensiveDatabaseService().findNearbyDuplicateReports(
        latitude: lat,
        longitude: lng,
        category: widget.category.name,
        title: widget.category.name,
        description: _descriptionController.text.trim(),
        radiusMeters: 200.0,
      );

      if (mounted) {
        setState(() {
          _hasDuplicate = res.hasDuplicate;
          _duplicateParentId = res.parentReportId;
          _duplicateDistance = res.distanceMeters;
          _duplicateReport = res.parentReport;
          _duplicateAnalysisResult = res.analysisResult;
        });
      }
    } catch (e) {
      // Ignore network errors in preview
    }
  }

  /// Analyzes description text in real-time for priority keywords
  void _onDescriptionChanged() {
    final description = _descriptionController.text.trim();
    if (description.length > 15) { // Only analyze if description has meaningful content
      _analyzeDescriptionOnly(description);
    }
  }

  /// Analyzes only the description text for priority keywords
  void _analyzeDescriptionOnly(String description) {
    final analysis = ImageAnalysisService.analyzeDescriptionForPriority(description);
    final detectedPriority = analysis['priority'] ?? 'Medium';
    final keywords = analysis['keywords'] ?? '';
    
    // Only update priority if we detect high priority keywords
    if (detectedPriority == 'High' && keywords.isNotEmpty) {
      setState(() {
        selectedPriority = detectedPriority;
        aiAnalysisResult = 'AI detected emergency/disaster keywords in description: $keywords. ${analysis['explanation']}';
      });
      
      // Show notification about automatic priority change
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              const Icon(Icons.warning_amber_rounded, color: Colors.white, size: 20),
              const SizedBox(width: 8),
              Expanded(
                child: Text('High priority detected from description keywords: $keywords'),
              ),
            ],
          ),
          backgroundColor: Colors.red[700],
          duration: const Duration(seconds: 4),
          action: SnackBarAction(
            label: 'Details',
            textColor: Colors.white,
            onPressed: () => _showAIAnalysisDialog(),
          ),
        ),
      );
    }
  }

  void _onLanguageChanged() {
    setState(() {});
  }



  Future<void> _initializeMap() async {
    // Initialize the map with default or detected coordinates and load nearby reports
    final lat = currentLatitude ?? _defaultLatitude;
    final lng = currentLongitude ?? _defaultLongitude;

    setState(() {
      currentLatitude = lat;
      currentLongitude = lng;
      showMap = true;
    });

    try {
      final reports = await ComprehensiveDatabaseService().getNearbyMapReports(
        latitude: lat,
        longitude: lng,
        radiusKm: 10.0,
      );
      if (mounted) {
        setState(() {
          _nearbyReports = reports;
        });
        _syncMapLayers();
      }
    } catch (e) {
      print('Note: Could not load initial nearby reports: $e');
    }
  }

  void _subscribeToRealtimeNearbyReports() {
    _nearbyReportsSubscription?.cancel();
    try {
      _nearbyReportsSubscription = ComprehensiveDatabaseService()
          .getAllReportsStream()
          .listen((reports) {
        if (mounted) {
          final lat = currentLatitude ?? _defaultLatitude;
          final lng = currentLongitude ?? _defaultLongitude;
          final filtered = reports.where((r) {
            if (r.latitude == null || r.longitude == null) return false;
            final dist = GeospatialGeoJsonService.calculateDistanceMeters(lat, lng, r.latitude!, r.longitude!);
            return dist <= 10000.0; // 10km radius
          }).toList();

          setState(() {
            _nearbyReports = filtered;
          });
          _syncMapLayers();
        }
      }, onError: (e) {
        print('Realtime nearby reports stream note: $e');
      });
    } catch (e) {
      print('Realtime subscription note: $e');
    }
  }

  void _syncMapLayers() {
    if (_webViewController != null && _nearbyReports.isNotEmpty) {
      try {
        final geoJsonStr = GeospatialGeoJsonService.reportsToFeatureCollection(_nearbyReports).toJsonString();
        _webViewController!.runJavaScript('updateMapLayers($geoJsonStr, null);');
      } catch (e) {
        print('Error syncing map layers: $e');
      }
    }
  }

  Future<void> _getCurrentLocationSafely() async {
    setState(() {
      isLoadingLocation = true;
    });
    
    try {
      print('🔄 Starting location detection...');
      
      // Check if location services are enabled
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        print('❌ Location services are disabled');
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Row(
                children: [
                  Icon(Icons.warning, color: Colors.white, size: 20),
                  SizedBox(width: 8),
                  Expanded(child: Text('Location services are disabled. Please enable them in your device settings.')),
                ],
              ),
              backgroundColor: Colors.orange,
              duration: Duration(seconds: 4),
            ),
          );
        }
        throw Exception('Location services are disabled.');
      }

      print('✅ Getting current position...');
      
      // Get the current position with timeout
      Position position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 30),
      );
      
      print('📍 Position obtained: ${position.latitude}, ${position.longitude}');
      print('🔄 Getting address from coordinates...');
      
      // Get real address from coordinates
      final address = await _reverseGeocode(position.latitude, position.longitude);
      print('🏠 Address resolved: $address');
      
      setState(() {
        currentLocation = address;
        currentLatitude = position.latitude;
        currentLongitude = position.longitude;
        if (_addressController.text.isEmpty) {
          _addressController.text = address;
        }
        isLoadingLocation = false;
      });

      // Update web map location
      if (_webViewController != null) {
        await _updateMapLocation(position.latitude, position.longitude);
      }

      // Show success feedback
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.check_circle, color: Colors.white, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Location detected successfully!', style: TextStyle(fontWeight: FontWeight.bold)),
                      Text('${position.latitude.toStringAsFixed(6)}, ${position.longitude.toStringAsFixed(6)}'),
                    ],
                  ),
                ),
              ],
            ),
            backgroundColor: Colors.green,
            duration: const Duration(seconds: 3),
          ),
        );
      }
    } catch (e) {
      print('❌ Location detection failed: $e');
      
      // Fallback to default location (Solapur)
      const mockLatitude = _defaultLatitude;
      const mockLongitude = _defaultLongitude;
      final mockAddress = await _reverseGeocode(mockLatitude, mockLongitude);
      
      setState(() {
        currentLatitude = mockLatitude;
        currentLongitude = mockLongitude;
        currentLocation = mockAddress;
        if (_addressController.text.isEmpty) {
          _addressController.text = mockAddress;
        }
        isLoadingLocation = false;
      });
      
      // Update web map with fallback location
      if (_webViewController != null) {
        await _updateMapLocation(mockLatitude, mockLongitude);
      }
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.warning, color: Colors.white, size: 20),
                const SizedBox(width: 8),
                Expanded(child: Text('Could not get precise location: ${e.toString()}. Using approximate location for demo.')),
              ],
            ),
            backgroundColor: Colors.orange,
            duration: const Duration(seconds: 4),
          ),
        );
      }
    }
  }

  Future<String> _reverseGeocode(double lat, double lng) async {
    try {
      // Validate coordinates range
      if (lat < -90.0 || lat > 90.0 || lng < -180.0 || lng > 180.0 || lat.isNaN || lng.isNaN) {
        return 'Coordinates: ${lat.toStringAsFixed(5)}, ${lng.toStringAsFixed(5)}';
      }

      // Use real reverse geocoding
      List<Placemark> placemarks = await placemarkFromCoordinates(lat, lng);
      
      if (placemarks.isNotEmpty) {
        Placemark place = placemarks[0];
        List<String> addressParts = [];
        
        // Add specific locality/street info if present
        if (place.name != null && place.name!.isNotEmpty && place.name != place.street) {
          addressParts.add(place.name!);
        }
        if (place.street != null && place.street!.isNotEmpty) {
          addressParts.add(place.street!);
        }
        if (place.subLocality != null && place.subLocality!.isNotEmpty) {
          addressParts.add(place.subLocality!);
        }
        if (place.locality != null && place.locality!.isNotEmpty) {
          addressParts.add(place.locality!);
        }
        if (place.subAdministrativeArea != null && place.subAdministrativeArea!.isNotEmpty && place.subAdministrativeArea != place.locality) {
          addressParts.add(place.subAdministrativeArea!);
        }
        if (place.administrativeArea != null && place.administrativeArea!.isNotEmpty) {
          addressParts.add(place.administrativeArea!);
        }
        if (place.postalCode != null && place.postalCode!.isNotEmpty) {
          addressParts.add(place.postalCode!);
        }
        
        if (addressParts.isNotEmpty) {
          return addressParts.join(', ');
        }
      }
    } catch (e) {
      print('Reverse geocoding note: $e');
    }
    
    // Clean fallback to exact coordinates without fake street names
    return 'Location at ${lat.toStringAsFixed(5)}, ${lng.toStringAsFixed(5)}';
  }

  // WebView-based map methods
  Future<void> _updateMapLocation(double latitude, double longitude) async {
    if (_webViewController != null) {
      await _webViewController!.runJavaScript(
        'updateLocation($latitude, $longitude);'
      );
    }
  }

  Future<void> _setLocationLoading(bool loading) async {
    if (_webViewController != null) {
      await _webViewController!.runJavaScript(
        'setLocationLoading($loading);'
      );
    }
  }

  void _onLocationChangedFromMap(double latitude, double longitude) async {
    setState(() {
      currentLatitude = latitude;
      currentLongitude = longitude;
    });

    // Reverse geocode the selected coordinates and update form
    try {
      final address = await _reverseGeocode(latitude, longitude);
      setState(() {
        currentLocation = address;
        _addressController.text = address;
      });
      _checkNearbyDuplicates();
    } catch (e) {
      print('Failed to get address: $e');
    }
  }

  Future<void> _handleLocationRequest() async {
    await _setLocationLoading(true);
    await _getCurrentLocationSafely();
    await _setLocationLoading(false);
  }

  Widget _buildScanningShimmerOverlay() {
    return AnimatedBuilder(
      animation: _scannerController,
      builder: (context, child) {
        return Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFF155EEF), width: 1.5),
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: Stack(
              children: [
                Container(
                  color: const Color(0xFF155EEF).withValues(alpha: 0.08),
                ),
                Positioned(
                  top: _scannerController.value * 120,
                  left: 0,
                  right: 0,
                  child: Container(
                    height: 3,
                    decoration: BoxDecoration(
                      color: const Color(0xFF155EEF),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF155EEF).withValues(alpha: 0.4),
                          blurRadius: 6,
                          spreadRadius: 2,
                        ),
                      ],
                    ),
                  ),
                ),
                Center(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: const Color(0xFF123B63).withValues(alpha: 0.85),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        SizedBox(
                          width: 12,
                          height: 12,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        ),
                        SizedBox(width: 8),
                        Text(
                          'Verifying image...',
                          style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildDuplicateAlertBanner() {
    if (!_hasDuplicate || _duplicateDismissed) return const SizedBox.shrink();

    final distanceText = _duplicateDistance != null 
        ? '${_duplicateDistance!.toStringAsFixed(0)}m away' 
        : 'nearby (within 200m)';
    final issueTitle = _duplicateReport?['title'] ?? 'Complaint #${_duplicateParentId ?? ""}';
    final isHighConfidence = _duplicateAnalysisResult?.classification == SimilarityClassification.highConfidenceDuplicate;

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFFFFBEB),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: const Color(0xFFF79009), 
          width: 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF3C7),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(
                  Icons.info_outline_rounded, 
                  color: Color(0xFFD97706), 
                  size: 20,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Possible related complaint nearby',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF92400E),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Complaint #${_duplicateParentId ?? ""} ($distanceText) was reported: "$issueTitle". Another complaint may describe a similar issue in this area.',
                      style: const TextStyle(
                        fontSize: 12,
                        color: Color(0xFF78350F),
                        height: 1.35,
                      ),
                    ),
                    if (_duplicateAnalysisResult != null && _duplicateAnalysisResult!.explainableReasons.isNotEmpty) ...[
                      const SizedBox(height: 6),
                      Wrap(
                        spacing: 6,
                        runSpacing: 4,
                        children: _duplicateAnalysisResult!.explainableReasons.map((reason) {
                          return Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(4),
                              border: Border.all(color: const Color(0xFFFDE68A)),
                            ),
                            child: Text(
                              reason,
                              style: const TextStyle(
                                fontSize: 10.5,
                                fontWeight: FontWeight.w600,
                                color: Color(0xFF92400E),
                              ),
                            ),
                          );
                        }).toList(),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () async {
                    try {
                      await CreditService.awardCreditsForReport('user_12345', _duplicateParentId ?? '1');
                    } catch (_) {}
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('Upvoted complaint #${_duplicateParentId ?? ""}! +5 Green Credits awarded.'),
                          backgroundColor: const Color(0xFF12B76A),
                        ),
                      );
                      Navigator.pop(context);
                    }
                  },
                  icon: const Icon(Icons.thumb_up_alt_rounded, size: 14),
                  label: const Text('Upvote Existing Complaint', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 12)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF155EEF),
                    foregroundColor: Colors.white,
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              OutlinedButton(
                onPressed: () {
                  setState(() {
                    _duplicateDismissed = true;
                  });
                },
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFF667085),
                  side: const BorderSide(color: Color(0xFFE4E7EC)),
                  padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                child: const Text('Proceed Anyway', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 12)),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildImageTile(int index) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: Stack(
          fit: StackFit.expand,
          children: [
            // Platform-specific image display
            kIsWeb 
              ? Image.network(
                  selectedImages[index].path,
                  fit: BoxFit.cover,
                  errorBuilder: (context, error, stackTrace) {
                    return Container(
                      color: Colors.grey[300],
                      child: const Icon(
                        Icons.image_not_supported,
                        color: Colors.grey,
                        size: 50,
                      ),
                    );
                  },
                )
              : Image.file(
                  selectedImages[index],
                  fit: BoxFit.cover,
                ),
            
            // Overlay gradient
            Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.transparent,
                    Colors.black.withValues(alpha: 0.3),
                  ],
                ),
              ),
            ),
            
            // Remove button
            Positioned(
              top: 6,
              right: 6,
              child: GestureDetector(
                onTap: () => _removeImage(index),
                child: Container(
                  width: 28,
                  height: 28,
                  decoration: BoxDecoration(
                    color: Colors.red[600],
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.2),
                        blurRadius: 4,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: const Icon(
                    Icons.close_rounded,
                    color: Colors.white,
                    size: 18,
                  ),
                ),
              ),
            ),
            
            // Image number indicator
            Positioned(
              bottom: 6,
              left: 6,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.6),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  '${index + 1}',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAddImageButton({
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback? onTap,
  }) {
    final isEnabled = onTap != null;
    
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
        decoration: BoxDecoration(
          color: isEnabled ? color.withValues(alpha: 0.1) : Colors.grey[100],
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isEnabled ? color.withValues(alpha: 0.3) : Colors.grey[300]!,
            width: 1.5,
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              color: isEnabled ? color : Colors.grey[400],
              size: 24,
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                color: isEnabled ? color : Colors.grey[500],
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _removeImage(int index) {
    setState(() {
      selectedImages.removeAt(index);
    });
    
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Row(
          children: [
            Icon(Icons.delete_outline, color: Colors.white, size: 20),
            SizedBox(width: 8),
            Text('Image removed'),
          ],
        ),
        backgroundColor: Colors.orange[600],
        duration: const Duration(seconds: 2),
      ),
    );
  }

  void _openLocationSearch() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _buildLocationSearchSheet(),
    );
  }

  Widget _buildInteractiveMap() {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey[300]!),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: SizedBox(
          height: 300,
          child: kIsWeb ? _buildWebMap() : _buildMobileMap(),
        ),
      ),
    );
  }

  Widget _buildMobileMap() {
    // For mobile/desktop platforms, use WebView
    return WebViewWidget(
      controller: _getWebViewController(),
    );
  }

  Widget _buildWebMap() {
    // For web platform, show a placeholder with instructions
    return Container(
      width: double.infinity,
      height: double.infinity,
      decoration: BoxDecoration(
        color: Colors.blue[50],
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.map,
            size: 64,
            color: Colors.blue[400],
          ),
          const SizedBox(height: 16),
          Text(
            'Interactive Map',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: Colors.blue[700],
            ),
          ),
          const SizedBox(height: 8),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Text(
              'Location: ${currentLatitude?.toStringAsFixed(6) ?? _defaultLatitude.toStringAsFixed(6)}, ${currentLongitude?.toStringAsFixed(6) ?? _defaultLongitude.toStringAsFixed(6)}',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 14,
                color: Colors.blue[600],
              ),
            ),
          ),
          const SizedBox(height: 16),
          ElevatedButton.icon(
            onPressed: _getCurrentLocationSafely,
            icon: const Icon(Icons.my_location, size: 20),
            label: const Text('Get Current Location'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.blue[600],
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            ),
          ),
        ],
      ),
    );
  }

  WebViewController _getWebViewController() {
    if (_webViewController == null) {
      final double lat = currentLatitude ?? _defaultLatitude;
      final double lng = currentLongitude ?? _defaultLongitude;
      final nearbyGeoJson = _nearbyReports.isNotEmpty
          ? GeospatialGeoJsonService.reportsToFeatureCollection(_nearbyReports).toJsonString()
          : null;
      
      _webViewController = WebViewController()
        ..setJavaScriptMode(JavaScriptMode.unrestricted)
        ..addJavaScriptChannel(
          'onLocationChanged',
          onMessageReceived: (JavaScriptMessage message) {
            try {
              final data = message.message;
              // Parse the coordinate data from JavaScript
              final regex = RegExp(r'latitude:(-?\d+\.?\d*),longitude:(-?\d+\.?\d*)');
              final match = regex.firstMatch(data);
              if (match != null) {
                final lat = double.parse(match.group(1)!);
                final lng = double.parse(match.group(2)!);
                _onLocationChangedFromMap(lat, lng);
              }
            } catch (e) {
              print('Error parsing location data: $e');
            }
          },
        )
        ..addJavaScriptChannel(
          'requestLocation',
          onMessageReceived: (JavaScriptMessage message) {
            _handleLocationRequest();
          },
        )
        ..loadHtmlString(
          LeafletMapService.getEnhancedMapHTML(
            latitude: lat,
            longitude: lng,
            reportsGeoJson: nearbyGeoJson,
          ),
        );
    }
    return _webViewController!;
  }

  Future<void> _pickImage(ImageSource source) async {
    if (selectedImages.length >= 5) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Row(
            children: [
              Icon(Icons.warning_rounded, color: Colors.white, size: 20),
              SizedBox(width: 8),
              Text('Maximum 5 images allowed'),
            ],
          ),
          backgroundColor: Colors.orange[600],
          duration: const Duration(seconds: 3),
        ),
      );
      return;
    }

    try {
      final picker = ImagePicker();
      final pickedFile = await picker.pickImage(
        source: source,
        maxWidth: 1200,
        maxHeight: 1200,
        imageQuality: 85,
      );
      
      if (pickedFile != null && mounted) {
        final newImage = File(pickedFile.path);
        setState(() {
          selectedImages.add(newImage);
        });
        
        // Analyze image with AI for priority detection
        _analyzeImageForPriority(newImage);
        
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Row(
              children: [
                Icon(Icons.check_circle_rounded, color: Colors.white, size: 20),
                SizedBox(width: 8),
                Text('Image added successfully'),
              ],
            ),
            backgroundColor: Colors.green[600],
            duration: const Duration(seconds: 2),
          ),
        );
      }
    } catch (e) {
      print('Error picking image: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.error_outline, color: Colors.white, size: 20),
                const SizedBox(width: 8),
                Expanded(child: Text('Failed to pick image: ${e.toString()}')),
              ],
            ),
            backgroundColor: Colors.red[600],
            duration: const Duration(seconds: 3),
          ),
        );
      }
    }
  }

  /// Analyzes uploaded image and description using AI and updates priority automatically
  Future<void> _analyzeImageForPriority(File imageFile) async {
    if (!mounted) return;

    setState(() {
      isAnalyzingImage = true;
      aiAnalysisResult = null;
    });

    try {
      // Show analysis started message
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Row(
            children: [
              SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                ),
              ),
              SizedBox(width: 12),
              Text('🤖 AI analyzing image with dual classification...'),
            ],
          ),
          backgroundColor: Colors.blue[700],
          duration: const Duration(seconds: 4),
        ),
      );

      // Get current description text for analysis
      final currentDescription = _descriptionController.text.trim();

      String detectedPriority = 'Medium';
      String explanation = 'Analysis in progress...';
      
      // Try Python classifier first (enhanced analysis)
      try {
        final pythonResult = await PythonDisasterClassifier.enhancedClassification(imageFile.path);
        
        if (pythonResult['success'] == true) {
          detectedPriority = pythonResult['final_priority'] ?? pythonResult['priority'] ?? 'Medium';
          explanation = 'Python AI Analysis: ${pythonResult['priority']}';
          
          if (pythonResult['priority_override'] != null) {
            explanation += '\n${pythonResult['priority_override']}';
          }
          
          if (pythonResult['error'] != null) {
            explanation += '\nNote: ${pythonResult['error']}';
          }
          
          print('🐍 Python Classification Success: $detectedPriority');
        } else {
          throw Exception('Python classifier failed: ${pythonResult['error']}');
        }
      } catch (pythonError) {
        print('⚠️ Python classifier failed, falling back to Flutter AI: $pythonError');
        
        // Fallback to original Flutter AI analysis
        detectedPriority = await ImageAnalysisService.analyzeImageForPriority(
          imageFile, 
          description: currentDescription.isNotEmpty ? currentDescription : null
        );
        explanation = '${ImageAnalysisService.getPriorityExplanation(detectedPriority)}\n\nNote: Used Flutter AI (Python classifier unavailable)';
      }

      if (mounted) {
        setState(() {
          selectedPriority = detectedPriority;
          aiAnalysisResult = explanation;
          isAnalyzingImage = false;
        });

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                Icon(
                  detectedPriority == 'High' ? Icons.priority_high_rounded : Icons.info_outline_rounded,
                  color: Colors.white,
                  size: 20,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text('Suggested priority: $detectedPriority based on details provided.'),
                ),
              ],
            ),
            backgroundColor: const Color(0xFF155EEF),
            duration: const Duration(seconds: 3),
            action: SnackBarAction(
              label: 'View',
              textColor: Colors.white,
              onPressed: () => _showAIAnalysisDialog(),
            ),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          isAnalyzingImage = false;
        });
      }
    }
  }

  /// Shows detailed AI analysis results
  void _showAIAnalysisDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            Icon(
              Icons.info_outline_rounded,
              color: ImageAnalysisService.getPriorityColor(selectedPriority),
            ),
            const SizedBox(width: 8),
            const Text('Smart Assistance', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Text('Suggested Priority: ', style: TextStyle(fontWeight: FontWeight.w600)),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: ImageAnalysisService.getPriorityColor(selectedPriority).withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(
                      color: ImageAnalysisService.getPriorityColor(selectedPriority).withValues(alpha: 0.3),
                    ),
                  ),
                  child: Text(
                    selectedPriority,
                    style: TextStyle(
                      color: ImageAnalysisService.getPriorityColor(selectedPriority),
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            const Text('Assessment note:', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
            const SizedBox(height: 4),
            Text(
              aiAnalysisResult ?? 'Standard triage assessment applied.',
              style: const TextStyle(fontSize: 13, color: Color(0xFF475569)),
            ),
            const SizedBox(height: 12),
            const Text(
              'AI-generated suggestions may be reviewed by municipal staff.',
              style: TextStyle(fontSize: 11, color: Color(0xFF667085), fontStyle: FontStyle.italic),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  /// Builds a priority selection option widget
  Widget _buildPriorityOption(String priority, String description, IconData icon, Color color) {
    final isSelected = selectedPriority == priority;
    
    return GestureDetector(
      onTap: () {
        setState(() {
          selectedPriority = priority;
        });
      },
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isSelected ? color.withValues(alpha: 0.1) : Colors.grey[50],
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isSelected ? color : Colors.grey[300]!,
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Column(
          children: [
            Icon(
              icon,
              color: isSelected ? color : Colors.grey[600],
              size: 20,
            ),
            const SizedBox(height: 4),
            Text(
              priority,
              style: TextStyle(
                fontSize: 12,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                color: isSelected ? color : Colors.grey[700],
              ),
            ),
            const SizedBox(height: 2),
            Text(
              description,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 10,
                color: isSelected ? color.withValues(alpha: 0.8) : Colors.grey[600],
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _handleSubmitReport() {
    if (_formKey.currentState!.validate()) {
      if (selectedImages.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Row(
              children: [
                Icon(Icons.warning, color: Colors.white, size: 20),
                SizedBox(width: 8),
                Text('Please add at least one image as proof'),
              ],
            ),
            backgroundColor: Colors.red,
          ),
        );
        return;
      }

      if (currentLatitude == null || currentLongitude == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Row(
              children: [
                Icon(Icons.location_off, color: Colors.white, size: 20),
                SizedBox(width: 8),
                Text('Please select a location on the map'),
              ],
            ),
            backgroundColor: Colors.orange,
          ),
        );
        return;
      }

      // Use the precise address from the address controller
      String finalLocation = _addressController.text.trim();
      if (finalLocation.isEmpty) {
        finalLocation = currentLocation ?? 'Location coordinates: ${currentLatitude!.toStringAsFixed(6)}, ${currentLongitude!.toStringAsFixed(6)}';
      }

      // Navigate to confirmation screen
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => ConfirmationScreen(
            category: widget.category,
            description: _descriptionController.text,
            images: selectedImages,
            location: finalLocation,
            latitude: currentLatitude,
            longitude: currentLongitude,
            priority: selectedPriority,
            aiAnalysisResult: aiAnalysisResult,
          ),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF7F9FC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: Color(0xFF172B4D)),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'Step 2 of 3: Provide Details',
          style: TextStyle(
            color: Color(0xFF172B4D),
            fontSize: 18,
            fontWeight: FontWeight.w700,
          ),
        ),
        bottom: const PreferredSize(
          preferredSize: Size.fromHeight(4),
          child: LinearProgressIndicator(
            value: 0.66,
            backgroundColor: Color(0xFFE4E7EC),
            valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF155EEF)),
            minHeight: 4,
          ),
        ),
      ),
      body: Form(
        key: _formKey,
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // In-line Duplicate Alert Banner (200m Proximity Check)
                    _buildDuplicateAlertBanner(),

                    // Selected Category Display
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFE4E7EC)),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 40,
                            height: 40,
                            decoration: BoxDecoration(
                              color: const Color(0xFF155EEF).withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Icon(
                              widget.category.icon,
                              color: const Color(0xFF155EEF),
                              size: 20,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Selected Category',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Color(0xFF667085),
                                ),
                              ),
                              Text(
                                widget.category.name,
                                style: const TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w700,
                                  color: Color(0xFF172B4D),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    
                    const SizedBox(height: 16),
                    
                    // Description Field
                    const Text(
                      'Complaint Description *',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF172B4D),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Container(
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFE4E7EC)),
                      ),
                      child: TextFormField(
                        controller: _descriptionController,
                        maxLines: 4,
                        style: const TextStyle(fontSize: 14, color: Color(0xFF172B4D)),
                        decoration: const InputDecoration(
                          hintText: 'Describe the civic problem clearly with details like severity, location landmarks, and duration...',
                          hintStyle: TextStyle(color: Color(0xFF98A2B3), fontSize: 13),
                          border: InputBorder.none,
                          contentPadding: EdgeInsets.all(14),
                        ),
                        validator: (value) {
                          if (value == null || value.trim().isEmpty) {
                            return 'Please describe the problem';
                          }
                          if (value.trim().length < 10) {
                            return 'Please provide a more detailed description (at least 10 characters)';
                          }
                          return null;
                        },
                      ),
                    ),
                    
                    const SizedBox(height: 16),
                    
                    // Image Upload Section
                    const Text(
                      'Photo Evidence *',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF172B4D),
                      ),
                    ),
                    const SizedBox(height: 6),
                    
                    // Image Upload Container
                    Container(
                      width: double.infinity,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFE4E7EC)),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(14),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                const Icon(
                                  Icons.photo_camera_outlined,
                                  color: Color(0xFF155EEF),
                                  size: 18,
                                ),
                                const SizedBox(width: 8),
                                const Text(
                                  'Upload Photos (Max 5)',
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                    color: Color(0xFF172B4D),
                                  ),
                                ),
                                const Spacer(),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: selectedImages.length >= 5 
                                        ? const Color(0xFFFEF3F2) 
                                        : const Color(0xFFF0F9FF),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Text(
                                    '${selectedImages.length}/5',
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w600,
                                      color: selectedImages.length >= 5 
                                          ? const Color(0xFFD92D20) 
                                          : const Color(0xFF155EEF),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            
                            const SizedBox(height: 12),
                            
                            // Image Grid with Scanning Overlay
                            if (selectedImages.isNotEmpty) ...[
                              Stack(
                                children: [
                                  GridView.builder(
                                    shrinkWrap: true,
                                    physics: const NeverScrollableScrollPhysics(),
                                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                                      crossAxisCount: 3,
                                      crossAxisSpacing: 8,
                                      mainAxisSpacing: 8,
                                      childAspectRatio: 1,
                                    ),
                                    itemCount: selectedImages.length,
                                    itemBuilder: (context, index) {
                                      return _buildImageTile(index);
                                    },
                                  ),
                                  if (isAnalyzingImage)
                                    Positioned.fill(
                                      child: _buildScanningShimmerOverlay(),
                                    ),
                                ],
                              ),
                              const SizedBox(height: 12),
                            ],
                            
                            // Add Image Buttons
                            Row(
                              children: [
                                Expanded(
                                  child: OutlinedButton.icon(
                                    icon: const Icon(Icons.camera_alt_outlined, size: 16),
                                    label: const Text('Camera', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                                    onPressed: selectedImages.length < 5 
                                        ? () => _pickImage(ImageSource.camera)
                                        : null,
                                    style: OutlinedButton.styleFrom(
                                      foregroundColor: const Color(0xFF155EEF),
                                      side: const BorderSide(color: Color(0xFFE4E7EC)),
                                      padding: const EdgeInsets.symmetric(vertical: 10),
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: OutlinedButton.icon(
                                    icon: const Icon(Icons.photo_library_outlined, size: 16),
                                    label: const Text('Gallery', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                                    onPressed: selectedImages.length < 5 
                                        ? () => _pickImage(ImageSource.gallery)
                                        : null,
                                    style: OutlinedButton.styleFrom(
                                      foregroundColor: const Color(0xFF155EEF),
                                      side: const BorderSide(color: Color(0xFFE4E7EC)),
                                      padding: const EdgeInsets.symmetric(vertical: 10),
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                    
                    const SizedBox(height: 16),
                    
                    // Priority Section
                    const Text(
                      'Priority',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF172B4D),
                      ),
                    ),
                    const SizedBox(height: 6),
                    
                    Container(
                      width: double.infinity,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFE4E7EC)),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(14),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Smart Assistance Note if available
                            if (aiAnalysisResult != null && !isAnalyzingImage) ...[
                              Container(
                                width: double.infinity,
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF0F9FF),
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: const Color(0xFFB2DDFF)),
                                ),
                                child: Row(
                                  children: [
                                    const Icon(
                                      Icons.info_outline_rounded,
                                      color: Color(0xFF155EEF),
                                      size: 16,
                                    ),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        'Suggested priority: $selectedPriority based on problem description and image.',
                                        style: const TextStyle(
                                          fontSize: 12,
                                          color: Color(0xFF175CD3),
                                          fontWeight: FontWeight.w500,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(height: 10),
                            ],
                            
                            // Manual Priority Selection
                            Row(
                              children: [
                                Expanded(
                                  child: _buildPriorityOption('High', 'Immediate hazard / urgent', Icons.priority_high_rounded, const Color(0xFFD92D20)),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: _buildPriorityOption('Medium', 'Standard service request', Icons.remove_rounded, const Color(0xFFF79009)),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: _buildPriorityOption('Low', 'Routine maintenance', Icons.arrow_downward_rounded, const Color(0xFF12B76A)),
                                ),
                              ],
                            ),
                            
                            const SizedBox(height: 8),
                            const Text(
                              'AI-assisted suggestions may be reviewed by municipal staff.',
                              style: TextStyle(
                                fontSize: 11,
                                color: Color(0xFF667085),
                                fontStyle: FontStyle.italic,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    
                    const SizedBox(height: 16),
                    
                    // Location Section
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Problem Location *',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF172B4D),
                          ),
                        ),
                        TextButton.icon(
                          onPressed: _handleLocationRequest,
                          icon: const Icon(Icons.my_location_rounded, size: 14, color: Color(0xFF155EEF)),
                          label: const Text(
                            'Use Current Location',
                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF155EEF)),
                          ),
                          style: TextButton.styleFrom(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            visualDensity: VisualDensity.compact,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    
                    // Interactive Map Section
                    Container(
                      width: double.infinity,
                      height: 220,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFE4E7EC)),
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: Stack(
                          children: [
                            // Map Interface
                            _buildInteractiveMap(),
                            
                            // Map Controls Overlay
                            Positioned(
                              top: 8,
                              right: 8,
                              child: Container(
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: const Color(0xFFE4E7EC)),
                                ),
                                child: IconButton(
                                  onPressed: _openLocationSearch,
                                  icon: const Icon(Icons.search_rounded, size: 18),
                                  color: const Color(0xFF155EEF),
                                  tooltip: 'Search Location',
                                  constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
                                  padding: EdgeInsets.zero,
                                ),
                              ),
                            ),
                            
                            // Location Status Banner
                            if (currentLatitude != null && currentLongitude != null)
                              Positioned(
                                bottom: 0,
                                left: 0,
                                right: 0,
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                  color: const Color(0xFF123B63).withValues(alpha: 0.9),
                                  child: Row(
                                    children: [
                                      const Icon(Icons.location_on_rounded, color: Color(0xFF12B76A), size: 14),
                                      const SizedBox(width: 6),
                                      Expanded(
                                        child: Text(
                                          'Selected GPS: ${currentLatitude!.toStringAsFixed(5)}, ${currentLongitude!.toStringAsFixed(5)}',
                                          style: const TextStyle(
                                            color: Colors.white,
                                            fontSize: 11,
                                            fontWeight: FontWeight.w500,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ),
                    ),
                    
                    const SizedBox(height: 12),
                    
                    // Address Section
                    const Text(
                      'Specific Address or Landmark *',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF172B4D),
                      ),
                    ),
                    const SizedBox(height: 6),
                    
                    Container(
                      width: double.infinity,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFE4E7EC)),
                      ),
                      child: TextFormField(
                        controller: _addressController,
                        maxLines: 2,
                        style: const TextStyle(fontSize: 13.5, color: Color(0xFF172B4D)),
                        decoration: const InputDecoration(
                          hintText: 'Enter address or nearby landmarks (e.g., Near City Hospital Gate 2, Station Road)...',
                          hintStyle: TextStyle(color: Color(0xFF98A2B3), fontSize: 13),
                          prefixIcon: Icon(Icons.pin_drop_outlined, color: Color(0xFF155EEF), size: 20),
                          border: InputBorder.none,
                          contentPadding: EdgeInsets.all(12),
                        ),
                        validator: (value) {
                          if (value == null || value.trim().isEmpty) {
                            return 'Please provide the problem address';
                          }
                          if (value.trim().length < 5) {
                            return 'Please provide a more specific address';
                          }
                          return null;
                        },
                      ),
                    ),
                  ],
                ),
              ),
            ),
            
            // Continue Button (Bottom Action Bar)
            Container(
              padding: const EdgeInsets.all(16),
              decoration: const BoxDecoration(
                color: Colors.white,
                border: Border(top: BorderSide(color: Color(0xFFE4E7EC))),
              ),
              child: SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  onPressed: _handleSubmitReport,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF155EEF),
                    foregroundColor: Colors.white,
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                  child: const Text(
                    'Continue to Review',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLocationSearchSheet() {
    return DraggableScrollableSheet(
      initialChildSize: 0.9,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      builder: (context, scrollController) {
        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.only(
              topLeft: Radius.circular(20),
              topRight: Radius.circular(20),
            ),
          ),
          child: Column(
            children: [
              // Handle
              Container(
                margin: const EdgeInsets.symmetric(vertical: 12),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey[400],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              
              // Header
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Row(
                  children: [
                    const Text(
                      'Select Location',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF1F2937),
                      ),
                    ),
                    const Spacer(),
                    IconButton(
                      onPressed: () => Navigator.pop(context),
                      icon: const Icon(Icons.close, color: Color(0xFF6B7280)),
                    ),
                  ],
                ),
              ),
              
              const Divider(),
              
              // Search Bar
              Padding(
                padding: const EdgeInsets.all(16),
                child: Container(
                  decoration: BoxDecoration(
                    color: Colors.grey[100],
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.grey[300]!),
                  ),
                  child: TextField(
                    decoration: const InputDecoration(
                      hintText: 'Search for a location...',
                      prefixIcon: Icon(Icons.search, color: Color(0xFF3B82F6)),
                      border: InputBorder.none,
                      contentPadding: EdgeInsets.all(16),
                    ),
                    onChanged: (value) {
                      // In a real app, implement location search
                    },
                  ),
                ),
              ),
              
              // Google Maps
              Expanded(
                child: Container(
                  margin: const EdgeInsets.symmetric(horizontal: 16),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.grey[300]!),
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: SizedBox(
                      height: 300,
                      child: _buildInteractiveMap(),
                    ),
                  ),
                ),
              ),
              
              // Quick Location Options
              Container(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Quick Options',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF1F2937),
                      ),
                    ),
                    const SizedBox(height: 12),
                    
                    Row(
                      children: [
                        Expanded(
                          child: ElevatedButton.icon(
                            onPressed: currentLatitude != null 
                                ? () {
                                    Navigator.pop(context);
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(
                                        content: Text('Location confirmed!'),
                                        backgroundColor: Colors.green,
                                      ),
                                    );
                                  }
                                : null,
                            icon: const Icon(Icons.check, size: 18),
                            label: const Text('Confirm Location'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF3B82F6),
                              foregroundColor: Colors.white,
                              elevation: 0,
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(8),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}