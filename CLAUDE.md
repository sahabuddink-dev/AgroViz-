# AgroViz — Project Context & Developer Guide (v6)

Read this file completely before doing anything. It provides authoritative technical and scientific rules for any AI assistant or developer working on the AgroViz codebase.

If this document and a user prompt disagree, clarify before proceeding. After every completed phase, append an entry to the **Decisions Log** (Section 12).

---

## 1. What This Project Is

**AgroViz** is an **AI-Powered Crop Health, Soil Condition, and Pest Monitoring Platform** for precision agriculture, combining satellite remote sensing (Sentinel-2), drone imagery, numerical weather reanalysis (NASA POWER), gridded soil moisture and physical properties (ERA5-Land, ISRIC SoilGrids), and biological thermal accumulation models.

The system supports two primary operational workflows:
1. **Built-in Akola Research Demonstration**: Preloaded multi-layer monitoring for cotton cultivation in Akola District, Maharashtra, India (10 km AOI buffer around 20.7069°N, 77.0022°E).
2. **User-Created Precision Fields**: Custom field boundary definition, metadata tracking, and ingestion of user-uploaded multispectral GeoTIFFs, in-situ capacitive soil sensor logs, on-farm weather logs, and pest scouting observations.

### Target User Experience:
- **Top Navigation**: `Dashboard`, `My Fields`, `Alerts`, `Reports`.
- **3-Column Workspace**:
  - *Left Area*: Field selection, crop metadata configuration, upload dropzone, date picker.
  - *Main Area*: Interactive spatial GIS field map (Leaflet) with raster overlays (NDVI/NDRE/NDMI) and multi-layer time-series charts (weather, soil, phenology).
  - *Right Area*: Real-time crop condition status, root-zone moisture metrics, degree-day insect phenology indicators, and evidence-based alerts.

---

## 2. Non-Negotiable Scientific & Engineering Rules

1. **Never Fabricate Data**: Never invent, simulate, or backfill measurements, predictions, accuracy metrics, or imagery. Never present demo data as measured field results.
2. **Mandatory Provenance Metadata**: Every value in API responses and UI displays must carry an explicit provenance tag:
   - `measured` (direct field sensors, ground scouting observations, verified survey records)
   - `calculated` (deterministic mathematical algorithms, spectral band indices)
   - `model_estimated` (gridded atmospheric reanalysis, numerical land-surface models, global digital soil maps)
   - `published_literature` (historical research survey data from peer-reviewed studies)
   - `unavailable` (missing or unvalidated states with explicit data requirement notes)
   Along with `source`, `units`, `period`, and explanatory `notes`.
3. **Temporal Partitioning & No Inappropriate Joins**: The published historical pest survey data (2015-16 to 2022-23 annual seasons) **has zero temporal overlap** with the environmental monitoring time series (June 2023 to December 2024). No statistical or machine-learning correlation between historical pest losses and 2023–2024 weather/satellite data may be computed or implied.
4. **No False Pest Confirmation**: Optical satellite vegetation indices (NDVI/NDRE/NDMI) alone **cannot confirm** pest infestation. Crop condition analysis and pest phenology monitoring must remain strictly separated.
5. **No Synthetic Risk Scores**: No "Low / Medium / High" pest infestation risk scores or unvalidated composite percentages may be displayed. The degree-day output is a *thermal development indicator*, never a confirmed pest presence or validated risk forecast.
6. **Reanalysis Disclosures**: NASA POWER is MERRA-2 atmospheric reanalysis ($\sim 50\text{ km} \times 60\text{ km}$ grid), not a local farm weather station. ERA5-Land is a gridded land-surface model ($\sim 11\text{ km}$ grid), not an in-situ capacitive soil moisture probe.
7. **Monsoon Cloud Gaps**: The Akola optical satellite series has **zero valid observations in July 2023 and July 2024** due to monsoon cloud cover. This gap must be explicitly highlighted in charts and never silently interpolated.
8. **AOI-Level Satellite Metrics**: The preloaded Sentinel-2 indices represent the **entire 10 km circular AOI**, not an isolated cotton crop parcel. They must be labelled "AOI-level vegetation condition".
9. **Single-Sine Degree-Day Algorithm**: Degree-day calculations must strictly implement the **single-sine algorithm with horizontal cutoff** using the cited literature parameter sets (Set A: 13.4°C/35.5°C, 503.62 DD; Set B: 13.9°C/32.8°C, 492.00 DD). Never substitute with simple daily mean temperature averaging.
10. **Raw Dataset Immutability**: All canonical datasets in `data/raw/` must remain strictly immutable. Every test run verifies their SHA-256 hashes against canonical baselines.
11. **Soil Moisture Thresholds & Sensor Normalization**: Generic thresholds (e.g. 0.28 or 0.25 m³/m³) are provisional illustrative rules, NOT validated agronomic wilting points for local Vertisols. User sensor uploads must normalize moisture units consistently (converting % to volumetric ratio m³/m³ when value > 1.0) while preserving original input values/units and marking provenance as `user_provided`.
12. **Accurate Aggregation Descriptions**: Sentinel-2 daily series aggregation is a simple unweighted mean across valid overlapping tiles (excluding partial tiles with <5,000 pixels); SoilGrids values are unweighted pixel means across the 4,419 AOI pixels, averaged across the 6 depth intervals. Never misrepresent them as area-weighted polygon aggregates.

---

## 3. Technology Stack & Directory Structure

- **Backend**: Python 3.10, FastAPI, Uvicorn, Pandas, NumPy, openpyxl, python-multipart, pytest, httpx.
- **Frontend**: React 18, Vite, JavaScript, Axios, custom SVG chart engine (Leaflet planned for Phase 8).
- **Storage**: Flat files (CSV, GeoTIFF, JSON metadata) in `data/`. No external database server or Docker container required.
- **Endpoints**: Backend runs at `http://localhost:8000`, Frontend runs at `http://localhost:5173`.

```
AgroViz_Web/
├── CLAUDE.md                   # Authoritative developer instructions
├── WORKFLOW.md                 # Step-by-step phase execution protocol
├── README.md                   # Project overview & startup instructions
├── PROJECT_VISION.md           # Product purpose, scope, and non-claims
├── SYSTEM_ARCHITECTURE.md      # Frontend, backend, and pipeline architecture
├── DATASETS_AND_MODELS.md      # Dataset schemas, limitations, and ML status
├── UPLOAD_FORMATS.md           # Ingestion specs for GeoTIFF, sensors, scouting
├── IMPLEMENTATION_PLAN.md      # 10-phase precision platform roadmap
├── backend/
│   ├── .venv/                  # Dedicated Python 3.10 virtualenv
│   ├── requirements.txt        # Approved Python dependencies
│   ├── app/
│   │   ├── main.py             # FastAPI app & CORS configuration
│   │   ├── config.py           # Directory paths and global constants
│   │   ├── schemas.py          # Pydantic request/response schemas
│   │   ├── routers/            # API endpoints (health, weather, pbw, analysis, datasets, etc.)
│   │   └── services/           # Business logic (loaders, profiler, weather, pbw, etc.)
│   └── tests/                  # Pytest automated test suite
├── frontend/
│   ├── package.json            # Node dependencies
│   ├── vite.config.js          # Vite configuration
│   └── src/
│       ├── main.jsx            # Entry point
│       ├── App.jsx             # Shell & view router
│       ├── index.css           # Design system & styles
│       ├── api/                # API client functions (Axios)
│       ├── components/         # Reusable UI & chart components
│       └── pages/              # Module views
└── data/
    ├── raw/                    # 9 canonical immutable datasets
    ├── processed/              # Cleaned CSV artifacts
    └── uploads/                # Staged user uploads (.gitkeep preserved)
```

---

## 4. Canonical Datasets Manifest (`data/raw/`)

| Canonical File | Role | Baseline SHA-256 Hash |
|---|---|---|
| `POWER_Point_Daily_20230601_20241231_020d71N_077d00E_LST.csv` | Weather reanalysis | `6e2c8d576595270e991c2e5eed74633e4b5d4259a6e05e7ee0cce0eff48b89a5` |
| `AgroViz_Akola_Sentinel2_Indices.csv` | Primary satellite indices | `753e922dfafa9296b03116e05ef56fbea9d9bc5c9c43698eac80d4a36187d4db` |
| `AgroViz_Akola_ERA5_Three_Layer_Soil_Moisture.csv` | 3-depth soil moisture | `70633c633d9abe0b49ae0649ff0e3b8835fea56c91e8c2f5d3569049f607680b` |
| `AgroViz_Akola_SoilGrids_Properties.csv` | Soil physical profiles | `ba9378162b86e4a040bc1ec108d3c4053a676e80f660057561ae4ea2c6759f00` |
| `Annexure_3_Supplementary_data_Linking_phenology_to_loss_R1.xlsx` | PBW historical damage | `5df9050918d9c9deaca20da98abd9cfd45d5048c4b997a1a44d5d834cfb86f20` |
| `Annexure_4_Supplementary_data_Multilocation_loss_R1.xlsx` | PBW multi-location loss | `79ff02a58a548f3dcac507037744f1e23399768870474e182e6b246c8598af87` |
| `Processed_AgroViz_Akola_Sentinel2_Indices.csv` | Planetary Computer run | `1b87389b2f0e72e137af2aaffc1b6967dc645a9d233cfdaf3f83fd3fa0ec1f25` |
| `akola_sentinel2_inventory.csv` | Scene metadata inventory | `d2e52cda6634d331f36fd53abf1034a2d02e93f1dd861a92dbe306e6976e43f2` |
| `AgroViz_Akola_ERA5_Soil_Moisture.csv` | Single-layer soil check | `31877fef787bdcb073f63ff931b37791afa6b42c9eaa317614fa8d28350570fe` |

---

## 5. API Response Schema Contract

Every API response follows the structured Pydantic `BaseResponse` format:

```json
{
  "provenance": "measured | calculated | model_estimated | published_literature | user_provided | unavailable",
  "source": "NASA POWER | Copernicus Sentinel-2 | ECMWF ERA5-Land | ISRIC SoilGrids | Fand et al. (2025) | User Upload",
  "units": "Metric units string (e.g., °C, mm/day, m³/m³, index_ratio, %)",
  "period": "Covered date range (e.g., 2023-06-01 to 2024-12-31)",
  "notes": [
    "Contextual caveat 1",
    "Methodological citation 2"
  ],
  "data": { ... }
}
```

---

## 6. Pink Bollworm Degree-Day Parameters

Calculated via the single-sine method with horizontal cutoff using user-selectable start dates:

- **Set A (Default, Indian Cotton Literature)**:
  - Base threshold ($L$): $13.4^\circ\text{C}$
  - Upper cutoff ($U$): $35.5^\circ\text{C}$
  - Thermal units per generation: $503.62\text{ DD}$
  - *Citation*: Scientific Reports 11:436 (2021), DOI: 10.1038/s41598-020-80184-6.
- **Set B (Alternative, California Field Study)**:
  - Base threshold ($L$): $13.9^\circ\text{C}$
  - Upper cutoff ($U$): $32.8^\circ\text{C}$
  - Thermal units per generation: $492.00\text{ DD}$
  - *Citation*: Beasley & Adams (1996), J. Econ. Entomol. 89:881–890, DOI: 10.1093/jee/89.4.881.

---

## 7. Operational vs. Future AI/ML Status

- **Operational Mathematical Models**:
  - Biophysical vegetation indices: $\text{NDVI}$, $\text{NDRE}$, $\text{NDMI}$.
  - Single-sine horizontal cutoff thermal accumulation and potential insect generation estimation.
  - USDA soil texture classification matching (Clay).
  - Deterministic agronomic rule evaluation for topsoil moisture deficits and thermal milestones.
- **Future Machine Learning (Locked / Awaiting Datasets)**:
  - Supervised spatial-temporal Pink Bollworm risk prediction (requires overlapping field scouting records).
  - High-resolution crop-type boundary semantic segmentation (requires digitized farm polygon masks).

---

## 8. 10-Phase Implementation Roadmap

1. **Phase 1**: Project Setup, Health APIs, Data Registry & Manifest Verification *(Completed)*.
2. **Phase 2**: Data Layer: Loaders, Cleaning Rules, Profiler, Immutability Tests *(Completed)*.
3. **Phase 3**: Frontend Shell, API Client, Dataset Registry & Profiling UI *(Completed)*.
4. **Phase 4**: Weather Monitoring Module *(Completed)*.
5. **Phase 5**: Pink Bollworm Module: Degree-Days, Historical Context & Upload Slot *(Completed)*.
6. **Phase 6**: Soil Conditions Module: ERA5 3-Layer Moisture, SoilGrids Profiles & Sensor Ingestion *(Next)*.
7. **Phase 7**: Crop Health & Multispectral Raster Engine: S2 Indices & GeoTIFF Processing.
8. **Phase 8**: Spatial Field Management & 3-Column Interactive GIS Workspace.
9. **Phase 9**: AI Analysis, Evidence-Based Alert Engine & Field Health Reporting.
10. **Phase 10**: Comprehensive Verification, Full Test Suite, Polish & Final Delivery.

---

## 9. Verification & Run Commands

### Backend Startup:
```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

### Frontend Startup:
```bash
cd frontend
npm run dev
```

### Automated Backend Tests:
```bash
backend/.venv/bin/pytest backend/tests/ -v
```

### Frontend Production Build:
```bash
npm --prefix frontend run build
```

---

## 10. Citation Requirements

Every documentation and user interface view referencing external research must include proper academic citations:
- **Historical Loss Data**: Fand, B.B. et al. (2025). "Field estimates of current and predicted cotton yield loss due to pink bollworm and boll rot in India." *Agricultural Systems*, 224, 104246. DOI: 10.1016/j.agsy.2024.104246.
- **Mendeley Dataset**: Fand, B. (2024). "Data for: Field estimates of current and predicted cotton yield loss due to pink bollworm and boll rot in India." *Mendeley Data*, V1. DOI: 10.17632/2xp6xvct2x.1.
- **Degree-Day Phenology**: Pathan, B. et al. (2021). "Degree day-based model predicts pink bollworm phenology across geographical locations." *Scientific Reports*, 11, 436. DOI: 10.1038/s41598-020-80184-6.
- **Environmental Sources**: NASA POWER (MERRA-2); Copernicus Sentinel-2 L2A; ECMWF ERA5-Land; ISRIC SoilGrids 2.0.

---

## 11. Decisions Log

- **2026-11-14**: Project plan approved. Datasets inspected and verified against data manifest.
- **2026-11-14**: Phase 1 completed. Initialized Git, FastAPI backend, React frontend, health and data registry endpoints. Verified SHA-256 hashes for all 9 canonical files.
- **2026-11-14**: Phase 2 completed. Built data loaders, cleaning rules (S2 deduplication 309 $\to$ 295 rows, partial tile filtering, daily aggregation; SoilGrids wide-to-long reshaping; Annexures parsing), automated profiler, and immutability tests.
- **2026-11-14**: Phase 3 completed. Built frontend application shell, connected GitHub remote, and implemented Dataset Management UI with inspection modals, quality checklists, and literature citations.
- **2026-11-14**: Phase 4 completed. Built backend Weather APIs (`/api/weather`, `/api/weather/summary`) and interactive Weather frontend dashboard with diurnal temperature band charts, rainfall bars, relative humidity trends, and monthly summaries.
- **2026-11-14**: Phase 5 completed. Built Pink Bollworm module with single-sine degree-day engine (Sets A & B), published historical context (Annexures 3 & 4), explicit unavailable status for observed field records, downloadable CSV template, and schema-validated upload receiver.
- **2026-11-14**: **Architecture Redirection & Comprehensive Cleanup**: Audited entire codebase. Confirmed zero trained ML models exist. Removed obsolete `ModulePlaceholder.jsx` and simplified navigation to active functional modules. Re-anchored project vision toward a functional AI-powered precision agriculture platform with a field-centric 3-column workspace supporting both the built-in Akola research demonstration and user-created precision fields. Created dedicated documentation suite (`PROJECT_VISION.md`, `SYSTEM_ARCHITECTURE.md`, `DATASETS_AND_MODELS.md`, `UPLOAD_FORMATS.md`, `IMPLEMENTATION_PLAN.md`). Verified all 31 backend tests and clean frontend build.
- **2026-11-14**: **Phase 6 completed (Soil Conditions Module)**: Implemented backend services and endpoints for ECMWF ERA5-Land 3-depth volumetric soil moisture (`GET /api/soil/moisture`) covering all 580 daily records (0–7 cm, 7–28 cm, 28–100 cm) with depth-wise descriptive statistics and actual layer-to-layer Pearson correlations (L1–L2: 0.956, L1–L3: 0.711, L2–L3: 0.820); implemented ISRIC SoilGrids 2.0 depth profile (`GET /api/soil/properties`) serving 30 records across 6 depths with Clay texture classification; built in-situ capacitive soil probe ingestion pipeline (`POST /api/soil/sensor-upload`) with schema validation, safe moisture unit normalization (percentage to volumetric fraction m³/m³), and `user_provided` provenance; provided downloadable sensor template (`GET /api/soil/template`); created frontend Soil Conditions dashboard (`Soil.jsx`, `SoilCharts.jsx`) with 3-depth interactive SVG moisture curve, correlation indicators, vertical depth particle distribution stacking, chemical profile table, and in-situ sensor upload dropzone; resolved documentation inconsistencies across all 8 markdown files (simple unweighted S2 aggregation, pixel-mean SoilGrids aggregation, provisional moisture alert thresholds, installed dependencies); added 12 automated soil tests (43 total passing); verified frontend production build; raw data verified 100% immutable.
- **2026-11-20**: **Phase 7 completed (Crop Health & Multispectral Raster Engine)**: Implemented backend endpoints for cleaned Sentinel-2 daily vegetation indices (`GET /api/crop/indices`) serving 80 observation dates across NDVI, NDRE, NDMI over the 10 km Akola AOI with date filtering, descriptive stats, and explicit July 2023 / July 2024 monsoon cloud gap markers (preserved as observed reality, never interpolated); implemented lightweight GeoTIFF ingestion pipeline (`POST /api/imagery/upload`) with TIFF magic byte validation, dimensions, GeoKey CRS extraction, bounding box calculation, NoData detection, and JSON sidecar metadata; implemented multispectral raster index engine (`POST /api/imagery/compute-indices`) computing NDVI, NDRE, NDMI with zero-denominator & NoData masking, returning zonal statistics (mean, median, min, max, std, valid pixels %, 10-bin distribution histogram) and explicit `unavailable` status when required bands are unmapped; installed pure-Python `tifffile` (226 kB) without heavy GDAL/rasterio bindings; created frontend Crop Health & Raster Engine UI (`CropHealth.jsx`, `CropCharts.jsx`) with multi-spectral time-series chart with shaded monsoon gap overlays, quick date presets, AOI regional scope disclosure, GeoTIFF drag & drop upload, interactive band mapping selector, and zonal statistics histograms; added 11 automated crop and raster tests (54 total passing); verified frontend production build; raw data verified 100% immutable.
- **2026-11-20**: **Phase 8 completed (Spatial Field Management & Integrated GIS Workspace)**: Implemented backend field CRUD endpoints (`GET /api/fields`, `POST /api/fields`, `GET /api/fields/{id}`, `PUT /api/fields/{id}`, `DELETE /api/fields/{id}`) backed by flat-file storage in `data/fields/fields.json` without external database dependencies; initialized built-in canonical Akola Cotton Research Zone entry (10 km circular AOI buffer, 31,365 ha, 64-vertex geodesic polygon) protected from deletion/modification; implemented spherical excess geodesic polygon area calculation ($A = R^2 \times |\sum (\Delta \lambda)(2 + \sin \phi_1 + \sin \phi_2)/2|$) in hectares and acres; implemented strict GeoJSON polygon validation (ring closure, coordinate bounds, degeneracy check, area check); integrated interactive Leaflet GIS map with OpenStreetMap & Satellite basemaps, custom styling for research AOI vs private farm boundaries, fit-to-selected bounds, and click-to-draw polygon mode; built 3-column precision monitoring workspace (`GISWorkspace.jsx`) with left field directory & search, central interactive map, and right multi-module data availability & insight panel (`FieldInsightsPanel.jsx`); enforced strict scientific isolation preventing regional 10 km Akola research data from being falsely attributed to private user fields; added 9 automated field tests (63 total passing); verified frontend production build; raw data verified 100% immutable.
- **2026-11-20**: **Phase 9 completed (AI Analysis, Evidence-Based Alert Engine & Field Health Reporting)**: Implemented deterministic evidence-based agricultural alert engine (`GET /api/alerts`) evaluating 4 rule families: Sentinel-2 optical cloud gaps, pre-monsoon topsoil moisture depletion (provisional threshold), thermal degree-day phenology milestones (Literature Sets A & B), and diurnal summer heatwave thresholds ($T_{\text{max}} \ge 43.0^\circ\text{C}$). Every alert returns ID, title, severity (`Info`, `Warning`, `Critical`), category, source, provenance, timestamp, agronomic explanation, actionable recommendations, and technical limitations. Implemented dual-workflow alert behavior: for built-in Akola Demo, evaluates baseline reanalysis & satellite observations; for private user fields, issues explicit onboarding alerts guiding users to ingest field-specific data without falsely attributing Akola regional research observations. Implemented Year-on-Year descriptive screening endpoint (`GET /api/analysis/yoy`) strictly comparing the common overlapping 7-month calendar window (June 1 – Dec 31, 2023 vs 2024, $N=214$ days/year) across weather reanalysis, soil moisture (Layers 1, 2, 3), and Sentinel-2 vegetation indices, explicitly documenting the June 1, 2023 start date and preserved July monsoon cloud gaps. Implemented Field Health Report generator (`POST /api/reports/export` and `GET /api/reports/export`) supporting structured JSON and downloadable CSV (`text/csv` with `Content-Disposition`) containing field metadata, active alerts, module status summaries, literature citations with DOIs, and scientific disclaimers. Preserved locked `/api/analysis/pbw-risk` endpoint with `status: "unavailable"` and rigorous data gap disclosures. Built dedicated frontend views: `Alerts.jsx` (alert feed with severity & category filtering, agronomic rationale, and recommendations) and `Reports.jsx` (dual-tab page for field health report preview/download and YoY comparative screening). Integrated active alerts feed and one-click report export toolbar directly into the Phase 8 3-column GIS Workspace (`FieldInsightsPanel.jsx`). Added 9 automated tests in `backend/tests/test_analysis_phase9.py` (total 72 passing backend tests); verified frontend production build; raw data verified 100% immutable.
- **2026-11-20**: **Phase 10 completed (Comprehensive Verification, Full Test Suite, UI Polish & Final Delivery)**: Conducted full platform audit and end-to-end user journey verification across both operational workflows (Workflow A: Preloaded Akola Research Demo; Workflow B: User-Created Farm Fields). Enhanced Leaflet map responsiveness with dynamic `ResizeObserver` and window resize listeners eliminating gray tile margins; expanded automated verification with `backend/tests/test_phase10_comprehensive.py` (total 80 passing backend tests with 100% pass rate in 1.00s); verified all 9 canonical raw dataset SHA-256 hashes 100% immutable; verified production frontend bundle build with Vite (0 errors); updated complete documentation suite (`README.md`, `CLAUDE.md`, `WORKFLOW.md`, `IMPLEMENTATION_PLAN.md`, `PROJECT_VISION.md`, `SYSTEM_ARCHITECTURE.md`); synchronized repository with `origin/main`; successfully launched live backend (`http://localhost:8000`) and frontend (`http://localhost:5173`) on MacBook Air M4 and confirmed operational status.
- **2026-11-20**: **Direction Correction & SIH25099 AI Platform Refactoring (Phase 1 Audit & Phase 2 Implementation)**: Conducted comprehensive audit of the AgroViz codebase, redirecting the application from generic farm-management bookkeeping toward an AI-powered remote sensing crop monitoring platform aligned with SIH25099. Installed local, CPU-optimized PyTorch 2.14.1 and Scikit-learn 1.7.2 in `backend/.venv`. Ingested 30 remote sensing monitoring zones across the Vidarbha/Akola cotton belt from newly provided raw datasets: `AgroViz_zones.csv`, `AgroViz_Sentinel2_zone_daily_clean_2023-06-01_2025-01-01.csv` (2,053 clean records across 8 spectral bands with NDVI, NDRE, NDMI, BSI), `AgroViz_zones_S1_2023-06-01_2025-01-01.csv` (1,230 Sentinel-1 SAR dual-polarization records), `AgroViz_zones_ERA5Land_...` and `AgroViz_zones_CHIRPS_...` (17,400 daily zonal records each), and `AgroViz_zones_static_soilgrids_terrain.csv`. Implemented `backend/app/services/zones.py` and `backend/app/routers/zones.py` (`GET /api/zones`, `GET /api/zones/geojson`, `GET /api/zones/{id}`, `GET /api/zones/{id}/series`). Implemented PyTorch `CropStressCNN` v1.2.0 (`backend/app/ml/cnn_model.py`) for 8-band spectral-spatial feature extraction and canopy health classification (Healthy, Moderate Stress, Severe Stress, Bare Soil). Implemented PyTorch `VegetationLSTMForecaster` v1.1.0 (`backend/app/ml/lstm_model.py`) for 15-day forward NDVI trajectory forecasting with dynamic 95% confidence intervals and sudden-drop anomaly detection. Built AI inference router `backend/app/routers/ai.py` (`GET /api/ai/models`, `POST /api/ai/predict/crop-stress`, `POST /api/ai/forecast/indices`, `GET /api/ai/pest-risk`). Added Bare Soil Index (BSI) computation to `backend/app/services/raster.py`. Refactored frontend around the 5 core SIH workflows: `GIS Workspace` (30 zones), `Data Ingestion Hub` (`DataInputHub.jsx`), `Spectral & SAR Engine` (`CropHealth.jsx`), `AI Model Management` (`AIModelManagement.jsx`), and `AI Crop & Pest Analysis` (`AIAnalysisView.jsx`). Enhanced `FieldInsightsPanel.jsx` into the AI Zone Intelligence Panel with optical/radar fusion cards, CNN stress inference, LSTM 15-day forward trajectory sparklines, and composite pest risk score. Added 10 automated tests in `backend/tests/test_ai_and_zones.py` (total 90 passing backend tests with 100% pass rate in 1.78s); verified clean frontend production build (639ms); all 9 original raw datasets 100% immutable.
