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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {eligibleChampions.length === 0 ? (
            <div className="col-span-3 py-6 text-center text-xs text-slate-400">
              No eligible contributors yet. Build score through verified submissions.
            </div>
          ) : (
            eligibleChampions.map((c) => (
              <div
                key={c.profileId}
                className="p-3 rounded-lg border border-[#E8EEF5] bg-slate-50/60 hover:bg-white hover:border-blue-200 transition-all flex items-center justify-between shadow-2xs"
              >
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-xs font-extrabold text-[#1769D2] w-6">
                    #{c.rank}
                  </span>
                  <div>
                    <div className="font-bold text-xs text-[#172B4D]">{c.displayName}</div>
                    <div className="text-[10px] text-[#718096] font-mono">
                      {c.verifiedReportsCount} verified • {c.verifiedResolutionsCount} resolved
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-xs text-[#16803C]">
                    {c.civicScore}
                  </span>
                  <span className="text-[9px] text-[#718096] ml-0.5">pts</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footnote */}
        <div className="pt-2 text-[10px] text-[#718096] font-mono flex items-center justify-between">
          <span>Award Format: {currentCycle.rewardType}</span>
          <span>Status: {currentCycle.status.toUpperCase()}</span>
        </div>
      </div>
    </Card>
  );
};
