import { Complaint, ComplaintPriority } from '../types/complaint';
import { SimilarityEngine } from './similarityEngine';

export type PriorityLevel = 'Critical' | 'High' | 'Medium' | 'Low';

export interface PrioritySignalBreakdown {
  severity: number;
  publicSafety: number;
  relatedComplaints: number;
  ageEscalation: number;
  categoryBaseline: number;
}

export interface CivicPriorityAnalysis {
  score: number; // 0.0 - 100.0
  levelLabel: PriorityLevel;
  scoreDisplay: string; // e.g. "82/100"
  badgeColor: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  explainableReasons: string[];
  topDrivers: string[];
  signalBreakdown: PrioritySignalBreakdown;
}

export class PriorityEngine {
  // Explainable signal weights (Sum = 1.0)
  public static readonly weightSeverity = 0.30;
  public static readonly weightPublicSafety = 0.25;
  public static readonly weightRelatedComplaints = 0.20;
  public static readonly weightAge = 0.15;
  public static readonly weightCategory = 0.10;

  // Thresholds for priority level mapping
  public static readonly thresholdCritical = 80.0;
  public static readonly thresholdHigh = 60.0;
  public static readonly thresholdMedium = 35.0;

  // High-risk keywords indicating immediate public hazard
  private static readonly criticalHazardKeywords = [
    'manhole', 'open manhole', 'wire', 'live wire', 'transformer', 'sparking',
    'electric shock', 'collapse', 'collapsed', 'cave in', 'caved', 'fire',
    'smoke', 'gas leak', 'pipeline burst', 'major flood', 'deep crater',
    'accident', 'emergency', 'fallen tree', 'hanging wire'
  ];

  // Moderate-risk keywords indicating heightened safety concern
  private static readonly moderateHazardKeywords = [
    'pothole', 'broken divider', 'dark street', 'blackout', 'streetlight dead',
    'waterlogging', 'sewage leak', 'garbage burning', 'blocked drain', 'slippery'
  ];

  /**
   * Calculates severity score (0 - 100) from priority string or AI triage
   */
  public static calculateSeverityScore(severity?: string | null): number {
    if (!severity || !severity.trim()) return 50.0; // Neutral baseline

    const s = severity.trim().toLowerCase();
    if (s.includes('critical') || s.includes('urgent')) return 100.0;
    if (s.includes('high')) return 80.0;
    if (s.includes('medium')) return 50.0;
    if (s.includes('low')) return 20.0;
    return 50.0;
  }

  /**
   * Calculates public safety impact score (0 - 100) from category, title, and description
   */
  public static calculatePublicSafetyScore(
    category?: string | null,
    title?: string | null,
    description?: string | null
  ): number {
    const combined = `${category || ''} ${title || ''} ${description || ''}`.toLowerCase();

    // Check for critical hazards
    for (const kw of this.criticalHazardKeywords) {
      if (combined.includes(kw)) return 100.0;
    }

    // Check for moderate hazards
    for (const kw of this.moderateHazardKeywords) {
      if (combined.includes(kw)) return 65.0;
    }

    // Category-based safety baseline
    const cat = (category || '').toLowerCase();
    if (cat.includes('safety') || cat.includes('emergency') || cat.includes('disaster')) {
      return 85.0;
    }
    if (cat.includes('electricity') || cat.includes('water') || cat.includes('road')) {
      return 50.0;
    }

    return 25.0; // Standard municipal maintenance
  }

  /**
   * Calculates related complaint cluster score (0 - 100)
   */
  public static calculateRelatedComplaintsScore(relatedCount: number): number {
    if (relatedCount <= 0) return 0.0;
    if (relatedCount === 1) return 40.0;
    if (relatedCount === 2) return 70.0;
    return 100.0; // 3 or more related reports
  }

  /**
   * Calculates complaint age / duration escalation score (0 - 100)
   */
  public static calculateAgeScore(
    createdAt?: Date | string | null,
    isResolved: boolean = false
  ): number {
    if (isResolved || !createdAt) return 0.0;

    const d = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
    if (isNaN(d.getTime())) return 10.0;

    const diffSeconds = (Date.now() - d.getTime()) / 1000;
    if (diffSeconds < 0) return 10.0; // Future/clock skew safe baseline

    const diffDays = diffSeconds / 86400.0;

    if (diffDays < 1.0) return 15.0; // Fresh (< 24 hours)
    if (diffDays <= 3.0) return 40.0; // 1 to 3 days
    if (diffDays <= 7.0) return 70.0; // 4 to 7 days (approaching SLA breach)
    return 100.0; // Over 7 days unresolved (urgent escalation)
  }

  /**
   * Calculates category baseline score (0 - 100)
   */
  public static calculateCategoryBaselineScore(category?: string | null): number {
    if (!category || !category.trim()) return 50.0;

    const c = category.trim().toLowerCase();
    if (c.includes('safety') || c.includes('emergency') || c.includes('disaster')) {
      return 100.0;
    }
    if (c.includes('electricity') || c.includes('water') || c.includes('drainage')) {
      return 75.0;
    }
    if (c.includes('road') || c.includes('traffic') || c.includes('pavement')) {
      return 60.0;
    }
    if (c.includes('waste') || c.includes('garbage') || c.includes('sanitation')) {
      return 45.0;
    }
    return 35.0;
  }

  /**
   * Evaluates complete multi-signal civic priority for a Complaint object
   */
  public static evaluateComplaintPriority(
    complaint: Complaint,
    allComplaints?: Complaint[]
  ): CivicPriorityAnalysis {
    const isResolved =
      complaint.status === 'resolved' ||
      complaint.status === 'verified' ||
      complaint.status === 'closed';

    // Phase 3A integration: calculate real related complaints count
    let relatedCount = 0;
    if (allComplaints && allComplaints.length > 0) {
      const relatedList = SimilarityEngine.findRelatedComplaints(complaint, allComplaints, {
        limit: 10,
        minConfidence: SimilarityEngine.thresholdRelatedIncident,
      });
      relatedCount = relatedList.length;
    }

    const severityScore = this.calculateSeverityScore(complaint.priority);
    const publicSafetyScore = this.calculatePublicSafetyScore(
      complaint.rawCategory || complaint.category,
      complaint.title,
      complaint.description
    );
    const relatedScore = this.calculateRelatedComplaintsScore(relatedCount);
    const ageScore = this.calculateAgeScore(complaint.createdAt, isResolved);
    const categoryScore = this.calculateCategoryBaselineScore(
      complaint.rawCategory || complaint.category
    );

    const totalScore =
      severityScore * this.weightSeverity +
      publicSafetyScore * this.weightPublicSafety +
      relatedScore * this.weightRelatedComplaints +
      ageScore * this.weightAge +
      categoryScore * this.weightCategory;

    const boundedScore = Math.max(0.0, Math.min(100.0, totalScore));

    let levelLabel: PriorityLevel;
    let badgeColor: string;
    let badgeBg: string;
    let badgeBorder: string;
    let badgeText: string;

    if (boundedScore >= this.thresholdCritical) {
      levelLabel = 'Critical';
      badgeColor = '#D92D20';
      badgeBg = 'bg-red-50';
      badgeBorder = 'border-red-200';
      badgeText = 'text-red-700';
    } else if (boundedScore >= this.thresholdHigh) {
      levelLabel = 'High';
      badgeColor = '#EA580C';
      badgeBg = 'bg-orange-50';
      badgeBorder = 'border-orange-200';
      badgeText = 'text-orange-700';
    } else if (boundedScore >= this.thresholdMedium) {
      levelLabel = 'Medium';
      badgeColor = '#D99A00';
      badgeBg = 'bg-amber-50';
      badgeBorder = 'border-amber-200';
      badgeText = 'text-amber-700';
    } else {
      levelLabel = 'Low';
      badgeColor = '#1769D2';
      badgeBg = 'bg-blue-50';
      badgeBorder = 'border-blue-200';
      badgeText = 'text-blue-700';
    }

    const reasons: string[] = [];

    if (publicSafetyScore >= 85.0) {
      reasons.push('Immediate public safety risk detected in issue description');
    } else if (publicSafetyScore >= 60.0) {
      reasons.push('Elevated neighborhood safety concern');
    }

    if (severityScore >= 80.0) {
      reasons.push(`${complaint.priority.toUpperCase()} priority tier`);
    }

    if (relatedCount >= 2) {
      reasons.push(`${relatedCount} related citizen grievances clustered in vicinity`);
    } else if (relatedCount === 1) {
      reasons.push('1 related complaint reported in area');
    }

    if (ageScore >= 70.0 && !isResolved) {
      const createdDate = new Date(complaint.createdAt);
      const days = !isNaN(createdDate.getTime())
        ? Math.max(1, Math.round((Date.now() - createdDate.getTime()) / 86400000))
        : 4;
      reasons.push(`Long pending (${days} days unresolved · SLA escalation)`);
    }

    if (categoryScore >= 75.0) {
      reasons.push(`Critical infrastructure domain (${complaint.categoryLabel || complaint.category})`);
    }

    if (reasons.length === 0) {
      reasons.push('Standard municipal maintenance grievance');
    }

    const topDrivers: string[] = [];
    if (publicSafetyScore >= 65.0) topDrivers.push('Safety Risk');
    if (relatedCount >= 2) topDrivers.push(`${relatedCount} Clustered Reports`);
    if (ageScore >= 70.0 && !isResolved) topDrivers.push('Long Pending');
    if (severityScore >= 80.0 && topDrivers.length < 3) topDrivers.push('High Severity');
    if (topDrivers.length === 0) topDrivers.push('Routine Maintenance');

    return {
      score: boundedScore,
      levelLabel,
      scoreDisplay: `${Math.round(boundedScore)}/100`,
      badgeColor,
      badgeBg,
      badgeBorder,
      badgeText,
      explainableReasons: reasons,
      topDrivers,
      signalBreakdown: {
        severity: severityScore,
        publicSafety: publicSafetyScore,
        relatedComplaints: relatedScore,
        ageEscalation: ageScore,
        categoryBaseline: categoryScore,
      },
    };
  }

  /**
   * Sorts a collection of complaints deterministically by calculated Civic Priority score (descending),
   * using age / creation date as secondary tie-breaker.
   */
  public static sortComplaintsByPriority(complaints: Complaint[]): Array<{
    complaint: Complaint;
    priorityAnalysis: CivicPriorityAnalysis;
  }> {
    const analyzed = complaints.map((c) => ({
      complaint: c,
      priorityAnalysis: this.evaluateComplaintPriority(c, complaints),
    }));

    return analyzed.sort((a, b) => {
      if (b.priorityAnalysis.score !== a.priorityAnalysis.score) {
        return b.priorityAnalysis.score - a.priorityAnalysis.score;
      }
      // Tie-breaker: older unresolved reports come first
      return (
        new Date(a.complaint.createdAt).getTime() -
        new Date(b.complaint.createdAt).getTime()
      );
    });
  }
}
