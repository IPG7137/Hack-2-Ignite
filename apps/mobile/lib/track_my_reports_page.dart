import 'package:flutter/material.dart';

// Report model class
class Report {
  final String id;
  final String title;
  final String description;
  final String category;
  final String location;
  final String status;
  final String priority;
  final DateTime submittedDate;
  final int reportCount;
  final List<String> progressSteps;
  final int currentStep;

  Report({
    required this.id,
    required this.title,
    required this.description,
    required this.category,
    required this.location,
    required this.status,
    required this.priority,
    required this.submittedDate,
    required this.reportCount,
    required this.progressSteps,
    required this.currentStep,
  });
}

class TrackMyReportsPage extends StatefulWidget {
  const TrackMyReportsPage({super.key});

  @override
  State<TrackMyReportsPage> createState() => _TrackMyReportsPageState();
}

class _TrackMyReportsPageState extends State<TrackMyReportsPage> {
  final TextEditingController _searchController = TextEditingController();
  String _selectedFilter = 'All';
  late Future<List<Report>> _reportsFuture;

  final List<String> _filters = ['All', 'Open', 'In Progress', 'Resolved', 'Newest'];

  @override
  void initState() {
    super.initState();
    _reportsFuture = fetchReports();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  // Mock data fetching function with 2-second delay
  Future<List<Report>> fetchReports() async {
    await Future.delayed(const Duration(seconds: 2));
    
    return [
      Report(
        id: 'RPT001',
        title: 'Potholes & Roads',
        description: 'Multiple potholes on Main Street causing vehicle damage and creating safety hazards for drivers.',
        category: 'Roads & Infrastructure',
        location: 'Main Street, Downtown',
        status: 'In Progress',
        priority: 'Medium',
        submittedDate: DateTime.now(),
        reportCount: 1,
        progressSteps: ['Submitted', 'Review', 'Assigned', 'Progress', 'Resolved'],
        currentStep: 3,
      ),
      Report(
        id: 'RPT002',
        title: 'Street Light Outage',
        description: 'Street lights not working on Oak Avenue, creating safety concerns during night hours.',
        category: 'Electricity & Lighting',
        location: 'Oak Avenue, Residential Area',
        status: 'Submitted',
        priority: 'High',
        submittedDate: DateTime.now().subtract(const Duration(days: 1)),
        reportCount: 2,
        progressSteps: ['Submitted', 'Review', 'Assigned', 'Progress', 'Resolved'],
        currentStep: 0,
      ),
      Report(
        id: 'RPT003',
        title: 'Water Leak',
        description: 'Major water leak near the park entrance affecting water supply to nearby residents.',
        category: 'Water & Sewage',
        location: 'Central Park Entrance',
        status: 'Resolved',
        priority: 'High',
        submittedDate: DateTime.now().subtract(const Duration(days: 5)),
        reportCount: 1,
        progressSteps: ['Submitted', 'Review', 'Assigned', 'Progress', 'Resolved'],
        currentStep: 4,
      ),
    ];
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    
    return Scaffold(
      appBar: _buildAppBar(colorScheme),
      body: _buildBody(colorScheme),
    );
  }

  PreferredSizeWidget _buildAppBar(ColorScheme colorScheme) {
    return AppBar(
      leading: IconButton(
        icon: const Icon(Icons.arrow_back),
        onPressed: () => Navigator.of(context).pop(),
      ),
      title: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: colorScheme.primary,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          'CivicResolve',
          style: TextStyle(
            color: colorScheme.onPrimary,
            fontWeight: FontWeight.bold,
            fontSize: 16,
          ),
        ),
      ),
      actions: [
        IconButton(
          icon: const Icon(Icons.book_outlined),
          onPressed: () {},
        ),
        IconButton(
          icon: const Icon(Icons.person_outline),
          onPressed: () {},
        ),
      ],
      backgroundColor: colorScheme.surface,
      foregroundColor: colorScheme.onSurface,
      elevation: 0,
    );
  }

  Widget _buildBody(ColorScheme colorScheme) {
    return Column(
      children: [
        // Static UI that displays immediately
        _buildHeaderSection(colorScheme),
        
        // Dynamic content area with FutureBuilder
        Expanded(
          child: _buildDynamicContentArea(colorScheme),
        ),
      ],
    );
  }

  Widget _buildHeaderSection(ColorScheme colorScheme) {
    return Container(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Main title
          Text(
            'My Reports',
            style: TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.bold,
              color: colorScheme.onSurface,
            ),
          ),
          const SizedBox(height: 16),
          
          // Search bar
          TextField(
            controller: _searchController,
            decoration: InputDecoration(
              hintText: 'Search reports, locations, categories...',
              prefixIcon: const Icon(Icons.search),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: colorScheme.outline),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: colorScheme.outline),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: colorScheme.primary, width: 2),
              ),
              filled: true,
              fillColor: colorScheme.surface,
            ),
          ),
          const SizedBox(height: 16),
          
          // Filter buttons
          Row(
            children: [
              Expanded(
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: _filters.map((filter) => _buildFilterChip(filter, colorScheme)).toList(),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String filter, ColorScheme colorScheme) {
    final isSelected = filter == _selectedFilter;
    final isNewest = filter == 'Newest';
    
    return Container(
      margin: const EdgeInsets.only(right: 8),
      child: FilterChip(
        label: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (isNewest) ...[
              const Icon(Icons.filter_list, size: 16),
              const SizedBox(width: 4),
            ],
            Text(filter),
          ],
        ),
        selected: isSelected,
        onSelected: (selected) {
          setState(() {
            _selectedFilter = filter;
          });
        },
        backgroundColor: isSelected ? colorScheme.primary : Colors.grey[200],
        selectedColor: colorScheme.primary,
        labelStyle: TextStyle(
          color: isSelected ? colorScheme.onPrimary : colorScheme.onSurface,
          fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
        ),
        showCheckmark: false,
      ),
    );
  }

  Widget _buildDynamicContentArea(ColorScheme colorScheme) {
    return FutureBuilder<List<Report>>(
      future: _reportsFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return _buildLoadingState(colorScheme);
        } else if (snapshot.hasError) {
          return _buildErrorState(colorScheme);
        } else if (snapshot.hasData) {
          final reports = snapshot.data!;
          if (reports.isEmpty) {
            return _buildEmptyState(colorScheme);
          }
          return _buildDataState(reports, colorScheme);
        } else {
          return _buildEmptyState(colorScheme);
        }
      },
    );
  }

  Widget _buildLoadingState(ColorScheme colorScheme) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          CircularProgressIndicator(
            color: colorScheme.primary,
            strokeWidth: 3,
          ),
          const SizedBox(height: 16),
          Text(
            'Loading Reports...',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: colorScheme.onSurface,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Please wait while we fetch your reports',
            style: TextStyle(
              fontSize: 14,
              color: colorScheme.onSurface.withValues(alpha: 0.7),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorState(ColorScheme colorScheme) {
    return Center(
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
            'Failed to load reports',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: colorScheme.error,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Please try again later',
            style: TextStyle(
              fontSize: 14,
              color: colorScheme.onSurface.withValues(alpha: 0.7),
            ),
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: () {
              setState(() {
                _reportsFuture = fetchReports();
              });
            },
            child: const Text('Retry'),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState(ColorScheme colorScheme) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.inbox_outlined,
            size: 64,
            color: colorScheme.onSurface.withValues(alpha: 0.5),
          ),
          const SizedBox(height: 16),
          Text(
            'You have not submitted any reports yet.',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w500,
              color: colorScheme.onSurface.withValues(alpha: 0.7),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDataState(List<Report> reports, ColorScheme colorScheme) {
    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      itemCount: reports.length,
      itemBuilder: (context, index) {
        return ReportCard(report: reports[index]);
      },
    );
  }
}

class ReportCard extends StatelessWidget {
  final Report report;

  const ReportCard({super.key, required this.report});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      color: const Color(0xFFF2F4F7),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header row with icon, title, ID, and status
            Row(
              children: [
                Container(
                  width: 24,
                  height: 24,
                  decoration: BoxDecoration(
                    color: Colors.orange,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: const Icon(
                    Icons.construction,
                    color: Colors.white,
                    size: 16,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    report.title,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                Text(
                  report.id,
                  style: TextStyle(
                    fontSize: 12,
                    color: colorScheme.onSurface.withValues(alpha: 0.6),
                  ),
                ),
                const SizedBox(width: 12),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: _getStatusColor(report.status),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    report.status,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            
            // Progress stepper
            _buildProgressStepper(report, colorScheme),
            const SizedBox(height: 16),
            
            // Information tags
            Row(
              children: [
                _buildInfoTag('${report.reportCount} Reports', Colors.blue[100]!, Colors.blue[700]!),
                const SizedBox(width: 8),
                _buildInfoTag('! ${report.priority}', Colors.orange[100]!, Colors.orange[700]!),
                const SizedBox(width: 8),
                _buildInfoTag(report.category, Colors.grey[200]!, Colors.grey[700]!),
              ],
            ),
            const SizedBox(height: 12),
            
            // Description
            Text(
              report.description,
              style: TextStyle(
                fontSize: 14,
                color: colorScheme.onSurface.withValues(alpha: 0.8),
                height: 1.4,
              ),
            ),
            const SizedBox(height: 12),
            
            // Location and timestamp
            Row(
              children: [
                Icon(
                  Icons.location_on,
                  size: 16,
                  color: colorScheme.onSurface.withValues(alpha: 0.6),
                ),
                const SizedBox(width: 4),
                Expanded(
                  child: Text(
                    report.location,
                    style: TextStyle(
                      fontSize: 12,
                      color: colorScheme.onSurface.withValues(alpha: 0.6),
                    ),
                  ),
                ),
                Text(
                  _getTimeString(report.submittedDate),
                  style: TextStyle(
                    fontSize: 12,
                    color: colorScheme.onSurface.withValues(alpha: 0.6),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            
            // Action buttons
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () {},
                    style: OutlinedButton.styleFrom(
                      side: BorderSide(color: colorScheme.primary),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    child: Text(
                      'View Details',
                      style: TextStyle(color: colorScheme.primary),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () {},
                    style: ElevatedButton.styleFrom(
                      backgroundColor: colorScheme.primary,
                      foregroundColor: colorScheme.onPrimary,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    child: const Text('+ Add Update'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProgressStepper(Report report, ColorScheme colorScheme) {
    return Row(
      children: report.progressSteps.asMap().entries.map((entry) {
        final index = entry.key;
        final step = entry.value;
        final isCompleted = index <= report.currentStep;
        final isLast = index == report.progressSteps.length - 1;
        
        return Expanded(
          child: Row(
            children: [
              // Step indicator
              Container(
                width: 20,
                height: 20,
                decoration: BoxDecoration(
                  color: isCompleted ? colorScheme.primary : Colors.grey[300],
                  borderRadius: BorderRadius.circular(10),
                ),
                child: isCompleted 
                  ? Icon(
                      Icons.check,
                      color: colorScheme.onPrimary,
                      size: 12,
                    )
                  : null,
              ),
              
              // Step label
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  step,
                  style: TextStyle(
                    fontSize: 10,
                    color: isCompleted ? colorScheme.primary : Colors.grey[600],
                    fontWeight: isCompleted ? FontWeight.w600 : FontWeight.normal,
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
              
              // Connector line
              if (!isLast)
                Container(
                  height: 2,
                  width: 20,
                  color: isCompleted ? colorScheme.primary : Colors.grey[300],
                ),
            ],
          ),
        );
      }).toList(),
    );
  }

  Widget _buildInfoTag(String text, Color backgroundColor, Color textColor) {
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
          fontSize: 12,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'submitted':
        return Colors.blue;
      case 'in progress':
        return Colors.orange;
      case 'resolved':
        return Colors.green;
      default:
        return Colors.grey;
    }
  }

  String _getTimeString(DateTime date) {
    final now = DateTime.now();
    final difference = now.difference(date);
    
    if (difference.inDays == 0) {
      return 'Today';
    } else if (difference.inDays == 1) {
      return 'Yesterday';
    } else {
      return '${difference.inDays} days ago';
    }
  }
}