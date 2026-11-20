import React, { useEffect, useState } from 'react';
import {
  getSoilMoisture,
  getSoilProperties,
  getSoilTemplateURL,
  uploadSoilSensorLog,
} from '../api/client';
import ProvenanceBadge from '../components/ProvenanceBadge';
import {
  ThreeLayerMoistureChart,
  SoilGridsDepthProfileChart,
} from '../components/SoilCharts';

export default function Soil({ onNavigateTab }) {
  const [activeTab, setActiveTab] = useState('moisture'); // 'moisture' | 'properties' | 'sensor_upload'
  const [moistureData, setMoistureData] = useState(null);
  const [propertiesData, setPropertiesData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Date range filtering for moisture
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Sensor upload state
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadError, setUploadError] = useState(null);

  const fetchSoilData = async (start = null, end = null) => {
    try {
      setLoading(true);
      setError(null);
      const [moistRes, propRes] = await Promise.all([
        getSoilMoisture(start, end),
        getSoilProperties(),
      ]);
      setMoistureData(moistRes.data);
      setPropertiesData(propRes.data);
    } catch (err) {
      console.error('Failed to load Soil Conditions data:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to load soil module data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSoilData();
  }, []);

  const handleDateFilterSubmit = (e) => {
    e.preventDefault();
    fetchSoilData(startDate || null, endDate || null);
  };

  const handlePresetFilter = (preset) => {
    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
      fetchSoilData(null, null);
    } else if (preset === 'kharif2023') {
      setStartDate('2023-06-01');
      setEndDate('2023-11-30');
      fetchSoilData('2023-06-01', '2023-11-30');
    } else if (preset === 'kharif2024') {
      setStartDate('2024-06-01');
      setEndDate('2024-11-30');
      fetchSoilData('2024-06-01', '2024-11-30');
    } else if (preset === 'dry2024') {
      setStartDate('2024-01-01');
      setEndDate('2024-05-31');
      fetchSoilData('2024-01-01', '2024-05-31');
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    try {
      setUploadLoading(true);
      setUploadError(null);
      const res = await uploadSoilSensorLog(selectedFile);
      setUploadResult(res.data);
      setSelectedFile(null);
    } catch (err) {
      console.error('Sensor upload failed:', err);
      setUploadError(err.response?.data?.detail || err.message || 'CSV validation failed.');
    } finally {
      setUploadLoading(false);
    }
  };

  if (loading && !moistureData) {
    return (
      <div className="card loading-card">
        <div className="spinner"></div>
        <p>Loading Soil Conditions data from ERA5-Land and SoilGrids 2.0...</p>
      </div>
    );
  }

  if (error && !moistureData) {
    return (
      <div className="card error-card">
        <h3>Error Loading Soil Module</h3>
        <p>{error}</p>
        <button className="btn-secondary btn-sm" onClick={() => fetchSoilData()}>
          Retry
        </button>
      </div>
    );
  }

  const stats = moistureData?.statistics;
  const corrs = moistureData?.correlations;
  const overallAvg = propertiesData?.overall_averages;

  return (
    <div className="soil-page">
      {onNavigateTab && (
        <div style={{ marginBottom: '0.85rem' }}>
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={() => onNavigateTab('dashboard')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem' }}
          >
            &larr; Back to Dashboard
          </button>
        </div>
      )}
      {/* Module Title & Overview */}
      <div className="module-header card" style={{ marginBottom: '1.25rem' }}>
        <div className="header-badge-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700 }}>Soil Conditions & In-Situ Sensor Ingestion</h2>
            <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Multi-depth volumetric soil moisture dynamics (ECMWF ERA5-Land) & physical depth profiles (ISRIC SoilGrids 2.0)
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <ProvenanceBadge provenance="model_estimated" source="ECMWF ERA5-Land" />
            <ProvenanceBadge provenance="model_estimated" source="ISRIC SoilGrids 2.0" />
          </div>
        </div>

        {/* High-Level Stat Cards */}
        <div className="grid-4" style={{ marginTop: '1.25rem', gap: '1rem' }}>
          <div className="stat-card">
            <span className="stat-label">Layer 1 (0–7 cm) Surface Moisture</span>
            <span className="stat-val" style={{ color: '#f59e0b' }}>
              {stats?.layer1?.latest ?? '—'} <span style={{ fontSize: '0.8rem' }}>m³/m³</span>
            </span>
            <span className="stat-sub">
              Mean: {stats?.layer1?.mean} | Range: {stats?.layer1?.min}–{stats?.layer1?.max}
            </span>
          </div>

          <div className="stat-card">
            <span className="stat-label">Layer 2 (7–28 cm) Mid Root-Zone</span>
            <span className="stat-val" style={{ color: '#06b6d4' }}>
              {stats?.layer2?.latest ?? '—'} <span style={{ fontSize: '0.8rem' }}>m³/m³</span>
            </span>
            <span className="stat-sub">
              Mean: {stats?.layer2?.mean} | Range: {stats?.layer2?.min}–{stats?.layer2?.max}
            </span>
          </div>

          <div className="stat-card">
            <span className="stat-label">Layer 3 (28–100 cm) Deep Root-Zone</span>
            <span className="stat-val" style={{ color: '#3b82f6' }}>
              {stats?.layer3?.latest ?? '—'} <span style={{ fontSize: '0.8rem' }}>m³/m³</span>
            </span>
            <span className="stat-sub">
              Mean: {stats?.layer3?.mean} | Range: {stats?.layer3?.min}–{stats?.layer3?.max}
            </span>
          </div>

          <div className="stat-card">
            <span className="stat-label">USDA Soil Texture Classification</span>
            <span className="stat-val" style={{ color: 'var(--primary-color)' }}>
              {overallAvg?.usda_texture ?? 'Clay'}
            </span>
            <span className="stat-sub">
              Clay: {overallAvg?.clay_pct}% | Silt: {overallAvg?.silt_pct}% | Sand: {overallAvg?.sand_pct}%
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="tab-bar card" style={{ display: 'flex', gap: '0.5rem', padding: '0.5rem 1rem', marginBottom: '1.25rem' }}>
        <button
          className={`btn-sm ${activeTab === 'moisture' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('moisture')}
        >
          💧 ERA5 3-Layer Moisture Time-Series
        </button>
        <button
          className={`btn-sm ${activeTab === 'properties' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('properties')}
        >
          🌍 SoilGrids Physical Depth Profiles
        </button>
        <button
          className={`btn-sm ${activeTab === 'sensor_upload' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('sensor_upload')}
        >
          📡 In-Situ Field Sensor Staging Slot
        </button>
      </div>

      {/* TAB 1: ERA5-Land Soil Moisture */}
      {activeTab === 'moisture' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Filter Bar */}
          <div className="card" style={{ padding: '0.75rem 1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Quick Presets:</span>
                <button className="btn-secondary btn-sm" onClick={() => handlePresetFilter('all')}>
                  All 580 Days
                </button>
                <button className="btn-secondary btn-sm" onClick={() => handlePresetFilter('kharif2023')}>
                  Kharif 2023
                </button>
                <button className="btn-secondary btn-sm" onClick={() => handlePresetFilter('dry2024')}>
                  Dry Season 2024
                </button>
                <button className="btn-secondary btn-sm" onClick={() => handlePresetFilter('kharif2024')}>
                  Kharif 2024
                </button>
              </div>

              <form onSubmit={handleDateFilterSubmit} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Custom:</span>
                <input
                  type="date"
                  className="input-sm"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  min="2023-06-01"
                  max="2024-12-31"
                />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>to</span>
                <input
                  type="date"
                  className="input-sm"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min="2023-06-01"
                  max="2024-12-31"
                />
                <button type="submit" className="btn-primary btn-sm">Filter</button>
              </form>
            </div>
          </div>

          {/* Interactive Three-Layer Chart */}
          <ThreeLayerMoistureChart records={moistureData?.records} />

          {/* Depth Statistics & Physical Correlations Table */}
          <div className="grid-2" style={{ gap: '1.25rem' }}>
            <div className="card">
              <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', fontWeight: 600 }}>
                Depth-Wise Descriptive Statistics
              </h4>
              <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.4rem' }}>Layer & Depth</th>
                    <th style={{ padding: '0.4rem' }}>Mean (m³/m³)</th>
                    <th style={{ padding: '0.4rem' }}>Min (m³/m³)</th>
                    <th style={{ padding: '0.4rem' }}>Max (m³/m³)</th>
                    <th style={{ padding: '0.4rem' }}>Std Dev</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.5rem', fontWeight: 600, color: '#f59e0b' }}>Layer 1 (0–7 cm)</td>
                    <td style={{ padding: '0.5rem' }}>{stats?.layer1?.mean}</td>
                    <td style={{ padding: '0.5rem' }}>{stats?.layer1?.min}</td>
                    <td style={{ padding: '0.5rem' }}>{stats?.layer1?.max}</td>
                    <td style={{ padding: '0.5rem' }}>{stats?.layer1?.std}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.5rem', fontWeight: 600, color: '#06b6d4' }}>Layer 2 (7–28 cm)</td>
                    <td style={{ padding: '0.5rem' }}>{stats?.layer2?.mean}</td>
                    <td style={{ padding: '0.5rem' }}>{stats?.layer2?.min}</td>
                    <td style={{ padding: '0.5rem' }}>{stats?.layer2?.max}</td>
                    <td style={{ padding: '0.5rem' }}>{stats?.layer2?.std}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '0.5rem', fontWeight: 600, color: '#3b82f6' }}>Layer 3 (28–100 cm)</td>
                    <td style={{ padding: '0.5rem' }}>{stats?.layer3?.mean}</td>
                    <td style={{ padding: '0.5rem' }}>{stats?.layer3?.min}</td>
                    <td style={{ padding: '0.5rem' }}>{stats?.layer3?.max}</td>
                    <td style={{ padding: '0.5rem' }}>{stats?.layer3?.std}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="card">
              <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', fontWeight: 600 }}>
                Layer-to-Layer Pearson Correlation
              </h4>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                Actual Pearson correlation coefficients computed across the 580 daily records
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0.6rem', background: 'var(--bg-subtle, #f8fafc)', borderRadius: 4 }}>
                  <span>Layer 1 (0–7 cm) &harr; Layer 2 (7–28 cm):</span>
                  <strong>r = {corrs?.layer1_layer2}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0.6rem', background: 'var(--bg-subtle, #f8fafc)', borderRadius: 4 }}>
                  <span>Layer 2 (7–28 cm) &harr; Layer 3 (28–100 cm):</span>
                  <strong>r = {corrs?.layer2_layer3}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0.6rem', background: 'var(--bg-subtle, #f8fafc)', borderRadius: 4 }}>
                  <span>Layer 1 (0–7 cm) &harr; Layer 3 (28–100 cm):</span>
                  <strong>r = {corrs?.layer1_layer3}</strong>
                </div>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
                Observation: Surface moisture correlates strongly with the intermediate root-zone (r = 0.956), but decouples progressively from the deep root-zone (r = 0.711) due to delayed drainage and moisture inertia.
              </p>
            </div>
          </div>

          {/* Scientific Caveat Alert */}
          <div className="notice-box" style={{ background: '#f8fafc', borderLeft: '4px solid #3b82f6', padding: '0.85rem 1.25rem', borderRadius: 6 }}>
            <h5 style={{ margin: '0 0 0.35rem 0', fontSize: '0.85rem', fontWeight: 600, color: '#1e3a8a' }}>
              Scientific Provenance & Agronomic Interpretation
            </h5>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#334155' }}>
              ECMWF ERA5-Land is a numerical land-surface simulation driven by atmospheric reanalysis (~11 km grid box), not an in-situ capacitive sensor. Generic moisture thresholds (e.g. 0.28 or 0.25 m³/m³) are statistical indicators, <strong>not validated agronomic wilting points</strong> for Akola Vertisols. High clay content (&gt;40%) retains water tightly, shifting field capacity and wilting thresholds substantially compared to sandy or loamy soils.
            </p>
          </div>
        </div>
      )}

      {/* TAB 2: SoilGrids Physical Properties */}
      {activeTab === 'properties' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>
                  ISRIC SoilGrids 2.0 Physical Depth Profile
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Area-wide digital soil mapping profile for Akola (10 km circular AOI, 250 m spatial resolution)
                </span>
              </div>
              <span className="badge badge-green" style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem' }}>
                USDA Texture: <strong>{overallAvg?.usda_texture}</strong>
              </span>
            </div>

            {/* Depth Profile Chart Component */}
            <SoilGridsDepthProfileChart
              textureByDepth={propertiesData?.texture_by_depth}
              depthProfiles={propertiesData?.depth_profiles}
            />
          </div>

          {/* Pedological Context Card */}
          <div className="card">
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', fontWeight: 600 }}>
              Pedological Context: Akola Vertisols (Black Cotton Soils)
            </h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
              Akola district soils belong predominantly to the <strong>Vertisols</strong> order (deep black soils / <em>Regur</em>). Characterized by high smectite/montmorillonite clay content (38% to 43%), these soils exhibit pronounced shrink-swell dynamics, high cation exchange capacity, and substantial water-holding capacity. During the dry season (January–May), deep desiccation cracks develop, while during the monsoon (June–September), infiltration drops as the clay matrix hydrates and seals the surface.
            </p>
          </div>
        </div>
      )}

      {/* TAB 3: In-Situ Field Sensor Staging Slot */}
      {activeTab === 'sensor_upload' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="card">
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: 600 }}>
              In-Situ Capacitive Soil Probe Ingestion Slot
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Upload on-farm capacitive FDR/TDR soil sensor time series (e.g. Sentek, Campbell Scientific, Decagon). Uploads are schema-validated, unit-normalized to standard volumetric fraction (m³/m³), and stored in <code>data/uploads/</code> with <code>user_provided</code> provenance.
            </p>

            {/* Download Template Bar */}
            <div style={{ background: 'var(--bg-subtle, #f8fafc)', border: '1px solid var(--border-color)', borderRadius: 6, padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <strong style={{ fontSize: '0.85rem' }}>Standardized Sensor Schema Template</strong>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
                  Headers: <code>date,sensor_id,depth_cm,soil_moisture,soil_temperature,electrical_conductivity</code>
                </p>
              </div>
              <a
                href={getSoilTemplateURL()}
                download="soil_sensor_template.csv"
                className="btn-secondary btn-sm"
              >
                📥 Download CSV Template
              </a>
            </div>

            {/* Upload Form */}
            <form onSubmit={handleFileUpload} style={{ border: '2px dashed var(--border-color)', borderRadius: 8, padding: '1.5rem', textAlign: 'center', background: '#fafbfc' }}>
              <input
                type="file"
                accept=".csv"
                id="soilSensorInput"
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setSelectedFile(e.target.files[0]);
                    setUploadError(null);
                  }
                }}
              />
              <label htmlFor="soilSensorInput" style={{ cursor: 'pointer', display: 'block' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📡</div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                  {selectedFile ? selectedFile.name : 'Select or Drop Soil Sensor CSV File'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Accepts values as volumetric fraction (0.0 to 1.0) or percentage (0 to 100%)
                </div>
              </label>

              {selectedFile && (
                <div style={{ marginTop: '1rem' }}>
                  <button type="submit" className="btn-primary btn-sm" disabled={uploadLoading}>
                    {uploadLoading ? 'Validating & Normalizing...' : 'Validate & Upload Sensor Log'}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    style={{ marginLeft: '0.5rem' }}
                    onClick={() => setSelectedFile(null)}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </form>

            {/* Validation Error Feedback */}
            {uploadError && (
              <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: '#fef2f2', border: '1px solid #f87171', borderRadius: 6, color: '#991b1b', fontSize: '0.8rem' }}>
                <strong>Validation Error:</strong> {uploadError}
              </div>
            )}

            {/* Upload Success Feedback & Preview */}
            {uploadResult && (
              <div style={{ marginTop: '1.25rem', border: '1px solid #86efac', background: '#f0fdf4', borderRadius: 6, padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <strong style={{ color: '#166534', fontSize: '0.9rem' }}>
                    ✓ Upload Validated & Stored: {uploadResult.filename}
                  </strong>
                  <ProvenanceBadge provenance="user_provided" source={uploadResult.source} />
                </div>
                <p style={{ fontSize: '0.8rem', color: '#166534', margin: '0 0 0.75rem 0' }}>
                  Ingested {uploadResult.total_rows} records from {uploadResult.sensors?.length} probe(s) covering depths {uploadResult.depths_measured_cm?.join(', ')} cm across period {uploadResult.period}.
                </p>

                <h5 style={{ margin: '0.5rem 0', fontSize: '0.8rem' }}>Preview of Normalized Staged Records (m³/m³):</h5>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse', textAlign: 'left', background: '#fff', borderRadius: 4 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #e2e8f0', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '0.35rem' }}>Date</th>
                        <th style={{ padding: '0.35rem' }}>Sensor ID</th>
                        <th style={{ padding: '0.35rem' }}>Depth (cm)</th>
                        <th style={{ padding: '0.35rem' }}>Input Value</th>
                        <th style={{ padding: '0.35rem' }}>Input Unit</th>
                        <th style={{ padding: '0.35rem' }}>Normalized (m³/m³)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {uploadResult.preview?.map((rec, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.35rem' }}>{rec.date}</td>
                          <td style={{ padding: '0.35rem' }}>{rec.sensor_id}</td>
                          <td style={{ padding: '0.35rem' }}>{rec.depth_cm}</td>
                          <td style={{ padding: '0.35rem' }}>{rec.original_moisture}</td>
                          <td style={{ padding: '0.35rem' }}>{rec.original_unit}</td>
                          <td style={{ padding: '0.35rem', fontWeight: 600, color: '#0284c7' }}>
                            {rec.normalized_moisture_m3m3}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
