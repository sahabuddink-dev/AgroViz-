import React, { useState, useEffect } from 'react';
import ProvenanceBadge from './ProvenanceBadge';
import { updateField, deleteField, getAlerts, getReportDownloadUrl } from '../api/client';

export default function FieldInsightsPanel({
  field,
  onFieldUpdated = () => {},
  onFieldDeleted = () => {},
  onNavigateTab = () => {},
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCrop, setEditCrop] = useState('');
  const [editSowingDate, setEditSowingDate] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);

  // Field Alerts State
  const [alerts, setAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(false);

  useEffect(() => {
    if (field?.id) {
      setAlertsLoading(true);
      getAlerts(field.id)
        .then((res) => setAlerts(res.data || []))
        .catch((err) => console.warn('Failed to load field alerts:', err))
        .finally(() => setAlertsLoading(false));
    }
  }, [field?.id]);

  if (!field) {
    return (
      <div className="gis-insights-empty" style={{ padding: '2rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🌱</div>
        <h4>No Field Selected</h4>
        <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
          Select a field from the left panel or click a polygon on the map to inspect its crop health, biophysical conditions, active alerts, and data availability.
        </p>
      </div>
    );
  }

  const isDemo = field.is_demo || field.field_type === 'research_aoi';
  const avail = field.data_availability || {};

  const handleStartEdit = () => {
    setEditName(field.name || '');
    setEditCrop(field.crop_type || 'Cotton');
    setEditSowingDate(field.sowing_date || '');
    setEditLocation(field.location || '');
    setActionError(null);
    setIsEditing(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      setActionError(null);
      const res = await updateField(field.id, {
        name: editName,
        crop_type: editCrop,
        sowing_date: editSowingDate || null,
        location: editLocation || null,
      });
      onFieldUpdated(res.data);
      setIsEditing(false);
    } catch (err) {
      console.error('Update field error:', err);
      setActionError(err.response?.data?.detail || err.message || 'Failed to update field.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (isDemo) return;
    const confirmed = window.confirm(`Are you sure you want to delete the field "${field.name}"?`);
    if (!confirmed) return;

    try {
      setActionLoading(true);
      setActionError(null);
      await deleteField(field.id);
      onFieldDeleted(field.id);
    } catch (err) {
      console.error('Delete field error:', err);
      setActionError(err.response?.data?.detail || err.message || 'Failed to delete field.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="gis-insights-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1rem' }}>
      {/* Field Overview Card */}
      <div className="card" style={{ padding: '1.25rem', borderTop: `4px solid ${isDemo ? '#0284c7' : '#10b981'}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.1rem' }}>{isDemo ? '🏛️' : '🚜'}</span>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>{field.name}</h3>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              {field.location || 'Akola District, Maharashtra'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            <span
              className={`provenance-tag ${isDemo ? 'tag-model_estimated' : 'tag-measured'}`}
              style={{ fontSize: '0.7rem' }}
            >
              {isDemo ? 'Research AOI (10 km)' : 'Private Farm Boundary'}
            </span>
          </div>
        </div>

        {actionError && (
          <div style={{ marginTop: '0.75rem', padding: '0.5rem', background: '#fee2e2', color: '#991b1b', borderRadius: 6, fontSize: '0.8rem' }}>
            {actionError}
          </div>
        )}

        {/* Edit Form */}
        {isEditing ? (
          <form onSubmit={handleSaveEdit} style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>Field Name</label>
              <input
                type="text"
                className="input-sm"
                style={{ width: '100%' }}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
            </div>
            <div className="grid-2" style={{ gap: '0.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>Crop</label>
                <input
                  type="text"
                  className="input-sm"
                  style={{ width: '100%' }}
                  value={editCrop}
                  onChange={(e) => setEditCrop(e.target.value)}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>Sowing Date</label>
                <input
                  type="date"
                  className="input-sm"
                  style={{ width: '100%' }}
                  value={editSowingDate}
                  onChange={(e) => setEditSowingDate(e.target.value)}
                />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.25rem' }}>
              <button type="button" className="btn-secondary btn-sm" onClick={() => setIsEditing(false)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary btn-sm" disabled={actionLoading}>
                {actionLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        ) : (
          <div>
            {/* Key Field Metrics */}
            <div className="grid-3" style={{ gap: '0.5rem', marginTop: '1rem' }}>
              <div style={{ background: '#f8fafc', padding: '0.5rem 0.65rem', borderRadius: 6, border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Surface Area</div>
                <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>
                  {field.area_hectares?.toLocaleString()} ha
                </strong>
                <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>
                  ({field.area_acres?.toLocaleString()} ac)
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '0.5rem 0.65rem', borderRadius: 6, border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Crop Type</div>
                <strong style={{ fontSize: '0.9rem', color: '#16a34a' }}>
                  {field.crop_type}
                </strong>
                <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>
                  {field.sowing_date ? `Sown: ${field.sowing_date}` : 'Date unassigned'}
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '0.5rem 0.65rem', borderRadius: 6, border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Center Centroid</div>
                <strong style={{ fontSize: '0.75rem', color: '#475569' }}>
                  {field.centroid?.latitude}°N
                </strong>
                <div style={{ fontSize: '0.7rem', color: '#475569' }}>
                  {field.centroid?.longitude}°E
                </div>
              </div>
            </div>

            {/* Quick Report & Export Toolbar */}
            <div style={{ marginTop: '0.85rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <a
                  href={getReportDownloadUrl(field.id, 'csv')}
                  download={`agroviz_report_${field.id}.csv`}
                  className="btn-secondary btn-sm"
                  style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                  title="Download field report as tabular CSV"
                >
                  📥 Export CSV
                </a>
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                  onClick={() => onNavigateTab('reports')}
                >
                  📄 View Full Report
                </button>
              </div>

              {!isDemo && (
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                    onClick={handleStartEdit}
                  >
                    ✏️ Edit
                  </button>
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', color: '#dc2626' }}
                    onClick={handleDelete}
                    disabled={actionLoading}
                  >
                    🗑️ Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Active Evidence-Based Agronomic Alerts */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span>🔔</span>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>Active Field Alerts ({alerts.length})</h4>
          </div>
          <button
            type="button"
            className="btn-secondary btn-sm"
            style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem' }}
            onClick={() => onNavigateTab('alerts')}
          >
            All Alerts Feed &rarr;
          </button>
        </div>

        {alertsLoading ? (
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Evaluating field alerts...</div>
        ) : alerts.length === 0 ? (
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No active alert thresholds triggered.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {alerts.slice(0, 3).map((a) => {
              const isWarn = a.severity === 'Warning';
              const isCrit = a.severity === 'Critical';
              const borderColor = isCrit ? '#dc2626' : isWarn ? '#f59e0b' : '#0284c7';
              const bgColor = isCrit ? '#fee2e2' : isWarn ? '#fffbeb' : '#f0f9ff';
              const textColor = isCrit ? '#991b1b' : isWarn ? '#92400e' : '#0369a1';

              return (
                <div
                  key={a.id}
                  style={{
                    borderLeft: `3px solid ${borderColor}`,
                    background: bgColor,
                    padding: '0.5rem 0.75rem',
                    borderRadius: 4,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '0.8rem', color: textColor }}>{a.title}</strong>
                    <span
                      style={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        padding: '0.1rem 0.35rem',
                        borderRadius: 3,
                        background: borderColor,
                        color: '#ffffff',
                      }}
                    >
                      {a.severity}
                    </span>
                  </div>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.725rem', color: '#475569', lineHeight: 1.4 }}>
                    {a.message}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Module Data Availability Matrix */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <h4 style={{ margin: '0 0 0.85rem 0', fontSize: '0.95rem', fontWeight: 600 }}>
          Biophysical Data Availability & Active Pipelines
        </h4>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {/* 1. Crop Health & Satellite Vigor */}
          <div style={{ border: '1px solid var(--border-color)', borderRadius: 6, padding: '0.75rem', background: '#fafbfc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span>🛰️</span>
                <strong style={{ fontSize: '0.85rem' }}>Crop Health & Canopy Vigor</strong>
              </div>
              <span className={`provenance-tag ${avail.crop_indices?.available ? 'tag-calculated' : 'tag-unavailable'}`}>
                {avail.crop_indices?.available ? 'Available (S2)' : 'Unavailable'}
              </span>
            </div>

            {avail.crop_indices?.available ? (
              <div style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: '#475569' }}>
                <div>• Source: Copernicus Sentinel-2 L2A (80 valid dates, June 2023–Dec 2024).</div>
                <div>• Indices: NDVI (Vigor), NDRE (Chlorophyll), NDMI (Canopy Water).</div>
                <div style={{ color: '#b45309', marginTop: '0.2rem' }}>
                  * July 2023 & July 2024 monsoon cloud occlusion gaps strictly preserved.
                </div>
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  style={{ marginTop: '0.5rem', width: '100%', fontSize: '0.75rem' }}
                  onClick={() => onNavigateTab('crop_health')}
                >
                  View Sentinel-2 Time-Series & Raster Engine &rarr;
                </button>
              </div>
            ) : (
              <div style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: '#64748b' }}>
                <p style={{ margin: 0 }}>
                  {avail.crop_indices?.reason ||
                    'Requires multispectral drone orthomosaic or satellite GeoTIFF upload. Regional 10 km unmasked indices are not assigned to private farm parcels.'}
                </p>
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  style={{ marginTop: '0.5rem', width: '100%', fontSize: '0.75rem', color: '#0369a1' }}
                  onClick={() => onNavigateTab('crop_health')}
                >
                  Upload Field GeoTIFF Raster &rarr;
                </button>
              </div>
            )}
          </div>

          {/* 2. Weather & Atmospheric Conditions */}
          <div style={{ border: '1px solid var(--border-color)', borderRadius: 6, padding: '0.75rem', background: '#fafbfc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span>🌦️</span>
                <strong style={{ fontSize: '0.85rem' }}>Surface Weather & Meteorology</strong>
              </div>
              <span className={`provenance-tag ${avail.weather?.available ? 'tag-model_estimated' : 'tag-unavailable'}`}>
                {avail.weather?.available ? 'Available (Reanalysis)' : 'Unavailable'}
              </span>
            </div>

            {avail.weather?.available ? (
              <div style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: '#475569' }}>
                <div>• Source: NASA POWER MERRA-2 (580 daily records, June 2023–Dec 2024).</div>
                <div>• Coverage: Mean/Max/Min Temp, Relative Humidity, Corrected Rainfall.</div>
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  style={{ marginTop: '0.5rem', width: '100%', fontSize: '0.75rem' }}
                  onClick={() => onNavigateTab('weather')}
                >
                  View Weather Trends & Monthly Summaries &rarr;
                </button>
              </div>
            ) : (
              <div style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: '#64748b' }}>
                <p style={{ margin: 0 }}>
                  {avail.weather?.reason ||
                    'Requires local on-farm weather station CSV upload. Regional ~50x60 km grid cell is not attributed to private fields.'}
                </p>
              </div>
            )}
          </div>

          {/* 3. Soil Moisture & Texture */}
          <div style={{ border: '1px solid var(--border-color)', borderRadius: 6, padding: '0.75rem', background: '#fafbfc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span>🌍</span>
                <strong style={{ fontSize: '0.85rem' }}>Root-Zone Soil Conditions</strong>
              </div>
              <span className={`provenance-tag ${avail.soil_moisture?.available ? 'tag-model_estimated' : 'tag-unavailable'}`}>
                {avail.soil_moisture?.available ? 'Available (ERA5 + SoilGrids)' : 'Unavailable'}
              </span>
            </div>

            {avail.soil_moisture?.available ? (
              <div style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: '#475569' }}>
                <div>• Moisture: ERA5-Land 3-depth dynamics (0-7cm, 7-28cm, 28-100cm).</div>
                <div>• Texture: ISRIC SoilGrids 2.0 depth profile (Clay texture classification).</div>
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  style={{ marginTop: '0.5rem', width: '100%', fontSize: '0.75rem' }}
                  onClick={() => onNavigateTab('soil')}
                >
                  View Soil Moisture Curves & Texture Profile &rarr;
                </button>
              </div>
            ) : (
              <div style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: '#64748b' }}>
                <p style={{ margin: 0 }}>
                  {avail.soil_moisture?.reason ||
                    'Requires in-situ capacitive FDR/TDR soil probe CSV upload. Regional reanalysis is not mapped to private farm plots.'}
                </p>
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  style={{ marginTop: '0.5rem', width: '100%', fontSize: '0.75rem', color: '#0369a1' }}
                  onClick={() => onNavigateTab('soil')}
                >
                  Upload Field Soil Sensor Log &rarr;
                </button>
              </div>
            )}
          </div>

          {/* 4. Pink Bollworm Phenology */}
          <div style={{ border: '1px solid var(--border-color)', borderRadius: 6, padding: '0.75rem', background: '#fafbfc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span>🐛</span>
                <strong style={{ fontSize: '0.85rem' }}>Pink Bollworm Phenology (PBW)</strong>
              </div>
              <span className={`provenance-tag ${avail.pbw_phenology?.available ? 'tag-calculated' : 'tag-unavailable'}`}>
                {avail.pbw_phenology?.available ? 'Available (Degree-Days)' : 'Unavailable'}
              </span>
            </div>

            {avail.pbw_phenology?.available ? (
              <div style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: '#475569' }}>
                <div>• Model: Single-sine horizontal cutoff degree-day engine (Sets A & B).</div>
                <div>• Historical Context: ICAR-CICR Survey Annexures 3 & 4 (regional baseline).</div>
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  style={{ marginTop: '0.5rem', width: '100%', fontSize: '0.75rem' }}
                  onClick={() => onNavigateTab('pbw')}
                >
                  Open Degree-Day Phenology Calculator &rarr;
                </button>
              </div>
            ) : (
              <div style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: '#64748b' }}>
                <p style={{ margin: 0 }}>
                  {avail.pbw_phenology?.reason ||
                    'Requires field temperature series and local pheromone trap scouting logs.'}
                </p>
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  style={{ marginTop: '0.5rem', width: '100%', fontSize: '0.75rem', color: '#0369a1' }}
                  onClick={() => onNavigateTab('pbw')}
                >
                  Upload Scouting Trap Observations &rarr;
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Scientific Honesty Notice */}
      <div style={{ padding: '0.85rem 1rem', background: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: 6, fontSize: '0.725rem', color: '#475569', lineHeight: 1.5 }}>
        <strong>Data Provenance Notice:</strong> AgroViz enforces strict scientific boundaries. Regional research baseline
        datasets (10 km Akola buffer) are clearly differentiated from private farm plots. Where field-specific measurements
        are absent, unavailable states are presented rather than fabricated values.
      </div>
    </div>
  );
}
