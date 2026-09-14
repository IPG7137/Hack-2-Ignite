import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'dart:async';
import 'dart:convert';
import 'package:webview_flutter/webview_flutter.dart';
import 'comprehensive_database_service.dart';
import 'comprehensive_report_models.dart';
import 'admin_actions_screen.dart';
import 'auth_service.dart';
import 'language_service.dart';
import 'dashboard_screen.dart';
import 'priority_engine.dart';
import 'leaflet_map_service.dart';

class ComprehensiveTrackReportsScreen extends StatefulWidget {
  const ComprehensiveTrackReportsScreen({super.key});

  @override
  State<ComprehensiveTrackReportsScreen> createState() => _ComprehensiveTrackReportsScreenState();
}

class _ComprehensiveTrackReportsScreenState extends State<ComprehensiveTrackReportsScreen> 
    with TickerProviderStateMixin {
  final LanguageService _languageService = LanguageService();
  final ComprehensiveDatabaseService _databaseService = ComprehensiveDatabaseService();
  final _searchController = TextEditingController();
  
  late AnimationController _animationController;
  late AnimationController _staggerController;
  late Animation<double> _fadeAnimation;
  late Animation<Offset> _slideAnimation;
  
  String _selectedFilter = 'All';
  String _sortBy = 'Newest';
  String _searchQuery = '';
  bool _isLoading = true;
  bool _hasError = false;
  String _errorMessage = '';
  bool _isAdmin = false;

  List<ComprehensiveReportModel> _allReports = [];
  List<ComprehensiveReportModel> _filteredReports = [];
  
  // Caching and performance optimization
  List<ComprehensiveReportModel> _cachedReports = [];
  DateTime? _lastCacheTime;
  StreamSubscription<List<ComprehensiveReportModel>>? _reportsSubscription;
  
  Timer? _searchDebounceTimer;
  bool _isRefreshing = false;
  bool _hasInitialLoad = false;
  final Duration _cacheValidDuration = const Duration(minutes: 5);

  @override
  void initState() {
    super.initState();
    _languageService.addListener(_onLanguageChanged);
    _initializeAnimations();
    _checkAdminStatus();
    _initializeReportsStream();
  }

  @override
  void dispose() {
    _languageService.removeListener(_onLanguageChanged);
    _reportsSubscription?.cancel();
    _searchDebounceTimer?.cancel();
    _animationController.dispose();
    _staggerController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  void _initializeAnimations() {
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 600),
      vsync: this,
    );
    
    _staggerController = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );

    _fadeAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _animationController,
      curve: Curves.easeInOut,
    ));

    _slideAnimation = Tween<Offset>(
      begin: const Offset(0, 0.1),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _staggerController,
      curve: Curves.easeOutCubic,
    ));

    _animationController.forward();
    _staggerController.forward();
  }

  void _checkAdminStatus() {
    final authService = AuthService.instance;
    setState(() {
      _isAdmin = authService.isAdmin;
    });
  }

  void _initializeReportsStream() {
    final authService = AuthService.instance;
    final userId = authService.userId ?? authService.supabaseUser?.id ?? '';
    
    print('⚡ Initializing citizen reports stream for user: $userId (Admin: $_isAdmin)');
    
    setState(() {
      _isLoading = true;
      _hasError = false;
      _errorMessage = '';
    });
    
    if (!_isAdmin && userId.isEmpty) {
      print('ℹ️ No authenticated user for citizen track reports stream, skipping subscription');
      setState(() {
        _allReports = [];
        _filteredReports = [];
        _isLoading = false;
        _hasError = false;
        _errorMessage = '';
        _hasInitialLoad = true;
      });
      return;
    }

    // Check cached data first
    if (_hasValidCachedData() && !_isRefreshing) {
      setState(() {
        _allReports = _cachedReports;
        _applyFiltersAndSearch();
        _isLoading = false;
        _hasError = false;
        _errorMessage = '';
        _hasInitialLoad = true;
      });
      _animationController.forward();
      _staggerController.forward();
      _fetchFreshDataInBackground(userId);
      return;
    }
    
    // Cancel existing subscription
    _reportsSubscription?.cancel();
    
    try {
      Stream<List<ComprehensiveReportModel>> reportsStream;
      
      if (_isAdmin) {
        reportsStream = _databaseService.getAllReportsStream();
      } else {
        reportsStream = _databaseService.getUserReportsStream(userId);
      }
      
      _reportsSubscription = reportsStream
          .timeout(
            const Duration(seconds: 10),
            onTimeout: (sink) {
              sink.addError('Connection timeout. Please check your internet connection.');
            },
          )
          .listen(
            (reports) {
              if (mounted) {
                // Detect status changes for real-time citizen notifications
                _detectAndHandleStatusChanges(reports);
                
                setState(() {
                  _allReports = reports;
                  _applyFiltersAndSearch();
                  _isLoading = false;
                  _hasError = false;
                  _errorMessage = '';
                  _hasInitialLoad = true;
                  _isRefreshing = false;
                });
                
                _animationController.forward();
                _staggerController.forward();
                _cacheReportsDataSmart(reports);
              }
            },
            onError: (error) {
              print('❌ Reports stream error: $error');
              if (mounted) {
                setState(() {
                  _hasError = !_hasValidCachedData();
                  _errorMessage = _formatErrorMessage(error);
                  _isLoading = false;
                  _isRefreshing = false;
                });
                
                if (_hasValidCachedData()) {
                  _loadCachedDataSmart();
                }
              }
            },
            cancelOnError: false,
          );
    } catch (e) {
      print('❌ Error initializing reports stream: $e');
      if (mounted) {
        setState(() {
          _hasError = !_hasValidCachedData();
          _errorMessage = 'Unable to connect to server. Pull to refresh.';
          _isLoading = false;
          _isRefreshing = false;
        });
        
        if (_hasValidCachedData()) {
          _loadCachedDataSmart();
        }
      }
    }
  }

  bool _hasValidCachedData() {
    if (_cachedReports.isEmpty || _lastCacheTime == null) return false;
    final now = DateTime.now();
    final cacheAge = now.difference(_lastCacheTime!);
    return cacheAge < _cacheValidDuration;
  }

  Future<void> _fetchFreshDataInBackground(String userId) async {
    try {
      final freshReports = _isAdmin 
          ? await _databaseService.getAllReportsComprehensive()
          : await _databaseService.getUserReportsComprehensive(userId);
      
      if (mounted && freshReports.isNotEmpty) {
        if (!_listsAreEqual(_allReports, freshReports)) {
          setState(() {
            _allReports = freshReports;
            _applyFiltersAndSearch();
          });
          _cacheReportsDataSmart(freshReports);
        }
      }
    } catch (e) {
      print('Background refresh: $e');
    }
  }

  Future<void> _cacheReportsDataSmart(List<ComprehensiveReportModel> reports) async {
    try {
      _cachedReports = List.from(reports);
      _lastCacheTime = DateTime.now();
    } catch (e) {
      print('Failed to cache reports: $e');
    }
  }

  Future<void> _loadCachedDataSmart() async {
    try {
      if (_cachedReports.isNotEmpty) {
        setState(() {
          _allReports = _cachedReports;
          _applyFiltersAndSearch();
          _hasInitialLoad = true;
        });
      }
    } catch (e) {
      print('Error loading cached data: $e');
    }
  }

  bool _listsAreEqual(List<ComprehensiveReportModel> list1, List<ComprehensiveReportModel> list2) {
    if (list1.length != list2.length) return false;
    for (int i = 0; i < list1.length; i++) {
      if (list1[i].id != list2[i].id || list1[i].status != list2[i].status) {
        return false;
      }
    }
    return true;
  }

  /// Detect and handle status changes in real-time from Supabase
  void _detectAndHandleStatusChanges(List<ComprehensiveReportModel> newReports) {
    if (_allReports.isEmpty) return; // Initial load
    
    final oldReportsMap = {for (var report in _allReports) report.id: report};
    
    for (var newReport in newReports) {
      final oldReport = oldReportsMap[newReport.id];
      if (oldReport != null) {
        if (oldReport.status != newReport.status) {
          _handleStatusChange(oldReport, newReport);
        }
      }
    }
  }

  /// Show citizen-focused in-app notification when complaint status changes
  void _handleStatusChange(ComprehensiveReportModel oldReport, ComprehensiveReportModel newReport) {
    print('🔄 Real-time status update: #${newReport.id} [${oldReport.status.displayName} -> ${newReport.status.displayName}]');
    
    HapticFeedback.mediumImpact();
    
    if (mounted) {
      String statusHeadline;
      String statusMessage;
      
      switch (newReport.status) {
        case ReportStatus.submitted:
          statusHeadline = 'Complaint Registered';
          statusMessage = 'Your complaint #${newReport.id} is registered in the civic system.';
          break;
        case ReportStatus.review:
        case ReportStatus.under_review:
          statusHeadline = 'Under Review';
          statusMessage = 'Grievance cell is reviewing complaint #${newReport.id}.';
          break;
        case ReportStatus.assigned:
          statusHeadline = 'Department Assigned';
          statusMessage = 'Complaint #${newReport.id} has been assigned for field action.';
          break;
        case ReportStatus.progress:
        case ReportStatus.in_progress:
          statusHeadline = 'Field Work In Progress';
          statusMessage = 'Municipal maintenance crew is working on complaint #${newReport.id}.';
          break;
        case ReportStatus.resolution_submitted:
          statusHeadline = 'Resolution Submitted';
          statusMessage = 'Field officer submitted proof of resolution for complaint #${newReport.id}.';
          break;
        case ReportStatus.resolved:
        case ReportStatus.verified:
        case ReportStatus.closed:
          statusHeadline = 'Complaint Resolved';
          statusMessage = 'Your complaint #${newReport.id} has been resolved and verified!';
          break;
        case ReportStatus.rejected:
          statusHeadline = 'Complaint Closed/Rejected';
          statusMessage = 'Your complaint #${newReport.id} was reviewed and closed.';
          break;
      }

      final statusColor = _getStatusColor(newReport.status);

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.2),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  _getStatusIcon(newReport.status),
                  color: Colors.white,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      statusHeadline,
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      statusMessage,
                      style: const TextStyle(
                        fontSize: 12,
                        color: Colors.white,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
            ],
          ),
          backgroundColor: statusColor,
          duration: const Duration(seconds: 5),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      );
    }
  }

  IconData _getStatusIcon(ReportStatus status) {
    switch (status) {
      case ReportStatus.submitted:
        return Icons.check_circle_outline;
      case ReportStatus.review:
      case ReportStatus.under_review:
        return Icons.rate_review_outlined;
      case ReportStatus.assigned:
        return Icons.engineering_outlined;
      case ReportStatus.progress:
      case ReportStatus.in_progress:
        return Icons.hourglass_bottom_outlined;
      case ReportStatus.resolution_submitted:
        return Icons.task_alt_outlined;
      case ReportStatus.resolved:
      case ReportStatus.verified:
      case ReportStatus.closed:
        return Icons.verified_outlined;
      case ReportStatus.rejected:
        return Icons.cancel_outlined;
    }
  }

  String _formatErrorMessage(dynamic error) {
    String errorString = error.toString().toLowerCase();
    if (errorString.contains('timeout')) {
      return 'Connection timeout. Pull down to refresh.';
    } else if (errorString.contains('network') || errorString.contains('connection')) {
      return 'Network unavailable. Showing last available data.';
    } else {
      return 'Live updates temporarily unavailable. Pull to refresh.';
    }
  }

  Future<void> _refreshData() async {
    if (_isRefreshing) return;
    
    setState(() {
      _isRefreshing = true;
    });
    
    try {
      _initializeReportsStream();
      await Future.delayed(const Duration(milliseconds: 600));
    } catch (e) {
      print('Refresh error: $e');
    } finally {
      if (mounted) {
        setState(() {
          _isRefreshing = false;
        });
      }
    }
  }

  void _onLanguageChanged() {
    setState(() {});
  }

  void _applyFiltersAndSearch() {
    _searchDebounceTimer?.cancel();
    _searchDebounceTimer = Timer(const Duration(milliseconds: 150), () {
      _performFilteringAndSearch();
    });
  }

  void _performFilteringAndSearch() {
    if (!mounted) return;
    
    List<ComprehensiveReportModel> filtered = List.from(_allReports);

    if (_searchQuery.isNotEmpty) {
      final searchLower = _searchQuery.toLowerCase();
      filtered = filtered.where((report) {
        if (report.id.toLowerCase().contains(searchLower)) return true;
        if (report.title.toLowerCase().contains(searchLower)) return true;
        if (report.description.toLowerCase().contains(searchLower)) return true;
        if (report.location.toLowerCase().contains(searchLower)) return true;
        return report.categoryDisplayName?.toLowerCase().contains(searchLower) ?? false;
      }).toList();
    }

    if (_selectedFilter != 'All') {
      switch (_selectedFilter) {
        case 'Submitted':
          filtered = filtered.where((r) => r.status == ReportStatus.submitted).toList();
          break;
        case 'Under Review':
        case 'Review':
          filtered = filtered.where((r) => r.status == ReportStatus.review).toList();
          break;
        case 'Assigned':
          filtered = filtered.where((r) => r.status == ReportStatus.assigned).toList();
          break;
        case 'In Progress':
        case 'Progress':
          filtered = filtered.where((r) => r.status == ReportStatus.progress).toList();
          break;
        case 'Resolved':
          filtered = filtered.where((r) => r.status == ReportStatus.resolved).toList();
          break;
        case 'High Priority':
          filtered = filtered.where((r) => r.priority == ReportPriority.high).toList();
          break;
      }
    }

    switch (_sortBy) {
      case 'Newest':
        filtered.sort((a, b) => b.createdAt.compareTo(a.createdAt));
        break;
      case 'Oldest':
        filtered.sort((a, b) => a.createdAt.compareTo(b.createdAt));
        break;
      case 'Priority':
        filtered.sort((a, b) => _getPriorityWeight(b.priority).compareTo(_getPriorityWeight(a.priority)));
        break;
      case 'Status':
        filtered.sort((a, b) => a.status.displayName.compareTo(b.status.displayName));
        break;
    }

    if (!_listsAreEqualSimple(_filteredReports, filtered)) {
      setState(() {
        _filteredReports = filtered;
      });
    }
  }

  bool _listsAreEqualSimple(List<ComprehensiveReportModel> list1, List<ComprehensiveReportModel> list2) {
    if (list1.length != list2.length) return false;
    for (int i = 0; i < list1.length; i++) {
      if (list1[i].id != list2[i].id) return false;
    }
    return true;
  }

  int _getPriorityWeight(ReportPriority priority) {
    switch (priority) {
      case ReportPriority.high:
        return 3;
      case ReportPriority.medium:
        return 2;
      case ReportPriority.low:
        return 1;
    }
  }

  void _onSearchChanged(String value) {
    setState(() {
      _searchQuery = value;
    });
    _applyFiltersAndSearch();
  }

  void _onFilterChanged(String? value) {
    if (value != null) {
      setState(() {
        _selectedFilter = value;
      });
      _applyFiltersAndSearch();
    }
  }

  void _onSortChanged(String? value) {
    if (value != null) {
      setState(() {
        _sortBy = value;
      });
      _applyFiltersAndSearch();
    }
  }

  Future<void> _openReportDetails(ComprehensiveReportModel report) async {
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _ReportDetailsBottomSheet(
        report: report,
        databaseService: _databaseService,
        isAdmin: _isAdmin,
        onFeedbackSubmitted: () {
          _initializeReportsStream();
        },
      ),
    );
  }

  Future<void> _openAdminActions(ComprehensiveReportModel report) async {
    final result = await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => AdminActionsScreen(report: report),
      ),
    );

    if (result == true) {
      _initializeReportsStream();
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: _buildAppBar(colorScheme),
      body: _buildBody(colorScheme),
      floatingActionButton: _buildFloatingActionButton(colorScheme),
    );
  }

  PreferredSizeWidget _buildAppBar(ColorScheme colorScheme) {
    return AppBar(
      title: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            _isAdmin ? 'Municipal Tracking (Admin)' : 'Track My Complaints',
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
          ),
          Text(
            _isAdmin ? 'Live municipal dispatch & oversight' : 'Real-time municipal action status',
            style: TextStyle(
              fontSize: 11,
              color: colorScheme.onPrimary.withOpacity(0.8),
            ),
          ),
        ],
      ),
      backgroundColor: const Color(0xFF1E3A8A), // Deep Government Navy
      foregroundColor: Colors.white,
      elevation: 1,
      actions: [
        IconButton(
          icon: const Icon(Icons.refresh),
          tooltip: 'Refresh tracking data',
          onPressed: () => _refreshData(),
        ),
      ],
    );
  }

  Widget _buildBody(ColorScheme colorScheme) {
    return Column(
      children: [
        _buildSearchAndFilters(colorScheme),
        _buildReportsCount(colorScheme),
        Expanded(
          child: _buildContentArea(colorScheme),
        ),
      ],
    );
  }

  Widget _buildContentArea(ColorScheme colorScheme) {
    if (_isLoading && !_hasInitialLoad) {
      return _buildEnhancedLoadingState(colorScheme);
    }

    if (_hasError && _allReports.isEmpty) {
      return _buildErrorState(colorScheme);
    }

    if (_filteredReports.isEmpty && !_isLoading) {
      return _buildEmptyState(colorScheme);
    }

    return _buildReportsList(colorScheme);
  }

  Widget _buildEnhancedLoadingState(ColorScheme colorScheme) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 14),
            decoration: BoxDecoration(
              color: const Color(0xFFEFF6FF),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: const Color(0xFFBFDBFE)),
            ),
            child: const Row(
              children: [
                SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF1E3A8A)),
                ),
                SizedBox(width: 10),
                Text(
                  'Syncing live status from municipal system...',
                  style: TextStyle(
                    color: Color(0xFF1E3A8A),
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Expanded(
            child: ListView.builder(
              itemCount: 4,
              itemBuilder: (context, index) => _buildSkeletonCard(colorScheme),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSkeletonCard(ColorScheme colorScheme) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: Colors.grey.shade200),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 90,
                  height: 22,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade200,
                    borderRadius: BorderRadius.circular(6),
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  width: 60,
                  height: 22,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade200,
                    borderRadius: BorderRadius.circular(6),
                  ),
                ),
                const Spacer(),
                Container(
                  width: 70,
                  height: 22,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade200,
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Container(
              width: 220,
              height: 16,
              color: Colors.grey.shade200,
            ),
            const SizedBox(height: 8),
            Container(
              width: double.infinity,
              height: 12,
              color: Colors.grey.shade100,
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Container(width: 14, height: 14, color: Colors.grey.shade200),
                const SizedBox(width: 6),
                Container(width: 120, height: 12, color: Colors.grey.shade100),
                const Spacer(),
                Container(width: 80, height: 12, color: Colors.grey.shade100),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildErrorState(ColorScheme colorScheme) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.amber.shade50,
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.cloud_off_outlined,
                size: 48,
                color: Colors.amber.shade800,
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'Live updates temporarily unavailable',
              style: TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.bold,
                color: Color(0xFF1E293B),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              _errorMessage.isNotEmpty ? _errorMessage : 'Please pull down to refresh or check your connection.',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: Colors.grey.shade600,
                fontSize: 13,
              ),
            ),
            const SizedBox(height: 20),
            ElevatedButton.icon(
              onPressed: () => _initializeReportsStream(),
              icon: const Icon(Icons.refresh, size: 18),
              label: const Text('Try Again'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF1E3A8A),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSearchAndFilters(ColorScheme colorScheme) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          TextField(
            controller: _searchController,
            decoration: InputDecoration(
              hintText: 'Search by ID (#CR-...), title, location...',
              hintStyle: TextStyle(fontSize: 13, color: Colors.grey.shade400),
              prefixIcon: Icon(Icons.search, size: 20, color: Colors.grey.shade600),
              suffixIcon: _searchQuery.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear, size: 18),
                      onPressed: () {
                        _searchController.clear();
                        _onSearchChanged('');
                      },
                    )
                  : null,
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              isDense: true,
              filled: true,
              fillColor: const Color(0xFFF1F5F9),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: BorderSide.none,
              ),
            ),
            onChanged: _onSearchChanged,
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                flex: 3,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.grey.shade300),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      value: _selectedFilter,
                      isExpanded: true,
                      icon: const Icon(Icons.arrow_drop_down, size: 20),
                      style: const TextStyle(fontSize: 13, color: Color(0xFF1E293B)),
                      items: [
                        'All',
                        'Submitted',
                        'Under Review',
                        'Assigned',
                        'In Progress',
                        'Resolved',
                        'High Priority',
                      ].map((String value) {
                        return DropdownMenuItem<String>(
                          value: value,
                          child: Text(value),
                        );
                      }).toList(),
                      onChanged: _onFilterChanged,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                flex: 2,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.grey.shade300),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      value: _sortBy,
                      isExpanded: true,
                      icon: const Icon(Icons.sort, size: 18),
                      style: const TextStyle(fontSize: 13, color: Color(0xFF1E293B)),
                      items: ['Newest', 'Oldest', 'Priority', 'Status'].map((String value) {
                        return DropdownMenuItem<String>(
                          value: value,
                          child: Text(value),
                        );
                      }).toList(),
                      onChanged: _onSortChanged,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildReportsCount(ColorScheme colorScheme) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      alignment: Alignment.centerLeft,
      child: Row(
        children: [
          Text(
            '${_filteredReports.length} ${_filteredReports.length == 1 ? 'complaint' : 'complaints'} found',
            style: TextStyle(
              color: Colors.grey.shade700,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
          const Spacer(),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(
              color: const Color(0xFFE2E8F0),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(
              children: [
                Container(
                  width: 6,
                  height: 6,
                  decoration: const BoxDecoration(
                    color: Color(0xFF10B981),
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 4),
                const Text(
                  'Live Sync',
                  style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF334155)),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState(ColorScheme colorScheme) {
    final isSearching = _searchQuery.isNotEmpty || _selectedFilter != 'All';
    
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: const BoxDecoration(
                color: Color(0xFFEFF6FF),
                shape: BoxShape.circle,
              ),
              child: Icon(
                isSearching ? Icons.search_off : Icons.inbox_outlined,
                size: 48,
                color: const Color(0xFF1E3A8A),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              isSearching ? 'No matching complaints' : 'No complaints submitted yet',
              style: const TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.bold,
                color: Color(0xFF1E293B),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              isSearching
                  ? 'Try changing your search keywords or filter selection.'
                  : 'Your submitted complaints and their real-time municipal status will appear here.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 13,
                color: Colors.grey.shade600,
                height: 1.4,
              ),
            ),
            const SizedBox(height: 24),
            if (isSearching)
              OutlinedButton.icon(
                onPressed: () {
                  setState(() {
                    _searchQuery = '';
                    _selectedFilter = 'All';
                    _searchController.clear();
                  });
                  _applyFiltersAndSearch();
                },
                icon: const Icon(Icons.filter_alt_off, size: 16),
                label: const Text('Clear Filters'),
              )
            else
              ElevatedButton.icon(
                onPressed: () {
                  Navigator.pop(context);
                },
                icon: const Icon(Icons.add, size: 18),
                label: const Text('Report New Issue'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF1E3A8A),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildReportsList(ColorScheme colorScheme) {
    return FadeTransition(
      opacity: _fadeAnimation,
      child: SlideTransition(
        position: _slideAnimation,
        child: RefreshIndicator(
          onRefresh: _refreshData,
          color: const Color(0xFF1E3A8A),
          backgroundColor: Colors.white,
          child: ListView.builder(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 80),
            itemCount: _filteredReports.length,
            physics: const AlwaysScrollableScrollPhysics(),
            itemBuilder: (context, index) {
              final report = _filteredReports[index];
              return _buildReportCard(report, colorScheme);
            },
          ),
        ),
      ),
    );
  }

  Widget _buildReportCard(ComprehensiveReportModel report, ColorScheme colorScheme) {
    final statusColor = _getStatusColor(report.status);
    final priorityColor = _getPriorityColor(report.priority);
    final formattedId = '#CR-${report.id.padLeft(4, '0')}';
    final priorityAnalysis = CivicPriorityEngine.evaluateReport(report);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade200),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          onTap: () => _openReportDetails(report),
          borderRadius: BorderRadius.circular(12),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Top Header Row: ID, Priority, Status Chip
                Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    // Complaint ID Badge
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: const Color(0xFFCBD5E1)),
                      ),
                      child: Text(
                        formattedId,
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF1E293B),
                          letterSpacing: 0.5,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    // Priority Badge with Decision-Support Score
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                      decoration: BoxDecoration(
                        color: priorityColor.withOpacity(0.12),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            '${report.priority.displayName.toUpperCase()} • ${priorityAnalysis.scoreDisplay}',
                            style: TextStyle(
                              color: priorityColor,
                              fontSize: 10.5,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const Spacer(),
                    // Status Badge
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: statusColor,
                        borderRadius: BorderRadius.circular(12),
                        boxShadow: [
                          BoxShadow(
                            color: statusColor.withOpacity(0.25),
                            blurRadius: 4,
                            offset: const Offset(0, 1),
                          ),
                        ],
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            _getStatusIcon(report.status),
                            size: 12,
                            color: Colors.white,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            _mapCitizenStatusLabel(report.status),
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),

                // Complaint Title
                Text(
                  report.title,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF0F172A),
                  ),
                ),
                const SizedBox(height: 4),

                // Category Tag
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
                        color: Color(0xFF1E3A8A),
                        fontWeight: FontWeight.w600,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),

                // Description snippet
                if (report.description.isNotEmpty) ...[
                  Text(
                    report.description,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: Colors.grey.shade600,
                      fontSize: 13,
                      height: 1.3,
                    ),
                  ),
                  const SizedBox(height: 10),
                ],

                const Divider(height: 12, thickness: 0.5),

                // Footer: Location, Timestamp, Arrow
                Row(
                  children: [
                    Icon(
                      Icons.location_on_outlined,
                      size: 14,
                      color: Colors.grey.shade500,
                    ),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        report.location,
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey.shade600,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      report.submittedTime,
                      style: TextStyle(
                        fontSize: 11,
                        color: Colors.grey.shade500,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Icon(
                      Icons.chevron_right,
                      size: 16,
                      color: Colors.grey.shade400,
                    ),
                  ],
                ),

                if (_isAdmin) ...[
                  const SizedBox(height: 8),
                  Align(
                    alignment: Alignment.centerRight,
                    child: TextButton.icon(
                      onPressed: () => _openAdminActions(report),
                      icon: const Icon(Icons.admin_panel_settings, size: 14),
                      label: const Text('Update Status', style: TextStyle(fontSize: 11)),
                      style: TextButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        visualDensity: VisualDensity.compact,
                        foregroundColor: const Color(0xFF1E3A8A),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildFloatingActionButton(ColorScheme colorScheme) {
    return FloatingActionButton.extended(
      onPressed: () {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (context) => const DashboardScreen()),
        );
      },
      backgroundColor: const Color(0xFF1E3A8A),
      foregroundColor: Colors.white,
      icon: const Icon(Icons.add_circle_outline, size: 20),
      label: const Text(
        'New Report',
        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
      ),
    );
  }

  static String _mapCitizenStatusLabel(ReportStatus status) {
    switch (status) {
      case ReportStatus.submitted:
        return 'Submitted';
      case ReportStatus.review:
      case ReportStatus.under_review:
        return 'Under Review';
      case ReportStatus.assigned:
        return 'Assigned';
      case ReportStatus.progress:
      case ReportStatus.in_progress:
        return 'In Progress';
      case ReportStatus.resolution_submitted:
        return 'Resolution Submitted';
      case ReportStatus.resolved:
      case ReportStatus.verified:
        return 'Verified';
      case ReportStatus.closed:
        return 'Closed';
      case ReportStatus.rejected:
        return 'Rejected';
    }
  }

  static Color _getStatusColor(ReportStatus status) {
    switch (status) {
      case ReportStatus.submitted:
        return const Color(0xFF1E40AF); // Blue
      case ReportStatus.review:
      case ReportStatus.under_review:
        return const Color(0xFF4F46E5); // Indigo
      case ReportStatus.assigned:
        return const Color(0xFF7C3AED); // Purple
      case ReportStatus.progress:
      case ReportStatus.in_progress:
        return const Color(0xFFD97706); // Amber / Orange
      case ReportStatus.resolution_submitted:
        return const Color(0xFF0284C7); // Sky Blue
      case ReportStatus.resolved:
      case ReportStatus.verified:
        return const Color(0xFF059669); // Emerald Green
      case ReportStatus.closed:
        return const Color(0xFF475569); // Slate
      case ReportStatus.rejected:
        return const Color(0xFFDC2626); // Red
    }
  }

  static Color _getPriorityColor(ReportPriority priority) {
    switch (priority) {
      case ReportPriority.high:
        return const Color(0xFFDC2626); // Red
      case ReportPriority.medium:
        return const Color(0xFFEA580C); // Orange
      case ReportPriority.low:
        return const Color(0xFF16A34A); // Green
    }
  }

  static IconData _getCategoryIcon(String category) {
    final cat = category.toLowerCase();
    if (cat.contains('road') || cat.contains('pothole')) return Icons.add_road;
    if (cat.contains('water') || cat.contains('drain')) return Icons.water_drop;
    if (cat.contains('electric') || cat.contains('light')) return Icons.lightbulb_outline;
    if (cat.contains('garbage') || cat.contains('waste')) return Icons.delete_outline;
    if (cat.contains('safety') || cat.contains('manhole')) return Icons.warning_amber_rounded;
    return Icons.report_problem_outlined;
  }
}

// ==============================================================================
// COMPREHENSIVE CITIZEN TRACKING BOTTOM SHEET WITH REAL STATUS TIMELINE
// ==============================================================================

class _ReportDetailsBottomSheet extends StatefulWidget {
  final ComprehensiveReportModel report;
  final ComprehensiveDatabaseService databaseService;
  final bool isAdmin;
  final VoidCallback onFeedbackSubmitted;

  const _ReportDetailsBottomSheet({
    required this.report,
    required this.databaseService,
    required this.isAdmin,
    required this.onFeedbackSubmitted,
  });

  @override
  State<_ReportDetailsBottomSheet> createState() => _ReportDetailsBottomSheetState();
}

class _ReportDetailsBottomSheetState extends State<_ReportDetailsBottomSheet> {
  List<ReportStatusHistoryModel> _history = [];
  StreamSubscription<List<ReportStatusHistoryModel>>? _historySubscription;
  bool _isLoadingHistory = true;
  int _selectedRating = 5;
  final TextEditingController _feedbackController = TextEditingController();
  bool _isSubmittingFeedback = false;
  bool _feedbackSubmitted = false;

  @override
  void initState() {
    super.initState();
    _loadStatusHistory();
    _subscribeToRealtimeStatusHistory();
    if (widget.report.rating != null) {
      _selectedRating = widget.report.rating!;
      _feedbackSubmitted = true;
    }
    if (widget.report.citizenFeedback != null) {
      _feedbackController.text = widget.report.citizenFeedback!;
    }
  }

  void _subscribeToRealtimeStatusHistory() {
    _historySubscription?.cancel();
    _historySubscription = widget.databaseService
        .getReportStatusHistoryStream(widget.report.id)
        .listen((history) {
      if (mounted) {
        setState(() {
          _history = history;
          _isLoadingHistory = false;
        });
      }
    }, onError: (e) {
      print('Realtime status history stream error: $e');
    });
  }

  @override
  void dispose() {
    _historySubscription?.cancel();
    _feedbackController.dispose();
    super.dispose();
  }

  Future<void> _loadStatusHistory() async {
    try {
      final history = await widget.databaseService.getReportStatusHistory(widget.report.id);
      if (mounted) {
        setState(() {
          _history = history;
          _isLoadingHistory = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoadingHistory = false;
        });
      }
    }
  }

  Future<void> _submitFeedback() async {
    if (_feedbackController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter feedback comments.')),
      );
      return;
    }

    setState(() {
      _isSubmittingFeedback = true;
    });

    try {
      final success = await widget.databaseService.submitCitizenFeedback(
        reportId: widget.report.id,
        rating: _selectedRating,
        feedback: _feedbackController.text.trim(),
      );

      if (success && mounted) {
        setState(() {
          _feedbackSubmitted = true;
          _isSubmittingFeedback = false;
        });
        widget.onFeedbackSubmitted();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Thank you! Your feedback has been recorded.'),
            backgroundColor: Color(0xFF059669),
          ),
        );
      } else if (mounted) {
        setState(() {
          _isSubmittingFeedback = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isSubmittingFeedback = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final report = widget.report;
    final formattedId = '#CR-${report.id.padLeft(4, '0')}';
    final statusColor = _ComprehensiveTrackReportsScreenState._getStatusColor(report.status);
    final priorityColor = _ComprehensiveTrackReportsScreenState._getPriorityColor(report.priority);

    return DraggableScrollableSheet(
      initialChildSize: 0.92,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      builder: (context, scrollController) {
        return Container(
          decoration: const BoxDecoration(
            color: Color(0xFFF8FAFC),
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: Column(
            children: [
              // Modal Drag Handle
              Container(
                margin: const EdgeInsets.symmetric(vertical: 10),
                width: 44,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),

              // Top Bar
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                child: Row(
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Text(
                              formattedId,
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF1E293B),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: priorityColor.withOpacity(0.15),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                report.priority.displayName.toUpperCase(),
                                style: TextStyle(
                                  color: priorityColor,
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ],
                        ),
                        Text(
                          'Official Municipal Tracking',
                          style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
                        ),
                      ],
                    ),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: statusColor,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        _ComprehensiveTrackReportsScreenState._mapCitizenStatusLabel(report.status),
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
              ),

              const Divider(height: 1),

              // Scrollable Detail Content
              Expanded(
                child: SingleChildScrollView(
                  controller: scrollController,
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // 1. Complaint Summary Card
                      _buildSummaryCard(report),
                      const SizedBox(height: 16),

                      // 2. Complaint Submitted Location Map (Live Location Tracking)
                      if (report.latitude != null && report.longitude != null) ...[
                        _buildComplaintLocationMap(report),
                        const SizedBox(height: 16),
                      ],

                      // 3. Official Status Timeline
                      _buildLifecycleTimeline(report),
                      const SizedBox(height: 16),

                      // 3. Resolution Details (if resolved)
                      if (report.status == ReportStatus.resolved) ...[
                        _buildResolutionSection(report),
                        const SizedBox(height: 16),
                        _buildCitizenFeedbackSection(report),
                        const SizedBox(height: 16),
                      ],

                      // 4. Submitted Evidence (Photos)
                      if (report.imageUrls.isNotEmpty) ...[
                        _buildEvidenceSection(report),
                        const SizedBox(height: 16),
                      ],

                      // 5. Municipal Action Summary & Information
                      _buildMetadataSection(report),
                      const SizedBox(height: 24),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildSummaryCard(ComprehensiveReportModel report) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                _ComprehensiveTrackReportsScreenState._getCategoryIcon(report.category),
                color: const Color(0xFF1E3A8A),
                size: 18,
              ),
              const SizedBox(width: 6),
              Text(
                report.categoryDisplayName ?? report.category.replaceAll('_', ' ').toUpperCase(),
                style: const TextStyle(
                  color: Color(0xFF1E3A8A),
                  fontWeight: FontWeight.bold,
                  fontSize: 13,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            report.title,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Color(0xFF0F172A),
            ),
          ),
          const SizedBox(height: 6),
          Text(
            report.description,
            style: const TextStyle(
              fontSize: 13,
              color: Color(0xFF334155),
              height: 1.4,
            ),
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: const Color(0xFFF1F5F9),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              children: [
                const Icon(Icons.location_on, size: 16, color: Color(0xFF64748B)),
                const SizedBox(width: 6),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        report.location,
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF1E293B),
                        ),
                      ),
                      if (report.latitude != null && report.longitude != null)
                        Text(
                          'GPS: ${report.latitude!.toStringAsFixed(5)}, ${report.longitude!.toStringAsFixed(5)}',
                          style: const TextStyle(fontSize: 10, color: Color(0xFF64748B)),
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildComplaintLocationMap(ComprehensiveReportModel report) {
    final lat = report.latitude!;
    final lng = report.longitude!;

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                const Icon(Icons.pin_drop, color: Color(0xFFDC2626), size: 18),
                const SizedBox(width: 6),
                const Text(
                  'Submitted Complaint Location',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF0F172A),
                  ),
                ),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEF2F2),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: const Color(0xFFFCA5A5)),
                  ),
                  child: Text(
                    '${lat.toStringAsFixed(5)}, ${lng.toStringAsFixed(5)}',
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFFDC2626),
                    ),
                  ),
                ),
              ],
            ),
          ),
          ClipRRect(
            borderRadius: const BorderRadius.vertical(bottom: Radius.circular(12)),
            child: SizedBox(
              height: 180,
              width: double.infinity,
              child: kIsWeb
                  ? Container(
                      color: const Color(0xFFEFF6FF),
                      alignment: Alignment.center,
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.location_on, color: Color(0xFFDC2626), size: 36),
                          const SizedBox(height: 6),
                          Text(
                            report.location,
                            textAlign: TextAlign.center,
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                          ),
                          Text(
                            'GPS: ${lat.toStringAsFixed(5)}, ${lng.toStringAsFixed(5)}',
                            style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                          ),
                        ],
                      ),
                    )
                  : WebViewWidget(
                      controller: WebViewController()
                        ..setJavaScriptMode(JavaScriptMode.unrestricted)
                        ..loadHtmlString(
                          LeafletMapService.getEnhancedMapHTML(
                            latitude: lat,
                            longitude: lng,
                            zoom: 16.0,
                            reports: [
                              {
                                'id': report.id,
                                'title': report.title,
                                'description': report.description,
                                'category': report.category,
                                'priority': report.priority.value,
                                'status': report.status.value,
                                'latitude': lat,
                                'longitude': lng,
                                'location': report.location,
                                'reportedTime': report.submittedTime,
                              }
                            ],
                          ),
                        ),
                    ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLifecycleTimeline(ComprehensiveReportModel report) {
    int currentStageIndex = 0;
    switch (report.status) {
      case ReportStatus.submitted:
        currentStageIndex = 0;
        break;
      case ReportStatus.review:
      case ReportStatus.under_review:
        currentStageIndex = 1;
        break;
      case ReportStatus.assigned:
        currentStageIndex = 2;
        break;
      case ReportStatus.progress:
      case ReportStatus.in_progress:
      case ReportStatus.resolution_submitted:
        currentStageIndex = 3;
        break;
      case ReportStatus.resolved:
      case ReportStatus.verified:
      case ReportStatus.closed:
      case ReportStatus.rejected:
        currentStageIndex = 4;
        break;
    }

    final Map<String, ReportStatusHistoryModel> historyMap = {};
    for (var h in _history) {
      historyMap[h.newStatus.toLowerCase()] = h;
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.timeline, color: Color(0xFF1E3A8A), size: 18),
              const SizedBox(width: 6),
              const Text(
                'Status Lifecycle Timeline',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF0F172A),
                ),
              ),
              const Spacer(),
              if (_isLoadingHistory)
                const SizedBox(
                  width: 14,
                  height: 14,
                  child: CircularProgressIndicator(strokeWidth: 1.5, color: Color(0xFF1E3A8A)),
                ),
            ],
          ),
          const SizedBox(height: 16),

          // Stage 1: Submitted
          _buildTimelineStep(
            title: 'Complaint Submitted',
            description: 'Registered in CivicResolve central grievance repository.',
            timestamp: report.submittedTime,
            isCompleted: true,
            isActive: currentStageIndex == 0,
            isLast: false,
          ),

          // Stage 2: Under Review
          _buildTimelineStep(
            title: 'Under Review',
            description: 'Municipal grievance cell assessing jurisdiction and priority.',
            timestamp: historyMap['review'] != null
                ? _formatDateTime(historyMap['review']!.createdAt)
                : (currentStageIndex >= 1 ? report.lastUpdatedTime : null),
            isCompleted: currentStageIndex >= 1,
            isActive: currentStageIndex == 1,
            isLast: false,
          ),

          // Stage 3: Assigned
          _buildTimelineStep(
            title: 'Assigned to Department',
            description: report.assignedOfficerName != null
                ? 'Assigned to: ${report.assignedOfficerName}'
                : 'Assigned to jurisdictional municipal maintenance division.',
            timestamp: historyMap['assigned'] != null
                ? _formatDateTime(historyMap['assigned']!.createdAt)
                : (currentStageIndex >= 2 ? report.lastUpdatedTime : null),
            isCompleted: currentStageIndex >= 2,
            isActive: currentStageIndex == 2,
            isLast: false,
          ),

          // Stage 4: In Progress
          _buildTimelineStep(
            title: 'Field Response In Progress',
            description: 'Field inspection and maintenance work underway on-site.',
            timestamp: historyMap['progress'] != null
                ? _formatDateTime(historyMap['progress']!.createdAt)
                : (currentStageIndex >= 3 ? report.lastUpdatedTime : null),
            isCompleted: currentStageIndex >= 3,
            isActive: currentStageIndex == 3,
            isLast: false,
          ),

          // Stage 5: Resolved
          _buildTimelineStep(
            title: 'Resolution & Closure',
            description: currentStageIndex == 4
                ? 'Issue resolved by municipal authority. Citizen verification requested.'
                : 'Awaiting completion verification.',
            timestamp: report.completionDate != null
                ? _formatDateTime(report.completionDate!)
                : (historyMap['resolved'] != null
                    ? _formatDateTime(historyMap['resolved']!.createdAt)
                    : (currentStageIndex == 4 ? report.lastUpdatedTime : null)),
            isCompleted: currentStageIndex == 4,
            isActive: currentStageIndex == 4,
            isLast: true,
          ),
        ],
      ),
    );
  }

  Widget _buildTimelineStep({
    required String title,
    required String description,
    required String? timestamp,
    required bool isCompleted,
    required bool isActive,
    required bool isLast,
  }) {
    Color nodeColor;
    IconData nodeIcon;

    if (isCompleted) {
      nodeColor = const Color(0xFF059669);
      nodeIcon = Icons.check;
    } else if (isActive) {
      nodeColor = const Color(0xFFD97706);
      nodeIcon = Icons.radio_button_checked;
    } else {
      nodeColor = const Color(0xFFCBD5E1);
      nodeIcon = Icons.radio_button_unchecked;
    }

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Column(
            children: [
              Container(
                width: 22,
                height: 22,
                decoration: BoxDecoration(
                  color: isCompleted ? nodeColor : (isActive ? nodeColor.withOpacity(0.15) : Colors.white),
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: nodeColor,
                    width: 2,
                  ),
                ),
                child: Icon(
                  nodeIcon,
                  size: 12,
                  color: isCompleted ? Colors.white : nodeColor,
                ),
              ),
              if (!isLast)
                Expanded(
                  child: Container(
                    width: 2,
                    color: isCompleted ? const Color(0xFF059669) : const Color(0xFFE2E8F0),
                  ),
                ),
            ],
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(bottom: 18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          title,
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: isCompleted || isActive ? FontWeight.bold : FontWeight.normal,
                            color: isCompleted || isActive ? const Color(0xFF0F172A) : const Color(0xFF94A3B8),
                          ),
                        ),
                      ),
                      if (timestamp != null)
                        Text(
                          timestamp,
                          style: const TextStyle(
                            fontSize: 10,
                            color: Color(0xFF64748B),
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    description,
                    style: TextStyle(
                      fontSize: 11,
                      color: isCompleted || isActive ? const Color(0xFF475569) : const Color(0xFF94A3B8),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildResolutionSection(ComprehensiveReportModel report) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFECFDF5),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFA7F3D0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.verified, color: Color(0xFF059669), size: 20),
              SizedBox(width: 8),
              Text(
                'Resolution Confirmed',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF065F46),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            report.completionDate != null
                ? 'Completed on: ${_formatDateTime(report.completionDate!)}'
                : 'Marked resolved by municipal authorities.',
            style: const TextStyle(fontSize: 12, color: Color(0xFF047857)),
          ),
          if (report.adminNotes != null && report.adminNotes!.isNotEmpty) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFA7F3D0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Resolution Note:',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF065F46),
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    report.adminNotes!,
                    style: const TextStyle(fontSize: 12, color: Color(0xFF1E293B)),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildCitizenFeedbackSection(ComprehensiveReportModel report) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.star, color: Color(0xFFF59E0B), size: 18),
              SizedBox(width: 6),
              Text(
                'Citizen Resolution Feedback',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF0F172A),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          const Text(
            'How satisfied are you with the municipal resolution of this complaint?',
            style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
          ),
          const SizedBox(height: 12),

          // 5-Star Rating Selector
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(5, (index) {
              final starValue = index + 1;
              final isFilled = starValue <= _selectedRating;
              return IconButton(
                iconSize: 32,
                padding: const EdgeInsets.symmetric(horizontal: 4),
                icon: Icon(
                  isFilled ? Icons.star : Icons.star_border,
                  color: const Color(0xFFF59E0B),
                ),
                onPressed: _feedbackSubmitted
                    ? null
                    : () {
                        setState(() {
                          _selectedRating = starValue;
                        });
                      },
              );
            }),
          ),
          const SizedBox(height: 8),

          if (!_feedbackSubmitted) ...[
            TextField(
              controller: _feedbackController,
              maxLines: 2,
              decoration: InputDecoration(
                hintText: 'Add comments on speed, quality, or communication...',
                hintStyle: const TextStyle(fontSize: 12, color: Colors.grey),
                filled: true,
                fillColor: const Color(0xFFF8FAFC),
                contentPadding: const EdgeInsets.all(10),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: BorderSide(color: Colors.grey.shade300),
                ),
              ),
            ),
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _isSubmittingFeedback ? null : _submitFeedback,
                icon: _isSubmittingFeedback
                    ? const SizedBox(
                        width: 14,
                        height: 14,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Icon(Icons.rate_review, size: 16),
                label: const Text('Submit Feedback'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF1E3A8A),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
              ),
            ),
          ] else ...[
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFFF0FDF4),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFBBF7D0)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.check_circle, size: 16, color: Color(0xFF16A34A)),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _feedbackController.text.isNotEmpty
                          ? 'Your feedback: "${_feedbackController.text}"'
                          : 'You rated this resolution $_selectedRating / 5 stars.',
                      style: const TextStyle(fontSize: 12, color: Color(0xFF15803D)),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildEvidenceSection(ComprehensiveReportModel report) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.photo_library_outlined, color: Color(0xFF1E3A8A), size: 18),
              const SizedBox(width: 6),
              Text(
                'Submitted Photo Evidence (${report.imageUrls.length})',
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF0F172A),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 100,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              itemCount: report.imageUrls.length,
              itemBuilder: (context, index) {
                final imgUrl = report.imageUrls[index];
                return GestureDetector(
                  onTap: () => _showFullImage(context, imgUrl),
                  child: Container(
                    width: 100,
                    margin: const EdgeInsets.only(right: 8),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.grey.shade300),
                    ),
                    clipBehavior: Clip.antiAlias,
                    child: _buildImageWidget(imgUrl),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildImageWidget(String url) {
    if (url.startsWith('data:image')) {
      try {
        final commaIdx = url.indexOf(',');
        final base64Str = commaIdx != -1 ? url.substring(commaIdx + 1) : url;
        final bytes = base64Decode(base64Str);
        return Image.memory(bytes, fit: BoxFit.cover);
      } catch (e) {
        return const Center(child: Icon(Icons.broken_image, size: 24, color: Colors.grey));
      }
    } else if (url.startsWith('http')) {
      return Image.network(
        url,
        fit: BoxFit.cover,
        errorBuilder: (context, error, stackTrace) =>
            const Center(child: Icon(Icons.broken_image, size: 24, color: Colors.grey)),
      );
    }
    return const Center(child: Icon(Icons.image, size: 24, color: Colors.grey));
  }

  void _showFullImage(BuildContext context, String url) {
    showDialog(
      context: context,
      builder: (context) => Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: const EdgeInsets.all(12),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Align(
              alignment: Alignment.topRight,
              child: IconButton(
                icon: const Icon(Icons.close, color: Colors.white, size: 28),
                onPressed: () => Navigator.pop(context),
              ),
            ),
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: _buildImageWidget(url),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMetadataSection(ComprehensiveReportModel report) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Complaint Metadata',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.bold,
              color: Color(0xFF0F172A),
            ),
          ),
          const SizedBox(height: 10),
          _buildInfoRow('Complaint ID', '#CR-${report.id.padLeft(4, '0')}'),
          _buildInfoRow('Submitted On', report.submittedTime),
          _buildInfoRow('Last System Sync', report.lastUpdatedTime),
          _buildInfoRow('Priority', report.priority.displayName.toUpperCase()),
          _buildInfoRow('Category', report.categoryDisplayName ?? report.category),
          if (report.assignedOfficerName != null)
            _buildInfoRow('Assigned Officer', report.assignedOfficerName!),
        ],
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              label,
              style: const TextStyle(
                fontSize: 12,
                color: Color(0xFF64748B),
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                fontSize: 12,
                color: Color(0xFF1E293B),
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  static String _formatDateTime(DateTime dt) {
    final months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    final hour = dt.hour.toString().padLeft(2, '0');
    final minute = dt.minute.toString().padLeft(2, '0');
    return '${dt.day} ${months[dt.month - 1]} • $hour:$minute';
  }
}