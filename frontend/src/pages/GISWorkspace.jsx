import React, { useEffect, useState } from 'react';
import { getZones, getFields } from '../api/client';
import GisMap from '../components/GisMap';
import FieldInsightsPanel from '../components/FieldInsightsPanel';
import AddFieldModal from '../components/AddFieldModal';

export default function GISWorkspace({ onNavigateTab }) {
  const [zones, setZones] = useState([]);
  const [selectedZoneId, setSelectedZoneId] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStress, setFilterStress] = useState('ALL');
  const [thematicMode, setThematicMode] = useState('stress'); // 'stress' | 'ndvi' | 'radar'

  // Custom AOI Drawing State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState([]);

  // Fetch all 30 Zones on mount
  const fetchZonesData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getZones();
      const list = res.data || [];
      setZones(list);
      if (list.length > 0 && !selectedZoneId) {
        setSelectedZoneId(list[0].zone_id);
      }
    } catch (err) {
      console.error('Failed to load zones:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to load monitoring zones.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchZonesData();
  }, []);

  const selectedZone = zones.find((z) => z.zone_id === selectedZoneId) || zones[0] || null;

  // Filter zones by search and stress
  const filteredZones = zones.filter((z) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (z.name && z.name.toLowerCase().includes(q)) ||
      `zone ${z.zone_id}`.includes(q) ||
      (z.crop_stress && z.crop_stress.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    if (filterStress === 'ALL') return true;
    return (z.crop_stress || '').toUpperCase().includes(filterStress);
  });

  // Map zone objects to GIS polygons format expected by GisMap
  const mapFieldItems = zones.map((z) => ({
    id: `zone_${z.zone_id}`,
    zone_id: z.zone_id,
    name: z.name,
    crop_type: 'Cotton / Vidarbha',
    area_hectares: 78.5,
    area_acres: 194.0,
    boundary: z.geometry,
    centroid: { latitude: z.latitude, longitude: z.longitude },
    ndvi: z.ndvi,
    ndre: z.ndre,
    ndmi: z.ndmi,
    bsi: z.bsi,
    vh_db: z.vh_db,
    sar_ratio_db: z.sar_ratio_db,
    crop_stress: z.crop_stress,
    temperature_c: z.temperature_c,
    soil_moisture_l1: z.soil_moisture_l1,
    rainfall_latest_mm: z.rainfall_latest_mm,
    is_zone: true,
  }));

  const selectedMapItem = mapFieldItems.find((f) => f.zone_id === selectedZoneId) || mapFieldItems[0] || null;

  // Drawing Handlers for custom AOI
  const handleStartDrawing = () => {
    setDrawingPoints([]);
    setIsDrawing(true);
  };

  const handleAddDrawingPoint = (pt) => {
    setDrawingPoints((prev) => [...prev, pt]);
  };

  const handleFinishDrawing = () => {
    setIsDrawing(false);
    setIsAddModalOpen(true);
  };

  const handleCancelDrawing = () => {
    setIsDrawing(false);
    setDrawingPoints([]);
  };

  return (
    <div className="gis-workspace-root" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', minHeight: 650 }}>
      {/* Three-Column Workspace Layout */}
      <div
        className="gis-columns-container"
        style={{
          display: 'flex',
          flex: 1,
          border: '1px solid var(--border-color)',
          borderRadius: 8,
          overflow: 'hidden',
          background: '#ffffff',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {/* COLUMN 1: 30 Monitoring Zones Navigation List */}
        <div
          className="gis-col-fields"
          style={{
            width: 330,
            minWidth: 300,
            borderRight: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            background: '#fafbfc',
          }}
        >
          {/* Header & Thematic Mode Selector */}
          <div style={{ padding: '0.85rem 1rem', borderBottom: '1px solid var(--border-color)', background: '#ffffff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '1.1rem' }}>🗺️</span>
                <strong style={{ fontSize: '0.95rem' }}>Monitoring Zones</strong>
              </div>
              <span style={{ fontSize: '0.7rem', background: '#e0f2fe', color: '#0369a1', padding: '0.15rem 0.45rem', borderRadius: 12, fontWeight: 700 }}>
                {zones.length} Zones
              </span>
            </div>

            {/* Thematic Choropleth Toggle */}
            <div style={{ marginTop: '0.65rem' }}>
              <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)', marginBottom: 3, fontWeight: 600 }}>MAP LAYER MODE</div>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button
                  type="button"
                  className={`btn-sm ${thematicMode === 'stress' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1, fontSize: '0.675rem', padding: '0.2rem' }}
                  onClick={() => setThematicMode('stress')}
                >
                  🌱 Stress
                </button>
                <button
                  type="button"
                  className={`btn-sm ${thematicMode === 'ndvi' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1, fontSize: '0.675rem', padding: '0.2rem' }}
                  onClick={() => setThematicMode('ndvi')}
                >
                  🛰️ NDVI
                </button>
                <button
                  type="button"
                  className={`btn-sm ${thematicMode === 'radar' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1, fontSize: '0.675rem', padding: '0.2rem' }}
                  onClick={() => setThematicMode('radar')}
                >
                  📡 Radar
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div style={{ marginTop: '0.65rem' }}>
              <input
                type="text"
                placeholder="Search Zone ID or Status..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-sm"
                style={{ width: '100%', fontSize: '0.75rem' }}
              />
            </div>

            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
              {['ALL', 'HEALTHY', 'MODERATE', 'SEVERE'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setFilterStress(st)}
                  style={{
                    fontSize: '0.65rem',
                    padding: '0.15rem 0.45rem',
                    borderRadius: 10,
                    border: '1px solid var(--border-color)',
                    background: filterStress === st ? '#0f172a' : '#f1f5f9',
                    color: filterStress === st ? '#ffffff' : '#475569',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Zones Scrollable List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
            {loading ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Loading 30 monitoring zones...
              </div>
            ) : filteredZones.length === 0 ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                No zones match criteria.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {filteredZones.map((z) => {
                  const isSelected = z.zone_id === selectedZoneId;
                  const s = z.crop_stress || 'Healthy';
                  const sColor =
                    s === 'Healthy'
                      ? '#16a34a'
                      : s === 'Moderate Stress'
                      ? '#eab308'
                      : s === 'Severe Stress'
                      ? '#dc2626'
                      : '#64748b';

                  return (
                    <div
                      key={z.zone_id}
                      onClick={() => setSelectedZoneId(z.zone_id)}
                      style={{
                        padding: '0.6rem 0.75rem',
                        borderRadius: 6,
                        border: isSelected ? '2px solid #0284c7' : '1px solid var(--border-color)',
                        background: isSelected ? '#f0f9ff' : '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: sColor }} />
                          <strong style={{ fontSize: '0.85rem' }}>Zone {z.zone_id}</strong>
                        </div>
                        <span
                          style={{
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            padding: '0.1rem 0.35rem',
                            borderRadius: 3,
                            background: isSelected ? '#0284c7' : '#f1f5f9',
                            color: isSelected ? '#ffffff' : sColor,
                          }}
                        >
                          {s}
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.35rem', fontSize: '0.725rem', color: '#475569' }}>
                        <span>NDVI: <strong>{z.ndvi !== null ? z.ndvi : '—'}</strong></span>
                        <span>SAR: <strong>{z.vh_db !== null ? `${z.vh_db} dB` : '—'}</strong></span>
                        <span>Rain: <strong>{z.rainfall_latest_mm || 0}mm</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick AOI Draw Trigger */}
          <div style={{ padding: '0.65rem 1rem', borderTop: '1px solid var(--border-color)', background: '#ffffff' }}>
            <button
              type="button"
              className="btn-secondary btn-sm"
              style={{ width: '100%', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
              onClick={handleStartDrawing}
            >
              <span>📐</span>
              <span>Draw Custom Satellite AOI</span>
            </button>
          </div>
        </div>

        {/* COLUMN 2: Leaflet Interactive GIS Map */}
        <div className="gis-col-map" style={{ flex: 1, position: 'relative', minWidth: 380, display: 'flex', flexDirection: 'column' }}>
          <GisMap
            fields={mapFieldItems}
            selectedField={selectedMapItem}
            onSelectField={(item) => setSelectedZoneId(item.zone_id)}
            isDrawing={isDrawing}
            drawingPoints={drawingPoints}
            onAddDrawingPoint={handleAddDrawingPoint}
            onFinishDrawing={handleFinishDrawing}
            onCancelDrawing={handleCancelDrawing}
          />
        </div>

        {/* COLUMN 3: AI Zone Intelligence Panel */}
        <div
          className="gis-col-insights"
          style={{
            width: 390,
            minWidth: 350,
            borderLeft: '1px solid var(--border-color)',
            overflowY: 'auto',
            background: '#ffffff',
          }}
        >
          <FieldInsightsPanel
            zone={selectedZone}
            onNavigateTab={onNavigateTab}
          />
        </div>
      </div>

      {/* Add Field / Custom AOI Modal */}
      {isAddModalOpen && (
        <AddFieldModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          drawnCoordinates={drawingPoints}
          onFieldCreated={() => {
            setIsAddModalOpen(false);
            fetchZonesData();
          }}
        />
      )}
    </div>
  );
}
