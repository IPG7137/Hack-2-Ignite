import { Complaint } from '../types/complaint';
import { PriorityEngine, CivicPriorityAnalysis } from './priorityEngine';
import { EmergingProblemEngine, EmergingHotspotResult } from './emergingProblemEngine';
import { IncidentGroupingEngine, PotentialIncidentResult } from './incidentGroupingEngine';
import { ResolutionVerificationEngine, ResolutionVerificationResult } from './resolutionVerificationEngine';
import { GroundingSecurityGuard } from './groundingSecurityGuard';

export interface CriticalDispatchInsight {
  complaintId: string;
  dbId: number;
  title: string;
  category: string;
  categoryLabel: string;
  address: string;
  ward: string;
  priorityScore: number;
  scoreDisplay: string;
  priorityLevel: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  badgeColor: string;
  topDrivers: string[];
  isOverdue: boolean;
  hoursRemaining: number;
  recommendedAction: string;
}

export interface EmergingAnomalyInsight {
  hotspotId: string;
  category: string;
  categoryLabel: string;
  classification: string;
  levelLabel: string;
  scoreDisplay: string;
  emergingScore: number;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  centerLatitude: number;
  centerLongitude: number;
  complaintCount: number;
  currentWindowCount: number;
  increaseRatio: number;
  complaintIds: string[];
  explainableReasons: string[];
  topDrivers: string[];
  recommendedAction: string;
}

export interface IncidentGroupingInsight {
  incidentId: string;
  incidentLabel: string;
  classification: string;
  levelLabel: string;
  confidenceDisplay: string;
  confidenceScore: number;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  primaryCategory: string;
  primaryCategoryLabel: string;
  complaintCount: number;
  memberComplaintIds: string[];
  affectedRadiusMeters: number;
  timeSpanHours: number;
  topRecurringTerms: string[];
  explainableReasons: string[];
  recommendedAction: string;
}

export interface ResolutionAuditInsight {
  complaintId: string;
  dbId: number;
  title: string;
  category: string;
  categoryLabel: string;
  status: string;
  verificationScore: number;
  scoreDisplay: string;
  classification: string;
  levelLabel: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  needsHumanVerification: boolean;
  evidenceAvailability: string;
  hasBeforeEvidence: boolean;
  hasAfterEvidence: boolean;
  citizenRating?: number;
  citizenFeedbackText?: string;
  feedbackSentiment: string;
  improvementAssessment: string;
  explainableReasons: string[];
  recommendedAction: string;
}

export interface OperationalExecutiveBrief {
  summaryParagraph: string;
  totalActiveComplaints: number;
  criticalDispatchCount: number;
  activeHotspotsCount: number;
  potentialIncidentsCount: number;
  resolutionAuditCount: number;
  generatedAt: string;
}

export interface AIInsightsSynthesis {
  executiveBrief: OperationalExecutiveBrief;
  criticalDispatch: CriticalDispatchInsight[];
  emergingAnomalies: EmergingAnomalyInsight[];
  incidentGrouping: IncidentGroupingInsight[];
  resolutionAudits: ResolutionAuditInsight[];
}

export class AIInsightsService {
  /**
   * Primary synthesis entry point: Evaluates live complaints using deterministic 3A-3E engines
   * and produces evidence-grounded insights for the Municipal Duty Officer.
   */
  public static synthesizeOperationalInsights(complaints: Complaint[]): AIInsightsSynthesis {
    if (!complaints || complaints.length === 0) {
      return {
        executiveBrief: {
          summaryParagraph: 'No municipal grievance records currently on file. Connect live Supabase data stream to begin operational intelligence telemetry.',
          totalActiveComplaints: 0,
          criticalDispatchCount: 0,
          activeHotspotsCount: 0,
          potentialIncidentsCount: 0,
          resolutionAuditCount: 0,
          generatedAt: new Date().toISOString(),
        },
        criticalDispatch: [],
        emergingAnomalies: [],
        incidentGrouping: [],
        resolutionAudits: [],
      };
    }

    const safeComplaints = complaints.map((c) => GroundingSecurityGuard.sanitizeComplaintForTelemetry(c));

    const activeComplaints = safeComplaints.filter(
      (c) => c.status !== 'closed' && c.status !== 'rejected' && c.status !== 'verified'
    );

    // 1. Critical Dispatch Briefing (Phase 3B Priority Engine)
    const priorityEvaluations = activeComplaints
      .map((c) => ({
        complaint: c,
        analysis: PriorityEngine.evaluateComplaintPriority(c, safeComplaints),
      }))
      .sort((a, b) => b.analysis.score - a.analysis.score);

    const criticalDispatch: CriticalDispatchInsight[] = priorityEvaluations
      .filter((item) => item.analysis.score >= 60.0 || item.complaint.priority === 'urgent' || item.complaint.sla.isOverdue)
      .slice(0, 8)
      .map(({ complaint: c, analysis }) => {
        let action = 'Deploy designated ward crew for site remediation.';
        if (analysis.signalBreakdown.publicSafety >= 80) {
          action = 'Immediate emergency containment: Public safety hazard flagged on site.';
        } else if (c.sla.isOverdue) {
          action = 'Priority SLA escalation: Statutory deadline exceeded. Direct supervisor assignment required.';
        } else if (analysis.signalBreakdown.relatedComplaints >= 60) {
          action = 'Coordinate unified repair: Multiple duplicate citizen reports recorded in vicinity.';
        }

        return {
          complaintId: c.id,
          dbId: c.dbId,
          title: c.title,
          category: c.category,
          categoryLabel: c.categoryLabel,
          address: c.location.address,
          ward: c.location.ward,
          priorityScore: analysis.score,
          scoreDisplay: analysis.scoreDisplay,
          priorityLevel: analysis.levelLabel,
          badgeBg: analysis.badgeBg,
          badgeBorder: analysis.badgeBorder,
          badgeText: analysis.badgeText,
          badgeColor: analysis.badgeColor,
          topDrivers: analysis.topDrivers,
          isOverdue: c.sla.isOverdue,
          hoursRemaining: c.sla.hoursRemaining,
          recommendedAction: action,
        };
      });

    // 2. Emerging Anomaly Alerts (Phase 3C Hotspots Engine)
    const detectedHotspots = EmergingProblemEngine.detectHotspots(complaints, {
      clusterRadiusMeters: 500,
      minimumClusterSize: 2,
    }).filter((h) => h.classification !== 'normal');

    const emergingAnomalies: EmergingAnomalyInsight[] = detectedHotspots.map((h) => {
      let action = 'Alert ward superintendent to monitor localized complaint surge.';
      if (h.classification === 'criticalEmergingProblem') {
        action = `Deploy preventive maintenance squad to investigate ~${Math.round(h.averageDistanceMeters)}m zone for localized infrastructure breakdown.`;
      } else if (h.increaseRatio >= 2.0) {
        action = `Investigate localized spike (${h.increaseRatio.toFixed(1)}× baseline) in ${h.categoryLabel}.`;
      }

      return {
        hotspotId: h.id,
        category: h.category,
        categoryLabel: h.categoryLabel,
        classification: h.classification,
        levelLabel: h.levelLabel,
        scoreDisplay: h.scoreDisplay,
        emergingScore: h.emergingScore,
        badgeBg: h.badgeBg,
        badgeBorder: h.badgeBorder,
        badgeText: h.badgeText,
        centerLatitude: h.centerLatitude,
        centerLongitude: h.centerLongitude,
        complaintCount: h.complaintCount,
        currentWindowCount: h.currentWindowCount,
        increaseRatio: h.increaseRatio,
        complaintIds: h.complaintIds,
        explainableReasons: h.explainableReasons,
        topDrivers: h.topDrivers,
        recommendedAction: action,
      };
    });

    // 3. Incident Grouping Recommendations (Phase 3D Incident Grouping Engine)
    const detectedIncidents = IncidentGroupingEngine.groupComplaintsIntoIncidents(complaints, {
      activeHotspots: detectedHotspots,
      groupingRadiusMeters: 500,
      minimumClusterSize: 2,
    });

    const incidentGrouping: IncidentGroupingInsight[] = detectedIncidents.map((inc) => {
      const isHigh = inc.classification === 'highConfidencePotentialIncident';
      const action = isHigh
        ? `Consolidate ${inc.complaintCount} citizen reports into a unified municipal work order to prevent redundant contractor dispatches.`
        : `Cross-reference ${inc.complaintCount} nearby reports during field inspection.`;

      return {
        incidentId: inc.incidentId,
        incidentLabel: inc.incidentLabel,
        classification: inc.classification,
        levelLabel: inc.levelLabel,
        confidenceDisplay: inc.confidenceDisplay,
        confidenceScore: inc.incidentConfidence,
        badgeBg: inc.badgeBg,
        badgeBorder: inc.badgeBorder,
        badgeText: inc.badgeText,
        primaryCategory: inc.primaryCategory,
        primaryCategoryLabel: inc.primaryCategoryLabel,
        complaintCount: inc.complaintCount,
        memberComplaintIds: inc.memberComplaintIds,
        affectedRadiusMeters: inc.affectedRadiusMeters,
        timeSpanHours: inc.timeSpanHours,
        topRecurringTerms: inc.topRecurringTerms,
        explainableReasons: inc.explainableReasons,
        recommendedAction: action,
      };
    });

    // 4. Resolution Audit Flags (Phase 3E Resolution Verification Engine)
    const auditEligible = complaints.filter(
      (c) =>
        c.status === 'resolution_submitted' ||
        c.status === 'resolved' ||
        c.status === 'verified' ||
        (c.evidence?.after && c.evidence.after.length > 0) ||
        (c.citizenFeedback && c.citizenFeedback.rating !== undefined)
    );

    const resolutionAudits: ResolutionAuditInsight[] = auditEligible
      .map((c) => {
        const result: ResolutionVerificationResult = ResolutionVerificationEngine.evaluateComplaintResolution(c);
        let action = 'Verify before and after photographic evidence before signing off statutory closure.';
        if (result.feedbackSentiment === 'negative') {
          action = 'Citizen dissatisfaction flagged: Require field team re-inspection and corrective follow-up.';
        } else if (!result.hasAfterEvidence) {
          action = 'Request photographic after-repair proof from assigned field squad.';
        } else if (result.verificationScore >= 80.0) {
          action = 'Resolution evidence is complete and verified. Ready for formal administrative sign-off.';
        }

        return {
          complaintId: c.id,
          dbId: c.dbId,
          title: c.title,
          category: c.category,
          categoryLabel: c.categoryLabel,
          status: c.status,
          verificationScore: result.verificationScore,
          scoreDisplay: result.scoreDisplay,
          classification: result.classification,
          levelLabel: result.levelLabel,
          badgeBg: result.badgeBg,
          badgeBorder: result.badgeBorder,
          badgeText: result.badgeText,
          needsHumanVerification: result.needsHumanVerification,
          evidenceAvailability: result.evidenceAvailability,
          hasBeforeEvidence: result.hasBeforeEvidence,
          hasAfterEvidence: result.hasAfterEvidence,
          citizenRating: result.citizenRating,
          citizenFeedbackText: result.citizenFeedbackText,
          feedbackSentiment: result.feedbackSentiment,
          improvementAssessment: result.improvementAssessment,
          explainableReasons: result.explainableReasons,
          recommendedAction: action,
        };
      })
      .sort((a, b) => (a.needsHumanVerification === b.needsHumanVerification ? b.verificationScore - a.verificationScore : a.needsHumanVerification ? -1 : 1));

    // 5. Grounded Executive Summary Synthesis
    const parts: string[] = [];
    parts.push(`Based on real-time civic intelligence signals evaluated across ${complaints.length} municipal reports:`);

    if (criticalDispatch.length > 0) {
      parts.push(`• Critical Dispatch: Identified ${criticalDispatch.length} priority grievance${criticalDispatch.length > 1 ? 's' : ''} requiring active municipal intervention under SLA.`);
    } else {
      parts.push('• Critical Dispatch: All urgent priority actions are currently cleared.');
    }

    if (emergingAnomalies.length > 0) {
      parts.push(`• Activity Anomalies: Detected ${emergingAnomalies.length} localized 500m complaint surge zone${emergingAnomalies.length > 1 ? 's' : ''}.`);
    } else {
      parts.push('• Activity Anomalies: No 500m complaint volume anomalies detected across jurisdictions.');
    }

    if (incidentGrouping.length > 0) {
      parts.push(`• Common Incidents: Grouped ${incidentGrouping.length} potential shared infrastructure incident${incidentGrouping.length > 1 ? 's' : ''} for unified contractor dispatch.`);
    }

    if (resolutionAudits.filter((r) => r.needsHumanVerification).length > 0) {
      const count = resolutionAudits.filter((r) => r.needsHumanVerification).length;
      parts.push(`• Resolution Audits: ${count} completed case${count > 1 ? 's' : ''} flagged for officer review prior to statutory closure.`);
    }

    const summaryParagraph = parts.join(' ');

    return {
      executiveBrief: {
        summaryParagraph,
        totalActiveComplaints: activeComplaints.length,
        criticalDispatchCount: criticalDispatch.length,
        activeHotspotsCount: emergingAnomalies.length,
        potentialIncidentsCount: incidentGrouping.length,
        resolutionAuditCount: resolutionAudits.filter((r) => r.needsHumanVerification).length,
        generatedAt: new Date().toISOString(),
      },
      criticalDispatch,
      emergingAnomalies,
      incidentGrouping,
      resolutionAudits,
    };
  }
}
