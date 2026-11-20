# AgroViz — Precision Agriculture Platform Implementation Plan

## 1. Architectural Alignment & 10-Phase Roadmap

The AgroViz transformation redirects the project from an academic research dashboard into a **functional, AI-powered precision agriculture monitoring platform** with a field-centric 3-column workspace (Dashboard, My Fields, Alerts, Reports).

To maintain scientific continuity, backward compatibility, and rigorous test coverage, the original **10-Phase Plan** is preserved and adapted to deliver the precision agriculture architecture.

```
+---------------------------------------------------------------------------------------+
|                                10-PHASE IMPLEMENTATION TRACKER                        |
+--------+-------------------------------------------------------------+----------------+
| Phase  | Milestone Focus & Scope                                     | Status         |
+--------+-------------------------------------------------------------+----------------+
| 1      | Project Scaffold, Health APIs, Canonical Raw Data Manifest  | COMPLETED (v1) |
| 2      | Data Layer: Loaders, Cleaning Rules, Profiler, Immutability | COMPLETED (v1) |
| 3      | Frontend Shell, API Client, Dataset Registry & Profiling UI | COMPLETED (v1) |
| 4      | Weather Monitoring Module (Daily series, monthly summaries) | COMPLETED (v1) |
| 5      | Pink Bollworm Module (Degree-day engine, Annexures context) | COMPLETED (v1) |
| 6      | Soil Module (ERA5 3-layer, SoilGrids profile, sensor slot)  | COMPLETED (v1) |
+--------+-------------------------------------------------------------+----------------+
| 7      | Crop Health & Multispectral Engine (S2, GeoTIFF, band math) | COMPLETED (v1) |
| 8      | Spatial Field Management & 3-Column Interactive GIS Layout  | PENDING (Next) |
| 9      | AI Analysis, Evidence-Based Alert Engine & Report Generator | PENDING        |
| 10     | Comprehensive Verification, Full Test Suite & Final Delivery| PENDING        |
+--------+-------------------------------------------------------------+----------------+
```

---

## 2. Review of Completed Milestones (Phases 1–7)

- **Phase 1 (Scaffold & Registry)**: Verified 9 canonical raw datasets in `data/raw/` with baseline SHA-256 hashes. Initialized FastAPI backend and React frontend. Configured Pydantic `BaseResponse` with explicit provenance tags (`measured`, `calculated`, `model_estimated`, `unavailable`).
- **Phase 2 (Data Layer)**: Implemented loaders with strict cleaning rules:
  - Sentinel-2 tile de-duplication (309 scenes $\to$ 295 valid tiles) and partial tile filtering ($<5000$ pixels).
  - SoilGrids wide-to-long reshaping and USDA soil texture classification (**Clay**).
  - Multi-location Annexure 4 parsing ($N=63$) and stationwise Annexure 3 parsing with whitespace stripping.
  - Automated profiler service computing row counts, null rates, and date bounds.
- **Phase 3 (Frontend Shell & Dataset Management)**: Built core UI shell, backend health monitor, and Dataset Management view with inspection modal, raw record preview, and quality profiles.
- **Phase 4 (Weather Monitoring)**: Implemented NASA POWER weather service and dashboard with diurnal temperature curves, rainfall bars, relative humidity trends, and monthly aggregations.
- **Phase 5 (Pink Bollworm Module)**: Implemented single-sine degree-day phenological calculator (Literature Sets A & B), published historical survey context (Annexures 3 & 4), explicit unavailable status for observed field data, downloadable CSV template, and upload validation into `data/uploads/`.
- **Phase 6 (Soil Conditions Module)**: Implemented ECMWF ERA5-Land 3-layer soil moisture APIs and ISRIC SoilGrids 2.0 depth profiles, capacitive soil sensor staging slot with safe moisture normalization, and 3-depth moisture visualization.
- **Phase 7 (Crop Health & Multispectral Engine)**: Implemented cleaned Sentinel-2 daily vegetation indices (`/api/crop/indices`, 80 dates) with explicit July monsoon cloud gap markers; built GeoTIFF raster ingestion pipeline (`/api/imagery/upload`) with GeoKey CRS and dimension validation; built multispectral raster index engine (`/api/imagery/compute-indices`) computing NDVI, NDRE, NDMI with zero-denominator & NoData masking, zonal statistics, and 10-bin histograms; added interactive frontend time series, date presets, and upload dropzone.

---

## 3. Upcoming Phase Roadmap (Phases 8–10)

### Phase 6 — Soil Conditions Module & In-Situ Sensor Ingestion
- **Backend**:
  - `GET /api/soil/moisture`: Return 3-depth daily moisture time series (0–7 cm, 7–28 cm, 28–100 cm) from cleaned ERA5-Land data with depth-wise descriptive statistics and actual Pearson correlations.
  - `GET /api/soil/properties`: Return SoilGrids physical depth profiles (Clay, Sand, Silt, pH, SOC) across 6 standardized depths with USDA texture classification (Clay).
  - `POST /api/soil/sensor-upload`: Accept in-situ capacitive probe CSV, validate against `soil_sensor_template.csv`, safely normalize moisture units, and store in `data/uploads/` with `user_provided` provenance.
  - `GET /api/soil/template`: Provide standardized CSV template download.
- **Frontend**:
  - Three-layer moisture time-series chart with descriptive stats and depth comparison.
  - SoilGrids vertical depth profile visualization (clay/sand/silt stacking and pH/SOC depth trends).
  - USDA texture classification display.
  - Dedicated "In-Situ Field Sensor" staging slot with CSV upload dropzone, unit normalization feedback, and template download.

### Phase 7 — Crop Health & Multispectral Raster Engine
- **Backend**:
  - `GET /api/crop/indices`: Deliver cleaned daily AOI Sentinel-2 index series (NDVI, NDRE, NDMI) with explicit July monsoon cloud gap annotations.
  - `POST /api/imagery/upload`: Ingest user-provided multispectral GeoTIFF / drone orthomosaic. Validate CRS (EPSG:4326, UTM), band tags, and dimensions.
  - `POST /api/imagery/compute-indices`: Compute raster NDVI, NDRE, NDMI arrays and return zonal statistics (mean, min, max, std).
- **Frontend**:
  - Multi-spectral canopy index time series with persistent July cloud gap markers.
  - Observation count and valid pixel coverage cards.
  - Multispectral raster upload panel with band mapping controls.

### Phase 8 — Spatial Field Management & 3-Column Interactive GIS Workspace
- **Backend**:
  - `GET /api/fields`: List available fields (preloaded Akola Cotton Reference Field + user-created fields).
  - `POST /api/fields`: Create new user field (name, crop, sowing date, growth stage, polygon geometry).
  - `GET /api/fields/{id}`: Retrieve field configuration and attached layer metadata.
- **Frontend**:
  - Redesign layout into the modern 3-column precision monitoring interface:
    - **Top Bar**: Navigation (`Dashboard`, `My Fields`, `Alerts`, `Reports`), field quick-switcher.
    - **Left Column**: Field selector, metadata editor, layer upload panel, date range picker.
    - **Center Column**: Interactive Leaflet GIS map (satellite base layer, boundary polygon, raster overlays, observation markers) + integrated time-series charts.
    - **Right Column**: Crop health summary, soil condition cards, degree-day indicators, and active alert feed.

### Phase 9 — AI Analysis, Evidence-Based Alert Engine & Field Reporting
- **Backend**:
  - `GET /api/analysis/yoy`: Year-on-year descriptive screening comparing common calendar periods across seasons.
  - `GET /api/alerts`: Evaluate deterministic agronomic rules (topsoil moisture deficit, thermal generation completion, optical cloud gap duration) across selected field data.
  - `POST /api/reports/export`: Generate structured JSON / CSV / printable summary report combining field metadata, spatial index summaries, weather stats, and active alerts.
  - Enforce locked `status: "unavailable"` for unvalidated spatial PBW risk forecasting with complete technical explanation.
- **Frontend**:
  - Alerts feed page with severity categorization (`Info`, `Warning`, `Critical`) and actionable agronomic recommendations.
  - Reports generation and export view.
  - YoY descriptive comparison charts.

### Phase 10 — Comprehensive Verification, Polish & Final Delivery
- Full backend automated test suite execution (target $>40$ passing tests).
- Frontend production bundle build verification.
- End-to-end walkthrough of both workflows:
  - Workflow A: Built-in Akola Research Field demonstration.
  - Workflow B: User-created field with custom upload ingestion.
- Verification of 100% raw dataset SHA-256 immutability.
- Final user documentation and demo script.
