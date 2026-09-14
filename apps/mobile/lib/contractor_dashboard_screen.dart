import 'package:flutter/material.dart';
import 'dart:async';
import 'language_service.dart';
import 'auth_service.dart';
import 'comprehensive_database_service.dart';
import 'comprehensive_report_models.dart';
import 'contractor_profile_page.dart';

class ContractorDashboardScreen extends StatefulWidget {
  const ContractorDashboardScreen({super.key});

  @override
  State<ContractorDashboardScreen> createState() => _ContractorDashboardScreenState();
}

class _ContractorDashboardScreenState extends State<ContractorDashboardScreen> with TickerProviderStateMixin {
  final LanguageService _languageService = LanguageService();
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();
  final ComprehensiveDatabaseService _dbService = ComprehensiveDatabaseService();
  final AuthService _authService = AuthService.instance;

  int _currentIndex = 0;
  bool _isLoading = true;
  List<ComprehensiveReportModel> _assignedReports = [];
  StreamSubscription<List<ComprehensiveReportModel>>? _reportsSubscription;

  late AnimationController _animationController;
  late Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();
    _languageService.addListener(_onLanguageChanged);

    _animationController = AnimationController(
      duration: const Duration(milliseconds: 600),
      vsync: this,
    );

    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeOut),
    );

    _animationController.forward();
    _initReportsStream();
  }

  @override
  void dispose() {
    _reportsSubscription?.cancel();
    _languageService.removeListener(_onLanguageChanged);
    _animationController.dispose();
    super.dispose();
  }

  void _onLanguageChanged() {
    setState(() {});
  }

  void _initReportsStream() {
    final officerId = _authService.userId ?? 'officer-default';
    _reportsSubscription?.cancel();

    _dbService.getOfficerAssignedReports(officerId: officerId).then((reports) {
      if (mounted) {
        setState(() {
          _assignedReports = reports;
          _isLoading = false;
        });
      }
    });

    _reportsSubscription = _dbService.getOfficerAssignedReportsStream(officerId).listen((reports) {
      if (mounted) {
        setState(() {
          _assignedReports = reports;
          _isLoading = false;
        });
      }
    }, onError: (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    });
  }

  Future<void> _handleUpdateStatus(ComprehensiveReportModel report, ReportStatus newStatus) async {
    final officerId = _authService.userId ?? 'officer-id';
    
    // Prompt for resolution notes if transitioning to resolution_submitted
    String? note;
    if (newStatus == ReportStatus.resolution_submitted) {
      final textController = TextEditingController();
      final confirmed = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Submit Resolution Proof'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('Enter remediation details and confirm photographic proof:'),
              const SizedBox(height: 12),
              TextField(
                controller: textController,
                maxLines: 3,
                decoration: const InputDecoration(
                  hintText: 'e.g. Pothole filled with cold asphalt mix. Area restored.',
                  border: OutlineInputBorder(),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Submit Proof'),
            ),
          ],
        ),
      );

      if (confirmed != true) return;
      note = textController.text.trim();
    }

    final res = await _dbService.updateReportStatus(
      reportId: report.id,
      newStatus: newStatus,
      adminId: officerId,
      adminNote: note ?? 'Status updated by field contractor / duty officer',
    );

    if (res.success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Status updated to ${newStatus.displayName}'),
          backgroundColor: Colors.green,
        ),
      );
      _initReportsStream();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: _scaffoldKey,
      backgroundColor: const Color(0xFFF7F9FC),
      appBar: _buildAppBar(),
      body: FadeTransition(
        opacity: _fadeAnimation,
        child: RefreshIndicator(
          onRefresh: () async {
            _initReportsStream();
          },
          child: _buildBody(),
        ),
      ),
      bottomNavigationBar: _buildBottomNav(),
    );
  }

  AppBar _buildAppBar() {
    return AppBar(
      backgroundColor: const Color(0xFF123B63),
      elevation: 0,
      automaticallyImplyLeading: false,
      title: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(Icons.engineering_rounded, color: Colors.white, size: 20),
          ),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'CivicResolve',
                style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
              ),
              Text(
                'Field Contractor & Officer Portal',
                style: TextStyle(color: Colors.white.withValues(alpha: 0.8), fontSize: 11),
              ),
            ],
          ),
        ],
      ),
      actions: [
        IconButton(
          icon: const Icon(Icons.person, color: Colors.white),
          onPressed: () {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (context) => const ContractorProfilePage()),
            );
          },
        ),
      ],
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator(color: Color(0xFF155EEF)));
    }

    switch (_currentIndex) {
      case 0:
        return _buildWorkOrdersTab();
      case 1:
        return _buildActiveQueueTab();
      case 2:
        return _buildResolutionAuditTab();
      default:
        return _buildWorkOrdersTab();
    }
  }

  Widget _buildWorkOrdersTab() {
    final inProgress = _assignedReports.where((r) => r.status == ReportStatus.in_progress).length;
    final pending = _assignedReports.where((r) => r.status == ReportStatus.assigned || r.status == ReportStatus.submitted).length;
    final resolved = _assignedReports.where((r) => r.status == ReportStatus.resolution_submitted || r.status == ReportStatus.verified).length;

    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Officer Welcome & Duty Badge
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF155EEF), Color(0xFF175CD3)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(14),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF155EEF).withValues(alpha: 0.25),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Row(
              children: [
                const CircleAvatar(
                  radius: 24,
                  backgroundColor: Colors.white,
                  child: Icon(Icons.badge_outlined, color: Color(0xFF155EEF), size: 28),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _authService.userName,
                        style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 2),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Text(
                          'Duty Officer / Field Contractor • Zone 2 Command',
                          style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w600),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // Operational KPI Counters
          Row(
            children: [
              _buildMetricCard('Assigned', '$pending', Colors.blue, Icons.assignment_outlined),
              const SizedBox(width: 10),
              _buildMetricCard('In Progress', '$inProgress', Colors.amber, Icons.handyman_outlined),
              const SizedBox(width: 10),
              _buildMetricCard('Remediated', '$resolved', Colors.green, Icons.verified_outlined),
            ],
          ),

          const SizedBox(height: 20),

          // Section Title
          const Text(
            'Live Assigned Work Orders',
            style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF172B4D)),
          ),
          const SizedBox(height: 8),

          if (_assignedReports.isEmpty)
            Container(
              padding: const EdgeInsets.all(28),
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE4E7EC)),
              ),
              child: Column(
                children: [
                  Icon(Icons.assignment_turned_in_outlined, size: 48, color: Colors.grey[400]),
                  const SizedBox(height: 10),
                  const Text(
                    'No active grievances assigned',
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Color(0xFF526581)),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'All scheduled field work orders are up to date.',
                    style: TextStyle(fontSize: 12, color: Color(0xFF718096)),
                  ),
                ],
              ),
            )
          else
            ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _assignedReports.length,
              itemBuilder: (context, index) {
                final report = _assignedReports[index];
                return _buildComplaintWorkCard(report);
              },
            ),
        ],
      ),
    );
  }

  Widget _buildActiveQueueTab() {
    final active = _assignedReports.where((r) => r.status != ReportStatus.closed && r.status != ReportStatus.verified).toList();
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: active.length,
      itemBuilder: (context, index) => _buildComplaintWorkCard(active[index]),
    );
  }

  Widget _buildResolutionAuditTab() {
    final completed = _assignedReports.where((r) => r.status == ReportStatus.resolution_submitted || r.status == ReportStatus.verified).toList();
    if (completed.isEmpty) {
      return const Center(
        child: Text('No completed work orders awaiting audit.', style: TextStyle(color: Color(0xFF718096))),
      );
    }
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: completed.length,
      itemBuilder: (context, index) => _buildComplaintWorkCard(completed[index]),
    );
  }

  Widget _buildMetricCard(String label, String count, Color color, IconData icon) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFE4E7EC)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: color, size: 20),
            const SizedBox(height: 8),
            Text(
              count,
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF172B4D)),
            ),
            Text(
              label,
              style: const TextStyle(fontSize: 11, color: Color(0xFF526581), fontWeight: FontWeight.w500),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildComplaintWorkCard(ComprehensiveReportModel report) {
    Color priorityColor = Colors.blue;
    if (report.priority == ReportPriority.high) priorityColor = Colors.red;
    if (report.priority == ReportPriority.medium) priorityColor = Colors.amber[800]!;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: Color(0xFFE4E7EC)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.between,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: priorityColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    'Priority: ${report.priority.displayName}',
                    style: TextStyle(color: priorityColor, fontSize: 10, fontWeight: FontWeight.bold),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: const Color(0xFF155EEF).withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    report.status.displayName,
                    style: const TextStyle(color: Color(0xFF155EEF), fontSize: 10, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text(
              report.title,
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF172B4D)),
            ),
            const SizedBox(height: 4),
            Text(
              report.description,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 12, color: Color(0xFF526581)),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                const Icon(Icons.location_on_outlined, size: 14, color: Color(0xFF718096)),
                const SizedBox(width: 4),
                Expanded(
                  child: Text(
                    report.location,
                    style: const TextStyle(fontSize: 11, color: Color(0xFF718096)),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            const Divider(height: 20, color: Color(0xFFE4E7EC)),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                if (report.status == ReportStatus.submitted || report.status == ReportStatus.assigned)
                  ElevatedButton.icon(
                    onPressed: () => _handleUpdateStatus(report, ReportStatus.in_progress),
                    icon: const Icon(Icons.play_arrow, size: 16),
                    label: const Text('Start Work'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF155EEF),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                    ),
                  ),
                if (report.status == ReportStatus.in_progress)
                  ElevatedButton.icon(
                    onPressed: () => _handleUpdateStatus(report, ReportStatus.resolution_submitted),
                    icon: const Icon(Icons.camera_alt_outlined, size: 16),
                    label: const Text('Submit Proof'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF16803C),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                    ),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBottomNav() {
    return BottomNavigationBar(
      currentIndex: _currentIndex,
      onTap: (index) {
        setState(() {
          _currentIndex = index;
        });
      },
      selectedItemColor: const Color(0xFF155EEF),
      unselectedItemColor: const Color(0xFF718096),
      type: BottomNavigationBarType.fixed,
      items: const [
        BottomNavigationBarItem(
          icon: Icon(Icons.assignment_outlined),
          activeIcon: Icon(Icons.assignment),
          label: 'Work Orders',
        ),
        BottomNavigationBarItem(
          icon: Icon(Icons.handyman_outlined),
          activeIcon: Icon(Icons.handyman),
          label: 'Active Queue',
        ),
        BottomNavigationBarItem(
          icon: Icon(Icons.verified_outlined),
          activeIcon: Icon(Icons.verified),
          label: 'Audit',
        ),
      ],
    );
  }
}