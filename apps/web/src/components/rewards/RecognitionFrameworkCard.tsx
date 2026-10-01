import React from 'react';
import {
  Landmark,
  Calendar,
  Award,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  ChevronRight,
  FileBadge,
} from 'lucide-react';
import { DistrictRecognitionCycle, DistrictLeaderboardEntry } from '../../types/civicRewards';
import { Card } from '../ui/Card';

interface RecognitionFrameworkCardProps {
  cycles: DistrictRecognitionCycle[];
  leaderboard: DistrictLeaderboardEntry[];
  districtName: string;
}

export const RecognitionFrameworkCard: React.FC<RecognitionFrameworkCardProps> = ({
  cycles = [],
  leaderboard = [],
  districtName = 'Solapur',
}) => {
  const currentCycle = cycles[0] || {
    id: 'REC-DEFAULT',
    districtId: districtName.toLowerCase(),
    districtName,
    eventName: `Republic Day Civic Champions 2026`,
    eventDate: '2026-01-26',
    eligibleRankLimit: 10,
    rewardType: 'Proposed District Civic Recognition & Digital Honor Certificate',
    status: 'proposed',
  };

  const eligibleChampions = leaderboard.slice(0, currentCycle.eligibleRankLimit || 10);

  return (
    <Card className="bg-white border-[#D9E2EC] shadow-xs overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#172B4D] to-[#123B6D] p-4 sm:p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
            <Landmark className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="text-[10px] font-mono tracking-widest text-blue-200 uppercase font-bold">
              ANNUAL DISTRICT CIVIC RECOGNITION FRAMEWORK
            </div>
            <h3 className="text-sm sm:text-base font-bold tracking-tight flex items-center gap-2">
              <span>{currentCycle.eventName}</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-400/20 text-amber-200 border border-amber-300/30">
                {currentCycle.eventDate}
              </span>
            </h3>
          </div>
        </div>

        <div className="text-right self-start sm:self-auto">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-blue-500/20 text-blue-200 border border-blue-400/30 uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Shortlist Open (Ranks 1–{currentCycle.eligibleRankLimit})</span>
          </span>
        </div>
      </div>

      {/* Proposed Framework Recognition Note */}
      <div className="p-4 bg-amber-50/70 border-b border-amber-200 text-xs space-y-1">
        <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
          <FileBadge className="w-4 h-4 text-amber-700 shrink-0" />
          <span>Proposed District Civic Recognition Framework</span>
        </div>
        <p className="text-[11px] text-amber-800 leading-relaxed">
          Citizens maintaining verified contribution quality in the top {currentCycle.eligibleRankLimit} positions of{' '}
          <strong>{districtName} District</strong> are shortlisted for proposed digital commendation certificates during annual civic review cycles (26 January / 15 August).
        </p>
      </div>

      {/* Eligible Shortlist Grid */}
      <div className="p-4 sm:p-5 space-y-3">
        <div className="text-xs font-bold text-[#123B6D] uppercase tracking-wider flex items-center justify-between">
          <span>Currently Shortlisted Eligible Contributors:</span>
          <span className="text-[10px] font-mono text-[#718096]">Top Verified Score</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {eligibleChampions.length === 0 ? (
            <div className="col-span-full py-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
              No eligible contributors yet in this district. Submit genuine complaints and verify resolutions to appear on this shortlist.
            </div>
          ) : (
            eligibleChampions.map((c) => (
              <div
                key={c.profileId}
                className="p-3.5 rounded-xl border border-[#E8EEF5] bg-slate-50/70 hover:bg-white hover:border-blue-300 hover:shadow-md transition-all flex flex-col justify-between gap-2.5 shadow-2xs min-w-0"
              >
                {/* Top: Rank badge + Name + Trophy / Badge */}
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="inline-flex items-center justify-center font-mono text-xs font-black text-[#1769D2] bg-blue-50 border border-blue-200 rounded-md w-7 h-7 shrink-0 shadow-2xs">
                      #{c.rank}
                    </span>
                    <span className="font-bold text-xs text-[#172B4D] truncate" title={c.displayName}>
                      {c.displayName}
                    </span>
                  </div>
                  <span className="text-sm shrink-0" title={c.badgeLabel || 'Civic Contributor'}>
                    {c.rank === 1 ? '🥇' : c.rank === 2 ? '🥈' : c.rank === 3 ? '🥉' : '🎖️'}
                  </span>
                </div>

                {/* Middle: Clear metric badges */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold whitespace-nowrap">
                    ✓ {c.verifiedReportsCount} verified
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200 font-semibold whitespace-nowrap">
                    ⚡ {c.verifiedResolutionsCount} resolved
                  </span>
                </div>

                {/* Bottom: Civic Score */}
                <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/70">
                  <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold">Civic Score</span>
                  <div className="flex items-baseline gap-1">
                    <span className="font-mono font-extrabold text-sm text-[#16803C]">
                      {c.civicScore.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-[#718096] font-semibold">pts</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footnote */}
        <div className="pt-2 text-[10px] text-[#718096] font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-t border-slate-100">
          <span>Award Format: {currentCycle.rewardType}</span>
          <span>Status: {currentCycle.status.toUpperCase()}</span>
        </div>
      </div>
    </Card>
  );
};
