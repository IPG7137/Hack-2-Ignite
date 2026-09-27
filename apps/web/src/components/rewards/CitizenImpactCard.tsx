import React from 'react';
import {
  Trophy,
  Award,
  CheckCircle2,
  MapPin,
  Camera,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
  Sparkles,
} from 'lucide-react';
import { CitizenCivicProfile } from '../../types/civicRewards';
import { CIVIC_BADGE_DETAILS, getNextLevelProgress } from '../../services/civicRewardsConfig';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface CitizenImpactCardProps {
  profile: CitizenCivicProfile | null;
  rank?: number;
  districtName?: string;
  onOpenHistory: () => void;
}

export const CitizenImpactCard: React.FC<CitizenImpactCardProps> = ({
  profile,
  rank = 1,
  districtName = 'Solapur',
  onOpenHistory,
}) => {
  const score = profile?.civicScore || 0;
  const verifiedReports = profile?.verifiedReportsCount || 0;
  const verifiedResolutions = profile?.verifiedResolutionsCount || 0;
  const usefulEvidence = profile?.helpfulEvidenceCount || 0;
  const badgeLevel = profile?.badgeLevel || 'starter';

  const badgeInfo = CIVIC_BADGE_DETAILS[badgeLevel];
  const progressInfo = getNextLevelProgress(score);

  return (
    <Card className="bg-white border-[#D9E2EC] shadow-xs overflow-hidden">
      {/* Card Header */}
      <div className="bg-gradient-to-r from-[#123B6D] to-[#1769D2] p-4 sm:p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-2xl shadow-inner shrink-0">
            {badgeInfo.icon}
          </div>
          <div>
            <div className="text-[10px] font-mono tracking-widest text-blue-200 uppercase font-bold">
              MY CIVIC IMPACT
            </div>
            <h2 className="text-base sm:text-lg font-bold tracking-tight flex items-center gap-2">
              <span>{profile?.displayName || 'Citizen Contributor'}</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/20 text-white font-bold">
                {districtName} District
              </span>
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="bg-white/10 backdrop-blur-xs border border-white/20 rounded-lg px-3 py-1.5 text-right">
            <span className="text-[10px] text-blue-200 uppercase font-bold block">District Rank</span>
            <span className="text-base font-extrabold text-amber-300">#{rank || 1}</span>
          </div>
          <div className="bg-white/10 backdrop-blur-xs border border-white/20 rounded-lg px-3 py-1.5 text-right">
            <span className="text-[10px] text-blue-200 uppercase font-bold block">Civic Score</span>
            <span className="text-base font-extrabold text-white">{score.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 sm:p-5 space-y-4">
        {/* Civic Level Progress */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">{badgeInfo.icon}</span>
              <span className="font-bold text-[#123B6D]">{badgeInfo.label}</span>
              <span className="text-[10px] font-mono text-[#718096]">(Platform Recognition)</span>
            </div>
            {progressInfo.nextLevel ? (
              <span className="text-[11px] font-medium text-[#526581]">
                <strong className="text-[#1769D2]">{progressInfo.pointsNeeded} pts</strong> to{' '}
                {CIVIC_BADGE_DETAILS[progressInfo.nextLevel].label}
              </span>
            ) : (
              <span className="text-[11px] font-bold text-purple-700">Top Recognition Tier Achieved!</span>
            )}
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500"
                style={{ width: `${progressInfo.progressPct}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-mono text-[#718096]">
              <span>Current: {score} pts</span>
              <span>Target: {progressInfo.targetScore} pts</span>
            </div>
          </div>
        </div>

        {/* Verified Contribution Metrics Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg border border-[#E8EEF5] bg-white text-center shadow-2xs">
            <div className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase text-[#526581]">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Verified Reports</span>
            </div>
            <div className="text-xl font-bold text-[#172B4D] mt-1">{verifiedReports}</div>
            <div className="text-[9px] text-[#718096] mt-0.5">Quality Confirmed</div>
          </div>

          <div className="p-3 rounded-lg border border-[#E8EEF5] bg-white text-center shadow-2xs">
            <div className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase text-[#526581]">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
              <span>Issues Verified</span>
            </div>
            <div className="text-xl font-bold text-teal-700 mt-1">{verifiedResolutions}</div>
            <div className="text-[9px] text-[#718096] mt-0.5">Resolutions Audited</div>
          </div>

          <div className="p-3 rounded-lg border border-[#E8EEF5] bg-white text-center shadow-2xs">
            <div className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase text-[#526581]">
              <Camera className="w-3.5 h-3.5 text-purple-600" />
              <span>Useful Evidence</span>
            </div>
            <div className="text-xl font-bold text-purple-700 mt-1">{usefulEvidence}</div>
            <div className="text-[9px] text-[#718096] mt-0.5">Geotagged Proof</div>
          </div>
        </div>

        {/* Action button */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-[#E8EEF5]">
          <span className="text-[11px] text-[#718096]">
            Scores are updated automatically when on-site municipal teams verify reports or resolutions.
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenHistory}
            className="w-full sm:w-auto h-8 text-xs font-semibold text-[#1769D2] border-blue-200 hover:bg-blue-50 gap-1.5 shrink-0"
          >
            <span>View Contribution History</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </Card>
  );
};
