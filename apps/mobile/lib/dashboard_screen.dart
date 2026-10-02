import 'package:flutter/material.dart';
import 'dart:async';
import 'language_service.dart';
import 'category_selection_screen.dart';
import 'comprehensive_track_reports_screen.dart';
import 'notifications_screen.dart';
import 'notification_service.dart';
import 'emergency_contacts_screen.dart';
import 'map_view_screen.dart';
import 'language_selection_screen.dart';
import 'profile_page.dart';
import 'auth_service.dart';
import 'comprehensive_database_service.dart';
import 'comprehensive_report_models.dart';
import 'ai_copilot_sheet.dart';
import 'civic_feed_screen.dart';
import 'location_service.dart';

class DashboardScreen extends StatefulWidget {
  final bool isAdmin;
  
  const DashboardScreen({super.key, this.isAdmin = false});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final LanguageService _languageService = LanguageService();
  final LocationService _locationService = LocationService.instance;
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();
  final ComprehensiveDatabaseService _databaseService = ComprehensiveDatabaseService();

  List<ComprehensiveReportModel> _recentReports = [];
  bool _isLoadingReports = true;
  StreamSubscription<List<ComprehensiveReportModel>>? _reportsSubscription;

  @override
  void initState() {
    super.initState();
    _languageService.addListener(_onLanguageChanged);
    _locationService.addListener(_onLocationChanged);
    _locationService.resolveLocation();
    _initializeRecentReports();
  }

  @override
  void dispose() {
    _reportsSubscription?.cancel();
    _languageService.removeListener(_onLanguageChanged);
    _locationService.removeListener(_onLocationChanged);
    super.dispose();
  }

  void _onLanguageChanged() {
    setState(() {});
  }

  void _onLocationChanged() {
    if (mounted) setState(() {});
  }

  void _initializeRecentReports() {
    final authService = AuthService.instance;
    final userId = authService.userId ?? authService.supabaseUser?.id ?? '';

    _reportsSubscription?.cancel();
    try {
      final stream = widget.isAdmin
          ? _databaseService.getAllReportsStream()
          : _databaseService.getUserReportsStream(userId);

      _reportsSubscription = stream.listen((reports) {
        if (mounted) {
          setState(() {
            _recentReports = reports.take(5).toList();
            _isLoadingReports = false;
          });
        }
      }, onError: (e) {
        if (mounted) {
          setState(() {
            _isLoadingReports = false;
          });
        }
      });
    } catch (_) {
      if (mounted) {
        setState(() {
          _isLoadingReports = false;
        });
      }
    }
  }

  String _getTimeGreeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: _scaffoldKey,
      backgroundColor: const Color(0xFFF7F9FC),
      appBar: _buildAppBar(),
      drawer: _buildSidebar(),
      body: RefreshIndicator(
        onRefresh: () async {
          _initializeRecentReports();
        },
        color: const Color(0xFF155EEF),
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 1. Official Municipal Welcome Card
              _buildWelcomeCard(),
              
              const SizedBox(height: 16),
              
              // 2. Primary Action: Report a Problem
              _buildPrimaryReportBanner(),
              
              const SizedBox(height: 20),
              
              // 3. Quick Actions Section
              _buildQuickActionsHeader(),
              const SizedBox(height: 10),
              _buildQuickActionsGrid(),
              
              const SizedBox(height: 24),
              
              // 4. Recent Grievances Section
              _buildRecentGrievancesHeader(),
              const SizedBox(height: 10),
              _buildRecentGrievancesList(),
              
              const SizedBox(height: 24),
              
              // 5. Official Government Municipal Footer Note
              _buildGovernmentFooter(),
              
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
      bottomNavigationBar: _buildBottomNav(),
    );
  }

  PreferredSizeWidget _buildAppBar() {
    return AppBar(
      backgroundColor: const Color(0xFF123B63), // Deep Municipal Navy
      foregroundColor: Colors.white,
      elevation: 0,
      leading: IconButton(
        icon: const Icon(Icons.menu_rounded, color: Colors.white),
        tooltip: 'Menu',
        onPressed: () => _scaffoldKey.currentState?.openDrawer(),
      ),
      title: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'CivicResolve',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: Colors.white,
              letterSpacing: -0.2,
            ),
          ),
          Text(
            widget.isAdmin ? 'Municipal Administrative Control' : 'Municipal Citizen Services',
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w400,
              color: Color(0xFFCBD5E1),
            ),
          ),
        ],
      ),
      actions: [
        IconButton(
          icon: const Icon(Icons.smart_toy_rounded, color: Colors.white, size: 22),
          tooltip: 'AI Civic Copilot',
          onPressed: () => AiCopilotSheet.show(context, reports: _recentReports),
        ),
        // Language Selector Action
        IconButton(
          icon: const Icon(Icons.translate_rounded, color: Colors.white, size: 20),
          tooltip: 'Select Language',
          onPressed: _showLanguageSelector,
        ),
        // Notifications Action
        ValueListenableBuilder<int>(
          valueListenable: NotificationService().unreadCountNotifier,
          builder: (context, count, child) {
            return Stack(
              alignment: Alignment.center,
              children: [
                IconButton(
                  icon: const Icon(Icons.notifications_outlined, color: Colors.white),
                  tooltip: 'Notifications',
                  onPressed: _navigateToNotifications,
                ),
                if (count > 0)
                  Positioned(
                    right: 8,
                    top: 8,
                    child: Container(
                      padding: const EdgeInsets.all(3),
                      decoration: const BoxDecoration(
                        color: Color(0xFFD92D20),
                        shape: BoxShape.circle,
                      ),
                      constraints: const BoxConstraints(minWidth: 14, minHeight: 14),
                      child: Text(
                        count > 9 ? '9+' : '$count',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 9,
                          fontWeight: FontWeight.bold,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ),
              ],
            );
          },
        ),
        const SizedBox(width: 4),
      ],
    );
  }

  Widget _buildWelcomeCard() {
    final greeting = _getTimeGreeting();
    final authService = AuthService.instance;
    final userName = authService.userName;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE4E7EC)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0A000000),
            blurRadius: 6,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: const Color(0xFFEFF8FF),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFFB2DDFF)),
            ),
            child: const Icon(
              Icons.account_balance_rounded,
              color: Color(0xFF155EEF),
              size: 24,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '$greeting, $userName',
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF172B4D),
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  _locationService.municipalityTitle,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF475467),
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 3),
                Row(
                  children: [
                    const Icon(Icons.location_on, size: 12, color: Color(0xFF155EEF)),
                    const SizedBox(width: 3),
                    Expanded(
                      child: Text(
                        _locationService.currentAreaLabel,
                        style: const TextStyle(
                          fontSize: 11,
                          color: Color(0xFF155EEF),
                          fontWeight: FontWeight.w500,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    InkWell(
                      onTap: () => _locationService.resolveLocation(forceRefresh: true),
                      child: const Padding(
                        padding: EdgeInsets.symmetric(horizontal: 4),
                        child: Icon(Icons.refresh_rounded, size: 14, color: Color(0xFF155EEF)),
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
  }

  Widget _buildPrimaryReportBanner() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xFF155EEF), // Government primary blue
        borderRadius: BorderRadius.circular(14),
        boxShadow: const [
          BoxShadow(
            color: Color(0x24155EEF),
            blurRadius: 10,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.18),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.campaign_outlined, color: Colors.white, size: 22),
              ),
              const SizedBox(width: 12),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Report a Municipal Problem',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    SizedBox(height: 2),
                    Text(
                      'Potholes, water supply, streetlights, garbage & sanitation',
                      style: TextStyle(
                        color: Color(0xFFEFF8FF),
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            height: 44,
            child: ElevatedButton.icon(
              onPressed: _navigateToReportIssue,
              icon: const Icon(Icons.add_circle_outline, size: 18, color: Color(0xFF155EEF)),
              label: const Text(
                'Register New Grievance',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF155EEF),
                ),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.white,
                foregroundColor: const Color(0xFF155EEF),
                elevation: 0,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickActionsHeader() {
    return const Text(
      'Citizen Services',
      style: TextStyle(
        fontSize: 15,
        fontWeight: FontWeight.w700,
        color: Color(0xFF172B4D),
      ),
    );
  }

  Widget _buildQuickActionsGrid() {
    return GridView.count(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisCount: 2,
      crossAxisSpacing: 12,
      mainAxisSpacing: 12,
      childAspectRatio: 1.55,
      children: [
        _buildActionTile(
          title: 'Local Civic Feed',
          subtitle: 'Discover & support',
          icon: Icons.forum_rounded,
          iconColor: const Color(0xFFD97706),
          bgColor: const Color(0xFFFFFBEB),
          onTap: _navigateToCivicFeed,
        ),
        _buildActionTile(
          title: 'Nearby Civic Map',
          subtitle: 'OpenStreetMap view',
          icon: Icons.map_outlined,
          iconColor: const Color(0xFF059669),
          bgColor: const Color(0xFFECFDF5),
          onTap: _navigateToMapView,
        ),
        _buildActionTile(
          title: 'Track Grievances',
          subtitle: 'Live status timeline',
          icon: Icons.track_changes_rounded,
          iconColor: const Color(0xFF155EEF),
          bgColor: const Color(0xFFEFF8FF),
          onTap: _navigateToTrackReports,
        ),
        _buildActionTile(
          title: 'Emergency Helpline',
          subtitle: 'Control room & police',
          icon: Icons.phone_in_talk_rounded,
          iconColor: const Color(0xFFD92D20),
          bgColor: const Color(0xFFFEF3F2),
          onTap: _showEmergencyContacts,
        ),
      ],
    );
  }

  Widget _buildActionTile({
    required String title,
    required String subtitle,
    required IconData icon,
    required Color iconColor,
    required Color bgColor,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFE4E7EC)),
          boxShadow: const [
            BoxShadow(
              color: Color(0x08000000),
              blurRadius: 4,
              offset: Offset(0, 1),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: bgColor,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Icon(icon, color: iconColor, size: 18),
                ),
                const Spacer(),
                const Icon(Icons.arrow_forward_ios, size: 12, color: Color(0xFF98A2B3)),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              title,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: Color(0xFF172B4D),
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            Text(
              subtitle,
              style: const TextStyle(
                fontSize: 11,
                color: Color(0xFF667085),
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRecentGrievancesHeader() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'My Recent Complaints',
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w700,
                color: Color(0xFF172B4D),
              ),
            ),
            SizedBox(height: 2),
            Text(
              'Personal grievance submissions & status',
              style: TextStyle(
                fontSize: 11,
                color: Color(0xFF667085),
              ),
            ),
          ],
        ),
        if (_recentReports.isNotEmpty)
          TextButton(
            onPressed: _navigateToTrackReports,
            style: TextButton.styleFrom(
              padding: EdgeInsets.zero,
              visualDensity: VisualDensity.compact,
              foregroundColor: const Color(0xFF155EEF),
            ),
            child: const Text('View All Track', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold)),
          ),
      ],
    );
  }

  Widget _buildRecentGrievancesList() {
    if (_isLoadingReports) {
      return Container(
        padding: const EdgeInsets.all(24),
        alignment: Alignment.center,
        child: const SizedBox(
          width: 24,
          height: 24,
          child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF155EEF)),
        ),
      );
    }

    if (_recentReports.isEmpty) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(22),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFE4E7EC)),
          boxShadow: const [
            BoxShadow(
              color: Color(0x06000000),
              blurRadius: 6,
              offset: Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          children: [
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                color: const Color(0xFFEFF8FF),
                shape: BoxShape.circle,
                border: Border.all(color: const Color(0xFFB2DDFF)),
              ),
              child: const Center(
                child: Text('🌱', style: TextStyle(fontSize: 24)),
              ),
            ),
            const SizedBox(height: 12),
            const Text(
              "No personal grievances registered yet",
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w700,
                color: Color(0xFF172B4D),
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 6),
            const Text(
              'Your verified citizen account is active. When you report a municipal issue, track real-time dispatch progress and field resolution evidence right here.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 12.5,
                color: Color(0xFF667085),
                height: 1.4,
              ),
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: _navigateToReportIssue,
              icon: const Icon(Icons.add_a_photo_outlined, size: 16),
              label: const Text('Register New Grievance', style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.bold)),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF155EEF),
                foregroundColor: Colors.white,
                elevation: 0,
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
            ),
          ],
        ),
      );
    }

    return Column(
      children: _recentReports.map((report) => _buildRecentReportItem(report)).toList(),
    );
  }

  Widget _buildRecentReportItem(ComprehensiveReportModel report) {
    final formattedId = '#CR-${report.id.padLeft(4, '0')}';
    final statusColor = _getStatusColor(report.status);
    final statusText = _getStatusLabel(report.status);
    final displayTitle = report.title.isNotEmpty ? report.title : report.category;
    final displayDescription = report.description.trim().isNotEmpty
        ? report.description.trim()
        : 'No description provided.';

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE4E7EC)),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () {
          ComprehensiveTrackReportsScreen.showReportDetailsModal(
            context,
            report,
            onFeedbackSubmitted: _initializeRecentReports,
          );
        },
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF2F4F7),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Icon(_getCategoryIcon(report.category), size: 16, color: const Color(0xFF344054)),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    formattedId,
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF155EEF),
                    ),
                  ),
                  const Spacer(),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                    decoration: BoxDecoration(
                      color: statusColor.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      statusText,
                      style: TextStyle(
                        fontSize: 10.5,
                        fontWeight: FontWeight.bold,
                        color: statusColor,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                displayTitle,
                style: const TextStyle(
                  fontSize: 13.5,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF172B4D),
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 3),
              Text(
                displayDescription,
                style: const TextStyle(
                  fontSize: 12,
                  color: Color(0xFF475467),
                  height: 1.3,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  const Icon(Icons.location_on, size: 12, color: Color(0xFF98A2B3)),
                  const SizedBox(width: 3),
                  Expanded(
                    child: Text(
                      report.location.isNotEmpty ? report.location : "Location on file",
                      style: const TextStyle(
                        fontSize: 11,
                        color: Color(0xFF667085),
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  Text(
                    report.submittedTime,
                    style: const TextStyle(
                      fontSize: 10.5,
                      color: Color(0xFF98A2B3),
                    ),
                  ),
                  const SizedBox(width: 4),
                  const Icon(Icons.chevron_right, size: 16, color: Color(0xFF98A2B3)),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildGovernmentFooter() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFF2F4F7),
        borderRadius: BorderRadius.circular(8),
      ),
      child: const Row(
        children: [
          Icon(Icons.shield_outlined, size: 16, color: Color(0xFF475467)),
          SizedBox(width: 8),
          Expanded(
            child: Text(
              'Official Civic Redressal Service • Public Grievance Cell',
              style: TextStyle(
                fontSize: 11,
                color: Color(0xFF475467),
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBottomNav() {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: Color(0xFFE4E7EC), width: 1)),
      ),
      child: BottomNavigationBar(
        currentIndex: 0,
        backgroundColor: Colors.white,
        selectedItemColor: const Color(0xFF155EEF),
        unselectedItemColor: const Color(0xFF667085),
        selectedFontSize: 12,
        unselectedFontSize: 12,
        type: BottomNavigationBarType.fixed,
        elevation: 0,
        onTap: (index) {
          switch (index) {
            case 0:
              // Home - already here
              break;
            case 1:
              _navigateToReportIssue();
              break;
            case 2:
              _navigateToTrackReports();
              break;
            case 3:
              _navigateToMapView();
              break;
          }
        },
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.home_outlined),
            activeIcon: Icon(Icons.home),
            label: 'Home',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.add_circle_outline),
            activeIcon: Icon(Icons.add_circle),
            label: 'Report',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.track_changes_outlined),
            activeIcon: Icon(Icons.track_changes),
            label: 'Track',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.map_outlined),
            activeIcon: Icon(Icons.map),
            label: 'Map',
          ),
        ],
      ),
    );
  }

  Widget _buildSidebar() {
    final authService = AuthService.instance;
    final userName = authService.userName;
    final userEmail = authService.userEmail ?? '';

    return Drawer(
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          DrawerHeader(
            decoration: const BoxDecoration(
              color: Color(0xFF123B63),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                const CircleAvatar(
                  radius: 24,
                  backgroundColor: Color(0xFFEFF8FF),
                  child: Icon(Icons.person, color: Color(0xFF155EEF), size: 28),
                ),
                const SizedBox(height: 10),
                Text(
                  userName,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                if (userEmail.isNotEmpty)
                  Text(
                    userEmail,
                    style: const TextStyle(
                      color: Color(0xFFCBD5E1),
                      fontSize: 12,
                    ),
                  ),
              ],
            ),
          ),
          ListTile(
            leading: const Icon(Icons.home_outlined, color: Color(0xFF155EEF)),
            title: const Text('Home Dashboard'),
            onTap: () => Navigator.pop(context),
          ),
          ListTile(
            leading: const Icon(Icons.add_circle_outline, color: Color(0xFF155EEF)),
            title: const Text('Register Grievance'),
            onTap: () {
              Navigator.pop(context);
              _navigateToReportIssue();
            },
          ),
          ListTile(
            leading: const Icon(Icons.track_changes_outlined, color: Color(0xFF155EEF)),
            title: const Text('Track Complaints'),
            onTap: () {
              Navigator.pop(context);
              _navigateToTrackReports();
            },
          ),
          ListTile(
            leading: const Icon(Icons.map_outlined, color: Color(0xFF155EEF)),
            title: const Text('Nearby Issues Map'),
            onTap: () {
              Navigator.pop(context);
              _navigateToMapView();
            },
          ),
          const Divider(),
          ListTile(
            leading: const Icon(Icons.phone_in_talk_outlined, color: Color(0xFF344054)),
            title: const Text('Emergency Helpline'),
            onTap: () {
              Navigator.pop(context);
              _showEmergencyContacts();
            },
          ),
          ListTile(
            leading: const Icon(Icons.language_rounded, color: Color(0xFF344054)),
            title: const Text('Change Language'),
            onTap: () {
              Navigator.pop(context);
              _showLanguageSelector();
            },
          ),
          ListTile(
            leading: const Icon(Icons.person_outline, color: Color(0xFF344054)),
            title: const Text('Profile'),
            onTap: () {
              Navigator.pop(context);
              _navigateToProfile();
            },
          ),
          const Divider(),
          ListTile(
            leading: const Icon(Icons.logout, color: Color(0xFFD92D20)),
            title: const Text('Log Out', style: TextStyle(color: Color(0xFFD92D20))),
            onTap: () {
              Navigator.pop(context);
              _handleLogout();
            },
          ),
        ],
      ),
    );
  }

  void _navigateToCivicFeed() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => CivicFeedScreen(
          userLatitude: _locationService.latitude,
          userLongitude: _locationService.longitude,
        ),
      ),
    );
  }

  void _navigateToReportIssue() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const CategorySelectionScreen()),
    );
  }

  void _navigateToTrackReports() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const ComprehensiveTrackReportsScreen()),
    );
  }

  void _navigateToMapView() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const MapViewScreen()),
    );
  }

  void _navigateToNotifications() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const NotificationsScreen()),
    );
  }

  void _navigateToProfile() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const ProfilePage()),
    );
  }

  void _showEmergencyContacts() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const EmergencyContactsScreen()),
    );
  }

  void _showLanguageSelector() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const LanguageSelectionScreen()),
    );
  }

  void _handleLogout() {
    AuthService.instance.signOut();
    Navigator.of(context).pushNamedAndRemoveUntil('/', (route) => false);
  }

  static Color _getStatusColor(ReportStatus status) {
    switch (status) {
      case ReportStatus.submitted:
        return const Color(0xFF155EEF);
      case ReportStatus.review:
      case ReportStatus.underReview:
        return const Color(0xFF4F46E5);
      case ReportStatus.assigned:
        return const Color(0xFF7C3AED);
      case ReportStatus.progress:
      case ReportStatus.inProgress:
        return const Color(0xFFD97706);
      case ReportStatus.resolutionSubmitted:
        return const Color(0xFF0284C7);
      case ReportStatus.citizenVerification:
        return const Color(0xFF0D9488);
      case ReportStatus.resolved:
      case ReportStatus.verified:
        return const Color(0xFF12B76A);
      case ReportStatus.reopened:
        return const Color(0xFFEA580C);
      case ReportStatus.closed:
        return const Color(0xFF475569);
      case ReportStatus.rejected:
        return const Color(0xFFDC2626);
    }
  }

  static String _getStatusLabel(ReportStatus status) {
    switch (status) {
      case ReportStatus.submitted:
        return 'Submitted';
      case ReportStatus.review:
      case ReportStatus.underReview:
        return 'Under Review';
      case ReportStatus.assigned:
        return 'Assigned';
      case ReportStatus.progress:
      case ReportStatus.inProgress:
        return 'In Progress';
      case ReportStatus.resolutionSubmitted:
        return 'Resolution Submitted';
      case ReportStatus.citizenVerification:
        return 'Citizen Verification';
      case ReportStatus.resolved:
      case ReportStatus.verified:
        return 'Verified';
      case ReportStatus.reopened:
        return 'Reopened';
      case ReportStatus.closed:
        return 'Closed';
      case ReportStatus.rejected:
        return 'Rejected';
    }
  }

  static IconData _getCategoryIcon(String category) {
    final cat = category.toLowerCase();
    if (cat.contains('road') || cat.contains('pothole')) return Icons.add_road_rounded;
    if (cat.contains('water') || cat.contains('leak')) return Icons.water_drop_rounded;
    if (cat.contains('drain') || cat.contains('sewage')) return Icons.water_rounded;
    if (cat.contains('electric') || cat.contains('light')) return Icons.lightbulb_rounded;
    if (cat.contains('garbage') || cat.contains('waste')) return Icons.delete_outline_rounded;
    if (cat.contains('safety') || cat.contains('manhole')) return Icons.shield_outlined;
    return Icons.report_problem_outlined;
  }
}