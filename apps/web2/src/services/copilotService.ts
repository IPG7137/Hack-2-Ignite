import { Complaint } from '../types/complaint';
import { CopilotMessage } from '../types/ai';
import { PriorityEngine, CivicPriorityAnalysis } from './priorityEngine';
import { EmergingProblemEngine, EmergingHotspotResult } from './emergingProblemEngine';
import { IncidentGroupingEngine, PotentialIncidentResult } from './incidentGroupingEngine';
import { ResolutionVerificationEngine, ResolutionVerificationResult } from './resolutionVerificationEngine';
import { SimilarityEngine } from './similarityEngine';
import { AIInsightsService } from './aiInsightsService';

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
   * and formats an evidence-grounded response.
   */
  public static async answerOfficerQuery(
    query: string,
    complaints: Complaint[]
  ): Promise<CopilotMessage> {
    if (!complaints || complaints.length === 0) {
      return {
        id: `MSG-${Date.now()}`,
        sender: 'assistant',
        content: `### 🏛️ Municipal AI Copilot Telemetry\n\nI don't have enough current data to determine that.\n\nThere are currently **0 complaint records** loaded in the operational telemetry queue. Once live reports are received via Supabase, I can evaluate priority (Phase 3B), emerging hotspots (Phase 3C), common incidents (Phase 3D), and resolution audits (Phase 3E).`,
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

    const intent = this.detectIntent(query);
    let grounded: GroundedCopilotResponse;

    switch (intent) {
      case 'PRIORITY_ATTENTION':
        grounded = this.handlePriorityQuery(query, complaints);
        break;
      case 'HOTSPOTS_ANOMALIES':
        grounded = this.handleHotspotsQuery(query, complaints);
        break;
      case 'SPECIFIC_COMPLAINT':
        grounded = this.handleSpecificComplaintQuery(query, complaints);
        break;
      case 'INCIDENTS_CLUSTERS':
        grounded = this.handleIncidentsQuery(query, complaints);
        break;
      case 'RESOLUTION_AUDITS':
        grounded = this.handleResolutionAuditsQuery(query, complaints);
        break;
      case 'CATEGORY_DEPARTMENT':
        grounded = this.handleDepartmentQuery(query, complaints);
        break;
      case 'COMMISSIONER_BRIEFING':
        grounded = this.handleCommissionerBriefingQuery(query, complaints);
        break;
      case 'SLA_OVERDUE':
        grounded = this.handleSlaOverdueQuery(query, complaints);
        break;
      case 'UNKNOWN':
      default:
        grounded = this.handleGeneralOrFallbackQuery(query, complaints);
        break;
    }

    return {
      id: `MSG-${Date.now()}`,
      sender: 'assistant',
      content: grounded.content,
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
        content: `### 🔍 Complaint Dossier Lookup\n\nI don't have enough current data to determine that.\n\nCould not locate a complaint record matching the identifier in your query among the **${complaints.length} live records** in the database. Please verify the complaint ID (e.g. \`#${complaints[0]?.id || '101'}\`).`,
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

  private static handleCommissionerBriefingQuery(query: string, complaints: Complaint[]): GroundedCopilotResponse {
    const synthesis = AIInsightsService.synthesizeOperationalInsights(complaints);
    const { executiveBrief, criticalDispatch, emergingAnomalies, incidentGrouping, resolutionAudits } = synthesis;

    const referencedIds = [
      ...criticalDispatch.slice(0, 2).map((c) => c.complaintId),
      ...resolutionAudits.slice(0, 1).map((r) => r.complaintId),
    ];

    let content = `### 🏛️ Municipal Commissioner Executive Operational Briefing\n\n`;
    content += `**Telemetry Timestamp:** ${new Date().toLocaleTimeString()} | **Dataset:** ${complaints.length} Verified Reports\n\n`;

    content += `#### 1. Command Overview\n`;
    content += `- **Active Grievances:** **${executiveBrief.totalActiveComplaints}** unresolved complaints across all wards.\n`;
    content += `- **Critical Escalations:** **${executiveBrief.criticalDispatchCount}** high-risk cases (Priority Score ≥ 60 / SLA breached).\n`;
    content += `- **Spatio-Temporal Hotspots:** **${executiveBrief.activeHotspotsCount}** 500m surge clusters detected.\n`;
    content += `- **Consolidated Work Orders:** **${executiveBrief.potentialIncidentsCount}** grouped incidents ready for unified contractor dispatch.\n\n`;

    content += `#### 2. Key Action Directives\n`;
    if (criticalDispatch.length > 0) {
      content += `• **Priority Dispatch:** Direct field squads to **#${criticalDispatch[0].complaintId}** (${criticalDispatch[0].title}) due to ${criticalDispatch[0].topDrivers.join(', ')}.\n`;
    }
    if (emergingAnomalies.length > 0) {
      content += `• **Hotspot Containment:** Investigate ${emergingAnomalies[0].categoryLabel} activity surge (${emergingAnomalies[0].increaseRatio.toFixed(1)}× spike) at \`${emergingAnomalies[0].centerLatitude.toFixed(3)}, ${emergingAnomalies[0].centerLongitude.toFixed(3)}\`.\n`;
    }
    if (resolutionAudits.filter((r) => r.needsHumanVerification).length > 0) {
      const auditCount = resolutionAudits.filter((r) => r.needsHumanVerification).length;
      content += `• **Quality Audit:** Review ${auditCount} completed case${auditCount > 1 ? 's' : ''} flagged for missing photographic proof or citizen dissatisfaction.\n`;
    }

    content += `\n*Grounded in live telemetry derived from Phase 3A–3E Civic Intelligence Engines.*`;

    return {
      intent: 'COMMISSIONER_BRIEFING',
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
