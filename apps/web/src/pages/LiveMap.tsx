import React, { useState, useMemo } from 'react';
import { CommandMap } from '../components/map/CommandMap';
import { HotspotDetailInspector } from '../components/map/HotspotDetailInspector';
import { JointActionModal } from '../components/incidents/JointActionModal';
import { Complaint, IncidentCategory, ComplaintPriority, ComplaintStatus } from '../types/complaint';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
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
} from 'lucide-react';

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
  const isMunicipalStaff =
    user?.role === 'municipal_admin' ||
    user?.role === 'super_admin' ||
    user?.role === 'dept_admin' ||
    user?.role === 'officer';
  const isMunicipalAdmin = user?.role === 'municipal_admin' || user?.role === 'super_admin';

  // Layer Toggles
  const [showHotspots, setShowHotspots] = useState<boolean>(true);
  const [showIncidentClusters, setShowIncidentClusters] = useState<boolean>(true);
  const [show200mRings, setShow200mRings] = useState<boolean>(true);

  // Tactical Filter Controls
  const [selectedCategory, setSelectedCategory] = useState<IncidentCategory | 'all'>('all');
  const [selectedPriority, setSelectedPriority] = useState<ComplaintPriority | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<ComplaintStatus | 'all'>('all');
  const [activeFilterHotspotId, setActiveFilterHotspotId] = useState<string | null>(null);

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

  // 2. Compute 3C Emerging Problem Hotspots
  const detectedHotspots = useMemo(() => {
    return EmergingProblemEngine.detectHotspots(plottableComplaints, {
      clusterRadiusMeters: 500,
      minimumClusterSize: 2,
    }).filter((h) => h.classification !== 'normal');
  }, [plottableComplaints]);

  // 3. Compute 3D Potential Incident Groups
  const detectedIncidents = useMemo(() => {
    return IncidentGroupingEngine.groupComplaintsIntoIncidents(plottableComplaints).filter(
      (inc: PotentialIncidentResult) => inc.classification !== 'noIncidentGroup'
    );
  }, [plottableComplaints]);

  // 4. Filter plotted markers by selected tactical filter params
  const filteredComplaints = useMemo(() => {
    return plottableComplaints.filter((c) => {
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

      if (selectedCategory !== 'all' && c.category !== selectedCategory) return false;
      if (selectedPriority !== 'all' && c.priority !== selectedPriority) return false;
      if (selectedStatus !== 'all' && c.status !== selectedStatus) return false;
      return true;
    });
  }, [
    plottableComplaints,
    activeFilterHotspotId,
    detectedHotspots,
    selectedCategory,
    selectedPriority,
    selectedStatus,
  ]);

  // 5. Compute 200m proximity clusters among all plottable complaints
  const proximityClusters = useMemo(() => {
    const clusterMap: Array<{ complaint: Complaint; nearbyCount: number }> = [];

    for (let i = 0; i < plottableComplaints.length; i++) {
      let count = 0;
      for (let j = 0; j < plottableComplaints.length; j++) {
        if (i === j) continue;
        const dist = getHaversineDistanceMeters(
          plottableComplaints[i].location.latitude,
          plottableComplaints[i].location.longitude,
          plottableComplaints[j].location.latitude,
          plottableComplaints[j].location.longitude
        );
        if (dist <= 200) {
          count++;
        }
      }
      if (count > 0 || plottableComplaints[i].isDuplicateCluster) {
        clusterMap.push({
          complaint: plottableComplaints[i],
          nearbyCount: count,
        });
      }
    }

    return clusterMap;
  }, [plottableComplaints]);

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
          <h3 className="text-sm font-bold text-[#172B4D]">Loading GIS Tactical Map...</h3>
          <p className="text-xs text-[#526581] mt-1">Connecting to live Supabase geospatial telemetry.</p>
        </div>
      </div>
    );
  }

  // Error View
  if (error && complaints.length === 0) {
    return (
      <div className="h-[calc(100vh-6rem)] flex items-center justify-center">
        <div className="text-center p-8 bg-white border border-red-200 rounded-lg max-w-md shadow-sm">
          <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-[#172B4D]">Unable to Load Map Data</h3>
          <p className="text-xs text-red-600 mt-1 mb-4">{error}</p>
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
    <div className="space-y-3 h-[calc(100vh-5.5rem)] flex flex-col">
      {/* Top GIS Tactical Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 p-2.5 rounded-lg bg-white border border-[#D9E2EC] shadow-xs shrink-0">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-[#1769D2]" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#172B4D]">
            {isMunicipalAdmin ? 'City-wide GIS Incident Matrix' : 'Zone 2 Incident & Response GIS Map'}
          </h2>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-[#1769D2] border border-blue-200 font-semibold">
            {filteredComplaints.length} PLOTTED ON MAP
          </span>
          {unplottableCount > 0 && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-[#526581] border border-slate-200">
              {unplottableCount} WITHOUT GPS
            </span>
          )}
          {activeFilterHotspotId && (
            <button
              onClick={() => setActiveFilterHotspotId(null)}
              className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-300 font-bold hover:bg-amber-100 transition-colors flex items-center gap-1"
            >
              <span>🔥 Hotspot Filter Active</span>
              <span className="text-xs">✕</span>
            </button>
          )}
        </div>

        {/* Tactical Filters & Layer Toggles */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* 3C Hotspots Toggle */}
          <button
            onClick={() => setShowHotspots(!showHotspots)}
            className={`px-2.5 py-1 rounded text-[11px] font-mono border transition-colors shadow-xs flex items-center gap-1.5 ${
              showHotspots
                ? 'bg-amber-50 border-amber-300 text-amber-900 font-bold'
                : 'bg-white border-[#D9E2EC] text-[#526581] hover:bg-slate-50'
            }`}
          >
            <span>🔥 3C Hotspots:</span>
            <span>{showHotspots ? 'ON' : 'OFF'}</span>
            <span className="px-1 py-0.2 rounded-full bg-amber-200/80 text-[9px]">
              {detectedHotspots.length}
            </span>
          </button>

          {/* 3D Incidents Toggle */}
          <button
            onClick={() => setShowIncidentClusters(!showIncidentClusters)}
            className={`px-2.5 py-1 rounded text-[11px] font-mono border transition-colors shadow-xs flex items-center gap-1.5 ${
              showIncidentClusters
                ? 'bg-purple-50 border-purple-300 text-purple-900 font-bold'
                : 'bg-white border-[#D9E2EC] text-[#526581] hover:bg-slate-50'
            }`}
          >
            <span>⚡ 3D Incidents:</span>
            <span>{showIncidentClusters ? 'ON' : 'OFF'}</span>
            <span className="px-1 py-0.2 rounded-full bg-purple-200/80 text-[9px]">
              {detectedIncidents.length}
            </span>
          </button>

          {/* 200m Proximity Toggle */}
          <button
            onClick={() => setShow200mRings(!show200mRings)}
            className={`px-2.5 py-1 rounded text-[11px] font-mono border transition-colors shadow-xs ${
              show200mRings
                ? 'bg-blue-50 border-blue-300 text-[#1769D2] font-semibold'
                : 'bg-white border-[#D9E2EC] text-[#526581] hover:bg-slate-50'
            }`}
          >
            200m Rings: {show200mRings ? 'ON' : 'OFF'}
          </button>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as any)}
            className="h-7 text-xs bg-white border border-[#D9E2EC] text-[#172B4D] rounded px-2 shadow-xs"
          >
            <option value="all">All Categories</option>
            <option value="roads">Roads & Pavements</option>
            <option value="water_sewage">Water Supply</option>
            <option value="drainage">Drainage & Sewage</option>
            <option value="waste_management">Waste Management</option>
            <option value="streetlights">Electricity & Lights</option>
            <option value="public_safety">Public Safety</option>
            <option value="parks">Parks & Urban Greens</option>
          </select>

          {/* Priority Filter */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value as any)}
            className="h-7 text-xs bg-white border border-[#D9E2EC] text-[#172B4D] rounded px-2 shadow-xs"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent / Critical</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as any)}
            className="h-7 text-xs bg-white border border-[#D9E2EC] text-[#172B4D] rounded px-2 shadow-xs"
          >
            <option value="all">All Statuses</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under Review</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="resolution_submitted">Resolution Submitted</option>
            <option value="verified">Verified / Resolved</option>
            <option value="closed">Closed</option>
            <option value="overdue">Overdue SLA Only</option>
          </select>

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

      {/* Main Map & Side Flyout Inspection Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0">
        {/* Map Canvas (8 or 9 cols) */}
        <div className="lg:col-span-8 xl:col-span-8 h-full rounded-lg overflow-hidden border border-[#D9E2EC] shadow-sm relative">
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
            activeFilterHotspotId={activeFilterHotspotId}
            focusCoordinates={focusCoords}
          />

          {filteredComplaints.length === 0 && (
            <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-[1px] flex items-center justify-center p-4 pointer-events-none">
              <div className="bg-white/95 border border-[#D9E2EC] rounded-lg p-4 max-w-sm text-center shadow-lg pointer-events-auto">
                <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto mb-1.5" />
                <div className="text-xs font-bold text-[#172B4D]">No Complaints Plotted</div>
                <p className="text-[11px] text-[#526581] mt-1">
                  {complaints.length === 0
                    ? 'The database currently contains zero complaint records.'
                    : 'No complaints match the selected filter criteria or have valid GPS coordinates.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar: Dynamic Intelligence Inspector (4 cols) */}
        <div className="lg:col-span-4 xl:col-span-4 h-full flex flex-col gap-2.5 min-h-0 overflow-y-auto">
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
                /* Single Complaint Pin Inspector */
                <Card className="p-3.5 border-[#D9E2EC] bg-white shadow-sm space-y-3 flex flex-col shrink-0">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#1769D2]">
                      #{selectedComplaint.id}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Badge priority={selectedComplaint.priority} />
                      <Badge status={selectedComplaint.status} />
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-mono text-[#1769D2] font-semibold uppercase">
                      {selectedComplaint.categoryLabel}
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
                    <span>Open Full Incident Dossier</span>
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
                  <span>3C Emerging Hotspots (~500m)</span>
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
                        {h.currentWindowCount} in 24h ({h.increaseRatio.toFixed(1)}× spike)
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
