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
} from 'lucide-react';

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
  const [reopenReason, setReopenReason] = useState('');
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

  const handleConfirmSatisfied = async () => {
    try {
      setLocalSubmitting(true);
      await onVerify(true, citizenComment.trim() || 'Verified resolved by citizen.');
      setShowRatingSuccess(true);
    } finally {
      setLocalSubmitting(false);
    }
  };

  const handleConfirmReopen = async () => {
    if (!reopenReason.trim()) {
      alert('Please explain why the civic issue is still unresolved.');
      return;
    }
    try {
      setLocalSubmitting(true);
      await onVerify(
        false,
        undefined,
        reopenReason.trim(),
        reopenPhotoUrl.trim() || undefined
      );
      setShowReopenModal(false);
      setReopenReason('');
      setReopenPhotoUrl('');
    } finally {
      setLocalSubmitting(false);
    }
  };

  // Case 1: Issue is awaiting verification
  if (isResolvedOrVerifying) {
    return (
      <Card className="p-4 bg-gradient-to-br from-teal-50/60 to-emerald-50/60 border-teal-200 shadow-sm space-y-3">
        <div className="flex items-start justify-between gap-2 pb-2 border-b border-teal-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-teal-950">
                Citizen Resolution Verification
              </h3>
              <p className="text-[11px] text-teal-800">
                Municipal field team marked this issue as resolved. Please verify on-site outcome.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-100 text-teal-800 border border-teal-300 font-bold shrink-0">
            AWAITING CITIZEN SIGN-OFF
          </span>
        </div>

        {/* Resolution note from officer if available */}
        {complaint.resolutionDetails && (
          <div className="p-2.5 rounded bg-white border border-teal-100 text-xs text-teal-950">
            <span className="text-[10px] font-mono uppercase text-teal-700 font-bold block mb-0.5">
              Officer Remediation Remarks:
            </span>
            <p className="italic">"{complaint.resolutionDetails.resolutionNote}"</p>
          </div>
        )}

        <div className="p-3 bg-white rounded-lg border border-teal-200 space-y-3">
          <div className="text-xs font-semibold text-[#172B4D]">
            Is this civic issue actually resolved to your satisfaction?
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
              <span>Yes, issue resolved</span>
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
              <span>No, still unresolved</span>
            </Button>
          </div>

          <div className="text-[10px] text-slate-500 flex items-center gap-1">
            <HelpCircle className="w-3 h-3 text-teal-600" />
            <span>Confirming resolution awards +15 Civic Score credits toward District Champion recognition.</span>
          </div>
        </div>

        {/* Reopen / Verification Failed Modal */}
        {showReopenModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <div className="bg-white border border-slate-200 rounded-xl p-5 max-w-md w-full space-y-4 shadow-2xl">
              <div>
                <div className="flex items-center gap-2 text-rose-700 font-bold text-sm uppercase">
                  <AlertCircle className="w-4 h-4" />
                  <span>Report Unresolved Grievance</span>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Explain why this issue is not remediated. The complaint will be reopened for field crew dispatch.
                </p>
              </div>

              {reopenCount >= 2 && (
                <div className="p-2.5 rounded bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-start gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Supervisor Escalation Notice:</strong> This complaint has been reopened {reopenCount} times. This rejection will automatically escalate to the Ward Executive Officer.
                  </span>
                </div>
              )}

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[10px] font-mono text-slate-600 uppercase font-bold block mb-1">
                    Specific Reason Issue Remains Unresolved *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={reopenReason}
                    onChange={(e) => setReopenReason(e.target.value)}
                    placeholder="e.g. Debris still blocking drain, pothole only partially filled with loose gravel..."
                    className="w-full p-2.5 rounded border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono text-slate-600 uppercase font-bold block mb-1">
                    Current Photo Proof URL (Optional)
                  </label>
                  <Input
                    value={reopenPhotoUrl}
                    onChange={(e) => setReopenPhotoUrl(e.target.value)}
                    placeholder="https://... photo link of persisting issue"
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowReopenModal(false)}
                  disabled={localSubmitting}
                  className="text-slate-600"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleConfirmReopen}
                  disabled={localSubmitting || !reopenReason.trim()}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
                >
                  {localSubmitting ? 'Reopening Case...' : 'Confirm Reopen'}
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
      <Card className="p-3.5 bg-slate-50 border-slate-200 shadow-2xs space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-800 font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Grievance Officially Closed</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold">
            VERIFIED & CLOSED
          </span>
        </div>
        <p className="text-[11px] text-slate-600">
          This grievance has been resolved on-site and confirmed closed by the citizen.
        </p>
        {complaint.citizenVerification?.comment && (
          <div className="p-2 rounded bg-white border border-slate-200 text-[11px] italic text-slate-700">
            "{complaint.citizenVerification.comment}"
          </div>
        )}
      </Card>
    );
  }

  // Case 3: Issue was reopened
  if (isReopened) {
    return (
      <Card className="p-3.5 bg-rose-50/70 border-rose-200 shadow-2xs space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-rose-900 font-bold">
            <RotateCcw className="w-4 h-4 text-rose-600" />
            <span>Case Reopened by Citizen (Attempt #{reopenCount})</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300 font-bold">
            REOPENED
          </span>
        </div>
        {complaint.citizenVerification?.reopenReason && (
          <div className="p-2 rounded bg-white border border-rose-200 text-[11px] text-rose-950">
            <strong>Citizen Reopen Reason:</strong> {complaint.citizenVerification.reopenReason}
          </div>
        )}
        <p className="text-[11px] text-rose-800">
          Field team has been re-dispatched to address the persisting issue.
        </p>
      </Card>
    );
  }

  return null;
};
