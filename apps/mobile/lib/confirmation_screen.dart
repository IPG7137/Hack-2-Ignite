import 'package:flutter/material.dart';
import 'dart:io';
import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:http/http.dart' as http;
import 'language_service.dart';
import 'category_selection_screen.dart';
import 'comprehensive_track_reports_screen.dart';
import 'dashboard_screen.dart';
import 'comprehensive_database_service.dart';
import 'auth_service.dart';
import 'notification_service.dart';
import 'credit_service.dart';

class ConfirmationScreen extends StatefulWidget {
  final ReportCategory category;
  final String? title;
  final String description;
  final List<File> images;
  final String location;
  final double? latitude;
  final double? longitude;
  final String? priority;
  final String? aiAnalysisResult;

  const ConfirmationScreen({
    super.key,
    required this.category,
    this.title,
    required this.description,
    required this.images,
    required this.location,
    this.latitude,
    this.longitude,
    this.priority,
    this.aiAnalysisResult,
  });

  @override
  State<ConfirmationScreen> createState() => _ConfirmationScreenState();
}

class _ConfirmationScreenState extends State<ConfirmationScreen>
    with TickerProviderStateMixin {
  final LanguageService _languageService = LanguageService();
  late AnimationController _iconAnimationController;
  late AnimationController _contentAnimationController;
  late Animation<double> _iconScaleAnimation;
  late Animation<double> _contentFadeAnimation;

  bool _isSubmitting = false;
  bool _isSubmitted = false;
  String reportId = '';
  String? _errorMessage;
  String? _finalPriority;

  @override
  void initState() {
    super.initState();
    _languageService.addListener(_onLanguageChanged);

    _finalPriority = widget.priority ?? 'Medium';

    // Initialize animations for success state
    _iconAnimationController = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );

    _contentAnimationController = AnimationController(
      duration: const Duration(milliseconds: 600),
      vsync: this,
    );

    _iconScaleAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _iconAnimationController,
        curve: Curves.elasticOut,
      ),
    );

    _contentFadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _contentAnimationController,
        curve: Curves.easeInOut,
      ),
    );
  }

  @override
  void dispose() {
    _iconAnimationController.dispose();
    _contentAnimationController.dispose();
    _languageService.removeListener(_onLanguageChanged);
    super.dispose();
  }

  void _onLanguageChanged() {
    setState(() {});
  }

  Future<void> _handleFinalSubmission() async {
    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
    });

    int retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        final databaseService = ComprehensiveDatabaseService();

        // Convert images to data URLs for database storage
        final imageDataUrls = <String>[];
        for (int i = 0; i < widget.images.length; i++) {
          final imageFile = widget.images[i];
          try {
            Uint8List bytes;
            if (kIsWeb) {
              try {
                bytes = await imageFile.readAsBytes();
              } catch (_) {
                if (imageFile.path.startsWith('blob:') || imageFile.path.startsWith('data:')) {
                  final response = await http.get(Uri.parse(imageFile.path));
                  if (response.statusCode == 200) {
                    bytes = response.bodyBytes;
                  } else {
                    continue;
                  }
                } else {
                  continue;
                }
              }
            } else {
              bytes = await imageFile.readAsBytes();
            }

            if (bytes.length < 50) continue;

            final base64String = base64Encode(bytes);
            final dataUrl = 'data:image/jpeg;base64,$base64String';
            imageDataUrls.add(dataUrl);
          } catch (e) {
            print('⚠️ Error encoding image $i: $e');
          }
        }

        final authService = AuthService.instance;
        final userId = authService.userId ?? authService.supabaseUser?.id ?? '';
        final reportTitle = (widget.title != null && widget.title!.trim().isNotEmpty)
            ? widget.title!.trim()
            : widget.category.name;

        final result = await databaseService.submitComprehensiveReport(
          userId: userId,
          title: reportTitle,
          description: widget.description,
          category: widget.category.id,
          location: widget.location,
          latitude: widget.latitude,
          longitude: widget.longitude,
          imageUrls: imageDataUrls,
          contactNumber: null,
        );

        if (result.success && result.reportId != null) {
          if (mounted) {
            setState(() {
              reportId = result.reportId!;
              _finalPriority = result.priority ?? _finalPriority;
              _isSubmitted = true;
              _isSubmitting = false;
            });

            // Start celebration animations
            _iconAnimationController.forward();
            Future.delayed(const Duration(milliseconds: 300), () {
              if (mounted) _contentAnimationController.forward();
            });

            // Add notification
            NotificationService().addReportSubmittedNotification(
              result.reportId!,
              widget.category.name,
            );

            // Award credits
            await _awardCreditsForReport(result.reportId!, widget.category.name);
          }
          return;
        } else {
          throw Exception(result.message);
        }
      } catch (e) {
        retryCount++;
        print('❌ Submission attempt $retryCount failed: $e');

        if (retryCount >= maxRetries) {
          if (mounted) {
            setState(() {
              _isSubmitting = false;
              _errorMessage = 'Unable to submit your complaint right now. Please check your internet connection and try again.';
            });
          }
        } else {
          await Future.delayed(Duration(seconds: retryCount));
        }
      }
    }
  }

  Future<void> _awardCreditsForReport(String reportId, String category) async {
    try {
      const userId = 'user_12345';
      await CreditService.awardCreditsForReport(userId, reportId);
    } catch (_) {}
  }

  void _navigateToTrackReports() {
    Navigator.pushAndRemoveUntil(
      context,
      MaterialPageRoute(builder: (context) => const ComprehensiveTrackReportsScreen()),
      (route) => false,
    );
  }

  void _navigateToDashboard() {
    Navigator.pushAndRemoveUntil(
      context,
      MaterialPageRoute(builder: (context) => const DashboardScreen(isAdmin: false)),
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 2,
        leading: _isSubmitted
            ? null
            : IconButton(
                icon: const Icon(Icons.arrow_back_rounded, color: Color(0xFF0F172A)),
                onPressed: () => Navigator.pop(context),
              ),
        title: Text(
          _isSubmitted ? 'Confirmation' : 'Step 3 of 3: Review & Submit',
          style: const TextStyle(
            color: Color(0xFF0F172A),
            fontSize: 18,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
      body: SafeArea(
        child: _isSubmitted ? _buildSuccessView() : _buildReviewView(),
      ),
    );
  }

  // ===========================================================================
  // STEP 3: REVIEW & SUBMIT VIEW
  // ===========================================================================
  Widget _buildReviewView() {
    final effectiveTitle = (widget.title != null && widget.title!.trim().isNotEmpty)
        ? widget.title!.trim()
        : widget.category.name;

    return Column(
      children: [
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Step Progress Indicator Header
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEFF6FF),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFBFDBFE)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.fact_check_rounded, color: Color(0xFF1E40AF), size: 22),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: const [
                            Text(
                              'Review Your Complaint',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF1E40AF),
                              ),
                            ),
                            SizedBox(height: 2),
                            Text(
                              'Please verify all details before submitting to municipal authorities.',
                              style: TextStyle(
                                fontSize: 12,
                                color: Color(0xFF3B82F6),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 16),

                // Error Banner if submission failed
                if (_errorMessage != null) ...[
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEF2F2),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFFCA5A5)),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(Icons.error_outline_rounded, color: Color(0xFFDC2626), size: 22),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Submission Failed',
                                style: TextStyle(
                                  fontWeight: FontWeight.w700,
                                  color: Color(0xFF991B1B),
                                  fontSize: 13.5,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                _errorMessage!,
                                style: const TextStyle(
                                  color: Color(0xFFB91C1C),
                                  fontSize: 12.5,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                ],

                // 1. Category Section
                _buildReviewCard(
                  title: 'CIVIC CATEGORY',
                  icon: Icons.category_rounded,
                  iconColor: widget.category.color,
                  content: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: widget.category.color.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Icon(widget.category.icon, color: widget.category.color, size: 24),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              widget.category.name,
                              style: const TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF0F172A),
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              widget.category.description,
                              style: const TextStyle(
                                fontSize: 12.5,
                                color: Color(0xFF64748B),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  onEdit: () => Navigator.pop(context),
                ),

                const SizedBox(height: 12),

                // 2. Complaint Title & Description
                _buildReviewCard(
                  title: 'PROBLEM DETAILS',
                  icon: Icons.description_rounded,
                  iconColor: const Color(0xFF1E40AF),
                  content: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        effectiveTitle,
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF0F172A),
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        widget.description,
                        style: const TextStyle(
                          fontSize: 13.5,
                          color: Color(0xFF334155),
                          height: 1.45,
                        ),
                      ),
                    ],
                  ),
                  onEdit: () => Navigator.pop(context),
                ),

                const SizedBox(height: 12),

                // 3. Location & GPS
                _buildReviewCard(
                  title: 'LOCATION & ADDRESS',
                  icon: Icons.location_on_rounded,
                  iconColor: const Color(0xFF059669),
                  content: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.location,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF0F172A),
                          height: 1.35,
                        ),
                      ),
                      if (widget.latitude != null && widget.longitude != null) ...[
                        const SizedBox(height: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: const Color(0xFFE2E8F0)),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.gps_fixed_rounded, size: 14, color: Color(0xFF059669)),
                              const SizedBox(width: 6),
                              Text(
                                'GPS: ${widget.latitude!.toStringAsFixed(6)}, ${widget.longitude!.toStringAsFixed(6)}',
                                style: const TextStyle(
                                  fontSize: 12,
                                  fontFamily: 'monospace',
                                  color: Color(0xFF475569),
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ],
                  ),
                  onEdit: () => Navigator.pop(context),
                ),

                const SizedBox(height: 12),

                // 4. Evidence Media
                _buildReviewCard(
                  title: 'ATTACHED EVIDENCE (${widget.images.length})',
                  icon: Icons.photo_library_rounded,
                  iconColor: const Color(0xFF7C3AED),
                  content: widget.images.isEmpty
                      ? const Text(
                          'No images attached.',
                          style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
                        )
                      : SizedBox(
                          height: 80,
                          child: ListView.separated(
                            scrollDirection: Axis.horizontal,
                            itemCount: widget.images.length,
                            separatorBuilder: (_, __) => const SizedBox(width: 8),
                            itemBuilder: (context, index) {
                              return ClipRRect(
                                borderRadius: BorderRadius.circular(8),
                                child: _buildEvidenceImage(
                                  widget.images[index],
                                  width: 80,
                                  height: 80,
                                ),
                              );
                            },
                          ),
                        ),
                  onEdit: () => Navigator.pop(context),
                ),

                const SizedBox(height: 12),

                // 5. AI-Assisted Analysis Summary
                _buildAiAssistedSummaryCard(),

                const SizedBox(height: 24),
              ],
            ),
          ),
        ),

        // Bottom Action Bar
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            border: const Border(top: BorderSide(color: Color(0xFFE2E8F0))),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                offset: const Offset(0, -3),
                blurRadius: 10,
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  onPressed: _isSubmitting ? null : _handleFinalSubmission,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF1E40AF),
                    foregroundColor: Colors.white,
                    disabledBackgroundColor: const Color(0xFF93C5FD),
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: _isSubmitting
                      ? Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: const [
                            SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2.2,
                                valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                              ),
                            ),
                            SizedBox(width: 12),
                            Text(
                              'Submitting Complaint...',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ],
                        )
                      : const Text(
                          'SUBMIT COMPLAINT',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.5,
                          ),
                        ),
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'By submitting, you confirm that this report describes a genuine civic issue.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 11,
                  color: Color(0xFF64748B),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildEvidenceImage(File imageFile, {double width = 80, double height = 80}) {
    if (kIsWeb) {
      final path = imageFile.path;
      if (path.startsWith('http://') ||
          path.startsWith('https://') ||
          path.startsWith('blob:') ||
          path.startsWith('data:')) {
        return Image.network(
          path,
          width: width,
          height: height,
          fit: BoxFit.cover,
          errorBuilder: (context, error, stackTrace) => Container(
            width: width,
            height: height,
            color: const Color(0xFFE2E8F0),
            child: const Icon(
              Icons.broken_image_rounded,
              color: Color(0xFF94A3B8),
              size: 28,
            ),
          ),
        );
      }
      return FutureBuilder<Uint8List>(
        future: imageFile.readAsBytes(),
        builder: (context, snapshot) {
          if (snapshot.hasData) {
            return Image.memory(
              snapshot.data!,
              width: width,
              height: height,
              fit: BoxFit.cover,
              errorBuilder: (context, error, stackTrace) => Container(
                width: width,
                height: height,
                color: const Color(0xFFE2E8F0),
                child: const Icon(
                  Icons.broken_image_rounded,
                  color: Color(0xFF94A3B8),
                  size: 28,
                ),
              ),
            );
          }
          if (snapshot.hasError) {
            return Container(
              width: width,
              height: height,
              color: const Color(0xFFE2E8F0),
              child: const Icon(
                Icons.broken_image_rounded,
                color: Color(0xFF94A3B8),
                size: 28,
              ),
            );
          }
          return Container(
            width: width,
            height: height,
            color: const Color(0xFFF1F5F9),
            child: const Center(
              child: SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
            ),
          );
        },
      );
    } else {
      final path = imageFile.path;
      if (path.startsWith('http://') || path.startsWith('https://')) {
        return Image.network(
          path,
          width: width,
          height: height,
          fit: BoxFit.cover,
          errorBuilder: (context, error, stackTrace) => Container(
            width: width,
            height: height,
            color: const Color(0xFFE2E8F0),
            child: const Icon(
              Icons.broken_image_rounded,
              color: Color(0xFF94A3B8),
              size: 28,
            ),
          ),
        );
      }
      return Image.file(
        imageFile,
        width: width,
        height: height,
        fit: BoxFit.cover,
        errorBuilder: (context, error, stackTrace) => Container(
          width: width,
          height: height,
          color: const Color(0xFFE2E8F0),
          child: const Icon(
            Icons.broken_image_rounded,
            color: Color(0xFF94A3B8),
            size: 28,
          ),
        ),
      );
    }
  }

  Widget _buildReviewCard({
    required String title,
    required IconData icon,
    required Color iconColor,
    required Widget content,
    required VoidCallback onEdit,
  }) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Icon(icon, size: 16, color: iconColor),
                  const SizedBox(width: 6),
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF64748B),
                      letterSpacing: 0.5,
                    ),
                  ),
                ],
              ),
              InkWell(
                onTap: onEdit,
                borderRadius: BorderRadius.circular(6),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  child: Row(
                    children: const [
                      Icon(Icons.edit_rounded, size: 14, color: Color(0xFF1E40AF)),
                      SizedBox(width: 4),
                      Text(
                        'Edit',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF1E40AF),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          content,
        ],
      ),
    );
  }

  Widget _buildAiAssistedSummaryCard() {
    final priority = _finalPriority ?? 'Medium';
    final priorityColor = _getPriorityColor(priority);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFCBD5E1)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFF3B82F6).withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: const [
                    Icon(Icons.auto_awesome_rounded, size: 13, color: Color(0xFF1E40AF)),
                    SizedBox(width: 4),
                    Text(
                      'AI-assisted analysis',
                      style: TextStyle(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF1E40AF),
                      ),
                    ),
                  ],
                ),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: priorityColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: priorityColor.withValues(alpha: 0.3)),
                ),
                child: Text(
                  'Priority: ${priority.toUpperCase()}',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    color: priorityColor,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            widget.aiAnalysisResult != null && widget.aiAnalysisResult!.isNotEmpty
                ? widget.aiAnalysisResult!
                : 'Automated civic triage assessed based on category parameters and visual verification.',
            style: const TextStyle(
              fontSize: 12.5,
              color: Color(0xFF475569),
              height: 1.4,
            ),
          ),
        ],
      ),
    );
  }

  // ===========================================================================
  // SUBMISSION SUCCESS VIEW
  // ===========================================================================
  Widget _buildSuccessView() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        children: [
          const SizedBox(height: 16),

          // Animated Green Success Circle
          AnimatedBuilder(
            animation: _iconScaleAnimation,
            builder: (context, child) {
              return Transform.scale(
                scale: _iconScaleAnimation.value,
                child: Container(
                  width: 100,
                  height: 100,
                  decoration: BoxDecoration(
                    color: const Color(0xFFECFDF5),
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: const Color(0xFFA7F3D0),
                      width: 2.5,
                    ),
                  ),
                  child: const Center(
                    child: Icon(
                      Icons.check_circle_rounded,
                      size: 64,
                      color: Color(0xFF059669),
                    ),
                  ),
                ),
              );
            },
          ),

          const SizedBox(height: 24),

          // Animated Text Content
          AnimatedBuilder(
            animation: _contentFadeAnimation,
            builder: (context, child) {
              return Opacity(
                opacity: _contentFadeAnimation.value,
                child: Column(
                  children: [
                    const Text(
                      'Complaint Submitted',
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF0F172A),
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Your complaint has been received by CivicResolve and forwarded to municipal authorities.',
                      style: TextStyle(
                        fontSize: 13.5,
                        color: Color(0xFF64748B),
                        height: 1.45,
                      ),
                      textAlign: TextAlign.center,
                    ),

                    const SizedBox(height: 20),

                    // Complaint ID Box
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEFF6FF),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFBFDBFE)),
                      ),
                      child: Column(
                        children: [
                          const Text(
                            'COMPLAINT ID',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFF1E40AF),
                              letterSpacing: 0.8,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '#CR-$reportId',
                            style: const TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFF1E3A8A),
                              fontFamily: 'monospace',
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 20),

                    // Green Credits Award Box
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF0FDF4),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFBBF7D0)),
                      ),
                      child: Row(
                        children: const [
                          Text('🌱', style: TextStyle(fontSize: 22)),
                          SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              '+10 Green Credits earned for active civic reporting!',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF15803D),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 20),

                    // Next Steps Card
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: const [
                              Icon(Icons.info_outline_rounded, color: Color(0xFF0F172A), size: 18),
                              SizedBox(width: 8),
                              Text(
                                'What Happens Next?',
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w700,
                                  color: Color(0xFF0F172A),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 10),
                          _buildNextStepItem('1', 'Automated municipal validation & department assignment.'),
                          _buildNextStepItem('2', 'Field inspection team dispatched to site.'),
                          _buildNextStepItem('3', 'Track real-time progress and photos in "Track My Reports".'),
                        ],
                      ),
                    ),

                    const SizedBox(height: 28),

                    // Primary Action: Track Complaint
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton.icon(
                        onPressed: _navigateToTrackReports,
                        icon: const Icon(Icons.timeline_rounded, size: 20),
                        label: const Text(
                          'Track Complaint',
                          style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF1E40AF),
                          foregroundColor: Colors.white,
                          elevation: 0,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                      ),
                    ),

                    const SizedBox(height: 10),

                    // Secondary Action: Return to Dashboard
                    SizedBox(
                      width: double.infinity,
                      height: 46,
                      child: OutlinedButton(
                        onPressed: _navigateToDashboard,
                        style: OutlinedButton.styleFrom(
                          foregroundColor: const Color(0xFF475569),
                          side: const BorderSide(color: Color(0xFFCBD5E1)),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: const Text(
                          'Return to Home',
                          style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                        ),
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildNextStepItem(String number, String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 20,
            height: 20,
            decoration: BoxDecoration(
              color: const Color(0xFFEFF6FF),
              shape: BoxShape.circle,
              border: Border.all(color: const Color(0xFF93C5FD)),
            ),
            child: Center(
              child: Text(
                number,
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF1E40AF),
                ),
              ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(
                fontSize: 12.5,
                color: Color(0xFF475569),
                height: 1.35,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Color _getPriorityColor(String priority) {
    switch (priority.toLowerCase()) {
      case 'high':
      case 'critical':
        return const Color(0xFFDC2626);
      case 'low':
        return const Color(0xFF059669);
      case 'medium':
      default:
        return const Color(0xFFD97706);
    }
  }
}
