import React, { useEffect, useState } from 'react';
import { getAIModels } from '../api/client';
import ProvenanceBadge from '../components/ProvenanceBadge';

export default function AIModelManagement({ onNavigateTab }) {
  const [modelsData, setModelsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedModelId, setSelectedModelId] = useState('cnn_crop_stress');

  useEffect(() => {
    setLoading(true);
    getAIModels()
      .then((res) => {
        setModelsData(res.data);
      })
      .catch((err) => {
        console.error('Failed to load AI model registry:', err);
        setError(err.message || 'Unable to load model metadata.');
      })
      .finally(() => setLoading(false));
  }, []);

  const models = modelsData?.models || [];
  const currentModel = models.find((m) => m.id === selectedModelId) || models[0];

  return (
    <div className="models-root" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Page Header */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.5rem' }}>🧠</span>
              <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700 }}>AI Model Management Hub</h2>
            </div>
            <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Inspect neural network architectures, layer dimensions, parameter counts, loss convergence, and evaluation benchmarks for SIH25099.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <ProvenanceBadge provenance="model_estimated" />
            <span style={{ fontSize: '0.75rem', background: '#e0f2fe', color: '#0369a1', padding: '0.25rem 0.6rem', borderRadius: 6, fontWeight: 600 }}>
              PyTorch 2.14 • Local CPU Runtime
            </span>
          </div>
        </div>

        {/* Model Tabs Selector */}
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
          {models.map((m) => {
            const isSel = m.id === currentModel?.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedModelId(m.id)}
                className={`btn-sm ${isSel ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <span>{m.id.includes('cnn') ? '🔬' : '📈'}</span>
                <span>{m.name}</span>
                <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>({m.version})</span>
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading AI Model Registry...
        </div>
      ) : error ? (
        <div className="card" style={{ padding: '2rem', color: '#dc2626' }}>
          Error: {error}
        </div>
      ) : currentModel ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Key Model Specs Cards */}
          <div className="grid-4" style={{ gap: '1rem' }}>
            <div className="card" style={{ padding: '1rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Trainable Parameters</div>
              <strong style={{ fontSize: '1.35rem', color: '#0f172a' }}>
                {currentModel.trainable_parameters?.toLocaleString()}
              </strong>
              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 2 }}>Fully differentiable weights</div>
            </div>

            <div className="card" style={{ padding: '1rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Inference Latency</div>
              <strong style={{ fontSize: '1.35rem', color: '#16a34a' }}>
                {currentModel.evaluation_metrics?.inference_latency_ms} ms
              </strong>
              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 2 }}>Per forward pass (CPU)</div>
            </div>

            <div className="card" style={{ padding: '1rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Primary Metric</div>
              <strong style={{ fontSize: '1.35rem', color: '#0284c7' }}>
                {currentModel.evaluation_metrics?.accuracy
                  ? `${(currentModel.evaluation_metrics.accuracy * 100).toFixed(1)}% Acc`
                  : `R² ${currentModel.evaluation_metrics?.r_squared}`}
              </strong>
              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 2 }}>
                {currentModel.evaluation_metrics?.macro_f1
                  ? `Macro F1: ${(currentModel.evaluation_metrics.macro_f1 * 100).toFixed(1)}%`
                  : `MAE: ${currentModel.evaluation_metrics?.mae_ndvi} NDVI`}
              </div>
            </div>

            <div className="card" style={{ padding: '1rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Production Status</div>
              <strong style={{ fontSize: '1rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
                Active in Service
              </strong>
              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 4 }}>
                Target: {currentModel.target_task}
              </div>
            </div>
          </div>

          {/* Model Architecture Layer Breakdown Table */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.05rem', fontWeight: 600 }}>
              Layer Breakdown & Tensor Transformations
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid var(--border-color)' }}>
                    <th style={{ padding: '0.6rem 0.75rem', textAlign: 'left' }}>#</th>
                    <th style={{ padding: '0.6rem 0.75rem', textAlign: 'left' }}>Layer Name</th>
                    <th style={{ padding: '0.6rem 0.75rem', textAlign: 'left' }}>Output Tensor Shape</th>
                    <th style={{ padding: '0.6rem 0.75rem', textAlign: 'left' }}>Operation & Layer Specification</th>
                  </tr>
                </thead>
                <tbody>
                  {currentModel.layer_breakdown?.map((l, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.6rem 0.75rem', color: 'var(--text-muted)' }}>{idx + 1}</td>
                      <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}><code>{l.layer}</code></td>
                      <td style={{ padding: '0.6rem 0.75rem', color: '#0369a1', fontFamily: 'var(--font-mono)' }}>{l.shape}</td>
                      <td style={{ padding: '0.6rem 0.75rem', color: '#475569' }}>{l.type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Training Loss History Convergence */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.05rem', fontWeight: 600 }}>
              Training Loss Convergence Curve
            </h3>
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Cross-entropy and MSE convergence metrics recorded across 30 training epochs with AdamW optimizer.
            </p>

            <div style={{ display: 'flex', alignItems: 'flex-end', height: 120, gap: '1rem', padding: '1rem 0', borderBottom: '1px solid var(--border-color)' }}>
              {currentModel.training_loss_history?.map((ep, idx) => {
                const lossVal = ep.loss !== undefined ? ep.loss : ep.mse_loss * 50;
                const hPct = Math.max(10, Math.min(100, (lossVal / 0.8) * 100));
                return (
                  <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: '0.65rem', color: '#64748b', marginBottom: 4 }}>
                      {(ep.loss || ep.mse_loss).toFixed(3)}
                    </span>
                    <div
                      style={{
                        width: '70%',
                        height: `${hPct}%`,
                        background: '#3b82f6',
                        borderRadius: '3px 3px 0 0',
                      }}
                    />
                    <span style={{ fontSize: '0.7rem', color: '#475569', marginTop: 4, fontWeight: 600 }}>
                      Ep {ep.epoch}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Link to Live Analysis */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button
              type="button"
              className="btn-primary"
              style={{ fontSize: '0.85rem', padding: '0.5rem 1.25rem' }}
              onClick={() => onNavigateTab('ai_analysis')}
            >
              Run Live Inference with this Model &rarr;
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
