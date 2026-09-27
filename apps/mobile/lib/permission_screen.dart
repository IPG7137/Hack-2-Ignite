import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'permission_service.dart';
import 'welcome_onboarding_page.dart';
import 'welcome_screen.dart';

class PermissionScreen extends StatefulWidget {
  final VoidCallback onPermissionsHandled;
  
  const PermissionScreen({
    super.key,
    required this.onPermissionsHandled,
  });

  @override
  State<PermissionScreen> createState() => _PermissionScreenState();
}

class _PermissionScreenState extends State<PermissionScreen> with TickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<double> _fadeAnimation;
  late Animation<double> _scaleAnimation;
  
  bool _isRequesting = false;
  Map<String, bool> _permissionResults = {};
  
  final List<Map<String, dynamic>> _permissions = [
    {
      'type': 'location',
      'title': 'Location Access',
      'description': kIsWeb 
          ? 'Your browser will ask for location access to accurately place your reports and show nearby issues.'
          : 'We need location access to accurately place your reports and show nearby issues.',
      'icon': Icons.location_on_rounded,
      'color': const Color(0xFF0EA5E9),
    },
    {
      'type': 'camera',
      'title': 'Camera Access',
      'description': kIsWeb 
          ? 'Your browser will request camera access when you take photos for reporting civic issues.'
          : 'Camera access allows you to take photos when reporting civic issues.',
      'icon': Icons.camera_alt_rounded,
      'color': const Color(0xFF10B981),
    },
    {
      'type': 'media',
      'title': 'Media Access',
      'description': kIsWeb 
          ? 'File picker will allow you to select photos from your device to attach to reports.'
          : 'Media access lets you attach photos from your gallery to reports.',
      'icon': Icons.photo_library_rounded,
      'color': const Color(0xFF8B5CF6),
    },
  ];

  @override
  void initState() {
    super.initState();
    
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 1200),
      vsync: this,
    );
    
    _fadeAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _animationController,
      curve: Curves.easeOutCubic,
    ));
    
    _scaleAnimation = Tween<double>(
      begin: 0.8,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _animationController,
      curve: Curves.elasticOut,
    ));
    
    _animationController.forward();
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  Future<void> _requestPermissions() async {
    setState(() {
      _isRequesting = true;
    });

    try {
      final results = await PermissionService.requestFirstLaunchPermissions();
      if (!mounted) return;
      
      setState(() {
        _permissionResults = results;
        _isRequesting = false;
      });
      
      // Navigate based on permissions
      if (results.values.every((granted) => granted)) {
        // All permissions granted - go to onboarding
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (context) => const WelcomeOnboardingPage(),
          ),
        );
      } else {
        // Some permissions denied - show status
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Some permissions were denied. You can still use the app with limited functionality.'),
            backgroundColor: Colors.orange,
            action: SnackBarAction(
              label: 'Continue',
              onPressed: () {
                Navigator.pushReplacement(
                  context,
                  MaterialPageRoute(
                    builder: (context) => const WelcomeOnboardingPage(),
                  ),
                );
              },
            ),
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isRequesting = false;
      });
      
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error requesting permissions: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  void _skipAllPermissions() {
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(
        builder: (context) => const WelcomeScreen(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: FadeTransition(
        opacity: _fadeAnimation,
        child: ScaleTransition(
          scale: _scaleAnimation,
          child: _buildPermissionContent(),
        ),
      ),
    );
  }

  Widget _buildPermissionContent() {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          children: [
            _buildHeader(),
            const SizedBox(height: 32),
            _buildProgressBar(),
            const SizedBox(height: 24),
            Expanded(child: _buildPermissionList()),
            const SizedBox(height: 24),
            if (_isRequesting) _buildProgressIndicator() else _buildActionButtons(),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Column(
      children: [
        Container(
          width: 100,
          height: 100,
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF0EA5E9), Color(0xFF3B82F6)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(30),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF0EA5E9).withValues(alpha: 0.3),
                blurRadius: 20,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: const Icon(
            Icons.shield_rounded,
            color: Colors.white,
            size: 50,
          ),
        ),
        const SizedBox(height: 24),
        const Text(
          'App Permissions',
          style: TextStyle(
            fontSize: 28,
            fontWeight: FontWeight.w800,
            color: Color(0xFF1E293B),
          ),
        ),
        const SizedBox(height: 8),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Text(
            'To provide you with the best experience, CivicResolve needs a few permissions. These help us serve you better.',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 16,
              color: Colors.grey[600],
              height: 1.5,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildProgressBar() {
    int totalPermissions = _permissions.length;
    int grantedPermissions = _permissionResults.values.where((result) => result).length;
    double progress = totalPermissions > 0 ? grantedPermissions / totalPermissions : 0.0;
    
    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Setup Progress',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: Colors.grey[700],
              ),
            ),
            Text(
              '$grantedPermissions of $totalPermissions completed',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: Colors.grey[600],
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: LinearProgressIndicator(
            value: progress,
            backgroundColor: Colors.grey[200],
            valueColor: AlwaysStoppedAnimation<Color>(
              progress == 1.0 ? const Color(0xFF10B981) : const Color(0xFF0EA5E9),
            ),
            minHeight: 8,
          ),
        ),
      ],
    );
  }

  Widget _buildPermissionList() {
    return ListView.builder(
      itemCount: _permissions.length,
      itemBuilder: (context, index) {
        final permission = _permissions[index];
        final isCompleted = _permissionResults[permission['type']] == true;
        final hasResult = _permissionResults.containsKey(permission['type']);
        
        return Container(
          margin: const EdgeInsets.only(bottom: 16),
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: isCompleted 
                  ? const Color(0xFF10B981)
                  : Colors.grey[200]!,
              width: isCompleted ? 2 : 1,
            ),
            boxShadow: [
              BoxShadow(
                color: (isCompleted ? const Color(0xFF10B981) : Colors.grey).withValues(alpha: 0.1),
                blurRadius: isCompleted ? 16 : 8,
                offset: Offset(0, isCompleted ? 8 : 4),
              ),
            ],
          ),
          child: Row(
            children: [
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  color: (isCompleted ? const Color(0xFF10B981) : permission['color']).withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: (isCompleted ? const Color(0xFF10B981) : permission['color']).withValues(alpha: 0.3),
                    width: 1,
                  ),
                ),
                child: Icon(
                  isCompleted ? Icons.check_circle_rounded : permission['icon'],
                  color: isCompleted ? const Color(0xFF10B981) : permission['color'],
                  size: 32,
                ),
              ),
              const SizedBox(width: 20),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            permission['title'],
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF1E293B),
                            ),
                          ),
                        ),
                        if (hasResult)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              color: (isCompleted ? const Color(0xFF10B981) : const Color(0xFFEF4444)).withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(
                                color: (isCompleted ? const Color(0xFF10B981) : const Color(0xFFEF4444)).withValues(alpha: 0.3),
                              ),
                            ),
                            child: Text(
                              isCompleted ? 'Granted' : 'Denied',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: isCompleted ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                              ),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      permission['description'],
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.grey[600],
                        height: 1.5,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildProgressIndicator() {
    return Column(
      children: [
        const CircularProgressIndicator(),
        const SizedBox(height: 16),
        Text(
          'Requesting permissions...',
          style: TextStyle(
            fontSize: 16,
            color: Colors.grey[600],
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }

  Widget _buildActionButtons() {
    return Column(
      children: [
        SizedBox(
          width: double.infinity,
          height: 56,
          child: ElevatedButton(
            onPressed: _requestPermissions,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF0EA5E9),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
              elevation: 2,
            ),
            child: const Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.security, size: 20),
                SizedBox(width: 8),
                Text(
                  'Grant Permissions',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        SizedBox(
          width: double.infinity,
          height: 48,
          child: OutlinedButton(
            onPressed: _skipAllPermissions,
            style: OutlinedButton.styleFrom(
              side: BorderSide(color: Colors.grey[300]!),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.skip_next, size: 20, color: Colors.grey[600]),
                const SizedBox(width: 8),
                Text(
                  'Skip All',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w500,
                    color: Colors.grey[600],
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        Text(
          'You can always enable permissions later in app settings',
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 14,
            color: Colors.grey[600],
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }
}