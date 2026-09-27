/**
 * Smart Alert Engine for CIVICRESOLVE
 * Evaluates real complaint telemetry, SLA state, geographic clusters, and volume spikes.
 * Produces deterministic, non-fabricated operational alerts with deduplication and audit tracking.
 */

import { Complaint, IncidentCategory } from '../types/complaint';
import {
  SmartAlert,
  AlertType,
  AlertSeverity,
  AlertStatus,
  AlertAcknowledgementRequest,
  AlertEscalationRequest,
  AlertStatsSummary,
} from '../types/alert';
import { SLAEngine } from './slaEngine';
import { EmergingProblemEngine, EmergingHotspotResult } from './emergingProblemEngine';
import { MAHARASHTRA_DISTRICTS, getCorporationById } from '../data/maharashtraDistricts';

const ACKNOWLEDGEMENT_STORAGE_KEY = 'civicresolve_alert_acknowledgements';

interface PersistedAckRecord {
  status: AlertStatus;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  acknowledgementNotes?: string;
  escalationLevel?: 1 | 2 | 3 | 4;
  escalationReason?: string;
  resolvedBy?: string;
  resolvedAt?: string;
}

export class SmartAlertEngine {
  private static inMemoryAcks: Record<string, PersistedAckRecord> = {};

  /**
   * Retrieves persisted alert acknowledgement overrides
   */
  private static getPersistedAcks(): Record<string, PersistedAckRecord> {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(ACKNOWLEDGEMENT_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          return { ...this.inMemoryAcks, ...parsed };
        }
      }
    } catch (_) {}
    return { ...this.inMemoryAcks };
  }

  /**
   * Finds matching ack data for an alert by ID or fingerprint
   */
  private static findAckData(fingerprint: string, alertId: string): PersistedAckRecord | undefined {
    const acks = this.getPersistedAcks();
    return acks[fingerprint] || acks[alertId] || acks[`alert-${alertId}`] || acks[alertId.replace('alert-', '')];
  }

  /**
   * Saves an acknowledgement or escalation state
   */
  private static savePersistedAck(key: string, data: PersistedAckRecord): void {
    this.inMemoryAcks[key] = { ...this.inMemoryAcks[key], ...data };
    try {
      if (typeof localStorage !== 'undefined') {
        const acks = this.getPersistedAcks();
        acks[key] = { ...acks[key], ...data };
        localStorage.setItem(ACKNOWLEDGEMENT_STORAGE_KEY, JSON.stringify(acks));
      }
    } catch (_) {}
  }

  /**
   * Generates deterministic recommended actions based on complaint / alert condition
   */
  private static getRecommendedAction(
    type: AlertType,
    complaint?: Complaint,
    hotspot?: EmergingHotspotResult
  ): string {
    switch (type) {
      case 'CRITICAL_COMPLAINT':
        return 'Dispatch priority emergency response team and verify onsite containment within 2 hours.';
      case 'SLA_OVERDUE':
        return 'Review bottleneck with assigned Executive Engineer and issue contractor acceleration order.';
      case 'SLA_DUE_SOON':
        return 'Expedite field inspection and follow up with duty contractor to ensure on-time resolution.';
      case 'GEOGRAPHIC_CLUSTER':
        return `Conduct coordinated ward sweep in ${hotspot?.categoryLabel || 'affected'} zone (${hotspot?.complaintCount || 'multiple'} reports).`;
      case 'COMPLAINT_SPIKE':
        return 'Inspect infrastructure mainlines in the area to isolate systemic municipal failure.';
      case 'REPEATED_AREA_ISSUE':
        return 'Perform root-cause structural audit and preventive maintenance.';
      default:
        return 'Review grievance dossier and update operational status.';
    }
  }

  /**
   * Evaluates complaints and spatial records to produce authoritative, deduplicated alerts
   */
  public static evaluateAlerts(
    complaints: Complaint[],
    districtId?: string | null,
    corporationId?: string | null,
    referenceTimeMs: number = Date.now()
  ): SmartAlert[] {
    const alerts: SmartAlert[] = [];
    const acks = this.getPersistedAcks();

    // Resolve District / Corp metadata
    const dist = districtId ? MAHARASHTRA_DISTRICTS.find((d) => d.id === districtId) : null;
    const corp = corporationId ? getCorporationById(corporationId) : null;
    const districtName = dist?.name || corp?.district || 'Maharashtra';
    const corpName = corp?.name || (districtName ? `${districtName} Municipal Corporation` : null);

    // 1. Complaint-Level Alerts (Critical, SLA Overdue, SLA Due Soon)
    complaints.forEach((c) => {
      const isTerminal = c.status === 'verified' || c.status === 'closed' || c.status === 'rejected';
      const isResolved = c.status === 'resolution_submitted';
      const slaEval = SLAEngine.evaluateComplaintSLA(c, districtId, corporationId, referenceTimeMs);

      // A. Critical Complaint Alert (Section 3A)
      if (c.priority === 'urgent' && !isTerminal) {
        const fingerprint = `CRITICAL:${c.id}`;
        const alertId = `alert-${c.id}-critical`;
        const ackData = this.findAckData(fingerprint, alertId);

        alerts.push({
          id: alertId,
          fingerprint,
          type: 'CRITICAL_COMPLAINT',
          severity: 'CRITICAL',
          title: `Critical Grievance: #${c.id} (${c.title})`,
          description: `Urgent high-impact issue reported in ${c.location.address || c.location.ward}. Immediate municipal triage required.`,
          districtId: districtId || 'pune',
          districtName,
          municipalCorporationId: corporationId,
          municipalCorporationName: corpName,
          departmentId: c.assignment?.departmentId,
          departmentName: c.assignment?.departmentName || 'Public Works',
          complaintId: c.id,
          category: c.category,
          priority: c.priority,
          complaintStatus: c.status,
          location: {
            address: c.location.address,
            ward: c.location.ward,
            zone: c.location.zone,
            latitude: c.location.latitude,
            longitude: c.location.longitude,
          },
          createdAt: c.createdAt,
          updatedAt: c.updatedAt || c.createdAt,
          status: isResolved ? 'RESOLVED' : ackData?.status || 'ACTIVE',
          acknowledgedBy: ackData?.acknowledgedBy,
          acknowledgedAt: ackData?.acknowledgedAt,
          acknowledgementNotes: ackData?.acknowledgementNotes,
          resolvedBy: isResolved ? c.resolutionDetails?.resolvedBy || 'Field Officer' : ackData?.resolvedBy,
          resolvedAt: isResolved ? c.resolutionDetails?.resolvedAt || c.updatedAt : ackData?.resolvedAt,
          escalationLevel: ackData?.escalationLevel || (slaEval.isBreached ? 3 : 1),
          escalationReason: ackData?.escalationReason || 'Priority safety hazard flagged by automated telemetry.',
          recommendedAction: this.getRecommendedAction('CRITICAL_COMPLAINT', c),
          metadata: {
            remainingHours: slaEval.remainingTimeHours || 0,
            overdueHours: slaEval.overdueDurationHours || 0,
            dueAt: slaEval.slaDueAt || undefined,
          },
        });
      }

      // B. SLA Overdue Breach Alert (Section 3C)
      if (slaEval.slaState === 'OVERDUE' && !isTerminal && !isResolved && slaEval.slaConfigured) {
        const fingerprint = `SLA_OVERDUE:${c.id}`;
        const alertId = `alert-${c.id}-sla-overdue`;
        const ackData = this.findAckData(fingerprint, alertId);
        const isSevereBreach = (slaEval.overdueDurationHours || 0) >= 4;

        alerts.push({
          id: alertId,
          fingerprint,
          type: 'SLA_OVERDUE',
          severity: isSevereBreach ? 'CRITICAL' : 'HIGH',
          title: `Statutory SLA Breached: #${c.id} (${slaEval.overdueDurationHours}h Past Deadline)`,
          description: `Grievance #${c.id} (${c.title}) exceeded its ${slaEval.slaDurationHours}h resolution deadline. Escalation Tier ${slaEval.escalationLevel} triggered.`,
          districtId: districtId || 'pune',
          districtName,
          municipalCorporationId: corporationId,
          municipalCorporationName: corpName,
          departmentId: c.assignment?.departmentId,
          departmentName: c.assignment?.departmentName || 'Municipal Operations',
          complaintId: c.id,
          category: c.category,
          priority: c.priority,
          complaintStatus: c.status,
          location: {
            address: c.location.address,
            ward: c.location.ward,
            zone: c.location.zone,
            latitude: c.location.latitude,
            longitude: c.location.longitude,
          },
          createdAt: slaEval.slaDueAt || c.createdAt,
          updatedAt: c.updatedAt || c.createdAt,
          status: ackData?.status || 'ACTIVE',
          acknowledgedBy: ackData?.acknowledgedBy,
          acknowledgedAt: ackData?.acknowledgedAt,
          acknowledgementNotes: ackData?.acknowledgementNotes,
          resolvedBy: ackData?.resolvedBy,
          resolvedAt: ackData?.resolvedAt,
          escalationLevel: ackData?.escalationLevel || slaEval.escalationLevel,
          escalationReason: slaEval.escalationReason || `Breached by ${slaEval.overdueDurationHours} hours`,
          recommendedAction: this.getRecommendedAction('SLA_OVERDUE', c),
          metadata: {
            overdueHours: slaEval.overdueDurationHours || 0,
            targetHours: slaEval.slaDurationHours || 0,
            dueAt: slaEval.slaDueAt || undefined,
          },
        });
      }

      // C. SLA Due Soon Warning Alert (Section 3B)
      if (slaEval.slaState === 'DUE_SOON' && !isTerminal && !isResolved && slaEval.slaConfigured) {
        const fingerprint = `SLA_DUE_SOON:${c.id}`;
        const alertId = `alert-${c.id}-sla-due-soon`;
        const ackData = this.findAckData(fingerprint, alertId);

        alerts.push({
          id: alertId,
          fingerprint,
          type: 'SLA_DUE_SOON',
          severity: 'MEDIUM',
          title: `SLA Deadline Approaching: #${c.id} (${slaEval.remainingTimeHours}h Remaining)`,
          description: `Grievance #${c.id} (${c.title}) is nearing SLA expiration. Target completion due at ${slaEval.formattedDueAt}.`,
          districtId: districtId || 'pune',
          districtName,
          municipalCorporationId: corporationId,
          municipalCorporationName: corpName,
          departmentId: c.assignment?.departmentId,
          departmentName: c.assignment?.departmentName || 'Municipal Operations',
          complaintId: c.id,
          category: c.category,
          priority: c.priority,
          complaintStatus: c.status,
          location: {
            address: c.location.address,
            ward: c.location.ward,
            zone: c.location.zone,
            latitude: c.location.latitude,
            longitude: c.location.longitude,
          },
          createdAt: c.createdAt,
          updatedAt: c.updatedAt || c.createdAt,
          status: ackData?.status || 'ACTIVE',
          acknowledgedBy: ackData?.acknowledgedBy,
          acknowledgedAt: ackData?.acknowledgedAt,
          acknowledgementNotes: ackData?.acknowledgementNotes,
          resolvedBy: ackData?.resolvedBy,
          resolvedAt: ackData?.resolvedAt,
          escalationLevel: ackData?.escalationLevel || 2,
          escalationReason: `Approaching deadline (${slaEval.remainingTimeHours}h remaining)`,
          recommendedAction: this.getRecommendedAction('SLA_DUE_SOON', c),
          metadata: {
            remainingHours: slaEval.remainingTimeHours || 0,
            targetHours: slaEval.slaDurationHours || 0,
            dueAt: slaEval.slaDueAt || undefined,
          },
        });
      }
    });

    // 2. Geographic Hotspot Cluster Alerts (Section 3E)
    const hotspots = EmergingProblemEngine.detectHotspots(complaints, {
      clusterRadiusMeters: 500,
      minimumClusterSize: 2,
    }).filter((h) => h.classification !== 'normal');

    hotspots.forEach((h) => {
      const fingerprint = `HOTSPOT:${h.id}`;
      const alertId = `alert-hotspot-${h.id}`;
      const ackData = this.findAckData(fingerprint, alertId);
      const isCriticalCluster = h.classification === 'criticalEmergingProblem';

      const contributing = EmergingProblemEngine.getContributingComplaints(h, complaints);
      const unresolvedCount = contributing.filter(
        (c) => c.status !== 'verified' && c.status !== 'closed'
      ).length;
      const resolvedCount = contributing.length - unresolvedCount;

      alerts.push({
        id: alertId,
        fingerprint,
        type: 'GEOGRAPHIC_CLUSTER',
        severity: isCriticalCluster ? 'CRITICAL' : 'HIGH',
        title: `Civic Cluster Surge: ${h.categoryLabel} (${h.complaintCount} Reports in ~${h.radiusMeters}m)`,
        description: `${h.currentWindowCount} recent grievances concentrated in zone within 24h (${h.increaseRatio.toFixed(1)}× baseline surge).`,
        districtId: districtId || 'pune',
        districtName,
        municipalCorporationId: corporationId,
        municipalCorporationName: corpName,
        clusterId: h.id,
        category: h.category as any,
        location: {
          address: `${h.categoryLabel} Concentration Area`,
          ward: 'Multiple Wards',
          latitude: h.centerLatitude,
          longitude: h.centerLongitude,
        },
        createdAt: new Date(referenceTimeMs - 2 * 3600 * 1000).toISOString(),
        updatedAt: new Date(referenceTimeMs).toISOString(),
        status: ackData?.status || 'ACTIVE',
        acknowledgedBy: ackData?.acknowledgedBy,
        acknowledgedAt: ackData?.acknowledgedAt,
        acknowledgementNotes: ackData?.acknowledgementNotes,
        resolvedBy: ackData?.resolvedBy,
        resolvedAt: ackData?.resolvedAt,
        escalationLevel: ackData?.escalationLevel || (isCriticalCluster ? 3 : 2),
        escalationReason: `${h.increaseRatio.toFixed(1)}× volumetric surge over baseline`,
        recommendedAction: this.getRecommendedAction('GEOGRAPHIC_CLUSTER', undefined, h),
        metadata: {
          complaintCount: h.complaintCount,
          unresolvedCount,
          resolvedCount,
          surgeRatio: h.increaseRatio,
          timeWindowHours: 24,
          emergingScore: h.emergingScore,
        },
      });
    });

    // 3. Category Volume Spike Detection (Section 3D)
    const category24hCounts: Record<string, number> = {};
    const cutoff24h = referenceTimeMs - 24 * 3600 * 1000;

    complaints.forEach((c) => {
      const createdMs = c.createdAt ? new Date(c.createdAt).getTime() : 0;
      if (createdMs >= cutoff24h) {
        category24hCounts[c.category] = (category24hCounts[c.category] || 0) + 1;
      }
    });

    Object.entries(category24hCounts).forEach(([cat, count]) => {
      if (count >= 3) {
        const fingerprint = `SPIKE:${districtId || 'pune'}:${cat}`;
        const alertId = `alert-spike-${districtId || 'pune'}-${cat}`;
        const ackData = this.findAckData(fingerprint, alertId);
        const catLabel = cat.replace('_', ' ').toUpperCase();

        alerts.push({
          id: alertId,
          fingerprint,
          type: 'COMPLAINT_SPIKE',
          severity: count >= 5 ? 'HIGH' : 'MEDIUM',
          title: `Volume Spike Detected: ${catLabel} (${count} Reports in 24h)`,
          description: `Unusual concentration of ${count} ${catLabel} grievances filed across ${districtName} in the last 24 hours.`,
          districtId: districtId || 'pune',
          districtName,
          municipalCorporationId: corporationId,
          municipalCorporationName: corpName,
          category: cat as IncidentCategory,
          createdAt: new Date(cutoff24h).toISOString(),
          updatedAt: new Date(referenceTimeMs).toISOString(),
          status: ackData?.status || 'ACTIVE',
          acknowledgedBy: ackData?.acknowledgedBy,
          acknowledgedAt: ackData?.acknowledgedAt,
          acknowledgementNotes: ackData?.acknowledgementNotes,
          resolvedBy: ackData?.resolvedBy,
          resolvedAt: ackData?.resolvedAt,
          escalationLevel: ackData?.escalationLevel || 2,
          escalationReason: `Volume spike threshold exceeded (${count} reports)`,
          recommendedAction: this.getRecommendedAction('COMPLAINT_SPIKE'),
          metadata: {
            complaintCount: count,
            timeWindowHours: 24,
          },
        });
      }
    });

    const severityOrder: Record<AlertSeverity, number> = {
      CRITICAL: 5,
      HIGH: 4,
      MEDIUM: 3,
      LOW: 2,
      INFO: 1,
    };

    return alerts.sort((a, b) => {
      const sevDiff = severityOrder[b.severity] - severityOrder[a.severity];
      if (sevDiff !== 0) return sevDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  /**
   * Acknowledges an alert and stores audit metadata
   */
  public static acknowledgeAlert(req: AlertAcknowledgementRequest): boolean {
    const alertId = req.alertId;
    const data: PersistedAckRecord = {
      status: 'ACKNOWLEDGED',
      acknowledgedBy: `${req.acknowledgedBy} (${req.role})`,
      acknowledgedAt: new Date().toISOString(),
      acknowledgementNotes: req.notes || 'Acknowledged and assigned for immediate field dispatch.',
    };

    this.savePersistedAck(alertId, data);
    return true;
  }

  /**
   * Escalates an alert to higher tier
   */
  public static escalateAlert(req: AlertEscalationRequest): boolean {
    const data: PersistedAckRecord = {
      status: 'ACKNOWLEDGED',
      escalationLevel: req.targetLevel,
      escalationReason: req.reason,
      acknowledgedBy: `${req.escalatedBy} [ESCALATED TO TIER ${req.targetLevel}]`,
      acknowledgedAt: new Date().toISOString(),
    };

    this.savePersistedAck(req.alertId, data);
    return true;
  }

  /**
   * Resolves an alert when underlying condition is remediated
   */
  public static resolveAlert(alertId: string, resolvedBy: string): boolean {
    const data: PersistedAckRecord = {
      status: 'RESOLVED',
      resolvedBy,
      resolvedAt: new Date().toISOString(),
    };

    this.savePersistedAck(alertId, data);
    return true;
  }

  /**
   * Computes statistical summary KPIs across all active alerts
   */
  public static calculateSummary(alerts: SmartAlert[]): AlertStatsSummary {
    let criticalCount = 0;
    let highCount = 0;
    let slaBreaches = 0;
    let slaDueSoon = 0;
    let complaintSpikes = 0;
    let geographicClusters = 0;
    let unacknowledgedCount = 0;
    let acknowledgedCount = 0;

    alerts.forEach((a) => {
      if (a.severity === 'CRITICAL') criticalCount++;
      if (a.severity === 'HIGH') highCount++;
      if (a.type === 'SLA_OVERDUE') slaBreaches++;
      if (a.type === 'SLA_DUE_SOON') slaDueSoon++;
      if (a.type === 'COMPLAINT_SPIKE') complaintSpikes++;
      if (a.type === 'GEOGRAPHIC_CLUSTER') geographicClusters++;
      if (a.status === 'ACTIVE') unacknowledgedCount++;
      if (a.status === 'ACKNOWLEDGED') acknowledgedCount++;
    });

    return {
      totalActive: alerts.filter((a) => a.status !== 'RESOLVED').length,
      criticalCount,
      highCount,
      slaBreaches,
      slaDueSoon,
      complaintSpikes,
      geographicClusters,
      unacknowledgedCount,
      acknowledgedCount,
    };
  }
}
