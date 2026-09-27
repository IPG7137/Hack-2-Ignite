/**
 * SLA Management Engine for CIVICRESOLVE
 * Evaluates complaint SLA status, deadlines, overdue breaches, and escalation tiers.
 * Strictly adheres to deterministic statutory rules without inventing government deadlines.
 */

import { Complaint, ComplaintPriority, IncidentCategory } from '../types/complaint';
import { SLARule, SLAState, ComplaintSLAEvaluation, EscalationLevel } from '../types/sla';

export class SLAEngine {
  /**
   * Default Maharashtra Statutory Resolution Benchmarks (Citizens Charter 2026)
   */
  private static defaultRules: SLARule[] = [
    {
      id: 'sla-rule-urgent-default',
      organizationType: 'STATE',
      category: 'all',
      priority: 'urgent',
      durationHours: 12,
      dueSoonHours: 4,
      escalationThresholdHours: 2,
      isActive: true,
      penaltyAmountPerHour: 5000,
      description: 'Emergency & Critical Safety Hazards (12h statutory limit)',
      escalationRecipients: ['Ward Officer', 'Executive Engineer', 'Contractor MD'],
    },
    {
      id: 'sla-rule-high-default',
      organizationType: 'STATE',
      category: 'all',
      priority: 'high',
      durationHours: 24,
      dueSoonHours: 6,
      escalationThresholdHours: 4,
      isActive: true,
      penaltyAmountPerHour: 2500,
      description: 'High-Priority Public Disruptions (24h statutory limit)',
      escalationRecipients: ['Deputy Engineer', 'Zonal Officer'],
    },
    {
      id: 'sla-rule-medium-default',
      organizationType: 'STATE',
      category: 'all',
      priority: 'medium',
      durationHours: 48,
      dueSoonHours: 12,
      escalationThresholdHours: 8,
      isActive: true,
      penaltyAmountPerHour: 1000,
      description: 'Standard Maintenance Grievances (48h statutory limit)',
      escalationRecipients: ['Junior Engineer', 'Ward Supervisor'],
    },
    {
      id: 'sla-rule-low-default',
      organizationType: 'STATE',
      category: 'all',
      priority: 'low',
      durationHours: 72,
      dueSoonHours: 18,
      escalationThresholdHours: 12,
      isActive: true,
      penaltyAmountPerHour: 500,
      description: 'Minor Community Works & Requests (72h statutory limit)',
      escalationRecipients: ['Field Inspector'],
    },
    // Category-specific statutory benchmarks
    {
      id: 'sla-rule-water-urgent',
      organizationType: 'STATE',
      category: 'water_sewage',
      priority: 'urgent',
      durationHours: 8,
      dueSoonHours: 3,
      escalationThresholdHours: 1,
      isActive: true,
      penaltyAmountPerHour: 7500,
      description: 'Major Water Supply Outage / Contamination (8h statutory limit)',
      escalationRecipients: ['Chief Water Engineer', 'Municipal Commissioner'],
    },
    {
      id: 'sla-rule-drainage-urgent',
      organizationType: 'STATE',
      category: 'drainage',
      priority: 'urgent',
      durationHours: 8,
      dueSoonHours: 3,
      escalationThresholdHours: 2,
      isActive: true,
      penaltyAmountPerHour: 6000,
      description: 'Severe Monsoon Inundation / Sewage Overflow (8h statutory limit)',
      escalationRecipients: ['Disaster Response Cell', 'Sewerage Superintendent'],
    },
  ];

  // Storage for custom runtime overrides (persisted or injected)
  private static customRules: SLARule[] = [];

  /**
   * Registers custom SLA rules for municipal corporations or districts
   */
  public static registerRules(rules: SLARule[]): void {
    this.customRules = [...rules];
  }

  /**
   * Retrieves all active SLA rules including defaults and custom rules
   */
  public static getAllRules(): SLARule[] {
    return [...this.customRules, ...this.defaultRules];
  }

  /**
   * Finds the most specific matching rule for a complaint
   */
  public static findMatchingRule(
    category: IncidentCategory,
    priority: ComplaintPriority,
    districtId?: string | null,
    corporationId?: string | null
  ): SLARule | null {
    const allRules = this.getAllRules().filter((r) => r.isActive);

    // 1. Check Corporation + Category + Priority match
    if (corporationId) {
      const corpCatPrio = allRules.find(
        (r) =>
          r.municipalCorporationId === corporationId &&
          (r.category === category || r.category === 'all') &&
          (r.priority === priority || r.priority === 'all')
      );
      if (corpCatPrio) return corpCatPrio;
    }

    // 2. Check District + Category + Priority match
    if (districtId) {
      const distCatPrio = allRules.find(
        (r) =>
          r.districtId === districtId &&
          (r.category === category || r.category === 'all') &&
          (r.priority === priority || r.priority === 'all')
      );
      if (distCatPrio) return distCatPrio;
    }

    // 3. Check State-wide Category-specific match
    const catMatch = allRules.find(
      (r) =>
        r.category === category &&
        (r.priority === priority || r.priority === 'all') &&
        !r.districtId &&
        !r.municipalCorporationId
    );
    if (catMatch) return catMatch;

    // 4. Check State-wide Priority default match
    const prioMatch = allRules.find(
      (r) =>
        r.category === 'all' &&
        r.priority === priority &&
        !r.districtId &&
        !r.municipalCorporationId
    );
    if (prioMatch) return prioMatch;

    return null;
  }

  /**
   * Evaluates the precise SLA status for a given complaint
   */
  public static evaluateComplaintSLA(
    complaint: Complaint,
    districtId?: string | null,
    corporationId?: string | null,
    referenceTimeMs: number = Date.now()
  ): ComplaintSLAEvaluation {
    const rule = this.findMatchingRule(
      complaint.category,
      complaint.priority,
      districtId,
      corporationId
    );

    const createdAtMs = complaint.createdAt ? new Date(complaint.createdAt).getTime() : referenceTimeMs;
    const isTerminalStatus =
      complaint.status === 'verified' ||
      complaint.status === 'closed' ||
      complaint.status === 'rejected';

    const isResolutionSubmitted = complaint.status === 'resolution_submitted';

    // If no rule is configured, return explicit unconfigured state (Section 1)
    if (!rule) {
      return {
        complaintId: complaint.id,
        category: complaint.category,
        priority: complaint.priority,
        createdAt: complaint.createdAt,
        assignedAt: complaint.assignment?.assignedAt || null,
        currentStatus: complaint.status,
        slaConfigured: false,
        slaDurationHours: null,
        slaDueAt: null,
        remainingTimeHours: null,
        overdueDurationHours: null,
        slaState: isTerminalStatus ? 'CLOSED' : 'NOT_CONFIGURED',
        escalationLevel: 1,
        isBreached: false,
      };
    }

    const durationMs = rule.durationHours * 3600 * 1000;
    const dueAtMs = createdAtMs + durationMs;
    const dueAtIso = new Date(dueAtMs).toISOString();

    const diffHours = (dueAtMs - referenceTimeMs) / (3600 * 1000);
    const isOverdue = diffHours < 0;
    const remainingTimeHours = isOverdue ? 0 : Math.round(diffHours * 10) / 10;
    const overdueDurationHours = isOverdue ? Math.round(Math.abs(diffHours) * 10) / 10 : 0;

    let slaState: SLAState = 'ON_TRACK';
    let escalationLevel: EscalationLevel = 1;
    let escalationReason = '';

    if (isTerminalStatus) {
      slaState = 'CLOSED';
      escalationLevel = 1;
    } else if (isResolutionSubmitted) {
      slaState = 'RESOLVED';
      escalationLevel = 1;
    } else if (complaint.status === 'submitted') {
      slaState = isOverdue ? 'OVERDUE' : diffHours <= rule.dueSoonHours ? 'DUE_SOON' : 'NOT_STARTED';
      escalationLevel = isOverdue ? 3 : 1;
    } else if (isOverdue) {
      slaState = 'OVERDUE';
      if (overdueDurationHours >= rule.escalationThresholdHours) {
        escalationLevel = 4; // Tier 4: Escalated to Executive Engineer / Municipal Commissioner
        escalationReason = `Breached by ${overdueDurationHours}h (exceeds ${rule.escalationThresholdHours}h threshold)`;
      } else {
        escalationLevel = 3; // Tier 3: Overdue Notice
        escalationReason = `SLA deadline breached by ${overdueDurationHours}h`;
      }
    } else if (diffHours <= rule.dueSoonHours) {
      slaState = 'DUE_SOON';
      escalationLevel = 2; // Tier 2: Warning
      escalationReason = `Approaching SLA deadline (${remainingTimeHours}h remaining)`;
    } else {
      slaState = 'ON_TRACK';
      escalationLevel = 1;
    }

    const formattedDueAt = new Date(dueAtMs).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    return {
      complaintId: complaint.id,
      category: complaint.category,
      priority: complaint.priority,
      createdAt: complaint.createdAt,
      assignedAt: complaint.assignment?.assignedAt || null,
      currentStatus: complaint.status,
      slaConfigured: true,
      slaDurationHours: rule.durationHours,
      slaDueAt: dueAtIso,
      remainingTimeHours,
      overdueDurationHours,
      slaState,
      escalationLevel,
      escalationReason,
      isBreached: isOverdue && !isTerminalStatus && !isResolutionSubmitted,
      formattedDueAt,
    };
  }
}
