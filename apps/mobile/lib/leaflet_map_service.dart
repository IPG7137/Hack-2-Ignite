class LeafletMapService {
  static String getEnhancedMapHTML({
    required double latitude,
    required double longitude,
    double zoom = 15.0,
    List<Map<String, dynamic>> reports = const [],
    String? reportsGeoJson,
    String? hotspotsGeoJson,
    String? incidentsGeoJson,
    bool showTraffic = false,
    bool showSatellite = false,
  }) {
    String reportsJson = reportsGeoJson != null && reportsGeoJson.isNotEmpty
        ? reportsGeoJson
        : _convertReportsToJson(reports);
    String rawHotspotsJson = hotspotsGeoJson ?? '{"type":"FeatureCollection","features":[]}';
    String rawIncidentsJson = incidentsGeoJson ?? '{"type":"FeatureCollection","features":[]}';
    
    return '''
<!DOCTYPE html>
<html>
<head>
    <title>Enhanced Civic Map</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    
    <!-- Leaflet CSS -->
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossorigin=""/>
    
    <!-- Leaflet JavaScript -->
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
            integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
            crossorigin=""></script>
    
    <!-- Leaflet Control Search -->
    <script src="https://unpkg.com/leaflet-search@3.0.9/dist/leaflet-search.min.js"></script>
    <link rel="stylesheet" href="https://unpkg.com/leaflet-search@3.0.9/dist/leaflet-search.min.css">
    
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #f8fafc;
        }
        
        #map {
            height: 100vh;
            width: 100%;
            border-radius: 0;
        }
        
        /* Enhanced Control Panel */
        .control-panel {
            position: absolute;
            top: 15px;
            right: 15px;
            z-index: 1000;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        
        .control-group {
            background: white;
            border-radius: 12px;
            padding: 8px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.15);
            border: 1px solid rgba(0,0,0,0.1);
        }
        
        .control-button {
            border: none;
            border-radius: 8px;
            padding: 12px;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            background: white;
            display: flex;
            align-items: center;
            justify-content: center;
            min-width: 44px;
            min-height: 44px;
            margin: 2px;
        }
        
        .control-button:hover {
            background: #f1f5f9;
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }
        
        .control-button:active {
            transform: translateY(0);
        }
        
        .control-button.active {
            background: #3b82f6;
            color: white;
        }
        
        .control-button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }
        
        .control-button svg {
            width: 22px;
            height: 22px;
            stroke: currentColor;
            fill: none;
        }
        
        .loading {
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        
        /* Search Control Styling */
        .leaflet-control-search {
            background: white !important;
            border-radius: 12px !important;
            box-shadow: 0 4px 16px rgba(0,0,0,0.15) !important;
            border: 1px solid rgba(0,0,0,0.1) !important;
        }
        
        .leaflet-control-search input {
            border-radius: 8px !important;
            border: none !important;
            padding: 12px 16px !important;
            font-size: 14px !important;
            background: #f8fafc !important;
        }
        
        .leaflet-control-search input:focus {
            background: white !important;
            box-shadow: 0 0 0 2px #3b82f6 !important;
        }
        
        /* Enhanced Popup Styling */
        .custom-popup {
            font-family: 'Segoe UI', sans-serif;
            border-radius: 12px;
            overflow: hidden;
        }
        
        .popup-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 16px;
            margin: -20px -20px 16px -20px;
        }
        
        .popup-title {
            font-weight: 600;
            font-size: 16px;
            margin-bottom: 4px;
        }
        
        .popup-category {
            font-size: 12px;
            opacity: 0.9;
            background: rgba(255,255,255,0.2);
            padding: 4px 8px;
            border-radius: 6px;
            display: inline-block;
        }
        
        .coord-display {
            background: #f8fafc;
            padding: 12px;
            border-radius: 8px;
            border-left: 4px solid #3b82f6;
            margin: 12px 0;
        }
        
        .coord-label {
            font-weight: 600;
            color: #475569;
            font-size: 12px;
            margin-bottom: 4px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .coord-value {
            font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
            color: #3b82f6;
            font-size: 14px;
            font-weight: 500;
        }
        
        .priority-badge {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin: 8px 0;
            display: inline-block;
        }
        
        .priority-high { background: #fee2e2; color: #dc2626; }
        .priority-medium { background: #fef3c7; color: #d97706; }
        .priority-low { background: #d1fae5; color: #059669; }
        
        .report-description {
            color: #64748b;
            font-size: 14px;
            line-height: 1.5;
            margin: 8px 0;
        }
        
        .report-time {
            color: #94a3b8;
            font-size: 12px;
            font-style: italic;
        }
        
        /* Legend */
        .map-legend {
            position: absolute;
            bottom: 20px;
            left: 20px;
            background: white;
            padding: 16px;
            border-radius: 12px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.15);
            border: 1px solid rgba(0,0,0,0.1);
            z-index: 1000;
            min-width: 200px;
        }
        
        .legend-title {
            font-weight: 600;
            margin-bottom: 12px;
            color: #1e293b;
            font-size: 14px;
        }
        
        .legend-item {
            display: flex;
            align-items: center;
            margin-bottom: 8px;
            font-size: 13px;
        }
        
        .legend-color {
            width: 16px;
            height: 16px;
            border-radius: 50%;
            margin-right: 10px;
            border: 2px solid white;
            box-shadow: 0 0 0 1px rgba(0,0,0,0.2);
        }
        
        /* Responsive adjustments */
        @media (max-width: 768px) {
            .control-panel {
                top: 10px;
                right: 10px;
            }
            
            .map-legend {
                bottom: 10px;
                left: 10px;
                padding: 12px;
                min-width: 150px;
            }
            
            .control-button {
                padding: 10px;
                min-width: 40px;
                min-height: 40px;
            }
        }
        
        /* Cluster styling */
        .marker-cluster {
            background: rgba(59, 130, 246, 0.8);
            border-radius: 50%;
            color: white;
            font-weight: bold;
            text-align: center;
            border: 3px solid rgba(255, 255, 255, 0.8);
        }
        
        .marker-cluster-small {
            width: 40px;
            height: 40px;
            line-height: 34px;
            font-size: 12px;
        }
        
        .marker-cluster-medium {
            width: 50px;
            height: 50px;
            line-height: 44px;
            font-size: 14px;
        }
        
        .marker-cluster-large {
            width: 60px;
            height: 60px;
            line-height: 54px;
            font-size: 16px;
        }
    </style>
    </style>
</head>
<body>
    <!-- Enhanced Control Panel -->
    <div class="control-panel">
        <!-- Location and View Controls -->
        <div class="control-group">
            <button id="locationBtn" class="control-button" title="Get Current Location">
                <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                </svg>
            </button>
            
            <button id="satelliteBtn" class="control-button" title="Toggle Satellite View">
                <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1"></path>
                </svg>
            </button>
            
            <button id="fullscreenBtn" class="control-button" title="Toggle Fullscreen">
                <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
                </svg>
            </button>
        </div>
        
        <!-- Layer Controls -->
        <div class="control-group">
            <button id="reportsBtn" class="control-button active" title="Show Reports">
                <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14,2 14,8 20,8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10,9 9,9 8,9"></polyline>
                </svg>
            </button>
            
            <button id="heatmapBtn" class="control-button" title="Show Heatmap">
                <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M2 17h20l-10-15z"></path>
                    <path d="M6 17h12l-6-9z"></path>
                    <path d="M10 17h4l-2-3z"></path>
                </svg>
            </button>
            
            <button id="routingBtn" class="control-button" title="Get Directions">
                <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="9,11 12,14 20,6"></polyline>
                    <path d="M21 3L10 14L7 11"></path>
                </svg>
            </button>
        </div>
        
        <!-- Utility Controls -->
        <div class="control-group">
            <button id="searchBtn" class="control-button" title="Search Location">
                <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.35-4.35"></path>
                </svg>
            </button>
            
            <button id="measureBtn" class="control-button" title="Measure Distance">
                <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M9 11H1l8-8 8 8"></path>
                    <path d="M9 11v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V11"></path>
                </svg>
            </button>
            
            <button id="shareBtn" class="control-button" title="Share Location">
                <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                    <polyline points="16,6 12,2 8,6"></polyline>
                    <line x1="12" y1="2" x2="12" y2="15"></line>
                </svg>
            </button>
        </div>
    </div>
    
    <!-- Map Container -->
    <div id="map"></div>
    
    <!-- Enhanced Legend -->
    <div class="map-legend" id="mapLegend">
        <div class="legend-title">🗺️ Map Legend</div>
        <div class="legend-item">
            <div class="legend-color" style="background: #ef4444;"></div>
            <span>High Priority Reports</span>
        </div>
        <div class="legend-item">
            <div class="legend-color" style="background: #f59e0b;"></div>
            <span>Medium Priority Reports</span>
        </div>
        <div class="legend-item">
            <div class="legend-color" style="background: #10b981;"></div>
            <span>Low Priority Reports</span>
        </div>
        <div class="legend-item">
            <div class="legend-color" style="background: #3b82f6;"></div>
            <span>Your Location</span>
        </div>
    </div>

    <script>
        // Initialize enhanced map
        var map = L.map('map').setView([$latitude, $longitude], $zoom);
             // Layer groups
        var baseLayers = {};
        var overlayLayers = {};
        var reportsLayer = L.layerGroup().addTo(map);
        var hotspotsLayer = L.layerGroup().addTo(map);
        var userMarkersLayer = L.layerGroup().addTo(map);
        
        // Base layers
        var osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors'
        });
        
        var satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 19,
            attribution: '© Esri'
        });
        
        // Add default layer
        osmLayer.addTo(map);
        baseLayers['Streets'] = osmLayer;
        baseLayers['Satellite'] = satelliteLayer;
        
        // Enhanced current location marker
        var currentLocationMarker = L.circleMarker([$latitude, $longitude], {
            radius: 12,
            fillColor: '#3b82f6',
            color: '#ffffff',
            weight: 3,
            opacity: 1,
            fillOpacity: 0.8
        }).addTo(userMarkersLayer);
        
        // Add pulsing animation to current location
        var pulsingIcon = L.divIcon({
            className: 'pulsing-icon',
            iconSize: [20, 20],
            html: '<div style="width: 20px; height: 20px; background: #3b82f6; border-radius: 50%; animation: pulse 2s infinite; box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);"></div><style>@keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); } 70% { box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); } 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); } }</style>'
        });
        
        var userLocationMarker = L.marker([$latitude, $longitude], {
            icon: pulsingIcon,
            draggable: true
        }).addTo(userMarkersLayer);
        
        // Reports and Hotspots data
        var reportsData = $reportsJson;
        var hotspotsData = $rawHotspotsJson;
        var incidentsData = $rawIncidentsJson;
        
        // Create custom icons for different priorities
        function createReportIcon(priority, category, status) {
            var color = '#10b981'; // Default green (low)
            var p = (priority || '').toLowerCase();
            var s = (status || '').toLowerCase();
            
            if (s === 'resolved') {
                color = '#059669';
            } else if (p === 'high' || p === 'critical' || p === 'urgent') {
                color = '#ef4444';
            } else if (p === 'medium') {
                color = '#f59e0b';
            } else if (p === 'low') {
                color = '#3b82f6';
            }
            
            var initial = (category ? category.charAt(0) : '!').toUpperCase();
            return L.divIcon({
                className: 'custom-report-icon',
                html: '<div style="background: ' + color + '; width: 28px; height: 28px; border-radius: 50%; border: 2.5px solid white; box-shadow: 0 3px 10px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 11px;">' + initial + '</div>',
                iconSize: [28, 28],
                iconAnchor: [14, 14]
            });
        }
        
        // Add reports to map (supports array or GeoJSON FeatureCollection)
        function addReportsToMap() {
            reportsLayer.clearLayers();
            
            var items = [];
            if (reportsData && reportsData.type === 'FeatureCollection' && Array.isArray(reportsData.features)) {
                items = reportsData.features.map(function(f) {
                    var p = f.properties || {};
                    var coords = (f.geometry && f.geometry.coordinates) || [0, 0];
                    return {
                        id: f.id || p.reportId,
                        title: p.title,
                        description: p.description,
                        category: p.categoryDisplayName || p.category,
                        priority: p.priorityDisplay || p.priority,
                        status: p.status,
                        latitude: coords[1],
                        longitude: coords[0],
                        location: p.location,
                        reportedTime: p.submittedTime,
                        is_duplicate: p.isPotentialDuplicate
                    };
                });
            } else if (Array.isArray(reportsData)) {
                items = reportsData;
            }
            
            items.forEach(function(report) {
                if (report.latitude && report.longitude) {
                    var marker = L.marker([report.latitude, report.longitude], {
                        icon: createReportIcon(report.priority, report.category, report.status)
                    });
                    
                    marker.on('click', function() {
                        if (window.onReportSelected) {
                            window.onReportSelected.postMessage(report.id.toString());
                        }
                    });

                    var popupContent = formatReportPopup(report);
                    marker.bindPopup(popupContent, {
                        maxWidth: 300,
                        className: 'custom-popup'
                    });
                    
                    reportsLayer.addLayer(marker);
                }
            });
        }

        // Add emerging problem hotspots to map (GeoJSON Polygon/Circle buffers)
        function addHotspotsToMap() {
            hotspotsLayer.clearLayers();
            if (!hotspotsData || !hotspotsData.features || hotspotsData.features.length === 0) return;

            hotspotsData.features.forEach(function(feature) {
                var props = feature.properties || {};
                var isSevere = props.isSevere === true;
                var strokeColor = isSevere ? '#dc2626' : '#ea580c';
                var fillColor = isSevere ? '#fecaca' : '#fed7aa';

                if (feature.geometry && feature.geometry.type === 'Polygon') {
                    var polyCoords = feature.geometry.coordinates[0].map(function(c) {
                        return [c[1], c[0]]; // Convert GeoJSON [lng, lat] to Leaflet [lat, lng]
                    });

                    var polygon = L.polygon(polyCoords, {
                        color: strokeColor,
                        weight: 2,
                        opacity: 0.85,
                        dashArray: '4, 6',
                        fillColor: fillColor,
                        fillOpacity: 0.25
                    });

                    var popup = '<div style="font-family: sans-serif; padding: 4px;">' +
                        '<div style="font-weight: bold; color: ' + strokeColor + '; font-size: 13px;">🚨 ' + (props.classificationLabel || 'Emerging Problem Area') + '</div>' +
                        '<div style="font-size: 12px; color: #334155; margin-top: 4px;">Category: <b>' + (props.category || 'Civic Issue') + '</b></div>' +
                        '<div style="font-size: 11px; color: #64748b; margin-top: 2px;">Activity: <b>' + (props.surgeDisplay || (props.complaintCount + ' reports')) + '</b></div>' +
                        '</div>';

                    polygon.bindPopup(popup);
                    hotspotsLayer.addLayer(polygon);
                }
            });
        }
        
        // Format report popup
        function formatReportPopup(report) {
            var priorityClass = 'priority-' + (report.priority || 'medium').toLowerCase();
            
            return '<div class="custom-popup">' +
                '<div class="popup-header">' +
                    '<div class="popup-title">' + (report.title || 'Report') + '</div>' +
                    '<div class="popup-category">' + (report.category || 'General') + '</div>' +
                '</div>' +
                '<div class="report-description">' + (report.description || 'No description available') + '</div>' +
                '<div class="priority-badge ' + priorityClass + '">' + (report.priority || 'Medium') + ' Priority</div>' +
                '<div class="coord-display">' +
                    '<div class="coord-label">Location</div>' +
                    '<div class="coord-value">' + (typeof report.latitude === 'number' ? report.latitude.toFixed(6) : report.latitude) + ', ' + (typeof report.longitude === 'number' ? report.longitude.toFixed(6) : report.longitude) + '</div>' +
                '</div>' +
                '<div class="report-time">📅 ' + (report.reportedTime || 'Recently reported') + '</div>' +
            '</div>';
        }
        
        // Initialize layers
        addReportsToMap();
        addHotspotsToMap();tsToMap();
        
        // Control button handlers
        var locationBtn = document.getElementById('locationBtn');
        var satelliteBtn = document.getElementById('satelliteBtn');
        var fullscreenBtn = document.getElementById('fullscreenBtn');
        var reportsBtn = document.getElementById('reportsBtn');
        var heatmapBtn = document.getElementById('heatmapBtn');
        var routingBtn = document.getElementById('routingBtn');
        var searchBtn = document.getElementById('searchBtn');
        var measureBtn = document.getElementById('measureBtn');
        var shareBtn = document.getElementById('shareBtn');
        
        var isGettingLocation = false;
        var isSatelliteView = false;
        var showReports = true;
        var showHeatmap = false;
        var measureMode = false;
        var measurePolyline = null;
        var measurePoints = [];
        
        // Location button
        locationBtn.addEventListener('click', function() {
            if (isGettingLocation) return;
            if (window.requestLocation) {
                window.requestLocation.postMessage('getLocation');
            }
        });
        
        // Satellite toggle
        satelliteBtn.addEventListener('click', function() {
            isSatelliteView = !isSatelliteView;
            satelliteBtn.classList.toggle('active', isSatelliteView);
            
            if (isSatelliteView) {
                map.removeLayer(osmLayer);
                map.addLayer(satelliteLayer);
            } else {
                map.removeLayer(satelliteLayer);
                map.addLayer(osmLayer);
            }
        });
        
        // Fullscreen toggle
        fullscreenBtn.addEventListener('click', function() {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
            } else {
                document.exitFullscreen();
            }
        });
        
        // Reports toggle
        reportsBtn.addEventListener('click', function() {
            showReports = !showReports;
            reportsBtn.classList.toggle('active', showReports);
            
            if (showReports) {
                map.addLayer(reportsLayer);
            } else {
                map.removeLayer(reportsLayer);
            }
        });
        
        // Measure distance
        measureBtn.addEventListener('click', function() {
            measureMode = !measureMode;
            measureBtn.classList.toggle('active', measureMode);
            
            if (measureMode) {
                map.getContainer().style.cursor = 'crosshair';
                if (measurePolyline) {
                    map.removeLayer(measurePolyline);
                }
                measurePoints = [];
            } else {
                map.getContainer().style.cursor = '';
                if (measurePolyline) {
                    map.removeLayer(measurePolyline);
                    measurePolyline = null;
                }
                measurePoints = [];
            }
        });
        
        // Handle map click: measuring distance OR selecting complaint location
        map.on('click', function(e) {
            if (measureMode) {
                measurePoints.push(e.latlng);
                
                if (measurePoints.length > 1) {
                    if (measurePolyline) {
                        map.removeLayer(measurePolyline);
                    }
                    
                    measurePolyline = L.polyline(measurePoints, {
                        color: '#3b82f6',
                        weight: 3,
                        opacity: 0.8,
                        dashArray: '10, 10'
                    }).addTo(map);
                    
                    var totalDistance = 0;
                    for (var i = 1; i < measurePoints.length; i++) {
                        totalDistance += measurePoints[i-1].distanceTo(measurePoints[i]);
                    }
                    
                    var distanceText = totalDistance > 1000 ? 
                        (totalDistance / 1000).toFixed(2) + ' km' : 
                        totalDistance.toFixed(0) + ' m';
                    
                    L.popup()
                        .setLatLng(e.latlng)
                        .setContent('<div style="text-align: center; font-weight: bold; color: #3b82f6;">📏 Distance: ' + distanceText + '</div>')
                        .openOn(map);
                }
            } else {
                // Pinpoint and move location marker to clicked point
                var lat = e.latlng.lat;
                var lng = e.latlng.lng;
                userLocationMarker.setLatLng([lat, lng]);
                currentLocationMarker.setLatLng([lat, lng]);
                userLocationMarker.setPopupContent(formatCoordinates(lat, lng));
                
                if (window.onLocationChanged) {
                    window.onLocationChanged.postMessage('latitude:' + lat + ',longitude:' + lng);
                }
            }
        });
        
        // Share location
        shareBtn.addEventListener('click', function() {
            var center = map.getCenter();
            var zoom = map.getZoom();
            var url = window.location.href + '?lat=' + center.lat.toFixed(6) + '&lng=' + center.lng.toFixed(6) + '&zoom=' + zoom;
            
            if (navigator.share) {
                navigator.share({
                    title: 'Civic Resolve - Location',
                    text: 'Check out this location on Civic Resolve',
                    url: url
                });
            } else if (navigator.clipboard) {
                navigator.clipboard.writeText(url).then(function() {
                    L.popup()
                        .setLatLng(center)
                        .setContent('<div style="text-align: center; color: #10b981;">📋 Location link copied to clipboard!</div>')
                        .openOn(map);
                });
            }
        });
        
        // User marker drag handler
        userLocationMarker.on('dragend', function(e) {
            var position = userLocationMarker.getLatLng();
            currentLocationMarker.setLatLng(position);
            
            var popupContent = formatCoordinates(position.lat, position.lng);
            userLocationMarker.bindPopup(popupContent).openPopup();
            
            // Send coordinates to Flutter
            if (window.onLocationChanged) {
                window.onLocationChanged.postMessage('latitude:' + position.lat + ',longitude:' + position.lng);
            }
        });
        
        // Format coordinates for popup
        function formatCoordinates(lat, lng) {
            return '<div class="custom-popup">' +
                '<div class="popup-header">' +
                    '<div class="popup-title">📍 Your Location</div>' +
                    '<div class="popup-category">Current Position</div>' +
                '</div>' +
                '<div class="coord-display">' +
                    '<div class="coord-label">Latitude</div>' +
                    '<div class="coord-value">' + lat.toFixed(6) + '</div>' +
                '</div>' +
                '<div class="coord-display">' +
                    '<div class="coord-label">Longitude</div>' +
                    '<div class="coord-value">' + lng.toFixed(6) + '</div>' +
                '</div>' +
            '</div>';
        }
        
        // Initial popup
        userLocationMarker.bindPopup(formatCoordinates($latitude, $longitude));
        
        // Update location function
        function updateLocation(lat, lng) {
            userLocationMarker.setLatLng([lat, lng]);
            currentLocationMarker.setLatLng([lat, lng]);
            map.setView([lat, lng], Math.max(map.getZoom(), 16));
            userLocationMarker.setPopupContent(formatCoordinates(lat, lng));
            userLocationMarker.openPopup();
        }
        
        // Loading state function
        function setLocationLoading(loading) {
            isGettingLocation = loading;
            locationBtn.disabled = loading;
            if (loading) {
                locationBtn.innerHTML = '<svg class="loading" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle></svg>';
            } else {
                locationBtn.innerHTML = '<svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>';
            }
        }
        
        // Add new report function
        function addReport(report) {
            reportsData.push(report);
            addReportsToMap();
        }
        
        // Filter reports function
        function filterReports(category) {
            reportsLayer.clearLayers();
            var filteredReports = category === 'All' ? reportsData : reportsData.filter(r => r.category === category);
            
            filteredReports.forEach(function(report) {
                if (report.latitude && report.longitude) {
                    var marker = L.marker([report.latitude, report.longitude], {
                        icon: createReportIcon(report.priority, report.category, report.status)
                    });
                    
                    marker.on('click', function() {
                        if (window.onReportSelected) {
                            window.onReportSelected.postMessage(report.id.toString());
                        }
                    });

                    var popupContent = formatReportPopup(report);
                    marker.bindPopup(popupContent, {
                        maxWidth: 300,
                        className: 'custom-popup'
                    });
                    
                    reportsLayer.addLayer(marker);
                }
            });
        }
        
        // Center on coordinates helper
        function centerOnCoordinates(lat, lng, zoom) {
            map.setView([lat, lng], zoom || 16);
        }

        // Dynamic real-time update function
        function updateMapLayers(newReportsData, newHotspotsData) {
            if (newReportsData !== undefined && newReportsData !== null) {
                reportsData = typeof newReportsData === 'string' ? JSON.parse(newReportsData) : newReportsData;
                addReportsToMap();
            }
            if (newHotspotsData !== undefined && newHotspotsData !== null) {
                hotspotsData = typeof newHotspotsData === 'string' ? JSON.parse(newHotspotsData) : newHotspotsData;
                addHotspotsToMap();
            }
        }

        // Make functions globally available
        window.updateLocation = updateLocation;
        window.setLocationLoading = setLocationLoading;
        window.addReport = addReport;
        window.filterReports = filterReports;
        window.centerOnCoordinates = centerOnCoordinates;
        window.updateMapLayers = updateMapLayers;
        
        // Map event handlers
        map.on('zoom', function() {
            var zoom = map.getZoom();
            if (zoom > 15) {
                document.getElementById('mapLegend').style.display = 'block';
            } else {
                document.getElementById('mapLegend').style.display = 'none';
            }
        });
        
        // Initialize with reports if provided
        if (reportsData.length > 0) {
            addReportsToMap();
        }
    </script>
</body>
</html>
    ''';
  }
  
  // Helper function to convert reports to JSON
  static String _convertReportsToJson(List<Map<String, dynamic>> reports) {
    if (reports.isEmpty) return '[]';
    
    StringBuffer buffer = StringBuffer('[');
    for (int i = 0; i < reports.length; i++) {
      if (i > 0) buffer.write(',');
      
      Map<String, dynamic> report = reports[i];
      buffer.write('{');
      buffer.write('"id":"${report['id'] ?? i}"');
      buffer.write(',"title":"${_escapeJson(report['title'] ?? 'Report')}"');
      buffer.write(',"description":"${_escapeJson(report['description'] ?? '')}"');
      buffer.write(',"category":"${report['category'] ?? 'General'}"');
      buffer.write(',"priority":"${report['priority'] ?? 'Medium'}"');
      buffer.write(',"status":"${report['status'] ?? 'submitted'}"');
      buffer.write(',"latitude":${report['latitude'] ?? 0}');
      buffer.write(',"longitude":${report['longitude'] ?? 0}');
      buffer.write(',"location":"${_escapeJson(report['location'] ?? '')}"');
      buffer.write(',"reportedTime":"${report['reportedTime'] ?? 'Recently'}"');
      buffer.write(',"is_duplicate":${report['is_duplicate'] == true}');
      buffer.write('}');
    }
    buffer.write(']');
    return buffer.toString();
  }
  
  // Helper function to escape JSON strings
  static String _escapeJson(String text) {
    return text.replaceAll('"', '\\"').replaceAll('\n', '\\n').replaceAll('\r', '\\r');
  }

  static String getMapHTML({
    required double latitude,
    required double longitude,
    double zoom = 15.0,
    List<Map<String, dynamic>> reports = const [],
  }) {
    return getEnhancedMapHTML(
      latitude: latitude,
      longitude: longitude,
      zoom: zoom,
      reports: reports,
    );
  }
  
  // Legacy support
  static String getLeafletHTML({
    required double latitude,
    required double longitude,
    required double zoom,
  }) {
    return getEnhancedMapHTML(
      latitude: latitude,
      longitude: longitude,
      zoom: zoom,
    );
  }
}