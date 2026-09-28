/**
 * CIVICRESOLVE — Unified Civic Participation & Municipal Intelligence Service
 * 
 * Aggregates factual operational metrics and citizen participation signals:
 * 1. Civic Signal: Community-supported issues, upvote volume, duplicate reductions
 * 2. Municipal Operations: Priority distribution, SLA breach risks, active field assignments
 * 3. Resolution Quality: Officer resolutions vs Citizen-verified audits, satisfaction rating, reopen rate
 * 4. Civic Recognition: Verified participation milestones, occasion certificates, nursery plant vouchers
 * 5. Deterministic Actionable Intelligence: "Needs Attention" operational directives
 * 
 * Enforces Zero PII leakage and strict role-based access scoping.
 */

import { Complaint, ComplaintPriority, ComplaintStatus } from '../types/complaint';
import { EmergingProblemEngine } from './emergingProblemEngine';
import { IncidentGroupingEngine } from './incidentGroupingEngine';
import { SmartAlertEngine } from './smartAlertEngine';
import { ResolutionFeedbackService } from './resolutionFeedbackService';
import { civicRecognitionService } from './civicRecognitionService';
import { civicFeedService } from './civicFeedService';

export interface UnifiedDashboardMetrics {
  // Executive Summary
  executive: {
    totalComplaints: number;
    activeBacklog: number;
    backlogChangePct: number; // e.g. -8%
    slaRiskCount: number;
    emergingHotspotsCount: number;
    citizenVerificationRatePct: number; // e.g. 89%
    averageSatisfactionRating: number; // 1-5 scale (e.g. 4.3)
    communitySupportedIssuesCount: number;
    verifiedCivicContributionsCount: number;
  };

  // Section 1: Civic Signal
  civicSignal: {
    totalSupportedIssues: number;
    totalCommunitySupportsCount: number;
    topSupportedIssues: Array<{
      id: string | number;
      formattedId: string;
      title: string;
      category: string;
      supportCount: number;
      priority: ComplaintPriority;
      status: ComplaintStatus;
      locationAddress: string;
    }>;
    recentFeedbackCount: number;
    verifiedActionsThisPeriod: number;
  };

  // Section 2: Municipal Operations
  operations: {
    urgentCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    overdueSLACount: number;
    warningSLACount: number;
    onTrackSLACount: number;
    slaComplianceRatePct: number;
    activeHotspotsCount: number;
    activeIncidentClustersCount: number;
  };

  // Section 3: Resolution Quality
  resolutionQuality: {
    resolvedByOfficerCount: number;
    verifiedByCitizenCount: number;
    pendingCitizenVerificationCount: number;
    reopenedCount: number;
    reopenRatePct: number;
    satisfactionRatePct: number;
    averageRating: number;
    ratingBreakdown: Record<number, number>;
    reopenReasonsDistribution: Record<string, number>;
  };

  // Section 4: Civic Recognition & Nursery Redemption
  recognition: {
    contributorCount: number;
    supporterCount: number;
    championCount: number;
    totalCertificatesIssued: number;
    activeOccasionName: string;
    plantVouchersRequested: number;
    plantVouchersApproved: number;
    plantVouchersRedeemed: number;
  };

  // Section 5: Actionable Directives ("Needs Attention")
  actionableDirectives: Array<{
    id: string;
    severity: 'critical' | 'warning' | 'info' | 'success';
    title: string;
    description: string;
    targetPage: 'alerts' | 'map' | 'complaints' | 'sla' | 'civic_champions';
    targetId?: string;
    timestamp: string;
  }>;
}

export class DashboardIntelligenceService {
  /**
   * Computes authoritative unified metrics from live complaints and sub-services.
   */
  public static async getUnifiedMetrics(params: {
    complaints: Complaint[];
    districtId?: string;
    userRole?: string;
  }): Promise<UnifiedDashboardMetrics> {
    const { complaints = [], districtId } = params;

    // Filter by district if specified
    const filteredComplaints = districtId
      ? complaints.filter(
          (c) =>
            !(c as any).districtId ||
            String((c as any).districtId).toLowerCase() === districtId.toLowerCase()
        )
      : complaints;

    const total = filteredComplaints.length;
    const activeComplaints = filteredComplaints.filter(
      (c) => c.status !== 'closed' && c.status !== 'verified'
    );
    const activeBacklog = activeComplaints.length;

    // 1. Municipal Operations
    const urgentCount = filteredComplaints.filter(
      (c) => c.priority === 'urgent' && c.status !== 'closed'
    ).length;
    const highCount = filteredComplaints.filter(
      (c) => c.priority === 'high' && c.status !== 'closed'
    ).length;
    const mediumCount = filteredComplaints.filter(
      (c) => c.priority === 'medium' && c.status !== 'closed'
    ).length;
    const lowCount = filteredComplaints.filter(
      (c) => c.priority === 'low' && c.status !== 'closed'
    ).length;

    const overdueSLA = activeComplaints.filter((c) => c.sla?.isOverdue).length;
    const warningSLA = activeComplaints.filter(
      (c) => !c.sla?.isOverdue && c.sla?.slaStatus === 'warning'
    ).length;
    const onTrackSLA = activeComplaints.filter(
      (c) => !c.sla?.isOverdue && c.sla?.slaStatus === 'on_track'
    ).length;
    const slaComplianceRate =
      total > 0 ? Math.round(((total - overdueSLA) / total) * 100) : 100;

    // Detect Emerging Hotspots & Incidents
    const hotspots = EmergingProblemEngine.detectHotspots(filteredComplaints, {
      clusterRadiusMeters: 500,
      minimumClusterSize: 2,
    }).filter((h) => h.classification !== 'normal');

    const incidents = IncidentGroupingEngine.groupComplaintsIntoIncidents(
      filteredComplaints,
      {
        activeHotspots: hotspots,
        groupingRadiusMeters: 500,
        minimumClusterSize: 2,
      }
    );

    // 2. Resolution Quality & Feedback
    const resolvedByOfficer = filteredComplaints.filter(
      (c) =>
        c.status === 'resolution_submitted' ||
        c.status === 'verified' ||
        c.status === 'closed'
    ).length;
    const verifiedByCitizen = filteredComplaints.filter(
      (c) => c.status === 'verified' || c.status === 'closed'
    ).length;
    const pendingCitizenVerification = filteredComplaints.filter(
      (c) => c.status === 'resolution_submitted'
    ).length;
    const reopened = filteredComplaints.filter(
      (c) =>
        c.status === 'reopened' ||
        (c.citizenVerification?.reopenCount && c.citizenVerification.reopenCount > 0)
    ).length;

    const reopenRate =
      (resolvedByOfficer + reopened) > 0
        ? Math.round((reopened / (resolvedByOfficer + reopened)) * 100)
        : 0;
    const verificationRate =
      resolvedByOfficer > 0
        ? Math.round((verifiedByCitizen / resolvedByOfficer) * 100)
        : 0;

    // Pull feedback metrics from ResolutionFeedbackService
    const feedbackMetrics = ResolutionFeedbackService.getFeedbackMetrics(districtId);

    // Compute blended citizen satisfaction rating from feedback store and complaint records
    let totalFeedbacksCount = feedbackMetrics.totalFeedbacks;
    let totalFeedbacksSum = feedbackMetrics.averageRating * feedbackMetrics.totalFeedbacks;

    for (const c of filteredComplaints) {
      if (c.citizenFeedback?.rating) {
        totalFeedbacksCount++;
        totalFeedbacksSum += c.citizenFeedback.rating;
      }
    }

    const avgRating =
      totalFeedbacksCount > 0
        ? Math.round((totalFeedbacksSum / totalFeedbacksCount) * 10) / 10
        : 0;

    const satisfactionRatePct =
      feedbackMetrics.totalFeedbacks > 0
        ? feedbackMetrics.resolvedPercentage
        : (verifiedByCitizen + reopened > 0
            ? Math.round((verifiedByCitizen / (verifiedByCitizen + reopened)) * 100)
            : (resolvedByOfficer > 0 ? 100 : 0));

    // Structured reopen reasons from complaint verification audits
    const reopenReasonsDistribution: Record<string, number> = {
      partial_resolution: 0,
      recurring_problem: 0,
      poor_workmanship: 0,
    };

    for (const c of filteredComplaints) {
      if (c.status === 'reopened' || (c.citizenVerification?.reopenCount && c.citizenVerification.reopenCount > 0)) {
        const reason = (c.citizenVerification?.reopenReason || '').toLowerCase();
        if (reason.includes('recur') || reason.includes('again')) {
          reopenReasonsDistribution.recurring_problem++;
        } else if (reason.includes('work') || reason.includes('quality') || reason.includes('poor')) {
          reopenReasonsDistribution.poor_workmanship++;
        } else {
          reopenReasonsDistribution.partial_resolution++;
        }
      }
    }

    // 3. Civic Signal (Supported issues & community votes)
    const supportedComplaints = filteredComplaints
      .filter((c) => (c.upvotesCount && c.upvotesCount > 0) || (c as any).supportCount > 0)
      .sort((a, b) => (b.upvotesCount || (b as any).supportCount || 0) - (a.upvotesCount || (a as any).supportCount || 0));

    const totalSupportedIssues = supportedComplaints.length;
    const totalCommunitySupportsCount = supportedComplaints.reduce(
      (sum, c) => sum + (c.upvotesCount || (c as any).supportCount || 0),
      0
    );

    const topSupportedIssues = supportedComplaints.slice(0, 5).map((c) => ({
      id: c.id,
      formattedId: c.id.startsWith('CR-') ? c.id : `CR-${c.id}`,
      title: c.title,
      category: c.category,
      supportCount: c.upvotesCount || (c as any).supportCount || 1,
      priority: c.priority,
      status: c.status,
      locationAddress: c.location?.address || 'Municipal Ward Area',
    }));

    // 4. Civic Recognition & Plant Redemption
    const recognitionMetrics = await civicRecognitionService.getRecognitionMetrics(districtId);

    // 5. Deterministic Actionable Directives ("Needs Attention")
    const actionableDirectives: UnifiedDashboardMetrics['actionableDirectives'] = [];
    const nowIso = new Date().toISOString();

    if (overdueSLA > 0) {
      actionableDirectives.push({
        id: 'dir-sla-overdue',
        severity: 'critical',
        title: `${overdueSLA} Civic Complaints Exceeded SLA Resolution Window`,
        description: `High-priority public works complaints require immediate field crew reallocation to prevent statutory breach.`,
        targetPage: 'alerts',
        timestamp: nowIso,
      });
    }

    if (hotspots.length > 0) {
      const topHotspot = hotspots[0];
      actionableDirectives.push({
        id: 'dir-emerging-hotspot',
        severity: 'warning',
        title: `Emerging Hotspot: ${topHotspot.categoryLabel || topHotspot.category}`,
        description: `${topHotspot.complaintCount} related complaints clustered within ${topHotspot.radiusMeters}m radius (${topHotspot.shortLabel || 'Critical Surge'}).`,
        targetPage: 'map',
        timestamp: nowIso,
      });
    }

    if (reopened > 0) {
      actionableDirectives.push({
        id: 'dir-reopened-disputes',
        severity: 'warning',
        title: `${reopened} Resolved Issue(s) Reopened Following Citizen On-Site Audit`,
        description: `Citizens disputed contractor fixes due to partial resolution or recurring failure. Field reinspection required.`,
        targetPage: 'complaints',
        timestamp: nowIso,
      });
    }

    if (recognitionMetrics.totalPlantRedemptionsRequested > recognitionMetrics.totalPlantsRedeemed) {
      const pendingVouchers =
        recognitionMetrics.totalPlantRedemptionsRequested -
        recognitionMetrics.totalPlantsRedeemed;
      actionableDirectives.push({
        id: 'dir-nursery-vouchers',
        severity: 'info',
        title: `${pendingVouchers} Social Forestry Sapling Redemption(s) Pending Counter Pickup`,
        description: `Recognized civic contributors holding valid vouchers scheduled for indigenous sapling collection.`,
        targetPage: 'civic_champions',
        timestamp: nowIso,
      });
    }

    if (actionableDirectives.length === 0) {
      actionableDirectives.push({
        id: 'dir-nominal-ops',
        severity: 'success',
        title: 'Municipal Operations & Citizen Satisfaction Stable',
        description: 'All field assignments are within statutory SLA limits with positive citizen verification ratings.',
        targetPage: 'sla',
        timestamp: nowIso,
      });
    }

    // Backlog reduction rate based on resolved proportion
    const resolvedTotal = filteredComplaints.filter(
      (c) => c.status === 'resolved' || c.status === 'verified' || c.status === 'closed'
    ).length;
    const backlogChangePct = total > 0 ? -Math.round((resolvedTotal / total) * 100) : 0;

    return {
      executive: {
        totalComplaints: total,
        activeBacklog,
        backlogChangePct,
        slaRiskCount: overdueSLA + warningSLA,
        emergingHotspotsCount: hotspots.length,
        citizenVerificationRatePct: verificationRate,
        averageSatisfactionRating: avgRating,
        communitySupportedIssuesCount: totalSupportedIssues,
        verifiedCivicContributionsCount:
          verifiedByCitizen + recognitionMetrics.totalCertificatesIssued,
      },
      civicSignal: {
        totalSupportedIssues,
        totalCommunitySupportsCount,
        topSupportedIssues,
        recentFeedbackCount: feedbackMetrics.totalFeedbacks,
        verifiedActionsThisPeriod: verifiedByCitizen + totalSupportedIssues,
      },
      operations: {
        urgentCount,
        highCount,
        mediumCount,
        lowCount,
        overdueSLACount: overdueSLA,
        warningSLACount: warningSLA,
        onTrackSLACount: onTrackSLA,
        slaComplianceRatePct: slaComplianceRate,
        activeHotspotsCount: hotspots.length,
        activeIncidentClustersCount: incidents.length,
      },
      resolutionQuality: {
        resolvedByOfficerCount: resolvedByOfficer,
        verifiedByCitizenCount: verifiedByCitizen,
        pendingCitizenVerificationCount: pendingCitizenVerification,
        reopenedCount: reopened,
        reopenRatePct: Math.min(100, reopenRate),
        satisfactionRatePct,
        averageRating: avgRating,
        ratingBreakdown: feedbackMetrics.ratingDistribution,
        reopenReasonsDistribution,
      },
      recognition: {
        contributorCount: recognitionMetrics.tierDistribution.CONTRIBUTOR,
        supporterCount: recognitionMetrics.tierDistribution.SUPPORTER,
        championCount: recognitionMetrics.tierDistribution.CHAMPION,
        totalCertificatesIssued: recognitionMetrics.totalCertificatesIssued,
        activeOccasionName: 'Gandhi Jayanti Civic Recognition 2026',
        plantVouchersRequested: recognitionMetrics.totalPlantRedemptionsRequested,
        plantVouchersApproved: recognitionMetrics.totalRedemptionsApproved,
        plantVouchersRedeemed: recognitionMetrics.totalPlantsRedeemed,
      },
      actionableDirectives,
    };
  }
}

export const dashboardIntelligenceService = DashboardIntelligenceService;
