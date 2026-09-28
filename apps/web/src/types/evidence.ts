/**
 * CIVICRESOLVE — Evidence & Resolution Verification Types
 * 
 * Defines canonical data contracts for multi-attempt resolution workflows,
 * before/after photographic audits, GPS location distance verification,
 * AI-assisted visual analysis signals, citizen verification/reopen states, and audit trails.
 */

export type ResolutionStatus =
  | 'pending_resolution'
  | 'submitted_awaiting_verification'
  | 'verified_resolved'
  | 'rejected_reopened';

export type ReopenReason =
  | 'issue_still_exists'
  | 'partial_resolution'
  | 'wrong_location'
  | 'poor_quality_work'
  | 'evidence_does_not_show_issue'
  | 'other';

export const REOPEN_REASON_LABELS: Record<ReopenReason, string> = {
  issue_still_exists: 'Civic issue still exists at the location',
  partial_resolution: 'Only partial or temporary work was done',
  wrong_location: 'Work was completed at the wrong address or landmark',
  poor_quality_work: 'Substandard quality of repair or materials',
  evidence_does_not_show_issue: 'After photo does not clearly show the resolved site',
  other: 'Other specific reason',
};

export type EvidenceType = 'before' | 'after' | 'reopen_proof';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

export interface LocationVerificationResult {
  hasOriginalCoordinates: boolean;
  hasResolutionCoordinates: boolean;
  distanceMeters?: number;
  isWithinTolerance: boolean;
  toleranceThresholdMeters: number;
  statusLabel: string;
  badgeVariant: 'success' | 'warning' | 'neutral';
  explanation: string;
}

export interface TimestampVerificationResult {
  reportedAt: string;
  resolutionCapturedAt?: string;
  resolutionUploadedAt: string;
  verifiedAt?: string;
  durationHoursFromReportToResolution: number;
  timelineFormatted: string;
}

export interface EvidenceValidationResult {
  isValid: boolean;
  mimeType: string;
  fileSizeBytes: number;
  fileHash?: string;
  errors: string[];
  warnings: string[];
  isPotentialDuplicate: boolean;
}

export interface AIAssistedVisualAnalysis {
  isAvailable: boolean;
  similarityScore: number; // 0.0 to 100.0
  issueAddressedScore: number; // 0.0 to 100.0
  confidenceScore: number; // 0.0 to 100.0
  resolutionIndication: 'likely' | 'unclear' | 'unlikely' | 'insufficient_evidence';
  summary: string;
  disclaimer: string;
  detectedFeatures: string[];
}

export interface CitizenVerificationRecord {
  id: string;
  resolutionAttemptId: string;
  complaintId: string;
  verifiedBy: string;
  satisfied: boolean;
  reopenReason?: ReopenReason;
  reopenReasonLabel?: string;
  citizenComment?: string;
  verificationPhotoUrl?: string;
  verifiedAt: string;
  districtId: string;
}

export interface ResolutionEvidenceItem {
  id: string;
  resolutionAttemptId: string;
  complaintId: string;
  evidenceType: EvidenceType;
  fileUrl: string;
  fileHash?: string;
  mimeType: string;
  fileSizeBytes: number;
  latitude?: number;
  longitude?: number;
  capturedAt?: string;
  uploadedAt: string;
  uploadedBy: string;
  districtId: string;
  organizationId?: string;
}

export interface ResolutionAttempt {
  id: string;
  complaintId: string;
  attemptNumber: number;
  status: ResolutionStatus;
  resolvedBy: string;
  resolvedByRole: 'officer' | 'contractor' | 'admin';
  resolutionNote: string;
  latitude?: number;
  longitude?: number;
  distanceFromOriginMeters?: number;
  locationVerified: boolean;
  beforeEvidenceUrls: string[];
  afterEvidenceUrls: string[];
  capturedAt?: string;
  uploadedAt: string;
  aiReview?: AIAssistedVisualAnalysis;
  citizenVerification?: CitizenVerificationRecord;
  districtId: string;
  organizationId?: string;
}

export interface ResolutionAuditEvent {
  id: string;
  complaintId: string;
  resolutionAttemptId?: string;
  actorId: string;
  actorRole: 'citizen' | 'officer' | 'contractor' | 'admin' | 'system';
  action:
    | 'COMPLAINT_CREATED'
    | 'RESOLUTION_SUBMITTED'
    | 'CITIZEN_VERIFIED_RESOLVED'
    | 'CITIZEN_REJECTED_REOPENED'
    | 'EVIDENCE_UPLOADED'
    | 'AI_EVIDENCE_ASSESSED'
    | 'LOCATION_VERIFIED';
  details: Record<string, any>;
  createdAt: string;
  districtId: string;
  organizationId?: string;
}
