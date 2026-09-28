import 'package:flutter/material.dart';
import 'dart:async';
import 'comprehensive_database_service.dart';
import 'comprehensive_report_models.dart';
import 'auth_service.dart';
import 'language_service.dart';
import 'credit_service.dart';

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
  final TextEditingController _searchController = TextEditingController();

  List<ComprehensiveReportModel> _feedItems = [];
  bool _isLoading = true;
  String _selectedCategory = 'All';
  String _sortBy = 'most_supported'; // 'most_supported', 'recent', 'nearby'
  final Set<int> _supportingReports = {}; // loading state for support buttons

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

  @override
  void initState() {
    super.initState();
    _languageService.addListener(_onLanguageChanged);
    _loadFeed();
  }

  @override
  void dispose() {
    _searchController.dispose();
    _languageService.removeListener(_onLanguageChanged);
    super.dispose();
  }

  void _onLanguageChanged() {
    setState(() {});
  }

  Future<void> _loadFeed() async {
    setState(() {
      _isLoading = true;
    });

    final authService = AuthService.instance;
    final userId = authService.userId ?? authService.supabaseUser?.id;

    try {
      final reports = await _dbService.getCivicFeed(
        latitude: widget.userLatitude,
        longitude: widget.userLongitude,
        radiusKm: 25.0,
        category: _selectedCategory == 'All' ? null : _selectedCategory,
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
        // Award green credits on first support
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
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Local Civic Feed',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: Colors.white,
              ),
            ),
            Text(
              'Discover & support neighborhood issues',
              style: TextStyle(
                fontSize: 11,
                color: Color(0xFFCBD5E1),
              ),
            ),
          ],
        ),
      ),
      body: Column(
        children: [
          // 1. Search & Sort Bar
          Container(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            color: Colors.white,
            child: Column(
              children: [
                // Search Input
                Container(
                  height: 42,
                  decoration: BoxDecoration(
                    color: const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: TextField(
                    controller: _searchController,
                    onChanged: (_) => setState(() {}),
                    style: const TextStyle(fontSize: 13.5),
                    decoration: InputDecoration(
                      hintText: 'Search local grievances, wards, streets...',
                      hintStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
                      prefixIcon: const Icon(Icons.search_rounded, color: Color(0xFF64748B), size: 20),
                      suffixIcon: _searchController.text.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.clear_rounded, size: 18),
                              onPressed: () {
                                _searchController.clear();
                                setState(() {});
                              },
                            )
                          : null,
                      border: InputBorder.none,
                      contentPadding: const EdgeInsets.symmetric(vertical: 10),
                    ),
                  ),
                ),
                const SizedBox(height: 10),
                // Sort Tabs
                Row(
                  children: [
                    const Text(
                      'Sort by:',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF64748B),
                      ),
                    ),
                    const SizedBox(width: 8),
                    _buildSortChip('Most Supported', 'most_supported', Icons.trending_up_rounded),
                    const SizedBox(width: 6),
                    _buildSortChip('Recent', 'recent', Icons.access_time_rounded),
                    const SizedBox(width: 6),
                    _buildSortChip('Nearby', 'nearby', Icons.near_me_rounded),
                  ],
                ),
              ],
            ),
          ),

          // 2. Category Filter Strip
          Container(
            height: 46,
            color: Colors.white,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              itemCount: _categories.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (context, index) {
                final cat = _categories[index];
                final isSelected = _selectedCategory == cat;
                return ChoiceChip(
                  label: Text(cat),
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
                    fontSize: 12,
                    fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                  ),
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                );
              },
            ),
          ),
          const Divider(height: 1, thickness: 1, color: Color(0xFFE2E8F0)),

          // 3. Feed List
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: Color(0xFF155EEF)))
                : filtered.isEmpty
                    ? _buildEmptyState()
                    : RefreshIndicator(
                        onRefresh: _loadFeed,
                        color: const Color(0xFF155EEF),
                        child: ListView.separated(
                          padding: const EdgeInsets.all(16),
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
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
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
              size: 13,
              color: isSelected ? const Color(0xFF155EEF) : const Color(0xFF64748B),
            ),
            const SizedBox(width: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
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
    final isHighImpact = item.supportCount >= 10;

    return Container(
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
            // Top Row: Category badge + Distance + Status
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
                    item.categoryDisplayName ?? 'Grievance',
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF175CD3),
                    ),
                  ),
                ),
                if (item.distanceMeters != null) ...[
                  const SizedBox(width: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.location_on, size: 11, color: Color(0xFF64748B)),
                        const SizedBox(width: 2),
                        Text(
                          item.distanceMeters! < 1000
                              ? '${item.distanceMeters!.toStringAsFixed(0)}m'
                              : '${(item.distanceMeters! / 1000).toStringAsFixed(1)}km',
                          style: const TextStyle(
                            fontSize: 10.5,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF475569),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
                const Spacer(),
                _buildStatusBadge(item.statusDisplay),
              ],
            ),
            const SizedBox(height: 8),

            // Title & ID
            Text(
              item.title.isNotEmpty ? item.title : 'Grievance #${item.id}',
              style: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w700,
                color: Color(0xFF0F172A),
                height: 1.25,
              ),
            ),
            if (item.description.isNotEmpty) ...[
              const SizedBox(height: 4),
              Text(
                item.description,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 12.5,
                  color: Color(0xFF475569),
                  height: 1.35,
                ),
              ),
            ],
            const SizedBox(height: 8),

            // Location
            Row(
              children: [
                const Icon(Icons.pin_drop_outlined, size: 14, color: Color(0xFF64748B)),
                const SizedBox(width: 4),
                Expanded(
                  child: Text(
                    item.location,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 11.5,
                      color: Color(0xFF64748B),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Bottom Actions: Support Button + High Impact Badge + Time
            Row(
              children: [
                // Support Button
                ElevatedButton.icon(
                  onPressed: isSupporting ? null : () => _toggleSupport(item),
                  icon: isSupporting
                      ? const SizedBox(
                          width: 14,
                          height: 14,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : Icon(
                          hasSupported ? Icons.check_circle_rounded : Icons.thumb_up_alt_rounded,
                          size: 15,
                        ),
                  label: Text(
                    hasSupported
                        ? 'Supported (${item.supportCount})'
                        : 'Support (${item.supportCount})',
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: hasSupported ? const Color(0xFF12B76A) : const Color(0xFF155EEF),
                    foregroundColor: Colors.white,
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),
                if (isHighImpact) ...[
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEF3F2),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: const Color(0xFFFECDCA)),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.local_fire_department_rounded, size: 12, color: Color(0xFFD92D20)),
                        SizedBox(width: 3),
                        Text(
                          'Community Priority',
                          style: TextStyle(
                            fontSize: 10,
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
    );
  }

  Widget _buildStatusBadge(String status) {
    Color bg = const Color(0xFFF1F5F9);
    Color text = const Color(0xFF475569);

    final s = status.toLowerCase();
    if (s.contains('resolved') || s.contains('closed')) {
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

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
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
                size: 40,
                color: Color(0xFF64748B),
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'No Civic Issues in this Category',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: Color(0xFF0F172A),
              ),
            ),
            const SizedBox(height: 6),
            const Text(
              'Check other categories or report a new problem in your area.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13, color: Color(0xFF64748B)),
            ),
          ],
        ),
      ),
    );
  }
}
