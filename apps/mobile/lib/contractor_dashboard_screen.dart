import 'package:flutter/material.dart';
import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'permission_service.dart';
import 'language_service.dart';
import 'auth_service.dart';
import 'comprehensive_database_service.dart';
import 'comprehensive_report_models.dart';
import 'contractor_profile_page.dart';
import 'login_page.dart';

class ContractorDashboardScreen extends StatefulWidget {
  const ContractorDashboardScreen({super.key});

  @override
  State<ContractorDashboardScreen> createState() => _ContractorDashboardScreenState();
}

class _ContractorDashboardScreenState extends State<ContractorDashboardScreen> with TickerProviderStateMixin {
  final LanguageService _languageService = LanguageService();
  final ComprehensiveDatabaseService _dbService = ComprehensiveDatabaseService();
  final AuthService _authService = AuthService.instance;

  bool _isLoading = true;
  String _selectedFilter = 'all'; // all, assigned, in_progress, resolution_submitted
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
    if (mounted) setState(() {});
  }

  void _initReportsStream() {
    final officerId = _authService.userId ?? Supabase.instance.client.auth.currentUser?.id ?? '';
    _reportsSubscription?.cancel();

    _dbService.getOfficerAssignedReports(officerId: officerId).then((reports) {
      if (mounted) {
        setState(() {
          _assignedReports = reports;
          _isLoading = false;
        });
      }
    });

    if (officerId.isNotEmpty) {
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
  }

  Future<void> _handleRefresh() async {
    final officerId = _authService.userId ?? Supabase.instance.client.auth.currentUser?.id ?? '';
    final reports = await _dbService.getOfficerAssignedReports(officerId: officerId);
    if (mounted) {
      setState(() {
        _assignedReports = reports;
        _isLoading = false;
      });
    }
  }

  // ========================================
  // COMPLAINT LIFECYCLE WORKFLOW
  // ========================================

  Future<void> _handleStartWork(ComprehensiveReportModel report) async {
    try {
      final officerId = _authService.userId ?? Supabase.instance.client.auth.currentUser?.id ?? '';
      
      // Update real Supabase database status to in_progress
      await Supabase.instance.client.from('reports').update({
        'status': 'in_progress',
        'updated_at': DateTime.now().toIso8601String(),
      }).eq('id', report.id);

      try {
        await Supabase.instance.client.from('report_status_history').insert({
          'report_id': int.tryParse(report.id) ?? report.id,
          'old_status': report.status.value,
          'new_status': 'in_progress',
          'changed_by': officerId,
          'change_reason': 'Officer initiated on-site work and investigation',
          'created_at': DateTime.now().toIso8601String(),
        });
      } catch (_) {}

      await _handleRefresh();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('✅ Work started on Complaint #${report.id}. Status updated to In Progress.'),
            backgroundColor: const Color(0xFF16803C),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error updating status: $e'),
            backgroundColor: const Color(0xFFDC2626),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  Future<void> _showResolutionSubmissionDialog(ComprehensiveReportModel report) async {
    final notesController = TextEditingController();
    XFile? selectedResolutionImage;
    Uint8List? resolutionImageBytes;
    String? resolutionImageName;
    int? resolutionImageSize;
    bool isSubmitting = false;

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (sheetCtx, setSheetState) {
          Future<void> pickEvidenceImage(ImageSource source) async {
            try {
              if (!kIsWeb) {
                if (source == ImageSource.camera) {
                  final hasCamera = await PermissionService.requestCameraPermission();
                  if (!hasCamera) {
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Camera permission is required to capture after-fix evidence.'),
                          backgroundColor: Color(0xFFDC2626),
                        ),
                      );
                    }
                    return;
                  }
                } else {
                  final hasMedia = await PermissionService.requestMediaPermission();
                  if (!hasMedia) {
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Media/Gallery permission is required to select photos.'),
                          backgroundColor: Color(0xFFDC2626),
                        ),
                      );
                    }
                    return;
                  }
                }
              }

              final picker = ImagePicker();
              final picked = await picker.pickImage(
                source: source,
                maxWidth: 1600,
                maxHeight: 1600,
                imageQuality: 85,
              );

              if (picked != null) {
                final bytes = await picked.readAsBytes();
                setSheetState(() {
                  selectedResolutionImage = picked;
                  resolutionImageBytes = bytes;
                  resolutionImageName = picked.name;
                  resolutionImageSize = bytes.length;
                });
              }
            } catch (e) {
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('Error selecting photo: $e'),
                    backgroundColor: const Color(0xFFDC2626),
                  ),
                );
              }
            }
          }

          void showImageSourcePicker() {
            showModalBottomSheet(
              context: context,
              backgroundColor: Colors.white,
              shape: const RoundedRectangleBorder(
                borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
              ),
              builder: (pickerCtx) => SafeArea(
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Select After-Fix Photographic Evidence',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        'Provide visual proof that the physical remediation has been completed.',
                        style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                      ),
                      const SizedBox(height: 16),
                      ListTile(
                        leading: Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: const Color(0xFFEFF6FF),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Icon(Icons.camera_alt, color: Color(0xFF2563EB)),
                        ),
                        title: const Text('Take Photo with Camera', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                        subtitle: const Text('Capture live on-site remediation proof', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                        onTap: () {
                          Navigator.pop(pickerCtx);
                          pickEvidenceImage(ImageSource.camera);
                        },
                      ),
                      const SizedBox(height: 8),
                      ListTile(
                        leading: Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF0FDF4),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Icon(Icons.photo_library, color: Color(0xFF16A34A)),
                        ),
                        title: const Text('Choose from Gallery', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                        subtitle: const Text('Select an existing photo from your device', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                        onTap: () {
                          Navigator.pop(pickerCtx);
                          pickEvidenceImage(ImageSource.gallery);
                        },
                      ),
                    ],
                  ),
                ),
              ),
            );
          }

          return Padding(
            padding: EdgeInsets.only(
              left: 20,
              right: 20,
              top: 20,
              bottom: MediaQuery.of(context).viewInsets.bottom + 20,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: const Color(0xFFEFF6FF),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Icon(Icons.verified_outlined, color: Color(0xFF2563EB), size: 22),
                        ),
                        const SizedBox(width: 12),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Submit Resolution Evidence',
                              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                            ),
                            Text(
                              'Complaint #${report.id} · ${report.title}',
                              style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                            ),
                          ],
                        ),
                      ],
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, color: Color(0xFF64748B)),
                      onPressed: () => Navigator.pop(ctx),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                const Divider(height: 1),
                const SizedBox(height: 16),

                // Resolution Notes Field
                const Text(
                  'Official Field Resolution Notes *',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF334155)),
                ),
                const SizedBox(height: 6),
                TextField(
                  controller: notesController,
                  maxLines: 3,
                  decoration: InputDecoration(
                    hintText: 'Describe physical work completed, materials used, and site clearance status...',
                    hintStyle: const TextStyle(fontSize: 13, color: Color(0xFF94A3B8)),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
                    ),
                    contentPadding: const EdgeInsets.all(12),
                  ),
                ),
                const SizedBox(height: 16),

                // Proof / Evidence Attachment Box
                const Text(
                  'After-Fix Photographic Evidence',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF334155)),
                ),
                const SizedBox(height: 6),

                if (selectedResolutionImage == null) ...[
                  // Not yet selected: Clickable prompt to open camera/gallery
                  InkWell(
                    onTap: showImageSourcePicker,
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFCBD5E1)),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 44,
                            height: 44,
                            decoration: BoxDecoration(
                              color: const Color(0xFFEFF6FF),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: const Color(0xFFBFDBFE)),
                            ),
                            child: const Icon(Icons.add_a_photo_outlined, color: Color(0xFF2563EB), size: 22),
                          ),
                          const SizedBox(width: 12),
                          const Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Attach After-Fix Photo',
                                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF1E293B)),
                                ),
                                Text(
                                  'Tap to take a photo or choose from gallery',
                                  style: TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                                ),
                              ],
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                            decoration: BoxDecoration(
                              color: const Color(0xFF2563EB),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Text(
                              'Select',
                              style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ] else ...[
                  // Selected image preview container with change/delete options
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF0FDF4),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFBBF7D0)),
                    ),
                    child: Row(
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: SizedBox(
                            width: 52,
                            height: 52,
                            child: resolutionImageBytes != null
                                ? Image.memory(
                                    resolutionImageBytes!,
                                    fit: BoxFit.cover,
                                  )
                                : (kIsWeb
                                    ? Image.network(selectedResolutionImage!.path, fit: BoxFit.cover)
                                    : Image.file(File(selectedResolutionImage!.path), fit: BoxFit.cover)),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                resolutionImageName ?? 'resolution_evidence.jpg',
                                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF166534)),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 2),
                              Text(
                                resolutionImageSize != null
                                    ? '${(resolutionImageSize! / 1024).toStringAsFixed(1)} KB · After-fix photographic evidence'
                                    : 'After-fix photographic evidence',
                                style: const TextStyle(fontSize: 11, color: Color(0xFF15803D)),
                              ),
                            ],
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.edit_outlined, size: 20, color: Color(0xFF2563EB)),
                          tooltip: 'Change photo',
                          onPressed: showImageSourcePicker,
                        ),
                        IconButton(
                          icon: const Icon(Icons.delete_outline, size: 20, color: Color(0xFFDC2626)),
                          tooltip: 'Remove photo',
                          onPressed: () {
                            setSheetState(() {
                              selectedResolutionImage = null;
                              resolutionImageBytes = null;
                              resolutionImageName = null;
                              resolutionImageSize = null;
                            });
                          },
                        ),
                      ],
                    ),
                  ),
                ],
                const SizedBox(height: 20),

                // Submit Button
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    onPressed: isSubmitting
                        ? null
                        : () async {
                            if (notesController.text.trim().isEmpty) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('Please enter official field resolution notes before submitting.'),
                                  backgroundColor: Color(0xFFDC2626),
                                ),
                              );
                              return;
                            }

                            setSheetState(() => isSubmitting = true);

                            final officerId = _authService.userId ?? Supabase.instance.client.auth.currentUser?.id ?? '';
                            final note = notesController.text.trim();

                            final messenger = ScaffoldMessenger.of(context);
                            String? uploadedImageUrl;
                            if (selectedResolutionImage != null && resolutionImageBytes != null) {
                              try {
                                final supabase = Supabase.instance.client;
                                final fileName = 'resolution_${report.id}_${DateTime.now().millisecondsSinceEpoch}.jpg';
                                final storagePath = 'resolutions/$fileName';

                                // Try uploading to Supabase Storage 'complaints' bucket
                                try {
                                  await supabase.storage.from('complaints').uploadBinary(
                                    storagePath,
                                    resolutionImageBytes!,
                                    fileOptions: const FileOptions(contentType: 'image/jpeg', upsert: true),
                                  );
                                  uploadedImageUrl = supabase.storage.from('complaints').getPublicUrl(storagePath);
                                } catch (bucketErr) {
                                  // Fallback to 'reports' bucket
                                  try {
                                    await supabase.storage.from('reports').uploadBinary(
                                      storagePath,
                                      resolutionImageBytes!,
                                      fileOptions: const FileOptions(contentType: 'image/jpeg', upsert: true),
                                    );
                                    uploadedImageUrl = supabase.storage.from('reports').getPublicUrl(storagePath);
                                  } catch (_) {
                                    // Safe fallback: encode as dataUrl so image is never lost
                                    final base64Str = base64Encode(resolutionImageBytes!);
                                    uploadedImageUrl = 'data:image/jpeg;base64,$base64Str';
                                  }
                                }
                              } catch (uploadErr) {
                                final base64Str = base64Encode(resolutionImageBytes!);
                                uploadedImageUrl = 'data:image/jpeg;base64,$base64Str';
                              }
                            }

                            try {
                              final updatePayload = <String, dynamic>{
                                'status': 'resolution_submitted',
                                'resolution_notes': note,
                                'completion_date': DateTime.now().toIso8601String(),
                                'updated_at': DateTime.now().toIso8601String(),
                              };

                              if (uploadedImageUrl != null) {
                                updatePayload['resolution_image_url'] = uploadedImageUrl;
                              }

                              await Supabase.instance.client
                                  .from('reports')
                                  .update(updatePayload)
                                  .eq('id', report.id);

                              try {
                                await Supabase.instance.client.from('report_status_history').insert({
                                  'report_id': int.tryParse(report.id) ?? report.id,
                                  'old_status': 'in_progress',
                                  'new_status': 'resolution_submitted',
                                  'changed_by': officerId,
                                  'change_reason': note,
                                  'created_at': DateTime.now().toIso8601String(),
                                });
                              } catch (_) {}

                              if (mounted) {
                                if (ctx.mounted) {
                                  Navigator.pop(ctx);
                                }
                                await _handleRefresh();
                                messenger.showSnackBar(
                                  SnackBar(
                                    content: Text('✅ Resolution and photo evidence submitted for Complaint #${report.id}. Awaiting municipal verification.'),
                                    backgroundColor: const Color(0xFF16803C),
                                    behavior: SnackBarBehavior.floating,
                                  ),
                                );
                              }
                            } catch (e) {
                              setSheetState(() => isSubmitting = false);
                              if (mounted) {
                                messenger.showSnackBar(
                                  SnackBar(
                                    content: Text('Submission failed: $e'),
                                    backgroundColor: const Color(0xFFDC2626),
                                  ),
                                );
                              }
                            }
                          },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF2563EB),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: isSubmitting
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                            ),
                          )
                        : const Text(
                            'Submit Official Resolution',
                            style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                          ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  void _showComplaintDetailsModal(ComprehensiveReportModel report) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => DraggableScrollableSheet(
        initialChildSize: 0.75,
        maxChildSize: 0.95,
        minChildSize: 0.5,
        expand: false,
        builder: (_, scrollController) => SingleChildScrollView(
          controller: scrollController,
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: const Color(0xFFCBD5E1),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Title and Badges
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Complaint #${report.id}',
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF64748B),
                            fontFamily: 'monospace',
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          report.title,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF0F172A),
                          ),
                        ),
                      ],
                    ),
                  ),
                  _buildPriorityBadge(report.priority),
                ],
              ),
              const SizedBox(height: 12),

              Row(
                children: [
                  _buildStatusBadge(report.status),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      report.category,
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF475569)),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              const Divider(height: 1),
              const SizedBox(height: 16),

              // Description
              const Text(
                'Description',
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF334155)),
              ),
              const SizedBox(height: 6),
              Text(
                report.description.isNotEmpty ? report.description : 'No detailed description provided.',
                style: const TextStyle(fontSize: 14, color: Color(0xFF475569), height: 1.4),
              ),
              const SizedBox(height: 16),

              // Location
              const Text(
                'Incident Location',
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF334155)),
              ),
              const SizedBox(height: 6),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.location_on, size: 16, color: Color(0xFFDC2626)),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      report.location.isNotEmpty ? report.location : 'Zone 2 Command Ward Area',
                      style: const TextStyle(fontSize: 13, color: Color(0xFF475569)),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Citizen Photos / Evidence if available
              if (report.imageUrls.isNotEmpty) ...[
                const Text(
                  'Citizen Attached Evidence',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF334155)),
                ),
                const SizedBox(height: 8),
                SizedBox(
                  height: 100,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: report.imageUrls.length,
                    separatorBuilder: (_, __) => const SizedBox(width: 8),
                    itemBuilder: (ctx, idx) => ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: Image.network(
                        report.imageUrls[idx],
                        width: 100,
                        height: 100,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => Container(
                          width: 100,
                          height: 100,
                          color: const Color(0xFFF1F5F9),
                          child: const Icon(Icons.image, color: Color(0xFF94A3B8)),
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
              ],

              // After-Fix Photographic Evidence if submitted
              if (report.resolutionImageUrl != null && report.resolutionImageUrl!.isNotEmpty) ...[
                const Text(
                  'After-Fix Photographic Evidence',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF166534)),
                ),
                const SizedBox(height: 8),
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Image.network(
                    report.resolutionImageUrl!,
                    height: 140,
                    width: double.infinity,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Container(
                      height: 80,
                      color: const Color(0xFFF0FDF4),
                      alignment: Alignment.center,
                      child: const Text('Resolution proof image attached', style: TextStyle(color: Color(0xFF166534), fontSize: 12)),
                    ),
                  ),
                ),
                if (report.resolutionNotes != null && report.resolutionNotes!.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF0FDF4),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFFBBF7D0)),
                    ),
                    child: Text(
                      'Resolution Notes: ${report.resolutionNotes}',
                      style: const TextStyle(fontSize: 12, color: Color(0xFF166534)),
                    ),
                  ),
                ],
                const SizedBox(height: 16),
              ],

              // Action Buttons
              const Divider(height: 1),
              const SizedBox(height: 16),

              if (report.status == ReportStatus.submitted ||
                  report.status == ReportStatus.under_review ||
                  report.status == ReportStatus.assigned) ...[
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton.icon(
                    onPressed: () {
                      Navigator.pop(ctx);
                      _handleStartWork(report);
                    },
                    icon: const Icon(Icons.play_arrow),
                    label: const Text('Start Work On-Site', style: TextStyle(fontWeight: FontWeight.bold)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF2563EB),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ),
              ] else if (report.status == ReportStatus.in_progress) ...[
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton.icon(
                    onPressed: () {
                      Navigator.pop(ctx);
                      _showResolutionSubmissionDialog(report);
                    },
                    icon: const Icon(Icons.check_circle_outline),
                    label: const Text('Submit Resolution Proof', style: TextStyle(fontWeight: FontWeight.bold)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF16803C),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ),
              ] else if (report.status == ReportStatus.resolution_submitted) ...[
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF0FDF4),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFBBF7D0)),
                  ),
                  child: const Row(
                    children: [
                      Icon(Icons.schedule, color: Color(0xFF16803C), size: 20),
                      SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          'Resolution submitted — awaiting municipal verification.',
                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF166534)),
                        ),
                      ),
                    ],
                  ),
                ),
              ] else if (report.status == ReportStatus.verified || report.status == ReportStatus.closed) ...[
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: const Row(
                    children: [
                      Icon(Icons.verified, color: Color(0xFF2563EB), size: 20),
                      SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          'Complaint closed & verified by Municipal Administration.',
                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF334155)),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  // ========================================
  // HEADER PROFILE MENU & ACTIONS
  // ========================================

  Future<void> _handleLogout() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Confirm Sign Out'),
        content: const Text('Are you sure you want to end your active officer session?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFDC2626),
              foregroundColor: Colors.white,
            ),
            child: const Text('Sign Out'),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      await _authService.signOut();
      if (mounted) {
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (context) => const LoginPage()),
          (route) => false,
        );
      }
    }
  }

  void _showSettingsDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.settings_outlined, color: Color(0xFF2563EB), size: 22),
            SizedBox(width: 8),
            Text('Field Portal Settings', style: TextStyle(fontSize: 16)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Account Information',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF64748B)),
            ),
            const SizedBox(height: 4),
            Text(
              _authService.userName,
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
            ),
            Text(
              _authService.userEmail ?? 'demo.officer@civicresolve.gov',
              style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
            ),
            const SizedBox(height: 12),
            const Divider(height: 1),
            const SizedBox(height: 12),
            const Text(
              'Portal Configuration',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF64748B)),
            ),
            const SizedBox(height: 4),
            const Text('Role: Municipal Field Officer', style: TextStyle(fontSize: 13, color: Color(0xFF334155))),
            const Text('Department: Public Works & Infrastructure', style: TextStyle(fontSize: 13, color: Color(0xFF334155))),
            const Text('Ward: Zone 2 Command', style: TextStyle(fontSize: 13, color: Color(0xFF334155))),
            const Text('System: Supabase Auth & RLS Connected', style: TextStyle(fontSize: 13, color: Color(0xFF16803C))),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Close'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              _handleLogout();
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFFEE2E2),
              foregroundColor: const Color(0xFFDC2626),
              elevation: 0,
            ),
            child: const Text('Sign Out'),
          ),
        ],
      ),
    );
  }

  // ========================================
  // WIDGET BUILD
  // ========================================

  @override
  Widget build(BuildContext context) {
    final assignedCount = _assignedReports.where((r) =>
        r.status == ReportStatus.assigned ||
        r.status == ReportStatus.submitted ||
        r.status == ReportStatus.under_review).length;
    final inProgressCount = _assignedReports.where((r) => r.status == ReportStatus.in_progress).length;
    final resolvedCount = _assignedReports.where((r) =>
        r.status == ReportStatus.resolution_submitted ||
        r.status == ReportStatus.verified ||
        r.status == ReportStatus.closed).length;

    List<ComprehensiveReportModel> filteredReports = _assignedReports;
    if (_selectedFilter == 'assigned') {
      filteredReports = _assignedReports.where((r) =>
          r.status == ReportStatus.assigned ||
          r.status == ReportStatus.submitted ||
          r.status == ReportStatus.under_review).toList();
    } else if (_selectedFilter == 'in_progress') {
      filteredReports = _assignedReports.where((r) => r.status == ReportStatus.in_progress).toList();
    } else if (_selectedFilter == 'resolution_submitted') {
      filteredReports = _assignedReports.where((r) =>
          r.status == ReportStatus.resolution_submitted ||
          r.status == ReportStatus.verified ||
          r.status == ReportStatus.closed).toList();
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Text(
                  'CivicResolve',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 17,
                    color: Color(0xFF1E3A8A),
                  ),
                ),
                const SizedBox(width: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEFF6FF),
                    borderRadius: BorderRadius.circular(4),
                    border: Border.all(color: const Color(0xFFBFDBFE)),
                  ),
                  child: const Text(
                    'OFFICER',
                    style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Color(0xFF2563EB)),
                  ),
                ),
              ],
            ),
            const Text(
              'Municipal Field Officer Portal',
              style: TextStyle(fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.normal),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Color(0xFF64748B)),
            onPressed: _handleRefresh,
            tooltip: 'Refresh assigned queue',
          ),
          PopupMenuButton<String>(
            icon: Container(
              padding: const EdgeInsets.all(2),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: const Color(0xFFBFDBFE), width: 1.5),
              ),
              child: const CircleAvatar(
                radius: 14,
                backgroundColor: Color(0xFFEFF6FF),
                child: Icon(Icons.person, size: 18, color: Color(0xFF2563EB)),
              ),
            ),
            offset: const Offset(0, 48),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            onSelected: (val) {
              if (val == 'profile') {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => const ContractorProfilePage()),
                );
              } else if (val == 'settings') {
                _showSettingsDialog();
              } else if (val == 'logout') {
                _handleLogout();
              }
            },
            itemBuilder: (ctx) => [
              PopupMenuItem<String>(
                enabled: false,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _authService.userName,
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                    ),
                    const Text(
                      'Municipal Field Officer',
                      style: TextStyle(fontSize: 11, color: Color(0xFF2563EB), fontWeight: FontWeight.w600),
                    ),
                    const Divider(height: 12),
                  ],
                ),
              ),
              const PopupMenuItem<String>(
                value: 'profile',
                child: Row(
                  children: [
                    Icon(Icons.badge_outlined, size: 18, color: Color(0xFF475569)),
                    SizedBox(width: 10),
                    Text('My Profile', style: TextStyle(fontSize: 13)),
                  ],
                ),
              ),
              const PopupMenuItem<String>(
                value: 'settings',
                child: Row(
                  children: [
                    Icon(Icons.settings_outlined, size: 18, color: Color(0xFF475569)),
                    SizedBox(width: 10),
                    Text('Settings', style: TextStyle(fontSize: 13)),
                  ],
                ),
              ),
              const PopupMenuDivider(),
              const PopupMenuItem<String>(
                value: 'logout',
                child: Row(
                  children: [
                    Icon(Icons.logout, size: 18, color: Color(0xFFDC2626)),
                    SizedBox(width: 10),
                    Text('Sign Out', style: TextStyle(fontSize: 13, color: Color(0xFFDC2626), fontWeight: FontWeight.bold)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: FadeTransition(
        opacity: _fadeAnimation,
        child: RefreshIndicator(
          onRefresh: _handleRefresh,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // KPI Metric Cards
                Row(
                  children: [
                    Expanded(
                      child: _buildMetricCard(
                        title: 'Assigned',
                        count: assignedCount,
                        color: const Color(0xFF2563EB),
                        bgColor: const Color(0xFFEFF6FF),
                        icon: Icons.assignment_outlined,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _buildMetricCard(
                        title: 'In Progress',
                        count: inProgressCount,
                        color: const Color(0xFFD97706),
                        bgColor: const Color(0xFFFEF3C7),
                        icon: Icons.engineering_outlined,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _buildMetricCard(
                        title: 'Submitted',
                        count: resolvedCount,
                        color: const Color(0xFF16803C),
                        bgColor: const Color(0xFFF0FDF4),
                        icon: Icons.verified_outlined,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),

                // Section Header & Filters
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Assigned Complaints',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                    ),
                    Text(
                      '${filteredReports.length} Active',
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF64748B)),
                    ),
                  ],
                ),
                const SizedBox(height: 10),

                // Filter Pills
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _buildFilterChip('All', 'all'),
                      const SizedBox(width: 6),
                      _buildFilterChip('Assigned', 'assigned'),
                      const SizedBox(width: 6),
                      _buildFilterChip('In Progress', 'in_progress'),
                      const SizedBox(width: 6),
                      _buildFilterChip('Resolved', 'resolution_submitted'),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // Complaints List
                if (_isLoading) ...[
                  const Center(
                    child: Padding(
                      padding: EdgeInsets.symmetric(vertical: 40),
                      child: CircularProgressIndicator(),
                    ),
                  ),
                ] else if (filteredReports.isEmpty) ...[
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 20),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Column(
                      children: [
                        Icon(Icons.assignment_turned_in_outlined, size: 48, color: Colors.grey[400]),
                        const SizedBox(height: 12),
                        const Text(
                          'No complaints in this queue',
                          style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF475569)),
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'All assigned municipal tasks are up to date.',
                          style: TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                        ),
                      ],
                    ),
                  ),
                ] else ...[
                  ListView.separated(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: filteredReports.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 12),
                    itemBuilder: (ctx, idx) {
                      final report = filteredReports[idx];
                      return _buildComplaintCard(report);
                    },
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildMetricCard({
    required String title,
    required int count,
    required Color color,
    required Color bgColor,
    required IconData icon,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: bgColor,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: color, size: 18),
          ),
          const SizedBox(height: 10),
          Text(
            count.toString(),
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          Text(
            title,
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: Color(0xFF64748B),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String label, String value) {
    final isSelected = _selectedFilter == value;
    return GestureDetector(
      onTap: () => setState(() => _selectedFilter = value),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF2563EB) : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? const Color(0xFF2563EB) : const Color(0xFFCBD5E1),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: isSelected ? Colors.white : const Color(0xFF475569),
          ),
        ),
      ),
    );
  }

  Widget _buildComplaintCard(ComprehensiveReportModel report) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: InkWell(
        onTap: () => _showComplaintDetailsModal(report),
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Top Row: ID, Category, and Priority
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          '#${report.id}',
                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF64748B), fontFamily: 'monospace'),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        report.category,
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF334155)),
                      ),
                    ],
                  ),
                  _buildPriorityBadge(report.priority),
                ],
              ),
              const SizedBox(height: 8),

              // Title
              Text(
                report.title,
                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 4),

              // Description snippet
              if (report.description.isNotEmpty) ...[
                Text(
                  report.description,
                  style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 8),
              ],

              // Location snippet
              Row(
                children: [
                  const Icon(Icons.location_on, size: 14, color: Color(0xFF94A3B8)),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      report.location.isNotEmpty ? report.location : 'Zone 2 Jurisdiction Area',
                      style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              const Divider(height: 1, color: Color(0xFFF1F5F9)),
              const SizedBox(height: 10),

              // Footer: Status and Action Button
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _buildStatusBadge(report.status),
                  
                  // Action quick button
                  if (report.status == ReportStatus.submitted ||
                      report.status == ReportStatus.under_review ||
                      report.status == ReportStatus.assigned)
                    TextButton.icon(
                      onPressed: () => _handleStartWork(report),
                      icon: const Icon(Icons.play_arrow, size: 16),
                      label: const Text('Start Work', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                      style: TextButton.styleFrom(
                        foregroundColor: const Color(0xFF2563EB),
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        backgroundColor: const Color(0xFFEFF6FF),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                    )
                  else if (report.status == ReportStatus.in_progress)
                    TextButton.icon(
                      onPressed: () => _showResolutionSubmissionDialog(report),
                      icon: const Icon(Icons.check_circle_outline, size: 16),
                      label: const Text('Resolve', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                      style: TextButton.styleFrom(
                        foregroundColor: const Color(0xFF16803C),
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        backgroundColor: const Color(0xFFF0FDF4),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                    )
                  else
                    const Text(
                      'View Details →',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF64748B)),
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatusBadge(ReportStatus status) {
    Color bg = const Color(0xFFF1F5F9);
    Color fg = const Color(0xFF475569);
    String label = status.displayName;

    switch (status) {
      case ReportStatus.submitted:
      case ReportStatus.review:
      case ReportStatus.under_review:
      case ReportStatus.assigned:
        bg = const Color(0xFFEFF6FF);
        fg = const Color(0xFF2563EB);
        break;
      case ReportStatus.progress:
      case ReportStatus.in_progress:
        bg = const Color(0xFFFEF3C7);
        fg = const Color(0xFFD97706);
        break;
      case ReportStatus.resolution_submitted:
        bg = const Color(0xFFF0FDF4);
        fg = const Color(0xFF16803C);
        break;
      case ReportStatus.resolved:
      case ReportStatus.verified:
      case ReportStatus.closed:
        bg = const Color(0xFFF8FAFC);
        fg = const Color(0xFF334155);
        break;
      case ReportStatus.rejected:
        bg = const Color(0xFFFEE2E2);
        fg = const Color(0xFFDC2626);
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        label,
        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: fg),
      ),
    );
  }

  Widget _buildPriorityBadge(ReportPriority priority) {
    Color bg = const Color(0xFFF1F5F9);
    Color fg = const Color(0xFF475569);

    switch (priority) {
      case ReportPriority.high:
        bg = const Color(0xFFFFEDD5);
        fg = const Color(0xFFEA580C);
        break;
      case ReportPriority.medium:
        bg = const Color(0xFFFEF3C7);
        fg = const Color(0xFFD97706);
        break;
      case ReportPriority.low:
        bg = const Color(0xFFF1F5F9);
        fg = const Color(0xFF64748B);
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        priority.displayName.toUpperCase(),
        style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: fg),
      ),
    );
  }
}