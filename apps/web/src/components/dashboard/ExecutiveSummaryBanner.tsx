import React from 'react';
import {
  TrendingDown,
  ShieldCheck,
  Star,
  Users,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { UnifiedDashboardMetrics } from '../../services/dashboardIntelligenceService';
import { Card } from '../ui/Card';

interface ExecutiveSummaryBannerProps {
  metrics: UnifiedDashboardMetrics['executive'];
  districtName: string;
  onNavigatePage: (page: string) => void;
}

export const ExecutiveSummaryBanner: React.FC<ExecutiveSummaryBannerProps> = ({
  metrics,
  districtName,
  onNavigatePage,
}) => {
  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#123B6D] via-[#174F8B] to-[#1769D2] text-white shadow-md space-y-4">
      {/* Header / Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/15 pb-3">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded-md bg-white/15 border border-white/20">
            <Sparkles className="w-4 h-4 text-amber-300" />
          </span>
          <div>
            <h2 className="text-sm sm:text-base font-bold tracking-tight">
              {districtName} Municipal Intelligence & Civic Participation Synthesis
            </h2>
            <p className="text-[11px] text-blue-200">
              Live operational loop connecting citizen reporting, municipal action, verified resolution, and civic recognition.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-mono self-start sm:self-auto">
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 flex items-center gap-1.5 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            SYNCHRONIZED OVERSIGHT
          </span>
        </div>
      </div>

      {/* 4 Executive Command KPI Blocks */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 1. Active Backlog */}
        <div className="p-3.5 rounded-xl bg-white/10 backdrop-blur-xs border border-white/15 space-y-1">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-blue-200">
            <span>Active Grievances</span>
            <TrendingDown className="w-3.5 h-3.5 text-emerald-300" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold font-mono text-white">
              {metrics.activeBacklog.toLocaleString()}
            </span>
            <span className="text-[10px] font-mono text-emerald-300 font-bold">
              {metrics.backlogChangePct}% this period
            </span>
          </div>
          <div className="text-[10px] text-blue-200/80 font-mono">
            {metrics.totalComplaints} total on ledger
          </div>
        </div>

        {/* 2. Operational Risks & Emerging Hotspots */}
        <div
          onClick={() => onNavigatePage('alerts')}
          className="p-3.5 rounded-xl bg-white/10 backdrop-blur-xs border border-white/15 space-y-1 hover:bg-white/15 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-amber-200">
            <span>SLA Risks & Hotspots</span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-300 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold font-mono text-amber-300">
              {metrics.slaRiskCount}
            </span>
            <span className="text-[10px] font-mono text-orange-200 font-bold">
              {metrics.emergingHotspotsCount} active hotspots
            </span>
          </div>
          <div className="text-[10px] text-blue-200/80 flex items-center justify-between">
            <span>Actionable risk points</span>
            <ArrowRight className="w-3 h-3 text-amber-200 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* 3. Resolution Quality & Satisfaction */}
        <div
          onClick={() => onNavigatePage('complaints')}
          className="p-3.5 rounded-xl bg-white/10 backdrop-blur-xs border border-white/15 space-y-1 hover:bg-white/15 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-emerald-200">
            <span>Citizen Verification</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-300 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-300">
              {metrics.citizenVerificationRatePct}%
            </span>
            <span className="text-[10px] font-bold text-amber-300 flex items-center gap-0.5">
              <Star className="w-3 h-3 fill-amber-300 text-amber-300" />
              {metrics.averageSatisfactionRating} / 5.0
            </span>
          </div>
          <div className="text-[10px] text-blue-200/80 font-mono">
            On-site citizen verified audit rate
          </div>
        </div>

        {/* 4. Civic Community Support & Milestones */}
        <div
          onClick={() => onNavigatePage('civic_champions')}
          className="p-3.5 rounded-xl bg-white/10 backdrop-blur-xs border border-white/15 space-y-1 hover:bg-white/15 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-blue-200">
            <span>Civic Participation</span>
            <Users className="w-3.5 h-3.5 text-blue-300 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold font-mono text-white">
              {metrics.communitySupportedIssuesCount}
            </span>
            <span className="text-[10px] font-mono text-blue-200 font-bold">
              {metrics.verifiedCivicContributionsCount} verified merits
            </span>
          </div>
          <div className="text-[10px] text-blue-200/80 flex items-center justify-between">
            <span>Community-backed issues</span>
            <ArrowRight className="w-3 h-3 text-blue-200 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );
};
