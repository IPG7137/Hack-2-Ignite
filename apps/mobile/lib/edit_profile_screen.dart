import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'app_preferences.dart';
import 'auth_service.dart';
import 'comprehensive_database_service.dart';

class EditProfileScreen extends StatefulWidget {
  final Map<String, dynamic>? initialProfile;

  const EditProfileScreen({
    super.key,
    this.initialProfile,
  });

  @override
  State<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  final ComprehensiveDatabaseService _dbService = ComprehensiveDatabaseService();
  final AuthService _authService = AuthService.instance;

  late TextEditingController _nameController;
  late TextEditingController _phoneController;
  late TextEditingController _emailController;
  late TextEditingController _addressController;
  late TextEditingController _occupationController;

  bool _isLoading = false;

  @override
  void initState() {
    super.initState();

    final profile = widget.initialProfile ?? {};
    _nameController = TextEditingController(
      text: profile['name']?.toString() ?? profile['full_name']?.toString() ?? 'Rajesh Kumar Sharma',
    );
    _phoneController = TextEditingController(
      text: profile['phone']?.toString() ?? profile['phone_number']?.toString() ?? '+91 98765 43210',
    );
    _emailController = TextEditingController(
      text: profile['email']?.toString() ?? _authService.userEmail ?? 'rajesh.sharma@example.com',
    );
    _addressController = TextEditingController(
      text: profile['address']?.toString() ?? '123, MG Road, Sector 14, Gurgaon, Haryana 122001',
    );
    _occupationController = TextEditingController(
      text: profile['occupation']?.toString() ?? 'Software Engineer',
    );
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _addressController.dispose();
    _occupationController.dispose();
    super.dispose();
  }

  Future<void> _saveProfile() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
    });

    final currentUserId = Supabase.instance.client.auth.currentUser?.id ?? 'current_user_session';
    final updatedProfile = {
      'name': _nameController.text.trim(),
      'full_name': _nameController.text.trim(),
      'phone': _phoneController.text.trim(),
      'phone_number': _phoneController.text.trim(),
      'email': _emailController.text.trim(),
      'address': _addressController.text.trim(),
      'occupation': _occupationController.text.trim(),
      'updated_at': DateTime.now().toIso8601String(),
    };

    try {
      // 1. Direct Supabase Update Attempt
      try {
        await Supabase.instance.client
            .from('users')
            .update({
              'full_name': _nameController.text.trim(),
              'phone_number': _phoneController.text.trim(),
              'address': _addressController.text.trim(),
              'updated_at': DateTime.now().toIso8601String(),
            })
            .eq('id', currentUserId);
      } catch (e) {
        // Fallback to comprehensive db service
        await _dbService.updateUserProfile(
          userId: currentUserId,
          fullName: _nameController.text.trim(),
          phoneNumber: _phoneController.text.trim(),
          address: _addressController.text.trim(),
          email: _emailController.text.trim(),
          occupation: _occupationController.text.trim(),
        );
      }

      // 2. Persist locally to AppPreferences for instant retrieval
      await AppPreferences.setUserProfile(updatedProfile);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('✅ Profile updated successfully!'),
            backgroundColor: Colors.green,
            behavior: SnackBarBehavior.floating,
          ),
        );
        Navigator.pop(context, updatedProfile);
      }
    } catch (e) {
      if (mounted) {
        // Even if remote fails, persist locally so user experience is not broken
        await AppPreferences.setUserProfile(updatedProfile);
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Profile saved locally: ${e.toString()}'),
            backgroundColor: const Color(0xFF1E3A8A),
            behavior: SnackBarBehavior.floating,
          ),
        );
        Navigator.pop(context, updatedProfile);
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    const primaryColor = Color(0xFF1E3A8A);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text(
          'Edit Profile',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF0F172A),
        elevation: 0.5,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: primaryColor))
          : SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Avatar Header
                    Center(
                      child: Stack(
                        children: [
                          Container(
                            width: 100,
                            height: 100,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              gradient: const LinearGradient(
                                colors: [Color(0xFF1E3A8A), Color(0xFF3B82F6)],
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                              ),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withValues(alpha: 0.1),
                                  blurRadius: 10,
                                  offset: const Offset(0, 4),
                                ),
                              ],
                            ),
                            child: Center(
                              child: Text(
                                _nameController.text.isNotEmpty
                                    ? _nameController.text[0].toUpperCase()
                                    : 'U',
                                style: const TextStyle(
                                  fontSize: 36,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                ),
                              ),
                            ),
                          ),
                          Positioned(
                            bottom: 0,
                            right: 0,
                            child: Container(
                              padding: const EdgeInsets.all(6),
                              decoration: const BoxDecoration(
                                color: Color(0xFF3B82F6),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(
                                Icons.camera_alt,
                                size: 18,
                                color: Colors.white,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Full Name Field
                    _buildLabel('Full Name'),
                    TextFormField(
                      controller: _nameController,
                      decoration: _buildInputDecoration(
                        hint: 'Enter your full name',
                        icon: Icons.person_outline,
                      ),
                      validator: (val) =>
                          (val == null || val.trim().isEmpty) ? 'Full name is required' : null,
                    ),
                    const SizedBox(height: 16),

                    // Phone Number Field
                    _buildLabel('Phone Number'),
                    TextFormField(
                      controller: _phoneController,
                      keyboardType: TextInputType.phone,
                      decoration: _buildInputDecoration(
                        hint: 'Enter your phone number',
                        icon: Icons.phone_outlined,
                      ),
                      validator: (val) =>
                          (val == null || val.trim().isEmpty) ? 'Phone number is required' : null,
                    ),
                    const SizedBox(height: 16),

                    // Email Field
                    _buildLabel('Email Address'),
                    TextFormField(
                      controller: _emailController,
                      keyboardType: TextInputType.emailAddress,
                      decoration: _buildInputDecoration(
                        hint: 'Enter your email address',
                        icon: Icons.email_outlined,
                      ),
                      validator: (val) {
                        if (val == null || val.trim().isEmpty) return 'Email is required';
                        if (!val.contains('@')) return 'Enter a valid email address';
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),

                    // Occupation Field
                    _buildLabel('Occupation / Designation'),
                    TextFormField(
                      controller: _occupationController,
                      decoration: _buildInputDecoration(
                        hint: 'e.g., Software Engineer, Merchant',
                        icon: Icons.work_outline,
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Address Field
                    _buildLabel('Residential Address'),
                    TextFormField(
                      controller: _addressController,
                      maxLines: 3,
                      decoration: _buildInputDecoration(
                        hint: 'Enter your full address with PIN code',
                        icon: Icons.location_on_outlined,
                      ),
                      validator: (val) =>
                          (val == null || val.trim().isEmpty) ? 'Address is required' : null,
                    ),
                    const SizedBox(height: 32),

                    // Save Button
                    SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: ElevatedButton(
                        onPressed: _saveProfile,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: primaryColor,
                          foregroundColor: Colors.white,
                          elevation: 2,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                        child: const Text(
                          'Save Changes',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildLabel(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Text(
        text,
        style: const TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w600,
          color: Color(0xFF334155),
        ),
      ),
    );
  }

  InputDecoration _buildInputDecoration({
    required String hint,
    required IconData icon,
  }) {
    return InputDecoration(
      prefixIcon: Icon(icon, color: const Color(0xFF64748B), size: 20),
      hintText: hint,
      hintStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 14),
      filled: true,
      fillColor: Colors.white,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFF1E3A8A), width: 1.5),
      ),
    );
  }
}
