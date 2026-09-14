import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'dart:async';
import 'comprehensive_database_service.dart';
import 'comprehensive_report_models.dart';
import 'auth_service.dart';
import 'language_service.dart';
import 'dashboard_screen.dart';

class UltraFastTrackReportsScreen extends StatefulWidget {
  const UltraFastTrackReportsScreen({super.key});

  @override
  State<UltraFastTrackReportsScreen> createState() => _UltraFastTrackReportsScreenState();
}

class _UltraFastTrackReportsScreenState extends State<UltraFastTrackReportsScreen> 
    with TickerProviderStateMixin, AutomaticKeepAliveClientMixin {
  
  // Core services
  final LanguageService _languageService = LanguageService();
  final ComprehensiveDatabaseService _databaseService = ComprehensiveDatabaseService();
  final TextEditingController _searchController = TextEditingController();
  
  // Animation controllers
  late AnimationController _animationController;
  late AnimationController _fadeController;
  late Animation<double> _fadeAnimation;
  late Animation<Offset> _slideAnimation;
  
  // State management
  String _selectedFilter = 'All';
  String _searchQuery = '';
  bool _isLoading = false;
  bool _hasError = false;
  String _errorMessage = '';
  bool _isAdmin = false;
  bool _isInitialized = false;

  // Ultra-fast data management
  List<ComprehensiveReportModel> _allReports = [];
  List<ComprehensiveReportModel> _filteredReports = [];
  List<ComprehensiveReportModel> _cachedReports = [];
  
  // Performance optimization
  Timer? _searchDebounceTimer;
  Timer? _refreshTimer;
  StreamSubscription<List<ComprehensiveReportModel>>? _reportsSubscription;
  final Map<String, ComprehensiveReportModel> _reportIndexMap = {};
  DateTime? _lastCacheTime;
  
  // Filter options
  final List<String> _filters = ['All', 'Open', 'Submitted', 'Review', 'Assigned', 'Progress', 'Resolved'];

  @override
  bool get wantKeepAlive => true; // Keep state alive for performance

  @override
  void initState() {
    super.initState();
    _initializeControllers();
    _checkAdminStatus();
    _initializeDataWithInstantUI();
  }

  @override
  void dispose() {
    _languageService.removeListener(_onLanguageChanged);
    _reportsSubscription?.cancel();
    _searchDebounceTimer?.cancel();
    _refreshTimer?.cancel();
    _animationController.dispose();
    _fadeController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  void _initializeControllers() {
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 600),
      vsync: this,
    );
    
    _fadeController = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );

    _fadeAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _fadeController,
      curve: Curves.easeOut,
    ));

    _slideAnimation = Tween<Offset>(
      begin: const Offset(0, 0.1),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _animationController,
      curve: Curves.easeOutCubic,
    ));

    _languageService.addListener(_onLanguageChanged);
  }

  void _onLanguageChanged() {
    if (mounted) setState(() {});
  }

  Future<void> _checkAdminStatus() async {
    final authService = AuthService.instance;
    final userEmail = authService.userEmail;
    if (mounted) {
      setState(() {
        _isAdmin = userEmail == 'admin@system.com';
      });
    }
  }

  /// Ultra-fast initialization with instant UI and sub-100ms data loading
  Future<void> _initializeDataWithInstantUI() async {
    final stopwatch = Stopwatch()..start();
    print('⚡ [${stopwatch.elapsedMilliseconds}ms] Ultra-fast initialization starting...');

    try {
      // INSTANT: Show UI immediately (0ms)
      if (mounted) {
        setState(() {
          _isLoading = true;
          _hasError = false;
        });
      }
      print('⚡ [${stopwatch.elapsedMilliseconds}ms] Initial state set to loading.');

      // Check cached data first (target: <50ms)
      final cachedData = await _loadCachedDataInstant();
      if (cachedData.isNotEmpty) {
        print('⚡ [${stopwatch.elapsedMilliseconds}ms] Cache check complete. Found ${cachedData.length} items.');
        
        if (mounted) {
          setState(() {
            _allReports = cachedData;
            _filteredReports = List.from(cachedData);
            _isLoading = false;
            _isInitialized = true;
          });
          _buildReportIndex();
          _fadeController.forward();
          _animationController.forward();
        }
        print('🚀 [${stopwatch.elapsedMilliseconds}ms] Cached data loaded and UI updated.');
        
        // Start background refresh
        _startBackgroundRefresh();
        return;
      }
      print('⚡ [${stopwatch.elapsedMilliseconds}ms] No valid cache found.');

      // Fresh data fetch (target: <100ms)
      await _fetchFreshDataUltraFast();
      
      stopwatch.stop();
      print('✅ Total initialization: ${stopwatch.elapsedMilliseconds}ms');
      
    } catch (e) {
      stopwatch.stop();
      print('❌ Initialization error after ${stopwatch.elapsedMilliseconds}ms: $e');
      if (mounted) {
        setState(() {
          _isLoading = false;
          _hasError = true;
          _errorMessage = 'Failed to load reports. Please try again.';
        });
      }
    }
  }

  /// Load cached data instantly (target: <50ms)
  Future<List<ComprehensiveReportModel>> _loadCachedDataInstant() async {
    final stopwatch = Stopwatch()..start();
    try {
      if (_lastCacheTime != null && 
          DateTime.now().difference(_lastCacheTime!).inMinutes < 3 &&
          _cachedReports.isNotEmpty) {
        stopwatch.stop();
        print('⚡ [${stopwatch.elapsedMilliseconds}ms] Cache hit. Returning ${_cachedReports.length} cached reports.');
        return _cachedReports;
      }
      stopwatch.stop();
      print('⚡ [${stopwatch.elapsedMilliseconds}ms] Cache miss or expired.');
      return [];
    } catch (e) {
      stopwatch.stop();
      print('❌ [${stopwatch.elapsedMilliseconds}ms] Cache load error: $e');
      return [];
    }
  }

  /// Ultra-fast fresh data fetch (target: <100ms)
  Future<void> _fetchFreshDataUltraFast() async {
    final stopwatch = Stopwatch()..start();
    
    try {
      final authService = AuthService.instance;
      final userId = authService.userEmail ?? '';
      
      if (userId.isEmpty) {
        throw Exception('User not authenticated');
      }

      print('🔄 [${stopwatch.elapsedMilliseconds}ms] Fetching fresh data for user: $userId (Admin: $_isAdmin)');

      // Use faster single query instead of stream
      final reports = _isAdmin 
          ? await _databaseService.getAllReportsComprehensive()
          : await _databaseService.getUserReportsComprehensive(userId);

      print('⚡ [${stopwatch.elapsedMilliseconds}ms] Fresh data fetched in ${stopwatch.elapsedMilliseconds}ms (${reports.length} reports)');

      if (mounted) {
        setState(() {
          _allReports = reports;
          _filteredReports = List.from(reports);
          _cachedReports = List.from(reports);
          _lastCacheTime = DateTime.now();
          _isLoading = false;
          _hasError = false;
          _isInitialized = true;
        });
        
        _buildReportIndex();
        _fadeController.forward();
        _animationController.forward();
        print('⚡ [${stopwatch.elapsedMilliseconds}ms] UI updated with fresh data.');
        
        // Setup real-time updates after initial load
        _setupRealTimeUpdates(userId);
      }
      
    } catch (e) {
      print('❌ [${stopwatch.elapsedMilliseconds}ms] Fresh data fetch error: $e');
      if (mounted) {
        setState(() {
          _isLoading = false;
          _hasError = true;
          _errorMessage = e.toString();
        });
      }
    }
  }

  /// Build index map for O(1) lookups
  void _buildReportIndex() {
    _reportIndexMap.clear();
    for (var report in _allReports) {
      _reportIndexMap[report.id] = report;
    }
  }

  /// Setup real-time updates after initial load
  void _setupRealTimeUpdates(String userId) {
    _reportsSubscription?.cancel();
    
    Stream<List<ComprehensiveReportModel>> stream = _isAdmin
        ? _databaseService.getAllReportsStream()
        : _databaseService.getUserReportsStream(userId);
        
    _reportsSubscription = stream
        .listen(
          (reports) {
            if (mounted && _isInitialized) {
              print('📡 Real-time update: ${reports.length} reports');
              setState(() {
                _allReports = reports;
                _cachedReports = List.from(reports);
                _lastCacheTime = DateTime.now();
              });
              _buildReportIndex();
              _applyFiltersInstant();
            }
          },
          onError: (error) {
            print('❌ Real-time error: $error');
          },
        );
  }

  /// Start background refresh
  void _startBackgroundRefresh() {
    _refreshTimer?.cancel();
    _refreshTimer = Timer.periodic(const Duration(minutes: 2), (timer) {
      if (mounted) {
        _fetchFreshDataUltraFast();
      }
    });
  }

  /// Ultra-fast filter application (target: <10ms)
  void _applyFiltersInstant() {
    final stopwatch = Stopwatch()..start();
    
    List<ComprehensiveReportModel> filtered = _allReports;
    
    // Filter by status
    if (_selectedFilter != 'All') {
      final lowerCaseFilter = _selectedFilter.toLowerCase();
      filtered = filtered.where((report) {
        final status = report.status.value.toLowerCase();
        if (_selectedFilter == 'Open') {
          return status == 'submitted' || status == 'review' || status == 'assigned' || status == 'progress';
        }
        return status == lowerCaseFilter;
      }).toList();
    }
    
    // Filter by search query
    if (_searchQuery.isNotEmpty) {
      final query = _searchQuery.toLowerCase();
      filtered = filtered.where((report) {
        return report.title.toLowerCase().contains(query) ||
               report.description.toLowerCase().contains(query) ||
               report.location.toLowerCase().contains(query) ||
               report.category.toLowerCase().contains(query);
      }).toList();
    }
    
    // Sort by newest first
    filtered.sort((a, b) => b.createdAt.compareTo(a.createdAt));
    
    if (mounted) {
      setState(() {
        _filteredReports = filtered;
      });
    }
    
    stopwatch.stop();
    print('⚡ Filters applied in ${stopwatch.elapsedMicroseconds}µs (${filtered.length} results)');
  }

  /// Debounced search
  void _onSearchChanged(String query) {
    _searchDebounceTimer?.cancel();
    _searchDebounceTimer = Timer(const Duration(milliseconds: 150), () {
      setState(() {
        _searchQuery = query;
      });
      _applyFiltersInstant();
    });
  }

  /// Filter selection
  void _onFilterSelected(String filter) {
    setState(() {
      _selectedFilter = filter;
    });
    _applyFiltersInstant();
  }

  /// Refresh data
  Future<void> _refreshData() async {
    if (_isLoading) return;
    
    setState(() {
      _isLoading = true;
      _hasError = false;
    });
    
    await _fetchFreshDataUltraFast();
  }

  @override
  Widget build(BuildContext context) {
    super.build(context); // Required for AutomaticKeepAliveClientMixin
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    
    return Scaffold(
      appBar: _buildAppBar(colorScheme),
      body: _buildBody(colorScheme),
      floatingActionButton: _buildFloatingActionButton(colorScheme),
    );
  }

  PreferredSizeWidget _buildAppBar(ColorScheme colorScheme) {
    return AppBar(
      title: Text(_isAdmin ? 'All Reports (Admin)' : 'My Reports'),
      backgroundColor: colorScheme.primary,
      foregroundColor: colorScheme.onPrimary,
      elevation: 0,
      actions: [
        IconButton(
          icon: const Icon(Icons.refresh),
          onPressed: _refreshData,
          tooltip: 'Refresh',
        ),
        // if (_isAdmin)
        //   IconButton(
        //     icon: const Icon(Icons.admin_panel_settings),
        //     onPressed: () {
        //       // TODO: Implement a way to select a report for admin actions
        //       // For example, navigate to a list of reports first.
        //       // Navigator.of(context).push(
        //       //   MaterialPageRoute(
        //       //     builder: (context) => const AdminActionsScreen(report: ...),
        //       //   ),
        //       // );
        //     },
        //     tooltip: 'Admin Actions',
        //   ),
      ],
    );
  }

  Widget _buildBody(ColorScheme colorScheme) {
    return Column(
      children: [
        // Static UI that shows instantly
        _buildSearchAndFilters(colorScheme),
        _buildStatsBar(colorScheme),
        
        // Dynamic content
        Expanded(
          child: _buildContentArea(colorScheme),
        ),
      ],
    );
  }

  Widget _buildSearchAndFilters(ColorScheme colorScheme) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        boxShadow: [
          BoxShadow(
            color: colorScheme.shadow.withOpacity(0.1),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          // Search bar
          TextField(
            controller: _searchController,
            onChanged: _onSearchChanged,
            decoration: InputDecoration(
              hintText: 'Search reports, locations, categories...',
              prefixIcon: const Icon(Icons.search),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              filled: true,
              fillColor: colorScheme.surfaceVariant.withOpacity(0.3),
            ),
          ),
          const SizedBox(height: 12),
          
          // Filter chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: _filters.map((filter) => _buildFilterChip(filter, colorScheme)).toList(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String filter, ColorScheme colorScheme) {
    final isSelected = filter == _selectedFilter;
    
    return Container(
      margin: const EdgeInsets.only(right: 8),
      child: FilterChip(
        label: Text(filter),
        selected: isSelected,
        onSelected: (selected) => _onFilterSelected(filter),
        backgroundColor: isSelected ? colorScheme.primary : colorScheme.surfaceVariant,
        selectedColor: colorScheme.primary,
        labelStyle: TextStyle(
          color: isSelected ? colorScheme.onPrimary : colorScheme.onSurfaceVariant,
          fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
        ),
        showCheckmark: false,
      ),
    );
  }

  Widget _buildStatsBar(ColorScheme colorScheme) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: [
          Icon(
            Icons.assignment,
            size: 16,
            color: colorScheme.onSurface.withOpacity(0.6),
          ),
          const SizedBox(width: 8),
          Text(
            '${_filteredReports.length} reports',
            style: TextStyle(
              color: colorScheme.onSurface.withOpacity(0.8),
              fontWeight: FontWeight.w500,
            ),
          ),
          if (_searchQuery.isNotEmpty) ...[
            const SizedBox(width: 16),
            Icon(
              Icons.search,
              size: 16,
              color: colorScheme.primary,
            ),
            const SizedBox(width: 4),
            Text(
              'filtered by "${_searchQuery}"',
              style: TextStyle(
                color: colorScheme.primary,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
          const Spacer(),
          if (_lastCacheTime != null)
            Text(
              'Updated ${_getTimeAgo(_lastCacheTime!)}',
              style: TextStyle(
                color: colorScheme.onSurface.withOpacity(0.5),
                fontSize: 12,
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildContentArea(ColorScheme colorScheme) {
    if (_hasError) {
      return _buildErrorState(colorScheme);
    }
    
    if (_isLoading && !_isInitialized) {
      return _buildLoadingState(colorScheme);
    }
    
    if (_filteredReports.isEmpty) {
      return _buildEmptyState(colorScheme);
    }
    
    return _buildReportsList(colorScheme);
  }

  Widget _buildLoadingState(ColorScheme colorScheme) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          TweenAnimationBuilder<double>(
            duration: const Duration(milliseconds: 1000),
            tween: Tween(begin: 0.0, end: 1.0),
            builder: (context, value, child) {
              return Transform.scale(
                scale: 0.8 + (value * 0.2),
                child: CircularProgressIndicator(
                  color: colorScheme.primary,
                  strokeWidth: 3,
                ),
              );
            },
          ),
          const SizedBox(height: 16),
          Text(
            'Loading reports...',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w500,
              color: colorScheme.onSurface,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'This should only take a moment',
            style: TextStyle(
              fontSize: 14,
              color: colorScheme.onSurface.withOpacity(0.7),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorState(ColorScheme colorScheme) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.error_outline,
              size: 64,
              color: colorScheme.error,
            ),
            const SizedBox(height: 16),
            Text(
              'Unable to load reports',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w600,
                color: colorScheme.error,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              _errorMessage,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 14,
                color: colorScheme.onSurface.withOpacity(0.7),
              ),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: _refreshData,
              icon: const Icon(Icons.refresh),
              label: const Text('Try Again'),
              style: ElevatedButton.styleFrom(
                backgroundColor: colorScheme.primary,
                foregroundColor: colorScheme.onPrimary,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState(ColorScheme colorScheme) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              _searchQuery.isNotEmpty ? Icons.search_off : Icons.inbox_outlined,
              size: 64,
              color: colorScheme.onSurface.withOpacity(0.5),
            ),
            const SizedBox(height: 16),
            Text(
              _searchQuery.isNotEmpty 
                  ? 'No reports found'
                  : 'No reports yet',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w600,
                color: colorScheme.onSurface.withOpacity(0.8),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              _searchQuery.isNotEmpty
                  ? 'Try adjusting your search terms'
                  : 'Submit your first report to get started',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 14,
                color: colorScheme.onSurface.withOpacity(0.6),
              ),
            ),
            if (_searchQuery.isNotEmpty) ...[
              const SizedBox(height: 16),
              OutlinedButton(
                onPressed: () {
                  _searchController.clear();
                  _onSearchChanged('');
                },
                child: const Text('Clear search'),
              ),
            ],
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
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: _filteredReports.length,
            itemBuilder: (context, index) {
              final report = _filteredReports[index];
              return TweenAnimationBuilder<double>(
                duration: Duration(milliseconds: 300 + (index * 50)),
                tween: Tween(begin: 0.0, end: 1.0),
                builder: (context, value, child) {
                  return Transform.translate(
                    offset: Offset(0, 20 * (1 - value)),
                    child: Opacity(
                      opacity: value,
                      child: _buildReportCard(report, colorScheme),
                    ),
                  );
                },
              );
            },
          ),
        ),
      ),
    );
  }

  Widget _buildReportCard(ComprehensiveReportModel report, ColorScheme colorScheme) {
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => _showReportDetails(report),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: _getStatusColor(report.status),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      report.status.value.toUpperCase(),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: _getPriorityColor(report.priority),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      report.priority.value.toUpperCase(),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  const Spacer(),
                  Text(
                    report.id,
                    style: TextStyle(
                      fontSize: 12,
                      color: colorScheme.onSurface.withOpacity(0.6),
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              
              // Title and category
              Text(
                report.title,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                report.category,
                style: TextStyle(
                  fontSize: 14,
                  color: colorScheme.primary,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 8),
              
              // Description
              Text(
                report.description,
                style: TextStyle(
                  fontSize: 14,
                  color: colorScheme.onSurface.withOpacity(0.8),
                  height: 1.4,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 12),
              
              // Footer
              Row(
                children: [
                  Icon(
                    Icons.location_on,
                    size: 16,
                    color: colorScheme.onSurface.withOpacity(0.6),
                  ),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      report.location,
                      style: TextStyle(
                        fontSize: 12,
                        color: colorScheme.onSurface.withOpacity(0.6),
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    _getTimeAgo(report.createdAt),
                    style: TextStyle(
                      fontSize: 12,
                      color: colorScheme.onSurface.withOpacity(0.6),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFloatingActionButton(ColorScheme colorScheme) {
    return FloatingActionButton(
      onPressed: () {
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (context) => const DashboardScreen(),
          ),
        );
      },
      backgroundColor: colorScheme.primary,
      foregroundColor: colorScheme.onPrimary,
      child: const Icon(Icons.add),
    );
  }

  void _showReportDetails(ComprehensiveReportModel report) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _buildReportDetailsSheet(report),
    );
  }

  Widget _buildReportDetailsSheet(ComprehensiveReportModel report) {
    final colorScheme = Theme.of(context).colorScheme;
    
    return Container(
      height: MediaQuery.of(context).size.height * 0.8,
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        children: [
          // Handle
          Container(
            width: 40,
            height: 4,
            margin: const EdgeInsets.symmetric(vertical: 12),
            decoration: BoxDecoration(
              color: colorScheme.onSurface.withOpacity(0.3),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          
          // Content
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    report.title,
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    report.description,
                    style: const TextStyle(fontSize: 16, height: 1.5),
                  ),
                  // Add more details as needed
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Color _getStatusColor(ReportStatus status) {
    switch (status) {
      case ReportStatus.submitted:
        return Colors.blue;
      case ReportStatus.review:
      case ReportStatus.under_review:
        return Colors.orange;
      case ReportStatus.assigned:
        return Colors.purple;
      case ReportStatus.progress:
      case ReportStatus.in_progress:
        return Colors.indigo;
      case ReportStatus.resolution_submitted:
        return Colors.teal;
      case ReportStatus.resolved:
      case ReportStatus.verified:
      case ReportStatus.closed:
        return Colors.green;
      case ReportStatus.rejected:
        return Colors.red;
    }
  }

  Color _getPriorityColor(ReportPriority priority) {
    switch (priority) {
      case ReportPriority.low:
        return Colors.green;
      case ReportPriority.medium:
        return Colors.orange;
      case ReportPriority.high:
        return Colors.red;
    }
  }

  String _getTimeAgo(DateTime dateTime) {
    final now = DateTime.now();
    final difference = now.difference(dateTime);
    
    if (difference.inDays > 0) {
      return '${difference.inDays}d ago';
    } else if (difference.inHours > 0) {
      return '${difference.inHours}h ago';
    } else if (difference.inMinutes > 0) {
      return '${difference.inMinutes}m ago';
    } else {
      return 'Just now';
    }
  }
}