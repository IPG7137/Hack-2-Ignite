import 'package:flutter/material.dart';
import 'dart:async';
import 'comprehensive_database_service.dart';
import 'comprehensive_report_models.dart';
import 'comprehensive_track_reports_screen.dart';
import 'auth_service.dart';
import 'language_service.dart';
import 'credit_service.dart';
import 'location_service.dart';
import 'category_selection_screen.dart';

class CivicFeedScreen extends StatefulWidget {
  final double? userLatitude;
  final double? userLongitude;

  const CivicFeedScreen({
    super.key,
    this.userLatitude,
    this.userLongitude,
  });

  @override
  State<CivicFeedScreen> createState() => _CivicFeedScreenState();
}

class _CivicFeedScreenState extends State<CivicFeedScreen> {
  final LanguageService _languageService = LanguageService();
  final ComprehensiveDatabaseService _dbService = ComprehensiveDatabaseService();
  final LocationService _locationService = LocationService.instance;
  final TextEditingController _searchController = TextEditingController();

  List<ComprehensiveReportModel> _feedItems = [];
  bool _isLoading = true;
  String _selectedCategory = 'All';
  String _selectedStatus = 'All'; // 'All', 'Active', 'In Progress', 'Resolved'
  String _sortBy = 'most_supported'; // 'most_supported', 'recent', 'nearby'
  double _selectedRadiusKm = 15.0; // 5, 15, 25, 50, 999 (City-wide)
  final Set<int> _supportingReports = {};

  final List<String> _categories = [
    'All',
    'Roads & Potholes',
    'Water Supply',
    'Drainage',
    'Streetlights',
    'Garbage & Sanitation',
    'Public Safety',
    'Parks & Trees',
  ];

  final List<double> _radii = [5.0, 15.0, 25.0, 50.0, 999.0];

  double? _activeLat;
  double? _activeLng;

  @override
  void initState() {
    super.initState();
    _languageService.addListener(_onLanguageChanged);
    _locationService.addListener(_onLocationUpdated);

    _activeLat = widget.userLatitude ?? _locationService.latitude;
    _activeLng = widget.userLongitude ?? _locationService.longitude;

    if (_activeLat == null || _activeLng == null) {
      _resolveLocationAndLoad();
    } else {
      _loadFeed();
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    _languageService.removeListener(_onLanguageChanged);
    _locationService.removeListener(_onLocationUpdated);
    super.dispose();
  }

  void _onLanguageChanged() {
    setState(() {});
  }

  void _onLocationUpdated() {
    if (mounted) {
      final newLat = widget.userLatitude ?? _locationService.latitude;
      final newLng = widget.userLongitude ?? _locationService.longitude;
      if (newLat != _activeLat || newLng != _activeLng) {
        setState(() {
          _activeLat = newLat;
          _activeLng = newLng;
        });
        _loadFeed();
      }
    }
  }

  Future<void> _resolveLocationAndLoad() async {
    await _locationService.resolveLocation();
    if (mounted) {
      setState(() {
        _activeLat = widget.userLatitude ?? _locationService.latitude;
        _activeLng = widget.userLongitude ?? _locationService.longitude;
      });
      _loadFeed();
    }
  }

  Future<void> _loadFeed() async {
    setState(() {
      _isLoading = true;
    });

    final authService = AuthService.instance;
    final userId = authService.userId ?? authService.supabaseUser?.id;

    try {
      final reports = await _dbService.getCivicFeed(
        latitude: _activeLat,
        longitude: _activeLng,
        radiusKm: _selectedRadiusKm,
        category: _selectedCategory == 'All' ? null : _selectedCategory,
        statusFilter: _selectedStatus == 'All' ? null : _selectedStatus,
        userId: userId,
      );

      if (mounted) {
        setState(() {
          _feedItems = _sortReports(reports, _sortBy);
          _isLoading = false;
        });
      }
    } catch (e) {
      debugPrint('Error loading civic feed: $e');
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  List<ComprehensiveReportModel> _sortReports(
    List<ComprehensiveReportModel> items,
    String sortBy,
  ) {
    final list = List<ComprehensiveReportModel>.from(items);
    if (sortBy == 'most_supported') {
      list.sort((a, b) => b.supportCount.compareTo(a.supportCount));
    } else if (sortBy == 'recent') {
      list.sort((a, b) => b.createdAt.compareTo(a.createdAt));
    } else if (sortBy == 'nearby') {
      list.sort((a, b) {
        final distA = a.distanceMeters ?? 999999;
        final distB = b.distanceMeters ?? 999999;
        return distA.compareTo(distB);
      });
    }
    return list;
  }

  Future<void> _toggleSupport(ComprehensiveReportModel item) async {
    final authService = AuthService.instance;
    final userId = authService.userId ?? authService.supabaseUser?.id;

    if (userId == null || userId.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please log in to support civic issues.'),
          backgroundColor: Color(0xFFD92D20),
        ),
      );
      return;
    }

    final reportId = int.tryParse(item.id) ?? 0;
    if (reportId == 0) return;

    final currentlySupported = item.userHasSupported;
    final newCount = currentlySupported ? (item.supportCount - 1).clamp(0, 9999) : item.supportCount + 1;

    // Optimistic UI Update
    setState(() {
      _supportingReports.add(reportId);
      final index = _feedItems.indexWhere((r) => r.id == item.id);
      if (index != -1) {
        _feedItems[index] = item.copyWithSupport(
          supported: !currentlySupported,
          count: newCount,
        );
      }
    });

    final res = await _dbService.toggleReportSupport(
      reportId: reportId,
      userId: userId,
    );

    if (mounted) {
      setState(() {
        _supportingReports.remove(reportId);
        if (res['success'] == true) {
          final serverCount = res['total_supports'] as int? ?? newCount;
          final serverSupported = res['supported'] as bool? ?? !currentlySupported;
          final index = _feedItems.indexWhere((r) => r.id == item.id);
          if (index != -1) {
            _feedItems[index] = item.copyWithSupport(
              supported: serverSupported,
              count: serverCount,
            );
          }
        } else {
          // Rollback on failure
          final index = _feedItems.indexWhere((r) => r.id == item.id);
          if (index != -1) {
            _feedItems[index] = item;
          }
        }
      });

      if (res['success'] == true && !currentlySupported) {
        await CreditService.awardCreditsForReport(userId, item.id);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Row(
                children: [
                  const Icon(Icons.thumb_up_alt_rounded, color: Colors.white, size: 18),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text('Supported issue #${item.id}! +2 Civic Impact Points awarded.'),
                  ),
                ],
              ),
              backgroundColor: const Color(0xFF12B76A),
              duration: const Duration(seconds: 3),
            ),
          );
        }
      }
    }
  }

  void _openReportDetails(ComprehensiveReportModel item) {
    ComprehensiveTrackReportsScreen.showReportDetailsModal(
      context,
      item,
      onFeedbackSubmitted: () {
        _loadFeed();
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _feedItems.where((item) {
      final query = _searchController.text.trim().toLowerCase();
      if (query.isEmpty) return true;
      return item.title.toLowerCase().contains(query) ||
          item.description.toLowerCase().contains(query) ||
          item.location.toLowerCase().contains(query) ||
          (item.categoryDisplayName ?? '').toLowerCase().contains(query);
    }).toList();

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: const Color(0xFF123B63),
        foregroundColor: Colors.white,
        elevation: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              _languageService.getTranslation('civic_feed_title'),
              style: const TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w700,
                color: Colors.white,
              ),
            ),
            Text(
              _activeLat != null
                  ? '📍 Near ${_locationService.currentAreaLabel}'
                  : _languageService.getTranslation('nearby_issues'),
              style: const TextStyle(
                fontSize: 11,
                color: Color(0xFFCBD5E1),
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, size: 20),
            tooltip: 'Refresh feed',
            onPressed: _loadFeed,
          ),
        ],
      ),
      body: Column(
        children: [
          // 1. Location & Radius Control Bar
          _buildLocationRadiusBar(),

          // 2. Search & Sort Bar
          _buildSearchBar(),

          // 3. Category & Status Filter Strips
          _buildFilterStrips(),

          const Divider(height: 1, thickness: 1, color: Color(0xFFE2E8F0)),

          // 4. Feed List
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: Color(0xFF155EEF)))
                : filtered.isEmpty
                    ? _buildEmptyState()
                    : RefreshIndicator(
                        onRefresh: _loadFeed,
                        color: const Color(0xFF155EEF),
                        child: ListView.separated(
                          padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
                          itemCount: filtered.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 12),
                          itemBuilder: (context, index) {
                            return _buildFeedCard(filtered[index]);
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildLocationRadiusBar() {
    final hasGps = _activeLat != null && _activeLng != null;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: hasGps ? const Color(0xFFEFF8FF) : const Color(0xFFFFFBEB),
        border: Border(
          bottom: BorderSide(
            color: hasGps ? const Color(0xFFD1E9FF) : const Color(0xFFFDE68A),
          ),
        ),
      ),
      child: Row(
        children: [
          Icon(
            hasGps ? Icons.near_me_rounded : Icons.location_off_outlined,
            size: 16,
            color: hasGps ? const Color(0xFF155EEF) : const Color(0xFFD97706),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              hasGps
                  ? '${_locationService.currentAreaLabel} • ${_languageService.getTranslation('km_radius')}: ${_selectedRadiusKm >= 900 ? _languageService.getTranslation('city_wide') : "${_selectedRadiusKm.toInt()} km"}'
                  : _languageService.getTranslation('gps_off_showing_public'),
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: hasGps ? const Color(0xFF175CD3) : const Color(0xFFB45309),
              ),
            ),
          ),
          if (!hasGps)
            InkWell(
              onTap: _resolveLocationAndLoad,
              borderRadius: BorderRadius.circular(4),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                child: Text(
                  _languageService.getTranslation('enable_gps'),
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFFB45309),
                    decoration: TextDecoration.underline,
                  ),
                ),
              ),
            )
          else
            // Radius drop menu
            PopupMenuButton<double>(
              initialValue: _selectedRadiusKm,
              tooltip: 'Select search radius',
              onSelected: (radius) {
                setState(() {
                  _selectedRadiusKm = radius;
                });
                _loadFeed();
              },
              itemBuilder: (context) => _radii.map((r) {
                final label = r >= 900
                    ? '${_languageService.getTranslation('city_wide')} (${_languageService.getTranslation('filter_all')})'
                    : '${r.toInt()} ${_languageService.getTranslation('km_radius')}';
                return PopupMenuItem<double>(
                  value: r,
                  child: Row(
                    children: [
                      Icon(
                        r == _selectedRadiusKm ? Icons.radio_button_checked : Icons.radio_button_off,
                        size: 16,
                        color: r == _selectedRadiusKm ? const Color(0xFF155EEF) : Colors.grey,
                      ),
                      const SizedBox(width: 8),
                      Text(label, style: const TextStyle(fontSize: 13)),
                    ],
                  ),
                );
              }).toList(),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: const Color(0xFFB2DDFF)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      _selectedRadiusKm >= 900 ? _languageService.getTranslation('city_wide') : '${_selectedRadiusKm.toInt()} km',
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF155EEF),
                      ),
                    ),
                    const Icon(Icons.arrow_drop_down, size: 16, color: Color(0xFF155EEF)),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildSearchBar() {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 8),
      color: Colors.white,
      child: Column(
        children: [
          // Search Input
          Container(
            height: 40,
            decoration: BoxDecoration(
              color: const Color(0xFFF1F5F9),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: TextField(
              controller: _searchController,
              onChanged: (_) => setState(() {}),
              style: const TextStyle(fontSize: 13),
              decoration: InputDecoration(
                hintText: _languageService.getTranslation('search_feed_hint'),
                hintStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12.5),
                prefixIcon: const Icon(Icons.search_rounded, color: Color(0xFF64748B), size: 19),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear_rounded, size: 16),
                        onPressed: () {
                          _searchController.clear();
                          setState(() {});
                        },
                      )
                    : null,
                border: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(vertical: 9),
              ),
            ),
          ),
          const SizedBox(height: 8),
          // Sort Options
          Row(
            children: [
              _buildSortChip(_languageService.getTranslation('sort_most_supported'), 'most_supported', Icons.trending_up_rounded),
              const SizedBox(width: 6),
              _buildSortChip(_languageService.getTranslation('sort_recent'), 'recent', Icons.access_time_rounded),
              const SizedBox(width: 6),
              _buildSortChip(_languageService.getTranslation('sort_nearby'), 'nearby', Icons.near_me_rounded),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildFilterStrips() {
    final statusList = [
      {'key': 'All', 'label': _languageService.getTranslation('filter_all')},
      {'key': 'Active', 'label': _languageService.getTranslation('active_reports')},
      {'key': 'In Progress', 'label': _languageService.getTranslation('filter_in_progress')},
      {'key': 'Resolved', 'label': _languageService.getTranslation('filter_resolved')},
    ];

    return Container(
      color: Colors.white,
      padding: const EdgeInsets.only(bottom: 8),
      child: Column(
        children: [
          // 1. Status Filter Chips
          SizedBox(
            height: 30,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: statusList.length,
              separatorBuilder: (_, __) => const SizedBox(width: 6),
              itemBuilder: (context, index) {
                final item = statusList[index];
                final stKey = item['key']!;
                final stLabel = item['label']!;
                final isSelected = _selectedStatus == stKey;
                return ChoiceChip(
                  label: Text(stLabel),
                  selected: isSelected,
                  onSelected: (selected) {
                    if (selected) {
                      setState(() {
                        _selectedStatus = stKey;
                      });
                      _loadFeed();
                    }
                  },
                  selectedColor: const Color(0xFF155EEF),
                  backgroundColor: const Color(0xFFF1F5F9),
                  labelStyle: TextStyle(
                    color: isSelected ? Colors.white : const Color(0xFF475569),
                    fontSize: 10.5,
                    fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                  ),
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 0),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                );
              },
            ),
          ),
          const SizedBox(height: 6),
          // 2. Category Chips
          SizedBox(
            height: 32,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: _categories.length,
              separatorBuilder: (_, __) => const SizedBox(width: 6),
              itemBuilder: (context, index) {
                final cat = _categories[index];
                final isSelected = _selectedCategory == cat;
                return ChoiceChip(
                  label: Text(_getLocalizedCategoryName(cat)),
                  selected: isSelected,
                  onSelected: (selected) {
                    if (selected) {
                      setState(() {
                        _selectedCategory = cat;
                      });
                      _loadFeed();
                    }
                  },
                  selectedColor: const Color(0xFF155EEF),
                  backgroundColor: const Color(0xFFF1F5F9),
                  labelStyle: TextStyle(
                    color: isSelected ? Colors.white : const Color(0xFF475569),
                    fontSize: 11,
                    fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                  ),
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 0),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  String _getLocalizedCategoryName(String cat) {
    switch (cat) {
      case 'All':
        return _languageService.getTranslation('filter_all');
      case 'Roads & Potholes':
        return _languageService.getTranslation('cat_potholes_roads');
      case 'Water Supply':
        return _languageService.getTranslation('cat_water_drainage');
      case 'Drainage':
        return _languageService.getTranslation('cat_drainage_sewage');
      case 'Streetlights':
        return _languageService.getTranslation('cat_electricity_streetlights');
      case 'Garbage & Sanitation':
        return _languageService.getTranslation('cat_waste_management');
      case 'Public Safety':
        return _languageService.getTranslation('cat_safety_hazard');
      case 'Parks & Trees':
        return _languageService.getTranslation('cat_parks_trees');
      default:
        return cat;
    }
  }

  Widget _buildSortChip(String label, String value, IconData icon) {
    final isSelected = _sortBy == value;
    return GestureDetector(
      onTap: () {
        setState(() {
          _sortBy = value;
          _feedItems = _sortReports(_feedItems, value);
        });
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFFEFF8FF) : Colors.transparent,
          borderRadius: BorderRadius.circular(6),
          border: Border.all(
            color: isSelected ? const Color(0xFF155EEF) : const Color(0xFFCBD5E1),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 12,
              color: isSelected ? const Color(0xFF155EEF) : const Color(0xFF64748B),
            ),
            const SizedBox(width: 3),
            Text(
              label,
              style: TextStyle(
                fontSize: 10.5,
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                color: isSelected ? const Color(0xFF155EEF) : const Color(0xFF64748B),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFeedCard(ComprehensiveReportModel item) {
    final reportId = int.tryParse(item.id) ?? 0;
    final isSupporting = _supportingReports.contains(reportId);
    final hasSupported = item.userHasSupported;
    final isHighImpact = item.supportCount >= 5;

    final displayTitle = item.title.isNotEmpty ? item.title : 'Grievance #${item.id}';
    final displayDescription = item.description.trim().isNotEmpty
        ? item.description.trim()
        : 'No description provided.';
    final displayLocation = item.location.trim().isNotEmpty
        ? item.location.trim()
        : 'Location registered via GPS';

    final priorityColor = _getPriorityColor(item.priority);

    return InkWell(
      onTap: () => _openReportDetails(item),
      borderRadius: BorderRadius.circular(12),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFE2E8F0)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.03),
              blurRadius: 6,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Padding(
          padding: const EdgeInsets.all(14.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 1. Top Row: Category badge + Priority badge + Status badge
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEFF8FF),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: const Color(0xFFB2DDFF)),
                    ),
                    child: Text(
                      item.categoryDisplayName ?? item.category,
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF175CD3),
                      ),
                    ),
                  ),
                  const SizedBox(width: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: priorityColor.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      item.priority.displayName.toUpperCase(),
                      style: TextStyle(
                        fontSize: 9.5,
                        fontWeight: FontWeight.w700,
                        color: priorityColor,
                      ),
                    ),
                  ),
                  const Spacer(),
                  _buildStatusBadge(item.statusDisplay),
                ],
              ),
              const SizedBox(height: 10),

              // 2. Title / Problem Header
              Text(
                displayTitle,
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF0F172A),
                  height: 1.25,
                ),
              ),
              const SizedBox(height: 5),

              // 3. Citizen Description
              Text(
                displayDescription,
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 12.5,
                  color: item.description.trim().isNotEmpty
                      ? const Color(0xFF334155)
                      : const Color(0xFF94A3B8),
                  height: 1.38,
                ),
              ),
              const SizedBox(height: 10),

              // 4. Location & Distance
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.location_on, size: 14, color: Color(0xFF64748B)),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        displayLocation,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w500,
                          color: Color(0xFF475569),
                        ),
                      ),
                    ),
                    if (item.distanceMeters != null) ...[
                      const SizedBox(width: 6),
                      Text(
                        item.distanceMeters! < 1000
                            ? '${item.distanceMeters!.toStringAsFixed(0)} m away'
                            : '${(item.distanceMeters! / 1000).toStringAsFixed(1)} km away',
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF155EEF),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 12),

              // 5. Bottom Actions: Support Button + High Impact Badge + Date
              Row(
                children: [
                  // Support Button
                  ElevatedButton.icon(
                    onPressed: isSupporting ? null : () => _toggleSupport(item),
                    icon: isSupporting
                        ? const SizedBox(
                            width: 12,
                            height: 12,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          )
                        : Icon(
                            hasSupported ? Icons.check_circle_rounded : Icons.thumb_up_alt_rounded,
                            size: 14,
                          ),
                    label: Text(
                      hasSupported
                          ? '${_languageService.getTranslation('supported')} (${item.supportCount})'
                          : '${_languageService.getTranslation('support_issue')} (${item.supportCount})',
                      style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: hasSupported ? const Color(0xFF12B76A) : const Color(0xFF155EEF),
                      foregroundColor: Colors.white,
                      elevation: 0,
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                    ),
                  ),
                  if (isHighImpact) ...[
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFEF3F2),
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: const Color(0xFFFECDCA)),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.local_fire_department_rounded, size: 12, color: Color(0xFFD92D20)),
                          const SizedBox(width: 3),
                          Text(
                            _languageService.getTranslation('priority_high'),
                            style: const TextStyle(
                              fontSize: 9.5,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFFD92D20),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                  const Spacer(),
                  Text(
                    item.submittedTime,
                    style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatusBadge(String status) {
    Color bg = const Color(0xFFF1F5F9);
    Color text = const Color(0xFF475569);

    final s = status.toLowerCase();
    if (s.contains('resolved') || s.contains('closed') || s.contains('verified')) {
      bg = const Color(0xFFECFDF3);
      text = const Color(0xFF027A48);
    } else if (s.contains('progress')) {
      bg = const Color(0xFFEFF8FF);
      text = const Color(0xFF175CD3);
    } else if (s.contains('review') || s.contains('assigned')) {
      bg = const Color(0xFFFFF6ED);
      text = const Color(0xFFC4320A);
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        status,
        style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w600, color: text),
      ),
    );
  }

  Color _getPriorityColor(ReportPriority priority) {
    switch (priority) {
      case ReportPriority.high:
        return const Color(0xFFDC2626);
      case ReportPriority.medium:
        return const Color(0xFFD97706);
      case ReportPriority.low:
        return const Color(0xFF2563EB);
    }
  }

  Widget _buildEmptyState() {
    final isRadiusRestricted = _selectedRadiusKm < 500 && _activeLat != null;

    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: const BoxDecoration(
                color: Color(0xFFF1F5F9),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.mark_chat_unread_outlined,
                size: 38,
                color: Color(0xFF64748B),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              isRadiusRestricted
                  ? '${_languageService.getTranslation('no_reports_yet')} (${_selectedRadiusKm.toInt()} km)'
                  : _languageService.getTranslation('no_matching_complaints'),
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: Color(0xFF0F172A),
              ),
            ),
            const SizedBox(height: 6),
            Text(
              isRadiusRestricted
                  ? _languageService.getTranslation('try_changing_filters')
                  : _languageService.getTranslation('no_reports_desc'),
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 13, color: Color(0xFF64748B), height: 1.4),
            ),
            const SizedBox(height: 18),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                if (isRadiusRestricted)
                  OutlinedButton.icon(
                    onPressed: () {
                      setState(() {
                        _selectedRadiusKm = 999.0;
                      });
                      _loadFeed();
                    },
                    icon: const Icon(Icons.travel_explore_rounded, size: 16),
                    label: Text(_languageService.getTranslation('city_wide')),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFF155EEF),
                      side: const BorderSide(color: Color(0xFF155EEF)),
                    ),
                  ),
                if (isRadiusRestricted) const SizedBox(width: 10),
                ElevatedButton.icon(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => const CategorySelectionScreen(),
                      ),
                    );
                  },
                  icon: const Icon(Icons.add_circle_outline, size: 16),
                  label: Text(_languageService.getTranslation('register_new_grievance')),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF155EEF),
                    foregroundColor: Colors.white,
                    elevation: 0,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
