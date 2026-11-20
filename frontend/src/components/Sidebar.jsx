import React from 'react';

const CORE_WORKFLOWS = [
  { id: 'workspace', label: 'GIS Workspace', icon: '🗺️', badge: '30 Zones' },
  { id: 'data_input', label: 'Data Ingestion Hub', icon: '📥' },
  { id: 'image_processing', label: 'Spectral & SAR Engine', icon: '🛰️' },
  { id: 'ai_models', label: 'AI Model Management', icon: '🧠', badge: 'PyTorch' },
  { id: 'ai_analysis', label: 'AI Crop & Pest Analysis', icon: '🔬' },
];

const INTELLIGENCE_ITEMS = [
  { id: 'alerts', label: 'Alerts Feed', icon: '🔔' },
  { id: 'reports', label: 'Field & Zone Reports', icon: '📄' },
  { id: 'datasets', label: 'Dataset Catalog', icon: '📚' },
];

export default function Sidebar({ activeTab, setActiveTab }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-logo">🌱</div>
        <div className="brand-info">
          <span className="brand-name">AgroViz</span>
          <span className="brand-tagline">AI Crop Monitoring Platform</span>
        </div>
      </div>

      <div className="sidebar-section-title">CORE AI WORKFLOWS</div>
      <nav className="sidebar-nav">
        {CORE_WORKFLOWS.map((item) => {
          const isActive =
            activeTab === item.id ||
            (item.id === 'workspace' && (activeTab === 'dashboard' || activeTab === 'fields'));
          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? 'nav-item-active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label" style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
              {item.badge && (
                <span style={{
                  fontSize: '0.625rem',
                  padding: '0.1rem 0.35rem',
                  borderRadius: 4,
                  background: isActive ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
                  color: isActive ? '#ffffff' : '#475569',
                  fontWeight: 600,
                }}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-section-title" style={{ marginTop: '1.25rem' }}>
        INTELLIGENCE & REPORTS
      </div>
      <nav className="sidebar-nav">
        {INTELLIGENCE_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? 'nav-item-active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer-box">
        <div className="study-area-label">Study Region</div>
        <div className="study-area-val">Akola Cotton Belt, Maharashtra</div>
        <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.2rem' }}>
          30 Monitoring Zones • Multi-Sensor AI
        </div>
      </div>
    </aside>
  );
}
