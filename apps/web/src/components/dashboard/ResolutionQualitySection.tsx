import React from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Star,
  Activity,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { UnifiedDashboardMetrics } from '../../services/dashboardIntelligenceService';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface ResolutionQualitySectionProps {
  quality: UnifiedDashboardMetrics['resolutionQuality'];
  onNavigatePage: (page: string) => void;
}

export const ResolutionQualitySection: React.FC<ResolutionQualitySectionProps> = ({
  quality,
  onNavigatePage,
}) => {
  return (
    <Card className="bg-white border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#123B6D] uppercase tracking-wider">
              Resolution Quality & Citizen Audits
            </h3>
            <p className="text-[11px] text-[#718096]">
              Officer remediation vs Independent on-site citizen verification
            </p>
          </div>
        </div>

        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
          {quality.satisfactionRatePct}% SATISFACTION
        </span>
      </div>

      {/* Body: Comparison Grid */}
      <div className="p-4 space-y-4">
        {/* Core Differentiator: Officer Resolved vs Citizen Verified */}
        <div className="grid grid-cols-2 gap-3">
          {/* Resolved by Officer */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-1">
            <div className="text-[10px] font-mono uppercase text-[#718096] font-bold">
              Resolved by Officer
            </div>
            <div className="text-2xl font-extrabold font-mono text-[#123B6D]">
              {quality.resolvedByOfficerCount}
            </div>
            <div className="text-[10px] text-slate-500">
              Before/after photo evidence logged
            </div>
          </div>

          {/* Verified by Citizen */}
          <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 text-center space-y-1">
            <div className="text-[10px] font-mono uppercase text-emerald-800 font-bold flex items-center justify-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Verified by Citizen</span>
            </div>
            <div className="text-2xl font-extrabold font-mono text-emerald-900">
              {quality.verifiedByCitizenCount}
            </div>
            <div className="text-[10px] text-emerald-700 font-medium">
              On-site citizen sign-offs
            </div>
          </div>
        </div>

        {/* Pending Audits & Reopen Breakdown */}
        <div className="p-3 bg-[#F8FAFC] rounded-xl border border-slate-200 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[#526581] font-semibold">Average Citizen Rating:</span>
            <div className="flex items-center gap-1 font-bold text-slate-800">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>{quality.averageRating} / 5.0</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[#526581] font-semibold">Pending Citizen Audits:</span>
            <span className="font-mono font-bold text-blue-700">
              {quality.pendingCitizenVerificationCount} awaiting review
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[#526581] font-semibold">Citizen Reopen Rate:</span>
            <span className="font-mono font-bold text-amber-700">
              {quality.reopenRatePct}% ({quality.reopenedCount} disputed)
            </span>
          </div>

          {/* Reopen Structured Reasons Distribution */}
          {quality.reopenedCount > 0 && (
            <div className="pt-2 border-t border-slate-200/80 space-y-1">
              <div className="text-[10px] font-mono uppercase text-[#718096] font-bold">
                Citizen Dispute Reasons:
              </div>
              <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
                <div className="bg-white p-1.5 rounded border border-slate-200">
                  <div className="font-bold text-amber-800">
                    {quality.reopenReasonsDistribution.partial_resolution || 0}
                  </div>
                  <div className="text-[#718096]">Partial Fix</div>
                </div>
                <div className="bg-white p-1.5 rounded border border-slate-200">
                  <div className="font-bold text-amber-800">
                    {quality.reopenReasonsDistribution.recurring_problem || 0}
                  </div>
                  <div className="text-[#718096]">Recurring</div>
                </div>
                <div className="bg-white p-1.5 rounded border border-slate-200">
                  <div className="font-bold text-amber-800">
                    {quality.reopenReasonsDistribution.poor_workmanship || 0}
                  </div>
                  <div className="text-[#718096]">Workmanship</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
        <span className="text-[11px] text-[#718096]">
          Automated integrity review active for feedback anomaly prevention
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onNavigatePage('complaints')}
          className="h-7 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50 gap-1 font-semibold"
        >
          <span>Inspect Audited Fixes</span>
          <ArrowRight className="w-3 h-3" />
        </Button>
      </div>
    </Card>
  );
};
