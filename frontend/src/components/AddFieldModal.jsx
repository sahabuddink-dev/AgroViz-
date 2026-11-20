import React, { useState, useEffect } from 'react';
import { createField } from '../api/client';

// Sample polygon near Akola (approx 2.4 ha agricultural plot near Borgaon Manju)
const SAMPLE_AKOLA_FARM_POLYGON = {
  type: 'Polygon',
  coordinates: [
    [
      [77.0125, 20.7085],
      [77.0145, 20.7085],
      [77.0148, 20.7102],
      [77.0122, 20.7101],
      [77.0125, 20.7085],
    ],
  ],
};

export default function AddFieldModal({
  isOpen,
  onClose,
  onFieldCreated,
  drawnCoordinates = null,
  onStartDrawingOnMap,
}) {
  const [name, setName] = useState('');
  const [cropType, setCropType] = useState('Cotton');
  const [location, setLocation] = useState('');
  const [sowingDate, setSowingDate] = useState('');
  const [boundaryTab, setBoundaryTab] = useState('draw'); // 'draw' | 'geojson' | 'sample'
  const [geoJsonText, setGeoJsonText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // If user drew coordinates on map, update preview
  useEffect(() => {
    if (drawnCoordinates && drawnCoordinates.length >= 3) {
      setBoundaryTab('draw');
    }
  }, [drawnCoordinates]);

  if (!isOpen) return null;

  const handleUseSample = () => {
    setBoundaryTab('sample');
    setGeoJsonText(JSON.stringify(SAMPLE_AKOLA_FARM_POLYGON, null, 2));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please provide a field name.');
      return;
    }

    let boundaryObj = null;

    if (boundaryTab === 'draw') {
      if (!drawnCoordinates || drawnCoordinates.length < 3) {
        setError('Please draw at least 3 points on the map or choose GeoJSON input.');
        return;
      }
      // Convert drawn points [lat, lon] to GeoJSON [lon, lat] and close ring
      const ring = drawnCoordinates.map(([lat, lon]) => [lon, lat]);
      const first = ring[0];
      const last = ring[ring.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        ring.push([first[0], first[1]]);
      }
      boundaryObj = {
        type: 'Polygon',
        coordinates: [ring],
      };
    } else {
      // Parse GeoJSON string
      try {
        boundaryObj = JSON.parse(geoJsonText);
      } catch (err) {
        setError('Invalid GeoJSON syntax. Please ensure valid JSON formatting.');
        return;
      }
    }

    try {
      setLoading(true);
      const payload = {
        name: name.trim(),
        crop_type: cropType,
        location: location.trim() || undefined,
        sowing_date: sowingDate || undefined,
        boundary: boundaryObj,
      };

      const res = await createField(payload);
      onFieldCreated(res.data);
      onClose();
    } catch (err) {
      console.error('Field creation error:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to create field.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ maxWidth: 640 }}>
        <div className="modal-header">
          <div>
            <span className="modal-category">SPATIAL FIELD MANAGEMENT</span>
            <h3 className="modal-title">Register New Agricultural Field</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Define field name, crop, and spatial boundary polygon on the interactive GIS map.
            </span>
          </div>
          <button className="btn-close" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {error && (
              <div style={{ padding: '0.65rem 0.85rem', background: '#fee2e2', color: '#991b1b', borderRadius: 6, fontSize: '0.85rem' }}>
                <strong>Validation Error:</strong> {error}
              </div>
            )}

            {/* Field Name & Crop Type */}
            <div className="grid-2" style={{ gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Field Name *
                </label>
                <input
                  type="text"
                  className="input-sm"
                  style={{ width: '100%' }}
                  placeholder="e.g. North Plot Cotton 2024"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Crop Type *
                </label>
                <select
                  className="input-sm"
                  style={{ width: '100%' }}
                  value={cropType}
                  onChange={(e) => setCropType(e.target.value)}
                >
                  <option value="Cotton">Cotton (Kharif)</option>
                  <option value="Soybean">Soybean</option>
                  <option value="Pigeonpea">Pigeonpea (Tur)</option>
                  <option value="Wheat">Wheat (Rabi)</option>
                  <option value="Chickpea">Chickpea (Gram)</option>
                  <option value="Maize">Maize</option>
                  <option value="Other">Other Crop</option>
                </select>
              </div>
            </div>

            {/* Sowing Date & Location Description */}
            <div className="grid-2" style={{ gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Sowing Date (Optional)
                </label>
                <input
                  type="date"
                  className="input-sm"
                  style={{ width: '100%' }}
                  value={sowingDate}
                  onChange={(e) => setSowingDate(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Location / Village (Optional)
                </label>
                <input
                  type="text"
                  className="input-sm"
                  style={{ width: '100%' }}
                  placeholder="e.g. Borgaon Manju, Akola"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
            </div>

            {/* Boundary Input Tabs */}
            <div style={{ marginTop: '0.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                Field Boundary Definition *
              </label>

              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <button
                  type="button"
                  className={`btn-sm ${boundaryTab === 'draw' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem' }}
                  onClick={() => setBoundaryTab('draw')}
                >
                  ✏️ Draw on Map
                </button>
                <button
                  type="button"
                  className={`btn-sm ${boundaryTab === 'geojson' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem' }}
                  onClick={() => setBoundaryTab('geojson')}
                >
                  📋 Paste GeoJSON
                </button>
                <button
                  type="button"
                  className={`btn-sm ${boundaryTab === 'sample' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem' }}
                  onClick={handleUseSample}
                >
                  📍 Use Akola Sample Plot
                </button>
              </div>

              {boundaryTab === 'draw' && (
                <div style={{ background: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: 6, padding: '0.85rem' }}>
                  <div style={{ fontSize: '0.85rem', color: '#334155', marginBottom: '0.5rem' }}>
                    {drawnCoordinates && drawnCoordinates.length >= 3 ? (
                      <span style={{ color: '#16a34a', fontWeight: 600 }}>
                        ✓ {drawnCoordinates.length} vertices captured from map drawing!
                      </span>
                    ) : (
                      <span>
                        Click the button below to activate crosshair drawing mode on the central map:
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={() => {
                      onStartDrawingOnMap();
                      onClose();
                    }}
                  >
                    🎯 Click Map to Draw Field Boundary
                  </button>
                </div>
              )}

              {(boundaryTab === 'geojson' || boundaryTab === 'sample') && (
                <div>
                  <textarea
                    rows={6}
                    className="input-sm"
                    style={{ width: '100%', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}
                    placeholder='{"type": "Polygon", "coordinates": [[[77.01, 20.71], [77.02, 20.71], [77.02, 20.72], [77.01, 20.72], [77.01, 20.71]]]}'
                    value={geoJsonText}
                    onChange={(e) => setGeoJsonText(e.target.value)}
                  />
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Accepts GeoJSON Polygon, Feature, or FeatureCollection in WGS84 (longitude, latitude).
                  </div>
                </div>
              )}
            </div>

            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '0.65rem 0.85rem', fontSize: '0.75rem', color: '#166534' }}>
              <strong>Precision Agriculture Standard:</strong> A boundary polygon alone is sufficient to create a field.
              You do <em>not</em> need to upload raster imagery or sensor files just to register your field.
            </div>
          </div>

          <div style={{ padding: '0.85rem 1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', background: '#fafbfc' }}>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Creating Field...' : 'Save & Register Field'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
