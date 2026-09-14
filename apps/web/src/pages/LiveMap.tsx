import React, { useState, useMemo } from 'react';
import { CommandMap } from '../components/map/CommandMap';
import { Complaint, IncidentCategory, ComplaintPriority, ComplaintStatus } from '../types/complaint';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { hasValidCoordinates } from '../services/reportAdapter';
import { useAuth } from '../hooks/useAuth';
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
} from 'lucide-react';

interface LiveMapProps {
  complaints: Complaint[];
  onSelectComplaint: (id: string) => void;
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
  onSelectComplaint,
  loading = false,
  error = null,
  onRefresh,
}) => {
  const { user } = useAuth();
  const isMunicipalAdmin = user?.role === 'municipal_admin' || user?.role === 'super_admin';

  const [selectedCategory, setSelectedCategory] = useState<IncidentCategory | 'all'>('all');
  const [selectedPriority, setSelectedPriority] = useState<ComplaintPriority | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<ComplaintStatus | 'all'>('all');
  const [show200mRings, setShow200mRings] = useState<boolean>(true);
  const [showHotspots, setShowHotspots] = useState<boolean>(true);
  const [activePinId, setActivePinId] = useState<string | null>(null);

  // 1. Filter out reports without valid numeric lat/lng
  const plottableComplaints = useMemo(() => {
    return complaints.filter((c) => hasValidCoordinates(c));
  }, [complaints]);

  const unplottableCount = complaints.length - plottableComplaints.length;

  // 2. Filter plotted markers by selected tactical filter params
  const filteredComplaints = useMemo(() => {
    return plottableComplaints.filter((c) => {
      if (selectedCategory !== 'all' && c.category !== selectedCategory) return false;
      if (selectedPriority !== 'all' && c.priority !== selectedPriority) return false;
      if (selectedStatus !== 'all' && c.status !== selectedStatus) return false;
      return true;
    });
  }, [plottableComplaints, selectedCategory, selectedPriority, selectedStatus]);

  // 3. Compute 200m proximity clusters among all plottable complaints
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

  const selectedComplaint = complaints.find((c) => c.id === activePinId);

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
        </div>

        {/* Tactical Filters & Layer Toggles */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            onClick={() => setShow200mRings(!show200mRings)}
            className={`px-2.5 py-1 rounded text-[11px] font-mono border transition-colors shadow-xs ${
              show200mRings
                ? 'bg-blue-50 border-blue-300 text-[#1769D2] font-semibold'
                : 'bg-white border-[#D9E2EC] text-[#526581] hover:bg-slate-50'
            }`}
          >
            200m Proximity: {show200mRings ? 'ON' : 'OFF'}
          </button>

          <button
            onClick={() => setShowHotspots(!showHotspots)}
            className={`px-2.5 py-1 rounded text-[11px] font-mono border transition-colors shadow-xs ${
              showHotspots
                ? 'bg-red-50 border-red-300 text-red-700 font-semibold'
                : 'bg-white border-[#D9E2EC] text-[#526581] hover:bg-slate-50'
            }`}
          >
            🔥 500m Hotspots: {showHotspots ? 'ON' : 'OFF'}
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
        <div className="lg:col-span-8 xl:col-span-9 h-full rounded-lg overflow-hidden border border-[#D9E2EC] shadow-sm relative">
          <CommandMap
            complaints={filteredComplaints}
            selectedId={activePinId}
            onSelectComplaint={(id) => setActivePinId(id)}
            showProximityRings={show200mRings}
            showHotspots={showHotspots}
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

        {/* Right Sidebar: Active Pin Inspector (3 or 4 cols) */}
        <div className="lg:col-span-4 xl:col-span-3 h-full flex flex-col gap-3 min-h-0 overflow-y-auto">
          {selectedComplaint ? (
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
            <Card className="p-4 border-[#D9E2EC] bg-white text-center text-[#718096] text-xs flex flex-col items-center justify-center p-6 shadow-sm shrink-0">
              <MapPin className="w-6 h-6 text-[#A0AEC0] mb-2" />
              <span className="font-semibold text-[#172B4D]">Inspect Incident Telemetry</span>
              <span className="text-[11px] text-[#526581] mt-1">
                Click on any map pin or proximity cluster item below to inspect live details.
              </span>
            </Card>
          )}

          {/* Quick Proximity Cluster Feed */}
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
                  onClick={() => setActivePinId(c.id)}
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
        </div>
      </div>
    </div>
  );
};
