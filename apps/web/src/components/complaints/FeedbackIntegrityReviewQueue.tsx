import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Star,
  Activity,
  UserCheck,
  Clock,
  ChevronRight,
  Filter,
} from 'lucide-react';
import {
  FeedbackIntegrityFlag,
  ResolutionFeedbackMetrics,
  ResolutionFeedback,
} from '../../types/resolutionFeedback';
import { ResolutionFeedbackService } from '../../services/resolutionFeedbackService';

interface FeedbackIntegrityReviewQueueProps {
  districtId?: string;
  userRole: 'citizen' | 'officer' | 'dept_admin' | 'municipal_admin' | 'state_admin' | 'super_admin';
  reviewerId: string;
  onSelectComplaint?: (complaintId: string) => void;
}

export const FeedbackIntegrityReviewQueue: React.FC<FeedbackIntegrityReviewQueueProps> = ({
  districtId = 'pune',
  userRole,
  reviewerId,
  onSelectComplaint,
}) => {
  const [flags, setFlags] = useState<FeedbackIntegrityFlag[]>([]);
  const [metrics, setMetrics] = useState<ResolutionFeedbackMetrics | null>(null);
  const [selectedFlag, setSelectedFlag] = useState<FeedbackIntegrityFlag | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [decision, setDecision] = useState<'dismissed' | 'confirmed'>('dismissed');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'dismissed' | 'confirmed'>('open');

  // Load flags and metrics
  const loadData = () => {
    if (userRole === 'citizen') return;

    try {
      const allFlags = ResolutionFeedbackService.getIntegrityFlags({
        districtId,
        userRole,
        status: statusFilter === 'all' ? undefined : statusFilter,
      });
      setFlags(allFlags);

      const m = ResolutionFeedbackService.getFeedbackMetrics(districtId);
      setMetrics(m);
    } catch (err) {
      console.warn('Could not load integrity flags:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [districtId, userRole, statusFilter]);

  // Security check: Never render for citizen role
  if (userRole === 'citizen') {
    return null;
  }

  const handleAdjudicate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFlag) return;

    if (!reviewNotes.trim()) {
      alert('Please provide review notes explaining your municipal decision.');
      return;
    }

    try {
      setIsSubmitting(true);
      ResolutionFeedbackService.reviewIntegrityFlag({
        flagId: selectedFlag.id,
        reviewerId,
        reviewerRole: userRole,
        decision,
        reviewNotes: reviewNotes.trim(),
      });

      setActionSuccess(
        `Integrity flag #${selectedFlag.id.slice(-6)} updated to "${decision.toUpperCase()}". Audit entry preserved.`
      );
      setSelectedFlag(null);
      setReviewNotes('');
      loadData();
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err: any) {
      alert(err.message || 'Failed to review integrity flag');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Operational Feedback & Integrity Metrics Summary Bar */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="p-3 bg-white border-slate-200">
            <span className="text-[10px] font-mono text-slate-500 uppercase block font-bold">
              Avg Citizen Rating
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="text-lg font-bold text-slate-900">
                {metrics.averageRating > 0 ? `${metrics.averageRating} / 5` : 'N/A'}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              {metrics.totalFeedbacks} total submissions
            </span>
          </Card>

          <Card className="p-3 bg-white border-slate-200">
            <span className="text-[10px] font-mono text-slate-500 uppercase block font-bold">
              Resolution Satisfaction
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="text-lg font-bold text-emerald-700">
                {metrics.resolvedPercentage}%
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              Confirmed resolved on-site
            </span>
          </Card>

          <Card className="p-3 bg-white border-slate-200">
            <span className="text-[10px] font-mono text-slate-500 uppercase block font-bold">
              Dispute / Reopen Rate
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span className="text-lg font-bold text-amber-700">
                {metrics.reopenRate}%
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              {metrics.reopenCount} cases reworked
            </span>
          </Card>

          <Card className="p-3 bg-white border-slate-200">
            <span className="text-[10px] font-mono text-slate-500 uppercase block font-bold">
              Pending Integrity Reviews
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              <ShieldAlert className={`w-4 h-4 ${metrics.pendingIntegrityReviews > 0 ? 'text-rose-600' : 'text-slate-400'}`} />
              <span className={`text-lg font-bold ${metrics.pendingIntegrityReviews > 0 ? 'text-rose-700' : 'text-slate-700'}`}>
                {metrics.pendingIntegrityReviews}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              Deterministic heuristic flags
            </span>
          </Card>
        </div>
      )}

      {/* 2. Success Notification */}
      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* 3. Review Queue Table */}
      <Card className="p-4 border-slate-200 bg-white shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[#1769D2]" />
            <div>
              <h3 className="text-sm font-bold text-[#172B4D]">
                Feedback Integrity & Anomaly Review Queue
              </h3>
              <p className="text-[11px] text-slate-500">
                Human-in-the-loop municipal verification for suspicious feedback patterns.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="text-xs border border-slate-300 rounded px-2 py-1 bg-white font-medium outline-hidden"
            >
              <option value="open">Open (Action Required)</option>
              <option value="confirmed">Confirmed Concern</option>
              <option value="dismissed">Dismissed (Normal)</option>
              <option value="all">All Flags</option>
            </select>
          </div>
        </div>

        {flags.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto opacity-70" />
            <p className="font-semibold text-slate-700">No pending integrity flags</p>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
              All feedback submitted across {districtId.toUpperCase()} aligns with expected submission frequency and verified photographic evidence.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {flags.map((flag) => {
              const isSelected = selectedFlag?.id === flag.id;
              return (
                <div
                  key={flag.id}
                  className={`p-3.5 rounded-lg border transition-colors ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50/40 ring-1 ring-blue-500'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-bold text-slate-900">
                          {flag.complaintId}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                            flag.riskLevel === 'elevated'
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : flag.riskLevel === 'high'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}
                        >
                          {flag.riskLevel} Risk (Score: {flag.riskScore}/100)
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {flag.flagType.replace(/_/g, ' ')}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                            flag.status === 'open'
                              ? 'bg-amber-50 text-amber-800'
                              : flag.status === 'confirmed'
                              ? 'bg-rose-50 text-rose-800'
                              : 'bg-emerald-50 text-emerald-800'
                          }`}
                        >
                          {flag.status.toUpperCase()}
                        </span>
                      </div>

                      <div className="text-xs text-slate-700">
                        {flag.reasons.map((r, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-slate-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                            <span>{r}</span>
                          </div>
                        ))}
                      </div>

                      <div className="text-[10px] font-mono text-slate-400">
                        Submitted: {new Date(flag.createdAt).toLocaleString()} · User: {flag.userId} · District: {flag.districtId.toUpperCase()}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {onSelectComplaint && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onSelectComplaint(flag.complaintId)}
                          className="text-xs py-1"
                        >
                          View Case
                        </Button>
                      )}
                      {flag.status === 'open' && (
                        <Button
                          type="button"
                          variant={isSelected ? 'primary' : 'outline'}
                          size="sm"
                          onClick={() => setSelectedFlag(isSelected ? null : flag)}
                          className="text-xs py-1 font-bold"
                        >
                          {isSelected ? 'Close Review' : 'Adjudicate'}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Review Action Form (Visible when Selected) */}
                  {isSelected && (
                    <form
                      onSubmit={handleAdjudicate}
                      className="mt-3 pt-3 border-t border-slate-200 space-y-3 bg-white p-3 rounded-md shadow-xs"
                    >
                      <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <UserCheck className="w-4 h-4 text-[#1769D2]" />
                        <span>Municipal Review & Adjudication</span>
                      </div>

                      <div className="flex items-center gap-4 text-xs font-medium text-slate-700">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="decision"
                            value="dismissed"
                            checked={decision === 'dismissed'}
                            onChange={() => setDecision('dismissed')}
                            className="text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="text-emerald-800 font-bold">Dismiss Flag (Legitimate Citizen Feedback)</span>
                        </label>

                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="decision"
                            value="confirmed"
                            checked={decision === 'confirmed'}
                            onChange={() => setDecision('confirmed')}
                            className="text-rose-600 focus:ring-rose-500"
                          />
                          <span className="text-rose-800 font-bold">Confirm Concern (Exclude from Aggregate Metrics)</span>
                        </label>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 block">
                          Mandatory Officer Review Notes *
                        </label>
                        <textarea
                          rows={2}
                          value={reviewNotes}
                          onChange={(e) => setReviewNotes(e.target.value)}
                          placeholder="Document justification for municipal record (e.g., Citizen verified on-site by phone call, genuine complaint...)"
                          className="w-full text-xs p-2 rounded border border-slate-300 focus:ring-2 focus:ring-[#1769D2] outline-hidden"
                          required
                        />
                      </div>

                      <div className="flex items-center justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedFlag(null)}
                          disabled={isSubmitting}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          variant="primary"
                          size="sm"
                          disabled={isSubmitting}
                          className="bg-[#1769D2] hover:bg-[#155ab0] text-white font-bold"
                        >
                          {isSubmitting ? 'Saving...' : 'Save Municipal Review'}
                        </Button>
                      </div>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};
