import React, { useEffect, useState } from 'react';
import { getFields } from '../api/client';
import GisMap from '../components/GisMap';
import FieldInsightsPanel from '../components/FieldInsightsPanel';
import AddFieldModal from '../components/AddFieldModal';

export default function GISWorkspace({ onNavigateTab, initialMode = 'dashboard' }) {
  const [fields, setFields] = useState([]);
  const [selectedFieldId, setSelectedFieldId] = useState('field_akola_research_demo');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Add Field Modal & Map Drawing State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState([]);

  useEffect(() => {
    if (initialMode === 'fields') {
      // Focus on user field creation when entering via My Fields tab
      // if user already has fields, select the first user field if available
      if (fields.length > 1) {
        const firstUser = fields.find((f) => !f.is_demo);
        if (firstUser) setSelectedFieldId(firstUser.id);
      }
    }
  }, [initialMode]);

  // Fetch all fields on mount
  const fetchFields = async (autoSelectId = null) => {
    try {
      setLoading(true);
      setError(null);
      const res = await getFields();
      const list = res.data || [];
      setFields(list);

      if (autoSelectId) {
        setSelectedFieldId(autoSelectId);
      } else if (list.length > 0 && !selectedFieldId) {
        setSelectedFieldId(list[0].id);
      }
    } catch (err) {
      console.error('Failed to load fields:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to load field registry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFields();
  }, []);

  const selectedField = fields.find((f) => f.id === selectedFieldId) || fields[0] || null;

  // Filter fields by search
  const filteredFields = fields.filter((f) => {
    const q = searchQuery.toLowerCase();
    return (
      (f.name && f.name.toLowerCase().includes(q)) ||
      (f.crop_type && f.crop_type.toLowerCase().includes(q)) ||
      (f.location && f.location.toLowerCase().includes(q))
    );
  });

  const demoFields = filteredFields.filter((f) => f.is_demo || f.field_type === 'research_aoi');
  const userFields = filteredFields.filter((f) => !f.is_demo && f.field_type !== 'research_aoi');

  // Drawing Handlers
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

  // Field Created Callback
  const handleFieldCreated = (newField) => {
    setDrawingPoints([]);
    setIsDrawing(false);
    fetchFields(newField.id);
  };

  // Field Updated Callback
  const handleFieldUpdated = (updatedField) => {
    setFields((prev) => prev.map((f) => (f.id === updatedField.id ? updatedField : f)));
  };

  // Field Deleted Callback
  const handleFieldDeleted = (deletedId) => {
    setFields((prev) => prev.filter((f) => f.id !== deletedId));
    setSelectedFieldId('field_akola_research_demo');
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
        {/* =================================================================== */}
        {/* LEFT COLUMN: Field Directory & Management (300px)                  */}
        {/* =================================================================== */}
        <aside
          className="gis-left-panel"
          style={{
            width: 310,
            borderRight: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            background: '#fafbfc',
            flexShrink: 0,
          }}
        >
          {/* Panel Header */}
          <div style={{ padding: '0.85rem 1rem', borderBottom: '1px solid var(--border-color)', background: '#ffffff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '1.1rem' }}>🚜</span>
                <strong style={{ fontSize: '0.95rem' }}>Agricultural Fields</strong>
              </div>
              <button
                type="button"
                className="btn-primary btn-sm"
                style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                onClick={() => setIsAddModalOpen(true)}
              >
                + Add Field
              </button>
            </div>

            <input
              type="text"
              className="search-input"
              style={{ width: '100%', minWidth: 'unset', fontSize: '0.775rem', padding: '0.35rem 0.6rem' }}
              placeholder="Search by field name or crop..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Fields List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem' }}>
            {loading && fields.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                <div className="spinner" style={{ margin: '0 auto 0.5rem' }}></div>
                Loading field directory...
              </div>
            ) : error ? (
              <div style={{ padding: '0.75rem', background: '#fee2e2', color: '#991b1b', borderRadius: 6, fontSize: '0.8rem' }}>
                {error}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {/* 1. Research Baseline Section */}
                <div>
                  <div style={{ fontSize: '0.675rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.05em', marginBottom: '0.35rem', paddingLeft: '0.25rem' }}>
                    REFERENCE FIELD
                  </div>
                  {demoFields.map((f) => {
                    const isSelected = selectedField?.id === f.id;
                    return (
                      <div
                        key={f.id}
                        onClick={() => setSelectedFieldId(f.id)}
                        style={{
                          padding: '0.65rem 0.75rem',
                          borderRadius: 6,
                          border: isSelected ? '2px solid #0284c7' : '1px solid var(--border-color)',
                          background: isSelected ? '#f0f9ff' : '#ffffff',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          marginBottom: '0.4rem',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <strong style={{ fontSize: '0.85rem', color: isSelected ? '#0369a1' : 'var(--text-main)' }}>
                            {f.name}
                          </strong>
                          <span className="provenance-tag tag-model_estimated" style={{ fontSize: '0.65rem' }}>
                            Reference Field
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.35rem', fontSize: '0.75rem', color: '#64748b' }}>
                          <span>{f.crop_type}</span>
                          <span>{f.area_hectares?.toLocaleString()} ha</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 2. User Farm Fields Section */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem', paddingLeft: '0.25rem' }}>
                    <span style={{ fontSize: '0.675rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.05em' }}>
                      MY FARM FIELDS ({userFields.length})
                    </span>
                  </div>

                  {userFields.length === 0 ? (
                    <div style={{ border: '1px dashed var(--border-color)', borderRadius: 6, padding: '1rem', textAlign: 'center', background: '#ffffff', fontSize: '0.775rem', color: '#64748b' }}>
                      <p style={{ margin: '0 0 0.5rem 0' }}>No custom farm fields registered yet.</p>
                      <button
                        type="button"
                        className="btn-secondary btn-sm"
                        style={{ fontSize: '0.75rem' }}
                        onClick={() => setIsAddModalOpen(true)}
                      >
                        + Register First Field
                      </button>
                    </div>
                  ) : (
                    userFields.map((f) => {
                      const isSelected = selectedField?.id === f.id;
                      return (
                        <div
                          key={f.id}
                          onClick={() => setSelectedFieldId(f.id)}
                          style={{
                            padding: '0.65rem 0.75rem',
                            borderRadius: 6,
                            border: isSelected ? '2px solid #16a34a' : '1px solid var(--border-color)',
                            background: isSelected ? '#f0fdf4' : '#ffffff',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            marginBottom: '0.4rem',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <strong style={{ fontSize: '0.85rem', color: isSelected ? '#166534' : 'var(--text-main)' }}>
                              {f.name}
                            </strong>
                            <span className="provenance-tag tag-measured" style={{ fontSize: '0.65rem' }}>
                              User Field
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.35rem', fontSize: '0.75rem', color: '#64748b' }}>
                            <span>{f.crop_type}</span>
                            <span>{f.area_hectares?.toLocaleString()} ha</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* =================================================================== */}
        {/* CENTER COLUMN: Interactive Leaflet Map (Flexible)                  */}
        {/* =================================================================== */}
        <main
          className="gis-center-panel"
          style={{
            flex: 1,
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Central GIS Map Toolbar */}
          <div
            style={{
              padding: '0.4rem 0.85rem',
              background: '#ffffff',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.8rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontWeight: 600, color: '#334155' }}>
                Spatial Field View: <strong>{selectedField?.name || 'Loading...'}</strong>
              </span>
              {selectedField?.is_demo && (
                <span style={{ fontSize: '0.7rem', color: '#0369a1', background: '#f0f9ff', padding: '0.15rem 0.45rem', borderRadius: 4 }}>
                  Akola Reference Field
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {/* Field Analytics Quick Links */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  style={{ fontSize: '0.725rem', padding: '0.15rem 0.45rem' }}
                  onClick={() => onNavigateTab('weather')}
                  title="Open Weather Monitoring"
                >
                  🌦️ Weather
                </button>
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  style={{ fontSize: '0.725rem', padding: '0.15rem 0.45rem' }}
                  onClick={() => onNavigateTab('soil')}
                  title="Open Soil Conditions"
                >
                  🌍 Soil
                </button>
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  style={{ fontSize: '0.725rem', padding: '0.15rem 0.45rem' }}
                  onClick={() => onNavigateTab('crop_health')}
                  title="Open Crop Health & Satellite Vigor"
                >
                  🛰️ Crop Health
                </button>
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  style={{ fontSize: '0.725rem', padding: '0.15rem 0.45rem' }}
                  onClick={() => onNavigateTab('pbw')}
                  title="Open Pest Phenology Calculator"
                >
                  🐛 Pest Phenology
                </button>
              </div>

              <div style={{ width: 1, height: 16, background: 'var(--border-color)' }}></div>

              {!isDrawing ? (
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  style={{ fontSize: '0.75rem', padding: '0.2rem 0.55rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                  onClick={handleStartDrawing}
                >
                  ✏️ Draw Boundary
                </button>
              ) : (
                <span style={{ color: '#16a34a', fontWeight: 600, fontSize: '0.75rem' }}>
                  Drawing Active ({drawingPoints.length} vertices)
                </span>
              )}
            </div>
          </div>

          {/* Interactive Map Component */}
          <div style={{ flex: 1, position: 'relative' }}>
            <GisMap
              fields={fields}
              selectedField={selectedField}
              onSelectField={(f) => setSelectedFieldId(f.id)}
              isDrawing={isDrawing}
              drawingPoints={drawingPoints}
              onAddDrawingPoint={handleAddDrawingPoint}
              onFinishDrawing={handleFinishDrawing}
              onCancelDrawing={handleCancelDrawing}
            />
          </div>
        </main>

        {/* =================================================================== */}
        {/* RIGHT COLUMN: Field Insights & Module Pipelines (380px)            */}
        {/* =================================================================== */}
        <aside
          className="gis-right-panel"
          style={{
            width: 380,
            borderLeft: '1px solid var(--border-color)',
            background: '#fafbfc',
            overflowY: 'auto',
            flexShrink: 0,
          }}
        >
          <FieldInsightsPanel
            field={selectedField}
            onFieldUpdated={handleFieldUpdated}
            onFieldDeleted={handleFieldDeleted}
            onNavigateTab={onNavigateTab}
          />
        </aside>
      </div>

      {/* Add Field Registration Modal */}
      <AddFieldModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onFieldCreated={handleFieldCreated}
        drawnCoordinates={drawingPoints}
        onStartDrawingOnMap={handleStartDrawing}
      />
    </div>
  );
}
