/**
 * SLA Management and Rules Types for CIVICRESOLVE
 */

import { IncidentCategory, ComplaintPriority, ComplaintStatus } from './complaint';

export type SLAState =
  | 'NOT_STARTED'
  | 'ON_TRACK'
  | 'DUE_SOON'
  | 'OVERDUE'
  | 'RESOLVED'
  | 'CLOSED'
  | 'NOT_CONFIGURED';

export type EscalationLevel = 1 | 2 | 3 | 4;

export interface SLARule {
  id: string;
  organizationType: 'STATE' | 'DISTRICT' | 'MUNICIPAL_CORPORATION';
  districtId?: string | null;
  municipalCorporationId?: string | null;
  departmentId?: string | null;
  category: IncidentCategory | 'all';
  priority: ComplaintPriority | 'all';
  durationHours: number;
  dueSoonHours: number; // e.g., 6 hours or 25% of SLA
  escalationThresholdHours: number; // hours after breach for Tier 4 escalation
  isActive: boolean;
  penaltyAmountPerHour?: number;
  escalationRecipients?: string[];
  description?: string;
}

export interface ComplaintSLAEvaluation {
  complaintId: string;
  category: IncidentCategory;
  priority: ComplaintPriority;
  createdAt: string;
  assignedAt?: string | null;
  currentStatus: ComplaintStatus;
  slaConfigured: boolean;
  slaDurationHours: number | null;
  slaDueAt: string | null;
  remainingTimeHours: number | null;
  overdueDurationHours: number | null;
  slaState: SLAState;
  escalationLevel: EscalationLevel;
  escalationReason?: string;
  isBreached: boolean;
  formattedDueAt?: string;
}
