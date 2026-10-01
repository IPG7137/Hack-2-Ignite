import React, { useMemo } from 'react';
import {
  Flame,
  Layers,
  ShieldAlert,
  FileCheck2,
  ArrowRight,
  Cpu,
  ArrowUpRight,
} from 'lucide-react';
import { Complaint } from '../../types/complaint';
import { AIInsightsService } from '../../services/aiInsightsService';
import { Button } from '../ui/Button';

interface IntelligenceSummaryCardProps {
  complaints: Complaint[];
  onNavigateToIntelligence: () => void;
  onNavigateToSection?: (section: 'dispatch' | 'anomalies' | 'grouping' | 'audits') => void;
}

export const IntelligenceSummaryCard: React.FC<IntelligenceSummaryCardProps> = ({
  complaints,
  onNavigateToIntelligence,
  onNavigateToSection,
}) => {
  const synthesis = useMemo(() => {
    return AIInsightsService.synthesizeOperationalInsights(complaints);
  }, [complaints]);

  const { criticalDispatch, emergingAnomalies, incidentGrouping, resolutionAudits } = synthesis;

  const topAnomaly = emergingAnomalies[0];
  const topGrouping = incidentGrouping[0];
  const topAudit = resolutionAudits[0];

  return (
    <div className="flex flex-col h-full rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-purple-100 border border-purple-200 text-purple-700 flex items-center justify-center">
            <Cpu className="w-3.5 h-3.5 stroke-[2.25]" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Decision Intelligence Summary
            </h3>
            <p className="text-[10px] text-slate-500">Autonomous spatio-temporal & multi-signal telemetry</p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onNavigateToIntelligence}
          className="h-6.5 text-[11px] text-[#1769D2] hover:text-[#123B6D] hover:bg-blue-50 font-bold gap-1 px-2"
        >
          <span>Full Console</span>
          <ArrowUpRight className="w-3 h-3" />
        </Button>
      </div>

      {/* Body: 4 Concise Signal Tiles */}
      <div className="p-3.5 space-y-2.5 flex-1 overflow-y-auto">
        {/* 1. Hotspots Radar */}
        <div
          onClick={() => onNavigateToSection ? onNavigateToSection('anomalies') : onNavigateToIntelligence()}
          className="p-3 rounded-lg border border-orange-200/80 bg-orange-50/40 hover:bg-orange-50 transition-all cursor-pointer group flex items-start justify-between gap-3 shadow-2xs"
        >
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-md bg-orange-100 border border-orange-200 text-orange-700 flex items-center justify-center shrink-0 mt-0.5">
              <Flame className="w-4 h-4 stroke-[2.25]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-slate-900">
                  Spatial Radar & Hotspots
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-orange-100 text-orange-800 font-bold border border-orange-200">
                  {emergingAnomalies.length} ACTIVE
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5 truncate">
                {topAnomaly
                  ? `Cluster in ${topAnomaly.categoryLabel} (${topAnomaly.complaintCount} reports within 500m)`
                  : 'Zero geographic cluster surges detected'}
              </p>
            </div>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-orange-700 group-hover:translate-x-0.5 transition-all shrink-0 mt-1.5" />
        </div>

        {/* 2. Common Incident Clusters */}
        <div
          onClick={() => onNavigateToSection ? onNavigateToSection('grouping') : onNavigateToIntelligence()}
          className="p-3 rounded-lg border border-purple-200/80 bg-purple-50/40 hover:bg-purple-50 transition-all cursor-pointer group flex items-start justify-between gap-3 shadow-2xs"
        >
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-md bg-purple-100 border border-purple-200 text-purple-700 flex items-center justify-center shrink-0 mt-0.5">
              <Layers className="w-4 h-4 stroke-[2.25]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-slate-900">
                  Common Incident Groups
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 font-bold border border-purple-200">
                  {incidentGrouping.length} IDENTIFIED
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5 truncate">
                {topGrouping
                  ? `${topGrouping.incidentLabel} (${topGrouping.complaintCount} related complaints consolidated)`
                  : 'All grievances evaluated as distinct incidents'}
              </p>
            </div>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-700 group-hover:translate-x-0.5 transition-all shrink-0 mt-1.5" />
        </div>

        {/* 3. Critical Priority Dispatch */}
        <div
          onClick={() => onNavigateToSection ? onNavigateToSection('dispatch') : onNavigateToIntelligence()}
          className="p-3 rounded-lg border border-red-200/80 bg-red-50/40 hover:bg-red-50 transition-all cursor-pointer group flex items-start justify-between gap-3 shadow-2xs"
        >
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-md bg-red-100 border border-red-200 text-red-700 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldAlert className="w-4 h-4 stroke-[2.25]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-slate-900">
                  Priority Triage Intelligence
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-red-100 text-red-800 font-bold border border-red-200">
                  {criticalDispatch.length} URGENT
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5 truncate">
                {criticalDispatch.length > 0
                  ? `${criticalDispatch[0].title} in ${criticalDispatch[0].ward} (Priority: ${criticalDispatch[0].scoreDisplay})`
                  : 'No high-severity life-safety alerts active'}
              </p>
            </div>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-red-700 group-hover:translate-x-0.5 transition-all shrink-0 mt-1.5" />
        </div>

        {/* 4. Resolution Audits */}
        <div
          onClick={() => onNavigateToSection ? onNavigateToSection('audits') : onNavigateToIntelligence()}
          className="p-3 rounded-lg border border-emerald-200/80 bg-emerald-50/40 hover:bg-emerald-50 transition-all cursor-pointer group flex items-start justify-between gap-3 shadow-2xs"
        >
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-md bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
              <FileCheck2 className="w-4 h-4 stroke-[2.25]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-slate-900">
                  Resolution Evidence Audits
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                  {resolutionAudits.length} AUDITS
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5 truncate">
                {topAudit
                  ? `Complaint #${topAudit.complaintId}: ${topAudit.recommendedAction}`
                  : 'All resolved grievances verified or pending verification'}
              </p>
            </div>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-all shrink-0 mt-1.5" />
        </div>
      </div>

      {/* Footer Navigation Link */}
      <div className="p-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
        <span className="text-[11px] text-slate-500 font-medium">
          Multi-signal intelligence engine active
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={onNavigateToIntelligence}
          className="h-7 text-xs text-[#1769D2] hover:bg-blue-50 border-blue-200 font-semibold gap-1"
        >
          <span>Open Intelligence Console</span>
          <ArrowRight className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
};
