import React from 'react';
import { Clock, Eye, MapPin, ArrowRight, AlertCircle, RefreshCw, Layers, Sparkles, Flame } from 'lucide-react';
import { Complaint, ComplaintStatus } from '../../types/complaint';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { NEXT_VALID_STATUS } from '../../lib/constants';
import { SimilarityEngine } from '../../services/similarityEngine';
import { PriorityEngine } from '../../services/priorityEngine';

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
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-[#D9E2EC] bg-white shadow-sm">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="border-b border-[#D9E2EC] bg-[#F8FAFC] text-[#526581] font-mono uppercase text-[10px] tracking-wider">
            <th className="py-3 px-3">Ticket ID</th>
            <th className="py-3 px-3">Category & Title</th>
            <th className="py-3 px-3">Location & Ward</th>
            <th className="py-3 px-3">Priority</th>
            <th className="py-3 px-3">Status</th>
            <th className="py-3 px-3">SLA Status</th>
            <th className="py-3 px-3">Field Unit</th>
            <th className="py-3 px-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E8EEF5] font-sans">
          {loading ? (
            <tr>
              <td colSpan={8} className="py-12 text-center text-[#526581]">
                <div className="flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-[#1769D2]" />
                  <span className="text-xs font-medium">Loading live complaints from Supabase...</span>
                </div>
              </td>
            </tr>
          ) : error ? (
            <tr>
              <td colSpan={8} className="py-10 text-center">
                <div className="flex flex-col items-center justify-center gap-2 text-red-600">
                  <AlertCircle className="w-5 h-5" />
                  <span className="text-xs font-semibold">{error}</span>
                  {onRetry && (
                    <Button variant="outline" size="sm" onClick={onRetry} className="mt-1 h-7 text-xs">
                      Retry Connection
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ) : complaints.length === 0 ? (
            <tr>
              <td colSpan={8} className="py-12 text-center text-[#718096]">
                <div className="flex flex-col items-center justify-center gap-1">
                  <span className="text-sm font-semibold text-[#172B4D]">No complaints found</span>
                  <span className="text-xs text-[#526581]">
                    No reports match the current filter criteria in the live database.
                  </span>
                </div>
              </td>
            </tr>
          ) : (
            complaints.map((c) => {
              const isSelected = selectedId === c.id;
              const nextStatus = NEXT_VALID_STATUS[c.status];

              return (
                <tr
                  key={c.id}
                  onClick={() => onSelectComplaint(c.id)}
                  className={`hover:bg-slate-50 transition-colors cursor-pointer ${
                    isSelected ? 'bg-blue-50/60 border-l-4 border-l-[#1769D2]' : ''
                  }`}
                >
                  {/* Ticket ID */}
                  <td className="py-3 px-3 font-mono font-bold text-[#1769D2] whitespace-nowrap">
                    #{c.id}
                    {(() => {
                      const relatedSummary = SimilarityEngine.getRelatedCandidatesSummary(c, complaints);
                      if (!relatedSummary) return null;
                      const isDup = relatedSummary.topClassification === 'highConfidenceDuplicate';
                      return (
                        <span
                          className={`ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold font-mono border ${
                            isDup
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}
                          title={`${relatedSummary.count} possible related ${
                            relatedSummary.count === 1 ? 'complaint' : 'complaints'
                          } nearby (${Math.round(relatedSummary.highestConfidence * 100)}% similarity)`}
                        >
                          ✨ {relatedSummary.count} {isDup ? 'Potential Duplicate' : 'Related'}
                        </span>
                      );
                    })()}
                  </td>

                  {/* Title & Category */}
                  <td className="py-3 px-3 max-w-[280px]">
                    <div className="font-bold text-[#172B4D] truncate">{c.title}</div>
                    <div className="text-[10px] text-[#718096] font-medium mt-0.5">{c.categoryLabel}</div>
                  </td>

                  {/* Location & Ward */}
                  <td className="py-3 px-3 max-w-[200px]">
                    <div className="text-[#172B4D] truncate flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#718096] shrink-0" />
                      <span className="truncate">{c.location.address}</span>
                    </div>
                    <div className="text-[10px] text-[#526581] font-mono mt-0.5 truncate">
                      {c.location.ward}
                    </div>
                  </td>

                  {/* Smart Priority (Phase 3B Multi-Signal) */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    {(() => {
                      const priorityAnalysis = PriorityEngine.evaluateComplaintPriority(c, complaints);
                      return (
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
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
                          </div>
                          {priorityAnalysis.topDrivers.length > 0 && (
                            <div className="text-[9px] text-[#526581] font-mono truncate max-w-[120px]">
                              {priorityAnalysis.topDrivers[0]}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </td>

                  {/* Status */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <Badge status={c.status} />
                  </td>

                  {/* SLA */}
                  <td className="py-3 px-3 whitespace-nowrap font-mono text-[11px]">
                    <span
                      className={`flex items-center gap-1 font-bold ${
                        c.sla.isOverdue
                          ? 'text-red-700'
                          : c.sla.slaStatus === 'warning'
                          ? 'text-amber-700'
                          : 'text-[#16803C]'
                      }`}
                    >
                      <Clock className="w-3 h-3" />
                      {c.sla.isOverdue ? `BREACHED` : `${c.sla.hoursRemaining}h left`}
                    </span>
                  </td>

                  {/* Field Unit */}
                  <td className="py-3 px-3 whitespace-nowrap text-[#526581]">
                    {c.assignment ? (
                      <div>
                        <div className="font-semibold text-[#172B4D]">{c.assignment.officerName}</div>
                        <div className="text-[10px] text-[#718096]">{c.assignment.departmentName}</div>
                      </div>
                    ) : (
                      <span className="text-[#718096] italic">Unassigned</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-3 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {nextStatus && onAdvanceStatus && (
                        <Button
                          variant="primary"
                          size="sm"
                          className="h-6 text-[10px] px-2 bg-[#1769D2] hover:bg-[#123B6D]"
                          onClick={() => onAdvanceStatus(c.id, nextStatus)}
                          title={`Advance to ${nextStatus}`}
                        >
                          <span>Advance</span>
                          <ArrowRight className="w-2.5 h-2.5 ml-1" />
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-[#526581] hover:text-[#172B4D]"
                        onClick={() => onSelectComplaint(c.id)}
                        title="View Full Dossier"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};
