import React, { useEffect, useState } from 'react';
import { getFields, getAlerts } from '../api/client';
import ProvenanceBadge from '../components/ProvenanceBadge';

export default function Alerts() {
  const [fields, setFields] = useState([]);
  const [selectedFieldId, setSelectedFieldId] = useState('field_akola_research_demo');
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [severityFilter, setSeverityFilter] = useState('all'); // 'all' | 'Warning' | 'Info' | 'Critical'
  const [categoryFilter, setCategoryFilter] = useState('all'); // 'all' | 'crop_health' | 'weather' | 'soil' | 'pest_phenology' | 'field_setup'

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

  // Load alerts whenever selectedFieldId changes
  const fetchAlerts = async (fieldId) => {
    try {
      setLoading(true);
      setError(null);
      const res = await getAlerts(fieldId);
      setAlerts(res.data || []);
    } catch (err) {
      console.error('Failed to load alerts:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to evaluate agricultural alerts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedFieldId) {
      fetchAlerts(selectedFieldId);
    }
  }, [selectedFieldId]);

  const selectedField = fields.find((f) => f.id === selectedFieldId);

  // Filter alerts
  const filteredAlerts = alerts.filter((a) => {
    if (severityFilter !== 'all' && a.severity !== severityFilter) return false;
    if (categoryFilter !== 'all' && a.category !== categoryFilter) return false;
    return true;
  });

  return (
    <div className="alerts-page" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Module Header Card */}
      <div className="module-header card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.5rem' }}>🔔</span>
              <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700 }}>
                Evidence-Based Agricultural Alert Engine
              </h2>
            </div>
            <p style={{ margin: '0.35rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Deterministic agronomic threshold alerts, optical satellite cloud occlusion notices, root-zone moisture deficits, and thermal phenology milestones
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <ProvenanceBadge provenance="calculated" />
            <span className="provenance-tag tag-model_estimated">Deterministic Rules</span>
          </div>
        </div>

        {/* Field Selector & Filter Controls Bar */}
        <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          {/* Field Selection */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Active Field:</span>
            <select
              className="input-sm"
              value={selectedFieldId}
              onChange={(e) => setSelectedFieldId(e.target.value)}
              style={{ minWidth: 280, fontWeight: 600 }}
            >
              {fields.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.is_demo ? '10 km Research AOI' : `${f.area_hectares} ha Farm`})
                </option>
              ))}
            </select>
          </div>

          {/* Severity Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Severity:</span>
            {['all', 'Warning', 'Info', 'Critical'].map((sev) => (
              <button
                key={sev}
                type="button"
                className={`btn-sm ${severityFilter === sev ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.75rem', padding: '0.2rem 0.55rem' }}
                onClick={() => setSeverityFilter(sev)}
              >
                {sev === 'all' ? 'All Severities' : sev}
              </button>
            ))}
          </div>

          {/* Category Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Category:</span>
            {[
              { id: 'all', label: 'All' },
              { id: 'crop_health', label: 'Crop Health' },
              { id: 'soil', label: 'Soil' },
              { id: 'pest_phenology', label: 'Pest Phenology' },
              { id: 'weather', label: 'Weather' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`btn-sm ${categoryFilter === cat.id ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.75rem', padding: '0.2rem 0.55rem' }}
                onClick={() => setCategoryFilter(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Scientific Honesty Notice Banner */}
      <div className="card" style={{ background: '#f8fafc', borderLeft: '4px solid #0284c7', padding: '0.85rem 1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.25rem' }}>ℹ️</span>
          <div style={{ fontSize: '0.825rem', color: '#334155', lineHeight: 1.5 }}>
            <strong>Deterministic Rule Integrity:</strong> Every alert is evaluated deterministically using verifiable mathematical thresholds
            and published agronomic literature. AgroViz <strong>never</strong> invents composite risk scores or fabricates unvalidated pest classifications.
            Thermal degree-days denote physiological heat unit capacity only, and <strong>never</strong> confirm in-situ infestation without local pheromone trap counts.
          </div>
        </div>
      </div>

      {/* Alerts Feed */}
      {loading ? (
        <div className="card loading-card" style={{ padding: '2.5rem', textAlign: 'center' }}>
          <div className="spinner"></div>
          <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>Evaluating evidence-based alerts for {selectedField?.name}...</p>
        </div>
      ) : error ? (
        <div className="card error-card" style={{ padding: '1.5rem', color: '#991b1b', background: '#fee2e2' }}>
          <strong>Error Loading Alerts:</strong> {error}
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>✅</div>
          <h3>No Active Alerts Triggered</h3>
          <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
            No agronomic rules matched the selected filter criteria for this field.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredAlerts.map((alert) => {
            const isWarn = alert.severity === 'Warning';
            const isCrit = alert.severity === 'Critical';
            const borderColor = isCrit ? '#dc2626' : isWarn ? '#f59e0b' : '#0284c7';
            const bgColor = isCrit ? '#fef2f2' : isWarn ? '#fffbeb' : '#ffffff';
            const badgeBg = isCrit ? '#dc2626' : isWarn ? '#f59e0b' : '#0284c7';

            return (
              <div
                key={alert.id}
                className="card"
                style={{
                  borderLeft: `5px solid ${borderColor}`,
                  background: bgColor,
                  padding: '1.25rem 1.5rem',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                {/* Alert Top Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span
                      style={{
                        background: badgeBg,
                        color: '#ffffff',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '0.2rem 0.5rem',
                        borderRadius: 4,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      {alert.severity}
                    </span>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      {alert.title}
                    </h3>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Category: <strong>{alert.category}</strong>
                    </span>
                    <ProvenanceBadge provenance={alert.provenance} />
                  </div>
                </div>

                {/* Primary Message */}
                <div style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: 500, marginBottom: '0.75rem', lineHeight: 1.5 }}>
                  {alert.message}
                </div>

                {/* Detailed Agronomic Explanation */}
                <div style={{ background: 'rgba(255, 255, 255, 0.7)', border: '1px solid var(--border-color)', borderRadius: 6, padding: '0.75rem 1rem', marginBottom: '0.75rem', fontSize: '0.825rem', color: '#334155', lineHeight: 1.55 }}>
                  <strong>Agronomic Context & Explanation:</strong> {alert.explanation}
                </div>

                {/* Actionable Recommendations */}
                {alert.recommendations && alert.recommendations.length > 0 && (
                  <div style={{ marginBottom: '0.75rem' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#15803d', marginBottom: '0.35rem' }}>
                      Recommended Agronomic Actions:
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.8rem', color: '#334155', lineHeight: 1.5 }}>
                      {alert.recommendations.map((rec, i) => (
                        <li key={i}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Scientific Limitations & Metadata Footer */}
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem', marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                  <span>
                    Source: <strong>{alert.source}</strong> | Status: <strong>{alert.status}</strong>
                  </span>
                  <span>
                    Field: <strong>{alert.field_name}</strong>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
