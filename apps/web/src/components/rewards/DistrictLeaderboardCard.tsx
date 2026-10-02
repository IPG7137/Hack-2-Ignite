import React from 'react';
import {
  Trophy,
  Medal,
  Award,
  ShieldCheck,
  CheckCircle2,
  Users,
  Info,
  Sparkles,
} from 'lucide-react';
import { DistrictLeaderboardEntry, DistrictRecognitionCycle } from '../../types/civicRewards';
import { CIVIC_BADGE_DETAILS } from '../../services/civicRewardsConfig';
import { Card } from '../ui/Card';

interface DistrictLeaderboardCardProps {
  entries: DistrictLeaderboardEntry[];
  districtName: string;
  divisionName?: string;
  currentUserId?: string;
  recognitionCycle?: DistrictRecognitionCycle;
  isLiveDataset?: boolean;
}

export const DistrictLeaderboardCard: React.FC<DistrictLeaderboardCardProps> = ({
  entries = [],
  districtName = 'Solapur',
  divisionName = 'Pune',
  currentUserId,
  recognitionCycle,
  isLiveDataset = false,
}) => {
  const eligibleLimit = recognitionCycle?.eligibleRankLimit ?? 10;

  return (
    <Card className="bg-white border-[#D9E2EC] shadow-xs overflow-hidden">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-[#E8EEF5] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Trophy className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#123B6D] uppercase tracking-wider flex items-center gap-2 flex-wrap">
              <span>🏆 {districtName} Civic Champions</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-[#1769D2] border border-blue-200">
                District Scoped
              </span>
              {isLiveDataset ? (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                  Live Municipal Database
                </span>
              ) : (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
                  Demo Leaderboard — Sample Data
                </span>
              )}
            </h2>
            <p className="text-[11px] text-[#526581] mt-0.5">
              {isLiveDataset
                ? `Live verified civic contributors across ${districtName} District (${divisionName} Division). Ranked strictly by verified resolution impact.`
                : `Sample baseline dataset for ${districtName} District (${divisionName} Division). Authenticated citizen verified contributions are dynamically merged and ranked in real time.`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-[10px] font-mono text-[#718096] bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200 flex items-center gap-1.5">
            <Users className="w-3 h-3 text-[#1769D2]" />
            <span>{entries.length} Champions Ranked</span>
          </span>
        </div>
      </div>

      {/* Annual Recognition Framework Context Bar */}
      {recognitionCycle && (
        <div className="px-4 py-2.5 bg-gradient-to-r from-blue-50/90 to-amber-50/70 border-b border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-[#123B6D]">
            <Award className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Annual Civic Recognition Framework:</strong> {recognitionCycle.eventName} ({recognitionCycle.eventDate}) · Top {eligibleLimit} contributors are shortlisted for official digital honor certificates.
            </span>
          </div>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-800 border border-amber-300 shrink-0 self-start sm:self-auto">
            Shortlist Open (Ranks 1–{eligibleLimit})
          </span>
        </div>
      )}

      {/* District Isolation Notice */}
      <div className="px-4 py-2 bg-blue-50/60 border-b border-blue-100 text-[11px] text-[#123B6D] flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-[#1769D2] shrink-0" />
        <span>
          <strong>Strict District Isolation:</strong> Citizens from {districtName} compete exclusively within this leaderboard. Cross-district leakage is strictly prohibited.
        </span>
      </div>

      {/* Leaderboard Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/80 border-b border-[#D9E2EC] text-[10px] font-mono uppercase tracking-wider text-[#526581]">
              <th className="py-2.5 px-4 font-bold text-center w-14">Rank</th>
              <th className="py-2.5 px-3 font-bold">Civic Champion</th>
              <th className="py-2.5 px-3 font-bold text-center">Badge Tier</th>
              <th className="py-2.5 px-3 font-bold text-right">Verified Reports</th>
              <th className="py-2.5 px-3 font-bold text-right">Issues Verified</th>
              <th className="py-2.5 px-4 font-bold text-right">Civic Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E8EEF5]">
            {entries.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  <div className="text-xs font-semibold text-slate-600">No verified civic champions yet in {districtName} District.</div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Submit verified reports and confirm resolutions to be recognized on this municipal leaderboard.
                  </div>
                </td>
              </tr>
            ) : (
              entries.map((entry) => {
                const badgeInfo = CIVIC_BADGE_DETAILS[entry.badgeLevel];
                const isCurrentUser = entry.isCurrentUser || entry.userId === currentUserId;

                return (
                  <tr
                    key={entry.profileId}
                    className={`transition-colors ${
                      isCurrentUser
                        ? 'bg-blue-50/80 hover:bg-blue-100/70 font-semibold'
                        : 'hover:bg-slate-50/80'
                    }`}
                  >
                    {/* Rank */}
                    <td className="py-3 px-4 text-center">
                      {entry.rank === 1 ? (
                        <span className="text-base" title="1st Place (Gold)">🥇</span>
                      ) : entry.rank === 2 ? (
                        <span className="text-base" title="2nd Place (Silver)">🥈</span>
                      ) : entry.rank === 3 ? (
                        <span className="text-base" title="3rd Place (Bronze)">🥉</span>
                      ) : (
                        <span className="font-mono text-xs font-bold text-[#526581]">
                          #{entry.rank}
                        </span>
                      )}
                    </td>

                    {/* Citizen Name & Details */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-[#123B6D] shrink-0">
                          {entry.displayName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-[#123B6D] flex items-center gap-1.5">
                            <span>{entry.displayName}</span>
                            {isCurrentUser && (
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-blue-600 text-white font-bold">
                                YOU
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-[#718096] font-mono flex items-center gap-1.5 flex-wrap">
                            <span>{districtName} Civic Contributor</span>
                            {entry.rank <= eligibleLimit && (
                              <span
                                className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200 font-semibold"
                                title={`Shortlisted for ${recognitionCycle?.eventName || 'Annual Recognition'}`}
                              >
                                🎖️ Shortlisted
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Badge Tier */}
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${badgeInfo.bgClass} ${badgeInfo.colorClass} ${badgeInfo.borderClass}`}
                      >
                        <span>{badgeInfo.icon}</span>
                        <span>{badgeInfo.label}</span>
                      </span>
                    </td>

                    {/* Verified Reports */}
                    <td className="py-3 px-3 text-right font-mono text-[#172B4D]">
                      {entry.verifiedReportsCount}
                    </td>

                    {/* Issues Verified */}
                    <td className="py-3 px-3 text-right font-mono text-teal-700">
                      {entry.verifiedResolutionsCount}
                    </td>

                    {/* Civic Score */}
                    <td className="py-3 px-4 text-right">
                      <span className="font-mono font-extrabold text-sm text-[#1769D2]">
                        {entry.civicScore.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-[#718096] ml-1">pts</span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer / Scoring Criteria info & Recognition Award */}
      <div className="p-3.5 bg-slate-50 border-t border-[#E8EEF5] text-[11px] text-[#718096] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-[#1769D2] shrink-0" />
          <span>
            <strong>Deterministic Tie-Breaking:</strong> 1. Civic Score · 2. Verified Reports · 3. Verified Resolutions · 4. Earlier Achievement.
          </span>
        </div>
        {recognitionCycle ? (
          <div className="text-[10px] font-mono text-[#526581] flex items-center gap-2">
            <span>Award: {recognitionCycle.rewardType}</span>
            <span>·</span>
            <span className="font-semibold text-emerald-700">Status: {recognitionCycle.status.toUpperCase()}</span>
          </div>
        ) : (
          <span className="text-[10px] font-mono text-[#526581]">Anti-Spam Triage Active</span>
        )}
      </div>
    </Card>
  );
};
