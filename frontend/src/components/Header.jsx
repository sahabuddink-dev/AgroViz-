import React from 'react';

const MODULE_TITLES = {
  dashboard: 'Field Monitoring Dashboard',
  workspace: 'Field Monitoring Dashboard',
  fields: 'My Agricultural Fields',
  alerts: 'Field Alerts & Advisory',
  reports: 'Field Health Reports & Trends',
  weather: 'Weather Monitoring',
  crop_health: 'Crop Health & Canopy Vigor',
  soil: 'Soil Conditions & Moisture',
  pbw: 'Pest Phenology (Pink Bollworm)',
};

export default function Header({ activeTab, healthData, error, onNavigateTab }) {
  const currentTitle = MODULE_TITLES[activeTab] || 'Dashboard';
  const isAnalyticView = ['weather', 'soil', 'crop_health', 'pbw'].includes(activeTab);

  return (
    <header className="app-header">
      <div className="header-breadcrumbs">
        <span className="crumb-root">AgroViz</span>
        <span className="crumb-sep">/</span>
        <span className="crumb-active">{currentTitle}</span>
        {isAnalyticView && onNavigateTab && (
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={() => onNavigateTab('dashboard')}
            style={{ marginLeft: '1rem', padding: '0.2rem 0.55rem', fontSize: '0.75rem' }}
          >
            &larr; Back to Dashboard
          </button>
        )}
      </div>

      <div className="header-status-area">
        {healthData ? (
          <div className="health-indicator status-healthy" title="Backend service active">
            <span className="pulse-dot"></span>
            <span>System Online</span>
          </div>
        ) : error ? (
          <div className="health-indicator status-error" title={error}>
            <span className="error-dot"></span>
            <span>System Offline</span>
          </div>
        ) : (
          <div className="health-indicator status-neutral">
            <span>Connecting...</span>
          </div>
        )}
      </div>
    </header>
  );
}
