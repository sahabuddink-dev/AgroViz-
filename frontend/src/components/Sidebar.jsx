import React from 'react';

const NAV_ITEMS = [
  { id: 'weather', label: 'Weather Monitoring', icon: '🌦️', status: 'Live', badgeColor: 'green' },
  { id: 'soil', label: 'Soil Conditions', icon: '🌍', status: 'Live', badgeColor: 'green' },
  { id: 'crop_health', label: 'Crop Health (S2)', icon: '🛰️', status: 'Live', badgeColor: 'green' },
  { id: 'pbw', label: 'Pink Bollworm (PBW)', icon: '🐛', status: 'Active', badgeColor: 'green' },
  { id: 'datasets', label: 'Dataset Management', icon: '📁', status: 'Active', badgeColor: 'green' },
  { id: 'about', label: 'Methodology & Sources', icon: 'ℹ️', status: 'Reference', badgeColor: 'blue' },
];

export default function Sidebar({ activeTab, setActiveTab }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-logo">🌱</div>
        <div className="brand-info">
          <span className="brand-name">AgroViz</span>
          <span className="brand-tagline">Akola Research Prototype</span>
        </div>
      </div>

      <div className="sidebar-section-title">SYSTEM MODULES</div>
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? 'nav-item-active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
              <span className={`nav-badge badge-${item.badgeColor}`}>
                {item.status}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer-box">
        <div className="study-area-label">Study Region</div>
        <div className="study-area-val">Akola District, MH</div>
        <div className="study-coords">20.7069°N, 77.0022°E (10 km AOI)</div>
      </div>
    </aside>
  );
}
