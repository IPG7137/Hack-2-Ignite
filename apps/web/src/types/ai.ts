export interface AIOperationalInsight {
  id: string;
  type: 'cluster_detected' | 'sla_breach_warning' | 'seasonal_surge' | 'duplicate_suppressed' | 'resource_bottleneck';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  explanationWhy: string;
  recommendedAction: string;
  affectedWard: string;
  relatedComplaintIds: string[];
  timestamp: string;
  acknowledged: boolean;
}

export interface CopilotMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: string;
  referencedComplaintIds?: string[];
  suggestedPrompts?: string[];
}

export interface MunicipalBriefingMetrics {
  totalComplaints: number;
  activeComplaints: number;
  resolvedComplaints: number;
  overdueComplaints: number;
  criticalPriorityCount: number;
  highPriorityCount: number;
  emergingHotspotsCount: number;
  potentialIncidentsCount: number;
  pendingVerificationCount: number;
  departmentDistribution: { [key: string]: number };
}

export interface GroundedMunicipalBriefing {
  id: string;
  timestamp: string;
  datasetSize: number;
  isAiGenerated: boolean;
  modelName: string;
  summary: string;
  markdownContent: string;
  referencedComplaintIds: string[];
  metrics: MunicipalBriefingMetrics;
  topDirectives: string[];
}

