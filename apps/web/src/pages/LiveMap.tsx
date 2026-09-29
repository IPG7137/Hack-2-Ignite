import React, { useState, useMemo } from 'react';
import { useOrganization } from '../context/OrganizationContext';
import { CommandMap, MapViewMode, HotspotThresholdConfig } from '../components/map/CommandMap';
import { HotspotDetailInspector } from '../components/map/HotspotDetailInspector';
import { JointActionModal } from '../components/incidents/JointActionModal';
import { Complaint, IncidentCategory, ComplaintPriority, ComplaintStatus } from '../types/complaint';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { StatusBadge } from '../components/ui/StatusBadge';
import { PriorityBadge } from '../components/ui/PriorityBadge';
import { Button } from '../components/ui/Button';
import { hasValidCoordinates } from '../services/reportAdapter';
import { useAuth } from '../hooks/useAuth';
import {
  EmergingProblemEngine,
  EmergingHotspotResult,
} from '../services/emergingProblemEngine';
import {
  IncidentGroupingEngine,
  PotentialIncidentResult,
  JointActionRequest,
  JointActionResult,
  IncidentClusterRecord,
} from '../services/incidentGroupingEngine';
import {
  MapPin,
  Layers,
  Sparkles,
  Filter,
  ChevronRight,
  AlertCircle,
  Eye,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ShieldAlert,
  Compass,
  ArrowRight,
  Sliders,
  Calendar,
  Activity,
  Check,
} from 'lucide-react';

export type TimeRangeFilter = 'all' | 'today' | '24h' | '7d' | '30d';
export type LifecycleFilter = 'all' | 'active' | 'resolved';

interface LiveMapProps {
  complaints: Complaint[];
  incidentClusters?: IncidentClusterRecord[];
  onSelectComplaint: (id: string) => void;
  onCreateJointAction?: (req: JointActionRequest) => Promise<JointActionResult>;
  onNavigatePage?: (page: string) => void;
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => Promise<void>;
}

/**
 * Calculates geodesic distance between two points in meters (Haversine formula)
 */
function getHaversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const LiveMap: React.FC<LiveMapProps> = ({
  complaints,
  incidentClusters,
  onSelectComplaint,
  onCreateJointAction,
  onNavigatePage,
  loading = false,
  error = null,
  onRefresh,
}) => {
  const { user } = useAuth();
  const {
    organizationType,
    stateName,
    division,
    district,
    districtId,
    municipalCorporationId,
    municipalCorporationName,
    currentCorporation,
    mapCenter,
  } = useOrganization();

  const isMunicipalStaff =
    user?.role === 'municipal_admin' ||
    user?.role === 'super_admin' ||
    user?.role === 'dept_admin' ||
    user?.role === 'officer';

  // GIS View Mode & Layer Controls
  const [viewMode, setViewMode] = useState<MapViewMode>('hybrid');
  const [showHotspots, setShowHotspots] = useState<boolean>(true);
  const [showIncidentClusters, setShowIncidentClusters] = useState<boolean>(true);
  const [show200mRings, setShow200mRings] = useState<boolean>(true);
  const [showBoundaries, setShowBoundaries] = useState<boolean>(true);

  // Time & Lifecycle Filters
  const [timeRange, setTimeRange] = useState<TimeRangeFilter>('all');
  const [lifecycleFilter, setLifecycleFilter] = useState<LifecycleFilter>('all');

  // Tactical Filter Controls
  const [selectedCategory, setSelectedCategory] = useState<IncidentCategory | 'all'>('all');
  const [selectedPriority, setSelectedPriority] = useState<ComplaintPriority | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [activeFilterHotspotId, setActiveFilterHotspotId] = useState<string | null>(null);

  // Hotspot Configuration (Section 11)
  const [hotspotRadius, setHotspotRadius] = useState<number>(500);
  const [hotspotMinCount, setHotspotMinCount] = useState<number>(2);
  const [showConfigPanel, setShowConfigPanel] = useState<boolean>(false);

  // Active Selection State
  const [activePinId, setActivePinId] = useState<string | null>(null);
  const [activeHotspotId, setActiveHotspotId] = useState<string | null>(null);
  const [activeIncidentId, setActiveIncidentId] = useState<string | null>(null);
  const [focusCoords, setFocusCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Sidebar Tab View
  const [sidebarTab, setSidebarTab] = useState<'inspector' | 'hotspots' | 'incidents' | 'proximity'>(
    'inspector'
  );

  // Joint Action Modal
  const [jointActionTarget, setJointActionTarget] = useState<PotentialIncidentResult | null>(null);
  const [isJointActionModalOpen, setIsJointActionModalOpen] = useState(false);

  // 1. Filter out reports without valid numeric lat/lng
  const plottableComplaints = useMemo(() => {
    return complaints.filter((c) => hasValidCoordinates(c));
  }, [complaints]);

  const unplottableCount = complaints.length - plottableComplaints.length;

  // 2. Apply Time Filter (Section 13)
  const timeFilteredComplaints = useMemo(() => {
    if (timeRange === 'all') return plottableComplaints;

    const now = new Date().getTime();
    let cutoffMs = 0;

    if (timeRange === 'today') {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      cutoffMs = todayStart.getTime();
    } else if (timeRange === '24h') {
      cutoffMs = now - 24 * 60 * 60 * 1000;
    } else if (timeRange === '7d') {
      cutoffMs = now - 7 * 24 * 60 * 60 * 1000;
    } else if (timeRange === '30d') {
      cutoffMs = now - 30 * 24 * 60 * 60 * 1000;
    }

    return plottableComplaints.filter((c) => {
      if (!c.createdAt) return true;
      const t = new Date(c.createdAt).getTime();
      return t >= cutoffMs;
    });
  }, [plottableComplaints, timeRange]);

  // 3. Compute Lifecycle Counts (Section 14)
  const lifecycleCounts = useMemo(() => {
    let active = 0;
    let resolved = 0;
    timeFilteredComplaints.forEach((c) => {
      const isResolved = c.status === 'verified' || c.status === 'closed' || c.status === 'resolution_submitted';
      if (isResolved) resolved++;
      else active++;
    });
    return { active, resolved, total: timeFilteredComplaints.length };
  }, [timeFilteredComplaints]);

  // 4. Compute 3C Emerging Problem Hotspots with configurable threshold
  const hotspotConfig: HotspotThresholdConfig = useMemo(() => {
    return {
      clusterRadiusMeters: hotspotRadius,
      minimumClusterSize: hotspotMinCount,
    };
  }, [hotspotRadius, hotspotMinCount]);

  const detectedHotspots = useMemo(() => {
    return EmergingProblemEngine.detectHotspots(timeFilteredComplaints, hotspotConfig).filter(
      (h) => h.classification !== 'normal'
    );
  }, [timeFilteredComplaints, hotspotConfig]);

  // 5. Compute 3D Potential Incident Groups
  const detectedIncidents = useMemo(() => {
    return IncidentGroupingEngine.groupComplaintsIntoIncidents(timeFilteredComplaints).filter(
      (inc: PotentialIncidentResult) => inc.classification !== 'noIncidentGroup'
    );
  }, [timeFilteredComplaints]);

  // 6. Filter plotted markers by selected tactical filter params + Lifecycle Filter
  const filteredComplaints = useMemo(() => {
    return timeFilteredComplaints.filter((c) => {
      // Hotspot single-focus filter
      if (activeFilterHotspotId) {
        const targetHotspot = detectedHotspots.find((h: EmergingHotspotResult) => h.id === activeFilterHotspotId);
        if (targetHotspot) {
          const isMember =
            targetHotspot.complaintIds.includes(c.id) ||
            targetHotspot.reportIds.includes(c.id) ||
            (c.dbId && targetHotspot.complaintIds.includes(String(c.dbId)));
          if (!isMember) return false;
        }
      }

      // Lifecycle Filter
      if (lifecycleFilter === 'active') {
        const isResolved = c.status === 'verified' || c.status === 'closed' || c.status === 'resolution_submitted';
        if (isResolved) return false;
      } else if (lifecycleFilter === 'resolved') {
        const isResolved = c.status === 'verified' || c.status === 'closed' || c.status === 'resolution_submitted';
        if (!isResolved) return false;
      }

      if (selectedCategory !== 'all' && c.category !== selectedCategory) return false;
      if (selectedPriority !== 'all' && c.priority !== selectedPriority) return false;

      // Status filter
      if (selectedStatus !== 'all') {
        if (selectedStatus === 'overdue') {
          if (!c.sla.isOverdue) return false;
        } else if (selectedStatus === 'resolved') {
          if (c.status !== 'verified' && c.status !== 'resolution_submitted' && c.status !== 'closed') return false;
        } else if (c.status !== selectedStatus) {
          return false;
        }
      }

      return true;
    });
  }, [
    timeFilteredComplaints,
    activeFilterHotspotId,
    detectedHotspots,
    lifecycleFilter,
    selectedCategory,
    selectedPriority,
    selectedStatus,
  ]);

  // 7. Compute 200m proximity clusters among all filtered complaints
  const proximityClusters = useMemo(() => {
    const clusterMap: Array<{ complaint: Complaint; nearbyCount: number }> = [];

    for (let i = 0; i < filteredComplaints.length; i++) {
      let count = 0;
      for (let j = 0; j < filteredComplaints.length; j++) {
        if (i === j) continue;
        const dist = getHaversineDistanceMeters(
          filteredComplaints[i].location.latitude,
          filteredComplaints[i].location.longitude,
          filteredComplaints[j].location.latitude,
          filteredComplaints[j].location.longitude
        );
        if (dist <= 200) {
          count++;
        }
      }
      if (count > 0 || filteredComplaints[i].isDuplicateCluster) {
        clusterMap.push({
          complaint: filteredComplaints[i],
          nearbyCount: count,
        });
      }
    }

    return clusterMap;
  }, [filteredComplaints]);

  // Selected entities
  const selectedComplaint = complaints.find((c) => c.id === activePinId);
  const selectedHotspot = detectedHotspots.find((h: EmergingHotspotResult) => h.id === activeHotspotId);
  const selectedIncident = detectedIncidents.find((i: PotentialIncidentResult) => i.incidentId === activeIncidentId);

  // Associated 3D incident for selected hotspot
  const hotspotAssociatedIncident = useMemo(() => {
    if (!selectedHotspot) return null;
    return (
      detectedIncidents.find((inc: PotentialIncidentResult) => {
        return inc.memberComplaintIds.some((id: string) =>
          selectedHotspot.complaintIds.includes(id) || selectedHotspot.reportIds.includes(id)
        );
      }) || null
    );
  }, [selectedHotspot, detectedIncidents]);

  // Handlers
  const handleSelectComplaintPin = (id: string) => {
    setActivePinId(id);
    setActiveHotspotId(null);
    setActiveIncidentId(null);
    setSidebarTab('inspector');
  };

  const handleSelectHotspot = (hotspotId: string) => {
    const h = detectedHotspots.find((item: EmergingHotspotResult) => item.id === hotspotId);
    if (h) {
      setActiveHotspotId(hotspotId);
      setActivePinId(null);
      setActiveIncidentId(null);
      setSidebarTab('inspector');
      setFocusCoords({ lat: h.centerLatitude, lng: h.centerLongitude });
    }
  };

  const handleSelectIncident = (incidentId: string) => {
    const inc = detectedIncidents.find((item: PotentialIncidentResult) => item.incidentId === incidentId);
    if (inc) {
      setActiveIncidentId(incidentId);
      setActivePinId(null);
      setActiveHotspotId(null);
      setSidebarTab('inspector');
      setFocusCoords({ lat: inc.centerLatitude, lng: inc.centerLongitude });
    }
  };

  const handleOpenJointAction = (incident: PotentialIncidentResult) => {
    setJointActionTarget(incident);
    setIsJointActionModalOpen(true);
  };

  // Loading View
  if (loading && complaints.length === 0) {
    return (
      <div className="h-[calc(100vh-6rem)] flex items-center justify-center">
        <div className="text-center p-8 bg-white border border-[#D9E2EC] rounded-lg shadow-sm">
          <RefreshCw className="w-8 h-8 animate-spin text-[#1769D2] mx-auto mb-3" />
          <h3 className="text-sm font-bold text-[#172B4D]">Loading GIS Smart Map...</h3>
          <p className="text-xs text-[#526581] mt-1">Connecting to live Supabase geospatial telemetry.</p>
        </div>
      </div>
    );
  }

  // Error View (Section 26)
  if (error && complaints.length === 0) {
    return (
      <div className="h-[calc(100vh-6rem)] flex items-center justify-center">
        <div className="text-center p-8 bg-white border border-red-200 rounded-lg max-w-md shadow-sm">
          <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-[#172B4D]">Map data is currently unavailable</h3>
          <p className="text-xs text-red-600 mt-1 mb-4">Please try again later or check database telemetry.</p>
          {onRefresh && (
            <Button
              variant="primary"
              size="sm"
              onClick={onRefresh}
              className="bg-[#1769D2] text-white"
            >
              Retry Connection
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-3 min-h-0 min-w-0 w-full">
      {/* Top Administrative & Tactical Intelligence Bar */}
      <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs shrink-0 space-y-2.5">
        {/* Row 1: Administrative Breadcrumbs & View Modes */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <MapPin className="w-4 h-4 text-[#1769D2]" />
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
              <span className="text-slate-500">Maharashtra</span>
              <span className="text-slate-300">/</span>
              {division && (
                <>
                  <span className="text-slate-500">{division} Div</span>
                  <span className="text-slate-300">/</span>
                </>
              )}
              {district && (
                <>
                  <span className="text-[#1769D2] font-extrabold">{district}</span>
                  <span className="text-slate-300">/</span>
                </>
              )}
              <span className="text-slate-800">
                {organizationType === 'STATE'
                  ? 'State Overview'
                  : municipalCorporationName || 'Municipal Area'}
              </span>
            </div>

            <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.2 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              LIVE TELEMETRY
            </span>

            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-[#1769D2] border border-blue-200 font-bold">
              {filteredComplaints.length} PLOTTED
            </span>

            {unplottableCount > 0 && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                {unplottableCount} PENDING GPS
              </span>
            )}
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-mono">
            <button
              onClick={() => setViewMode('hybrid')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                viewMode === 'hybrid'
                  ? 'bg-white text-[#172B4D] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📍 Hybrid Pins
            </button>
            <button
              onClick={() => setViewMode('heatmap')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                viewMode === 'heatmap'
                  ? 'bg-white text-orange-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🔥 Heatmap
            </button>
            <button
              onClick={() => setViewMode('hotspots')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                viewMode === 'hotspots'
                  ? 'bg-white text-amber-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🚨 Hotspots Only
            </button>
          </div>
        </div>

        {/* Row 2: Tactical Filters, Time Selector & Lifecycle State */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            {/* Time Filter (Section 13) */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-0.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500 ml-1.5" />
              {(['all', 'today', '24h', '7d', '30d'] as TimeRangeFilter[]).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeRange(tf)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                    timeRange === tf
                      ? 'bg-[#1769D2] text-white font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tf === 'all'
                    ? 'All Time'
                    : tf === 'today'
                    ? 'Today'
                    : tf === '24h'
                    ? '24h'
                    : tf === '7d'
                    ? '7d'
                    : '30d'}
                </button>
              ))}
            </div>

            {/* Before / After Lifecycle Filter (Section 14) */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-0.5">
              <button
                onClick={() => setLifecycleFilter('all')}
                className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                  lifecycleFilter === 'all'
                    ? 'bg-slate-700 text-white font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({lifecycleCounts.total})
              </button>
              <button
                onClick={() => setLifecycleFilter('active')}
                className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                  lifecycleFilter === 'active'
                    ? 'bg-red-700 text-white font-bold'
                    : 'text-red-700 hover:bg-red-50'
                }`}
              >
                Active ({lifecycleCounts.active})
              </button>
              <button
                onClick={() => setLifecycleFilter('resolved')}
                className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                  lifecycleFilter === 'resolved'
                    ? 'bg-emerald-700 text-white font-bold'
                    : 'text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                Resolved ({lifecycleCounts.resolved})
              </button>
            </div>

            {/* Category Filter (Section 8) */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as any)}
              className="h-7 text-xs bg-white border border-[#D9E2EC] text-[#172B4D] rounded px-2 shadow-xs"
              aria-label="Filter by Complaint Category"
            >
              <option value="all">All Categories</option>
              <option value="roads">Roads & Pavements</option>
              <option value="water_sewage">Water Supply</option>
              <option value="drainage">Drainage & Sewage</option>
              <option value="waste_management">Waste Management</option>
              <option value="streetlights">Electricity & Lights</option>
              <option value="public_safety">Public Safety / Traffic</option>
              <option value="parks">Parks & Urban Greens</option>
            </select>

            {/* Priority Filter (Section 7) */}
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value as any)}
              className="h-7 text-xs bg-white border border-[#D9E2EC] text-[#172B4D] rounded px-2 shadow-xs"
              aria-label="Filter by Priority Level"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">! Critical / Urgent</option>
              <option value="high">▲ High Priority</option>
              <option value="medium">● Medium Priority</option>
              <option value="low">▼ Low Priority</option>
            </select>

            {/* Status Filter (Section 6) */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="h-7 text-xs bg-white border border-[#D9E2EC] text-[#172B4D] rounded px-2 shadow-xs"
              aria-label="Filter by Lifecycle Status"
            >
              <option value="all">All Statuses</option>
              <option value="submitted">Submitted</option>
              <option value="under_review">Under Review / Verified</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="resolution_submitted">Awaiting Verification</option>
              <option value="verified">Resolved</option>
              <option value="closed">Closed</option>
              <option value="overdue">Overdue SLA Only</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            {/* Hotspot Config Threshold Toggle (Section 11) */}
            <button
              onClick={() => setShowConfigPanel(!showConfigPanel)}
              className={`h-7 px-2 rounded border text-xs font-mono flex items-center gap-1 transition-colors ${
                showConfigPanel
                  ? 'bg-amber-100 border-amber-300 text-amber-900 font-bold'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
              title="Configure Hotspot Spatial Thresholds"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Hotspot Config ({hotspotRadius}m)</span>
            </button>

            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                className="h-7 px-2 bg-white border-[#D9E2EC] text-[#172B4D] hover:bg-slate-50"
                title="Refresh Live Data"
              >
                <RefreshCw className="w-3 h-3 text-[#526581]" />
              </Button>
            )}
          </div>
        </div>

        {/* Hotspot Config Panel (Section 11) */}
        {showConfigPanel && (
          <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-bold text-amber-900 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-amber-700" />
                <span>Spatial Hotspot Parameters:</span>
              </span>

              <div className="flex items-center gap-1.5">
                <span className="text-amber-800">Cluster Radius:</span>
                {[250, 500, 1000, 1500].map((r) => (
                  <button
                    key={r}
                    onClick={() => setHotspotRadius(r)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      hotspotRadius === r
                        ? 'bg-amber-700 text-white'
                        : 'bg-white border border-amber-300 text-amber-800 hover:bg-amber-100'
                    }`}
                  >
                    {r}m
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-amber-800">Min Grievances:</span>
                {[2, 3, 5, 8].map((c) => (
                  <button
                    key={c}
                    onClick={() => setHotspotMinCount(c)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      hotspotMinCount === c
                        ? 'bg-amber-700 text-white'
                        : 'bg-white border border-amber-300 text-amber-800 hover:bg-amber-100'
                    }`}
                  >
                    {c}+
                  </button>
                ))}
              </div>
            </div>

            <div className="text-[10px] text-amber-800 font-semibold">
              {detectedHotspots.length} Clusters Detected
            </div>
          </div>
        )}
      </div>

      {/* Main Map & Side Flyout Inspection Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px] gap-3 min-h-0 min-w-0">
        {/* Map Canvas (Flex remaining space) */}
        <div className="h-full rounded-lg overflow-hidden border border-[#D9E2EC] shadow-sm relative min-h-[480px] min-w-0">
          <CommandMap
            complaints={filteredComplaints}
            selectedId={activePinId}
            onSelectComplaint={handleSelectComplaintPin}
            selectedHotspotId={activeHotspotId}
            onSelectHotspot={handleSelectHotspot}
            selectedIncidentId={activeIncidentId}
            onSelectIncident={handleSelectIncident}
            showProximityRings={show200mRings}
            showHotspots={showHotspots}
            showIncidentClusters={showIncidentClusters}
            showHeatmap={viewMode === 'heatmap' || viewMode === 'hybrid'}
            showBoundaries={showBoundaries}
            viewMode={viewMode}
            hotspotConfig={hotspotConfig}
            activeFilterHotspotId={activeFilterHotspotId}
            focusCoordinates={focusCoords}
            orgCenter={mapCenter}
            organizationType={organizationType}
            districtId={districtId}
            corporationId={municipalCorporationId}
          />


          {/* Empty state banner when no complaints match (Section 26) */}
          {filteredComplaints.length === 0 && (
            <div className="absolute inset-0 bg-slate-900/15 backdrop-blur-[1px] flex items-center justify-center p-4 pointer-events-none">
              <div className="bg-white/95 border border-slate-200 rounded-xl p-5 max-w-sm text-center shadow-lg pointer-events-auto">
                <AlertTriangle className="w-7 h-7 text-amber-500 mx-auto mb-2" />
                <div className="text-xs font-bold text-slate-900">
                  No Civic Complaints Found
                </div>
                <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                  No civic complaints found for this area and time period.
                </p>
                <button
                  onClick={() => {
                    setTimeRange('all');
                    setLifecycleFilter('all');
                    setSelectedCategory('all');
                    setSelectedPriority('all');
                    setSelectedStatus('all');
                    setActiveFilterHotspotId(null);
                  }}
                  className="mt-3 px-3 py-1 bg-[#1769D2] hover:bg-[#123B6D] text-white text-[11px] font-semibold rounded-md transition-colors"
                >
                  Reset All Filters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar: Dynamic Intelligence Inspector (controlled width) */}
        <div className="h-full flex flex-col gap-2.5 min-h-0 min-w-0 overflow-y-auto">
          {/* Sidebar Tab Switcher */}
          <div className="flex items-center justify-between p-1 bg-slate-100 border border-[#D9E2EC] rounded-lg shrink-0 text-xs font-mono">
            <button
              onClick={() => setSidebarTab('inspector')}
              className={`flex-1 py-1.5 px-2 rounded font-bold text-center transition-all ${
                sidebarTab === 'inspector'
                  ? 'bg-white text-[#172B4D] shadow-xs'
                  : 'text-[#526581] hover:text-[#172B4D]'
              }`}
            >
              {selectedHotspot
                ? '🔥 Hotspot'
                : selectedIncident
                ? '⚡ Incident'
                : selectedComplaint
                ? '📍 Dossier'
                : 'Inspector'}
            </button>

            <button
              onClick={() => setSidebarTab('hotspots')}
              className={`flex-1 py-1.5 px-2 rounded font-bold text-center transition-all flex items-center justify-center gap-1 ${
                sidebarTab === 'hotspots'
                  ? 'bg-white text-amber-900 shadow-xs'
                  : 'text-[#526581] hover:text-amber-800'
              }`}
            >
              <span>🔥 3C</span>
              <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-[10px] text-amber-800">
                {detectedHotspots.length}
              </span>
            </button>

            <button
              onClick={() => setSidebarTab('incidents')}
              className={`flex-1 py-1.5 px-2 rounded font-bold text-center transition-all flex items-center justify-center gap-1 ${
                sidebarTab === 'incidents'
                  ? 'bg-white text-purple-900 shadow-xs'
                  : 'text-[#526581] hover:text-purple-800'
              }`}
            >
              <span>⚡ 3D</span>
              <span className="px-1.5 py-0.2 rounded-full bg-purple-100 text-[10px] text-purple-800">
                {detectedIncidents.length}
              </span>
            </button>

            <button
              onClick={() => setSidebarTab('proximity')}
              className={`flex-1 py-1.5 px-2 rounded font-bold text-center transition-all flex items-center justify-center gap-1 ${
                sidebarTab === 'proximity'
                  ? 'bg-white text-[#1769D2] shadow-xs'
                  : 'text-[#526581] hover:text-[#1769D2]'
              }`}
            >
              <span>200m</span>
              <span className="px-1.5 py-0.2 rounded-full bg-blue-100 text-[10px] text-[#1769D2]">
                {proximityClusters.length}
              </span>
            </button>
          </div>

          {/* TAB 1: ACTIVE INSPECTOR */}
          {sidebarTab === 'inspector' && (
            <>
              {selectedHotspot ? (
                /* Hotspot Inspector View */
                <HotspotDetailInspector
                  hotspot={selectedHotspot}
                  allComplaints={plottableComplaints}
                  associatedIncident={hotspotAssociatedIncident}
                  onSelectComplaint={(id) => {
                    setActivePinId(id);
                    setFocusCoords(null);
                  }}
                  onFlyToCentroid={(lat, lng) => setFocusCoords({ lat, lng })}
                  onFilterToHotspot={(id) =>
                    setActiveFilterHotspotId(activeFilterHotspotId === id ? null : id)
                  }
                  isFilteredToHotspot={activeFilterHotspotId === selectedHotspot.id}
                  onOpenJointActionModal={handleOpenJointAction}
                  onClose={() => setActiveHotspotId(null)}
                  isMunicipalStaff={isMunicipalStaff}
                />
              ) : selectedIncident ? (
                /* 3D Incident Inspector View */
                <Card className="p-3.5 border-[#D9E2EC] bg-white shadow-sm space-y-3 shrink-0">
                  <div className="flex items-start justify-between pb-2 border-b border-[#E8EEF5]">
                    <div>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200">
                        3D POTENTIAL INCIDENT
                      </span>
                      <h3 className="text-xs font-bold text-[#172B4D] mt-1">
                        {selectedIncident.incidentLabel}
                      </h3>
                    </div>
                    <button
                      onClick={() => setActiveIncidentId(null)}
                      className="text-xs text-[#718096] hover:text-[#172B4D]"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="p-2 rounded bg-slate-50 border border-slate-200">
                      <div className="text-[10px] text-[#526581]">Confidence</div>
                      <div className="text-sm font-bold text-purple-700">
                        {selectedIncident.confidenceDisplay}
                      </div>
                    </div>
                    <div className="p-2 rounded bg-slate-50 border border-slate-200">
                      <div className="text-[10px] text-[#526581]">Linked Complaints</div>
                      <div className="text-sm font-bold text-[#172B4D]">
                        {selectedIncident.complaintCount} reports
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-[#526581] bg-slate-50 p-2 rounded border border-slate-200">
                    <div>📂 Category: <strong>{selectedIncident.primaryCategoryLabel}</strong></div>
                    <div>📍 Spread: ~{Math.round(selectedIncident.affectedRadiusMeters)}m zone</div>
                  </div>

                  {isMunicipalStaff && onCreateJointAction && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleOpenJointAction(selectedIncident)}
                      className="w-full h-8 text-xs font-semibold gap-1.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Create Joint Action Work Order</span>
                    </Button>
                  )}

                  {/* Linked Complaints List */}
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[10px] font-mono font-bold uppercase text-[#526581]">
                      Member Grievances ({selectedIncident.memberComplaintIds.length})
                    </div>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {selectedIncident.memberComplaintIds.map((cid: string) => {
                        const member = complaints.find((c) => c.id === cid || String(c.dbId) === cid);
                        if (!member) return null;
                        return (
                          <div
                            key={member.id}
                            onClick={() => onSelectComplaint(member.id)}
                            className="p-1.5 rounded bg-[#F8FAFC] hover:bg-purple-50/50 border border-[#E8EEF5] cursor-pointer text-xs flex items-center justify-between"
                          >
                            <span className="font-mono text-[#7C3AED] font-bold">#{member.id}</span>
                            <span className="truncate max-w-[140px] text-[#172B4D]">{member.title}</span>
                            <Badge status={member.status} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Card>
              ) : selectedComplaint ? (
                /* Single Complaint Pin Inspector (Section 5 & 20) */
                <Card className="p-4 border-slate-200 bg-white shadow-2xs space-y-3 flex flex-col shrink-0 rounded-xl">
                  <div className="flex items-center justify-between gap-1 flex-wrap">
                    <span className="font-mono text-xs font-bold text-[#1769D2]">
                      #{selectedComplaint.id}
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <PriorityBadge priority={selectedComplaint.priority} />
                      <StatusBadge status={selectedComplaint.status} />
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-mono text-[#1769D2] font-semibold uppercase">
                      {selectedComplaint.categoryLabel || selectedComplaint.category}
                    </span>
                    <h4 className="text-xs font-bold text-[#172B4D] mt-0.5">{selectedComplaint.title}</h4>
                    <p className="text-[11px] text-[#526581] mt-1 line-clamp-3 leading-relaxed">
                      {selectedComplaint.description}
                    </p>
                  </div>

                  <div className="p-2 rounded bg-[#F8FAFC] border border-[#E8EEF5] text-[11px] space-y-1">
                    <div className="text-[#526581]">📍 {selectedComplaint.location.address}</div>
                    <div className="text-[#526581] font-mono">Ward: {selectedComplaint.location.ward}</div>
                    <div className="text-[#526581] font-mono text-[10px]">
                      GPS: {hasValidCoordinates(selectedComplaint)
                        ? `${selectedComplaint.location.latitude.toFixed(4)}, ${selectedComplaint.location.longitude.toFixed(4)}`
                        : 'No GPS Telemetry'}
                    </div>
                    <div className="text-[#172B4D] font-mono font-medium flex items-center justify-between pt-1 border-t border-[#E8EEF5]">
                      <span>SLA Status:</span>
                      <span className={selectedComplaint.sla.isOverdue ? 'text-red-600 font-bold' : 'text-emerald-700 font-bold'}>
                        {selectedComplaint.sla.isOverdue ? 'OVERDUE' : `${selectedComplaint.sla.hoursRemaining}h remaining`}
                      </span>
                    </div>
                  </div>

                  {selectedComplaint.evidence.before[0] && (
                    <div className="aspect-video rounded overflow-hidden border border-[#D9E2EC]">
                      <img
                        src={selectedComplaint.evidence.before[0]}
                        alt="Inspection Proof"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => onSelectComplaint(selectedComplaint.id)}
                    className="w-full h-8 text-xs font-semibold gap-1.5 bg-[#1769D2] hover:bg-[#123B6D] text-white"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Complaint / Dossier</span>
                  </Button>
                </Card>
              ) : (
                /* Empty Selection Guide */
                <Card className="p-4 border-[#D9E2EC] bg-white text-center text-[#718096] text-xs flex flex-col items-center justify-center p-6 shadow-sm shrink-0">
                  <Compass className="w-7 h-7 text-[#1769D2] mb-2" />
                  <span className="font-semibold text-[#172B4D]">Inspect Geospatial Intelligence</span>
                  <span className="text-[11px] text-[#526581] mt-1 leading-relaxed max-w-[220px]">
                    Click any map pin, 🔥 3C Emerging Hotspot, or ⚡ 3D Incident cluster to inspect live telemetry.
                  </span>
                </Card>
              )}
            </>
          )}

          {/* TAB 2: 3C EMERGING HOTSPOTS LIST */}
          {sidebarTab === 'hotspots' && (
            <Card className="p-3 border-[#D9E2EC] bg-white shadow-sm flex-1 overflow-y-auto space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-[#E8EEF5]">
                <div className="text-[10px] font-mono uppercase text-[#526581] font-bold flex items-center gap-1">
                  <Flame className="w-3 h-3 text-orange-600" />
                  <span>3C Hotspots (~{hotspotRadius}m)</span>
                </div>
                <span className="text-[10px] font-mono text-amber-900 font-bold">
                  {detectedHotspots.length} Detected
                </span>
              </div>

              {detectedHotspots.length === 0 ? (
                <div className="text-[11px] text-[#718096] italic p-4 text-center">
                  No statistical volume spikes or spatial hotspots detected in current time window.
                </div>
              ) : (
                detectedHotspots.map((h: EmergingHotspotResult) => (
                  <div
                    key={h.id}
                    onClick={() => handleSelectHotspot(h.id)}
                    className={`p-2.5 rounded border cursor-pointer text-xs space-y-1.5 transition-all ${
                      activeHotspotId === h.id
                        ? 'bg-amber-50 border-amber-300 shadow-xs'
                        : 'bg-[#F8FAFC] hover:bg-amber-50/50 border-[#E8EEF5]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded"
                        style={{
                          backgroundColor: h.badgeBg,
                          borderColor: h.badgeBorder,
                          color: h.badgeText,
                          borderWidth: '1px',
                        }}
                      >
                        {h.shortLabel.toUpperCase()} · {h.scoreDisplay}
                      </span>
                      <span className="text-[10px] font-mono text-[#526581]">
                        {h.currentWindowCount} in 24h ({h.increaseRatio.toFixed(1)}× surge)
                      </span>
                    </div>

                    <div className="text-xs font-bold text-[#172B4D] truncate">
                      🔥 {h.categoryLabel} Hotspot
                    </div>

                    <div className="text-[10px] text-[#526581] flex items-center justify-between">
                      <span>{h.complaintCount} total complaints</span>
                      <span className="text-[#1769D2] font-semibold flex items-center gap-0.5">
                        Inspect Hotspot <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                ))
              )}
            </Card>
          )}

          {/* TAB 3: 3D POTENTIAL INCIDENTS LIST */}
          {sidebarTab === 'incidents' && (
            <Card className="p-3 border-[#D9E2EC] bg-white shadow-sm flex-1 overflow-y-auto space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-[#E8EEF5]">
                <div className="text-[10px] font-mono uppercase text-[#526581] font-bold flex items-center gap-1">
                  <Layers className="w-3 h-3 text-purple-600" />
                  <span>3D Common Root Cause Groups</span>
                </div>
                <span className="text-[10px] font-mono text-purple-900 font-bold">
                  {detectedIncidents.length} Clusters
                </span>
              </div>

              {detectedIncidents.length === 0 ? (
                <div className="text-[11px] text-[#718096] italic p-4 text-center">
                  No multi-report potential incident groups identified in current dataset.
                </div>
              ) : (
                detectedIncidents.map((inc: PotentialIncidentResult) => (
                  <div
                    key={inc.incidentId}
                    onClick={() => handleSelectIncident(inc.incidentId)}
                    className={`p-2.5 rounded border cursor-pointer text-xs space-y-1.5 transition-all ${
                      activeIncidentId === inc.incidentId
                        ? 'bg-purple-50 border-purple-300 shadow-xs'
                        : 'bg-[#F8FAFC] hover:bg-purple-50/50 border-[#E8EEF5]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold text-[#7C3AED]">
                        ⚡ #{inc.incidentId}
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 font-semibold">
                        {inc.confidenceDisplay} Match
                      </span>
                    </div>

                    <div className="text-xs font-bold text-[#172B4D] truncate">
                      {inc.incidentLabel}
                    </div>

                    <div className="text-[10px] text-[#526581] flex items-center justify-between">
                      <span>{inc.complaintCount} member grievances</span>
                      <span className="text-[#7C3AED] font-semibold flex items-center gap-0.5">
                        Inspect Cluster <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                ))
              )}
            </Card>
          )}

          {/* TAB 4: 200M PROXIMITY DUPLICATION FEED */}
          {sidebarTab === 'proximity' && (
            <Card className="p-3 border-[#D9E2EC] bg-white shadow-sm flex-1 overflow-y-auto space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-[#E8EEF5]">
                <div className="text-[10px] font-mono uppercase text-[#526581] font-bold">
                  Nearby Proximity Clusters (&le;200m)
                </div>
                <span className="text-[10px] font-mono text-[#1769D2] font-semibold">
                  {proximityClusters.length} Incidents
                </span>
              </div>

              {proximityClusters.length === 0 ? (
                <div className="text-[11px] text-[#718096] italic p-3 text-center">
                  No overlapping 200m proximity clusters detected among plotted incidents.
                </div>
              ) : (
                proximityClusters.map(({ complaint: c, nearbyCount }) => (
                  <div
                    key={c.id}
                    onClick={() => handleSelectComplaintPin(c.id)}
                    className={`p-2 rounded border cursor-pointer text-xs space-y-1 transition-colors ${
                      activePinId === c.id
                        ? 'bg-blue-50/80 border-blue-300'
                        : 'bg-[#F8FAFC] hover:bg-blue-50/50 border-[#E8EEF5]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[#1769D2] font-semibold">#{c.id}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 font-medium">
                        {nearbyCount > 0 ? `${nearbyCount} within 200m` : 'Duplicate Cluster'}
                      </span>
                    </div>
                    <div className="text-[#172B4D] font-medium truncate">{c.title}</div>
                    <div className="text-[10px] text-[#526581] truncate">{c.location.address}</div>
                  </div>
                ))
              )}
            </Card>
          )}
        </div>
      </div>

      {/* Joint Action Modal directly accessible from GIS Map */}
      {isJointActionModalOpen && jointActionTarget && onCreateJointAction && (
        <JointActionModal
          isOpen={isJointActionModalOpen}
          onClose={() => {
            setIsJointActionModalOpen(false);
            setJointActionTarget(null);
          }}
          incident={jointActionTarget}
          allComplaints={complaints}
          onSubmitJointAction={async (req) => {
            const res = await onCreateJointAction(req);
            setIsJointActionModalOpen(false);
            setJointActionTarget(null);
            return res;
          }}
        />
      )}
    </div>
  );
};
