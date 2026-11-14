import React from 'react';

const MODULE_SPECS = {
  overview: {
    title: 'Overview Dashboard & Spatial Monitoring',
    phase: 'Phase 8',
    icon: '📊',
    datasets: ['weather_nasa_power', 'sentinel2_indices_gee', 'era5_soil_moisture_three_layer', 'soilgrids_properties'],
    description: 'High-level synthesis dashboard featuring dataset coverage status cards, spatial study area map with Leaflet (10 km AOI buffer around 20.7069°N, 77.0022°E, Paras survey point, Annexure 3 Akola reference), and overall environmental indicator summaries.',
    rules: [
      'Status cards show real measurements or "unavailable" — never a synthetic risk index or arbitrary percentage.',
      'Interactive Leaflet map displaying the study center point and published reference coordinates.',
      'Clear demarcation between environmental monitoring and published historical context.',
    ],
  },
  weather: {
    title: 'Surface Meteorology (Weather Module)',
    phase: 'Phase 4',
    icon: '🌦️',
    datasets: ['weather_nasa_power'],
    description: 'Daily surface weather time series including temperature (mean, min, max), relative humidity (RH2M), and precipitation (PRECTOTCORR) from NASA POWER MERRA-2 reanalysis covering June 2023 through December 2024.',
    rules: [
      'Dataset is MERRA-2 atmospheric reanalysis (~0.5° × 0.625° grid), NOT a direct ground weather station measurement.',
      'Covers 19 months without long-term station climatology.',
      'Interactive date range filters, daily time-series charts, and monthly aggregation statistics.',
    ],
  },
  crop_health: {
    title: 'Crop Condition & Canopy Moisture (Sentinel-2)',
    phase: 'Phase 7',
    icon: '🛰️',
    datasets: ['sentinel2_indices_gee', 'sentinel2_indices_pc_validation', 'sentinel2_inventory'],
    description: 'Cleaned multi-spectral vegetation indices (NDVI, NDMI, NDRE) aggregated over the 10 km radius AOI from Sentinel-2 Harmonized Surface Reflectance.',
    rules: [
      'Values reflect the aggregate 10 km buffer area (bare soil, grasslands, diverse crops), NOT isolated cotton fields.',
      'July monsoon gap: zero valid optical observations in July 2023 & July 2024 due to persistent cloud cover (explicitly highlighted, never interpolated).',
      'NDMI is an optical canopy-moisture indicator, never to be conflated with soil moisture.',
    ],
  },
  soil: {
    title: 'Soil Moisture & Gridded Properties',
    phase: 'Phase 6',
    icon: '🌍',
    datasets: ['era5_soil_moisture_three_layer', 'soilgrids_properties', 'era5_soil_moisture_single_layer'],
    description: 'ERA5-Land daily volumetric soil moisture across 3 distinct depths (0–7 cm, 7–28 cm, 28–100 cm) combined with static ISRIC SoilGrids 2.0 physical and chemical depth profiles (clay, sand, silt, pH, SOC).',
    rules: [
      'ERA5-Land is a numerical model estimate (~11 km resolution), not an in-situ capacitive sensor.',
      'SoilGrids is a machine-learning global digital soil map snapshot, not field soil sampling.',
      'Includes an empty "Field Sensor Data" slot with explicit upload schema instructions.',
    ],
  },
  pbw: {
    title: 'Pink Bollworm (PBW) Phenology & Literature Context',
    phase: 'Phase 5',
    icon: '🐛',
    datasets: ['pbw_annexure_3_seasonal', 'pbw_annexure_4_multilocation'],
    description: 'Three distinct non-overlapping sections: (1) Literature-parameterized single-sine degree-day thermal development indicator (Sets A & B), (2) Published historical survey context from Fand et al. (2025), and (3) Explicit "Data Unavailable" state for observed dated field pest records.',
    rules: [
      'Degree-day output is a thermal development indicator, NEVER a pest infestation or risk score.',
      'Zero temporal overlap: Published survey data (2015-16 to 2022-23 annual) does not overlap 2023-2024 weather/satellite data.',
      'No statistical or machine learning linkages between weather and pest loss are permitted.',
    ],
  },
  ai_analysis: {
    title: 'Descriptive AI Screening & Validation Limitations',
    phase: 'Phase 9',
    icon: '🧠',
    datasets: ['weather_nasa_power', 'sentinel2_indices_gee'],
    description: 'Year-on-year descriptive crop-condition screening across common calendar windows (August–December), shared degree-day phenological computation, and a permanently locked "Validated PBW Risk" panel.',
    rules: [
      'Descriptive screening only — no automated "disease" or "stress" diagnosis.',
      'Validated PBW Risk prediction is locked as unavailable with full technical explanation of required field data.',
      'Transparent, explainable calculations adhering to MCA academic requirements.',
    ],
  },
};

export default function ModulePlaceholder({ moduleId, onInspectDataset }) {
  const spec = MODULE_SPECS[moduleId] || {
    title: 'Module In Development',
    phase: 'Future Phase',
    icon: '⚙️',
    datasets: [],
    description: 'This module is scheduled in the 10-phase AgroViz development plan.',
    rules: [],
  };

  return (
    <div className="module-placeholder-container">
      <div className="placeholder-hero">
        <div className="placeholder-icon">{spec.icon}</div>
        <div className="placeholder-info">
          <div className="placeholder-badge">{spec.phase} Implementation</div>
          <h2 className="placeholder-title">{spec.title}</h2>
          <p className="placeholder-desc">{spec.description}</p>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <h3 className="card-title">Associated Canonical Datasets</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            All required raw datasets are loaded, cleaned, and profiled in Phase 2, ready for module integration.
          </p>
          <ul className="placeholder-dataset-list">
            {spec.datasets.map((dId) => (
              <li key={dId} className="placeholder-dataset-item">
                <code>{dId}</code>
                <button
                  className="btn-secondary btn-sm"
                  onClick={() => onInspectDataset(dId)}
                >
                  Inspect in Dataset Management →
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <h3 className="card-title">Scientific & Methodological Constraints</h3>
          <ul className="rules-list">
            {spec.rules.map((rule, idx) => (
              <li key={idx} className="rule-item">
                <span className="rule-bullet">🔒</span>
                <span>{rule}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="notice-box">
        <strong>Phase 3 Status:</strong> This view is an architectural placeholder. Dataset Management is fully active and interactive in the sidebar. You can inspect all underlying clean datasets, preview real records, and view quality profiles now.
      </div>
    </div>
  );
}
