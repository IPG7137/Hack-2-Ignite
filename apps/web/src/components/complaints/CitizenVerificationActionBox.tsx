import React, { useState } from 'react';
import { Complaint } from '../../types/complaint';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import {
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RotateCcw,
  Star,
  Camera,
  ShieldCheck,
  AlertTriangle,
  MapPin,
  Sparkles,
  X,
} from 'lucide-react';
import { ReopenReason, REOPEN_REASON_LABELS } from '../../types/evidence';
import { ResolutionEvidenceService } from '../../services/resolutionEvidenceService';

interface CitizenVerificationActionBoxProps {
  complaint: Complaint;
  onVerify: (
    satisfied: boolean,
    comment?: string,
    reopenReason?: string,
    proofPhotoUrl?: string
  ) => Promise<void>;
  loading?: boolean;
}

export const CitizenVerificationActionBox: React.FC<CitizenVerificationActionBoxProps> = ({
  complaint,
  onVerify,
  loading = false,
}) => {
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState<ReopenReason>('issue_still_exists');
  const [customComment, setCustomComment] = useState('');
  const [reopenPhotoUrl, setReopenPhotoUrl] = useState('');
  const [citizenRating, setCitizenRating] = useState(5);
  const [citizenComment, setCitizenComment] = useState('');
  const [showRatingSuccess, setShowRatingSuccess] = useState(false);
  const [localSubmitting, setLocalSubmitting] = useState(false);

  const isResolvedOrVerifying =
    complaint.status === 'resolution_submitted' ||
    complaint.status === 'resolved' ||
    complaint.status === 'citizen_verification';

  const isClosed = complaint.status === 'closed';
  const isReopened = complaint.status === 'reopened';
  const reopenCount = complaint.citizenVerification?.reopenCount || 0;

  // Retrieve multi-attempt history
  const attempts = ResolutionEvidenceService.getResolutionAttempts(complaint.id);
  const latestAttempt = attempts[attempts.length - 1];

  const handleConfirmSatisfied = async () => {
    try {
      setLocalSubmitting(true);
      await onVerify(
        true,
        citizenComment.trim() || 'Verified resolved on-site by citizen.'
      );
      setShowRatingSuccess(true);
    } finally {
      setLocalSubmitting(false);
    }
  };

  const handleConfirmReopen = async () => {
    try {
      setLocalSubmitting(true);
      await onVerify(
        false,
        customComment.trim() || undefined,
        selectedReason,
        reopenPhotoUrl.trim() || undefined
      );
      setShowReopenModal(false);
      setCustomComment('');
      setReopenPhotoUrl('');
    } finally {
      setLocalSubmitting(false);
    }
  };

  // Case 1: Issue is awaiting verification
  if (isResolvedOrVerifying) {
    const beforePhoto = complaint.evidence?.before?.[0] || '';
    const afterPhoto =
      latestAttempt?.afterEvidenceUrls?.[0] ||
      complaint.evidence?.after?.[0] ||
      complaint.resolutionDetails?.proofImageUrl ||
      '';

    return (
      <Card className="p-4 bg-gradient-to-br from-teal-50/70 to-emerald-50/70 border-teal-200 shadow-sm space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 pb-2 border-b border-teal-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-teal-950">
                Complaint Resolved — Please Verify
              </h3>
              <p className="text-[11px] text-teal-800">
                Municipal field team has uploaded remediation proof. Citizen confirmation required.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-100 text-teal-800 border border-teal-300 font-bold shrink-0">
            AWAITING CITIZEN SIGN-OFF
          </span>
        </div>

        {/* Before / After Evidence Thumbnail Snapshot */}
        {(beforePhoto || afterPhoto) && (
          <div className="grid grid-cols-2 gap-3 p-2.5 bg-white/80 rounded-lg border border-teal-100">
            <div>
              <span className="text-[10px] font-mono text-amber-800 font-bold block mb-1">
                BEFORE (REPORT)
              </span>
              <div className="aspect-video rounded overflow-hidden border border-amber-200 bg-slate-100">
                {beforePhoto ? (
                  <img src={beforePhoto} alt="Before" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400">
                    No photo
                  </div>
                )}
              </div>
            </div>

            <div>
              <span className="text-[10px] font-mono text-emerald-800 font-bold block mb-1">
                AFTER (RESOLUTION)
              </span>
              <div className="aspect-video rounded overflow-hidden border border-emerald-200 bg-slate-100">
                {afterPhoto ? (
                  <img src={afterPhoto} alt="After" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400">
                    No photo
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Resolution note from officer */}
        {(complaint.resolutionDetails || latestAttempt) && (
          <div className="p-2.5 rounded bg-white border border-teal-100 text-xs text-teal-950 space-y-1">
            <span className="text-[10px] font-mono uppercase text-teal-700 font-bold block">
              Officer Remediation Remarks:
            </span>
            <p className="italic">
              "{latestAttempt?.resolutionNote || complaint.resolutionDetails?.resolutionNote || 'Remediation completed by field team.'}"
            </p>
          </div>
        )}

        {/* Verification Action Box */}
        <div className="p-3 bg-white rounded-lg border border-teal-200 space-y-3">
          <div className="text-xs font-semibold text-[#172B4D]">
            Did the municipal team successfully fix this civic problem?
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              id="btn-verify-yes"
              variant="primary"
              size="sm"
              disabled={loading || localSubmitting}
              onClick={handleConfirmSatisfied}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>YES — Issue Resolved</span>
            </Button>

            <Button
              type="button"
              id="btn-verify-no"
              variant="outline"
              size="sm"
              disabled={loading || localSubmitting}
              onClick={() => setShowReopenModal(true)}
              className="flex-1 bg-white hover:bg-rose-50 border-rose-300 text-rose-700 font-bold py-2 flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>NO — Issue Not Resolved</span>
            </Button>
          </div>

          <div className="text-[10px] text-slate-500 flex items-center gap-1">
            <HelpCircle className="w-3 h-3 text-teal-600 shrink-0" />
            <span>
              Confirming resolution awards +15 Civic Champion points. Rejection reopens the complaint with SLA priority escalation.
            </span>
          </div>
        </div>

        {/* Structured Reopen Reason Modal */}
        {showReopenModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Reopen Complaint</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowReopenModal(false)}
                  className="p-1 rounded text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 block">
                  Select Reason for Rejection *
                </label>
                <select
                  value={selectedReason}
                  onChange={(e) => setSelectedReason(e.target.value as ReopenReason)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-rose-500 outline-hidden font-medium"
                >
                  {(Object.keys(REOPEN_REASON_LABELS) as ReopenReason[]).map((key) => (
                    <option key={key} value={key}>
                      {REOPEN_REASON_LABELS[key]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 block">
                  Additional Citizen Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={customComment}
                  onChange={(e) => setCustomComment(e.target.value)}
                  placeholder="Provide any specific observations about why the issue is unresolved."
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-rose-500 outline-hidden"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 block">
                  Supporting Photo URL (Optional)
                </label>
                <Input
                  type="url"
                  placeholder="https://..."
                  value={reopenPhotoUrl}
                  onChange={(e) => setReopenPhotoUrl(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowReopenModal(false)}
                  disabled={localSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={localSubmitting}
                  onClick={handleConfirmReopen}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
                >
                  Confirm & Reopen Issue
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>
    );
  }

  // Case 2: Issue is closed
  if (isClosed) {
    return (
      <Card className="p-4 bg-emerald-50/50 border-emerald-200 shadow-sm space-y-2">
        <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Case Closed & Verified</span>
        </div>
        <p className="text-[11px] text-emerald-700">
          This complaint was confirmed as resolved and closed with permanent audit preservation.
        </p>
      </Card>
    );
  }

  // Case 3: Issue was reopened
  if (isReopened) {
    return (
      <Card className="p-4 bg-rose-50/50 border-rose-200 shadow-sm space-y-2">
        <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
          <AlertCircle className="w-4 h-4 text-rose-600" />
          <span>Complaint Reopened by Citizen</span>
        </div>
        <p className="text-[11px] text-rose-700">
          Citizen reported this issue is still unresolved. Municipal field team has been notified for re-inspection.
        </p>
      </Card>
    );
  }

  return null;
};
