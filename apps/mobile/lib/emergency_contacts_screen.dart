import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'language_service.dart';

class EmergencyContactsScreen extends StatefulWidget {
  const EmergencyContactsScreen({super.key});

  @override
  State<EmergencyContactsScreen> createState() => _EmergencyContactsScreenState();
}

class _EmergencyContactsScreenState extends State<EmergencyContactsScreen> with TickerProviderStateMixin {
  final LanguageService _languageService = LanguageService();
  late AnimationController _animationController;
  late AnimationController _staggerController;
  late Animation<double> _fadeAnimation;

  // Emergency contacts data with more details
  final List<Map<String, dynamic>> _emergencyContacts = [
    {
      'title': 'Police Emergency',
      'number': '100',
      'description': 'For immediate police assistance and crime reporting',
      'icon': Icons.local_police_rounded,
      'color': const Color(0xFFDC2626),
      'category': 'Law Enforcement',
      'available': '24/7',
      'priority': 'Critical',
    },
    {
      'title': 'Medical Emergency',
      'number': '108',
      'description': 'Ambulance and medical emergency services',
      'icon': Icons.local_hospital_rounded,
      'color': const Color(0xFFDC2626),
      'category': 'Medical',
      'available': '24/7',
      'priority': 'Critical',
    },
    {
      'title': 'Fire Brigade',
      'number': '101',
      'description': 'Fire emergency and rescue operations',
      'icon': Icons.local_fire_department_rounded,
      'color': const Color(0xFFDC2626),
      'category': 'Fire & Rescue',
      'available': '24/7',
      'priority': 'Critical',
    },
    {
      'title': 'Disaster Management',
      'number': '1078',
      'description': 'Natural disaster and emergency management',
      'icon': Icons.emergency_outlined,
      'color': const Color(0xFFEF4444),
      'category': 'Disaster',
      'available': '24/7',
      'priority': 'High',
    },
    {
      'title': 'Women Helpline',
      'number': '1091',
      'description': 'Emergency support for women in distress',
      'icon': Icons.support_agent_rounded,
      'color': const Color(0xFFEF4444),
      'category': 'Support',
      'available': '24/7',
      'priority': 'High',
    },
    {
      'title': 'Child Helpline',
      'number': '1098',
      'description': 'Emergency support for children in need',
      'icon': Icons.child_care_rounded,
      'color': const Color(0xFFEF4444),
      'category': 'Support',
      'available': '24/7',
      'priority': 'High',
    },
    {
      'title': 'Tourist Emergency',
      'number': '1363',
      'description': 'Tourist assistance and emergency support',
      'icon': Icons.tour_rounded,
      'color': const Color(0xFFF97316),
      'category': 'Support',
      'available': '24/7',
      'priority': 'Medium',
    },
    {
      'title': 'Senior Citizen Helpline',
      'number': '14567',
      'description': 'Emergency assistance for senior citizens',
      'icon': Icons.elderly_rounded,
      'color': const Color(0xFFF97316),
      'category': 'Support',
      'available': '24/7',
      'priority': 'Medium',
    },
  ];

  @override
  void initState() {
    super.initState();
    _languageService.addListener(_onLanguageChanged);
    
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
    
    _animationController.forward();
    _staggerController.forward();
  }

  @override
  void dispose() {
    _animationController.dispose();
    _staggerController.dispose();
    _languageService.removeListener(_onLanguageChanged);
    super.dispose();
  }

  void _onLanguageChanged() {
    setState(() {});
  }

  void _makeCall(String number, String title) {
    // Show confirmation dialog before calling
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            Icon(Icons.phone, color: const Color(0xFFDC2626), size: 24),
            const SizedBox(width: 8),
            const Text('Confirm Call'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Are you sure you want to call?'),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFFEF2F2),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFDC2626).withValues(alpha: 0.3)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    number,
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: const Color(0xFFDC2626),
                      letterSpacing: 1.2,
                    ),
                  ),
                ],
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
              _performCall(number, title);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFDC2626),
              foregroundColor: Colors.white,
            ),
            child: const Text('Call Now'),
          ),
        ],
      ),
    );
  }

  void _performCall(String number, String title) {
    // Haptic feedback for emergency calls
    HapticFeedback.heavyImpact();
    
    // Show calling indicator
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(child: Text('Connecting to $title ($number)...')),
          ],
        ),
        backgroundColor: const Color(0xFFDC2626),
        duration: const Duration(seconds: 3),
        action: SnackBarAction(
          label: 'Cancel',
          textColor: Colors.white,
          onPressed: () {
            ScaffoldMessenger.of(context).hideCurrentSnackBar();
          },
        ),
      ),
    );
  }

  void _showEmergencyTips() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        height: MediaQuery.of(context).size.height * 0.7,
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          children: [
            Container(
              margin: const EdgeInsets.only(top: 12),
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey[300],
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(24),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFDC2626).withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(
                      Icons.lightbulb_outlined,
                      color: Color(0xFFDC2626),
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 16),
                  const Text(
                    'Emergency Tips',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                children: [
                  _buildTipCard(
                    'Stay Calm',
                    'Keep calm and speak clearly when calling emergency services',
                    Icons.psychology_outlined,
                  ),
                  _buildTipCard(
                    'Know Your Location',
                    'Be ready to provide your exact location or nearby landmarks',
                    Icons.location_on_outlined,
                  ),
                  _buildTipCard(
                    'Have Important Info Ready',
                    'Keep medical information and emergency contacts accessible',
                    Icons.info_outlined,
                  ),
                  _buildTipCard(
                    'Follow Instructions',
                    'Listen carefully and follow the operator\'s instructions',
                    Icons.hearing_outlined,
                  ),
                  _buildTipCard(
                    'Don\'t Hang Up',
                    'Stay on the line until the operator says it\'s okay to disconnect',
                    Icons.phone_in_talk_outlined,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTipCard(String title, String description, IconData icon) {
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
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: const Color(0xFFDC2626).withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: const Color(0xFFDC2626), size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  description,
                  style: TextStyle(
                    color: Colors.grey[600],
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ),
        ],
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
        foregroundColor: const Color(0xFFDC2626),
        title: const Text(
          'Emergency Contacts',
          style: TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 20,
          ),
        ),
        actions: [
          IconButton(
            onPressed: _showEmergencyTips,
            icon: const Icon(Icons.lightbulb_outlined),
            tooltip: 'Emergency Tips',
          ),
        ],
      ),
      body: AnimatedBuilder(
        animation: _fadeAnimation,
        builder: (context, child) {
          return Opacity(
            opacity: _fadeAnimation.value,
            child: _buildEmergencyContent(),
          );
        },
      ),
    );
  }

  Widget _buildEmergencyContent() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          _buildEmergencyHeader(),
          const SizedBox(height: 24),
          _buildCriticalContacts(),
          const SizedBox(height: 16),
          _buildSupportContacts(),
          const SizedBox(height: 24),
          _buildEmergencyInfo(),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _buildEmergencyHeader() {
    return AnimatedBuilder(
      animation: _staggerController,
      builder: (context, child) {
        final progress = Curves.easeOutCubic.transform(
          ((_staggerController.value - 0.0) / (1.0 - 0.0)).clamp(0.0, 1.0),
        );
        
        return Transform.translate(
          offset: Offset(0, (1 - progress) * 30),
          child: Opacity(
            opacity: progress,
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFFDC2626), Color(0xFFEF4444)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFFDC2626).withValues(alpha: 0.3),
                    blurRadius: 20,
                    offset: const Offset(0, 10),
                  ),
                ],
              ),
              child: Column(
                children: [
                  Row(
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
                          Icons.emergency,
                          color: Colors.white,
                          size: 32,
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Emergency Services',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 24,
                                fontWeight: FontWeight.w800,
                                height: 1.2,
                              ),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              'Quick access to emergency services and support contacts',
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
                  const SizedBox(height: 20),
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
                    ),
                    child: Row(
                      children: [
                        const Icon(
                          Icons.warning_rounded,
                          color: Colors.white,
                          size: 20,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'In case of immediate danger, call the appropriate emergency number below',
                            style: TextStyle(
                              color: Colors.white.withValues(alpha: 0.95),
                              fontSize: 14,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildCriticalContacts() {
    final criticalContacts = _emergencyContacts.where((contact) => contact['priority'] == 'Critical').toList();
    
    return _buildContactSection(
      'Critical Emergency Services',
      Icons.emergency,
      criticalContacts,
      const Color(0xFFDC2626),
    );
  }

  Widget _buildSupportContacts() {
    final supportContacts = _emergencyContacts.where((contact) => contact['priority'] != 'Critical').toList();
    
    return _buildContactSection(
      'Support & Assistance',
      Icons.support_agent,
      supportContacts,
      const Color(0xFFEF4444),
    );
  }

  Widget _buildContactSection(String title, IconData icon, List<Map<String, dynamic>> contacts, Color color) {
    return Container(
      width: double.infinity,
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
          Padding(
            padding: const EdgeInsets.all(20),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(
                    icon,
                    color: color,
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
          ),
          ...contacts.map((contact) => _buildEmergencyCard(contact)),
          const SizedBox(height: 8),
        ],
      ),
    );
  }

  Widget _buildEmergencyCard(Map<String, dynamic> contact) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey[200]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: contact['color'].withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: contact['color'].withValues(alpha: 0.3)),
                ),
                child: Icon(
                  contact['icon'],
                  color: contact['color'],
                  size: 24,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            contact['title'],
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                              color: Color(0xFF1E293B),
                            ),
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: contact['color'].withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            contact['priority'],
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: contact['color'],
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      contact['description'],
                      style: TextStyle(
                        color: Colors.grey[600],
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Icon(Icons.phone, size: 16, color: Colors.grey[500]),
              const SizedBox(width: 4),
              Text(
                contact['number'],
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: contact['color'],
                  letterSpacing: 1.2,
                ),
              ),
              const SizedBox(width: 12),
              Container(
                height: 16,
                width: 1,
                color: Colors.grey[300],
              ),
              const SizedBox(width: 8),
              Icon(Icons.access_time, size: 14, color: Colors.grey[500]),
              const SizedBox(width: 4),
              Text(
                contact['available'],
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.grey[600],
                  fontWeight: FontWeight.w500,
                ),
              ),
              const Spacer(),
              ElevatedButton(
                onPressed: () => _makeCall(contact['number'], contact['title']),
                style: ElevatedButton.styleFrom(
                  backgroundColor: contact['color'],
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(20),
                  ),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.phone, size: 16),
                    SizedBox(width: 4),
                    Text('Call', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildEmergencyInfo() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFFFEF2F2),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFDC2626).withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(
                Icons.info_outline,
                color: Color(0xFFDC2626),
                size: 24,
              ),
              const SizedBox(width: 8),
              const Text(
                'Important Information',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF1E293B),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          _buildInfoItem(
            'Location Sharing',
            'Keep GPS enabled for accurate location sharing during emergencies',
            Icons.location_on_outlined,
          ),
          const SizedBox(height: 12),
          _buildInfoItem(
            'Medical Information',
            'Keep important medical information and allergies readily available',
            Icons.medical_information_outlined,
          ),
          const SizedBox(height: 12),
          _buildInfoItem(
            'Emergency Contacts',
            'Share this contact list with family members and close friends',
            Icons.share_outlined,
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: _showEmergencyTips,
              icon: const Icon(Icons.lightbulb_outlined),
              label: const Text('View Emergency Tips'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFDC2626),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoItem(String title, String description, IconData icon) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(
          icon,
          color: const Color(0xFFDC2626),
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
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF1E293B),
                ),
              ),
              const SizedBox(height: 2),
              Text(
                description,
                style: TextStyle(
                  fontSize: 13,
                  color: Colors.grey[600],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
