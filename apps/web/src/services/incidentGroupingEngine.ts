import { Complaint, ComplaintPriority } from '../types/complaint';
import { SimilarityEngine } from './similarityEngine';
import { EmergingProblemEngine, EmergingHotspotResult } from './emergingProblemEngine';
import { hasValidCoordinates } from './reportAdapter';

export type IncidentClassification =
  | 'highConfidencePotentialIncident'
  | 'possibleCommonIncident'
  | 'weakRelatedCluster'
  | 'noIncidentGroup';

export interface IncidentSignalBreakdown {
  similarityEvidence: number;
  spatialConcentration: number;
  categoryConsistency: number;
  temporalConsistency: number;
  clusterSize: number;
  hotspotBoost: number;
}

export interface PotentialIncidentResult {
  incidentId: string;
  memberComplaintIds: string[];
  primaryCategory: string;
  primaryCategoryLabel: string;
  incidentLabel: string;
  centerLatitude: number;
  centerLongitude: number;
  complaintCount: number;
  incidentConfidence: number; // 0.0 - 100.0
  confidenceDisplay: string; // e.g. "85/100"
  classification: IncidentClassification;
  levelLabel: string; // e.g. "High Confidence Potential Incident"
  shortLabel: string; // e.g. "Potential Incident"
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  badgeColor: string;
  affectedRadiusMeters: number;
  earliestReportTime: Date;
  latestReportTime: Date;
  timeSpanHours: number;
  topRecurringTerms: string[];
  highestPriority: ComplaintPriority;
  hasActiveHotspot: boolean;
  explainableReasons: string[];
  topDrivers: string[];
  signalBreakdown: IncidentSignalBreakdown;
}

interface IncidentMember {
  id: string;
  category: string;
  categoryLabel: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  createdAt: Date;
  priority: ComplaintPriority;
  rawComplaint: Complaint;
}

export class IncidentGroupingEngine {
  // Decision-support signal weights (Sum = 1.0)
  public static readonly weightSimilarityEvidence = 0.30;
  public static readonly weightSpatialConcentration = 0.25;
  public static readonly weightCategoryConsistency = 0.20;
  public static readonly weightTemporalConsistency = 0.15;
  public static readonly weightClusterSize = 0.10;

  // Thresholds for incident classification
  public static readonly thresholdHighConfidence = 80.0;
  public static readonly thresholdPossibleIncident = 60.0;
  public static readonly thresholdWeakCluster = 40.0;

  // Default spatial grouping radius (500 meters)
  public static readonly defaultGroupingRadiusMeters = 500.0;

  // Stop words for topic term extraction
  private static readonly stopWords = new Set<string>([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he',
    'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'were',
    'will', 'with', 'there', 'this', 'near', 'area', 'please', 'complaint',
    'issue', 'problem', 'sir', 'madam', 'colony', 'nagar', 'ward', 'daily',
    'urgent', 'kindly', 'help', 'report', 'reported', 'solapur', 'street',
    'road', 'roadside', 'side', 'lane', 'sector'
  ]);

  /**
   * Primary entry point: Group a collection of complaints into potential common incidents
   */
  public static groupComplaintsIntoIncidents(
    complaints: Complaint[],
    options?: {
      activeHotspots?: EmergingHotspotResult[];
      groupingRadiusMeters?: number;
      minimumClusterSize?: number;
    }
  ): PotentialIncidentResult[] {
    const minimumClusterSize = options?.minimumClusterSize ?? 2;
    if (!complaints || complaints.length < minimumClusterSize) return [];

    const groupingRadiusMeters = options?.groupingRadiusMeters ?? this.defaultGroupingRadiusMeters;
    const activeHotspots = options?.activeHotspots;

    // 1. Filter coordinate-valid complaints and map to internal IncidentMember
    const items: IncidentMember[] = [];
    for (const c of complaints) {
      if (!hasValidCoordinates(c)) continue;
      const parsedDate = c.createdAt ? new Date(c.createdAt) : new Date();
      items.push({
        id: c.id,
        category: c.category || 'general',
        categoryLabel: c.categoryLabel || c.category || 'General Civic Issue',
        title: c.title || '',
        description: c.description || '',
        latitude: c.location.latitude,
        longitude: c.location.longitude,
        createdAt: isNaN(parsedDate.getTime()) ? new Date() : parsedDate,
        priority: c.priority || 'medium',
        rawComplaint: c,
      });
    }

    if (items.length < minimumClusterSize) return [];

    // 2. Spatial Clustering: Group members within groupingRadiusMeters
    const spatialClusters: IncidentMember[][] = [];
    const assignedIds = new Set<string>();

    for (let i = 0; i < items.length; i++) {
      const seed = items[i];
      if (assignedIds.has(seed.id)) continue;

      const cluster: IncidentMember[] = [seed];
      assignedIds.add(seed.id);

      for (let j = 0; j < items.length; j++) {
        if (i === j) continue;
        const candidate = items[j];
        if (assignedIds.has(candidate.id)) continue;

        const dist = EmergingProblemEngine.calculateDistanceMeters(
          seed.latitude,
          seed.longitude,
          candidate.latitude,
          candidate.longitude
        );

        if (dist <= groupingRadiusMeters) {
          cluster.push(candidate);
          assignedIds.add(candidate.id);
        }
      }

      if (cluster.length >= minimumClusterSize) {
        spatialClusters.push(cluster);
      }
    }

    // 3. Evaluate each spatial cluster into a PotentialIncidentResult
    const incidents: PotentialIncidentResult[] = [];
    let incidentCounter = 101;

    for (const cluster of spatialClusters) {
      const year = new Date().getFullYear();
      const evaluatedIncident = this.evaluateSpatialGroup(
        `INC-${year}-${incidentCounter}`,
        cluster,
        groupingRadiusMeters,
        activeHotspots
      );

      if (evaluatedIncident && evaluatedIncident.classification !== 'noIncidentGroup') {
        incidents.push(evaluatedIncident);
        incidentCounter++;
      }
    }

    // Sort descending by incident confidence
    incidents.sort((a, b) => b.incidentConfidence - a.incidentConfidence);
    return incidents;
  }

  /**
   * Evaluate a spatial candidate group into a structured PotentialIncidentResult
   */
  public static evaluateSpatialGroup(
    incidentId: string,
    cluster: IncidentMember[],
    groupingRadiusMeters: number = this.defaultGroupingRadiusMeters,
    activeHotspots?: EmergingHotspotResult[]
  ): PotentialIncidentResult | null {
    if (cluster.length < 2) return null;

    // A. Geographic Centroid and Affected Radius
    let sumLat = 0;
    let sumLng = 0;
    for (const item of cluster) {
      sumLat += item.latitude;
      sumLng += item.longitude;
    }
    const centerLatitude = sumLat / cluster.length;
    const centerLongitude = sumLng / cluster.length;

    let maxDist = 0;
    for (const item of cluster) {
      const dist = EmergingProblemEngine.calculateDistanceMeters(
        centerLatitude,
        centerLongitude,
        item.latitude,
        item.longitude
      );
      if (dist > maxDist) maxDist = dist;
    }
    const affectedRadiusMeters = maxDist > 0 ? maxDist : 25.0;

    // B. Category Dominance & Primary Domain
    const catCounts: { [key: string]: { count: number; label: string } } = {};
    for (const item of cluster) {
      if (!catCounts[item.category]) {
        catCounts[item.category] = { count: 0, label: item.categoryLabel };
      }
      catCounts[item.category].count += 1;
    }

    let primaryCategory = 'general';
    let primaryCategoryLabel = 'General Civic Issue';
    let maxCatCount = 0;
    for (const [cat, data] of Object.entries(catCounts)) {
      if (data.count > maxCatCount) {
        maxCatCount = data.count;
        primaryCategory = cat;
        primaryCategoryLabel = data.label;
      }
    }
    const categoryRatio = maxCatCount / cluster.length;

    // C. Phase 3A Multi-Signal Similarity Evidence
    let sumSimilarity = 0;
    let pairCount = 0;

    for (let i = 0; i < cluster.length; i++) {
      for (let j = i + 1; j < cluster.length; j++) {
        const a = cluster[i];
        const b = cluster[j];

        const dist = EmergingProblemEngine.calculateDistanceMeters(
          a.latitude,
          a.longitude,
          b.latitude,
          b.longitude
        );

        const sim = SimilarityEngine.evaluateSimilarity(a.rawComplaint, b.rawComplaint);
        sumSimilarity += sim.totalConfidence;
        pairCount++;
      }
    }

    const avgSimilarity = pairCount > 0 ? sumSimilarity / pairCount : 0.5;

    // D. Temporal Span & Consistency
    let earliest = cluster[0].createdAt;
    let latest = cluster[0].createdAt;

    for (const item of cluster) {
      if (item.createdAt.getTime() < earliest.getTime()) earliest = item.createdAt;
      if (item.createdAt.getTime() > latest.getTime()) latest = item.createdAt;
    }

    const spanHours = Math.max(0.1, (latest.getTime() - earliest.getTime()) / (1000 * 60 * 60));

    let temporalScore = 0.0;
    if (spanHours <= 24.0) {
      temporalScore = 100.0;
    } else if (spanHours <= 48.0) {
      temporalScore = 80.0;
    } else if (spanHours <= 168.0) { // 7 days
      temporalScore = 60.0;
    } else if (spanHours <= 720.0) { // 30 days
      temporalScore = 35.0;
    } else {
      temporalScore = 10.0;
    }

    // E. Extract Top Recurring Issue Terms
    const termFrequency: { [key: string]: number } = {};
    for (const item of cluster) {
      const combined = `${item.title} ${item.description}`.toLowerCase();
      const words = combined.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/);
      for (const w of words) {
        if (w.length > 2 && !this.stopWords.has(w)) {
          termFrequency[w] = (termFrequency[w] || 0) + 1;
        }
      }
    }

    const sortedTerms = Object.entries(termFrequency).sort((a, b) => b[1] - a[1]);
    const topRecurringTerms = sortedTerms.slice(0, 4).map((e) => e[0]);

    // F. Highest Priority among member reports
    let highestPriority: ComplaintPriority = 'low';
    const priorityRanks: { [key in ComplaintPriority]: number } = {
      urgent: 4,
      high: 3,
      medium: 2,
      low: 1,
    };

    for (const item of cluster) {
      if (priorityRanks[item.priority] > priorityRanks[highestPriority]) {
        highestPriority = item.priority;
      }
    }

    // G. Check for Active Hotspot Overlap (Phase 3C)
    let hasActiveHotspot = false;
    if (activeHotspots && activeHotspots.length > 0) {
      for (const h of activeHotspots) {
        if (h.classification === 'normal') continue;
        const distToHotspot = EmergingProblemEngine.calculateDistanceMeters(
          centerLatitude,
          centerLongitude,
          h.centerLatitude,
          h.centerLongitude
        );
        if (distToHotspot <= groupingRadiusMeters) {
          hasActiveHotspot = true;
          break;
        }
      }
    }

    // H. Signal Calculations (0 - 100 per component)
    // 1. Similarity Evidence Score (30% weight)
    const similarityEvidenceScore = Math.min(100, Math.max(0, avgSimilarity * 100.0));

    // 2. Spatial Concentration Score (25% weight)
    let spatialConcentrationScore = 0.0;
    if (affectedRadiusMeters <= 150.0) {
      spatialConcentrationScore = 100.0;
    } else if (affectedRadiusMeters <= 300.0) {
      spatialConcentrationScore = 80.0;
    } else if (affectedRadiusMeters <= groupingRadiusMeters) {
      spatialConcentrationScore = 60.0;
    } else {
      spatialConcentrationScore = 30.0;
    }

    // 3. Category Consistency Score (20% weight)
    let categoryConsistencyScore = 0.0;
    if (categoryRatio >= 0.90) {
      categoryConsistencyScore = 100.0;
    } else if (categoryRatio >= 0.70) {
      categoryConsistencyScore = 80.0;
    } else if (categoryRatio >= 0.50) {
      categoryConsistencyScore = 50.0;
    } else {
      categoryConsistencyScore = 20.0;
    }

    // 4. Temporal Consistency Score (15% weight)
    const temporalConsistencyScore = temporalScore;

    // 5. Cluster Size Contribution (10% weight)
    let clusterSizeScore = 0.0;
    if (cluster.length >= 8) {
      clusterSizeScore = 100.0;
    } else if (cluster.length >= 5) {
      clusterSizeScore = 85.0;
    } else if (cluster.length >= 3) {
      clusterSizeScore = 65.0;
    } else {
      clusterSizeScore = 45.0;
    }

    // Hotspot boost (+5 points if confirmed emerging hotspot)
    const hotspotBoost = hasActiveHotspot ? 5.0 : 0.0;

    // Composite Continuous Confidence Score (0 - 100)
    const rawConfidence =
      similarityEvidenceScore * this.weightSimilarityEvidence +
      spatialConcentrationScore * this.weightSpatialConcentration +
      categoryConsistencyScore * this.weightCategoryConsistency +
      temporalConsistencyScore * this.weightTemporalConsistency +
      clusterSizeScore * this.weightClusterSize +
      hotspotBoost;

    const incidentConfidence = Math.min(100.0, Math.max(0.0, rawConfidence));

    // I. Classification
    let classification: IncidentClassification;
    let levelLabel = '';
    let shortLabel = '';
    let badgeBg = '';
    let badgeBorder = '';
    let badgeText = '';
    let badgeColor = '';

    if (incidentConfidence >= this.thresholdHighConfidence) {
      classification = 'highConfidencePotentialIncident';
      levelLabel = 'High Confidence Potential Incident';
      shortLabel = 'Potential Incident';
      badgeBg = 'bg-purple-50';
      badgeBorder = 'border-purple-200';
      badgeText = 'text-purple-800';
      badgeColor = '#7C3AED';
    } else if (incidentConfidence >= this.thresholdPossibleIncident) {
      classification = 'possibleCommonIncident';
      levelLabel = 'Possible Common Incident';
      shortLabel = 'Possible Incident';
      badgeBg = 'bg-blue-50';
      badgeBorder = 'border-blue-200';
      badgeText = 'text-blue-800';
      badgeColor = '#1769D2';
    } else if (incidentConfidence >= this.thresholdWeakCluster) {
      classification = 'weakRelatedCluster';
      levelLabel = 'Weak Related Cluster';
      shortLabel = 'Related Cluster';
      badgeBg = 'bg-slate-50';
      badgeBorder = 'border-slate-200';
      badgeText = 'text-slate-700';
      badgeColor = '#526581';
    } else {
      classification = 'noIncidentGroup';
      levelLabel = 'No Incident Group';
      shortLabel = 'Distinct Issues';
      badgeBg = 'bg-slate-50';
      badgeBorder = 'border-slate-200';
      badgeText = 'text-slate-600';
      badgeColor = '#94A3B8';
    }

    // J. Human-Readable Potential Incident Label
    const incidentLabel = this.generateIncidentLabel(primaryCategory, primaryCategoryLabel, topRecurringTerms);

    // K. Explainable Reasons & Decision Drivers
    const reasons: string[] = [];
    const topDrivers: string[] = [];

    reasons.push(
      `${cluster.length} complaints concentrated within ~${Math.round(affectedRadiusMeters)}m radius`
    );
    topDrivers.push(`${cluster.length} complaints in ~${Math.round(affectedRadiusMeters)}m`);

    const pct = Math.round(categoryRatio * 100);
    reasons.push(`${pct}% of complaints belong to ${primaryCategoryLabel}`);
    if (categoryRatio >= 0.70) {
      topDrivers.push(`${pct}% ${primaryCategoryLabel}`);
    }

    if (topRecurringTerms.length > 0) {
      reasons.push(`Recurring issue terms: ${topRecurringTerms.slice(0, 3).join(', ')}`);
    }

    if (spanHours <= 24.0) {
      reasons.push(`All reports submitted within a ${spanHours.toFixed(1)}-hour window`);
      topDrivers.push(`Rapid ${spanHours.toFixed(1)}h surge`);
    } else {
      const days = (spanHours / 24.0).toFixed(1);
      reasons.push(`Reports submitted over ${days} days`);
    }

    if (avgSimilarity >= 0.60) {
      const simPct = Math.round(avgSimilarity * 100);
      reasons.push(`Strong multi-signal text and visual similarity (${simPct}% average)`);
      topDrivers.push(`${simPct}% Similarity match`);
    }

    if (highestPriority === 'urgent' || highestPriority === 'high') {
      reasons.push(`Contains high-priority / safety-critical citizen reports`);
      topDrivers.push('Safety / Priority concern');
    }

    if (hasActiveHotspot) {
      reasons.push(`Correlated with active Phase 3C emerging hotspot anomaly`);
      topDrivers.push('Active Hotspot overlap');
    }

    return {
      incidentId,
      memberComplaintIds: cluster.map((e) => e.id),
      primaryCategory,
      primaryCategoryLabel,
      incidentLabel,
      centerLatitude,
      centerLongitude,
      complaintCount: cluster.length,
      incidentConfidence,
      confidenceDisplay: `${Math.round(incidentConfidence)}/100`,
      classification,
      levelLabel,
      shortLabel,
      badgeBg,
      badgeBorder,
      badgeText,
      badgeColor,
      affectedRadiusMeters,
      earliestReportTime: earliest,
      latestReportTime: latest,
      timeSpanHours: spanHours,
      topRecurringTerms,
      highestPriority,
      hasActiveHotspot,
      explainableReasons: reasons,
      topDrivers,
      signalBreakdown: {
        similarityEvidence: similarityEvidenceScore,
        spatialConcentration: spatialConcentrationScore,
        categoryConsistency: categoryConsistencyScore,
        temporalConsistency: temporalConsistencyScore,
        clusterSize: clusterSizeScore,
        hotspotBoost,
      },
    };
  }

  /**
   * Generate safe, human-readable potential incident label without assuming unverified causes
   */
  public static generateIncidentLabel(
    category: string,
    categoryLabel: string,
    topTerms: string[]
  ): string {
    const catLower = (category + ' ' + categoryLabel).toLowerCase();

    if (catLower.includes('water') || catLower.includes('drainage') || catLower.includes('sewage')) {
      if (topTerms.some((t) => t.includes('leak') || t.includes('pipe') || t.includes('burst'))) {
        return 'Potential Water Supply & Pipeline Issue';
      } else if (topTerms.some((t) => t.includes('flood') || t.includes('drain') || t.includes('block') || t.includes('clog'))) {
        return 'Possible Drainage Overflow & Blockage Incident';
      }
      return 'Potential Water Infrastructure Incident';
    }

    if (catLower.includes('road') || catLower.includes('pavement') || catLower.includes('traffic')) {
      if (topTerms.some((t) => t.includes('pothole') || t.includes('crater') || t.includes('damage') || t.includes('crack'))) {
        return 'Possible Road Surface & Pothole Hazard';
      }
      return 'Potential Road Infrastructure Issue';
    }

    if (catLower.includes('electr') || catLower.includes('power') || catLower.includes('light')) {
      if (topTerms.some((t) => t.includes('wire') || t.includes('spark') || t.includes('pole') || t.includes('danger'))) {
        return 'Potential Electrical Safety Hazard';
      }
      return 'Possible Electrical Infrastructure Outage';
    }

    if (catLower.includes('waste') || catLower.includes('sanitat') || catLower.includes('garb') || catLower.includes('trash')) {
      return 'Possible Localized Sanitation & Waste Incident';
    }

    return `Potential Common ${categoryLabel || category} Incident`;
  }
}
