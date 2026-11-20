import React, { useState } from 'react';
import { uploadGeoTIFF, uploadSoilSensorLog, getSoilTemplateURL } from '../api/client';
import ProvenanceBadge from '../components/ProvenanceBadge';

export default function DataInputHub({ onNavigateTab }) {
  // GeoTIFF Upload State
  const [tiffFile, setTiffFile] = useState(null);
  const [tiffUploading, setTiffUploading] = useState(false);
  const [tiffResult, setTiffResult] = useState(null);
  const [tiffError, setTiffError] = useState(null);

  // In-Situ CSV Upload State
  const [csvFile, setCsvFile] = useState(null);
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvResult, setCsvResult] = useState(null);
  const [csvError, setCsvError] = useState(null);

  const handleUploadGeoTIFF = async (e) => {
    e.preventDefault();
    if (!tiffFile) return;
    try {
      setTiffUploading(true);
      setTiffError(null);
      const res = await uploadGeoTIFF(tiffFile);
      setTiffResult(res.data);
    } catch (err) {
      console.error('GeoTIFF upload error:', err);
      setTiffError(err.response?.data?.detail || err.message || 'Failed to upload GeoTIFF raster.');
    } finally {
      setTiffUploading(false);
    }
  };

  const handleUploadCSV = async (e) => {
    e.preventDefault();
    if (!csvFile) return;
    try {
      setCsvUploading(true);
      setCsvError(null);
      const res = await uploadSoilSensorLog(csvFile);
      setCsvResult(res.data);
    } catch (err) {
      console.error('Sensor upload error:', err);
      setCsvError(err.response?.data?.detail || err.message || 'Failed to upload in-situ sensor CSV.');
    } finally {
      setCsvUploading(false);
    }
  };

  return (
    <div className="data-input-root" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header Card */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.5rem' }}>📥</span>
              <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700 }}>Multi-Modal Data Ingestion Hub</h2>
            </div>
            <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Ingest, inspect, and synchronize multi-sensor satellite imagery (Sentinel-2 MSI, Sentinel-1 SAR), gridded reanalysis (ERA5-Land, CHIRPS), and ground-truth in-situ sensors.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <ProvenanceBadge provenance="measured" />
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => onNavigateTab('datasets')}
            >
              📚 Dataset Catalog & Integrity &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Active Ingested Data Streams Overview */}
      <div className="grid-3" style={{ gap: '1rem' }}>
        {/* Stream 1: Sentinel-2 MSI */}
        <div className="card" style={{ padding: '1.25rem', borderTop: '4px solid #16a34a' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>🛰️</span>
              <strong style={{ fontSize: '0.95rem' }}>Sentinel-2 Optical (MSI)</strong>
            </div>
            <span style={{ fontSize: '0.65rem', background: '#dcfce7', color: '#15803d', padding: '0.1rem 0.4rem', borderRadius: 3, fontWeight: 700 }}>
              Active
            </span>
          </div>
          <p style={{ fontSize: '0.75rem', color: '#475569', margin: '0.5rem 0 0.75rem 0' }}>
            8 Surface Reflectance Bands (B2, B3, B4, B5, B8, B8A, B11, B12) at 10m/20m spatial resolution across 30 zones.
          </p>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <div>• Records: <strong>2,053 clean zonal observations</strong></div>
            <div>• Period: <strong>June 2023 – Dec 2024</strong></div>
            <div>• Indices: <strong>NDVI, NDRE, NDMI, BSI</strong></div>
          </div>
        </div>

        {/* Stream 2: Sentinel-1 SAR GRD */}
        <div className="card" style={{ padding: '1.25rem', borderTop: '4px solid #4f46e5' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>📡</span>
              <strong style={{ fontSize: '0.95rem' }}>Sentinel-1 SAR Radar (C-Band)</strong>
            </div>
            <span style={{ fontSize: '0.65rem', background: '#e0e7ff', color: '#4338ca', padding: '0.1rem 0.4rem', borderRadius: 3, fontWeight: 700 }}>
              Active
            </span>
          </div>
          <p style={{ fontSize: '0.75rem', color: '#475569', margin: '0.5rem 0 0.75rem 0' }}>
            Dual-polarization SAR backscatter (VH and VV in dB & linear). All-weather, cloud-penetrating biomass tracking.
          </p>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <div>• Records: <strong>1,230 zonal acquisitions</strong></div>
            <div>• Dual Bands: <strong>VH (Volumetric) & VV (Surface)</strong></div>
            <div>• Cloud Independent: <strong>Zero Monsoon Gap</strong></div>
          </div>
        </div>

        {/* Stream 3: Environmental Grids */}
        <div className="card" style={{ padding: '1.25rem', borderTop: '4px solid #0284c7' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>🌦️</span>
              <strong style={{ fontSize: '0.95rem' }}>ERA5-Land & CHIRPS Grids</strong>
            </div>
            <span style={{ fontSize: '0.65rem', background: '#e0f2fe', color: '#0369a1', padding: '0.1rem 0.4rem', borderRadius: 3, fontWeight: 700 }}>
              Active
            </span>
          </div>
          <p style={{ fontSize: '0.75rem', color: '#475569', margin: '0.5rem 0 0.75rem 0' }}>
            Gridded daily surface temperature, 3-depth volumetric soil water (0-100cm), and high-resolution precipitation.
          </p>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <div>• Records: <strong>17,400 daily zonal series</strong></div>
            <div>• Soil Depths: <strong>0-7cm, 7-28cm, 28-100cm</strong></div>
            <div>• Rainfall: <strong>CHIRPS 0.05° Gridded Daily</strong></div>
          </div>
        </div>
      </div>

      {/* Upload Section: GeoTIFF & In-Situ Sensor Logs */}
      <div className="grid-2" style={{ gap: '1.25rem' }}>
        {/* Card 1: GeoTIFF Raster Ingest */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '1.2rem' }}>🗺️</span>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600 }}>Upload Field GeoTIFF Raster</h3>
          </div>
          <p style={{ fontSize: '0.75rem', color: '#475569', marginBottom: '1rem', lineHeight: 1.4 }}>
            Upload multispectral drone orthomosaics or satellite GeoTIFF files. Automated CRS extraction, bounding box computation, and band mapping.
          </p>

          <form onSubmit={handleUploadGeoTIFF} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <input
              type="file"
              accept=".tif,.tiff"
              onChange={(e) => setTiffFile(e.target.files?.[0] || null)}
              className="input-sm"
              style={{ fontSize: '0.75rem' }}
            />

            {tiffError && (
              <div style={{ padding: '0.5rem', background: '#fee2e2', color: '#991b1b', borderRadius: 4, fontSize: '0.75rem' }}>
                {tiffError}
              </div>
            )}

            {tiffResult && (
              <div style={{ padding: '0.6rem', background: '#dcfce7', border: '1px solid #86efac', borderRadius: 4, fontSize: '0.75rem', color: '#166534' }}>
                <div>✓ Uploaded: <strong>{tiffResult.original_filename}</strong></div>
                <div>Dimensions: {tiffResult.width} × {tiffResult.height} ({tiffResult.band_count} bands)</div>
                <div>CRS: {tiffResult.crs}</div>
              </div>
            )}

            <button
              type="submit"
              className="btn-primary btn-sm"
              disabled={!tiffFile || tiffUploading}
              style={{ alignSelf: 'flex-start', fontSize: '0.8rem', padding: '0.35rem 0.85rem' }}
            >
              {tiffUploading ? 'Validating GeoTIFF...' : 'Upload & Validate GeoTIFF'}
            </button>
          </form>
        </div>

        {/* Card 2: In-Situ Soil Sensor CSV Upload */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '1.2rem' }}>🧪</span>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600 }}>Upload In-Situ IoT Sensor CSV</h3>
          </div>
          <p style={{ fontSize: '0.75rem', color: '#475569', marginBottom: '1rem', lineHeight: 1.4 }}>
            Upload calibrated soil sensor observations (depth in cm, volumetric moisture in m³/m³ or %).
          </p>

          <form onSubmit={handleUploadCSV} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
              className="input-sm"
              style={{ fontSize: '0.75rem' }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <a
                href={getSoilTemplateURL()}
                download="agroviz_soil_sensor_template.csv"
                style={{ fontSize: '0.75rem', color: '#0284c7', textDecoration: 'none' }}
              >
                📥 Download CSV Template
              </a>
            </div>

            {csvError && (
              <div style={{ padding: '0.5rem', background: '#fee2e2', color: '#991b1b', borderRadius: 4, fontSize: '0.75rem' }}>
                {csvError}
              </div>
            )}

            {csvResult && (
              <div style={{ padding: '0.6rem', background: '#dcfce7', border: '1px solid #86efac', borderRadius: 4, fontSize: '0.75rem', color: '#166534' }}>
                <div>✓ Successfully Ingested: {csvResult.valid_records_count} records</div>
                <div>Status: Validated with schema consistency check.</div>
              </div>
            )}

            <button
              type="submit"
              className="btn-primary btn-sm"
              disabled={!csvFile || csvUploading}
              style={{ alignSelf: 'flex-start', fontSize: '0.8rem', padding: '0.35rem 0.85rem' }}
            >
              {csvUploading ? 'Validating CSV...' : 'Ingest Sensor Observations'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
