import React, { useEffect, useState } from 'react';
import { getDatasetPreview, getDatasetProfile } from '../api/client';
import ProvenanceBadge from '../components/ProvenanceBadge';

export default function DatasetDetailModal({ dataset, onClose }) {
  const [activeSubTab, setActiveSubTab] = useState('preview');
  const [limit, setLimit] = useState(10);
  const [previewData, setPreviewData] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function loadDetails() {
      if (!dataset) return;
      try {
        setLoading(true);
        setError(null);
        const [prev, prof] = await Promise.all([
          getDatasetPreview(dataset.id, limit),
          getDatasetProfile(dataset.id),
        ]);
        if (isMounted) {
          setPreviewData(prev);
          setProfileData(prof);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error fetching dataset inspection details:', err);
          setError(err.message || 'Failed to load dataset details.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadDetails();
    return () => { isMounted = false; };
  }, [dataset, limit]);

  if (!dataset) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="modal-category">{dataset.role_category.toUpperCase()} DATASET</span>
            <h2 className="modal-title">{dataset.role}</h2>
            <code className="modal-filename">{dataset.canonical_filename}</code>
          </div>
          <button className="btn-close" onClick={onClose} title="Close Inspection View">✕</button>
        </div>

        <div className="modal-meta-bar">
          <div className="meta-pill">
            <span className="pill-label">Provenance:</span>
            <ProvenanceBadge provenance={dataset.provenance} />
          </div>
          <div className="meta-pill">
            <span className="pill-label">Source:</span>
            <span className="pill-value">{dataset.source}</span>
          </div>
          <div className="meta-pill">
            <span className="pill-label">Period:</span>
            <span className="pill-value">{dataset.period}</span>
          </div>
          <div className="meta-pill">
            <span className="pill-label">Units:</span>
            <span className="pill-value">{dataset.units}</span>
          </div>
          {dataset.size_bytes && (
            <div className="meta-pill">
              <span className="pill-label">File Size:</span>
              <span className="pill-value">{(dataset.size_bytes / 1024).toFixed(1)} KB</span>
            </div>
          )}
        </div>

        <div className="modal-tabs">
          <button
            className={`modal-tab ${activeSubTab === 'preview' ? 'modal-tab-active' : ''}`}
            onClick={() => setActiveSubTab('preview')}
          >
            📋 Data Preview
          </button>
          <button
            className={`modal-tab ${activeSubTab === 'profile' ? 'modal-tab-active' : ''}`}
            onClick={() => setActiveSubTab('profile')}
          >
            🔍 Quality & Profile
          </button>
          <button
            className={`modal-tab ${activeSubTab === 'notes' ? 'modal-tab-active' : ''}`}
            onClick={() => setActiveSubTab('notes')}
          >
            ⚠️ Methodological Caveats ({dataset.notes?.length || 0})
          </button>
        </div>

        <div className="modal-body">
          {loading && (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Fetching dataset details and real records from API...</p>
            </div>
          )}

          {error && (
            <div className="notice-box" style={{ borderLeftColor: '#ef4444' }}>
              <strong>API Inspection Error:</strong>
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && activeSubTab === 'preview' && (
            <div className="tab-pane">
              <div className="preview-controls">
                <span className="control-label">Showing sample records:</span>
                <select
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="select-sm"
                >
                  <option value={5}>First 5 rows</option>
                  <option value={10}>First 10 rows</option>
                  <option value={25}>First 25 rows</option>
                </select>
                {previewData?.data?.total_rows && (
                  <span className="preview-count">Total rows in dataset: <strong>{previewData.data.total_rows}</strong></span>
                )}
                {previewData?.data?.total_scenes && (
                  <span className="preview-count">De-duplicated scenes: <strong>{previewData.data.total_scenes}</strong> (Daily dates: <strong>{previewData.data.daily_dates}</strong>)</span>
                )}
              </div>

              {previewData?.data?.preview_rows ? (
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        {previewData.data.columns.map((col) => (
                          <th key={col}>{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.data.preview_rows.map((row, idx) => (
                        <tr key={idx}>
                          <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{idx + 1}</td>
                          {previewData.data.columns.map((col) => {
                            const val = row[col];
                            return (
                              <td key={col} title={String(val)}>
                                {typeof val === 'number'
                                  ? val % 1 === 0
                                    ? val
                                    : val.toFixed(4)
                                  : typeof val === 'boolean'
                                  ? val ? 'true' : 'false'
                                  : String(val ?? '—')}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : previewData?.data?.akola_seasonal_records ? (
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Season</th>
                        <th>NBt Loculi Damage (%)</th>
                        <th>Bt Loculi Damage (%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.data.akola_seasonal_records.map((r, idx) => (
                        <tr key={idx}>
                          <td><strong>{r.season}</strong></td>
                          <td>{r.nbt_loculi_damage_pct}%</td>
                          <td>{r.bt_loculi_damage_pct}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="notice-box" style={{ marginTop: '1rem' }}>
                    <strong>Published Akola 5-season Bt mean:</strong> {previewData.data.akola_bt_5season_mean}% loculi damage.
                  </div>
                </div>
              ) : (
                <p>No preview rows available for this dataset schema.</p>
              )}
            </div>
          )}

          {!loading && !error && activeSubTab === 'profile' && profileData?.data && (
            <div className="tab-pane">
              <div className="profile-summary-header">
                <div>
                  <span className="profile-status-badge status-healthy">
                    ✓ Validation Status: {profileData.data.quality_status}
                  </span>
                </div>
                <div className="profile-metrics">
                  {profileData.data.row_count && <span>Total Rows: <strong>{profileData.data.row_count}</strong></span>}
                  {profileData.data.column_count && <span>Columns: <strong>{profileData.data.column_count}</strong></span>}
                  {profileData.data.date_range && (
                    <span>Coverage: <strong>{profileData.data.date_range.min}</strong> to <strong>{profileData.data.date_range.max}</strong></span>
                  )}
                </div>
              </div>

              <div className="card" style={{ marginTop: '1rem' }}>
                <h4 className="card-subtitle">Automated Data Quality Checks</h4>
                <div className="checklist">
                  {profileData.data.quality_checks?.map((chk, idx) => (
                    <div key={idx} className="check-item">
                      <span className={`check-icon ${chk.passed ? 'check-passed' : 'check-failed'}`}>
                        {chk.passed ? '✓' : '✗'}
                      </span>
                      <span className="check-name">{chk.name}</span>
                      <span className="check-status">{chk.passed ? 'PASSED' : 'FAILED'}</span>
                    </div>
                  ))}
                </div>
              </div>

              {profileData.data.null_counts && (
                <div className="card" style={{ marginTop: '1rem' }}>
                  <h4 className="card-subtitle">Missing Value / Null Analysis</h4>
                  <div className="null-tags-grid">
                    {Object.entries(profileData.data.null_counts).map(([col, cnt]) => (
                      <div key={col} className={`null-tag ${cnt === 0 ? 'null-zero' : 'null-has'}`}>
                        <code>{col}</code>: {cnt} nulls
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {profileData.data.comparison_stats && (
                <div className="card" style={{ marginTop: '1rem', borderLeft: '3px solid var(--accent-amber)' }}>
                  <h4 className="card-subtitle">Planetary Computer vs GEE Validation Comparison</h4>
                  <p style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>{profileData.data.comparison_stats.note}</p>
                  <div className="metrics-grid">
                    <div className="metric-box">
                      <span className="metric-label">NDVI Correlation with GEE</span>
                      <span className="metric-val">{profileData.data.comparison_stats.ndvi_correlation}</span>
                    </div>
                    <div className="metric-box">
                      <span className="metric-label">Mean Systematic Offset</span>
                      <span className="metric-val">+{profileData.data.comparison_stats.mean_ndvi_offset_bias}</span>
                    </div>
                    <div className="metric-box">
                      <span className="metric-label">Low Valid Coverage (&lt;50%)</span>
                      <span className="metric-val">{profileData.data.comparison_stats.low_coverage_scenes_count} scenes</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {!loading && !error && activeSubTab === 'notes' && (
            <div className="tab-pane">
              <h4 style={{ fontSize: '0.95rem', marginBottom: '0.75rem' }}>Authoritative Methodology Caveats</h4>
              <ul className="notes-list">
                {dataset.notes?.map((n, idx) => (
                  <li key={idx} className="note-item">
                    <span className="note-icon">📌</span>
                    <span>{n}</span>
                  </li>
                ))}
              </ul>

              <div className="notice-box" style={{ marginTop: '1.5rem' }}>
                <strong>Provenance Category: <code>{dataset.provenance}</code></strong>
                <p style={{ marginTop: '0.25rem', fontSize: '0.825rem' }}>
                  {dataset.provenance === 'measured' && 'Published survey observations or catalog ground-truth metadata.'}
                  {dataset.provenance === 'calculated' && 'Analytically calculated using satellite band algebraic formulas or arithmetic aggregations.'}
                  {dataset.provenance === 'model_estimated' && 'Outputs of numerical reanalysis or digital spatial models (e.g., MERRA-2, ERA5, SoilGrids).'}
                  {dataset.provenance === 'unavailable' && 'Field-dated observations required for pest-risk validation are not available in current files.'}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-primary" onClick={onClose}>Close Inspector</button>
        </div>
      </div>
    </div>
  );
}
