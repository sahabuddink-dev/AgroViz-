import React from 'react';

const MODULE_TITLES = {
  datasets: 'Dataset Management & Provenance Registry',
  overview: 'Overview Dashboard & Spatial Monitoring',
  weather: 'Surface Meteorology (NASA POWER MERRA-2)',
  crop_health: 'Crop Condition & Canopy Moisture (Sentinel-2)',
  soil: 'Soil Moisture & SoilGrids Physical Properties',
  pbw: 'Pink Bollworm Thermal Phenology & Context',
  ai_analysis: 'Descriptive AI Screening & Degree-Day Model',
  about: 'Project Context, Methodological Caveats & Citations',
};

export default function Header({ activeTab, healthData, error }) {
  const currentTitle = MODULE_TITLES[activeTab] || 'AgroViz Prototype';

  return (
    <header className="app-header">
      <div className="header-breadcrumbs">
        <span className="crumb-root">AgroViz</span>
        <span className="crumb-sep">/</span>
        <span className="crumb-active">{currentTitle}</span>
      </div>

      <div className="header-status-area">
        {healthData ? (
          <div className="health-indicator status-healthy" title={healthData.notes?.[0] || 'Backend online'}>
            <span className="pulse-dot"></span>
            <span>FastAPI: Healthy ({healthData.data?.datasets_present}/{healthData.data?.datasets_total} Datasets)</span>
          </div>
        ) : error ? (
          <div className="health-indicator status-error" title={error}>
            <span className="error-dot"></span>
            <span>FastAPI: Offline</span>
          </div>
        ) : (
          <div className="health-indicator status-neutral">
            <span>Connecting to backend...</span>
          </div>
        )}

        <div className="repo-badge" title="Synced with GitHub">
          <span className="repo-icon">🐙</span>
          <span className="repo-text">GitHub: main</span>
        </div>
      </div>
    </header>
  );
}
