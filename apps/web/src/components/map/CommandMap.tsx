import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Complaint } from '../../types/complaint';
import { DEFAULT_MAP_CENTER, COMPLAINT_STATUS_CONFIG } from '../../lib/constants';
import { hasValidCoordinates } from '../../services/reportAdapter';
import { SimilarityEngine } from '../../services/similarityEngine';
import { PriorityEngine } from '../../services/priorityEngine';
import { EmergingProblemEngine, EmergingHotspotResult } from '../../services/emergingProblemEngine';
import { IncidentGroupingEngine, PotentialIncidentResult } from '../../services/incidentGroupingEngine';
import { getAdministrativeBoundariesGeoJSON } from '../../data/maharashtraBoundaries';
import {
  ChevronDown,
  ChevronUp,
  Layers,
  Flame,
  MapPin,
  Eye,
  Compass,
  Globe,
  Crosshair,
  Loader2,
  Navigation,
  Check,
  AlertCircle,
  X,
} from 'lucide-react';

export type MapViewMode = 'hybrid' | 'markers' | 'heatmap' | 'hotspots';
export type BaseMapStyle = 'voyager' | 'satellite' | 'positron' | 'dark';

export const BASEMAPS: Record<
  BaseMapStyle,
  { name: string; icon: string; tiles: string[]; maxZoom: number; attribution: string }
> = {
  voyager: {
    name: 'Streets & Terrain',
    icon: '🗺️',
    tiles: [
      'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
      'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
      'https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
      'https://d.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
    ],
    maxZoom: 20,
    attribution: '&copy; CARTO &copy; OpenStreetMap contributors',
  },
  satellite: {
    name: 'Satellite View',
    icon: '🛰️',
    tiles: [
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    ],
    maxZoom: 19,
    attribution: '&copy; Esri World Imagery',
  },
  positron: {
    name: 'Clean Light',
    icon: '🏙️',
    tiles: [
      'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
      'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
      'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
      'https://d.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
    ],
    maxZoom: 20,
    attribution: '&copy; CARTO &copy; OpenStreetMap contributors',
  },
  dark: {
    name: 'Night Ops',
    icon: '🌙',
    tiles: [
      'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
      'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
      'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
      'https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
    ],
    maxZoom: 20,
    attribution: '&copy; CARTO &copy; OpenStreetMap contributors',
  },
};

export interface HotspotThresholdConfig {
  clusterRadiusMeters: number;
  minimumClusterSize: number;
  timeWindowHours?: number;
}

interface CommandMapProps {
  complaints: Complaint[];
  selectedId?: string | null;
  onSelectComplaint?: (id: string) => void;
  selectedHotspotId?: string | null;
  onSelectHotspot?: (hotspotId: string) => void;
  selectedIncidentId?: string | null;
  onSelectIncident?: (incidentId: string) => void;
  showProximityRings?: boolean;
  showHotspots?: boolean;
  showIncidentClusters?: boolean;
  showHeatmap?: boolean;
  showBoundaries?: boolean;
  viewMode?: MapViewMode;
  hotspotConfig?: HotspotThresholdConfig;
  activeFilterHotspotId?: string | null;
  focusCoordinates?: { lat: number; lng: number } | null;
  /** Geographic center derived from the current org context (district/corporation) */
  orgCenter?: { lat: number; lng: number; zoom: number } | null;
  organizationType?: 'STATE' | 'DISTRICT' | 'MUNICIPAL_CORPORATION';
  districtId?: string | null;
  corporationId?: string | null;
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

/**
 * Escapes unsafe characters for MapLibre HTML popups to prevent XSS.
 */
function escapeHtml(str: string | undefined | null): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const CommandMap: React.FC<CommandMapProps> = ({
  complaints,
  selectedId,
  onSelectComplaint,
  selectedHotspotId,
  onSelectHotspot,
  selectedIncidentId,
  onSelectIncident,
  showProximityRings = true,
  showHotspots = true,
  showIncidentClusters = true,
  showHeatmap = true,
  showBoundaries = true,
  viewMode = 'hybrid',
  hotspotConfig = { clusterRadiusMeters: 500, minimumClusterSize: 2 },
  activeFilterHotspotId,
  focusCoordinates,
  orgCenter,
  organizationType = 'MUNICIPAL_CORPORATION',
  districtId,
  corporationId,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<{ [key: string]: maplibregl.Marker }>({});
  const hotspotMarkersRef = useRef<{ [key: string]: maplibregl.Marker }>({});
  const incidentMarkersRef = useRef<{ [key: string]: maplibregl.Marker }>({});
  const initialFitDone = useRef(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [legendCollapsed, setLegendCollapsed] = useState(false);
  const prevOrgCenterRef = useRef<string>('');

  // Enhanced Basemap & Geolocation State
  const [activeBasemap, setActiveBasemap] = useState<BaseMapStyle>('voyager');
  const [liveLocation, setLiveLocation] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [gpsToast, setGpsToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [cursorCoords, setCursorCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [currentZoom, setCurrentZoom] = useState<number>(orgCenter?.zoom ?? DEFAULT_MAP_CENTER.zoom);
  const liveGpsMarkerRef = useRef<maplibregl.Marker | null>(null);

  // 1. Initialize MapLibre with High-Fidelity Multi-Source Basemaps & Ocean Background
  useEffect(() => {
    if (!mapContainer.current) return;

    const mapStyle: maplibregl.StyleSpecification = {
      version: 8,
      sources: {
        'basemap-source-voyager': {
          type: 'raster',
          tiles: BASEMAPS.voyager.tiles,
          tileSize: 256,
          attribution: BASEMAPS.voyager.attribution,
        },
        'basemap-source-satellite': {
          type: 'raster',
          tiles: BASEMAPS.satellite.tiles,
          tileSize: 256,
          attribution: BASEMAPS.satellite.attribution,
        },
        'basemap-source-positron': {
          type: 'raster',
          tiles: BASEMAPS.positron.tiles,
          tileSize: 256,
          attribution: BASEMAPS.positron.attribution,
        },
        'basemap-source-dark': {
          type: 'raster',
          tiles: BASEMAPS.dark.tiles,
          tileSize: 256,
          attribution: BASEMAPS.dark.attribution,
        },
      },
      layers: [
        {
          id: 'map-ocean-bg',
          type: 'background',
          paint: {
            'background-color': '#d2e4f5',
          },
        },
        {
          id: 'basemap-raster-layer',
          type: 'raster',
          source: 'basemap-source-voyager',
          minzoom: 0,
          maxzoom: 20,
        },
      ],
    };

    const initCenter = orgCenter ?? DEFAULT_MAP_CENTER;
    const mapInstance = new maplibregl.Map({
      container: mapContainer.current,
      style: mapStyle,
      center: [initCenter.lng, initCenter.lat],
      zoom: initCenter.zoom,
      minZoom: 1.5,
      maxZoom: 20,
      attributionControl: false,
    });
    map.current = mapInstance;

    mapInstance.addControl(
      new maplibregl.NavigationControl({ showCompass: true }),
      'top-right'
    );
    mapInstance.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      'bottom-right'
    );

    mapInstance.on('mousemove', (e) => {
      setCursorCoords({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    });

    mapInstance.on('zoom', () => {
      setCurrentZoom(Number(mapInstance.getZoom().toFixed(1)));
    });

    mapInstance.on('load', () => {
      if (organizationType === 'STATE') {
        mapInstance.fitBounds(
          [
            [72.5, 15.6],
            [81.0, 22.0],
          ],
          { padding: 35, duration: 0 }
        );
      }

      // 1. Setup Administrative Boundaries GeoJSON source & layers
      const boundariesGeoJSON = getAdministrativeBoundariesGeoJSON(
        organizationType,
        districtId,
        corporationId
      );

      mapInstance.addSource('admin-boundaries-source', {
        type: 'geojson',
        data: boundariesGeoJSON as any,
      });

      mapInstance.addLayer({
        id: 'admin-boundaries-fill',
        type: 'fill',
        source: 'admin-boundaries-source',
        paint: {
          'fill-color': '#1769D2',
          'fill-opacity': 0.04,
        },
      });

      mapInstance.addLayer({
        id: 'admin-boundaries-line',
        type: 'line',
        source: 'admin-boundaries-source',
        paint: {
          'line-color': '#1769D2',
          'line-width': 2,
          'line-dasharray': [3, 2],
          'line-opacity': 0.7,
        },
      });

      // 2. Setup Native MapLibre Heatmap source & layer
      mapInstance.addSource('complaints-heatmap-source', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      });

      mapInstance.addLayer({
        id: 'complaints-heatmap-layer',
        type: 'heatmap',
        source: 'complaints-heatmap-source',
        maxzoom: 17,
        paint: {
          // Increase the heatmap weight based on priority
          'heatmap-weight': ['get', 'weight'],
          // Increase intensity as zoom level increases
          'heatmap-intensity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0,
            0.8,
            9,
            1.5,
            15,
            3.0,
          ],
          // Color ramp for heatmap density (Low -> Medium -> High -> Critical)
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0,
            'rgba(33, 102, 172, 0)',
            0.2,
            'rgb(103, 169, 207)',
            0.4,
            'rgb(209, 229, 240)',
            0.6,
            'rgb(253, 219, 199)',
            0.8,
            'rgb(239, 138, 98)',
            1.0,
            'rgb(178, 24, 43)',
          ],
          // Adjust the heatmap radius by zoom level
          'heatmap-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0,
            3,
            9,
            14,
            14,
            28,
            17,
            45,
          ],
          // Transition opacity
          'heatmap-opacity': 0.85,
        },
      });

      setMapLoaded(true);
    });

    // 1B. Responsive Container Resize Observer (keeps map centered and sized on layout shifts)
    const resizeObserver = new ResizeObserver(() => {
      if (map.current) {
        map.current.resize();
      }
    });
    if (mapContainer.current) {
      resizeObserver.observe(mapContainer.current);
    }

    return () => {
      resizeObserver.disconnect();
      if (liveGpsMarkerRef.current) {
        liveGpsMarkerRef.current.remove();
      }
      mapInstance.remove();
    };
  }, []);

  // 2. Update Administrative Boundaries when Org Context changes
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    const source = map.current.getSource('admin-boundaries-source') as maplibregl.GeoJSONSource | undefined;
    if (source) {
      const boundariesGeoJSON = getAdministrativeBoundariesGeoJSON(
        organizationType,
        districtId,
        corporationId
      );
      source.setData(boundariesGeoJSON as any);
    }
  }, [mapLoaded, organizationType, districtId, corporationId]);

  // 3. Re-center map when org context changes (district / corporation switch)
  useEffect(() => {
    if (!orgCenter || !map.current) return;
    const key = `${orgCenter.lat},${orgCenter.lng},${orgCenter.zoom}`;
    if (key === prevOrgCenterRef.current) return;
    prevOrgCenterRef.current = key;
    initialFitDone.current = false;
    map.current.flyTo({
      center: [orgCenter.lng, orgCenter.lat],
      zoom: orgCenter.zoom,
      speed: 1.4,
      essential: true,
    });
  }, [orgCenter]);

  // 4. Handle external focus coordinate changes & Fit All actions
  useEffect(() => {
    if (!map.current) return;

    if (focusCoordinates) {
      const targetZoom =
        organizationType === 'STATE' &&
        focusCoordinates.lat === orgCenter?.lat &&
        focusCoordinates.lng === orgCenter?.lng
          ? 6.0
          : 14.5;
      map.current.flyTo({
        center: [focusCoordinates.lng, focusCoordinates.lat],
        zoom: targetZoom,
        speed: 1.2,
      });
    } else if (focusCoordinates === null && initialFitDone.current) {
      if (organizationType === 'STATE') {
        map.current.fitBounds(
          [
            [72.5, 15.6],
            [81.0, 22.0],
          ],
          { padding: 35, duration: 800 }
        );
      } else {
        const validComplaints = complaints.filter((c) => hasValidCoordinates(c));
        if (validComplaints.length > 0) {
          const bounds = new maplibregl.LngLatBounds();
          validComplaints.forEach((c) => {
            bounds.extend([c.location.longitude, c.location.latitude]);
          });
          map.current.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 800 });
        }
      }
    }
  }, [focusCoordinates, organizationType, orgCenter, complaints]);

  // 5. Update Native Heatmap GeoJSON Source
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const validComplaints = complaints.filter((c) => hasValidCoordinates(c));

    const heatmapFeatures = validComplaints.map((c) => {
      let weight = 0.3;
      if (c.priority === 'urgent') weight = 1.0;
      else if (c.priority === 'high') weight = 0.75;
      else if (c.priority === 'medium') weight = 0.5;

      // Boost weight for active unresolved complaints
      const isUnresolved = c.status !== 'verified' && c.status !== 'closed';
      if (isUnresolved) weight *= 1.2;

      return {
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [c.location.longitude, c.location.latitude],
        },
        properties: {
          id: c.id,
          weight: Math.min(weight, 1.5),
          category: c.category,
          status: c.status,
          priority: c.priority,
        },
      };
    });

    const source = map.current.getSource('complaints-heatmap-source') as maplibregl.GeoJSONSource | undefined;
    if (source) {
      source.setData({
        type: 'FeatureCollection',
        features: heatmapFeatures,
      });
    }

    // Toggle heatmap layer visibility
    const isHeatmapVisible =
      showHeatmap && (viewMode === 'heatmap' || viewMode === 'hybrid');
    if (map.current.getLayer('complaints-heatmap-layer')) {
      map.current.setLayoutProperty(
        'complaints-heatmap-layer',
        'visibility',
        isHeatmapVisible ? 'visible' : 'none'
      );
    }
  }, [complaints, mapLoaded, showHeatmap, viewMode]);

  // 6. Update Markers, Hotspot Clusters & Incident Overlays
  useEffect(() => {
    if (!map.current) return;

    const validComplaints = complaints.filter((c) => hasValidCoordinates(c));

    // Emerging Problem Hotspots
    const detectedHotspots = EmergingProblemEngine.detectHotspots(validComplaints, {
      clusterRadiusMeters: hotspotConfig.clusterRadiusMeters || 500,
      minimumClusterSize: hotspotConfig.minimumClusterSize || 2,
    }).filter((h) => h.classification !== 'normal');

    const selectedHotspot = detectedHotspots.find((h) => h.id === selectedHotspotId);
    const hotspotMemberIds = new Set<string>();
    if (selectedHotspot) {
      selectedHotspot.complaintIds.forEach((id) => hotspotMemberIds.add(id));
      selectedHotspot.reportIds.forEach((id) => hotspotMemberIds.add(id));
    }

    // 200m proximity clusters
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

    // Clear existing markers
    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};
    Object.values(hotspotMarkersRef.current).forEach((m) => m.remove());
    hotspotMarkersRef.current = {};
    Object.values(incidentMarkersRef.current).forEach((m) => m.remove());
    incidentMarkersRef.current = {};

    const shouldShowMarkers = viewMode === 'markers' || viewMode === 'hybrid';
    const shouldShowHotspots = showHotspots && (viewMode === 'hotspots' || viewMode === 'hybrid');

    // 6A. Render Hotspots
    if (shouldShowHotspots) {
      detectedHotspots.forEach((hotspot) => {
        // Calculate factual stats for the hotspot cluster
        const contributingComplaints = EmergingProblemEngine.getContributingComplaints(
          hotspot,
          validComplaints
        );
        const unresolvedCount = contributingComplaints.filter(
          (c) => c.status !== 'verified' && c.status !== 'closed'
        ).length;
        const resolvedCount = contributingComplaints.length - unresolvedCount;

        // Category breakdown
        const categoryCounts: Record<string, number> = {};
        contributingComplaints.forEach((c) => {
          const cat = c.categoryLabel || c.category;
          categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        });
        const topCategories = Object.entries(categoryCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([name, count]) => `${name} — ${count}`)
          .join(', ');

        const hEl = document.createElement('div');
        hEl.className = 'hotspot-marker-wrapper cursor-pointer';

        const isCritical = hotspot.classification === 'criticalEmergingProblem';
        const isSelected = hotspot.id === selectedHotspotId;
        const ringColor = isCritical ? '#D92D20' : '#EA580C';

        hEl.innerHTML = `
          <div style="position: relative; display: flex; align-items: center; justify-content: center; transform: translate(0, 0);">
            <div style="
              position: absolute;
              width: ${isSelected ? '120px' : '90px'};
              height: ${isSelected ? '120px' : '90px'};
              border-radius: 50%;
              background: ${ringColor}${isSelected ? '28' : '15'};
              border: ${isSelected ? '3px solid' : '2px dashed'} ${ringColor}${isSelected ? 'CC' : '80'};
              pointer-events: none;
              animation: pulse ${isSelected ? '2s' : '3.5s'} infinite ease-in-out;
              box-shadow: ${isSelected ? `0 0 24px ${ringColor}60` : 'none'};
            "></div>
            <div style="
              position: relative;
              z-index: ${isSelected ? '20' : '8'};
              padding: ${isSelected ? '3px 8px' : '2px 6px'};
              border-radius: 12px;
              background: ${ringColor};
              border: ${isSelected ? '2.5px solid #FEF08A' : '2px solid #FFFFFF'};
              box-shadow: 0 3px 12px rgba(0,0,0,0.35);
              color: #FFFFFF;
              font-size: ${isSelected ? '11px' : '10px'};
              font-weight: 800;
              font-family: monospace;
              display: flex;
              align-items: center;
              gap: 3px;
              white-space: nowrap;
            ">
              <span>🔥</span>
              <span>${hotspot.shortLabel.toUpperCase()} · ${hotspot.scoreDisplay}</span>
            </div>
          </div>
        `;

        hEl.addEventListener('click', (e) => {
          e.stopPropagation();
          onSelectHotspot?.(hotspot.id);
        });

        // Factual Hotspot Popup conforming to Section 10 & 12 specification
        const hotspotPopupContent = document.createElement('div');
        hotspotPopupContent.style.fontFamily = 'Inter, sans-serif';
        hotspotPopupContent.style.minWidth = '260px';
        hotspotPopupContent.style.color = '#172B4D';

        hotspotPopupContent.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 10px; font-family: monospace; font-weight: bold; color: ${isCritical ? '#D92D20' : '#EA580C'}; padding: 1px 6px; border-radius: 4px; background: ${isCritical ? '#FEF2F2' : '#FFF7ED'}; border: 1px solid ${isCritical ? '#FECACA' : '#FFEDD5'};">
              CIVIC HOTSPOT · ${hotspot.scoreDisplay}
            </span>
            <span style="font-size: 10px; font-family: monospace; color: #526581;">Radius: ${(hotspot.radiusMeters / 1000).toFixed(1)} km</span>
          </div>

          <div style="font-size: 13px; font-weight: 700; color: #172B4D; margin-bottom: 4px;">
            🔥 ${hotspot.complaintCount} Reports Concentrated
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 11px; font-family: monospace; margin-bottom: 6px;">
            <div style="background: #FEF2F2; border: 1px solid #FECACA; padding: 4px 6px; border-radius: 4px; color: #991B1B;">
              <strong>${unresolvedCount}</strong> unresolved
            </div>
            <div style="background: #F0FDF4; border: 1px solid #BBF7D0; padding: 4px 6px; border-radius: 4px; color: #166534;">
              <strong>${resolvedCount}</strong> resolved
            </div>
          </div>

          <div style="font-size: 11px; color: #334155; margin-bottom: 4px; line-height: 1.4;">
            <strong>Top categories:</strong><br />
            ${topCategories || hotspot.categoryLabel}
          </div>

          <div style="font-size: 10px; font-family: monospace; color: #526581; background: #F8FAFC; border: 1px solid #E2E8F0; padding: 3px 6px; border-radius: 4px; margin-bottom: 6px;">
            Recent activity: Last 24 hours — <strong>${hotspot.currentWindowCount}</strong> reports (${hotspot.increaseRatio.toFixed(1)}× surge)
          </div>

          <button id="inspect-hotspot-dossier-${hotspot.id}" style="
            width: 100%;
            padding: 6px 8px;
            background: #1769D2;
            color: white;
            border: none;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s;
          ">
            View Complaints (${hotspot.complaintCount}) ➔
          </button>
        `;

        hotspotPopupContent
          .querySelector(`#inspect-hotspot-dossier-${hotspot.id}`)
          ?.addEventListener('click', (e) => {
            e.stopPropagation();
            onSelectHotspot?.(hotspot.id);
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

    // 6B. Render 3D Incident Clusters
    if (showIncidentClusters && viewMode !== 'heatmap') {
      const detectedIncidents = IncidentGroupingEngine.groupComplaintsIntoIncidents(validComplaints).filter(
        (inc: PotentialIncidentResult) => inc.classification !== 'noIncidentGroup'
      );

      detectedIncidents.forEach((incident: PotentialIncidentResult) => {
        const incEl = document.createElement('div');
        incEl.className = 'incident-cluster-marker-wrapper cursor-pointer';

        const isSelected = incident.incidentId === selectedIncidentId;
        const incColor = '#7C3AED';

        incEl.innerHTML = `
          <div style="position: relative; display: flex; align-items: center; justify-content: center; transform: translate(0, 0);">
            <div style="
              position: absolute;
              width: ${isSelected ? '72px' : '56px'};
              height: ${isSelected ? '72px' : '56px'};
              border-radius: 50%;
              background: ${incColor}${isSelected ? '30' : '15'};
              border: 1.5px solid ${incColor}${isSelected ? 'AA' : '60'};
              pointer-events: none;
            "></div>
            <div style="
              position: relative;
              z-index: ${isSelected ? '18' : '7'};
              padding: 2px 5px;
              border-radius: 10px;
              background: ${incColor};
              border: 1.5px solid #FFFFFF;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              color: #FFFFFF;
              font-size: 9px;
              font-weight: 700;
              font-family: monospace;
              display: flex;
              align-items: center;
              gap: 2px;
              white-space: nowrap;
            ">
              <span>⚡</span>
              <span>${incident.incidentId} (${incident.complaintCount})</span>
            </div>
          </div>
        `;

        incEl.addEventListener('click', (e) => {
          e.stopPropagation();
          onSelectIncident?.(incident.incidentId);
        });

        const incPopupContent = document.createElement('div');
        incPopupContent.style.fontFamily = 'Inter, sans-serif';
        incPopupContent.style.minWidth = '220px';
        incPopupContent.style.color = '#172B4D';

        incPopupContent.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span style="font-size: 10px; font-family: monospace; font-weight: bold; color: #7C3AED; padding: 1px 5px; border-radius: 4px; background: #F5F3FF; border: 1px solid #DDD6FE;">
              3D INCIDENT GROUP
            </span>
            <span style="font-size: 10px; font-family: monospace; font-weight: bold; color: #7C3AED;">
              ${incident.confidenceDisplay} Match
            </span>
          </div>
          <div style="font-size: 12px; font-weight: 700; color: #172B4D; margin-bottom: 2px;">
            ${incident.incidentLabel}
          </div>
          <div style="font-size: 11px; color: #526581; margin-bottom: 4px;">
            📂 ${incident.primaryCategoryLabel} · ${incident.complaintCount} linked complaints
          </div>
          <button id="inspect-incident-btn-${incident.incidentId}" style="
            width: 100%;
            margin-top: 4px;
            padding: 4px 6px;
            background: #7C3AED;
            color: white;
            border: none;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
            cursor: pointer;
          ">
            Inspect Incident Cluster ➔
          </button>
        `;

        incPopupContent
          .querySelector(`#inspect-incident-btn-${incident.incidentId}`)
          ?.addEventListener('click', (e) => {
            e.stopPropagation();
            onSelectIncident?.(incident.incidentId);
          });

        const incPopup = new maplibregl.Popup({ offset: 12, closeButton: true }).setDOMContent(
          incPopupContent
        );

        if (map.current) {
          const incMarker = new maplibregl.Marker({ element: incEl })
            .setLngLat([incident.centerLongitude, incident.centerLatitude])
            .setPopup(incPopup)
            .addTo(map.current);

          incidentMarkersRef.current[incident.incidentId] = incMarker;
        }
      });
    }

    // 6C. Render Individual Complaint Markers (Section 5, 7, 20)
    if (shouldShowMarkers) {
      validComplaints.forEach((c) => {
        const el = document.createElement('div');
        el.className = 'command-marker-wrapper cursor-pointer';

        const isSelected = selectedId === c.id;
        const isUrgent = c.priority === 'urgent';
        const isHigh = c.priority === 'high';
        const isMedium = c.priority === 'medium';
        const isProximityNear = proximityMemberIds.has(c.id) || c.isDuplicateCluster;
        const isHotspotMember = hotspotMemberIds.has(c.id) || (c.dbId && hotspotMemberIds.has(String(c.dbId)));

        const color = isUrgent
          ? '#D92D20'
          : isHigh
          ? '#EA580C'
          : isMedium
          ? '#D99A00'
          : '#1769D2';

        const prioritySymbol = isUrgent ? '!' : isHigh ? '▲' : isMedium ? '●' : '▼';

        el.innerHTML = `
          <div style="position: relative; display: flex; align-items: center; justify-content: center;">
            ${
              isHotspotMember
                ? `<div style="
                    position: absolute;
                    width: 38px;
                    height: 38px;
                    border-radius: 50%;
                    background: #EA580C30;
                    border: 2px solid #EA580C;
                    animation: pulse 2s infinite ease-in-out;
                  "></div>`
                : showProximityRings && isProximityNear
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
              width: ${isSelected ? '28px' : isHotspotMember ? '24px' : '22px'};
              height: ${isSelected ? '28px' : isHotspotMember ? '24px' : '22px'};
              border-radius: 50%;
              background: ${color};
              border: ${isSelected ? '2.5px solid #FEF08A' : isHotspotMember ? '2px solid #FED7AA' : '2px solid #FFFFFF'};
              box-shadow: 0 2px 8px rgba(0,0,0,0.25);
              display: flex;
              align-items: center;
              justify-content: center;
              color: #FFFFFF;
              font-size: 11px;
              font-weight: bold;
              font-family: monospace;
              transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            " title="${c.priority.toUpperCase()} - ${c.title}">
              ${prioritySymbol}
            </div>
          </div>
        `;

        el.addEventListener('click', () => {
          onSelectComplaint?.(c.id);
        });

        // Popup matching Section 5 & 20 specification (Non-PII, ID, Category, Priority, Status, Reported Date)
        const popupContent = document.createElement('div');
        popupContent.style.fontFamily = 'Inter, sans-serif';
        popupContent.style.minWidth = '230px';
        popupContent.style.color = '#172B4D';

        const statusConfig = COMPLAINT_STATUS_CONFIG[c.status] || {
          label: c.status,
          color: '#526581',
        };

        const reportedDateFormatted = c.createdAt
          ? new Date(c.createdAt).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })
          : 'Recent';

        const priorityLabel =
          c.priority === 'urgent'
            ? 'Critical'
            : c.priority === 'high'
            ? 'High'
            : c.priority === 'medium'
            ? 'Medium'
            : 'Low';

        popupContent.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span style="color: #1769D2; font-weight: bold; font-family: monospace; font-size: 12px;">#${escapeHtml(c.id)}</span>
            <span style="font-size: 10px; font-family: monospace; font-weight: bold; color: ${color}; padding: 1px 5px; border-radius: 4px; background: ${color}15; border: 1px solid ${color}40;">
              ${prioritySymbol} ${priorityLabel.toUpperCase()}
            </span>
          </div>

          <div style="font-size: 12px; font-weight: 700; color: #172B4D; line-height: 1.3; margin-bottom: 4px;">
            ${escapeHtml(c.title)}
          </div>

          <div style="font-size: 11px; color: #526581; margin-bottom: 2px;">
            📂 ${escapeHtml(c.categoryLabel || c.category)}
          </div>

          <div style="font-size: 11px; color: #526581; margin-bottom: 4px;">
            📍 ${escapeHtml(c.location.address || c.location.ward || 'Municipal Area')}
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 10px; font-family: monospace; color: #526581; background: #F8FAFC; border: 1px solid #E2E8F0; padding: 3px 5px; border-radius: 4px; margin-bottom: 6px;">
            <span>Reported: <strong>${escapeHtml(reportedDateFormatted)}</strong></span>
            <span style="font-weight: 600; color: ${statusConfig.color};">${escapeHtml(statusConfig.label)}</span>
          </div>

          <div style="font-size: 10px; font-family: monospace; color: #526581; display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span>SLA: <strong style="color: ${c.sla.isOverdue ? '#D92D20' : '#16803C'};">${c.sla.isOverdue ? 'OVERDUE' : `${c.sla.hoursRemaining}h remaining`}</strong></span>
            <span>GPS: ${c.location.latitude.toFixed(4)}, ${c.location.longitude.toFixed(4)}</span>
          </div>

          <button id="view-btn-${c.id}" style="
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
            View Complaint ➔
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
    }

    // 6D. Auto-fit bounds or flyTo selected
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
      if (organizationType === 'STATE') {
        map.current.fitBounds(
          [
            [72.3, 15.6],
            [81.1, 22.1],
          ],
          { padding: 35, maxZoom: 7.5 }
        );
      } else {
        const bounds = new maplibregl.LngLatBounds();
        validComplaints.forEach((c) => {
          bounds.extend([c.location.longitude, c.location.latitude]);
        });
        map.current.fitBounds(bounds, { padding: 60, maxZoom: 14 });
      }
      initialFitDone.current = true;
    }
  }, [
    complaints,
    selectedId,
    selectedHotspotId,
    selectedIncidentId,
    showProximityRings,
    showHotspots,
    showIncidentClusters,
    viewMode,
    hotspotConfig,
    onSelectComplaint,
    onSelectHotspot,
    onSelectIncident,
  ]);

  // Basemap switching handler
  const handleSelectBasemap = (style: BaseMapStyle) => {
    setActiveBasemap(style);
    if (!map.current) return;
    try {
      if (map.current.getLayer('basemap-raster-layer')) {
        map.current.removeLayer('basemap-raster-layer');
      }
      const firstDataLayer = map.current.getLayer('admin-boundaries-fill')
        ? 'admin-boundaries-fill'
        : map.current.getLayer('complaints-heatmap-layer')
        ? 'complaints-heatmap-layer'
        : undefined;

      map.current.addLayer(
        {
          id: 'basemap-raster-layer',
          type: 'raster',
          source: `basemap-source-${style}`,
          minzoom: 0,
          maxzoom: BASEMAPS[style].maxZoom,
        },
        firstDataLayer
      );
    } catch (err) {
      console.warn('Error switching basemap:', err);
    }
  };

  // Live Geolocation API Handler
  const handleFetchLiveLocation = () => {
    if (!('geolocation' in navigator)) {
      setGpsToast({
        message: 'Geolocation is not supported by your browser.',
        type: 'error',
      });
      return;
    }

    setIsLocating(true);
    setGpsToast({
      message: 'Acquiring high-accuracy live GPS coordinates...',
      type: 'info',
    });

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const { latitude, longitude, accuracy } = pos.coords;
        setLiveLocation({ lat: latitude, lng: longitude, accuracy });

        setGpsToast({
          message: `Live Location: ${latitude.toFixed(4)}°, ${longitude.toFixed(4)}° (±${Math.round(accuracy)}m)`,
          type: 'success',
        });

        setTimeout(() => {
          setGpsToast((curr) => (curr?.type === 'success' ? null : curr));
        }, 4500);

        if (map.current) {
          map.current.flyTo({
            center: [longitude, latitude],
            zoom: 15,
            speed: 1.5,
            curve: 1.4,
            essential: true,
          });

          if (liveGpsMarkerRef.current) {
            liveGpsMarkerRef.current.setLngLat([longitude, latitude]);
          } else {
            const el = document.createElement('div');
            el.className = 'live-gps-beacon-node';
            el.setAttribute('title', 'Your Live Location');
            el.innerHTML = `
              <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
                <div style="position: absolute; width: 34px; height: 34px; border-radius: 50%; background: rgba(37, 99, 235, 0.28); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
                <div style="position: absolute; width: 20px; height: 20px; border-radius: 50%; background: rgba(59, 130, 246, 0.35); border: 1.5px solid rgba(255, 255, 255, 0.9);"></div>
                <div style="position: relative; width: 11px; height: 11px; border-radius: 50%; background: #2563EB; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4);"></div>
              </div>
            `;

            const popup = new maplibregl.Popup({ offset: 16 }).setHTML(`
              <div style="font-family: system-ui, -apple-system, sans-serif; padding: 4px; min-width: 140px; color: #1E293B;">
                <div style="display: flex; align-items: center; gap: 4px; font-weight: 700; color: #1D4ED8; font-size: 11px;">
                  <span>🎯</span> Live GPS Location
                </div>
                <div style="font-size: 10px; color: #475569; margin-top: 2px; font-family: monospace;">
                  ${latitude.toFixed(5)}°, ${longitude.toFixed(5)}°
                </div>
                <div style="font-size: 9px; color: #16A34A; font-weight: 600; margin-top: 2px;">
                  GPS Accuracy: ±${Math.round(accuracy)}m
                </div>
              </div>
            `);

            const marker = new maplibregl.Marker({ element: el })
              .setLngLat([longitude, latitude])
              .setPopup(popup)
              .addTo(map.current);

            liveGpsMarkerRef.current = marker;
          }
        }
      },
      (err) => {
        setIsLocating(false);
        let errMsg = 'Failed to fetch live GPS location.';
        if (err.code === 1) {
          errMsg = 'Location permission was denied. Please allow location access in your browser.';
        } else if (err.code === 2) {
          errMsg = 'Position unavailable. Check device GPS or network.';
        } else if (err.code === 3) {
          errMsg = 'Location request timed out. Please try again.';
        }
        setGpsToast({
          message: errMsg,
          type: 'error',
        });
        setTimeout(() => {
          setGpsToast((curr) => (curr?.type === 'error' ? null : curr));
        }, 5000);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 30000,
      }
    );
  };

  // Macro World / Subcontinent View
  const handleZoomToWorld = () => {
    if (!map.current) return;
    map.current.flyTo({
      center: [78.9629, 20.5937],
      zoom: 3.8,
      speed: 1.2,
      curve: 1.4,
      essential: true,
    });
  };

  // State View
  const handleZoomToState = () => {
    if (!map.current) return;
    map.current.fitBounds(
      [
        [72.5, 15.6],
        [81.0, 22.0],
      ],
      { padding: 35, duration: 1000 }
    );
  };

  // District / Corporation HQ View
  const handleZoomToHQ = () => {
    if (!map.current) return;
    const target = orgCenter ?? DEFAULT_MAP_CENTER;
    map.current.flyTo({
      center: [target.lng, target.lat],
      zoom: target.zoom ?? 12,
      speed: 1.2,
      essential: true,
    });
  };

  // Fit all complaints on screen
  const handleFitAll = () => {
    if (!map.current) return;
    const validComplaints = complaints.filter((c) => hasValidCoordinates(c));
    if (validComplaints.length > 0) {
      const bounds = new maplibregl.LngLatBounds();
      validComplaints.forEach((c) => {
        bounds.extend([c.location.longitude, c.location.latitude]);
      });
      map.current.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 800 });
    } else if (organizationType === 'STATE') {
      handleZoomToState();
    } else {
      handleZoomToHQ();
    }
  };

  return (
    <div className="relative w-full h-full min-h-[300px] rounded-lg overflow-hidden border border-[#D9E2EC] bg-[#eef4f8] shadow-sm select-none">
      <div ref={mapContainer} className="w-full h-full" />

      {/* Top Left: Basemap Switcher Pill */}
      <div className="absolute top-2.5 left-2.5 z-10 flex items-center bg-white/95 backdrop-blur-md rounded-lg p-0.5 border border-slate-200/90 shadow-md">
        {(Object.keys(BASEMAPS) as BaseMapStyle[]).map((key) => {
          const b = BASEMAPS[key];
          const isActive = activeBasemap === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => handleSelectBasemap(key)}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold transition-all ${
                isActive
                  ? 'bg-[#1769D2] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title={`Switch to ${b.name}`}
            >
              <span>{b.icon}</span>
              <span className="hidden sm:inline">{b.name}</span>
            </button>
          );
        })}
      </div>

      {/* Top Right: Quick Views & Live Location (Positioned to the left of MapLibre Navigation Control) */}
      <div className="absolute top-2.5 right-12 z-10 flex items-center gap-1 bg-white/95 backdrop-blur-md rounded-lg p-0.5 border border-slate-200/90 shadow-md">
        {/* Live GPS Locate Me Button */}
        <button
          type="button"
          onClick={handleFetchLiveLocation}
          disabled={isLocating}
          className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold transition-all ${
            liveLocation
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
          }`}
          title="Fetch Live GPS Location using Geolocation API"
        >
          {isLocating ? (
            <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
          ) : (
            <Crosshair className={`w-3 h-3 ${liveLocation ? 'text-white' : 'text-blue-600'}`} />
          )}
          <span className="font-semibold">{isLocating ? 'Locating...' : liveLocation ? 'Live GPS' : 'Locate Me'}</span>
        </button>

        {/* World / India Macro View */}
        <button
          type="button"
          onClick={handleZoomToWorld}
          className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          title="Macro World & India View"
        >
          <Globe className="w-3 h-3 text-indigo-600" />
          <span className="hidden sm:inline">World</span>
        </button>

        {/* Maharashtra State View */}
        <button
          type="button"
          onClick={handleZoomToState}
          className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          title="Zoom to Maharashtra State View"
        >
          <Navigation className="w-3 h-3 text-amber-600" />
          <span className="hidden sm:inline">State</span>
        </button>

        {/* District / Corporation HQ View */}
        <button
          type="button"
          onClick={handleZoomToHQ}
          className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          title="Center on District / Municipal HQ"
        >
          <Compass className="w-3 h-3 text-[#1769D2]" />
          <span className="hidden sm:inline">HQ</span>
        </button>

        {/* Fit All Incidents */}
        <button
          type="button"
          onClick={handleFitAll}
          className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          title="Fit all complaints on screen"
        >
          <Layers className="w-3 h-3 text-slate-600" />
          <span className="hidden sm:inline">Fit All</span>
        </button>
      </div>

      {/* Top Center: GPS Toast Notification Banner */}
      {gpsToast && (
        <div
          className={`absolute top-12 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-medium shadow-lg backdrop-blur-md transition-all ${
            gpsToast.type === 'success'
              ? 'bg-emerald-900/90 text-emerald-100 border border-emerald-500/50'
              : gpsToast.type === 'error'
              ? 'bg-rose-900/90 text-rose-100 border border-rose-500/50'
              : 'bg-slate-900/90 text-blue-100 border border-blue-500/50'
          }`}
        >
          {gpsToast.type === 'success' ? (
            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          ) : gpsToast.type === 'error' ? (
            <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          ) : (
            <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin shrink-0" />
          )}
          <span className="truncate max-w-[280px] sm:max-w-md">{gpsToast.message}</span>
          <button
            type="button"
            onClick={() => setGpsToast(null)}
            className="ml-1 text-white/60 hover:text-white"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Accessible Collapsible Map Legend (Section 15) */}
      <div
        className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md rounded-xl border border-[#D9E2EC] shadow-md z-10 text-[#172B4D] max-w-[280px] transition-all overflow-hidden"
        role="region"
        aria-label="Map Legend and GIS Telemetry"
      >
        <button
          type="button"
          onClick={() => setLegendCollapsed(!legendCollapsed)}
          className="w-full p-2.5 flex items-center justify-between gap-2 bg-slate-50/80 hover:bg-slate-100 text-left border-b border-[#E8EEF5] transition-colors"
          aria-expanded={!legendCollapsed}
        >
          <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-700">
            <Layers className="w-3 h-3 text-[#1769D2]" />
            <span>Map Legend & Layers</span>
          </div>
          {legendCollapsed ? (
            <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
          )}
        </button>

        {!legendCollapsed && (
          <div className="p-2.5 space-y-2 text-[10px]">
            {/* Priority Non-Color Indicators */}
            <div>
              <div className="text-[9px] font-mono uppercase text-slate-500 font-semibold mb-1">
                Priority Matrix (Shapes & Colors)
              </div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-[#D92D20] text-white flex items-center justify-center font-mono font-bold text-[8px] shrink-0">
                    !
                  </span>
                  <span className="truncate">Critical / Urgent</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-[#EA580C] text-white flex items-center justify-center font-mono font-bold text-[8px] shrink-0">
                    ▲
                  </span>
                  <span className="truncate">High Priority</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-[#D99A00] text-white flex items-center justify-center font-mono font-bold text-[8px] shrink-0">
                    ●
                  </span>
                  <span className="truncate">Medium Priority</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-[#1769D2] text-white flex items-center justify-center font-mono font-bold text-[8px] shrink-0">
                    ▼
                  </span>
                  <span className="truncate">Low Priority</span>
                </div>
              </div>
            </div>

            {/* Heatmap Density Ramp */}
            {showHeatmap && (
              <div className="pt-1.5 border-t border-[#E8EEF5]">
                <div className="text-[9px] font-mono uppercase text-slate-500 font-semibold mb-1 flex items-center justify-between">
                  <span>Heatmap Density</span>
                  <span className="text-[8px] text-slate-400">Low → High</span>
                </div>
                <div className="h-2 rounded-full w-full bg-gradient-to-r from-blue-300 via-yellow-300 via-orange-400 to-red-600 shadow-inner" />
              </div>
            )}

            {/* Clusters & Administrative Boundaries */}
            <div className="pt-1.5 border-t border-[#E8EEF5] space-y-1">
              <div className="flex items-center gap-1.5 text-amber-900 font-medium">
                <span className="w-3 h-3 rounded-full border border-dashed border-[#EA580C] bg-orange-500/20 flex items-center justify-center text-[8px] shrink-0">
                  🔥
                </span>
                <span>Civic Hotspot Cluster</span>
              </div>
              {showIncidentClusters && (
                <div className="flex items-center gap-1.5 text-purple-900 font-medium">
                  <span className="w-3 h-3 rounded-full border border-purple-500 bg-purple-500/20 flex items-center justify-center text-[8px] shrink-0">
                    ⚡
                  </span>
                  <span>3D Common Incident</span>
                </div>
              )}
              {showBoundaries && (
                <div className="flex items-center gap-1.5 text-blue-900 font-medium">
                  <span className="w-3 h-1.5 border border-dashed border-[#1769D2] bg-blue-500/10 shrink-0" />
                  <span>Administrative Boundary</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Right: Live Cursor Coordinate & Zoom Telemetry HUD */}
      <div className="absolute bottom-2 right-12 z-10 hidden sm:flex items-center gap-2 bg-slate-900/85 backdrop-blur-md text-white font-mono text-[9px] px-2.5 py-1 rounded-md border border-slate-700/60 shadow-sm pointer-events-none">
        {cursorCoords ? (
          <>
            <span className="text-slate-400">Lat:</span>
            <span className="text-emerald-400 font-semibold">{cursorCoords.lat.toFixed(4)}°</span>
            <span className="text-slate-400">Lng:</span>
            <span className="text-emerald-400 font-semibold">{cursorCoords.lng.toFixed(4)}°</span>
          </>
        ) : (
          <span className="text-slate-400">Coordinates HUD</span>
        )}
        <span className="text-slate-600">|</span>
        <span className="text-slate-400">Zoom:</span>
        <span className="text-blue-300 font-semibold">{currentZoom.toFixed(1)}</span>
      </div>
    </div>
  );
};
