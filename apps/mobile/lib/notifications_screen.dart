import 'package:flutter/material.dart';
import 'language_service.dart';
import 'notification_service.dart';

class NotificationItem {
  final String id;
  final String title;
  final String message;
  final NotificationType type;
  final DateTime timestamp;
  final bool isRead;
  final String? reportId;

  NotificationItem({
    required this.id,
    required this.title,
    required this.message,
    required this.type,
    required this.timestamp,
    this.isRead = false,
    this.reportId,
  });
}

enum NotificationType {
  reportSubmitted,
  reportUnderReview,
  reportInProgress,
  reportResolved,
  reportRejected,
  system,
}

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> with TickerProviderStateMixin {
  final LanguageService _languageService = LanguageService();
  final NotificationService _notificationService = NotificationService();
  late AnimationController _animationController;
  late AnimationController _staggerController;
  late Animation<double> _fadeAnimation;

  List<NotificationItem> get notifications => _notificationService.notifications;

  @override
  void initState() {
    super.initState();
    _languageService.addListener(_onLanguageChanged);
    
    // Initialize demo notifications if empty
    if (_notificationService.notifications.isEmpty) {
      _notificationService.initializeDemoNotifications();
    }
    
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

  Color _getNotificationColor(NotificationType type) {
    switch (type) {
      case NotificationType.reportSubmitted:
        return Colors.blue;
      case NotificationType.reportUnderReview:
        return Colors.orange;
      case NotificationType.reportInProgress:
        return Colors.purple;
      case NotificationType.reportResolved:
        return Colors.green;
      case NotificationType.reportRejected:
        return Colors.red;
      case NotificationType.system:
        return Colors.grey;
    }
  }

  IconData _getNotificationIcon(NotificationType type) {
    switch (type) {
      case NotificationType.reportSubmitted:
        return Icons.check_circle_outline;
      case NotificationType.reportUnderReview:
        return Icons.visibility_outlined;
      case NotificationType.reportInProgress:
        return Icons.build_outlined;
      case NotificationType.reportResolved:
        return Icons.task_alt_outlined;
      case NotificationType.reportRejected:
        return Icons.cancel_outlined;
      case NotificationType.system:
        return Icons.info_outline;
    }
  }

  String _formatTimestamp(DateTime timestamp) {
    final now = DateTime.now();
    final difference = now.difference(timestamp);
    
    if (difference.inMinutes < 60) {
      return '${difference.inMinutes}m ago';
    } else if (difference.inHours < 24) {
      return '${difference.inHours}h ago';
    } else if (difference.inDays < 7) {
      return '${difference.inDays}d ago';
    } else {
      return '${timestamp.day}/${timestamp.month}/${timestamp.year}';
    }
  }

  void _markAsRead(String notificationId) {
    setState(() {
      _notificationService.markAsRead(notificationId);
    });
  }

  void _markAllAsRead() {
    setState(() {
      _notificationService.markAllAsRead();
    });
  }

  void _clearAllNotifications() {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          title: Row(
            children: [
              const Icon(Icons.delete_outline, color: Colors.red, size: 24),
              const SizedBox(width: 8),
              Text(_languageService.getTranslation('clear_all_notifications')),
            ],
          ),
          content: Text(_languageService.getTranslation('clear_all_confirm_desc')),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: Text(_languageService.getTranslation('cancel')),
            ),
            ElevatedButton(
              onPressed: () {
                setState(() {
                  _notificationService.clearAllNotifications();
                });
                Navigator.of(context).pop();
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Row(
                      children: [
                        const Icon(Icons.check_circle, color: Colors.white, size: 20),
                        const SizedBox(width: 8),
                        Text(_languageService.getTranslation('all_notifications_cleared')),
                      ],
                    ),
                    backgroundColor: Colors.green,
                    duration: const Duration(seconds: 2),
                  ),
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.red,
                foregroundColor: Colors.white,
              ),
              child: Text(_languageService.getTranslation('clear_filters')),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final unreadCount = notifications.where((n) => !n.isRead).length;
    
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        elevation: 0,
        backgroundColor: Colors.transparent,
        foregroundColor: const Color(0xFF1E293B),
        title: Row(
          children: [
            Text(
              _languageService.getTranslation('notifications'),
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 20,
              ),
            ),
            if (unreadCount > 0) ...[
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.red,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  '$unreadCount',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ],
        ),
        actions: [
          if (notifications.isNotEmpty) ...[
            if (unreadCount > 0)
              IconButton(
                onPressed: _markAllAsRead,
                icon: const Icon(Icons.done_all),
                tooltip: _languageService.getTranslation('confirm'),
              ),
            PopupMenuButton<String>(
              onSelected: (value) {
                if (value == 'clear') {
                  _clearAllNotifications();
                }
              },
              itemBuilder: (context) => [
                PopupMenuItem(
                  value: 'clear',
                  child: Row(
                    children: [
                      const Icon(Icons.delete_outline, color: Colors.red, size: 20),
                      const SizedBox(width: 8),
                      Text(_languageService.getTranslation('clear_all_notifications')),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
      body: notifications.isEmpty
          ? _buildEmptyState()
          : AnimatedBuilder(
              animation: _fadeAnimation,
              builder: (context, child) {
                return Opacity(
                  opacity: _fadeAnimation.value,
                  child: _buildNotificationsList(),
                );
              },
            ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(32),
            decoration: BoxDecoration(
              color: Colors.grey[100],
              shape: BoxShape.circle,
            ),
            child: Icon(
              Icons.notifications_none_outlined,
              size: 64,
              color: Colors.grey[400],
            ),
          ),
          const SizedBox(height: 24),
          Text(
            _languageService.getTranslation('no_notifications_yet'),
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: Colors.grey[600],
            ),
          ),
          const SizedBox(height: 8),
          Text(
            _languageService.getTranslation('all_caught_up'),
            style: TextStyle(
              fontSize: 16,
              color: Colors.grey[500],
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildNotificationsList() {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: notifications.length,
      itemBuilder: (context, index) {
        final notification = notifications[index];
        return AnimatedBuilder(
          animation: _staggerController,
          builder: (context, child) {
            final delay = index * 0.1;
            final progress = Curves.easeOutCubic.transform(
              (((_staggerController.value - delay) / (1.0 - delay)).clamp(0.0, 1.0)),
            );
            
            return Transform.translate(
              offset: Offset(0, (1 - progress) * 50),
              child: Opacity(
                opacity: progress,
                child: _buildNotificationCard(notification, index),
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildNotificationCard(NotificationItem notification, int index) {
    final color = _getNotificationColor(notification.type);
    final icon = _getNotificationIcon(notification.type);
    
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      child: Material(
        color: notification.isRead ? Colors.white : color.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(16),
        elevation: notification.isRead ? 2 : 4,
        shadowColor: color.withValues(alpha: 0.2),
        child: InkWell(
          onTap: () {
            if (!notification.isRead) {
              _markAsRead(notification.id);
            }
          },
          borderRadius: BorderRadius.circular(16),
          child: Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              border: !notification.isRead 
                  ? Border.all(color: color.withValues(alpha: 0.3), width: 1.5)
                  : null,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: color.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(
                        icon,
                        color: color,
                        size: 24,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  notification.title,
                                  style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: notification.isRead 
                                        ? FontWeight.w600 
                                        : FontWeight.bold,
                                    color: const Color(0xFF1E293B),
                                  ),
                                ),
                              ),
                              if (!notification.isRead)
                                Container(
                                  width: 8,
                                  height: 8,
                                  decoration: BoxDecoration(
                                    color: color,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(
                            notification.message,
                            style: TextStyle(
                              fontSize: 14,
                              color: Colors.grey[600],
                              height: 1.4,
                            ),
                          ),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              if (notification.reportId != null) ...[
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 8,
                                    vertical: 4,
                                  ),
                                  decoration: BoxDecoration(
                                    color: color.withValues(alpha: 0.1),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Text(
                                    'ID: ${notification.reportId}',
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                      color: color,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),
                              ],
                              Text(
                                _formatTimestamp(notification.timestamp),
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Colors.grey[500],
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}