import React from 'react';

const MAIN_NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'fields', label: 'My Fields', icon: '🚜' },
  { id: 'alerts', label: 'Alerts', icon: '🔔' },
  { id: 'reports', label: 'Reports', icon: '📄' },
];

const ANALYTIC_ITEMS = [
  { id: 'weather', label: 'Weather Monitoring', icon: '🌦️' },
  { id: 'soil', label: 'Soil Conditions', icon: '🌍' },
  { id: 'crop_health', label: 'Crop Health (S2)', icon: '🛰️' },
  { id: 'pbw', label: 'Pest Phenology', icon: '🐛' },
];

export default function Sidebar({ activeTab, setActiveTab }) {
  const isAnalyticActive = ['weather', 'soil', 'crop_health', 'pbw'].includes(activeTab);

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-logo">🌱</div>
        <div className="brand-info">
          <span className="brand-name">AgroViz</span>
          <span className="brand-tagline">Precision Agriculture</span>
        </div>
      </div>

      <div className="sidebar-section-title">MAIN NAVIGATION</div>
      <nav className="sidebar-nav">
        {MAIN_NAV_ITEMS.map((item) => {
          const isActive =
            activeTab === item.id ||
            (item.id === 'dashboard' && activeTab === 'workspace');
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

      {isAnalyticActive && (
        <>
          <div className="sidebar-section-title" style={{ marginTop: '1.25rem' }}>
            FIELD ANALYTICS
          </div>
          <nav className="sidebar-nav">
            {ANALYTIC_ITEMS.filter((item) => item.id === activeTab).map((item) => (
              <button
                key={item.id}
                className="nav-item nav-item-active"
                onClick={() => setActiveTab(item.id)}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </button>
            ))}
          </nav>
        </>
      )}

      <div className="sidebar-footer-box">
        <div className="study-area-label">Region</div>
        <div className="study-area-val">Akola District, Maharashtra</div>
      </div>
    </aside>
  );
}
