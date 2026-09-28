/**
 * CIVICRESOLVE — Phase 18: Feature 6 Notifications & Communication Test Suite
 * 
 * Automated testing of multi-channel notification routing, template interpolation,
 * citizen privacy isolation, officer departmental scoping, strict district isolation,
 * state aggregation, deduplication, unconfigured channel safety, and non-PII compliance.
 */

import { NotificationService, NOTIFICATION_TEMPLATES } from './notificationService';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

export async function runNotificationsTests(): Promise<{ passed: number; failed: number }> {
  console.log('\n--- Running Complete Notification & Communication Test Suite (Feature 6) ---');
  NotificationService.resetStores();

  // Test 1: Notification Template Interpolation & Multilingual Integrity
  const tpl = NOTIFICATION_TEMPLATES.COMPLAINT_ASSIGNED;
  assert(Boolean(tpl), 'COMPLAINT_ASSIGNED template exists in dictionary');
  assert(Boolean(tpl.titleMr && tpl.messageMr), 'Marathi translation fields present in template');
  assert(Boolean(tpl.titleHi && tpl.messageHi), 'Hindi translation fields present in template');

  const interpolated = NotificationService.interpolateTemplate(tpl.messageEn, {
    complaint_id: 'CR-PUN-101',
    officer_name: 'Er. S. Patil',
    department: 'Roads & Infrastructure',
  });
  assert(interpolated.includes('#CR-PUN-101'), 'Complaint ID properly interpolated into message');
  assert(interpolated.includes('Er. S. Patil'), 'Officer name properly interpolated into message');
  assert(interpolated.includes('Roads & Infrastructure'), 'Department properly interpolated into message');

  // Test 2: In-App Notification Dispatch & Delivery
  const dispatchRes = NotificationService.dispatchNotification({
    userId: 'citizen-pune-01',
    userRole: 'citizen',
    notificationType: 'COMPLAINT_SUBMITTED',
    variables: { complaint_id: 'CR-PUN-105' },
    districtId: 'pune',
    organizationId: 'org-pmc',
    complaintId: 'CR-PUN-105',
    channels: ['in_app'],
  });

  assert(dispatchRes.notification.userId === 'citizen-pune-01', 'Notification created for targeted citizen user');
  assert(dispatchRes.notification.isRead === false, 'Notification initialized as unread');
  assert(dispatchRes.notification.severity === 'info', 'Default severity assigned from template');
  assert(dispatchRes.deliveryAudits.length === 1, 'Delivery audit created for in_app channel');
  assert(dispatchRes.deliveryAudits[0].deliveryStatus === 'DELIVERED', 'In-app channel marked DELIVERED');

  // Test 3: Unconfigured Channels Safe Handling (Push, Email, SMS)
  const multiChannelRes = NotificationService.dispatchNotification({
    userId: 'citizen-pune-01',
    userRole: 'citizen',
    notificationType: 'COMPLAINT_VERIFICATION_REQUIRED',
    variables: { complaint_id: 'CR-PUN-105' },
    districtId: 'pune',
    complaintId: 'CR-PUN-105',
    channels: ['in_app', 'push', 'email', 'sms'],
  });

  const pushAudit = multiChannelRes.deliveryAudits.find((a) => a.channel === 'push');
  assert(pushAudit?.deliveryStatus === 'SKIPPED', 'Push channel without active token marked SKIPPED');
  assert(
    Boolean(pushAudit?.failureReason?.includes('not configured')),
    'Push channel outputs transparent non-configured reason'
  );

  const emailAudit = multiChannelRes.deliveryAudits.find((a) => a.channel === 'email');
  assert(emailAudit?.deliveryStatus === 'SKIPPED', 'Unconfigured email channel marked SKIPPED');
  assert(
    emailAudit?.failureReason === 'Email notification channel not configured.',
    'Email channel outputs honest non-configured reason'
  );

  const smsAudit = multiChannelRes.deliveryAudits.find((a) => a.channel === 'sms');
  assert(smsAudit?.deliveryStatus === 'SKIPPED', 'Unconfigured SMS channel marked SKIPPED');
  assert(
    smsAudit?.failureReason === 'SMS notification channel not configured.',
    'SMS channel outputs honest non-configured reason'
  );

  // Test 4: Device Token Registration & Mobile Push Dispatch
  const devToken = NotificationService.registerDeviceToken('citizen-pune-01', 'fcm-token-android-xyz999', 'android');
  assert(devToken.isActive === true, 'Device token successfully registered as active');

  const pushWithTokenRes = NotificationService.dispatchNotification({
    userId: 'citizen-pune-01',
    userRole: 'citizen',
    notificationType: 'CIVIC_SCORE_UPDATED',
    variables: { points: '20' },
    districtId: 'pune',
    eventId: 'evt-score-20',
    channels: ['push'],
  });

  const pushSuccessAudit = pushWithTokenRes.deliveryAudits.find((a) => a.channel === 'push');
  assert(pushSuccessAudit?.deliveryStatus === 'SENT', 'Active registered device token routes push as SENT');

  // Deactivate token on logout
  const deactSuccess = NotificationService.deactivateDeviceToken('citizen-pune-01', 'fcm-token-android-xyz999');
  assert(deactSuccess === true, 'Device token successfully deactivated on logout');

  // Test 5: Deduplication & Idempotency
  const dup1 = NotificationService.dispatchNotification({
    userId: 'officer-pune-01',
    userRole: 'officer',
    notificationType: 'SLA_OVERDUE',
    variables: { complaint_id: 'CR-PUN-103', overdue_hours: '3' },
    districtId: 'pune',
    complaintId: 'CR-PUN-103',
    eventId: 'sla-overdue-CR-PUN-103',
  });

  const dup2 = NotificationService.dispatchNotification({
    userId: 'officer-pune-01',
    userRole: 'officer',
    notificationType: 'SLA_OVERDUE',
    variables: { complaint_id: 'CR-PUN-103', overdue_hours: '3' },
    districtId: 'pune',
    complaintId: 'CR-PUN-103',
    eventId: 'sla-overdue-CR-PUN-103', // Exact same event ID
  });

  assert(dup1.notification.id === dup2.notification.id, 'Duplicate notification event resolves to same ID');
  const officerNotifs = NotificationService.getNotifications('officer-pune-01', 'officer', 'pune');
  assert(
    officerNotifs.filter((n) => n.deduplicationHash === dup1.notification.deduplicationHash).length === 1,
    'Exactly one notification record stored after duplicate dispatch attempts'
  );

  // Test 6: Citizen Privacy & Isolation
  NotificationService.dispatchNotification({
    userId: 'citizen-pune-02',
    userRole: 'citizen',
    notificationType: 'COMPLAINT_SUBMITTED',
    variables: { complaint_id: 'CR-PUN-999' },
    districtId: 'pune',
    complaintId: 'CR-PUN-999',
  });

  const citizen1List = NotificationService.getNotifications('citizen-pune-01', 'citizen', 'pune');
  assert(
    citizen1List.every((n) => n.userId === 'citizen-pune-01'),
    'Citizen 1 list contains ZERO notifications belonging to Citizen 2'
  );

  // Test 7: Strict District Isolation (Pune vs Solapur vs Nashik vs CSN)
  NotificationService.dispatchNotification({
    userId: 'officer-solapur-01',
    userRole: 'officer',
    notificationType: 'COMPLAINT_ASSIGNED',
    variables: { complaint_id: 'CR-SOL-101', officer_name: 'Er. A. Kulkarni', department: 'Roads' },
    districtId: 'solapur',
    complaintId: 'CR-SOL-101',
  });

  NotificationService.dispatchNotification({
    userId: 'officer-nashik-01',
    userRole: 'officer',
    notificationType: 'COMPLAINT_ASSIGNED',
    variables: { complaint_id: 'CR-NSK-101', officer_name: 'Er. R. Deshmukh', department: 'Water' },
    districtId: 'nashik',
    complaintId: 'CR-NSK-101',
  });

  const puneOfficerList = NotificationService.getNotifications('officer-pune-01', 'officer', 'pune');
  assert(
    puneOfficerList.every((n) => n.districtId === 'pune'),
    'Pune officer notifications contain ZERO Solapur or Nashik notifications'
  );

  const solapurOfficerList = NotificationService.getNotifications('officer-solapur-01', 'officer', 'solapur');
  assert(
    solapurOfficerList.every((n) => n.districtId === 'solapur'),
    'Solapur officer notifications contain ZERO Pune notifications'
  );

  // Test 8: State Admin Aggregated Access
  const stateAdminList = NotificationService.getNotifications('state-admin-01', 'state_admin', 'maharashtra');
  assert(Array.isArray(stateAdminList), 'State Admin receives authorized statewide notifications array');

  // Test 9: Read / Unread State Management
  const unreadBefore = NotificationService.getUnreadCount('officer-pune-01', 'pune', 'officer');
  assert(unreadBefore > 0, `Unread count before marking is positive (${unreadBefore})`);

  const firstNotif = officerNotifs[0];
  const markSingleSuccess = NotificationService.markAsRead(firstNotif.id, 'officer-pune-01');
  assert(markSingleSuccess === true, 'Single notification marked as read successfully');

  const markedAllCount = NotificationService.markAllAsRead('officer-pune-01', 'pune', 'officer');
  assert(markedAllCount >= 0, 'Mark all as read executed cleanly');

  const unreadAfter = NotificationService.getUnreadCount('officer-pune-01', 'pune', 'officer');
  assert(unreadAfter === 0, 'Unread count is exactly 0 after markAllAsRead');

  // Test 10: Notification Preferences Scoping
  const citizenPrefs = NotificationService.getUserPreferences('citizen-pune-01', 'citizen');
  assert(citizenPrefs.complaintUpdates.inApp === true, 'Citizen complaint inApp default is true');
  assert(citizenPrefs.operationalAlerts.inApp === false, 'Citizen operational alerts inApp default is false (role guard)');

  const updatedPrefs = NotificationService.updateUserPreferences('citizen-pune-01', {
    civicUpdates: { inApp: true, push: false, email: false, sms: false },
  });
  assert(updatedPrefs.civicUpdates.push === false, 'Citizen successfully disabled civic push notifications');

  // Test 11: Non-PII Security Audit
  const allPuneNotifs = NotificationService.getNotifications('officer-pune-01', 'officer', 'pune');
  for (const notif of allPuneNotifs) {
    const jsonStr = JSON.stringify(notif);
    assert(!jsonStr.includes('password'), 'Notification payload contains zero passwords');
    assert(!jsonStr.includes('aadhar'), 'Notification payload contains zero raw Aadhar numbers');
    assert(!jsonStr.includes('bank_account'), 'Notification payload contains zero bank details');
  }

  return { passed, failed };
}

// Direct CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  runNotificationsTests().then(({ passed, failed }) => {
    console.log(`\n📊 Feature 6 Tests: ${passed} passed, ${failed} failed\n`);
    if (failed > 0) process.exit(1);
  });
}
