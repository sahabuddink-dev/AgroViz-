import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Vite asset URL resolution for default Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

/**
 * Interactive Leaflet GIS Map for Precision Agriculture Workspace.
 * Supports:
 * - Field polygon overlays with distinctive styling for research AOI vs private farms
 * - Automatic zoom/pan fitting to selected field
 * - Interactive polygon drawing tool for field registration
 * - OpenStreetMap & Satellite imagery basemap switching
 */
export default function GisMap({
  fields = [],
  selectedField = null,
  onSelectField = () => {},
  isDrawing = false,
  drawingPoints = [],
  onAddDrawingPoint = () => {},
  onFinishDrawing = () => {},
  onCancelDrawing = () => {},
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const polygonLayerGroupRef = useRef(null);
  const drawingLayerGroupRef = useRef(null);

  const [basemapType, setBasemapType] = useState('osm'); // 'osm' | 'satellite'
  const [showCenterMarkers, setShowCenterMarkers] = useState(true);
  const [cursorCoords, setCursorCoords] = useState(null);

  // Basemap Tile URLs
  const BASEMAPS = {
    osm: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attrib: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    },
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attrib: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
      maxZoom: 18,
    },
  };

  // 1. Initialize Leaflet Map on Mount
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Centered at Akola, Maharashtra (20.7069°N, 77.0022°E) by default
    const map = L.map(mapContainerRef.current, {
      center: [20.7069, 77.0022],
      zoom: 11,
      zoomControl: true,
      attributionControl: true,
    });

    const tile = L.tileLayer(BASEMAPS.osm.url, {
      attribution: BASEMAPS.osm.attrib,
      maxZoom: BASEMAPS.osm.maxZoom,
    }).addTo(map);

    tileLayerRef.current = tile;
    polygonLayerGroupRef.current = L.featureGroup().addTo(map);
    drawingLayerGroupRef.current = L.featureGroup().addTo(map);

    // Track mouse coordinates for agricultural GIS status bar
    map.on('mousemove', (e) => {
      setCursorCoords({
        lat: e.latlng.lat.toFixed(5),
        lng: e.latlng.lng.toFixed(5),
      });
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. Switch Basemap (Streets vs Satellite)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !tileLayerRef.current) return;

    map.removeLayer(tileLayerRef.current);
    const config = BASEMAPS[basemapType] || BASEMAPS.osm;
    const newTile = L.tileLayer(config.url, {
      attribution: config.attrib,
      maxZoom: config.maxZoom,
    }).addTo(map);
    newTile.bringToBack();
    tileLayerRef.current = newTile;
  }, [basemapType]);

  // 3. Render Field Polygon Layers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = polygonLayerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    fields.forEach((field) => {
      const isSelected = selectedField?.id === field.id;
      const isDemo = field.is_demo || field.field_type === 'research_aoi';
      const boundary = field.boundary;

      if (!boundary || !boundary.coordinates || !boundary.coordinates[0]) return;

      // GeoJSON has [lon, lat], Leaflet Polygon expects [lat, lon]
      const latLngs = boundary.coordinates[0].map(([lon, lat]) => [lat, lon]);

      // Distinct Styling: Akola Research AOI vs User Private Farm Boundaries
      let style = {};
      if (isDemo) {
        style = {
          color: isSelected ? '#0284c7' : '#0369a1',
          weight: isSelected ? 3.5 : 2,
          dashArray: '6, 6',
          fillColor: '#0284c7',
          fillOpacity: isSelected ? 0.22 : 0.12,
        };
      } else {
        style = {
          color: isSelected ? '#f59e0b' : '#10b981',
          weight: isSelected ? 3.5 : 2.5,
          dashArray: isSelected ? null : null,
          fillColor: isSelected ? '#f59e0b' : '#10b981',
          fillOpacity: isSelected ? 0.35 : 0.2,
        };
      }

      const polygon = L.polygon(latLngs, style);

      // Tooltip / Popup
      const areaLabel = `${field.area_hectares?.toLocaleString()} ha (${field.area_acres?.toLocaleString()} ac)`;
      const typeLabel = isDemo ? 'Research Macro-Buffer' : 'User Farm Parcel';

      polygon.bindTooltip(
        `<strong>${field.name}</strong><br/>
         <span style="font-size:0.75rem; color:#64748b;">${typeLabel} • ${field.crop_type} • ${areaLabel}</span>`,
        { sticky: true, className: 'gis-tooltip' }
      );

      polygon.on('click', () => {
        if (!isDrawing) {
          onSelectField(field);
        }
      });

      layerGroup.addLayer(polygon);

      // Optional center marker / centroid pin
      if (showCenterMarkers && field.centroid) {
        const markerColor = isDemo ? '#0284c7' : '#16a34a';
        const circleMarker = L.circleMarker([field.centroid.latitude, field.centroid.longitude], {
          radius: isSelected ? 6 : 4,
          fillColor: markerColor,
          color: '#ffffff',
          weight: 1.5,
          opacity: 1,
          fillOpacity: 0.9,
        });

        circleMarker.bindTooltip(field.name, { direction: 'top', offset: [0, -5] });
        circleMarker.on('click', () => onSelectField(field));
        layerGroup.addLayer(circleMarker);
      }
    });
  }, [fields, selectedField, showCenterMarkers, isDrawing]);

  // 4. Auto-fit Map to Selected Field
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedField || !selectedField.boundary || isDrawing) return;

    try {
      const latLngs = selectedField.boundary.coordinates[0].map(([lon, lat]) => [lat, lon]);
      const bounds = L.latLngBounds(latLngs);
      if (bounds.isValid()) {
        map.fitBounds(bounds, {
          padding: [50, 50],
          maxZoom: selectedField.is_demo ? 12 : 16,
          animate: true,
          duration: 0.8,
        });
      }
    } catch (e) {
      console.warn('Failed to fit bounds:', e);
    }
  }, [selectedField, isDrawing]);

  // 5. Interactive Polygon Drawing Handler
  useEffect(() => {
    const map = mapInstanceRef.current;
    const drawGroup = drawingLayerGroupRef.current;
    if (!map || !drawGroup) return;

    drawGroup.clearLayers();

    if (!isDrawing) {
      map.getContainer().style.cursor = '';
      return;
    }

    map.getContainer().style.cursor = 'crosshair';

    // Map click adds vertex to drawing
    const handleMapClick = (e) => {
      onAddDrawingPoint([roundCoord(e.latlng.lat), roundCoord(e.latlng.lng)]);
    };

    map.on('click', handleMapClick);

    // Render active drawing lines & markers
    if (drawingPoints.length > 0) {
      // Draw vertex markers
      drawingPoints.forEach((pt, i) => {
        const isStart = i === 0;
        const marker = L.circleMarker(pt, {
          radius: isStart ? 7 : 5,
          fillColor: isStart ? '#10b981' : '#f59e0b',
          color: '#ffffff',
          weight: 2,
          fillOpacity: 1,
        });
        if (isStart) {
          marker.bindTooltip('Click to close polygon', { permanent: true, direction: 'top' });
          marker.on('click', (ev) => {
            L.DomEvent.stopPropagation(ev);
            if (drawingPoints.length >= 3) {
              onFinishDrawing();
            }
          });
        }
        drawGroup.addLayer(marker);
      });

      // Draw polyline or polygon
      if (drawingPoints.length >= 3) {
        const poly = L.polygon(drawingPoints, {
          color: '#10b981',
          weight: 2,
          dashArray: '4, 4',
          fillColor: '#10b981',
          fillOpacity: 0.25,
        });
        drawGroup.addLayer(poly);
      } else if (drawingPoints.length >= 2) {
        const line = L.polyline(drawingPoints, {
          color: '#10b981',
          weight: 2,
          dashArray: '4, 4',
        });
        drawGroup.addLayer(line);
      }
    }

    return () => {
      map.off('click', handleMapClick);
    };
  }, [isDrawing, drawingPoints]);

  const roundCoord = (val) => Math.round(val * 1000000) / 1000000;

  const handleFitToSelected = () => {
    if (!selectedField || !mapInstanceRef.current) return;
    try {
      const latLngs = selectedField.boundary.coordinates[0].map(([lon, lat]) => [lat, lon]);
      mapInstanceRef.current.fitBounds(L.latLngBounds(latLngs), {
        padding: [40, 40],
        maxZoom: selectedField.is_demo ? 12 : 16,
      });
    } catch (e) {
      console.warn(e);
    }
  };

  return (
    <div className="gis-map-wrapper" style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Top Map Toolbar */}
      <div
        className="gis-map-toolbar"
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          zIndex: 500,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(4px)',
          border: '1px solid var(--border-color)',
          borderRadius: 8,
          padding: '0.4rem 0.6rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          boxShadow: 'var(--shadow-md)',
          fontSize: '0.8rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <button
            type="button"
            className={`btn-sm ${basemapType === 'osm' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
            onClick={() => setBasemapType('osm')}
          >
            🗺️ Street Map
          </button>
          <button
            type="button"
            className={`btn-sm ${basemapType === 'satellite' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
            onClick={() => setBasemapType('satellite')}
          >
            🛰️ Satellite
          </button>
        </div>

        <div style={{ width: 1, height: 16, background: 'var(--border-color)' }}></div>

        <button
          type="button"
          className="btn-secondary btn-sm"
          style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
          onClick={handleFitToSelected}
          disabled={!selectedField}
          title="Zoom to selected field boundary"
        >
          🎯 Fit Selected Field
        </button>

        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', cursor: 'pointer', marginLeft: '0.25rem' }}>
          <input
            type="checkbox"
            checked={showCenterMarkers}
            onChange={(e) => setShowCenterMarkers(e.target.checked)}
          />
          Centroid Pins
        </label>
      </div>

      {/* Map Legend Overlay */}
      <div
        className="gis-map-legend"
        style={{
          position: 'absolute',
          bottom: 28,
          left: 12,
          zIndex: 500,
          background: 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(3px)',
          border: '1px solid var(--border-color)',
          borderRadius: 6,
          padding: '0.4rem 0.65rem',
          fontSize: '0.725rem',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ width: 16, height: 0, borderTop: '2px dashed #0284c7' }}></span>
          <span>Akola Research AOI (10 km Macro-Buffer)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ width: 16, height: 8, background: '#10b981', opacity: 0.7, borderRadius: 2 }}></span>
          <span>User Farm Parcel Boundary</span>
        </div>
      </div>

      {/* Drawing Mode Prompt Overlay */}
      {isDrawing && (
        <div
          style={{
            position: 'absolute',
            top: 60,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 600,
            background: '#0f172a',
            color: '#ffffff',
            padding: '0.6rem 1.25rem',
            borderRadius: 30,
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            fontSize: '0.85rem',
          }}
        >
          <span>
            📍 Click map to add vertices ({drawingPoints.length} points). Minimum 3 points required.
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn-primary btn-sm"
              style={{ background: '#10b981', borderColor: '#10b981', padding: '0.2rem 0.65rem' }}
              disabled={drawingPoints.length < 3}
              onClick={onFinishDrawing}
            >
              Finish Polygon
            </button>
            <button
              type="button"
              className="btn-secondary btn-sm"
              style={{ background: '#334155', color: '#fff', border: 'none', padding: '0.2rem 0.65rem' }}
              onClick={onCancelDrawing}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Coordinate Status Bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 6,
          right: 12,
          zIndex: 500,
          background: 'rgba(255, 255, 255, 0.85)',
          border: '1px solid var(--border-color)',
          borderRadius: 4,
          padding: '0.15rem 0.45rem',
          fontSize: '0.7rem',
          color: '#475569',
          fontFamily: 'var(--font-mono)',
        }}
      >
        {cursorCoords ? `Lat: ${cursorCoords.lat}° | Lon: ${cursorCoords.lng}° (WGS84)` : 'Move cursor on map'}
      </div>

      {/* Map DOM Element */}
      <div
        ref={mapContainerRef}
        style={{
          width: '100%',
          height: '100%',
          minHeight: 480,
          background: '#e2e8f0',
        }}
      />
    </div>
  );
}
