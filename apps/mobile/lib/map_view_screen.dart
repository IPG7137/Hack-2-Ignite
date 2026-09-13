import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:geolocator/geolocator.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'comprehensive_database_service.dart';
import 'comprehensive_report_models.dart';
import 'comprehensive_track_reports_screen.dart';
import 'leaflet_map_service.dart';
import 'language_service.dart';
import 'dashboard_screen.dart';
import 'emerging_problem_engine.dart';
import 'geospatial_geojson_service.dart';

class MapViewScreen extends StatefulWidget {
  const MapViewScreen({super.key});

  @override
  State<MapViewScreen> createState() => _MapViewScreenState();
}

class _MapViewScreenState extends State<MapViewScreen> with TickerProviderStateMixin {
  final LanguageService _languageService = LanguageService();
  final ComprehensiveDatabaseService _databaseService = ComprehensiveDatabaseService();
  
  // Default coordinates for Solapur Municipal Corporation, Maharashtra
  static const double _defaultLatitude = 17.6599;
  static const double _defaultLongitude = 75.9064;

  Position? _currentPosition;
  bool _isLoading = true;
  bool _isLoadingReports = false;
  bool _isLocationDenied = false;
  
  String _selectedCategory = 'All';
  String _selectedStatus = 'Active';
  String _selectedView = 'Map'; // 'Map' or 'List'
  double _searchRadiusKm = 10.0;
  
  List<ComprehensiveReportModel> _allStreamReports = [];
  List<ComprehensiveReportModel> _nearbyReports = [];
  List<EmergingHotspotResult> _detectedHotspots = [];
  StreamSubscription<List<ComprehensiveReportModel>>? _realtimeSubscription;
  
  WebViewController? _webViewController;
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  final List<String> _categoryFilters = [
    'All',
    'Roads',
    'Water',
    'Electricity',
    'Sanitation',
    'Safety',
  ];

  final List<String> _statusFilters = [
    'Active',
    'All',
    'Resolved',
  ];

  @override
  void initState() {
    super.initState();
    _languageService.addListener(_onLanguageChanged);

    _pulseController = AnimationController(
      duration: const Duration(seconds: 2),
      vsync: this,
    )..repeat(reverse: true);

    _pulseAnimation = Tween<double>(begin: 0.9, end: 1.15).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );

    _initLocationAndFetchReports();
  }

  @override
  void dispose() {
    _realtimeSubscription?.cancel();
    _pulseController.dispose();
    _languageService.removeListener(_onLanguageChanged);
    super.dispose();
  }

  void _onLanguageChanged() {
    setState(() {});
  }

  Future<void> _initLocationAndFetchReports() async {
    setState(() {
      _isLoading = true;
    });

    await _obtainUserLocation();
    await _fetchNearbyReports();
    _setupRealtimeSubscription();

    if (mounted) {
      _initializeMapController();
      setState(() {
        _isLoading = false;
      });
    }
  }

  void _setupRealtimeSubscription() {
    _realtimeSubscription?.cancel();
    _realtimeSubscription = _databaseService.getAllReportsStream().listen(
      (allReports) {
        _allStreamReports = allReports;
        _applyFiltersAndRefreshMap(updateWebview: true);
      },
      onError: (error) {
        print('⚠️ Realtime map stream error: $error');
      },
    );
  }

  void _applyFiltersAndRefreshMap({bool updateWebview = true}) {
    List<ComprehensiveReportModel> filtered = List.from(_allStreamReports);

    // 1. Filter by radius from effective citizen GPS location
    filtered = GeospatialGeoJsonService.filterReportsNearCitizen(
      reports: filtered,
      citizenLatitude: _effectiveLat,
      citizenLongitude: _effectiveLng,
      radiusKm: _searchRadiusKm,
    );

    // 2. Filter by Category
    if (_selectedCategory != 'All') {
      final query = _selectedCategory.toLowerCase();
      filtered = filtered.where((r) {
        final cat = r.category.toLowerCase();
        final catDisplay = (r.categoryDisplayName ?? '').toLowerCase();
        return cat.contains(query) || catDisplay.contains(query);
      }).toList();
    }

    // 3. Filter by Status
    if (_selectedStatus == 'Active') {
      filtered = filtered.where((r) => r.status != ReportStatus.resolved).toList();
    } else if (_selectedStatus == 'Resolved') {
      filtered = filtered.where((r) => r.status == ReportStatus.resolved).toList();
    }

    // 4. Calculate Phase 3C Emerging Hotspots
    final hotspots = EmergingProblemEngine.detectHotspots(reports: filtered);

    if (mounted) {
      setState(() {
        _nearbyReports = filtered;
        _detectedHotspots = hotspots;
        _isLoadingReports = false;
      });

      if (updateWebview && _webViewController != null) {
        _pushGeoJsonToWebview();
      }
    }
  }

  void _pushGeoJsonToWebview() {
    try {
      final reportsGeoJson = GeospatialGeoJsonService.reportsToFeatureCollection(_nearbyReports);
      final hotspotsGeoJson = GeospatialGeoJsonService.hotspotsToFeatureCollection(_detectedHotspots);

      final reportsJsonStr = jsonEncode(reportsGeoJson.toJson());
      final hotspotsJsonStr = jsonEncode(hotspotsGeoJson.toJson());

      _webViewController?.runJavaScript(
        'if (window.updateMapLayers) { window.updateMapLayers($reportsJsonStr, $hotspotsJsonStr); }',
      );
    } catch (e) {
      print('⚠️ Error pushing GeoJSON to webview: $e');
    }
  }

  Future<void> _obtainUserLocation() async {
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        _isLocationDenied = true;
        return;
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          _isLocationDenied = true;
          return;
        }
      }

      if (permission == LocationPermission.deniedForever) {
        _isLocationDenied = true;
        return;
      }

      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 8),
      );

      _currentPosition = position;
      _isLocationDenied = false;
    } catch (e) {
      print('⚠️ GPS obtain error: $e, using municipal center fallback');
      _isLocationDenied = true;
    }
  }

  double get _effectiveLat => _currentPosition?.latitude ?? _defaultLatitude;
  double get _effectiveLng => _currentPosition?.longitude ?? _defaultLongitude;

  Future<void> _fetchNearbyReports() async {
    setState(() {
      _isLoadingReports = true;
    });

    try {
      String? categoryParam = _selectedCategory == 'All' ? null : _selectedCategory;
      final reports = await _databaseService.getNearbyMapReports(
        latitude: _effectiveLat,
        longitude: _effectiveLng,
        radiusKm: _searchRadiusKm,
        category: categoryParam,
        statusFilter: _selectedStatus,
      );

      _allStreamReports = reports;

      // Phase 3C: Compute emerging problem hotspots across nearby reports
      final hotspots = EmergingProblemEngine.detectHotspots(
        reports: reports,
      );

      if (mounted) {
        setState(() {
          _nearbyReports = reports;
          _detectedHotspots = hotspots;
          _isLoadingReports = false;
        });
      }
    } catch (e) {
      print('❌ Error fetching nearby map reports: $e');
      if (mounted) {
        setState(() {
          _isLoadingReports = false;
        });
      }
    }
  }

  void _initializeMapController() {
    if (kIsWeb) return;

    final reportsGeoJson = GeospatialGeoJsonService.reportsToFeatureCollection(_nearbyReports);
    final hotspotsGeoJson = GeospatialGeoJsonService.hotspotsToFeatureCollection(_detectedHotspots);

    _webViewController = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..addJavaScriptChannel(
        'onReportSelected',
        onMessageReceived: (JavaScriptMessage message) {
          final reportId = message.message.trim();
          _handleMarkerTapped(reportId);
        },
      )
      ..addJavaScriptChannel(
        'requestLocation',
        onMessageReceived: (JavaScriptMessage message) {
          _recenterOnUserLocation();
        },
      )
      ..loadHtmlString(
        LeafletMapService.getEnhancedMapHTML(
          latitude: _effectiveLat,
          longitude: _effectiveLng,
          zoom: 14.0,
          reportsGeoJson: jsonEncode(reportsGeoJson.toJson()),
          hotspotsGeoJson: jsonEncode(hotspotsGeoJson.toJson()),
        ),
      );
  }

  void _handleMarkerTapped(String reportId) {
    final match = _nearbyReports.where((r) => r.id == reportId).firstOrNull;
    if (match != null) {
      HapticFeedback.lightImpact();
      _showReportSummarySheet(match);
    }
  }

  void _showReportSummarySheet(ComprehensiveReportModel report) {
    double? distanceMeters;
    if (report.latitude != null && report.longitude != null) {
      distanceMeters = ComprehensiveDatabaseService.calculateDistanceMeters(
        _effectiveLat,
        _effectiveLng,
        report.latitude!,
        report.longitude!,
      );
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return _NearbyReportSummarySheet(
          report: report,
          distanceMeters: distanceMeters,
          onViewDetails: () {
            Navigator.pop(context);
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => const ComprehensiveTrackReportsScreen(),
              ),
            );
          },
        );
      },
    );
  }

  Future<void> _recenterOnUserLocation() async {
    HapticFeedback.selectionClick();
    setState(() {
      _isLoading = true;
    });

    await _obtainUserLocation();
    await _fetchNearbyReports();

    if (_webViewController != null) {
      _initializeMapController();
    }

    if (mounted) {
      setState(() {
        _isLoading = false;
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              const Icon(Icons.my_location, color: Colors.white, size: 16),
              const SizedBox(width: 8),
              Text(
                _isLocationDenied
                    ? 'GPS unavailable. Showing municipal center.'
                    : 'Map centered at your current GPS location.',
              ),
            ],
          ),
          backgroundColor: const Color(0xFF1E3A8A),
          duration: const Duration(seconds: 2),
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  void _onCategoryFilterChanged(String category) {
    HapticFeedback.selectionClick();
    setState(() {
      _selectedCategory = category;
    });
    _applyFiltersAndRefreshMap(updateWebview: true);
  }

  void _onStatusFilterChanged(String status) {
    HapticFeedback.selectionClick();
    setState(() {
      _selectedStatus = status;
    });
    _applyFiltersAndRefreshMap(updateWebview: true);
  }

  void _expandSearchRadius() {
    HapticFeedback.selectionClick();
    setState(() {
      _searchRadiusKm = _searchRadiusKm == 10.0 ? 25.0 : (_searchRadiusKm == 25.0 ? 50.0 : 10.0);
    });
    _applyFiltersAndRefreshMap(updateWebview: true);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: _buildAppBar(),
      body: Column(
        children: [
          // GPS Notice (if permission denied)
          if (_isLocationDenied) _buildLocationNotice(),

          // Category & Status Filters
          _buildFilterBar(),

          // Map or List View Content
          Expanded(
            child: _isLoading ? _buildLoadingState() : _buildContent(),
          ),

          // Mini Legend / Stats Bar
          _buildBottomStatsBar(),
        ],
      ),
      floatingActionButton: _buildFloatingActionButtons(),
    );
  }

  PreferredSizeWidget _buildAppBar() {
    return AppBar(
      title: const Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Live Nearby Civic Issues',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
          ),
          Text(
            'Real-time municipal GIS reports near you',
            style: TextStyle(fontSize: 11, color: Color(0xFFCBD5E1)),
          ),
        ],
      ),
      backgroundColor: const Color(0xFF1E3A8A), // Government Navy
      foregroundColor: Colors.white,
      elevation: 1,
      actions: [
        // View Toggle (Map vs List)
        IconButton(
          icon: Icon(_selectedView == 'Map' ? Icons.format_list_bulleted : Icons.map_outlined),
          tooltip: _selectedView == 'Map' ? 'Switch to List view' : 'Switch to Map view',
          onPressed: () {
            setState(() {
              _selectedView = _selectedView == 'Map' ? 'List' : 'Map';
            });
          },
        ),
        // Refresh
        IconButton(
          icon: const Icon(Icons.refresh),
          tooltip: 'Refresh nearby reports',
          onPressed: () {
            _fetchNearbyReports().then((_) => _initializeMapController());
          },
        ),
      ],
    );
  }

  Widget _buildLocationNotice() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      color: const Color(0xFFFEF3C7),
      child: Row(
        children: [
          const Icon(Icons.location_off_outlined, color: Color(0xFFD97706), size: 18),
          const SizedBox(width: 8),
          const Expanded(
            child: Text(
              'Showing municipal center. Tap "Near Me" to enable GPS.',
              style: TextStyle(fontSize: 12, color: Color(0xFF92400E), fontWeight: FontWeight.w500),
            ),
          ),
          TextButton(
            onPressed: _recenterOnUserLocation,
            style: TextButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              visualDensity: VisualDensity.compact,
            ),
            child: const Text('Enable', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFFB45309))),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterBar() {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Column(
        children: [
          // Category Horizontal Scroll Chips
          SizedBox(
            height: 36,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              itemCount: _categoryFilters.length,
              itemBuilder: (context, index) {
                final cat = _categoryFilters[index];
                final isSelected = _selectedCategory == cat;
                return Padding(
                  padding: const EdgeInsets.only(right: 6),
                  child: FilterChip(
                    label: Text(
                      cat,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                        color: isSelected ? Colors.white : const Color(0xFF334155),
                      ),
                    ),
                    selected: isSelected,
                    selectedColor: const Color(0xFF1E3A8A),
                    backgroundColor: const Color(0xFFF1F5F9),
                    showCheckmark: false,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                      side: BorderSide(
                        color: isSelected ? const Color(0xFF1E3A8A) : const Color(0xFFE2E8F0),
                      ),
                    ),
                    onSelected: (_) => _onCategoryFilterChanged(cat),
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 6),

          // Secondary filter row: Status & Search Radius
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14),
            child: Row(
              children: [
                // Status Filter Chips
                ..._statusFilters.map((s) {
                  final isSelected = _selectedStatus == s;
                  return Padding(
                    padding: const EdgeInsets.only(right: 6),
                    child: InkWell(
                      onTap: () => _onStatusFilterChanged(s),
                      borderRadius: BorderRadius.circular(12),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: isSelected ? const Color(0xFFE2E8F0) : Colors.transparent,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          s,
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                            color: isSelected ? const Color(0xFF0F172A) : const Color(0xFF64748B),
                          ),
                        ),
                      ),
                    ),
                  );
                }),
                const Spacer(),

                // Radius Button
                InkWell(
                  onTap: _expandSearchRadius,
                  borderRadius: BorderRadius.circular(8),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFFCBD5E1)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.radar, size: 12, color: Color(0xFF1E3A8A)),
                        const SizedBox(width: 4),
                        Text(
                          '${_searchRadiusKm.toInt()} km',
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF1E3A8A),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Phase 3C: Citizen-Safe Emerging Activity Indicator
          if (_detectedHotspots.any((h) => h.classification == EmergingClassification.emergingProblem || h.classification == EmergingClassification.criticalEmergingProblem)) ...[
            const SizedBox(height: 6),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFF7ED),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFFFFEDD5)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.trending_up_rounded, size: 14, color: Color(0xFFEA580C)),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        'High activity area: ${_detectedHotspots.first.complaintCount} nearby ${_detectedHotspots.first.category.toLowerCase()} issues reported',
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF9A3412),
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildContent() {
    if (_nearbyReports.isEmpty && !_isLoadingReports) {
      return _buildEmptyReportsView();
    }

    if (_selectedView == 'List') {
      return _buildReportsListView();
    }

    return _buildInteractiveMapView();
  }

  Widget _buildInteractiveMapView() {
    if (kIsWeb) {
      return Center(
        child: Container(
          margin: const EdgeInsets.all(24),
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFE4E7EC)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.map_outlined, size: 48, color: Color(0xFF155EEF)),
              const SizedBox(height: 12),
              const Text(
                'Municipal Geospatial Map',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF172B4D)),
              ),
              const SizedBox(height: 6),
              Text(
                'Active nearby complaints: ${_nearbyReports.length}',
                style: const TextStyle(fontSize: 13, color: Color(0xFF667085)),
              ),
              const SizedBox(height: 16),
              OutlinedButton.icon(
                onPressed: () {
                  setState(() {
                    _selectedView = 'List';
                  });
                },
                icon: const Icon(Icons.list_alt_rounded, size: 16),
                label: const Text('View Complaints List'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFF155EEF),
                  side: const BorderSide(color: Color(0xFF155EEF)),
                ),
              ),
            ],
          ),
        ),
      );
    }

    return Stack(
      children: [
        if (_webViewController != null)
          WebViewWidget(controller: _webViewController!)
        else
          const Center(child: CircularProgressIndicator()),

        // Loading overlay if background updating
        if (_isLoadingReports)
          Positioned(
            top: 10,
            left: 0,
            right: 0,
            child: Center(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.1),
                      blurRadius: 6,
                    ),
                  ],
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    SizedBox(
                      width: 12,
                      height: 12,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF1E3A8A)),
                    ),
                    SizedBox(width: 8),
                    Text(
                      'Updating nearby issues...',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF1E3A8A)),
                    ),
                  ],
                ),
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildReportsListView() {
    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 80),
      itemCount: _nearbyReports.length,
      itemBuilder: (context, index) {
        final report = _nearbyReports[index];
        double? distanceMeters;
        if (report.latitude != null && report.longitude != null) {
          distanceMeters = ComprehensiveDatabaseService.calculateDistanceMeters(
            _effectiveLat,
            _effectiveLng,
            report.latitude!,
            report.longitude!,
          );
        }

        return _buildNearbyReportCard(report, distanceMeters);
      },
    );
  }

  Widget _buildNearbyReportCard(ComprehensiveReportModel report, double? distanceMeters) {
    final priorityColor = _getPriorityColor(report.priority);
    final statusColor = _getStatusColor(report.status);

    String distanceStr = '';
    if (distanceMeters != null) {
      distanceStr = distanceMeters > 1000
          ? '${(distanceMeters / 1000).toStringAsFixed(1)} km away'
          : '${distanceMeters.toStringAsFixed(0)} m away';
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 4,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          onTap: () => _showReportSummarySheet(report),
          borderRadius: BorderRadius.circular(12),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        '#CR-${report.id.padLeft(4, '0')}',
                        style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF1E293B)),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: priorityColor.withOpacity(0.12),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        report.priority.displayName.toUpperCase(),
                        style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: priorityColor),
                      ),
                    ),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: statusColor,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        report.statusDisplay,
                        style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),

                Text(
                  report.title,
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                ),
                const SizedBox(height: 4),

                Text(
                  report.description,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                ),
                const SizedBox(height: 8),

                Row(
                  children: [
                    const Icon(Icons.location_on_outlined, size: 14, color: Color(0xFF64748B)),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        report.location,
                        style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    if (distanceStr.isNotEmpty)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEFF6FF),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          distanceStr,
                          style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF1E3A8A)),
                        ),
                      ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyReportsView() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(18),
              decoration: const BoxDecoration(
                color: Color(0xFFEFF6FF),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.location_city_outlined, size: 44, color: Color(0xFF1E3A8A)),
            ),
            const SizedBox(height: 16),
            Text(
              'No issues reported within ${_searchRadiusKm.toInt()} km',
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF1E293B)),
            ),
            const SizedBox(height: 6),
            Text(
              'No complaints found matching "$_selectedCategory" with status "$_selectedStatus".',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
            ),
            const SizedBox(height: 18),
            ElevatedButton.icon(
              onPressed: _expandSearchRadius,
              icon: const Icon(Icons.radar, size: 16),
              label: Text('Expand to ${_searchRadiusKm == 10.0 ? '25' : '50'} km'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF1E3A8A),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLoadingState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          AnimatedBuilder(
            animation: _pulseAnimation,
            builder: (context, child) {
              return Transform.scale(
                scale: _pulseAnimation.value,
                child: Container(
                  width: 70,
                  height: 70,
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E3A8A).withOpacity(0.1),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.location_searching, size: 36, color: Color(0xFF1E3A8A)),
                ),
              );
            },
          ),
          const SizedBox(height: 16),
          const Text(
            'Locating citizen & loading live GIS map...',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Color(0xFF1E293B)),
          ),
        ],
      ),
    );
  }

  Widget _buildBottomStatsBar() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: Color(0xFFE2E8F0))),
      ),
      child: Row(
        children: [
          Text(
            '${_nearbyReports.length} ${_nearbyReports.length == 1 ? 'issue' : 'issues'} near you',
            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF1E293B)),
          ),
          const Spacer(),
          // Visual Map Legend
          _buildLegendItem(const Color(0xFFEF4444), 'Urgent/High'),
          const SizedBox(width: 8),
          _buildLegendItem(const Color(0xFFF59E0B), 'Medium'),
          const SizedBox(width: 8),
          _buildLegendItem(const Color(0xFF059669), 'Resolved'),
        ],
      ),
    );
  }

  Widget _buildLegendItem(Color color, String label) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 3),
        Text(
          label,
          style: const TextStyle(fontSize: 10, color: Color(0xFF64748B)),
        ),
      ],
    );
  }

  Widget _buildFloatingActionButtons() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // "Near Me" GPS Recenter FAB
        FloatingActionButton.small(
          heroTag: 'near_me_fab',
          onPressed: _recenterOnUserLocation,
          backgroundColor: Colors.white,
          foregroundColor: const Color(0xFF1E3A8A),
          tooltip: 'Center on my GPS position',
          child: const Icon(Icons.my_location, size: 20),
        ),
        const SizedBox(height: 8),

        // "Report Issue" FAB
        FloatingActionButton.extended(
          heroTag: 'report_new_fab',
          onPressed: () {
            Navigator.pushReplacement(
              context,
              MaterialPageRoute(builder: (context) => const DashboardScreen()),
            );
          },
          backgroundColor: const Color(0xFF1E3A8A),
          foregroundColor: Colors.white,
          icon: const Icon(Icons.add_circle_outline, size: 18),
          label: const Text('Report Issue', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
        ),
      ],
    );
  }

  Color _getPriorityColor(ReportPriority priority) {
    switch (priority) {
      case ReportPriority.high:
        return const Color(0xFFDC2626);
      case ReportPriority.medium:
        return const Color(0xFFEA580C);
      case ReportPriority.low:
        return const Color(0xFF16A34A);
    }
  }

  Color _getStatusColor(ReportStatus status) {
    switch (status) {
      case ReportStatus.submitted:
        return const Color(0xFF1E40AF);
      case ReportStatus.review:
        return const Color(0xFF4F46E5);
      case ReportStatus.assigned:
        return const Color(0xFF7C3AED);
      case ReportStatus.progress:
        return const Color(0xFFD97706);
      case ReportStatus.resolved:
        return const Color(0xFF059669);
    }
  }
}

// ==============================================================================
// COMPLAINT SUMMARY BOTTOM SHEET (SHOWN ON MARKER TAP)
// ==============================================================================

class _NearbyReportSummarySheet extends StatelessWidget {
  final ComprehensiveReportModel report;
  final double? distanceMeters;
  final VoidCallback onViewDetails;

  const _NearbyReportSummarySheet({
    required this.report,
    required this.distanceMeters,
    required this.onViewDetails,
  });

  @override
  Widget build(BuildContext context) {
    final priorityColor = _getPriorityColor(report.priority);
    final statusColor = _getStatusColor(report.status);
    final formattedId = '#CR-${report.id.padLeft(4, '0')}';

    String distanceStr = '';
    if (distanceMeters != null) {
      distanceStr = distanceMeters! > 1000
          ? '${(distanceMeters! / 1000).toStringAsFixed(1)} km away'
          : '${distanceMeters!.toStringAsFixed(0)} m away';
    }

    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      padding: const EdgeInsets.fromLTRB(18, 12, 18, 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Drag handle
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 12),

          // Header: ID, Distance & Status Chip
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: const Color(0xFFCBD5E1)),
                ),
                child: Text(
                  formattedId,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF1E293B),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              if (distanceStr.isNotEmpty)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEFF6FF),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.near_me, size: 12, color: Color(0xFF1E3A8A)),
                      const SizedBox(width: 4),
                      Text(
                        distanceStr,
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF1E3A8A),
                        ),
                      ),
                    ],
                  ),
                ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: statusColor,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  report.statusDisplay,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),

          // Title & Category
          Text(
            report.title,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Color(0xFF0F172A),
            ),
          ),
          const SizedBox(height: 4),

          Row(
            children: [
              Icon(
                _getCategoryIcon(report.category),
                size: 14,
                color: const Color(0xFF1E3A8A),
              ),
              const SizedBox(width: 4),
              Text(
                report.categoryDisplayName ?? report.category.replaceAll('_', ' ').toUpperCase(),
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF1E3A8A),
                ),
              ),
              const SizedBox(width: 10),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: priorityColor.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  report.priority.displayName.toUpperCase(),
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    color: priorityColor,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),

          // Description
          if (report.description.isNotEmpty) ...[
            Text(
              report.description,
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 13,
                color: Colors.grey.shade700,
                height: 1.4,
              ),
            ),
            const SizedBox(height: 10),
          ],

          // Potential Duplicate / Related Issue Banner
          if (report.isPotentialDuplicate || report.parentReportId != null) ...[
            Container(
              padding: const EdgeInsets.all(8),
              margin: const EdgeInsets.only(bottom: 10),
              decoration: BoxDecoration(
                color: const Color(0xFFFEF3C7),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFFDE68A)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.link, size: 16, color: Color(0xFFB45309)),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      'Linked to related cluster issue #${report.parentReportId ?? report.id}',
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF92400E)),
                    ),
                  ),
                ],
              ),
            ),
          ],

          // Location details
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              children: [
                const Icon(Icons.location_on, size: 16, color: Color(0xFF64748B)),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    report.location,
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: Color(0xFF334155)),
                  ),
                ),
                Text(
                  report.submittedTime,
                  style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Action Button
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: onViewDetails,
              icon: const Icon(Icons.track_changes, size: 16),
              label: const Text('Track Full Status & Progress'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF1E3A8A),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Color _getPriorityColor(ReportPriority priority) {
    switch (priority) {
      case ReportPriority.high:
        return const Color(0xFFDC2626);
      case ReportPriority.medium:
        return const Color(0xFFEA580C);
      case ReportPriority.low:
        return const Color(0xFF16A34A);
    }
  }

  Color _getStatusColor(ReportStatus status) {
    switch (status) {
      case ReportStatus.submitted:
        return const Color(0xFF1E40AF);
      case ReportStatus.review:
        return const Color(0xFF4F46E5);
      case ReportStatus.assigned:
        return const Color(0xFF7C3AED);
      case ReportStatus.progress:
        return const Color(0xFFD97706);
      case ReportStatus.resolved:
        return const Color(0xFF059669);
    }
  }

  IconData _getCategoryIcon(String category) {
    final cat = category.toLowerCase();
    if (cat.contains('road') || cat.contains('pothole')) return Icons.add_road;
    if (cat.contains('water') || cat.contains('drain')) return Icons.water_drop;
    if (cat.contains('electric') || cat.contains('light')) return Icons.lightbulb_outline;
    if (cat.contains('garbage') || cat.contains('waste')) return Icons.delete_outline;
    if (cat.contains('safety') || cat.contains('manhole')) return Icons.warning_amber_rounded;
    return Icons.report_problem_outlined;
  }
}