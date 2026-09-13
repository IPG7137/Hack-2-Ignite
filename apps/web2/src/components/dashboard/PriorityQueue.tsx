import React from 'react';
import { AlertCircle, ArrowRight, Clock, MapPin, Sparkles, UserCheck, Layers } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Complaint } from '../../types/complaint';
import { SimilarityEngine } from '../../services/similarityEngine';
import { PriorityEngine, CivicPriorityAnalysis } from '../../services/priorityEngine';

interface PriorityQueueProps {
  complaints: Complaint[];
  onSelectComplaint: (id: string) => void;
  onAdvanceStatus?: (id: string) => void;
}

export const PriorityQueue: React.FC<PriorityQueueProps> = ({
  complaints,
  onSelectComplaint,
}) => {
  // Sort deterministically by calculated Smart Civic Priority (0 - 100)
  const sortedPriorities = React.useMemo(() => {
    return PriorityEngine.sortComplaintsByPriority(complaints);
  }, [complaints]);

  const criticalOrHighCount = sortedPriorities.filter(
    (item) => item.priorityAnalysis.score >= 60.0
  ).length;

  const displayList = sortedPriorities.slice(0, 6);

  return (
    <Card className="flex flex-col h-full overflow-hidden border-[#D9E2EC] bg-white">
      <div className="px-4 py-3 border-b border-[#D9E2EC] flex items-center justify-between bg-[#F8FAFC]">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-[#D92D20]" />
          <h3 className="text-xs font-bold text-[#172B4D] uppercase tracking-wider">
            Smart Operational Priority Queue
          </h3>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 font-bold">
          {criticalOrHighCount} HIGH / CRITICAL
        </span>
      </div>

      <div className="divide-y divide-[#E8EEF5] overflow-y-auto flex-1">
        {displayList.length === 0 ? (
          <div className="p-8 text-center text-[#718096] text-xs flex flex-col items-center justify-center h-full">
            <AlertCircle className="w-6 h-6 text-[#A0AEC0] mb-2" />
            <span className="font-semibold text-[#172B4D]">No Active Grievances</span>
            <p className="text-[11px] text-[#526581] mt-1">
              Zero complaints pending triage in the municipal queue.
            </p>
          </div>
        ) : (
          displayList.map(({ complaint: item, priorityAnalysis }) => {
            return (
              <div
                key={item.id}
                className="p-3.5 hover:bg-slate-50/80 transition-colors flex flex-col gap-2 group cursor-pointer"
                onClick={() => onSelectComplaint(item.id)}
              >
                {/* Row 1: Badges, Calculated Smart Priority & SLA Timer */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono text-xs font-bold text-[#1769D2]">
                      #{item.id}
                    </span>

                    {/* Calculated Priority Score Pill */}
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${priorityAnalysis.badgeBg} ${priorityAnalysis.badgeBorder} ${priorityAnalysis.badgeText}`}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: priorityAnalysis.badgeColor }}
                      />
                      <span>{priorityAnalysis.levelLabel.toUpperCase()}</span>
                      <span>·</span>
                      <span>{priorityAnalysis.scoreDisplay}</span>
                    </span>

                    <Badge status={item.status} />
                  </div>

                  {/* SLA Timer */}
                  <div
                    className={`text-[11px] font-mono font-bold flex items-center gap-1 ${
                      item.sla.isOverdue
                        ? 'text-[#D92D20] animate-pulse'
                        : item.sla.hoursRemaining <= 4
                        ? 'text-[#EA580C]'
                        : 'text-[#526581]'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>{item.sla.isOverdue ? `${Math.abs(item.sla.hoursRemaining)}h OVERDUE` : `${item.sla.hoursRemaining}h SLA left`}</span>
                  </div>
                </div>

                {/* Row 2: Title & Location */}
                <div>
                  <h4 className="text-xs font-bold text-[#172B4D] group-hover:text-[#1769D2] transition-colors line-clamp-1">
                    {item.title}
                  </h4>
                  <div className="flex items-center gap-1 text-[11px] text-[#526581] mt-0.5">
                    <MapPin className="w-3 h-3 text-[#718096] shrink-0" />
                    <span className="truncate">{item.location.address}</span>
                    <span className="text-[#D9E2EC]">•</span>
                    <span className="text-[#172B4D] font-medium shrink-0">{item.location.ward}</span>
                  </div>
                </div>

                {/* Row 3: Priority Drivers Tags */}
                {priorityAnalysis.topDrivers.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-mono text-[#718096]">Drivers:</span>
                    {priorityAnalysis.topDrivers.map((driver, idx) => (
                      <span
                        key={idx}
                        className="px-1.5 py-0.2 rounded bg-slate-100 border border-slate-200 text-[#526581] font-mono text-[9px] font-semibold"
                      >
                        {driver}
                      </span>
                    ))}
                  </div>
                )}

                {/* Phase 3A: Related Complaint Indicator */}
                {(() => {
                  const relatedSummary = SimilarityEngine.getRelatedCandidatesSummary(item, complaints);
                  if (!relatedSummary) return null;
                  const isDup = relatedSummary.topClassification === 'highConfidenceDuplicate';
                  return (
                    <div
                      className={`p-1.5 rounded text-[10px] flex items-center gap-1.5 font-medium border ${
                        isDup
                          ? 'bg-purple-50 text-purple-900 border-purple-200'
                          : 'bg-blue-50 text-blue-900 border-blue-200'
                      }`}
                    >
                      <Layers className="w-3 h-3 text-purple-700 shrink-0" />
                      <span>
                        {relatedSummary.count} possible related {relatedSummary.count === 1 ? 'complaint' : 'complaints'} nearby ({Math.round(relatedSummary.highestConfidence * 100)}% similarity)
                      </span>
                    </div>
                  );
                })()}

                {/* Row 4: Assigned Unit & Action */}
                <div className="flex items-center justify-between pt-1 border-t border-[#E8EEF5] mt-0.5">
                  <div className="text-[11px] text-[#526581] flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-[#718096]" />
                    {item.assignment ? (
                      <span className="text-[#172B4D] font-medium">
                        Assigned: <span className="text-[#1769D2] font-semibold">{item.assignment.officerName}</span>
                      </span>
                    ) : (
                      <span className="text-amber-700 font-semibold">⚠️ Unassigned Field Unit</span>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[10px] px-2.5 bg-white border-[#D9E2EC] text-[#172B4D] hover:bg-[#1769D2] hover:text-white hover:border-[#1769D2]"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectComplaint(item.id);
                    }}
                  >
                    <span>Inspect Dossier</span>
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
};
