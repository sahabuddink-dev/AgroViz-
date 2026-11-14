# AgroViz — Project Vision & Scope

## 1. Product Vision & Purpose

**AgroViz** is an **AI-powered Precision Agriculture Monitoring Platform** designed to bridge the gap between academic agronomic research and actionable field intelligence.

By combining multispectral satellite remote sensing (Sentinel-2), drone imagery, numerical weather reanalysis (NASA POWER), gridded soil moisture and physical property estimates (ERA5-Land, ISRIC SoilGrids), and biological thermal accumulation models, AgroViz empowers agricultural researchers, agronomists, and farm managers to monitor crop health, evaluate root-zone soil conditions, track pest development potential, and receive evidence-based alerts across specific agricultural fields.

The platform provides a cohesive, field-centric spatial monitoring experience while strictly adhering to scientific honesty: **every metric, indicator, and map layer carries explicit provenance, known limitations, and methodological citations.**

---

## 2. The Core Problem Being Addressed

Smallholder and commercial agriculture in semi-arid tropics—such as the Vidarbha cotton belt (Akola district, Maharashtra, India)—faces severe vulnerabilities:
1. **Pest Infestation Uncertainty**: Pests like the Pink Bollworm (*Pectinophora gossypiella*) cause catastrophic economic losses ($>20\%$ locule damage in historical seasons). However, growers lack accessible tools to calculate localized thermal development milestones (degree-days) and monitor generation turnover.
2. **Coarse Spatial Resolution vs. Field Realities**: Public remote sensing products provide area-wide averages (e.g., 10 km AOI aggregates) that mix bare soil, infrastructure, and diverse crops. Farmers and agronomists need workflows that either utilize existing regional research baselines or ingest high-resolution field-specific drone and satellite data.
3. **Data Gaps & Monsoon Cloud Cover**: In tropical monsoon zones, optical satellite imagery suffers from extended periods of zero observations (such as July cloud cover in Central India), leading naive platforms to either hallucinate values or fail completely.
4. **Disconnected Data Silos**: Soil properties, surface weather, canopy vigor, and entomological context are typically stored in disparate formats (NetCDF, shapefiles, Excel annexures, CSVs) without unified spatial or temporal cross-referencing.

AgroViz solves these challenges by providing a robust, transparent computational platform that ingests heterogeneous agronomic layers, validates spatial and temporal alignments, computes peer-reviewed biological and biophysical indicators, and clearly discloses data availability.

---

## 3. Intended Users & Stakeholders

- **Agricultural Researchers & Entomologists**: Analyzing crop phenology, degree-day accumulation across seasons, historical damage benchmarks (e.g., ICAR-CICR survey annexures), and multi-layer correlations.
- **Agronomists & Extension Officers**: Monitoring field vigor (NDVI/NDRE), water stress (NDMI), root-zone moisture deficits, and issuing localized advisory alerts.
- **Precision Farm Managers**: Uploading field-specific drone orthomosaics, in-situ capacitive sensor logs, and scouting observations to track management zones over time.
- **Academic Evaluators & Viva Examiners**: Reviewing verifiable, un-fabricated implementations of precision agriculture technologies grounded in real agronomic datasets.

---

## 4. Main User Workflows

AgroViz provides **two complementary operational workflows**:

```
+-----------------------------------------------------------------------------------+
|                                  AGROVIZ PLATFORM                                 |
+-----------------------------------------+-----------------------------------------+
| WORKFLOW A: Built-in Akola Research Demo| WORKFLOW B: User-Created Field Workflow |
+-----------------------------------------+-----------------------------------------+
| - Study Area: Akola 10 km AOI (MH, India| - Custom Field Boundary (Polygon / Geo) |
| - Crop: Cotton (Kharif Season)          | - User specifies Crop, Stage & Dates    |
| - Preloaded Datasets:                   | - Upload Supported Layers:              |
|   * NASA POWER Weather (2023-2024)      |   * Multispectral GeoTIFF (Drone/S2)    |
|   * Sentinel-2 GEE Indices (Cleaned)    |   * Soil Moisture / Station Sensor CSV  |
|   * ERA5-Land 3-Layer Soil Moisture     |   * Daily Local Weather CSV             |
|   * ISRIC SoilGrids 2.0 Profiles        |   * Dated Pest Trap/Boll Scouting CSV   |
|   * Fand et al. (2025) PBW Annexures    | - Automated Schema & Spatial Validation |
| - Literature Degree-Day Calculation     | - Processing Pipeline & Index Extraction|
| - Baseline Regional Benchmarks          | - Interactive Map & Zone Health Display |
+-----------------------------------------+-----------------------------------------+
```

### Workflow A: Built-in Akola Cotton Research Demonstration
1. User selects the pre-configured **Akola Cotton Research Zone** (20.7069°N, 77.0022°E; 10 km radius buffer).
2. The system loads pre-cleaned, quality-profiled NASA POWER daily weather, Earth Engine Sentinel-2 index series, ERA5 3-depth moisture, and SoilGrids depth profiles.
3. User selects the sowing date proxy to run the single-sine degree-day phenological calculator (comparing Literature Sets A and B).
4. User explores published entomological damage context (Annexures 3 & 4) alongside regional spatial benchmarks.

### Workflow B: User-Created Precision Field Workflow
1. **Field Definition**: User creates a new field by entering coordinates, selecting/drawing a boundary, and entering metadata (crop type, sowing date, current growth stage, soil type).
2. **Data Ingestion**: User uploads field-specific files:
   - Multispectral GeoTIFF / Drone Orthomosaic (Red, Green, Blue, NIR, Red Edge).
   - In-situ soil sensor CSV (date, depth, volumetric water content %, soil temp).
   - Local station weather CSV.
   - Field scouting observations (pheromone trap counts, locule damage %).
3. **Validation & Processing**: System verifies coordinate reference systems (CRS), band requirements, date ranges, and data integrity.
4. **Analysis & Intelligence**: Platform computes spatial raster indices (NDVI, NDRE, NDMI), extracts statistical summaries across field zones, evaluates soil moisture dynamics (marking generic thresholds as provisional until calibrated with local soil water retention curves), and computes heat unit accumulation.
5. **Monitoring & Alerts**: Platform displays the spatial field map, multi-layer analytics, and generates rule-based agronomic alerts (e.g., moisture stress warning, thermal generation threshold reached).
6. **Reporting**: User exports a structured field health summary report (PDF/JSON/CSV).

---

## 5. Expected System Outputs

- **Spatial Visualizations**: Interactive Leaflet field maps rendering boundaries, spatial index overlays (NDVI/NDRE), management zones, and sensor/scouting observation pins.
- **Biophysical Time-Series**: Dual-axis, interactive SVG charts tracking canopy greenness (NDVI), canopy chlorophyll/nitrogen (NDRE), canopy water stress (NDMI), diurnal temperatures, precipitation, and soil moisture by depth.
- **Phenological Indicators**: Accumulated degree-days and potential insect generation counts calculated via single-sine horizontal cutoff algorithms.
- **Contextual Benchmarks**: Published research comparisons showing regional cotton damage rates and yield losses from ICAR-CICR multi-location surveys.
- **Evidence-Based Alerts**: Clear, rule-driven agronomic notices categorized by severity (`Info`, `Warning`, `Critical`) with scientific rationale.
- **Field Health Reports**: Exportable summaries containing spatial statistics, temporal trends, data sources, and provenance logs.

---

## 6. Functional Scope vs. Scientific Non-Claims

### What AgroViz DOES
- Computes peer-reviewed mathematical and biophysical indices from verified spectral bands.
- Calculates thermal accumulation (degree-days) using published, cited entomological thresholds.
- Profiles data quality, identifying missing dates, duplicate scenes, and cloud interference.
- Enforces strict data provenance tags on every metric (`measured`, `calculated`, `model_estimated`, `published_literature`, `user_provided`).
- Separates regional atmospheric reanalysis from local in-situ measurements.
- Strictly documents when observations do not temporally overlap.

### What AgroViz MUST NOT Claim
- **No False Pest Confirmation**: Optical satellite vegetation indices alone **cannot** detect or confirm Pink Bollworm infestation. AgroViz never claims satellite data confirms pest infestation.
- **No Synthetic Risk Scores**: AgroViz does not generate arbitrary "Low / Medium / High" pest risk percentages or unvalidated composite scores without real, overlapping field scouting data.
- **No Station Conflation**: AgroViz never claims NASA POWER or ERA5-Land gridded reanalysis are local on-farm weather stations or soil capacitance probes.
- **No Silent Data Invention**: AgroViz never silently interpolates, backfills, or fabricates missing satellite imagery (such as monsoon cloud gaps in July).
- **No Uncalibrated Moisture Thresholds**: The platform does not present generic soil moisture numbers (e.g. 0.28 or 0.25 m³/m³) as validated agronomic wilting points for local Vertisols without localized retention calibration.
- **No Fake Field Masks**: When working with the 10 km Akola regional dataset, AgroViz clearly identifies values as "AOI-level aggregates" rather than isolated cotton fields.
