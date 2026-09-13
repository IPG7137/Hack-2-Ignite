import React, { useMemo } from 'react';
import { Complaint } from '../../types/complaint';
import { ResolutionVerificationEngine, ResolutionVerificationResult } from '../../services/resolutionVerificationEngine';
import { Card } from '../ui/Card';
import {
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Star,
  ShieldCheck,
  Camera,
  Info,
  UserCheck,
} from 'lucide-react';

interface ResolutionVerificationCardProps {
  complaint: Complaint;
}

export const ResolutionVerificationCard: React.FC<ResolutionVerificationCardProps> = ({
  complaint,
}) => {
  const result: ResolutionVerificationResult = useMemo(() => {
    return ResolutionVerificationEngine.evaluateComplaintResolution(complaint);
  }, [complaint]);

  const isStrong = result.classification === 'strongResolutionEvidence';
  const isLikely = result.classification === 'likelyResolved';
  const isReview = result.classification === 'needsReview';

  return (
    <Card className="p-4 border-[#D9E2EC] bg-white shadow-sm space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 pb-2 border-b border-[#E8EEF5]">
        <div className="flex items-center gap-2">
          <ShieldCheck className={`w-4 h-4 ${isStrong ? 'text-emerald-600' : isLikely ? 'text-[#1769D2]' : isReview ? 'text-amber-600' : 'text-red-600'}`} />
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#172B4D]">
              Resolution Verification & Evidence (Phase 3E)
            </h3>
            <div className="text-[10px] text-[#526581] font-mono mt-0.5">
              Multi-Signal Remediation Decision Support
            </div>
          </div>
        </div>
        <span
          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${result.badgeBg} ${result.badgeBorder} ${result.badgeText}`}
        >
          {result.levelLabel.toUpperCase()} · {result.scoreDisplay}
        </span>
      </div>

      {/* Assessment Summary Box */}
      <div
        className={`p-2.5 rounded-lg border text-xs leading-relaxed ${
          isStrong
            ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900'
            : isLikely
            ? 'bg-blue-50/50 border-blue-200 text-blue-900'
            : isReview
            ? 'bg-amber-50/50 border-amber-200 text-amber-900'
            : 'bg-red-50/50 border-red-200 text-red-900'
        }`}
      >
        <div className="font-semibold">{result.improvementAssessment}</div>
        {result.needsHumanVerification && (
          <div className="mt-1 text-[11px] font-mono flex items-center gap-1.5 opacity-90">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>Officer sign-off recommended before statutory case closure</span>
          </div>
        )}
      </div>

      {/* 5-Signal Contribution Breakdown */}
      <div className="space-y-2 text-xs">
        <div>
          <div className="flex justify-between text-[11px] font-mono text-[#526581] mb-0.5">
            <span>Problem Remediation Evidence (35%)</span>
            <strong className="text-[#172B4D]">{Math.round(result.signalBreakdown.problemDisappearance)}/100</strong>
          </div>
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-600 rounded-full"
              style={{ width: `${result.signalBreakdown.problemDisappearance}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-[11px] font-mono text-[#526581] mb-0.5">
            <span>Evidence Completeness (25%)</span>
            <strong className="text-[#172B4D]">{Math.round(result.signalBreakdown.evidenceCompleteness)}/100</strong>
          </div>
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#1769D2] rounded-full"
              style={{ width: `${result.signalBreakdown.evidenceCompleteness}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-[11px] font-mono text-[#526581] mb-0.5">
            <span>Context Consistency (20%)</span>
            <strong className="text-[#172B4D]">{Math.round(result.signalBreakdown.consistency)}/100</strong>
          </div>
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-600 rounded-full"
              style={{ width: `${result.signalBreakdown.consistency}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-[11px] font-mono text-[#526581] mb-0.5">
            <span>Location & Admin Context (10%)</span>
            <strong className="text-[#172B4D]">{Math.round(result.signalBreakdown.locationContext)}/100</strong>
          </div>
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-slate-600 rounded-full"
              style={{ width: `${result.signalBreakdown.locationContext}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-[11px] font-mono text-[#526581] mb-0.5">
            <span>Citizen Feedback & Rating (10%)</span>
            <strong className="text-[#172B4D]">{Math.round(result.signalBreakdown.citizenFeedback)}/100</strong>
          </div>
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full"
              style={{ width: `${result.signalBreakdown.citizenFeedback}%` }}
            />
          </div>
        </div>
      </div>

      {/* Citizen Feedback Snapshot */}
      {complaint.citizenFeedback && (
        <div className="p-2.5 rounded bg-amber-50/60 border border-amber-200/80 text-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase font-bold text-amber-900 flex items-center gap-1">
              <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
              Citizen Rating: {complaint.citizenFeedback.rating} / 5 Stars
            </span>
            <span
              className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border ${
                result.feedbackSentiment === 'positive'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : result.feedbackSentiment === 'negative'
                  ? 'bg-red-50 text-red-800 border-red-200'
                  : 'bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              {result.feedbackSentiment.toUpperCase()} SENTIMENT
            </span>
          </div>
          {complaint.citizenFeedback.comment && (
            <p className="text-[11px] text-amber-950 italic">
              "{complaint.citizenFeedback.comment}"
            </p>
          )}
        </div>
      )}

      {/* Explainable Decision Points */}
      <div className="pt-2 border-t border-[#E8EEF5]">
        <span className="text-[10px] font-mono uppercase font-bold text-[#718096] block mb-1">
          Verification Decision Drivers:
        </span>
        <div className="space-y-1">
          {result.explainableReasons.map((reason, idx) => (
            <div
              key={idx}
              className="text-[11px] text-[#172B4D] p-1.5 rounded bg-slate-50 border border-slate-200 flex items-start gap-1.5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1 shrink-0" />
              <span>{reason}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Municipal Notice */}
      <div className="p-2 rounded bg-blue-50/40 border border-blue-200/60 text-[10px] text-[#526581] flex items-start gap-1.5">
        <Info className="w-3.5 h-3.5 text-[#1769D2] shrink-0 mt-0.2" />
        <span>
          <strong>Decision Support Protocol:</strong> The AI verifies evidence completeness and flags anomalies for human review. Final statutory approval remains strictly in the hands of authorized municipal officers.
        </span>
      </div>
    </Card>
  );
};
