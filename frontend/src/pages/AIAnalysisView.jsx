import React, { useEffect, useState } from 'react';
import {
  getZones,
  predictCropStress,
  forecastVegetation,
  getAIPestRisk,
} from '../api/client';
import ProvenanceBadge from '../components/ProvenanceBadge';

export default function AIAnalysisView({ onNavigateTab }) {
  const [zones, setZones] = useState([]);
  const [selectedZoneId, setSelectedZoneId] = useState(1);
  const [horizonDays, setHorizonDays] = useState(15);

  // CNN Interactive State
  const [cnnLoading, setCnnLoading] = useState(false);
  const [cnnResult, setCnnResult] = useState(null);
  const [customBandsMode, setCustomBandsMode] = useState(false);
  const [bandsInput, setBandsInput] = useState({
    B2: 0.035,
    B3: 0.065,
    B4: 0.045,
    B5: 0.120,
    B8: 0.480,
    B8A: 0.490,
    B11: 0.145,
    B12: 0.085,
  });

  // LSTM Interactive State
  const [lstmLoading, setLstmLoading] = useState(false);
  const [lstmResult, setLstmResult] = useState(null);

  // Pest Risk State
  const [pestLoading, setPestLoading] = useState(false);
  const [pestResult, setPestResult] = useState(null);

  // Fetch zones on mount
  useEffect(() => {
    getZones()
      .then((res) => {
        const list = res.data || [];
        setZones(list);
      })
      .catch((err) => console.warn('Failed to load zones:', err));
  }, []);

  // Run Inference on Zone Change
  const runInference = (zId = selectedZoneId) => {
    // 1. CNN
    setCnnLoading(true);
    const payload = customBandsMode ? { spectral_bands: bandsInput } : { zone_id: zId };
    predictCropStress(payload)
      .then((res) => setCnnResult(res.data))
      .catch((err) => console.error('CNN failed:', err))
      .finally(() => setCnnLoading(false));

    // 2. LSTM
    setLstmLoading(true);
    forecastVegetation({ zone_id: zId, horizon_days: horizonDays })
      .then((res) => setLstmResult(res.data))
      .catch((err) => console.error('LSTM failed:', err))
      .finally(() => setLstmLoading(false));

    // 3. Pest
    setPestLoading(true);
    getAIPestRisk(zId)
      .then((res) => setPestResult(res.data))
      .catch((err) => console.error('Pest failed:', err))
      .finally(() => setPestLoading(false));
  };

  useEffect(() => {
    runInference(selectedZoneId);
  }, [selectedZoneId, horizonDays, customBandsMode]);

  return (
    <div className="analysis-root" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Page Header */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.5rem' }}>🔬</span>
              <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700 }}>AI Analysis & Multi-Factor Inference</h2>
            </div>
            <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Live neural inference workbench: Spatial-Spectral CNN canopy stress evaluation, LSTM temporal forecasting, and multi-factor pest risk analysis.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <ProvenanceBadge provenance="model_estimated" />
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => onNavigateTab('ai_models')}
            >
              🧠 View Model Architectures &rarr;
            </button>
          </div>
        </div>

        {/* Zone Selector Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Select Monitoring Zone:</span>
            <select
              value={selectedZoneId}
              onChange={(e) => setSelectedZoneId(Number(e.target.value))}
              className="input-sm"
              style={{ padding: '0.3rem 0.6rem', fontSize: '0.85rem' }}
            >
              {zones.map((z) => (
                <option key={z.zone_id} value={z.zone_id}>
                  Zone {z.zone_id} — {z.crop_stress} (NDVI: {z.ndvi})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Forecast Horizon:</span>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              {[7, 15, 30].map((h) => (
                <button
                  key={h}
                  type="button"
                  className={`btn-sm ${horizonDays === h ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                  onClick={() => setHorizonDays(h)}
                >
                  {h} Days
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            className="btn-primary btn-sm"
            style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}
            onClick={() => runInference(selectedZoneId)}
          >
            ⚡ Re-run Neural Inference
          </button>
        </div>
      </div>

      {/* Grid: CNN on Left, LSTM on Right */}
      <div className="grid-2" style={{ gap: '1.25rem' }}>
        {/* LEFT: CNN Crop Stress Classifier */}
        <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '1.2rem' }}>🔬</span>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600 }}>CNN Crop Canopy Stress Classifier</h3>
            </div>
            <span style={{ fontSize: '0.7rem', background: '#f1f5f9', color: '#475569', padding: '0.2rem 0.5rem', borderRadius: 4, fontWeight: 600 }}>
              8 Spectral Bands
            </span>
          </div>

          {/* Mode Switch (Zone vs Custom Bands) */}
          <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
            <button
              type="button"
              className={`btn-sm ${!customBandsMode ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
              onClick={() => setCustomBandsMode(false)}
            >
              Use Zone {selectedZoneId} Sentinel-2 Bands
            </button>
            <button
              type="button"
              className={`btn-sm ${customBandsMode ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
              onClick={() => setCustomBandsMode(true)}
            >
              Manual 8-Band Reflectance Input
            </button>
          </div>

          {/* Custom Bands Input Form if enabled */}
          {customBandsMode && (
            <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: 6, border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                Enter surface reflectance values [0.0 to 1.0]:
              </div>
              <div className="grid-4" style={{ gap: '0.5rem' }}>
                {Object.keys(bandsInput).map((b) => (
                  <div key={b}>
                    <label style={{ fontSize: '0.65rem', display: 'block', fontWeight: 600 }}>{b}</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      className="input-sm"
                      style={{ width: '100%', fontSize: '0.75rem', padding: '0.15rem 0.35rem' }}
                      value={bandsInput[b]}
                      onChange={(e) => setBandsInput({ ...bandsInput, [b]: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CNN Prediction Output */}
          {cnnLoading ? (
            <div style={{ padding: '2rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Executing 1D Spectral-Spatial CNN forward pass...
            </div>
          ) : cnnResult ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: 6, border: '1px solid var(--border-color)' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Classified Crop Canopy Status</div>
                  <strong style={{ fontSize: '1.25rem', color: cnnResult.predicted_class === 'Healthy' ? '#16a34a' : cnnResult.predicted_class === 'Moderate Stress' ? '#eab308' : '#dc2626' }}>
                    {cnnResult.predicted_class}
                  </strong>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Neural Confidence</div>
                  <strong style={{ fontSize: '1.25rem', color: '#0f172a' }}>
                    {Math.round(cnnResult.confidence * 100)}%
                  </strong>
                </div>
              </div>

              {/* Computed Indices from bands */}
              <div className="grid-4" style={{ gap: '0.5rem' }}>
                <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 4, padding: '0.4rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.65rem', color: '#64748b' }}>NDVI</div>
                  <strong style={{ fontSize: '0.85rem', color: '#16a34a' }}>{cnnResult.computed_indices?.NDVI}</strong>
                </div>
                <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 4, padding: '0.4rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.65rem', color: '#64748b' }}>NDRE</div>
                  <strong style={{ fontSize: '0.85rem', color: '#0284c7' }}>{cnnResult.computed_indices?.NDRE}</strong>
                </div>
                <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 4, padding: '0.4rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.65rem', color: '#64748b' }}>NDMI</div>
                  <strong style={{ fontSize: '0.85rem', color: '#0891b2' }}>{cnnResult.computed_indices?.NDMI}</strong>
                </div>
                <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 4, padding: '0.4rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.65rem', color: '#64748b' }}>BSI</div>
                  <strong style={{ fontSize: '0.85rem', color: '#d97706' }}>{cnnResult.computed_indices?.BSI}</strong>
                </div>
              </div>

              {/* Softmax Probability Bars */}
              <div>
                <div style={{ fontSize: '0.725rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>
                  Class Probability Distribution:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {Object.entries(cnnResult.class_probabilities || {}).map(([cName, pVal]) => (
                    <div key={cName} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem' }}>
                      <span style={{ width: 110, color: '#334155' }}>{cName}</span>
                      <div style={{ flex: 1, height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${Math.round(pVal * 100)}%`,
                            height: '100%',
                            background: cName === cnnResult.predicted_class ? '#10b981' : '#94a3b8',
                          }}
                        />
                      </div>
                      <span style={{ width: 35, textAlign: 'right', fontWeight: 600 }}>{Math.round(pVal * 100)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* RIGHT: LSTM Temporal Vegetation Forecaster */}
        <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '1.2rem' }}>📈</span>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600 }}>LSTM Temporal Trajectory Forecaster</h3>
            </div>
            <span style={{ fontSize: '0.7rem', background: '#f1f5f9', color: '#475569', padding: '0.2rem 0.5rem', borderRadius: 4, fontWeight: 600 }}>
              {horizonDays} Days Horizon
            </span>
          </div>

          {lstmLoading ? (
            <div style={{ padding: '2rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Executing 2-Layer LSTM recurrent forward pass...
            </div>
          ) : lstmResult ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* Trajectory Status Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: 6, border: '1px solid var(--border-color)' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Projected Vegetative Trajectory</div>
                  <strong style={{ fontSize: '1.1rem', color: '#0f172a' }}>{lstmResult.trend_assessment}</strong>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Anomaly Score</div>
                  <strong style={{ fontSize: '1.1rem', color: lstmResult.anomaly_detected ? '#dc2626' : '#16a34a' }}>
                    {lstmResult.anomaly_score} {lstmResult.anomaly_detected ? '⚠️' : '✓'}
                  </strong>
                </div>
              </div>

              {/* Forecast Table / Steps */}
              <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 6, overflow: 'hidden' }}>
                <div style={{ padding: '0.5rem 0.75rem', background: '#f8fafc', borderBottom: '1px solid var(--border-color)', fontSize: '0.75rem', fontWeight: 600 }}>
                  Projected NDVI Timeline (Next {horizonDays} Days)
                </div>
                <div style={{ maxHeight: 180, overflowY: 'auto' }}>
                  <table className="table" style={{ width: '100%', fontSize: '0.75rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border-color)' }}>
                        <th style={{ padding: '0.4rem 0.6rem', textAlign: 'left' }}>Day</th>
                        <th style={{ padding: '0.4rem 0.6rem', textAlign: 'left' }}>Target Date</th>
                        <th style={{ padding: '0.4rem 0.6rem', textAlign: 'left' }}>Predicted NDVI</th>
                        <th style={{ padding: '0.4rem 0.6rem', textAlign: 'left' }}>95% Confidence Bounds</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lstmResult.forecast_series?.map((pt) => (
                        <tr key={pt.day_offset} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.4rem 0.6rem', fontWeight: 600 }}>+{pt.day_offset}</td>
                          <td style={{ padding: '0.4rem 0.6rem', color: '#475569' }}>{pt.date}</td>
                          <td style={{ padding: '0.4rem 0.6rem', color: '#0284c7', fontWeight: 700 }}>{pt.predicted_ndvi}</td>
                          <td style={{ padding: '0.4rem 0.6rem', color: '#64748b', fontFamily: 'var(--font-mono)' }}>
                            [{pt.lower_bound_95} – {pt.upper_bound_95}]
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* BOTTOM: Multi-Factor AI Pest Risk Screening Matrix */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '1.2rem' }}>🐛</span>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600 }}>
              Regional Pink Bollworm Risk Indicator (Zone {selectedZoneId})
            </h3>
          </div>
          <span className="provenance-tag tag-model_estimated">
            Degree-Day + Anomaly Fusion
          </span>
        </div>

        {pestLoading ? (
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Evaluating regional pest phenology...</div>
        ) : pestResult ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div className="grid-3" style={{ gap: '0.75rem' }}>
              <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: 6, border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Composite Pest Risk Level</div>
                <strong style={{ fontSize: '1.15rem', color: pestResult.risk_level.includes('High') ? '#dc2626' : pestResult.risk_level.includes('Moderate') ? '#d97706' : '#16a34a' }}>
                  {pestResult.risk_level} (Score {pestResult.risk_score})
                </strong>
                <div style={{ fontSize: '0.675rem', color: '#64748b', marginTop: 2 }}>Normalized range [0.0 to 1.0]</div>
              </div>

              <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: 6, border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Thermal Development Sum</div>
                <strong style={{ fontSize: '1.15rem', color: '#0f172a' }}>
                  {pestResult.component_factors?.thermal_degree_days_accumulated} °C·d
                </strong>
                <div style={{ fontSize: '0.675rem', color: '#64748b', marginTop: 2 }}>
                  {pestResult.component_factors?.completed_generations} Potential Generational Cycles
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: 6, border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Canopy Defoliation Factor</div>
                <strong style={{ fontSize: '1.15rem', color: '#0284c7' }}>
                  {pestResult.component_factors?.canopy_anomaly_score}
                </strong>
                <div style={{ fontSize: '0.675rem', color: '#64748b', marginTop: 2 }}>
                  Recent Rain: {pestResult.component_factors?.recent_14day_rainfall_mm} mm
                </div>
              </div>
            </div>

            <div style={{ background: '#fafbfc', borderLeft: '4px solid #0284c7', padding: '0.75rem', borderRadius: 4, fontSize: '0.8rem', color: '#334155' }}>
              <strong>Integrated Agronomic Advisory:</strong> {pestResult.recommendation}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
