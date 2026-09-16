import React from 'react';
import {
  Flame,
  TrendingUp,
  MapPin,
  AlertTriangle,
  Layers,
  ChevronRight,
  Eye,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Sparkles,
  BarChart3,
  Compass,
  ArrowUpRight,
  X,
} from 'lucide-react';
import { EmergingHotspotResult, EmergingProblemEngine } from '../../services/emergingProblemEngine';
import { PotentialIncidentResult } from '../../services/incidentGroupingEngine';
import { Complaint } from '../../types/complaint';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

interface HotspotDetailInspectorProps {
  hotspot: EmergingHotspotResult;
  allComplaints: Complaint[];
  associatedIncident?: PotentialIncidentResult | null;
  onSelectComplaint: (id: string) => void;
  onFlyToCentroid?: (lat: number, lng: number) => void;
  onFilterToHotspot?: (hotspotId: string) => void;
  isFilteredToHotspot?: boolean;
  onOpenJointActionModal?: (incident: PotentialIncidentResult) => void;
  onClose?: () => void;
  isMunicipalStaff?: boolean;
}

export const HotspotDetailInspector: React.FC<HotspotDetailInspectorProps> = ({
  hotspot,
  allComplaints,
  associatedIncident,
  onSelectComplaint,
  onFlyToCentroid,
  onFilterToHotspot,
  isFilteredToHotspot = false,
  onOpenJointActionModal,
  onClose,
  isMunicipalStaff = true,
}) => {
  const contributingComplaints = React.useMemo(() => {
    return EmergingProblemEngine.getContributingComplaints(hotspot, allComplaints);
  }, [hotspot, allComplaints]);

  const isCritical = hotspot.classification === 'criticalEmergingProblem';

  return (
    <Card className="p-3.5 border-[#D9E2EC] bg-white shadow-sm space-y-3 flex flex-col shrink-0">
      {/* Top Header */}
      <div className="flex items-start justify-between gap-2 pb-2 border-b border-[#E8EEF5]">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className="text-[10px] font-mono font-bold px-2 py-0.5 rounded flex items-center gap-1"
              style={{
                backgroundColor: hotspot.badgeBg,
                borderColor: hotspot.badgeBorder,
                color: hotspot.badgeText,
                borderWidth: '1px',
              }}
            >
              <Flame className="w-3 h-3 text-current" />
              <span>{hotspot.levelLabel.toUpperCase()}</span>
            </span>
            <span className="text-[11px] font-mono font-bold text-[#172B4D]">
              Score: {hotspot.scoreDisplay}
            </span>
          </div>
          <h3 className="text-xs font-bold text-[#172B4D] pt-1">
            🔥 {hotspot.categoryLabel} Emerging Hotspot
          </h3>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded text-[#718096] hover:text-[#172B4D] hover:bg-slate-100 transition-colors"
            title="Close Hotspot Inspector"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Key Metrics Grid (4-box) */}
      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
        <div className="p-2 rounded bg-slate-50 border border-slate-200">
          <div className="text-[10px] text-[#526581] flex items-center gap-1">
            <Clock className="w-3 h-3 text-[#1769D2]" />
            <span>24h Surge</span>
          </div>
          <div className="text-sm font-bold text-[#172B4D] mt-0.5">
            {hotspot.currentWindowCount}{' '}
            <span className="text-[10px] font-normal text-[#526581]">
              / {hotspot.complaintCount} total
            </span>
          </div>
        </div>

        <div className="p-2 rounded bg-slate-50 border border-slate-200">
          <div className="text-[10px] text-[#526581] flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-amber-600" />
            <span>Spike Ratio</span>
          </div>
          <div
            className={`text-sm font-bold mt-0.5 ${
              hotspot.increaseRatio >= 1.5 ? 'text-red-600' : 'text-emerald-700'
            }`}
          >
            {hotspot.increaseRatio.toFixed(1)}×{' '}
            <span className="text-[10px] font-normal text-[#526581]">vs baseline</span>
          </div>
        </div>

        <div className="p-2 rounded bg-slate-50 border border-slate-200">
          <div className="text-[10px] text-[#526581] flex items-center gap-1">
            <MapPin className="w-3 h-3 text-indigo-600" />
            <span>Cluster Radius</span>
          </div>
          <div className="text-xs font-bold text-[#172B4D] mt-0.5">
            ~{hotspot.radiusMeters}m Zone
          </div>
          <div className="text-[9px] text-[#718096] truncate">
            {hotspot.centerLatitude.toFixed(4)}, {hotspot.centerLongitude.toFixed(4)}
          </div>
        </div>

        <div className="p-2 rounded bg-slate-50 border border-slate-200">
          <div className="text-[10px] text-[#526581] flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-red-600" />
            <span>High Priority</span>
          </div>
          <div className="text-sm font-bold text-red-600 mt-0.5">
            {hotspot.highPriorityCount}{' '}
            <span className="text-[10px] font-normal text-[#526581]">urgent reports</span>
          </div>
        </div>
      </div>

      {/* Signal Breakdown (Explainable Weights) */}
      <div className="p-2.5 rounded bg-[#F8FAFC] border border-[#E8EEF5] space-y-2">
        <div className="text-[10px] font-mono font-bold text-[#172B4D] flex items-center justify-between">
          <span className="flex items-center gap-1">
            <BarChart3 className="w-3 h-3 text-[#1769D2]" />
            <span>Signal Weight Composition</span>
          </span>
          <span className="text-[9px] text-[#526581]">Deterministic 3C Engine</span>
        </div>

        <div className="space-y-1.5 text-[10px] font-mono">
          <div>
            <div className="flex justify-between text-[#526581] mb-0.5">
              <span>Volume Surge (40%)</span>
              <span className="font-bold text-[#172B4D]">
                {Math.round(hotspot.signalBreakdown.volumeSpike)}/100
              </span>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-red-500 h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, hotspot.signalBreakdown.volumeSpike)}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-[#526581] mb-0.5">
              <span>Spatial Density (25%)</span>
              <span className="font-bold text-[#172B4D]">
                {Math.round(hotspot.signalBreakdown.spatialDensity)}/100
              </span>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-amber-500 h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, hotspot.signalBreakdown.spatialDensity)}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-[#526581] mb-0.5">
              <span>Category Focus (20%)</span>
              <span className="font-bold text-[#172B4D]">
                {Math.round(hotspot.signalBreakdown.categoryConsistency)}/100
              </span>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-blue-500 h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, hotspot.signalBreakdown.categoryConsistency)}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-[#526581] mb-0.5">
              <span>Safety & Priority (15%)</span>
              <span className="font-bold text-[#172B4D]">
                {Math.round(hotspot.signalBreakdown.prioritySafety)}/100
              </span>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-purple-500 h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, hotspot.signalBreakdown.prioritySafety)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Explainable Reasons & Top Drivers */}
      <div className="p-2.5 rounded bg-blue-50/50 border border-blue-100 text-[11px] space-y-1">
        <div className="text-[10px] font-mono font-bold text-[#1769D2] flex items-center gap-1 uppercase">
          <Sparkles className="w-3 h-3 text-[#1769D2]" />
          <span>Why the System Flagged This Hotspot:</span>
        </div>
        <ul className="space-y-1 text-[#334155] pl-1 pt-0.5">
          {hotspot.explainableReasons.map((reason, idx) => (
            <li key={idx} className="flex items-start gap-1.5 text-[10px] leading-tight">
              <span className="text-[#1769D2] mt-0.5 font-bold">•</span>
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Associated 3D Potential Incident Link if present */}
      {associatedIncident && (
        <div className="p-2.5 rounded bg-amber-50/80 border border-amber-200 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-amber-900 flex items-center gap-1 uppercase">
              <Layers className="w-3 h-3 text-amber-700" />
              <span>3D Potential Incident Link</span>
            </span>
            <span className="text-[9px] font-mono bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-semibold">
              {associatedIncident.confidenceDisplay} Match
            </span>
          </div>
          <p className="text-[11px] text-amber-900 font-medium leading-tight">
            {associatedIncident.incidentLabel} ({associatedIncident.complaintCount} linked reports)
          </p>
          {isMunicipalStaff && onOpenJointActionModal && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenJointActionModal(associatedIncident)}
              className="w-full h-7 text-[10px] font-bold bg-amber-600 hover:bg-amber-700 text-white border-none gap-1 shadow-xs"
            >
              <ShieldAlert className="w-3 h-3" />
              <span>Launch Joint Action for This Incident ➔</span>
            </Button>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        {onFlyToCentroid && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onFlyToCentroid(hotspot.centerLatitude, hotspot.centerLongitude)}
            className="h-7 text-[11px] font-medium bg-white border-[#D9E2EC] text-[#172B4D] hover:bg-slate-50 gap-1"
          >
            <Compass className="w-3 h-3 text-[#1769D2]" />
            <span>Center on Map</span>
          </Button>
        )}

        {onFilterToHotspot && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onFilterToHotspot(hotspot.id)}
            className={`h-7 text-[11px] font-medium border gap-1 transition-colors ${
              isFilteredToHotspot
                ? 'bg-blue-50 text-[#1769D2] border-blue-300 font-bold'
                : 'bg-white border-[#D9E2EC] text-[#172B4D] hover:bg-slate-50'
            }`}
          >
            <Eye className="w-3 h-3 text-[#526581]" />
            <span>{isFilteredToHotspot ? 'Reset Map View' : 'Focus Cluster'}</span>
          </Button>
        )}
      </div>

      {/* Contributing Complaints List */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between pb-1 border-b border-[#E8EEF5]">
          <span className="text-[10px] font-mono uppercase text-[#526581] font-bold">
            Contributing Grievances ({contributingComplaints.length})
          </span>
          <span className="text-[9px] font-mono text-[#1769D2]">
            ~{Math.round(hotspot.averageDistanceMeters)}m average spread
          </span>
        </div>

        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
          {contributingComplaints.map((c) => (
            <div
              key={c.id}
              onClick={() => onSelectComplaint(c.id)}
              className="p-2 rounded bg-[#F8FAFC] hover:bg-blue-50/60 border border-[#E8EEF5] hover:border-blue-200 cursor-pointer text-xs space-y-1 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] font-bold text-[#1769D2] group-hover:underline">
                  #{c.id}
                </span>
                <div className="flex items-center gap-1">
                  <Badge priority={c.priority} />
                  <Badge status={c.status} />
                </div>
              </div>
              <div className="text-[11px] font-medium text-[#172B4D] truncate">{c.title}</div>
              <div className="text-[10px] text-[#526581] flex items-center justify-between">
                <span className="truncate max-w-[150px]">{c.location.address}</span>
                <span
                  className={`font-mono text-[9px] font-semibold ${
                    c.sla.isOverdue ? 'text-red-600' : 'text-emerald-700'
                  }`}
                >
                  {c.sla.isOverdue ? 'OVERDUE' : `${c.sla.hoursRemaining}h SLA`}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};
