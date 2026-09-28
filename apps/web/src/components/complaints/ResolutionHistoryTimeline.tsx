import React from 'react';
import { Card } from '../ui/Card';
import {
  History,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Clock,
  Sparkles,
  User,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { ResolutionAttempt, ResolutionAuditEvent } from '../../types/evidence';
import { ResolutionEvidenceService } from '../../services/resolutionEvidenceService';

interface ResolutionHistoryTimelineProps {
  complaintId: string;
}

export const ResolutionHistoryTimeline: React.FC<ResolutionHistoryTimelineProps> = ({
  complaintId,
}) => {
  const attempts: ResolutionAttempt[] = ResolutionEvidenceService.getResolutionAttempts(complaintId);
  const auditTrail: ResolutionAuditEvent[] = ResolutionEvidenceService.getAuditTrail(complaintId);

  if (attempts.length === 0 && auditTrail.length === 0) {
    return null;
  }

  return (
    <Card className="p-4 border-[#D9E2EC] bg-white shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-[#E8EEF5]">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-[#1769D2]" />
          <h4 className="text-xs font-bold text-[#172B4D] uppercase tracking-wider">
            Resolution Attempt Ledger ({attempts.length} Attempt{attempts.length === 1 ? '' : 's'})
          </h4>
        </div>
        <span className="text-[10px] font-mono text-[#526581]">
          Immutable Audit History
        </span>
      </div>

      <div className="space-y-4">
        {attempts.map((attempt, index) => {
          const isVerified = attempt.status === 'verified_resolved';
          const isRejected = attempt.status === 'rejected_reopened';
          const isPending = attempt.status === 'submitted_awaiting_verification';

          return (
            <div
              key={attempt.id}
              className={`p-3 rounded-lg border text-xs space-y-2.5 transition-all ${
                isVerified
                  ? 'bg-emerald-50/40 border-emerald-200'
                  : isRejected
                  ? 'bg-rose-50/40 border-rose-200'
                  : 'bg-teal-50/40 border-teal-200'
              }`}
            >
              {/* Attempt Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#172B4D] text-xs">
                    Resolution Attempt #{attempt.attemptNumber}
                  </span>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase border ${
                      isVerified
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : isRejected
                        ? 'bg-rose-100 text-rose-800 border-rose-300'
                        : 'bg-teal-100 text-teal-800 border-teal-300'
                    }`}
                  >
                    {attempt.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-500">
                  {new Date(attempt.uploadedAt).toLocaleString()}
                </span>
              </div>

              {/* Resolved By & Remarks */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-[11px] text-slate-600">
                  <User className="w-3 h-3 text-slate-400" />
                  <span>Submitted by: <strong>{attempt.resolvedBy}</strong> ({attempt.resolvedByRole})</span>
                </div>
                <p className="text-slate-800 italic bg-white/70 p-2 rounded border border-slate-200">
                  "{attempt.resolutionNote}"
                </p>
              </div>

              {/* Location & AI Review Badges */}
              <div className="flex flex-wrap gap-2 pt-1">
                {attempt.locationVerified !== undefined && (
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded flex items-center gap-1 border ${
                      attempt.locationVerified
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-amber-50 text-amber-900 border-amber-300'
                    }`}
                  >
                    <MapPin className="w-3 h-3" />
                    {attempt.locationVerified
                      ? `Location Verified (${attempt.distanceFromOriginMeters ?? 0}m)`
                      : `Location Warning (${attempt.distanceFromOriginMeters ?? 'N/A'}m)`}
                  </span>
                )}

                {attempt.aiReview?.isAvailable && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-purple-600" />
                    AI Advisory: {attempt.aiReview.resolutionIndication.toUpperCase()} ({attempt.aiReview.confidenceScore}%)
                  </span>
                )}
              </div>

              {/* Citizen Sign-Off Result */}
              {attempt.citizenVerification && (
                <div
                  className={`p-2 rounded border text-[11px] mt-2 ${
                    attempt.citizenVerification.satisfied
                      ? 'bg-emerald-100/70 border-emerald-300 text-emerald-950'
                      : 'bg-rose-100/70 border-rose-300 text-rose-950'
                  }`}
                >
                  <div className="font-bold flex items-center gap-1">
                    {attempt.citizenVerification.satisfied ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-700" />
                    )}
                    <span>
                      {attempt.citizenVerification.satisfied
                        ? 'Citizen Confirmed Resolution'
                        : `Citizen Reopened: ${attempt.citizenVerification.reopenReasonLabel || 'Issue Not Resolved'}`}
                    </span>
                  </div>
                  {attempt.citizenVerification.citizenComment && (
                    <p className="mt-1 text-[10px] italic">
                      "{attempt.citizenVerification.citizenComment}"
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
};
