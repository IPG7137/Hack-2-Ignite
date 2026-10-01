import React from 'react';
import {
  AlertOctagon,
  ArrowRight,
  Clock,
  MapPin,
  UserCheck,
  Layers,
  Inbox,
  Sparkles,
} from 'lucide-react';
import { Complaint } from '../../types/complaint';
import { SimilarityEngine } from '../../services/similarityEngine';
import { PriorityEngine } from '../../services/priorityEngine';
import { StatusBadge } from '../ui/StatusBadge';
import { PriorityBadge } from '../ui/PriorityBadge';
import { Button } from '../ui/Button';

interface PriorityQueueProps {
  complaints: Complaint[];
  onSelectComplaint: (id: string) => void;
  onAdvanceStatus?: (id: string) => void;
  onViewAll?: () => void;
}

export const PriorityQueue: React.FC<PriorityQueueProps> = ({
  complaints,
  onSelectComplaint,
  onViewAll,
}) => {
  // Sort deterministically by calculated Smart Civic Priority (0 - 100)
  const sortedPriorities = React.useMemo(() => {
    return PriorityEngine.sortComplaintsByPriority(complaints);
  }, [complaints]);

  const criticalOrHighCount = sortedPriorities.filter(
    (item) => item.priorityAnalysis.score >= 60.0
  ).length;

  const displayList = sortedPriorities.slice(0, 3);

  return (
    <div className="flex flex-col h-full rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-red-100/70 border border-red-200 text-red-700 flex items-center justify-center">
            <AlertOctagon className="w-3.5 h-3.5 stroke-[2.5]" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Operational Priority & Triage Queue
            </h3>
            <p className="text-[10px] text-slate-500">Multi-signal algorithmic ranking</p>
          </div>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 font-bold">
          {criticalOrHighCount} HIGH / CRITICAL
        </span>
      </div>

      {/* Body */}
      <div className="divide-y divide-slate-100 overflow-y-auto flex-1 min-h-[300px]">
        {displayList.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center justify-center h-full">
            <Inbox className="w-8 h-8 text-slate-300 mb-2 stroke-[1.5]" />
            <span className="font-bold text-slate-700">No Active Grievances in Queue</span>
            <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
              All reported complaints have been cleared or are awaiting triage.
            </p>
          </div>
        ) : (
          displayList.map(({ complaint: item, priorityAnalysis }) => {
            const relatedSummary = SimilarityEngine.getRelatedCandidatesSummary(item, complaints);
            const isDup = relatedSummary?.topClassification === 'highConfidenceDuplicate';

            return (
              <div
                key={item.id}
                onClick={() => onSelectComplaint(item.id)}
                className="p-3.5 hover:bg-slate-50/90 transition-colors flex flex-col gap-2 group cursor-pointer"
              >
                {/* Row 1: ID, Badges, SLA */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono text-xs font-bold text-[#1769D2]">
                      #{item.id}
                    </span>
                    <PriorityBadge
                      priority={item.priority}
                      score={Math.round(priorityAnalysis.score)}
                    />
                    <StatusBadge status={item.status} />
                  </div>

                  <div
                    className={`text-[11px] font-mono font-bold flex items-center gap-1 shrink-0 ${
                      item.sla.isOverdue
                        ? 'text-red-700 font-black animate-pulse'
                        : item.sla.hoursRemaining <= 4
                        ? 'text-amber-700'
                        : 'text-slate-600'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      {item.sla.isOverdue
                        ? `${Math.abs(item.sla.hoursRemaining)}h OVERDUE`
                        : `${item.sla.hoursRemaining}h SLA left`}
                    </span>
                  </div>
                </div>

                {/* Row 2: Title & Location */}
                <div>
                  <h4 className="text-xs font-bold text-slate-800 group-hover:text-[#1769D2] transition-colors line-clamp-1">
                    {item.title}
                  </h4>
                  <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{item.location.address}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-700 font-semibold shrink-0">{item.location.ward}</span>
                  </div>
                </div>

                {/* Row 3: Priority Drivers */}
                {priorityAnalysis.topDrivers.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-mono text-slate-400 uppercase">Drivers:</span>
                    {priorityAnalysis.topDrivers.map((driver, idx) => (
                      <span
                        key={idx}
                        className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[9px] font-semibold border border-slate-200/70"
                      >
                        {driver}
                      </span>
                    ))}
                  </div>
                )}

                {/* Duplicate / Cluster Note */}
                {relatedSummary && (
                  <div
                    className={`px-2 py-1 rounded text-[10px] flex items-center gap-1.5 font-medium border ${
                      isDup
                        ? 'bg-purple-50 text-purple-800 border-purple-200'
                        : 'bg-blue-50 text-blue-800 border-blue-200'
                    }`}
                  >
                    <Layers className="w-3 h-3 shrink-0" />
                    <span className="truncate">
                      {relatedSummary.count} potential {isDup ? 'duplicate' : 'related'} reports nearby ({Math.round(relatedSummary.highestConfidence * 100)}% match)
                    </span>
                  </div>
                )}

                {/* Row 4: Assigned Unit & Action */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 mt-0.5">
                  <div className="text-[11px] text-slate-600 flex items-center gap-1.5 truncate">
                    <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    {item.assignment ? (
                      <span className="truncate">
                        Assigned: <strong className="text-slate-800">{item.assignment.officerName}</strong>
                      </span>
                    ) : (
                      <span className="text-amber-700 font-semibold">⚠️ Unassigned Unit</span>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6.5 text-[10px] px-2.5 bg-white border-slate-200 text-slate-700 hover:bg-[#1769D2] hover:text-white hover:border-[#1769D2] shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectComplaint(item.id);
                    }}
                  >
                    <span>Inspect</span>
                    <ArrowRight className="w-2.5 h-2.5 ml-1" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {onViewAll && (
        <div className="p-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-500 font-medium">
            Showing top {displayList.length} urgent issues of {complaints.length}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={onViewAll}
            className="h-7 text-xs text-[#1769D2] hover:bg-blue-50 border-blue-200 font-semibold gap-1"
          >
            <span>View All Complaints</span>
            <ArrowRight className="w-3 h-3" />
          </Button>
        </div>
      )}
    </div>
  );
};
