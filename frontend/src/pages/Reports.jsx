import React, { useEffect, useState } from 'react';
import { getFields, exportReport, getReportDownloadUrl, getYoyAnalysis } from '../api/client';
import ProvenanceBadge from '../components/ProvenanceBadge';

export default function Reports() {
  const [activeSubTab, setActiveSubTab] = useState('report'); // 'report' | 'yoy'
  const [fields, setFields] = useState([]);
  const [selectedFieldId, setSelectedFieldId] = useState('field_akola_research_demo');

  // Report State
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(true);
  const [reportError, setReportError] = useState(null);

  // YoY State
  const [yoyData, setYoyData] = useState(null);
  const [yoyLoading, setYoyLoading] = useState(false);
  const [yoyError, setYoyError] = useState(null);
  const [yoyMetricFilter, setYoyMetricFilter] = useState('all');

  // Load fields list
  useEffect(() => {
    getFields()
      .then((res) => {
        const list = res.data || [];
        setFields(list);
        if (list.length > 0 && !selectedFieldId) {
          setSelectedFieldId(list[0].id);
        }
      })
      .catch((err) => console.warn('Failed to load fields:', err));
  }, []);

  // Fetch report data whenever selectedFieldId changes
  const fetchReport = async (fieldId) => {
    try {
      setReportLoading(true);
      setReportError(null);
      const res = await exportReport(fieldId, 'json');
      setReportData(res.data);
    } catch (err) {
      console.error('Report fetch error:', err);
      setReportError(err.response?.data?.detail || err.message || 'Failed to compile field report.');
    } finally {
      setReportLoading(false);
    }
  };

  useEffect(() => {
    if (selectedFieldId && activeSubTab === 'report') {
      fetchReport(selectedFieldId);
    }
  }, [selectedFieldId, activeSubTab]);

  // Fetch YoY analysis
  const fetchYoy = async (metric = 'all') => {
    try {
      setYoyLoading(true);
      setYoyError(null);
      const res = await getYoyAnalysis(metric);
      setYoyData(res.data);
    } catch (err) {
      console.error('YoY analysis error:', err);
      setYoyError(err.response?.data?.detail || err.message || 'Failed to compute YoY comparison.');
    } finally {
      setYoyLoading(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'yoy') {
      fetchYoy(yoyMetricFilter);
    }
  }, [activeSubTab, yoyMetricFilter]);

  // Download JSON Blob Handler
  const handleDownloadJson = () => {
    if (!reportData) return;
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agroviz_report_${selectedFieldId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectedField = fields.find((f) => f.id === selectedFieldId);

  return (
    <div className="reports-page" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Top Header Card */}
      <div className="module-header card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.5rem' }}>📄</span>
              <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700 }}>
                Field Health Reports & YoY Screening Engine
              </h2>
            </div>
            <p style={{ margin: '0.35rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Multi-layer agronomic health report compilation, downloadable CSV/JSON exports, and June–December comparative screening
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <ProvenanceBadge provenance="calculated" />
            <span className="provenance-tag tag-model_estimated">Audit Compliant</span>
          </div>
        </div>

        {/* Sub-Tab Navigation Bar */}
        <div style={{ marginTop: '1.25rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className={`btn-sm ${activeSubTab === 'report' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveSubTab('report')}
            >
              📋 Field Health Report Export
            </button>
            <button
              type="button"
              className={`btn-sm ${activeSubTab === 'yoy' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveSubTab('yoy')}
            >
              📊 Year-on-Year Comparative Screening (2023 vs 2024)
            </button>
          </div>

          {activeSubTab === 'report' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Select Field:</span>
              <select
                className="input-sm"
                value={selectedFieldId}
                onChange={(e) => setSelectedFieldId(e.target.value)}
                style={{ minWidth: 260, fontWeight: 600 }}
              >
                {fields.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.is_demo ? '10 km Research AOI' : `${f.area_hectares} ha Farm`})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: Field Health Report Preview & Export                          */}
      {/* ========================================================================= */}
      {activeSubTab === 'report' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Action Bar */}
          <div className="card" style={{ padding: '0.75rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', background: '#f8fafc' }}>
            <div style={{ fontSize: '0.85rem', color: '#334155' }}>
              Viewing Report for: <strong>{selectedField?.name}</strong>
              <span style={{ marginLeft: '0.5rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                (Area: {selectedField?.area_hectares} ha • {selectedField?.crop_type})
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <a
                href={getReportDownloadUrl(selectedFieldId, 'csv')}
                download={`agroviz_report_${selectedFieldId}.csv`}
                className="btn-primary btn-sm"
                style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                title="Download formatted tabular CSV report"
              >
                📥 Download CSV Report
              </a>
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={handleDownloadJson}
                disabled={!reportData}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                title="Download full structured JSON report"
              >
                💾 Download JSON Report
              </button>
            </div>
          </div>

          {reportLoading ? (
            <div className="card loading-card" style={{ padding: '3rem', textAlign: 'center' }}>
              <div className="spinner"></div>
              <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>Compiling field report and audit trail...</p>
            </div>
          ) : reportError ? (
            <div className="card error-card" style={{ padding: '1.5rem', color: '#991b1b', background: '#fee2e2' }}>
              <strong>Error Compiling Report:</strong> {reportError}
            </div>
          ) : reportData ? (
            <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Document Header */}
              <div style={{ borderBottom: '2px solid var(--border-color)', paddingBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent-green)', letterSpacing: '0.08em' }}>
                    AGROVIZ PRECISION AGRICULTURE PLATFORM • FIELD HEALTH SUMMARY
                  </div>
                  <h2 style={{ margin: '0.25rem 0', fontSize: '1.4rem', fontWeight: 800 }}>
                    {reportData.field_name}
                  </h2>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Report ID: <code>{reportData.report_id}</code> | Generated: {new Date(reportData.generated_at).toLocaleString()}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span className={`provenance-tag ${reportData.field_type === 'research_aoi' ? 'tag-model_estimated' : 'tag-measured'}`}>
                    {reportData.field_type === 'research_aoi' ? '10 km Research AOI' : 'Private Farm Boundary'}
                  </span>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                    Version {reportData.platform_version}
                  </div>
                </div>
              </div>

              {/* Section 1: Spatial & Registration Metrics */}
              <div>
                <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>
                  1. Field Characteristics & Spatial Bounds
                </h4>
                <div className="grid-4" style={{ gap: '0.75rem' }}>
                  <div style={{ background: '#f8fafc', padding: '0.65rem', borderRadius: 6, border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Crop Type</div>
                    <strong style={{ fontSize: '0.9rem', color: '#16a34a' }}>{reportData.crop_type}</strong>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '0.65rem', borderRadius: 6, border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Surface Area</div>
                    <strong style={{ fontSize: '0.9rem' }}>{reportData.area_hectares?.toLocaleString()} ha ({reportData.area_acres?.toLocaleString()} ac)</strong>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '0.65rem', borderRadius: 6, border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Center Centroid</div>
                    <strong style={{ fontSize: '0.8rem' }}>{reportData.centroid?.latitude}°N, {reportData.centroid?.longitude}°E</strong>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '0.65rem', borderRadius: 6, border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Sowing Date</div>
                    <strong style={{ fontSize: '0.85rem' }}>{reportData.sowing_date || 'Unassigned'}</strong>
                  </div>
                </div>
              </div>

              {/* Section 2: Active Field Alerts */}
              <div>
                <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>
                  2. Active Evidence-Based Agronomic Alerts ({reportData.active_alerts?.length || 0})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {reportData.active_alerts?.map((a) => (
                    <div
                      key={a.id}
                      style={{
                        padding: '0.75rem 1rem',
                        borderRadius: 6,
                        border: '1px solid var(--border-color)',
                        borderLeft: `4px solid ${a.severity === 'Warning' ? '#f59e0b' : a.severity === 'Critical' ? '#dc2626' : '#0284c7'}`,
                        background: '#fafbfc',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ fontSize: '0.85rem' }}>{a.title}</strong>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569' }}>[{a.severity}]</span>
                      </div>
                      <p style={{ margin: '0.25rem 0 0.4rem 0', fontSize: '0.8rem', color: '#334155' }}>
                        {a.message}
                      </p>
                      <div style={{ fontSize: '0.725rem', color: '#64748b' }}>
                        Source: {a.source} | Status: {a.status}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 3: Biophysical & Module Summaries */}
              <div>
                <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>
                  3. Multi-Layer Environmental & Phenological Status
                </h4>

                {reportData.module_summaries?.status === 'Awaiting Local Data Ingestion' ? (
                  <div style={{ padding: '1rem', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, fontSize: '0.825rem', color: '#92400e' }}>
                    <strong>Onboarding Required:</strong> {reportData.module_summaries.message}
                  </div>
                ) : (
                  <div className="grid-2" style={{ gap: '1rem' }}>
                    {/* Weather */}
                    <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: 6, border: '1px solid var(--border-color)' }}>
                      <strong style={{ fontSize: '0.85rem', color: '#0369a1' }}>Surface Meteorology (NASA POWER)</strong>
                      <div style={{ fontSize: '0.775rem', marginTop: '0.4rem', color: '#334155', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <div>Mean Temperature: <strong>{reportData.module_summaries?.weather?.mean_temperature_c}°C</strong></div>
                        <div>Highest Tmax: <strong>{reportData.module_summaries?.weather?.max_temperature_c}°C</strong></div>
                        <div>Total Precipitation: <strong>{reportData.module_summaries?.weather?.total_precipitation_mm} mm</strong> ({reportData.module_summaries?.weather?.rainy_days} rainy days)</div>
                      </div>
                    </div>

                    {/* Crop Health */}
                    <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: 6, border: '1px solid var(--border-color)' }}>
                      <strong style={{ fontSize: '0.85rem', color: '#16a34a' }}>Canopy Health (Sentinel-2 L2A)</strong>
                      <div style={{ fontSize: '0.775rem', marginTop: '0.4rem', color: '#334155', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <div>Mean NDVI (Greenness): <strong>{reportData.module_summaries?.crop_health?.mean_ndvi}</strong></div>
                        <div>Mean NDRE (Chlorophyll): <strong>{reportData.module_summaries?.crop_health?.mean_ndre}</strong></div>
                        <div>Mean NDMI (Canopy Water): <strong>{reportData.module_summaries?.crop_health?.mean_ndmi}</strong></div>
                        <div style={{ color: '#b45309', marginTop: '0.15rem' }}>* {reportData.module_summaries?.crop_health?.cloud_gap_notice}</div>
                      </div>
                    </div>

                    {/* Soil */}
                    <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: 6, border: '1px solid var(--border-color)' }}>
                      <strong style={{ fontSize: '0.85rem', color: '#7c3aed' }}>Soil Properties (SoilGrids 2.0)</strong>
                      <div style={{ fontSize: '0.775rem', marginTop: '0.4rem', color: '#334155', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <div>Texture Classification: <strong>{reportData.module_summaries?.soil_conditions?.texture_classification}</strong></div>
                        <div>Clay: {reportData.module_summaries?.soil_conditions?.clay_pct}% | Silt: {reportData.module_summaries?.soil_conditions?.silt_pct}% | Sand: {reportData.module_summaries?.soil_conditions?.sand_pct}%</div>
                        <div>Soil pH (H2O): {reportData.module_summaries?.soil_conditions?.ph_h2o}</div>
                      </div>
                    </div>

                    {/* Phenology */}
                    <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: 6, border: '1px solid var(--border-color)' }}>
                      <strong style={{ fontSize: '0.85rem', color: '#b45309' }}>PBW Thermal Phenology (Degree-Days)</strong>
                      <div style={{ fontSize: '0.775rem', marginTop: '0.4rem', color: '#334155', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <div>Set A (Pathan et al.): <strong>{reportData.module_summaries?.pest_phenology?.accumulated_degree_days_set_a} °C·d</strong> ({reportData.module_summaries?.pest_phenology?.potential_generations_set_a} pot. gen)</div>
                        <div>Set B (Fand et al.): <strong>{reportData.module_summaries?.pest_phenology?.accumulated_degree_days_set_b} °C·d</strong> ({reportData.module_summaries?.pest_phenology?.potential_generations_set_b} pot. gen)</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 4: Data Sources & References */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>
                  4. Data Sources & References
                </h4>
                <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.75rem', color: '#64748b', lineHeight: 1.5 }}>
                  {reportData.citations?.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>

              {/* Note */}
              <div style={{ background: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: 6, padding: '0.6rem 0.85rem', fontSize: '0.725rem', color: '#64748b', lineHeight: 1.5 }}>
                Field measurements and remote sensing indices are evaluated using calibrated regional agronomic models.
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: Year-on-Year Comparative Screening (2023 vs 2024)             */}
      {/* ========================================================================= */}
      {activeSubTab === 'yoy' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* YoY Banner */}
          <div className="card" style={{ background: '#f0f9ff', borderLeft: '4px solid #0284c7', padding: '0.85rem 1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.25rem' }}>📊</span>
              <div style={{ fontSize: '0.825rem', color: '#0369a1', lineHeight: 1.5 }}>
                <strong>Common Window Comparative Screening:</strong> Evaluates observed shifts between Kharif Season 2023 and Kharif Season 2024
                over the <strong>June 1 to December 31</strong> overlapping period in the 10 km Akola research zone.
                Monitoring began on 2023-06-01; January–May 2023 records are preserved as unobserved and are never backfilled.
              </div>
            </div>
          </div>

          {/* Metric Selector Bar */}
          <div className="card" style={{ padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Filter Comparison Metric:</span>
            {[
              { id: 'all', label: 'All Modules' },
              { id: 'weather', label: 'Weather (Rain & Temp)' },
              { id: 'soil', label: 'Soil Moisture (3 Layers)' },
              { id: 'crop_indices', label: 'Sentinel-2 Crop Indices' },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                className={`btn-sm ${yoyMetricFilter === m.id ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem' }}
                onClick={() => setYoyMetricFilter(m.id)}
              >
                {m.label}
              </button>
            ))}
          </div>

          {yoyLoading ? (
            <div className="card loading-card" style={{ padding: '2.5rem', textAlign: 'center' }}>
              <div className="spinner"></div>
              <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>Calculating June–December comparative screening...</p>
            </div>
          ) : yoyError ? (
            <div className="card error-card" style={{ padding: '1.5rem', color: '#991b1b', background: '#fee2e2' }}>
              <strong>Error Loading YoY Screening:</strong> {yoyError}
            </div>
          ) : yoyData ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* 1. Weather YoY */}
              {yoyData.weather && (
                <div className="card" style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0369a1' }}>
                      1. Surface Meteorology: June–December 2023 vs 2024
                    </h3>
                    <ProvenanceBadge provenance="model_estimated" />
                  </div>

                  {/* Season Totals Cards */}
                  <div className="grid-3" style={{ gap: '0.75rem', marginBottom: '1rem' }}>
                    <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: 6, border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Precipitation (Jun–Dec)</div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.25rem' }}>
                        <span style={{ fontSize: '0.85rem' }}>2023: <strong>{yoyData.weather.season_totals?.['2023']?.total_precipitation_mm} mm</strong></span>
                        <span style={{ fontSize: '0.85rem' }}>&rarr; 2024: <strong>{yoyData.weather.season_totals?.['2024']?.total_precipitation_mm} mm</strong></span>
                      </div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: yoyData.weather.net_difference?.rainfall_change_mm >= 0 ? '#16a34a' : '#dc2626', marginTop: '0.25rem' }}>
                        Net Change: {yoyData.weather.net_difference?.rainfall_change_mm > 0 ? '+' : ''}{yoyData.weather.net_difference?.rainfall_change_mm} mm ({yoyData.weather.net_difference?.rainfall_change_pct}%)
                      </div>
                    </div>

                    <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: 6, border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Rainy Days Count (&gt;0.1 mm)</div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.25rem' }}>
                        <span style={{ fontSize: '0.85rem' }}>2023: <strong>{yoyData.weather.season_totals?.['2023']?.rainy_days_count} days</strong></span>
                        <span style={{ fontSize: '0.85rem' }}>&rarr; 2024: <strong>{yoyData.weather.season_totals?.['2024']?.rainy_days_count} days</strong></span>
                      </div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginTop: '0.25rem' }}>
                        Net Change: {yoyData.weather.net_difference?.rainy_days_change > 0 ? '+' : ''}{yoyData.weather.net_difference?.rainy_days_change} days
                      </div>
                    </div>

                    <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: 6, border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Mean Temperature (T2M)</div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.25rem' }}>
                        <span style={{ fontSize: '0.85rem' }}>2023: <strong>{yoyData.weather.season_totals?.['2023']?.mean_temperature_c}°C</strong></span>
                        <span style={{ fontSize: '0.85rem' }}>&rarr; 2024: <strong>{yoyData.weather.season_totals?.['2024']?.mean_temperature_c}°C</strong></span>
                      </div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginTop: '0.25rem' }}>
                        Net Change: {yoyData.weather.net_difference?.mean_temperature_change_c > 0 ? '+' : ''}{yoyData.weather.net_difference?.mean_temperature_change_c}°C
                      </div>
                    </div>
                  </div>

                  {/* Monthly Table */}
                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table" style={{ width: '100%', fontSize: '0.8rem' }}>
                      <thead>
                        <tr>
                          <th>Calendar Month</th>
                          <th>2023 Rainfall</th>
                          <th>2024 Rainfall</th>
                          <th>Rainfall Diff</th>
                          <th>2023 Mean Temp</th>
                          <th>2024 Mean Temp</th>
                          <th>Temp Diff</th>
                        </tr>
                      </thead>
                      <tbody>
                        {yoyData.weather.monthly_breakdown?.map((m) => (
                          <tr key={m.month_num}>
                            <td><strong>{m.month}</strong></td>
                            <td>{m['2023']?.rainfall_mm} mm</td>
                            <td>{m['2024']?.rainfall_mm} mm</td>
                            <td style={{ color: m.rainfall_diff_mm >= 0 ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                              {m.rainfall_diff_mm > 0 ? '+' : ''}{m.rainfall_diff_mm} mm
                            </td>
                            <td>{m['2023']?.mean_t2m}°C</td>
                            <td>{m['2024']?.mean_t2m}°C</td>
                            <td style={{ fontWeight: 600 }}>
                              {m.temp_diff_c > 0 ? '+' : ''}{m.temp_diff_c}°C
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 2. Soil Moisture YoY */}
              {yoyData.soil_moisture && (
                <div className="card" style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#7c3aed' }}>
                      2. Volumetric Soil Moisture Across Depths (ERA5-Land)
                    </h3>
                    <ProvenanceBadge provenance="model_estimated" />
                  </div>

                  <div className="grid-3" style={{ gap: '0.75rem' }}>
                    <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: 6, border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Layer 1 (0–7 cm Surface)</div>
                      <div style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                        2023: <strong>{yoyData.soil_moisture.season_averages?.['2023']?.layer1_0_7cm_mean_m3m3} m³/m³</strong>
                      </div>
                      <div style={{ fontSize: '0.85rem' }}>
                        2024: <strong>{yoyData.soil_moisture.season_averages?.['2024']?.layer1_0_7cm_mean_m3m3} m³/m³</strong>
                      </div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, marginTop: '0.25rem' }}>
                        Shift: {yoyData.soil_moisture.layer_differences?.layer1_diff_m3m3 > 0 ? '+' : ''}{yoyData.soil_moisture.layer_differences?.layer1_diff_m3m3} m³/m³
                      </div>
                    </div>

                    <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: 6, border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Layer 2 (7–28 cm Mid Root-Zone)</div>
                      <div style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                        2023: <strong>{yoyData.soil_moisture.season_averages?.['2023']?.layer2_7_28cm_mean_m3m3} m³/m³</strong>
                      </div>
                      <div style={{ fontSize: '0.85rem' }}>
                        2024: <strong>{yoyData.soil_moisture.season_averages?.['2024']?.layer2_7_28cm_mean_m3m3} m³/m³</strong>
                      </div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, marginTop: '0.25rem' }}>
                        Shift: {yoyData.soil_moisture.layer_differences?.layer2_diff_m3m3 > 0 ? '+' : ''}{yoyData.soil_moisture.layer_differences?.layer2_diff_m3m3} m³/m³
                      </div>
                    </div>

                    <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: 6, border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Layer 3 (28–100 cm Deep Subsoil)</div>
                      <div style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                        2023: <strong>{yoyData.soil_moisture.season_averages?.['2023']?.layer3_28_100cm_mean_m3m3} m³/m³</strong>
                      </div>
                      <div style={{ fontSize: '0.85rem' }}>
                        2024: <strong>{yoyData.soil_moisture.season_averages?.['2024']?.layer3_28_100cm_mean_m3m3} m³/m³</strong>
                      </div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, marginTop: '0.25rem' }}>
                        Shift: {yoyData.soil_moisture.layer_differences?.layer3_diff_m3m3 > 0 ? '+' : ''}{yoyData.soil_moisture.layer_differences?.layer3_diff_m3m3} m³/m³
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. Crop Indices YoY */}
              {yoyData.crop_indices && (
                <div className="card" style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#16a34a' }}>
                      3. Sentinel-2 Multi-Spectral Indices (10 km AOI Buffer)
                    </h3>
                    <ProvenanceBadge provenance="calculated" />
                  </div>

                  <div className="grid-2" style={{ gap: '0.75rem' }}>
                    <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: 6, border: '1px solid var(--border-color)' }}>
                      <strong>Season 2023 (June–December)</strong>
                      <div style={{ fontSize: '0.8rem', marginTop: '0.4rem', color: '#334155' }}>
                        <div>Valid Optical Observation Dates: <strong>{yoyData.crop_indices.season_averages?.['2023']?.valid_observation_dates}</strong></div>
                        <div>Mean NDVI (Greenness): <strong>{yoyData.crop_indices.season_averages?.['2023']?.ndvi_mean}</strong></div>
                        <div>Mean NDRE (Chlorophyll): <strong>{yoyData.crop_indices.season_averages?.['2023']?.ndre_mean}</strong></div>
                        <div>Mean NDMI (Canopy Water): <strong>{yoyData.crop_indices.season_averages?.['2023']?.ndmi_mean}</strong></div>
                      </div>
                    </div>

                    <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: 6, border: '1px solid var(--border-color)' }}>
                      <strong>Season 2024 (June–December)</strong>
                      <div style={{ fontSize: '0.8rem', marginTop: '0.4rem', color: '#334155' }}>
                        <div>Valid Optical Observation Dates: <strong>{yoyData.crop_indices.season_averages?.['2024']?.valid_observation_dates}</strong></div>
                        <div>Mean NDVI (Greenness): <strong>{yoyData.crop_indices.season_averages?.['2024']?.ndvi_mean}</strong></div>
                        <div>Mean NDRE (Chlorophyll): <strong>{yoyData.crop_indices.season_averages?.['2024']?.ndre_mean}</strong></div>
                        <div>Mean NDMI (Canopy Water): <strong>{yoyData.crop_indices.season_averages?.['2024']?.ndmi_mean}</strong></div>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: '#fffbeb', borderRadius: 4, fontSize: '0.75rem', color: '#92400e' }}>
                    ☁️ <strong>Preserved Monsoon Optical Gaps:</strong> Both July 2023 and July 2024 had 0 valid optical dates due to persistent cloud cover. Missing dates are strictly preserved as unobserved and never fabricated.
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
