import React from 'react';
import {
  CheckCircle2,
  MapPin,
  Camera,
  ShieldCheck,
  Award,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { OFFICIAL_CIVIC_POINT_CATEGORIES } from '../../services/civicRewardsConfig';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface CivicScoringCategoriesCardProps {
  onOpenHistory?: () => void;
}

export const CivicScoringCategoriesCard: React.FC<CivicScoringCategoriesCardProps> = ({
  onOpenHistory,
}) => {
  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'check':
        return (
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
        );
      case 'map-pin':
        return (
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
            <MapPin className="w-5 h-5 text-blue-600" />
          </div>
        );
      case 'camera':
        return (
          <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center shrink-0">
            <Camera className="w-5 h-5 text-purple-600" />
          </div>
        );
      case 'shield-check':
        return (
          <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-teal-600" />
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5 text-amber-600" />
          </div>
        );
    }
  };

  return (
    <Card className="bg-white border-[#D9E2EC] shadow-xs overflow-hidden">
      {/* Card Header */}
      <div className="p-4 sm:p-5 border-b border-[#E8EEF5] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Award className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#123B6D] uppercase tracking-wider flex items-center gap-2 flex-wrap">
              <span>Civic Point Scoring Categories</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                Official Reward Criteria
              </span>
            </h2>
            <p className="text-[11px] text-[#526581] mt-0.5">
              Verified civic recognition points are awarded exclusively across these 4 verified categories:
            </p>
          </div>
        </div>

        <span className="text-[10px] font-mono text-[#718096] bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200 self-start sm:self-auto flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-emerald-600" />
          <span>4 Verified Categories</span>
        </span>
      </div>

      {/* Categories List */}
      <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {OFFICIAL_CIVIC_POINT_CATEGORIES.map((category) => (
          <div
            key={category.id}
            className="p-4 rounded-xl border border-[#D9E2EC] bg-white hover:border-emerald-300 hover:shadow-xs transition-all flex items-start justify-between gap-3.5"
          >
            <div className="flex items-start gap-3">
              {getCategoryIcon(category.iconName)}
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xs sm:text-sm font-bold text-[#123B6D]">
                    {category.title}
                  </h3>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                    {category.sampleCode}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                    {category.status}
                  </span>
                </div>
                <p className="text-xs text-[#526581] mt-1.5 leading-relaxed">
                  {category.description}
                </p>
              </div>
            </div>

            <div className="shrink-0 pt-0.5">
              <span className="inline-flex items-center font-mono font-bold text-xs sm:text-sm px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                +{category.points} pts
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Action footer matching user screenshot */}
      <div className="px-5 py-3.5 bg-slate-50/80 border-t border-[#E8EEF5] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <span className="text-xs text-[#526581] leading-relaxed max-w-xl">
          Scores are updated automatically when on-site municipal teams verify reports or resolutions.
        </span>
        {onOpenHistory && (
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenHistory}
            className="w-full sm:w-auto h-9 px-4 text-xs font-bold uppercase tracking-wider text-[#1769D2] border-blue-300 bg-white hover:bg-blue-50 hover:border-blue-400 gap-2 shrink-0 transition-all rounded-lg shadow-2xs cursor-pointer"
          >
            <span>VIEW CONTRIBUTION HISTORY</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#1769D2]" />
          </Button>
        )}
      </div>
    </Card>
  );
};

