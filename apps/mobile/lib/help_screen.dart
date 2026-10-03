import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'language_service.dart';

class HelpScreen extends StatefulWidget {
  const HelpScreen({super.key});

  @override
  State<HelpScreen> createState() => _HelpScreenState();
}

class _HelpScreenState extends State<HelpScreen> with TickerProviderStateMixin {
  final LanguageService _languageService = LanguageService();
  late AnimationController _animationController;
  late AnimationController _tabController;
  late TabController _tabBarController;
  late Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();
    _languageService.addListener(_onLanguageChanged);
    
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );
    
    _tabController = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );
    
    _tabBarController = TabController(length: 3, vsync: this);
    
    _fadeAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _animationController,
      curve: Curves.easeOut,
    ));
    
    _animationController.forward();
  }

  @override
  void dispose() {
    _animationController.dispose();
    _tabController.dispose();
    _tabBarController.dispose();
    _languageService.removeListener(_onLanguageChanged);
    super.dispose();
  }

  void _onLanguageChanged() {
    setState(() {});
  }

  void _copyToClipboard(String text) {
    Clipboard.setData(ClipboardData(text: text));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.check_circle, color: Colors.white, size: 20),
            const SizedBox(width: 8),
            Text('Copied: $text'),
          ],
        ),
        backgroundColor: const Color(0xFF059669),
        duration: const Duration(seconds: 2),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        elevation: 0,
        backgroundColor: Colors.transparent,
        foregroundColor: const Color(0xFF0F172A),
        title: Text(
          _languageService.getTranslation('help_support'),
          style: const TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 20,
          ),
        ),
      ),
      body: AnimatedBuilder(
        animation: _fadeAnimation,
        builder: (context, child) {
          return Opacity(
            opacity: _fadeAnimation.value,
            child: _buildHelpContent(),
          );
        },
      ),
    );
  }

  Widget _buildHelpContent() {
    return Column(
      children: [
        _buildHelpHeader(),
        const SizedBox(height: 20),
        _buildTabBar(),
        Expanded(
          child: TabBarView(
            controller: _tabBarController,
            children: [
              _buildAppGuideTab(),
              _buildFAQTab(),
              _buildContactTab(),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildHelpHeader() {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF0EA5E9), Color(0xFF0284C7)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0EA5E9).withValues(alpha: 0.3),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 60,
            height: 60,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(18),
              border: Border.all(
                color: Colors.white.withValues(alpha: 0.3),
                width: 2,
              ),
            ),
            child: const Icon(
              Icons.help_center,
              color: Colors.white,
              size: 32,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _languageService.getTranslation('were_here_to_help'),
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 24,
                    fontWeight: FontWeight.w800,
                    height: 1.2,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  _languageService.getTranslation('help_intro_desc'),
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.9),
                    fontSize: 15,
                    height: 1.4,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTabBar() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withValues(alpha: 0.1),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: TabBar(
        controller: _tabBarController,
        indicator: BoxDecoration(
          color: const Color(0xFF0EA5E9),
          borderRadius: BorderRadius.circular(10),
        ),
        indicatorSize: TabBarIndicatorSize.tab,
        indicatorPadding: const EdgeInsets.all(4),
        labelColor: Colors.white,
        unselectedLabelColor: const Color(0xFF64748B),
        labelStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
        tabs: [
          Tab(text: _languageService.getTranslation('app_guide_tab')),
          Tab(text: _languageService.getTranslation('faq_tab')),
          Tab(text: _languageService.getTranslation('contact_tab')),
        ],
      ),
    );
  }

  Widget _buildAppGuideTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildGuideSection(
            _languageService.getTranslation('getting_started'),
            Icons.play_circle_filled,
            [
              _buildGuideStep(
                _languageService.getTranslation('step_create_profile'),
                _languageService.getTranslation('step_create_profile_desc'),
                Icons.person_add,
              ),
              _buildGuideStep(
                _languageService.getTranslation('step_enable_location'),
                _languageService.getTranslation('step_enable_location_desc'),
                Icons.location_on,
              ),
              _buildGuideStep(
                '3. Choose Your Language',
                'Select your preferred language from the settings menu',
                Icons.language,
              ),
            ],
          ),
          const SizedBox(height: 24),
          _buildGuideSection(
            'Reporting Issues',
            Icons.report_problem,
            [
              _buildGuideStep(
                '1. Select Category',
                'Choose the appropriate category for your civic issue',
                Icons.category,
              ),
              _buildGuideStep(
                '2. Add Details',
                'Provide description, location, and upload photos if needed',
                Icons.edit_note,
              ),
              _buildGuideStep(
                '3. Submit Report',
                'Review and submit your report to local authorities',
                Icons.send,
              ),
            ],
          ),
          const SizedBox(height: 24),
          _buildGuideSection(
            'Tracking & Updates',
            Icons.track_changes,
            [
              _buildGuideStep(
                'Track Reports',
                'Monitor the status of your submitted reports',
                Icons.timeline,
              ),
              _buildGuideStep(
                'Receive Notifications',
                'Get updates when authorities respond to your reports',
                Icons.notifications,
              ),
              _buildGuideStep(
                'View on Map',
                'See reported issues and their locations on the interactive map',
                Icons.map,
              ),
            ],
          ),
          const SizedBox(height: 24),
          _buildGuideSection(
            'Safety Features',
            Icons.security,
            [
              _buildGuideStep(
                'Emergency Contacts',
                'Quick access to emergency services and helplines',
                Icons.emergency,
              ),
              _buildGuideStep(
                'Location Sharing',
                'Share your location during emergencies',
                Icons.my_location,
              ),
              _buildGuideStep(
                'Safety Tips',
                'Access important emergency preparedness information',
                Icons.lightbulb,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildFAQTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          _buildFAQItem(
            'How do I report a new issue?',
            'Tap on "Report a New Issue" from the dashboard, select the appropriate category, fill in the details, add photos if needed, and submit your report.',
          ),
          _buildFAQItem(
            'Can I track my submitted reports?',
            'Yes! Use the "Track Reports" feature to see the status of all your submitted reports and receive updates from authorities.',
          ),
          _buildFAQItem(
            'How do I change the app language?',
            'Go to the menu, select "Language", and choose your preferred language from the list. The app will update immediately.',
          ),
          _buildFAQItem(
            'Why do I need to enable location services?',
            'Location services help us accurately place your reports on the map and notify relevant local authorities for faster response.',
          ),
          _buildFAQItem(
            'Is my personal information safe?',
            'Yes, we prioritize your privacy. Your personal information is securely stored and only used for report management and communication purposes.',
          ),
          _buildFAQItem(
            'How long does it take to get a response?',
            'Response times vary by issue type and local authority workload. Critical issues typically receive faster attention than routine maintenance.',
          ),
          _buildFAQItem(
            'Can I edit or delete my reports?',
            'You can view and track your reports, but editing or deletion depends on the report status. Contact support for assistance with specific cases.',
          ),
          _buildFAQItem(
            'What if I have an emergency?',
            'For emergencies, use the Emergency Contacts feature to quickly call appropriate emergency services. Don\'t rely solely on the app for urgent situations.',
          ),
        ],
      ),
    );
  }

  Widget _buildContactTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          _buildContactSection(
            'Get in Touch',
            'We\'re here to help you with any questions or issues you might have.',
            [
              _buildContactMethod(
                'Email Support',
                'support@civicapp.com',
                Icons.email,
                () => _copyToClipboard('support@civicapp.com'),
              ),
              _buildContactMethod(
                'Phone Support',
                '+1 (555) 123-4567',
                Icons.phone,
                () => _copyToClipboard('+1 (555) 123-4567'),
              ),
              _buildContactMethod(
                'Live Chat',
                'Available 9 AM - 6 PM',
                Icons.chat,
                () => _showComingSoonDialog('Live Chat'),
              ),
            ],
          ),
          const SizedBox(height: 24),
          _buildContactSection(
            'Technical Support',
            'For technical issues, bug reports, or feature requests.',
            [
              _buildContactMethod(
                'Technical Email',
                'tech@civicapp.com',
                Icons.bug_report,
                () => _copyToClipboard('tech@civicapp.com'),
              ),
              _buildContactMethod(
                'Report a Bug',
                'Help us improve',
                Icons.feedback,
                () => _showFeedbackDialog(),
              ),
            ],
          ),
          const SizedBox(height: 24),
          _buildContactSection(
            'Community',
            'Connect with other users and stay updated.',
            [
              _buildContactMethod(
                'Community Forum',
                'Join discussions',
                Icons.forum,
                () => _showComingSoonDialog('Community Forum'),
              ),
              _buildContactMethod(
                'Social Media',
                '@CivicApp',
                Icons.share,
                () => _showComingSoonDialog('Social Media'),
              ),
            ],
          ),
          const SizedBox(height: 24),
          _buildOfficeInfo(),
        ],
      ),
    );
  }

  Widget _buildGuideSection(String title, IconData icon, List<Widget> steps) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withValues(alpha: 0.1),
            blurRadius: 10,
            offset: const Offset(0, 2),
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
                  color: const Color(0xFF0EA5E9).withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  icon,
                  color: const Color(0xFF0EA5E9),
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Text(
                title,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF1E293B),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          ...steps,
        ],
      ),
    );
  }

  Widget _buildGuideStep(String title, String description, IconData icon) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey[200]!),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: const Color(0xFF0EA5E9).withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              icon,
              color: const Color(0xFF0EA5E9),
              size: 20,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 15,
                    color: Color(0xFF1E293B),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  description,
                  style: TextStyle(
                    color: Colors.grey[600],
                    fontSize: 13,
                    height: 1.4,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFAQItem(String question, String answer) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withValues(alpha: 0.1),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: ExpansionTile(
        title: Text(
          question,
          style: const TextStyle(
            fontWeight: FontWeight.w600,
            fontSize: 15,
            color: Color(0xFF1E293B),
          ),
        ),
        iconColor: const Color(0xFF0EA5E9),
        collapsedIconColor: const Color(0xFF64748B),
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            child: Text(
              answer,
              style: TextStyle(
                color: Colors.grey[600],
                fontSize: 14,
                height: 1.5,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildContactSection(String title, String description, List<Widget> methods) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withValues(alpha: 0.1),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Color(0xFF1E293B),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            description,
            style: TextStyle(
              color: Colors.grey[600],
              fontSize: 14,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 16),
          ...methods,
        ],
      ),
    );
  }

  Widget _buildContactMethod(String title, String subtitle, IconData icon, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: const Color(0xFFF8FAFC),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.grey[200]!),
        ),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: const Color(0xFF0EA5E9).withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                icon,
                color: const Color(0xFF0EA5E9),
                size: 22,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 15,
                      color: Color(0xFF1E293B),
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: TextStyle(
                      color: Colors.grey[600],
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
            ),
            Icon(
              Icons.arrow_forward_ios,
              size: 16,
              color: Colors.grey[400],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildOfficeInfo() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(
                Icons.business,
                color: Colors.white,
                size: 24,
              ),
              const SizedBox(width: 12),
              const Text(
                'Office Information',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          _buildOfficeDetail(Icons.location_on, 'Address', '123 Civic Center Drive\nCity, State 12345'),
          const SizedBox(height: 12),
          _buildOfficeDetail(Icons.access_time, 'Office Hours', 'Monday - Friday: 9:00 AM - 6:00 PM\nSaturday: 10:00 AM - 4:00 PM'),
          const SizedBox(height: 12),
          _buildOfficeDetail(Icons.language, 'Languages', 'English, Hindi, Regional Languages'),
        ],
      ),
    );
  }

  Widget _buildOfficeDetail(IconData icon, String title, String detail) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(
          icon,
          color: Colors.white70,
          size: 20,
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w600,
                  fontSize: 14,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                detail,
                style: TextStyle(
                  color: Colors.white70,
                  fontSize: 13,
                  height: 1.4,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  void _showComingSoonDialog(String feature) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            Icon(Icons.upcoming, color: const Color(0xFF0EA5E9)),
            const SizedBox(width: 8),
            const Text('Coming Soon'),
          ],
        ),
        content: Text('$feature feature will be available in a future update. Stay tuned!'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  void _showFeedbackDialog() {
    final TextEditingController feedbackController = TextEditingController();
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Send Feedback'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Help us improve by sharing your feedback or reporting bugs.'),
            const SizedBox(height: 16),
            TextField(
              controller: feedbackController,
              maxLines: 4,
              decoration: InputDecoration(
                hintText: 'Describe the issue or suggestion...',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Thank you for your feedback!'),
                  backgroundColor: Color(0xFF059669),
                ),
              );
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF0EA5E9),
            ),
            child: const Text('Send'),
          ),
        ],
      ),
    );
  }
}