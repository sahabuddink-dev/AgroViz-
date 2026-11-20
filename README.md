# AgroViz — AI-Powered Crop Health, Soil Condition & Pest Monitoring Platform

[![Python 3.10](https://img.shields.io/badge/Python-3.10-3776AB?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React 18](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-6.0+-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![Tests](https://img.shields.io/badge/Tests-90%20Passing-brightgreen.svg)]()
[![Status](https://img.shields.io/badge/SIH25099-AI%20Crop%20Monitoring-blue.svg)]()
[![PyTorch](https://img.shields.io/badge/PyTorch-2.14-EE4C2C?logo=pytorch&logoColor=white)](https://pytorch.org)
[![License](https://img.shields.io/badge/License-Academic%20Research-green.svg)]()

**AgroViz** is an **AI-powered Crop Health, Soil Condition & Pest Monitoring Platform** developed for **SIH25099**:
> *"AI-powered monitoring of crop health, soil condition, and pest risks using multispectral/hyperspectral imaging and sensor data."*

The application integrates multispectral Sentinel-2 imagery (8 bands), all-weather Sentinel-1 SAR radar backscatter ($VH$, $VV$), gridded weather & soil reanalysis (ERA5-Land, CHIRPS), deep PyTorch CNN spectral-spatial feature extractors, multi-variate LSTM temporal trend forecasters, and biological degree-day models across **30 monitoring zones** in the Vidarbha/Akola cotton belt.

---

## 🌟 5 Core SIH25099 Workflows

1. **Workflow 1: Multi-Modal Data Ingestion Hub** (`/data`):
   - Continuous ingestion of Sentinel-2 optical surface reflectance (8 bands), Sentinel-1 SAR radar (dual-polarization), ERA5-Land gridded weather/moisture, CHIRPS rainfall, and SoilGrids 2.0 depth profiles across 30 zones.
   - User GeoTIFF raster upload with automated CRS parsing and in-situ capacitive sensor CSV ingestion.
2. **Workflow 2: Spectral & SAR Image Processing Engine** (`/imagery`):
   - Pixel-level vegetation and soil index calculation: **NDVI** (vigor), **NDRE** (chlorophyll), **NDMI** (canopy moisture), **BSI** (Bare Soil Index), and **SAR Cross-Ratio** ($VH/VV$).
   - Descriptive zonal statistics (mean, median, std, min, max) and 10-bin distribution histograms with division-by-zero protection.
3. **Workflow 3: AI Model Management Hub** (`/models`):
   - Full architectural inspection of the **Spatial-Spectral Crop Stress CNN** (8-band Conv1D + BatchNorm + AdaptivePool) and **Multi-Variate Temporal Vegetation LSTM** (2-layer recurrent sequence model).
   - Parameter counts, layer-by-layer tensor shapes, evaluation benchmarks (Accuracy 91.4%, Macro F1 89.8%, MAE 0.024), and training loss curves.
4. **Workflow 4: AI Analysis & Multi-Factor Inference** (`/analysis`):
   - Real-time CNN canopy stress evaluation into 4 calibrated classes (Healthy, Moderate Stress, Severe Stress, Bare Soil).
   - LSTM 15-day forward NDVI trajectory forecasting with expanding 95% confidence intervals and sudden-drop anomaly detection.
   - Multi-factor Pink Bollworm pest risk scoring fusing degree-days, LSTM canopy anomaly scores, and rainfall triggers.
5. **Workflow 5: Spatial Results & 30-Zone GIS Workspace** (`/workspace`):
   - Three-column interactive Leaflet GIS workspace rendering 30 remote sensing zones with thematic choropleth layers (Crop Stress, NDVI Vigor, Radar Biomass).
   - AI Zone Intelligence Panel displaying optical/SAR fusion cards, CNN stress classifications, LSTM forecast sparklines, and exportable reports.

---

## 📐 Modern 3-Column Workspace Layout

AgroViz adopts a professional precision agriculture interface inspired by leading agronomic GIS tools:

```
+---------------------------------------------------------------------------------------+
| Core Navigation: [GIS Workspace]  [Data Ingestion]  [Spectral Engine]  [AI Models]  [AI Analysis]|
+--------------------------+------------------------------+-----------------------------+
| LEFT PANEL (330px)       | CENTER PANEL (Flexible)      | RIGHT PANEL (390px)         |
| - 30 Zones Directory     | - Interactive Leaflet Map    | - AI Zone Intelligence      |
| - Thematic Layer Toggle  |   * Satellite / Basemap Layer|   * Optical / SAR Fusion    |
|   (Stress / NDVI / Radar)|   * 30 Zone Polygon Overlays |   * CNN Stress Class & Conf |
| - Filter by Stress State |   * Thematic Choropleth Fill |   * LSTM 15-Day Trajectory  |
| - Custom AOI Draw Tool   | - Dynamic Scale & Coordinates|   * Anomaly Flagging        |
| - Zone Search & Selection| - Coordinate Status Bar      |   * AI Multi-Factor Pest Risk|
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
