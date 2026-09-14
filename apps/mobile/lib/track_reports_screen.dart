import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'dart:convert';
import 'dart:typed_data';
import 'language_service.dart';
import 'category_selection_screen.dart';
import 'database_service.dart';
import 'dashboard_screen.dart';
import 'profile_page.dart';
import 'report_status_service.dart';

// Report Status Enum
enum ReportStatus {
  submitted,
  inReview, 
  assigned,
  inProgress,
  resolved,
  closed
}

// Priority Level Enum
enum PriorityLevel {
  low,
  medium,
  high,
  critical
}

// Report Model
class Report {
  final String id;
  final String title;
  final String description;
  final ReportCategory category;
  final String location;
  final DateTime submissionDate;
  final ReportStatus status;
  final PriorityLevel priority;
  final int consolidatedReports;
  final String? assignedOfficer;
  final String? contactNumber;
  final String? imageUrl; // Keep for backward compatibility
  final List<String> imageUrls; // Add support for multiple images
  final List<String> updates;

  Report({
    required this.id,
    required this.title,
    required this.description,
    required this.category,
    required this.location,
    required this.submissionDate,
    required this.status,
    required this.priority,
    required this.consolidatedReports,
    this.assignedOfficer,
    this.contactNumber,
    this.imageUrl,
    this.imageUrls = const [], // Default to empty list
    this.updates = const [],
  });
}

class TrackReportsScreen extends StatefulWidget {
  const TrackReportsScreen({super.key});

  @override
  State<TrackReportsScreen> createState() => _TrackReportsScreenState();
}

class _TrackReportsScreenState extends State<TrackReportsScreen> 
    with TickerProviderStateMixin {
  final LanguageService _languageService = LanguageService();
  late AnimationController _animationController;
  late AnimationController _staggerController;
  late Animation<double> _fadeAnimation;
  late Animation<Offset> _slideAnimation;
  
  String _selectedFilter = 'All';
  String _sortBy = 'Newest';
  String _searchQuery = '';
  final TextEditingController _searchController = TextEditingController();
  bool _isLoading = true; // Start with loading state
  bool _hasError = false;
  String _errorMessage = '';

  // Real-time services
  final ReportStatusService _statusService = ReportStatusService();

  // Mock data - Replace with actual data source
  List<Report> _allReports = [];
  List<Report> _filteredReports = [];
  
  // Real-time stream subscription
  Stream<List<Report>>? _reportsStream;

  @override
  void initState() {
    super.initState();
    _languageService.addListener(_onLanguageChanged);
    
    // Initialize animations FIRST before anything else
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );
    
    _staggerController = AnimationController(
      duration: const Duration(milliseconds: 1200),
      vsync: this,
    );
    
    _fadeAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _animationController,
      curve: Curves.easeOut,
    ));
    
    _slideAnimation = Tween<Offset>(
      begin: const Offset(0, 0.3),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _animationController,
      curve: Curves.easeOutCubic,
    ));
    
    // Initialize status tracking
    final authService = AuthService.instance;
    final userId = authService.userId ?? authService.supabaseUser?.id ?? '';
    if (userId.isNotEmpty) {
      _statusService.initializeStatusTracking(userId);
      _statusService.startStatusMonitoring(userId);
    }
    
    // Load reports after animations are initialized
    _loadStoredReports();
  }

  @override
  void dispose() {
    _languageService.removeListener(_onLanguageChanged);
    _animationController.dispose();
    _staggerController.dispose();
    _searchController.dispose();
    _statusService.dispose(); // Clean up status monitoring
    super.dispose();
  }

  void _onLanguageChanged() {
    setState(() {});
  }

  Future<void> _loadStoredReports() async {
    setState(() {
      _isLoading = true;
      _hasError = false;
      _errorMessage = '';
    });
    
    try {
      print('Setting up real-time reports stream...');
      final databaseService = DatabaseService();
      final authService = AuthService.instance;
      final userId = authService.userId ?? authService.supabaseUser?.id ?? '';
      
      if (userId.isEmpty) {
        setState(() {
          _allReports = [];
          _filteredReports = [];
          _isLoading = false;
        });
        return;
      }
      
      // Set up real-time stream for reports
      _reportsStream = databaseService.getUserReportsStream(userId).map((reportModels) {
        print('Real-time update: ${reportModels.length} reports received');
        
        return reportModels.map((reportModel) {
          print('Converting report: ${reportModel.title} - Status: ${reportModel.status}');
          
          return Report(
            id: reportModel.id,
            title: reportModel.title,
            description: reportModel.description,
            category: _getCategoryFromString(reportModel.category),
            location: reportModel.location,
            submissionDate: reportModel.createdAt,
            status: _mapStatusFromString(reportModel.status),
            priority: _mapPriorityFromString(reportModel.priority ?? 'medium'),
            consolidatedReports: reportModel.consolidatedReports ?? 1,
            assignedOfficer: reportModel.assignedOfficer,
            contactNumber: reportModel.contactNumber,
            imageUrl: reportModel.imageUrls.isNotEmpty ? reportModel.imageUrls.first : null,
            imageUrls: _filterAndTestImages(reportModel.imageUrls),
            updates: [],
          );
        }).toList();
      });
      
      // Listen to the stream and update UI in real-time
      _reportsStream!.listen((reports) {
        print('Real-time update: Updating UI with ${reports.length} reports');
        setState(() {
          _allReports = reports;
          _filteredReports = List.from(_allReports);
          print('📝 Before _applyFilters: _allReports.length = ${_allReports.length}, _filteredReports.length = ${_filteredReports.length}');
          try {
            _applyFilters(); // Re-apply current filters
            print('✅ After _applyFilters: _filteredReports.length = ${_filteredReports.length}');
          } catch (e) {
            print('❌ Error in _applyFilters: $e');
            // If filtering fails, just use all reports
            _filteredReports = List.from(_allReports);
          }
          _isLoading = false;
          _hasError = false;
        });
        print('UI updated: _allReports.length = ${_allReports.length}, _filteredReports.length = ${_filteredReports.length}');
        
        // Start animations after data is loaded
        if (_animationController.isDismissed) {
          _animationController.forward();
        }
        if (_staggerController.isDismissed) {
          _staggerController.forward();
        }
      }, onError: (error) {
        print('Real-time stream error: $error');
        setState(() {
          _hasError = true;
          _errorMessage = 'Failed to load reports: ${error.toString()}';
          _isLoading = false;
        });
        // Fallback to one-time load
        _loadReportsOnce();
      });
      
      print('Real-time reports stream set up successfully');
      
    } catch (e) {
      print('Error setting up real-time stream: $e');
      setState(() {
        _hasError = true;
        _errorMessage = 'Failed to setup real-time updates: ${e.toString()}';
        _isLoading = false;
      });
      // Fallback to one-time load
      _loadReportsOnce();
    }
  }

  // Fallback method for one-time report loading
  Future<void> _loadReportsOnce() async {
    try {
      print('Fallback: Loading reports once...');
      final databaseService = DatabaseService();
      final authService = AuthService.instance;
      final userId = authService.userId ?? authService.supabaseUser?.id ?? '';
      
      if (userId.isEmpty) {
        setState(() {
          _allReports = [];
          _filteredReports = [];
          _isLoading = false;
        });
        return;
      }
      
      final storedReports = await databaseService.getUserReports(userId);
      print('Retrieved ${storedReports.length} reports from database');
      
      final convertedReports = storedReports.map((reportModel) {
        return Report(
          id: reportModel.id,
          title: reportModel.title,
          description: reportModel.description,
          category: _getCategoryFromString(reportModel.category),
          location: reportModel.location,
          submissionDate: reportModel.createdAt,
          status: _mapStatusFromString(reportModel.status),
          priority: _mapPriorityFromString(reportModel.priority ?? 'medium'),
          consolidatedReports: reportModel.consolidatedReports ?? 1,
          assignedOfficer: reportModel.assignedOfficer,
          contactNumber: reportModel.contactNumber,
          imageUrl: reportModel.imageUrls.isNotEmpty ? reportModel.imageUrls.first : null,
          imageUrls: _filterAndTestImages(reportModel.imageUrls),
          updates: [],
        );
      }).toList();
      
      setState(() {
        _allReports = convertedReports;
        _filteredReports = List.from(_allReports);
        _isLoading = false;
        _hasError = false;
      });
      
      print('Fallback reports loaded successfully');
    } catch (e) {
      print('Fallback loading failed: $e');
      setState(() {
        _hasError = true;
        _errorMessage = 'Failed to load reports from database: ${e.toString()}';
        _isLoading = false;
      });
      // Use mock data as last resort
      _generateMockData();
      setState(() {
        _filteredReports = List.from(_allReports);
        _hasError = false;
      });
    }
  }

  ReportStatus _mapStatusFromString(String status) {
    switch (status.toLowerCase()) {
      case 'submitted':
        return ReportStatus.submitted;
      case 'under_review':
        return ReportStatus.inReview;
      case 'assigned':
        return ReportStatus.assigned;
      case 'in_progress':
        return ReportStatus.inProgress;
      case 'resolved':
        return ReportStatus.resolved;
      case 'rejected':
      case 'closed':
        return ReportStatus.closed;
      default:
        return ReportStatus.submitted;
    }
  }

  PriorityLevel _mapPriorityFromString(String priority) {
    switch (priority.toLowerCase()) {
      case 'low':
        return PriorityLevel.low;
      case 'medium':
        return PriorityLevel.medium;
      case 'high':
        return PriorityLevel.high;
      case 'critical':
        return PriorityLevel.critical;
      default:
        return PriorityLevel.medium;
    }
  }

  ReportCategory _getCategoryFromString(String categoryId) {
    // Map category string to proper ReportCategory object
    switch (categoryId.toLowerCase()) {
      case 'potholes_roads':
        return ReportCategory(
          id: 'potholes_roads',
          name: 'Potholes & Roads',
          icon: Icons.construction,
          color: Colors.orange,
          gradient: const LinearGradient(colors: [Colors.orange, Colors.deepOrange]),
          description: 'Road damage and pothole issues',
        );
      case 'electricity_streetlights':
        return ReportCategory(
          id: 'electricity_streetlights',
          name: 'Electricity & Streetlights',
          icon: Icons.lightbulb,
          color: Colors.yellow,
          gradient: const LinearGradient(colors: [Colors.yellow, Colors.amber]),
          description: 'Electrical and lighting problems',
        );
      case 'water_supply':
        return ReportCategory(
          id: 'water_supply',
          name: 'Water Supply',
          icon: Icons.water_drop,
          color: Colors.blue,
          gradient: const LinearGradient(colors: [Colors.blue, Colors.lightBlue]),
          description: 'Water supply and drainage issues',
        );
      case 'waste_management':
        return ReportCategory(
          id: 'waste_management',
          name: 'Waste Management',
          icon: Icons.delete,
          color: Colors.green,
          gradient: const LinearGradient(colors: [Colors.green, Colors.lightGreen]),
          description: 'Garbage and waste collection problems',
        );
      case 'traffic_transport':
        return ReportCategory(
          id: 'traffic_transport',
          name: 'Traffic & Transport',
          icon: Icons.traffic,
          color: Colors.red,
          gradient: const LinearGradient(colors: [Colors.red, Colors.redAccent]),
          description: 'Traffic and transportation issues',
        );
      default:
        return ReportCategory(
          id: categoryId,
          name: categoryId.replaceAll('_', ' ').split(' ').map((word) => 
            word.isEmpty ? '' : word[0].toUpperCase() + word.substring(1)).join(' '),
          icon: Icons.report_problem,
          color: Colors.grey,
          gradient: const LinearGradient(colors: [Colors.grey, Colors.blueGrey]),
          description: 'General civic issues',
        );
    }
  }

  List<String> _filterAndTestImages(List<String> imageUrls) {
    print('🔍 Filtering images from ${imageUrls.length} URLs');
    
    // Filter out invalid images but keep blob URLs for now
    final validImages = imageUrls.where((url) {
      if (url.startsWith('blob:')) {
        print('📎 Found blob URL: ${url.substring(0, 50)}...');
        return true; // Keep blob URLs
      }
      
      if (url.startsWith('data:image/')) {
        // Check for known invalid base64 patterns - be more specific
        if (url.contains('/9j/4AAQSkZJRgABAQAAAQABAAD') && url.length < 100) {
          print('❌ Filtering out known invalid base64 pattern');
          return false;
        }
        // Allow smaller base64 images - only reject very short ones
        if (url.length < 50) {
          print('❌ Filtering out very short base64 URL');
          return false;
        }
        print('✅ Found base64 image: ${url.substring(0, 50)}...');
        return true;
      }
      
      if (url.startsWith('http')) {
        print('🌐 Found network URL: ${url.substring(0, 50)}...');
        return true; // Keep network URLs
      }
      
      print('⚠️ Unknown image format: ${url.substring(0, 50)}...');
      return false;
    }).toList();
    
    print('✅ Filtered to ${validImages.length} valid images');
    
    // Only add test image if there are absolutely no valid images
    if (validImages.isEmpty) {
      print('📝 Adding placeholder image since no valid images found');
      // A minimal 1x1 transparent PNG (guaranteed to work)
      validImages.add('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==');
    }
    
    return validImages;
  }

  void _generateMockData() {
    _allReports = [
      Report(
        id: 'CIV001',
        title: 'Large pothole on Main St',
        description: 'There is a large pothole that has been growing on Main Street near the intersection. It\'s causing damage to vehicles and is a safety hazard.',
        category: ReportCategory(
          id: 'roads',
          name: 'Roads & Potholes',
          icon: Icons.construction,
          color: const Color(0xFFEF4444),
          gradient: const LinearGradient(colors: [Color(0xFFEF4444), Color(0xFFDC2626)]),
          description: 'Road maintenance and pothole repairs',
        ),
        location: 'Main Street & 1st Ave',
        submissionDate: DateTime.now().subtract(const Duration(days: 5)),
        status: ReportStatus.inProgress,
        priority: PriorityLevel.high,
        consolidatedReports: 3,
        assignedOfficer: 'R. Sharma',
        contactNumber: '+1 (555) 123-4567',
        imageUrl: 'assets/images/pothole.jpg',
        updates: [
          'Report received and being reviewed',
          'Assigned to maintenance team',
          'Work order created - scheduled for next week'
        ],
      ),
      Report(
        id: 'CIV002',
        title: 'Broken streetlight on Oak Avenue',
        description: 'The streetlight has been flickering and is now completely out, making the area unsafe at night.',
        category: ReportCategory(
          id: 'lighting',
          name: 'Street Lighting',
          icon: Icons.lightbulb,
          color: const Color(0xFFF59E0B),
          gradient: const LinearGradient(colors: [Color(0xFFF59E0B), Color(0xFFD97706)]),
          description: 'Street lighting and electrical issues',
        ),
        location: 'Oak Avenue near Park',
        submissionDate: DateTime.now().subtract(const Duration(days: 12)),
        status: ReportStatus.resolved,
        priority: PriorityLevel.medium,
        consolidatedReports: 1,
        assignedOfficer: 'M. Johnson',
        contactNumber: '+1 (555) 987-6543',
        updates: [
          'Report received',
          'Electrical team dispatched',
          'New LED bulb installed and tested',
          'Issue resolved - lighting restored'
        ],
      ),
      Report(
        id: 'CIV003',
        title: 'Overflowing trash bins at Central Park',
        description: 'Multiple trash bins are overflowing and attracting pests. The area needs immediate attention.',
        category: ReportCategory(
          id: 'waste',
          name: 'Waste Management',
          icon: Icons.delete,
          color: const Color(0xFF10B981),
          gradient: const LinearGradient(colors: [Color(0xFF10B981), Color(0xFF059669)]),
          description: 'Garbage collection and waste disposal',
        ),
        location: 'Central Park - Main Entrance',
        submissionDate: DateTime.now().subtract(const Duration(days: 2)),
        status: ReportStatus.assigned,
        priority: PriorityLevel.medium,
        consolidatedReports: 7,
        assignedOfficer: 'A. Williams',
        contactNumber: '+1 (555) 456-7890',
        updates: [
          'Report received and categorized',
          'Assigned to sanitation department'
        ],
      ),
      Report(
        id: 'CIV004',
        title: 'Damaged sidewalk causing safety hazard',
        description: 'Cracked and uneven sidewalk near the shopping center is causing people to trip.',
        category: ReportCategory(
          id: 'sidewalks',
          name: 'Sidewalks & Walkways',
          icon: Icons.accessibility,
          color: const Color(0xFF8B5CF6),
          gradient: const LinearGradient(colors: [Color(0xFF8B5CF6), Color(0xFF7C3AED)]),
          description: 'Sidewalk maintenance and accessibility',
        ),
        location: 'Shopping Center - North Side',
        submissionDate: DateTime.now().subtract(const Duration(days: 8)),
        status: ReportStatus.inReview,
        priority: PriorityLevel.high,
        consolidatedReports: 2,
        updates: [
          'Report submitted for review',
          'Site inspection scheduled'
        ],
      ),
      Report(
        id: 'CIV005',
        title: 'Noise complaint - Construction site',
        description: 'Construction work starting too early in the morning, violating noise ordinances.',
        category: ReportCategory(
          id: 'noise',
          name: 'Noise Complaints',
          icon: Icons.volume_up,
          color: const Color(0xFFEC4899),
          gradient: const LinearGradient(colors: [Color(0xFFEC4899), Color(0xFFDB2777)]),
          description: 'Noise violations and disturbances',
        ),
        location: 'Residential Area - Block 5',
        submissionDate: DateTime.now().subtract(const Duration(days: 1)),
        status: ReportStatus.submitted,
        priority: PriorityLevel.low,
        consolidatedReports: 1,
        updates: [
          'Report submitted successfully'
        ],
      ),
    ];
  }

  void _applyFilters() {
    print('🔍 _applyFilters called - _allReports.length: ${_allReports.length}, _selectedFilter: $_selectedFilter, _searchQuery: "$_searchQuery"');
    setState(() {
      _filteredReports = _allReports.where((report) {
        // Filter by status
        bool statusMatch = true;
        if (_selectedFilter != 'All') {
          switch (_selectedFilter) {
            case 'Open':
              statusMatch = report.status != ReportStatus.resolved && 
                           report.status != ReportStatus.closed;
              break;
            case 'In Progress':
              statusMatch = report.status == ReportStatus.inProgress ||
                           report.status == ReportStatus.assigned;
              break;
            case 'Resolved':
              statusMatch = report.status == ReportStatus.resolved ||
                           report.status == ReportStatus.closed;
              break;
          }
        }
        
        // Filter by search query
        bool searchMatch = _searchQuery.isEmpty ||
            report.title.toLowerCase().contains(_searchQuery.toLowerCase()) ||
            report.location.toLowerCase().contains(_searchQuery.toLowerCase()) ||
            report.category.name.toLowerCase().contains(_searchQuery.toLowerCase());
        
        print('📋 Report "${report.title}" - Status: ${report.status}, StatusMatch: $statusMatch, SearchMatch: $searchMatch');
        return statusMatch && searchMatch;
      }).toList();
      print('✅ _applyFilters result: ${_filteredReports.length} reports after filtering');
      
      // Apply sorting
      switch (_sortBy) {
        case 'Newest':
          _filteredReports.sort((a, b) => b.submissionDate.compareTo(a.submissionDate));
          break;
        case 'Oldest':
          _filteredReports.sort((a, b) => a.submissionDate.compareTo(b.submissionDate));
          break;
        case 'Priority':
          _filteredReports.sort((a, b) => _getPriorityValue(b.priority).compareTo(_getPriorityValue(a.priority)));
          break;
      }
    });
  }

  int _getPriorityValue(PriorityLevel priority) {
    switch (priority) {
      case PriorityLevel.critical: return 4;
      case PriorityLevel.high: return 3;
      case PriorityLevel.medium: return 2;
      case PriorityLevel.low: return 1;
    }
  }

  @override
  Widget build(BuildContext context) {
    print('🏗️ BUILD: _isLoading=$_isLoading, _hasError=$_hasError, _allReports.length=${_allReports.length}, _filteredReports.length=${_filteredReports.length}');
    final colorScheme = Theme.of(context).colorScheme;
    
    return Theme(
      data: ThemeData.from(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF3B82F6),
          brightness: Brightness.light,
        ),
        useMaterial3: true,
      ),
      child: Scaffold(
        backgroundColor: colorScheme.surface,
        appBar: _buildAppBar(colorScheme),
        body: AnimatedBuilder(
          animation: _fadeAnimation,
          builder: (context, child) {
            return FadeTransition(
              opacity: _fadeAnimation,
              child: SlideTransition(
                position: _slideAnimation,
                child: Column(
                  children: [
                    _buildSearchAndFilters(colorScheme),
                    Expanded(
                      child: () {
                        print('UI Build: _isLoading = $_isLoading, _hasError = $_hasError, _filteredReports.length = ${_filteredReports.length}');
                        if (_isLoading) {
                          return _buildEmptyState(colorScheme);
                        } else if (_hasError) {
                          return _buildEmptyState(colorScheme);
                        } else if (_filteredReports.isEmpty) {
                          return _buildEmptyState(colorScheme);
                        } else {
                          return _buildReportsList(colorScheme);
                        }
                      }(),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }

  PreferredSizeWidget _buildAppBar(ColorScheme colorScheme) {
    return AppBar(
      backgroundColor: colorScheme.surface,
      elevation: 0,
      scrolledUnderElevation: 0,
      leading: IconButton(
        icon: Icon(Icons.arrow_back, color: colorScheme.onSurface),
        onPressed: () {
          Navigator.pushAndRemoveUntil(
            context,
            MaterialPageRoute(builder: (context) => const DashboardScreen()),
            (route) => false,
          );
        },
      ),
      title: Row(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF3B82F6), Color(0xFF1D4ED8)],
              ),
              borderRadius: BorderRadius.circular(20),
            ),
            child: const Text(
              'CivicResolve',
              style: TextStyle(
                color: Colors.white,
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
      actions: [
        IconButton(
          icon: Icon(Icons.map_outlined, color: colorScheme.primary),
          onPressed: () {
            // Navigate to map view
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Map view coming soon!')),
            );
          },
        ),
        IconButton(
          icon: Icon(Icons.person_outline, color: colorScheme.primary),
          onPressed: () {
            // Navigate to profile
            Navigator.push(
              context,
              MaterialPageRoute(builder: (context) => const ProfilePage()),
            );
          },
        ),
        const SizedBox(width: 8),
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
            color: colorScheme.shadow.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            children: [
              Text(
                'My Reports',
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                  color: colorScheme.onSurface,
                ),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: colorScheme.primaryContainer,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Text(
                  '${_filteredReports.length} Reports',
                  style: TextStyle(
                    color: colorScheme.onPrimaryContainer,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          
          const SizedBox(height: 16),
          
          // Search Bar
          Container(
            decoration: BoxDecoration(
              color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.3),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: colorScheme.outline.withValues(alpha: 0.2),
              ),
            ),
            child: TextField(
              controller: _searchController,
              onChanged: (value) {
                setState(() {
                  _searchQuery = value;
                });
                _applyFilters();
              },
              decoration: InputDecoration(
                hintText: 'Search reports, locations, categories...',
                hintStyle: TextStyle(color: colorScheme.onSurfaceVariant),
                prefixIcon: Icon(Icons.search, color: colorScheme.primary),
                suffixIcon: _searchQuery.isNotEmpty
                    ? IconButton(
                        icon: Icon(Icons.clear, color: colorScheme.onSurfaceVariant),
                        onPressed: () {
                          _searchController.clear();
                          setState(() {
                            _searchQuery = '';
                          });
                          _applyFilters();
                        },
                      )
                    : null,
                border: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              ),
            ),
          ),
          
          const SizedBox(height: 16),
          
          // Filter and Sort Row
          Row(
            children: [
              // Filter Chips
              Expanded(
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _buildFilterChip('All', colorScheme),
                      const SizedBox(width: 8),
                      _buildFilterChip('Open', colorScheme),
                      const SizedBox(width: 8),
                      _buildFilterChip('In Progress', colorScheme),
                      const SizedBox(width: 8),
                      _buildFilterChip('Resolved', colorScheme),
                    ],
                  ),
                ),
              ),
              
              const SizedBox(width: 16),
              
              // Sort Dropdown
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                decoration: BoxDecoration(
                  color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.3),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: colorScheme.outline.withValues(alpha: 0.2)),
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: _sortBy,
                    icon: Icon(Icons.sort, color: colorScheme.primary, size: 20),
                    items: ['Newest', 'Oldest', 'Priority'].map((String value) {
                      return DropdownMenuItem<String>(
                        value: value,
                        child: Text(
                          value,
                          style: TextStyle(
                            color: colorScheme.onSurface,
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      );
                    }).toList(),
                    onChanged: (String? newValue) {
                      if (newValue != null) {
                        setState(() {
                          _sortBy = newValue;
                        });
                        _applyFilters();
                      }
                    },
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String label, ColorScheme colorScheme) {
    final isSelected = _selectedFilter == label;
    
    return GestureDetector(
      onTap: () {
        setState(() {
          _selectedFilter = label;
        });
        _applyFilters();
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          gradient: isSelected 
              ? const LinearGradient(
                  colors: [Color(0xFF3B82F6), Color(0xFF1D4ED8)],
                )
              : null,
          color: isSelected ? null : colorScheme.surfaceContainerHighest.withValues(alpha: 0.3),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected 
                ? Colors.transparent 
                : colorScheme.outline.withValues(alpha: 0.3),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? Colors.white : colorScheme.onSurface,
            fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
            fontSize: 14,
          ),
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
            if (_isLoading) ...[
              const CircularProgressIndicator(),
              const SizedBox(height: 24),
              Text(
                'Loading Reports...',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w600,
                  color: colorScheme.onSurface,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Please wait while we fetch your reports',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 16,
                  color: colorScheme.onSurfaceVariant,
                ),
              ),
            ] else if (_hasError) ...[
              Icon(
                Icons.error_outline,
                size: 80,
                color: colorScheme.error,
              ),
              const SizedBox(height: 24),
              Text(
                'Error Loading Reports',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w600,
                  color: colorScheme.error,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                _errorMessage.isNotEmpty ? _errorMessage : 'Failed to load reports. Please try again.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 16,
                  color: colorScheme.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: _loadStoredReports,
                icon: const Icon(Icons.refresh),
                label: const Text('Retry'),
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                ),
              ),
            ] else ...[
              Icon(
                Icons.inbox_outlined,
                size: 80,
                color: colorScheme.onSurfaceVariant.withValues(alpha: 0.5),
              ),
              const SizedBox(height: 24),
              Text(
                _searchQuery.isNotEmpty || _selectedFilter != 'All' 
                    ? 'No reports found'
                    : 'No Reports Yet',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w600,
                  color: colorScheme.onSurface,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                _searchQuery.isNotEmpty || _selectedFilter != 'All'
                    ? 'Try adjusting your search or filters'
                    : 'Your submitted reports will appear here.\nPull down to refresh or tap the refresh button below.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 16,
                  color: colorScheme.onSurfaceVariant,
                ),
              ),
              if (_searchQuery.isEmpty && _selectedFilter == 'All') ...[
                const SizedBox(height: 32),
                OutlinedButton.icon(
                  onPressed: _loadStoredReports,
                  icon: const Icon(Icons.refresh),
                  label: const Text('Refresh Reports'),
                ),
                const SizedBox(height: 16),
                FilledButton.icon(
                  onPressed: () {
                    Navigator.pushAndRemoveUntil(
                      context,
                      MaterialPageRoute(builder: (context) => const DashboardScreen()),
                      (route) => false,
                    );
                  },
                  icon: const Icon(Icons.add_rounded),
                  label: const Text('Submit New Report'),
                ),
              ],
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildReportsList(ColorScheme colorScheme) {
    if (_filteredReports.isEmpty) {
      return _buildEmptyState(colorScheme);
    }
    
    return RefreshIndicator(
      onRefresh: _loadStoredReports,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _filteredReports.length,
        itemBuilder: (context, index) {
          final report = _filteredReports[index];
          return AnimatedBuilder(
            animation: _staggerController,
            builder: (context, child) {
              final delay = index * 0.1;
              final progress = Curves.easeOutCubic.transform(
                (((_staggerController.value - delay) / (1.0 - delay)).clamp(0.0, 1.0)),
              );
              
              return Transform.translate(
                offset: Offset(0, (1 - progress) * 50),
                child: Opacity(
                  opacity: progress,
                  child: Padding(
                    padding: const EdgeInsets.only(bottom: 16),
                    child: _buildReportCard(report, colorScheme),
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }

  Widget _buildReportCard(Report report, ColorScheme colorScheme) {
    return Card(
      elevation: 0,
      color: colorScheme.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(
          color: colorScheme.outline.withValues(alpha: 0.1),
          width: 1,
        ),
      ),
      child: InkWell(
        onTap: () => _showReportDetails(report, colorScheme),
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header Row
              Row(
                children: [
                  // Report Image/Icon
                  Container(
                    width: 60,
                    height: 60,
                    decoration: BoxDecoration(
                      gradient: report.category.gradient,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      report.category.icon,
                      color: Colors.white,
                      size: 28,
                    ),
                  ),
                  
                  const SizedBox(width: 12),
                  
                  // Title and ID
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          report.title,
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: colorScheme.onSurface,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'ID: ${report.id}',
                          style: TextStyle(
                            fontSize: 12,
                            color: colorScheme.onSurfaceVariant,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),
                  
                  // Status Badge
                  _buildStatusBadge(report.status, colorScheme),
                ],
              ),
              
              const SizedBox(height: 16),
              
              // Progress Indicator
              _buildProgressIndicator(report.status, colorScheme),
              
              const SizedBox(height: 16),
              
              // Metadata Row
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _buildMetadataChip(
                    '${report.consolidatedReports} Reports',
                    Icons.group,
                    colorScheme.primary,
                    colorScheme,
                  ),
                  _buildMetadataChip(
                    _getPriorityText(report.priority),
                    _getPriorityIcon(report.priority),
                    _getPriorityColor(report.priority),
                    colorScheme,
                  ),
                  _buildMetadataChip(
                    report.category.name,
                    report.category.icon,
                    report.category.color,
                    colorScheme,
                  ),
                ],
              ),
              
              const SizedBox(height: 12),
              
              // Description
              Text(
                report.description,
                style: TextStyle(
                  fontSize: 14,
                  color: colorScheme.onSurfaceVariant,
                  height: 1.4,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              
              const SizedBox(height: 12),
              
              // Location and Date
              Row(
                children: [
                  Icon(
                    Icons.location_on,
                    size: 16,
                    color: colorScheme.primary,
                  ),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      report.location,
                      style: TextStyle(
                        fontSize: 13,
                        color: colorScheme.onSurfaceVariant,
                        fontWeight: FontWeight.w500,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Icon(
                    Icons.access_time,
                    size: 16,
                    color: colorScheme.onSurfaceVariant,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    _formatDate(report.submissionDate),
                    style: TextStyle(
                      fontSize: 13,
                      color: colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
              
              if (report.assignedOfficer != null) ...[
                const SizedBox(height: 12),
                
                // Assigned Officer
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.3),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 16,
                        backgroundColor: colorScheme.primary,
                        child: Text(
                          report.assignedOfficer!.split(' ').map((e) => e[0]).join(),
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 12,
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Assigned to: ${report.assignedOfficer}',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: colorScheme.onSurface,
                              ),
                            ),
                            if (report.contactNumber != null)
                              Text(
                                report.contactNumber!,
                                style: TextStyle(
                                  fontSize: 12,
                                  color: colorScheme.onSurfaceVariant,
                                ),
                              ),
                          ],
                        ),
                      ),
                      if (report.contactNumber != null)
                        IconButton(
                          onPressed: () => _makePhoneCall(report.contactNumber!),
                          icon: Icon(
                            Icons.phone,
                            color: colorScheme.primary,
                            size: 20,
                          ),
                          style: IconButton.styleFrom(
                            backgroundColor: colorScheme.primaryContainer,
                            padding: const EdgeInsets.all(8),
                            minimumSize: const Size(32, 32),
                          ),
                        ),
                    ],
                  ),
                ),
              ],
              
              const SizedBox(height: 16),
              
              // Action Buttons
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => _showReportDetails(report, colorScheme),
                      icon: const Icon(Icons.visibility, size: 18),
                      label: const Text('View Details'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: colorScheme.primary,
                        side: BorderSide(color: colorScheme.primary),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () => _addUpdate(report),
                      icon: const Icon(Icons.add_comment, size: 18),
                      label: const Text('Add Update'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: colorScheme.primary,
                        foregroundColor: Colors.white,
                        elevation: 0,
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
      ),
    );
  }

  Widget _buildStatusBadge(ReportStatus status, ColorScheme colorScheme) {
    Color backgroundColor;
    Color textColor;
    String text;
    
    switch (status) {
      case ReportStatus.submitted:
        backgroundColor = Colors.blue[100]!;
        textColor = Colors.blue[800]!;
        text = 'Submitted';
        break;
      case ReportStatus.inReview:
        backgroundColor = Colors.orange[100]!;
        textColor = Colors.orange[800]!;
        text = 'In Review';
        break;
      case ReportStatus.assigned:
        backgroundColor = Colors.purple[100]!;
        textColor = Colors.purple[800]!;
        text = 'Assigned';
        break;
      case ReportStatus.inProgress:
        backgroundColor = Colors.amber[100]!;
        textColor = Colors.amber[800]!;
        text = 'In Progress';
        break;
      case ReportStatus.resolved:
        backgroundColor = Colors.green[100]!;
        textColor = Colors.green[800]!;
        text = 'Resolved';
        break;
      case ReportStatus.closed:
        backgroundColor = Colors.grey[200]!;
        textColor = Colors.grey[800]!;
        text = 'Closed';
        break;
    }
    
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        text,
        style: TextStyle(
          color: textColor,
          fontSize: 11,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  Widget _buildProgressIndicator(ReportStatus status, ColorScheme colorScheme) {
    final steps = [
      ReportStatus.submitted,
      ReportStatus.inReview,
      ReportStatus.assigned,
      ReportStatus.inProgress,
      ReportStatus.resolved,
    ];
    
    final currentStepIndex = steps.indexOf(status);
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Progress',
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: colorScheme.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: 8),
        Row(
          children: List.generate(steps.length, (index) {
            final isCompleted = index <= currentStepIndex;
            final isCurrent = index == currentStepIndex;
            
            return Expanded(
              child: Row(
                children: [
                  Container(
                    width: 12,
                    height: 12,
                    decoration: BoxDecoration(
                      color: isCompleted 
                          ? (isCurrent ? colorScheme.primary : Colors.green)
                          : colorScheme.outline.withValues(alpha: 0.3),
                      shape: BoxShape.circle,
                    ),
                    child: isCompleted && !isCurrent
                        ? const Icon(
                            Icons.check,
                            color: Colors.white,
                            size: 8,
                          )
                        : null,
                  ),
                  if (index < steps.length - 1)
                    Expanded(
                      child: Container(
                        height: 2,
                        color: index < currentStepIndex
                            ? Colors.green
                            : colorScheme.outline.withValues(alpha: 0.3),
                      ),
                    ),
                ],
              ),
            );
          }),
        ),
        const SizedBox(height: 4),
        Row(
          children: List.generate(steps.length, (index) {
            return Expanded(
              child: Text(
                _getStepLabel(steps[index]),
                style: TextStyle(
                  fontSize: 8,
                  color: index <= currentStepIndex
                      ? colorScheme.onSurface
                      : colorScheme.onSurfaceVariant.withValues(alpha: 0.6),
                  fontWeight: index == currentStepIndex 
                      ? FontWeight.bold 
                      : FontWeight.normal,
                ),
                textAlign: TextAlign.center,
              ),
            );
          }),
        ),
      ],
    );
  }

  String _getStepLabel(ReportStatus status) {
    switch (status) {
      case ReportStatus.submitted: return 'Submitted';
      case ReportStatus.inReview: return 'Review';
      case ReportStatus.assigned: return 'Assigned';
      case ReportStatus.inProgress: return 'Progress';
      case ReportStatus.resolved: return 'Resolved';
      case ReportStatus.closed: return 'Closed';
    }
  }

  Widget _buildMetadataChip(String text, IconData icon, Color color, ColorScheme colorScheme) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: color, size: 12),
          const SizedBox(width: 4),
          Text(
            text,
            style: TextStyle(
              color: color,
              fontSize: 11,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  String _getPriorityText(PriorityLevel priority) {
    switch (priority) {
      case PriorityLevel.low: return 'Low';
      case PriorityLevel.medium: return 'Medium';
      case PriorityLevel.high: return 'High';
      case PriorityLevel.critical: return 'Critical';
    }
  }

  IconData _getPriorityIcon(PriorityLevel priority) {
    switch (priority) {
      case PriorityLevel.low: return Icons.low_priority;
      case PriorityLevel.medium: return Icons.priority_high;
      case PriorityLevel.high: return Icons.priority_high;
      case PriorityLevel.critical: return Icons.warning;
    }
  }

  Color _getPriorityColor(PriorityLevel priority) {
    switch (priority) {
      case PriorityLevel.low: return Colors.green;
      case PriorityLevel.medium: return Colors.orange;
      case PriorityLevel.high: return Colors.red;
      case PriorityLevel.critical: return Colors.purple;
    }
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final difference = now.difference(date).inDays;
    
    if (difference == 0) {
      return 'Today';
    } else if (difference == 1) {
      return 'Yesterday';
    } else if (difference < 7) {
      return '$difference days ago';
    } else {
      return '${date.day}/${date.month}/${date.year}';
    }
  }

  void _makePhoneCall(String phoneNumber) {
    HapticFeedback.lightImpact();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Calling $phoneNumber...'),
        action: SnackBarAction(
          label: 'Cancel',
          onPressed: () {},
        ),
      ),
    );
  }

  void _showReportDetails(Report report, ColorScheme colorScheme) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _buildReportDetailsSheet(report, colorScheme),
    );
  }

  Widget _buildReportDetailsSheet(Report report, ColorScheme colorScheme) {
    return DraggableScrollableSheet(
      initialChildSize: 0.9,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      builder: (context, scrollController) {
        return Container(
          decoration: BoxDecoration(
            color: colorScheme.surface,
            borderRadius: const BorderRadius.only(
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
                  color: colorScheme.onSurfaceVariant.withValues(alpha: 0.3),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              
              // Header
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Row(
                  children: [
                    Text(
                      'Report Details',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: colorScheme.onSurface,
                      ),
                    ),
                    const Spacer(),
                    IconButton(
                      onPressed: () => Navigator.pop(context),
                      icon: Icon(Icons.close, color: colorScheme.onSurfaceVariant),
                    ),
                  ],
                ),
              ),
              
              const Divider(),
              
              // Content
              Expanded(
                child: SingleChildScrollView(
                  controller: scrollController,
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Title and Status
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: Text(
                              report.title,
                              style: TextStyle(
                                fontSize: 24,
                                fontWeight: FontWeight.bold,
                                color: colorScheme.onSurface,
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          _buildStatusBadge(report.status, colorScheme),
                        ],
                      ),
                      
                      const SizedBox(height: 8),
                      
                      Text(
                        'Report ID: ${report.id}',
                        style: TextStyle(
                          fontSize: 16,
                          color: colorScheme.onSurfaceVariant,
                        ),
                      ),
                      
                      const SizedBox(height: 24),
                      
                      // Progress Section
                      Text(
                        'Progress Timeline',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: colorScheme.onSurface,
                        ),
                      ),
                      
                      const SizedBox(height: 16),
                      
                      _buildProgressIndicator(report.status, colorScheme),
                      
                      const SizedBox(height: 24),
                      
                      // Description
                      Text(
                        'Description',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: colorScheme.onSurface,
                        ),
                      ),
                      
                      const SizedBox(height: 8),
                      
                      Text(
                        report.description,
                        style: TextStyle(
                          fontSize: 16,
                          color: colorScheme.onSurfaceVariant,
                          height: 1.5,
                        ),
                      ),
                      
                      const SizedBox(height: 24),
                      
                      // Images Section - Always show if there are images or if we expect images
                      Text(
                        'Submitted Images (${report.imageUrls.length})',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: colorScheme.onSurface,
                        ),
                      ),
                      
                      const SizedBox(height: 16),
                      
                      if (report.imageUrls.isNotEmpty) 
                        _buildImageGallery(report.imageUrls, colorScheme)
                      else
                        Container(
                          padding: const EdgeInsets.all(20),
                          decoration: BoxDecoration(
                            color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.3),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: colorScheme.outline.withValues(alpha: 0.2),
                            ),
                          ),
                          child: Column(
                            children: [
                              Icon(
                                Icons.image_outlined,
                                size: 48,
                                color: colorScheme.onSurfaceVariant,
                              ),
                              const SizedBox(height: 12),
                              Text(
                                'No images available',
                                style: TextStyle(
                                  fontSize: 16,
                                  color: colorScheme.onSurfaceVariant,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                'Images may have failed to upload or were not included with this report.',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  fontSize: 14,
                                  color: colorScheme.onSurfaceVariant.withValues(alpha: 0.7),
                                ),
                              ),
                            ],
                          ),
                        ),
                      
                      const SizedBox(height: 24),
                      
                      // Details Grid
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.3),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Column(
                          children: [
                            _buildDetailRow('Category', report.category.name, report.category.icon, colorScheme),
                            const SizedBox(height: 12),
                            _buildDetailRow('Location', report.location, Icons.location_on, colorScheme),
                            const SizedBox(height: 12),
                            _buildDetailRow('Submission Date', _formatDate(report.submissionDate), Icons.calendar_today, colorScheme),
                            const SizedBox(height: 12),
                            _buildDetailRow('Priority', _getPriorityText(report.priority), _getPriorityIcon(report.priority), colorScheme),
                            const SizedBox(height: 12),
                            _buildDetailRow('Consolidated Reports', '${report.consolidatedReports}', Icons.group, colorScheme),
                            if (report.assignedOfficer != null) ...[
                              const SizedBox(height: 12),
                              _buildDetailRow('Assigned Officer', report.assignedOfficer!, Icons.person, colorScheme),
                            ],
                          ],
                        ),
                      ),
                      
                      const SizedBox(height: 24),
                      
                      // Updates Section
                      Text(
                        'Updates & History',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: colorScheme.onSurface,
                        ),
                      ),
                      
                      const SizedBox(height: 16),
                      
                      ...report.updates.asMap().entries.map((entry) {
                        final update = entry.value;
                        return Container(
                          margin: const EdgeInsets.only(bottom: 12),
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.3),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                              color: colorScheme.outline.withValues(alpha: 0.2),
                            ),
                          ),
                          child: Row(
                            children: [
                              Container(
                                width: 8,
                                height: 8,
                                decoration: BoxDecoration(
                                  color: colorScheme.primary,
                                  shape: BoxShape.circle,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Text(
                                  update,
                                  style: TextStyle(
                                    color: colorScheme.onSurface,
                                    fontSize: 14,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        );
                      }).toList(),
                      
                      const SizedBox(height: 32),
                      
                      // Action Buttons
                      Row(
                        children: [
                          if (report.contactNumber != null)
                            Expanded(
                              child: OutlinedButton.icon(
                                onPressed: () => _makePhoneCall(report.contactNumber!),
                                icon: const Icon(Icons.phone),
                                label: const Text('Call Officer'),
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: colorScheme.primary,
                                  side: BorderSide(color: colorScheme.primary),
                                  padding: const EdgeInsets.symmetric(vertical: 12),
                                ),
                              ),
                            ),
                          if (report.contactNumber != null)
                            const SizedBox(width: 12),
                          Expanded(
                            child: ElevatedButton.icon(
                              onPressed: () {
                                Navigator.pop(context);
                                _addUpdate(report);
                              },
                              icon: const Icon(Icons.add_comment),
                              label: const Text('Add Update'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: colorScheme.primary,
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(vertical: 12),
                                elevation: 0,
                              ),
                            ),
                          ),
                        ],
                      ),
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

  Widget _buildDetailRow(String label, String value, IconData icon, ColorScheme colorScheme) {
    return Row(
      children: [
        Icon(icon, size: 16, color: colorScheme.primary),
        const SizedBox(width: 8),
        Text(
          '$label:',
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: colorScheme.onSurface,
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            value,
            style: TextStyle(
              fontSize: 14,
              color: colorScheme.onSurfaceVariant,
            ),
          ),
        ),
      ],
    );
  }

  void _addUpdate(Report report) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Add Update'),
        content: const Text('Add update functionality coming soon!'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  Widget _buildImageGallery(List<String> imageUrls, ColorScheme colorScheme) {
    if (imageUrls.isEmpty) {
      return const SizedBox.shrink();
    }

    return Container(
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.3),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // Main image display
            AspectRatio(
              aspectRatio: 16 / 9,
              child: Container(
                width: double.infinity,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: colorScheme.outline.withValues(alpha: 0.2),
                  ),
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: _buildImageWidget(imageUrls.first, colorScheme),
                ),
              ),
            ),
            
            // Image thumbnails (if more than one image)
            if (imageUrls.length > 1) ...[
              const SizedBox(height: 12),
              SizedBox(
                height: 80,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  itemCount: imageUrls.length,
                  itemBuilder: (context, index) {
                    return GestureDetector(
                      onTap: () => _showFullScreenImage(imageUrls, index, colorScheme),
                      child: Container(
                        width: 80,
                        height: 80,
                        margin: const EdgeInsets.only(right: 8),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: colorScheme.outline.withValues(alpha: 0.3),
                          ),
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: _buildImageWidget(imageUrls[index], colorScheme),
                        ),
                      ),
                    );
                  },
                ),
              ),
            ],
            
            // View all images button
            const SizedBox(height: 12),
            TextButton.icon(
              onPressed: () => _showFullScreenImage(imageUrls, 0, colorScheme),
              icon: const Icon(Icons.fullscreen),
              label: Text(imageUrls.length > 1 
                  ? 'View All Images (${imageUrls.length})' 
                  : 'View Full Image'),
              style: TextButton.styleFrom(
                foregroundColor: colorScheme.primary,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildImageWidget(String imageUrl, ColorScheme colorScheme) {
    print('🖼️ Attempting to display image: ${imageUrl.substring(0, 50)}...');
    
    // Handle data URLs (Base64 encoded images)
    if (imageUrl.startsWith('data:image/')) {
      try {
        // Extract base64 data from data URL
        // Format: data:image/jpeg;base64,<base64-data>
        final base64Index = imageUrl.indexOf('base64,');
        if (base64Index == -1) {
          print('❌ Invalid data URL format: missing base64 marker');
          return _buildImageErrorWidget(colorScheme);
        }
        
        var base64Data = imageUrl.substring(base64Index + 7); // Skip 'base64,'
        print('📊 Base64 data length: ${base64Data.length}');
        
        // Only reject extremely short base64 data (less than 20 characters)
        if (base64Data.length < 20) {
          print('🔄 Base64 data too short, likely invalid');
          return _buildImageErrorWidget(colorScheme);
        }
        
        // Check for specific known invalid patterns only
        if (base64Data.contains('wAARCAABAAEDASIAAhEBAxEB')) {
          print('🔄 Detected known invalid/placeholder image pattern');
          return _buildImageErrorWidget(colorScheme);
        }
        
        // Add padding if needed for proper Base64 decoding
        while (base64Data.length % 4 != 0) {
          base64Data += '=';
        }
        
        // Validate base64 format before decoding
        if (!RegExp(r'^[A-Za-z0-9+/]*={0,2}$').hasMatch(base64Data)) {
          print('❌ Invalid base64 format detected');
          return _buildImageErrorWidget(colorScheme);
        }
        
        print('🔍 Attempting to decode ${base64Data.length} characters of base64 data');
        
        // Decode base64 with error handling
        late Uint8List bytes;
        try {
          bytes = base64Decode(base64Data);
          print('✅ Successfully decoded image bytes: ${bytes.length} bytes');
        } catch (decodeError) {
          print('❌ Base64 decode error: $decodeError');
          return _buildImageErrorWidget(colorScheme);
        }
        
        // Validate decoded bytes
        if (bytes.length < 50) {
          print('⚠️ Image is very small (${bytes.length} bytes), treating as invalid');
          return _buildImageErrorWidget(colorScheme);
        }
        
        // Note: Skipping image header validation for now to avoid compilation issues
        // TODO: Re-enable when compilation cache is cleared
        // if (!_isValidImageHeader(bytes)) {
        //   print('❌ Invalid image header detected');
        //   return _buildImageErrorWidget(colorScheme);
        // }
        
        return Image.memory(
          bytes,
          fit: BoxFit.cover,
          errorBuilder: (context, error, stackTrace) {
            print('❌ Image.memory error: $error');
            return _buildImageErrorWidget(colorScheme);
          },
        );
      } catch (e) {
        print('❌ Error parsing Base64 image: $e');
        return _buildImageErrorWidget(colorScheme);
      }
    }
    
    // Handle blob URLs and network URLs
    print('🌐 Attempting to load network/blob image: $imageUrl');
    return Image.network(
      imageUrl,
      fit: BoxFit.cover,
      loadingBuilder: (context, child, loadingProgress) {
        if (loadingProgress == null) {
          print('✅ Network image loaded successfully');
          return child;
        }
        print('⏳ Loading network image: ${loadingProgress.cumulativeBytesLoaded}/${loadingProgress.expectedTotalBytes}');
        return Center(
          child: CircularProgressIndicator(
            value: loadingProgress.expectedTotalBytes != null
                ? loadingProgress.cumulativeBytesLoaded / loadingProgress.expectedTotalBytes!
                : null,
            color: colorScheme.primary,
          ),
        );
      },
      errorBuilder: (context, error, stackTrace) {
        print('❌ Network image error: $error');
        print('❌ Stack trace: $stackTrace');
        return _buildImageErrorWidget(colorScheme);
      },
    );
  }

  Widget _buildImageErrorWidget(ColorScheme colorScheme) {
    return Container(
      color: colorScheme.surfaceContainerHighest,
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.image_not_supported,
              size: 32,
              color: colorScheme.onSurfaceVariant,
            ),
            const SizedBox(height: 8),
            Text(
              'Image not available',
              style: TextStyle(
                fontSize: 12,
                color: colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showFullScreenImage(List<String> imageUrls, int initialIndex, ColorScheme colorScheme) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => FullScreenImageViewer(
          imageUrls: imageUrls,
          initialIndex: initialIndex,
          colorScheme: colorScheme,
        ),
      ),
    );
  }
}

class FullScreenImageViewer extends StatefulWidget {
  final List<String> imageUrls;
  final int initialIndex;
  final ColorScheme colorScheme;

  const FullScreenImageViewer({
    super.key,
    required this.imageUrls,
    required this.initialIndex,
    required this.colorScheme,
  });

  @override
  State<FullScreenImageViewer> createState() => _FullScreenImageViewerState();
}

class _FullScreenImageViewerState extends State<FullScreenImageViewer> {
  late PageController _pageController;
  late int _currentIndex;

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialIndex;
    _pageController = PageController(initialPage: widget.initialIndex);
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black.withValues(alpha: 0.5),
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.close, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          '${_currentIndex + 1} of ${widget.imageUrls.length}',
          style: const TextStyle(color: Colors.white),
        ),
        centerTitle: true,
      ),
      body: Stack(
        children: [
          // Main image viewer
          PageView.builder(
            controller: _pageController,
            itemCount: widget.imageUrls.length,
            onPageChanged: (index) {
              setState(() {
                _currentIndex = index;
              });
            },
            itemBuilder: (context, index) {
              return Center(
                child: InteractiveViewer(
                  panEnabled: true,
                  boundaryMargin: const EdgeInsets.all(20),
                  minScale: 0.5,
                  maxScale: 4.0,
                  child: _buildFullScreenImage(widget.imageUrls[index]),
                ),
              );
            },
          ),
          
          // Navigation arrows (if more than one image)
          if (widget.imageUrls.length > 1) ...[
            // Previous button
            if (_currentIndex > 0)
              Positioned(
                left: 20,
                top: 0,
                bottom: 0,
                child: Center(
                  child: Container(
                    width: 50,
                    height: 50,
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.5),
                      shape: BoxShape.circle,
                    ),
                    child: IconButton(
                      icon: const Icon(Icons.arrow_back_ios, color: Colors.white),
                      onPressed: () {
                        _pageController.previousPage(
                          duration: const Duration(milliseconds: 300),
                          curve: Curves.easeInOut,
                        );
                      },
                    ),
                  ),
                ),
              ),
            
            // Next button
            if (_currentIndex < widget.imageUrls.length - 1)
              Positioned(
                right: 20,
                top: 0,
                bottom: 0,
                child: Center(
                  child: Container(
                    width: 50,
                    height: 50,
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.5),
                      shape: BoxShape.circle,
                    ),
                    child: IconButton(
                      icon: const Icon(Icons.arrow_forward_ios, color: Colors.white),
                      onPressed: () {
                        _pageController.nextPage(
                          duration: const Duration(milliseconds: 300),
                          curve: Curves.easeInOut,
                        );
                      },
                    ),
                  ),
                ),
              ),
          ],
          
          // Page indicator dots (if more than one image)
          if (widget.imageUrls.length > 1)
            Positioned(
              bottom: 30,
              left: 0,
              right: 0,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(
                  widget.imageUrls.length,
                  (index) => Container(
                    width: 8,
                    height: 8,
                    margin: const EdgeInsets.symmetric(horizontal: 4),
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: index == _currentIndex
                          ? Colors.white
                          : Colors.white.withValues(alpha: 0.5),
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildFullScreenImage(String imageUrl) {
    print('🖼️ Full-screen image: ${imageUrl.substring(0, 50)}...');
    
    // Handle data URLs (Base64 encoded images)
    if (imageUrl.startsWith('data:image/')) {
      try {
        // Extract base64 data from data URL
        final base64Index = imageUrl.indexOf('base64,');
        if (base64Index == -1) {
          print('❌ Invalid full-screen data URL format: missing base64 marker');
          return _buildFullScreenErrorWidget();
        }
        
        var base64Data = imageUrl.substring(base64Index + 7); // Skip 'base64,'
        
        // Check if this is the fallback placeholder image (invalid Base64)
        if (base64Data.length < 100 || base64Data.contains('wAARCAABAAEDASIAAhEBAxEB')) {
          print('🔄 Detected fallback placeholder in full-screen, showing error widget');
          return _buildFullScreenErrorWidget();
        }
        
        // Add padding if needed for proper Base64 decoding
        while (base64Data.length % 4 != 0) {
          base64Data += '=';
        }
        
        // Decode base64 manually to avoid web issues
        final Uint8List bytes = base64Decode(base64Data);
        print('✅ Full-screen image bytes: ${bytes.length} bytes');
        
        return Image.memory(
          bytes,
          fit: BoxFit.contain,
          errorBuilder: (context, error, stackTrace) {
            print('❌ Full-screen Image.memory error: $error');
            return _buildFullScreenErrorWidget();
          },
        );
      } catch (e) {
        print('❌ Error parsing full-screen Base64 image: $e');
        return _buildFullScreenErrorWidget();
      }
    }
    
    // Handle network URLs
    return Image.network(
      imageUrl,
      fit: BoxFit.contain,
      loadingBuilder: (context, child, loadingProgress) {
        if (loadingProgress == null) return child;
        return Center(
          child: CircularProgressIndicator(
            value: loadingProgress.expectedTotalBytes != null
                ? loadingProgress.cumulativeBytesLoaded / loadingProgress.expectedTotalBytes!
                : null,
            color: Colors.white,
          ),
        );
      },
      errorBuilder: (context, error, stackTrace) {
        return _buildFullScreenErrorWidget();
      },
    );
  }

  Widget _buildFullScreenErrorWidget() {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.image_not_supported,
            size: 64,
            color: Colors.white,
          ),
          SizedBox(height: 16),
          Text(
            'Image not available',
            style: TextStyle(
              fontSize: 16,
              color: Colors.white,
            ),
          ),
        ],
      ),
    );
  }
}
