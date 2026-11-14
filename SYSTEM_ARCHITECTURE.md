# AgroViz — System Architecture Specification

## 1. High-Level Architectural Overview

AgroViz is designed as a decoupled, modular full-stack precision agriculture platform. It combines a lightweight, high-performance Python FastAPI backend for data processing, scientific calculations, and API routing with a responsive, modern React + Vite frontend for interactive spatial visualization, multi-layer analytics, and field management.

```
+---------------------------------------------------------------------------------------+
|                                    REACT + VITE FRONTEND                              |
+---------------------------------------------------------------------------------------+
| Top Navigation:  [Dashboard]      [My Fields]      [Alerts]      [Reports]            |
+--------------------------+------------------------------+-----------------------------+
| LEFT PANEL (320px)       | CENTER PANEL (Flexible)      | RIGHT PANEL (360px)         |
| - Field Selector         | - Interactive Leaflet Map    | - Crop Health Status        |
| - Field Metadata Config  |   * Satellite / Basemap Layer|   * NDVI / NDRE / NDMI      |
| - Layer Ingestion & Files|   * Field Boundary Polygon   | - Root-Zone Soil Condition  |
| - Date Range Picker      |   * Spatial Raster Overlays  | - Thermal Pest Phenology    |
| - Processing Trigger     | - Multi-Layer Timeseries SVG | - Rule-Based Alerts         |
|                          | - Tabular Record Explorer    | - Evidence & Citations      |
+--------------------------+------------------------------+-----------------------------+
                                       |
                                HTTP REST / JSON / Multipart
                                       v
+---------------------------------------------------------------------------------------+
|                                  FASTAPI PYTHON BACKEND                               |
+---------------------------------------------------------------------------------------+
| ROUTERS:                                                                              |
| /api/health       /api/fields       /api/weather      /api/imagery    /api/soil       |
| /api/analysis     /api/pbw          /api/alerts       /api/reports    /api/datasets   |
+---------------------------------------------------------------------------------------+
| SERVICES LAYER:                                                                       |
| - FieldManager: CRUD operations on user fields and preloaded Akola reference field.   |
| - RasterProcessor: Multispectral band math (NDVI/NDRE/NDMI), GeoTIFF validation.      |
| - WeatherService: NASA POWER parsing, diurnal temperature trends, precipitation stats.|
| - SoilService: ERA5-Land 3-depth moisture modeling, SoilGrids physical depth profiles.|
| - PhenologyService: Single-sine horizontal cutoff degree-day calculations (Sets A/B). |
| - AlertEngine: Deterministic agronomic thresholds and evidence-based alert generator. |
| - ReportGenerator: Multi-layer summary compilation and export.                         |
| - DataRegistry & Profiler: Dataset loading, validation, profiling, and quality checks.|
+---------------------------------------------------------------------------------------+
| STORAGE & DATA LAYER:                                                                 |
| - data/raw/        : Immutable canonical research datasets (SHA-256 verified)         |
| - data/processed/  : Cleaned CSVs, structured profiles, and pre-computed aggregations |
| - data/uploads/    : Validated user uploads (GeoTIFFs, sensor logs, scouting CSVs)    |
| - data/fields/     : User field definitions and metadata (JSON)                       |
+---------------------------------------------------------------------------------------+
```

---

## 2. Frontend Architecture

### 2.1 Workspace Layout & Component Structure
The user interface adopts a professional 3-column precision monitoring layout inspired by modern agricultural GIS platforms:

1. **Top Application Navigation**:
   - `Dashboard`: High-level operational overview across active fields.
   - `My Fields`: Field selection, boundary creation, and field configuration.
   - `Alerts`: Centralized feed of evidence-based biophysical and pest alerts.
   - `Reports`: Exportable field health reports, audit trails, and citations.

2. **Left Panel — Field Configuration & Data Ingestion**:
   - Field selector (toggle between Built-in Akola Research Field and Custom User Fields).
   - Crop metadata (Crop type, sowing date proxy, current phenological growth stage).
   - Multi-modal upload dropzone with real-time format validation.
   - Temporal range controls (presets for Kharif season, full year, custom range).
   - "Run Analysis" execution trigger.

3. **Center Panel — Spatial Map & Time-Series Visualizations**:
   - **Interactive Leaflet GIS Map**:
     - Satellite imagery base layer with boundary vector overlays.
     - Spatial raster layer rendering (colorized NDVI / NDRE / NDMI heatmaps).
     - Markers for weather reanalysis grid points, soil profile locations, and scouting points.
   - **Interactive Chart Engine (Custom SVG)**:
     - Canopy index trends with cloud gap annotations.
     - Diurnal temperature curves with max/min bands.
     - Daily rainfall bars and cumulative precipitation.
     - Soil moisture profiles across depths (0–7 cm, 7–28 cm, 28–100 cm).
     - Degree-day accumulation curves with generation milestones.

4. **Right Panel — Condition Indicators & Alerts**:
   - High-level metric cards with explicit provenance tags (`measured`, `calculated`, `model_estimated`).
   - Active agronomic alerts with severity chips (`Info`, `Warning`, `Critical`).
   - Biological development indicators (accumulated heat units, estimated generation count).
   - Contextual benchmark comparisons from published literature.
   - Reference footnotes and methodology links.

---

## 3. Backend Architecture

### 3.1 Framework & Core Modules
- **Framework**: FastAPI (asynchronous, type-safe API framework using Python 3.10) with Uvicorn.
- **Validation**: Pydantic v2 schemas enforcing strict request/response data contracts, with `python-multipart` for file uploads.
- **Data & Numerical Processing**: NumPy and Pandas for array manipulation, time-series aggregation, and mathematical integration (using Python standard library math and NumPy; external heavy GIS libraries like GDAL/Rasterio/SciPy are not installed in the current environment).
- **Testing & HTTP**: Pytest with HTTPX TestClient for automated unit and integration tests covering mathematical edge cases, schema validations, and file immutability.

### 3.2 Service Layer Architecture

```
app/
├── main.py                   # FastAPI application initialization & CORS config
├── config.py                 # File paths, constants, directory definitions
├── schemas.py                # BaseResponse, Field, Upload, Alert, and Metric schemas
├── routers/
│   ├── health.py             # System status and readiness endpoints
│   ├── fields.py             # Field management (list, create, inspect)
│   ├── weather.py            # Weather time-series and monthly aggregations
│   ├── soil.py               # ERA5 soil moisture and SoilGrids profiles
│   ├── crop.py               # Satellite & drone vegetation indices
│   ├── pbw.py                # Pink Bollworm context, status, and templates
│   ├── analysis.py           # Degree-day indicator and locked risk endpoints
│   ├── alerts.py             # Rule-based agronomic alert evaluation
│   ├── reports.py            # Summary export generation
│   └── datasets.py           # Data registry, preview, and profiling
└── services/
    ├── registry.py           # Canonical dataset catalog and metadata
    ├── loaders.py            # Raw data cleaning, deduplication, and parsing
    ├── profiler.py           # Automated dataset profiling (nulls, ranges, stats)
    ├── weather.py            # NASA POWER processing logic
    ├── pbw.py                # Single-sine degree-day engine & Annexures parser
    ├── raster.py             # Multispectral band extraction & index math
    ├── fields.py             # Field storage and geometry handling
    └── alerts.py             # Alert evaluation rules
```

---

## 4. Data Ingestion & Validation Pipeline

All data entering AgroViz passes through a strict validation gateway before storage or analysis:

```
[User Upload] --> [MIME / Extension Check]
                       |
                       v
              [Schema / Header Validation]
                       |
                       +---> If Invalid: Return HTTP 422 with exact column mismatch
                       |
                       v
              [Data Type & Coordinate Range Check]
                       |
                       v
              [Save to data/uploads/ with Hash & Timestamp]
                       |
                       v
              [Profile Dataset & Stage for Field Analysis]
```

1. **Multispectral Imagery Ingestion**:
   - Validates file format (GeoTIFF, multi-band TIFF).
   - Verifies coordinate reference system (CRS; EPSG:4326, EPSG:3857, or UTM zones).
   - Verifies minimum required bands (Red, Green, Blue, NIR; optionally Red Edge and SWIR).
   - Extracts bounding coordinates and pixel dimensions.

2. **Tabular Sensor & Weather Ingestion**:
   - Validates required column headers against canonical schemas.
   - Enforces ISO 8601 date strings (`YYYY-MM-DD`).
   - Checks realistic physical ranges (e.g., Temperature: $-20^\circ\text{C}$ to $60^\circ\text{C}$; Soil Moisture: $0.0$ to $1.0\text{ m}^3/\text{m}^3$).

3. **Scouting & Pest Observation Ingestion**:
   - Enforces coordinate bounds matching field boundaries.
   - Restricts observation types to controlled taxonomy (`trap_count`, `boll_damage_pct`, `larval_count`).

---

## 5. Image Processing & Multispectral Band Handling

Multispectral vegetation indices are calculated directly from raw spectral reflectance arrays using standardized formulas:

$$\text{NDVI} = \frac{\rho_{\text{NIR}} - \rho_{\text{Red}}}{\rho_{\text{NIR}} + \rho_{\text{Red}}} = \frac{B8 - B4}{B8 + B4}$$

$$\text{NDRE} = \frac{\rho_{\text{NIR}} - \rho_{\text{RedEdge}}}{\rho_{\text{NIR}} + \rho_{\text{RedEdge}}} = \frac{B8A - B5}{B8A + B5}$$

$$\text{NDMI} = \frac{\rho_{\text{NIR}} - \rho_{\text{SWIR}}}{\rho_{\text{NIR}} + \rho_{\text{SWIR}}} = \frac{B8A - B11}{B8A + B11}$$

- **Band Alignment**: Inputs are checked for identical spatial resolution and coordinate grids. When resolutions differ (e.g., Sentinel-2 10 m Red/NIR vs. 20 m Red Edge/SWIR), bands are bilinearly resampled to common grids.
- **Cloud & Shadow Masking**: Quality assessment masks (e.g., Sentinel-2 Scene Classification Layer SCL) filter out cloud, cloud shadow, cirrus, and saturated pixels prior to calculating zonal averages.

---

## 6. AI/ML Inference Architecture

AgroViz distinguishes between **Deterministic Scientific Algorithms** (currently operational) and **Supervised Machine Learning Models** (future capability requiring labelled datasets):

```
+-----------------------------------------------------------------------------------+
|                           AGROVIZ ANALYTICAL ENGINES                              |
+-----------------------------------------+-----------------------------------------+
| OPERATIONAL (Empirical / Deterministic) | FUTURE (Supervised ML Inference)        |
+-----------------------------------------+-----------------------------------------+
| 1. Single-Sine Degree-Day Engine        | 1. High-Resolution Crop Type Masking    |
|    - Mathematical integration of daily  |    - Semantic segmentation (U-Net) of   |
|      sinusoid over thermal thresholds.  |      cotton vs. non-cotton fields.      |
| 2. Biophysical Spectral Indices         | 2. Multispectral Canopy Stress Classif. |
|    - Standardized band ratio equations. |    - Random Forest / CNN classifier for |
| 3. USDA Soil Texture Classifier         |      nitrogen deficiency vs. drought.   |
|    - Geometric clay/sand/silt polygon   | 3. Validated Pest Risk Forecasting      |
|      boundary matching.                 |    - Spatial-temporal LSTM/XGBoost on   |
| 4. Descriptive YoY Trend Screening      |      overlapping scouting + weather.    |
|    - Statistical delta calculations.    |                                         |
+-----------------------------------------+-----------------------------------------+
```

### Architectural Guardrails:
- No machine learning model is run unless a serialized, validated model artifact exists on disk with documented test set performance.
- When required labelled data is absent, the system displays an explicit `status: "unavailable"` response with complete data requirements.

---

## 7. Evidence-Based Alert Engine

Alerts in AgroViz are evaluated through transparent agronomic indicators and phenological milestones. Soil moisture deficit rules are kept strictly **provisional / illustrative** unless calibrated against local soil water retention curves (e.g. Vertisol field capacity and permanent wilting point for Akola):

| Alert ID | Condition | Severity | Description | Status |
|---|---|---|---|---|
| `ALT-MST-01` | Layer 1 Moisture $< 0.28\text{ m}^3/\text{m}^3$ for $>5$ days | `Warning` | Provisional Topsoil Deficit (Illustrative rule; requires local soil water retention calibration) | *Provisional (Disabled by default)* |
| `ALT-MST-02` | Layer 1 & 2 Moisture $< 0.25\text{ m}^3/\text{m}^3$ | `Critical` | Provisional Subsoil Drought (Illustrative rule; unvalidated against field wilting points) | *Provisional (Disabled by default)* |
| `ALT-PBW-01` | Cumulative DD $\ge 503.62$ (Set A) | `Info` | Generation 1 Thermal Potential: Literature thermal threshold reached for 1st PBW generation | **Active (Cited Phenology)** |
| `ALT-PBW-02` | Cumulative DD $\ge 1007.24$ (Set A) | `Warning` | Generation 2 Thermal Potential: Heat units accumulated for 2nd PBW generation | **Active (Cited Phenology)** |
| `ALT-CLD-01` | Optical observation gap $> 25$ days | `Info` | Persistent Cloud Interference: Optical satellite gap detected (monsoon clouding in July) | **Active (Observed Quality)** |

> [!CAUTION] Soil Moisture Alert Thresholds Notice
> Generic thresholds such as 0.28 or 0.25 m³/m³ are derived purely from empirical distributions of ERA5-Land reanalysis during dry periods. They are **not** validated agronomic wilting points or field capacity thresholds for Akola's deep Vertisols (black cotton soils). Moisture-based alerts remain flagged as *provisional* and disabled from automated decision triggers until calibrated against physical soil retention data.

Every alert output includes the trigger metric, threshold value, data source, and recommended scouting action.

---

## 8. Data Storage Strategy

- **Immutable Research Datasets (`data/raw/`)**: Read-only store of canonical datasets. Verified on startup against known SHA-256 hashes.
- **Processed Cache (`data/processed/`)**: Pre-cleaned, indexed CSV and metadata files generated by the data layer.
- **User Uploads (`data/uploads/`)**: Staged user-provided rasters, sensor logs, and scouting tables with timestamped filenames and JSON metadata sidecars.
- **Field Definitions (`data/fields/`)**: Lightweight JSON documents recording field geometry, crop metadata, and attached file paths. No external database server required.
