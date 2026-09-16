import { Complaint } from '../types/complaint';
import { CopilotMessage, GroundedMunicipalBriefing, MunicipalBriefingMetrics } from '../types/ai';
import { PriorityEngine, CivicPriorityAnalysis } from './priorityEngine';
import { EmergingProblemEngine, EmergingHotspotResult } from './emergingProblemEngine';
import { IncidentGroupingEngine, PotentialIncidentResult } from './incidentGroupingEngine';
import { ResolutionVerificationEngine, ResolutionVerificationResult } from './resolutionVerificationEngine';
import { SimilarityEngine } from './similarityEngine';
import { AIInsightsService } from './aiInsightsService';
import { GroundingSecurityGuard } from './groundingSecurityGuard';

import { UserRole } from './authService';

export type CopilotIntent =
  | 'PRIORITY_ATTENTION'
  | 'HOTSPOTS_ANOMALIES'
  | 'SPECIFIC_COMPLAINT'
  | 'INCIDENTS_CLUSTERS'
  | 'RESOLUTION_AUDITS'
  | 'CATEGORY_DEPARTMENT'
  | 'COMMISSIONER_BRIEFING'
  | 'SLA_OVERDUE'
  | 'UNKNOWN';

export interface CopilotSecurityContext {
  userId?: string;
  role?: UserRole;
  isStaff?: boolean;
  departmentId?: string;
}

export interface GroundedCopilotResponse {
  intent: CopilotIntent;
  content: string;
  referencedComplaintIds: string[];
  suggestedPrompts: string[];
}

export class CopilotService {
  /**
   * Identifies the primary municipal inquiry intent from the officer query.
   */
  public static detectIntent(query: string): CopilotIntent {
    const q = query.trim().toLowerCase();

    // Check for specific complaint lookup (e.g. #123, comp-101, complaint 45)
    if (
      /#\w+/.test(q) ||
      /\b(comp-\w+|cr-\d+|\bcomplaint\s+(#?\w+)|ticket\s+(#?\w+)|why\s+is\s+complaint)\b/.test(q)
    ) {
      return 'SPECIFIC_COMPLAINT';
    }

    if (
      q.includes('commissioner') ||
      q.includes('handover') ||
      q.includes('executive briefing') ||
      q.includes('executive summary') ||
      q.includes('daily report') ||
      q.includes('operations overview')
    ) {
      return 'COMMISSIONER_BRIEFING';
    }

    if (
      q.includes('hotspot') ||
      q.includes('surge') ||
      q.includes('anomaly') ||
      q.includes('anomalies') ||
      q.includes('emerging') ||
      q.includes('spike')
    ) {
      return 'HOTSPOTS_ANOMALIES';
    }

    if (
      q.includes('same incident') ||
      q.includes('common incident') ||
      q.includes('group') ||
      q.includes('grouping') ||
      q.includes('consolidate') ||
      q.includes('duplicate') ||
      q.includes('cluster')
    ) {
      return 'INCIDENTS_CLUSTERS';
    }

    if (
      q.includes('verification') ||
      q.includes('verify') ||
      q.includes('resolved') ||
      q.includes('audit') ||
      q.includes('satisfaction') ||
      q.includes('feedback') ||
      q.includes('proof') ||
      q.includes('after photo')
    ) {
      return 'RESOLUTION_AUDITS';
    }

    if (
      q.includes('overdue') ||
      q.includes('sla') ||
      q.includes('breach') ||
      q.includes('deadline')
    ) {
      return 'SLA_OVERDUE';
    }

    if (
      q.includes('road') ||
      q.includes('water') ||
      q.includes('drainage') ||
      q.includes('sewage') ||
      q.includes('waste') ||
      q.includes('garbage') ||
      q.includes('electric') ||
      q.includes('light') ||
      q.includes('safety') ||
      q.includes('department')
    ) {
      return 'CATEGORY_DEPARTMENT';
    }

    if (
      q.includes('priority') ||
      q.includes('attention') ||
      q.includes('urgent') ||
      q.includes('critical') ||
      q.includes('first') ||
      q.includes('highest') ||
      q.includes('needs attention') ||
      q.includes('what to do')
    ) {
      return 'PRIORITY_ATTENTION';
    }

    return 'UNKNOWN';
  }

  /**
   * Main query execution: parses the officer's question, queries deterministic 3A-3E engines,
   * and formats an evidence-grounded response within the caller's authorization scope.
   */
  public static async answerOfficerQuery(
    query: string,
    complaints: Complaint[],
    securityContext?: CopilotSecurityContext
  ): Promise<CopilotMessage> {
    // 1. Inspect and sanitize query for security & prompt injection
    const sanitized = GroundingSecurityGuard.inspectAndSanitizeQuery(query);
    if (!sanitized.isSafe) {
      return {
        id: `MSG-SEC-${Date.now()}`,
        sender: 'assistant',
        content: `### 🛡️ Municipal Security Policy Alert\n\n**Security Violation:** ${sanitized.securityViolation || 'Unauthorized prompt override pattern detected.'}\n\nThe CivicResolve AI Copilot operates strictly as an evidence-constrained decision-support system. All telemetry queries must relate to legitimate municipal operations and complaints.`,
        timestamp: new Date().toISOString(),
        referencedComplaintIds: [],
        suggestedPrompts: [
          'What are today\'s highest-priority complaints?',
          'Where are the emerging hotspots?',
          'Give me a briefing for the municipal commissioner',
        ],
      };
    }

    const cleanQuery = sanitized.cleanedQuery;

    // Authorization Guard: Check if a citizen is requesting restricted city-wide administrative briefings
    if (securityContext?.role === 'citizen') {
      const intent = this.detectIntent(cleanQuery);
      if (intent === 'COMMISSIONER_BRIEFING') {
        return {
          id: `MSG-AUTH-${Date.now()}`,
          sender: 'assistant',
          content: `### 🏛️ Municipal AI Copilot\n\nI don't have access to city-wide command operations for your citizen account. Please ask about your submitted grievances or local community reports.`,
          timestamp: new Date().toISOString(),
          referencedComplaintIds: [],
          suggestedPrompts: [
            'What is the status of my complaint?',
            'How is my grievance prioritized?',
          ],
        };
      }
    }

    if (!complaints || complaints.length === 0) {
      return {
        id: `MSG-${Date.now()}`,
        sender: 'assistant',
        content: `### 🏛️ Municipal AI Copilot Telemetry\n\nI don't have enough current data to determine that.\n\nI don't have access to that complaint or there are currently **0 authorized records** in your accessible queue. All telemetry queries operate strictly over RLS-authorized complaint records. Once live reports are received via Supabase, I can evaluate priority (Phase 3B), emerging hotspots (Phase 3C), common incidents (Phase 3D), and resolution audits (Phase 3E).`,
        timestamp: new Date().toISOString(),
        referencedComplaintIds: [],
        suggestedPrompts: [
          'What are today\'s highest-priority complaints?',
          'Where are the emerging hotspots?',
          'Which resolved cases need verification?',
          'Give me a briefing for the municipal commissioner',
        ],
      };
    }

    // 2. Sanitize complaints to guard against malformed data
    const safeComplaints = complaints.map((c) => GroundingSecurityGuard.sanitizeComplaintForTelemetry(c));

    const intent = this.detectIntent(cleanQuery);
    let grounded: GroundedCopilotResponse;

    switch (intent) {
      case 'PRIORITY_ATTENTION':
        grounded = this.handlePriorityQuery(cleanQuery, safeComplaints);
        break;
      case 'HOTSPOTS_ANOMALIES':
        grounded = this.handleHotspotsQuery(cleanQuery, safeComplaints);
        break;
      case 'SPECIFIC_COMPLAINT':
        grounded = this.handleSpecificComplaintQuery(cleanQuery, safeComplaints);
        break;
      case 'INCIDENTS_CLUSTERS':
        grounded = this.handleIncidentsQuery(cleanQuery, safeComplaints);
        break;
      case 'RESOLUTION_AUDITS':
        grounded = this.handleResolutionAuditsQuery(cleanQuery, safeComplaints);
        break;
      case 'CATEGORY_DEPARTMENT':
        grounded = this.handleDepartmentQuery(cleanQuery, safeComplaints);
        break;
      case 'COMMISSIONER_BRIEFING':
        grounded = await this.handleCommissionerBriefingQuery(cleanQuery, safeComplaints, securityContext);
        break;
      case 'SLA_OVERDUE':
        grounded = this.handleSlaOverdueQuery(cleanQuery, safeComplaints);
        break;
      case 'UNKNOWN':
      default:
        grounded = this.handleGeneralOrFallbackQuery(cleanQuery, safeComplaints);
        break;
    }

    // 3. Mask any sensitive PII in the generated response
    const safeContent = GroundingSecurityGuard.maskPII(grounded.content);

    return {
      id: `MSG-${Date.now()}`,
      sender: 'assistant',
      content: safeContent,
      timestamp: new Date().toISOString(),
      referencedComplaintIds: grounded.referencedComplaintIds,
      suggestedPrompts: grounded.suggestedPrompts,
    };
  }

  // --------------------------------------------------------------------------
  // Intent Handlers (All grounded on deterministic 3A-3E engines)
  // --------------------------------------------------------------------------

  private static handlePriorityQuery(query: string, complaints: Complaint[]): GroundedCopilotResponse {
    const active = complaints.filter(
      (c) => c.status !== 'closed' && c.status !== 'rejected' && c.status !== 'verified'
    );

    if (active.length === 0) {
      return {
        intent: 'PRIORITY_ATTENTION',
        content: `### 🚨 Priority Attention Briefing\n\nBased on current civic intelligence signals, there are **0 active unresolved complaints** in the queue. All reported issues have reached verified or closed status.`,
        referencedComplaintIds: [],
        suggestedPrompts: [
          'Where are the emerging hotspots?',
          'Which resolved cases need verification?',
          'Give me a briefing for the municipal commissioner',
        ],
      };
    }

    // Evaluate Phase 3B Priority on all complaints
    const scoredList = PriorityEngine.sortComplaintsByPriority(active);
    const topCases = scoredList.slice(0, 4);
    const criticalCases = scoredList.filter((s) => s.priorityAnalysis.score >= 60.0);

    const referencedIds = topCases.map((t) => t.complaint.id);

    let content = `### 🚨 Critical Dispatch & Priority Briefing\n\n`;
    content += `Based on current civic intelligence signals evaluated across **${active.length} active complaints**, there ${
      criticalCases.length === 1 ? 'is' : 'are'
    } **${criticalCases.length} high-priority case${criticalCases.length !== 1 ? 's' : ''}** requiring municipal attention:\n\n`;

    topCases.forEach((item, idx) => {
      const c = item.complaint;
      const pa = item.priorityAnalysis;
      const drivers = pa.topDrivers.join(' · ');
      const overdueNotice = c.sla.isOverdue ? ' **[SLA Overdue]**' : '';

      content += `${idx + 1}. **#${c.id}** — *${c.title}*\n`;
      content += `   • **Priority Score:** \`${pa.scoreDisplay}\` (${pa.levelLabel})${overdueNotice}\n`;
      content += `   • **Category / Location:** ${c.categoryLabel} — ${c.location.address || c.location.ward || 'Registered location'}\n`;
      content += `   • **Primary Drivers:** ${drivers || 'Routine civic report'}\n`;
      content += `   • **Officer Directive:** ${
        pa.signalBreakdown.publicSafety >= 80
          ? 'Emergency containment recommended due to high public safety risk.'
          : c.sla.isOverdue
          ? 'Priority escalation recommended due to exceeded statutory SLA.'
          : 'Standard field crew deployment recommended.'
      }\n\n`;
    });

    content += `*Note: All priority scores are computed deterministically by the Phase 3B Smart Priority Engine using 5 weighted civic signals (Severity 30%, Safety 25%, Related Clusters 20%, Age 15%, Category 10%).*`;

    return {
      intent: 'PRIORITY_ATTENTION',
      content,
      referencedComplaintIds: referencedIds,
      suggestedPrompts: [
        `Why is complaint #${topCases[0]?.complaint.id} high priority?`,
        'Where are the emerging hotspots?',
        'Which complaints may belong to the same incident?',
        'Give me a briefing for the municipal commissioner',
      ],
    };
  }

  private static handleHotspotsQuery(query: string, complaints: Complaint[]): GroundedCopilotResponse {
    const hotspots = EmergingProblemEngine.detectHotspots(complaints, {
      clusterRadiusMeters: 500,
      minimumClusterSize: 2,
    }).filter((h) => h.classification !== 'normal');

    if (hotspots.length === 0) {
      return {
        intent: 'HOTSPOTS_ANOMALIES',
        content: `### 🌋 Spatio-Temporal Hotspot Telemetry\n\nBased on the Phase 3C 500m Hotspot Engine, **no localized activity surges** are currently detected across the **${complaints.length} municipal reports**.\n\nAll localized complaint volumes are within normal baseline thresholds (< 2.0× surge ratio).`,
        referencedComplaintIds: [],
        suggestedPrompts: [
          'What are today\'s highest-priority complaints?',
          'Which complaints may belong to the same incident?',
          'Give me a briefing for the municipal commissioner',
        ],
      };
    }

    const referencedIds: string[] = [];
    let content = `### 🌋 Emerging Spatio-Temporal Anomaly Alerts\n\n`;
    content += `The Phase 3C Hotspots Engine detected **${hotspots.length} localized 500m activity surge${
      hotspots.length !== 1 ? 's' : ''
    }**:\n\n`;

    hotspots.slice(0, 3).forEach((h, idx) => {
      referencedIds.push(...h.complaintIds);
      content += `${idx + 1}. **${h.categoryLabel} Surge (${h.levelLabel})**\n`;
      content += `   • **Emerging Score:** \`${h.scoreDisplay}\` (Spike Ratio: **${h.increaseRatio.toFixed(1)}×** baseline)\n`;
      content += `   • **Volume in 500m:** **${h.currentWindowCount}** reports in last 24h (${h.complaintCount} total in zone)\n`;
      content += `   • **Center Coordinates:** \`${h.centerLatitude.toFixed(4)}, ${h.centerLongitude.toFixed(4)}\`\n`;
      content += `   • **Associated Complaint IDs:** ${h.complaintIds.map((id) => `#${id}`).join(', ')}\n`;
      content += `   • **Officer Action:** ${
        h.increaseRatio >= 2.0
          ? `Deploy preventive inspection squad to check for systemic ${h.categoryLabel.toLowerCase()} infrastructure failure.`
          : 'Monitor localized complaint activity over next 12 hours.'
      }\n\n`;
    });

    return {
      intent: 'HOTSPOTS_ANOMALIES',
      content,
      referencedComplaintIds: referencedIds.slice(0, 6),
      suggestedPrompts: [
        'Which complaints may belong to the same incident?',
        'What are today\'s highest-priority complaints?',
        'Give me a briefing for the municipal commissioner',
      ],
    };
  }

  private static handleSpecificComplaintQuery(query: string, complaints: Complaint[]): GroundedCopilotResponse {
    // Extract ID token from query (e.g. #comp-101, #123, comp-101, 101)
    const match = query.match(/#?([a-zA-Z0-9_-]+)/g);
    let targetComplaint: Complaint | undefined;

    if (match) {
      for (const token of match) {
        const clean = token.replace('#', '').trim();
        const found = complaints.find(
          (c) =>
            c.id.toLowerCase() === clean.toLowerCase() ||
            c.dbId?.toString() === clean ||
            c.id.toLowerCase().endsWith(clean.toLowerCase())
        );
        if (found) {
          targetComplaint = found;
          break;
        }
      }
    }

    if (!targetComplaint) {
      return {
        intent: 'SPECIFIC_COMPLAINT',
        content: `### 🔍 Complaint Dossier Lookup\n\nI don't have enough current data to determine that.\n\nI don't have access to that complaint or it does not exist in your authorized records. Please verify the complaint ID.`,
        referencedComplaintIds: [],
        suggestedPrompts: [
          'What are today\'s highest-priority complaints?',
          'Where are the emerging hotspots?',
          'Give me a briefing for the municipal commissioner',
        ],
      };
    }

    const c = targetComplaint;
    const pa: CivicPriorityAnalysis = PriorityEngine.evaluateComplaintPriority(c, complaints);
    const related = SimilarityEngine.findRelatedComplaints(c, complaints);
    const resolution = ResolutionVerificationEngine.evaluateComplaintResolution(c);

    let content = `### 📋 Grounded Intelligence Dossier: #${c.id}\n\n`;
    content += `**Title:** ${c.title}\n`;
    content += `**Category:** ${c.categoryLabel} · **Status:** \`${c.status.toUpperCase()}\`\n`;
    content += `**Location:** ${c.location.address || 'Registered Location'} (${c.location.ward || 'Ward unassigned'})\n\n`;

    content += `#### 🎯 Phase 3B Priority Analysis: \`${pa.scoreDisplay}\` (${pa.levelLabel})\n`;
    content += `- **Severity Signal (30%):** ${pa.signalBreakdown.severity}/100 (Tier: ${c.priority})\n`;
    content += `- **Public Safety Impact (25%):** ${pa.signalBreakdown.publicSafety}/100\n`;
    content += `- **Related Complaints (20%):** ${pa.signalBreakdown.relatedComplaints}/100 (${related.length} nearby duplicates/related)\n`;
    content += `- **Age / SLA Escalation (15%):** ${pa.signalBreakdown.ageEscalation}/100 (${c.sla.isOverdue ? 'Overdue' : `${c.sla.hoursRemaining}h remaining`})\n`;
    content += `- **Category Baseline (10%):** ${pa.signalBreakdown.categoryBaseline}/100\n\n`;

    content += `#### 🔍 Evidence & Related Signals\n`;
    if (related.length > 0) {
      content += `- **Related Reports (${related.length}):** ${related.map((r) => `#${r.candidateId} (${r.shortLabel})`).join(', ')}\n`;
    } else {
      content += `- **Related Reports:** No duplicate or nearby reports found within 200m.\n`;
    }

    if (c.status === 'resolved' || c.status === 'resolution_submitted' || (c.evidence?.after && c.evidence.after.length > 0)) {
      content += `- **Phase 3E Resolution Audit:** Score \`${resolution.scoreDisplay}\` (${resolution.levelLabel}). Human verification required: **${resolution.needsHumanVerification ? 'YES' : 'NO'}**.\n`;
    }

    content += `\n**Officer Directive:** ${
      pa.score >= 80
        ? 'High-priority dispatch: Assign designated engineering unit immediately.'
        : pa.score >= 60
        ? 'Standard operational queue: Scheduled for remediation within SLA window.'
        : 'Routine civic maintenance: Assigned to zonal field team.'
    }`;

    return {
      intent: 'SPECIFIC_COMPLAINT',
      content,
      referencedComplaintIds: [c.id, ...related.map((r) => r.candidateId)].slice(0, 5),
      suggestedPrompts: [
        'What are today\'s highest-priority complaints?',
        'Which complaints may belong to the same incident?',
        'Where are the emerging hotspots?',
      ],
    };
  }

  private static handleIncidentsQuery(query: string, complaints: Complaint[]): GroundedCopilotResponse {
    const incidents = IncidentGroupingEngine.groupComplaintsIntoIncidents(complaints, {
      groupingRadiusMeters: 500,
      minimumClusterSize: 2,
    });

    if (incidents.length === 0) {
      return {
        intent: 'INCIDENTS_CLUSTERS',
        content: `### 🔗 Common Incident & Cluster Analysis\n\nBased on the Phase 3D Incident Grouping Engine, **0 multi-report incidents** were formed across the **${complaints.length} complaints**.\n\nCurrent grievances represent isolated individual issues without spatial-temporal overlap requiring combined work orders.`,
        referencedComplaintIds: [],
        suggestedPrompts: [
          'What are today\'s highest-priority complaints?',
          'Where are the emerging hotspots?',
          'Which resolved cases need verification?',
        ],
      };
    }

    const referencedIds: string[] = [];
    let content = `### 🔗 Potential Common Incident Groupings\n\n`;
    content += `The Phase 3D Engine identified **${incidents.length} potential shared infrastructure incident${
      incidents.length !== 1 ? 's' : ''
    }** for work order consolidation:\n\n`;

    incidents.slice(0, 3).forEach((inc, idx) => {
      referencedIds.push(...inc.memberComplaintIds);
      content += `${idx + 1}. **${inc.incidentLabel}**\n`;
      content += `   • **Confidence Score:** \`${inc.confidenceDisplay}\` (${inc.levelLabel})\n`;
      content += `   • **Reports Grouped:** **${inc.complaintCount}** citizen reports\n`;
      content += `   • **Spatial Spread:** ~${Math.round(inc.affectedRadiusMeters)}m radius · **Time Span:** ${Math.round(inc.timeSpanHours)} hours\n`;
      content += `   • **Member IDs:** ${inc.memberComplaintIds.map((id) => `#${id}`).join(', ')}\n`;
      content += `   • **Recommended Directive:** Consolidate into a single municipal work order to avoid sending redundant contractor crews.\n\n`;
    });

    return {
      intent: 'INCIDENTS_CLUSTERS',
      content,
      referencedComplaintIds: referencedIds.slice(0, 6),
      suggestedPrompts: [
        'What are today\'s highest-priority complaints?',
        'Where are the emerging hotspots?',
        'Give me a briefing for the municipal commissioner',
      ],
    };
  }

  private static handleResolutionAuditsQuery(query: string, complaints: Complaint[]): GroundedCopilotResponse {
    const auditEligible = complaints.filter(
      (c) =>
        c.status === 'resolution_submitted' ||
        c.status === 'resolved' ||
        c.status === 'verified' ||
        (c.evidence?.after && c.evidence.after.length > 0) ||
        (c.citizenFeedback && c.citizenFeedback.rating !== undefined)
    );

    if (auditEligible.length === 0) {
      return {
        intent: 'RESOLUTION_AUDITS',
        content: `### 📸 Resolution Verification Telemetry\n\nBased on the Phase 3E Engine, there are currently **0 resolved or submitted cases** awaiting photographic or feedback audit.\n\nAll grievances are either currently in progress or have not yet submitted resolution proof.`,
        referencedComplaintIds: [],
        suggestedPrompts: [
          'What are today\'s highest-priority complaints?',
          'Where are the emerging hotspots?',
          'Give me a briefing for the municipal commissioner',
        ],
      };
    }

    const audited = auditEligible.map((c) => ({
      complaint: c,
      audit: ResolutionVerificationEngine.evaluateComplaintResolution(c),
    }));

    const needingReview = audited.filter((a) => a.audit.needsHumanVerification);
    const referencedIds = (needingReview.length > 0 ? needingReview : audited)
      .slice(0, 3)
      .map((a) => a.complaint.id);

    let content = `### 📸 Resolution Verification & Audit Telemetry\n\n`;
    content += `The Phase 3E Engine evaluated **${audited.length} resolved/submitted case${audited.length !== 1 ? 's' : ''}**. **${needingReview.length} case${needingReview.length !== 1 ? 's' : ''}** require officer review prior to sign-off:\n\n`;

    (needingReview.length > 0 ? needingReview : audited).slice(0, 3).forEach((item, idx) => {
      const c = item.complaint;
      const res = item.audit;

      content += `${idx + 1}. **#${c.id}** — *${c.title}*\n`;
      content += `   • **Verification Score:** \`${res.scoreDisplay}\` (${res.levelLabel})\n`;
      content += `   • **Visual Proof:** ${res.hasAfterEvidence ? 'After-photo attached' : '❌ Missing after-repair photo'}\n`;
      content += `   • **Citizen Feedback:** ${
        res.citizenRating
          ? `${res.citizenRating}/5 Stars (${res.feedbackSentiment} sentiment)`
          : 'No rating submitted'
      }\n`;
      if (res.citizenFeedbackText) {
        content += `   • **Citizen Comment:** *"${res.citizenFeedbackText}"*\n`;
      }
      content += `   • **Audit Directive:** ${
        res.feedbackSentiment === 'negative'
          ? 'Citizen dissatisfaction flagged: Require contractor re-inspection.'
          : !res.hasAfterEvidence
          ? 'Request after-repair photograph before approving formal closure.'
          : 'Verified: Ready for statutory administrative sign-off.'
      }\n\n`;
    });

    return {
      intent: 'RESOLUTION_AUDITS',
      content,
      referencedComplaintIds: referencedIds,
      suggestedPrompts: [
        'What are today\'s highest-priority complaints?',
        'Where are the emerging hotspots?',
        'Give me a briefing for the municipal commissioner',
      ],
    };
  }

  private static handleDepartmentQuery(query: string, complaints: Complaint[]): GroundedCopilotResponse {
    const q = query.toLowerCase();
    let categoryKey = '';
    let categoryTitle = 'Departmental';

    if (q.includes('road') || q.includes('pavement')) {
      categoryKey = 'roads';
      categoryTitle = 'Roads & Pavements';
    } else if (q.includes('water') || q.includes('drain') || q.includes('sewage')) {
      categoryKey = 'water_sewage';
      categoryTitle = 'Water Supply & Drainage';
    } else if (q.includes('waste') || q.includes('garbage') || q.includes('sanitation')) {
      categoryKey = 'waste_management';
      categoryTitle = 'Solid Waste Management';
    } else if (q.includes('electric') || q.includes('light')) {
      categoryKey = 'electricity';
      categoryTitle = 'Electrical Infrastructure';
    }

    const deptComplaints = categoryKey
      ? complaints.filter((c) => c.category === categoryKey || (c.categoryLabel && c.categoryLabel.toLowerCase().includes(categoryKey)))
      : complaints;

    if (deptComplaints.length === 0) {
      return {
        intent: 'CATEGORY_DEPARTMENT',
        content: `### 🏢 ${categoryTitle} Operational Status\n\nI don't have enough current data to determine that.\n\nThere are **0 complaints** on record for ${categoryTitle}. All operational parameters are currently clear.`,
        referencedComplaintIds: [],
        suggestedPrompts: [
          'What are today\'s highest-priority complaints?',
          'Where are the emerging hotspots?',
          'Give me a briefing for the municipal commissioner',
        ],
      };
    }

    const active = deptComplaints.filter((c) => c.status !== 'closed' && c.status !== 'rejected');
    const overdue = active.filter((c) => c.sla.isOverdue);
    const sorted = PriorityEngine.sortComplaintsByPriority(active);

    const referencedIds = sorted.slice(0, 3).map((s) => s.complaint.id);

    let content = `### 🏢 ${categoryTitle} Operational Briefing\n\n`;
    content += `Operational overview across **${deptComplaints.length} total reports** in ${categoryTitle}:\n\n`;
    content += `- **Active Workload:** **${active.length}** open cases (${overdue.length} overdue)\n`;
    content += `- **Top Priority Case:** #${sorted[0]?.complaint.id} (*${sorted[0]?.complaint.title}*) — Score: \`${sorted[0]?.priorityAnalysis.scoreDisplay}\`\n`;
    if (overdue.length > 0) {
      content += `- **Overdue Escalations (${overdue.length}):** ${overdue.map((o) => `#${o.id}`).join(', ')}\n`;
    }

    content += `\n**Recommended Departmental Action:** Focus field squads on #${sorted[0]?.complaint.id} to avoid further SLA escalation.`;

    return {
      intent: 'CATEGORY_DEPARTMENT',
      content,
      referencedComplaintIds: referencedIds,
      suggestedPrompts: [
        `Why is complaint #${sorted[0]?.complaint.id} high priority?`,
        'Where are the emerging hotspots?',
        'Give me a briefing for the municipal commissioner',
      ],
    };
  }

  /**
   * Generates a comprehensive, 6-section Grounded Municipal / Commissioner Briefing.
   * Leverages Gemini 1.5 Flash when available with strict grounding context, or falls back to
   * the deterministic 3A-3E intelligence engines. Zero hallucinated statistics.
   */
  public static async generateMunicipalBriefing(
    complaints: Complaint[],
    securityContext?: CopilotSecurityContext
  ): Promise<GroundedMunicipalBriefing> {
    // 1. Authorization guard
    if (securityContext?.role === 'citizen') {
      return {
        id: `BRIEF-AUTH-${Date.now()}`,
        timestamp: new Date().toISOString(),
        datasetSize: 0,
        isAiGenerated: false,
        modelName: 'Access Restricted',
        summary: 'Citizen accounts cannot access city-wide executive municipal briefings.',
        markdownContent: `### 🏛️ Municipal AI Copilot\n\n**Access Restricted:** Executive municipal briefings are reserved for municipal administrators and departmental supervisors. Please query your submitted personal grievances or ward status.`,
        referencedComplaintIds: [],
        metrics: {
          totalComplaints: 0,
          activeComplaints: 0,
          resolvedComplaints: 0,
          overdueComplaints: 0,
          criticalPriorityCount: 0,
          highPriorityCount: 0,
          emergingHotspotsCount: 0,
          potentialIncidentsCount: 0,
          pendingVerificationCount: 0,
          departmentDistribution: {},
        },
        topDirectives: [],
      };
    }

    if (!complaints || complaints.length === 0) {
      return {
        id: `BRIEF-EMPTY-${Date.now()}`,
        timestamp: new Date().toISOString(),
        datasetSize: 0,
        isAiGenerated: false,
        modelName: 'Deterministic 3A-3E Engine',
        summary: 'No active or historical complaint records available in the authorized dataset.',
        markdownContent: `### 🏛️ Municipal Commissioner Executive Operational Briefing\n\n**Telemetry Timestamp:** ${new Date().toLocaleTimeString()} | **Dataset:** 0 Records\n\n#### 1. Overall Workload & Status Distribution\n- There are currently **0 complaints** on record in the accessible command queue.\n\n*All municipal intelligence engines require active complaint records to synthesize operational briefings.*`,
        referencedComplaintIds: [],
        metrics: {
          totalComplaints: 0,
          activeComplaints: 0,
          resolvedComplaints: 0,
          overdueComplaints: 0,
          criticalPriorityCount: 0,
          highPriorityCount: 0,
          emergingHotspotsCount: 0,
          potentialIncidentsCount: 0,
          pendingVerificationCount: 0,
          departmentDistribution: {},
        },
        topDirectives: ['Await citizen complaint telemetry intake.'],
      };
    }

    // 2. Deterministic Metric Computations across 3A–3E
    const safeComplaints = complaints.map((c) => GroundingSecurityGuard.sanitizeComplaintForTelemetry(c));
    const active = safeComplaints.filter(
      (c) => c.status !== 'closed' && c.status !== 'rejected' && c.status !== 'verified'
    );
    const resolved = safeComplaints.filter((c) => c.status === 'verified' || c.status === 'closed');
    const overdue = safeComplaints.filter((c) => c.sla.isOverdue);

    // Department Distribution
    const departmentDistribution: { [key: string]: number } = {};
    safeComplaints.forEach((c) => {
      const dept = c.categoryLabel || c.category || 'General';
      departmentDistribution[dept] = (departmentDistribution[dept] || 0) + 1;
    });

    // 3B Priority Analysis
    const scoredList = PriorityEngine.sortComplaintsByPriority(active);
    const topCriticalCases = scoredList.filter((s) => s.priorityAnalysis.score >= 60 || s.complaint.priority === 'urgent');
    const highPriorityCases = scoredList.filter((s) => s.priorityAnalysis.score >= 40 && s.priorityAnalysis.score < 60);

    // 3C Emerging Hotspots
    const detectedHotspots = EmergingProblemEngine.detectHotspots(safeComplaints, {
      clusterRadiusMeters: 500,
      minimumClusterSize: 2,
    }).filter((h) => h.classification !== 'normal');

    // 3D Potential Incidents
    const detectedIncidents = IncidentGroupingEngine.groupComplaintsIntoIncidents(safeComplaints).filter(
      (inc: PotentialIncidentResult) => inc.classification !== 'noIncidentGroup'
    );

    // 3E Resolution Audits
    const auditCases = safeComplaints
      .filter((c) => c.status === 'resolution_submitted' || c.status === 'resolved' || c.status === 'verified')
      .map((c) => ({
        complaint: c,
        audit: ResolutionVerificationEngine.evaluateComplaintResolution(c),
      }));
    const pendingVerification = auditCases.filter((a) => a.audit.needsHumanVerification);

    const metrics: MunicipalBriefingMetrics = {
      totalComplaints: safeComplaints.length,
      activeComplaints: active.length,
      resolvedComplaints: resolved.length,
      overdueComplaints: overdue.length,
      criticalPriorityCount: topCriticalCases.length,
      highPriorityCount: highPriorityCases.length,
      emergingHotspotsCount: detectedHotspots.length,
      potentialIncidentsCount: detectedIncidents.length,
      pendingVerificationCount: pendingVerification.length,
      departmentDistribution,
    };

    const referencedIds = [
      ...topCriticalCases.slice(0, 4).map((c) => c.complaint.id),
      ...overdue.slice(0, 2).map((c) => c.id),
      ...detectedIncidents.slice(0, 2).flatMap((inc) => inc.memberComplaintIds.slice(0, 2)),
    ];
    const uniqueReferencedIds = Array.from(new Set(referencedIds));

    // 3. Try Gemini API invocation if API key is present
    let geminiResponseText: string | null = null;
    const apiKey =
      (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GEMINI_API_KEY) ||
      (typeof process !== 'undefined' && process.env && (process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY));

    if (apiKey && apiKey !== 'undefined' && apiKey.length > 5) {
      try {
        const payload = {
          telemetryTimestamp: new Date().toISOString(),
          metrics,
          topCriticalCases: topCriticalCases.slice(0, 5).map((s) => ({
            id: s.complaint.id,
            title: s.complaint.title,
            category: s.complaint.categoryLabel,
            score: s.priorityAnalysis.scoreDisplay,
            drivers: s.priorityAnalysis.topDrivers,
            address: s.complaint.location.address,
            isOverdue: s.complaint.sla.isOverdue,
          })),
          overdueComplaints: overdue.slice(0, 4).map((c) => ({
            id: c.id,
            title: c.title,
            category: c.categoryLabel,
            status: c.status,
          })),
          emergingHotspots: detectedHotspots.slice(0, 3).map((h) => ({
            id: h.id,
            category: h.categoryLabel,
            score: h.scoreDisplay,
            surgeMultiplier: `${h.increaseRatio.toFixed(1)}x`,
            countIn24h: h.currentWindowCount,
            totalInZone: h.complaintCount,
            centerLat: h.centerLatitude,
            centerLng: h.centerLongitude,
            reasons: h.explainableReasons,
          })),
          potentialIncidents: detectedIncidents.slice(0, 3).map((inc) => ({
            id: inc.incidentId,
            title: inc.incidentLabel,
            category: inc.primaryCategoryLabel,
            confidence: inc.confidenceDisplay,
            complaintCount: inc.complaintCount,
          })),
          resolutionQuality: {
            auditedTotal: auditCases.length,
            flaggedNeedsReview: pendingVerification.length,
          },
        };

        const systemPrompt = `You are the CivicResolve Grounded Municipal AI Copilot generating an authoritative executive briefing for municipal commissioners and department directors.
STRICT GROUNDING RULES:
1. You MUST strictly use the provided JSON telemetry payload.
2. NEVER invent, fabricate, extrapolate, or hallucinate numeric figures, counts, percentages, locations, or statuses. Every number in your briefing MUST originate from the payload.
3. Structure your response into EXACTLY these 6 numbered sections:
   1. Overall Workload & Status Distribution
   2. High-Priority Unresolved Incidents
   3. SLA Health & Overdue Escalations
   4. 3C Emerging Spatio-Temporal Hotspots
   5. 3D Potential Incident Clusters (Common Root Causes)
   6. Recommended Operational Focus Areas (clearly labeled as AI decision-support advice)
4. For 3D grouped clusters, ALWAYS use "potential incident" terminology.
5. NEVER disclose citizen PII (no private phone numbers, Aadhaar, citizen personal identities).
6. Be crisp, executive-ready, and highly structured with Markdown headings and bullet points.`;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [
                    { text: `${systemPrompt}\n\nGROUNDED TELEMETRY PAYLOAD:\n${JSON.stringify(payload, null, 2)}` },
                  ],
                },
              ],
              generationConfig: {
                temperature: 0.1,
                topK: 20,
                maxOutputTokens: 1500,
              },
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          const generatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (generatedText && generatedText.trim().length > 100) {
            geminiResponseText = GroundingSecurityGuard.maskPII(generatedText);
          }
        }
      } catch (geminiErr) {
        console.warn('⚠️ Gemini API invocation unavailable, falling back to deterministic 3A-3E generator:', geminiErr);
      }
    }

    if (geminiResponseText) {
      return {
        id: `BRIEF-AI-${Date.now()}`,
        timestamp: new Date().toISOString(),
        datasetSize: safeComplaints.length,
        isAiGenerated: true,
        modelName: 'Gemini 1.5 Flash',
        summary: `Executive Municipal Briefing synthesized via Google Gemini 1.5 Flash (Grounded on ${safeComplaints.length} records, ${active.length} active).`,
        markdownContent: geminiResponseText,
        referencedComplaintIds: uniqueReferencedIds,
        metrics,
        topDirectives: [
          topCriticalCases[0] ? `Dispatch field crew to #${topCriticalCases[0].complaint.id} (${topCriticalCases[0].complaint.categoryLabel})` : 'Monitor active queues',
          detectedHotspots[0] ? `Contain ${detectedHotspots[0].categoryLabel} activity surge (${detectedHotspots[0].increaseRatio.toFixed(1)}× spike)` : 'No active hotspots',
          detectedIncidents[0] ? `Issue Joint Action for ${detectedIncidents[0].incidentId} (${detectedIncidents[0].complaintCount} reports)` : 'No common incidents',
        ],
      };
    }

    // 4. Deterministic Fallback Generator
    const deterministicMarkdown = this.generateDeterministicBriefing(
      safeComplaints,
      metrics,
      topCriticalCases,
      overdue,
      detectedHotspots,
      detectedIncidents,
      pendingVerification
    );

    return {
      id: `BRIEF-DET-${Date.now()}`,
      timestamp: new Date().toISOString(),
      datasetSize: safeComplaints.length,
      isAiGenerated: false,
      modelName: 'Deterministic 3A-3E Engine',
      summary: `Authoritative Municipal Briefing generated via Deterministic 3A–3E Intelligence Engines (${safeComplaints.length} records, ${active.length} active).`,
      markdownContent: deterministicMarkdown,
      referencedComplaintIds: uniqueReferencedIds,
      metrics,
      topDirectives: [
        topCriticalCases[0] ? `Dispatch field crew to #${topCriticalCases[0].complaint.id} (${topCriticalCases[0].complaint.categoryLabel})` : 'Monitor active queues',
        detectedHotspots[0] ? `Contain ${detectedHotspots[0].categoryLabel} activity surge (${detectedHotspots[0].increaseRatio.toFixed(1)}× spike)` : 'No active hotspots',
        detectedIncidents[0] ? `Issue Joint Action for ${detectedIncidents[0].incidentId} (${detectedIncidents[0].complaintCount} reports)` : 'No common incidents',
      ],
    };
  }

  /**
   * Generates a fully structured, deterministic municipal briefing when LLM is offline or unavailable.
   */
  private static generateDeterministicBriefing(
    complaints: Complaint[],
    metrics: MunicipalBriefingMetrics,
    topCriticalCases: Array<{ complaint: Complaint; priorityAnalysis: CivicPriorityAnalysis }>,
    overdue: Complaint[],
    detectedHotspots: EmergingHotspotResult[],
    detectedIncidents: PotentialIncidentResult[],
    pendingVerification: Array<{ complaint: Complaint; audit: ResolutionVerificationResult }>
  ): string {
    let md = `### 🏛️ Municipal Commissioner Executive Operational Briefing\n\n`;
    md += `> **Telemetry Timestamp:** ${new Date().toLocaleTimeString()} | **Dataset:** ${metrics.totalComplaints} Verified Records | **Intelligence:** Deterministic 3A–3E Core\n\n`;

    // 1. Overall Workload
    md += `#### 1. Overall Workload & Status Distribution\n`;
    md += `- **Total Ingested Grievances:** **${metrics.totalComplaints}**\n`;
    md += `- **Active Operational Workload:** **${metrics.activeComplaints}** unresolved cases (${Math.round((metrics.activeComplaints / (metrics.totalComplaints || 1)) * 100)}% of total)\n`;
    md += `- **Resolved / Verified Closed:** **${metrics.resolvedComplaints}** cases\n`;
    md += `- **Department Breakdown:**\n`;
    Object.entries(metrics.departmentDistribution).forEach(([dept, count]) => {
      md += `  • **${dept}:** ${count} report${count !== 1 ? 's' : ''}\n`;
    });
    md += `\n`;

    // 2. High-Priority Unresolved Incidents
    md += `#### 2. High-Priority Unresolved Incidents\n`;
    if (topCriticalCases.length === 0) {
      md += `- **Zero critical emergency escalations** currently pending. All active items are within standard priority bounds.\n\n`;
    } else {
      md += `Evaluated via Phase 3B Smart Priority Engine (Severity 30%, Safety 25%, Clusters 20%, Age 15%, Category 10%):\n\n`;
      topCriticalCases.slice(0, 3).forEach((item, idx) => {
        const c = item.complaint;
        const pa = item.priorityAnalysis;
        const overdueNotice = c.sla.isOverdue ? ' **[SLA Overdue]**' : '';
        md += `${idx + 1}. **#${c.id}** — *${c.title}*\n`;
        md += `   • **Priority Score:** \`${pa.scoreDisplay}\` (${pa.levelLabel})${overdueNotice}\n`;
        md += `   • **Category / Area:** ${c.categoryLabel} — ${c.location.address || c.location.ward || 'Registered area'}\n`;
        md += `   • **Primary Drivers:** ${pa.topDrivers.join(' · ') || 'Routine report'}\n`;
        md += `   • **Officer Directive:** ${
          pa.signalBreakdown.publicSafety >= 80
            ? 'Emergency containment recommended due to high public safety risk.'
            : c.sla.isOverdue
            ? 'Priority escalation recommended due to breached SLA.'
            : 'Standard field crew deployment.'
        }\n\n`;
      });
    }

    // 3. SLA Health & Overdue Escalations
    md += `#### 3. SLA Health & Overdue Escalations\n`;
    if (metrics.overdueComplaints === 0) {
      md += `- **100% SLA Compliance:** **0 complaints are overdue**. All active workflows are progressing within their statutory resolution windows.\n\n`;
    } else {
      md += `- **${metrics.overdueComplaints} case${metrics.overdueComplaints !== 1 ? 's' : ''} currently overdue** exceeding statutory citizen timelines:\n`;
      overdue.slice(0, 3).forEach((o) => {
        md += `  • **#${o.id}** (*${o.title}*) — ${o.categoryLabel} · Status: \`${o.status.toUpperCase()}\`\n`;
      });
      md += `\n`;
    }

    // 4. 3C Emerging Spatio-Temporal Hotspots
    md += `#### 4. 3C Emerging Spatio-Temporal Hotspots\n`;
    if (detectedHotspots.length === 0) {
      md += `- **No localized activity surges detected** across ~500m municipal grids (< 1.5× baseline volume).\n\n`;
    } else {
      md += `Identified **${detectedHotspots.length} localized 500m surge zone${detectedHotspots.length !== 1 ? 's' : ''}**:\n\n`;
      detectedHotspots.slice(0, 2).forEach((h, idx) => {
        md += `${idx + 1}. **${h.categoryLabel} Hotspot (${h.levelLabel})**\n`;
        md += `   • **Emerging Score:** \`${h.scoreDisplay}\` (**${h.increaseRatio.toFixed(1)}× volume spike** vs baseline)\n`;
        md += `   • **24h Intake:** **${h.currentWindowCount}** reports in last 24 hours (${h.complaintCount} total in ~500m zone)\n`;
        md += `   • **Centroid GPS:** \`${h.centerLatitude.toFixed(4)}, ${h.centerLongitude.toFixed(4)}\`\n`;
        md += `   • **Evidence Drivers:** ${h.explainableReasons.slice(0, 2).join('; ')}\n\n`;
      });
    }

    // 5. 3D Potential Incident Clusters
    md += `#### 5. 3D Potential Incident Clusters (Common Root Causes)\n`;
    if (detectedIncidents.length === 0) {
      md += `- **No multi-complaint systemic clusters identified**. Citizen submissions represent isolated occurrences.\n\n`;
    } else {
      md += `Grouped **${detectedIncidents.length} potential incident work package${detectedIncidents.length !== 1 ? 's' : ''}** for consolidated dispatch:\n\n`;
      detectedIncidents.slice(0, 2).forEach((inc, idx) => {
        md += `${idx + 1}. **⚡ ${inc.incidentId} — ${inc.incidentLabel}**\n`;
        md += `   • **Incident Confidence:** \`${inc.confidenceDisplay}\` (${inc.levelLabel})\n`;
        md += `   • **Connected Grievances:** **${inc.complaintCount} citizen reports**\n`;
        md += `   • **Category / Spread:** ${inc.primaryCategoryLabel} (~${Math.round(inc.affectedRadiusMeters)}m radius)\n\n`;
      });
    }

    // 6. Recommended Operational Focus Areas
    md += `#### 6. Recommended Operational Focus Areas *(AI Decision Support)*\n`;
    if (topCriticalCases[0]) {
      md += `• **Priority Dispatch:** Direct field squads to **#${topCriticalCases[0].complaint.id}** (${topCriticalCases[0].complaint.title}) due to ${topCriticalCases[0].priorityAnalysis.topDrivers.join(', ')}.\n`;
    }
    if (detectedHotspots[0]) {
      md += `• **Hotspot Containment:** Deploy zonal inspection squad to ${detectedHotspots[0].categoryLabel} surge zone (\`${detectedHotspots[0].centerLatitude.toFixed(3)}, ${detectedHotspots[0].centerLongitude.toFixed(3)}\`) to identify root-cause failure.\n`;
    }
    if (detectedIncidents[0]) {
      md += `• **Coordinated Joint Action:** Consolidate **${detectedIncidents[0].incidentId}** (${detectedIncidents[0].complaintCount} reports) into a single operational work order to prevent redundant contractor labor.\n`;
    }
    if (pendingVerification.length > 0) {
      md += `• **Quality Control Audit:** Conduct photographic and feedback review on ${pendingVerification.length} completed resolution${pendingVerification.length !== 1 ? 's' : ''} flagged for audit.\n`;
    }
    if (overdue.length > 0) {
      md += `• **SLA Mitigation:** Issue supervisor alert for ${overdue.length} overdue grievance${overdue.length !== 1 ? 's' : ''}.\n`;
    }

    md += `\n---\n*Notice: This briefing is deterministically synthesized from live municipal records. All recommendations serve as decision-support guidance for authorized municipal officials.*`;

    return md;
  }

  private static async handleCommissionerBriefingQuery(
    query: string,
    complaints: Complaint[],
    securityContext?: CopilotSecurityContext
  ): Promise<GroundedCopilotResponse> {
    const briefing = await this.generateMunicipalBriefing(complaints, securityContext);

    return {
      intent: 'COMMISSIONER_BRIEFING',
      content: briefing.markdownContent,
      referencedComplaintIds: briefing.referencedComplaintIds,
      suggestedPrompts: [
        'What are today\'s highest-priority complaints?',
        'Where are the emerging hotspots?',
        'Which complaints may belong to the same incident?',
        'Which resolved cases need verification?',
      ],
    };
  }

  private static handleSlaOverdueQuery(query: string, complaints: Complaint[]): GroundedCopilotResponse {
    const overdue = complaints.filter((c) => c.sla.isOverdue);

    if (overdue.length === 0) {
      return {
        intent: 'SLA_OVERDUE',
        content: `### ⏳ SLA & Statutory Compliance Telemetry\n\nBased on live complaint timestamps, **0 complaints are currently overdue**.\n\nAll active cases are progressing within their allocated statutory resolution windows.`,
        referencedComplaintIds: [],
        suggestedPrompts: [
          'What are today\'s highest-priority complaints?',
          'Where are the emerging hotspots?',
          'Give me a briefing for the municipal commissioner',
        ],
      };
    }

    const sorted = PriorityEngine.sortComplaintsByPriority(overdue);
    const referencedIds = sorted.slice(0, 4).map((s) => s.complaint.id);

    let content = `### ⏳ SLA Breach & Escalation Report\n\n`;
    content += `There ${overdue.length === 1 ? 'is' : 'are'} currently **${overdue.length} overdue complaint${
      overdue.length !== 1 ? 's' : ''
    }** that have exceeded statutory deadlines:\n\n`;

    sorted.slice(0, 4).forEach((item, idx) => {
      const c = item.complaint;
      const pa = item.priorityAnalysis;
      content += `${idx + 1}. **#${c.id}** — *${c.title}*\n`;
      content += `   • **Priority Score:** \`${pa.scoreDisplay}\` (${pa.levelLabel})\n`;
      content += `   • **Category / Ward:** ${c.categoryLabel} · ${c.location.ward || 'Ward unassigned'}\n`;
      content += `   • **Status:** \`${c.status.toUpperCase()}\` (Breached SLA deadline)\n`;
      content += `   • **Directive:** Issue direct supervisor notice and prioritize contractor remediation.\n\n`;
    });

    return {
      intent: 'SLA_OVERDUE',
      content,
      referencedComplaintIds: referencedIds,
      suggestedPrompts: [
        `Why is complaint #${sorted[0]?.complaint.id} high priority?`,
        'Where are the emerging hotspots?',
        'Give me a briefing for the municipal commissioner',
      ],
    };
  }

  private static handleGeneralOrFallbackQuery(query: string, complaints: Complaint[]): GroundedCopilotResponse {
    const synthesis = AIInsightsService.synthesizeOperationalInsights(complaints);
    const { executiveBrief, criticalDispatch } = synthesis;

    const referencedIds = criticalDispatch.slice(0, 2).map((c) => c.complaintId);

    let content = `### 🔍 Grounded Civic Intelligence Query\n\n`;
    content += `I analyzed your query against the **${complaints.length} live municipal records**:\n\n`;
    content += `- **Active Grievances:** ${executiveBrief.totalActiveComplaints} open reports.\n`;
    content += `- **Urgent Interventions:** ${executiveBrief.criticalDispatchCount} high-priority cases.\n`;
    content += `- **Spatial Hotspots:** ${executiveBrief.activeHotspotsCount} 500m surge areas.\n\n`;
    content += `You can ask specific questions like:\n`;
    content += `- *"What are today's highest-priority complaints?"*\n`;
    content += `- *"Where are the emerging hotspots?"*\n`;
    content += `- *"Why is complaint #${complaints[0]?.id || '101'} high priority?"*\n`;
    content += `- *"Which complaints may belong to the same incident?"*\n`;
    content += `- *"Give me a briefing for the municipal commissioner"*`;

    return {
      intent: 'UNKNOWN',
      content,
      referencedComplaintIds: referencedIds,
      suggestedPrompts: [
        'What are today\'s highest-priority complaints?',
        'Where are the emerging hotspots?',
        'Which complaints may belong to the same incident?',
        'Which resolved cases need verification?',
      ],
    };
  }
}
