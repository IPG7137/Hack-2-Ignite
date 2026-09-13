import React, { useMemo } from 'react';
import { Complaint } from '../../types/complaint';
import { EmergingProblemEngine, EmergingHotspotResult } from '../../services/emergingProblemEngine';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import {
  AlertTriangle,
  Flame,
  Radio,
  MapPin,
  TrendingUp,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  Layers,
  Info,
} from 'lucide-react';

interface EmergingProblemsHotspotsCardProps {
  complaints: Complaint[];
  onSelectComplaint?: (id: string) => void;
  onNavigateToMap?: () => void;
}

export const EmergingProblemsHotspotsCard: React.FC<EmergingProblemsHotspotsCardProps> = ({
  complaints,
  onSelectComplaint,
  onNavigateToMap,
}) => {
  const hotspots = useMemo(() => {
    return EmergingProblemEngine.detectHotspots(complaints, {
      clusterRadiusMeters: 500,
      minimumClusterSize: 2,
    });
  }, [complaints]);

  const activeHotspots = hotspots.filter(
    (h) => h.classification !== 'normal'
  );

  return (
    <Card className="flex flex-col h-full overflow-hidden border-[#D9E2EC] bg-white shadow-sm">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#D9E2EC] flex items-center justify-between bg-[#F8FAFC]">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-red-600 animate-pulse" />
          <div>
            <h3 className="text-xs font-bold text-[#172B4D] uppercase tracking-wider flex items-center gap-1.5">
              <span>Emerging Problems & Hotspot Detection (Phase 3C)</span>
            </h3>
          </div>
        </div>
        <span
          className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
            activeHotspots.length > 0
              ? 'bg-red-50 text-red-700 border-red-200'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}
        >
          {activeHotspots.length} {activeHotspots.length === 1 ? 'ACTIVE HOTSPOT' : 'ACTIVE HOTSPOTS'}
        </span>
      </div>

      <div className="p-3.5 space-y-3 flex-1 overflow-y-auto">
        {activeHotspots.length === 0 ? (
          <div className="p-6 rounded-md bg-slate-50 border border-slate-200 text-center space-y-1.5">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
            <div className="text-xs font-bold text-[#172B4D]">No Complaint Activity Anomalies Detected</div>
            <p className="text-[11px] text-[#526581] max-w-md mx-auto">
              Complaint frequency across all municipal jurisdictions is currently within expected baseline limits. No 500m surge clusters or category spikes identified.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeHotspots.map((hotspot) => {
              const isCritical = hotspot.classification === 'criticalEmergingProblem';

              return (
                <div
                  key={hotspot.id}
                  className={`p-3.5 rounded-lg border transition-all ${
                    isCritical
                      ? 'bg-red-50/40 border-red-200 hover:border-red-300'
                      : 'bg-orange-50/30 border-orange-200 hover:border-orange-300'
                  }`}
                >
                  {/* Top Bar: Category & Score */}
                  <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-200/60">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${hotspot.badgeBg} ${hotspot.badgeBorder} ${hotspot.badgeText}`}
                        >
                          {hotspot.levelLabel.toUpperCase()} · {hotspot.scoreDisplay}
                        </span>
                        <span className="text-xs font-bold text-[#172B4D]">
                          {hotspot.categoryLabel}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#526581] flex items-center gap-1 mt-1 font-mono">
                        <MapPin className="w-3 h-3 text-[#718096] shrink-0" />
                        <span>Centroid: {hotspot.centerLatitude.toFixed(4)}, {hotspot.centerLongitude.toFixed(4)} (~500m zone)</span>
                      </div>
                    </div>

                    {onNavigateToMap && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onNavigateToMap}
                        className="h-7 text-[10px] px-2 bg-white border-[#D9E2EC] text-[#172B4D] hover:bg-[#1769D2] hover:text-white shrink-0 font-medium"
                      >
                        <span>View Zone</span>
                        <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    )}
                  </div>

                  {/* Multi-Signal Breakdown Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 text-center text-xs">
                    <div className="p-1.5 rounded bg-white border border-[#D9E2EC]">
                      <div className="text-[9px] font-mono text-[#718096] uppercase">24h Recent Volume</div>
                      <div className="text-sm font-bold font-mono text-[#172B4D] mt-0.5">
                        {hotspot.currentWindowCount} reports
                      </div>
                    </div>
                    <div className="p-1.5 rounded bg-white border border-[#D9E2EC]">
                      <div className="text-[9px] font-mono text-[#718096] uppercase">Volume Spike Ratio</div>
                      <div className="text-sm font-bold font-mono text-red-700 mt-0.5">
                        {hotspot.increaseRatio >= 1.5 ? `${hotspot.increaseRatio.toFixed(1)}× Spike` : 'Normal Baseline'}
                      </div>
                    </div>
                    <div className="p-1.5 rounded bg-white border border-[#D9E2EC]">
                      <div className="text-[9px] font-mono text-[#718096] uppercase">Cluster Size</div>
                      <div className="text-sm font-bold font-mono text-[#1769D2] mt-0.5">
                        {hotspot.complaintCount} in ~{Math.round(hotspot.averageDistanceMeters)}m
                      </div>
                    </div>
                    <div className="p-1.5 rounded bg-white border border-[#D9E2EC]">
                      <div className="text-[9px] font-mono text-[#718096] uppercase">High Priority / Safety</div>
                      <div className="text-sm font-bold font-mono text-orange-700 mt-0.5">
                        {hotspot.highPriorityCount} reports
                      </div>
                    </div>
                  </div>

                  {/* Decision Drivers */}
                  <div className="mt-2.5 pt-2 border-t border-slate-200/60">
                    <div className="text-[10px] font-mono uppercase text-[#718096] font-bold mb-1">
                      Evidence-Based Activity Drivers:
                    </div>
                    <div className="space-y-1 text-[11px] text-[#172B4D]">
                      {hotspot.explainableReasons.map((reason, idx) => (
                        <div key={idx} className="flex items-start gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-600 mt-1 shrink-0" />
                          <span>{reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Municipal Safety Notice */}
        <div className="p-2.5 rounded bg-blue-50/50 border border-blue-200/70 text-[10px] text-[#526581] flex items-start gap-2">
          <Info className="w-3.5 h-3.5 text-[#1769D2] shrink-0 mt-0.5" />
          <span>
            <strong>Decision Support Protocol:</strong> Hotspots highlight localized complaint volume spikes and spatial concentration for proactive municipal dispatch. They reflect citizen reporting density and do not claim unverified root causes.
          </span>
        </div>
      </div>
    </Card>
  );
};
