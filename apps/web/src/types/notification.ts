/**
 * CIVICRESOLVE — Notification & Communication System Types
 * 
 * Defines canonical data contracts for multi-channel notifications (In-App, Push, Email, SMS),
 * complaint lifecycle events, SLA & Smart Alerts, civic rewards, role-based scoping,
 * delivery audit tracking, and user channel preferences.
 */

export type NotificationType =
  // Complaint Lifecycle
  | 'COMPLAINT_SUBMITTED'
  | 'COMPLAINT_ASSIGNED'
  | 'COMPLAINT_STATUS_CHANGED'
  | 'COMPLAINT_IN_PROGRESS'
  | 'COMPLAINT_RESOLVED'
  | 'COMPLAINT_VERIFICATION_REQUIRED'
  | 'COMPLAINT_CLOSED'
  | 'COMPLAINT_REOPENED'
  // SLA & Alerts
  | 'SLA_DUE_SOON'
  | 'SLA_OVERDUE'
  | 'SLA_ESCALATED'
  // Evidence & Verification
  | 'RESOLUTION_EVIDENCE_SUBMITTED'
  | 'EVIDENCE_REVIEW_REQUIRED'
  // Civic Score & Rewards
  | 'CIVIC_SCORE_UPDATED'
  | 'CIVIC_BADGE_EARNED'
  | 'CIVIC_CHAMPION_UPDATE'
  // Administrative & Operations
  | 'SYSTEM_ALERT'
  | 'ADMIN_ACTION_REQUIRED';

export type NotificationCategory =
  | 'complaints'
  | 'sla'
  | 'alerts'
  | 'civic'
  | 'system';

export type NotificationSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type NotificationChannel = 'in_app' | 'push' | 'email' | 'sms';

export type DeliveryStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'SKIPPED';

export interface NotificationRecord {
  id: string;
  userId: string;
  userRole: 'citizen' | 'officer' | 'dept_admin' | 'municipal_admin' | 'state_admin' | 'super_admin';
  notificationType: NotificationType;
  category: NotificationCategory;
  title: string;
  message: string;
  marathiTitle?: string;
  marathiMessage?: string;
  hindiTitle?: string;
  hindiMessage?: string;
  entityType?: 'complaint' | 'alert' | 'user' | 'system';
  entityId?: string;
  complaintId?: string;
  districtId: string;
  organizationId?: string;
  severity: NotificationSeverity;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  expiresAt?: string;
  deepLink?: string;
  metadata?: Record<string, any>;
  deduplicationHash?: string;
}

export interface NotificationDeliveryAudit {
  id: string;
  notificationId: string;
  userId: string;
  channel: NotificationChannel;
  deliveryStatus: DeliveryStatus;
  providerMessageId?: string;
  failureReason?: string;
  createdAt: string;
  sentAt?: string;
  deliveredAt?: string;
  failedAt?: string;
  districtId: string;
}

export interface ChannelPreference {
  inApp: boolean;
  push: boolean;
  email: boolean;
  sms: boolean;
}

export interface UserNotificationPreferences {
  userId: string;
  userRole: string;
  complaintUpdates: ChannelPreference;
  civicUpdates: ChannelPreference;
  operationalAlerts: ChannelPreference;
  updatedAt: string;
}

export interface DeviceTokenRecord {
  id: string;
  userId: string;
  deviceToken: string;
  platform: 'android' | 'ios' | 'web';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationFilterParams {
  category?: NotificationCategory | 'all';
  isRead?: boolean;
  severity?: NotificationSeverity;
  searchQuery?: string;
  districtId?: string;
  limit?: number;
  offset?: number;
}

export interface NotificationStatsSummary {
  totalCount: number;
  unreadCount: number;
  criticalCount: number;
  complaintsCount: number;
  slaCount: number;
  alertsCount: number;
  civicCount: number;
}
