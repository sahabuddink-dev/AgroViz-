import React, { useState, useEffect } from 'react';
import ProvenanceBadge from './ProvenanceBadge';
import {
  predictCropStress,
  forecastVegetation,
  getAIPestRisk,
  getZoneSeries,
  getReportDownloadUrl,
} from '../api/client';

export default function FieldInsightsPanel({
  field,
  zone,
  onNavigateTab = () => {},
}) {
  const selected = zone || field;
  const isZone = !!(selected?.is_zone || selected?.zone_id);
  const zoneId = selected?.zone_id || 1;

  // AI Inference State
  const [cnnLoading, setCnnLoading] = useState(false);
  const [cnnResult, setCnnResult] = useState(null);

  const [lstmLoading, setLstmLoading] = useState(false);
  const [lstmResult, setLstmResult] = useState(null);

  const [pestLoading, setPestLoading] = useState(false);
  const [pestResult, setPestResult] = useState(null);

  const [seriesLoading, setSeriesLoading] = useState(false);
  const [seriesData, setSeriesData] = useState(null);

  // Fetch AI Predictions when zone changes
  useEffect(() => {
    if (!selected) return;

    if (isZone) {
      // 1. Fetch CNN Crop Stress
      setCnnLoading(true);
      predictCropStress({ zone_id: zoneId })
        .then((res) => setCnnResult(res.data))
        .catch((err) => console.warn('CNN inference failed:', err))
        .finally(() => setCnnLoading(false));

      // 2. Fetch LSTM Forecast
      setLstmLoading(true);
      forecastVegetation({ zone_id: zoneId, horizon_days: 15 })
        .then((res) => setLstmResult(res.data))
        .catch((err) => console.warn('LSTM forecast failed:', err))
        .finally(() => setLstmLoading(false));

      // 3. Fetch Pest Risk
      setPestLoading(true);
      getAIPestRisk(zoneId)
        .then((res) => setPestResult(res.data))
        .catch((err) => console.warn('Pest risk inference failed:', err))
        .finally(() => setPestLoading(false));

      // 4. Fetch Series counts & details
      setSeriesLoading(true);
      getZoneSeries(zoneId)
        .then((res) => setSeriesData(res.data))
        .catch((err) => console.warn('Series failed:', err))
        .finally(() => setSeriesLoading(false));
    }
  }, [selected?.id, selected?.zone_id, isZone, zoneId]);

  if (!selected) {
    return (
      <div className="gis-insights-empty" style={{ padding: '2.5rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🛰️</div>
        <h4>No Monitoring Zone Selected</h4>
        <p style={{ fontSize: '0.85rem', marginTop: '0.5rem', lineHeight: 1.5 }}>
          Select a monitoring zone from the list or click any polygon on the map to inspect its multi-spectral optical/radar fusion, CNN canopy stress classification, and LSTM 15-day forward forecast.
        </p>
      </div>
    );
  }

  // Formatting helpers
  const ndvi = selected.ndvi !== undefined ? selected.ndvi : cnnResult?.computed_indices?.NDVI;
  const bsi = selected.bsi !== undefined ? selected.bsi : cnnResult?.computed_indices?.BSI;
  const ndre = selected.ndre !== undefined ? selected.ndre : cnnResult?.computed_indices?.NDRE;
  const ndmi = selected.ndmi !== undefined ? selected.ndmi : cnnResult?.computed_indices?.NDMI;
  const vh_db = selected.vh_db;
  const sar_ratio = selected.sar_ratio_db;

  const stressClass = cnnResult?.predicted_class || selected.crop_stress || 'Healthy';
  const stressColor =
    stressClass === 'Healthy'
      ? '#16a34a'
      : stressClass === 'Moderate Stress'
      ? '#eab308'
      : stressClass === 'Severe Stress'
      ? '#dc2626'
      : '#64748b';

  return (
    <div className="gis-insights-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1rem' }}>
      {/* 1. Header Card */}
      <div className="card" style={{ padding: '1.25rem', borderTop: `4px solid ${stressColor}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.25rem' }}>🛰️</span>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>
                {selected.name || `Monitoring Zone ${zoneId}`}
              </h3>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Lat: {selected.latitude?.toFixed(4)}°N • Lon: {selected.longitude?.toFixed(4)}°E
              {selected.elevation_m ? ` • ${selected.elevation_m}m ASL` : ''}
              {selected.slope_deg ? ` • Slope ${selected.slope_deg}°` : ''}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '0.15rem 0.5rem',
                borderRadius: 4,
                background: stressColor,
                color: '#ffffff',
              }}
            >
              {stressClass}
            </span>
          </div>
        </div>

        {/* Observations Summary Badges */}
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.7rem', background: '#f1f5f9', color: '#475569', padding: '0.15rem 0.45rem', borderRadius: 4 }}>
            Optical S2: {selected.latest_s2_date || '2024-12-31'}
          </span>
          <span style={{ fontSize: '0.7rem', background: '#f1f5f9', color: '#475569', padding: '0.15rem 0.45rem', borderRadius: 4 }}>
            Radar S1: {selected.latest_s1_date || '2024-12-28'}
          </span>
          {seriesData?.counts && (
            <span style={{ fontSize: '0.7rem', background: '#e0f2fe', color: '#0369a1', padding: '0.15rem 0.45rem', borderRadius: 4 }}>
              {seriesData.counts.sentinel2_dates} S2 • {seriesData.counts.sentinel1_dates} S1 SAR dates
            </span>
          )}
        </div>
      </div>

      {/* 2. Optical & SAR Fusion Indices Matrix */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>Multi-Spectral & Radar Fusion</h4>
          <span className="provenance-tag tag-measured" style={{ fontSize: '0.65rem' }}>Sentinel-2 + S1 SAR</span>
        </div>

        <div className="grid-2" style={{ gap: '0.6rem' }}>
          {/* NDVI */}
          <div style={{ background: '#f8fafc', padding: '0.6rem', borderRadius: 6, border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>NDVI (Canopy Vigor)</span>
              <strong style={{ fontSize: '0.85rem', color: '#16a34a' }}>{ndvi !== null && ndvi !== undefined ? ndvi : '—'}</strong>
            </div>
            <div style={{ width: '100%', height: 4, background: '#e2e8f0', borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
              <div style={{ width: `${Math.max(0, Math.min(100, (ndvi || 0) * 100))}%`, height: '100%', background: '#16a34a' }} />
            </div>
          </div>

          {/* NDRE */}
          <div style={{ background: '#f8fafc', padding: '0.6rem', borderRadius: 6, border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>NDRE (Chlorophyll)</span>
              <strong style={{ fontSize: '0.85rem', color: '#0284c7' }}>{ndre !== null && ndre !== undefined ? ndre : '—'}</strong>
            </div>
            <div style={{ width: '100%', height: 4, background: '#e2e8f0', borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
              <div style={{ width: `${Math.max(0, Math.min(100, (ndre || 0) * 100))}%`, height: '100%', background: '#0284c7' }} />
            </div>
          </div>

          {/* NDMI */}
          <div style={{ background: '#f8fafc', padding: '0.6rem', borderRadius: 6, border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>NDMI (Canopy Water)</span>
              <strong style={{ fontSize: '0.85rem', color: '#0891b2' }}>{ndmi !== null && ndmi !== undefined ? ndmi : '—'}</strong>
            </div>
            <div style={{ width: '100%', height: 4, background: '#e2e8f0', borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
              <div style={{ width: `${Math.max(0, Math.min(100, ((ndmi || 0) + 0.2) * 150))}%`, height: '100%', background: '#0891b2' }} />
            </div>
          </div>

          {/* BSI */}
          <div style={{ background: '#f8fafc', padding: '0.6rem', borderRadius: 6, border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>BSI (Bare Soil Index)</span>
              <strong style={{ fontSize: '0.85rem', color: '#d97706' }}>{bsi !== null && bsi !== undefined ? bsi : '—'}</strong>
            </div>
            <div style={{ width: '100%', height: 4, background: '#e2e8f0', borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
              <div style={{ width: `${Math.max(0, Math.min(100, ((bsi || 0) + 0.3) * 120))}%`, height: '100%', background: '#d97706' }} />
            </div>
          </div>

          {/* S1 SAR VH */}
          <div style={{ background: '#f8fafc', padding: '0.6rem', borderRadius: 6, border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>SAR VH Backscatter</span>
              <strong style={{ fontSize: '0.85rem', color: '#4f46e5' }}>{vh_db !== null && vh_db !== undefined ? `${vh_db} dB` : '—'}</strong>
            </div>
            <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: 2 }}>Biomass canopy volume scattering</div>
          </div>

          {/* SAR Ratio */}
          <div style={{ background: '#f8fafc', padding: '0.6rem', borderRadius: 6, border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>SAR VH/VV Cross-Ratio</span>
              <strong style={{ fontSize: '0.85rem', color: '#4f46e5' }}>{sar_ratio !== null && sar_ratio !== undefined ? `${sar_ratio} dB` : '—'}</strong>
            </div>
            <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: 2 }}>All-weather cloud-penetrating index</div>
          </div>
        </div>
      </div>

      {/* 3. CNN Canopy Stress Inference Card */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span>🧠</span>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>CNN Crop Stress Inference</h4>
          </div>
          <span className="provenance-tag tag-model_estimated" style={{ fontSize: '0.65rem' }}>
            PyTorch CNN v1.2
          </span>
        </div>

        {cnnLoading ? (
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Running 8-band spectral CNN forward pass...</div>
        ) : cnnResult ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '0.6rem 0.75rem', borderRadius: 6, border: '1px solid var(--border-color)' }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Predicted Classification</div>
                <strong style={{ fontSize: '1rem', color: stressColor }}>{cnnResult.predicted_class}</strong>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Confidence</div>
                <strong style={{ fontSize: '1rem', color: '#0f172a' }}>{Math.round(cnnResult.confidence * 100)}%</strong>
              </div>
            </div>

            <p style={{ fontSize: '0.75rem', color: '#475569', margin: '0.6rem 0', lineHeight: 1.4 }}>
              {cnnResult.description}
            </p>

            {/* Class Probabilities Bar */}
            <div style={{ marginTop: '0.5rem' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 4 }}>Softmax Probabilities:</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {Object.entries(cnnResult.class_probabilities || {}).map(([cName, pVal]) => (
                  <div key={cName} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.7rem' }}>
                    <span style={{ width: 95, color: '#475569' }}>{cName}:</span>
                    <div style={{ flex: 1, height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${Math.round(pVal * 100)}%`,
                          height: '100%',
                          background: cName === cnnResult.predicted_class ? stressColor : '#94a3b8',
                        }}
                      />
                    </div>
                    <span style={{ width: 32, textAlign: 'right', fontWeight: 600 }}>{Math.round(pVal * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Inference unavailable.</div>
        )}
      </div>

      {/* 4. LSTM 15-Day Forward Forecast Card */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span>📈</span>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>LSTM 15-Day NDVI Forecast</h4>
          </div>
          <span className="provenance-tag tag-model_estimated" style={{ fontSize: '0.65rem' }}>
            Multi-Variate LSTM
          </span>
        </div>

        {lstmLoading ? (
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Computing LSTM 15-day forward trajectory...</div>
        ) : lstmResult ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Projected Trajectory: </span>
                <strong style={{ fontSize: '0.8rem', color: '#0f172a' }}>{lstmResult.trend_assessment}</strong>
              </div>
              <div>
                <span
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    padding: '0.1rem 0.4rem',
                    borderRadius: 3,
                    background: lstmResult.anomaly_detected ? '#fee2e2' : '#dcfce7',
                    color: lstmResult.anomaly_detected ? '#dc2626' : '#15803d',
                  }}
                >
                  {lstmResult.anomaly_detected ? '⚠️ Anomaly Detected' : '✓ Normal Dynamics'}
                </span>
              </div>
            </div>

            {/* Simple visual preview of 15 forecast steps */}
            <div style={{ background: '#f8fafc', padding: '0.6rem', borderRadius: 6, border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                <span>Day +1: {lstmResult.forecast_series?.[0]?.predicted_ndvi}</span>
                <span>Day +8: {lstmResult.forecast_series?.[7]?.predicted_ndvi}</span>
                <span>Day +15: {lstmResult.forecast_series?.[14]?.predicted_ndvi}</span>
              </div>

              {/* Sparkline visualization */}
              <div style={{ display: 'flex', alignItems: 'flex-end', height: 40, gap: 2, padding: '4px 0' }}>
                {(lstmResult.forecast_series || []).map((pt, idx) => {
                  const hPct = Math.max(15, Math.min(100, ((pt.predicted_ndvi - 0.2) / 0.6) * 100));
                  return (
                    <div
                      key={idx}
                      title={`Day +${pt.day_offset} (${pt.date}): NDVI ${pt.predicted_ndvi} [${pt.lower_bound_95} - ${pt.upper_bound_95}]`}
                      style={{
                        flex: 1,
                        height: `${hPct}%`,
                        background: '#3b82f6',
                        borderRadius: '2px 2px 0 0',
                        opacity: 0.6 + (idx / 15) * 0.4,
                      }}
                    />
                  );
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#64748b', marginTop: 4 }}>
                <span>Base: {lstmResult.base_date}</span>
                <span>95% Confidence Interval ±0.035</span>
              </div>
            </div>

            {lstmResult.anomaly_reason && (
              <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: '#fffbeb', borderLeft: '3px solid #f59e0b', fontSize: '0.7rem', color: '#92400e' }}>
                {lstmResult.anomaly_reason}
              </div>
            )}
          </div>
        ) : (
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Forecast unavailable.</div>
        )}
      </div>

      {/* 5. Multi-Factor AI Pest Risk Indicator */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span>🐛</span>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>AI Pest Risk Indicator (PBW)</h4>
          </div>
          <span className="provenance-tag tag-model_estimated" style={{ fontSize: '0.65rem' }}>
            Multi-Factor Fusion
          </span>
        </div>

        {pestLoading ? (
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Evaluating degree-day and canopy anomaly alignment...</div>
        ) : pestResult ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '0.6rem 0.75rem', borderRadius: 6, border: '1px solid var(--border-color)' }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Pest Emergence Risk</div>
                <strong style={{ fontSize: '0.95rem', color: pestResult.risk_level.includes('High') ? '#dc2626' : pestResult.risk_level.includes('Moderate') ? '#d97706' : '#16a34a' }}>
                  {pestResult.risk_level} (Score: {pestResult.risk_score})
                </strong>
              </div>
              <div style={{ textAlign: 'right', fontSize: '0.7rem', color: '#475569' }}>
                <div>Accumulated DD: {pestResult.component_factors?.thermal_degree_days_accumulated} °C·d</div>
                <div>Completed Gen: {pestResult.component_factors?.completed_generations}</div>
              </div>
            </div>

            <p style={{ fontSize: '0.725rem', color: '#475569', margin: '0.5rem 0 0 0', lineHeight: 1.4 }}>
              <strong>Advisory:</strong> {pestResult.recommendation}
            </p>
          </div>
        ) : (
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Pest indicator unavailable.</div>
        )}
      </div>

      {/* 6. Quick Action Toolbar */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <a
          href={getReportDownloadUrl(`zone_${zoneId}`, 'csv')}
          download={`agroviz_diagnostic_zone_${zoneId}.csv`}
          className="btn-secondary btn-sm"
          style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
        >
          📥 Export Zone CSV
        </a>
        <button
          type="button"
          className="btn-primary btn-sm"
          style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
          onClick={() => onNavigateTab('reports')}
        >
          📄 View Full Zone Dossier &rarr;
        </button>
      </div>
    </div>
  );
}
