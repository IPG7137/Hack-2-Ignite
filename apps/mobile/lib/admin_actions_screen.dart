import 'package:flutter/material.dart';
import 'comprehensive_database_service.dart';
import 'comprehensive_report_models.dart';
import 'auth_service.dart';

class AdminActionsScreen extends StatefulWidget {
  final ComprehensiveReportModel report;

  const AdminActionsScreen({
    super.key,
    required this.report,
  });

  @override
  State<AdminActionsScreen> createState() => _AdminActionsScreenState();
}

class _AdminActionsScreenState extends State<AdminActionsScreen> {
  final ComprehensiveDatabaseService _databaseService = ComprehensiveDatabaseService();
  final _noteController = TextEditingController();
  
  bool _isLoading = false;
  ReportStatus _selectedStatus = ReportStatus.submitted;
  AdminNoteType _selectedNoteType = AdminNoteType.internal;
  List<AdminNoteModel> _adminNotes = [];
  List<ReportStatusHistoryModel> _statusHistory = [];

  @override
  void initState() {
    super.initState();
    _selectedStatus = widget.report.status;
    _loadAdminData();
  }

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  Future<void> _loadAdminData() async {
    setState(() => _isLoading = true);
    
    try {
      final notes = await _databaseService.getAdminNotes(widget.report.id);
      final history = await _databaseService.getReportStatusHistory(widget.report.id);
      
      if (mounted) {
        setState(() {
          _adminNotes = notes;
          _statusHistory = history;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        _showErrorSnackBar('Failed to load admin data: $e');
      }
    }
  }

  Future<void> _updateReportStatus() async {
    if (_selectedStatus == widget.report.status && _noteController.text.trim().isEmpty) {
      _showErrorSnackBar('No changes to save');
      return;
    }

    setState(() => _isLoading = true);
    
    try {
      final authService = AuthService.instance;
      final adminId = authService.userId ?? authService.supabaseUser?.id ?? 'officer-id';
      final noteText = _noteController.text.trim();
      
      final result = await _databaseService.updateReportStatus(
        reportId: widget.report.id,
        newStatus: _selectedStatus,
        adminId: adminId,
        adminNote: noteText.isNotEmpty ? noteText : null,
      );
      
      if (result.success) {
        _showSuccessSnackBar(result.message);
        _noteController.clear();
        await _loadAdminData(); // Refresh data
        
        // Return to previous screen with updated status
        if (mounted) {
          Navigator.pop(context, true);
        }
      } else {
        _showErrorSnackBar(result.message);
      }
    } catch (e) {
      _showErrorSnackBar('Failed to update status: $e');
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _addAdminNote() async {
    final noteText = _noteController.text.trim();
    if (noteText.isEmpty) {
      _showErrorSnackBar('Please enter a note');
      return;
    }

    setState(() => _isLoading = true);
    
    try {
      final authService = AuthService.instance;
      final adminId = authService.userId ?? authService.supabaseUser?.id ?? 'officer-id';
      
      final result = await _databaseService.addAdminNote(
        reportId: widget.report.id,
        adminId: adminId,
        noteText: noteText,
        noteType: _selectedNoteType,
      );
      
      if (result.success) {
        _showSuccessSnackBar(result.message);
        _noteController.clear();
        await _loadAdminData(); // Refresh notes
      } else {
        _showErrorSnackBar(result.message);
      }
    } catch (e) {
      _showErrorSnackBar('Failed to add note: $e');
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  void _showSuccessSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.green,
        duration: const Duration(seconds: 3),
      ),
    );
  }

  void _showErrorSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.red,
        duration: const Duration(seconds: 3),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    
    return Scaffold(
      appBar: AppBar(
        title: Text('Admin Actions - Report #${widget.report.id}'),
        backgroundColor: colorScheme.primary,
        foregroundColor: colorScheme.onPrimary,
        elevation: 0,
      ),
      body: _isLoading 
        ? const Center(child: CircularProgressIndicator())
        : SingleChildScrollView(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildReportSummary(colorScheme),
                const SizedBox(height: 24),
                _buildStatusUpdateSection(colorScheme),
                const SizedBox(height: 24),
                _buildAdminNotesSection(colorScheme),
                const SizedBox(height: 24),
                _buildStatusHistorySection(colorScheme),
              ],
            ),
          ),
    );
  }

  Widget _buildReportSummary(ColorScheme colorScheme) {
    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Report Summary',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: colorScheme.primary,
              ),
            ),
            const SizedBox(height: 12),
            _buildInfoRow('Title', widget.report.title),
            _buildInfoRow('Category', widget.report.categoryDisplayName ?? widget.report.category),
            _buildInfoRow('Current Status', widget.report.statusDisplay),
            _buildInfoRow('Priority', widget.report.priority.displayName),
            _buildInfoRow('Reporter', widget.report.reporterName ?? 'Unknown'),
            _buildInfoRow('Contact', widget.report.contactNumber ?? 'Not provided'),
            _buildInfoRow('Aadhar Number', widget.report.aadharNumber ?? 'Not provided'),
            _buildInfoRow('Location', widget.report.location),
            _buildInfoRow('GPS', widget.report.gpsDisplay),
            _buildInfoRow('Submitted', widget.report.submittedTime),
            _buildInfoRow('Last Updated', widget.report.lastUpdatedTime),
            if (widget.report.imageUrls.isNotEmpty)
              _buildInfoRow('Images', '${widget.report.imageUrls.length} image(s)'),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              '$label:',
              style: const TextStyle(fontWeight: FontWeight.w500),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(color: Colors.grey),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusUpdateSection(ColorScheme colorScheme) {
    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Update Status',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: colorScheme.primary,
              ),
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<ReportStatus>(
              value: _selectedStatus,
              decoration: const InputDecoration(
                labelText: 'Report Status',
                border: OutlineInputBorder(),
              ),
              items: ReportStatus.values.map((status) {
                return DropdownMenuItem(
                  value: status,
                  child: Row(
                    children: [
                      Container(
                        width: 12,
                        height: 12,
                        decoration: BoxDecoration(
                          color: _getStatusColor(status),
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(status.displayName),
                    ],
                  ),
                );
              }).toList(),
              onChanged: (value) {
                if (value != null) {
                  setState(() => _selectedStatus = value);
                }
              },
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _noteController,
              decoration: const InputDecoration(
                labelText: 'Status Update Note (Optional)',
                hintText: 'Add a note about this status change...',
                border: OutlineInputBorder(),
              ),
              maxLines: 3,
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _isLoading ? null : _updateReportStatus,
                icon: const Icon(Icons.update),
                label: const Text('Update Status'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: colorScheme.primary,
                  foregroundColor: colorScheme.onPrimary,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAdminNotesSection(ColorScheme colorScheme) {
    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Admin Notes',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: colorScheme.primary,
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: DropdownButtonFormField<AdminNoteType>(
                    value: _selectedNoteType,
                    decoration: const InputDecoration(
                      labelText: 'Note Type',
                      border: OutlineInputBorder(),
                    ),
                    items: AdminNoteType.values.map((type) {
                      return DropdownMenuItem(
                        value: type,
                        child: Text(type.displayName),
                      );
                    }).toList(),
                    onChanged: (value) {
                      if (value != null) {
                        setState(() => _selectedNoteType = value);
                      }
                    },
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _noteController,
              decoration: const InputDecoration(
                labelText: 'Add internal notes...',
                hintText: 'Enter admin note here...',
                border: OutlineInputBorder(),
              ),
              maxLines: 4,
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _isLoading ? null : _addAdminNote,
                icon: const Icon(Icons.note_add),
                label: const Text('Save Notes'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: colorScheme.secondary,
                  foregroundColor: colorScheme.onSecondary,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                ),
              ),
            ),
            const SizedBox(height: 16),
            if (_adminNotes.isNotEmpty) ...[
              const Divider(),
              const SizedBox(height: 8),
              Text(
                'Previous Notes (${_adminNotes.length})',
                style: const TextStyle(
                  fontWeight: FontWeight.w500,
                  fontSize: 16,
                ),
              ),
              const SizedBox(height: 8),
              ..._adminNotes.map((note) => _buildNoteCard(note)),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildNoteCard(AdminNoteModel note) {
    return Card(
      margin: const EdgeInsets.symmetric(vertical: 4),
      child: Padding(
        padding: const EdgeInsets.all(12.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  _getNoteTypeIcon(note.noteType),
                  size: 16,
                  color: _getNoteTypeColor(note.noteType),
                ),
                const SizedBox(width: 8),
                Text(
                  note.noteType.displayName,
                  style: TextStyle(
                    fontWeight: FontWeight.w500,
                    color: _getNoteTypeColor(note.noteType),
                  ),
                ),
                const Spacer(),
                Text(
                  _formatDateTime(note.createdAt),
                  style: const TextStyle(
                    fontSize: 12,
                    color: Colors.grey,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(note.noteText),
            const SizedBox(height: 4),
            Text(
              'By: ${note.adminName}',
              style: const TextStyle(
                fontSize: 12,
                fontStyle: FontStyle.italic,
                color: Colors.grey,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusHistorySection(ColorScheme colorScheme) {
    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Status History',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: colorScheme.primary,
              ),
            ),
            const SizedBox(height: 16),
            if (_statusHistory.isEmpty)
              const Text(
                'No status changes recorded yet.',
                style: TextStyle(color: Colors.grey),
              )
            else
              ..._statusHistory.map((history) => _buildHistoryCard(history)),
          ],
        ),
      ),
    );
  }

  Widget _buildHistoryCard(ReportStatusHistoryModel history) {
    return Card(
      margin: const EdgeInsets.symmetric(vertical: 4),
      child: Padding(
        padding: const EdgeInsets.all(12.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                if (history.oldStatus != null) ...[
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: _getStatusColor(ReportStatusExtension.fromString(history.oldStatus!)),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      history.oldStatus!.toUpperCase(),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  const Icon(Icons.arrow_forward, size: 16),
                ],
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: _getStatusColor(ReportStatusExtension.fromString(history.newStatus)),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    history.newStatus.toUpperCase(),
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                const Spacer(),
                Text(
                  _formatDateTime(history.createdAt),
                  style: const TextStyle(
                    fontSize: 12,
                    color: Colors.grey,
                  ),
                ),
              ],
            ),
            if (history.adminNotes != null && history.adminNotes!.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(
                'Note: ${history.adminNotes}',
                style: const TextStyle(fontStyle: FontStyle.italic),
              ),
            ],
            const SizedBox(height: 4),
            Text(
              'Changed by: ${history.changedByName ?? 'System'}',
              style: const TextStyle(
                fontSize: 12,
                color: Colors.grey,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Color _getStatusColor(ReportStatus status) {
    switch (status) {
      case ReportStatus.submitted:
        return Colors.blue;
      case ReportStatus.review:
      case ReportStatus.under_review:
        return Colors.indigo;
      case ReportStatus.assigned:
        return Colors.purple;
      case ReportStatus.progress:
      case ReportStatus.in_progress:
        return Colors.amber;
      case ReportStatus.resolution_submitted:
        return Colors.cyan;
      case ReportStatus.resolved:
      case ReportStatus.verified:
        return Colors.green;
      case ReportStatus.closed:
        return Colors.blueGrey;
      case ReportStatus.rejected:
        return Colors.red;
    }
  }

  IconData _getNoteTypeIcon(AdminNoteType type) {
    switch (type) {
      case AdminNoteType.internal:
        return Icons.lock;
      case AdminNoteType.public:
        return Icons.public;
      case AdminNoteType.system:
        return Icons.computer;
    }
  }

  Color _getNoteTypeColor(AdminNoteType type) {
    switch (type) {
      case AdminNoteType.internal:
        return Colors.red;
      case AdminNoteType.public:
        return Colors.blue;
      case AdminNoteType.system:
        return Colors.grey;
    }
  }

  String _formatDateTime(DateTime dateTime) {
    return '${dateTime.day.toString().padLeft(2, '0')}/${dateTime.month.toString().padLeft(2, '0')}/${dateTime.year} ${dateTime.hour.toString().padLeft(2, '0')}:${dateTime.minute.toString().padLeft(2, '0')}';
  }
}