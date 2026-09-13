import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Complaint } from '../../types/complaint';
import { DEFAULT_MAP_CENTER, COMPLAINT_STATUS_CONFIG } from '../../lib/constants';
import { hasValidCoordinates } from '../../services/reportAdapter';
import { SimilarityEngine } from '../../services/similarityEngine';
import { PriorityEngine } from '../../services/priorityEngine';
import { EmergingProblemEngine, EmergingHotspotResult } from '../../services/emergingProblemEngine';

interface CommandMapProps {
  complaints: Complaint[];
  selectedId?: string | null;
  onSelectComplaint?: (id: string) => void;
  showProximityRings?: boolean;
  showHotspots?: boolean;
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
  const R = 6371000; // Earth radius in meters
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

export const CommandMap: React.FC<CommandMapProps> = ({
  complaints,
  selectedId,
  onSelectComplaint,
  showProximityRings = true,
  showHotspots = true,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<{ [key: string]: maplibregl.Marker }>({});
  const hotspotMarkersRef = useRef<{ [key: string]: maplibregl.Marker }>({});
  const initialFitDone = useRef(false);

  // Initialize MapLibre
  useEffect(() => {
    if (!mapContainer.current) return;

    // Clean Municipal Basemap Style using OpenStreetMap Standard Raster tiles
    const mapStyle: maplibregl.StyleSpecification = {
      version: 8,
      sources: {
        'osm-tiles': {
          type: 'raster',
          tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '&copy; OpenStreetMap contributors',
        },
      },
      layers: [
        {
          id: 'osm-layer',
          type: 'raster',
          source: 'osm-tiles',
          minzoom: 0,
          maxzoom: 19,
        },
      ],
    };

    const mapInstance = new maplibregl.Map({
      container: mapContainer.current,
      style: mapStyle,
      center: [DEFAULT_MAP_CENTER.lng, DEFAULT_MAP_CENTER.lat],
      zoom: DEFAULT_MAP_CENTER.zoom,
      attributionControl: false,
    });

    mapInstance.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      'top-right'
    );
    mapInstance.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      'bottom-right'
    );

    map.current = mapInstance;

    return () => {
      mapInstance.remove();
    };
  }, []);

  // Update Markers & 200m Proximity Visualizations & Phase 3C Hotspots on real data change
  useEffect(() => {
    if (!map.current) return;

    // 1. Filter complaints with strict valid coordinates (no default/invented coordinates)
    const validComplaints = complaints.filter((c) => {
      const valid = hasValidCoordinates(c);
      if (!valid) {
        console.log(`ℹ️ [GIS Map] Skipping complaint #${c.id}: No valid GPS coordinates available.`);
      }
      return valid;
    });

    // 2. Identify complaints within 200m of another complaint
    const proximityMemberIds = new Set<string>();
    for (let i = 0; i < validComplaints.length; i++) {
      for (let j = i + 1; j < validComplaints.length; j++) {
        const c1 = validComplaints[i];
        const c2 = validComplaints[j];
        const dist = getHaversineDistanceMeters(
          c1.location.latitude,
          c1.location.longitude,
          c2.location.latitude,
          c2.location.longitude
        );
        if (dist <= 200) {
          proximityMemberIds.add(c1.id);
          proximityMemberIds.add(c2.id);
        }
      }
    }

    // 3. Clear existing markers
    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};
    Object.values(hotspotMarkersRef.current).forEach((m) => m.remove());
    hotspotMarkersRef.current = {};

    // 4. Render Phase 3C Hotspot Overlays (500m Activity Clusters)
    if (showHotspots) {
      const detectedHotspots = EmergingProblemEngine.detectHotspots(validComplaints, {
        clusterRadiusMeters: 500,
        minimumClusterSize: 2,
      }).filter((h) => h.classification !== 'normal');

      detectedHotspots.forEach((hotspot) => {
        const hEl = document.createElement('div');
        hEl.className = 'hotspot-marker-wrapper cursor-pointer';

        const isCritical = hotspot.classification === 'criticalEmergingProblem';
        const ringColor = isCritical ? '#D92D20' : '#EA580C';

        hEl.innerHTML = `
          <div style="position: relative; display: flex; align-items: center; justify-content: center; transform: translate(0, 0);">
            <!-- 500m Geographic Proximity Ring -->
            <div style="
              position: absolute;
              width: 84px;
              height: 84px;
              border-radius: 50%;
              background: ${ringColor}15;
              border: 2px dashed ${ringColor}80;
              pointer-events: none;
              animation: pulse 3s infinite ease-in-out;
            "></div>
            <!-- Hotspot Badge Center Pin -->
            <div style="
              position: relative;
              z-index: 5;
              padding: 2px 6px;
              border-radius: 12px;
              background: ${ringColor};
              border: 2px solid #FFFFFF;
              box-shadow: 0 2px 10px rgba(0,0,0,0.3);
              color: #FFFFFF;
              font-size: 10px;
              font-weight: 800;
              font-family: monospace;
              display: flex;
              align-items: center;
              gap: 3px;
              white-space: nowrap;
            ">
              <span>🔥</span>
              <span>${hotspot.levelLabel.toUpperCase()} · ${hotspot.scoreDisplay}</span>
            </div>
          </div>
        `;

        const hotspotPopupContent = document.createElement('div');
        hotspotPopupContent.style.fontFamily = 'Inter, sans-serif';
        hotspotPopupContent.style.minWidth = '240px';
        hotspotPopupContent.style.color = '#172B4D';

        hotspotPopupContent.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 10px; font-family: monospace; font-weight: bold; color: ${isCritical ? '#D92D20' : '#EA580C'}; padding: 1px 6px; border-radius: 4px; background: ${isCritical ? '#FEF2F2' : '#FFF7ED'}; border: 1px solid ${isCritical ? '#FECACA' : '#FFEDD5'};">
              ${hotspot.levelLabel.toUpperCase()} · ${hotspot.scoreDisplay}
            </span>
            <span style="font-size: 10px; font-mono; color: #526581;">~500m Zone</span>
          </div>
          <div style="font-size: 12px; font-weight: 700; color: #172B4D; line-height: 1.3; margin-bottom: 4px;">
            📂 ${hotspot.categoryLabel}
          </div>
          <div style="font-size: 11px; color: #526581; margin-bottom: 6px;">
            📍 Centroid: ${hotspot.centerLatitude.toFixed(4)}, ${hotspot.centerLongitude.toFixed(4)}
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 10px; font-family: monospace; margin-bottom: 6px;">
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 3px 5px; border-radius: 4px;">
              <span style="color: #718096;">24h Recent:</span> <strong>${hotspot.currentWindowCount}</strong>
            </div>
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 3px 5px; border-radius: 4px;">
              <span style="color: #718096;">Spike Ratio:</span> <strong style="color: ${hotspot.increaseRatio >= 1.5 ? '#D92D20' : '#16803C'};">${hotspot.increaseRatio.toFixed(1)}×</strong>
            </div>
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 3px 5px; border-radius: 4px;">
              <span style="color: #718096;">500m Cluster:</span> <strong>${hotspot.complaintCount}</strong>
            </div>
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 3px 5px; border-radius: 4px;">
              <span style="color: #718096;">Priority/Safety:</span> <strong>${hotspot.highPriorityCount}</strong>
            </div>
          </div>

          <div style="font-size: 10px; font-family: monospace; color: #526581; background: #F8FAFC; border: 1px solid #E2E8F0; padding: 4px 6px; border-radius: 4px; margin-bottom: 6px;">
            <div style="font-weight: bold; color: #172B4D; margin-bottom: 2px;">⚡ Evidence Drivers:</div>
            ${hotspot.explainableReasons.map((r) => `<div style="color: #334155; margin-bottom: 1px;">• ${r}</div>`).join('')}
          </div>

          ${
            hotspot.complaintIds[0]
              ? `<button id="inspect-hotspot-lead-${hotspot.id}" style="
                  width: 100%;
                  padding: 5px 8px;
                  background: #1769D2;
                  color: white;
                  border: none;
                  border-radius: 4px;
                  font-size: 11px;
                  font-weight: 600;
                  cursor: pointer;
                  transition: background 0.2s;
                ">
                  Inspect Cluster Lead (#${hotspot.complaintIds[0]}) ➔
                </button>`
              : ''
          }
        `;

        hotspotPopupContent
          .querySelector(`#inspect-hotspot-lead-${hotspot.id}`)
          ?.addEventListener('click', (e) => {
            e.stopPropagation();
            if (hotspot.complaintIds[0]) {
              onSelectComplaint?.(hotspot.complaintIds[0]);
            }
          });

        const hotspotPopup = new maplibregl.Popup({ offset: 15, closeButton: true }).setDOMContent(
          hotspotPopupContent
        );

        if (map.current) {
          const hMarker = new maplibregl.Marker({ element: hEl })
            .setLngLat([hotspot.centerLongitude, hotspot.centerLatitude])
            .setPopup(hotspotPopup)
            .addTo(map.current);

          hotspotMarkersRef.current[hotspot.id] = hMarker;
        }
      });
    }

    // 5. Render individual complaint markers
    validComplaints.forEach((c) => {
      const el = document.createElement('div');
      el.className = 'command-marker-wrapper cursor-pointer';

      const isSelected = selectedId === c.id;
      const isUrgent = c.priority === 'urgent';
      const isHigh = c.priority === 'high';
      const isProximityNear = proximityMemberIds.has(c.id) || c.isDuplicateCluster;

      const color = isUrgent
        ? '#D92D20'
        : isHigh
        ? '#EA580C'
        : c.priority === 'medium'
        ? '#D99A00'
        : '#1769D2';

      el.innerHTML = `
        <div style="position: relative; display: flex; align-items: center; justify-content: center;">
          ${
            showProximityRings && isProximityNear
              ? `<div style="
                  position: absolute;
                  width: 48px;
                  height: 48px;
                  border-radius: 50%;
                  background: ${color}18;
                  border: 1.5px dashed ${color}90;
                  animation: pulse 3s infinite ease-in-out;
                "></div>`
              : ''
          }
          <div style="
            width: ${isSelected ? '28px' : '22px'};
            height: ${isSelected ? '28px' : '22px'};
            border-radius: 50%;
            background: ${color};
            border: 2px solid #FFFFFF;
            box-shadow: 0 2px 8px rgba(0,0,0,0.25);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #FFFFFF;
            font-size: 11px;
            font-weight: bold;
            font-family: monospace;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          ">
            ${isUrgent ? '!' : isHigh ? '▲' : '•'}
          </div>
        </div>
      `;

      el.addEventListener('click', () => {
        onSelectComplaint?.(c.id);
      });

      const popupContent = document.createElement('div');
      popupContent.style.fontFamily = 'Inter, sans-serif';
      popupContent.style.minWidth = '210px';
      popupContent.style.color = '#172B4D';

      const statusConfig = COMPLAINT_STATUS_CONFIG[c.status] || {
        label: c.status,
        color: '#526581',
      };

      const priorityAnalysis = PriorityEngine.evaluateComplaintPriority(c, validComplaints);
      const relatedSummary = SimilarityEngine.getRelatedCandidatesSummary(c, validComplaints);

      popupContent.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <span style="color: #1769D2; font-weight: bold; font-family: monospace; font-size: 12px;">#${c.id}</span>
          <span style="font-size: 10px; font-family: monospace; font-weight: bold; color: ${priorityAnalysis.badgeColor}; padding: 1px 5px; border-radius: 4px; background: ${priorityAnalysis.badgeColor}15; border: 1px solid ${priorityAnalysis.badgeColor}40;">
            ${priorityAnalysis.levelLabel.toUpperCase()} · ${priorityAnalysis.scoreDisplay}
          </span>
        </div>
        <div style="font-size: 12px; font-weight: 700; color: #172B4D; line-height: 1.3; margin-bottom: 4px;">${c.title}</div>
        <div style="font-size: 11px; color: #526581; margin-bottom: 2px;">📂 ${c.categoryLabel}</div>
        <div style="font-size: 11px; color: #526581; margin-bottom: 6px;">📍 ${c.location.address}</div>
        ${
          priorityAnalysis.topDrivers.length > 0
            ? `<div style="font-size: 10px; font-family: monospace; color: #526581; margin-bottom: 6px; background: #F8FAFC; border: 1px solid #E2E8F0; padding: 2px 5px; border-radius: 4px;">
                ⚡ Drivers: ${priorityAnalysis.topDrivers.slice(0, 2).join(', ')}
              </div>`
            : ''
        }
        <div style="font-size: 10px; font-family: monospace; color: #526581; border-top: 1px solid #D9E2EC; padding-top: 4px; display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: 600; color: ${statusConfig.color};">${statusConfig.label}</span>
          <span style="font-weight: bold; color: ${c.sla.isOverdue ? '#D92D20' : '#16803C'};">${c.sla.isOverdue ? 'OVERDUE' : `${c.sla.hoursRemaining}h SLA`}</span>
        </div>
        ${
          relatedSummary
            ? `<div style="margin-top: 6px; padding: 3px 6px; border-radius: 4px; background: ${
                relatedSummary.topClassification === 'highConfidenceDuplicate'
                  ? '#FAF5FF; border: 1px solid #E9D5FF; color: #6B21A8;'
                  : '#EFF6FF; border: 1px solid #BFDBFE; color: #1E40AF;'
              } font-size: 10px; font-family: monospace; font-weight: 600; display: flex; align-items: center; gap: 4px;">
                <span>✨ ${relatedSummary.count} possible related ${
                relatedSummary.count === 1 ? 'complaint' : 'complaints'
              } nearby (${Math.round(relatedSummary.highestConfidence * 100)}% match)</span>
              </div>`
            : ''
        }
        <button id="view-btn-${c.id}" style="
          margin-top: 8px;
          width: 100%;
          padding: 5px 8px;
          background: #1769D2;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        ">
          Inspect Incident Dossier ➔
        </button>
      `;

      popupContent.querySelector(`#view-btn-${c.id}`)?.addEventListener('click', (e) => {
        e.stopPropagation();
        onSelectComplaint?.(c.id);
      });

      const popup = new maplibregl.Popup({ offset: 25, closeButton: true }).setDOMContent(
        popupContent
      );

      if (map.current) {
        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([c.location.longitude, c.location.latitude])
          .setPopup(popup)
          .addTo(map.current);

        markersRef.current[c.id] = marker;
      }
    });

    // 6. Initial auto-fit bounds or flyTo selected
    if (selectedId && map.current) {
      const selected = validComplaints.find((c) => c.id === selectedId);
      if (selected) {
        map.current.flyTo({
          center: [selected.location.longitude, selected.location.latitude],
          zoom: 15,
          speed: 1.2,
        });
        markersRef.current[selected.id]?.togglePopup();
      }
    } else if (validComplaints.length > 0 && map.current && !initialFitDone.current) {
      const bounds = new maplibregl.LngLatBounds();
      validComplaints.forEach((c) => {
        bounds.extend([c.location.longitude, c.location.latitude]);
      });
      map.current.fitBounds(bounds, { padding: 60, maxZoom: 14 });
      initialFitDone.current = true;
    }
  }, [complaints, selectedId, showProximityRings, showHotspots, onSelectComplaint]);

  return (
    <div className="relative w-full h-full min-h-[400px] rounded-lg overflow-hidden border border-[#D9E2EC] bg-[#F8FAFC] shadow-sm">
      <div ref={mapContainer} className="w-full h-full" />

      {/* Map Legend Overlay (Municipal Standard) */}
      <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md p-3 rounded-lg border border-[#D9E2EC] shadow-md text-[11px] space-y-1.5 z-10 text-[#172B4D]">
        <div className="text-[10px] font-mono text-[#526581] uppercase font-bold tracking-wider">
          Incident Severity Matrix
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#D92D20] shadow-xs" />
          <span className="text-[#172B4D] font-medium">Critical / Urgent (12h SLA)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#EA580C]" />
          <span className="text-[#172B4D] font-medium">High Priority (24h SLA)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#D99A00]" />
          <span className="text-[#172B4D] font-medium">Medium Priority (48h)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#1769D2]" />
          <span className="text-[#172B4D] font-medium">Low Priority (72h)</span>
        </div>
        {showHotspots && (
          <div className="flex items-center gap-2 pt-1.5 border-t border-[#E8EEF5] text-[10px] text-[#526581]">
            <span className="w-3 h-3 rounded-full border border-dashed border-[#D92D20] bg-red-500/20 flex items-center justify-center text-[8px]">🔥</span>
            <span className="text-red-700 font-bold">500m Hotspot Anomaly Zone</span>
          </div>
        )}
        {showProximityRings && (
          <div className="flex items-center gap-2 text-[10px] text-[#526581]">
            <span className="w-3 h-3 rounded-full border border-dashed border-[#D92D20] bg-red-500/15" />
            <span>200m Proximity Duplication Buffer</span>
          </div>
        )}
      </div>
    </div>
  );
};
