/**
 * CIVICRESOLVE — Centralized Notification & Communication Engine
 * 
 * Production-quality service managing in-app notifications, push tokens,
 * multi-channel dispatching (Email, SMS, Push, In-App), lifecycle triggers,
 * SLA alerts, citizen verification requests, deduplication, and strict district isolation.
 */

import {
  NotificationRecord,
  NotificationType,
  NotificationCategory,
  NotificationSeverity,
  NotificationChannel,
  NotificationDeliveryAudit,
  UserNotificationPreferences,
  DeviceTokenRecord,
  NotificationFilterParams,
  NotificationStatsSummary,
} from '../types/notification';

export interface TemplateDefinition {
  type: NotificationType;
  category: NotificationCategory;
  defaultSeverity: NotificationSeverity;
  titleEn: string;
  messageEn: string;
  titleMr: string;
  messageMr: string;
  titleHi: string;
  messageHi: string;
}

export const NOTIFICATION_TEMPLATES: Record<NotificationType, TemplateDefinition> = {
  COMPLAINT_SUBMITTED: {
    type: 'COMPLAINT_SUBMITTED',
    category: 'complaints',
    defaultSeverity: 'info',
    titleEn: 'Complaint Registered',
    messageEn: 'Your grievance #{{complaint_id}} has been recorded and submitted for municipal triage.',
    titleMr: 'तक्रार नोंदवली गेली',
    messageMr: 'आपली तक्रार #{{complaint_id}} नोंदवली गेली असून महापालिका तपासणीसाठी पाठवली आहे.',
    titleHi: 'शिकायत दर्ज की गई',
    messageHi: 'आपकी शिकायत #{{complaint_id}} दर्ज की गई है और नगर पालिका जांच के लिए भेजी गई है.',
  },
  COMPLAINT_ASSIGNED: {
    type: 'COMPLAINT_ASSIGNED',
    category: 'complaints',
    defaultSeverity: 'info',
    titleEn: 'Complaint Assigned',
    messageEn: 'Your grievance #{{complaint_id}} has been assigned to {{officer_name}} ({{department}}).',
    titleMr: 'तक्रार नियुक्त केली',
    messageMr: 'आपली तक्रार #{{complaint_id}} अधिकारी {{officer_name}} ({{department}}) यांच्याकडे सोपवली आहे.',
    titleHi: 'शिकायत सौंपी गई',
    messageHi: 'आपकी शिकायत #{{complaint_id}} अधिकारी {{officer_name}} ({{department}}) को सौंपी गई है.',
  },
  COMPLAINT_STATUS_CHANGED: {
    type: 'COMPLAINT_STATUS_CHANGED',
    category: 'complaints',
    defaultSeverity: 'info',
    titleEn: 'Status Updated',
    messageEn: 'Complaint #{{complaint_id}} status changed to {{status}}.',
    titleMr: 'स्थिती अपडेट केली',
    messageMr: 'तक्रार #{{complaint_id}} स्थिती {{status}} वर बदलली.',
    titleHi: 'स्थिति अपडेट की गई',
    messageHi: 'शिकायत #{{complaint_id}} की स्थिति {{status}} में बदल गई.',
  },
  COMPLAINT_IN_PROGRESS: {
    type: 'COMPLAINT_IN_PROGRESS',
    category: 'complaints',
    defaultSeverity: 'info',
    titleEn: 'Remediation In Progress',
    messageEn: 'Field team has commenced on-site remediation for grievance #{{complaint_id}}.',
    titleMr: 'दुरुस्तीचे काम सुरू',
    messageMr: 'तक्रार #{{complaint_id}} साठी प्रत्यक्ष जागेवर दुरुस्तीचे काम सुरू झाले आहे.',
    titleHi: 'मरम्मत कार्य प्रगति पर',
    messageHi: 'शिकायत #{{complaint_id}} के लिए स्थल पर मरम्मत कार्य शुरू हो गया है.',
  },
  COMPLAINT_RESOLVED: {
    type: 'COMPLAINT_RESOLVED',
    category: 'complaints',
    defaultSeverity: 'medium',
    titleEn: 'Resolution Submitted',
    messageEn: 'Remediation proof uploaded for complaint #{{complaint_id}}. Please inspect and verify resolution.',
    titleMr: 'दुरुस्ती अहवाल सादर',
    messageMr: 'तक्रार #{{complaint_id}} चे दुरुस्ती पुरावे अपलोड झाले आहेत. कृपया समाधान तपासा.',
    titleHi: 'समाधान प्रस्तुत किया गया',
    messageHi: 'शिकायत #{{complaint_id}} के समाधान प्रमाण अपलोड किए गए हैं. कृपया सत्यापन करें.',
  },
  COMPLAINT_VERIFICATION_REQUIRED: {
    type: 'COMPLAINT_VERIFICATION_REQUIRED',
    category: 'complaints',
    defaultSeverity: 'medium',
    titleEn: 'Citizen Verification Required',
    messageEn: 'Municipal field team completed work for #{{complaint_id}}. Please confirm resolution or request rework.',
    titleMr: 'नागरिक पडताळणी आवश्यक',
    messageMr: 'तक्रार #{{complaint_id}} चे काम पूर्ण झाले आहे. कृपया समाधान तपासून खात्री करा.',
    titleHi: 'नागरिक सत्यापन आवश्यक',
    messageHi: 'शिकायत #{{complaint_id}} का कार्य पूरा हुआ. कृपया समाधान की पुष्टि करें.',
  },
  COMPLAINT_CLOSED: {
    type: 'COMPLAINT_CLOSED',
    category: 'complaints',
    defaultSeverity: 'info',
    titleEn: 'Complaint Closed & Verified',
    messageEn: 'Grievance #{{complaint_id}} has been confirmed resolved and permanently closed.',
    titleMr: 'तक्रार बंद व प्रमाणित',
    messageMr: 'तक्रार #{{complaint_id}} चे समाधान प्रमाणित करून बंद करण्यात आली आहे.',
    titleHi: 'शिकायत बंद और सत्यापित',
    messageHi: 'शिकायत #{{complaint_id}} का समाधान सत्यापित कर बंद कर दिया गया है.',
  },
  COMPLAINT_REOPENED: {
    type: 'COMPLAINT_REOPENED',
    category: 'complaints',
    defaultSeverity: 'high',
    titleEn: 'Complaint Reopened by Citizen',
    messageEn: 'Citizen reported unresolved issue for #{{complaint_id}} (Reason: {{reason}}). Re-inspection required.',
    titleMr: 'नागरिकाने तक्रार पुन्हा उघडली',
    messageMr: 'तक्रार #{{complaint_id}} चे समाधान न झाल्याने पुन्हा उघडली (कारण: {{reason}}).',
    titleHi: 'नागरिक द्वारा शिकायत पुनः खोली गई',
    messageHi: 'शिकायत #{{complaint_id}} का समाधान न होने पर पुनः खोली गई (कारण: {{reason}}).',
  },
  SLA_DUE_SOON: {
    type: 'SLA_DUE_SOON',
    category: 'sla',
    defaultSeverity: 'medium',
    titleEn: 'SLA Deadline Approaching',
    messageEn: 'Grievance #{{complaint_id}} ({{priority}}) is approaching SLA deadline ({{hours_remaining}}h remaining).',
    titleMr: 'SLA मुदत संपत येत आहे',
    messageMr: 'तक्रार #{{complaint_id}} ची SLA मुदत लवकरच संपणार आहे ({{hours_remaining}} तास शिल्लक).',
    titleHi: 'SLA समयसीमा निकट है',
    messageHi: 'शिकायत #{{complaint_id}} की SLA समयसीमा जल्द समाप्त होने वाली है ({{hours_remaining}} घंटे शेष).',
  },
  SLA_OVERDUE: {
    type: 'SLA_OVERDUE',
    category: 'sla',
    defaultSeverity: 'high',
    titleEn: 'SLA Breach Detected',
    messageEn: 'Statutory resolution deadline breached on complaint #{{complaint_id}} by {{overdue_hours}}h.',
    titleMr: 'SLA मुदत संपली (उशीर)',
    messageMr: 'तक्रार #{{complaint_id}} ची शासकीय निवारण मुदत {{overdue_hours}} तासांनी उलटून गेली आहे.',
    titleHi: 'SLA समयसीमा का उल्लंघन',
    messageHi: 'शिकायत #{{complaint_id}} की वैधानिक समाधान समयसीमा {{overdue_hours}} घंटे पार कर गई है.',
  },
  SLA_ESCALATED: {
    type: 'SLA_ESCALATED',
    category: 'sla',
    defaultSeverity: 'critical',
    titleEn: 'Executive SLA Escalation',
    messageEn: 'Overdue grievance #{{complaint_id}} escalated to Ward Executive / District Administration.',
    titleMr: 'वरिष्ठ स्तरावर तक्रार हस्तांतरित',
    messageMr: 'मुदत उलटलेली तक्रार #{{complaint_id}} वरिष्ठ प्रभाग अधिकाऱ्यांकडे हस्तांतरित झाली.',
    titleHi: 'कार्यकारी स्तर पर शिकायत अग्रेषित',
    messageHi: 'अतिदेय शिकायत #{{complaint_id}} वरिष्ठ वार्ड अधिकारियों को अग्रेषित की गई.',
  },
  RESOLUTION_EVIDENCE_SUBMITTED: {
    type: 'RESOLUTION_EVIDENCE_SUBMITTED',
    category: 'alerts',
    defaultSeverity: 'info',
    titleEn: 'Remediation Evidence Uploaded',
    messageEn: 'Geotagged before/after photo proof attached for complaint #{{complaint_id}}.',
    titleMr: 'दुरुस्तीचे पुरावे जोडले',
    messageMr: 'तक्रार #{{complaint_id}} साठी प्रत्यक्ष जागेचे फोटो जोडले गेले आहेत.',
    titleHi: 'मरम्मत के प्रमाण संलग्न',
    messageHi: 'शिकायत #{{complaint_id}} के लिए स्थल के फोटो संलग्न किए गए हैं.',
  },
  EVIDENCE_REVIEW_REQUIRED: {
    type: 'EVIDENCE_REVIEW_REQUIRED',
    category: 'alerts',
    defaultSeverity: 'medium',
    titleEn: 'Evidence Review Required',
    messageEn: 'Resolution photo distance warning for #{{complaint_id}} requires supervisor audit.',
    titleMr: 'पुराव्यांची तपासणी आवश्यक',
    messageMr: 'तक्रार #{{complaint_id}} च्या फोटो अंतरावर चेतावणी असल्याने पर्यवेक्षकीय तपासणी आवश्यक.',
    titleHi: 'प्रमाण की समीक्षा आवश्यक',
    messageHi: 'शिकायत #{{complaint_id}} के फोटो दूरी चेतावनी के लिए पर्यवेक्षी समीक्षा आवश्यक.',
  },
  CIVIC_SCORE_UPDATED: {
    type: 'CIVIC_SCORE_UPDATED',
    category: 'civic',
    defaultSeverity: 'info',
    titleEn: 'Civic Score Updated',
    messageEn: 'You earned +{{points}} Civic Champion points for your verified civic contribution.',
    titleMr: 'नागरिक गुण जमा झाले',
    messageMr: 'आपल्या सक्रिय सहभागाबद्दल +{{points}} नागरिक गुण जमा झाले आहेत.',
    titleHi: 'नागरिक स्कोर अपडेट',
    messageHi: 'आपके सक्रिय योगदान के लिए +{{points}} नागरिक अंक जोड़े गए हैं.',
  },
  CIVIC_BADGE_EARNED: {
    type: 'CIVIC_BADGE_EARNED',
    category: 'civic',
    defaultSeverity: 'info',
    titleEn: 'Civic Badge Unlocked',
    messageEn: 'Congratulations! You earned the "{{badge_name}}" civic achievement badge.',
    titleMr: 'नागरिक सन्मान पदक प्राप्त',
    messageMr: 'अभिनंदन! आपल्याला "{{badge_name}}" हे सन्मान पदक मिळाले आहे.',
    titleHi: 'नागरिक पदक प्राप्त',
    messageHi: 'बधाई हो! आपको "{{badge_name}}" पदक प्राप्त हुआ है.',
  },
  CIVIC_CHAMPION_UPDATE: {
    type: 'CIVIC_CHAMPION_UPDATE',
    category: 'civic',
    defaultSeverity: 'info',
    titleEn: 'District Champion Standings',
    messageEn: 'You are ranked in the top {{tier}} of civic contributors in {{district}}.',
    titleMr: 'जिल्हा नागरिक रँकिंग',
    messageMr: 'आपण {{district}} जिल्ह्यातील अव्वल {{tier}} नागरिकांमध्ये आहात.',
    titleHi: 'जिला नागरिक रैंकिंग',
    messageHi: 'आप {{district}} जिले के शीर्ष {{tier}} नागरिक योगदानकर्ताओं में हैं.',
  },
  SYSTEM_ALERT: {
    type: 'SYSTEM_ALERT',
    category: 'system',
    defaultSeverity: 'high',
    titleEn: 'System Operational Alert',
    messageEn: '{{alert_message}}',
    titleMr: 'प्रणाली कार्यसूचना',
    messageMr: '{{alert_message}}',
    titleHi: 'प्रणाली कार्यसूचना',
    messageHi: '{{alert_message}}',
  },
  ADMIN_ACTION_REQUIRED: {
    type: 'ADMIN_ACTION_REQUIRED',
    category: 'system',
    defaultSeverity: 'high',
    titleEn: 'Administrative Review Required',
    messageEn: 'Grievance #{{complaint_id}} requires administrative intervention in {{district}}.',
    titleMr: 'प्रशासकीय कारवाई आवश्यक',
    messageMr: 'तक्रार #{{complaint_id}} साठी {{district}} प्रशासकीय हस्तक्षेप आवश्यक.',
    titleHi: 'प्रशासनिक कार्रवाई आवश्यक',
    messageHi: 'शिकायत #{{complaint_id}} के लिए {{district}} प्रशासनिक हस्तक्षेप आवश्यक.',
  },
};

export class NotificationService {
  // In-memory persistent stores with localStorage fallback
  private static notificationsStore: Map<string, NotificationRecord[]> = new Map();
  private static deliveryAudits: NotificationDeliveryAudit[] = [];
  private static userDevices: Map<string, DeviceTokenRecord[]> = new Map();
  private static userPreferences: Map<string, UserNotificationPreferences> = new Map();
  private static knownHashes: Set<string> = new Set();

  /**
   * Initialize in-memory storage from localStorage if available
   */
  public static init(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = window.localStorage.getItem('civicresolve_notifications');
        if (stored) {
          const parsed = JSON.parse(stored) as Record<string, NotificationRecord[]>;
          for (const [k, v] of Object.entries(parsed)) {
            this.notificationsStore.set(k, v);
          }
        }
      }
    } catch {
      // LocalStorage access fallback
    }
  }

  private static saveToLocalStorage(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const obj: Record<string, NotificationRecord[]> = {};
        for (const [k, v] of this.notificationsStore.entries()) {
          obj[k] = v;
        }
        window.localStorage.setItem('civicresolve_notifications', JSON.stringify(obj));
      }
    } catch {
      // Headless test ignore
    }
  }

  /**
   * Interpolates template placeholders (e.g. {{complaint_id}})
   */
  public static interpolateTemplate(template: string, vars: Record<string, any>): string {
    return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
      return vars[key] !== undefined ? String(vars[key]) : `{{${key}}}`;
    });
  }

  /**
   * Generates a deterministic deduplication hash to prevent notification spam
   */
  public static computeDeduplicationHash(
    eventId: string,
    userId: string,
    notificationType: NotificationType
  ): string {
    return `dedup-${eventId}-${userId}-${notificationType}`;
  }

  /**
   * Core Engine: Creates and dispatches a notification to an authorized user
   */
  public static dispatchNotification(params: {
    userId: string;
    userRole: 'citizen' | 'officer' | 'dept_admin' | 'municipal_admin' | 'state_admin' | 'super_admin';
    notificationType: NotificationType;
    variables: Record<string, any>;
    districtId: string;
    organizationId?: string;
    complaintId?: string;
    eventId?: string;
    customSeverity?: NotificationSeverity;
    deepLink?: string;
    channels?: NotificationChannel[];
  }): { notification: NotificationRecord; deliveryAudits: NotificationDeliveryAudit[] } {
    this.init();

    const template = NOTIFICATION_TEMPLATES[params.notificationType];
    if (!template) {
      throw new Error(`Unknown notification template type: ${params.notificationType}`);
    }

    const eventId = params.eventId || params.complaintId || `evt-${Date.now()}`;
    const dedupHash = this.computeDeduplicationHash(eventId, params.userId, params.notificationType);

    // Deduplication check
    if (this.knownHashes.has(dedupHash)) {
      // Find existing notification
      const userList = this.notificationsStore.get(params.userId) || [];
      const existing = userList.find((n) => n.deduplicationHash === dedupHash);
      if (existing) {
        return { notification: existing, deliveryAudits: [] };
      }
    }

    this.knownHashes.add(dedupHash);

    const title = this.interpolateTemplate(template.titleEn, params.variables);
    const message = this.interpolateTemplate(template.messageEn, params.variables);
    const marathiTitle = this.interpolateTemplate(template.titleMr, params.variables);
    const marathiMessage = this.interpolateTemplate(template.messageMr, params.variables);
    const hindiTitle = this.interpolateTemplate(template.titleHi, params.variables);
    const hindiMessage = this.interpolateTemplate(template.messageHi, params.variables);

    const now = new Date().toISOString();
    const notificationId = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const notification: NotificationRecord = {
      id: notificationId,
      userId: params.userId,
      userRole: params.userRole,
      notificationType: params.notificationType,
      category: template.category,
      title,
      message,
      marathiTitle,
      marathiMessage,
      hindiTitle,
      hindiMessage,
      entityType: params.complaintId ? 'complaint' : 'system',
      entityId: params.complaintId,
      complaintId: params.complaintId,
      districtId: params.districtId,
      organizationId: params.organizationId,
      severity: params.customSeverity || template.defaultSeverity,
      isRead: false,
      createdAt: now,
      deepLink: params.deepLink || (params.complaintId ? `/complaints/${params.complaintId}` : '/alerts'),
      metadata: params.variables,
      deduplicationHash: dedupHash,
    };

    // Store in user list
    const userList = this.notificationsStore.get(params.userId) || [];
    userList.unshift(notification);
    this.notificationsStore.set(params.userId, userList);
    this.saveToLocalStorage();

    // Multi-Channel Delivery Processing
    const requestedChannels = params.channels || ['in_app', 'push', 'email', 'sms'];
    const audits: NotificationDeliveryAudit[] = [];

    for (const ch of requestedChannels) {
      const auditId = `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      let status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'SKIPPED' = 'DELIVERED';
      let failureReason: string | undefined;

      if (ch === 'in_app') {
        status = 'DELIVERED';
      } else if (ch === 'push') {
        const devices = this.userDevices.get(params.userId) || [];
        const activeDevices = devices.filter((d) => d.isActive);
        if (activeDevices.length > 0) {
          status = 'SENT';
        } else {
          status = 'SKIPPED';
          failureReason = 'Push notification channel not configured (no active device token).';
        }
      } else if (ch === 'email') {
        // Safe unconfigured email channel handling
        status = 'SKIPPED';
        failureReason = 'Email notification channel not configured.';
      } else if (ch === 'sms') {
        // Safe unconfigured SMS channel handling
        status = 'SKIPPED';
        failureReason = 'SMS notification channel not configured.';
      }

      const audit: NotificationDeliveryAudit = {
        id: auditId,
        notificationId,
        userId: params.userId,
        channel: ch,
        deliveryStatus: status,
        failureReason,
        createdAt: now,
        sentAt: status === 'SENT' || status === 'DELIVERED' ? now : undefined,
        deliveredAt: status === 'DELIVERED' ? now : undefined,
        failedAt: status === 'FAILED' ? now : undefined,
        districtId: params.districtId,
      };

      this.deliveryAudits.push(audit);
      audits.push(audit);
    }

    return { notification, deliveryAudits: audits };
  }

  /**
   * Retrieves notifications for a specific user with district isolation & role guards
   */
  public static getNotifications(
    userId: string,
    userRole: string,
    userDistrictId: string,
    filters?: NotificationFilterParams
  ): NotificationRecord[] {
    this.init();
    let records = this.notificationsStore.get(userId) || [];

    // Strict District Isolation: Non-state-admin users cannot receive notifications from other districts
    const isStateAdmin = userRole === 'state_admin' || userRole === 'super_admin';
    if (!isStateAdmin) {
      records = records.filter(
        (n) => n.districtId.toLowerCase() === userDistrictId.toLowerCase()
      );
    }

    // Category Filter
    if (filters?.category && filters.category !== 'all') {
      records = records.filter((n) => n.category === filters.category);
    }

    // Read / Unread Filter
    if (filters?.isRead !== undefined) {
      records = records.filter((n) => n.isRead === filters.isRead);
    }

    // Severity Filter
    if (filters?.severity) {
      records = records.filter((n) => n.severity === filters.severity);
    }

    // Search Query
    if (filters?.searchQuery && filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase().trim();
      records = records.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.message.toLowerCase().includes(q) ||
          (n.complaintId && n.complaintId.toLowerCase().includes(q))
      );
    }

    // Pagination
    if (filters?.offset !== undefined || filters?.limit !== undefined) {
      const offset = filters.offset || 0;
      const limit = filters.limit || 50;
      return records.slice(offset, offset + limit);
    }

    return records;
  }

  /**
   * Retrieves unread notification count
   */
  public static getUnreadCount(userId: string, userDistrictId: string, userRole: string = 'citizen'): number {
    const list = this.getNotifications(userId, userRole, userDistrictId, { isRead: false });
    return list.length;
  }

  /**
   * Marks a specific notification as read
   */
  public static markAsRead(notificationId: string, userId: string): boolean {
    this.init();
    const list = this.notificationsStore.get(userId) || [];
    const item = list.find((n) => n.id === notificationId);
    if (item) {
      item.isRead = true;
      item.readAt = new Date().toISOString();
      this.saveToLocalStorage();
      return true;
    }
    return false;
  }

  /**
   * Marks all notifications for a user as read
   */
  public static markAllAsRead(userId: string, userDistrictId: string, userRole: string = 'citizen'): number {
    this.init();
    const list = this.getNotifications(userId, userRole, userDistrictId);
    let count = 0;
    const now = new Date().toISOString();
    for (const item of list) {
      if (!item.isRead) {
        item.isRead = true;
        item.readAt = now;
        count++;
      }
    }
    this.saveToLocalStorage();
    return count;
  }

  /**
   * Computes statistical summary of notifications
   */
  public static getStatsSummary(
    userId: string,
    userRole: string,
    userDistrictId: string
  ): NotificationStatsSummary {
    const all = this.getNotifications(userId, userRole, userDistrictId);
    return {
      totalCount: all.length,
      unreadCount: all.filter((n) => !n.isRead).length,
      criticalCount: all.filter((n) => n.severity === 'critical').length,
      complaintsCount: all.filter((n) => n.category === 'complaints').length,
      slaCount: all.filter((n) => n.category === 'sla').length,
      alertsCount: all.filter((n) => n.category === 'alerts').length,
      civicCount: all.filter((n) => n.category === 'civic').length,
    };
  }

  /**
   * Registers a mobile/web device token for push delivery
   */
  public static registerDeviceToken(
    userId: string,
    token: string,
    platform: 'android' | 'ios' | 'web' = 'android'
  ): DeviceTokenRecord {
    const devices = this.userDevices.get(userId) || [];
    const existing = devices.find((d) => d.deviceToken === token);
    const now = new Date().toISOString();

    if (existing) {
      existing.isActive = true;
      existing.updatedAt = now;
      return existing;
    }

    const record: DeviceTokenRecord = {
      id: `dev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId,
      deviceToken: token,
      platform,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    devices.push(record);
    this.userDevices.set(userId, devices);
    return record;
  }

  /**
   * Deactivates a device token upon logout
   */
  public static deactivateDeviceToken(userId: string, token: string): boolean {
    const devices = this.userDevices.get(userId) || [];
    const record = devices.find((d) => d.deviceToken === token);
    if (record) {
      record.isActive = false;
      record.updatedAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  /**
   * Retrieves user notification preferences
   */
  public static getUserPreferences(userId: string, userRole: string = 'citizen'): UserNotificationPreferences {
    const existing = this.userPreferences.get(userId);
    if (existing) return existing;

    const defaults: UserNotificationPreferences = {
      userId,
      userRole,
      complaintUpdates: { inApp: true, push: true, email: false, sms: false },
      civicUpdates: { inApp: true, push: true, email: false, sms: false },
      operationalAlerts: {
        inApp: userRole !== 'citizen',
        push: userRole !== 'citizen',
        email: false,
        sms: false,
      },
      updatedAt: new Date().toISOString(),
    };

    this.userPreferences.set(userId, defaults);
    return defaults;
  }

  /**
   * Updates user notification preferences
   */
  public static updateUserPreferences(
    userId: string,
    prefs: Partial<UserNotificationPreferences>
  ): UserNotificationPreferences {
    const current = this.getUserPreferences(userId);
    const updated: UserNotificationPreferences = {
      ...current,
      ...prefs,
      updatedAt: new Date().toISOString(),
    };
    this.userPreferences.set(userId, updated);
    return updated;
  }

  /**
   * Seeds baseline factual notifications for demonstration and testing
   */
  public static seedDemonstrationNotifications(): void {
    this.resetStores();

    // 1. Pune Municipal Officer Notifications
    this.dispatchNotification({
      userId: 'officer-pune-01',
      userRole: 'officer',
      notificationType: 'COMPLAINT_ASSIGNED',
      variables: {
        complaint_id: 'CR-PUN-101',
        officer_name: 'Er. S. Patil',
        department: 'Water Supply & Drainage',
      },
      districtId: 'pune',
      organizationId: 'org-pmc',
      complaintId: 'CR-PUN-101',
      customSeverity: 'high',
    });

    this.dispatchNotification({
      userId: 'officer-pune-01',
      userRole: 'officer',
      notificationType: 'SLA_DUE_SOON',
      variables: {
        complaint_id: 'CR-PUN-101',
        priority: 'Urgent',
        hours_remaining: '2.5',
      },
      districtId: 'pune',
      organizationId: 'org-pmc',
      complaintId: 'CR-PUN-101',
      customSeverity: 'medium',
    });

    this.dispatchNotification({
      userId: 'officer-pune-01',
      userRole: 'officer',
      notificationType: 'COMPLAINT_REOPENED',
      variables: {
        complaint_id: 'CR-PUN-102',
        reason: 'Partial resolution (water valve collar leak persists)',
      },
      districtId: 'pune',
      organizationId: 'org-pmc',
      complaintId: 'CR-PUN-102',
      customSeverity: 'high',
    });

    // 2. Pune Citizen Notifications
    this.dispatchNotification({
      userId: 'citizen-pune-01',
      userRole: 'citizen',
      notificationType: 'COMPLAINT_VERIFICATION_REQUIRED',
      variables: {
        complaint_id: 'CR-PUN-101',
      },
      districtId: 'pune',
      complaintId: 'CR-PUN-101',
      customSeverity: 'medium',
    });

    this.dispatchNotification({
      userId: 'citizen-pune-01',
      userRole: 'citizen',
      notificationType: 'CIVIC_SCORE_UPDATED',
      variables: {
        points: '15',
      },
      districtId: 'pune',
      customSeverity: 'info',
    });

    // 3. Solapur Officer Notifications (Isolated to Solapur)
    this.dispatchNotification({
      userId: 'officer-solapur-01',
      userRole: 'officer',
      notificationType: 'COMPLAINT_ASSIGNED',
      variables: {
        complaint_id: 'CR-SOL-101',
        officer_name: 'Er. A. Kulkarni',
        department: 'Roads & Infrastructure',
      },
      districtId: 'solapur',
      organizationId: 'org-smc',
      complaintId: 'CR-SOL-101',
    });
  }

  /**
   * Resets internal state for test isolation
   */
  public static resetStores(): void {
    this.notificationsStore.clear();
    this.deliveryAudits = [];
    this.userDevices.clear();
    this.userPreferences.clear();
    this.knownHashes.clear();
  }
}
