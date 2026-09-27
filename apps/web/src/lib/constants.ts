import { ComplaintStatus, ComplaintPriority, IncidentCategory } from '../types/complaint';

export const COMPLAINT_STATUS_CONFIG: Record<
  ComplaintStatus,
  { label: string; color: string; badgeBg: string; badgeBorder: string; badgeText: string; stepIndex: number }
> = {
  submitted: {
    label: 'Submitted',
    color: '#D99A00',
    badgeBg: 'bg-amber-50',
    badgeBorder: 'border-amber-200',
    badgeText: 'text-amber-800',
    stepIndex: 1,
  },
  under_review: {
    label: 'Under Review',
    color: '#1769D2',
    badgeBg: 'bg-blue-50',
    badgeBorder: 'border-blue-200',
    badgeText: 'text-blue-800',
    stepIndex: 2,
  },
  assigned: {
    label: 'Assigned',
    color: '#7C3AED',
    badgeBg: 'bg-purple-50',
    badgeBorder: 'border-purple-200',
    badgeText: 'text-purple-800',
    stepIndex: 3,
  },
  in_progress: {
    label: 'In Progress',
    color: '#EA580C',
    badgeBg: 'bg-orange-50',
    badgeBorder: 'border-orange-200',
    badgeText: 'text-orange-800',
    stepIndex: 4,
  },
  resolution_submitted: {
    label: 'Resolution Evidence',
    color: '#2563EB',
    badgeBg: 'bg-sky-50',
    badgeBorder: 'border-sky-200',
    badgeText: 'text-sky-800',
    stepIndex: 5,
  },
  resolved: {
    label: 'Resolved',
    color: '#16803C',
    badgeBg: 'bg-emerald-50',
    badgeBorder: 'border-emerald-200',
    badgeText: 'text-emerald-800',
    stepIndex: 5,
  },
  citizen_verification: {
    label: 'Citizen Verification',
    color: '#0D9488',
    badgeBg: 'bg-teal-50',
    badgeBorder: 'border-teal-200',
    badgeText: 'text-teal-800',
    stepIndex: 6,
  },
  verified: {
    label: 'Verified & Closed',
    color: '#0D9488',
    badgeBg: 'bg-teal-50',
    badgeBorder: 'border-teal-200',
    badgeText: 'text-teal-800',
    stepIndex: 7,
  },
  closed: {
    label: 'Closed',
    color: '#526581',
    badgeBg: 'bg-slate-100',
    badgeBorder: 'border-slate-300',
    badgeText: 'text-slate-700',
    stepIndex: 7,
  },
  reopened: {
    label: 'Reopened / In Progress',
    color: '#DC2626',
    badgeBg: 'bg-red-50',
    badgeBorder: 'border-red-200',
    badgeText: 'text-red-800',
    stepIndex: 4,
  },
  rejected: {
    label: 'Rejected',
    color: '#D92D20',
    badgeBg: 'bg-rose-50',
    badgeBorder: 'border-rose-200',
    badgeText: 'text-rose-800',
    stepIndex: 7,
  },
};

export const NEXT_VALID_STATUS: Record<ComplaintStatus, ComplaintStatus | null> = {
  submitted: 'under_review',
  under_review: 'assigned',
  assigned: 'in_progress',
  in_progress: 'resolution_submitted',
  resolution_submitted: 'citizen_verification',
  resolved: 'citizen_verification',
  citizen_verification: 'closed',
  verified: 'closed',
  closed: null,
  reopened: 'in_progress',
  rejected: null,
};

export const ALLOWED_STATUS_TRANSITIONS: Record<ComplaintStatus, ComplaintStatus[]> = {
  submitted: ['under_review', 'assigned', 'rejected'],
  under_review: ['assigned', 'in_progress', 'rejected'],
  assigned: ['in_progress', 'under_review'],
  in_progress: ['resolution_submitted', 'resolved', 'assigned'],
  resolution_submitted: ['citizen_verification', 'resolved', 'in_progress'],
  resolved: ['citizen_verification', 'closed', 'in_progress', 'reopened'],
  citizen_verification: ['closed', 'reopened', 'in_progress'],
  verified: ['closed', 'reopened'],
  closed: ['reopened'],
  reopened: ['in_progress', 'assigned'],
  rejected: ['submitted', 'under_review'],
};

export const PRIORITY_CONFIG: Record<
  ComplaintPriority,
  { label: string; badgeBg: string; badgeBorder: string; badgeText: string; slaHours: number; color: string }
> = {
  low: {
    label: 'Low',
    badgeBg: 'bg-blue-50',
    badgeBorder: 'border-blue-200',
    badgeText: 'text-blue-800',
    slaHours: 72,
    color: '#1769D2',
  },
  medium: {
    label: 'Medium',
    badgeBg: 'bg-amber-50',
    badgeBorder: 'border-amber-200',
    badgeText: 'text-amber-800',
    slaHours: 48,
    color: '#D99A00',
  },
  high: {
    label: 'High',
    badgeBg: 'bg-orange-50',
    badgeBorder: 'border-orange-200',
    badgeText: 'text-orange-800',
    slaHours: 24,
    color: '#EA580C',
  },
  urgent: {
    label: 'Urgent / Critical',
    badgeBg: 'bg-red-50',
    badgeBorder: 'border-red-200',
    badgeText: 'text-red-800',
    slaHours: 12,
    color: '#D92D20',
  },
};

export const CATEGORY_CONFIG: Record<
  IncidentCategory,
  { label: string; departmentName: string; color: string }
> = {
  roads: { label: 'Roads & Pavements', departmentName: 'Roads & Infrastructure', color: '#1769D2' },
  drainage: { label: 'Stormwater Drainage', departmentName: 'Sewerage & Drainage', color: '#0284C7' },
  waste_management: { label: 'Waste Management', departmentName: 'Public Health & Sanitation', color: '#16803C' },
  streetlights: { label: 'Street Lighting & Grid', departmentName: 'Electrical Engineering', color: '#D99A00' },
  water_sewage: { label: 'Water Supply Pipeline', departmentName: 'Water Works Dept', color: '#4F46E5' },
  public_safety: { label: 'Public Safety Hazard', departmentName: 'Disaster Management', color: '#D92D20' },
  parks: { label: 'Parks & Urban Greens', departmentName: 'Horticulture Dept', color: '#15803D' },
};

// Default map center: Maharashtra geographic center (not any specific city)
// Used ONLY as ultimate fallback when no org context is available.
// In practice, CommandMap receives explicit district coordinates via props.
export const DEFAULT_MAP_CENTER = {
  lng: 76.5,
  lat: 18.8,
  zoom: 7.5,
};
