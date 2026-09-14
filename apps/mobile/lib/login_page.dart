import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'language_service.dart';
import 'dashboard_screen.dart';
import 'contractor_dashboard_screen.dart';
import 'auth_service.dart';
import 'app_preferences.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> with TickerProviderStateMixin {
  final LanguageService _languageService = LanguageService();
  final AuthService _authService = AuthService.instance;
  final GlobalKey<FormState> _citizenFormKey = GlobalKey<FormState>();
  final GlobalKey<FormState> _publicServantFormKey = GlobalKey<FormState>();
  
  // Controllers
  final _aadharController = TextEditingController();
  final _publicServantIdController = TextEditingController();
  final _passwordController = TextEditingController();
  final _otpController = TextEditingController();
  
  // State variables
  bool _isCitizenSelected = true;
  bool _isPasswordVisible = false;
  bool _isLoading = false;
  bool _isOtpSent = false;
  int _otpTimer = 60;
  bool _canResendOtp = false;

  // Animation controllers
  late AnimationController _animationController;
  late Animation<double> _fadeAnimation;
  late Animation<Offset> _slideAnimation;

  @override
  void initState() {
    super.initState();
    _languageService.addListener(_onLanguageChanged);
    _initializeAnimations();
    _checkAutoLogin();
  }

  void _initializeAnimations() {
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 800),
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
      begin: const Offset(0, 0.2),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _animationController,
      curve: Curves.easeOutCubic,
    ));
    
    _animationController.forward();
  }

  @override
  void dispose() {
    _aadharController.dispose();
    _publicServantIdController.dispose();
    _passwordController.dispose();
    _otpController.dispose();
    _languageService.removeListener(_onLanguageChanged);
    _animationController.dispose();
    super.dispose();
  }

  void _onLanguageChanged() {
    setState(() {});
  }

  Future<void> _checkAutoLogin() async {
    try {
      final hasValidSession = await _authService.loadSavedSession();
      if (hasValidSession && mounted) {
        final userRole = await AppPreferences.getUserRole() ?? (_authService.isAdmin ? 'contractor' : 'citizen');
        _navigateToDashboard(selectedRole: userRole);
      }
    } catch (e) {
      // Handle error silently
    }
  }

  void _navigateToDashboard({String? selectedRole, bool isAdmin = false}) {
    final role = selectedRole ?? (_isCitizenSelected ? 'citizen' : 'contractor');
    if (role == 'contractor' || isAdmin || _authService.userRole == 'contractor') {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (context) => const ContractorDashboardScreen()),
      );
    } else {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (context) => const DashboardScreen(isAdmin: false)),
      );
    }
  }

  void _startOtpTimer() {
    _otpTimer = 60;
    _canResendOtp = false;
    
    Future.doWhile(() async {
      await Future.delayed(const Duration(seconds: 1));
      if (mounted) {
        setState(() {
          _otpTimer--;
        });
        if (_otpTimer <= 0) {
          setState(() {
            _canResendOtp = true;
          });
          return false;
        }
        return true;
      }
      return false;
    });
  }

  String _formatAadhar(String value) {
    String digits = value.replaceAll(RegExp(r'[^0-9]'), '');
    if (digits.length > 12) {
      digits = digits.substring(0, 12);
    }
    
    String formatted = '';
    for (int i = 0; i < digits.length; i++) {
      if (i > 0 && i % 4 == 0) {
        formatted += ' ';
      }
      formatted += digits[i];
    }
    
    return formatted;
  }

  String? _validateAadhar(String? value) {
    if (value == null || value.isEmpty) {
      return 'Aadhaar number is required';
    }
    
    String cleanAadhar = value.replaceAll(' ', '');
    if (cleanAadhar.length != 12) {
      return 'Aadhaar number must be 12 digits';
    }
    
    if (!RegExp(r'^[0-9]+$').hasMatch(cleanAadhar)) {
      return 'Aadhaar number must contain only digits';
    }
    
    return null;
  }

  Future<void> _handleCitizenLogin() async {
    if (!_isOtpSent) {
      if (!_citizenFormKey.currentState!.validate()) return;

      setState(() {
        _isLoading = true;
      });

      try {
        await Future.delayed(const Duration(milliseconds: 600));
        
        setState(() {
          _isOtpSent = true;
          _isLoading = false;
        });
        
        _startOtpTimer();
        
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('OTP sent to mobile linked with Aadhaar ${_aadharController.text}'),
            backgroundColor: const Color(0xFF3B82F6),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          ),
        );
      } catch (e) {
        setState(() {
          _isLoading = false;
        });
        
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to send OTP: ${e.toString()}'),
            backgroundColor: Colors.red,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          ),
        );
      }
    } else {
      // Verify OTP and Authenticate with Supabase Auth
      if (_otpController.text.length < 6) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Please enter valid 6-digit OTP'),
            backgroundColor: Colors.red,
            behavior: SnackBarBehavior.floating,
          ),
        );
        return;
      }

      setState(() {
        _isLoading = true;
      });

      try {
        final cleanAadhaar = _aadharController.text.replaceAll(' ', '');
        final otp = _otpController.text.trim();

        // Authenticate citizen strictly through Supabase Auth
        final result = await _authService.login(cleanAadhaar, otp, role: 'citizen');
        
        setState(() {
          _isLoading = false;
        });

        if (result.success) {
          await AppPreferences.setUserRole('citizen');
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: const Text('Login successful! Welcome Citizen'),
                backgroundColor: Colors.green,
                behavior: SnackBarBehavior.floating,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
            );
            _navigateToDashboard(selectedRole: 'citizen', isAdmin: false);
          }
        } else {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(result.message),
                backgroundColor: Colors.red,
                behavior: SnackBarBehavior.floating,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
            );
          }
        }
      } catch (e) {
        setState(() {
          _isLoading = false;
        });
        
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Login failed: ${e.toString()}'),
              backgroundColor: Colors.red,
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
          );
        }
      }
    }
  }

  Future<void> _handlePublicServantLogin() async {
    if (!_publicServantFormKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
    });

    try {
      final result = await _authService.login(
        _publicServantIdController.text.trim(),
        _passwordController.text.trim(),
        role: 'officer',
      );

      setState(() {
        _isLoading = false;
      });

      if (result.success) {
        await AppPreferences.setUserRole('contractor');
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Login successful! Welcome Duty Officer / Field Contractor'),
              backgroundColor: Colors.green,
              behavior: SnackBarBehavior.floating,
            ),
          );
          _navigateToDashboard(selectedRole: 'contractor', isAdmin: true);
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(result.message),
              backgroundColor: Colors.red,
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
          );
        }
      }
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Login failed: ${e.toString()}'),
            backgroundColor: Colors.red,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          ),
        );
      }
    }
  }

  Widget _buildAppLogo() {
    return Container(
      width: 80,
      height: 80,
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFF4F8CDB), Color(0xFF3B82F6)],
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF3B82F6).withOpacity(0.2),
            blurRadius: 8,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: const Icon(
        Icons.account_balance,
        color: Colors.white,
        size: 40,
      ),
    );
  }

  Widget _buildUserTypeToggle() {
    return Container(
      height: 50,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(25),
        border: Border.all(color: const Color(0xFFE5E7EB), width: 1),
      ),
      child: Row(
        children: [
          Expanded(
            child: GestureDetector(
              onTap: () {
                setState(() {
                  _isCitizenSelected = true;
                  _isOtpSent = false;
                  _otpController.clear();
                });
              },
              child: Container(
                height: 48,
                decoration: BoxDecoration(
                  color: _isCitizenSelected ? const Color(0xFF3B82F6) : Colors.transparent,
                  borderRadius: BorderRadius.circular(24),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.person,
                      color: _isCitizenSelected ? Colors.white : const Color(0xFF6B7280),
                      size: 20,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'Citizen',
                      style: TextStyle(
                        color: _isCitizenSelected ? Colors.white : const Color(0xFF6B7280),
                        fontWeight: FontWeight.w600,
                        fontSize: 16,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          Expanded(
            child: GestureDetector(
              onTap: () {
                setState(() {
                  _isCitizenSelected = false;
                  _isOtpSent = false;
                  _otpController.clear();
                });
              },
              child: Container(
                height: 48,
                decoration: BoxDecoration(
                  color: !_isCitizenSelected ? const Color(0xFF3B82F6) : Colors.transparent,
                  borderRadius: BorderRadius.circular(24),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.badge,
                      color: !_isCitizenSelected ? Colors.white : const Color(0xFF6B7280),
                      size: 20,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'Field Officer',
                      style: TextStyle(
                        color: !_isCitizenSelected ? Colors.white : const Color(0xFF6B7280),
                        fontWeight: FontWeight.w600,
                        fontSize: 15,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInputField({
    required TextEditingController controller,
    required String placeholder,
    required IconData prefixIcon,
    bool isPassword = false,
    bool obscureText = false,
    VoidCallback? toggleVisibility,
    String? Function(String?)? validator,
    TextInputType keyboardType = TextInputType.text,
    List<TextInputFormatter>? inputFormatters,
    Function(String)? onChanged,
  }) {
    return TextFormField(
      controller: controller,
      obscureText: obscureText,
      keyboardType: keyboardType,
      inputFormatters: inputFormatters,
      onChanged: onChanged,
      validator: validator,
      style: const TextStyle(
        fontSize: 16,
        color: Color(0xFF374151),
        fontWeight: FontWeight.w500,
      ),
      decoration: InputDecoration(
        hintText: placeholder,
        hintStyle: const TextStyle(
          color: Color(0xFF9CA3AF),
          fontSize: 15,
          fontWeight: FontWeight.w400,
        ),
        prefixIcon: Icon(
          prefixIcon,
          color: const Color(0xFF6B7280),
          size: 20,
        ),
        suffixIcon: isPassword
            ? IconButton(
                icon: Icon(
                  obscureText ? Icons.visibility_off : Icons.visibility,
                  color: const Color(0xFF6B7280),
                  size: 20,
                ),
                onPressed: toggleVisibility,
              )
            : null,
        filled: true,
        fillColor: Colors.white,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFFE5E7EB), width: 1),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFFE5E7EB), width: 1),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFF3B82F6), width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFFEF4444), width: 1),
        ),
      ),
    );
  }

  Widget _buildLoginButton({
    required String text,
    required VoidCallback onPressed,
    required bool isLoading,
  }) {
    return SizedBox(
      width: double.infinity,
      height: 54,
      child: ElevatedButton(
        onPressed: isLoading ? null : onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFF3B82F6),
          foregroundColor: Colors.white,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          disabledBackgroundColor: const Color(0xFF3B82F6).withOpacity(0.6),
        ),
        child: isLoading
            ? const SizedBox(
                height: 20,
                width: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                ),
              )
            : Text(
                text,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                ),
              ),
      ),
    );
  }

  Widget _buildCitizenLogin() {
    return Form(
      key: _citizenFormKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Citizen Login',
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.bold,
              color: Color(0xFF1E293B),
            ),
          ),
          const SizedBox(height: 20),
          
          if (!_isOtpSent) ...[
            _buildInputField(
              controller: _aadharController,
              placeholder: '12-digit Aadhaar Number',
              prefixIcon: Icons.credit_card,
              keyboardType: TextInputType.number,
              inputFormatters: [
                FilteringTextInputFormatter.allow(RegExp(r'[0-9 ]')),
                LengthLimitingTextInputFormatter(14),
              ],
              onChanged: (value) {
                final formatted = _formatAadhar(value);
                if (formatted != value) {
                  _aadharController.value = TextEditingValue(
                    text: formatted,
                    selection: TextSelection.collapsed(offset: formatted.length),
                  );
                }
              },
              validator: _validateAadhar,
            ),
            const SizedBox(height: 12),
            
            // Demo quick fill for Citizen
            Align(
              alignment: Alignment.centerLeft,
              child: TextButton.icon(
                onPressed: () {
                  setState(() {
                    _aadharController.text = '9999 8888 7777';
                  });
                },
                icon: const Icon(Icons.flash_on, size: 16, color: Color(0xFF3B82F6)),
                label: const Text(
                  'Demo Citizen Fill',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF3B82F6),
                  ),
                ),
                style: TextButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  backgroundColor: const Color(0xFFEFF6FF),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
              ),
            ),
            const SizedBox(height: 16),
            
            _buildLoginButton(
              text: 'Login with Aadhaar',
              onPressed: _handleCitizenLogin,
              isLoading: _isLoading,
            ),
          ] else ...[
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFFF3F4F6),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE5E7EB)),
              ),
              child: Column(
                children: [
                  const Icon(
                    Icons.message,
                    color: Color(0xFF3B82F6),
                    size: 32,
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'OTP sent to your mobile',
                    style: TextStyle(
                      color: Color(0xFF374151),
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Aadhaar: ${_aadharController.text}',
                    style: const TextStyle(
                      color: Color(0xFF6B7280),
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            
            _buildInputField(
              controller: _otpController,
              placeholder: '6-digit OTP (e.g. 123456)',
              prefixIcon: Icons.lock_outline,
              keyboardType: TextInputType.number,
              inputFormatters: [
                FilteringTextInputFormatter.digitsOnly,
                LengthLimitingTextInputFormatter(6),
              ],
            ),
            const SizedBox(height: 8),
            
            // Demo OTP quick fill
            Align(
              alignment: Alignment.centerLeft,
              child: TextButton.icon(
                onPressed: () {
                  setState(() {
                    _otpController.text = '123456';
                  });
                },
                icon: const Icon(Icons.flash_on, size: 16, color: Color(0xFF3B82F6)),
                label: const Text(
                  'Demo OTP Fill (123456)',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF3B82F6),
                  ),
                ),
                style: TextButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  backgroundColor: const Color(0xFFEFF6FF),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
              ),
            ),
            const SizedBox(height: 12),
            
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  _canResendOtp ? 'You can resend OTP now' : 'Resend OTP in ${_otpTimer}s',
                  style: const TextStyle(
                    color: Color(0xFF6B7280),
                    fontSize: 13,
                  ),
                ),
                if (_canResendOtp)
                  TextButton(
                    onPressed: () {
                      setState(() {
                        _isOtpSent = false;
                      });
                      _handleCitizenLogin();
                    },
                    child: const Text(
                      'Resend',
                      style: TextStyle(
                        color: Color(0xFF3B82F6),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 20),
            
            _buildLoginButton(
              text: 'Verify & Login',
              onPressed: _handleCitizenLogin,
              isLoading: _isLoading,
            ),
            const SizedBox(height: 12),
            
            Center(
              child: TextButton(
                onPressed: () {
                  setState(() {
                    _isOtpSent = false;
                    _otpController.clear();
                  });
                },
                child: const Text(
                  'Change Aadhaar Number',
                  style: TextStyle(
                    color: Color(0xFF6B7280),
                    fontSize: 14,
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildPublicServantLogin() {
    return Form(
      key: _publicServantFormKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Field Officer / Contractor Login',
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.bold,
              color: Color(0xFF1E293B),
            ),
          ),
          const SizedBox(height: 20),
          
          _buildInputField(
            controller: _publicServantIdController,
            placeholder: 'Officer ID / Email (e.g. demo.officer@civicresolve.gov)',
            prefixIcon: Icons.badge_outlined,
            validator: (value) {
              if (value == null || value.trim().isEmpty) {
                return 'Officer ID or Email is required';
              }
              return null;
            },
          ),
          const SizedBox(height: 16),
          
          _buildInputField(
            controller: _passwordController,
            placeholder: 'Password',
            prefixIcon: Icons.lock_outline,
            isPassword: true,
            obscureText: !_isPasswordVisible,
            toggleVisibility: () {
              setState(() {
                _isPasswordVisible = !_isPasswordVisible;
              });
            },
            validator: (value) {
              if (value == null || value.trim().isEmpty) {
                return 'Password is required';
              }
              return null;
            },
          ),
          const SizedBox(height: 12),

          // Demo quick fill for Officer
          Align(
            alignment: Alignment.centerLeft,
            child: TextButton.icon(
              onPressed: () {
                setState(() {
                  _publicServantIdController.text = 'demo.officer@civicresolve.gov';
                  _passwordController.text = 'civic123456';
                });
              },
              icon: const Icon(Icons.flash_on, size: 16, color: Color(0xFF3B82F6)),
              label: const Text(
                'Demo Field Officer Fill',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF3B82F6),
                ),
              ),
              style: TextButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                backgroundColor: const Color(0xFFEFF6FF),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
            ),
          ),
          const SizedBox(height: 16),
          
          _buildLoginButton(
            text: 'Log in as Field Officer',
            onPressed: _handlePublicServantLogin,
            isLoading: _isLoading,
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: AnimatedBuilder(
          animation: _fadeAnimation,
          builder: (context, child) {
            return FadeTransition(
              opacity: _fadeAnimation,
              child: SlideTransition(
                position: _slideAnimation,
                child: SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 40),
                  child: Column(
                    children: [
                      // App Logo
                      _buildAppLogo(),
                      const SizedBox(height: 20),
                      
                      // App Name
                      const Text(
                        'CivicResolve',
                        style: TextStyle(
                          fontSize: 32,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF374151),
                        ),
                      ),
                      const SizedBox(height: 12),
                      
                      // Tagline
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF9FAFB),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: const Color(0xFFE5E7EB), width: 1),
                        ),
                        child: const Text(
                          'Empowering communities, one report at a time.',
                          style: TextStyle(
                            fontSize: 16,
                            color: Color(0xFF6B7280),
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                      const SizedBox(height: 40),
                      
                      // User Type Toggle
                      _buildUserTypeToggle(),
                      const SizedBox(height: 32),
                      
                      // Login Form
                      _isCitizenSelected ? _buildCitizenLogin() : _buildPublicServantLogin(),
                    ],
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}