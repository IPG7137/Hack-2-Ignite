import { Complaint } from '../types/complaint';
import { PriorityEngine } from './priorityEngine';

export type EmergingClassification =
  | 'criticalEmergingProblem'
  | 'emergingProblem'
  | 'watch'
  | 'normal';

export interface EmergingSignalBreakdown {
  volumeSpike: number;
  spatialDensity: number;
  categoryConsistency: number;
  prioritySafety: number;
}

export interface EmergingHotspotResult {
  id: string;
  category: string;
  categoryLabel: string;
  centerLatitude: number;
  centerLongitude: number;
  radiusMeters: number;
  reportIds: string[];
  complaintIds: string[];
  complaintCount: number;
  currentWindowCount: number;
  baselineDailyAverage: number;
  increaseRatio: number;
  emergingScore: number; // 0.0 - 100.0
  scoreDisplay: string; // e.g. "82/100"
  classification: EmergingClassification;
  levelLabel: string; // e.g. "Critical Emerging Problem"
  shortLabel: string; // e.g. "Critical Surge"
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  badgeColor: string;
  explainableReasons: string[];
  topDrivers: string[];
  signalBreakdown: EmergingSignalBreakdown;
  averageDistanceMeters: number;
  highPriorityCount: number;
}

interface ClusterItem {
  id: string;
  category: string;
  categoryLabel: string;
  latitude: number;
  longitude: number;
  createdAt: Date;
  priority?: string;
  title: string;
  description: string;
}

export class EmergingProblemEngine {
  // Explainable signal weights (Sum = 1.0)
  public static readonly weightVolumeSpike = 0.40;
  public static readonly weightSpatialDensity = 0.25;
  public static readonly weightCategoryConsistency = 0.20;
  public static readonly weightPrioritySafety = 0.15;

  // Thresholds for classification
  public static readonly thresholdCritical = 80.0;
  public static readonly thresholdEmerging = 60.0;
  public static readonly thresholdWatch = 40.0;

  // Default spatial cluster radius (500 meters)
  public static readonly defaultClusterRadiusMeters = 500.0;

  /**
   * Great-circle Haversine distance between two coordinate pairs in meters
   */
  public static calculateDistanceMeters(
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
   * Sanitizes and parses complaints with valid coordinates
   */
  private static parseComplaintItem(c: Complaint): ClusterItem | null {
    const lat = c.location?.latitude;
    const lng = c.location?.longitude;

    if (
      typeof lat !== 'number' ||
      typeof lng !== 'number' ||
      isNaN(lat) ||
      isNaN(lng) ||
      (lat === 0 && lng === 0) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      return null;
    }

    let createdAt = new Date(c.createdAt);
    if (isNaN(createdAt.getTime())) {
      createdAt = new Date();
    }

    return {
      id: c.id,
      category: c.rawCategory || c.category || 'general',
      categoryLabel: c.categoryLabel || c.category || 'General Incident',
      latitude: lat,
      longitude: lng,
      createdAt,
      priority: c.priority,
      title: c.title || '',
      description: c.description || '',
    };
  }

  /**
   * Primary entry point: Identifies emerging problem hotspots across a collection of live complaints
   */
  public static detectHotspots(
    complaints: Complaint[],
    options?: {
      referenceTime?: Date;
      currentWindowHours?: number;
      baselineDays?: number;
      clusterRadiusMeters?: number;
      minimumClusterSize?: number;
    }
  ): EmergingHotspotResult[] {
    if (!complaints || complaints.length === 0) return [];

    const refTime = options?.referenceTime ?? new Date();
    const currentWindowHours = options?.currentWindowHours ?? 24;
    const baselineDays = options?.baselineDays ?? 7;
    const clusterRadiusMeters = options?.clusterRadiusMeters ?? this.defaultClusterRadiusMeters;
    const minimumClusterSize = options?.minimumClusterSize ?? 2;

    // 1. Sanitize coordinate-valid complaints
    const items: ClusterItem[] = [];
    for (const c of complaints) {
      const parsed = this.parseComplaintItem(c);
      if (parsed) items.push(parsed);
    }

    if (items.length === 0) return [];

    // 2. Spatial clustering (Seed-expansion within clusterRadiusMeters)
    const spatialClusters: ClusterItem[][] = [];
    const assignedIds = new Set<string>();

    for (let i = 0; i < items.length; i++) {
      const seed = items[i];
      if (assignedIds.has(seed.id)) continue;

      const cluster: ClusterItem[] = [seed];
      assignedIds.add(seed.id);

      for (let j = 0; j < items.length; j++) {
        if (i === j) continue;
        const candidate = items[j];
        if (assignedIds.has(candidate.id)) continue;

        const dist = this.calculateDistanceMeters(
          seed.latitude,
          seed.longitude,
          candidate.latitude,
          candidate.longitude
        );

        if (dist <= clusterRadiusMeters) {
          cluster.push(candidate);
          assignedIds.add(candidate.id);
        }
      }

      if (cluster.length >= minimumClusterSize) {
        spatialClusters.push(cluster);
      }
    }

    // 3. Evaluate each cluster across multi-factor signals
    const results: EmergingHotspotResult[] = [];

    spatialClusters.forEach((cluster, idx) => {
      const hotspot = this.evaluateCluster(
        `HOTSPOT-${idx + 1}`,
        cluster,
        refTime,
        currentWindowHours,
        baselineDays,
        clusterRadiusMeters
      );
      if (hotspot) {
        results.push(hotspot);
      }
    });

    // Sort descending by emerging score
    results.sort((a, b) => b.emergingScore - a.emergingScore);
    return results;
  }

  /**
   * Evaluates an individual spatial cluster across category, time window, volume, and priority
   */
  private static evaluateCluster(
    id: string,
    cluster: ClusterItem[],
    refTime: Date,
    currentWindowHours: number,
    baselineDays: number,
    clusterRadiusMeters: number
  ): EmergingHotspotResult | null {
    if (cluster.length === 0) return null;

    // A. Geographic Centroid
    let sumLat = 0;
    let sumLng = 0;
    for (const item of cluster) {
      sumLat += item.latitude;
      sumLng += item.longitude;
    }
    const centerLatitude = sumLat / cluster.length;
    const centerLongitude = sumLng / cluster.length;

    // B. Average Distance to Centroid
    let sumDist = 0;
    for (const item of cluster) {
      sumDist += this.calculateDistanceMeters(
        centerLatitude,
        centerLongitude,
        item.latitude,
        item.longitude
      );
    }
    const averageDistanceMeters = sumDist / cluster.length;

    // C. Primary Category and Category Consistency
    const categoryCounts = new Map<string, { count: number; label: string }>();
    for (const item of cluster) {
      const existing = categoryCounts.get(item.category) || { count: 0, label: item.categoryLabel };
      existing.count++;
      categoryCounts.set(item.category, existing);
    }

    let primaryCategory = 'general';
    let primaryCategoryLabel = 'General Incident';
    let maxCategoryCount = 0;

    for (const [cat, data] of categoryCounts.entries()) {
      if (data.count > maxCategoryCount) {
        maxCategoryCount = data.count;
        primaryCategory = cat;
        primaryCategoryLabel = data.label;
      }
    }

    const categoryRatio = maxCategoryCount / cluster.length;

    // D. Time Window Analysis (Current 24h Window vs Historical 7-Day Baseline)
    const currentWindowStart = new Date(refTime.getTime() - currentWindowHours * 3600 * 1000);
    const baselineWindowStart = new Date(refTime.getTime() - baselineDays * 86400 * 1000);

    let currentWindowCount = 0;
    let baselineWindowCount = 0;

    for (const item of cluster) {
      if (item.createdAt >= currentWindowStart) {
        currentWindowCount++;
      } else if (item.createdAt >= baselineWindowStart) {
        baselineWindowCount++;
      }
    }

    // Daily historical baseline average (safe baseline fallback to prevent division by zero)
    const baselineDailyAverage =
      baselineDays > 0 && baselineWindowCount > 0
        ? baselineWindowCount / baselineDays
        : baselineWindowCount === 0 && currentWindowCount > 0
        ? 0.5
        : 1.0;

    // Increase ratio: Current 24h count compared to daily baseline rate
    const increaseRatio =
      currentWindowCount > 0
        ? currentWindowCount / (baselineDailyAverage > 0 ? baselineDailyAverage : 1.0)
        : 0.0;

    // E. Priority & Public Safety in Cluster
    let highPriorityCount = 0;
    for (const item of cluster) {
      const isHighPriority =
        item.priority?.toLowerCase() === 'high' ||
        item.priority?.toLowerCase() === 'urgent' ||
        item.priority?.toLowerCase() === 'critical';

      const publicSafetyScore = PriorityEngine.calculatePublicSafetyScore(
        item.category,
        item.title,
        item.description
      );

      if (isHighPriority || publicSafetyScore >= 75.0) {
        highPriorityCount++;
      }
    }
    const priorityRatio = highPriorityCount / cluster.length;

    // F. Signal Score Calculations (0 - 100 per component)
    // 1. Volume Spike Score (40% weight)
    let volumeSpikeScore = 0.0;
    if (currentWindowCount === 0) {
      volumeSpikeScore = 0.0;
    } else if (increaseRatio >= 4.0) {
      volumeSpikeScore = 100.0;
    } else if (increaseRatio >= 2.5) {
      volumeSpikeScore = 80.0;
    } else if (increaseRatio >= 1.5) {
      volumeSpikeScore = 60.0;
    } else if (increaseRatio >= 1.0) {
      volumeSpikeScore = 35.0;
    } else {
      volumeSpikeScore = 15.0;
    }

    // Volume magnitude scaling (a small cluster of 2 reports is not a mass surge)
    if (currentWindowCount === 1) {
      volumeSpikeScore = Math.min(volumeSpikeScore, 25.0);
    } else if (currentWindowCount === 2) {
      volumeSpikeScore = Math.min(volumeSpikeScore, 50.0);
    } else if (currentWindowCount <= 4) {
      volumeSpikeScore = volumeSpikeScore * 0.85;
    }

    // 2. Spatial Density Score (25% weight)
    let spatialDensityScore = 0.0;
    if (averageDistanceMeters <= 150.0) {
      spatialDensityScore = 100.0;
    } else if (averageDistanceMeters <= 300.0) {
      spatialDensityScore = 75.0;
    } else if (averageDistanceMeters <= clusterRadiusMeters) {
      spatialDensityScore = 50.0;
    } else {
      spatialDensityScore = 25.0;
    }

    // 3. Category Consistency Score (20% weight)
    let categoryConsistencyScore = 0.0;
    if (categoryRatio >= 0.90) {
      categoryConsistencyScore = 100.0;
    } else if (categoryRatio >= 0.75) {
      categoryConsistencyScore = 80.0;
    } else if (categoryRatio >= 0.50) {
      categoryConsistencyScore = 50.0;
    } else {
      categoryConsistencyScore = 25.0;
    }

    // 4. Priority & Public Safety Score (15% weight)
    let prioritySafetyScore = 0.0;
    if (priorityRatio >= 0.50) {
      prioritySafetyScore = 100.0;
    } else if (priorityRatio >= 0.25) {
      prioritySafetyScore = 75.0;
    } else if (highPriorityCount > 0) {
      prioritySafetyScore = 50.0;
    } else {
      prioritySafetyScore = 20.0;
    }

    // Composite Continuous Emerging Score (0 - 100)
    let emergingScore =
      volumeSpikeScore * this.weightVolumeSpike +
      spatialDensityScore * this.weightSpatialDensity +
      categoryConsistencyScore * this.weightCategoryConsistency +
      prioritySafetyScore * this.weightPrioritySafety;

    // If no reports in the current active window, cluster is inactive historical
    if (currentWindowCount === 0) {
      emergingScore = emergingScore * 0.35;
    }

    const boundedScore = Math.max(0.0, Math.min(100.0, emergingScore));

    // G. Classification & Styling
    let classification: EmergingClassification;
    let levelLabel: string;
    let shortLabel: string;
    let badgeBg: string;
    let badgeBorder: string;
    let badgeText: string;
    let badgeColor: string;

    if (boundedScore >= this.thresholdCritical) {
      classification = 'criticalEmergingProblem';
      levelLabel = 'Critical Emerging Problem';
      shortLabel = 'Critical Surge';
      badgeBg = 'bg-red-50';
      badgeBorder = 'border-red-200';
      badgeText = 'text-red-700';
      badgeColor = '#D92D20';
    } else if (boundedScore >= this.thresholdEmerging) {
      classification = 'emergingProblem';
      levelLabel = 'Emerging Problem';
      shortLabel = 'Emerging Hotspot';
      badgeBg = 'bg-orange-50';
      badgeBorder = 'border-orange-200';
      badgeText = 'text-orange-700';
      badgeColor = '#EA580C';
    } else if (boundedScore >= this.thresholdWatch) {
      classification = 'watch';
      levelLabel = 'Watch / Activity Increase';
      shortLabel = 'Watch';
      badgeBg = 'bg-amber-50';
      badgeBorder = 'border-amber-200';
      badgeText = 'text-amber-700';
      badgeColor = '#D99A00';
    } else {
      classification = 'normal';
      levelLabel = 'Normal Activity';
      shortLabel = 'Normal';
      badgeBg = 'bg-blue-50';
      badgeBorder = 'border-blue-200';
      badgeText = 'text-blue-700';
      badgeColor = '#1769D2';
    }

    // H. Professional Explainable Reasons & Decision Drivers
    const reasons: string[] = [];
    const topDrivers: string[] = [];

    if (currentWindowCount > 0) {
      reasons.push(
        `${currentWindowCount} recent complaints reported in the last ${currentWindowHours} hours`
      );
    }
    if (baselineWindowCount > 0) {
      reasons.push(
        `Normal baseline activity is ~${baselineDailyAverage.toFixed(1)} complaints/day`
      );
    } else {
      reasons.push('Limited historical baseline data available in this zone');
    }

    if (increaseRatio >= 1.5) {
      reasons.push(
        `${increaseRatio.toFixed(1)}× complaint volume increase compared with recent baseline`
      );
      topDrivers.push(`${increaseRatio.toFixed(1)}× Activity Spike`);
    }

    reasons.push(
      `${cluster.length} complaints concentrated within ~${Math.round(averageDistanceMeters)}m radius`
    );
    if (averageDistanceMeters <= 200) {
      topDrivers.push(`High Spatial Density (~${Math.round(averageDistanceMeters)}m)`);
    }

    if (categoryRatio >= 0.70) {
      const pct = Math.round(categoryRatio * 100);
      reasons.push(`${pct}% of complaints belong to ${primaryCategoryLabel}`);
      topDrivers.push(`Strong ${primaryCategoryLabel} Consistency`);
    }

    if (highPriorityCount > 0) {
      reasons.push(
        `${highPriorityCount} high-priority / safety concern ${
          highPriorityCount === 1 ? 'report' : 'reports'
        } in hotspot`
      );
      topDrivers.push('Safety / High Priority Signal');
    }

    if (topDrivers.length === 0) {
      topDrivers.push('Spatial Concentration');
    }

    return {
      id,
      category: primaryCategory,
      categoryLabel: primaryCategoryLabel,
      centerLatitude,
      centerLongitude,
      radiusMeters: clusterRadiusMeters,
      reportIds: cluster.map((e) => e.id),
      complaintIds: cluster.map((e) => e.id),
      complaintCount: cluster.length,
      currentWindowCount,
      baselineDailyAverage,
      increaseRatio,
      emergingScore: boundedScore,
      scoreDisplay: `${Math.round(boundedScore)}/100`,
      classification,
      levelLabel,
      shortLabel,
      badgeBg,
      badgeBorder,
      badgeText,
      badgeColor,
      explainableReasons: reasons,
      topDrivers,
      signalBreakdown: {
        volumeSpike: volumeSpikeScore,
        spatialDensity: spatialDensityScore,
        categoryConsistency: categoryConsistencyScore,
        prioritySafety: prioritySafetyScore,
      },
      averageDistanceMeters,
      highPriorityCount,
    };
  }

  /**
   * Retrieves all full Complaint objects contributing to a given Hotspot
   */
  public static getContributingComplaints(
    hotspot: EmergingHotspotResult,
    allComplaints: Complaint[]
  ): Complaint[] {
    if (!hotspot || !allComplaints) return [];
    const idSet = new Set<string>([
      ...(hotspot.complaintIds || []),
      ...(hotspot.reportIds || []),
    ]);

    return allComplaints.filter((c) => {
      if (idSet.has(c.id)) return true;
      if (c.dbId && idSet.has(String(c.dbId))) return true;
      return false;
    });
  }

  /**
   * Generates geodesic circle polygon coordinates (lng, lat pairs) around a center point
   * Suitable for MapLibre / Leaflet polygon boundaries (standard GeoJSON format: [longitude, latitude])
   */
  public static generateCircleCoordinates(
    centerLat: number,
    centerLng: number,
    radiusMeters: number,
    numPoints: number = 32
  ): [number, number][] {
    const coords: [number, number][] = [];
    const earthRadius = 6371000;
    const latRad = (centerLat * Math.PI) / 180;
    const lngRad = (centerLng * Math.PI) / 180;
    const dDivR = radiusMeters / earthRadius;

    for (let i = 0; i <= numPoints; i++) {
      const angle = (i * 2 * Math.PI) / numPoints;
      const pointLatRad = Math.asin(
        Math.sin(latRad) * Math.cos(dDivR) +
          Math.cos(latRad) * Math.sin(dDivR) * Math.cos(angle)
      );
      const pointLngRad =
        lngRad +
        Math.atan2(
          Math.sin(angle) * Math.sin(dDivR) * Math.cos(latRad),
          Math.cos(dDivR) - Math.sin(latRad) * Math.sin(pointLatRad)
        );

      const lat = (pointLatRad * 180) / Math.PI;
      const lng = (pointLngRad * 180) / Math.PI;
      coords.push([lng, lat]);
    }

    return coords;
  }

  /**
   * Produces a standard GeoJSON FeatureCollection representing all detected hotspots
   */
  public static generateGeoJSON(hotspots: EmergingHotspotResult[]): {
    type: 'FeatureCollection';
    features: Array<{
      type: 'Feature';
      geometry: {
        type: 'Polygon';
        coordinates: [number, number][][];
      };
      properties: {
        id: string;
        category: string;
        categoryLabel: string;
        score: number;
        classification: string;
        complaintCount: number;
        centerLat: number;
        centerLng: number;
        radiusMeters: number;
      };
    }>;
  } {
    return {
      type: 'FeatureCollection',
      features: (hotspots || []).map((h) => ({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            EmergingProblemEngine.generateCircleCoordinates(
              h.centerLatitude,
              h.centerLongitude,
              h.radiusMeters || 500
            ),
          ],
        },
        properties: {
          id: h.id,
          category: h.category,
          categoryLabel: h.categoryLabel,
          score: h.emergingScore,
          classification: h.classification,
          complaintCount: h.complaintCount,
          centerLat: h.centerLatitude,
          centerLng: h.centerLongitude,
          radiusMeters: h.radiusMeters || 500,
        },
      })),
    };
  }
}

