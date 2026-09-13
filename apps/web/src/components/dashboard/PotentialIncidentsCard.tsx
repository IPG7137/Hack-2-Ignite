import React, { useMemo } from 'react';
import { Complaint } from '../../types/complaint';
import { IncidentGroupingEngine, PotentialIncidentResult } from '../../services/incidentGroupingEngine';
import { EmergingProblemEngine } from '../../services/emergingProblemEngine';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import {
  Layers,
  Sparkles,
  MapPin,
  Clock,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  Tag,
  Info,
  ChevronRight,
} from 'lucide-react';

interface PotentialIncidentsCardProps {
  complaints: Complaint[];
  onSelectComplaint?: (id: string) => void;
  onNavigateToMap?: () => void;
}

export const PotentialIncidentsCard: React.FC<PotentialIncidentsCardProps> = ({
  complaints,
  onSelectComplaint,
  onNavigateToMap,
}) => {
  const incidents = useMemo(() => {
    const activeHotspots = EmergingProblemEngine.detectHotspots(complaints, {
      clusterRadiusMeters: 500,
      minimumClusterSize: 2,
    });

    return IncidentGroupingEngine.groupComplaintsIntoIncidents(complaints, {
      activeHotspots,
      groupingRadiusMeters: 500,
      minimumClusterSize: 2,
    });
  }, [complaints]);

  return (
    <Card className="flex flex-col h-full overflow-hidden border-[#D9E2EC] bg-white shadow-sm">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#D9E2EC] flex items-center justify-between bg-[#F8FAFC]">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-purple-600" />
          <h3 className="text-xs font-bold text-[#172B4D] uppercase tracking-wider">
            Potential Common Incidents (Phase 3D)
          </h3>
        </div>
        <span
          className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
            incidents.length > 0
              ? 'bg-purple-50 text-purple-700 border-purple-200'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}
        >
          {incidents.length} {incidents.length === 1 ? 'INCIDENT GROUP' : 'INCIDENT GROUPS'}
        </span>
      </div>

      <div className="p-3.5 space-y-3 flex-1 overflow-y-auto">
        {incidents.length === 0 ? (
          <div className="p-6 rounded-md bg-slate-50 border border-slate-200 text-center space-y-1.5">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
            <div className="text-xs font-bold text-[#172B4D]">No Common Incidents Detected</div>
            <p className="text-[11px] text-[#526581] max-w-md mx-auto">
              Current reports represent isolated complaints. No multi-report clustering with shared category, high text similarity, and localized spatial concentration found.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {incidents.map((incident) => {
              const isHighConfidence = incident.classification === 'highConfidencePotentialIncident';

              return (
                <div
                  key={incident.incidentId}
                  className={`p-3.5 rounded-lg border transition-all ${
                    isHighConfidence
                      ? 'bg-purple-50/40 border-purple-200 hover:border-purple-300'
                      : 'bg-blue-50/30 border-blue-200 hover:border-blue-300'
                  }`}
                >
                  {/* Top Bar: Label, ID, Confidence */}
                  <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-200/60">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-purple-800">
                          {incident.incidentId}
                        </span>
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${incident.badgeBg} ${incident.badgeBorder} ${incident.badgeText}`}
                        >
                          {incident.levelLabel.toUpperCase()} · {incident.confidenceDisplay}
                        </span>
                        {incident.hasActiveHotspot && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 font-bold flex items-center gap-1">
                            <span>🔥 Hotspot Overlap</span>
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-[#172B4D] mt-1">
                        {incident.incidentLabel}
                      </h4>
                      <div className="text-[11px] text-[#526581] flex items-center gap-1 mt-0.5 font-mono">
                        <MapPin className="w-3 h-3 text-[#718096] shrink-0" />
                        <span>
                          Centroid: {incident.centerLatitude.toFixed(4)}, {incident.centerLongitude.toFixed(4)} (~{Math.round(incident.affectedRadiusMeters)}m radius)
                        </span>
                      </div>
                    </div>

                    {onNavigateToMap && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onNavigateToMap}
                        className="h-7 text-[10px] px-2 bg-white border-[#D9E2EC] text-[#172B4D] hover:bg-purple-600 hover:text-white shrink-0 font-medium"
                      >
                        <span>Inspect GIS</span>
                        <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    )}
                  </div>

                  {/* Multi-Signal Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 text-center text-xs">
                    <div className="p-1.5 rounded bg-white border border-[#D9E2EC]">
                      <div className="text-[9px] font-mono text-[#718096] uppercase">Group Size</div>
                      <div className="text-sm font-bold font-mono text-[#172B4D] mt-0.5">
                        {incident.complaintCount} reports
                      </div>
                    </div>
                    <div className="p-1.5 rounded bg-white border border-[#D9E2EC]">
                      <div className="text-[9px] font-mono text-[#718096] uppercase">Similarity Match</div>
                      <div className="text-sm font-bold font-mono text-purple-700 mt-0.5">
                        {Math.round(incident.signalBreakdown.similarityEvidence)}% Match
                      </div>
                    </div>
                    <div className="p-1.5 rounded bg-white border border-[#D9E2EC]">
                      <div className="text-[9px] font-mono text-[#718096] uppercase">Time Window</div>
                      <div className="text-sm font-bold font-mono text-[#1769D2] mt-0.5">
                        {incident.timeSpanHours <= 24
                          ? `${incident.timeSpanHours.toFixed(1)}h Span`
                          : `${(incident.timeSpanHours / 24).toFixed(1)}d Span`}
                      </div>
                    </div>
                    <div className="p-1.5 rounded bg-white border border-[#D9E2EC]">
                      <div className="text-[9px] font-mono text-[#718096] uppercase">Severity</div>
                      <div className="text-sm font-bold font-mono text-orange-700 mt-0.5 uppercase">
                        {incident.highestPriority}
                      </div>
                    </div>
                  </div>

                  {/* Recurring Topic Terms */}
                  {incident.topRecurringTerms.length > 0 && (
                    <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-mono uppercase text-[#718096] font-bold">
                        Recurring Terms:
                      </span>
                      {incident.topRecurringTerms.map((term, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[#172B4D]"
                        >
                          #{term}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Evidence Drivers */}
                  <div className="mt-2 pt-2 border-t border-slate-200/60">
                    <div className="text-[10px] font-mono uppercase text-[#718096] font-bold mb-1">
                      Incident Grouping Evidence:
                    </div>
                    <div className="space-y-0.5 text-[11px] text-[#172B4D]">
                      {incident.explainableReasons.map((reason, idx) => (
                        <div key={idx} className="flex items-start gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-600 mt-1 shrink-0" />
                          <span>{reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Member Complaints Quick Inspector */}
                  <div className="mt-2.5 pt-2 border-t border-slate-200/60">
                    <div className="text-[10px] font-mono uppercase text-[#718096] font-bold mb-1.5">
                      Associated Complaints ({incident.memberComplaintIds.length}):
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {incident.memberComplaintIds.map((cid) => (
                        <button
                          key={cid}
                          onClick={() => onSelectComplaint?.(cid)}
                          className="px-2 py-0.5 rounded text-[11px] font-mono bg-white border border-[#D9E2EC] text-[#1769D2] hover:bg-[#1769D2] hover:text-white transition-colors font-semibold"
                        >
                          #{cid}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Decision Support Disclaimer */}
        <div className="p-2.5 rounded bg-purple-50/50 border border-purple-200/70 text-[10px] text-[#526581] flex items-start gap-2">
          <Info className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
          <span>
            <strong>Incident Grouping Protocol:</strong> Groups candidate complaints exhibiting high multi-signal text, category, and spatial correlation into a potential common incident to streamline unified dispatch and eliminate redundant field crew deployments.
          </span>
        </div>
      </div>
    </Card>
  );
};
