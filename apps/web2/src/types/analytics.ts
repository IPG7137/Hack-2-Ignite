export interface KPISummary {
  totalComplaints: number;
  openComplaints: number;
  criticalComplaints: number;
  overdueComplaints: number;
  resolvedComplaints: number;
  verifiedComplaints: number;
  averageResolutionHours: number;
  slaComplianceRate: number; // percentage
  weeklySurgePercentage: number;
  activeFieldCrewsCount: number;
}

export interface CategoryDistribution {
  category: string;
  categoryLabel: string;
  count: number;
  color: string;
  slaRate: number;
}

export interface TrendDataPoint {
  date: string;
  submitted: number;
  resolved: number;
  slaBreached: number;
}

export interface WardPerformance {
  ward: string;
  zone: string;
  activeCount: number;
  resolvedCount: number;
  avgHours: number;
  slaPercentage: number;
  hotspotScore: number;
}
