# AgroViz — AI-Powered Crop Health, Soil Condition & Pest Monitoring Platform

[![Python 3.10](https://img.shields.io/badge/Python-3.10-3776AB?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React 18](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-6.0+-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![Tests](https://img.shields.io/badge/Tests-80%20Passing-brightgreen.svg)]()
[![Status](https://img.shields.io/badge/Phase%2010-Complete-success.svg)]()
[![License](https://img.shields.io/badge/License-Academic%20Research-green.svg)]()

**AgroViz** is an **AI-powered Precision Agriculture Monitoring Platform** designed to evaluate crop health, monitor root-zone soil conditions, track insect thermal development, and generate evidence-based agronomic alerts.

It seamlessly integrates satellite remote sensing (Copernicus Sentinel-2), drone multispectral imagery, numerical surface weather reanalysis (NASA POWER), gridded land-surface soil moisture (ECMWF ERA5-Land), global digital soil mapping (ISRIC SoilGrids 2.0), and peer-reviewed entomological phenology models.

---

## 🌟 Key Platform Capabilities

- **Dual-Workflow Architecture**:
  - **Workflow A (Built-in Research Demonstration)**: Preloaded multi-layer monitoring for cotton cultivation in Akola District, Maharashtra, India (10 km AOI buffer around 20.7069°N, 77.0022°E).
  - **Workflow B (User-Created Precision Fields)**: Define custom field boundaries, input crop stages, and upload multispectral GeoTIFFs, in-situ capacitive soil sensor logs, on-farm weather records, or pest scouting observations.
- **Biophysical Vegetation Indices**: Automated calculation of NDVI (vigor/biomass), NDRE (chlorophyll/nitrogen), and NDMI (canopy moisture) with cloud gap detection.
- **Multi-Depth Soil Analytics**: Daily root-zone volumetric soil moisture across 3 distinct depths (0–7 cm, 7–28 cm, 28–100 cm) combined with 6-depth SoilGrids physical property profiles and USDA soil texture classification (**Clay**).
- **Thermal Phenological Indicators**: Single-sine degree-day calculation with horizontal cutoff evaluating Pink Bollworm (*Pectinophora gossypiella*) thermal accumulation and generation turnover using literature parameters (Set A: 503.62 DD; Set B: 492.00 DD).
- **Evidence-Based Agronomic Alerts**: Rule engine monitoring cited insect thermal development milestones and optical cloud gaps (with soil moisture deficit rules marked as provisional pending localized soil retention calibration).
- **Rigorous Data Provenance**: Every metric in the API and UI carries explicit provenance tags (`measured`, `calculated`, `model_estimated`, `published_literature`, `unavailable`), known limitations, and citations.

---

## 📐 Modern 3-Column Workspace Layout

AgroViz adopts a professional precision agriculture interface inspired by leading agronomic GIS tools:

```
+---------------------------------------------------------------------------------------+
| Top Navigation:     [Dashboard]      [My Fields]      [Alerts]      [Reports]         |
+--------------------------+------------------------------+-----------------------------+
| LEFT PANEL               | CENTER PANEL                 | RIGHT PANEL                 |
| - Field Switcher         | - Interactive Leaflet Map    | - Crop Health Summary       |
| - Crop Metadata Editor   |   * Satellite Basemap        |   * NDVI / NDRE / NDMI      |
| - File Upload Dropzone   |   * Field Boundary Polygon   | - Root-Zone Soil Status     |
|   (GeoTIFF / Sensor CSV) |   * Spatial Raster Overlays  | - Degree-Day Phenology      |
| - Date Range Picker      | - Multi-Layer Time-Series    | - Active Alert Feed         |
| - "Run Analysis" Trigger | - Tabular Record Explorer    | - Evidence & Footnotes      |
+--------------------------+------------------------------+-----------------------------+
```

---

## 📊 Canonical Research Datasets (`data/raw/`)

AgroViz includes nine verified, immutable datasets representing the Akola cotton-growing region:

| Dataset | Variables | Temporal Coverage | Provenance |
|---|---|---|---|
| **NASA POWER Weather** | T2M, Tmax, Tmin, RH2M, Precipitation | 2023-06-01 to 2024-12-31 (580 days) | `model_estimated` (MERRA-2) |
| **Sentinel-2 Indices (GEE)** | NDVI, NDRE, NDMI, Cloud % | 2023-06-05 to 2024-12-31 (80 dates) | `calculated` (Satellite) |
| **ERA5-Land Soil Moisture** | Volumetric moisture: 3 depths | 2023-06-01 to 2024-12-31 (580 days) | `model_estimated` (Land surface) |
| **ISRIC SoilGrids 2.0** | Clay, Sand, Silt, pH, SOC (6 depths)| Static 250 m digital soil map | `model_estimated` (Global ML) |
| **PBW Annexure 3 (Station)** | Seasonal Bt vs Non-Bt locule damage | 2015-16 to 2019-20 (Annual) | `published_literature` |
| **PBW Annexure 4 (Multi-loc)**| PBW loss % & Boll rot loss % (63 sites)| Multi-year survey aggregate | `published_literature` |
| **Planetary Computer Run** | S2 NDVI/NDRE/NDMI comparison | 2023-06-05 to 2024-12-31 (63 dates) | `calculated` (Validation) |
| **Scene Inventory** | Sentinel-2 acquisition metadata | 2023-06-05 to 2024-12-31 (329 scenes)| `metadata` |
| **ERA5 Single-Layer** | Layer 1 soil moisture cross-check | 2023-06-01 to 2024-12-31 (580 days) | `model_estimated` |

---

## 🔒 Scientific Disclosures & Non-Claims

1. **No False Pest Confirmation**: Optical satellite vegetation indices (NDVI/NDRE/NDMI) alone **cannot confirm** pest presence. Canopy vigor and insect phenology are displayed separately.
2. **Zero Temporal Overlap**: Published historical pest surveys (2015–2023) ended before the environmental monitoring series (June 2023 to December 2024). No statistical or machine-learning correlation is computed between them.
3. **No Synthetic Risk Scores**: AgroViz does not fabricate arbitrary "Low/Medium/High" pest infestation percentages. The degree-day output is a *thermal development indicator*, never a confirmed infestation risk.
4. **Reanalysis vs. Stations**: NASA POWER and ERA5-Land are gridded numerical model reanalyses, not local ground weather stations or in-situ soil probes.
5. **Monsoon Cloud Gap**: Zero valid optical satellite observations exist in July 2023 and July 2024 due to persistent monsoon clouds. This gap is explicitly shown and never silently interpolated.
6. **Provisional Soil Moisture Rules**: Generic moisture thresholds (e.g. 0.28 or 0.25 m³/m³) are statistical indicators from reanalysis distributions, not validated agronomic wilting points for Akola Vertisols; they remain flagged as provisional.

---

## 🚀 Quickstart & Setup Guide

### Prerequisites
- **macOS / Linux / Windows**
- **Python 3.10+**
- **Node.js 18+ & npm**

### 1. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create and activate Python virtual environment
python3.10 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI development server
uvicorn app.main:app --reload --port 8000
```
Backend API interactive Swagger docs: `http://localhost:8000/docs`

### 2. Frontend Setup
```bash
# Open a new terminal and navigate to frontend directory
cd frontend

# Install Node dependencies
npm install

# Start Vite development server
npm run dev
```
Frontend web application: `http://localhost:5173`

### 3. Run Automated Tests
```bash
# In the project root, run the Pytest suite
backend/.venv/bin/pytest backend/tests/ -v
```

---

## 📚 Project Documentation Suite

For detailed technical specifications, refer to the documentation suite:
- [PROJECT_VISION.md](PROJECT_VISION.md) — Product vision, intended users, scope, and non-claims.
- [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md) — Full-stack architecture, GIS pipeline, and APIs.
- [DATASETS_AND_MODELS.md](DATASETS_AND_MODELS.md) — Dataset schemas, limitations, and ML readiness status.
- [UPLOAD_FORMATS.md](UPLOAD_FORMATS.md) — Ingestion specifications for GeoTIFFs, sensor logs, and scouting CSVs.
- [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) — 10-phase precision agriculture implementation roadmap.
- [CLAUDE.md](CLAUDE.md) — Authoritative developer guide and engineering rules.
- [WORKFLOW.md](WORKFLOW.md) — Phase-by-phase development protocol and verification checklists.

---

## 📖 Citations & Acknowledgments

- **Entomological Survey Data**: Fand, B.B. et al. (2025). *"Field estimates of current and predicted cotton yield loss due to pink bollworm and boll rot in India."* *Agricultural Systems*, 224, 104246. DOI: [10.1016/j.agsy.2024.104246](https://doi.org/10.1016/j.agsy.2024.104246).
- **Mendeley Dataset**: Fand, B. (2024). *"Data for: Field estimates of current and predicted cotton yield loss due to pink bollworm and boll rot in India."* *Mendeley Data*, V1. DOI: [10.17632/2xp6xvct2x.1](https://doi.org/10.17632/2xp6xvct2x.1).
- **Degree-Day Phenology**: Pathan, B. et al. (2021). *"Degree day-based model predicts pink bollworm phenology across geographical locations."* *Scientific Reports*, 11, 436. DOI: [10.1038/s41598-020-80184-6](https://doi.org/10.1038/s41598-020-80184-6).
- **Environmental Data Providers**: NASA POWER (MERRA-2); Copernicus Sentinel-2 L2A; ECMWF ERA5-Land; ISRIC SoilGrids 2.0.
