import React, { useEffect, useState } from 'react';
import { getHealth, getDatasets } from './api/client';

export default function App() {
  const [healthResponse, setHealthResponse] = useState(null);
  const [datasetsResponse, setDatasetsResponse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [health, datasets] = await Promise.all([
          getHealth(),
          getDatasets(),
        ]);
        setHealthResponse(health);
        setDatasetsResponse(datasets);
      } catch (err) {
        console.error('Failed to connect to AgroViz backend:', err);
        setError(err.message || 'Unable to connect to backend service.');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <div className="app-container">
      <header className="header">
        <div className="header-inner">
          <div className="header-title">
            <span>🌱</span> AgroViz
            <span className="header-badge">Research Prototype</span>
          </div>
          <div>
            {healthResponse?.data ? (
              <span className={`status-badge ${healthResponse.data.status === 'healthy' ? 'status-healthy' : 'status-degraded'}`}>
                ● Backend {healthResponse.data.status}
              </span>
            ) : error ? (
              <span className="status-badge status-error">● Backend Offline</span>
            ) : (
              <span className="status-badge">● Connecting...</span>
            )}
          </div>
        </div>
      </header>

      <main className="main-content">
        <div className="card">
          <h2 className="card-title">Phase 1: System Health & Data Registry</h2>

          {loading && <p>Connecting to backend API at <code>http://localhost:8000/api/health</code>...</p>}

          {error && (
            <div className="notice-box" style={{ borderLeftColor: '#ef4444' }}>
              <strong>Connection Error:</strong>
              <p>{error}</p>
              <p style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>
                Ensure the FastAPI backend server is running: <code>uvicorn app.main:app --reload --port 8000</code> inside <code>backend/</code>.
              </p>
            </div>
          )}

          {healthResponse && (
            <>
              <div className="grid-2">
                <div>
                  <div className="meta-row">
                    <span className="meta-label">System Status</span>
                    <span className="meta-value">{healthResponse.data.status}</span>
                  </div>
                  <div className="meta-row">
                    <span className="meta-label">Application</span>
                    <span className="meta-value">{healthResponse.data.app_name} (v{healthResponse.data.version})</span>
                  </div>
                  <div className="meta-row">
                    <span className="meta-label">Environment</span>
                    <span className="meta-value">{healthResponse.data.environment}</span>
                  </div>
                </div>
                <div>
                  <div className="meta-row">
                    <span className="meta-label">Datasets Found</span>
                    <span className="meta-value">
                      {healthResponse.data.datasets_present} of {healthResponse.data.datasets_total} present
                    </span>
                  </div>
                  <div className="meta-row">
                    <span className="meta-label">Data Directory</span>
                    <span className="meta-value" style={{ fontSize: '0.8rem' }}>{healthResponse.data.data_raw_path}</span>
                  </div>
                  <div className="meta-row">
                    <span className="meta-label">API Provenance Envelope</span>
                    <span className="provenance-tag tag-measured">{healthResponse.provenance}</span>
                  </div>
                </div>
              </div>

              {healthResponse.notes && healthResponse.notes.length > 0 && (
                <div className="notice-box">
                  <strong>Diagnostic Notes:</strong>
                  {healthResponse.notes.map((note, idx) => (
                    <p key={idx}>• {note}</p>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {datasetsResponse?.data && (
          <div className="card">
            <h2 className="card-title">Canonical Data Manifest ({datasetsResponse.data.total_found}/{datasetsResponse.data.total_expected} Verified)</h2>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Canonical File</th>
                    <th>Role</th>
                    <th>Provenance</th>
                    <th>Source</th>
                    <th>Period</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {datasetsResponse.data.datasets.map((item) => (
                    <tr key={item.id}>
                      <td style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem' }}>
                        {item.canonical_filename}
                        {item.size_bytes && (
                          <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                            ({(item.size_bytes / 1024).toFixed(1)} KB)
                          </span>
                        )}
                      </td>
                      <td>{item.role}</td>
                      <td>
                        <span className={`provenance-tag tag-${item.provenance}`}>
                          {item.provenance}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem' }}>{item.source}</td>
                      <td style={{ fontSize: '0.8rem' }}>{item.period}</td>
                      <td>
                        {item.exists ? (
                          <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>✓ Verified</span>
                        ) : (
                          <span style={{ color: '#ef4444', fontWeight: 600 }}>✗ Missing</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      <footer className="footer">
        Research prototype. Satellite, model and literature-based values are indicators, not confirmation of pest infestation.
      </footer>
    </div>
  );
}
