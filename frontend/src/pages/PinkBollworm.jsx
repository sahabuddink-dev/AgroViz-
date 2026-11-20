import React, { useEffect, useState } from 'react';
import {
  getDegreeDays,
  getPBWContext,
  getPBWStatus,
  getPBWTemplateURL,
  uploadPBWObservations,
} from '../api/client';
import ProvenanceBadge from '../components/ProvenanceBadge';
import {
  DegreeDayCumulativeChart,
  MonthlyDegreeDayChart,
  Annexure3SeasonalChart,
} from '../components/PBWCharts';

export default function PinkBollworm({ onNavigateTab }) {
  const [activeSection, setActiveSection] = useState('degreedays'); // 'degreedays' | 'context' | 'observed'
  const [startDate, setStartDate] = useState('2023-06-01');
  const [degreeDayData, setDegreeDayData] = useState(null);
  const [contextData, setContextData] = useState(null);
  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Upload state
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadError, setUploadError] = useState(null);

  const fetchPBWData = async (start = startDate) => {
    try {
      setLoading(true);
      setError(null);
      const [ddRes, ctxRes, statRes] = await Promise.all([
        getDegreeDays('both', start),
        getPBWContext(),
        getPBWStatus(),
      ]);
      setDegreeDayData(ddRes.data);
      setContextData(ctxRes.data);
      setStatusData(statRes.data);
    } catch (err) {
      console.error('Failed to load Pink Bollworm data:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to load Pink Bollworm module data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPBWData(startDate);
  }, []);

  const handleApplyStartDate = (e) => {
    e.preventDefault();
    fetchPBWData(startDate);
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError('Please choose a .csv or .xlsx file to upload.');
      return;
    }
    try {
      setUploadLoading(true);
      setUploadError(null);
      const res = await uploadPBWObservations(selectedFile);
      setUploadResult(res);
      setSelectedFile(null);
      // Refresh status to show newly staged file count
      const updatedStatus = await getPBWStatus();
      setStatusData(updatedStatus.data);
    } catch (err) {
      setUploadError(err.response?.data?.detail || err.message || 'Upload failed validation.');
    } finally {
      setUploadLoading(false);
    }
  };

  const ddSummary = degreeDayData?.summary;
  const setA = degreeDayData?.parameter_sets?.set_A;
  const setB = degreeDayData?.parameter_sets?.set_B;

  return (
    <div className="pbw-page-container">
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
      {/* Navigation tabs for the 3 distinct non-overlapping sections */}
      <div className="card" style={{ padding: '0.75rem 1.5rem', marginBottom: '1rem' }}>
        <div className="modal-tabs" style={{ border: 'none', padding: 0 }}>
          <button
            className={`modal-tab ${activeSection === 'degreedays' ? 'modal-tab-active' : ''}`}
            onClick={() => setActiveSection('degreedays')}
          >
            🌡️ Weather-Driven Degree-Day Indicator
          </button>
          <button
            className={`modal-tab ${activeSection === 'context' ? 'modal-tab-active' : ''}`}
            onClick={() => setActiveSection('context')}
          >
            📚 Published Context Data (Annexures 3 & 4)
          </button>
          <button
            className={`modal-tab ${activeSection === 'observed' ? 'modal-tab-active' : ''}`}
            onClick={() => setActiveSection('observed')}
          >
            🔒 Observed Pest Data (Unavailable State)
          </button>
        </div>
      </div>

      {loading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading Pink Bollworm phenology models and published survey data...</p>
        </div>
      )}

      {error && (
        <div className="notice-box" style={{ borderLeftColor: '#ef4444', marginBottom: '1.5rem' }}>
          <strong>Error Loading Module:</strong>
          <p>{error}</p>
        </div>
      )}

      {/* =========================================================================
          SECTION A: Weather-Driven Degree-Day Development Indicator
          ========================================================================= */}
      {!loading && !error && activeSection === 'degreedays' && (
        <div className="section-degreedays">
          {/* Start Date Picker Bar */}
          <div className="card filter-bar">
            <form onSubmit={handleApplyStartDate} className="date-filter-form">
              <div className="filter-group">
                <span className="filter-label">Biofix / Start Date:</span>
                <input
                  type="date"
                  className="input-date"
                  min="2023-06-01"
                  max="2024-11-01"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <button type="submit" className="btn-primary btn-sm">
                  Recalculate Degree-Days
                </button>
              </div>
            </form>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Note: Start date is user-selected (cotton sowing date is not in dataset).
            </div>
          </div>

          {/* Side-by-side Summary Cards for Set A & Set B */}
          {ddSummary && (
            <div className="metrics-summary-grid">
              <div className="summary-stat-card" style={{ borderLeft: '4px solid #16a34a' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="stat-sub">Set A (Default, Indian States)</span>
                  <ProvenanceBadge provenance="model_estimated" />
                </div>
                <div className="stat-num" style={{ color: '#16a34a' }}>
                  {ddSummary.set_A.accumulated_degree_days} <span style={{ fontSize: '1rem', fontWeight: 500 }}>DD</span>
                </div>
                <div className="stat-label">
                  Potential Generations: <strong>{ddSummary.set_A.potential_generations}</strong>
                </div>
                <div className="stat-sub" style={{ color: 'var(--text-muted)' }}>
                  Thresholds: 13.4°C / 35.5°C • 503.62 DD/generation
                </div>
              </div>

              <div className="summary-stat-card" style={{ borderLeft: '4px solid #0284c7' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="stat-sub">Set B (Alternative, California)</span>
                  <ProvenanceBadge provenance="model_estimated" />
                </div>
                <div className="stat-num" style={{ color: '#0284c7' }}>
                  {ddSummary.set_B.accumulated_degree_days} <span style={{ fontSize: '1rem', fontWeight: 500 }}>DD</span>
                </div>
                <div className="stat-label">
                  Potential Generations: <strong>{ddSummary.set_B.potential_generations}</strong>
                </div>
                <div className="stat-sub" style={{ color: 'var(--text-muted)' }}>
                  Thresholds: 13.9°C / 32.8°C • 492.00 DD/generation
                </div>
              </div>

              <div className="summary-stat-card">
                <div className="stat-sub">Monitoring Period Window</div>
                <div className="stat-num">{degreeDayData.days_accumulated} Days</div>
                <div className="stat-label">
                  From <strong>{degreeDayData.start_date}</strong> to <strong>{degreeDayData.end_date}</strong>
                </div>
                <div className="stat-sub" style={{ color: 'var(--accent-green)' }}>
                  Method: Single Sine with Horizontal Upper Cutoff
                </div>
              </div>
            </div>
          )}

          {/* Mandatory Scientific Notices */}
          <div className="card notice-box" style={{ borderLeftColor: 'var(--accent-amber)', marginBottom: '1.5rem' }}>
            <div style={{ fontWeight: 700, color: '#92400e', marginBottom: '0.4rem' }}>
              ℹ️ Degree-Day Phenology Guidance:
            </div>
            <ul style={{ paddingLeft: '1.25rem', fontSize: '0.825rem', lineHeight: '1.6', color: '#78350f' }}>
              <li><strong>Thermal development potential, not an observation of pests:</strong> Heat unit accumulation describes physiological development rate if pests are present, not population density or damage.</li>
              <li><strong>Parameters are literature values from other regions:</strong> Calibrated in Indian & California literature; not validated against local Akola ground-truth field data.</li>
              <li><strong>NASA POWER is reanalysis:</strong> Derived from MERRA-2 gridded model estimates (~0.5° × 0.625°), not a local micro-climate canopy station.</li>
            </ul>
          </div>

          {/* Cumulative DD Chart */}
          <div className="card">
            <h3 className="card-title">Accumulated Physiological Degree-Days (Single Sine Horizontal Cutoff)</h3>
            <p className="chart-caption">
              Comparison of heat accumulation curves for Set A (green) vs Set B (blue) from the selected start date ({startDate}).
              Dashed gold lines mark potential complete generational milestones (503.62 DD per generation under Set A).
            </p>
            <DegreeDayCumulativeChart
              dailySeries={degreeDayData?.daily_series}
              setAInfo={setA}
              setBInfo={setB}
            />
          </div>

          {/* Monthly Degree-Day Bar Chart */}
          <div className="card" style={{ marginTop: '1.5rem' }}>
            <h3 className="card-title">Monthly Heat Unit Accumulation (DD / Month)</h3>
            <p className="chart-caption">
              Degree-days accumulated per calendar month under Set A vs Set B. Heat accumulation peaks during May–June summers and slows down in winter.
            </p>
            <MonthlyDegreeDayChart summaries={degreeDayData?.monthly_summaries} />
          </div>

          {/* Parameter Citations Card */}
          <div className="card" style={{ marginTop: '1.5rem' }}>
            <h4 className="card-subtitle">Entomological Parameter Set Citations</h4>
            <div className="grid-2">
              <div className="rule-card">
                <strong>Set A (Indian Cotton States)</strong>
                <p style={{ marginTop: '0.35rem' }}>{setA?.citation}</p>
                <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Thresholds: Lower 13.4°C • Upper 35.5°C • Generation 503.62 DD
                </div>
              </div>
              <div className="rule-card">
                <strong>Set B (California Benchmark)</strong>
                <p style={{ marginTop: '0.35rem' }}>{setB?.citation}</p>
                <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Thresholds: Lower 13.9°C • Upper 32.8°C • Generation 492.00 DD
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION B: Published Pink Bollworm Context Data
          ========================================================================= */}
      {!loading && !error && activeSection === 'context' && contextData && (
        <div className="section-context">
          {/* Critical Boundary Notice */}
          <div className="card notice-box" style={{ borderLeftColor: '#2563eb', marginBottom: '1.5rem' }}>
            <div style={{ fontWeight: 700, color: '#1e40af', marginBottom: '0.35rem' }}>
              ℹ️ Published Literature Context Only (Zero Temporal Overlap)
            </div>
            <p style={{ fontSize: '0.825rem', lineHeight: '1.6', color: '#1e3a8a' }}>
              Published survey records cover historical annual seasons (<strong>2015-16 to 2022-23</strong>) from Fand et al. (2025).
              Environmental monitoring (weather and Sentinel-2) begins in <strong>June 2023</strong>.
              <strong>Zero temporal overlap exists.</strong> This data is displayed strictly as regional historical reference;
              it is <em>never joined</em> with weather/satellite data and <em>cannot validate</em> any predictive model.
            </p>
          </div>

          {/* Annexure 3: Akola Station-wise Seasonal Damage */}
          <div className="card">
            <div className="card-header-flex">
              <div>
                <h3 className="card-title" style={{ margin: 0 }}>
                  {contextData.annexure_3.title}
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Source: AICRP-Stationwise data • Unit: % loculi damage
                </span>
              </div>
              <ProvenanceBadge provenance="measured" />
            </div>

            <div className="grid-2" style={{ marginTop: '1.25rem', alignItems: 'center' }}>
              <div>
                <Annexure3SeasonalChart
                  seasonsData={contextData.annexure_3.akola_seasons}
                  publishedMean={contextData.annexure_3.published_5season_bt_mean}
                />
              </div>

              <div>
                <h4 className="card-subtitle">Akola Historical Damage Summary</h4>
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
                      {contextData.annexure_3.akola_seasons.map((s) => (
                        <tr key={s.season}>
                          <td><strong>{s.season}</strong></td>
                          <td style={{ color: '#7c3aed', fontWeight: 600 }}>{s.nbt_loculi_damage_pct}%</td>
                          <td style={{ color: '#059669', fontWeight: 600 }}>{s.bt_loculi_damage_pct}%</td>
                        </tr>
                      ))}
                      <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                        <td>5-Season Mean</td>
                        <td>25.29% (calc)</td>
                        <td style={{ color: '#059669' }}>21.602% (published)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="notice-box" style={{ marginTop: '0.75rem', fontSize: '0.775rem' }}>
                  <strong>{contextData.annexure_3.nbt_disclaimer}</strong>
                  <p style={{ marginTop: '0.2rem' }}>
                    Ambiguous annotations in original sheet: cell AE33 ({contextData.annexure_3.ambiguous_annotations?.cell_AE33?.value} labelled "2021-2023") and AJ33 ({contextData.annexure_3.ambiguous_annotations?.cell_AJ33?.value} labelled "2021-22") are preserved as unverified annotations.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Annexure 4: Multi-Location Loss & Paras Record */}
          <div className="card" style={{ marginTop: '1.5rem' }}>
            <div className="card-header-flex">
              <div>
                <h3 className="card-title" style={{ margin: 0 }}>
                  {contextData.annexure_4.title}
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  63 Survey Locations across 9 Indian Cotton States (21 in Maharashtra)
                </span>
              </div>
              <ProvenanceBadge provenance="measured" />
            </div>

            <div className="grid-2" style={{ marginTop: '1.25rem' }}>
              <div className="rule-card" style={{ borderLeft: '4px solid var(--accent-green)' }}>
                <h4 style={{ color: 'var(--accent-green)' }}>Akola District Location: Paras</h4>
                <div style={{ fontSize: '0.85rem', marginTop: '0.5rem', lineHeight: '1.6' }}>
                  <div>Coordinates: <strong>20.7167°N, 76.8150°E</strong></div>
                  <div>Pink Bollworm Yield Loss: <strong style={{ color: '#ef4444' }}>4.428%</strong></div>
                  <div>Boll Rot Yield Loss: <strong style={{ color: '#7c3aed' }}>10.689%</strong></div>
                </div>
                <div className="notice-box" style={{ marginTop: '0.75rem', fontSize: '0.775rem' }}>
                  {contextData.annexure_4.akola_paras_record.caveat}
                </div>
              </div>

              <div className="rule-card">
                <h4>Maharashtra Regional Benchmark (21 Locations)</h4>
                <div style={{ fontSize: '0.85rem', marginTop: '0.5rem', lineHeight: '1.6' }}>
                  <div>Mean PBW Yield Loss: <strong>{contextData.annexure_4.maharashtra_summary.mean_pbw_loss_pct}%</strong></div>
                  <div>Max PBW Yield Loss: <strong>{contextData.annexure_4.maharashtra_summary.max_pbw_loss_pct}%</strong></div>
                  <div>Min PBW Yield Loss: <strong>{contextData.annexure_4.maharashtra_summary.min_pbw_loss_pct}%</strong></div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.35rem' }}>
                    Paras PBW loss (4.428%) sits within the lower quartile of surveyed Maharashtra locations.
                  </div>
                </div>
              </div>
            </div>

            {/* Published Locations Map / Coordinates Table */}
            <div style={{ marginTop: '1.5rem' }}>
              <h4 className="card-subtitle">Surveyed Locations & Published Coordinates</h4>
              <div className="table-responsive" style={{ maxHeight: '280px', overflowY: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>State</th>
                      <th>District</th>
                      <th>Location</th>
                      <th>Latitude</th>
                      <th>Longitude</th>
                      <th>PBW Loss (%)</th>
                      <th>Boll Rot Loss (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contextData.annexure_4.locations.map((loc, idx) => (
                      <tr key={idx} style={{ background: loc.is_akola ? '#f0fdf4' : 'transparent' }}>
                        <td>{loc.state}</td>
                        <td>{loc.district || '—'}</td>
                        <td>
                          <strong>{loc.location}</strong> {loc.is_akola && <span className="provenance-tag tag-measured">Akola Study Point</span>}
                        </td>
                        <td><code>{loc.latitude.toFixed(4)}°N</code></td>
                        <td><code>{loc.longitude.toFixed(4)}°E</code></td>
                        <td style={{ color: '#ef4444', fontWeight: 600 }}>{loc.yield_loss_pbw_pct}%</td>
                        <td style={{ color: '#7c3aed', fontWeight: 600 }}>{loc.yield_loss_br_pct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION C: Observed Pest Data (Unavailable State & Ingestion)
          ========================================================================= */}
      {!loading && !error && activeSection === 'observed' && statusData && (
        <div className="section-observed">
          {/* Permanent Unavailable Alert */}
          <div className="card" style={{ borderLeft: '4px solid #ef4444', backgroundColor: '#fef2f2' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ color: '#991b1b', margin: 0, fontSize: '1.1rem' }}>
                  🔒 {statusData.message}
                </h3>
                <p style={{ color: '#7f1d1d', fontSize: '0.85rem', marginTop: '0.35rem' }}>
                  {statusData.reason}
                </p>
              </div>
              <ProvenanceBadge provenance="unavailable" />
            </div>
          </div>

          {/* Data Requirements Card */}
          <div className="card">
            <h3 className="card-title">Data Requirements for Localized Risk Calibration</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Ground-truth field scouting observations are required to enable localized risk forecasting:
            </p>
            <ul className="rules-list">
              {statusData.requirements_to_enable_risk_validation.map((req, idx) => (
                <li key={idx} className="rule-item">
                  <span className="rule-bullet">📋</span>
                  <span>{req}</span>
                </li>
              ))}
            </ul>

            <div style={{ marginTop: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <a
                href={getPBWTemplateURL()}
                download="agroviz_pbw_observation_template.csv"
                className="btn-primary"
                style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                📥 Download Standard CSV Template
              </a>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Exact headers: <code>date, latitude, longitude, location_name, observation_type, value, unit, crop_stage, source, method</code>
              </span>
            </div>
          </div>

          {/* Upload & Staging Form */}
          <div className="card">
            <h3 className="card-title">Upload Dated Field Pest Observations</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Upload valid observation files from field scouts, PDKV Akola, or CICR Nagpur.
              Uploaded files are staged in <code>data/uploads/</code>, strictly schema-validated, and displayed in isolation.
            </p>

            <form onSubmit={handleFileUpload} className="upload-dropzone">
              <input
                type="file"
                accept=".csv, .xlsx, .xls"
                id="pbw-file-input"
                style={{ display: 'none' }}
                onChange={(e) => setSelectedFile(e.target.files[0] || null)}
              />
              <label htmlFor="pbw-file-input" style={{ cursor: 'pointer', display: 'block' }}>
                <div className="dropzone-icon">📤</div>
                <div className="dropzone-text">
                  {selectedFile ? (
                    <strong>Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</strong>
                  ) : (
                    <span>Click to choose CSV/Excel file or drag and drop</span>
                  )}
                </div>
                <div className="dropzone-sub">
                  Supported: <code>trap_count</code>, <code>boll_damage_pct</code>, <code>other</code>
                </div>
              </label>

              <button
                type="submit"
                className="btn-primary"
                disabled={!selectedFile || uploadLoading}
                style={{ marginTop: '1rem' }}
              >
                {uploadLoading ? 'Validating Schema...' : 'Validate and Stage Observation File'}
              </button>
            </form>

            {uploadError && (
              <div className="notice-box" style={{ borderLeftColor: '#ef4444', marginTop: '1rem' }}>
                <strong>Validation Error:</strong>
                <p>{uploadError}</p>
              </div>
            )}

            {uploadResult && (
              <div className="notice-box" style={{ borderLeftColor: '#16a34a', marginTop: '1rem' }}>
                <strong style={{ color: '#166534' }}>✓ Upload Staged Successfully:</strong>
                <p>{uploadResult.notes?.[0]}</p>
                <div style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>
                  Saved as: <code>{uploadResult.data?.saved_filename}</code> • Total rows: <strong>{uploadResult.data?.total_records}</strong>
                </div>

                {uploadResult.data?.preview && (
                  <div className="table-responsive" style={{ marginTop: '0.75rem' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Location</th>
                          <th>Type</th>
                          <th>Value</th>
                          <th>Unit</th>
                          <th>Crop Stage</th>
                          <th>Source</th>
                        </tr>
                      </thead>
                      <tbody>
                        {uploadResult.data.preview.map((row, idx) => (
                          <tr key={idx}>
                            <td><code>{row.date}</code></td>
                            <td>{row.location_name}</td>
                            <td><span className="provenance-tag tag-measured">{row.observation_type}</span></td>
                            <td><strong>{row.value}</strong></td>
                            <td>{row.unit}</td>
                            <td>{row.crop_stage}</td>
                            <td>{row.source}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            <div className="notice-box" style={{ marginTop: '1.25rem' }}>
              <strong>Data Isolation Guarantee:</strong> {statusData.isolation_guarantee}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
