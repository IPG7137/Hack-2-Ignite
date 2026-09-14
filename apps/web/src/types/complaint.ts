export type ComplaintStatus =
  | 'submitted'
  | 'under_review'
  | 'assigned'
  | 'in_progress'
  | 'resolution_submitted'
  | 'resolved'
  | 'verified'
  | 'closed'
  | 'rejected';

export const CANONICAL_STATUS_LIST: readonly ComplaintStatus[] = [
  'submitted',
  'under_review',
  'assigned',
  'in_progress',
  'resolution_submitted',
  'resolved',
  'verified',
  'closed',
  'rejected',
];

export type ComplaintPriority = 'low' | 'medium' | 'high' | 'urgent';

export type IncidentCategory =
  | 'roads'
  | 'drainage'
  | 'waste_management'
  | 'streetlights'
  | 'water_sewage'
  | 'public_safety'
  | 'parks';

export interface IncidentLocation {
  address: string;
  landmark: string;
  ward: string;
  zone: string;
  latitude: number;
  longitude: number;
}

export interface ReporterInfo {
  name: string;
  phone: string;
  aadharMasked: string;
  verifiedCitizen: boolean;
}

export interface OfficerAssignment {
  officerId: string;
  officerName: string;
  departmentId: string;
  departmentName: string;
  contractorName?: string;
  assignedAt: string;
}

export interface StatusHistoryItem {
  id: string;
  fromStatus?: ComplaintStatus;
  toStatus: ComplaintStatus;
  changedBy: string;
  role: 'citizen' | 'officer' | 'contractor' | 'system';
  timestamp: string;
  notes?: string;
  proofImageUrl?: string;
}

export interface ComplaintImageEvidence {
  before: string[];
  after?: string[];
}

export interface AIClassification {
  detectedCategory: IncidentCategory;
  suggestedPriority: ComplaintPriority;
  confidenceScore: number;
  hazardKeywords: string[];
  summary: string;
  clusterAnomalyDetected: boolean;
  duplicateDistanceMeters?: number;
  similarPastReportId?: string;
}

export interface Complaint {
  id: string; // Formatted ID, e.g. "CR-2026-104"
  dbId: number; // Raw integer ID corresponding to Supabase
  title: string;
  description: string;
  category: IncidentCategory;
  categoryLabel: string;
  rawCategory?: string;
  location: IncidentLocation;
  status: ComplaintStatus;
  rawStatus?: string;
  priority: ComplaintPriority;
  reporter: ReporterInfo;
  assignment?: OfficerAssignment;
  evidence: ComplaintImageEvidence;
  statusHistory: StatusHistoryItem[];
  adminNotes: Array<{
    id: string;
    author: string;
    text: string;
    createdAt: string;
    isInternal: boolean;
  }>;
  aiClassification?: AIClassification;
  sla: {
    targetHours: number;
    hoursRemaining: number;
    slaStatus: 'on_track' | 'warning' | 'breached';
    deadline: string;
    isOverdue: boolean;
  };
  upvotesCount: number;
  isDuplicateCluster: boolean;
  clusterGroupId?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  closedAt?: string;
  citizenFeedback?: {
    rating: number; // 1-5
    comment: string;
    satisfied: boolean;
  };
}
