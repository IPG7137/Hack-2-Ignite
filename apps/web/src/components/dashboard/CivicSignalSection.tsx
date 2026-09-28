import React from 'react';
import {
  Users,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  MapPin,
  Sparkles,
  Layers,
} from 'lucide-react';
import { UnifiedDashboardMetrics } from '../../services/dashboardIntelligenceService';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { PriorityBadge } from '../ui/PriorityBadge';
import { StatusBadge } from '../ui/StatusBadge';
import { Button } from '../ui/Button';

interface CivicSignalSectionProps {
  civicSignal: UnifiedDashboardMetrics['civicSignal'];
  onSelectComplaint: (id: string) => void;
  onNavigatePage: (page: string) => void;
}

export const CivicSignalSection: React.FC<CivicSignalSectionProps> = ({
  civicSignal,
  onSelectComplaint,
  onNavigatePage,
}) => {
  return (
    <Card className="bg-white border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-100 text-[#1769D2] flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#123B6D] uppercase tracking-wider">
              Citizen Signal & Community Support
            </h3>
            <p className="text-[11px] text-[#718096]">
              Aggregated neighborhood issues supported by local citizens (Zero PII)
            </p>
          </div>
        </div>

        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-50 text-[#1769D2] border border-blue-200 font-bold">
          {civicSignal.totalCommunitySupportsCount} TOTAL SUPPORTS
        </span>
      </div>

      {/* Body: Top Supported Issues List */}
      <div className="p-4 space-y-3">
        <div className="text-[11px] text-[#526581] flex items-center justify-between">
          <span className="font-semibold text-slate-800">
            Most-Supported Open Neighborhood Grievances:
          </span>
          <span className="text-[10px] font-mono text-[#718096]">
            Duplicates reduced via 3A routing
          </span>
        </div>

        {civicSignal.topSupportedIssues.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
            No community-supported issues recorded in current district view.
          </div>
        ) : (
          <div className="space-y-2">
            {civicSignal.topSupportedIssues.map((issue) => (
              <div
                key={issue.id}
                onClick={() => onSelectComplaint(String(issue.id))}
                className="p-3 rounded-lg border border-slate-200 bg-[#F8FAFC] hover:bg-blue-50/40 hover:border-blue-300 transition-all cursor-pointer group flex items-center justify-between gap-3"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-xs text-[#123B6D]">
                      {issue.formattedId}
                    </span>
                    <PriorityBadge priority={issue.priority} />
                    <StatusBadge status={issue.status} />
                    <span className="text-[10px] font-mono text-[#718096] truncate">
                      {issue.category}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-800 truncate group-hover:text-[#1769D2]">
                    {issue.title}
                  </div>
                  <div className="text-[10px] text-[#718096] flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{issue.locationAddress}</span>
                  </div>
                </div>

                {/* Support Count Badge */}
                <div className="shrink-0 text-right">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-100/80 border border-blue-200 text-[#1769D2] font-mono font-bold text-xs">
                    <Users className="w-3.5 h-3.5" />
                    <span>{issue.supportCount}</span>
                  </div>
                  <div className="text-[9px] text-[#718096] mt-0.5">supports</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
        <div className="text-[11px] text-[#718096] flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>{civicSignal.verifiedActionsThisPeriod} verified civic actions this period</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onNavigatePage('complaints')}
          className="h-7 text-xs text-[#1769D2] border-blue-200 hover:bg-blue-50 gap-1 font-semibold"
        >
          <span>Explore All Grievances</span>
          <ArrowRight className="w-3 h-3" />
        </Button>
      </div>
    </Card>
  );
};
