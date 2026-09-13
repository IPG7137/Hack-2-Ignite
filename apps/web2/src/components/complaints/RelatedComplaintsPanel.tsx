import React, { useMemo } from 'react';
import { Complaint } from '../../types/complaint';
import { SimilarityEngine, SimilarityAnalysisResult } from '../../services/similarityEngine';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  Layers,
  Sparkles,
  MapPin,
  Clock,
  ArrowRight,
  ShieldAlert,
  Info,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface RelatedComplaintsPanelProps {
  targetComplaint: Complaint;
  allComplaints: Complaint[];
  onSelectComplaint?: (id: string) => void;
}

export const RelatedComplaintsPanel: React.FC<RelatedComplaintsPanelProps> = ({
  targetComplaint,
  allComplaints,
  onSelectComplaint,
}) => {
  const relatedResults = useMemo(() => {
    return SimilarityEngine.findRelatedComplaints(targetComplaint, allComplaints, {
      limit: 6,
      minConfidence: 0.45,
    });
  }, [targetComplaint, allComplaints]);

  return (
    <Card className="p-4 border-[#D9E2EC] bg-white shadow-sm space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[#E8EEF5]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#172B4D] flex items-center gap-1.5">
              <span>Phase 3A: Related Complaints & Duplicate Intelligence</span>
            </h3>
            <p className="text-[10px] text-[#526581]">
              Multi-signal analysis (Location 30% · Category 25% · Text 30% · Temporal 15%)
            </p>
          </div>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-[#526581] border border-slate-200 font-semibold">
          {relatedResults.length} {relatedResults.length === 1 ? 'Candidate' : 'Candidates'} Found
        </span>
      </div>

      {/* Zero State */}
      {relatedResults.length === 0 ? (
        <div className="p-4 rounded-md bg-slate-50 border border-slate-200 text-center space-y-1">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto" />
          <div className="text-xs font-semibold text-[#172B4D]">No Related Complaints Identified</div>
          <p className="text-[10px] text-[#718096] max-w-sm mx-auto">
            This grievance appears to be an isolated incident with no matching nearby reports or duplicate clusters in the active database.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {relatedResults.map((result) => {
            const cand = result.candidateComplaint;
            const isHighConfidence = result.classification === 'highConfidenceDuplicate';

            return (
              <div
                key={cand.id}
                className={`p-3 rounded-md border transition-all ${
                  isHighConfidence
                    ? 'bg-purple-50/40 border-purple-200 hover:border-purple-300'
                    : 'bg-blue-50/30 border-blue-200 hover:border-blue-300'
                }`}
              >
                {/* Item Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-xs font-bold text-[#1769D2]">
                        #{cand.id}
                      </span>
                      <span
                        className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${
                          isHighConfidence
                            ? 'bg-purple-100 text-purple-800 border-purple-300'
                            : 'bg-blue-100 text-blue-800 border-blue-300'
                        }`}
                      >
                        {result.displayLabel}
                      </span>
                      <Badge status={cand.status} className="text-[10px] py-0 px-1.5" />
                    </div>
                    <div className="text-xs font-semibold text-[#172B4D] line-clamp-1">
                      {cand.title}
                    </div>
                  </div>

                  {onSelectComplaint && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onSelectComplaint(cand.id)}
                      className="h-7 px-2 text-[10px] bg-white border-[#D9E2EC] text-[#172B4D] hover:bg-slate-50 shrink-0 inline-flex items-center gap-1 font-medium"
                      title="Open full dossier for this related complaint"
                    >
                      <span>Inspect Dossier</span>
                      <ArrowRight className="w-3 h-3 text-[#1769D2]" />
                    </Button>
                  )}
                </div>

                {/* Description snippet if available */}
                {cand.description && (
                  <p className="text-[11px] text-[#526581] line-clamp-2 mt-1 italic">
                    "{cand.description}"
                  </p>
                )}

                {/* Multi-Signal Reason Pills */}
                <div className="flex items-center gap-1.5 flex-wrap mt-2 pt-1.5 border-t border-slate-200/60 text-[10px]">
                  {result.explainableReasons.map((reason, idx) => (
                    <span
                      key={idx}
                      className="px-1.5 py-0.5 rounded bg-white border border-[#D9E2EC] text-[#526581] font-mono flex items-center gap-1"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1769D2]" />
                      <span>{reason}</span>
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Governance Safety Disclaimer */}
      <div className="p-2 rounded bg-amber-50/50 border border-amber-200/80 flex items-start gap-2 text-[10px] text-amber-900">
        <Info className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
        <span>
          <strong>Municipal Protocol Notice:</strong> Potential duplicate matches are calculated for officer situational awareness. Reports are never automatically merged or deleted. Officers retain full authority over independent resolution.
        </span>
      </div>
    </Card>
  );
};
