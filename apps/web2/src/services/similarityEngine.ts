import { Complaint } from '../types/complaint';

export type SimilarityClassification =
  | 'highConfidenceDuplicate'
  | 'relatedIncident'
  | 'unrelated';

export interface SimilarityAnalysisResult {
  candidateComplaint: Complaint;
  candidateId: string;
  distanceMeters: number | null;
  locationScore: number;
  categoryScore: number;
  textScore: number;
  temporalScore: number;
  totalConfidence: number;
  classification: SimilarityClassification;
  displayLabel: string;
  shortLabel: string;
  explainableReasons: string[];
}

export class SimilarityEngine {
  // Explainable signal weights (Sum = 1.0)
  public static readonly weightLocation = 0.30;
  public static readonly weightCategory = 0.25;
  public static readonly weightText = 0.30;
  public static readonly weightTime = 0.15;

  // Thresholds for recommendations
  public static readonly thresholdHighConfidence = 0.75;
  public static readonly thresholdRelatedIncident = 0.50;

  // Common Indian English and municipal stop words for lexical token cleansing
  private static readonly stopWords = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he',
    'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'were',
    'will', 'with', 'there', 'this', 'near', 'area', 'please', 'complaint',
    'issue', 'problem', 'sir', 'madam', 'road', 'street', 'colony', 'nagar',
    'ward', 'very', 'much', 'daily', 'urgent', 'kindly', 'help'
  ]);

  /**
   * Calculates geodesic distance between two coordinate pairs in meters (Haversine formula)
   */
  public static calculateHaversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371000; // Earth radius in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Calculates continuous location score with quadratic distance decay.
   * Baseline max radius: 500m (at 0m -> 1.0, 100m -> 0.96, 200m -> 0.84, >500m -> 0.0)
   */
  public static calculateLocationScore(
    distanceMeters: number | null,
    maxRadiusMeters: number = 500.0
  ): number {
    if (distanceMeters === null || isNaN(distanceMeters) || distanceMeters < 0) return 0.0;
    if (distanceMeters === 0) return 1.0;
    if (distanceMeters > maxRadiusMeters) return 0.0;

    const normalized = distanceMeters / maxRadiusMeters;
    const score = 1.0 - normalized * normalized;
    return Math.max(0.0, Math.min(1.0, score));
  }

  /**
   * Calculates category match score.
   * Exact match = 1.0, substring match = 0.85, domain equivalence = 0.70, distinct = 0.0
   */
  public static calculateCategoryScore(cat1?: string | null, cat2?: string | null): number {
    if (!cat1 || !cat2) return 0.0;
    const c1 = cat1.trim().toLowerCase();
    const c2 = cat2.trim().toLowerCase();
    if (!c1 || !c2) return 0.0;

    if (c1 === c2) return 1.0;

    // Substring / partial match
    if (c1.includes(c2) || c2.includes(c1)) return 0.85;

    // Domain equivalence groups
    if (this.areInSameDomain(c1, c2)) return 0.70;

    return 0.0;
  }

  private static areInSameDomain(c1: string, c2: string): boolean {
    const domainGroups = [
      ['road', 'pavement', 'traffic', 'footpath', 'pothole', 'street'],
      ['water', 'drainage', 'pipeline', 'leakage', 'sewage', 'manhole'],
      ['electricity', 'streetlight', 'pole', 'power', 'transformer', 'lighting'],
      ['waste', 'garbage', 'sanitation', 'debris', 'cleaning', 'cleanliness'],
      ['safety', 'police', 'fire', 'emergency', 'hazard', 'encroachment'],
      ['park', 'tree', 'green', 'horticulture', 'garden'],
    ];

    for (const group of domainGroups) {
      const c1Match = group.some((kw) => c1.includes(kw));
      const c2Match = group.some((kw) => c2.includes(kw));
      if (c1Match && c2Match) return true;
    }
    return false;
  }

  /**
   * Tokenizes, cleanses, and computes lexical Jaccard similarity between two texts
   */
  public static calculateTextSimilarity(text1?: string | null, text2?: string | null): number {
    if (!text1 || !text2) return 0.0;
    const tokens1 = this.tokenizeAndClean(text1);
    const tokens2 = this.tokenizeAndClean(text2);

    if (tokens1.size === 0 || tokens2.size === 0) return 0.0;

    let intersectionCount = 0;
    for (const t of tokens1) {
      if (tokens2.has(t)) {
        intersectionCount++;
      }
    }

    const unionSize = new Set([...tokens1, ...tokens2]).size;
    if (unionSize === 0) return 0.0;
    return intersectionCount / unionSize;
  }

  private static tokenizeAndClean(rawText: string): Set<string> {
    const cleaned = rawText
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .trim();

    const rawTokens = cleaned.split(/\s+/);
    const result = new Set<string>();

    for (const token of rawTokens) {
      if (token.length >= 3 && !this.stopWords.has(token)) {
        result.add(token);
      }
    }
    return result;
  }

  /**
   * Calculates temporal recency score with exponential decay
   */
  public static calculateTemporalScore(time1?: Date | string | null, time2?: Date | string | null): number {
    if (!time1 || !time2) return 0.5; // Neutral baseline

    const d1 = typeof time1 === 'string' ? new Date(time1) : time1;
    const d2 = typeof time2 === 'string' ? new Date(time2) : time2;

    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 0.5;

    const diffSeconds = Math.abs((d1.getTime() - d2.getTime()) / 1000);
    const diffHours = diffSeconds / 3600.0;

    if (diffHours <= 6) return 1.0;
    if (diffHours <= 24) return 0.85;
    if (diffHours <= 72) return 0.65;
    if (diffHours <= 168) return 0.45; // 7 days
    if (diffHours <= 720) return 0.20; // 30 days
    return 0.05; // Older than 30 days
  }

  /**
   * Evaluates full multi-signal Phase 3A similarity between a target complaint and candidate complaint
   */
  public static evaluateSimilarity(
    target: Complaint,
    candidate: Complaint
  ): SimilarityAnalysisResult {
    // 1. Location score
    let distanceMeters: number | null = null;
    const targetLoc = target.location;
    const candLoc = candidate.location;

    if (
      typeof targetLoc.latitude === 'number' &&
      typeof targetLoc.longitude === 'number' &&
      typeof candLoc.latitude === 'number' &&
      typeof candLoc.longitude === 'number' &&
      !isNaN(targetLoc.latitude) &&
      !isNaN(targetLoc.longitude) &&
      !isNaN(candLoc.latitude) &&
      !isNaN(candLoc.longitude) &&
      !(targetLoc.latitude === 0 && targetLoc.longitude === 0) &&
      !(candLoc.latitude === 0 && candLoc.longitude === 0)
    ) {
      distanceMeters = this.calculateHaversineDistance(
        targetLoc.latitude,
        targetLoc.longitude,
        candLoc.latitude,
        candLoc.longitude
      );
    }

    const locationScore = this.calculateLocationScore(distanceMeters);

    // 2. Category score
    const categoryScore = this.calculateCategoryScore(
      target.rawCategory || target.category,
      candidate.rawCategory || candidate.category
    );

    // 3. Text score (Title + Description)
    const targetText = `${target.title || ''} ${target.description || ''}`.trim();
    const candidateText = `${candidate.title || ''} ${candidate.description || ''}`.trim();
    const textScore = this.calculateTextSimilarity(targetText, candidateText);

    // 4. Temporal score
    const temporalScore = this.calculateTemporalScore(target.createdAt, candidate.createdAt);

    // 5. Total composite confidence
    const totalConfidence =
      locationScore * this.weightLocation +
      categoryScore * this.weightCategory +
      textScore * this.weightText +
      temporalScore * this.weightTime;

    const normalizedTotal = Math.max(0.0, Math.min(1.0, totalConfidence));

    // 6. Classification & terminology
    let classification: SimilarityClassification;
    let displayLabel: string;
    let shortLabel: string;

    if (normalizedTotal >= this.thresholdHighConfidence) {
      classification = 'highConfidenceDuplicate';
      displayLabel = `Potential Duplicate — ${Math.round(normalizedTotal * 100)}% Similarity`;
      shortLabel = 'Potential Duplicate';
    } else if (normalizedTotal >= this.thresholdRelatedIncident) {
      classification = 'relatedIncident';
      displayLabel = `Possible Related Complaint — ${Math.round(normalizedTotal * 100)}% Similarity`;
      shortLabel = 'Related Incident';
    } else {
      classification = 'unrelated';
      displayLabel = `Unrelated Issue — ${Math.round(normalizedTotal * 100)}% Similarity`;
      shortLabel = 'Distinct Issue';
    }

    // 7. Explainable multi-signal reasons
    const reasons: string[] = [];
    if (distanceMeters !== null) {
      if (distanceMeters <= 30) {
        reasons.push(`Exact geographic match (~${Math.round(distanceMeters)}m away)`);
      } else if (distanceMeters <= 200) {
        reasons.push(`Close neighborhood proximity (${Math.round(distanceMeters)}m away)`);
      } else if (distanceMeters <= 500) {
        reasons.push(`Within 500m vicinity (${Math.round(distanceMeters)}m away)`);
      }
    }

    if (categoryScore >= 0.85) {
      reasons.push(`Matching category (${candidate.categoryLabel || candidate.category})`);
    } else if (categoryScore >= 0.70) {
      reasons.push('Related municipal infrastructure domain');
    }

    if (textScore >= 0.35) {
      reasons.push(`High textual similarity (${Math.round(textScore * 100)}% keyword overlap)`);
    } else if (textScore >= 0.15) {
      reasons.push('Shared descriptive grievance keywords');
    }

    if (temporalScore >= 0.85) {
      reasons.push('Reported recently (within 24 hours)');
    } else if (temporalScore >= 0.65) {
      reasons.push('Reported within the last 3 days');
    }

    return {
      candidateComplaint: candidate,
      candidateId: candidate.id,
      distanceMeters,
      locationScore,
      categoryScore,
      textScore,
      temporalScore,
      totalConfidence: normalizedTotal,
      classification,
      displayLabel,
      shortLabel,
      explainableReasons: reasons,
    };
  }

  /**
   * Finds and ranks all related complaints for a given target report from a collection of complaints.
   * Excludes self comparison and filters by minimum confidence threshold (default 0.50).
   */
  public static findRelatedComplaints(
    target: Complaint,
    allComplaints: Complaint[],
    options?: { limit?: number; minConfidence?: number }
  ): SimilarityAnalysisResult[] {
    const minConfidence = options?.minConfidence ?? this.thresholdRelatedIncident;
    const limit = options?.limit ?? 10;

    const results: SimilarityAnalysisResult[] = [];

    for (const candidate of allComplaints) {
      // Exclude self comparison
      if (candidate.id === target.id || candidate.dbId === target.dbId) {
        continue;
      }

      const evalResult = this.evaluateSimilarity(target, candidate);
      if (evalResult.totalConfidence >= minConfidence) {
        results.push(evalResult);
      }
    }

    // Rank highest similarity first
    results.sort((a, b) => b.totalConfidence - a.totalConfidence);

    return results.slice(0, limit);
  }

  /**
   * Quick summary helper for table/card badges
   */
  public static getRelatedCandidatesSummary(
    target: Complaint,
    allComplaints: Complaint[]
  ): { count: number; highestConfidence: number; topClassification: SimilarityClassification } | null {
    const related = this.findRelatedComplaints(target, allComplaints, { limit: 5, minConfidence: this.thresholdRelatedIncident });
    if (related.length === 0) return null;

    return {
      count: related.length,
      highestConfidence: related[0].totalConfidence,
      topClassification: related[0].classification,
    };
  }
}
