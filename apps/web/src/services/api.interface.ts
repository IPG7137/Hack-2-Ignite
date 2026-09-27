import { Complaint, ComplaintStatus, ComplaintPriority, IncidentCategory } from '../types/complaint';
import { Department, WardInfo } from '../types/department';
import { FieldTeam } from '../types/officer';
import { KPISummary, CategoryDistribution, TrendDataPoint, WardPerformance } from '../types/analytics';
import { AIOperationalInsight, CopilotMessage } from '../types/ai';

export interface ComplaintFilterParams {
  category?: IncidentCategory | 'all';
  status?: ComplaintStatus | 'all';
  priority?: ComplaintPriority | 'all';
  ward?: string | 'all';
  search?: string;
  isOverdueOnly?: boolean;
  sortBy?: 'priority' | 'createdAt' | 'slaDeadline' | 'upvotes';
  sortOrder?: 'asc' | 'desc';
  organizationType?: string;
  districtId?: string;
  corporationId?: string;
}

import { JointActionRequest, JointActionResult, IncidentClusterRecord } from './incidentGroupingEngine';

export interface IComplaintService {
  getComplaints(filters?: ComplaintFilterParams): Promise<Complaint[]>;
  getComplaintById(id: string): Promise<Complaint | null>;
  updateStatus(id: string, newStatus: ComplaintStatus, officerName: string, notes?: string, proofImageUrl?: string): Promise<Complaint>;
  addAdminNote(id: string, author: string, text: string, isInternal?: boolean): Promise<Complaint>;
  assignOfficer(id: string, officerName: string, departmentName: string, contractorName?: string): Promise<Complaint>;
  changePriority(id: string, newPriority: ComplaintPriority, actorName: string, reason?: string): Promise<Complaint>;
  submitResolution(id: string, officerName: string, resolutionNotes: string, proofImageUrl?: string): Promise<Complaint>;
  submitCitizenVerification(id: string, satisfied: boolean, comment?: string, reopenReason?: string, proofPhotoUrl?: string): Promise<Complaint>;
  reopenComplaint(id: string, actorName: string, reason: string, proofUrl?: string): Promise<Complaint>;
  createJointAction(req: JointActionRequest): Promise<JointActionResult>;
  getIncidentClusters(): Promise<IncidentClusterRecord[]>;
}

export interface IAnalyticsService {
  getKPISummary(): Promise<KPISummary>;
  getCategoryDistributions(): Promise<CategoryDistribution[]>;
  getTrendData(): Promise<TrendDataPoint[]>;
  getWardPerformances(): Promise<WardPerformance[]>;
}

import { CopilotSecurityContext } from './copilotService';

export interface IAIService {
  getOperationalInsights(): Promise<AIOperationalInsight[]>;
  acknowledgeInsight(id: string): Promise<void>;
  askCopilot(question: string, contextComplaints: Complaint[], securityContext?: CopilotSecurityContext): Promise<CopilotMessage>;
}

export interface IDepartmentService {
  getDepartments(): Promise<Department[]>;
  getWards(): Promise<WardInfo[]>;
  getFieldTeams(): Promise<FieldTeam[]>;
}
