/**
 * Smart Alerts & Incident Intelligence Types for CIVICRESOLVE
 */

import { IncidentCategory, ComplaintPriority, ComplaintStatus } from './complaint';
import { EscalationLevel } from './sla';

export type AlertSeverity = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type AlertType =
  | 'CRITICAL_COMPLAINT'
  | 'SLA_DUE_SOON'
  | 'SLA_OVERDUE'
  | 'COMPLAINT_SPIKE'
  | 'GEOGRAPHIC_CLUSTER'
  | 'REPEATED_AREA_ISSUE'
  | 'OPERATIONAL_EVENT';

export type AlertStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';

export interface SmartAlertLocation {
  address: string;
  ward: string;
  zone?: string;
  latitude: number;
  longitude: number;
}

export interface SmartAlert {
  id: string;
  fingerprint: string; // Unique deduplication hash
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  districtId: string;
  districtName: string;
  municipalCorporationId?: string | null;
  municipalCorporationName?: string | null;
  departmentId?: string | null;
  departmentName?: string | null;
  complaintId?: string | null;
  clusterId?: string | null;
  category?: IncidentCategory;
  priority?: ComplaintPriority;
  complaintStatus?: ComplaintStatus;
  location?: SmartAlertLocation;
  createdAt: string;
  updatedAt: string;
  status: AlertStatus;
  acknowledgedBy?: string | null;
  acknowledgedAt?: string | null;
  acknowledgementNotes?: string | null;
  resolvedBy?: string | null;
  resolvedAt?: string | null;
  escalationLevel: EscalationLevel;
  escalationReason?: string;
  recommendedAction: string;
  metadata?: {
    remainingHours?: number;
    overdueHours?: number;
    dueAt?: string;
    complaintCount?: number;
    unresolvedCount?: number;
    resolvedCount?: number;
    surgeRatio?: number;
    timeWindowHours?: number;
    categories?: string[];
    [key: string]: any;
  };
}

export interface AlertAcknowledgementRequest {
  alertId: string;
  acknowledgedBy: string;
  role: string;
  notes?: string;
}

export interface AlertEscalationRequest {
  alertId: string;
  escalatedBy: string;
  targetLevel: EscalationLevel;
  reason: string;
  targetRole?: string;
}

export interface AlertFilterParams {
  severity?: AlertSeverity | 'all';
  type?: AlertType | 'all';
  status?: AlertStatus | 'all';
  districtId?: string;
  municipalCorporationId?: string;
  departmentId?: string;
  search?: string;
  timeRange?: 'all' | 'today' | '24h' | '7d' | '30d';
}

export interface AlertStatsSummary {
  totalActive: number;
  criticalCount: number;
  highCount: number;
  slaBreaches: number;
  slaDueSoon: number;
  complaintSpikes: number;
  geographicClusters: number;
  unacknowledgedCount: number;
  acknowledgedCount: number;
}
