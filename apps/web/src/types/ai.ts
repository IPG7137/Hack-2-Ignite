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

export interface CopilotActionProposal {
  type: 'create_complaint' | 'change_priority' | 'assign_officer' | 'reopen_complaint';
  title: string;
  payload: {
    category?: string;
    secondaryIssue?: string;
    description?: string;
    location?: string;
    priority?: string;
    evidenceRecommended?: string;
    assignedOfficer?: string;
    department?: string;
  };
  confirmed?: boolean;
}

export interface CopilotMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: string;
  referencedComplaintIds?: string[];
  suggestedPrompts?: string[];
  actionProposal?: CopilotActionProposal;
  similarComplaints?: Array<{
    id: string;
    title: string;
    category: string;
    location: string;
    status: string;
    similarityScore?: number;
  }>;
  groundedSources?: {
    datasetCount: number;
    district: string;
    timestamp: string;
    lastUpdated?: string;
  };
  uncertaintyNote?: string;
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

