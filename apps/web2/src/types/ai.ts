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
