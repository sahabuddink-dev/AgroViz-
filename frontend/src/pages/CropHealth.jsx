import React, { useEffect, useState } from 'react';
import {
  getCropIndices,
  uploadGeoTIFF,
  computeRasterIndices,
} from '../api/client';
import ProvenanceBadge from '../components/ProvenanceBadge';
import {
  CropIndicesTimeChart,
  RasterIndexDistributionChart,
} from '../components/CropCharts';

export default function CropHealth({ onNavigateTab }) {
  const [activeTab, setActiveTab] = useState('sentinel2'); // 'sentinel2' | 'raster_engine'

  // Sentinel-2 State
  const [cropData, setCropData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [tablePage, setTablePage] = useState(1);
  const recordsPerPage = 12;

  // GeoTIFF Upload & Raster Engine State
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadedMeta, setUploadedMeta] = useState(null);

  // Band Mapping State
  const [bandMapping, setBandMapping] = useState({
    red: '',
    green: '',
    blue: '',
    red_edge: '',
    nir: '',
    swir: '',
  });
  const [selectedIndices, setSelectedIndices] = useState(['NDVI', 'NDRE', 'NDMI']);
  const [computeLoading, setComputeLoading] = useState(false);
  const [computeError, setComputeError] = useState(null);
  const [computeResults, setComputeResults] = useState(null);

  // Fetch Sentinel-2 data
  const fetchSentinelData = async (start = null, end = null) => {
    try {
      setLoading(true);
      setError(null);
      const res = await getCropIndices(start, end);
      setCropData(res.data);
      setTablePage(1);
    } catch (err) {
      console.error('Failed to load Sentinel-2 crop indices:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to load crop health data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSentinelData();
  }, []);

  const handleDateFilterSubmit = (e) => {
    e.preventDefault();
    fetchSentinelData(startDate || null, endDate || null);
  };

  const handlePresetFilter = (preset) => {
    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
      fetchSentinelData(null, null);
    } else if (preset === 'kharif2023') {
      setStartDate('2023-06-05');
      setEndDate('2023-11-30');
      fetchSentinelData('2023-06-05', '2023-11-30');
    } else if (preset === 'kharif2024') {
      setStartDate('2024-06-01');
      setEndDate('2024-11-30');
      fetchSentinelData('2024-06-01', '2024-11-30');
    } else if (preset === 'dry2024') {
      setStartDate('2024-01-01');
      setEndDate('2024-05-31');
      fetchSentinelData('2024-01-01', '2024-05-31');
    }
  };

  // Handle GeoTIFF file selection
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setUploadError(null);
    }
  };

  // Upload GeoTIFF
  const handleUploadGeoTIFF = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    try {
      setUploadLoading(true);
      setUploadError(null);
      setComputeResults(null);
      const res = await uploadGeoTIFF(selectedFile);
      const meta = res.data;
      setUploadedMeta(meta);

      // Pre-fill band mapping from suggested mapping if provided
      if (meta.suggested_band_mapping) {
        setBandMapping({
          red: meta.suggested_band_mapping.red ? String(meta.suggested_band_mapping.red) : '',
          green: meta.suggested_band_mapping.green ? String(meta.suggested_band_mapping.green) : '',
          blue: meta.suggested_band_mapping.blue ? String(meta.suggested_band_mapping.blue) : '',
          red_edge: meta.suggested_band_mapping.red_edge ? String(meta.suggested_band_mapping.red_edge) : '',
          nir: meta.suggested_band_mapping.nir ? String(meta.suggested_band_mapping.nir) : '',
          swir: meta.suggested_band_mapping.swir ? String(meta.suggested_band_mapping.swir) : '',
        });
      }
    } catch (err) {
      console.error('GeoTIFF upload error:', err);
      setUploadError(err.response?.data?.detail || err.message || 'GeoTIFF raster validation failed.');
    } finally {
      setUploadLoading(false);
    }
  };

  // Compute Raster Indices
  const handleComputeIndices = async () => {
    if (!uploadedMeta) return;

    try {
      setComputeLoading(true);
      setComputeError(null);

      // Parse mapping into integer dict
      const mappingPayload = {};
      Object.entries(bandMapping).forEach(([k, v]) => {
        if (v && v !== '') {
          mappingPayload[k] = parseInt(v, 10);
        }
      });

      const res = await computeRasterIndices(
        uploadedMeta.upload_id,
        mappingPayload,
        selectedIndices.length > 0 ? selectedIndices : null
      );
      setComputeResults(res.data);
    } catch (err) {
      console.error('Index computation error:', err);
      setComputeError(err.response?.data?.detail || err.message || 'Failed to compute raster indices.');
    } finally {
      setComputeLoading(false);
    }
  };

  const toggleIndexSelection = (idxName) => {
    if (selectedIndices.includes(idxName)) {
      setSelectedIndices(selectedIndices.filter((x) => x !== idxName));
    } else {
      setSelectedIndices([...selectedIndices, idxName]);
    }
  };

  const stats = cropData?.statistics;
  const records = cropData?.records || [];
  const totalRecords = records.length;
  const totalPages = Math.ceil(totalRecords / recordsPerPage) || 1;
  const paginatedRecords = records.slice(
    (tablePage - 1) * recordsPerPage,
    tablePage * recordsPerPage
  );

  return (
    <div className="crop-page">
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
      {/* Top Module Header */}
      <div className="module-header card" style={{ marginBottom: '1.25rem' }}>
        <div className="header-badge-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700 }}>
              Crop Health & Multispectral Raster Engine
            </h2>
            <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Multi-spectral optical canopy monitoring (Copernicus Sentinel-2 L2A) and user drone/satellite GeoTIFF raster engine
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <ProvenanceBadge provenance="calculated" />
            <span className="provenance-tag tag-model_estimated" title="Akola 10 km Study Radius">
              10 km AOI Buffer
            </span>
          </div>
        </div>

        {/* High-Level Metric Stat Cards */}
        <div className="grid-4" style={{ marginTop: '1.25rem', gap: '1rem' }}>
          <div className="stat-card">
            <span className="stat-label">NDVI (Canopy Vigor / Greenness)</span>
            <span className="stat-val" style={{ color: '#16a34a' }}>
              {stats?.ndvi?.latest ?? '—'}
            </span>
            <span className="stat-sub">
              Mean: {stats?.ndvi?.mean ?? '—'} | Range: {stats?.ndvi?.min ?? '—'} to {stats?.ndvi?.max ?? '—'}
            </span>
          </div>

          <div className="stat-card">
            <span className="stat-label">NDRE (Red Edge Chlorophyll)</span>
            <span className="stat-val" style={{ color: '#9333ea' }}>
              {stats?.ndre?.latest ?? '—'}
            </span>
            <span className="stat-sub">
              Mean: {stats?.ndre?.mean ?? '—'} | Range: {stats?.ndre?.min ?? '—'} to {stats?.ndre?.max ?? '—'}
            </span>
          </div>

          <div className="stat-card">
            <span className="stat-label">NDMI (Canopy Liquid Water)</span>
            <span className="stat-val" style={{ color: '#0284c7' }}>
              {stats?.ndmi?.latest ?? '—'}
            </span>
            <span className="stat-sub">
              Mean: {stats?.ndmi?.mean ?? '—'} | Range: {stats?.ndmi?.min ?? '—'} to {stats?.ndmi?.max ?? '—'}
            </span>
          </div>

          <div className="stat-card">
            <span className="stat-label">Optical Observation Coverage</span>
            <span className="stat-val" style={{ color: 'var(--text-main)' }}>
              {cropData?.total_observation_dates ?? 80} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>dates</span>
            </span>
            <span className="stat-sub">
              Avg Cloud: {stats?.coverage?.mean_cloud_percentage ?? 15.6}% | June 2023–Dec 2024
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="tab-bar card" style={{ display: 'flex', gap: '0.5rem', padding: '0.5rem 1rem', marginBottom: '1.25rem' }}>
        <button
          className={`btn-sm ${activeTab === 'sentinel2' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('sentinel2')}
        >
          🛰️ Sentinel-2 Regional Monitoring (Akola AOI)
        </button>
        <button
          className={`btn-sm ${activeTab === 'raster_engine' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('raster_engine')}
        >
          🗺️ User Field GeoTIFF Raster Engine
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SECTION A: Sentinel-2 Regional Monitoring                                 */}
      {/* ========================================================================= */}
      {activeTab === 'sentinel2' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Spatial AOI Scientific Scope Banner */}
          <div className="card" style={{ background: '#f8fafc', borderLeft: '4px solid #0284c7', padding: '0.85rem 1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.25rem' }}>ℹ️</span>
              <div style={{ fontSize: '0.85rem', color: '#334155', lineHeight: 1.5 }}>
                <strong>Spatial Scope & Aggregation Disclosure:</strong> These multi-spectral indices are derived from
                Copernicus Sentinel-2 L2A (Harmonized) over the entire <strong>10 km radius buffer around Akola, Maharashtra (20.7069°N, 77.0022°E)</strong>.
                Daily values represent simple unweighted spatial means across bare soil, diverse vegetation, and mixed agricultural land.
                They reflect <em>macro-level regional vegetative conditions</em> and must <strong>not</strong> be interpreted as measurements from a single cotton field.
              </div>
            </div>
          </div>

          {/* July Monsoon Cloud Gap Alert */}
          <div className="card" style={{ background: '#fffbeb', borderLeft: '4px solid #f59e0b', padding: '0.85rem 1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.25rem' }}>☁️</span>
              <div style={{ fontSize: '0.85rem', color: '#92400e', lineHeight: 1.5 }}>
                <strong>Monsoon Optical Occlusion Notice (July 2023 & July 2024 Cloud Gaps):</strong>
                Zero valid optical surface observations occurred in July 2023 and July 2024 due to persistent southwest monsoon cloud cover (&gt;99% scene cloud mask).
                In accordance with AgroViz scientific integrity standards, <strong>these missing dates are preserved as observed reality and are never interpolated, backfilled, or fabricated</strong>.
              </div>
            </div>
          </div>

          {/* Quick Filters & Controls */}
          <div className="card" style={{ padding: '0.75rem 1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Quick Presets:</span>
                <button className="btn-secondary btn-sm" onClick={() => handlePresetFilter('all')}>
                  All 80 Observations
                </button>
                <button className="btn-secondary btn-sm" onClick={() => handlePresetFilter('kharif2023')}>
                  Kharif 2023 (Jun–Nov)
                </button>
                <button className="btn-secondary btn-sm" onClick={() => handlePresetFilter('dry2024')}>
                  Dry Season 2024 (Jan–May)
                </button>
                <button className="btn-secondary btn-sm" onClick={() => handlePresetFilter('kharif2024')}>
                  Kharif 2024 (Jun–Nov)
                </button>
              </div>

              <form onSubmit={handleDateFilterSubmit} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="date"
                  className="input-sm"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  placeholder="Start Date"
                />
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>to</span>
                <input
                  type="date"
                  className="input-sm"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  placeholder="End Date"
                />
                <button type="submit" className="btn-primary btn-sm">
                  Apply Filter
                </button>
                {(startDate || endDate) && (
                  <button type="button" className="btn-secondary btn-sm" onClick={() => handlePresetFilter('all')}>
                    Reset
                  </button>
                )}
              </form>
            </div>
          </div>

          {/* Sentinel-2 Time-Series Chart */}
          {loading && !cropData ? (
            <div className="card loading-card" style={{ padding: '2rem', textAlign: 'center' }}>
              <div className="spinner"></div>
              <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>Loading Sentinel-2 Multi-Spectral Indices...</p>
            </div>
          ) : error ? (
            <div className="card error-card" style={{ padding: '1.5rem', color: '#991b1b', background: '#fee2e2' }}>
              <strong>Error Loading Crop Data:</strong> {error}
            </div>
          ) : (
            <CropIndicesTimeChart records={records} />
          )}

          {/* Index Scientific Interpretations & Formulas */}
          <div className="grid-3" style={{ gap: '1rem' }}>
            <div className="card" style={{ padding: '1rem', borderTop: '3px solid #16a34a' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ color: '#16a34a', fontSize: '0.95rem' }}>NDVI (Vegetation Index)</strong>
                <code style={{ fontSize: '0.75rem', background: '#f1f5f9', padding: '0.15rem 0.35rem', borderRadius: 4 }}>
                  (B8 - B4) / (B8 + B4)
                </code>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#475569', marginTop: '0.5rem', lineHeight: 1.45 }}>
                Measures broad photosynthetic canopy activity and chlorophyll absorption using Near-Infrared (842 nm) and Red (665 nm).
                Indicates overall vegetative density and vigor.
              </p>
            </div>

            <div className="card" style={{ padding: '1rem', borderTop: '3px solid #9333ea' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ color: '#9333ea', fontSize: '0.95rem' }}>NDRE (Red Edge Index)</strong>
                <code style={{ fontSize: '0.75rem', background: '#f1f5f9', padding: '0.15rem 0.35rem', borderRadius: 4 }}>
                  (B8A - B5) / (B8A + B5)
                </code>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#475569', marginTop: '0.5rem', lineHeight: 1.45 }}>
                Employs the narrow Red Edge band (705 nm) to assess chlorophyll content in dense canopies.
                Unlike NDVI, NDRE resists early saturation during peak canopy closure and is sensitive to nitrogen status.
              </p>
            </div>

            <div className="card" style={{ padding: '1rem', borderTop: '3px solid #0284c7' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ color: '#0284c7', fontSize: '0.95rem' }}>NDMI (Moisture Index)</strong>
                <code style={{ fontSize: '0.75rem', background: '#f1f5f9', padding: '0.15rem 0.35rem', borderRadius: 4 }}>
                  (B8A - B11) / (B8A + B11)
                </code>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#475569', marginTop: '0.5rem', lineHeight: 1.45 }}>
                Calculates canopy liquid water content by comparing Narrow NIR (865 nm) with Shortwave Infrared (1610 nm).
                Sensitive to crop water stress; does <strong>not</strong> measure soil volumetric moisture.
              </p>
            </div>
          </div>

          {/* Observations Data Table */}
          <div className="card" style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>
                Sentinel-2 Daily Observation Log ({totalRecords} total dates)
              </h4>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.8rem' }}>
                <button
                  className="btn-secondary btn-sm"
                  disabled={tablePage === 1}
                  onClick={() => setTablePage((p) => Math.max(1, p - 1))}
                >
                  &larr; Prev
                </button>
                <span>
                  Page {tablePage} of {totalPages}
                </span>
                <button
                  className="btn-secondary btn-sm"
                  disabled={tablePage === totalPages}
                  onClick={() => setTablePage((p) => Math.min(totalPages, p + 1))}
                >
                  Next &rarr;
                </button>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ width: '100%', fontSize: '0.8rem' }}>
                <thead>
                  <tr>
                    <th>Observation Date</th>
                    <th>NDVI Mean</th>
                    <th>NDRE Mean</th>
                    <th>NDMI Mean</th>
                    <th>Cloud %</th>
                    <th>Valid Pixels</th>
                    <th>Tiles</th>
                    <th>Provenance</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRecords.map((r, i) => (
                    <tr key={i}>
                      <td><strong>{r.date}</strong></td>
                      <td style={{ color: '#16a34a', fontWeight: 600 }}>{r.ndvi}</td>
                      <td style={{ color: '#9333ea', fontWeight: 600 }}>{r.ndre}</td>
                      <td style={{ color: '#0284c7', fontWeight: 600 }}>{r.ndmi}</td>
                      <td>{r.cloud_percentage}%</td>
                      <td>{r.valid_pixels?.toLocaleString()}</td>
                      <td>{r.tile_count}</td>
                      <td><ProvenanceBadge provenance="calculated" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION B: User Field Multispectral Raster Engine                         */}
      {/* ========================================================================= */}
      {activeTab === 'raster_engine' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* User Data Pipeline Banner */}
          <div className="card" style={{ background: '#f0fdf4', borderLeft: '4px solid #16a34a', padding: '0.85rem 1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.25rem' }}>🛰️</span>
              <div style={{ fontSize: '0.85rem', color: '#166534', lineHeight: 1.5 }}>
                <strong>User-Provided Field Data Pipeline:</strong> Upload your own multi-band drone or satellite GeoTIFF (.tif, .tiff)
                such as imagery from MicaSense RedEdge, DJI Mavic 3 Multispectral, or PlanetScope.
                The engine inspects TIFF headers and geokeys, lets you map spectral bands, computes vegetative indices (NDVI, NDRE, NDMI),
                and derives zonal pixel statistics and spatial distribution histograms.
              </div>
            </div>
          </div>

          {/* Upload Dropzone */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: 600 }}>
              1. Ingest Multispectral GeoTIFF Raster
            </h3>
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Select a valid single- or multi-band GeoTIFF raster (.tif, .tiff). Maximum recommended file size: 50 MB.
            </p>

            <form onSubmit={handleUploadGeoTIFF} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div
                style={{
                  border: '2px dashed var(--border-color)',
                  borderRadius: 8,
                  padding: '1.5rem',
                  textAlign: 'center',
                  background: '#fafbfc',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="file"
                  id="geotiff-file"
                  accept=".tif,.tiff"
                  onChange={handleFileChange}
                  style={{ display: 'block', margin: '0 auto' }}
                />
                {selectedFile && (
                  <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--accent-green)' }}>
                    Selected file: <strong>{selectedFile.name}</strong> ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </div>
                )}
              </div>

              {uploadError && (
                <div style={{ padding: '0.75rem', background: '#fee2e2', color: '#991b1b', borderRadius: 6, fontSize: '0.85rem' }}>
                  <strong>Upload / Validation Error:</strong> {uploadError}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={!selectedFile || uploadLoading}
                  style={{ minWidth: 160 }}
                >
                  {uploadLoading ? 'Validating Raster...' : 'Upload & Validate GeoTIFF'}
                </button>
              </div>
            </form>
          </div>

          {/* Validated Metadata Card */}
          {uploadedMeta && (
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600 }}>
                  2. Validated Raster Characteristics & Georeference
                </h3>
                <ProvenanceBadge provenance="user_provided" />
              </div>

              <div className="grid-3" style={{ gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: 6, border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Original File Name</div>
                  <strong style={{ fontSize: '0.85rem' }}>{uploadedMeta.original_filename}</strong>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    ID: <code>{uploadedMeta.upload_id}</code>
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: 6, border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Dimensions & Bands</div>
                  <strong style={{ fontSize: '0.85rem' }}>
                    {uploadedMeta.width} &times; {uploadedMeta.height} px ({uploadedMeta.band_count} Bands)
                  </strong>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Total Pixels: {uploadedMeta.total_pixels?.toLocaleString()} | Dtype: {uploadedMeta.data_type}
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: 6, border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Coordinate Reference System</div>
                  <strong style={{ fontSize: '0.85rem' }}>{uploadedMeta.crs}</strong>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    NoData Value: {uploadedMeta.nodata_value !== null ? uploadedMeta.nodata_value : 'None detected'}
                  </div>
                </div>
              </div>

              {uploadedMeta.bounds && (
                <div style={{ background: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: 6, border: '1px solid var(--border-color)', fontSize: '0.75rem', marginBottom: '1.25rem' }}>
                  <strong>Spatial Bounding Coordinates:</strong> Min X: {uploadedMeta.bounds.min_x}, Min Y: {uploadedMeta.bounds.min_y}, Max X: {uploadedMeta.bounds.max_x}, Max Y: {uploadedMeta.bounds.max_y}
                </div>
              )}

              {/* Band Mapping Section */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', fontWeight: 600 }}>
                  3. Spectral Band Assignment (1-Indexed Band Mapping)
                </h4>
                <p style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Assign each required spectral channel to its corresponding raster layer (1 to {uploadedMeta.band_count}).
                </p>

                <div className="grid-3" style={{ gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem', color: '#dc2626' }}>
                      Red Band * (for NDVI)
                    </label>
                    <select
                      className="input-sm"
                      style={{ width: '100%' }}
                      value={bandMapping.red}
                      onChange={(e) => setBandMapping({ ...bandMapping, red: e.target.value })}
                    >
                      <option value="">-- Unmapped --</option>
                      {Array.from({ length: uploadedMeta.band_count }, (_, i) => i + 1).map((b) => (
                        <option key={b} value={b}>Band {b}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem', color: '#16a34a' }}>
                      NIR Band * (for NDVI, NDRE, NDMI)
                    </label>
                    <select
                      className="input-sm"
                      style={{ width: '100%' }}
                      value={bandMapping.nir}
                      onChange={(e) => setBandMapping({ ...bandMapping, nir: e.target.value })}
                    >
                      <option value="">-- Unmapped --</option>
                      {Array.from({ length: uploadedMeta.band_count }, (_, i) => i + 1).map((b) => (
                        <option key={b} value={b}>Band {b}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem', color: '#9333ea' }}>
                      Red Edge Band (for NDRE)
                    </label>
                    <select
                      className="input-sm"
                      style={{ width: '100%' }}
                      value={bandMapping.red_edge}
                      onChange={(e) => setBandMapping({ ...bandMapping, red_edge: e.target.value })}
                    >
                      <option value="">-- Unmapped --</option>
                      {Array.from({ length: uploadedMeta.band_count }, (_, i) => i + 1).map((b) => (
                        <option key={b} value={b}>Band {b}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem', color: '#0284c7' }}>
                      SWIR Band (for NDMI)
                    </label>
                    <select
                      className="input-sm"
                      style={{ width: '100%' }}
                      value={bandMapping.swir}
                      onChange={(e) => setBandMapping({ ...bandMapping, swir: e.target.value })}
                    >
                      <option value="">-- Unmapped --</option>
                      {Array.from({ length: uploadedMeta.band_count }, (_, i) => i + 1).map((b) => (
                        <option key={b} value={b}>Band {b}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem', color: '#475569' }}>
                      Green Band (Optional)
                    </label>
                    <select
                      className="input-sm"
                      style={{ width: '100%' }}
                      value={bandMapping.green}
                      onChange={(e) => setBandMapping({ ...bandMapping, green: e.target.value })}
                    >
                      <option value="">-- Unmapped --</option>
                      {Array.from({ length: uploadedMeta.band_count }, (_, i) => i + 1).map((b) => (
                        <option key={b} value={b}>Band {b}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem', color: '#2563eb' }}>
                      Blue Band (Optional)
                    </label>
                    <select
                      className="input-sm"
                      style={{ width: '100%' }}
                      value={bandMapping.blue}
                      onChange={(e) => setBandMapping({ ...bandMapping, blue: e.target.value })}
                    >
                      <option value="">-- Unmapped --</option>
                      {Array.from({ length: uploadedMeta.band_count }, (_, i) => i + 1).map((b) => (
                        <option key={b} value={b}>Band {b}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Index Checklist */}
                <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Indices to Compute:</span>
                  {['NDVI', 'NDRE', 'NDMI'].map((idx) => (
                    <label key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={selectedIndices.includes(idx)}
                        onChange={() => toggleIndexSelection(idx)}
                      />
                      {idx}
                    </label>
                  ))}
                </div>

                {computeError && (
                  <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#fee2e2', color: '#991b1b', borderRadius: 6, fontSize: '0.85rem' }}>
                    <strong>Computation Error:</strong> {computeError}
                  </div>
                )}

                <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    className="btn-primary"
                    onClick={handleComputeIndices}
                    disabled={computeLoading || (!bandMapping.red && !bandMapping.nir)}
                  >
                    {computeLoading ? 'Calculating Indices...' : 'Compute Multispectral Indices'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Computed Results Card */}
          {computeResults && computeResults.indices && (
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                  4. Computed Zonal Statistics & Spatial Distribution
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Computed at {new Date(computeResults.computed_at).toLocaleTimeString()}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {Object.entries(computeResults.indices).map(([idxKey, idxData]) => {
                  if (idxData.status === 'unavailable') {
                    return (
                      <div key={idxKey} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong style={{ color: '#64748b', fontSize: '0.95rem' }}>{idxData.name} ({idxKey})</strong>
                          <span className="provenance-tag tag-unavailable">Unavailable</span>
                        </div>
                        <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: '#dc2626' }}>
                          {idxData.reason}
                        </p>
                      </div>
                    );
                  }

                  // Calculated index with full stats and histogram
                  return (
                    <div key={idxKey} style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 8, padding: '1.25rem', boxShadow: 'var(--shadow-sm)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div>
                          <strong style={{ fontSize: '1rem', color: idxKey === 'NDVI' ? '#16a34a' : idxKey === 'NDRE' ? '#9333ea' : '#0284c7' }}>
                            {idxData.name}
                          </strong>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Formula: <code>{idxData.formula}</code>
                          </div>
                        </div>
                        <ProvenanceBadge provenance="calculated" />
                      </div>

                      {/* Zonal Metrics */}
                      <div className="grid-5" style={{ gap: '0.75rem', marginTop: '0.5rem' }}>
                        <div style={{ background: '#f8fafc', padding: '0.5rem 0.75rem', borderRadius: 6, textAlign: 'center' }}>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Mean</div>
                          <strong style={{ fontSize: '1.05rem' }}>{idxData.mean}</strong>
                        </div>
                        <div style={{ background: '#f8fafc', padding: '0.5rem 0.75rem', borderRadius: 6, textAlign: 'center' }}>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Median</div>
                          <strong style={{ fontSize: '1.05rem' }}>{idxData.median}</strong>
                        </div>
                        <div style={{ background: '#f8fafc', padding: '0.5rem 0.75rem', borderRadius: 6, textAlign: 'center' }}>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Min Value</div>
                          <strong style={{ fontSize: '1.05rem' }}>{idxData.min}</strong>
                        </div>
                        <div style={{ background: '#f8fafc', padding: '0.5rem 0.75rem', borderRadius: 6, textAlign: 'center' }}>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Max Value</div>
                          <strong style={{ fontSize: '1.05rem' }}>{idxData.max}</strong>
                        </div>
                        <div style={{ background: '#f8fafc', padding: '0.5rem 0.75rem', borderRadius: 6, textAlign: 'center' }}>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Std Dev</div>
                          <strong style={{ fontSize: '1.05rem' }}>{idxData.std}</strong>
                        </div>
                      </div>

                      {/* Histogram */}
                      <RasterIndexDistributionChart indexName={idxKey} stats={idxData} />
                    </div>
                  );
                })}
              </div>

              {/* Scientific Notes */}
              <div style={{ marginTop: '1.25rem', padding: '0.75rem 1rem', background: '#fafbfc', borderRadius: 6, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <strong>Scientific Disclaimer:</strong> Multispectral vegetation indices reflect relative canopy greenness,
                pigment density, and liquid water content. They do <strong>not</strong> identify specific pest infestations (such as Pink Bollworm)
                or diagnose specific fungal/bacterial diseases without in-situ ground validation.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
