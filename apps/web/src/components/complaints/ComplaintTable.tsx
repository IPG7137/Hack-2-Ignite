import React from 'react';
import { Clock, Eye, MapPin, ArrowRight, RefreshCw, Layers, Sparkles, UserCheck } from 'lucide-react';
import { Complaint, ComplaintStatus } from '../../types/complaint';
import { StatusBadge } from '../ui/StatusBadge';
import { PriorityBadge } from '../ui/PriorityBadge';
import { Button } from '../ui/Button';
import { NEXT_VALID_STATUS } from '../../lib/constants';
import { SimilarityEngine } from '../../services/similarityEngine';
import { PriorityEngine } from '../../services/priorityEngine';
import { TableSkeleton } from '../ui/LoadingSkeleton';
import { EmptyState } from '../ui/EmptyState';
import { ErrorState } from '../ui/ErrorState';

interface ComplaintTableProps {
  complaints: Complaint[];
  selectedId?: string | null;
  onSelectComplaint: (id: string) => void;
  onAdvanceStatus?: (id: string, nextStatus: ComplaintStatus) => void;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export const ComplaintTable: React.FC<ComplaintTableProps> = ({
  complaints,
  selectedId,
  onSelectComplaint,
  onAdvanceStatus,
  loading = false,
  error = null,
  onRetry,
}) => {
  if (loading) {
    return <TableSkeleton rows={8} />;
  }

  if (error) {
    return (
      <ErrorState
        title="Failed to Load Municipal Complaints"
        message={error}
        onRetry={onRetry}
      />
    );
  }

  if (complaints.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
        <EmptyState
          title="No Active Complaints Found"
          description="There are currently no civic complaints matching your selected filter criteria or ward scope."
          actionLabel={onRetry ? 'Refresh Queue' : undefined}
          onAction={onRetry}
        />
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 font-mono uppercase text-[10px] tracking-wider select-none">
            <th className="py-3.5 px-3.5">Ticket ID</th>
            <th className="py-3.5 px-3.5">Category & Title</th>
            <th className="py-3.5 px-3.5">Location & Ward</th>
            <th className="py-3.5 px-3.5">Priority</th>
            <th className="py-3.5 px-3.5">Status</th>
            <th className="py-3.5 px-3.5">SLA Target</th>
            <th className="py-3.5 px-3.5">Assigned Officer</th>
            <th className="py-3.5 px-3.5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 font-sans">
          {complaints.map((c) => {
            const isSelected = selectedId === c.id;
            const nextStatus = NEXT_VALID_STATUS[c.status];
            const priorityAnalysis = PriorityEngine.evaluateComplaintPriority(c, complaints);
            const relatedSummary = SimilarityEngine.getRelatedCandidatesSummary(c, complaints);
            const isDup = relatedSummary?.topClassification === 'highConfidenceDuplicate';

            return (
              <tr
                key={c.id}
                onClick={() => onSelectComplaint(c.id)}
                className={`hover:bg-slate-50/90 transition-colors cursor-pointer group ${
                  isSelected ? 'bg-blue-50/70 border-l-4 border-l-[#1769D2]' : ''
                }`}
              >
                {/* Ticket ID */}
                <td className="py-3.5 px-3.5 font-mono font-bold text-[#1769D2] whitespace-nowrap">
                  #{c.id}
                  {c.jointIncidentId && (
                    <span
                      className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold font-mono border bg-amber-50 text-amber-800 border-amber-300 inline-block"
                      title={`Coordinated under Joint Action #${c.jointIncidentId}`}
                    >
                      ⚡ Joint Action
                    </span>
                  )}
                  {relatedSummary && (
                    <span
                      className={`ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold font-mono border inline-block ${
                        isDup
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}
                      title={`${relatedSummary.count} possible related reports nearby (${Math.round(
                        relatedSummary.highestConfidence * 100
                      )}% similarity)`}
                    >
                      ✨ {relatedSummary.count} {isDup ? 'Duplicate' : 'Related'}
                    </span>
                  )}
                </td>

                {/* Title & Category */}
                <td className="py-3.5 px-3.5 max-w-[280px]">
                  <div className="font-bold text-slate-800 group-hover:text-[#1769D2] transition-colors truncate">
                    {c.title}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                    {c.categoryLabel}
                  </div>
                </td>

                {/* Location & Ward */}
                <td className="py-3.5 px-3.5 max-w-[200px]">
                  <div className="text-slate-800 truncate flex items-center gap-1 font-medium">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{c.location.address}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">
                    {c.location.ward}
                  </div>
                </td>

                {/* Priority */}
                <td className="py-3.5 px-3.5 whitespace-nowrap">
                  <div className="space-y-0.5">
                    <PriorityBadge
                      priority={c.priority}
                      score={Math.round(priorityAnalysis.score)}
                    />
                    {priorityAnalysis.topDrivers.length > 0 && (
                      <div className="text-[9px] text-slate-500 font-mono truncate max-w-[130px]">
                        {priorityAnalysis.topDrivers[0]}
                      </div>
                    )}
                  </div>
                </td>

                {/* Status */}
                <td className="py-3.5 px-3.5 whitespace-nowrap">
                  <StatusBadge status={c.status} />
                </td>

                {/* SLA Target */}
                <td className="py-3.5 px-3.5 whitespace-nowrap font-mono text-[11px]">
                  <span
                    className={`flex items-center gap-1 font-bold ${
                      c.sla.isOverdue
                        ? 'text-red-700 font-black animate-pulse'
                        : c.sla.slaStatus === 'warning'
                        ? 'text-amber-700'
                        : 'text-emerald-700'
                    }`}
                  >
                    <Clock className="w-3 h-3" />
                    {c.sla.isOverdue ? `OVERDUE` : `${c.sla.hoursRemaining}h left`}
                  </span>
                </td>

                {/* Field Unit */}
                <td className="py-3.5 px-3.5 whitespace-nowrap text-slate-600">
                  {c.assignment ? (
                    <div>
                      <div className="font-semibold text-slate-800">{c.assignment.officerName}</div>
                      <div className="text-[10px] text-slate-500">{c.assignment.departmentName}</div>
                    </div>
                  ) : (
                    <span className="text-slate-400 italic">Unassigned</span>
                  )}
                </td>

                {/* Actions */}
                <td className="py-3.5 px-3.5 text-right whitespace-nowrap">
                  <div
                    className="flex items-center justify-end gap-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {nextStatus && onAdvanceStatus && (
                      <Button
                        variant="primary"
                        size="sm"
                        className="h-6.5 text-[10px] px-2 bg-[#1769D2] hover:bg-[#123B6D] text-white"
                        onClick={() => onAdvanceStatus(c.id, nextStatus)}
                        title={`Advance lifecycle to ${nextStatus}`}
                      >
                        <span>Advance</span>
                        <ArrowRight className="w-2.5 h-2.5 ml-1" />
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                      onClick={() => onSelectComplaint(c.id)}
                      title="Inspect Full Incident Dossier"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
