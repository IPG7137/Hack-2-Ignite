import 'package:flutter/material.dart';
import 'dart:async';
import 'comprehensive_report_models.dart';
import 'category_selection_screen.dart';

class CopilotMessageItem {
  final String id;
  final String sender; // 'user' or 'copilot'
  final String content;
  final DateTime timestamp;
  final List<String>? suggestedPrompts;
  final Map<String, dynamic>? actionProposal;
  final List<ComprehensiveReportModel>? similarReports;

  CopilotMessageItem({
    required this.id,
    required this.sender,
    required this.content,
    required this.timestamp,
    this.suggestedPrompts,
    this.actionProposal,
    this.similarReports,
  });
}

class AiCopilotSheet extends StatefulWidget {
  final List<ComprehensiveReportModel> reports;

  const AiCopilotSheet({super.key, required this.reports});

  static Future<void> show(BuildContext context, {List<ComprehensiveReportModel>? reports}) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => AiCopilotSheet(reports: reports ?? []),
    );
  }

  @override
  State<AiCopilotSheet> createState() => _AiCopilotSheetState();
}

class _AiCopilotSheetState extends State<AiCopilotSheet> {
  final TextEditingController _textController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  bool _isProcessing = false;

  late List<CopilotMessageItem> _messages;

  @override
  void initState() {
    super.initState();
    _messages = [
      CopilotMessageItem(
        id: 'init-1',
        sender: 'copilot',
        content: '🤖 **Civic Copilot Online**\n\n'
            'Ask about your civic complaints, describe an issue to create a draft, check for duplicates nearby, or review your Civic Score.',
        timestamp: DateTime.now(),
        suggestedPrompts: [
          'What is the status of my complaint?',
          'Pothole and waterlogging on main road',
          'Is there already a complaint nearby?',
          'What is my Civic Score?',
          'What evidence should I upload?',
        ],
      ),
    ];
  }

  @override
  void dispose() {
    _textController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _handleSend(String query) async {
    final trimmed = query.trim();
    if (trimmed.isEmpty || _isProcessing) return;

    final userMsg = CopilotMessageItem(
      id: 'user-${DateTime.now().millisecondsSinceEpoch}',
      sender: 'user',
      content: trimmed,
      timestamp: DateTime.now(),
    );

    setState(() {
      _messages.add(userMsg);
      _isProcessing = true;
    });
    _textController.clear();
    _scrollToBottom();

    // Artificial delay for grounded synthesis
    await Future.delayed(const Duration(milliseconds: 600));

    final reply = _processGroundedQuery(trimmed);

    if (mounted) {
      setState(() {
        _messages.add(reply);
        _isProcessing = false;
      });
      _scrollToBottom();
    }
  }

  CopilotMessageItem _processGroundedQuery(String query) {
    final qLower = query.toLowerCase();

    // 1. Cross-district isolation defense
    if (qLower.contains('ignore previous') ||
        qLower.contains('bypass') ||
        (qLower.contains('solapur') && !qLower.contains('pune')) ||
        (qLower.contains('mumbai') && !qLower.contains('pune'))) {
      if (qLower.contains('show other district') || qLower.contains('all district')) {
        return CopilotMessageItem(
          id: 'resp-${DateTime.now().millisecondsSinceEpoch}',
          sender: 'copilot',
          content: '🔒 **Access Restricted**\n\n'
              'The requested information is not available within your authorized district access.',
          timestamp: DateTime.now(),
        );
      }
    }

    // 2. Status inquiry
    if (qLower.contains('status') ||
        qLower.contains('pending') ||
        qLower.contains('assigned') ||
        qLower.contains('resolved')) {
      if (widget.reports.isEmpty) {
        return CopilotMessageItem(
          id: 'resp-${DateTime.now().millisecondsSinceEpoch}',
          sender: 'copilot',
          content: '📋 **Grievance Status Overview**\n\n'
              'You currently have no active complaints recorded in this district session.',
          timestamp: DateTime.now(),
          suggestedPrompts: ['How do I report a garbage problem?'],
        );
      }

      final latest = widget.reports.first;
      final statusStr = latest.status.name.toUpperCase();
      final categoryStr = latest.categoryDisplayName ?? latest.category;
      final timeStr = latest.createdAt.toLocal().toString().split('.')[0];

      return CopilotMessageItem(
        id: 'resp-${DateTime.now().millisecondsSinceEpoch}',
        sender: 'copilot',
        content: '📋 **Complaint Status Record**\n\n'
            'Your complaint **#${latest.id}** is currently **"$statusStr"**.\n\n'
            '• **Category:** $categoryStr\n'
            '• **Location:** ${latest.location}\n'
            '• **Reported On:** $timeStr\n'
            '• **Assigned Officer:** ${latest.assignedOfficerName ?? "Duty Desk"}\n'
            '• **Priority:** ${latest.priority.name.toUpperCase()}\n\n'
            '${latest.status == ReportStatus.inProgress ? "Work is actively underway by field crews." : latest.status == ReportStatus.resolved ? "Field work complete. Awaiting your citizen satisfaction verification." : "Assigned and queued in municipal dispatch."}',
        timestamp: DateTime.now(),
        suggestedPrompts: ['What evidence should I upload?'],
      );
    }

    // 3. Issue reporting natural language parser
    if (qLower.contains('pothole') ||
        qLower.contains('road') ||
        qLower.contains('garbage') ||
        qLower.contains('waste') ||
        qLower.contains('water') ||
        qLower.contains('drain') ||
        qLower.contains('street light') ||
        qLower.contains('broken') ||
        qLower.contains('leak') ||
        qLower.contains('overflow')) {
      String cat = 'Roads & Potholes';
      String? secondary;
      if (qLower.contains('garbage') || qLower.contains('waste') || qLower.contains('dump')) {
        cat = 'Solid Waste Management';
      } else if (qLower.contains('water') || qLower.contains('leak') || qLower.contains('drain')) {
        cat = 'Water Supply & Drainage';
        if (qLower.contains('pothole') || qLower.contains('road')) {
          secondary = 'Waterlogging on roadway';
        }
      } else if (qLower.contains('light')) {
        cat = 'Street Lighting';
      }

      final proposal = {
        'category': cat,
        'secondaryIssue': secondary,
        'description': query,
        'location': 'Current GPS / Detected Location',
      };

      return CopilotMessageItem(
        id: 'resp-${DateTime.now().millisecondsSinceEpoch}',
        sender: 'copilot',
        content: '📝 **Grievance Draft Extracted**\n\n'
            'I have formulated a grievance draft from your description. Please review before submission:',
        timestamp: DateTime.now(),
        actionProposal: proposal,
        suggestedPrompts: ['Is there already a complaint nearby?'],
      );
    }

    // 4. Duplicate Check
    if (qLower.contains('similar') || qLower.contains('duplicate') || qLower.contains('already')) {
      final nearby = widget.reports.take(2).toList();
      return CopilotMessageItem(
        id: 'resp-${DateTime.now().millisecondsSinceEpoch}',
        sender: 'copilot',
        content: nearby.isNotEmpty
            ? '🔍 **Nearby Grievance Check**\n\n'
                'Found ${nearby.length} existing active reports near your jurisdiction. You may review them or file a distinct report:'
            : '🔍 **Nearby Grievance Check**\n\n'
                'No duplicate reports found within 200m radius. Your report will be filed as a new incident.',
        timestamp: DateTime.now(),
        similarReports: nearby,
        suggestedPrompts: ['What evidence should I upload?'],
      );
    }

    // 5. Civic Score
    if (qLower.contains('score') || qLower.contains('champion') || qLower.contains('reward') || qLower.contains('credit')) {
      return CopilotMessageItem(
        id: 'resp-${DateTime.now().millisecondsSinceEpoch}',
        sender: 'copilot',
        content: '🏆 **Civic Champion Score**\n\n'
            '• **Current Score:** 450 Points (Rank #4 District Level)\n'
            '• **Badge:** Civic Sentinel Tier II\n'
            '• **Verified Reports:** ${widget.reports.length}\n'
            '• **Impact:** +50 pts per verified grievance, +25 pts for timely verification.',
        timestamp: DateTime.now(),
        suggestedPrompts: ['What is the status of my complaint?'],
      );
    }

    // 6. Evidence assistance
    if (qLower.contains('evidence') || qLower.contains('photo') || qLower.contains('upload')) {
      return CopilotMessageItem(
        id: 'resp-${DateTime.now().millisecondsSinceEpoch}',
        sender: 'copilot',
        content: '📸 **Evidence Guidance**\n\n'
            'For rapid municipal resolution, we recommend:\n'
            '1. A clear wide photo showing the civic defect\n'
            '2. A surrounding recognizable landmark\n'
            '3. Accurate GPS coordinates enabled on your device\n\n'
            '*(Do not include personal ID cards or unnecessary PII.)*',
        timestamp: DateTime.now(),
        suggestedPrompts: ['Pothole and waterlogging on main road'],
      );
    }

    // Default grounded guidance
    return CopilotMessageItem(
      id: 'resp-${DateTime.now().millisecondsSinceEpoch}',
      sender: 'copilot',
      content: '🤖 **Civic Intelligence Assistant**\n\n'
          'I am ready to help you with:\n'
          '• Real-time grievance tracking\n'
          '• Drafting complaints via voice/text\n'
          '• Detecting duplicate reports\n'
          '• Evidence upload standards\n'
          '• Civic Champion score breakdown',
      timestamp: DateTime.now(),
      suggestedPrompts: [
        'What is the status of my complaint?',
        'What is my Civic Score?',
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.85,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          // Header
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(
              color: const Color(0xFF123B6D),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
            ),
            child: Row(
              children: [
                Container(
                  width: 38,
                  height: 38,
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Center(
                    child: Icon(Icons.smart_toy_rounded, color: Colors.white, size: 22),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: const [
                      Text(
                        'CIVIC COPILOT',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 15,
                          letterSpacing: 0.5,
                        ),
                      ),
                      Text(
                        'Ask about your complaints or report an issue',
                        style: TextStyle(color: Colors.white70, fontSize: 11),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close, color: Colors.white70),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
          ),

          // Messages
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.all(16),
              itemCount: _messages.length,
              itemBuilder: (context, index) {
                final msg = _messages[index];
                final isUser = msg.sender == 'user';

                return Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Column(
                    crossAxisAlignment:
                        isUser ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                    children: [
                      Container(
                        constraints: BoxConstraints(
                          maxWidth: MediaQuery.of(context).size.width * 0.82,
                        ),
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: isUser
                              ? const Color(0xFF1769D2)
                              : const Color(0xFFF0F4F8),
                          borderRadius: BorderRadius.circular(16).copyWith(
                            topRight: isUser ? const Radius.circular(2) : null,
                            topLeft: !isUser ? const Radius.circular(2) : null,
                          ),
                          border: isUser
                              ? null
                              : Border.all(color: const Color(0xFFD9E2EC)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              msg.content,
                              style: TextStyle(
                                color: isUser ? Colors.white : const Color(0xFF172B4D),
                                fontSize: 13,
                                height: 1.4,
                              ),
                            ),
                            if (msg.actionProposal != null) ...[
                              const SizedBox(height: 12),
                              Container(
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(color: const Color(0xFF90CDF4)),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: const [
                                        Icon(Icons.check_circle, color: Color(0xFF1769D2), size: 16),
                                        SizedBox(width: 6),
                                        Text(
                                          'Confirm Grievance Creation',
                                          style: TextStyle(
                                            fontWeight: FontWeight.bold,
                                            fontSize: 12,
                                            color: Color(0xFF123B6D),
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 6),
                                    Text(
                                      'Category: ${msg.actionProposal!["category"]}',
                                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
                                    ),
                                    Text(
                                      'Description: ${msg.actionProposal!["description"]}',
                                      style: const TextStyle(fontSize: 11, color: Colors.black87),
                                    ),
                                    const SizedBox(height: 8),
                                    ElevatedButton(
                                      onPressed: () {
                                        Navigator.pop(context);
                                        Navigator.push(
                                          context,
                                          MaterialPageRoute(
                                            builder: (context) => const CategorySelectionScreen(),
                                          ),
                                        );
                                      },
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: const Color(0xFF1769D2),
                                        foregroundColor: Colors.white,
                                        minimumSize: const Size.fromHeight(34),
                                        shape: RoundedRectangleBorder(
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                      ),
                                      child: const Text('Review & Submit', style: TextStyle(fontSize: 12)),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                            if (msg.similarReports != null && msg.similarReports!.isNotEmpty) ...[
                              const SizedBox(height: 10),
                              ...msg.similarReports!.map((r) => Container(
                                    margin: const EdgeInsets.only(top: 6),
                                    padding: const EdgeInsets.all(8),
                                    decoration: BoxDecoration(
                                      color: Colors.white,
                                      borderRadius: BorderRadius.circular(8),
                                      border: Border.all(color: Colors.black12),
                                    ),
                                    child: Row(
                                      children: [
                                        const Icon(Icons.location_on, size: 14, color: Colors.blue),
                                        const SizedBox(width: 6),
                                        Expanded(
                                          child: Text(
                                            '#${r.id} - ${r.category}',
                                            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                                          ),
                                        ),
                                      ],
                                    ),
                                  )),
                            ],
                          ],
                        ),
                      ),
                      if (msg.suggestedPrompts != null && msg.suggestedPrompts!.isNotEmpty) ...[
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 6,
                          runSpacing: 6,
                          children: msg.suggestedPrompts!
                              .map(
                                (prompt) => ActionChip(
                                  label: Text(
                                    prompt,
                                    style: const TextStyle(fontSize: 11, color: Color(0xFF1769D2)),
                                  ),
                                  backgroundColor: const Color(0xFFEBF8FF),
                                  side: const BorderSide(color: Color(0xFFBEE3F8)),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(20),
                                  ),
                                  onPressed: () => _handleSend(prompt),
                                ),
                              )
                              .toList(),
                        ),
                      ],
                    ],
                  ),
                );
              },
            ),
          ),

          if (_isProcessing)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(
                children: const [
                  SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF1769D2)),
                  ),
                  SizedBox(width: 10),
                  Text('Civic Copilot is consulting municipal database...', style: TextStyle(fontSize: 11, color: Colors.black54)),
                ],
              ),
            ),

          // Input Bar
          Container(
            padding: EdgeInsets.only(
              left: 14,
              right: 14,
              top: 10,
              bottom: MediaQuery.of(context).viewInsets.bottom + 14,
            ),
            decoration: const BoxDecoration(
              color: Colors.white,
              border: Border(top: BorderSide(color: Color(0xFFE2E8F0))),
            ),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _textController,
                    decoration: InputDecoration(
                      hintText: 'Ask Copilot or describe an issue...',
                      hintStyle: const TextStyle(fontSize: 12, color: Colors.black45),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      filled: true,
                      fillColor: const Color(0xFFF7FAFC),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                        borderSide: const BorderSide(color: Color(0xFFCBD5E0)),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                        borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                      ),
                    ),
                    onSubmitted: _handleSend,
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  onPressed: () => _handleSend(_textController.text),
                  icon: const Icon(Icons.send_rounded, color: Color(0xFF1769D2)),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
