import React from 'react';

const CITATIONS = [
  {
    category: 'Pink Bollworm & Cotton Yield Loss Context',
    items: [
      {
        citation: 'Fand, B.B., et al. (2025). Field estimates of current and predicted cotton yield loss due to pink bollworm and boll rot in India. Agricultural Systems, 224, 104246.',
        doi: '10.1016/j.agsy.2024.104246',
        role: 'Source of Annexure 3 (Station-wise seasonal damage) and Annexure 4 (Multilocation survey). Used strictly as historical context; does not overlap 2023-2024 monitoring.',
      },
      {
        citation: 'Fand, B. (2024). Supplementary data for: Field estimates of current and predicted cotton yield loss due to pink bollworm and boll rot in India. Mendeley Data, V1.',
        doi: '10.17632/2xp6xvct2x.1',
        role: 'Public repository containing raw survey and regression records released under CC BY 4.0 license.',
      },
    ],
  },
  {
    category: 'Degree-Day Phenology Parameters (Set A & Set B)',
    items: [
      {
        citation: 'Scientific Reports (2021). Degree day-based model predicts pink bollworm phenology across geographical locations. Sci Rep 11, 436.',
        doi: '10.1038/s41598-020-80184-6',
        role: 'Default Parameter Set A for Indian cotton regions: Lower threshold 13.4 °C, Upper threshold 35.5 °C, Generation requirement 503.62 DD.',
      },
      {
        citation: 'Beasley, C.A., & Adams, C.J. (1996). Field-based degree-day model for pink bollworm (Lepidoptera: Gelechiidae) development in cotton. Journal of Economic Entomology, 89(4), 881-890.',
        doi: '10.1093/jee/89.4.881',
        role: 'Alternative Parameter Set B (California field calibration): Lower threshold 13.9 °C, Upper threshold 32.8 °C, Generation requirement 492 DD (single-sine horizontal cutoff).',
      },
    ],
  },
  {
    category: 'Environmental & Satellite Data Sources',
    items: [
      {
        citation: 'NASA POWER Project (2024). MERRA-2 Atmospheric Reanalysis Daily Surface Meteorology.',
        doi: 'https://power.larc.nasa.gov',
        role: 'Daily temperature, relative humidity, and precipitation for 20.7069°N, 77.0022°E (June 2023–December 2024). ~0.5° × 0.625° reanalysis grid.',
      },
      {
        citation: 'European Space Agency / Copernicus Programme (2024). Sentinel-2 Harmonized Level-2A Surface Reflectance.',
        doi: 'https://dataspace.copernicus.eu',
        role: 'Multispectral canopy indices (NDVI, NDMI, NDRE) extracted via Google Earth Engine over a 10 km radius buffer centered at Akola.',
      },
      {
        citation: 'ECMWF (2024). ERA5-Land Hourly & Daily Surface Soil Water Reanalysis.',
        doi: 'https://cds.climate.copernicus.eu',
        role: 'Volumetric soil moisture across three layers (0–7 cm, 7–28 cm, 28–100 cm). Numerical gridded model estimate (~11 km resolution).',
      },
      {
        citation: 'ISRIC — World Soil Information (2020). SoilGrids 2.0: Global gridded soil information at 250 m resolution.',
        doi: '10.5194/soil-7-217-2021',
        role: 'Static spatial predictions of soil texture (clay, silt, sand), pH (H2O), and soil organic carbon (SOC) across 6 standard depth layers.',
      },
    ],
  },
];

export default function About() {
  return (
    <div className="about-container">
      <div className="card">
        <h2 className="card-title">AgroViz Project Background</h2>
        <p style={{ marginBottom: '0.75rem', lineHeight: '1.6' }}>
          <strong>AgroViz</strong> is a precision agriculture monitoring platform providing field-scale environmental intelligence
          for <strong>Akola district, Maharashtra, India</strong> (centered at 20.7069°N, 77.0022°E), combining satellite remote
          sensing, reanalysis meteorology, numerical soil models, and literature-derived pest phenology indicators.
        </p>
        <p style={{ lineHeight: '1.6' }}>
          <strong>Key Academic Scope Statement:</strong> <em>"AgroViz provides a weather-driven Pink Bollworm development indicator
          parameterised from published literature, alongside published damage context; validated pest-risk prediction is designed
          but requires dated field observations, which were not available."</em>
        </p>
      </div>

      <div className="card">
        <h2 className="card-title">Rigorous Non-Negotiable Methodological Rules</h2>
        <div className="rules-grid">
          <div className="rule-card">
            <h4>1. Never Fabricate Data</h4>
            <p>Every single number originates from real physical or model-derived files on disk. No mock data, simulated scores, or fake alert levels.</p>
          </div>
          <div className="rule-card">
            <h4>2. Strict Provenance Tagging</h4>
            <p>Every response and chart carries an explicit provenance tag: <code>measured</code>, <code>calculated</code>, <code>model_estimated</code>, or <code>unavailable</code>.</p>
          </div>
          <div className="rule-card">
            <h4>3. Zero Temporal Overlap Boundary</h4>
            <p>Published pest damage surveys (2015-16 to 2022-23 annual) do not overlap 2023-2024 daily weather/satellite observations. No joins or statistical correlation is attempted.</p>
          </div>
          <div className="rule-card">
            <h4>4. Whole 10 km AOI Area</h4>
            <p>Satellite indices represent the entire 10 km circular buffer without a cropland mask. They are labelled "AOI vegetation condition", never "cotton health".</p>
          </div>
          <div className="rule-card">
            <h4>5. Thermal Development, Not Risk</h4>
            <p>Degree-day computations measure accumulated thermal potential for pest development based on published temperature thresholds; they do not predict pest presence or damage risk.</p>
          </div>
          <div className="rule-card">
            <h4>6. Monsoon Optical Gap</h4>
            <p>Due to persistent cloud cover during the Indian monsoon, zero optical observations exist in July 2023 and July 2024. Gaps are shown explicitly and never interpolated.</p>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">Academic Citations & Data Sources</h2>
        {CITATIONS.map((sec, idx) => (
          <div key={idx} style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '0.95rem', color: 'var(--accent-green)', marginBottom: '0.6rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.3rem' }}>
              {sec.category}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {sec.items.map((item, itemIdx) => (
                <div key={itemIdx} className="citation-box">
                  <div className="citation-text"><strong>[{itemIdx + 1}]</strong> {item.citation}</div>
                  <div className="citation-doi">DOI/Source: <a href={item.doi.startsWith('http') ? item.doi : `https://doi.org/${item.doi}`} target="_blank" rel="noreferrer">{item.doi}</a></div>
                  <div className="citation-role">Usage in AgroViz: {item.role}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
